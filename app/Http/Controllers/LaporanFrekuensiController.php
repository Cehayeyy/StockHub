<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LaporanFrekuensiController extends Controller
{
    public function index(Request $request)
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

        $frekuensiData = collect(); // Default koleksi kosong jika terjadi kesalahan
        $ringkasan = [
            'totalTerjual' => 0,
            'totalOmset' => 0,
            'totalProfit' => 0
        ];

        if (Schema::hasTable('sales_report_items') && Schema::hasTable('sales_reports')) {
            $salesCols = Schema::getColumnListing('sales_reports');
            $itemCols  = Schema::getColumnListing('sales_report_items');

            // Deteksi kolom tanggal
            $dateCol = in_array('tanggal_transaksi', $salesCols) ? 'sales_reports.tanggal_transaksi' :
                      (in_array('tanggal', $salesCols) ? 'sales_reports.tanggal' : 'sales_reports.created_at');

            $hasItemId = in_array('item_id', $itemCols) && Schema::hasTable('items');
            $hasRecipes = Schema::hasTable('recipes');

            // ---------------------------------------------------------
            // FUNGSI UNTUK MERAKIT QUERY DASAR (Digunakan 2x)
            // ---------------------------------------------------------
            $buildBaseQuery = function() use ($salesCols, $hasItemId, $hasRecipes) {
                $query = DB::table('sales_report_items')
                    ->join('sales_reports', 'sales_report_items.sales_report_id', '=', 'sales_reports.id');

                if ($hasItemId) {
                    $query->leftJoin('items', 'sales_report_items.item_id', '=', 'items.id');

                    $itemColumns = Schema::getColumnListing('items');
                    if (in_array('division', $itemColumns)) {
                        $query->whereIn('items.division', ['bar', 'dapur', 'kitchen']);
                    }

                    if (Schema::hasColumn('items', 'item_category_id') && Schema::hasTable('item_categories')) {
                        $query->leftJoin('item_categories', 'items.item_category_id', '=', 'item_categories.id');
                    }
                }

                if ($hasRecipes && $hasItemId) {
                    $query->leftJoin('recipes', 'items.nama', '=', 'recipes.name');
                }

                if (in_array('user_id', $salesCols) && Schema::hasTable('users')) {
                    $query->join('users', 'sales_reports.user_id', '=', 'users.id')
                        ->whereIn('users.role', ['bar', 'dapur', 'kitchen', 'staff_kitchen']);
                }

                return $query;
            };

            // Ekspresi Seleksi Nama & Kategori
            $selectNama = $hasItemId ? "COALESCE(items.nama, 'Menu Unnamed')" : "'Menu Unnamed'";
            $selectKategori = (Schema::hasTable('item_categories') && $hasItemId)
                ? "COALESCE(item_categories.name, items.kategori_item, 'Menu')"
                : "COALESCE(items.kategori_item, 'Menu')";

            $hppExpr = $hasRecipes ? "COALESCE(recipes.total_hpp, 0)" : "0";

            // ---------------------------------------------------------
            // 1. QUERY UNTUK DATA TABEL (PAGINATION 10 PER HALAMAN)
            // ---------------------------------------------------------
            $frekuensiData = $buildBaseQuery()
                ->whereYear($dateCol, $year)
                ->whereMonth($dateCol, $month)
                ->select(
                    DB::raw("{$selectNama} as nama_item"),
                    DB::raw("{$selectKategori} as kategori"),
                    DB::raw("COUNT(DISTINCT sales_reports.id) as frekuensi_pembelian"),
                    DB::raw("SUM(sales_report_items.quantity) as total_kuantitas"),
                    DB::raw("SUM(sales_report_items.quantity * sales_report_items.harga_satuan) as total_nominal"),
                    DB::raw("SUM(sales_report_items.quantity * (sales_report_items.harga_satuan - {$hppExpr})) as total_profit")
                )
                ->groupBy('nama_item', 'kategori')
                ->orderBy('total_kuantitas', 'desc')
                ->paginate(10)
                ->withQueryString(); // 🔥 UBAH: dari get() menjadi paginate(10)

            // ---------------------------------------------------------
            // 2. QUERY UNTUK GRAND TOTAL KESELURUHAN (Semua Data)
            // ---------------------------------------------------------
            $totalData = $buildBaseQuery()
                ->whereYear($dateCol, $year)
                ->whereMonth($dateCol, $month)
                ->select(
                    DB::raw("SUM(sales_report_items.quantity) as total_kuantitas"),
                    DB::raw("SUM(sales_report_items.quantity * sales_report_items.harga_satuan) as total_nominal"),
                    DB::raw("SUM(sales_report_items.quantity * (sales_report_items.harga_satuan - {$hppExpr})) as total_profit")
                )
                ->first();

            // Masukkan ke array ringkasan
            $ringkasan = [
                'totalTerjual' => (float) ($totalData->total_kuantitas ?? 0),
                'totalOmset' => (float) ($totalData->total_nominal ?? 0),
                'totalProfit' => (float) ($totalData->total_profit ?? 0)
            ];
        }

        return Inertia::render('Laporan/FrekuensiPembelian', [
            'frekuensiItems' => $frekuensiData,
            'ringkasan'      => $ringkasan, // 🔥 DATA TOTAL KESELURUHAN DIKIRIM KE FRONTEND
            'selectedMonth'  => $monthParam,
            'periodeFormatted' => $date->translatedFormat('F Y'),
        ]);
    }

    public function export(Request $request)
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

        if (Schema::hasTable('sales_report_items') && Schema::hasTable('sales_reports')) {
            $salesCols = Schema::getColumnListing('sales_reports');
            $itemCols  = Schema::getColumnListing('sales_report_items');

            $dateCol = in_array('tanggal_transaksi', $salesCols) ? 'sales_reports.tanggal_transaksi' :
                      (in_array('tanggal', $salesCols) ? 'sales_reports.tanggal' : 'sales_reports.created_at');

            $hasItemId = in_array('item_id', $itemCols) && Schema::hasTable('items');
            $hasRecipes = Schema::hasTable('recipes');

            $buildBaseQuery = function() use ($salesCols, $hasItemId, $hasRecipes) {
                $query = DB::table('sales_report_items')
                    ->join('sales_reports', 'sales_report_items.sales_report_id', '=', 'sales_reports.id');

                if ($hasItemId) {
                    $query->leftJoin('items', 'sales_report_items.item_id', '=', 'items.id');

                    $itemColumns = Schema::getColumnListing('items');
                    if (in_array('division', $itemColumns)) {
                        $query->whereIn('items.division', ['bar', 'dapur', 'kitchen']);
                    }

                    if (Schema::hasColumn('items', 'item_category_id') && Schema::hasTable('item_categories')) {
                        $query->leftJoin('item_categories', 'items.item_category_id', '=', 'item_categories.id');
                    }
                }

                if ($hasRecipes && $hasItemId) {
                    $query->leftJoin('recipes', 'items.nama', '=', 'recipes.name');
                }

                if (in_array('user_id', $salesCols) && Schema::hasTable('users')) {
                    $query->join('users', 'sales_reports.user_id', '=', 'users.id')
                        ->whereIn('users.role', ['bar', 'dapur', 'kitchen', 'staff_kitchen']);
                }

                return $query;
            };

            $selectNama = $hasItemId ? "COALESCE(items.nama, 'Menu Unnamed')" : "'Menu Unnamed'";
            $selectKategori = (Schema::hasTable('item_categories') && $hasItemId)
                ? "COALESCE(item_categories.name, items.kategori_item, 'Menu')"
                : "COALESCE(items.kategori_item, 'Menu')";

            $hppExpr = $hasRecipes ? "COALESCE(recipes.total_hpp, 0)" : "0";

            // 🔥 MENGGUNAKAN GET() UNTUK MENGAMBIL SEMUA DATA (TANPA PAGINATION)
            $frekuensiData = $buildBaseQuery()
                ->whereYear($dateCol, $year)
                ->whereMonth($dateCol, $month)
                ->select(
                    DB::raw("{$selectNama} as nama_item"),
                    DB::raw("{$selectKategori} as kategori"),
                    DB::raw("COUNT(DISTINCT sales_reports.id) as frekuensi_pembelian"),
                    DB::raw("SUM(sales_report_items.quantity) as total_kuantitas"),
                    DB::raw("SUM(sales_report_items.quantity * sales_report_items.harga_satuan) as total_nominal"),
                    DB::raw("SUM(sales_report_items.quantity * (sales_report_items.harga_satuan - {$hppExpr})) as total_profit")
                )
                ->groupBy('nama_item', 'kategori')
                ->orderBy('total_kuantitas', 'desc')
                ->get(); 

            // Kalkulasi Total untuk Ringkasan
            $ringkasan = [
                'totalTerjual' => (float) $frekuensiData->sum('total_kuantitas'),
                'totalOmset' => (float) $frekuensiData->sum('total_nominal'),
                'totalProfit' => (float) $frekuensiData->sum('total_profit')
            ];

            $periodeFormatted = $date->translatedFormat('F Y');
            $filename = 'laporan-frekuensi-' . $monthParam . '.xlsx';

            // 🔥 MEMANGGIL LIBRARY EXCEL
            return \Maatwebsite\Excel\Facades\Excel::download(
                new \App\Exports\FrekuensiExport($frekuensiData, $ringkasan, $periodeFormatted), 
                $filename
            );
        }

        return back()->with('error', 'Data tidak ditemukan.');
    }
}