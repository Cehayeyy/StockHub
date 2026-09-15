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
        // ====================================================================
        // 1. CARI ITEM DUPLIKAT (Nama persis sama di divisi yang sama)
        // ====================================================================
        $duplikat = Item::select('nama', 'division', 'kategori_item', DB::raw('COUNT(*) as jumlah'))
            ->groupBy('nama', 'division', 'kategori_item')
            ->havingRaw('COUNT(*) > 1')
            ->get()
            ->map(function($item) {
                return [
                    'nama' => $item->nama,
                    'division' => $item->division,
                    'kategori' => $item->kategori_item ?? '-',
                    'jumlah' => $item->jumlah
                ];
            });

        // ====================================================================
        // 2. CARI RESEP KOSONG (Menggunakan Logika JSON Anda yang aman)
        // ====================================================================
        $resepKosong = Recipe::whereNull('ingredients')
            ->orWhere('ingredients', '[]')
            ->orWhere('ingredients', '')
            ->orWhere('ingredients', 'null')
            ->get()
            ->map(function($recipe) {
                return [
                    'id' => $recipe->id,
                    'name' => $recipe->name ?? 'Tanpa Nama',
                    'division' => $recipe->division ?? 'Tidak Diketahui'
                ];
            });

        // ====================================================================
        // 3. CARI BAHAN MENTAH NGANGGUR (Mengekstrak JSON array ingredients)
        // ====================================================================
        $semuaResep = Recipe::all();
        $idBahanTerpakai = [];

        foreach($semuaResep as $r) {
            // Pastikan membaca JSON dengan benar
            $ingredients = is_string($r->ingredients) ? json_decode($r->ingredients, true) : $r->ingredients;

            if(is_array($ingredients)) {
                foreach($ingredients as $ing) {
                    if(isset($ing['item_id'])) {
                        $idBahanTerpakai[] = $ing['item_id'];
                    }
                }
            }
        }

        // Ambil item "Mentah", TAPI ID-nya tidak pernah terdeteksi di array resep
        $bahanNganggur = Item::whereIn(DB::raw('LOWER(kategori_item)'), ['mentah', 'raw'])
            ->whereNotIn('id', array_unique($idBahanTerpakai))
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'nama' => $item->nama,
                    'division' => $item->division,
                    'kategori' => $item->kategori_item ?? 'Mentah',
                ];
            });

        // ====================================================================
        // 4. KIRIM DATA KE FRONTEND REACT
        // ====================================================================
        return Inertia::render('AuditData/LaporanAudit', [
            'item_duplikat' => $duplikat,
            'resep_tanpa_bahan' => $resepKosong,
            'bahan_nganggur' => $bahanNganggur
        ]);
    }
}