<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function index()
    {
        // Ambil semua item: nama + kategori_item (finish/raw)
        $items = Item::select('id', 'nama', 'kategori_item')->get();

        // Kelompokkan berdasarkan kategori_item
        $categories = $items
            ->groupBy('kategori_item')   // "finish" => collection, "raw" => collection
            ->map(function ($group, $kategori) {
                $kategori = $kategori ?? '';

                return [
                    'name'       => ucfirst($kategori),          // "finish" -> "Finish"
                    'item_count' => $group->count(),             // jumlah item di kategori ini
                    'items'      => $group->pluck('nama')->values(), // list nama item
                ];
            })
            ->values(); // reset index array

        return Inertia::render('MasterData/Kategori', [
            'categories' => $categories,
        ]);
    }
}
