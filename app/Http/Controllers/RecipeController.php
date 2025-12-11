<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use App\Models\Item;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RecipeController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');

        $query = Recipe::query()->orderBy('created_at', 'desc');

        if (!empty($search)) {
            $query->where('name', 'like', "%{$search}%");
        }

        $recipes = $query->get()->map(function (Recipe $recipe) {
            return [
                'id'                => $recipe->id,
                'name'              => $recipe->name,
                'total_ingredients' => $recipe->total_ingredients,
                'ingredients'       => $recipe->ingredients,
                'created_at'        => $recipe->created_at?->toIso8601String(),
            ];
        });

        // Ambil semua item dan kategori
        $items = Item::select('id', 'nama as name', 'satuan as unit', 'item_category_id')
            ->with('itemCategory:id,name')
            ->get()
            ->map(fn($i) => [
                'id'            => $i->id,
                'name'          => $i->name,
                'unit'          => $i->unit,
                'category_name' => $i->itemCategory->name ?? null,
            ]);

        return Inertia::render('MasterData/Resep', [
            'recipes'       => $recipes,
            'bahan_menu'    => $items->filter(fn($i) => $i['category_name'] === 'Menu')->values()->all(),
            'bahan_mentah'  => $items->filter(fn($i) => $i['category_name'] === 'Mentah')->values()->all(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                  => ['required', 'string', 'max:255'],
            'ingredients'           => ['required', 'array', 'min:1'],
            'ingredients.*.item_id' => ['required', 'integer'],
            'ingredients.*.amount'  => ['required', 'numeric', 'min:0'],
            'ingredients.*.unit'    => ['required', 'string', 'max:50'],
        ]);

        Recipe::create([
            'name'              => $validated['name'],
            'ingredients'       => $validated['ingredients'], // <-- array aman
            'total_ingredients' => count($validated['ingredients']),
        ]);

        return redirect()->route('resep')->with('success', 'Resep berhasil ditambahkan.');

    }
    // Tampilkan detail resep
public function show(Recipe $recipe)
{
    return Inertia::render('MasterData/ResepDetail', [
        'recipe' => $recipe->load('item'), // bisa load relasi item
    ]);
}

// Halaman edit (jika ingin pakai halaman terpisah)
public function edit(Recipe $recipe)
{
    return Inertia::render('MasterData/ResepEdit', [
        'recipe' => $recipe->load('item'),
    ]);
}

// Update resep
public function update(Request $request, Recipe $recipe)
{
    $validated = $request->validate([
        'name'                    => ['required', 'string', 'max:255'],
        'ingredients'             => ['required', 'array', 'min:1'],
        'ingredients.*.item_id'   => ['required', 'integer'],
        'ingredients.*.amount'    => ['required', 'numeric', 'min:0'],
        'ingredients.*.unit'      => ['required', 'string', 'max:50'],
    ]);

    $recipe->update([
        'name'              => $validated['name'],
        'ingredients'       => $validated['ingredients'],
        'total_ingredients' => count($validated['ingredients']),
    ]);

    return redirect()->route('resep')->with('success', 'Resep berhasil diupdate.');
}

// Hapus resep
public function destroy(Recipe $recipe)
{
    $recipe->delete();
    return redirect()->route('resep')->with('success', 'Resep berhasil dihapus.');
}

}
