<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\ItemCategory;
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
    $user = $request->user();

// kalau staff → kunci divisi
if (in_array($user->role, ['bar', 'kitchen'])) {
    $division = $user->role;
} else {
    // admin
    $division = $request->query('division', 'bar');
    if (!in_array($division, ['bar', 'kitchen'])) {
        $division = 'bar';
    }
}


    // Mulai query dasar
    $query = Item::with('itemCategory')
        ->where('division', $division);

    // === SEARCH FIX ===
    if ($request->search) {
        $query->where('nama', 'like', '%' . $request->search . '%');
    }

    // === PAGINATION FIX ===
    $items = $query->orderBy('nama')
        ->paginate(8)             // BEBAS kamu mau 5, 10, 20
        ->withQueryString();      // penting agar search ikut pagination

    // Category tetap
    $categories = ItemCategory::where('division', $division)
        ->orderBy('name')
        ->get(['id', 'name']);

    return Inertia::render('MasterData/Item', [
        'division'   => $division,
        'items'      => $items,
        'categories' => $categories,
        'search'     => $request->search,  // kirim ke frontend
    ]);
}


    /**
     * LIST KATEGORI (master + jumlah & detail item)
     */
    public function kategoriIndex(Request $request): Response
    {
        $division = $request->query('division', 'bar');

        if (!in_array($division, ['bar', 'kitchen'])) {
            $division = 'bar';
        }

        $categories = ItemCategory::where('division', $division)
            ->orderBy('name')
            ->get()
            ->map(function (ItemCategory $cat) use ($division) {
                $items = $cat->items()
                    ->where('division', $division)   // jaga-jaga
                    ->orderBy('nama')
                    ->get(['id', 'nama']);

                return [
                    'id'          => $cat->id,
                    'name'        => $cat->name,
                    'division'    => $cat->division,
                    'total_items' => $items->count(),
                    'items'       => $items,
                ];
            });

        return Inertia::render('MasterData/Kategori', [
            'division'   => $division,
            'categories' => $categories,
        ]);
    }

    /**
     * TAMBAH KATEGORI (dari halaman Kategori)
     */
    public function kategoriStore(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'division' => 'required|in:bar,kitchen',
        ]);

        $exists = ItemCategory::where('division', $data['division'])
            ->where('name', $data['name'])
            ->exists();

        if ($exists) {
            return back()->with('error', 'Kategori sudah ada untuk divisi ini.');
        }

        ItemCategory::create($data);

        return redirect()
            ->route('kategori', ['division' => $data['division']])
            ->with('success', 'Kategori berhasil ditambahkan!');
    }

    /**
     * SIMPAN ITEM BARU
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'nama'             => 'required|string|max:255',
            'item_category_id' => 'required|exists:item_categories,id',
            'division'         => 'required|in:bar,kitchen',
            'satuan'           => 'nullable|string|max:50',
        ]);

        // cek kategori benar2 milik divisi yg sama
        $category = ItemCategory::findOrFail($data['item_category_id']);
        if ($category->division !== $data['division']) {
            return back()->with('error', 'Kategori tidak sesuai dengan divisi.');
        }

        if (empty($data['satuan'])) {
            $data['satuan'] = 'porsi';
        }

        // optional: simpan nama kategori ke kolom lama (kategori_item)
        $data['kategori_item'] = $category->name;

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
            'nama'             => 'required|string|max:255',
            'item_category_id' => 'required|exists:item_categories,id',
            'division'         => 'required|in:bar,kitchen',
            'satuan'           => 'nullable|string|max:50',
        ]);

        $category = ItemCategory::findOrFail($data['item_category_id']);
        if ($category->division !== $data['division']) {
            return back()->with('error', 'Kategori tidak sesuai dengan divisi.');
        }

        if (empty($data['satuan'])) {
            $data['satuan'] = 'porsi';
        }

        $data['kategori_item'] = $category->name;

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

    public function destroyCategory(ItemCategory $itemCategory)
    {
        $division = $itemCategory->division;

         Item::where('item_category_id', $itemCategory->id)
        ->update([
            'item_category_id' => null,
            'kategori_item' => null,
        ]);

        $itemCategory->delete();

        return redirect()
            ->route('kategori', ['division' => $division])
            ->with('success', 'Kategori berhasil dihapus!');
    }
}

