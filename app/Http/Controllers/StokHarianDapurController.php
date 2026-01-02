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
    /* =========================================================
     * DAPUR - HALAMAN UTAMA (DENGAN LOGIKA POOLING & LOW STOCK)
     * ========================================================= */
    public function dapur(Request $request)
    {
        $tab     = $request->get('tab', 'menu');
        $search  = $request->search;
        $tanggal = $request->get('tanggal', Carbon::now()->toDateString());

        // 🔥 LOGIKA CARRY OVER: Jalankan hanya jika data hari ini BELUM ADA SAMA SEKALI
        $this->ensureStokExists($tanggal);

        /* =========================================================
         * 1. LIST DATA (TABLE PAGINATION)
         * ========================================================= */
        if ($tab === 'menu') {

            $query = StokHarianDapurMenu::with('recipe')->whereDate('tanggal', $tanggal);

            if ($search) {
                $query->whereHas('recipe', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            }

            // LOGIKA POOLING (HITUNG ULANG TERSISA BERDASARKAN BAHAN MENTAH)
            $items = $query->orderBy('id')->paginate(10)->through(function ($s) use ($tanggal) {
                $tersisaDisplay = $s->stok_akhir; // Default
                $recipe = $s->recipe;

                if ($recipe && is_array($recipe->ingredients)) {
                    $maxBisaDibuat = 999999;
                    foreach ($recipe->ingredients as $ing) {
                        $itemId = $ing['item_id'] ?? null;
                        $butuh = $ing['amount'] ?? 0;
                        if ($itemId && $butuh > 0) {
                            $stokMentah = StokHarianDapurMentah::where('item_id', $itemId)
                                ->where('tanggal', $tanggal)
                                ->first();
                            $sisaFisik = $stokMentah ? $stokMentah->stok_akhir : 0;
                            $kapasitas = floor($sisaFisik / $butuh);
                            if ($kapasitas < $maxBisaDibuat) $maxBisaDibuat = $kapasitas;
                        }
                    }
                    $tersisaDisplay = ($maxBisaDibuat === 999999) ? 0 : $maxBisaDibuat;
                }

                return [
                    'id'         => $s->id,
                    'recipe_id'  => $s->recipe_id,
                    'nama'       => $s->recipe->name,
                    'satuan'     => $s->unit,
                    'stok_awal'  => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $tersisaDisplay,
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

        /* =========================================================
         * 2. HITUNG LOW STOCK ITEMS (SEMUA DATA, TANPA PAGINATION)
         * ========================================================= */

        // A. Mentah Dapur (< 7) -> Array
        $lowMentah = StokHarianDapurMentah::with('item')
            ->whereDate('tanggal', $tanggal)
            ->where('stok_akhir', '<', 7)
            ->get()
            ->map(fn($i) => [
                'nama' => $i->item->nama,
                'tersisa' => $i->stok_akhir,
                'kategori' => 'Bahan Mentah'
            ])->toArray();

        // B. Menu Dapur (< 7) - Hitung ulang pooling -> Array
        $allMenus = StokHarianDapurMenu::with('recipe')->whereDate('tanggal', $tanggal)->get();
        $lowMenu = $allMenus->map(function($s) use ($tanggal) {
            $recipe = $s->recipe;
            $tersisa = $s->stok_akhir;

            if ($recipe && is_array($recipe->ingredients)) {
                $maxBisaDibuat = 999999;
                foreach ($recipe->ingredients as $ing) {
                    $itemId = $ing['item_id'] ?? null;
                    $butuh = $ing['amount'] ?? 0;
                    if ($itemId && $butuh > 0) {
                        $stokMentah = StokHarianDapurMentah::where('item_id', $itemId)
                            ->where('tanggal', $tanggal)
                            ->first();
                        $sisaFisik = $stokMentah ? $stokMentah->stok_akhir : 0;
                        $kapasitas = floor($sisaFisik / $butuh);
                        if ($kapasitas < $maxBisaDibuat) $maxBisaDibuat = $kapasitas;
                    }
                }
                $tersisa = ($maxBisaDibuat === 999999) ? 0 : $maxBisaDibuat;
            }
            return ['nama' => $s->recipe->name, 'tersisa' => $tersisa, 'kategori' => 'Menu'];
        })->filter(fn($item) => $item['tersisa'] < 7)->values()->toArray();

        // Gabung Array
        $lowStockItems = array_merge($lowMentah, $lowMenu);


        /* =========================================================
         * 3. DROPDOWN DATA
         * ========================================================= */
        $availableMenus = [];
        $inputableMenus = [];

        if ($tab === 'menu') {
            $usedRecipeIds = StokHarianDapurMenu::whereDate('tanggal', $tanggal)->pluck('recipe_id');
            $availableMenus = Recipe::where('division', 'dapur')->whereNotIn('id', $usedRecipeIds)->orderBy('name')->get()->map(fn ($r) => ['id' => $r->id, 'nama' => $r->name]);
            $inputableMenus = StokHarianDapurMenu::with('recipe')->whereDate('tanggal', $tanggal)->get()->map(fn ($s) => ['id' => $s->recipe_id, 'nama' => $s->recipe->name, 'satuan' => $s->unit]);
        } else {
            $usedRecipeIds = StokHarianDapurMenu::whereDate('tanggal', $tanggal)->pluck('recipe_id');
            $ingredientItemIds = Recipe::whereIn('id', $usedRecipeIds)->pluck('ingredients')->flatMap(fn ($ings) => is_array($ings) ? collect($ings)->pluck('item_id') : [])->unique()->values();
            $inputableMenus = Item::whereIn('id', $ingredientItemIds)->orderBy('nama')->get()->map(fn ($i) => ['id' => $i->id, 'nama' => $i->nama, 'satuan' => $i->satuan]);
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

    /**
     * 🔥 FUNGSI UTAMA: PASTIKAN STOK ADA (CARRY OVER)
     * Logika Baru: Hanya menyalin jika HARI INI BELUM ADA DATA SAMA SEKALI (kosong total).
     */
    private function ensureStokExists($tanggal)
    {
        // Cek apakah SUDAH ADA data mentah/menu APAPUN di tanggal ini
        $existsAnyMentah = StokHarianDapurMentah::whereDate('tanggal', $tanggal)->exists();
        $existsAnyMenu   = StokHarianDapurMenu::whereDate('tanggal', $tanggal)->exists();

        // 1. Cek Mentah Dapur
        if (!$existsAnyMentah) {
            $lastDateData = StokHarianDapurMentah::whereDate('tanggal', '<', $tanggal)
                ->orderBy('tanggal', 'desc')
                ->get()
                ->groupBy('item_id');

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

        // 2. Cek Menu Dapur
        if (!$existsAnyMenu) {
            $lastDateData = StokHarianDapurMenu::whereDate('tanggal', '<', $tanggal)
                ->orderBy('tanggal', 'desc')
                ->get()
                ->groupBy('recipe_id');

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

    /* =========================================================
     * STORE MENU
     * ========================================================= */
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'recipe_id' => 'required|exists:recipes,id',
            'tanggal'   => 'required|date',
        ]);

        DB::transaction(function () use ($data) {
            if (StokHarianDapurMenu::where($data)->exists()) return;

            $recipe = Recipe::findOrFail($data['recipe_id']);
            if (!is_array($recipe->ingredients)) return;

            $stokMenuAwal = PHP_INT_MAX;
            foreach ($recipe->ingredients as $ing) {
                $itemId = $ing['item_id'] ?? null;
                if (!$itemId) { $stokMenuAwal = 0; break; }
                $mentah = StokHarianDapurMentah::where(['item_id' => $itemId, 'tanggal' => $data['tanggal']])->first();
                if (!$mentah) { $stokMenuAwal = 0; break; }
                $butuh = max(1, (int) ($ing['amount'] ?? 1));
                $stokMenuAwal = min($stokMenuAwal, intdiv($mentah->stok_akhir, $butuh));
            }
            $stokMenuAwal = max(0, $stokMenuAwal);

            StokHarianDapurMenu::create([
                'recipe_id'   => $data['recipe_id'], 'tanggal' => $data['tanggal'],
                'stok_awal'   => $stokMenuAwal, 'stok_masuk'  => 0, 'stok_keluar' => 0,
                'stok_akhir'  => $stokMenuAwal, 'unit' => 'porsi',
            ]);

            ActivityLog::create([
                'user_id' => Auth::id(), 'activity' => 'Tambah Menu Dapur', 'description' => "Menambahkan menu '{$recipe->name}'."
            ]);
        });

        return back()->with('success', 'Menu dapur berhasil ditambahkan.');
    }

    /* =========================================================
     * UPDATE MENU (Dengan Trigger Recalculate)
     * ========================================================= */
    public function updateMenu(Request $request, $id)
    {
        $data = $request->validate([
            'stok_awal'  => 'required|numeric|min:0',
            'stok_masuk' => 'nullable|numeric|min:0',
            'pemakaian'  => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($data, $id) {
            $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);
            $oldUsage = $menu->stok_keluar;

            $stokMasuk = $data['stok_masuk'] ?? 0;
            $stokTotal = $data['stok_awal'] + $stokMasuk;

            if ($data['pemakaian'] > $stokTotal) {
                 $data['pemakaian'] = $stokTotal;
            }

            $stokAkhir = max(0, $stokTotal - $data['pemakaian']);

            $menu->update([
                'stok_awal'   => $data['stok_awal'],
                'stok_masuk'  => $stokMasuk,
                'stok_keluar' => $data['pemakaian'],
                'stok_akhir'  => $stokAkhir,
            ]);

            // UPDATE STOK MENTAH (DELTA)
            $deltaPemakaian = $data['pemakaian'] - $oldUsage;

            if ($deltaPemakaian != 0 && is_array($menu->recipe->ingredients)) {
                foreach ($menu->recipe->ingredients as $ing) {
                    $qty = $deltaPemakaian * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    $mentah = StokHarianDapurMentah::where([
                        'item_id' => $ing['item_id'], 'tanggal' => $menu->tanggal,
                    ])->first();

                    if (!$mentah) continue;

                    $newKeluar = max(0, $mentah->stok_keluar + $qty);
                    $mentah->update([
                        'stok_keluar' => $newKeluar,
                        'stok_akhir'  => max(0, $mentah->stok_awal + $mentah->stok_masuk - $newKeluar),
                    ]);
                }
            }

            // 🔥 RECALCULATE AGAR MENU LAIN IKUT UPDATE
            $this->recalculateMenuByDate($menu->tanggal);

            ActivityLog::create([
                'user_id' => Auth::id(), 'activity' => 'Update Menu Dapur', 'description' => "Update produksi '{$menu->recipe->name}'. Terjual: {$data['pemakaian']}."
            ]);
        });

        return back()->with('success', 'Produksi menu dapur berhasil disimpan.');
    }

    /* =========================================================
     * DELETE MENU (FIXED: BAHAN MENTAH TIDAK IKUT TERHAPUS)
     * ========================================================= */
    public function destroyMenu($id)
    {
        DB::transaction(function () use ($id) {
            $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);
            $nama = $menu->recipe->name;
            $tanggal = $menu->tanggal;

            // Jika menu sudah terjual, kembalikan stok mentah
            if ($menu->stok_keluar > 0 && is_array($menu->recipe->ingredients)) {
                foreach ($menu->recipe->ingredients as $ing) {
                    $qtyToRestore = $menu->stok_keluar * ($ing['amount'] ?? 0);

                    if ($qtyToRestore > 0) {
                        $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $tanggal])->first();
                        if ($mentah) {
                            $newKeluar = max(0, $mentah->stok_keluar - $qtyToRestore);
                            $mentah->update([
                                'stok_keluar' => $newKeluar,
                                'stok_akhir'  => $mentah->stok_awal + $mentah->stok_masuk - $newKeluar,
                            ]);
                            // ❌ JANGAN HAPUS MENTAH MESKIPUN KOSONG
                        }
                    }
                }
            }

            $menu->delete();
            $this->recalculateMenuByDate($tanggal);

            ActivityLog::create([
                'user_id' => Auth::id(), 'activity' => 'Hapus Menu Dapur', 'description' => "Menghapus menu '{$nama}' dari stok harian."
            ]);
        });

        return back()->with('success', 'Menu dapur dihapus.');
    }

    /* =========================================================
     * STORE MENTAH
     * ========================================================= */
    public function storeMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'     => 'required|exists:items,id',
            'tanggal'     => 'required|date',
            'stok_awal'   => 'required|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
        ]);

        $item = Item::find($data['item_id']);
        $masuk = $data['stok_masuk'] ?? 0;
        $keluar = 0;
        $akhir = max(0, $data['stok_awal'] + $masuk - $keluar);

        StokHarianDapurMentah::updateOrCreate(
            ['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
            [
                'stok_awal'   => $data['stok_awal'],
                'stok_masuk'  => $masuk,
                'stok_keluar' => $keluar,
                'stok_akhir'  => $akhir,
                'unit'        => $item->satuan ?? 'porsi'
            ]
        );

        $this->recalculateMenuByDate($data['tanggal']);

        ActivityLog::create([
            'user_id' => Auth::id(), 'activity' => 'Input Mentah Dapur', 'description' => "Input stok mentah '{$item->nama}'. Awal: {$data['stok_awal']}, Masuk: {$masuk}."
        ]);

        return back()->with('success', 'Stok bahan mentah disimpan.');
    }

    /* =========================================================
     * UPDATE MENTAH
     * ========================================================= */
    public function updateMentah(Request $request, $id)
    {
        $mentah = StokHarianDapurMentah::with('item')->findOrFail($id);

        $data = $request->validate([
            'stok_awal'   => 'required|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
        ]);

        $masuk = $data['stok_masuk'] ?? 0;
        $keluar = $mentah->stok_keluar;
        $akhir = max(0, $data['stok_awal'] + $masuk - $keluar);

        $mentah->update([
            'stok_awal'   => $data['stok_awal'],
            'stok_masuk'  => $masuk,
            'stok_akhir'  => $akhir,
        ]);

        $this->recalculateMenuByDate($mentah->tanggal);

        ActivityLog::create([
            'user_id' => Auth::id(), 'activity' => 'Update Mentah Dapur', 'description' => "Update stok mentah '{$mentah->item->nama}'. Awal: {$data['stok_awal']}, Masuk: {$masuk}."
        ]);

        return back()->with('success', 'Stok bahan mentah diperbarui.');
    }

    /* =========================================================
     * DELETE MENTAH (Manual)
     * ========================================================= */
    public function destroyMentah($id)
    {
        $mentah = StokHarianDapurMentah::with('item')->findOrFail($id);
        $nama = $mentah->item->nama;

        $mentah->delete();

        ActivityLog::create([
            'user_id' => Auth::id(), 'activity' => 'Hapus Mentah Dapur', 'description' => "Menghapus stok mentah '{$nama}'."
        ]);

        return back()->with('success', 'Stok bahan mentah dihapus.');
    }

    /* =========================================================
     * RECALCULATE (Pooling Stok)
     * ========================================================= */
    private function recalculateMenuByDate(string $tanggal)
    {
        $menus = StokHarianDapurMenu::with('recipe')->whereDate('tanggal', $tanggal)->get();

        foreach ($menus as $menu) {
            if (!is_array($menu->recipe->ingredients)) continue;

            $stokMenuAwal = PHP_INT_MAX;

            foreach ($menu->recipe->ingredients as $ing) {
                $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $tanggal])->first();
                if (!$mentah) { $stokMenuAwal = 0; break; }

                $butuh = max(1, (int) ($ing['amount'] ?? 1));
                $stokMenuAwal = min($stokMenuAwal, intdiv($mentah->stok_akhir, $butuh));
            }

            // Update stok awal menu agar merefleksikan sisa bahan mentah terbaru
            $menu->update([
                'stok_awal'  => max(0, $stokMenuAwal),
                // Stok akhir adalah (Kapasitas saat ini + masuk - keluar)
                // Note: Jika stok_awal berubah (turun karena bahan dipakai menu lain), maka stok_akhir otomatis turun.
                'stok_akhir' => max(0, max(0, $stokMenuAwal) + $menu->stok_masuk - $menu->stok_keluar),
            ]);
        }
    }
}
