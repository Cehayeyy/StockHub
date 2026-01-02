<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use App\Models\Item;
use App\Models\StokHarianMenu;
use App\Models\StokHarianMentah;
use App\Models\StokHarianDapurMentah;
use App\Models\StokHarianDapurMenu;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class RecipeController extends Controller
{
    // ... index method (sama seperti sebelumnya) ...
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'bar' || $user->role === 'kitchen') {
            $division = $user->role === 'kitchen' ? 'dapur' : 'bar';
        } else {
            $division = $request->input('division', 'bar');
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
            'userRole'     => $user->role,
        ]);
    }

    public function store(Request $request)
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

        if (($user->role === 'bar' && $validated['division'] !== 'bar') ||
            ($user->role === 'kitchen' && $validated['division'] !== 'dapur')) {
            abort(403, 'Anda tidak memiliki akses untuk divisi ini.');
        }

        DB::transaction(function () use ($validated, $user) {
            $recipe = Recipe::create([
                'name'              => $validated['name'],
                'division'          => $validated['division'],
                'ingredients'       => $validated['ingredients'],
                'total_ingredients' => count($validated['ingredients']),
            ]);

            $tanggal = session('stok_tanggal') ?? now()->toDateString();

            if ($validated['division'] === 'dapur') {
                StokHarianDapurMenu::firstOrCreate(
                    ['recipe_id' => $recipe->id, 'tanggal' => $tanggal],
                    ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => 'porsi']
                );
                foreach ($validated['ingredients'] as $ing) {
                    StokHarianDapurMentah::firstOrCreate(
                        ['item_id' => $ing['item_id'], 'tanggal' => $tanggal],
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => $ing['unit']]
                    );
                }
            } else {
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

            // LOG AKTIVITAS
            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'Tambah Resep',
                'description' => "Menambahkan resep baru '{$recipe->name}'."
            ]);
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

        if (($user->role === 'bar' && $validated['division'] !== 'bar') ||
            ($user->role === 'kitchen' && $validated['division'] !== 'dapur')) {
            abort(403, 'Anda tidak memiliki akses.');
        }

        DB::transaction(function () use ($validated, $recipe, $user) {
            $oldName = $recipe->name;
            $recipe->update([
                'name'              => $validated['name'],
                'division'          => $validated['division'],
                'ingredients'       => $validated['ingredients'],
                'total_ingredients' => count($validated['ingredients']),
            ]);

            $tanggal = session('stok_tanggal') ?? now()->toDateString();

            // 1. Pastikan BAHAN MENTAH ada di stok harian
            foreach ($validated['ingredients'] as $ing) {
                if ($validated['division'] === 'dapur') {
                    StokHarianDapurMentah::firstOrCreate(
                        ['item_id' => $ing['item_id'], 'tanggal' => $tanggal],
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => $ing['unit']]
                    );
                } else {
                    StokHarianMentah::firstOrCreate(
                        ['item_id' => $ing['item_id'], 'tanggal' => $tanggal],
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => $ing['unit']]
                    );
                }
            }

            // 🔥 2. LOGIKA BARU: RE-INSERT MENU KE STOK HARIAN (Jika Hilang)
            if ($validated['division'] === 'bar') {
                $this->syncToStokHarianBar($recipe, $tanggal);
            } else {
                $this->syncToStokHarianDapur($recipe, $tanggal);
            }

            // LOG AKTIVITAS
            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'Update Resep',
                'description' => "Memperbarui resep '{$oldName}'."
            ]);
        });

        return redirect()->route('resep', [
            'division' => $validated['division'],
        ])->with('success', 'Resep diperbarui & Stok Harian disinkronkan.');
    }

    public function destroy(Recipe $recipe)
    {
        $division = $recipe->division;
        $name = $recipe->name;
        $tanggal  = session('stok_tanggal') ?? now()->toDateString();
        $user = request()->user();

        DB::transaction(function () use ($recipe, $division, $tanggal, $name, $user) {

            if ($division === 'dapur') {
                StokHarianDapurMenu::where('recipe_id', $recipe->id)
                    ->where('tanggal', $tanggal)
                    ->delete();
            } else {
                $menuItem = Item::where('nama', $recipe->name)
                    ->whereHas('itemCategory', fn ($q) => $q->where('name', 'Menu'))
                    ->first();

                if ($menuItem) {
                    StokHarianMenu::where('item_id', $menuItem->id)
                        ->where('tanggal', $tanggal)
                        ->delete();
                }
            }

            $ingredients = $recipe->ingredients;

            if (!empty($ingredients)) {
                foreach ($ingredients as $ing) {
                    $itemId = $ing['item_id'];
                    $isUsedElsewhere = Recipe::where('id', '!=', $recipe->id)
                        ->where('division', $division)
                        ->whereJsonContains('ingredients', [['item_id' => $itemId]])
                        ->exists();

                    if (!$isUsedElsewhere) {
                        if ($division === 'dapur') {
                            StokHarianDapurMentah::where('item_id', $itemId)
                                ->where('tanggal', $tanggal)
                                ->delete();
                        } else {
                            StokHarianMentah::where('item_id', $itemId)
                                ->where('tanggal', $tanggal)
                                ->delete();
                        }
                    }
                }
            }

            $recipe->delete();

            // LOG AKTIVITAS
            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'Hapus Resep',
                'description' => "Menghapus resep '{$name}'."
            ]);
        });

        return redirect()->route('resep', [
            'division' => $division,
        ])->with('success', 'Resep berhasil dihapus.');
    }

    // --- HELPERS UNTUK SINKRONISASI STOK MENU ---

    private function syncToStokHarianBar($recipe, $tanggal)
    {
        // Cari Item ID berdasarkan nama resep (karena Bar pakai Item ID)
        $menuItem = Item::where('nama', $recipe->name)->first();

        if ($menuItem) {
            $stokMenu = StokHarianMenu::where('item_id', $menuItem->id)
                                      ->whereDate('tanggal', $tanggal)
                                      ->first();

            // Hitung kapasitas
            $stokAwalBaru = $this->calculateCapacity($recipe->ingredients, 'bar', $tanggal);

            if (!$stokMenu) {
                // 🔥 Buat ulang jika tidak ada
                StokHarianMenu::create([
                    'item_id'     => $menuItem->id,
                    'tanggal'     => $tanggal,
                    'stok_awal'   => $stokAwalBaru,
                    'stok_masuk'  => 0,
                    'stok_keluar' => 0,
                    'stok_akhir'  => $stokAwalBaru,
                    'unit'        => 'porsi' // Default unit
                ]);
            }
        }
    }

    private function syncToStokHarianDapur($recipe, $tanggal)
    {
        $stokMenu = StokHarianDapurMenu::where('recipe_id', $recipe->id)
                                       ->whereDate('tanggal', $tanggal)
                                       ->first();

        // Hitung kapasitas
        $stokAwalBaru = $this->calculateCapacity($recipe->ingredients, 'dapur', $tanggal);

        if (!$stokMenu) {
             // 🔥 Buat ulang jika tidak ada
            StokHarianDapurMenu::create([
                'recipe_id'   => $recipe->id,
                'tanggal'     => $tanggal,
                'stok_awal'   => $stokAwalBaru,
                'stok_masuk'  => 0,
                'stok_keluar' => 0,
                'stok_akhir'  => $stokAwalBaru,
                'unit'        => 'porsi'
            ]);
        }
    }

    private function calculateCapacity($ingredients, $division, $tanggal)
    {
        $minCapacity = 999999;

        foreach ($ingredients as $ing) {
            $itemId = $ing['item_id'] ?? null;
            $amount = $ing['amount'] ?? 0;

            if (!$itemId || $amount <= 0) continue;

            $mentah = null;
            if ($division === 'bar') {
                $mentah = StokHarianMentah::where('item_id', $itemId)->whereDate('tanggal', $tanggal)->first();
            } else {
                $mentah = StokHarianDapurMentah::where('item_id', $itemId)->whereDate('tanggal', $tanggal)->first();
            }

            if ($mentah) {
                $capacity = intval($mentah->stok_akhir / $amount);
                if ($capacity < $minCapacity) {
                    $minCapacity = $capacity;
                }
            } else {
                return 0; // Bahan tidak ada, kapasitas 0
            }
        }

        return ($minCapacity === 999999) ? 0 : $minCapacity;
    }
}
