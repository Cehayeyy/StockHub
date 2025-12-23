<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use App\Models\Item;
use App\Models\StokHarianMenu;
use App\Models\StokHarianMentah;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RecipeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

if ($user->role === 'staff') {
    // 🔒 STAFF DIPAKSA IKUT DIVISION AKUN
    $division = $user->division;
} else {
    // 👑 SUPERVISOR / ADMIN BOLEH PILIH
    $division = $request->get('division', 'bar');
}



        $recipes = Recipe::where('division', $division)
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id'                => $r->id,
                'name'              => $r->name,
                'ingredients'       => $r->ingredients,
                'total_ingredients' => $r->total_ingredients,
                'created_at'        => $r->created_at?->format('d/m/Y'),
            ]);

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
            'role' => $user->role,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'ingredients'           => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string',
        ]);

        // 🔒 KUNCI DIVISION
        $division = $user->role === 'staff'
            ? $user->division
            : $request->get('division', 'bar');

        DB::transaction(function () use ($validated, $division) {

            Recipe::create([
                'name'              => $validated['name'],
                'division'          => $division,
                'ingredients'       => $validated['ingredients'],
                'total_ingredients' => count($validated['ingredients']),
            ]);


            // 2. AUTOMATION: PUSH KE STOK HARIAN
            $today = Carbon::now()->toDateString();

            // A. Masukkan Menu Jadi ke StokHarianMenu
            $menuItem = Item::where('nama', $validated['name'])
                ->where('division', $division)
                ->first();

            if ($menuItem) {
                StokHarianMenu::firstOrCreate(
                    ['item_id' => $menuItem->id, 'tanggal' => $today],
                    ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]
                );
            }

            // B. Masukkan Bahan Mentah ke StokHarianMentah
            if (!empty($validated['ingredients'])) {
                foreach ($validated['ingredients'] as $ing) {
                    $rawItemId = $ing['item_id'] ?? null;
                    if ($rawItemId) {
                        StokHarianMentah::firstOrCreate(
                            ['item_id' => $rawItemId, 'tanggal' => $today],
                            [
                                'stok_awal' => 0,
                                'stok_masuk' => 0,
                                'stok_keluar' => 0,
                                'stok_akhir' => 0,
                                'unit' => $ing['unit'] ?? 'porsi',
                            ]
                        );
                    }
                }
            }
        });
        return redirect()->route('resep', [
            'division' => $division,
        ])->with('success', 'Resep berhasil dibuat');
    }


    public function update(Request $request, Recipe $recipe)
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'ingredients'           => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string',
        ]);

        $user = $request->user();

$division = $user->role === 'staff'
    ? $recipe->division
    : $request->get('division', $recipe->division);


        DB::transaction(function () use ($validated, $recipe) {
            $today = Carbon::now()->toDateString();

            // 1. Ambil nama lama
            $oldName = $recipe->name;
            $oldDivision = $recipe->division;

            // 2. UPDATE RESEP
            $recipe->update([
                'name'              => $validated['name'],
                'division'          => $validated['division'],
                'ingredients'       => $validated['ingredients'],
                'total_ingredients' => count($validated['ingredients']),
            ]);

            // 3. SINKRONISASI STOK MENU JADI
            $newItem = Item::where('nama', $validated['name'])->where('division', $validated['division'])->first();
            $currentMenuStock = 0;

            if ($newItem) {
                $menuStock = StokHarianMenu::firstOrCreate(
                    ['item_id' => $newItem->id, 'tanggal' => $today],
                    ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]
                );
                $currentMenuStock = $menuStock->stok_awal;
            }

            // 4. SINKRONISASI STOK BAHAN MENTAH
            if (!empty($validated['ingredients'])) {
                foreach ($validated['ingredients'] as $ing) {
                    $rawItemId = $ing['item_id'] ?? null;
                    $amount = $ing['amount'] ?? 0;

                    if ($rawItemId) {
                        $calculatedRawStock = $currentMenuStock * $amount;
                        $rawStock = StokHarianMentah::where('item_id', $rawItemId)->where('tanggal', $today)->first();

                        if ($rawStock) {
                            if ($calculatedRawStock > 0) {
                                $rawStock->update([
                                    'stok_awal' => $rawStock->stok_awal + $calculatedRawStock,
                                    'stok_akhir' => ($rawStock->stok_awal + $calculatedRawStock) - $rawStock->stok_keluar
                                ]);
                            }
                        } else {
                            StokHarianMentah::create([
                                'item_id'     => $rawItemId,
                                'tanggal'     => $today,
                                'stok_awal'   => $calculatedRawStock,
                                'stok_masuk'  => 0,
                                'stok_keluar' => 0,
                                'stok_akhir'  => $calculatedRawStock,
                                'unit'        => $ing['unit'] ?? 'porsi',
                            ]);
                        }
                    }
                }
            }
        });

        return redirect()->route('resep', [
            'division' => $validated['division'],
        ])->with('success', 'Resep diperbarui. Stok menu dan bahan mentah telah disesuaikan.');
    }

    public function destroy(Recipe $recipe)
    {
        $division = $recipe->division;
        $recipe->delete();

        return redirect()->route('resep', [
            'division' => $division,
        ])->with('success', 'Resep berhasil dihapus.');
    }
}
