<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LaporanKeuanganController extends Controller
{
    public function keuangan(Request $request)
    {
        Carbon::setLocale('id');

        $monthParam = $request->input('bulan', Carbon::now()->format('Y-m'));

        try {
            $date = Carbon::createFromFormat('Y-m', $monthParam);
        } catch (\Exception $e) {
            $date = Carbon::now();
            $monthParam = $date->format('Y-m');
        }

        $year = $date->year;
        $month = $date->month;
        $periodeFormatted = $date->translatedFormat('F Y');

        // =========================================================================
        // 1. REKAP PENDAPATAN DARI INPUT SALES REPORT
        // =========================================================================
        $penjualanKotor   = 0;
        $diskonVoucher    = 0;
        $potonganMerchant = 0;

        if (Schema::hasTable('sales_reports')) {
            $cols = Schema::getColumnListing('sales_reports');

            $dateCol = in_array('tanggal_transaksi', $cols) ? 'tanggal_transaksi' :
                      (in_array('tanggal', $cols) ? 'tanggal' :
                      (in_array('created_at', $cols) ? 'created_at' : 'date'));

            $kotorCol = in_array('subtotal', $cols) ? 'subtotal' :
                       (in_array('total_kotor', $cols) ? 'total_kotor' :
                       (in_array('gross_total', $cols) ? 'gross_total' : 'total_bayar'));

            $feeCol = in_array('fee_mitra', $cols) ? 'fee_mitra' :
                     (in_array('fee_merchant', $cols) ? 'fee_merchant' :
                     (in_array('merchant_fee', $cols) ? 'merchant_fee' : null));

            $diskonExpression = "0";
            if (in_array('diskon_nominal', $cols)) {
                $diskonExpression = "COALESCE(SUM(diskon_nominal), 0)";
            } elseif (in_array('diskon_persen', $cols) && in_array($kotorCol, $cols)) {
                $diskonExpression = "COALESCE(SUM(({$kotorCol} * diskon_persen) / 100), 0)";
            } elseif (in_array('diskon', $cols)) {
                $diskonExpression = "COALESCE(SUM(diskon), 0)";
            }

            $feeExpression = $feeCol ? "COALESCE(SUM({$feeCol}), 0)" : "0";

            $salesReportData = DB::table('sales_reports')
                ->whereYear($dateCol, $year)
                ->whereMonth($dateCol, $month)
                ->selectRaw("
                    COALESCE(SUM({$kotorCol}), 0) as kotor,
                    {$diskonExpression} as diskon,
                    {$feeExpression} as fee
                ")
                ->first();

            if ($salesReportData) {
                $penjualanKotor   = (float) $salesReportData->kotor;
                $diskonVoucher    = (float) $salesReportData->diskon;
                $potonganMerchant = (float) $salesReportData->fee;
            }
        }

        // =========================================================================
        // 2. HITUNG TOTAL HPP DARI DETAIL ITEM NOTA (DENGAN FALLBACK DARURAT)
        // =========================================================================
        $hppMenuTerjual = 0;

        if (Schema::hasTable('sales_report_items') && Schema::hasColumn('sales_report_items', 'quantity')) {
            $salesCols      = Schema::getColumnListing('sales_reports');
            $itemDetailCols = Schema::getColumnListing('sales_report_items');

            $salesDateCol = in_array('tanggal_transaksi', $salesCols) ? 'sales_reports.tanggal_transaksi' :
                           (in_array('tanggal', $salesCols) ? 'sales_reports.tanggal' : 'sales_reports.created_at');

            // Opsi 1: Coba hitung HPP dari recipe_id
            if (in_array('recipe_id', $itemDetailCols) && Schema::hasTable('recipes')) {
                $recipeCols = Schema::getColumnListing('recipes');
                $hppCol = in_array('harga_hpp', $recipeCols) ? 'harga_hpp' :
                         (in_array('hpp', $recipeCols) ? 'hpp' :
                         (in_array('total_cost', $recipeCols) ? 'total_cost' : null));

                if ($hppCol) {
                    $hppMenuTerjual = (float) DB::table('sales_report_items')
                        ->join('sales_reports', 'sales_report_items.sales_report_id', '=', 'sales_reports.id')
                        ->join('recipes', 'sales_report_items.recipe_id', '=', 'recipes.id')
                        ->whereYear($salesDateCol, $year)
                        ->whereMonth($salesDateCol, $month)
                        ->sum(DB::raw("sales_report_items.quantity * COALESCE(recipes.{$hppCol}, 0)"));
                }
            }

            // Opsi 2: Coba hitung HPP dari item_id
            if ($hppMenuTerjual == 0 && in_array('item_id', $itemDetailCols) && Schema::hasTable('items')) {
                $itemCols = Schema::getColumnListing('items');
                $hppCol = in_array('harga_dasar', $itemCols) ? 'harga_dasar' :
                         (in_array('harga_beli', $itemCols) ? 'harga_beli' :
                         (in_array('harga_hpp', $itemCols) ? 'harga_hpp' : null));

                if ($hppCol) {
                    $hppMenuTerjual = (float) DB::table('sales_report_items')
                        ->join('sales_reports', 'sales_report_items.sales_report_id', '=', 'sales_reports.id')
                        ->join('items', 'sales_report_items.item_id', '=', 'items.id')
                        ->whereYear($salesDateCol, $year)
                        ->whereMonth($salesDateCol, $month)
                        ->sum(DB::raw("sales_report_items.quantity * COALESCE(items.{$hppCol}, 0)"));
                }
            }

            // Fallback: hitung estimasi 40% dari harga_satuan nota
            if ($hppMenuTerjual == 0 && in_array('harga_satuan', $itemDetailCols)) {
                $hppMenuTerjual = (float) DB::table('sales_report_items')
                    ->join('sales_reports', 'sales_report_items.sales_report_id', '=', 'sales_reports.id')
                    ->whereYear($salesDateCol, $year)
                    ->whereMonth($salesDateCol, $month)
                    ->sum(DB::raw("sales_report_items.quantity * (sales_report_items.harga_satuan * 0.4)"));
            }
        }

        // =========================================================================
        // 3. AMBIL TOTAL KERUGIAN BAHAN BAKU (WASTE) YANG DIVERIFIKASI
        // =========================================================================
        $bebanKerugianBahan = 0;
        if (Schema::hasTable('laporan_kerugians')) {
            $lossCols = Schema::getColumnListing('laporan_kerugians');
            $lossCol = in_array('total_loss_amount', $lossCols) ? 'total_loss_amount' :
                      (in_array('total_loss', $lossCols) ? 'total_loss' : 'nominal');

            $lossDateCol = in_array('tanggal', $lossCols) ? 'tanggal' : 'created_at';

            if (in_array($lossCol, $lossCols)) {
                $bebanKerugianBahan = (float) DB::table('laporan_kerugians')
                    ->where('status', 'verified')
                    ->whereYear($lossDateCol, $year)
                    ->whereMonth($lossDateCol, $month)
                    ->sum($lossCol);
            }
        }

        // =========================================================================
        // 4. BIAYA OPERASIONAL (OPEX) BULANAN
        // =========================================================================
        $biayaGaji         = 0;
        $biayaPerlengkapan = 0;
        $biayaUtilitas     = 0;

        if (Schema::hasTable('operational_expenses')) {
            $opex = DB::table('operational_expenses')
                ->where('periode', $monthParam)
                ->first();

            $biayaGaji         = (float) ($opex->biaya_gaji ?? 0);
            $biayaPerlengkapan = (float) ($opex->biaya_perlengkapan ?? 0);
            $biayaUtilitas     = (float) ($opex->biaya_utilitas ?? 0);
        }

        // =========================================================================
        // 5. STRUKTURKAN PAYLOAD DATA UNTUK INERTIA REACT
        // =========================================================================
        $currentUser = auth()->user();

        $dataKeuangan = [
            'periode'            => $periodeFormatted,
            'penjualanKotor'     => $penjualanKotor,
            'diskonVoucher'      => $diskonVoucher,
            'potonganMerchant'   => $potonganMerchant,
            'hppMenuTerjual'     => $hppMenuTerjual,
            'bebanKerugianBahan' => $bebanKerugianBahan,
            'biayaGaji'          => $biayaGaji,
            'biayaPerlengkapan'  => $biayaPerlengkapan,
            'biayaUtilitas'      => $biayaUtilitas,
            'otorisasiBy'        => $currentUser->name ?? 'Supervisor Operasional',
            'otorisasiCode'      => 'SPV-' . strtoupper($currentUser->username ?? 'USER') . '-' . $date->format('Ym'),
        ];

        return Inertia::render('Laporan/LaporanKeuangan', [
            'data'          => $dataKeuangan,
            'selectedMonth' => $monthParam,
        ]);
    }

    /**
     * Simpan / Update Biaya Operasional (OPEX) ke Database
     */
    public function storeOpex(Request $request)
    {
        $request->validate([
            'periode'            => 'required|string',
            'biaya_gaji'         => 'required|numeric|min:0',
            'biaya_perlengkapan' => 'required|numeric|min:0',
            'biaya_utilitas'     => 'required|numeric|min:0',
        ]);

        if (Schema::hasTable('operational_expenses')) {
            DB::table('operational_expenses')->updateOrInsert(
                ['periode' => $request->periode],
                [
                    'biaya_gaji'         => $request->biaya_gaji,
                    'biaya_perlengkapan' => $request->biaya_perlengkapan,
                    'biaya_utilitas'     => $request->biaya_utilitas,
                    'user_id'            => auth()->id(),
                    'updated_at'         => now(),
                    'created_at'         => now(),
                ]
            );
        }

        return back()->with('success', 'Biaya operasional berhasil disimpan.');
    }
}
