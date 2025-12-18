<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\StokHarianMenu;
use App\Models\StokHarianMentah;
use App\Models\Recipe;
use App\Models\Item;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class StokHarianController extends Controller
{
    // =========================================================
    // METHOD BAR (TAMPILAN & DATA DROPDOWN)
    // =========================================================
    public function bar(Request $request)
    {
        $tab     = $request->tab ?? 'menu';
        $search  = $request->search;
        $tanggal = $request->tanggal ?? Carbon::now()->toDateString();

        // --- 1. LOGIKA TABEL (LIST DATA) ---
        if ($tab === 'menu') {
            $query = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal);
            if ($search) $query->whereHas('item', fn($q) => $q->where('nama', 'like', "%{$search}%"));

            $items = $query->orderByDesc('id')->paginate(10)->through(fn ($s) => [
                'id'         => $s->id,       // ID Record Stok Harian
                'item_id'    => $s->item_id,  // ID Item Master
                'nama'       => $s->item->nama,
                'satuan'     => $s->item->satuan ?? 'porsi',
                'stok_awal'  => $s->stok_awal,
                'stok_masuk' => $s->stok_masuk,
                'stok_total' => ($s->stok_awal + $s->stok_masuk),
                'pemakaian'  => $s->stok_keluar,
                'tersisa'    => $s->stok_akhir,
            ])->withQueryString();
        } else {
            // Logika Tab Mentah
            $query = StokHarianMentah::with('item')->whereDate('tanggal', $tanggal);
            if ($search) $query->whereHas('item', fn($q) => $q->where('nama', 'like', "%{$search}%"));

            $items = $query->orderByDesc('id')->paginate(10)->through(fn ($s) => [
                'id'         => $s->id,
                'item_id'    => $s->item_id,
                'nama'       => $s->item->nama,
                'satuan'     => $s->unit ?? $s->item->satuan,
                'stok_awal'  => $s->stok_awal,
                'stok_masuk' => $s->stok_masuk,
                'stok_total' => ($s->stok_awal + $s->stok_masuk),
                'pemakaian'  => $s->stok_keluar,
                'tersisa'    => $s->stok_akhir,
            ])->withQueryString();
        }

        // --- 2. DATA DROPDOWN ---
        $availableMenus = []; // Item baru (belum ada di tabel)
        $inputableMenus = []; // Item sudah ada (untuk input manual)

        if ($tab === 'menu') {
            $usedItemIds = StokHarianMenu::whereDate('tanggal', $tanggal)->pluck('item_id');
            $recipeNames = Recipe::where('division', 'bar')->pluck('name');

            // A. Available Menus: Punya Resep TAPI Belum ada di Tabel
            $availableMenus = Item::where('division', 'bar')
                ->whereIn('nama', $recipeNames)
                ->whereNotIn('id', $usedItemIds)
                ->orderBy('nama')
                ->get(['id', 'nama', 'satuan']);

            // B. Inputable Menus: SUDAH ada di Tabel (Untuk dropdown Input Data)
            $inputableMenus = StokHarianMenu::with('item')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'satuan'    => $s->item->satuan ?? 'porsi',
                    'stok_awal' => $s->stok_awal
                ]);
        }

        return Inertia::render('StokHarian/Bar', [
            'items'          => $items,
            'tab'            => $tab,
            'division'       => 'bar',
            'tanggal'        => $tanggal,
            'availableMenus' => $availableMenus,
            'inputableMenus' => $inputableMenus,
        ]);
    }

    // =========================================================
    // STORE MENU & AUTO-GENERATE MENTAH
    // =========================================================
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:items,id',
            'tanggal'   => 'required|date',
            'stok_awal' => 'required|numeric|min:0',
        ]);

        // 1. Simpan Stok Menu Jadi
        StokHarianMenu::updateOrCreate(
            ['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
            [
                'stok_awal'   => $data['stok_awal'],
                'stok_masuk'  => DB::raw('stok_masuk'),
                'stok_keluar' => DB::raw('stok_keluar'),
                'stok_akhir'  => $data['stok_awal'],
            ]
        );

        // 2. GENERATE / UPDATE STOK MENTAH BERDASARKAN RESEP
        $menuItem = Item::find($data['item_id']);

        if ($menuItem) {
            $recipe = Recipe::where('name', $menuItem->nama)->first();

            if ($recipe && !empty($recipe->ingredients)) {

                foreach ($recipe->ingredients as $ing) {
                    $rawItemId = $ing['item_id'] ?? null;
                    $amountPerPortion = isset($ing['amount']) ? (float)$ing['amount'] : 0;
                    $totalRawRequired = $data['stok_awal'] * $amountPerPortion;

                    if ($rawItemId) {
                        $existingRaw = StokHarianMentah::where('item_id', $rawItemId)
                            ->where('tanggal', $data['tanggal'])
                            ->first();

                        if ($existingRaw) {
                            $newStokAwal = $existingRaw->stok_awal + $totalRawRequired;

                            $existingRaw->update([
                                'stok_awal'  => $newStokAwal,
                                'stok_akhir' => $newStokAwal + $existingRaw->stok_masuk - $existingRaw->stok_keluar
                            ]);
                        } else {
                            StokHarianMentah::create([
                                'item_id'     => $rawItemId,
                                'tanggal'     => $data['tanggal'],
                                'stok_awal'   => $totalRawRequired,
                                'stok_masuk'  => 0,
                                'stok_keluar' => 0,
                                'stok_akhir'  => $totalRawRequired,
                                'unit'        => $ing['unit'] ?? 'porsi',
                            ]);
                        }
                    }
                }
            }
        }

        return back()->with('success', 'Data menu berhasil disimpan & stok bahan mentah disesuaikan.');
    }

    // =========================================================
    // UPDATE STOK MENU (EDIT)
    // =========================================================
    public function updateMenu(Request $request, $id)
    {
        $data = $request->validate([
            'stok_awal' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($data, $id) {

            $stokMenu = StokHarianMenu::with('item')->findOrFail($id);
            $tanggal  = $stokMenu->tanggal;

            // 1️⃣ HITUNG SELISIH
            $stokAwalLama = $stokMenu->stok_awal;
            $stokAwalBaru = $data['stok_awal'];
            $deltaMenu    = $stokAwalBaru - $stokAwalLama;

            // 2️⃣ UPDATE STOK MENU
            $stokMenu->update([
                'stok_awal'  => $stokAwalBaru,
                'stok_akhir' => ($stokAwalBaru + $stokMenu->stok_masuk) - $stokMenu->stok_keluar,
            ]);

            // 3️⃣ UPDATE STOK MENTAH BERDASARKAN RESEP
            $recipe = Recipe::where('name', $stokMenu->item->nama)->first();

            if (!$recipe || !is_array($recipe->ingredients)) return;

            foreach ($recipe->ingredients as $ing) {

                $qtyDelta = $deltaMenu * ($ing['amount'] ?? 0);

                $stokMentah = StokHarianMentah::where([
                    'item_id' => $ing['item_id'],
                    'tanggal' => $tanggal,
                ])->first();

                if (!$stokMentah) continue;

                $stokMentah->update([
                    'stok_awal'  => max(0, $stokMentah->stok_awal + $qtyDelta),
                    'stok_akhir' => max(
                        0,
                        ($stokMentah->stok_awal + $qtyDelta)
                        + $stokMentah->stok_masuk
                        - $stokMentah->stok_keluar
                    ),
                ]);
            }
        });

        return back()->with('success', 'Stok menu & bahan mentah berhasil diperbarui.');
    }


    // =========================================================
    // HAPUS STOK MENU (AUTO HAPUS MENTAH)
    // =========================================================
    public function destroyMenu($id)
    {
        // 1. Ambil data stok menu yang akan dihapus
        $stokMenu = StokHarianMenu::with('item')->findOrFail($id);

        // 2. Cari Resep berdasarkan nama item menu
        $recipe = Recipe::where('name', $stokMenu->item->nama)->first();

        // 3. Jika resep ditemukan, hapus bahan mentah terkait di tanggal yang sama
        if ($recipe && !empty($recipe->ingredients)) {
            $rawItemIds = collect($recipe->ingredients)->pluck('item_id')->filter();

            if ($rawItemIds->isNotEmpty()) {
                StokHarianMentah::whereIn('item_id', $rawItemIds)
                    ->whereDate('tanggal', $stokMenu->tanggal)
                    ->delete();
            }
        }

        // 4. Hapus Stok Menu
        $stokMenu->delete();

        return back()->with('success', 'Data menu dan bahan mentah terkait berhasil dihapus.');
    }

    // =========================================================
    // STORE MENTAH (MANUAL INPUT)
    // =========================================================
    public function storeMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:items,id',
            'tanggal'   => 'required|date',
            'stok_awal' => 'required|numeric|min:0',
        ]);

        StokHarianMentah::updateOrCreate(
            ['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
            [
                'stok_awal'  => $data['stok_awal'],
                'stok_akhir' => $data['stok_awal'],
            ]
        );

        return back()->with('success', 'Stok bahan mentah berhasil disimpan.');
    }

    // =========================================================
    // UPDATE STOK MENTAH (EDIT)
    // =========================================================
    public function updateMentah(Request $request, $id)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:items,id',
            'stok_awal' => 'required|numeric|min:0',
        ]);

        $stok = StokHarianMentah::findOrFail($id);

        $stok->update([
            'item_id'    => $data['item_id'],
            'stok_awal'  => $data['stok_awal'],
            'stok_total' => $data['stok_awal'] + $stok->stok_masuk,
            'stok_akhir' => ($data['stok_awal'] + $stok->stok_masuk) - $stok->stok_keluar,
        ]);

        return back()->with('success', 'Stok bahan mentah berhasil diperbarui.');
    }

    // =========================================================
    // HAPUS STOK MENTAH
    // =========================================================
    public function destroyMentah($id)
    {
        $stok = StokHarianMentah::findOrFail($id);
        $stok->delete();

        return back()->with('success', 'Stok bahan mentah berhasil dihapus.');
    }
}
