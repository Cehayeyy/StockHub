<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use App\Models\Item;
use App\Models\StokHarianMenu;
use App\Models\StokHarianMentah;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RecipeController extends Controller
{
    public function index(Request $request)
    {
        $division = $request->input('division', 'dapur');

        $recipes = Recipe::where('division', $division)
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id'                => $r->id,
                'name'              => $r->name,
                'ingredients'       => $r->ingredients,
                'total_ingredients' => $r->total_ingredients,
                'created_at'        => $r->created_at->toIso8601String(),
            ]);

        $items = Item::with('itemCategory')->get()->map(fn ($i) => [
            'id'            => $i->id,
            'name'          => $i->nama,
            'unit'          => $i->satuan,
            'category_name' => $i->itemCategory->name ?? null,
        ]);

        return Inertia::render('MasterData/Resep', [
            'recipes'      => $recipes,
            'bahan_menu'   => $items->where('category_name', 'Menu')->values(),
            'bahan_mentah' => $items->where('category_name', 'Mentah')->values(),
            'division'     => $division,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'division'              => 'required|in:bar,dapur',

            // 🔑 MENU JADI HARUS DIPILIH
            'menu_item_id'          => 'required_if:division,bar|exists:items,id',

            'ingredients'           => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|integer|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string|max:50',
        ]);

        DB::transaction(function () use ($validated) {

            // ===============================
            // 1️⃣ SIMPAN RESEP
            // ===============================
            $recipe = Recipe::create([
                'name'              => $validated['name'],
                'division'          => $validated['division'],
                'ingredients'       => $validated['ingredients'],
                'total_ingredients' => count($validated['ingredients']),
            ]);

            // ===============================
            // 2️⃣ KHUSUS BAR
            // ===============================
            if ($validated['division'] !== 'bar') {
                return;
            }

            $today = Carbon::today();

            // ===============================
            // 3️⃣ MENU JADI → STOK HARIAN MENU
            // ===============================
            StokHarianMenu::firstOrCreate(
                [
                    'item_id' => $validated['menu_item_id'],
                    'tanggal' => $today,
                ],
                [
                    'stok_awal'    => 0,
                    'stok_masuk'  => 0,
                    'stok_keluar' => 0,
                    'stok_akhir'  => 0,
                ]
            );

            // ===============================
            // 4️⃣ BAHAN MENTAH → STOK HARIAN MENTAH
            // ===============================
            foreach ($validated['ingredients'] as $ing) {

                $item = Item::where('id', $ing['item_id'])
                    ->whereHas('itemCategory', fn ($q) =>
                        $q->where('name', 'Mentah')
                    )
                    ->first();

                if (!$item) continue;

                StokHarianMentah::firstOrCreate(
                    [
                        'item_id' => $item->id,
                        'tanggal' => $today,
                    ],
                    [
                        'stok_awal'    => 0,
                        'stok_masuk'  => 0,
                        'stok_keluar' => 0,
                        'stok_akhir'  => 0,
                        'unit'        => $item->satuan,
                    ]
                );
            }
        });

        return redirect()->route('resep', [
            'division' => $validated['division'],
        ]);
    }

    public function update(Request $request, Recipe $recipe)
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'division'              => 'required|in:bar,dapur',
            'ingredients'           => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|integer|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string|max:50',
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
