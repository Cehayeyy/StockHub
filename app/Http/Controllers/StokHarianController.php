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

        // 1. Generate Data Harian (Pastikan data hari ini ada)
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
                    // Total = Awal + Masuk. Ini akan berubah dinamis jika bahan mentah ditambah/dikurangi.
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

        // 4. Low Stock Logic
        $lowMentah = StokHarianMentah::with('item')
            ->whereDate('tanggal', $tanggal)
            ->where('stok_akhir', '<', 7)
            ->get()->toBase()
            ->map(fn($i) => ['nama' => $i->item->nama, 'tersisa' => $i->stok_akhir, 'kategori' => 'Bahan Bar']);

        $allMenus = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal)->get();

        $lowMenu = $allMenus->map(function($s) {
            return ['nama' => $s->item->nama, 'tersisa' => $s->stok_akhir, 'kategori' => 'Menu Bar'];
        })->filter(fn($item) => $item['tersisa'] < 7)->values();

        $lowStockItems = $lowMentah->concat($lowMenu);
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

    private function ensureStokExists($tanggal)
    {
        $userId = Auth::id();
        $kemarin = Carbon::parse($tanggal)->subDay()->toDateString();

        // A. Generate Mentah & Carry Over (Sisa kemarin jadi Awal hari ini)
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

        // B. Generate Menu (Awalnya 0, nanti dihitung otomatis)
        $existsMenu = StokHarianMenu::whereDate('tanggal', $tanggal)->exists();
        if (!$existsMenu) {
            $barRecipeNames = Recipe::where('division', 'bar')->pluck('name');
            $menuItems = Item::whereIn('nama', $barRecipeNames)->get();

            foreach ($menuItems as $item) {
                StokHarianMenu::firstOrCreate(
                    ['item_id' => $item->id, 'tanggal' => $tanggal],
                    [
                        'stok_awal'    => 0,
                        'stok_masuk'   => 0,
                        'stok_keluar'  => 0,
                        'stok_akhir'   => 0,
                        'unit'         => $item->satuan ?? 'porsi',
                        'is_submitted' => 0,
                        'user_id'      => $userId
                    ]
                );
            }

            // Trigger perhitungan awal agar stok awal menu sinkron dengan kapasitas mentah
            if (!$existsMentah) {
                $sampleMentah = StokHarianMentah::where('tanggal', $tanggal)->first();
                if($sampleMentah) {
                    $this->distributeStockToMenus($sampleMentah->item_id, 0, $tanggal);
                }
            }
        }
    }

    // --- INPUT MENU TERJUAL (PEMAKAIAN) ---
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:items,id',
            'tanggal'   => 'required|date',
            'pemakaian' => 'required|numeric|min:0',
        ]);

        $item = Item::find($data['item_id']);

        DB::transaction(function () use ($data, $item) {
            $menu = StokHarianMenu::firstOrCreate(
                ['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
                ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]
            );

            // Simpan Pemakaian (Penjualan)
            $oldUsage = $menu->stok_keluar;
            $newUsage = $data['pemakaian'];
            $delta    = $newUsage - $oldUsage;

            // Update Data Menu sementara (akan direvisi oleh distribute)
            $menu->stok_keluar  = $newUsage;
            $menu->is_submitted = 1;
            $menu->user_id      = Auth::id();
            $menu->save();

            // Kurangi Stok Mentah
            $recipe = Recipe::where('name', $item->nama)->first();
            if (!$recipe) $recipe = Recipe::where('item_id', $data['item_id'])->first();

            if ($delta != 0 && $recipe && is_array($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $qty = $delta * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    $mentah = StokHarianMentah::where('item_id', $ing['item_id'])
                        ->whereDate('tanggal', $data['tanggal'])
                        ->first();

                    if ($mentah) {
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir  = max(0, $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar);
                        $mentah->save();

                        // 🔥 TRIGGER PENTING: Update Menu berdasarkan sisa bahan yang baru
                        // Ini akan menghitung ulang stok_masuk dan stok_akhir menu agar sinkron
                        $this->distributeStockToMenus($mentah->item_id, 0, $data['tanggal']);
                    }
                }
            }

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Input Pemakaian Bar',
                'description' => "Input pemakaian '{$item->nama}': {$newUsage}."
            ]);

            IzinRevisi::where('user_id', Auth::id())
                ->where('status', 'approved')
                ->where('end_time', '>', Carbon::now())
                ->update(['status' => 'used']);
        });

        return back()->with('success', 'Stok menu tersimpan.');
    }

    // --- INPUT/UPDATE MENTAH (RESTOCK) ---
    public function storeMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'    => 'required|exists:items,id',
            'tanggal'    => 'required|date',
            'stok_awal'  => 'required|numeric|min:0',
            'stok_masuk' => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($data) {
            $mentah = StokHarianMentah::firstOrNew([
                'item_id' => $data['item_id'],
                'tanggal' => $data['tanggal']
            ]);

            $masuk = $data['stok_masuk'] ?? 0;
            $mentah->stok_awal  = $data['stok_awal'];
            $mentah->stok_masuk = $masuk;
            $mentah->stok_akhir = $data['stok_awal'] + $masuk - $mentah->stok_keluar;
            $mentah->save();

            // 🔥 PENTING: Update Menu agar Stok Awal & Stok Masuk Menu ikut berubah
            $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);

            ActivityLog::create([
                'user_id' => Auth::id(),
                'activity' => 'Input Mentah Bar',
                'description' => "Update stok mentah."
            ]);
        });

        return back()->with('success', 'Stok mentah disimpan.');
    }

    // --- UPDATE MENU (EDIT) ---
    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianMenu::with('item')->findOrFail($id);

        $request->validate([
            'stok_keluar' => 'nullable|numeric|min:0',
            'pemakaian'   => 'nullable|numeric|min:0'
        ]);

        $newKeluar = $request->input('stok_keluar') ?? $request->input('pemakaian') ?? $menu->stok_keluar;

        DB::transaction(function () use ($request, $menu, $newKeluar) {
            $deltaUsage = $newKeluar - $menu->stok_keluar;

            // Simpan Data Pemakaian Baru
            $menu->stok_keluar  = $newKeluar;
            $menu->is_submitted = 1;
            $menu->user_id      = Auth::id();
            $menu->save();

            if ($deltaUsage != 0) {
                $recipe = Recipe::where('name', $menu->item->nama)->first();
                if ($recipe && is_array($recipe->ingredients)) {
                    foreach ($recipe->ingredients as $ing) {
                        $qty = $deltaUsage * ($ing['amount'] ?? 0);
                        if ($qty == 0) continue;

                        $mentah = StokHarianMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $menu->tanggal])->first();
                        if ($mentah) {
                            $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                            $mentah->stok_akhir = max(0, $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar);
                            $mentah->save();

                            $this->distributeStockToMenus($mentah->item_id, 0, $menu->tanggal);
                        }
                    }
                }
            }
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Update Menu Bar', 'description' => "Update stok/penjualan '{$menu->item->nama}'."]);
        });

        return back()->with('success', 'Data Menu diperbarui.');
    }

    // --- UPDATE MENTAH (EDIT) ---
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

        $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);

        ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Update Mentah Bar', 'description' => "Update stok '{$mentah->item->nama}'."]);
        return back()->with('success', 'Stok diperbarui.');
    }

    // 🔥🔥 DISTRIBUSI: MENGHITUNG STOK AWAL & TOTAL MENU DARI MENTAH (REVERSE CALCULATION) 🔥🔥
    // Logic:
    // 1. Kapasitas Awal = Kapasitas dari Stok Awal Mentah.
    // 2. Kapasitas Akhir (Real) = Kapasitas dari Sisa Stok Mentah.
    // 3. Stok Masuk = (Akhir + Keluar) - Awal.
    private function distributeStockToMenus($rawItemId, $dummy, $date)
    {
        // Cari menu yang pakai bahan ini
        $recipes = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$rawItemId]])->get();
        if ($recipes->isEmpty()) return;

        $menuItems = Item::whereIn('nama', $recipes->pluck('name'))->get();
        $targetMenus = StokHarianMenu::whereIn('item_id', $menuItems->pluck('id'))
            ->where('tanggal', $date)
            ->get();

        foreach ($targetMenus as $menu) {
            $recipe = Recipe::where('name', $menu->item->nama)->first();
            if (!$recipe) $recipe = Recipe::where('item_id', $menu->item_id)->first();

            if (!$recipe || !is_array($recipe->ingredients)) continue;

            $maxCapAwal  = 999999;
            $maxCapAkhirReal = 999999;

            // Loop untuk mencari bottleneck bahan baku
            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amountNeeded = $ing['amount'] ?? 0;

                if (!$ingId || $amountNeeded == 0) continue;

                $raw = StokHarianMentah::where('item_id', $ingId)
                    ->where('tanggal', $date)
                    ->first();

                if ($raw) {
                    // Hitung jumlah kompetitor (menu lain yg pakai bahan ini) untuk bagi rata
                    $recipesUsing = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$ingId]])->pluck('name');
                    $idsUsing = Item::whereIn('nama', $recipesUsing)->pluck('id');
                    $competitors = StokHarianMenu::whereIn('item_id', $idsUsing)->where('tanggal', $date)->count();
                    $competitors = max(1, $competitors);

                    // 1. Kapasitas Awal (Hanya dari Stok Awal Mentah)
                    $shareAwal = floor($raw->stok_awal / $competitors);
                    $capAwal   = floor($shareAwal / $amountNeeded);

                    // 2. Kapasitas Akhir Real (Berdasarkan Sisa Fisik Bahan di Gudang)
                    // Karena bahan sudah dikurangi (pemakaian), maka kapasitas ini pasti turun.
                    $maxCapAkhirReal = min($maxCapAkhirReal, floor($raw->stok_akhir / $amountNeeded));

                    // Ambil nilai terkecil (Bottleneck)
                    $maxCapAwal  = min($maxCapAwal, $capAwal);
                } else {
                    $maxCapAwal  = 0;
                    $maxCapAkhirReal = 0;
                }
            }

            if ($maxCapAwal === 999999) $maxCapAwal = 0;
            if ($maxCapAkhirReal === 999999) $maxCapAkhirReal = 0;

            // --- EKSEKUSI UPDATE ---
            // 1. Set Stok Awal (Tetap/Dikunci)
            $menu->stok_awal = $maxCapAwal;

            // 2. Set Stok Akhir (Sesuai realita Sisa Mentah)
            $menu->stok_akhir = $maxCapAkhirReal;

            // 3. Hitung Mundur Stok Masuk
            // Rumus Akuntansi: Akhir = (Awal + Masuk) - Keluar
            // Maka: Masuk = (Akhir + Keluar) - Awal
            $calculatedMasuk = ($menu->stok_akhir + $menu->stok_keluar) - $menu->stok_awal;

            // Simpan (Bisa negatif jika kapasitas turun drastis karena bahan hilang/dipakai menu lain)
            // Ini membuat "Stok Total" (Awal + Masuk) terlihat turun di tabel.
            $menu->stok_masuk = $calculatedMasuk;

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

    private function canUserInput()
    {
        $user = Auth::user();
        if (in_array($user->role, ['owner', 'supervisor'])) return true;

        $now = Carbon::now();
        $cutoffTime = Carbon::today()->setTime(21, 0, 0);

        if ($now->lessThan($cutoffTime)) return true;

        $hasActivePermission = IzinRevisi::where('user_id', $user->id)
            ->where('status', 'approved')
            ->where('start_time', '<=', $now)
            ->where('end_time', '>=', $now)
            ->exists();

        return $hasActivePermission;
    }
}
