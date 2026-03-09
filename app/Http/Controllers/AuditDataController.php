<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Item;
use App\Models\Recipe;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AuditDataController extends Controller
{
    public function index()
    {
        // 1. Cari Item Duplikat (Nama kembar di satu divisi)
        $duplikat = Item::select('nama', 'division', 'kategori_item', DB::raw('COUNT(*) as jumlah'))
            ->groupBy('nama', 'division', 'kategori_item')
            ->havingRaw('COUNT(*) > 1')
            ->get()
            ->map(function($item) {
                // Kita petakan (map) ke 'kategori' agar frontend LaporanAudit.tsx tidak error
                return [
                    'nama' => $item->nama,
                    'division' => $item->division,
                    'kategori' => $item->kategori_item,
                    'jumlah' => $item->jumlah
                ];
            });

        // 2. Cari Resep Kosong (Menu yang tidak punya komposisi bahan mentah)
        $resepKosong = Recipe::whereNull('ingredients')
            ->orWhere('ingredients', '[]')
            ->orWhere('ingredients', '')
            ->orWhere('ingredients', 'null')
            ->get();

        // 3. Cari Bahan Mentah yang Nganggur (Tidak dipakai di resep mana pun)
        $semuaResep = Recipe::all();
        $idBahanTerpakai = [];

        foreach($semuaResep as $r) {
            if(is_array($r->ingredients)) {
                foreach($r->ingredients as $ing) {
                    if(isset($ing['item_id'])) {
                        $idBahanTerpakai[] = $ing['item_id'];
                    }
                }
            }
        }

        // Ambil item yang kategorinya "Mentah", tapi ID-nya tidak ada di dalam resep
        $bahanNganggur = Item::whereIn('kategori_item', ['Mentah', 'mentah'])
            ->whereNotIn('id', array_unique($idBahanTerpakai))
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'nama' => $item->nama,
                    'division' => $item->division,
                    'kategori' => $item->kategori_item,
                ];
            });

        // Kirim data ke tampilan Frontend (Inertia)
        return Inertia::render('AuditData/LaporanAudit', [
            'item_duplikat' => $duplikat,
            'resep_tanpa_bahan' => $resepKosong,
            'bahan_nganggur' => $bahanNganggur
        ]);
    }
}
