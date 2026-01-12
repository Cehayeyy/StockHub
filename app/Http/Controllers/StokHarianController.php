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

        $this->ensureStokExists($tanggal);

        // --- 1. DATA TABEL (PAGINATION) ---
        if ($tab === 'menu') {
           $query = StokHarianMenu::with('item')
    ->whereDate('tanggal', $tanggal)
    ->where('user_id', Auth::id());

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
                ->map(fn($i) => [
                    'nama'     => $i->item->nama,
                    'tersisa'  => $i->stok_akhir,
                    'kategori' => 'Menu'
                ]);

            $lowStockItems = $lowMentah->concat($lowMenu)->values();
        } catch (\Throwable $e) {
            Log::error('Low-stock calculation failed in StokHarianController::bar', ['error' => $e]);
            $lowStockItems = collect();
        }


        // --- 3. DATA DROPDOWN (UDPATE: Kirim Stok Awal & Tersisa) ---
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

            // ✅ Fix: Kirim stok_awal DAN tersisa
            $inputableMenus = StokHarianMenu::with('item')
                ->whereDate('tanggal', $tanggal)->get()
                ->map(fn ($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'stok_awal' => $s->stok_awal,
                    'tersisa'   => $s->stok_akhir // <--- DATA TERSISA UTK FRONTEND
                ]);
        } else {
            // ✅ Fix: Kirim stok_awal DAN tersisa untuk mentah
            $inputableMenus = StokHarianMentah::with('item')
                ->whereDate('tanggal', $tanggal)->get()
                ->map(fn ($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'satuan'    => $s->unit,
                    'stok_awal' => $s->stok_awal,
                    'tersisa'   => $s->stok_akhir // <--- DATA TERSISA UTK FRONTEND
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

    private function ensureStokExists($tanggal)
    {
        // 1. Cek Mentah
        $existsMentah = StokHarianMentah::whereDate('tanggal', $tanggal)->exists();
        if (!$existsMentah) {
            $lastDateData = StokHarianMentah::whereDate('tanggal', '<', $tanggal)
                ->orderBy('tanggal', 'desc')
                ->get()
                ->groupBy('item_id');

            foreach ($lastDateData as $itemId => $records) {
                $lastRecord = $records->first();
                StokHarianMentah::create([
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

        // 2. Cek Menu
        $existsMenu = StokHarianMenu::whereDate('tanggal', $tanggal)->exists();
        if (!$existsMenu) {
            $lastDateData = StokHarianMenu::whereDate('tanggal', '<', $tanggal)
                ->orderBy('tanggal', 'desc')
                ->get()
                ->groupBy('item_id');

            foreach ($lastDateData as $itemId => $records) {
                $lastRecord = $records->first();
                StokHarianMenu::create([
                    'item_id'     => $lastRecord->item_id,
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

            // Trigger bagi rata stok ke menu
            $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $mentah->tanggal);

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Input Stok Mentah',
                'description' => "Menginput stok mentah '{$item->nama}'."
            ]);
        });

        return back()->with('success', 'Stok mentah disimpan dan menu otomatis terupdate!');
    }

    // --- UPDATE MENU (DYNAMIC RE-BALANCING) ---
    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianMenu::with('item')->findOrFail($id);

        $request->validate([
            'stok_awal'   => 'nullable|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
            'stok_keluar' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($request, $menu) {
            $newKeluar = $request->input('stok_keluar');
            $oldUsage = $menu->stok_keluar;
            $deltaPemakaian = $newKeluar - $oldUsage;

            // Update data menu
            $menu->update([
                'stok_keluar' => $newKeluar,
            ]);

            // Logic tarik stok tetangga (re-balancing)
            $recipe = Recipe::where('name', $menu->item->nama)->first();

            if ($recipe && is_array($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $qty = $deltaPemakaian * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    $mentah = StokHarianMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $menu->tanggal])->first();
                    if ($mentah) {
                        // Update pemakaian mentah
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir  = max(0, ($mentah->stok_awal + $mentah->stok_masuk) - $mentah->stok_keluar);
                        $mentah->save();

                        // Distribusi ulang sisa stok mentah ke semua menu
                        $this->distributeStockToMenus($mentah->item_id, $mentah->stok_akhir, $menu->tanggal);
                    }
                }
            }

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Update Stok Menu',
                'description' => "Update penjualan '{$menu->item->nama}'. Terjual: {$newKeluar}."
            ]);
        });

        return back()->with('success', 'Penjualan dicatat & Stok menu lain disesuaikan!');
    }

    // --- UPDATE MENTAH ---
    public function updateMentah(Request $request, $id)
    {
        $stok = StokHarianMentah::findOrFail($id);
        $data = $request->validate([
            'stok_awal'   => 'required|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
        ]);

        $masuk = $data['stok_masuk'] ?? $stok->stok_masuk;
        $keluar = $stok->stok_keluar;
        $akhir = $data['stok_awal'] + $masuk - $keluar;

        $stok->update([
            'stok_awal'   => $data['stok_awal'],
            'stok_masuk'  => $masuk,
            'stok_akhir'  => $akhir,
        ]);

        // Trigger bagi rata
        $this->distributeStockToMenus($stok->item_id, $stok->stok_akhir, $stok->tanggal);

        ActivityLog::create([
            'user_id' => Auth::id(), 'activity' => 'Update Stok Mentah', 'description' => "Update mentah '{$stok->item->nama}'."
        ]);

        return back()->with('success', 'Stok mentah diperbarui dan dibagi ke menu.');
    }

    // --- HELPER: BAGI RATA STOK KE MENU ---
    private function distributeStockToMenus($rawItemId, $totalStokMentah, $date)
    {
        // 1. Cari Resep yang pakai bahan mentah ini
        $recipes = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$rawItemId]])->get();
        $recipeNames = $recipes->pluck('name');

        if ($recipeNames->isEmpty()) return;

        // 2. Cari Item Menu yang namanya ada di resep tersebut
        $menuItems = Item::whereIn('nama', $recipeNames)->get();
        $menuItemIds = $menuItems->pluck('id');

        // 3. Cari StokHarianMenu yang aktif di tanggal tersebut
        $targetMenus = StokHarianMenu::whereIn('item_id', $menuItemIds)
            ->where('tanggal', $date)
            ->get();

        $menuCount = $targetMenus->count();

        if ($menuCount > 0) {
            // 4. Hitung Jatah Per Menu (Floor biar bulat)
            $allocatedStock = floor($totalStokMentah / $menuCount);

            // 5. Update Semua Menu
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

        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Hapus Stok Mentah',
            'description' => "Menghapus data stok mentah '{$nama}'."
        ]);

        return back()->with('success', 'Data stok mentah dihapus.');
    }
}
