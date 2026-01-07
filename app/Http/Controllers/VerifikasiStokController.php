<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\StokHarianMentah;
use App\Models\StokHarianDapurMentah;
use Carbon\Carbon;

class VerifikasiStokController extends Controller
{
    public function index(Request $request)
    {
        // ==================== KODE KAMU (TIDAK DIUBAH) ====================
        $tab = $request->get('tab', 'bar');
        $rawDate = $request->get('tanggal') ?: Carbon::now()->toDateString();
        $mondayDate = Carbon::parse($rawDate)->startOfWeek(Carbon::MONDAY)->toDateString();

        if ($tab === 'bar') {
            $items = StokHarianMentah::with('item')
                ->whereDate('tanggal', $mondayDate)
                ->get()
                ->map(fn($item) => [
                    'id' => $item->id,
                    'nama' => $item->item->nama,
                    'satuan' => $item->unit ?? $item->item->satuan,
                    'stok_sistem' => $item->stok_akhir,
                ]);
        } else {
            $items = StokHarianDapurMentah::with('item')
                ->whereDate('tanggal', $mondayDate)
                ->get()
                ->map(fn($item) => [
                    'id' => $item->id,
                    'nama' => $item->item->nama,
                    'satuan' => $item->unit ?? $item->item->satuan,
                    'stok_sistem' => $item->stok_akhir,
                ]);
        }

        return Inertia::render('VerifikasiStok', [
            'items'          => $items,
            'tab'            => $tab,
            'tanggal_picker' => $rawDate,
            'tanggal_data'   => $mondayDate
        ]);
    }

    // ==================== 🔽 TAMBAHAN EXPORT EXCEL ====================
 public function export(Request $request)
{
    $tab = $request->get('tab', 'bar');
    $rawDate = $request->get('tanggal') ?: Carbon::now()->toDateString();
    $mondayDate = Carbon::parse($rawDate)->startOfWeek(Carbon::MONDAY)->toDateString();

    $items = $tab === 'bar'
        ? StokHarianMentah::with('item')->whereDate('tanggal', $mondayDate)->get()
        : StokHarianDapurMentah::with('item')->whereDate('tanggal', $mondayDate)->get();

    $filename = "verifikasi-stok-{$tab}-{$mondayDate}.xlsx";

    $headers = [
        "Content-Type" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition" => "attachment; filename={$filename}",
    ];

    $callback = function () use ($items) {
        $file = fopen('php://output', 'w');

        // BOM UTF-8 supaya karakter tampil
        fwrite($file, "\xEF\xBB\xBF");

        // Header
        fputcsv($file, [
            'No',
            'Nama Item',
            'Satuan',
            'Stok Sistem (Senin)',
            'Stok Fisik',
            'Selisih',
            'Status'
        ], ';');

        foreach ($items as $i => $item) {
            $namaItem   = optional($item->item)->nama ?? '-';
            $satuan     = $item->unit ?? optional($item->item)->satuan ?? '-';
            $stokSistem = $item->stok_akhir ?? 0;
            $stokFisik  = $stokSistem;
            $selisih    = $stokFisik - $stokSistem;

            fputcsv($file, [
                $i + 1,
                $namaItem,
                $satuan,
                $stokSistem,
                $stokFisik,
                $selisih,
                $selisih === 0 ? 'Cocok' : 'Selisih',
            ], ';');
        }

        fclose($file);
    };

    return response()->stream($callback, 200, $headers);
}
}
