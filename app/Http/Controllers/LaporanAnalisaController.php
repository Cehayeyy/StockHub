<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use App\Models\SalesReportItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;

class LaporanAnalisaController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $periode = $request->input('periode', 'Harian');
        $tanggal = $this->resolveDate($request->input('tanggal'));
        [$startDate, $endDate] = $this->resolvePeriod($tanggal, $periode);

        // Harga satuan/subtotal adalah snapshot saat staff menyimpan nota.
        // Laporan mencakup transaksi Staff Bar dan Dapur.
        $salesItems = SalesReportItem::query()
            ->with(['item.itemCategory', 'salesReport.user'])
            ->whereHas('salesReport', function ($query) use ($startDate, $endDate) {
                $query->whereBetween('tanggal_transaksi', [$startDate, $endDate])
                    ->whereHas('user', fn ($userQuery) => $userQuery->whereIn('role', ['bar', 'dapur', 'kitchen', 'staff_kitchen']));
            })
            ->whereHas('item', function ($query) use ($search) {
                $query->whereIn('division', ['bar', 'dapur'])
                    ->when($search !== '', fn ($itemQuery) => $itemQuery->where('nama', 'like', "%{$search}%"));
            })
            ->get();

        // Data resep lama dapat belum memiliki item_id; gunakan nama sebagai fallback.
        $recipes = Recipe::with('category')->whereIn('division', ['bar', 'dapur'])->get();
        $recipesByItemId = $recipes->filter(fn (Recipe $recipe) => $recipe->item_id !== null)->keyBy('item_id');
        $recipesByDivisionAndName = $recipes->groupBy(fn (Recipe $recipe) => "{$recipe->division}|{$recipe->name}");

        $groupedItems = $salesItems->groupBy('item_id')
            ->map(function ($lines, $itemId) use ($recipesByItemId, $recipesByDivisionAndName) {
                $item = $lines->first()->item;
                $recipe = $recipesByItemId->get($itemId)
                    ?? $recipesByDivisionAndName->get("{$item->division}|{$item->nama}")?->first();
                $terjual = (float) $lines->sum('quantity');
                // Diskon dan fee berlaku untuk satu nota, sehingga dibagi
                // proporsional terhadap subtotal masing-masing menu.
                $omsetBersih = (float) $lines->sum(fn (SalesReportItem $line) => $this->netRevenueForLine($line));
                $hppSatuan = (float) ($recipe?->total_hpp ?? 0);
                $totalHpp = round($terjual * $hppSatuan, 2);
                $hargaJualRiil = $terjual > 0 ? round($omsetBersih / $terjual, 2) : 0;

                return [
                    'id' => (int) $itemId,
                    'nama' => $item->nama,
                    'kategori' => $recipe?->category?->name ?? $item->itemCategory?->name ?? $item->kategori_item ?? 'Menu',
                    'terjual' => $terjual,
                    'total_hpp' => $totalHpp,
                    'harga_jual_riil' => $hargaJualRiil,
                    'profit_riil_satuan' => round($hargaJualRiil - $hppSatuan, 2),
                    'total_profit_real' => round($omsetBersih - $totalHpp, 2),
                ];
            })
            ->sortBy('nama', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        $totalOmsetReal = round((float) $salesItems->sum(fn (SalesReportItem $line) => $this->netRevenueForLine($line)), 2);
        $totalProfitRealSum = round($groupedItems->sum('total_profit_real'), 2);

        $ringkasan = [
            'totalOmsetReal' => $totalOmsetReal,
            'totalProfitReal' => $totalProfitRealSum,
        ];

        $perPage = 10;
        $page = max(1, (int) $request->input('page', 1));
        $itemsAnalisa = new LengthAwarePaginator(
            $groupedItems->forPage($page, $perPage)->values(),
            $groupedItems->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return Inertia::render('Laporan/AnalisaProfit', [
            'ringkasan' => $ringkasan,
            'itemsAnalisa' => $itemsAnalisa,
            'filters' => [
                'search' => $search,
                'periode' => $periode,
                'tanggal' => $tanggal->toDateString(),
            ],
        ]);
    }

    public function export(Request $request)
    {
        return back()->with('success', 'Laporan analisis profit berhasil diunduh.');
    }

    private function resolveDate(?string $date): Carbon
    {
        try {
            return $date && str_contains($date, '/')
                ? Carbon::createFromFormat('m/d/Y', $date)->startOfDay()
                : Carbon::parse($date ?: now())->startOfDay();
        } catch (\Throwable) {
            return now()->startOfDay();
        }
    }

    private function netRevenueForLine(SalesReportItem $line): float
    {
        $report = $line->salesReport;
        $reportSubtotal = (float) $report->subtotal;

        if ($reportSubtotal <= 0) {
            return (float) $line->subtotal;
        }

        return ((float) $line->subtotal / $reportSubtotal) * (float) $report->total_bersih;
    }

    private function resolvePeriod(Carbon $date, string $periode): array
    {
        return match ($periode) {
            'Mingguan' => [$date->copy()->startOfWeek(), $date->copy()->endOfWeek()],
            'Bulanan' => [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()],
            default => [$date->copy(), $date->copy()],
        };
    }
}
