<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    /**
     * LIST ITEM (per divisi: bar / kitchen)
     */
    public function index(Request $request): Response
    {
        $division = $request->query('division', 'bar');

        if (!in_array($division, ['bar', 'kitchen'])) {
            $division = 'bar';
        }

        $items = Item::where('division', $division)
            ->orderBy('nama')
            ->get();

        return Inertia::render('MasterData/Item', [
            'division' => $division,
            'items'    => $items,
        ]);
    }

    /**
     * LIST KATEGORI (diambil dari tabel items, dikelompokkan per division + kategori_item)
     */
    public function kategoriIndex(Request $request): Response
    {
        $division = $request->query('division', 'bar');

        if (!in_array($division, ['bar', 'kitchen'])) {
            $division = 'bar';
        }

        // Ambil kategori unik + jumlah item-nya dari tabel items
        $raw = Item::selectRaw('division, TRIM(kategori_item) as kategori_item, COUNT(*) as total_items')
            ->where('division', $division)
            ->whereNotNull('kategori_item')
            ->where('kategori_item', '<>', '')
            ->groupBy('division', 'kategori_item')
            ->orderBy('kategori_item')
            ->get();

        // Bentuk data yang rapi untuk frontend
        $categories = $raw->map(function ($row, $index) {
            return [
                'id'          => $index + 1,         // hanya untuk keperluan "No" di tabel
                'name'        => $row->kategori_item,
                'division'    => $row->division,
                'total_items' => $row->total_items, // "2 Bahan", "3 Bahan", dll
            ];
        });

        return Inertia::render('MasterData/Kategori', [
            'division'   => $division,
            'categories' => $categories,
        ]);
    }

    /**
     * SIMPAN ITEM BARU
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'nama'          => 'required|string|max:255',
            'kategori_item' => 'required|string|max:50',     // Finish / Raw
            'division'      => 'required|in:bar,kitchen',    // bar / kitchen
            'satuan'        => 'nullable|string|max:50',
        ]);

        if (empty($data['satuan'])) {
            $data['satuan'] = 'porsi';
        }

        Item::create($data);

        return redirect()
            ->route('item.index', ['division' => $data['division']])
            ->with('success', 'Item berhasil ditambahkan!');
    }

    /**
     * UPDATE ITEM
     */
    public function update(Request $request, Item $item)
    {
        $data = $request->validate([
            'nama'          => 'required|string|max:255',
            'kategori_item' => 'required|string|max:50',
            'division'      => 'required|in:bar,kitchen',
            'satuan'        => 'nullable|string|max:50',
        ]);

        if (empty($data['satuan'])) {
            $data['satuan'] = 'porsi';
        }

        $item->update($data);

        return redirect()
            ->route('item.index', ['division' => $data['division']])
            ->with('success', 'Item berhasil diupdate!');
    }

    /**
     * HAPUS ITEM
     */
    public function destroy(Item $item)
    {
        $division = $item->division;

        $item->delete();

        return redirect()
            ->route('item.index', ['division' => $division])
            ->with('success', 'Item berhasil dihapus!');
    }
}
