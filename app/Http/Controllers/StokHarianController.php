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

            $items = $query->orderByDesc('id')->paginate(10)->through(fn ($s) => [
                'id'         => $s->id,
                'item_id'    => $s->item_id,
                'nama'       => $s->item->nama,
                'satuan'     => $s->item->satuan ?? 'porsi',
                'stok_awal'  => $s->stok_awal,
                // Stok Total = Stok Awal (Karena Stok Masuk dihapus)
                'stok_total' => $s->stok_awal,
                'pemakaian'  => $s->stok_keluar,
                'tersisa'    => $s->stok_akhir,
            ])->withQueryString();
        } else {
            $query = StokHarianMentah::with('item')->whereDate('tanggal', $tanggal);
            if ($search) $query->whereHas('item', fn($q) => $q->where('nama', 'like', "%{$search}%"));

            $items = $query->orderByDesc('id')->paginate(10)->through(fn ($s) => [
                'id'         => $s->id,
                'item_id'    => $s->item_id,
                'nama'       => $s->item->nama,
                'satuan'     => $s->unit ?? $s->item->satuan,
                'stok_awal'  => $s->stok_awal,
                // Stok Total = Stok Awal
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
            // Untuk tab mentah, ambil data yang sudah ada di tabel
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
                'stok_masuk'  => 0, // Set 0 karena tidak dipakai
                'stok_keluar' => DB::raw('stok_keluar'), // Pertahankan nilai lama pemakaian
                // Rumus Akhir: Stok Awal - Stok Keluar (Pemakaian)
                'stok_akhir'  => DB::raw($data['stok_awal'] . " - stok_keluar"),
            ]
        );

        // Generate Stok Mentah dari Resep
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
                            // Update Stok Awal & Akhir (Awal - Pemakaian)
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
    // UPDATE STOK MENU
    // =========================================================
    public function updateMenu(Request $request, $id)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:items,id',
            'stok_awal' => 'required|numeric|min:0',
        ]);

        $stok = StokHarianMenu::findOrFail($id);

        $stok->update([
            'item_id'    => $data['item_id'],
            'stok_awal'  => $data['stok_awal'],
            'stok_total' => $data['stok_awal'], // Total = Awal
            'stok_akhir' => $data['stok_awal'] - $stok->stok_keluar,
        ]);

        return back()->with('success', 'Data stok menu berhasil diperbarui.');
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
                // Stok Akhir = Stok Awal - Stok Keluar
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
