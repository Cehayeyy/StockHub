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

        // 1. Ambil Tanggal Pilihan User (untuk Datepicker)
        // Jika tidak ada request, pakai hari ini.
        $rawDate = $request->get('tanggal') ? $request->get('tanggal') : Carbon::now()->toDateString();

        // 2. Hitung Tanggal Senin (Untuk Query Data Stok)
        // Logic: Apapun hari yang dipilih, ambil data hari Senin di minggu itu.
        $mondayDate = Carbon::parse($rawDate)->startOfWeek(Carbon::MONDAY)->toDateString();

        $items = [];

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

        // =========================================================================
        // ⚠️ PASTIKAN NAMA FILE SESUAI LOKASI:
        // Jika file ada di "resources/js/Pages/VerifikasiStok.tsx", gunakan 'VerifikasiStok'
        // Jika file ada di "resources/js/Pages/VerifikasiStok/Index.tsx", gunakan 'VerifikasiStok/Index'
        // =========================================================================

        return Inertia::render('VerifikasiStok', [ // <-- Sesuaikan path ini
            'items'          => $items,
            'tab'            => $tab,

            // 👇 INI YANG PENTING: Kirim dua jenis tanggal agar Frontend tidak error
            'tanggal_picker' => $rawDate,    // Untuk mengisi input date (agar tidak lompat)
            'tanggal_data'   => $mondayDate  // Untuk teks informasi "Data Senin tgl..."
        ]);
    }
}
