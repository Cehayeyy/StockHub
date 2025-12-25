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

class StokHarianController extends Controller
{
    public function bar(Request $request)
    {
        $tab     = $request->tab ?? 'menu';
        $search  = $request->search;
        $tanggal = $request->tanggal ?? Carbon::now()->toDateString();

        // --- 1. DATA TABEL (PAGINATION) ---
        if ($tab === 'menu') {
            $query = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal);
            if ($search) {
                $query->whereHas('item', fn ($q) => $q->where('nama', 'like', "%{$search}%"));
            }

            $items = $query->orderByDesc('id')->paginate(10)->through(function ($s) use ($tanggal) {
                // Logika Pooling untuk Tabel (Virtual Calculation)
                $recipe = Recipe::where('name', $s->item->nama)->first();
                $tersisaDisplay = $s->stok_akhir;

                if ($recipe && !empty($recipe->ingredients)) {
                    $maxBisaDibuat = 999999;
                    foreach ($recipe->ingredients as $ing) {
                        $rawItemId = $ing['item_id'] ?? null;
                        $butuhPerPorsi = $ing['amount'] ?? 0;
                        if ($rawItemId && $butuhPerPorsi > 0) {
                            $stokMentah = StokHarianMentah::where('item_id', $rawItemId)
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
                    'item_id'    => $s->item_id,
                    'nama'       => $s->item->nama,
                    'satuan'     => $s->item->satuan ?? 'porsi',
                    'stok_awal'  => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $tersisaDisplay,
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
        $lowMentah = StokHarianMentah::with('item')
            ->whereDate('tanggal', $tanggal)
            ->where('stok_akhir', '<', 7)
            ->get()
            ->map(fn($i) => [
                'nama'     => $i->item->nama,
                'tersisa'  => $i->stok_akhir,
                'kategori' => 'Bahan Mentah'
            ]);

        $allMenus = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal)->get();
        $lowMenu = $allMenus->map(function($s) use ($tanggal) {
            $recipe = Recipe::where('name', $s->item->nama)->first();
            $tersisa = $s->stok_akhir;

            if ($recipe && !empty($recipe->ingredients)) {
                $maxBisaDibuat = 999999;
                foreach ($recipe->ingredients as $ing) {
                    $rawItemId = $ing['item_id'] ?? null;
                    $butuh = $ing['amount'] ?? 0;
                    if ($rawItemId && $butuh > 0) {
                        $stokMentah = StokHarianMentah::where('item_id', $rawItemId)
                            ->where('tanggal', $tanggal)
                            ->first();
                        $sisaFisik = $stokMentah ? $stokMentah->stok_akhir : 0;
                        $kapasitas = floor($sisaFisik / $butuh);
                        if ($kapasitas < $maxBisaDibuat) $maxBisaDibuat = $kapasitas;
                    }
                }
                $tersisa = ($maxBisaDibuat === 999999) ? 0 : $maxBisaDibuat;
            }
            return ['nama' => $s->item->nama, 'tersisa' => $tersisa, 'kategori' => 'Menu'];
        })->filter(fn($item) => $item['tersisa'] < 7)->values();

        $lowStockItems = $lowMentah->merge($lowMenu);

        // --- 3. DATA DROPDOWN ---
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

            $inputableMenus = StokHarianMenu::with('item')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn ($s) => ['id' => $s->item_id, 'nama' => $s->item->nama]);
        } else {
            $inputableMenus = StokHarianMentah::with('item')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn ($s) => ['id' => $s->item_id, 'nama' => $s->item->nama, 'satuan' => $s->unit]);
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
        $keluar = 0; // Default 0
        $item = Item::find($data['item_id']);
        $unit = $item ? $item->satuan : 'unit';

        DB::transaction(function () use ($data, $masuk, $keluar, $unit, $item) {
            StokHarianMentah::updateOrCreate(
                ['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
                [
                    'stok_awal'   => $data['stok_awal'],
                    'stok_masuk'  => $masuk,
                    'stok_keluar' => $keluar,
                    'stok_akhir'  => $data['stok_awal'] + $masuk - $keluar,
                    'unit'        => $unit
                ]
            );

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Input Stok Mentah',
                'description' => "Menginput stok mentah '{$item->nama}'. Masuk: {$masuk}."
            ]);
        });

        return back()->with('success', 'Stok mentah disimpan.');
    }

    // --- UPDATE MENU (FIXED: SINKRONISASI STOK MENTAH) ---
    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianMenu::with('item')->findOrFail($id);

        $request->validate([
            'stok_awal'   => 'nullable|numeric|min:0',
            'stok_masuk'  => 'nullable|numeric|min:0',
            'stok_keluar' => [
                'nullable', 'numeric', 'min:0',
                function ($attribute, $value, $fail) use ($request, $menu) {
                    $awal = $request->input('stok_awal') ?? $menu->stok_awal;
                    $masuk = $request->input('stok_masuk') ?? $menu->stok_masuk;
                    $total = $awal + $masuk;
                    if ($value > $total) {
                        $fail("Pemakaian ($value) melebihi stok tersedia ($total).");
                    }
                }
            ],
        ]);

        DB::transaction(function () use ($request, $menu) {
            // 1. Simpan nilai lama sebelum update
            $oldUsage = $menu->stok_keluar;
            $newKeluar = $request->input('stok_keluar') ?? $menu->stok_keluar;

            // 2. Update data menu
            $menu->update([
                'stok_awal'   => $request->input('stok_awal') ?? $menu->stok_awal,
                'stok_masuk'  => $request->input('stok_masuk') ?? $menu->stok_masuk,
                'stok_keluar' => $newKeluar,
                'stok_akhir'  => ($request->input('stok_awal') ?? $menu->stok_awal) +
                                 ($request->input('stok_masuk') ?? $menu->stok_masuk) - $newKeluar,
            ]);

            // 3. 🔥 UPDATE STOK MENTAH (DELTA) - Ini yang sebelumnya hilang
            $deltaPemakaian = $newKeluar - $oldUsage;

            // Cari Resep berdasarkan Nama Item
            $recipe = Recipe::where('name', $menu->item->nama)->first();

            if ($deltaPemakaian != 0 && $recipe && is_array($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $qty = $deltaPemakaian * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    // Cari bahan mentah yang cocok tanggal & item_id
                    $mentah = StokHarianMentah::where([
                        'item_id' => $ing['item_id'],
                        'tanggal' => $menu->tanggal,
                    ])->first();

                    if (!$mentah) continue;

                    // Update pemakaian di stok mentah
                    $newRawKeluar = max(0, $mentah->stok_keluar + $qty);

                    $mentah->update([
                        'stok_keluar' => $newRawKeluar,
                        'stok_akhir'  => max(0, $mentah->stok_awal + $mentah->stok_masuk - $newRawKeluar),
                    ]);
                }
            }

            ActivityLog::create([
                'user_id'     => Auth::id(),
                'activity'    => 'Update Stok Menu',
                'description' => "Update stok menu '{$menu->item->nama}'. Terjual: {$newKeluar}."
            ]);
        });

        return back()->with('success', 'Stok diperbarui.');
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
        $keluar = $stok->stok_keluar; // Pertahankan nilai lama (penting agar sinkronisasi resep tidak hilang)

        $stok->update([
            'stok_awal'   => $data['stok_awal'],
            'stok_masuk'  => $masuk,
            'stok_akhir'  => $data['stok_awal'] + $masuk - $keluar,
        ]);

        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Update Stok Mentah',
            'description' => "Update stok mentah '{$stok->item->nama}'. Awal: {$data['stok_awal']}, Masuk: {$masuk}."
        ]);

        return back()->with('success', 'Stok mentah diperbarui.');
    }

    // --- DELETE MENU (FIXED: SINKRONISASI PENGEMBALIAN STOK) ---
    public function destroyMenu($id)
    {
        $menu = StokHarianMenu::with('item')->findOrFail($id);
        $nama = $menu->item->nama;

        DB::transaction(function () use ($menu, $nama) {
            // 🔥 KEMBALIKAN STOK MENTAH JIKA MENU SUDAH TERJUAL
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
                            $mentah->update([
                                'stok_keluar' => $newRawKeluar,
                                'stok_akhir'  => $mentah->stok_awal + $mentah->stok_masuk - $newRawKeluar
                            ]);
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
