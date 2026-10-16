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
        
        // 🔥 PENAMBAHAN FILTER DIVISI
        $divisi = $request->input('divisi', 'Semua');
        $divisionsFilter = $divisi === 'Semua' ? ['bar', 'dapur'] : [strtolower($divisi)];

        [$startDate, $endDate] = $this->resolvePeriod($tanggal, $periode);

        $salesItems = SalesReportItem::query()
            ->with(['item.itemCategory', 'salesReport.user'])
            ->whereHas('salesReport', function ($query) use ($startDate, $endDate) {
                $query->whereBetween('tanggal_transaksi', [$startDate, $endDate])
                    ->whereHas('user', fn ($userQuery) => $userQuery->whereIn('role', ['bar', 'dapur', 'kitchen', 'staff_kitchen']));
            })
            ->whereHas('item', function ($query) use ($search, $divisionsFilter) {
                // 🔥 TERAPKAN FILTER DIVISI DI SINI
                $query->whereIn('division', $divisionsFilter)
                    ->when($search !== '', fn ($itemQuery) => $itemQuery->where('nama', 'like', "%{$search}%"));
            })
            ->get();

        // 🔥 TERAPKAN FILTER DIVISI DI RESEP JUGA
        $recipes = Recipe::with('category')->whereIn('division', $divisionsFilter)->get();
        $recipesByItemId = $recipes->filter(fn (Recipe $recipe) => $recipe->item_id !== null)->keyBy('item_id');
        $recipesByDivisionAndName = $recipes->groupBy(fn (Recipe $recipe) => "{$recipe->division}|{$recipe->name}");

        $groupedItems = $salesItems->groupBy('item_id')
            ->map(function ($lines, $itemId) use ($recipesByItemId, $recipesByDivisionAndName) {
                $item = $lines->first()->item;
                $recipe = $recipesByItemId->get($itemId)
                    ?? $recipesByDivisionAndName->get("{$item->division}|{$item->nama}")?->first();
                $terjual = (float) $lines->sum('quantity');
                
                $omsetBersih = (float) $lines->sum(fn (SalesReportItem $line) => $this->netRevenueForLine($line));
                $hppSatuan = (float) ($recipe?->total_hpp ?? 0);
                
                // 🔥 RUMUS PERKALIAN DIPERBAIKI (*)
                $totalHpp = round($terjual * $hppSatuan, 2);
                $hargaJualRiil = $terjual > 0 ? round($omsetBersih / $terjual, 2) : 0;

                return [
                    'id' => (int) $itemId,
                    'nama' => $item->nama,
                    'kategori' => $recipe?->category?->name ?? $item->itemCategory?->name ?? $item->kategori_item ?? 'Menu',
                    'terjual' => $terjual,
                    'total_hpp' => $totalHpp,
                    'harga_jual_riil' => $hargaJualRiil,
                    // 🔥 RUMUS PENGURANGAN DIPERBAIKI (-)
                    'profit_riil_satuan' => round($hargaJualRiil - $hppSatuan, 2),
                    'total_profit_real' => round($omsetBersih - $totalHpp, 2),
                ];
            })
            ->sortBy('nama', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        // Hitung Total Ringkasan
        $totalOmsetReal = round((float) $salesItems->sum(fn (SalesReportItem $line) => $this->netRevenueForLine($line)), 2);
        $totalProfitRealSum = round($groupedItems->sum('total_profit_real'), 2);
        
        // 🔥 INI PENAMBAHAN UNTUK TOTAL KESELURUHAN DI FRONTEND
        $totalTerjualSum = $groupedItems->sum('terjual');
        $totalHppSum = $groupedItems->sum('total_hpp');

        // 🔥 DATA RINGKASAN DI-UPDATE
        $ringkasan = [
            'totalOmsetReal' => $totalOmsetReal,
            'totalProfitReal' => $totalProfitRealSum,
            'totalTerjual' => $totalTerjualSum,
            'totalHpp' => $totalHppSum,
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
                'divisi' => $divisi, // 🔥 PASTIKAN DIVISI DIKIRIM KE FRONTEND
            ],
        ]);
    }

    public function export(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $periode = $request->input('periode', 'Harian');
        $tanggal = $this->resolveDate($request->input('tanggal'));

        // 🔥 PENAMBAHAN FILTER DIVISI UNTUK EXPORT
        $divisi = $request->input('divisi', 'Semua');
        $divisionsFilter = $divisi === 'Semua' ? ['bar', 'dapur'] : [strtolower($divisi)];

        [$startDate, $endDate] = $this->resolvePeriod($tanggal, $periode);

        $salesItems = SalesReportItem::query()
            ->with(['item.itemCategory', 'salesReport.user'])
            ->whereHas('salesReport', function ($query) use ($startDate, $endDate) {
                $query->whereBetween('tanggal_transaksi', [$startDate, $endDate])
                    ->whereHas('user', fn ($userQuery) => $userQuery->whereIn('role', ['bar', 'dapur', 'kitchen', 'staff_kitchen']));
            })
            ->whereHas('item', function ($query) use ($search, $divisionsFilter) {
                // 🔥 TERAPKAN FILTER DIVISI DI SINI
                $query->whereIn('division', $divisionsFilter)
                    ->when($search !== '', fn ($itemQuery) => $itemQuery->where('nama', 'like', "%{$search}%"));
            })
            ->get();

        // 🔥 TERAPKAN FILTER DIVISI DI RESEP JUGA
        $recipes = Recipe::with('category')->whereIn('division', $divisionsFilter)->get();
        $recipesByItemId = $recipes->filter(fn (Recipe $recipe) => $recipe->item_id !== null)->keyBy('item_id');
        $recipesByDivisionAndName = $recipes->groupBy(fn (Recipe $recipe) => "{$recipe->division}|{$recipe->name}");

        $groupedItems = $salesItems->groupBy('item_id')
            ->map(function ($lines, $itemId) use ($recipesByItemId, $recipesByDivisionAndName) {
                $item = $lines->first()->item;
                $recipe = $recipesByItemId->get($itemId)
                    ?? $recipesByDivisionAndName->get("{$item->division}|{$item->nama}")?->first();
                $terjual = (float) $lines->sum('quantity');
                $omsetBersih = (float) $lines->sum(fn (SalesReportItem $line) => $this->netRevenueForLine($line));
                $hppSatuan = (float) ($recipe?->total_hpp ?? 0);
                
                // 🔥 RUMUS PERKALIAN DIPERBAIKI (*)
                $totalHpp = round($terjual * $hppSatuan, 2);
                $hargaJualRiil = $terjual > 0 ? round($omsetBersih / $terjual, 2) : 0;

                return [
                    'nama' => $item->nama,
                    'kategori' => $recipe?->category?->name ?? $item->itemCategory?->name ?? $item->kategori_item ?? 'Menu',
                    'terjual' => $terjual,
                    'total_hpp' => $totalHpp,
                    'harga_jual_riil' => $hargaJualRiil,
                    // 🔥 RUMUS PENGURANGAN DIPERBAIKI (-)
                    'profit_riil_satuan' => round($hargaJualRiil - $hppSatuan, 2),
                    'total_profit_real' => round($omsetBersih - $totalHpp, 2),
                ];
            })
            ->sortBy('nama', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        $totalOmsetReal = round((float) $salesItems->sum(fn (SalesReportItem $line) => $this->netRevenueForLine($line)), 2);
        $totalProfitRealSum = round($groupedItems->sum('total_profit_real'), 2);
        $totalTerjualSum = $groupedItems->sum('terjual');
        $totalHppSum = $groupedItems->sum('total_hpp');

        // 🔥 NAMA FILE EXCEL BISA MENGIKUTI DIVISI
        $namaDivisi = $divisi !== 'Semua' ? '-' . strtolower($divisi) : '';
        $filename = 'laporan-analisis-profit-' . strtolower($periode) . $namaDivisi . '-' . $tanggal->format('Y-m-d') . '.xlsx';

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\AnalisaProfitExport(
                $groupedItems, 
                $periode, 
                $startDate, 
                $endDate, 
                $totalOmsetReal, 
                $totalProfitRealSum, 
                $totalTerjualSum, 
                $totalHppSum
            ), 
            $filename
        );
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

        // 🔥 PERBAIKAN FATAL: LOGIKA HITUNGAN DISKON DAN FEE DIKEMBALIKAN DENGAN BENAR (-) dan (*)
        $totalBersih = $report->total_bersih !== null 
            ? (float) $report->total_bersih 
            : (float) ($report->subtotal - ($report->subtotal * ($report->diskon_persen ?? 0) / 100) - ($report->fee_mitra ?? 0));

        if ($reportSubtotal <= 0) {
            return (float) $line->subtotal;
        }

        return ((float) $line->subtotal / $reportSubtotal) * $totalBersih;
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