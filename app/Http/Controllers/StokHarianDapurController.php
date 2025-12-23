<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\StokHarianDapurMenu;
use App\Models\StokHarianDapurMentah;
use App\Models\Recipe;
use App\Models\Item;
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

    /* =========================================================
     * LIST DATA (TABLE)
     * ========================================================= */
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

    /* =========================================================
     * DROPDOWN
     * ========================================================= */
    $availableMenus = [];
    $inputableMenus = [];

    if ($tab === 'menu') {

        // MENU YANG BELUM MASUK STOK HARIAN
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

        // MENU YANG SUDAH ADA (UNTUK EDIT)
        $inputableMenus = StokHarianDapurMenu::with('recipe')
            ->whereDate('tanggal', $tanggal)
            ->get()
            ->map(fn ($s) => [
                'id'     => $s->recipe_id,
                'nama'   => $s->recipe->name,
                'satuan' => $s->unit,
            ]);

    } else {

        /* =====================================================
         * ✅ FINAL FIX — DROPDOWN MENTAH
         * HANYA DARI MENU DAPUR HARI INI
         * ===================================================== */

        // 1. menu dapur hari ini
        $usedRecipeIds = StokHarianDapurMenu::whereDate('tanggal', $tanggal)
            ->pluck('recipe_id');

        // 2. ingredient dari menu tersebut
        $ingredientItemIds = Recipe::whereIn('id', $usedRecipeIds)
            ->pluck('ingredients')
            ->flatMap(fn ($ings) =>
                is_array($ings)
                    ? collect($ings)->pluck('item_id')
                    : []
            )
            ->unique()
            ->values();

        // 3. dropdown mentah
        $inputableMenus = Item::whereIn('id', $ingredientItemIds)
            ->orderBy('nama')
            ->get()
            ->map(fn ($i) => [
                'id'     => $i->id,
                'nama'   => $i->nama,
                'satuan' => $i->satuan,
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
    ]);

    DB::transaction(function () use ($data) {

        // ❌ cegah duplikat menu
        if (StokHarianDapurMenu::where($data)->exists()) {
            return;
        }

        $recipe = Recipe::findOrFail($data['recipe_id']);
        if (!is_array($recipe->ingredients)) return;

        // ===============================
        // HITUNG STOK AWAL (BOTTLENECK)
        // ===============================
        $stokMenuAwal = PHP_INT_MAX;

        foreach ($recipe->ingredients as $ing) {

            $itemId = $ing['item_id'] ?? null;
            if (!$itemId) {
                $stokMenuAwal = 0;
                break;
            }

            $mentah = StokHarianDapurMentah::where([
                'item_id' => $itemId,
                'tanggal' => $data['tanggal'],
            ])->first();

            if (!$mentah) {
                $stokMenuAwal = 0;
                break;
            }

            $butuh = max(1, (int) ($ing['amount'] ?? 1));
            $stokMenuAwal = min(
                $stokMenuAwal,
                intdiv($mentah->stok_akhir, $butuh)
            );
        }

        $stokMenuAwal = max(0, $stokMenuAwal);

        // ===============================
        // SIMPAN MENU (TANPA SENTUH MENTAH)
        // ===============================
        StokHarianDapurMenu::create([
        'recipe_id'   => $data['recipe_id'],
        'tanggal'     => $data['tanggal'],
        'stok_awal'   => $stokMenuAwal,
        'stok_masuk'  => 0,
        'stok_keluar' => 0,
        'stok_akhir'  => $stokMenuAwal,
        'unit'        => 'porsi',
    ]);

    });

    return back()->with('success', 'Menu dapur berhasil ditambahkan.');
}



    /* =========================================================
     * UPDATE MENU
     * ========================================================= */
  public function updateMenu(Request $request, $id)
{
    $data = $request->validate([
        'stok_awal'  => 'required|numeric|min:0',
        'stok_masuk' => 'required|numeric|min:0',
        'pemakaian'  => 'required|numeric|min:0',
    ]);

    DB::transaction(function () use ($data, $id) {

        $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);

        // ============================
        // HITUNG SELISIH PEMAKAIAN
        // ============================
        $deltaPemakaian = $data['pemakaian'] - $menu->stok_keluar;

        // ============================
        // UPDATE MENU
        // ============================
        $stokTotal = $data['stok_awal'] + $data['stok_masuk'];
        $stokAkhir = max(0, $stokTotal - $data['pemakaian']);

        $menu->update([
            'stok_awal'   => $data['stok_awal'],
            'stok_masuk'  => $data['stok_masuk'],
            'stok_keluar' => $data['pemakaian'],
            'stok_akhir'  => $stokAkhir,
        ]);

        // ============================
        // UPDATE STOK MENTAH (DELTA)
        // ============================
        if (!is_array($menu->recipe->ingredients)) return;

        foreach ($menu->recipe->ingredients as $ing) {

            $qty = $deltaPemakaian * ($ing['amount'] ?? 0);
            if ($qty == 0) continue;

            $mentah = StokHarianDapurMentah::where([
                'item_id' => $ing['item_id'],
                'tanggal' => $menu->tanggal,
            ])->first();

            if (!$mentah) continue;

            $newKeluar = max(0, $mentah->stok_keluar + $qty);

            $mentah->update([
                'stok_keluar' => $newKeluar,
                'stok_akhir'  => max(
                    0,
                    $mentah->stok_awal + $mentah->stok_masuk - $newKeluar
                ),
            ]);
        }
    });

    return back()->with('success', 'Produksi menu dapur berhasil disimpan.');
}




    /* =========================================================
     * DELETE MENU
     * ========================================================= */
  public function destroyMenu($id)
{
    DB::transaction(function () use ($id) {

        $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);
        $tanggal = $menu->tanggal;

        if (is_array($menu->recipe->ingredients)) {
            foreach ($menu->recipe->ingredients as $ing) {

                $totalMenu = $menu->stok_awal + $menu->stok_masuk;
                $qty = $totalMenu * ($ing['amount'] ?? 0);

                $mentah = StokHarianDapurMentah::where([
                    'item_id' => $ing['item_id'],
                    'tanggal' => $tanggal,
                ])->first();

                if (!$mentah) continue;

                $newKeluar = max(0, $mentah->stok_keluar - $qty);

                $mentah->update([
                    'stok_keluar' => $newKeluar,
                    'stok_akhir'  => $mentah->stok_awal
                        + $mentah->stok_masuk
                        - $newKeluar,
                ]);

                // AUTO DELETE JIKA KOSONG TOTAL
                if (
                    $mentah->stok_awal == 0 &&
                    $mentah->stok_masuk == 0 &&
                    $newKeluar == 0
                ) {
                    $mentah->delete();
                }
            }
        }

        $menu->delete();
    });

    return back()->with('success', 'Menu dapur dihapus & stok mentah dikembalikan.');
}


    /* =========================================================
     * STORE MENTAH MANUAL
     * ========================================================= */
   public function storeMentah(Request $request)
{
    $data = $request->validate([
        'item_id'     => 'required|exists:items,id',
        'tanggal'     => 'required|date',
        'stok_awal'   => 'required|numeric|min:0',
        'stok_masuk'  => 'nullable|numeric|min:0',
        'stok_keluar' => 'nullable|numeric|min:0',
    ]);

    $stokAwal   = $data['stok_awal'];
    $stokMasuk  = $data['stok_masuk'] ?? 0;
    $stokKeluar = $data['stok_keluar'] ?? 0;

    $stokTotal = $stokAwal + $stokMasuk;
    $stokAkhir = max(0, $stokTotal - $stokKeluar);

    StokHarianDapurMentah::updateOrCreate(
        [
            'item_id' => $data['item_id'],
            'tanggal' => $data['tanggal'],
        ],
        [
            'stok_awal'   => $stokAwal,
            'stok_masuk'  => $stokMasuk,
            'stok_keluar' => $stokKeluar,
            'stok_akhir'  => $stokAkhir,
        ]
    );

    // 🔥 recalculasi menu
    $this->recalculateMenuByDate($data['tanggal']);

    return back()->with('success', 'Stok bahan mentah disimpan.');
}



    public function destroyMentah($id)
    {
        StokHarianDapurMentah::findOrFail($id)->delete();
        return back()->with('success', 'Stok bahan mentah dihapus.');
    }
    private function recalculateMenuByDate(string $tanggal)
{
    $menus = StokHarianDapurMenu::with('recipe')
        ->whereDate('tanggal', $tanggal)
        ->get();

    foreach ($menus as $menu) {
        if (!is_array($menu->recipe->ingredients)) continue;

        $stokMenuAwal = PHP_INT_MAX;

        foreach ($menu->recipe->ingredients as $ing) {

            $mentah = StokHarianDapurMentah::where([
                'item_id' => $ing['item_id'],
                'tanggal' => $tanggal,
            ])->first();

            if (!$mentah) {
                $stokMenuAwal = 0;
                break;
            }

            $butuh = max(1, (int) ($ing['amount'] ?? 1));
            $stokMenuAwal = min(
                $stokMenuAwal,
                intdiv($mentah->stok_akhir, $butuh)
            );
        }

        $menu->update([
            'stok_awal'  => max(0, $stokMenuAwal),
            'stok_akhir' => max(0, $stokMenuAwal + $menu->stok_masuk - $menu->stok_keluar),
        ]);
    }
}
public function updateMentah(Request $request, $id)
{
    $data = $request->validate([
        'stok_awal'   => 'required|numeric|min:0',
        'stok_masuk'  => 'nullable|numeric|min:0',
        'stok_keluar' => 'nullable|numeric|min:0',
    ]);

    $mentah = StokHarianDapurMentah::findOrFail($id);

    $stokAwal   = $data['stok_awal'];
    $stokMasuk  = $data['stok_masuk'] ?? 0;
    $stokKeluar = $data['stok_keluar'] ?? 0;

    $stokTotal = $stokAwal + $stokMasuk;
    $stokAkhir = max(0, $stokTotal - $stokKeluar);

    $mentah->update([
        'stok_awal'   => $stokAwal,
        'stok_masuk'  => $stokMasuk,
        'stok_keluar' => $stokKeluar,
        'stok_akhir'  => $stokAkhir,
    ]);

    $this->recalculateMenuByDate($mentah->tanggal);

    return back()->with('success', 'Stok bahan mentah diperbarui.');
}


}
