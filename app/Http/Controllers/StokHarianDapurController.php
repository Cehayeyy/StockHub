<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\StokHarianDapurMenu;
use App\Models\StokHarianDapurMentah;
use App\Models\Recipe;
use App\Models\Item;
use App\Models\ActivityLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class StokHarianDapurController extends Controller
{
    public function dapur(Request $request)
    {
        $tab     = $request->get('tab', 'menu');
        $search  = $request->search;
        $tanggal = $request->get('tanggal', Carbon::now()->toDateString());

        $this->ensureStokExists($tanggal);

        if ($tab === 'menu') {
            $query = StokHarianDapurMenu::with('recipe')->whereDate('tanggal', $tanggal);
            if ($search) {
                $query->whereHas('recipe', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            }

            // 🔥 TAMPILKAN APA ADANYA DARI DB (Sudah hasil bagi rata)
            $items = $query->orderBy('id')->paginate(10)->through(function ($s) {
                return [
                    'id'         => $s->id,
                    'recipe_id'  => $s->recipe_id,
                    'nama'       => $s->recipe->name,
                    'satuan'     => $s->unit,
                    'stok_awal'  => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $s->stok_akhir,
                ];
            });

        } else {
            // TAB MENTAH
            $query = StokHarianDapurMentah::with('item')->whereDate('tanggal', $tanggal);
            if ($search) {
                $query->whereHas('item', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            }
            $items = $query->orderBy('id')->paginate(10)->through(fn ($s) => [
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

        // --- LOW STOCK ITEMS ---
        $lowMentah = StokHarianDapurMentah::with('item')
            ->whereDate('tanggal', $tanggal)
            ->where('stok_akhir', '<', 7)
            ->get()
            ->toBase()
            ->map(fn($i) => [
                'nama' => $i->item->nama,
                'tersisa' => $i->stok_akhir,
                'kategori' => 'Bahan Mentah'
            ]);

        $lowMenu = StokHarianDapurMenu::with('recipe')
            ->whereDate('tanggal', $tanggal)
            ->where('stok_akhir', '<', 7)
            ->get()
            ->toBase()
            ->map(fn($i) => [
                'nama' => $i->recipe->name,
                'tersisa' => $i->stok_akhir,
                'kategori' => 'Menu'
            ]);

        $lowStockItems = $lowMentah->merge($lowMenu);

        // --- DROPDOWN ---
        $availableMenus = [];
        $inputableMenus = [];

        if ($tab === 'menu') {
            $usedRecipeIds = StokHarianDapurMenu::whereDate('tanggal', $tanggal)->pluck('recipe_id');
            $availableMenus = Recipe::where('division', 'dapur')
                ->whereNotIn('id', $usedRecipeIds)
                ->orderBy('name')
                ->get()
                ->map(fn ($r) => ['id' => $r->id, 'nama' => $r->name]);

            $inputableMenus = StokHarianDapurMenu::with('recipe')
                ->whereDate('tanggal', $tanggal)->get()
                ->map(fn ($s) => [
                    'id' => $s->recipe_id,
                    'nama' => $s->recipe->name,
                    'satuan' => $s->unit,
                    'stok_awal' => $s->stok_awal,
                    'tersisa' => $s->stok_akhir
                ]);
        } else {
            $inputableMenus = StokHarianDapurMentah::with('item')
                ->whereDate('tanggal', $tanggal)->get()
                ->map(fn ($s) => [
                    'id' => $s->item_id,
                    'nama' => $s->item->nama,
                    'satuan' => $s->unit,
                    'stok_awal' => $s->stok_awal,
                    'tersisa' => $s->stok_akhir
                ]);
        }

        return Inertia::render('StokHarian/Dapur', [
            'items'          => $items,
            'tab'            => $tab,
            'tanggal'        => $tanggal,
            'availableMenus' => $availableMenus,
            'inputableMenus' => $inputableMenus,
            'lowStockItems'  => $lowStockItems,
        ]);
    }

    private function ensureStokExists($tanggal)
    {
        $existsAnyMentah = StokHarianDapurMentah::whereDate('tanggal', $tanggal)->exists();
        $existsAnyMenu   = StokHarianDapurMenu::whereDate('tanggal', $tanggal)->exists();

        // 1. Cek Mentah
        if (!$existsAnyMentah) {
            $lastDateData = StokHarianDapurMentah::whereDate('tanggal', '<', $tanggal)
                ->orderBy('tanggal', 'desc')->get()->groupBy('item_id');

            if ($lastDateData->isNotEmpty()) {
                $lastDate = $lastDateData->first()->first()->tanggal;
                $recordsToCopy = StokHarianDapurMentah::whereDate('tanggal', $lastDate)->get();

                foreach ($recordsToCopy as $lastRecord) {
                    StokHarianDapurMentah::create([
                        'item_id'     => $lastRecord->item_id,
                        'tanggal'     => $tanggal,
                        'stok_awal'   => $lastRecord->stok_akhir,
                        'stok_masuk'  => 0,
                        'stok_keluar' => 0,
                        'stok_akhir'  => $lastRecord->stok_akhir,
                        'unit'        => $lastRecord->unit
                    ]);
                }
            }
        }

        // 2. Cek Menu
        if (!$existsAnyMenu) {
            $lastDateData = StokHarianDapurMenu::whereDate('tanggal', '<', $tanggal)
                ->orderBy('tanggal', 'desc')->get()->groupBy('recipe_id');

            if ($lastDateData->isNotEmpty()) {
                $lastDate = $lastDateData->first()->first()->tanggal;
                $recordsToCopy = StokHarianDapurMenu::whereDate('tanggal', $lastDate)->get();

                foreach ($recordsToCopy as $lastRecord) {
                    StokHarianDapurMenu::create([
                        'recipe_id'   => $lastRecord->recipe_id,
                        'tanggal'     => $tanggal,
                        'stok_awal'   => $lastRecord->stok_akhir,
                        'stok_masuk'  => 0,
                        'stok_keluar' => 0,
                        'stok_akhir'  => $lastRecord->stok_akhir,
                        'unit'        => $lastRecord->unit ?? 'porsi'
                    ]);
                }
            }
        }
    }

    // --- STORE MENU ---
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'recipe_id'   => 'required|exists:recipes,id',
            'tanggal'     => 'required|date',
            'stok_keluar' => 'nullable|numeric|min:0', // Tambahan agar bisa input pemakaian langsung
        ]);

        DB::transaction(function () use ($data) {
            if (StokHarianDapurMenu::where(['recipe_id' => $data['recipe_id'], 'tanggal' => $data['tanggal']])->exists()) return;

            $recipe = Recipe::findOrFail($data['recipe_id']);
            $pemakaianAwal = $data['stok_keluar'] ?? 0;

            // Buat Menu (Stok 0 dulu, nanti di-update distribute)
            $menu = StokHarianDapurMenu::create([
                'recipe_id'   => $data['recipe_id'],
                'tanggal'     => $data['tanggal'],
                'stok_awal'   => 0,
                'stok_masuk'  => 0,
                'stok_keluar' => $pemakaianAwal, // Langsung set pemakaian
                'stok_akhir'  => 0,
                'unit'        => 'porsi',
            ]);

            // Jika ada pemakaian awal, kurangi stok mentah dulu
            if ($pemakaianAwal > 0 && is_array($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $qty = $pemakaianAwal * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $data['tanggal']])->first();
                    if ($mentah) {
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir  = max(0, ($mentah->stok_awal + $mentah->stok_masuk) - $mentah->stok_keluar);
                        $mentah->save();
                    }
                }
            }

            // Panggil re-distribute agar menu baru mendapat jatah & update stok_awal/akhir
            if (is_array($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $data['tanggal']])->first();
                    if ($mentah) {
                        $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $data['tanggal']);
                    }
                }
            }

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Tambah Menu Dapur',
                'description' => "Menambahkan menu '{$recipe->name}' ke stok harian."
            ]);
        });
        return back()->with('success', 'Menu dapur ditambahkan.');
    }

    // --- UPDATE MENU (DYNAMIC RE-BALANCING) ---
    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);

        $request->validate([
            'stok_keluar' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($request, $menu) {
            $newKeluar = $request->input('stok_keluar');
            $oldUsage = $menu->stok_keluar;
            $deltaPemakaian = $newKeluar - $oldUsage;

            // Update data menu
            $menu->update(['stok_keluar' => $newKeluar]);

            // Logic tarik stok tetangga (re-balancing)
            if (is_array($menu->recipe->ingredients)) {
                foreach ($menu->recipe->ingredients as $ing) {
                    $qty = $deltaPemakaian * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $menu->tanggal])->first();
                    if ($mentah) {
                        // Update pemakaian mentah
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir  = max(0, ($mentah->stok_awal + $mentah->stok_masuk) - $mentah->stok_keluar);
                        $mentah->save();

                        // 🔥 DISTRIBUSI ULANG
                        $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $menu->tanggal);
                    }
                }
            }

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Update Menu Dapur',
                'description' => "Update penjualan '{$menu->recipe->name}'. Terjual: {$newKeluar}."
            ]);
        });

        return back()->with('success', 'Produksi disimpan & stok dibagi ulang.');
    }

    // --- STORE MENTAH ---
    public function storeMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'    => 'required|exists:items,id',
            'tanggal'    => 'required|date',
            'stok_awal'  => 'required|numeric|min:0',
            'stok_masuk' => 'nullable|numeric|min:0',
        ]);
        $item = Item::find($data['item_id']);
        $masuk = $data['stok_masuk'] ?? 0;

        DB::transaction(function () use ($data, $masuk, $item) {
            $mentah = StokHarianDapurMentah::updateOrCreate(
                ['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
                [
                    'stok_awal'   => $data['stok_awal'],
                    'stok_masuk'  => $masuk,
                    'stok_keluar' => 0,
                    'stok_akhir'  => $data['stok_awal'] + $masuk,
                    'unit'        => $item->satuan ?? 'porsi'
                ]
            );

            // 🔥 LOGIKA BAGI RATA
            $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $mentah->tanggal);

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Input Mentah Dapur',
                'description' => "Input stok mentah '{$item->nama}'."
            ]);
        });

        return back()->with('success', 'Stok bahan mentah disimpan.');
    }

    // --- UPDATE MENTAH ---
    public function updateMentah(Request $request, $id)
    {
        $mentah = StokHarianDapurMentah::with('item')->findOrFail($id);
        $data = $request->validate([
            'stok_awal'  => 'required|numeric|min:0',
            'stok_masuk' => 'nullable|numeric|min:0'
        ]);

        $masuk = $data['stok_masuk'] ?? 0;
        $mentah->update([
            'stok_awal'  => $data['stok_awal'],
            'stok_masuk' => $masuk,
            'stok_akhir' => $data['stok_awal'] + $masuk - $mentah->stok_keluar,
        ]);

        // 🔥 LOGIKA BAGI RATA
        $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $mentah->tanggal);

        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Update Mentah Dapur',
            'description' => "Update stok mentah '{$mentah->item->nama}'."
        ]);

        return back()->with('success', 'Stok diperbarui.');
    }

    // --- HELPER: BAGI RATA STOK KE MENU (DAPUR VERSION) ---
    private function distributeStockToMenus($rawItemId, $totalStokMentah, $date)
    {
        // 1. Cari Resep Dapur yang pakai bahan ini
        $recipes = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$rawItemId]])->get();
        $recipeIds = $recipes->pluck('id');

        if ($recipeIds->isEmpty()) return;

        // 2. Cari Menu Dapur Aktif di tanggal tersebut
        $targetMenus = StokHarianDapurMenu::whereIn('recipe_id', $recipeIds)
            ->where('tanggal', $date)
            ->get();

        $menuCount = $targetMenus->count();

        if ($menuCount > 0) {
            // 3. Hitung Jatah Per Menu (Floor biar bulat)
            $allocatedStock = floor($totalStokMentah / $menuCount);

            // 4. Update Semua Menu
            foreach ($targetMenus as $menu) {
                // Logic: Stok Awal Menu = Jatah + Pemakaian (agar history masuk akal)
                $newStokAwal = $allocatedStock + $menu->stok_keluar;

                $menu->update([
                    'stok_awal'  => $newStokAwal,
                    'stok_masuk' => 0,
                    'stok_akhir' => $allocatedStock // Tersisa = Jatah Pembagian
                ]);
            }
        }
    }

    // --- DELETE MENU ---
    public function destroyMenu($id)
    {
        $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);
        $nama = $menu->recipe->name;

        DB::transaction(function () use ($menu, $nama) {
            $tanggal = $menu->tanggal;

            // Kembalikan stok mentah jika menu sudah terjual
            if ($menu->stok_keluar > 0 && is_array($menu->recipe->ingredients)) {
                foreach ($menu->recipe->ingredients as $ing) {
                    $qtyToRestore = $menu->stok_keluar * ($ing['amount'] ?? 0);
                    if ($qtyToRestore > 0) {
                        $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $tanggal])->first();
                        if ($mentah) {
                            $newRawKeluar = max(0, $mentah->stok_keluar - $qtyToRestore);
                            $mentah->stok_keluar = $newRawKeluar;
                            $mentah->stok_akhir = ($mentah->stok_awal + $mentah->stok_masuk) - $newRawKeluar;
                            $mentah->save();

                            // Hitung ulang distribusi setelah restore
                            $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $tanggal);
                        }
                    }
                }
            }
            $menu->delete();

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Hapus Menu Dapur',
                'description' => "Menghapus menu '{$nama}'."
            ]);
        });
        return back()->with('success', 'Menu dapur dihapus.');
    }

    // --- DELETE MENTAH ---
    public function destroyMentah($id)
    {
        $mentah = StokHarianDapurMentah::with('item')->findOrFail($id);
        $nama = $mentah->item->nama;

        $mentah->delete();

        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Hapus Mentah Dapur',
            'description' => "Menghapus stok mentah '{$nama}'."
        ]);

        return back()->with('success', 'Stok bahan mentah dihapus.');
    }
}
