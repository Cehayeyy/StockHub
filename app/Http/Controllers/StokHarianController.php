<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\StokHarianMenu;
use App\Models\StokHarianMentah;
use App\Models\Recipe;
use App\Models\Item;
use App\Models\ActivityLog;
use App\Models\IzinRevisi;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class StokHarianController extends Controller
{
    public function bar(Request $request)
    {
        $tab     = $request->get('tab', 'menu');
        $search  = $request->input('search');

        // Ambil tanggal hari ini
        $today   = Carbon::now()->toDateString();
        // Gunakan tanggal dari request, jika tidak ada gunakan hari ini
        $tanggal = $request->get('tanggal', $today);

        // 🔥 LOGIKA PENTING:
        // Hanya generate/hitung stok jika tanggal yang dilihat adalah HARI INI atau MASA LALU.
        // Jangan generate untuk MASA DEPAN karena transaksi hari ini belum selesai.
        if ($tanggal <= $today) {
            $this->ensureStokExists($tanggal);
        }

        if ($tab === 'menu') {
            $query = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal);

            if ($search) {
                $query->whereHas('item', fn ($q) => $q->where('nama', 'like', "%{$search}%"));
            }

            $items = $query->orderByDesc('id')->paginate(10)->through(function ($s) {
                return [
                    'id'           => $s->id,
                    'item_id'      => $s->item_id,
                    'nama'         => $s->item->nama,
                    'satuan'       => $s->item->satuan ?? 'porsi',
                    'stok_awal'    => $s->stok_awal,
                    'stok_masuk'   => $s->stok_masuk,
                    'stok_total'   => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'    => $s->stok_keluar,
                    'tersisa'      => $s->stok_akhir,
                    'is_submitted' => $s->is_submitted,
                ];
            })->withQueryString();
        } else {
            $query = StokHarianMentah::with('item')->whereDate('tanggal', $tanggal);

            if ($search) {
                $query->whereHas('item', fn ($q) => $q->where('nama', 'like', "%{$search}%"));
            }

            $items = $query->orderByDesc('id')->paginate(10)->through(fn ($s) => [
                'id'           => $s->id,
                'item_id'      => $s->item_id,
                'nama'         => $s->item->nama,
                'satuan'       => $s->unit ?? $s->item->satuan,
                'stok_awal'    => $s->stok_awal,
                'stok_masuk'   => $s->stok_masuk,
                'stok_total'   => $s->stok_awal + $s->stok_masuk,
                'pemakaian'    => $s->stok_keluar,
                'tersisa'      => $s->stok_akhir,
                'is_submitted' => 0,
            ])->withQueryString();
        }

        // Dropdown Data
        $inputableMenus = [];
        // Jika melihat masa depan, kosongkan dropdown agar tidak bisa input
        if ($tanggal <= $today) {
            if ($tab === 'menu') {
                $inputableMenus = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal)->get()
                    ->map(fn ($s) => ['id' => $s->item_id, 'nama' => $s->item->nama, 'satuan' => $s->unit, 'stok_awal' => $s->stok_awal, 'tersisa' => $s->stok_akhir, 'pemakaian' => $s->stok_keluar]);
            } else {
                $inputableMenus = StokHarianMentah::with('item')->whereDate('tanggal', $tanggal)->get()
                    ->map(fn ($s) => ['id' => $s->item_id, 'nama' => $s->item->nama, 'satuan' => $s->unit, 'stok_awal' => $s->stok_awal, 'tersisa' => $s->stok_akhir]);
            }
        }

        // Low Stock Logic
        $lowMentah = StokHarianMentah::with('item')->whereDate('tanggal', $tanggal)->where('stok_akhir', '<', 7)->get()
            ->map(fn($i) => ['nama' => $i->item->nama, 'tersisa' => $i->stok_akhir, 'kategori' => 'Bahan Bar']);
        $lowMenu = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal)->get()
            ->map(fn($s) => ['nama' => $s->item->nama, 'tersisa' => $s->stok_akhir, 'kategori' => 'Menu Bar'])
            ->filter(fn($item) => $item['tersisa'] < 7)->values();

        $lowStockItems = $lowMentah->concat($lowMenu);

        // canInput tetap mengecek jam dan izin, tapi untuk masa depan otomatis terkunci karena item kosong
        $canInput = $this->canUserInput($tanggal);

        return Inertia::render('StokHarian/Bar', [
            'items'          => $items,
            'tab'            => $tab,
            'division'       => 'bar',
            'tanggal'        => $tanggal,
            'inputableMenus' => $inputableMenus,
            'lowStockItems'  => $lowStockItems,
            'canInput'       => $canInput,
            'isPastCutoff'   => Carbon::now()->greaterThan(Carbon::parse($tanggal)->setTime(21, 0, 0)),
            'search'         => $search,
        ]);
    }

    private function ensureStokExists($tanggal)
    {
        $userId = Auth::id();
        $kemarin = Carbon::parse($tanggal)->subDay()->toDateString();

        // 1. GENERATE STOK MENTAH (Carry Over Murni)
        if (!StokHarianMentah::whereDate('tanggal', $tanggal)->exists()) {
            $items = Item::where('division', 'bar')->whereHas('itemCategory', fn ($q) => $q->where('name', 'Mentah'))->get();
            foreach ($items as $item) {
                // Carry Over: Ambil sisa kemarin
                $stokKemarin = StokHarianMentah::where('item_id', $item->id)->where('tanggal', $kemarin)->value('stok_akhir') ?? 0;

                StokHarianMentah::firstOrCreate(['item_id' => $item->id, 'tanggal' => $tanggal], [
                    'stok_awal' => $stokKemarin, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => $stokKemarin, 'unit' => $item->satuan
                ]);
            }
        }

        // 2. GENERATE STOK MENU (Logika Perbaikan)
        if (!StokHarianMenu::whereDate('tanggal', $tanggal)->exists()) {
            $menus = Item::where('division', 'bar')->whereHas('itemCategory', fn ($q) => $q->where('name', 'Menu'))->get();
            foreach ($menus as $item) {
                // Ambil sisa kemarin (untuk barang retail)
                $sisaMenuKemarin = StokHarianMenu::where('item_id', $item->id)->where('tanggal', $kemarin)->value('stok_akhir') ?? 0;

                // Hitung kapasitas dari bahan mentah pagi ini (untuk menu racikan)
                $kapasitasAwalPagi = 0;
                $recipe = Recipe::where('name', $item->nama)->first();
                if (!$recipe) $recipe = Recipe::where('item_id', $item->id)->first();

                if ($recipe && is_array($recipe->ingredients)) {
                    $minCap = 999999;
                    foreach ($recipe->ingredients as $ing) {
                        $raw = StokHarianMentah::where('item_id', $ing['item_id'])->where('tanggal', $tanggal)->first();
                        if ($raw) {
                            $cap = floor($raw->stok_awal / ($ing['amount'] ?? 1));
                            $minCap = min($minCap, $cap);
                        } else { $minCap = 0; break; }
                    }
                    $kapasitasAwalPagi = ($minCap === 999999) ? 0 : $minCap;
                }

                // 🔥 LOGIKA PERHITUNGAN BARU (Mencegah Double Counting) 🔥
                if ($recipe && is_array($recipe->ingredients) && count($recipe->ingredients) > 0) {
                    // Jika Menu Racikan (Made-to-Order): Stok Awal = Kapasitas Mentah Pagi Ini
                    $stokAwalFixed = $kapasitasAwalPagi;
                } else {
                    // Jika Barang Jadi (Retail): Stok Awal = Sisa Menu Kemarin
                    $stokAwalFixed = $sisaMenuKemarin;
                }

                StokHarianMenu::firstOrCreate(['item_id' => $item->id, 'tanggal' => $tanggal], [
                    'stok_awal' => $stokAwalFixed,
                    'stok_masuk' => 0,
                    'stok_keluar' => 0,
                    'stok_akhir' => $stokAwalFixed,
                    'unit' => $item->satuan,
                    'user_id' => $userId
                ]);
            }
        }
    }

    public function storeMenu(Request $request)
    {
        if (!$this->canUserInput($request->tanggal)) abort(403, 'Akses ditutup.');

        $data = $request->validate(['item_id' => 'required|exists:items,id', 'tanggal' => 'required|date', 'pemakaian' => 'required|numeric|min:0']);
        $item = Item::find($data['item_id']);

        DB::transaction(function () use ($data, $item) {
            $menu = StokHarianMenu::firstOrCreate(['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
                ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]);

            $delta = $data['pemakaian'];
            $menu->stok_keluar = $menu->stok_keluar + $delta;
            $menu->stok_akhir = max(0, $menu->stok_awal + $menu->stok_masuk - $menu->stok_keluar);
            $menu->is_submitted = 1;
            $menu->user_id = Auth::id();
            $menu->save();

            $recipe = Recipe::where('name', $item->nama)->first();
            if (!$recipe) $recipe = Recipe::where('item_id', $data['item_id'])->first();

            if ($delta != 0 && $recipe && is_array($recipe->ingredients)) {
                foreach ($recipe->ingredients as $ing) {
                    $qty = $delta * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;
                    $mentah = StokHarianMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $data['tanggal']])->first();
                    if ($mentah) {
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir = max(0, $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar);
                        $mentah->save();
                        $this->distributeStockToMenus($mentah->item_id, 0, $data['tanggal']);
                    }
                }
            }
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Input Pemakaian Bar', 'description' => "Input pemakaian '{$item->nama}': {$data['pemakaian']}"]);
            IzinRevisi::where('user_id', Auth::id())->where('status', 'approved')->where('end_time', '>', Carbon::now())->update(['status' => 'used']);
        });
        return back()->with('success', 'Stok menu tersimpan.');
    }

    public function storeMentah(Request $request)
    {
        $data = $request->validate(['item_id' => 'required|exists:items,id', 'tanggal' => 'required|date', 'stok_awal' => 'required|numeric|min:0', 'stok_masuk' => 'nullable|numeric|min:0']);

        DB::transaction(function () use ($data) {
            $mentah = StokHarianMentah::firstOrNew(['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']]);
            $masuk = $data['stok_masuk'] ?? 0;
            $mentah->stok_awal = $data['stok_awal'];
            $mentah->stok_masuk = $masuk;
            $mentah->stok_akhir = $data['stok_awal'] + $masuk - $mentah->stok_keluar;
            $mentah->save();

            $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Input Mentah Bar', 'description' => "Update stok mentah via Input Data."]);
        });
        return back()->with('success', 'Stok bahan mentah disimpan.');
    }

    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianMenu::with('item')->findOrFail($id);
        $newKeluar = $request->input('stok_keluar') ?? $request->input('pemakaian') ?? $menu->stok_keluar;

        DB::transaction(function () use ($request, $menu, $newKeluar) {
            $delta = $newKeluar - $menu->stok_keluar;
            $menu->stok_keluar = $newKeluar;
            $menu->is_submitted = 1;
            $menu->save();

            if ($delta != 0) {
                $recipe = Recipe::where('name', $menu->item->nama)->first();
                if ($recipe && is_array($recipe->ingredients)) {
                    foreach ($recipe->ingredients as $ing) {
                        $qty = $delta * ($ing['amount'] ?? 0);
                        if ($qty == 0) continue;
                        $mentah = StokHarianMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $menu->tanggal])->first();
                        if ($mentah) {
                            $mentah->update(['stok_keluar' => max(0, $mentah->stok_keluar + $qty),
                                             'stok_akhir' => max(0, $mentah->stok_awal + $mentah->stok_masuk - ($mentah->stok_keluar + $qty))]);
                            $this->distributeStockToMenus($mentah->item_id, 0, $menu->tanggal);
                        }
                    }
                }
            }
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Update Menu Bar', 'description' => "Update penjualan '{$menu->item->nama}'. Terjual: {$newKeluar}."]);
        });
        return back()->with('success', 'Data diperbarui.');
    }

    public function updateMentah(Request $request, $id)
    {
        $mentah = StokHarianMentah::with('item')->findOrFail($id);
        $masuk = $request->stok_masuk ?? 0;
        $mentah->update(['stok_awal' => $request->stok_awal, 'stok_masuk' => $masuk, 'stok_akhir' => $request->stok_awal + $masuk - $mentah->stok_keluar]);
        $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);
        return back()->with('success', 'Stok diperbarui.');
    }

    private function distributeStockToMenus($rawItemId, $dummy, $date)
    {
        $recipes = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$rawItemId]])->get();
        if ($recipes->isEmpty()) return;

        $menuItems = Item::whereIn('nama', $recipes->pluck('name'))->get();
        $targetMenus = StokHarianMenu::whereIn('item_id', $menuItems->pluck('id'))
            ->where('tanggal', $date)
            ->get();

        foreach ($targetMenus as $menu) {
            $recipe = Recipe::where('name', $menu->item->nama)->first();
            if (!$recipe) $recipe = Recipe::where('item_id', $menu->item_id)->first();
            if (!$recipe || !is_array($recipe->ingredients)) continue;

            $minCapReal = 999999;
            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amt = $ing['amount'] ?? 0;
                if (!$ingId || $amt == 0) continue;

                $raw = StokHarianMentah::where('item_id', $ingId)->where('tanggal', $date)->first();
                if ($raw) {
                    $capReal = floor($raw->stok_akhir / $amt);
                    $minCapReal = min($minCapReal, $capReal);
                } else { $minCapReal = 0; break; }
            }
            if ($minCapReal === 999999) $minCapReal = 0;
            $menu->stok_masuk = max(0, $minCapReal - $menu->stok_awal);
            $menu->stok_akhir = max(0, $menu->stok_awal + $menu->stok_masuk - $menu->stok_keluar);
            $menu->save();
        }
    }

    public function destroyMenu($id) {
        StokHarianMenu::findOrFail($id)->delete();
        return back()->with('success', 'Data dihapus.');
    }

    public function destroyMentah($id) {
        StokHarianMentah::findOrFail($id)->delete();
        return back()->with('success', 'Data dihapus.');
    }

    private function canUserInput($tanggal) {
        $user = Auth::user();
        $now = Carbon::now();
        $cutoffTime = Carbon::parse($tanggal)->setTime(21, 0, 0);

        if (in_array($user->role, ['owner', 'supervisor'])) return true;

        $hasIzin = IzinRevisi::where('user_id', $user->id)
                    ->where('status', 'approved')
                    ->where('start_time', '<=', $now)
                    ->where('end_time', '>=', $now)
                    ->exists();

        if ($hasIzin) return true;

        if ($now->greaterThanOrEqualTo($cutoffTime)) {
            return false;
        }

        return true;
    }
}
