<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\ItemCategory;
use App\Models\ActivityLog; // Import Model Log
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;

class ItemController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        if (in_array($user->role, ['bar', 'kitchen'])) {
            $division = $user->role;
        } else {
            $division = $request->query('division', 'bar');
            if (!in_array($division, ['bar', 'kitchen'])) {
                $division = 'bar';
            }
        }

        $query = Item::with('itemCategory')
            ->where('division', $division);

        if ($request->search) {
            $query->where('nama', 'like', '%' . $request->search . '%');
        }

        $items = $query->orderBy('nama')
            ->paginate(10)
            ->withQueryString();

        $categories = ItemCategory::where('division', $division)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('MasterData/Item', [
            'division'   => $division,
            'items'      => $items,
            'categories' => $categories,
            'search'     => $request->search,
        ]);
    }

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
                    ->where('division', $division)
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

        $cat = ItemCategory::create($data);

        // LOG AKTIVITAS
        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Tambah Kategori',
            'description' => "Menambahkan kategori baru: '{$cat->name}' ({$cat->division})."
        ]);

        return redirect()
            ->route('kategori', ['division' => $data['division']])
            ->with('success', 'Kategori berhasil ditambahkan!');
    }

    public function store(Request $request)
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

        $item = Item::create($data);

        // LOG AKTIVITAS
        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Tambah Item',
            'description' => "Menambahkan item master baru: '{$item->nama}' ({$item->division})."
        ]);

        return redirect()
            ->route('item.index', ['division' => $data['division']])
            ->with('success', 'Item berhasil ditambahkan!');
    }

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
        $oldName = $item->nama;

        $item->update($data);

        // LOG AKTIVITAS
        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Update Item',
            'description' => "Mengupdate data item dari '{$oldName}' menjadi '{$item->nama}'."
        ]);

        return redirect()
            ->route('item.index', ['division' => $data['division']])
            ->with('success', 'Item berhasil diupdate!');
    }

    public function destroy(Item $item)
    {
        $division = $item->division;
        $name = $item->nama;

        $item->delete();

        // LOG AKTIVITAS
        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Hapus Item',
            'description' => "Menghapus item master '{$name}'."
        ]);

        return redirect()
            ->route('item.index', ['division' => $division])
            ->with('success', 'Item berhasil dihapus!');
    }

    public function destroyCategory(ItemCategory $itemCategory)
    {
        $division = $itemCategory->division;
        $name = $itemCategory->name;

        Item::where('item_category_id', $itemCategory->id)
            ->update([
                'item_category_id' => null,
                'kategori_item' => null,
            ]);

        $itemCategory->delete();

        // LOG AKTIVITAS
        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Hapus Kategori',
            'description' => "Menghapus kategori '{$name}'."
        ]);

        return redirect()
            ->route('kategori', ['division' => $division])
            ->with('success', 'Kategori berhasil dihapus!');
    }
}
