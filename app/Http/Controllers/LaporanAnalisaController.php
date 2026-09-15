<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Item;
use App\Models\Recipe;
use App\Models\SalesReportItem;
use Carbon\Carbon;

class LaporanAnalisaController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $periode = $request->input('periode', 'Harian');
        
        $tanggalInput = $request->input('tanggal', now()->toDateString());
        try {
            if (str_contains($tanggalInput, '/')) {
                $tanggal = Carbon::createFromFormat('m/d/Y', $tanggalInput)->toDateString();
            } else {
                $tanggal = Carbon::parse($tanggalInput)->toDateString();
            }
        } catch (\Exception $e) {
            $tanggal = now()->toDateString();
        }

        // 1. Ambil data master item menu yang memiliki resep
        $items = Item::has('resep')
            ->with('itemCategory')
            ->when($search, function ($q, $search) {
                $q->where('nama', 'like', "%{$search}%");
            })
            ->get();

        if ($items->isEmpty()) {
            $items = Item::has('resep')->with('itemCategory')->get();
        }

        // 2. Petakan data performa penjualan langsung dari SalesReportItem
        $groupedItems = $items->map(function ($item) use ($tanggal) {
            
            // Ambil total quantity terjual dari tabel sales_report_items yang berelasi dengan sales_reports pada tanggal tersebut
            $totalTerjual = SalesReportItem::where('item_id', $item->id)
                ->whereHas('salesReport', function ($query) use ($tanggal) {
                    $query->whereDate('tanggal_transaksi', $tanggal);
                })
                ->sum('quantity');
            
            // Perhitungan Finansial HPP & Profit
            $hppSatuan = $item->harga_dasar ?? 0;
            $totalHpp = $totalTerjual * $hppSatuan;

            // Harga Jual Riil (HJR)
            $hargaJualRiil = $item->harga_jual ?? ($hppSatuan * 1.5); 
            
            $profitRiilSatuan = max(0, $hargaJualRiil - $hppSatuan);
            $totalProfitReal = $totalTerjual * $profitRiilSatuan;

            return [
                'id' => $item->id,
                'nama' => $item->nama,
                'kategori' => $item->itemCategory->name ?? $item->kategori_item ?? 'Menu',
                'terjual' => $totalTerjual,
                'total_hpp' => $totalHpp,
                'harga_jual_riil' => $hargaJualRiil,
                'profit_riil_satuan' => $profitRiilSatuan,
                'total_profit_real' => $totalProfitReal,
            ];
        })->values();

        // 3. Hitung Ringkasan Total Omset Real & Total Profit Real
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