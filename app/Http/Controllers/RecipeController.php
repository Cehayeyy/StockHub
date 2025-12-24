<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use App\Models\Item;
use App\Models\StokHarianMenu;
use App\Models\StokHarianMentah;
use App\Models\StokHarianDapurMentah;
use App\Models\StokHarianDapurMenu;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RecipeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // 1. Tentukan Divisi berdasarkan Role atau Request
        if ($user->role === 'bar' || $user->role === 'kitchen') {
            // Jika Staff, paksa sesuai role (kitchen -> dapur)
            $division = $user->role === 'kitchen' ? 'dapur' : 'bar';
        } else {
            // Jika Admin/Supervisor, ambil dari URL (default bar)
            $division = $request->input('division', 'bar');
        }

        // 2. Ambil Resep sesuai Divisi
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

        // 3. Filter Item untuk Dropdown
        // Jika halaman Dapur, ambil juga item 'kitchen' dari database item
        $targetDivisions = [$division];
        if ($division === 'dapur') {
            $targetDivisions[] = 'kitchen';
        }

        $items = Item::with('itemCategory')
            ->whereIn('division', $targetDivisions)
            ->get()
            ->map(fn ($i) => [
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
            'userRole'     => $user->role, // Kirim role ke frontend untuk conditional rendering
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        // 1. Validasi Input
        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'division'              => 'required|in:bar,dapur',
            'ingredients'           => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string',
        ]);

        // 2. Validasi Hak Akses (Security Layer)
        // Pastikan staff tidak bisa membuat resep di divisi lain
        if (($user->role === 'bar' && $validated['division'] !== 'bar') ||
            ($user->role === 'kitchen' && $validated['division'] !== 'dapur')) {
            abort(403, 'Anda tidak memiliki akses untuk divisi ini.');
        }

        DB::transaction(function () use ($validated) {

            // 3. Simpan Resep
            $recipe = Recipe::create([
                'name'              => $validated['name'],
                'division'          => $validated['division'],
                'ingredients'       => $validated['ingredients'],
                'total_ingredients' => count($validated['ingredients']),
            ]);

            $tanggal = session('stok_tanggal') ?? now()->toDateString();

            // 4. Inisialisasi Stok Harian (Bar vs Dapur)
            if ($validated['division'] === 'dapur') {
                // --- LOGIKA DAPUR ---

                // Stok Menu Jadi (Dapur)
                StokHarianDapurMenu::firstOrCreate(
                    ['recipe_id' => $recipe->id, 'tanggal' => $tanggal],
                    ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => 'porsi']
                );

                // Stok Bahan Mentah (Dapur)
                foreach ($validated['ingredients'] as $ing) {
                    StokHarianDapurMentah::firstOrCreate(
                        ['item_id' => $ing['item_id'], 'tanggal' => $tanggal],
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => $ing['unit']]
                    );
                }

            } else {
                // --- LOGIKA BAR ---

                // Cari Item Menu yang sesuai dengan nama resep
                $menuItem = Item::where('nama', $validated['name'])
                    ->whereHas('itemCategory', fn ($q) => $q->where('name', 'Menu'))
                    ->first();

                if ($menuItem) {
                    StokHarianMenu::firstOrCreate(
                        ['item_id' => $menuItem->id, 'tanggal' => $tanggal],
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]
                    );
                }

                foreach ($validated['ingredients'] as $ing) {
                    StokHarianMentah::firstOrCreate(
                        ['item_id' => $ing['item_id'], 'tanggal' => $tanggal],
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => $ing['unit']]
                    );
                }
            }
        });

        return redirect()->route('resep', [
            'division' => $validated['division'],
        ])->with('success', 'Resep berhasil dibuat.');
    }

    public function update(Request $request, Recipe $recipe)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'division'              => 'required|in:bar,dapur',
            'ingredients'           => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string',
        ]);

        // Validasi Hak Akses
        if (($user->role === 'bar' && $validated['division'] !== 'bar') ||
            ($user->role === 'kitchen' && $validated['division'] !== 'dapur')) {
            abort(403, 'Anda tidak memiliki akses.');
        }

        DB::transaction(function () use ($validated, $recipe) {
            $recipe->update([
                'name'              => $validated['name'],
                'division'          => $validated['division'],
                'ingredients'       => $validated['ingredients'],
                'total_ingredients' => count($validated['ingredients']),
            ]);
        });

        return redirect()->route('resep', [
            'division' => $validated['division'],
        ])->with('success', 'Resep berhasil diperbarui.');
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
