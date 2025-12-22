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
$items = $query->orderByDesc('id')->paginate(10)->through(fn ($s) => [
    'id'         => $s->id,
    'item_id'    => $s->item_id,
    'nama'       => $s->item->nama,
    'satuan'     => $s->unit ?? $s->item->satuan,
    'stok_awal'  => $s->stok_awal,

    // ✅ STOK MASUK HASIL RUMUS
    'stok_masuk' => max(
        0,
        ($s->stok_akhir + $s->stok_keluar) - $s->stok_awal
    ),

    'stok_total' => $s->stok_awal
        + max(0, ($s->stok_akhir + $s->stok_keluar) - $s->stok_awal),

    'pemakaian'  => $s->stok_keluar,
    'tersisa'    => $s->stok_akhir,
]);

        } else {
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

        // DROPDOWN
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
    // STORE MENU (HANYA MENU BARU)
    // =========================================================
public function storeMenu(Request $request)
{
    $data = $request->validate([
        'item_id' => 'required|exists:items,id',
        'tanggal' => 'required|date',
    ]);

    DB::transaction(function () use ($data) {

        // ❌ cegah duplikat menu per tanggal
        if (StokHarianMenu::where($data)->exists()) {
            return;
        }

        $item   = Item::findOrFail($data['item_id']);
        $recipe = Recipe::where('name', $item->nama)->first();

        if (!$recipe || !is_array($recipe->ingredients)) {
            return;
        }

        // ===============================
        // 1️⃣ HITUNG STOK AWAL MENU (BOTTLENECK)
        // ===============================
        $stokMenuAwal = PHP_INT_MAX;

        foreach ($recipe->ingredients as $ing) {

            $ingredientItemId =
                $ing['item_id']
                ?? $ing['id']
                ?? ($ing['item']['id'] ?? null);

            if (!$ingredientItemId) {
                $stokMenuAwal = 0;
                break;
            }

            $stokMentah = StokHarianMentah::where([
                'item_id' => $ingredientItemId,
                'tanggal' => $data['tanggal'],
            ])->first();

            if (!$stokMentah) {
                $stokMenuAwal = 0;
                break;
            }

            $butuh    = max(1, (int) ($ing['amount'] ?? 1));
            $possible = intdiv($stokMentah->stok_akhir, $butuh);

            $stokMenuAwal = min($stokMenuAwal, $possible);
        }

        $stokMenuAwal = max(0, $stokMenuAwal);

        // ===============================
        // 2️⃣ SIMPAN MENU (TANPA SENTUH STOK MENTAH)
        // ===============================
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
    // UPDATE MENU (EDIT PRODUKSI)
    // =========================================================
    public function updateMenu(Request $request, $id)
    {
        $data = $request->validate([
            'stok_masuk' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($data, $id) {

            $menu = StokHarianMenu::with('item')->findOrFail($id);
            $delta = $data['stok_masuk'] - $menu->stok_masuk;
            if ($delta == 0) return;

            $menu->update([
                'stok_masuk' => $data['stok_masuk'],
                'stok_akhir' => $menu->stok_awal + $data['stok_masuk'] - $menu->stok_keluar,
            ]);

            $recipe = Recipe::where('name', $menu->item->nama)->first();
            if (!$recipe || !is_array($recipe->ingredients)) return;

            foreach ($recipe->ingredients as $ing) {
                $qty = $delta * ($ing['amount'] ?? 0);

                $mentah = StokHarianMentah::where([
                    'item_id' => $ing['item_id'],
                    'tanggal' => $menu->tanggal,
                ])->first();

                if (!$mentah) continue;

                $newKeluar = max(0, $mentah->stok_keluar + $qty);

                $mentah->update([
                    'stok_keluar' => $newKeluar,
                    'stok_akhir'  => $mentah->stok_awal + $mentah->stok_masuk - $newKeluar,
                ]);
            }
        });

        return back()->with('success', 'Stok menu & bahan mentah berhasil diperbarui.');
    }

    // =========================================================
    // DESTROY MENU
    // =========================================================
   public function destroyMenu($id)
{
    DB::transaction(function () use ($id) {

        $menu = StokHarianMenu::with('item')->findOrFail($id);
        $tanggal = $menu->tanggal;

        $recipe = Recipe::where('name', $menu->item->nama)->first();

        if ($recipe && is_array($recipe->ingredients)) {
            foreach ($recipe->ingredients as $ing) {

                // ✅ HITUNG TOTAL MENU YANG PERNAH DIKURANGKAN
                $totalMenu = $menu->stok_awal + $menu->stok_masuk;
                $qty = $totalMenu * ($ing['amount'] ?? 0);

                $stokMentah = StokHarianMentah::where([
                    'item_id' => $ing['item_id'],
                    'tanggal' => $tanggal,
                ])->first();

                if (!$stokMentah) continue;

                $newKeluar = max(0, $stokMentah->stok_keluar - $qty);

                $stokMentah->update([
                    'stok_keluar' => $newKeluar,
                    'stok_akhir'  => $stokMentah->stok_awal
                        + $stokMentah->stok_masuk
                        - $newKeluar,
                ]);

                // 🔥 AUTO DELETE JIKA BENAR-BENAR KOSONG
                if (
                    $stokMentah->stok_awal == 0 &&
                    $stokMentah->stok_masuk == 0 &&
                    $newKeluar == 0
                ) {
                    $stokMentah->delete();
                }
            }
        }

        $menu->delete();
    });

    return back()->with('success', 'Menu dihapus & stok bahan mentah dikembalikan.');
}

    // =========================================================
    // STORE & UPDATE MENTAH (TETAP SEPERTI MILIKMU)
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
        [
            'item_id' => $data['item_id'],
            'tanggal' => $data['tanggal'],
        ],
        [
            'stok_awal'   => $data['stok_awal'],
            'stok_masuk'  => $masuk,
            'stok_keluar' => $keluar,
            'stok_akhir'  => $data['stok_awal'] + $masuk - $keluar,
        ]
    );

    // 🔥 INI KUNCINYA
    $this->recalculateMenuByDate($data['tanggal']);

    return back()->with('success', 'Stok mentah & menu otomatis diperbarui.');
}


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

    return back()->with('success', 'Stok bahan mentah berhasil diperbarui.');
}


    public function destroyMentah($id)
    {
        StokHarianMentah::findOrFail($id)->delete();
        return back()->with('success', 'Stok bahan mentah berhasil dihapus.');
    }
    private function recalculateMenuByDate(string $tanggal)
{
    $menus = StokHarianMenu::with('item')
        ->whereDate('tanggal', $tanggal)
        ->get();

    foreach ($menus as $menu) {
        $recipe = Recipe::where('name', $menu->item->nama)->first();
        if (!$recipe || !is_array($recipe->ingredients)) continue;

        $stokMenuAwal = PHP_INT_MAX;

        foreach ($recipe->ingredients as $ing) {
            $ingredientItemId =
                $ing['item_id']
                ?? $ing['id']
                ?? ($ing['item']['id'] ?? null);

            if (!$ingredientItemId) {
                $stokMenuAwal = 0;
                break;
            }

            $mentah = StokHarianMentah::where([
                'item_id' => $ingredientItemId,
                'tanggal' => $tanggal,
            ])->first();

            if (!$mentah) {
                $stokMenuAwal = 0;
                break;
            }

            $butuh = max(1, (int) ($ing['amount'] ?? 1));
            $stokMenuAwal = min($stokMenuAwal, intdiv($mentah->stok_akhir, $butuh));
        }

        $stokMenuAwal = max(0, $stokMenuAwal);

        $menu->update([
            'stok_awal'  => $stokMenuAwal,
            'stok_akhir' => $stokMenuAwal + $menu->stok_masuk - $menu->stok_keluar,
        ]);
    }
}

}
