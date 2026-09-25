<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use App\Models\Item;
use App\Models\ItemCategory;
use App\Models\StokHarianMenu;
use App\Models\StokHarianMentah;
use App\Models\StokHarianDapurMentah;
use App\Models\StokHarianDapurMenu;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class RecipeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'bar' || $user->role === 'dapur') {
            $division = $user->role === 'dapur' ? 'dapur' : 'bar';
        } else {
            $division = $request->input('division', 'bar');
        }

        $categories = ItemCategory::where('division', $division)->get();

        // 🔥 LOGIKA PAGINATION (SERVER SIDE)
        $recipes = Recipe::where('division', $division)
            ->when($request->input('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(10) // Batasi 10 item per halaman
            ->withQueryString() // Jaga filter search saat ganti halaman
            ->through(fn ($r) => [
                'id'                   => $r->id,
                'name'                 => $r->name,
                'category_id'          => $r->category_id,
                'category_name'        => $r->category->name ?? '-',
                'ingredients'          => $r->ingredients,
                'total_ingredients'    => $r->total_ingredients,
                'total_hpp'            => $r->total_hpp,
                'target_margin'        => $r->target_margin,
                'harga_jual_hitungan'  => $r->harga_jual_hitungan,
                'harga_jual_real'      => $r->harga_jual_real,
                'profit_real'          => $r->profit_real,
                'created_at'           => $r->created_at?->format('d/m/Y'),
            ]);

        $items = Item::with('itemCategory')
            ->where('division', $division)
            ->get()
            ->unique('nama')
            ->values()
            ->map(fn ($i) => [
                'id'          => $i->id,
                'name'        => $i->nama,
                'unit'        => $i->satuan,
                'harga_dasar' => $i->harga_dasar,
                'category'    => $i->itemCategory->name ?? null,
            ]);

        return Inertia::render('MasterData/Resep', [
            'recipes'      => $recipes,
            'categories'   => $categories,
            'bahan_menu'   => $items->where('category', 'Menu')->values(),
            'bahan_mentah' => $items->where('category', 'Mentah')->values(),
            'division'     => $division,
            'userRole'     => $user->role,
            'search'       => $request->input('search'),
        ]);
    }

    public function exportExcel(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'bar' || $user->role === 'dapur') {
            $division = $user->role === 'dapur' ? 'dapur' : 'bar';
        } else {
            $division = $request->input('division', 'bar');
        }

        $recipes = Recipe::where('division', $division)->with('category')->latest()->get();

        $fileName = 'Laporan_Resep_' . ucfirst($division) . '_' . date('Y-m-d') . '.csv';

        $headers = [
            "Content-type"        => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function() use ($recipes, $division) {
            $file = fopen('php://output', 'w');
            // BOM untuk UTF-8 Excel agar karakter khusus dan mata uang terbaca sempurna
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            // --- HEADER INFORMASI LAPORAN (Dipad dengan kolom kosong agar teks tidak meluber) ---
            fputcsv($file, ['WARUNG CANGKRUK - REKAP DATA RESEP DIVISI ' . strtoupper($division), '', '', '', '', '', '', '', '', '', ''], ';');
            fputcsv($file, ['Periode Cetak: ' . date('d F Y'), '', '', '', '', '', '', '', '', '', ''], ';');
            fputcsv($file, [], ';'); // Baris kosong sebagai pemisah

            // --- HEADER TABEL UTAMA (Total 11 Kolom) ---
            fputcsv($file, [
                'No', 
                'Nama Menu Jadi', 
                'Kategori', 
                'Total Bahan', 
                'Komposisi Bahan & Jumlah', 
                'Total HPP (Rp)', 
                'Target Margin (%)', 
                'Harga Jual Hitungan (Rp)', 
                'Harga Jual Real (Rp)', 
                'Profit Real (Rp)', 
                'Tanggal Dibuat'
            ], ';');

            // --- ISI DATA TABEL ---
            foreach ($recipes as $index => $r) {
                $ingredientsList = '';
                if (is_array($r->ingredients)) {
                    $arr = [];
                    foreach ($r->ingredients as $ing) {
                        $arr[] = ($ing['item_name'] ?? 'Bahan') . ' (' . $ing['amount'] . ' ' . $ing['unit'] . ')';
                    }
                    $ingredientsList = implode(', ', $arr);
                }

                $tanggalDibuat = $r->created_at ? "\t" . $r->created_at->format('d/m/Y') : '-';

                fputcsv($file, [
                    $index + 1,
                    $r->name,
                    $r->category->name ?? '-',
                    $r->total_ingredients,
                    $ingredientsList,
                    $r->total_hpp ?? 0,
                    $r->target_margin ?? 0,
                    $r->harga_jual_hitungan ?? 0,
                    $r->harga_jual_real ?? 0,
                    $r->profit_real ?? 0,
                    $tanggalDibuat
                ], ';');
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'division'          => 'required|in:bar,dapur',
            'category_id'       => 'required|exists:item_categories,id',
            'ingredients'       => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string',
            'target_margin'     => 'nullable|numeric|min:0',
            'harga_jual_real'   => 'nullable|numeric|min:0',
        ]);

        if (($user->role === 'bar' && $validated['division'] !== 'bar') ||
            ($user->role === 'dapur' && $validated['division'] !== 'dapur')) {
            abort(403, 'Anda tidak memiliki akses untuk divisi ini.');
        }

        $this->validateRecipeReferences($validated);

        DB::transaction(function () use ($validated, $user) {
            // 🔥 HITUNG HPP OTOMATIS
            [$ingredients, $totalHpp] = $this->buildIngredientCostSnapshot($validated['ingredients']);
            $targetMargin   = (float)($validated['target_margin'] ?? 0);
            $hargaJualHitungan = $totalHpp > 0
                ? round($totalHpp * (1 + $targetMargin / 100), 2)
                : null;
            $hargaJualReal  = isset($validated['harga_jual_real']) ? (float)$validated['harga_jual_real'] : null;
            $profitReal     = ($hargaJualReal !== null && $totalHpp > 0)
                ? round($hargaJualReal - $totalHpp, 2)
                : null;

            $recipe = Recipe::create([
                'name'                => $validated['name'],
                'division'            => $validated['division'],
                'category_id'         => $validated['category_id'],
                'ingredients'         => $ingredients,
                'total_ingredients'   => count($ingredients),
                'total_hpp'           => $totalHpp ?: null,
                'target_margin'       => $targetMargin,
                'harga_jual_hitungan' => $hargaJualHitungan,
                'harga_jual_real'     => $hargaJualReal,
                'profit_real'         => $profitReal,
            ]);

            $tanggal = session('stok_tanggal') ?? now()->toDateString();

            if ($validated['division'] === 'dapur') {
                StokHarianDapurMenu::firstOrCreate(
                    ['recipe_id' => $recipe->id, 'tanggal' => $tanggal],
                    ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => 'porsi']
                );
                foreach ($ingredients as $ing) {
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
                foreach ($ingredients as $ing) {
                    StokHarianMentah::firstOrCreate(
                        ['item_id' => $ing['item_id'], 'tanggal' => $tanggal],
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => $ing['unit']]
                    );
                }
            }

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
            'name'                => 'required|string|max:255',
            'division'            => 'required|in:bar,dapur',
            'category_id'         => 'required|exists:item_categories,id',
            'ingredients'         => 'required|array|min:1',
            'ingredients.*.item_id' => 'required|exists:items,id',
            'ingredients.*.amount'  => 'required|numeric|min:0.01',
            'ingredients.*.unit'    => 'required|string',
            'target_margin'     => 'nullable|numeric|min:0',
            'harga_jual_real'   => 'nullable|numeric|min:0',
        ]);

        if (($user->role === 'bar' && $validated['division'] !== 'bar') ||
            ($user->role === 'dapur' && $validated['division'] !== 'dapur')) {
            abort(403, 'Anda tidak memiliki akses.');
        }

        $this->validateRecipeReferences($validated);

        DB::transaction(function () use ($validated, $recipe, $user) {
            $oldName = $recipe->name;

            // 🔥 HITUNG HPP OTOMATIS
            [$ingredients, $totalHpp] = $this->buildIngredientCostSnapshot($validated['ingredients']);
            $targetMargin   = (float)($validated['target_margin'] ?? 0);
            $hargaJualHitungan = $totalHpp > 0
                ? round($totalHpp * (1 + $targetMargin / 100), 2)
                : null;
            $hargaJualReal  = isset($validated['harga_jual_real']) ? (float)$validated['harga_jual_real'] : null;
            $profitReal     = ($hargaJualReal !== null && $totalHpp > 0)
                ? round($hargaJualReal - $totalHpp, 2)
                : null;

            $recipe->update([
                'name'                => $validated['name'],
                'division'            => $validated['division'],
                'category_id'         => $validated['category_id'],
                'ingredients'         => $ingredients,
                'total_ingredients'   => count($ingredients),
                'total_hpp'           => $totalHpp ?: null,
                'target_margin'       => $targetMargin,
                'harga_jual_hitungan' => $hargaJualHitungan,
                'harga_jual_real'     => $hargaJualReal,
                'profit_real'         => $profitReal,
            ]);

            $tanggal = session('stok_tanggal') ?? now()->toDateString();

            foreach ($ingredients as $ing) {
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

            if ($validated['division'] === 'bar') {
                $this->syncToStokHarianBar($recipe, $tanggal);
            } else {
                $this->syncToStokHarianDapur($recipe, $tanggal);
            }

            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'Update Resep',
                'description' => "Memperbarui resep '{$oldName}'."
            ]);
        });

        return back()->with('success', 'Resep diperbarui & Stok Harian disinkronkan.');
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

            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'Hapus Resep',
                'description' => "Menghapus resep '{$name}'."
            ]);
        });

        return back()->with('success', 'Resep berhasil dihapus.');
    }

    private function syncToStokHarianBar($recipe, $tanggal)
    {
        $menuItem = Item::where('nama', $recipe->name)->first();

        if ($menuItem) {
            $stokMenu = StokHarianMenu::where('item_id', $menuItem->id)
                                        ->whereDate('tanggal', $tanggal)
                                        ->first();

            $stokAwalBaru = $this->calculateCapacity($recipe->ingredients, 'bar', $tanggal);

            if (!$stokMenu) {
                StokHarianMenu::create([
                    'item_id'     => $menuItem->id,
                    'user_id'     => Auth::id(),
                    'tanggal'     => $tanggal,
                    'stok_awal'   => $stokAwalBaru,
                    'stok_masuk'  => 0,
                    'stok_keluar' => 0,
                    'stok_akhir'  => $stokAwalBaru,
                    'unit'        => 'porsi'
                ]);
            }
        }
    }

    private function syncToStokHarianDapur($recipe, $tanggal)
    {
        $stokMenu = StokHarianDapurMenu::where('recipe_id', $recipe->id)
                                       ->whereDate('tanggal', $tanggal)
                                       ->first();

        $stokAwalBaru = $this->calculateCapacity($recipe->ingredients, 'dapur', $tanggal);

        if (!$stokMenu) {
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

    private function validateRecipeReferences(array $validated): void
    {
        $categoryIsValid = ItemCategory::whereKey($validated['category_id'])
            ->where('division', $validated['division'])
            ->exists();

        if (!$categoryIsValid) {
            throw ValidationException::withMessages([
                'category_id' => 'Kategori harus sesuai dengan divisi resep.',
            ]);
        }

        $itemIds = collect($validated['ingredients'])->pluck('item_id')->unique()->values();
        $items = Item::with('itemCategory')->whereIn('id', $itemIds)->get();
        $hasInvalidItem = $items->count() !== $itemIds->count()
            || $items->contains(fn (Item $item) => $item->division !== $validated['division']
                || !in_array(strtolower(trim((string) optional($item->itemCategory)->name)), ['mentah', 'raw'], true));

        if ($hasInvalidItem) {
            throw ValidationException::withMessages([
                'ingredients' => 'Setiap bahan resep harus berupa item Mentah dari divisi yang sama.',
            ]);
        }
    }

    private function buildIngredientCostSnapshot(array $ingredients): array
    {
        $items = Item::whereIn('id', collect($ingredients)->pluck('item_id')->unique())
            ->get()
            ->keyBy('id');
        $totalHpp = 0;

        $snapshot = collect($ingredients)->map(function (array $ingredient) use ($items, &$totalHpp) {
            $item = $items->get($ingredient['item_id']);
            $amount = (float) $ingredient['amount'];
            $hargaDasar = (float) $item->harga_dasar;
            $subtotal = round($amount * $hargaDasar, 2);
            $totalHpp += $subtotal;

            return [
                'item_id' => $item->id,
                'item_name' => $item->nama,
                'amount' => $amount,
                'unit' => $ingredient['unit'],
                'harga_dasar' => $hargaDasar,
                'subtotal' => $subtotal,
            ];
        })->values()->all();

        return [$snapshot, round($totalHpp, 2)];
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
                return 0;
            }
        }

        return ($minCapacity === 999999) ? 0 : $minCapacity;
    }
}