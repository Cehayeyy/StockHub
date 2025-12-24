<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
// Model Bar
use App\Models\StokHarianMenu;
use App\Models\StokHarianMentah;
// Model Dapur
use App\Models\StokHarianDapurMenu;
use App\Models\StokHarianDapurMentah;

use App\Models\Recipe;
use App\Models\Item;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class StokHarianController extends Controller
{
    // =========================================================
    // METHOD BAR (TAMPILAN & LOGIKA STOCK POOLING)
    // =========================================================
    public function bar(Request $request)
    {
        // ... (Kode Bar tetap sama seperti sebelumnya) ...
        // Saya persingkat di sini agar fokus ke Dapur, tapi di file asli
        // pastikan kode Bar yang sudah fix tadi tetap ada.

        $tab     = $request->tab ?? 'menu';
        $search  = $request->search;
        $tanggal = $request->tanggal ?? Carbon::now()->toDateString();

        if ($tab === 'menu') {
            $query = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal);
            if ($search) $query->whereHas('item', fn ($q) => $q->where('nama', 'like', "%{$search}%"));

            // 🔥 LOGIKA POOLING BAR
            $items = $query->orderByDesc('id')->paginate(10)->through(function ($s) use ($tanggal) {
                $recipe = Recipe::where('name', $s->item->nama)->first();
                $tersisaDisplay = $s->stok_akhir;

                if ($recipe && !empty($recipe->ingredients)) {
                    $maxBisaDibuat = 999999;
                    foreach ($recipe->ingredients as $ing) {
                        $rawItemId = $ing['item_id'] ?? null;
                        $butuhPerPorsi = $ing['amount'] ?? 0;
                        if ($rawItemId && $butuhPerPorsi > 0) {
                            $stokMentah = StokHarianMentah::where('item_id', $rawItemId)->where('tanggal', $tanggal)->first();
                            $sisaFisik = $stokMentah ? $stokMentah->stok_akhir : 0;
                            $kapasitas = floor($sisaFisik / $butuhPerPorsi);
                            if ($kapasitas < $maxBisaDibuat) $maxBisaDibuat = $kapasitas;
                        }
                    }
                    $tersisaDisplay = ($maxBisaDibuat === 999999) ? 0 : $maxBisaDibuat;
                }

                return [
                    'id' => $s->id, 'item_id' => $s->item_id, 'nama' => $s->item->nama,
                    'satuan' => $s->item->satuan ?? 'porsi', 'stok_awal' => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk, 'stok_total' => $s->stok_awal + $s->stok_masuk,
                    'pemakaian' => $s->stok_keluar, 'tersisa' => $tersisaDisplay,
                ];
            })->withQueryString();
        } else {
            // Mentah Bar
            $query = StokHarianMentah::with('item')->whereDate('tanggal', $tanggal);
            if ($search) $query->whereHas('item', fn ($q) => $q->where('nama', 'like', "%{$search}%"));
            $items = $query->orderByDesc('id')->paginate(10)->through(fn ($s) => [
                'id' => $s->id, 'item_id' => $s->item_id, 'nama' => $s->item->nama,
                'satuan' => $s->unit ?? $s->item->satuan, 'stok_awal' => $s->stok_awal,
                'stok_masuk' => $s->stok_masuk, 'stok_total' => $s->stok_awal + $s->stok_masuk,
                'pemakaian' => $s->stok_keluar, 'tersisa' => $s->stok_akhir,
            ]);
        }

        // Dropdown Bar
        $availableMenus = [];
        $inputableMenus = [];
        if ($tab === 'menu') {
            $usedIds = StokHarianMenu::whereDate('tanggal', $tanggal)->pluck('item_id');
            $recipes = Recipe::where('division', 'bar')->pluck('name');
            $availableMenus = Item::where('division', 'bar')->whereIn('nama', $recipes)->whereNotIn('id', $usedIds)->orderBy('nama')->get(['id', 'nama', 'satuan']);
            $inputableMenus = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal)->get()->map(fn ($s) => ['id' => $s->item_id, 'nama' => $s->item->nama]);
        } else {
            $inputableMenus = StokHarianMentah::with('item')->whereDate('tanggal', $tanggal)->get()->map(fn ($s) => ['id' => $s->item_id, 'nama' => $s->item->nama, 'satuan' => $s->unit]);
        }

        return Inertia::render('StokHarian/Bar', [
            'items' => $items, 'tab' => $tab, 'division' => 'bar', 'tanggal' => $tanggal,
            'availableMenus' => $availableMenus, 'inputableMenus' => $inputableMenus,
        ]);
    }

    // ... (Fungsi storeMenu, updateMenu, destroyMenu, storeMentah, updateMentah, destroyMentah BAR tetap ada di sini sesuai kode sebelumnya) ...
    // Agar tidak kepanjangan, saya asumsikan kode Bar di atas sudah Anda miliki.
    // Fokus kita di bawah ini adalah penambahan METHOD DAPUR.

    // =========================================================
    // METHOD DAPUR (LOGIKA SAMA DENGAN BAR)
    // =========================================================
    public function dapur(Request $request)
    {
        $tab     = $request->tab ?? 'menu';
        $search  = $request->search;
        $tanggal = $request->tanggal ?? Carbon::now()->toDateString();

        if ($tab === 'menu') {
            // Note: Dapur pakai relasi 'recipe', beda dikit struktur tabelnya tapi logikanya sama
            $query = StokHarianDapurMenu::with('recipe')->whereDate('tanggal', $tanggal);

            if ($search) {
                $query->whereHas('recipe', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            }

            // 🔥 LOGIKA STOCK POOLING DAPUR
            $items = $query->orderByDesc('id')->paginate(10)->through(function ($s) use ($tanggal) {
                // Ambil Resep langsung dari relasi (karena Dapur simpan recipe_id)
                $recipe = $s->recipe;
                $tersisaDisplay = $s->stok_akhir;

                // Hitung ulang berdasarkan bahan mentah dapur
                if ($recipe && !empty($recipe->ingredients)) {
                    $maxBisaDibuat = 999999;

                    foreach ($recipe->ingredients as $ing) {
                        $rawItemId = $ing['item_id'] ?? null;
                        $butuhPerPorsi = $ing['amount'] ?? 0;

                        if ($rawItemId && $butuhPerPorsi > 0) {
                            // Cek stok mentah DAPUR
                            $stokMentah = StokHarianDapurMentah::where('item_id', $rawItemId)
                                ->where('tanggal', $tanggal)
                                ->first();

                            $sisaFisik = $stokMentah ? $stokMentah->stok_akhir : 0;
                            $kapasitas = floor($sisaFisik / $butuhPerPorsi);

                            if ($kapasitas < $maxBisaDibuat) {
                                $maxBisaDibuat = $kapasitas;
                            }
                        }
                    }
                    $tersisaDisplay = ($maxBisaDibuat === 999999) ? 0 : $maxBisaDibuat;
                }

                return [
                    'id'         => $s->id,
                    'recipe_id'  => $s->recipe_id, // Dapur pakai recipe_id
                    'nama'       => $s->recipe->name,
                    'satuan'     => $s->unit ?? 'porsi',
                    'stok_awal'  => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $tersisaDisplay, // Hasil hitungan dynamic
                ];
            })->withQueryString();

        } else {
            // TAB MENTAH DAPUR
            $query = StokHarianDapurMentah::with('item')->whereDate('tanggal', $tanggal);
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

        // DROPDOWN DATA DAPUR
        $availableMenus = [];
        $inputableMenus = [];

        if ($tab === 'menu') {
            $usedRecipeIds = StokHarianDapurMenu::whereDate('tanggal', $tanggal)->pluck('recipe_id');
            // Ambil resep yang belum ada di stok hari ini
            $availableMenus = Recipe::where('division', 'dapur')
                ->whereNotIn('id', $usedRecipeIds)
                ->orderBy('name')
                ->get(['id', 'name']);

            $inputableMenus = StokHarianDapurMenu::with('recipe')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn ($s) => [
                    'id' => $s->recipe_id, 'nama' => $s->recipe->name, 'satuan' => $s->unit,
                    'stok_awal' => $s->stok_awal, 'pemakaian' => $s->stok_keluar, 'stok_masuk' => $s->stok_masuk
                ]);
        } else {
            $inputableMenus = StokHarianDapurMentah::with('item')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn ($s) => [
                    'id' => $s->item_id, 'nama' => $s->item->nama, 'satuan' => $s->unit,
                    'stok_awal' => $s->stok_awal, 'pemakaian' => $s->stok_keluar, 'stok_masuk' => $s->stok_masuk
                ]);
        }

        // Render ke Page Dapur (Struktur file React diasumsikan mirip Bar)
        return Inertia::render('StokHarian/Dapur', [
            'items'          => $items,
            'tab'            => $tab,
            'division'       => 'dapur',
            'tanggal'        => $tanggal,
            'availableMenus' => $availableMenus,
            'inputableMenus' => $inputableMenus,
        ]);
    }

    // =========================================================
    // STORE MENU DAPUR
    // =========================================================
    public function storeDapurMenu(Request $request)
    {
        $data = $request->validate([
            'recipe_id' => 'required|exists:recipes,id', // Dapur pakai recipe_id
            'tanggal'   => 'required|date',
        ]);

        DB::transaction(function () use ($data) {
            if (StokHarianDapurMenu::where($data)->exists()) return;

            $recipe = Recipe::findOrFail($data['recipe_id']);
            $stokMenuAwal = 0;

            if ($recipe && is_array($recipe->ingredients)) {
                $maxPossible = 999999;
                foreach ($recipe->ingredients as $ing) {
                    $itemId = $ing['item_id'] ?? null;
                    if (!$itemId) continue;

                    $stokMentah = StokHarianDapurMentah::where(['item_id' => $itemId, 'tanggal' => $data['tanggal']])->first();
                    if (!$stokMentah) { $maxPossible = 0; break; }

                    $butuh = max(1, (int) ($ing['amount'] ?? 1));
                    $possible = floor($stokMentah->stok_akhir / $butuh);
                    if ($possible < $maxPossible) $maxPossible = $possible;
                }
                $stokMenuAwal = ($maxPossible === 999999) ? 0 : $maxPossible;
            }

            StokHarianDapurMenu::create([
                'recipe_id'   => $data['recipe_id'],
                'tanggal'     => $data['tanggal'],
                'stok_awal'   => $stokMenuAwal,
                'stok_masuk'  => 0,
                'stok_keluar' => 0,
                'stok_akhir'  => $stokMenuAwal,
                'unit'        => 'porsi'
            ]);
        });

        return back()->with('success', 'Menu dapur ditambahkan.');
    }

    // =========================================================
    // UPDATE MENU DAPUR (VALIDASI MINUS & STOCK POOLING)
    // =========================================================
    public function updateDapurMenu(Request $request, $id)
    {
        $menu = StokHarianDapurMenu::findOrFail($id);

        $data = $request->validate([
            'stok_awal'   => 'nullable|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
            'stok_keluar' => [
                'nullable', 'numeric', 'min:0',
                function ($attribute, $value, $fail) use ($request, $menu) {
                    $awal = $request->input('stok_awal') ?? $menu->stok_awal;
                    $masuk = $request->input('stok_masuk') ?? $menu->stok_masuk;
                    $total = $awal + $masuk;
                    if ($value > $total) {
                        $fail("Pemakaian ($value) melebihi stok total ($total).");
                    }
                }
            ],
        ]);

        DB::transaction(function () use ($data, $menu) {
            $menu->load('recipe');
            $recipe = $menu->recipe;

            $oldUsage = $menu->stok_keluar;

            $newAwal   = $data['stok_awal']   ?? $menu->stok_awal;
            $newMasuk  = $data['stok_masuk']  ?? $menu->stok_masuk;
            $newKeluar = $data['stok_keluar'] ?? $menu->stok_keluar;

            $menu->update([
                'stok_awal'   => $newAwal,
                'stok_masuk'  => $newMasuk,
                'stok_keluar' => $newKeluar,
                'stok_total'  => $newAwal + $newMasuk,
                'stok_akhir'  => ($newAwal + $newMasuk) - $newKeluar,
            ]);

            // 🔥 UPDATE BAHAN MENTAH DAPUR
            $deltaUsage = $newKeluar - $oldUsage;

            if ($deltaUsage != 0 && $recipe && !empty($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $itemId = $ing['item_id'] ?? null;
                    $amount = $ing['amount'] ?? 0;

                    if ($itemId) {
                        $mentah = StokHarianDapurMentah::where(['item_id' => $itemId, 'tanggal' => $menu->tanggal])->first();
                        if ($mentah) {
                            $change = $deltaUsage * $amount;
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

        return back()->with('success', 'Stok dapur diperbarui.');
    }

    // =========================================================
    // DESTROY MENU DAPUR (REVERSE USAGE & PERSISTENCE)
    // =========================================================
    public function destroyDapurMenu($id)
    {
        DB::transaction(function () use ($id) {
            $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);
            $recipe = $menu->recipe;

            if ($recipe && is_array($recipe->ingredients)) {
                $totalUsage = $menu->stok_keluar;

                if ($totalUsage > 0) {
                    foreach ($recipe->ingredients as $ing) {
                        $itemId = $ing['item_id'] ?? null;
                        $amount = $ing['amount'] ?? 0;
                        if (!$itemId) continue;

                        $qtyRestore = $totalUsage * $amount;
                        $mentah = StokHarianDapurMentah::where(['item_id' => $itemId, 'tanggal' => $menu->tanggal])->first();

                        if ($mentah) {
                            $newKeluar = max(0, $mentah->stok_keluar - $qtyRestore);
                            $mentah->update([
                                'stok_keluar' => $newKeluar,
                                'stok_akhir'  => ($mentah->stok_awal + $mentah->stok_masuk) - $newKeluar,
                            ]);
                            // Tetap jangan delete mentah
                        }
                    }
                }
            }
            $menu->delete();
        });

        return back()->with('success', 'Menu dapur dihapus.');
    }

    // =========================================================
    // STORE MENTAH DAPUR
    // =========================================================
    public function storeDapurMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'     => 'required|exists:items,id',
            'tanggal'     => 'required|date',
            'stok_awal'   => 'required|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
            'stok_keluar' => 'nullable|numeric|min:0',
        ]);

        $masuk = $data['stok_masuk'] ?? 0;
        $keluar = $data['stok_keluar'] ?? 0;

        // Ambil satuan dari item master jika belum ada
        $item = Item::find($data['item_id']);
        $unit = $item ? $item->satuan : 'unit';

        StokHarianDapurMentah::updateOrCreate(
            ['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
            [
                'stok_awal'   => $data['stok_awal'],
                'stok_masuk'  => $masuk,
                'stok_keluar' => $keluar,
                'stok_akhir'  => $data['stok_awal'] + $masuk - $keluar,
                'unit'        => $unit
            ]
        );

        return back()->with('success', 'Stok mentah dapur disimpan.');
    }

    // =========================================================
    // UPDATE MENTAH DAPUR
    // =========================================================
    public function updateDapurMentah(Request $request, $id)
    {
        $stok = StokHarianDapurMentah::findOrFail($id);

        $data = $request->validate([
            'stok_awal'   => 'required|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
            'stok_keluar' => [
                'nullable', 'numeric', 'min:0',
                function ($attribute, $value, $fail) use ($request, $stok) {
                    $awal = $request->input('stok_awal');
                    $masuk = $request->input('stok_masuk') ?? $stok->stok_masuk;
                    $total = $awal + $masuk;
                    if ($value > $total) {
                        $fail("Pemakaian ($value) melebihi stok tersedia ($total).");
                    }
                }
            ],
        ]);

        $masuk  = $data['stok_masuk']  ?? $stok->stok_masuk;
        $keluar = $data['stok_keluar'] ?? $stok->stok_keluar;

        $stok->update([
            'stok_awal'   => $data['stok_awal'],
            'stok_masuk'  => $masuk,
            'stok_keluar' => $keluar,
            'stok_akhir'  => $data['stok_awal'] + $masuk - $keluar,
        ]);

        return back()->with('success', 'Stok mentah dapur diperbarui.');
    }

    // =========================================================
    // DESTROY MENTAH DAPUR
    // =========================================================
    public function destroyDapurMentah($id)
    {
        StokHarianDapurMentah::findOrFail($id)->delete();
        return back()->with('success', 'Stok mentah dapur dihapus.');
    }
}
