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
        $division = $request->input('division', 'bar');

        $recipes = Recipe::where('division', $division)
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id'                => $r->id,
                'name'              => $r->name,
                'ingredients'       => $r->ingredients,
                'total_ingredients' => $r->total_ingredients,
                'created_at'        => $r->created_at->format('d/m/Y'),
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
            'name'                  => 'required|string|max:255',
            'division'              => 'required|in:bar,dapur',
            'ingredients'           => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string',
        ]);

        DB::transaction(function () use ($validated) {
            // 1. SIMPAN RESEP
            Recipe::create([
                'name'              => $validated['name'],
                'division'          => $validated['division'],
                'ingredients'       => $validated['ingredients'],
                'total_ingredients' => count($validated['ingredients']),
            ]);

            // 2. AUTOMATION: PUSH KE STOK HARIAN
            $today = Carbon::now()->toDateString();

            // A. Masukkan Menu Jadi ke StokHarianMenu
            $menuItem = Item::where('nama', $validated['name'])
                ->where('division', $validated['division'])
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
            'division' => $validated['division'],
        ])->with('success', 'Resep berhasil dibuat & Stok Harian otomatis disiapkan.');
    }

    // =========================================================================
    // UPDATE DENGAN LOGIKA SINKRONISASI STOK HARIAN
    // =========================================================================
    public function update(Request $request, Recipe $recipe)
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'division'              => 'required|in:bar,dapur',
            'ingredients'           => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string',
        ]);

        DB::transaction(function () use ($validated, $recipe) {
            $today = Carbon::now()->toDateString();

            // 1. Ambil nama lama sebelum update untuk mencari Item ID lama
            $oldName = $recipe->name;
            $oldDivision = $recipe->division;

            // 2. UPDATE RESEP
            $recipe->update([
                'name'              => $validated['name'],
                'division'          => $validated['division'],
                'ingredients'       => $validated['ingredients'],
                'total_ingredients' => count($validated['ingredients']),
            ]);

            // 3. SINKRONISASI STOK MENU JADI (Jika Nama Berubah)
            $oldItem = Item::where('nama', $oldName)->where('division', $oldDivision)->first();
            $newItem = Item::where('nama', $validated['name'])->where('division', $validated['division'])->first();

            $currentMenuStock = 0; // Untuk perhitungan bahan mentah nanti

            if ($newItem) {
                // Cek apakah ada stok untuk item lama hari ini?
                if ($oldItem && $oldItem->id !== $newItem->id) {
                    $existingStok = StokHarianMenu::where('item_id', $oldItem->id)
                        ->where('tanggal', $today)
                        ->first();

                    if ($existingStok) {
                        // Jika ada, update item_id nya ke yang baru
                        $existingStok->update(['item_id' => $newItem->id]);
                        $currentMenuStock = $existingStok->stok_awal;
                    } else {
                        // Jika tidak ada stok lama, buat baru untuk item baru
                        $newStock = StokHarianMenu::firstOrCreate(
                            ['item_id' => $newItem->id, 'tanggal' => $today],
                            ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]
                        );
                        $currentMenuStock = $newStock->stok_awal;
                    }
                } else {
                    // Jika nama tidak berubah, cukup pastikan data ada dan ambil stoknya
                    $menuStock = StokHarianMenu::firstOrCreate(
                        ['item_id' => $newItem->id, 'tanggal' => $today],
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]
                    );
                    $currentMenuStock = $menuStock->stok_awal;
                }
            }

            // 4. SINKRONISASI STOK BAHAN MENTAH
            // Kita loop bahan-bahan baru di resep
            if (!empty($validated['ingredients'])) {
                foreach ($validated['ingredients'] as $ing) {
                    $rawItemId = $ing['item_id'] ?? null;
                    $amount = $ing['amount'] ?? 0;

                    if ($rawItemId) {
                        // Hitung kebutuhan stok mentah berdasarkan stok menu saat ini
                        // Rumus: Stok Menu Saat Ini * Jumlah di Resep
                        $calculatedRawStock = $currentMenuStock * $amount;

                        // Cek apakah stok mentah sudah ada
                        $rawStock = StokHarianMentah::where('item_id', $rawItemId)
                            ->where('tanggal', $today)
                            ->first();

                        if ($rawStock) {
                            // Jika sudah ada, kita update stok awalnya (AKUMULASI / UPDATE)
                            // Catatan: Ini akan menambah ke stok yang sudah ada, atau mengupdate?
                            // Agar aman, kita update stok_awal minimal sebesar kalkulasi baru
                            // (atau tambahkan selisih jika diperlukan, disini kita set updated value)

                            // Opsi sederhana: Update stok awal dengan nilai kalkulasi baru
                            // (Perhatian: ini bisa menimpa input manual jika ada)
                            if ($calculatedRawStock > 0) {
                                $rawStock->update([
                                    'stok_awal' => $rawStock->stok_awal + $calculatedRawStock,
                                    'stok_akhir' => ($rawStock->stok_awal + $calculatedRawStock) + $rawStock->stok_masuk - $rawStock->stok_keluar
                                ]);
                            }
                        } else {
                            // Jika belum ada, buat baru
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
