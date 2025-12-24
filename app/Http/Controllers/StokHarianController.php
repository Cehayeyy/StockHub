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

        if ($tab === 'menu') {
            $query = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal);
            if ($search) {
                $query->whereHas('item', fn ($q) =>
                    $q->where('nama', 'like', "%{$search}%")
                );
            }

            // HITUNG DINAMIS BERDASARKAN BAHAN MENTAH (SHARED RESOURCE)
            $items = $query->orderByDesc('id')->paginate(10)->through(function ($s) use ($tanggal) {
                $recipe = Recipe::where('name', $s->item->nama)->first();
                $realTimeStock = $s->stok_akhir;

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
                            if ($bisaDibuat < $maxPossible) $maxPossible = $bisaDibuat;
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
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $realTimeStock,
                ];
            })->withQueryString();

        } else {
            // TAB MENTAH
            $query = StokHarianMentah::with('item')->whereDate('tanggal', $tanggal);
            if ($search) {
                $query->whereHas('item', fn ($q) =>
                    $q->where('nama', 'like', "%{$search}%")
                );
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

        // DROPDOWN DATA
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
                ->map(fn ($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'satuan'    => $s->item->satuan ?? 'porsi',
                    'stok_awal' => $s->stok_awal,
                    'pemakaian' => $s->stok_keluar,
                    'stok_masuk'=> $s->stok_masuk
                ]);
        } else {
            $inputableMenus = StokHarianMentah::with('item')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn ($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'satuan'    => $s->unit ?? $s->item->satuan,
                    'stok_awal' => $s->stok_awal,
                    'pemakaian' => $s->stok_keluar,
                    'stok_masuk'=> $s->stok_masuk
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
    // STORE MENU
    // =========================================================
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'item_id' => 'required|exists:items,id',
            'tanggal' => 'required|date',
        ]);

        DB::transaction(function () use ($data) {
            if (StokHarianMenu::where($data)->exists()) return;

            $item   = Item::findOrFail($data['item_id']);
            $recipe = Recipe::where('name', $item->nama)->first();

            if (!$recipe || !is_array($recipe->ingredients)) return;

            // Hitung Stok Awal Menu berdasarkan bahan mentah
            $stokMenuAwal = PHP_INT_MAX;

            foreach ($recipe->ingredients as $ing) {
                $ingredientItemId = $ing['item_id'] ?? $ing['id'] ?? ($ing['item']['id'] ?? null);
                if (!$ingredientItemId) { $stokMenuAwal = 0; break; }

                $stokMentah = StokHarianMentah::where(['item_id' => $ingredientItemId, 'tanggal' => $data['tanggal']])->first();
                if (!$stokMentah) { $stokMenuAwal = 0; break; }

                $butuh    = max(1, (int) ($ing['amount'] ?? 1));
                $possible = intdiv($stokMentah->stok_akhir, $butuh);
                $stokMenuAwal = min($stokMenuAwal, $possible);
            }

            $stokMenuAwal = max(0, $stokMenuAwal);

            StokHarianMenu::create([
                'item_id'     => $data['item_id'],
                'tanggal'     => $data['tanggal'],
                'stok_awal'   => $stokMenuAwal,
                'stok_masuk'  => 0,
                'stok_keluar' => 0,
                'stok_akhir'  => $stokMenuAwal,
            ]);
        });

        return back()->with('success', 'Menu berhasil ditambahkan.');
    }

    // =========================================================
    // UPDATE STOK MENU
    // =========================================================
    public function updateMenu(Request $request, $id)
    {
        $data = $request->validate([
            'stok_awal'   => 'nullable|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
            'stok_keluar' => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($data, $id) {
            $menu = StokHarianMenu::with('item')->findOrFail($id);
            $recipe = Recipe::where('name', $menu->item->nama)->first();

            $oldProduction = $menu->stok_awal + $menu->stok_masuk;

            $newAwal   = $data['stok_awal']   ?? $menu->stok_awal;
            $newMasuk  = $data['stok_masuk']  ?? $menu->stok_masuk;
            $newKeluar = $data['stok_keluar'] ?? $menu->stok_keluar;

            // Update Menu
            $menu->update([
                'stok_awal'   => $newAwal,
                'stok_masuk'  => $newMasuk,
                'stok_keluar' => $newKeluar,
                'stok_total'  => $newAwal + $newMasuk,
                'stok_akhir'  => ($newAwal + $newMasuk) - $newKeluar,
            ]);

            // Update Bahan Mentah (Delta Production)
            $newProduction = $newAwal + $newMasuk;
            $delta = $newProduction - $oldProduction;

            if ($delta != 0 && $recipe && !empty($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $rawItemId = $ing['item_id'] ?? null;
                    $amount = $ing['amount'] ?? 0;

                    if ($rawItemId) {
                        $mentah = StokHarianMentah::where(['item_id' => $rawItemId, 'tanggal' => $menu->tanggal])->first();
                        if ($mentah) {
                            $change = $delta * $amount;
                            $newRawKeluar = max(0, $mentah->stok_keluar + $change);
                            $mentah->update([
                                'stok_keluar' => $newRawKeluar,
                                'stok_akhir'  => ($mentah->stok_awal + $mentah->stok_masuk) - $newRawKeluar
                            ]);
                        }
                    }
                }
            }
        });

        return back()->with('success', 'Stok menu diperbarui.');
    }

    // =========================================================
    // DESTROY MENU (UPDATE PENTING DISINI)
    // =========================================================
    public function destroyMenu($id)
    {
        DB::transaction(function () use ($id) {
            $menu = StokHarianMenu::with('item')->findOrFail($id);
            $recipe = Recipe::where('name', $menu->item->nama)->first();

            // 1. KEMBALIKAN STOK MENTAH
            if ($recipe && is_array($recipe->ingredients)) {
                // Hitung total produksi menu ini (yang menyebabkan bahan mentah berkurang)
                $totalProduced = $menu->stok_awal + $menu->stok_masuk;

                foreach ($recipe->ingredients as $ing) {
                    $rawItemId = $ing['item_id'] ?? null;
                    $amountPerPortion = $ing['amount'] ?? 0;

                    if (!$rawItemId) continue;

                    // Hitung total bahan yang harus dikembalikan
                    $qtyToRestore = $totalProduced * $amountPerPortion;

                    $mentah = StokHarianMentah::where([
                        'item_id' => $rawItemId,
                        'tanggal' => $menu->tanggal
                    ])->first();

                    if ($mentah) {
                        // Kurangi 'Pemakaian' di tabel mentah (karena menu dihapus)
                        $newKeluar = max(0, $mentah->stok_keluar - $qtyToRestore);

                        $mentah->update([
                            'stok_keluar' => $newKeluar,
                            'stok_akhir'  => ($mentah->stok_awal + $mentah->stok_masuk) - $newKeluar,
                        ]);

                        // 🔥 HAPUS MENTAH JIKA KOSONG TOTAL (BERSIH-BERSIH)
                        // Jika Stok Awal 0, Masuk 0, dan Pemakaian jadi 0 -> Hapus Baris
                        if ($mentah->stok_awal == 0 && $mentah->stok_masuk == 0 && $newKeluar == 0) {
                            $mentah->delete();
                        }
                    }
                }
            }

            // 2. HAPUS MENU
            $menu->delete();
        });

        return back()->with('success', 'Menu dihapus & pemakaian bahan mentah dikembalikan.');
    }

    // =========================================================
    // STORE MENTAH (MANUAL)
    // =========================================================
    public function storeMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'     => 'required|exists:items,id',
            'tanggal'     => 'required|date',
            'stok_awal'   => 'required|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
            'stok_keluar' => 'nullable|numeric|min:0',
        ]);

        $masuk  = $data['stok_masuk']  ?? 0;
        $keluar = $data['stok_keluar'] ?? 0;

        StokHarianMentah::updateOrCreate(
            ['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
            [
                'stok_awal'   => $data['stok_awal'],
                'stok_masuk'  => $masuk,
                'stok_keluar' => $keluar,
                'stok_akhir'  => $data['stok_awal'] + $masuk - $keluar,
            ]
        );

        return back()->with('success', 'Stok bahan mentah disimpan.');
    }

    // =========================================================
    // UPDATE MENTAH
    // =========================================================
    public function updateMentah(Request $request, $id)
    {
        $data = $request->validate([
            'stok_awal'   => 'required|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
            'stok_keluar' => 'nullable|numeric|min:0',
        ]);

        $stok = StokHarianMentah::findOrFail($id);
        $masuk  = $data['stok_masuk']  ?? $stok->stok_masuk;
        $keluar = $data['stok_keluar'] ?? $stok->stok_keluar;

        $stok->update([
            'stok_awal'   => $data['stok_awal'],
            'stok_masuk'  => $masuk,
            'stok_keluar' => $keluar,
            'stok_akhir'  => $data['stok_awal'] + $masuk - $keluar,
        ]);

        return back()->with('success', 'Stok bahan mentah diperbarui.');
    }

    // =========================================================
    // DESTROY MENTAH
    // =========================================================
    public function destroyMentah($id)
    {
        StokHarianMentah::findOrFail($id)->delete();
        return back()->with('success', 'Stok bahan mentah dihapus.');
    }
}
