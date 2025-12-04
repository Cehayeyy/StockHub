<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RecipeController extends Controller
{
    /**
     * Tampilkan halaman Resep + data resep yang ada.
     */
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
                'created_at'        => $recipe->created_at?->toIso8601String(),
            ];
        });

        return Inertia::render('MasterData/Resep', [
            'recipes' => $recipes,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Simpan resep baru dari modal "Tambah Resep".
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                 => ['required', 'string', 'max:255'],
            'ingredients'          => ['required', 'array', 'min:1'],
            'ingredients.*.name'   => ['required', 'string', 'max:255'],
            'ingredients.*.amount' => ['required', 'numeric', 'min:0'],
            'ingredients.*.unit'   => ['required', 'string', 'max:50'],
        ]);

        $ingredients = $validated['ingredients'];

        Recipe::create([
            'name'              => $validated['name'],
            'ingredients'       => $ingredients,
            'total_ingredients' => count($ingredients),
        ]);

        return redirect()
            ->route('resep')
            ->with('success', 'Resep berhasil ditambahkan.');
    }
}
