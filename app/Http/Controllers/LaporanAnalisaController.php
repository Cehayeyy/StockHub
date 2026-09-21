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
        $search = trim((string) $request->input('search', ''));
        $periode = $request->input('periode', 'Harian');
        $tanggal = $this->resolveDate($request->input('tanggal'));
        [$startDate, $endDate] = $this->resolvePeriod($tanggal, $periode);

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

        $recipes = Recipe::with('category')->whereIn('division', ['bar', 'dapur'])->get();
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
                $totalHpp = round($terjual * $hppSatuan, 2);
                $hargaJualRiil = $terjual > 0 ? round($omsetBersih / $terjual, 2) : 0;

                return [
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

        // Hitung Total Ringkasan
        $totalOmsetReal = round((float) $salesItems->sum(fn (SalesReportItem $line) => $this->netRevenueForLine($line)), 2);
        $totalProfitRealSum = round($groupedItems->sum('total_profit_real'), 2);
        $totalTerjualSum = $groupedItems->sum('terjual');
        $totalHppSum = $groupedItems->sum('total_hpp');

        $filename = 'laporan-analisis-profit-' . strtolower($periode) . '-' . $tanggal->format('Y-m-d') . '.csv';

        $headers = [
            "Content-type"        => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename={$filename}",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function () use ($groupedItems, $periode, $startDate, $endDate, $totalOmsetReal, $totalProfitRealSum, $totalTerjualSum, $totalHppSum) {
            $file = fopen('php://output', 'w');
            // Tambahkan BOM agar Excel mendeteksi format UTF-8 dengan benar
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            // 1. KOP LAPORAN PROFESIONAL
            fputcsv($file, ['WARUNG CANGKRUK - LAPORAN ANALISIS PROFIT PER MENU'], ';');
            fputcsv($file, ['Periode Laporan:', $periode], ';');
            fputcsv($file, ['Rentang Tanggal:', $startDate->format('d/m/Y') . ' s/d ' . $endDate->format('d/m/Y')], ';');
            fputcsv($file, ['Tanggal Cetak:', now()->format('d/m/Y H:i') . ' WIB'], ';');
            fputcsv($file, [], ';'); // Baris kosong pemisah

            // 2. KARTU RINGKASAN EKsekutif (SUMMARY CARDS)
            fputcsv($file, ['RINGKASAN EKSEKUTIF'], ';');
            fputcsv($file, ['Total Omset Real / Net (Setelah Diskon & Fee):', number_format($totalOmsetReal, 0, ',', '.')], ';');
            fputcsv($file, ['Total Profit Real (Keuntungan Bersih):', number_format($totalProfitRealSum, 0, ',', '.')], ';');
            fputcsv($file, [], ';'); // Baris kosong pemisah

            // 3. HEADER TABEL UTAMA
            fputcsv($file, ['RINCIAN ANALISIS PER MENU'], ';');
            fputcsv($file, [
                'No', 
                'Nama Menu', 
                'Kategori', 
                'Terjual (Porsi)', 
                'Total HPP (Rp)', 
                'Harga Jual Riil / Net (Rp)', 
                'Profit Riil Satuan (Rp)', 
                'Total Profit Real (Rp)'
            ], ';');

            // 4. ISI DATA TABEL
            foreach ($groupedItems as $index => $row) {
                fputcsv($file, [
                    $index + 1,
                    $row['nama'],
                    strtoupper($row['kategori']),
                    $row['terjual'],
                    $row['total_hpp'],
                    $row['harga_jual_riil'],
                    $row['profit_riil_satuan'],
                    $row['total_profit_real'],
                ], ';');
            }

            // 5. FOOTER TOTAL KESELURUHAN
            fputcsv($file, [
                'TOTAL KESELURUHAN',
                '',
                '',
                $totalTerjualSum,
                $totalHppSum,
                '-',
                '-',
                $totalProfitRealSum
            ], ';');

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
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

        $totalBersih = $report->total_bersih !== null ? (float) $report->total_bersih : (float) ($report->subtotal - ($report->subtotal * ($report->diskon_persen ?? 0) / 100) - ($report->fee_mitra ?? 0));

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