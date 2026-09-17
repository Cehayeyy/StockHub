<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use App\Models\SalesReportItem;
use Carbon\Carbon;
<<<<<<< HEAD
use Illuminate\Support\Facades\Schema;
=======
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
>>>>>>> e01270427c134a6911d0460009c7ee1c9f6a772f

class LaporanAnalisaController extends Controller
{
    public function index(Request $request)
    {
<<<<<<< HEAD
        Carbon::setLocale('id');

        $search = $request->input('search');
        $periode = $request->input('periode', 'Harian');
        $tanggalInput = $request->input('tanggal', now()->toDateString());

        try {
            if (str_contains($tanggalInput, '/')) {
                $dateObj = Carbon::createFromFormat('m/d/Y', $tanggalInput);
            } else {
                $dateObj = Carbon::parse($tanggalInput);
            }
        } catch (\Exception $e) {
            $dateObj = Carbon::now();
        }

        $tanggal = $dateObj->toDateString();

        // 1. Ambil data master resep/item tanpa membatasi has('resep') secara kaku
        $recipes = Recipe::when($search, function ($q, $search) {
                $q->where('name', 'like', "%{$search}%");
            })->get();

        // 2. Deteksi nama kolom tanggal pada sales_reports
        $salesCols = Schema::hasTable('sales_reports') ? Schema::getColumnListing('sales_reports') : [];
        $dateCol = in_array('tanggal_transaksi', $salesCols) ? 'tanggal_transaksi' :
                  (in_array('tanggal', $salesCols) ? 'tanggal' : 'created_at');

        // 3. Petakan data performa penjualan per menu secara presisi
        $groupedItems = $recipes->map(function ($recipe) use ($tanggal, $dateObj, $periode, $dateCol) {

            // Cari item yang berelasi berdasarkan nama resep
            $item = Item::where('nama', $recipe->name)->first();
            $itemId = $item ? $item->id : null;

            // Hitung total quantity terjual dari SalesReportItem
            $salesQuery = SalesReportItem::where(function ($q) use ($recipe, $itemId) {
                if ($itemId) {
                    $q->where('item_id', $itemId);
                } else {
                    $q->where('recipe_id', $recipe->id);
                }
            })->whereHas('salesReport', function ($query) use ($tanggal, $dateObj, $periode, $dateCol) {
                if ($periode === 'Harian') {
                    $query->whereDate($dateCol, $tanggal);
                } elseif ($periode === 'Mingguan') {
                    $query->whereBetween($dateCol, [$dateObj->copy()->startOfWeek(), $dateObj->copy()->endOfWeek()]);
                } else {
                    $query->whereYear($dateCol, $dateObj->year)->whereMonth($dateCol, $dateObj->month);
                }
            });

            $totalTerjual = (float) $salesQuery->sum('quantity');

            // Finansial HPP & Harga Jual Riil
            $hppSatuan = (float) ($item->harga_beli ?? $item->harga_dasar ?? $recipe->harga_hpp ?? 0);
            $hargaJualRiil = (float) ($recipe->harga_jual_real ?? $item->harga_jual ?? 0);

            $totalHpp = $totalTerjual * $hppSatuan;
            $profitRiilSatuan = max(0, $hargaJualRiil - $hppSatuan);
            $totalProfitReal = $totalTerjual * $profitRiilSatuan;

            return [
                'id' => $recipe->id,
                'nama' => $recipe->name,
                'kategori' => ucfirst($recipe->division ?? 'Menu'),
                'terjual' => $totalTerjual,
                'total_hpp' => $totalHpp,
                'harga_jual_riil' => $hargaJualRiil,
                'profit_riil_satuan' => $profitRiilSatuan,
                'total_profit_real' => $totalProfitReal,
            ];
        })->values();

        // 4. Hitung Ringkasan Total Omset Real & Total Profit Real
        $totalOmsetReal = $groupedItems->sum(function ($item) {
            return $item['terjual'] * $item['harga_jual_riil'];
        });

        $totalProfitRealSum = $groupedItems->sum('total_profit_real');
=======
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
>>>>>>> e01270427c134a6911d0460009c7ee1c9f6a772f

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
<<<<<<< HEAD
=======

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
>>>>>>> e01270427c134a6911d0460009c7ee1c9f6a772f
}
