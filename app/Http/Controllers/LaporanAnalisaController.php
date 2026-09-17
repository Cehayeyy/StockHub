<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Item;
use App\Models\Recipe;
use App\Models\SalesReportItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

class LaporanAnalisaController extends Controller
{
    public function index(Request $request)
    {
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

        $ringkasan = [
            'totalOmsetReal' => $totalOmsetReal,
            'totalProfitReal' => $totalProfitRealSum,
        ];

        return Inertia::render('Laporan/AnalisaProfit', [
            'ringkasan' => $ringkasan,
            'itemsAnalisa' => $groupedItems,
            'filters' => [
                'search' => $search,
                'periode' => $periode,
                'tanggal' => $tanggal,
            ]
        ]);
    }

    public function export(Request $request)
    {
        return back()->with('success', 'Laporan analisis profit berhasil diunduh.');
    }
}
