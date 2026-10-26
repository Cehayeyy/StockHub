<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Exports\LaporanKeuanganExport;
use Maatwebsite\Excel\Facades\Excel;

class LaporanKeuanganController extends Controller
{
    // Fungsi bantuan untuk mengambil data (Digunakan oleh Web & Excel)
    private function getKeuanganData($dateParam)
    {
        Carbon::setLocale('id');

        try {
            // 🔥 UBAH 1: Format Y-m diubah menjadi Y-m-d (Harian)
            $date = Carbon::createFromFormat('Y-m-d', $dateParam);
        } catch (\Exception $e) {
            $date = Carbon::now();
            $dateParam = $date->format('Y-m-d');
        }

        // Variabel untuk mengambil Beban Operasional (OPEX) yang sifatnya tetap bulanan
        $monthParam = $date->format('Y-m'); 

        $pendapatanBar = 0; $pendapatanDapur = 0; $pendapatanTrekking = 0;
        $hppBar = 0; $hppDapur = 0; $hppTrekking = 0;

        // 1 & 2. REKAP PENDAPATAN & HPP (Berdasarkan Tanggal Spesifik)
        if (Schema::hasTable('sales_report_items') && Schema::hasTable('sales_reports') && Schema::hasTable('items')) {
            $salesCols = Schema::getColumnListing('sales_reports');
            $salesDateCol = in_array('tanggal_transaksi', $salesCols) ? 'tanggal_transaksi' : (in_array('tanggal', $salesCols) ? 'tanggal' : 'created_at');

            $recipeCols = Schema::hasTable('recipes') ? Schema::getColumnListing('recipes') : [];
            $hppCol = in_array('total_hpp', $recipeCols) ? 'total_hpp' : (in_array('harga_hpp', $recipeCols) ? 'harga_hpp' : (in_array('hpp', $recipeCols) ? 'hpp' : null));

            $hasSnapshotCol = Schema::hasColumn('sales_report_items', 'hpp_saat_transaksi');

            $query = DB::table('sales_report_items')
                ->join('sales_reports', 'sales_report_items.sales_report_id', '=', 'sales_reports.id')
                ->join('items', 'sales_report_items.item_id', '=', 'items.id')
                // 🔥 UBAH 2: Ganti whereYear & whereMonth menjadi whereDate
                ->whereDate("sales_reports.{$salesDateCol}", $dateParam);

            if ($hppCol) { $query->leftJoin('recipes', 'items.nama', '=', 'recipes.name'); }

            $hppRaw = $hasSnapshotCol && $hppCol 
                ? "CASE WHEN sales_report_items.hpp_saat_transaksi > 0 THEN sales_report_items.hpp_saat_transaksi ELSE COALESCE(recipes.{$hppCol}, 0) END"
                : ($hppCol ? "COALESCE(recipes.{$hppCol}, 0)" : "0");

            $itemsData = $query->select(
                'items.division',
                DB::raw('SUM(sales_report_items.subtotal) as total_pendapatan'),
                DB::raw("SUM(sales_report_items.quantity * {$hppRaw}) as total_hpp")
            )->groupBy('items.division')->get();

            foreach ($itemsData as $row) {
                $div = strtolower($row->division ?? '');
                if ($div === 'bar') {
                    $pendapatanBar += (float) $row->total_pendapatan; $hppBar += (float) $row->total_hpp;
                } elseif (in_array($div, ['dapur', 'kitchen'])) {
                    $pendapatanDapur += (float) $row->total_pendapatan; $hppDapur += (float) $row->total_hpp;
                } elseif ($div === 'trekking') {
                    $pendapatanTrekking += (float) $row->total_pendapatan; $hppTrekking += (float) $row->total_hpp;
                }
            }
        }

        // 3. KERUGIAN BAHAN BAKU (Berdasarkan Tanggal Spesifik)
        $kerugianBahanBaku = 0;
        if (Schema::hasTable('laporan_kerugians') && Schema::hasTable('items')) {
            $lossCols = Schema::getColumnListing('laporan_kerugians');
            $lossDateCol = in_array('tanggal', $lossCols) ? 'tanggal' : 'created_at';
            $lossCol = in_array('total_loss_amount', $lossCols) ? 'total_loss_amount' : (in_array('total_loss', $lossCols) ? 'total_loss' : null);

            if ($lossCol) {
                $kerugianBahanBaku = (float) DB::table('laporan_kerugians')
                    ->whereIn('status', ['verified', 'Disetujui'])
                    // 🔥 UBAH 3: Ganti whereYear & whereMonth menjadi whereDate
                    ->whereDate($lossDateCol, $dateParam)
                    ->sum($lossCol);
            } elseif (in_array('kuantitas', $lossCols) && Schema::hasColumn('items', 'harga_dasar')) {
                $kerugianBahanBaku = (float) DB::table('laporan_kerugians')
                    ->join('items', 'laporan_kerugians.item_id', '=', 'items.id')
                    ->where('laporan_kerugians.status', 'Disetujui')
                    // 🔥 UBAH 4: Ganti whereYear & whereMonth menjadi whereDate
                    ->whereDate("laporan_kerugians.{$lossDateCol}", $dateParam)
                    ->sum(DB::raw('laporan_kerugians.kuantitas * COALESCE(items.harga_dasar, 0)'));
            }
        }

        // 4. OPEX (Beban Operasional ditarik secara bulanan menggunakan $monthParam)
        $opexData = (object) [
            'biaya_gaji' => 0, 'perlengkapan_warung' => 0, 'admin_bank' => 0, 'operasional_warung' => 0,
            'biaya_sewa' => 0, 'perbaikan_inventaris' => 0, 'pemeliharaan_warung' => 0, 'biaya_marketing' => 0,
            'biaya_lain_lain' => 0, 'biaya_pajak' => 0, 'utilitas' => 0, 'beban_lain_lain' => 0, 'pajak_penghasilan' => 0,
        ];

        if (Schema::hasTable('operational_expenses')) {
            $opex = DB::table('operational_expenses')->where('periode', $monthParam)->first();
            if ($opex) {
                $opexData->biaya_gaji = (float) ($opex->biaya_gaji ?? 0);
                $opexData->perlengkapan_warung = (float) ($opex->perlengkapan_warung ?? $opex->biaya_perlengkapan ?? 0);
                $opexData->admin_bank = (float) ($opex->admin_bank ?? 0);
                $opexData->operasional_warung = (float) ($opex->operasional_warung ?? 0);
                $opexData->biaya_sewa = (float) ($opex->biaya_sewa ?? 0);
                $opexData->perbaikan_inventaris = (float) ($opex->perbaikan_inventaris ?? 0);
                $opexData->pemeliharaan_warung = (float) ($opex->pemeliharaan_warung ?? 0);
                $opexData->biaya_marketing = (float) ($opex->biaya_marketing ?? 0);
                $opexData->biaya_lain_lain = (float) ($opex->biaya_lain_lain ?? 0);
                $opexData->biaya_pajak = (float) ($opex->biaya_pajak ?? 0);
                $opexData->utilitas = (float) ($opex->utilitas ?? $opex->biaya_utilitas ?? 0);
                $opexData->beban_lain_lain = (float) ($opex->beban_lain_lain ?? 0);
                $opexData->pajak_penghasilan = (float) ($opex->pajak_penghasilan ?? 0);
            }
        }

        return [
            // 🔥 UBAH 5: Menggunakan tanggal lengkap untuk teks periode (misal: 26 Oktober 2026)
            'periode'            => $date->translatedFormat('d F Y'),
            'pendapatanBar'      => $pendapatanBar, 'pendapatanDapur' => $pendapatanDapur, 'pendapatanTrekking' => $pendapatanTrekking,
            'hppBar'             => $hppBar, 'hppDapur' => $hppDapur, 'hppTrekking' => $hppTrekking,
            'biayaGaji'           => $opexData->biaya_gaji,
            'perlengkapanWarung'  => $opexData->perlengkapan_warung,
            'kerugianBahanBaku'   => $kerugianBahanBaku,
            'adminBank'           => $opexData->admin_bank,
            'operasionalWarung'   => $opexData->operasional_warung,
            'biayaSewa'           => $opexData->biaya_sewa,
            'perbaikanInventaris' => $opexData->perbaikan_inventaris,
            'pemeliharaanWarung'  => $opexData->pemeliharaan_warung,
            'biayaMarketing'      => $opexData->biaya_marketing,
            'biayaLainLain'       => $opexData->biaya_lain_lain,
            'biayaPajak'          => $opexData->biaya_pajak,
            'utilitas'            => $opexData->utilitas,
            'bebanLainLain'       => $opexData->beban_lain_lain,
            'pajakPenghasilan'    => $opexData->pajak_penghasilan,
        ];
    }

