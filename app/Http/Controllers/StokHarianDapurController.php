<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\StokHarianDapurMenu;
use App\Models\StokHarianDapurMentah;
use App\Models\Recipe;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class StokHarianDapurController extends Controller
{
    /* =========================================================
     * DAPUR - HALAMAN UTAMA
     * ========================================================= */
    public function dapur(Request $request)
    {
        $tab     = $request->get('tab', 'menu');
        $search  = $request->search;
        $tanggal = $request->get('tanggal', Carbon::now()->toDateString());

        if ($tab === 'menu') {

            $query = StokHarianDapurMenu::with('recipe')
                ->whereDate('tanggal', $tanggal);

            if ($search) {
                $query->whereHas('recipe', fn ($q) =>
                    $q->where('name', 'like', "%{$search}%")
                );
            }

            $items = $query->orderBy('id')
                ->paginate(10)
                ->through(fn ($s) => [
                    'id'         => $s->id,
                    'recipe_id'  => $s->recipe_id,
                    'nama'       => $s->recipe->name,
                    'satuan'     => $s->unit,
                    'stok_awal'  => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $s->stok_akhir,
                ]);

        } else {

            $query = StokHarianDapurMentah::with('item')
                ->whereDate('tanggal', $tanggal);

            if ($search) {
                $query->whereHas('item', fn ($q) =>
                    $q->where('nama', 'like', "%{$search}%")
                );
            }

            $items = $query->orderBy('id')
                ->paginate(10)
                ->through(fn ($s) => [
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

        $availableMenus = [];
        $inputableMenus = [];

        if ($tab === 'menu') {
            $usedRecipeIds = StokHarianDapurMenu::whereDate('tanggal', $tanggal)
                ->pluck('recipe_id');

            $availableMenus = Recipe::where('division', 'dapur')
                ->whereNotIn('id', $usedRecipeIds)
                ->orderBy('name')
                ->get()
                ->map(fn ($r) => [
                    'id'   => $r->id,
                    'nama' => $r->name,
                ]);

            $inputableMenus = StokHarianDapurMenu::with('recipe')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn ($s) => [
                    'id'     => $s->recipe_id,
                    'nama'   => $s->recipe->name,
                    'satuan' => $s->unit,
                ]);
        }

        return Inertia::render('StokHarian/Dapur', [
            'items'          => $items,
            'tab'            => $tab,
            'tanggal'        => $tanggal,
            'availableMenus' => $availableMenus,
            'inputableMenus' => $inputableMenus,
        ]);
    }

    /* =========================================================
     * STORE MENU (FINAL)
     * ========================================================= */
    public function storeMenu(Request $request)
{
    $data = $request->validate([
        'recipe_id' => 'required|exists:recipes,id',
        'tanggal'   => 'required|date',
        'stok_awal' => 'required|numeric|min:0',
    ]);

    DB::transaction(function () use ($data) {

        // STOK MENU
        StokHarianDapurMenu::updateOrCreate(
            [
                'recipe_id' => $data['recipe_id'],
                'tanggal'   => $data['tanggal'],
            ],
            [
                'stok_awal'   => $data['stok_awal'],
                'stok_masuk'  => 0,
                'stok_keluar' => 0,
                'stok_akhir'  => $data['stok_awal'],
                'unit'        => 'porsi',
            ]
        );

        // STOK BAHAN MENTAH (IKUT STOK AWAL MENU)
        $recipe = Recipe::findOrFail($data['recipe_id']);

        if (is_array($recipe->ingredients)) {
            foreach ($recipe->ingredients as $ing) {

                $qty = $data['stok_awal'] * ($ing['amount'] ?? 0);

                $stokMentah = StokHarianDapurMentah::where([
                    'item_id' => $ing['item_id'],
                    'tanggal' => $data['tanggal'],
                ])->first();

                if ($stokMentah) {
                    // ❌ JANGAN stok_masuk
                    $stokMentah->update([
                        'stok_awal'  => $stokMentah->stok_awal + $qty,
                        'stok_akhir' => $stokMentah->stok_akhir + $qty,
                    ]);
                } else {
                    StokHarianDapurMentah::create([
                        'item_id'     => $ing['item_id'],
                        'tanggal'     => $data['tanggal'],
                        'stok_awal'   => $qty,
                        'stok_masuk'  => 0,
                        'stok_keluar' => 0,
                        'stok_akhir'  => $qty,
                        'unit'        => $ing['unit'] ?? null,
                    ]);
                }
            }
        }
    });

    return back()->with('success', 'Stok menu berhasil disimpan.');
}


    /* =========================================================
     * UPDATE MENU
     * ========================================================= */
    public function updateMenu(Request $request, $id)
{
    $data = $request->validate([
        'stok_awal' => 'required|numeric|min:0',
    ]);

    DB::transaction(function () use ($data, $id) {

        $stokMenu = StokHarianDapurMenu::with('recipe')->findOrFail($id);
        $tanggal  = $stokMenu->tanggal;

        // 1️⃣ UPDATE STOK MENU
        $stokMenu->update([
            'stok_awal'  => $data['stok_awal'],
            'stok_akhir' => ($data['stok_awal'] + $stokMenu->stok_masuk) - $stokMenu->stok_keluar,
        ]);

        // 2️⃣ UPDATE STOK BAHAN MENTAH BERDASARKAN RESEP
        if (!is_array($stokMenu->recipe->ingredients)) return;

        foreach ($stokMenu->recipe->ingredients as $ing) {

            $qty = $data['stok_awal'] * ($ing['amount'] ?? 0);

            StokHarianDapurMentah::updateOrCreate(
                [
                    'item_id' => $ing['item_id'],
                    'tanggal' => $tanggal,
                ],
                [
                    'stok_awal'   => $qty,
                    'stok_masuk'  => 0,
                    'stok_keluar' => 0,
                    'stok_akhir'  => $qty,
                    'unit'        => $ing['unit'] ?? null,
                ]
            );
        }
    });

    return back()->with('success', 'Stok menu & bahan mentah berhasil diperbarui.');
}


    /* =========================================================
     * DELETE MENU
     * ========================================================= */
   public function destroyMenu($id)
{
    DB::transaction(function () use ($id) {

        $stokMenu = StokHarianDapurMenu::with('recipe')
            ->findOrFail($id);

        if (is_array($stokMenu->recipe->ingredients)) {
            foreach ($stokMenu->recipe->ingredients as $ing) {

                $qty = $stokMenu->stok_awal * ($ing['amount'] ?? 0);

                $stokMentah = StokHarianDapurMentah::where([
                    'item_id' => $ing['item_id'],
                    'tanggal' => $stokMenu->tanggal,
                ])->first();

                if (!$stokMentah) continue;

                $sisaAwal  = $stokMentah->stok_awal - $qty;
                $sisaAkhir = $stokMentah->stok_akhir - $qty;

                // 🔥 JIKA HABIS TOTAL → HAPUS ROW
                if (
                    $sisaAwal <= 0 &&
                    $stokMentah->stok_masuk == 0 &&
                    $stokMentah->stok_keluar == 0
                ) {
                    $stokMentah->delete();
                } else {
                    // 🔁 MASIH ADA → UPDATE ANGKA
                    $stokMentah->update([
                        'stok_awal'  => max(0, $sisaAwal),
                        'stok_akhir' => max(0, $sisaAkhir),
                    ]);
                }
            }
        }

        // 🗑️ HAPUS MENU
        $stokMenu->delete();
    });

    return back()->with('success', 'Menu & stok bahan mentah terkait berhasil dihapus.');
}


    /* =========================================================
     * STORE MENTAH MANUAL
     * ========================================================= */
    public function storeMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:items,id',
            'tanggal'   => 'required|date',
            'stok_awal' => 'required|numeric|min:0',
        ]);

        StokHarianDapurMentah::updateOrCreate(
            [
                'item_id' => $data['item_id'],
                'tanggal' => $data['tanggal'],
            ],
            [
                'stok_awal'   => $data['stok_awal'],
                'stok_masuk'  => 0,
                'stok_keluar' => 0,
                'stok_akhir'  => $data['stok_awal'],
            ]
        );

        return back()->with('success', 'Stok bahan mentah disimpan.');
    }

    public function destroyMentah($id)
    {
        StokHarianDapurMentah::findOrFail($id)->delete();
        return back()->with('success', 'Stok bahan mentah dihapus.');
    }
}
