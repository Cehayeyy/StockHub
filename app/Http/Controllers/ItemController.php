<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Item;

class ItemController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->type ?? 'all';

        // FILTER server-side
        $items = Item::when($type !== 'all', function ($q) use ($type) {
            return $q->where('kategori_item', $type);
        })->get();

        return Inertia::render('MasterData/Item', [
            'filters' => [
                'type' => $type,
            ],
            'items' => $items,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama' => 'required|string',
            'satuan' => 'nullable|string',
            'kategori_item' => 'required|string'
        ]);

        Item::create([
            'nama' => $request->nama,
            'satuan' => $request->satuan,
            'kategori_item' => strtolower($request->kategori_item), // PENTING
        ]);

        return redirect()->route('item.index')->with('success', 'Item berhasil ditambahkan!');
    }

    public function update(Request $request, Item $item)
    {
        $request->validate([
            'nama' => 'required|string',
            'satuan' => 'nullable|string',
            'kategori_item' => 'required|string'
        ]);

        $item->update([
            'nama' => $request->nama,
            'satuan' => $request->satuan,
            'kategori_item' => strtolower($request->kategori_item), // PENTING
        ]);

        return redirect()->route('item.index')->with('success', 'Item berhasil diupdate!');
    }

    public function destroy(Item $item)
    {
        $item->delete();
        return redirect()->back()->with('success', 'Item berhasil dihapus!');
    }
}
