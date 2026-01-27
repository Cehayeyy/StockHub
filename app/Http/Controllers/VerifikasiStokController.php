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

    // ==================== 🔽 EXPORT CSV (SAFE EXCEL) ====================
    public function export(Request $request)
    {
        $tab = $request->get('tab', 'bar');
        $rawDate = $request->get('tanggal') ?: Carbon::now()->toDateString();
        $mondayDate = Carbon::parse($rawDate)->startOfWeek(Carbon::MONDAY)->toDateString();

        $items = $tab === 'bar'
            ? StokHarianMentah::with('item')->whereDate('tanggal', $mondayDate)->get()
            : StokHarianDapurMentah::with('item')->whereDate('tanggal', $mondayDate)->get();

        // 🔥 UBAH EKSTENSI JADI .csv
        $filename = "verifikasi-stok-{$tab}-{$mondayDate}.csv";

        $headers = [
            "Content-Type"        => "text/csv",
            "Content-Disposition" => "attachment; filename={$filename}",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function () use ($items) {
            $file = fopen('php://output', 'w');

            // BOM UTF-8 (Penting agar Excel baca karakter dengan benar)
            fputs($file, "\xEF\xBB\xBF");

            // Header CSV
            fputcsv($file, [
                'No',
                'Nama Item',
                'Satuan',
                'Stok Sistem (Senin)',
                'Stok Fisik',
                'Selisih',
                'Status'
            ]); // Default delimiter koma (lebih kompatibel)

            foreach ($items as $i => $item) {
                $namaItem   = optional($item->item)->nama ?? '-';
                $satuan     = $item->unit ?? optional($item->item)->satuan ?? '-';
                $stokSistem = $item->stok_akhir ?? 0;
                $stokFisik  = ''; // Kosongkan agar bisa diisi manual saat diprint
                $selisih    = '';
                $status     = '';

                fputcsv($file, [
                    $i + 1,
                    $namaItem,
                    $satuan,
                    $stokSistem,
                    $stokFisik,
                    $selisih,
                    $status,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
