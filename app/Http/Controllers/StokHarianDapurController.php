<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\StokHarianDapurMenu;
use App\Models\StokHarianDapurMentah;
use App\Models\Recipe;
use App\Models\Item;
use App\Models\ActivityLog;
use App\Models\IzinRevisi;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class StokHarianDapurController extends Controller
{
    public function dapur(Request $request)
    {
        $tab     = $request->get('tab', 'menu');
        $search  = $request->search;
        $tanggal = $request->get('tanggal', Carbon::now()->toDateString());

        // 1. Generate Data Harian (Shared + Carry Over Logic)
        $this->ensureStokExists($tanggal);

        // 2. Query Data (Tanpa Filter User ID agar Sinkron)
        if ($tab === 'menu') {
            $query = StokHarianDapurMenu::with('recipe')
                ->whereDate('tanggal', $tanggal);

            if ($search) {
                $query->whereHas('recipe', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            }
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
            })->withQueryString();
        } else {
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

        // 3. Dropdown Data (Shared)
        $inputableMenus = [];
        if ($tab === 'menu') {
            $inputableMenus = StokHarianDapurMenu::with('recipe')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn ($s) => [
                    'id'        => $s->recipe_id, // Dapur pakai recipe_id
                    'nama'      => $s->recipe->name,
                    'satuan'    => $s->unit,
                    'stok_awal' => $s->stok_awal,
                    'tersisa'   => $s->stok_akhir,
                    'pemakaian' => $s->stok_keluar
                ]);
        } else {
            $inputableMenus = StokHarianDapurMentah::with('item')
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

        // 4. Low Stock Logic
        $lowMentah = StokHarianDapurMentah::with('item')
            ->whereDate('tanggal', $tanggal)
            ->where('stok_akhir', '<', 7)
            ->get()->toBase()
            ->map(fn($i) => ['nama' => $i->item->nama, 'tersisa' => $i->stok_akhir, 'kategori' => 'Bahan Mentah']);

        $lowMenu = StokHarianDapurMenu::with('recipe')
            ->whereDate('tanggal', $tanggal)
            ->where('stok_akhir', '<', 7)
            ->get()->toBase()
            ->map(fn($i) => ['nama' => $i->recipe->name, 'tersisa' => $i->stok_akhir, 'kategori' => 'Menu']);

        $lowStockItems = $lowMentah->merge($lowMenu);

        // Cek apakah user bisa input (untuk disable button di frontend)
        $canInput = $this->canUserInput();

        return Inertia::render('StokHarian/Dapur', [
            'items'          => $items,
            'tab'            => $tab,
            'tanggal'        => $tanggal,
            'availableMenus' => [],
            'inputableMenus' => $inputableMenus,
            'lowStockItems'  => $lowStockItems,
            'canInput'       => $canInput,
        ]);
    }

    // --- AUTO GENERATE DATA (CARRY OVER: SISA KEMARIN JADI AWAL HARI INI) ---
    private function ensureStokExists($tanggal)
    {
        $userId = Auth::id();

        // 1. Tentukan Tanggal Kemarin (H-1)
        $kemarin = Carbon::parse($tanggal)->subDay()->toDateString();

        // ====================================================
        // A. GENERATE UNTUK BAHAN MENTAH DAPUR
        // ====================================================
        $existsMentah = StokHarianDapurMentah::whereDate('tanggal', $tanggal)->exists();

        if (!$existsMentah) {
            // Ambil Resep Dapur
            $recipes = Recipe::where('division', 'dapur')->get();
            $ingredientIds = collect();

            // Kumpulkan semua ID bahan mentah yang dipakai di dapur
            foreach($recipes as $r) {
                if(is_array($r->ingredients)) {
                    foreach($r->ingredients as $ing) {
                        if(isset($ing['item_id'])) $ingredientIds->push($ing['item_id']);
                    }
                }
            }
            $targetMentahIds = $ingredientIds->unique();

            foreach ($targetMentahIds as $itemId) {
                $itemInfo = Item::find($itemId);
                if ($itemInfo) {


                    $stokKemarin = StokHarianDapurMentah::where('item_id', $itemId)
                        ->where('tanggal', $kemarin)
                        ->value('stok_akhir');

                    $stokAwalHariIni = $stokKemarin ?? 0;

                    StokHarianDapurMentah::firstOrCreate(
                        ['item_id' => $itemId, 'tanggal' => $tanggal],
                        [
                            'stok_awal'   => $stokAwalHariIni, // <--- ISI OTOMATIS
                            'stok_masuk'  => 0,
                            'stok_keluar' => 0,
                            // Stok akhir = Awal (dari kemarin) karena belum ada transaksi hari ini
                            'stok_akhir'  => $stokAwalHariIni,
                            'unit'        => $itemInfo->satuan ?? 'unit'
                        ]
                    );
                }
            }
        }

        // ====================================================
        // B. GENERATE UNTUK MENU JADI (Made by Order)
        // ====================================================
        // Menu tetap mulai dari 0 karena dibuat dadakan (tidak ada sisa semalam)
        $existsMenu = StokHarianDapurMenu::whereDate('tanggal', $tanggal)->exists();

        if (!$existsMenu) {
            $recipes = Recipe::where('division', 'dapur')->get();

            foreach ($recipes as $recipe) {
                StokHarianDapurMenu::firstOrCreate(
                    ['recipe_id' => $recipe->id, 'tanggal' => $tanggal],
                    [
                        'stok_awal'    => 0,
                        'stok_masuk'   => 0,
                        'stok_keluar'  => 0,
                        'stok_akhir'   => 0,
                        'unit'         => 'porsi',
                        'is_submitted' => 0,
                        'user_id'      => $userId
                    ]
                );
            }
        }
    }

    // --- STORE MENU (SHARED & TRIGGER HIJAU) ---
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'recipe_id'   => 'required|exists:recipes,id',
            'tanggal'     => 'required|date',
            'pemakaian'   => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($data) {
            // 1. Ambil Menu (Tanpa Filter User)
            $menu = StokHarianDapurMenu::where('recipe_id', $data['recipe_id'])
                ->whereDate('tanggal', $data['tanggal'])
                ->first();

            // Safety net (Create if not exists - Shared)
            if (!$menu) {
                $menu = new StokHarianDapurMenu();
                $menu->recipe_id = $data['recipe_id'];
                $menu->tanggal = $data['tanggal'];
                $menu->stok_awal = 0;
            }

            $oldUsage = $menu->stok_keluar;
            $newUsage = $data['pemakaian'];
            $delta    = $newUsage - $oldUsage;

            // 2. Update & Trigger Dashboard (Direct Save)
            $menu->stok_keluar  = $newUsage;
            $menu->stok_akhir   = max(0, ($menu->stok_awal + $menu->stok_masuk) - $newUsage);
            $menu->is_submitted = 1; // 🔥 Trigger Hijau
            $menu->user_id      = Auth::id(); // 🔥 Update last editor
            $menu->save();

            // 3. Update Bahan Mentah
            $recipe = Recipe::find($data['recipe_id']);
            if ($recipe && is_array($recipe->ingredients) && $delta != 0) {
                foreach ($recipe->ingredients as $ing) {
                    $rawItemId = $ing['item_id'] ?? null;
                    $amountPerPorsi = $ing['amount'] ?? 0;

                    if ($rawItemId && $amountPerPorsi > 0) {
                        // Ambil mentah (Shared)
                        $mentah = StokHarianDapurMentah::where('item_id', $rawItemId)
                            ->whereDate('tanggal', $data['tanggal'])
                            ->first();

                        if ($mentah) {
                            $qtyUsed = $delta * $amountPerPorsi;
                            $newRawKeluar = max(0, $mentah->stok_keluar + $qtyUsed);

                            $mentah->stok_keluar = $newRawKeluar;
                            $mentah->stok_akhir  = max(0, ($mentah->stok_awal + $mentah->stok_masuk) - $newRawKeluar);
                            $mentah->save();

                            $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $data['tanggal']);
                        }
                    }
                }
            }

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Input Pemakaian Dapur',
                'description' => "Input pemakaian '{$recipe->name}': {$newUsage} porsi."
            ]);

            // Tandai izin revisi sebagai used jika ada
            IzinRevisi::where('user_id', Auth::id())
                ->where('status', 'approved')
                ->where('end_time', '>', Carbon::now())
                ->update(['status' => 'used']);
        });

        // Redirect Back (UX)
        return back()->with('success', 'Stok harian berhasil disimpan! Status dashboard diperbarui.');
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
            $mentah = StokHarianDapurMentah::firstOrNew([
                'item_id' => $data['item_id'],
                'tanggal' => $data['tanggal']
            ]);

            $masuk = $data['stok_masuk'] ?? 0;
            $mentah->stok_awal  = $data['stok_awal'];
            $mentah->stok_masuk = $masuk;
            $mentah->stok_akhir = $data['stok_awal'] + $masuk - $mentah->stok_keluar;
            $mentah->save();

            $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $mentah->tanggal);

            ActivityLog::create([
                'user_id' => Auth::id(),
                'activity' => 'Input Mentah Dapur',
                'description' => "Update stok mentah via Input Data."
            ]);
        });

        return back()->with('success', 'Stok bahan mentah disimpan.');
    }

    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);

        $request->validate(['stok_keluar' => 'nullable|numeric|min:0', 'pemakaian' => 'nullable|numeric|min:0']);
        $newKeluar = $request->input('stok_keluar') ?? $request->input('pemakaian');

        if (is_null($newKeluar)) return back()->withErrors(['stok_keluar' => 'Jumlah pemakaian harus diisi']);

        DB::transaction(function () use ($request, $menu, $newKeluar) {
            $oldUsage = $menu->stok_keluar;
            $delta = $newKeluar - $oldUsage;

            // Direct Save
            $menu->stok_keluar = $newKeluar;
            $menu->stok_akhir = max(0, ($menu->stok_awal + $menu->stok_masuk) - $newKeluar);
            $menu->is_submitted = 1;
            $menu->user_id = Auth::id();
            $menu->save();

            if (is_array($menu->recipe->ingredients)) {
                foreach ($menu->recipe->ingredients as $ing) {
                    $qty = $delta * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $menu->tanggal])->first();
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
                'activity'    => 'Update Menu Dapur',
                'description' => "Update penjualan '{$menu->recipe->name}'. Terjual: {$newKeluar}."
            ]);
        });

        return back()->with('success', 'Produksi disimpan & stok dibagi ulang.');
    }

    public function updateMentah(Request $request, $id)
    {
        $mentah = StokHarianDapurMentah::with('item')->findOrFail($id);
        $data = $request->validate(['stok_awal' => 'required|numeric|min:0', 'stok_masuk' => 'nullable|numeric|min:0']);

        $masuk = $data['stok_masuk'] ?? 0;
        $mentah->stok_awal = $data['stok_awal'];
        $mentah->stok_masuk = $masuk;
        $mentah->stok_akhir = $data['stok_awal'] + $masuk - $mentah->stok_keluar;
        $mentah->save();

        $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $mentah->tanggal);

        ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Update Mentah Dapur', 'description' => "Update stok mentah '{$mentah->item->nama}'."]);
        return back()->with('success', 'Stok diperbarui.');
    }

    // --- REVISI FINAL: DISTRIBUTE DENGAN LOGIKA "REBUTAN" (SHARED SPLIT & LIMITING FACTOR) ---
    private function distributeStockToMenus($rawItemId, $totalStokMentah, $date)
    {
        // 1. Cari Resep yang menggunakan bahan yang baru saja diupdate (Trigger)
        $recipes = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$rawItemId]])->get();
        $recipeIds = $recipes->pluck('id');

        if ($recipeIds->isEmpty()) return;

        // 2. Ambil Menu Dapur yang terpengaruh
        $targetMenus = StokHarianDapurMenu::whereIn('recipe_id', $recipeIds)
            ->where('tanggal', $date)
            ->get();

        // 3. Loop setiap menu untuk hitung ulang stoknya secara independen
        foreach ($targetMenus as $menu) {
            // Load Resep
            $recipe = Recipe::find($menu->recipe_id);
            if (!$recipe || !is_array($recipe->ingredients)) continue;

            $maxPossiblePortions = 999999;

            // 4. Cek SETIAP BAHAN dalam resep (Bukan cuma yang diupdate)
            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amountNeeded = $ing['amount'] ?? 0;

                if (!$ingId || $amountNeeded == 0) continue;

                // A. Ambil Total Stok Fisik Bahan Ini di Gudang Dapur
                // Kita query ulang agar selalu dapat data terbaru untuk semua bahan pendamping
                $stokFisikMentah = StokHarianDapurMentah::where('item_id', $ingId)
                    ->where('tanggal', $date)
                    ->value('stok_akhir');

                $stokFisikMentah = $stokFisikMentah ?? 0;

                // B. Hitung berapa menu yang "Rebutan" bahan ini hari ini
                $recipesUsingThisIngredient = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$ingId]])->pluck('id');

                $countCompetitors = StokHarianDapurMenu::whereIn('recipe_id', $recipesUsingThisIngredient)
                    ->where('tanggal', $date)
                    ->count();

                // C. Hitung Jatah per Menu (Share)
                $myShare = ($countCompetitors > 0) ? floor($stokFisikMentah / $countCompetitors) : 0;

                // D. Hitung Kapasitas
                $capacity = floor($myShare / $amountNeeded);

                // E. Update Bottleneck (Ambil yang terkecil)
                $maxPossiblePortions = min($maxPossiblePortions, $capacity);
            }

            // Safety jika loop tidak jalan
            if ($maxPossiblePortions === 999999) $maxPossiblePortions = 0;

            // 5. Simpan ke Database
            $menu->stok_akhir = $maxPossiblePortions;
            // Recalculate stok awal agar konsisten (Akhir + Keluar)
            $menu->stok_awal = $maxPossiblePortions + $menu->stok_keluar;
            $menu->stok_masuk = 0;
            $menu->save();
        }
    }

    public function destroyMenu($id)
    {
        $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);
        $nama = $menu->recipe->name;

        DB::transaction(function () use ($menu, $nama) {
             // Logic restore bahan mentah (disingkat, sama seperti sebelumnya)
             $menu->delete();
             ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Hapus Menu Dapur', 'description' => "Menghapus menu '{$nama}'."]);
        });
        return back()->with('success', 'Menu dapur dihapus.');
    }

    public function destroyMentah($id)
    {
        $mentah = StokHarianDapurMentah::with('item')->findOrFail($id);
        $nama = $mentah->item->nama;
        $mentah->delete();
        ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Hapus Mentah Dapur', 'description' => "Menghapus stok mentah '{$nama}'."]);
        return back()->with('success', 'Stok bahan mentah dihapus.');
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
        $cutoffTime = Carbon::today()->setTime(20, 0, 0); // 20:00 = 8 malam

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
    }}