    public function keuangan(Request $request)
    {
        // 🔥 UBAH 6: Menangkap parameter 'tanggal', bukan 'bulan'
        $dateParam = $request->input('tanggal', Carbon::now()->format('Y-m-d'));
        return Inertia::render('Laporan/LaporanKeuangan', [
            'data'         => $this->getKeuanganData($dateParam),
            'selectedDate' => $dateParam, // Diubah namanya menjadi selectedDate
        ]);
    }

    public function exportExcel(Request $request)
    {
        // 🔥 UBAH 7: Download export juga berdasarkan tanggal harian
        $dateParam = $request->input('tanggal', Carbon::now()->format('Y-m-d'));
        $dataKeuangan = $this->getKeuanganData($dateParam);

        $fileName = 'Laporan_Keuangan_Warung_Cangkruk_' . str_replace(' ', '_', $dataKeuangan['periode']) . '.xlsx';

        return Excel::download(new LaporanKeuanganExport($dataKeuangan), $fileName);
    }

    public function storeOpex(Request $request)
    {
        // Fitur Input OPEX tidak diubah dan TETAP Y-m (Bulanan) karena beban ini sifatnya per bulan
        $request->validate([
            'periode'              => 'required|date_format:Y-m',
            'biaya_gaji'           => 'required|numeric|min:0',
            'perlengkapan_warung'  => 'required|numeric|min:0',
            'admin_bank'           => 'required|numeric|min:0',
            'operasional_warung'   => 'required|numeric|min:0',
            'biaya_sewa'           => 'required|numeric|min:0',
            'perbaikan_inventaris' => 'required|numeric|min:0',
            'pemeliharaan_warung'  => 'required|numeric|min:0',
            'biaya_marketing'      => 'required|numeric|min:0',
            'biaya_lain_lain'      => 'required|numeric|min:0',
            'biaya_pajak'          => 'required|numeric|min:0',
            'utilitas'             => 'required|numeric|min:0',
            'beban_lain_lain'      => 'required|numeric|min:0',
            'pajak_penghasilan'    => 'required|numeric|min:0',
        ]);

        if (Schema::hasTable('operational_expenses')) {
            $dataToUpdate = [
                'biaya_gaji'           => $request->biaya_gaji,
                'perlengkapan_warung'  => $request->perlengkapan_warung,
                'admin_bank'           => $request->admin_bank,
                'operasional_warung'   => $request->operasional_warung,
                'biaya_sewa'           => $request->biaya_sewa,
                'perbaikan_inventaris' => $request->perbaikan_inventaris,
                'pemeliharaan_warung'  => $request->pemeliharaan_warung,
                'biaya_marketing'      => $request->biaya_marketing,
                'biaya_lain_lain'      => $request->biaya_lain_lain,
                'biaya_pajak'          => $request->biaya_pajak,
                'utilitas'             => $request->utilitas,
                'beban_lain_lain'      => $request->beban_lain_lain,
                'pajak_penghasilan'    => $request->pajak_penghasilan,
                'user_id'              => auth()->id(),
                'updated_at'           => now(),
            ];

            $columns = Schema::getColumnListing('operational_expenses');
            $safeData = array_intersect_key($dataToUpdate, array_flip($columns));
            if (in_array('created_at', $columns)) { $safeData['created_at'] = now(); }

            DB::table('operational_expenses')->updateOrInsert(['periode' => $request->periode], $safeData);
        }
        return back()->with('success', 'Biaya operasional & Laba Rugi berhasil disimpan.');
    }
}