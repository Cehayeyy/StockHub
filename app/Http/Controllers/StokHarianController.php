<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\StokHarianMenu;
use App\Models\StokHarianMentah;
use App\Models\Recipe;
use App\Models\Item;
use App\Models\ActivityLog;
use App\Models\IzinRevisi;
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

        // 1. Generate Data Harian (dengan Logika Carry Over Menu & Mentah)
        $this->ensureStokExists($tanggal);

        if ($tab === 'menu') {
            $query = StokHarianMenu::with('item')
                ->whereDate('tanggal', $tanggal);

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

        // Cek apakah user bisa input (untuk disable button di frontend)
        $canInput = $this->canUserInput();

        return Inertia::render('StokHarian/Bar', [
            'items'          => $items,
            'tab'            => $tab,
            'division'       => 'bar',
            'tanggal'        => $tanggal,
            'availableMenus' => [],
            'inputableMenus' => $inputableMenus,
            'lowStockItems'  => $lowStockItems,
            'canInput'       => $canInput,
        ]);
    }

    // --- AUTO GENERATE DATA (SHARED LOGIC + CARRY OVER MENU & MENTAH) ---
    private function ensureStokExists($tanggal)
    {
        $userId = Auth::id();

        $kemarin = Carbon::parse($tanggal)->subDay()->toDateString();

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
                    // Carry Over Mentah
                    $stokKemarin = StokHarianMentah::where('item_id', $itemId)
                        ->where('tanggal', $kemarin)->value('stok_akhir');
                    $stokAwalHariIni = $stokKemarin ?? 0;

                    StokHarianMentah::firstOrCreate(
                        ['item_id' => $itemId, 'tanggal' => $tanggal],
                        [
                            'stok_awal'   => $stokAwalHariIni,
                            'stok_masuk'  => 0,
                            'stok_keluar' => 0,
                            'stok_akhir'  => $stokAwalHariIni,
                            'unit'        => $itemInfo->satuan ?? 'unit'
                        ]
                    );
                }
            }
        }

        // ====================================================
        // B. GENERATE UNTUK MENU (BARANG JADI) - CARRY OVER
        // ====================================================
        $existsMenu = StokHarianMenu::whereDate('tanggal', $tanggal)->exists();

        if (!$existsMenu) {
            $barRecipeNames = Recipe::where('division', 'bar')->pluck('name');
            $menuItems = Item::whereIn('nama', $barRecipeNames)->get();

            foreach ($menuItems as $item) {

                // 🔥 LOGIKA CARRY OVER MENU BAR 🔥
                $stokKemarinMenu = StokHarianMenu::where('item_id', $item->id)
                    ->where('tanggal', $kemarin)
                    ->value('stok_akhir'); // Ambil sisa kemarin

                // Jika ada sisa, jadikan stok awal. Jika tidak, 0.
                $stokAwalMenu = $stokKemarinMenu ?? 0;

                StokHarianMenu::firstOrCreate(
                    ['item_id' => $item->id, 'tanggal' => $tanggal],
                    [
                        'stok_awal'    => $stokAwalMenu, // <-- Carry Over
                        'stok_masuk'   => 0,
                        'stok_keluar'  => 0,
                        'stok_akhir'   => $stokAwalMenu, // Awal + 0 - 0
                        'unit'         => $item->satuan ?? 'porsi',
                        'is_submitted' => 0,
                        'user_id'      => $userId
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
            $menu = StokHarianMenu::where('item_id', $data['item_id'])
                ->whereDate('tanggal', $data['tanggal'])
                ->first();

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
            $menu->user_id      = Auth::id();
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

            // Tandai izin revisi sebagai used jika ada
            IzinRevisi::where('user_id', Auth::id())
                ->where('status', 'approved')
                ->where('end_time', '>', Carbon::now())
                ->update(['status' => 'used']);
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
            $menu->user_id = Auth::id();
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

    // --- REVISI FINAL: DISTRIBUTE DENGAN STOK AWAL DIKUNCI (FIXED) ---
    // Logika: Perubahan kapasitas (karena stok mentah tambah/kurang)
    // akan mengubah Stok Masuk Menu, bukan Stok Awal Menu.
    private function distributeStockToMenus($rawItemId, $totalStokMentah, $date)
    {
        $recipes = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$rawItemId]])->get();
        $recipeNames = $recipes->pluck('name');
        if ($recipeNames->isEmpty()) return;

        $menuItems = Item::whereIn('nama', $recipeNames)->get();

        $targetMenus = StokHarianMenu::whereIn('item_id', $menuItems->pluck('id'))
            ->where('tanggal', $date)
            ->get();

        // 3. Loop setiap menu untuk hitung ulang stoknya secara independen
        foreach ($targetMenus as $menu) {
            // Load Resep untuk menu ini
            $recipe = Recipe::where('name', $menu->item->nama)->first();
            // Fallback: jika tidak ketemu by name, coba by item_id
            if (!$recipe) $recipe = Recipe::where('item_id', $menu->item_id)->first();

            if (!$recipe || !is_array($recipe->ingredients)) continue;

            $maxPossiblePortions = 999999; // Angka awal sangat besar

            // 4. Hitung Kapasitas Real Saat Ini (Tersisa Fisik)
            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amountNeeded = $ing['amount'] ?? 0;

                if (!$ingId || $amountNeeded == 0) continue;

                // A. Ambil Total Stok Fisik Bahan Ini di Gudang
                $stokFisikMentah = StokHarianMentah::where('item_id', $ingId)
                    ->where('tanggal', $date)
                    ->value('stok_akhir');

                $stokFisikMentah = $stokFisikMentah ?? 0;

                // B. Hitung berapa menu yang "Rebutan" bahan ini hari ini
                $recipesUsingThisIngredient = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$ingId]])->pluck('name');
                $itemIdsUsingThis = Item::whereIn('nama', $recipesUsingThisIngredient)->pluck('id');

                $countCompetitors = StokHarianMenu::whereIn('item_id', $itemIdsUsingThis)
                    ->where('tanggal', $date)
                    ->count();

                // C. Hitung Jatah per Menu (Share)
                $myShare = ($countCompetitors > 0) ? floor($stokFisikMentah / $countCompetitors) : 0;

                // D. Hitung Kapasitas
                $capacity = floor($myShare / $amountNeeded);

                // E. Update Bottleneck
                $maxPossiblePortions = min($maxPossiblePortions, $capacity);
            }

            if ($maxPossiblePortions === 999999) $maxPossiblePortions = 0;

            // 5. UPDATE DATA (RUMUS BARU: STOK AWAL DIKUNCI)
            // Rumus Dasar: Akhir = (Awal + Masuk) - Keluar
            // Kita tahu Akhir (Kapasitas saat ini) dan Awal (Fixed).
            // Maka: Masuk = Akhir + Keluar - Awal

            $calculatedMasuk = $maxPossiblePortions + $menu->stok_keluar - $menu->stok_awal;

            $menu->stok_akhir = $maxPossiblePortions; // Sesuai realita fisik
            $menu->stok_masuk = $calculatedMasuk;     // Penyesuaian masuk sini
            // $menu->stok_awal  = ...; // JANGAN DIUBAH!

            $menu->save();
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

    // Helper: cek apakah user bisa input berdasarkan waktu dan izin revisi
    private function canUserInput()
    {
        $user = Auth::user();

        // Owner dan Supervisor selalu bisa input
        if (in_array($user->role, ['owner', 'supervisor'])) {
            return true;
        }

        // Cek waktu sekarang
        $now = Carbon::now();
        $cutoffTime = Carbon::today()->setTime(21, 0, 0); // 21:00 = 9 malam

        // Jika belum jam 8 malam, bisa input
        if ($now->lessThan($cutoffTime)) {
            return true;
        }

        // Jika sudah lewat jam 8 malam, cek izin revisi
        $hasActivePermission = IzinRevisi::where('user_id', $user->id)
            ->where('status', 'approved')
            ->where('start_time', '<=', $now)
            ->where('end_time', '>=', $now)
            ->exists();

        return $hasActivePermission;
    }
}
