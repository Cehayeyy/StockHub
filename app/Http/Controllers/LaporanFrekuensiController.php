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

        $frekuensiData = [];

        if (Schema::hasTable('sales_report_items') && Schema::hasTable('sales_reports')) {
            $salesCols = Schema::getColumnListing('sales_reports');
            $itemCols  = Schema::getColumnListing('sales_report_items');

            // Deteksi kolom tanggal
            $dateCol = in_array('tanggal_transaksi', $salesCols) ? 'sales_reports.tanggal_transaksi' :
                      (in_array('tanggal', $salesCols) ? 'sales_reports.tanggal' : 'sales_reports.created_at');

            $query = DB::table('sales_report_items')
                ->join('sales_reports', 'sales_report_items.sales_report_id', '=', 'sales_reports.id');

            // Cek ketersediaan kolom relasi secara dinamis
            $hasRecipeId = in_array('recipe_id', $itemCols) && Schema::hasTable('recipes');
            $hasItemId   = in_array('item_id', $itemCols) && Schema::hasTable('items');

            if ($hasRecipeId) {
                $query->leftJoin('recipes', 'sales_report_items.recipe_id', '=', 'recipes.id');
            }

            $hasItemCategory = $hasItemId
                && Schema::hasColumn('items', 'item_category_id')
                && Schema::hasTable('item_categories');

            if ($hasItemId) {
                $query->leftJoin('items', 'sales_report_items.item_id', '=', 'items.id');

                // Samakan cakupan dengan Laporan Analisa: hanya menu yang
                // dijual oleh bagian Bar/Dapur, bukan bahan baku.
                $itemColumns = Schema::getColumnListing('items');
                if (in_array('division', $itemColumns)) {
                    $query->whereIn('items.division', ['bar', 'dapur', 'kitchen']);
                }

                if ($hasItemCategory) {
                    $query->leftJoin('item_categories', 'items.item_category_id', '=', 'item_categories.id');
                }
            }

            // Laporan analisa menggunakan nota yang dicatat oleh petugas Bar
            // dan Dapur. Terapkan sumber transaksi yang sama di sini.
            if (in_array('user_id', $salesCols) && Schema::hasTable('users')) {
                $query->join('users', 'sales_reports.user_id', '=', 'users.id')
                    ->whereIn('users.role', ['bar', 'dapur', 'kitchen', 'staff_kitchen']);
            }

            // Ekspresi Seleksi Nama & Kategori
            if ($hasRecipeId && $hasItemId) {
                $selectNama = "COALESCE(recipes.name, items.nama, 'Menu Unnamed')";
                $selectKategori = $hasItemCategory
                    ? "COALESCE(item_categories.name, recipes.division, items.kategori_item, 'Menu')"
                    : "COALESCE(recipes.division, items.kategori_item, 'Menu')";
            } elseif ($hasRecipeId) {
                $selectNama = "COALESCE(recipes.name, 'Menu Unnamed')";
                $selectKategori = "COALESCE(recipes.division, 'Menu')";
            } elseif ($hasItemId) {
                $selectNama = "COALESCE(items.nama, 'Menu Unnamed')";
                $selectKategori = $hasItemCategory
                    ? "COALESCE(item_categories.name, items.kategori_item, 'Menu')"
                    : "COALESCE(items.kategori_item, 'Menu')";
            } else {
                $selectNama = "'Menu Unnamed'";
                $selectKategori = "'Menu'";
            }

            $frekuensiData = $query
                ->whereYear($dateCol, $year)
                ->whereMonth($dateCol, $month)
                ->select(
                    DB::raw("{$selectNama} as nama_item"),
                    DB::raw("{$selectKategori} as kategori"),
                    DB::raw("COUNT(DISTINCT sales_reports.id) as frekuensi_pembelian"),
                    DB::raw("SUM(sales_report_items.quantity) as total_kuantitas"),
                    DB::raw("SUM(sales_report_items.quantity * sales_report_items.harga_satuan) as total_nominal")
                )
                ->groupBy('nama_item', 'kategori')
                ->orderBy('frekuensi_pembelian', 'desc')
                ->get();
        }

        return Inertia::render('Laporan/FrekuensiPembelian', [
            'frekuensiItems' => $frekuensiData,
            'selectedMonth'  => $monthParam,
            'periodeFormatted' => $date->translatedFormat('F Y'),
        ]);
    }
}
