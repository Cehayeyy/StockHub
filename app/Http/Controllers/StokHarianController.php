<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\StokHarianMenu;
use App\Models\StokHarianMentah;
use App\Models\Recipe;
use App\Models\Item;
use App\Models\ActivityLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class StokHarianController extends Controller
{
    public function bar(Request $request)
    {
        $tab     = $request->tab ?? 'menu';
        $search  = $request->search;
        $tanggal = $request->tanggal ?? Carbon::now()->toDateString();

        // 🔥 LOGIKA SINKRONISASI STOK (AMAN DARI DUPLICATE ENTRY)
        $this->ensureStokExists($tanggal);

        // --- 1. DATA TABEL (PAGINATION) ---
        if ($tab === 'menu') {
            $query = StokHarianMenu::with('item')
                ->whereDate('tanggal', $tanggal)
                ->where('user_id', Auth::id()); // Filter user_id

            if ($search) {
                $query->whereHas('item', fn ($q) => $q->where('nama', 'like', "%{$search}%"));
            }

            $items = $query->orderByDesc('id')->paginate(10)->through(function ($s) {
                return [
                    'id'         => $s->id,
                    'item_id'    => $s->item_id,
                    'nama'       => $s->item->nama,
                    'satuan'     => $s->item->satuan ?? 'porsi',
                    'stok_awal'  => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $s->stok_akhir,
                ];
            })->withQueryString();

        } else {
            // TAB MENTAH
            $query = StokHarianMentah::with('item')->whereDate('tanggal', $tanggal);
            if ($search) {
                $query->whereHas('item', fn ($q) => $q->where('nama', 'like', "%{$search}%"));
            }

            $items = $query->orderByDesc('id')->paginate(10)->through(fn ($s) => [
                'id'         => $s->id,
                'item_id'    => $s->item_id,
                'nama'       => $s->item->nama,
                'satuan'     => $s->unit ?? $s->item->satuan,
                'stok_awal'  => $s->stok_awal,
                'stok_masuk' => $s->stok_masuk,
                'stok_total' => $s->stok_awal + $s->stok_masuk,
                'pemakaian'  => $s->stok_keluar,
                'tersisa'    => $s->stok_akhir,
            ]);
        }

        // --- 2. HITUNG LOW STOCK ITEMS ---
        try {
            $lowMentah = StokHarianMentah::with('item')
                ->whereDate('tanggal', $tanggal)
                ->where('stok_akhir', '<', 7)
                ->get()
                ->toBase()
                ->map(fn($i) => [
                    'nama'     => $i->item->nama,
                    'tersisa'  => $i->stok_akhir,
                    'kategori' => 'Bahan Mentah'
                ]);

            $lowMenu = StokHarianMenu::with('item')
                ->whereDate('tanggal', $tanggal)
                ->where('stok_akhir', '<', 7)
                ->get()
                ->toBase()
                ->map(function($s) use ($tanggal) {
                    $tersisa = $s->stok_akhir;
                    $recipe = Recipe::where('item_id', $s->item_id)->first();

                    if ($recipe && !empty($recipe->ingredients)) {
                        $maxBisaDibuat = 999999;
                        foreach ($recipe->ingredients as $ing) {
                            $rawItemId = $ing['item_id'] ?? null;
                            $butuh = $ing['amount'] ?? 0;
                            if ($rawItemId && $butuh > 0) {
                                $stokMentah = StokHarianMentah::where('item_id', $rawItemId)
                                    ->where('tanggal', $tanggal)
                                    ->first();
                                $sisaFisik = $stokMentah ? $stokMentah->stok_akhir : 0;
                                $kapasitas = floor($sisaFisik / $butuh);
                                if ($kapasitas < $maxBisaDibuat) $maxBisaDibuat = $kapasitas;
                            }
                        }
                        $tersisa = ($maxBisaDibuat === 999999) ? 0 : $maxBisaDibuat;
                    }

                    return ['nama' => $s->item->nama, 'tersisa' => $tersisa, 'kategori' => 'Menu'];
                })->filter(fn($item) => $item['tersisa'] < 7)->values();

            $lowStockItems = $lowMentah->concat($lowMenu)->values();
        } catch (\Throwable $e) {
            Log::error('Low-stock calculation failed in StokHarianController::bar', ['error' => $e]);
            $lowStockItems = collect();
        }


        // --- 3. DATA DROPDOWN ---
        $availableMenus = [];
        $inputableMenus = [];

        if ($tab === 'menu') {
            $usedIds = StokHarianMenu::whereDate('tanggal', $tanggal)->pluck('item_id');
            $recipes = Recipe::where('division', 'bar')->pluck('name');
            $availableMenus = Item::where('division', 'bar')
                ->whereIn('nama', $recipes)
                ->whereNotIn('id', $usedIds)
                ->orderBy('nama')
                ->get(['id', 'nama', 'satuan']);

            $inputableMenus = StokHarianMenu::with('item')
                ->whereDate('tanggal', $tanggal)
                ->where('user_id', Auth::id())
                ->get()
                ->map(fn ($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'stok_awal' => $s->stok_awal,
                    'tersisa'   => $s->stok_akhir
                ]);
        } else {
            $inputableMenus = StokHarianMentah::with('item')
                ->whereDate('tanggal', $tanggal)->get()
                ->map(fn ($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'satuan'    => $s->unit,
                    'stok_awal' => $s->stok_awal,
                    'tersisa'   => $s->stok_akhir
                ]);
        }

        return Inertia::render('StokHarian/Bar', [
            'items'          => $items,
            'tab'            => $tab,
            'division'       => 'bar',
            'tanggal'        => $tanggal,
            'availableMenus' => $availableMenus,
            'inputableMenus' => $inputableMenus,
            'lowStockItems'  => $lowStockItems,
        ]);
    }

    // 🔥 FIX: Menggunakan logika Try-Catch Anti Duplicate Entry (Seperti di Dapur)
    private function ensureStokExists($tanggal)
    {
        $userId = Auth::id();

        // 1. CEK & BUAT MENTAH
        // Gunakan firstOrCreate dalam try-catch untuk menangani race condition
        $allRecipes = Recipe::where('division', 'bar')->get();
        $ingredientIds = collect();
        foreach($allRecipes as $r) {
            if(is_array($r->ingredients)) {
                foreach($r->ingredients as $ing) {
                    if(isset($ing['item_id'])) $ingredientIds->push($ing['item_id']);
                }
            }
        }
        $targetMentahIds = $ingredientIds->unique();

        // Jika ada history kemarin, ambil stok akhirnya
        $lastDateData = StokHarianMentah::whereDate('tanggal', '<', $tanggal)
            ->orderBy('tanggal', 'desc')
            ->get()
            ->groupBy('item_id');

        // Loop semua bahan mentah yang seharusnya ada
        if ($targetMentahIds->isNotEmpty()) {
            foreach ($targetMentahIds as $itemId) {
                try {
                    // Cek apakah sudah ada hari ini
                    $exists = StokHarianMentah::where('item_id', $itemId)->where('tanggal', $tanggal)->exists();

                    if (!$exists) {
                        // Ambil stok kemarin jika ada
                        $stokAwal = 0;
                        if (isset($lastDateData[$itemId])) {
                            $stokAwal = $lastDateData[$itemId]->first()->stok_akhir;
                        }

                        $itemInfo = Item::find($itemId);
                        StokHarianMentah::create([
                            'item_id'     => $itemId,
                            'tanggal'     => $tanggal,
                            'stok_awal'   => $stokAwal,
                            'stok_masuk'  => 0,
                            'stok_keluar' => 0,
                            'stok_akhir'  => $stokAwal,
                            'unit'        => $itemInfo->satuan ?? 'unit'
                        ]);
                    }
                } catch (\Illuminate\Database\QueryException $e) {
                    // Abaikan jika error Duplicate Entry (1062)
                    if ($e->errorInfo[1] != 1062) throw $e;
                }
            }
        }

        // 2. CEK & BUAT MENU
        // Ambil semua menu Bar
        $barRecipeNames = Recipe::where('division', 'bar')->pluck('name');
        $menuItems = Item::whereIn('nama', $barRecipeNames)->get();

        // Ambil history menu kemarin
        $lastMenuData = StokHarianMenu::whereDate('tanggal', '<', $tanggal)
            ->where('user_id', $userId)
            ->orderBy('tanggal', 'desc')
            ->get()
            ->groupBy('item_id');

        foreach ($menuItems as $item) {
            try {
                // Cek apakah sudah ada hari ini
                $exists = StokHarianMenu::where('user_id', $userId)
                    ->where('item_id', $item->id)
                    ->where('tanggal', $tanggal)
                    ->exists();

                if (!$exists) {
                    // Ambil stok kemarin jika ada
                    $stokAwal = 0;
                    if (isset($lastMenuData[$item->id])) {
                        $stokAwal = $lastMenuData[$item->id]->first()->stok_akhir;
                    }

                    StokHarianMenu::create([
                        'user_id'      => $userId,
                        'item_id'      => $item->id,
                        'tanggal'      => $tanggal,
                        'stok_awal'    => $stokAwal,
                        'stok_masuk'   => 0,
                        'stok_keluar'  => 0,
                        'stok_akhir'   => $stokAwal,
                        'unit'         => $item->satuan ?? 'porsi',
                        'is_submitted' => 0
                    ]);
                }
            } catch (\Illuminate\Database\QueryException $e) {
                // Abaikan jika error Duplicate Entry (1062)
                if ($e->errorInfo[1] != 1062) throw $e;
            }
        }
    }

    // --- STORE MENTAH ---
    public function storeMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'     => 'required|exists:items,id',
            'tanggal'     => 'required|date',
            'stok_awal'   => 'required|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
            'stok_keluar' => 'nullable|numeric|min:0',
        ]);

        $masuk = $data['stok_masuk'] ?? 0;
        $keluar = 0;
        $item = Item::find($data['item_id']);
        $unit = $item ? $item->satuan : 'unit';

        DB::transaction(function () use ($data, $masuk, $keluar, $unit, $item) {
            $mentah = StokHarianMentah::updateOrCreate(
                ['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
                [
                    'stok_awal'   => $data['stok_awal'],
                    'stok_masuk'  => $masuk,
                    'stok_keluar' => $keluar,
                    'stok_akhir'  => $data['stok_awal'] + $masuk - $keluar,
                    'unit'        => $unit
                ]
            );

            $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $mentah->tanggal);

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Input Stok Mentah',
                'description' => "Menginput stok mentah '{$item->nama}'."
            ]);
        });

        return back()->with('success', 'Stok mentah disimpan dan menu otomatis terupdate!');
    }

    // --- STORE MENU ---
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'item_id' => 'required|exists:items,id',
            'tanggal' => 'required|date',
            'pemakaian' => 'required|numeric|min:0',
        ]);

        $item = Item::find($data['item_id']);

        DB::transaction(function () use ($data, $item) {
            $existing = StokHarianMenu::where('item_id', $data['item_id'])
                ->where('tanggal', $data['tanggal'])
                ->where('user_id', Auth::id())
                ->first();

            $oldUsage = $existing ? $existing->stok_keluar : 0;

            $menu = StokHarianMenu::updateOrCreate(
                [
                    'item_id' => $data['item_id'],
                    'tanggal' => $data['tanggal'],
                    'user_id' => Auth::id(),
                ],
                [
                    'stok_awal' => $existing ? $existing->stok_awal : 0,
                    'stok_masuk' => $existing ? $existing->stok_masuk : 0,
                    'stok_keluar' => $data['pemakaian'],
                    'stok_akhir' => max(0, ($existing ? ($existing->stok_awal + $existing->stok_masuk) : 0) - $data['pemakaian']),
                    'unit' => $item->satuan ?? 'porsi',
                    'is_submitted' => 1,
                ]
            );

            $delta = $data['pemakaian'] - $oldUsage;
            $recipe = Recipe::where('name', $item->nama)->first();
            if (!$recipe) {
                $recipe = Recipe::where('item_id', $data['item_id'])->first();
            }

            if ($delta != 0 && $recipe && is_array($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $qty = $delta * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    $mentah = StokHarianMentah::where([
                        'item_id' => $ing['item_id'],
                        'tanggal' => $data['tanggal']
                    ])->first();

                    if ($mentah) {
                        $newRawKeluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->update([
                            'stok_keluar' => $newRawKeluar,
                            'stok_akhir'  => max(0, $mentah->stok_awal + $mentah->stok_masuk - $newRawKeluar),
                        ]);
                        $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $mentah->tanggal);
                    }
                }
            }

            ActivityLog::create([
                'user_id' => Auth::id(),
                'activity' => 'Input Stok Menu',
                'description' => "Input pemakaian menu '{$item->nama}'. Pemakaian: {$data['pemakaian']}."
            ]);
        });

        return back()->with('success', 'Stok menu tersimpan.');
    }

    // --- UPDATE MENU ---
    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianMenu::with('item')->findOrFail($id);
        $request->validate(['stok_keluar' => 'required|numeric|min:0']);

        DB::transaction(function () use ($request, $menu) {
            $newKeluar = $request->input('stok_keluar');
            $delta = $newKeluar - $menu->stok_keluar;

            $menu->update([
                'stok_keluar' => $newKeluar,
                'stok_akhir' => max(0, ($menu->stok_awal + $menu->stok_masuk) - $newKeluar),
            ]);

            $recipe = Recipe::where('name', $menu->item->nama)->first();
            if ($recipe && is_array($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $qty = $delta * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    $mentah = StokHarianMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $menu->tanggal])->first();
                    if ($mentah) {
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir  = max(0, ($mentah->stok_awal + $mentah->stok_masuk) - $mentah->stok_keluar);
                        $mentah->save();
                        $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $menu->tanggal);
                    }
                }
            }

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Update Stok Menu',
                'description' => "Update penjualan '{$menu->item->nama}'."
            ]);
        });
        return back()->with('success', 'Penjualan dicatat!');
    }

    // --- UPDATE MENTAH ---
    public function updateMentah(Request $request, $id)
    {
        $stok = StokHarianMentah::findOrFail($id);
        $data = $request->validate(['stok_awal' => 'required|numeric|min:0', 'stok_masuk' => 'nullable|numeric|min:0']);

        $masuk = $data['stok_masuk'] ?? $stok->stok_masuk;
        $akhir = $data['stok_awal'] + $masuk - $stok->stok_keluar;

        $stok->update(['stok_awal' => $data['stok_awal'], 'stok_masuk' => $masuk, 'stok_akhir' => $akhir]);
        $this->distributeStockToMenus($stok->item_id, $stok->stok_akhir, $stok->tanggal);

        ActivityLog::create([
            'user_id' => Auth::id(), 'activity' => 'Update Stok Mentah', 'description' => "Update mentah '{$stok->item->nama}'."
        ]);

        return back()->with('success', 'Stok mentah diperbarui.');
    }

    // --- HELPER: DISTRIBUTE ---
    private function distributeStockToMenus($rawItemId, $totalStokMentah, $date)
    {
        $recipes = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$rawItemId]])->get();
        $recipeNames = $recipes->pluck('name');
        if ($recipeNames->isEmpty()) return;

        $menuItems = Item::whereIn('nama', $recipeNames)->get();
        $targetMenus = StokHarianMenu::whereIn('item_id', $menuItems->pluck('id'))->where('tanggal', $date)->get();

        if ($targetMenus->count() > 0) {
            $allocatedStock = floor($totalStokMentah / $targetMenus->count());
            foreach ($targetMenus as $menu) {
                $newStokAwal = $allocatedStock + $menu->stok_keluar;
                $menu->update(['stok_awal' => $newStokAwal, 'stok_masuk' => 0, 'stok_akhir' => $allocatedStock]);
            }
        }
    }

    // --- DELETE MENU ---
    public function destroyMenu($id)
    {
        $menu = StokHarianMenu::with('item')->findOrFail($id);
        $nama = $menu->item->nama;

        DB::transaction(function () use ($menu, $nama) {

            // Kembalikan stok mentah jika menu sudah terjual
            $recipe = Recipe::where('name', $nama)->first();

            if ($menu->stok_keluar > 0 && $recipe && is_array($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $qtyToRestore = $menu->stok_keluar * ($ing['amount'] ?? 0);

                    if ($qtyToRestore > 0) {
                        $mentah = StokHarianMentah::where([
                            'item_id' => $ing['item_id'],
                            'tanggal' => $menu->tanggal
                        ])->first();

                        if ($mentah) {
                            $newRawKeluar = max(0, $mentah->stok_keluar - $qtyToRestore);
                            $mentah->stok_keluar = $newRawKeluar;
                            $mentah->stok_akhir = ($mentah->stok_awal + $mentah->stok_masuk) - $newRawKeluar;
                            $mentah->save();

                            // Hitung ulang setelah restore
                            $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $menu->tanggal);
                        }
                    }
                }
            }

            $menu->delete();

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Hapus Stok Menu',
                'description' => "Menghapus data stok menu '{$nama}'."
            ]);
        });

        return back()->with('success', 'Data stok dihapus.');
    }

    // --- DELETE MENTAH ---
    public function destroyMentah($id)
    {
        $mentah = StokHarianMentah::with('item')->findOrFail($id);
        $nama = $mentah->item->nama;

        $mentah->delete();
        ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Hapus Stok Mentah', 'description' => "Menghapus mentah '{$nama}'."]);
        return back()->with('success', 'Data stok mentah dihapus.');
    }
}
