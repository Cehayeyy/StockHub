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
        $tab     = $request->get('tab', 'menu');
        $search  = $request->search;
        $tanggal = $request->get('tanggal', Carbon::now()->toDateString());

        // 1. Generate/Pastikan Data Harian Ada (Shared Data)
        $this->ensureStokExists($tanggal);

        // 2. Query Data Tabel (TANPA Filter User ID agar Sinkron)
        if ($tab === 'menu') {
            $query = StokHarianMenu::with('item')
                ->whereDate('tanggal', $tanggal);
                // 🔥 HAPUS: where('user_id', Auth::id()) agar semua melihat data yang sama

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

        // 3. Dropdown Data (Shared)
        $inputableMenus = [];
        if ($tab === 'menu') {
            $inputableMenus = StokHarianMenu::with('item')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn ($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'satuan'    => $s->unit,
                    'stok_awal' => $s->stok_awal,
                    'tersisa'   => $s->stok_akhir,
                    'pemakaian' => $s->stok_keluar
                ]);
        } else {
            $inputableMenus = StokHarianMentah::with('item')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn ($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'satuan'    => $s->unit,
                    'stok_awal' => $s->stok_awal,
                    'tersisa'   => $s->stok_akhir
                ]);
        }

        // 4. Low Stock Logic (Shared)
        $lowMentah = StokHarianMentah::with('item')
            ->whereDate('tanggal', $tanggal)
            ->where('stok_akhir', '<', 7)
            ->get()->toBase()
            ->map(fn($i) => ['nama' => $i->item->nama, 'tersisa' => $i->stok_akhir, 'kategori' => 'Bahan Bar']);

        // Logic Hitung Sisa Menu berdasarkan Bahan
        $allMenus = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal)->get();

        $lowMenu = $allMenus->map(function($s) use ($tanggal) {
            $tersisa = $s->stok_akhir;
            $recipe = Recipe::where('name', $s->item->nama)->first();

            if ($recipe && !empty($recipe->ingredients)) {
                $maxBisaDibuat = 999999;
                foreach ($recipe->ingredients as $ing) {
                    $rawItemId = $ing['item_id'] ?? null;
                    $butuh = $ing['amount'] ?? 0;
                    if ($rawItemId && $butuh > 0) {
                        // Cari stok mentah di tanggal yg sama (tanpa peduli user)
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
            return ['nama' => $s->item->nama, 'tersisa' => $tersisa, 'kategori' => 'Menu Bar'];
        })->filter(fn($item) => $item['tersisa'] < 7)->values();

        $lowStockItems = $lowMentah->concat($lowMenu);

        return Inertia::render('StokHarian/Bar', [
            'items'          => $items,
            'tab'            => $tab,
            'division'       => 'bar',
            'tanggal'        => $tanggal,
            'availableMenus' => [],
            'inputableMenus' => $inputableMenus,
            'lowStockItems'  => $lowStockItems,
        ]);
    }

    // --- AUTO GENERATE DATA (SHARED / GLOBAL) ---
    private function ensureStokExists($tanggal)
    {
        $userId = Auth::id(); // User ID hanya untuk 'creator', bukan pembeda data

        // 1. Generate Mentah (Shared)
        $existsMentah = StokHarianMentah::whereDate('tanggal', $tanggal)->exists();
        if (!$existsMentah) {
            $recipes = Recipe::where('division', 'bar')->get();
            $ingredientIds = collect();
            foreach($recipes as $r) {
                if(is_array($r->ingredients)) {
                    foreach($r->ingredients as $ing) $ingredientIds->push($ing['item_id']);
                }
            }
            $targetMentahIds = $ingredientIds->unique();

            foreach ($targetMentahIds as $itemId) {
                $itemInfo = Item::find($itemId);
                if($itemInfo) {
                    StokHarianMentah::firstOrCreate(
                        ['item_id' => $itemId, 'tanggal' => $tanggal], // 🔥 Cek unik berdasarkan Item + Tanggal saja
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => $itemInfo->satuan ?? 'unit']
                    );
                }
            }
        }

        // 2. Generate Menu (Shared)
        // 🔥 HAPUS pengecekan user_id disini
        $existsMenu = StokHarianMenu::whereDate('tanggal', $tanggal)->exists();

        if (!$existsMenu) {
            $barRecipeNames = Recipe::where('division', 'bar')->pluck('name');
            $menuItems = Item::whereIn('nama', $barRecipeNames)->get();

            foreach ($menuItems as $item) {
                StokHarianMenu::firstOrCreate(
                    ['item_id' => $item->id, 'tanggal' => $tanggal], // 🔥 Cek unik berdasarkan Item + Tanggal saja
                    [
                        'stok_awal'    => 0,
                        'stok_masuk'   => 0,
                        'stok_keluar'  => 0,
                        'stok_akhir'   => 0,
                        'unit'         => $item->satuan ?? 'porsi',
                        'is_submitted' => 0,
                        'user_id'      => $userId // Simpan user pembuat, tapi jangan jadikan kunci pencarian
                    ]
                );
            }
        }
    }

    // --- STORE MENU (SHARED LOGIC) ---
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:items,id',
            'tanggal'   => 'required|date',
            'pemakaian' => 'required|numeric|min:0',
        ]);

        $item = Item::find($data['item_id']);

        DB::transaction(function () use ($data, $item) {
            // 1. Ambil Menu (Tanpa Filter User)
            $menu = StokHarianMenu::where('item_id', $data['item_id'])
                ->whereDate('tanggal', $data['tanggal'])
                ->first();

            // Jika belum ada (sangat jarang terjadi karena ensureStokExists), buat baru
            if (!$menu) {
                $menu = new StokHarianMenu();
                $menu->item_id = $data['item_id'];
                $menu->tanggal = $data['tanggal'];
                $menu->stok_awal = 0;
            }

            $oldUsage = $menu->stok_keluar;
            $newUsage = $data['pemakaian'];
            $delta    = $newUsage - $oldUsage;

            // 2. Update Menu
            $menu->stok_keluar  = $newUsage;
            $menu->stok_akhir   = max(0, ($menu->stok_awal + $menu->stok_masuk) - $newUsage);
            $menu->is_submitted = 1;
            $menu->user_id      = Auth::id(); // 🔥 Update user terakhir yg edit
            $menu->save();

            // 3. Update Bahan Mentah
            $recipe = Recipe::where('name', $item->nama)->first();
            if (!$recipe) $recipe = Recipe::where('item_id', $data['item_id'])->first();

            if ($delta != 0 && $recipe && is_array($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $qty = $delta * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    // Ambil Mentah (Tanpa Filter User)
                    $mentah = StokHarianMentah::where('item_id', $ing['item_id'])
                        ->whereDate('tanggal', $data['tanggal'])
                        ->first();

                    if ($mentah) {
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir  = max(0, $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar);
                        $mentah->save();

                        // Distribusi ke SEMUA menu yang pakai bahan ini
                        $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $data['tanggal']);
                    }
                }
            }

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Input Pemakaian Bar',
                'description' => "Input pemakaian '{$item->nama}': {$newUsage}."
            ]);
        });

        return back()->with('success', 'Stok menu tersimpan.');
    }

    public function storeMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'    => 'required|exists:items,id',
            'tanggal'    => 'required|date',
            'stok_awal'  => 'required|numeric|min:0',
            'stok_masuk' => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($data) {
            // Ambil/Buat Mentah (Shared)
            $mentah = StokHarianMentah::firstOrNew([
                'item_id' => $data['item_id'],
                'tanggal' => $data['tanggal']
            ]);

            $masuk = $data['stok_masuk'] ?? 0;
            $mentah->stok_awal  = $data['stok_awal'];
            $mentah->stok_masuk = $masuk;
            $mentah->stok_akhir = $data['stok_awal'] + $masuk - $mentah->stok_keluar;
            $mentah->save();

            // Distribusi
            $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $mentah->tanggal);

            ActivityLog::create([
                'user_id' => Auth::id(),
                'activity' => 'Input Mentah Bar',
                'description' => "Update stok mentah."
            ]);
        });

        return back()->with('success', 'Stok mentah disimpan.');
    }

    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianMenu::with('item')->findOrFail($id);

        $request->validate(['stok_keluar' => 'nullable|numeric|min:0', 'pemakaian' => 'nullable|numeric|min:0']);
        $newKeluar = $request->input('stok_keluar') ?? $request->input('pemakaian');

        if(is_null($newKeluar)) return back()->withErrors(['stok_keluar' => 'Wajib diisi']);

        DB::transaction(function () use ($request, $menu, $newKeluar) {
            $delta = $newKeluar - $menu->stok_keluar;

            $menu->stok_keluar = $newKeluar;
            $menu->stok_akhir = max(0, ($menu->stok_awal + $menu->stok_masuk) - $newKeluar);
            $menu->is_submitted = 1;
            $menu->user_id = Auth::id(); // Update kepemilikan terakhir
            $menu->save();

            $recipe = Recipe::where('name', $menu->item->nama)->first();
            if ($recipe && is_array($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $qty = $delta * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    $mentah = StokHarianMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $menu->tanggal])->first();
                    if ($mentah) {
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir = max(0, $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar);
                        $mentah->save();
                        $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $menu->tanggal);
                    }
                }
            }
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Update Menu Bar', 'description' => "Update penjualan '{$menu->item->nama}'."]);
        });

        return back()->with('success', 'Data Bar diperbarui.');
    }

    public function updateMentah(Request $request, $id)
    {
        $mentah = StokHarianMentah::with('item')->findOrFail($id);
        $data = $request->validate([
            'stok_awal'  => 'required|numeric|min:0',
            'stok_masuk' => 'nullable|numeric|min:0'
        ]);

        $masuk = $data['stok_masuk'] ?? 0;
        $mentah->stok_awal = $data['stok_awal'];
        $mentah->stok_masuk = $masuk;
        $mentah->stok_akhir = $data['stok_awal'] + $masuk - $mentah->stok_keluar;
        $mentah->save();

        $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $mentah->tanggal);

        ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Update Mentah Bar', 'description' => "Update stok '{$mentah->item->nama}'."]);
        return back()->with('success', 'Stok diperbarui.');
    }

    // --- HELPER: DISTRIBUTE KEPADA SEMUA MENU (SHARED) ---
    private function distributeStockToMenus($rawItemId, $totalStokMentah, $date)
    {
        $recipes = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$rawItemId]])->get();
        $recipeNames = $recipes->pluck('name');
        if ($recipeNames->isEmpty()) return;

        $menuItems = Item::whereIn('nama', $recipeNames)->get();

        // Cari semua menu terkait di tanggal tersebut (Tanpa filter user_id)
        $targetMenus = StokHarianMenu::whereIn('item_id', $menuItems->pluck('id'))
            ->where('tanggal', $date)
            ->get();

        if ($targetMenus->count() > 0) {
            $allocatedStock = floor($totalStokMentah / $targetMenus->count());
            foreach ($targetMenus as $menu) {
                $menu->stok_awal = $allocatedStock + $menu->stok_keluar;
                $menu->stok_masuk = 0;
                $menu->stok_akhir = $allocatedStock;
                $menu->save();
            }
        }
    }

    public function destroyMenu($id)
    {
        $menu = StokHarianMenu::with('item')->findOrFail($id);
        $nama = $menu->item->nama;

        DB::transaction(function () use ($menu, $nama) {
             $menu->delete();
             ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Hapus Menu Bar', 'description' => "Menghapus menu '{$nama}'."]);
        });
        return back()->with('success', 'Menu dihapus.');
    }

    public function destroyMentah($id)
    {
        $mentah = StokHarianMentah::with('item')->findOrFail($id);
        $nama = $mentah->item->nama;
        $mentah->delete();
        ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Hapus Mentah Bar', 'description' => "Menghapus mentah '{$nama}'."]);
        return back()->with('success', 'Mentah dihapus.');
    }
}
