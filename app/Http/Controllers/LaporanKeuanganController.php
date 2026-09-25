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
        $jumlahTransaksi  = 0;
        $transaksiTerakhir = null;

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
                    {$feeExpression} as fee,
                    COUNT(*) as jumlah_transaksi,
                    MAX({$dateCol}) as transaksi_terakhir
                ")
                ->first();

            if ($salesReportData) {
                $penjualanKotor   = (float) $salesReportData->kotor;
                $diskonVoucher    = (float) $salesReportData->diskon;
                $potonganMerchant = (float) $salesReportData->fee;
                $jumlahTransaksi  = (int) $salesReportData->jumlah_transaksi;
                $transaksiTerakhir = $salesReportData->transaksi_terakhir;
            }
        }

        // =========================================================================
        // 2. HITUNG TOTAL HPP DARI DETAIL ITEM NOTA
        // =========================================================================
        $hppMenuTerjual = 0;

        if (Schema::hasTable('sales_report_items') && Schema::hasTable('sales_reports') && Schema::hasTable('items') && Schema::hasTable('recipes')) {
            $salesCols = Schema::getColumnListing('sales_reports');
            $salesDateCol = in_array('tanggal_transaksi', $salesCols) ? 'tanggal_transaksi' :
                           (in_array('tanggal', $salesCols) ? 'tanggal' : 'created_at');

            $recipeCols = Schema::getColumnListing('recipes');
            $hppCol = in_array('total_hpp', $recipeCols) ? 'total_hpp' :
                     (in_array('harga_hpp', $recipeCols) ? 'harga_hpp' :
                     (in_array('hpp', $recipeCols) ? 'hpp' : null));

            if ($hppCol) {
                // Hubungkan sales_report_items -> items -> recipes berdasarkan nama menu
                $hppMenuTerjual = (float) DB::table('sales_report_items')
                    ->join('sales_reports', 'sales_report_items.sales_report_id', '=', 'sales_reports.id')
                    ->join('items', 'sales_report_items.item_id', '=', 'items.id')
                    ->join('recipes', 'items.nama', '=', 'recipes.name')
                    ->whereYear("sales_reports.{$salesDateCol}", $year)
                    ->whereMonth("sales_reports.{$salesDateCol}", $month)
                    ->sum(DB::raw("sales_report_items.quantity * COALESCE(recipes.{$hppCol}, 0)"));
            }
        }

        // =========================================================================
        // 3. AMBIL TOTAL KERUGIAN BAHAN BAKU (WASTE) YANG DIVERIFIKASI
        // =========================================================================
        $bebanKerugianBahan = 0;
        if (Schema::hasTable('laporan_kerugians') && Schema::hasTable('items')) {
            $lossCols = Schema::getColumnListing('laporan_kerugians');
            $lossDateCol = in_array('tanggal', $lossCols) ? 'tanggal' : 'created_at';
            $lossCol = in_array('total_loss_amount', $lossCols) ? 'total_loss_amount' :
                (in_array('total_loss', $lossCols) ? 'total_loss' : null);

            if ($lossCol) {
                $bebanKerugianBahan = (float) DB::table('laporan_kerugians')
                    ->where('status', 'verified')
                    ->whereYear($lossDateCol, $year)
                    ->whereMonth($lossDateCol, $month)
                    ->sum($lossCol);
            } elseif (in_array('kuantitas', $lossCols) && Schema::hasColumn('items', 'harga_dasar')) {
                $bebanKerugianBahan = (float) DB::table('laporan_kerugians')
                    ->join('items', 'laporan_kerugians.item_id', '=', 'items.id')
                    ->where('laporan_kerugians.status', 'Disetujui')
                    ->whereYear("laporan_kerugians.{$lossDateCol}", $year)
                    ->whereMonth("laporan_kerugians.{$lossDateCol}", $month)
                    ->sum(DB::raw('laporan_kerugians.kuantitas * COALESCE(items.harga_dasar, 0)'));
            }
        }

        // =========================================================================
        // 4. BIAYA OPERASIONAL (OPEX) BULANAN
        // =========================================================================
        $biayaGaji         = 0;
        $biayaPerlengkapan = 0;
        $biayaUtilitas     = 0;
        $opexUpdatedAt     = null;

        if (Schema::hasTable('operational_expenses')) {
            $opex = DB::table('operational_expenses')
                ->where('periode', $monthParam)
                ->first();

            $biayaGaji         = (float) ($opex->biaya_gaji ?? 0);
            $biayaPerlengkapan = (float) ($opex->biaya_perlengkapan ?? 0);
            $biayaUtilitas     = (float) ($opex->biaya_utilitas ?? 0);
            $opexUpdatedAt     = $opex->updated_at ?? null;
        }

        // =========================================================================
        // 5. STRUKTURKAN PAYLOAD DATA UNTUK INERTIA REACT
        // =========================================================================
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
            'jumlahTransaksi'    => $jumlahTransaksi,
            'transaksiTerakhir'  => $transaksiTerakhir
                ? Carbon::parse($transaksiTerakhir)->translatedFormat('d F Y')
                : null,
            'opexUpdatedAt'      => $opexUpdatedAt
                ? Carbon::parse($opexUpdatedAt)->translatedFormat('d F Y, H:i')
                : null,
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
            'periode'            => 'required|date_format:Y-m',
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