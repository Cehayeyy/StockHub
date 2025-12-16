<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Models\Item; // Pastikan model Item di-import

class RecipeController extends Controller
{
    public function index(Request $request)
    {
        $division = $request->input('division', 'bar');

        $recipes = Recipe::where('division', $division)
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id'                => $r->id,
                'name'              => $r->name,
                'ingredients'       => $r->ingredients,
                'total_ingredients' => $r->total_ingredients,
                'created_at'        => $r->created_at?->toISOString(),
            ]);

        // Ambil item untuk dropdown bahan
        $items = Item::with('itemCategory')->get()->map(fn ($i) => [
            'id'       => $i->id,
            'name'     => $i->nama,
            'unit'     => $i->satuan,
            'category' => $i->itemCategory->name ?? null,
        ]);

        return Inertia::render('MasterData/Resep', [
            'recipes'      => $recipes,
            'bahan_menu'   => $items->where('category', 'Menu')->values(),
            'bahan_mentah' => $items->where('category', 'Mentah')->values(),
            'division'     => $division,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'division'          => 'required|in:bar,dapur',
            // Validasi menu_item_id jika perlu, tapi kita hanya butuh nama & ingredients untuk resep
            'menu_item_id'      => 'nullable|exists:items,id',
            'ingredients'       => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string',
        ]);

        DB::transaction(function () use ($validated) {
            // 1. SIMPAN RESEP SAJA
            // Tidak ada logika insert ke stok_harian_menu di sini
            Recipe::create([
                'name'              => $validated['name'],
                'division'          => $validated['division'],
                'ingredients'       => $validated['ingredients'],
                'total_ingredients' => count($validated['ingredients']),
            ]);
        });

        return redirect()->route('resep', [
            'division' => $validated['division'],
        ])->with('success', 'Resep berhasil dibuat. Silakan input stok awal di menu Stok Harian.');
    }

    public function update(Request $request, Recipe $recipe)
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'division'          => 'required|in:bar,dapur',
            'ingredients'       => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string',
        ]);

        $recipe->update([
            'name'              => $validated['name'],
            'division'          => $validated['division'],
            'ingredients'       => $validated['ingredients'],
            'total_ingredients' => count($validated['ingredients']),
        ]);

        return redirect()->route('resep', [
            'division' => $validated['division'],
        ]);
    }

    public function destroy(Recipe $recipe)
    {
        $division = $recipe->division;
        $recipe->delete();

        return redirect()->route('resep', [
            'division' => $division,
        ]);
    }
}
