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

        // 1. LOGIKA TABEL
        if ($tab === 'menu') {
            $query = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal);
            if ($search) $query->whereHas('item', fn($q) => $q->where('nama', 'like', "%{$search}%"));

            // --- HITUNG DINAMIS BERDASARKAN BAHAN MENTAH ---
            $items = $query->orderByDesc('id')->paginate(10)->through(function ($s) use ($tanggal) {

                // 1. Ambil Resep
                $recipe = Recipe::where('name', $s->item->nama)->first();

                // 2. Default: Ambil stok akhir tabel menu
                $realTimeStock = $s->stok_akhir;

                // 3. Hitung Batasan Bahan Mentah (Limiting Factor)
                if ($recipe && !empty($recipe->ingredients)) {
                    $maxPossible = 99999;

                    foreach ($recipe->ingredients as $ing) {
                        $rawItemId = $ing['item_id'] ?? null;
                        $amountNeeded = $ing['amount'] ?? 0;

                        if ($rawItemId && $amountNeeded > 0) {
                            $stokMentah = StokHarianMentah::where('item_id', $rawItemId)
                                ->where('tanggal', $tanggal)
                                ->first();

                            $tersedia = $stokMentah ? $stokMentah->stok_akhir : 0;
                            $bisaDibuat = floor($tersedia / $amountNeeded);

                            if ($bisaDibuat < $maxPossible) {
                                $maxPossible = $bisaDibuat;
                            }
                        }
                    }
                    $realTimeStock = ($maxPossible === 99999) ? 0 : $maxPossible;
                }

                return [
                    'id'         => $s->id,
                    'item_id'    => $s->item_id,
                    'nama'       => $s->item->nama,
                    'satuan'     => $s->item->satuan ?? 'porsi',
                    'stok_awal'  => $s->stok_awal,
                    'stok_total' => $s->stok_awal,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $realTimeStock, // Dinamis
                ];
            })->withQueryString();

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
                'stok_total' => $s->stok_awal,
                'pemakaian'  => $s->stok_keluar,
                'tersisa'    => $s->stok_akhir,
            ])->withQueryString();
        }

        // 2. DATA DROPDOWN
        $availableMenus = [];
        $inputableMenus = [];

        if ($tab === 'menu') {
            $usedItemIds = StokHarianMenu::whereDate('tanggal', $tanggal)->pluck('item_id');
            $recipeNames = Recipe::where('division', 'bar')->pluck('name');

            $availableMenus = Item::where('division', 'bar')
                ->whereIn('nama', $recipeNames)
                ->whereNotIn('id', $usedItemIds)
                ->orderBy('nama')
                ->get(['id', 'nama', 'satuan']);

            $inputableMenus = StokHarianMenu::with('item')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'satuan'    => $s->item->satuan ?? 'porsi',
                    'stok_awal' => $s->stok_awal
                ]);
        } else {
            $inputableMenus = StokHarianMentah::with('item')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'satuan'    => $s->unit ?? $s->item->satuan,
                    'stok_awal' => $s->stok_awal,
                    'pemakaian' => $s->stok_keluar
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
    // STORE MENU (OTOMATIS GENERATE MENTAH)
    // =========================================================
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:items,id',
            'tanggal'   => 'required|date',
            'stok_awal' => 'required|numeric|min:0',
        ]);

        StokHarianMenu::updateOrCreate(
            ['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
            [
                'stok_awal'   => $data['stok_awal'],
                'stok_masuk'  => 0,
                'stok_keluar' => DB::raw('stok_keluar'),
                'stok_akhir'  => DB::raw($data['stok_awal'] . " - stok_keluar"),
            ]
        );

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
                                'stok_akhir' => $newStokAwal - $existingRaw->stok_keluar
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

        return back()->with('success', 'Data menu disimpan & stok mentah disesuaikan.');
    }

    // =========================================================
    // UPDATE STOK MENU (AUTO KURANGI MENTAH)
    // =========================================================
    public function updateMenu(Request $request, $id)
    {
        $data = $request->validate([
            'stok_awal' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($data, $id) {

            // 1. Ambil Data Menu Lama
            $stokMenu = StokHarianMenu::with('item')->findOrFail($id);
            $tanggal = $stokMenu->tanggal;

            // 2. Hitung Selisih (Delta)
            $stokAwalLama = $stokMenu->stok_awal;
            $stokAwalBaru = $data['stok_awal'];
            $deltaMenu = $stokAwalBaru - $stokAwalLama;

            // 3. Update Stok Menu
            $stokMenu->update([
                'stok_awal'  => $stokAwalBaru,
                'stok_total' => $stokAwalBaru,
                'stok_akhir' => $stokAwalBaru - $stokMenu->stok_keluar,
            ]);

            // 4. Update Stok Mentah Berdasarkan Resep
            $recipe = Recipe::where('name', $stokMenu->item->nama)->first();

            if ($recipe && !empty($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $rawItemId = $ing['item_id'] ?? null;
                    $amountNeededPerPortion = $ing['amount'] ?? 0;

                    if ($rawItemId) {
                        $stokMentah = StokHarianMentah::where('item_id', $rawItemId)
                            ->where('tanggal', $tanggal)
                            ->first();

                        if ($stokMentah) {
                            // Hitung total bahan yang dipakai untuk selisih menu
                            $totalBahanDipakai = $deltaMenu * $amountNeededPerPortion;

                            // Kurangi Stok Awal Mentah
                            $stokMentahBaru = $stokMentah->stok_awal - $totalBahanDipakai;

                            // Opsional: Cegah minus
                            if ($stokMentahBaru < 0) $stokMentahBaru = 0;

                            $stokMentah->update([
                                'stok_awal'  => $stokMentahBaru,
                                'stok_total' => $stokMentahBaru,
                                'stok_akhir' => $stokMentahBaru - $stokMentah->stok_keluar
                            ]);
                        }
                    }
                }
            }
        });

        return back()->with('success', 'Stok menu diperbarui & bahan mentah otomatis disesuaikan.');
    }

    // =========================================================
    // HAPUS STOK MENU (AUTO HAPUS MENTAH)
    // =========================================================
    public function destroyMenu($id)
    {
        $stokMenu = StokHarianMenu::with('item')->findOrFail($id);
        $recipe = Recipe::where('name', $stokMenu->item->nama)->first();

        if ($recipe && !empty($recipe->ingredients)) {
            $rawItemIds = collect($recipe->ingredients)->pluck('item_id')->filter();
            if ($rawItemIds->isNotEmpty()) {
                StokHarianMentah::whereIn('item_id', $rawItemIds)
                    ->whereDate('tanggal', $stokMenu->tanggal)
                    ->delete();
            }
        }
        $stokMenu->delete();
        return back()->with('success', 'Data menu dan bahan mentah terkait berhasil dihapus.');
    }

    // =========================================================
    // STORE MENTAH (MANUAL INPUT: STOK AWAL & PEMAKAIAN)
    // =========================================================
    public function storeMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'     => 'required|exists:items,id',
            'tanggal'     => 'required|date',
            'stok_awal'   => 'required|numeric|min:0',
            'stok_keluar' => 'nullable|numeric|min:0',
        ]);

        $stokKeluar = $data['stok_keluar'] ?? 0;

        StokHarianMentah::updateOrCreate(
            ['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
            [
                'stok_awal'   => $data['stok_awal'],
                'stok_masuk'  => 0,
                'stok_keluar' => $stokKeluar,
                'stok_akhir'  => $data['stok_awal'] - $stokKeluar,
            ]
        );

        return back()->with('success', 'Stok bahan mentah berhasil disimpan.');
    }

    // =========================================================
    // UPDATE STOK MENTAH (EDIT: STOK AWAL & PEMAKAIAN)
    // =========================================================
    public function updateMentah(Request $request, $id)
    {
        $data = $request->validate([
            'item_id'     => 'required|exists:items,id',
            'stok_awal'   => 'required|numeric|min:0',
            'stok_keluar' => 'nullable|numeric|min:0',
        ]);

        $stok = StokHarianMentah::findOrFail($id);
        $stokKeluar = $data['stok_keluar'] ?? 0;

        $stok->update([
            'item_id'     => $data['item_id'],
            'stok_awal'   => $data['stok_awal'],
            'stok_keluar' => $stokKeluar,
            'stok_total'  => $data['stok_awal'],
            'stok_akhir'  => $data['stok_awal'] - $stokKeluar,
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
