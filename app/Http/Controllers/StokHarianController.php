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
        $search  = $request->search;
        $tanggal = $request->get('tanggal', Carbon::now()->toDateString());

        $this->ensureStokExists($tanggal);

        if ($tab === 'menu') {
            $query = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal);
            if ($search) {
                $query->whereHas('item', fn ($q) => $q->where('nama', 'like', "%{$search}%"));
            }
            $items = $query->orderByDesc('id')->paginate(10)->through(function ($s) {
                return [
                    'id'         => $s->id,
                    'item_id'    => $s->item_id,
                    'nama'       => $s->item->nama,
                    'satuan'     => $s->item->satuan ?? 'porsi',
                    'stok_awal'  => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $s->stok_akhir,
                ];
            })->withQueryString();
        } else {
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

        // Dropdowns & Low Stock Logic (Sama seperti sebelumnya)
        $inputableMenus = [];
        if ($tab === 'menu') {
            $inputableMenus = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal)->get()
                ->map(fn ($s) => ['id' => $s->item_id, 'nama' => $s->item->nama, 'satuan' => $s->unit, 'stok_awal' => $s->stok_awal, 'tersisa' => $s->stok_akhir, 'pemakaian' => $s->stok_keluar]);
        } else {
            $inputableMenus = StokHarianMentah::with('item')->whereDate('tanggal', $tanggal)->get()
                ->map(fn ($s) => ['id' => $s->item_id, 'nama' => $s->item->nama, 'satuan' => $s->unit, 'stok_awal' => $s->stok_awal, 'tersisa' => $s->stok_akhir]);
        }

        $lowMentah = StokHarianMentah::with('item')->whereDate('tanggal', $tanggal)->where('stok_akhir', '<', 7)->get()
            ->map(fn($i) => ['nama' => $i->item->nama, 'tersisa' => $i->stok_akhir, 'kategori' => 'Bahan Bar']);
        $lowMenu = StokHarianMenu::with('item')->whereDate('tanggal', $tanggal)->get()
            ->map(fn($s) => ['nama' => $s->item->nama, 'tersisa' => $s->stok_akhir, 'kategori' => 'Menu Bar'])
            ->filter(fn($item) => $item['tersisa'] < 7)->values();

        return Inertia::render('StokHarian/Bar', [
            'items' => $items, 'tab' => $tab, 'division' => 'bar', 'tanggal' => $tanggal,
            'inputableMenus' => $inputableMenus, 'lowStockItems' => $lowMentah->concat($lowMenu),
            'canInput' => $this->canUserInput(),
        ]);
    }

    private function ensureStokExists($tanggal)
    {
        $userId = Auth::id();
        $kemarin = Carbon::parse($tanggal)->subDay()->toDateString();

        // A. Generate Mentah
        $existsMentah = StokHarianMentah::whereDate('tanggal', $tanggal)->exists();
        if (!$existsMentah) {
            $recipes = Recipe::where('division', 'bar')->get();
            $ids = collect();
            foreach($recipes as $r) if(is_array($r->ingredients)) foreach($r->ingredients as $ing) $ids->push($ing['item_id']);

            foreach ($ids->unique() as $itemId) {
                $itemInfo = Item::find($itemId);
                if($itemInfo) {
                    $stokKemarin = StokHarianMentah::where('item_id', $itemId)->where('tanggal', $kemarin)->value('stok_akhir') ?? 0;
                    StokHarianMentah::firstOrCreate(['item_id' => $itemId, 'tanggal' => $tanggal], [
                        'stok_awal' => $stokKemarin, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => $stokKemarin, 'unit' => $itemInfo->satuan
                    ]);
                }
            }
        }

        // B. Generate Menu
        if (!StokHarianMenu::whereDate('tanggal', $tanggal)->exists()) {
            $menus = Item::whereIn('nama', Recipe::where('division', 'bar')->pluck('name'))->get();
            foreach ($menus as $item) {
                StokHarianMenu::firstOrCreate(['item_id' => $item->id, 'tanggal' => $tanggal], [
                    'stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => $item->satuan, 'user_id' => $userId
                ]);
            }
            // Trigger awal untuk SEMUA mentah agar distribusi rata terjadi sejak awal
            if (!$existsMentah) {
                $allMentah = StokHarianMentah::where('tanggal', $tanggal)->get();
                foreach($allMentah as $m) $this->distributeStockToMenus($m->item_id, 0, $tanggal);
            }
        }
    }

    public function storeMenu(Request $request)
    {
        $data = $request->validate(['item_id' => 'required|exists:items,id', 'tanggal' => 'required|date', 'pemakaian' => 'required|numeric|min:0']);
        $item = Item::find($data['item_id']);

        DB::transaction(function () use ($data, $item) {
            $menu = StokHarianMenu::firstOrCreate(['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']],
                ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]);

            $delta = $data['pemakaian'] - $menu->stok_keluar;
            $menu->stok_keluar = $data['pemakaian'];
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

                        // 🔥 Update Distribusi: Hanya panggil untuk item mentah yang berubah
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
        $data = $request->validate(['item_id' => 'required', 'tanggal' => 'required', 'stok_awal' => 'required|numeric', 'stok_masuk' => 'nullable|numeric']);

        DB::transaction(function () use ($data) {
            $mentah = StokHarianMentah::firstOrNew(['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']]);
            $masuk = $data['stok_masuk'] ?? 0;
            $mentah->stok_awal = $data['stok_awal'];
            $mentah->stok_masuk = $masuk;
            $mentah->stok_akhir = $data['stok_awal'] + $masuk - $mentah->stok_keluar;
            $mentah->save();

            $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Input Mentah Bar', 'description' => "Update stok mentah."]);
        });
        return back()->with('success', 'Stok mentah disimpan.');
    }

    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianMenu::with('item')->findOrFail($id);
        $newKeluar = $request->input('stok_keluar') ?? $request->input('pemakaian') ?? $menu->stok_keluar;

        DB::transaction(function () use ($menu, $newKeluar) {
            $delta = $newKeluar - $menu->stok_keluar;
            $menu->stok_keluar = $newKeluar;
            $menu->is_submitted = 1;
            $menu->user_id = Auth::id();
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
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Update Menu Bar', 'description' => "Update stok/penjualan '{$menu->item->nama}'."]);
        });
        return back()->with('success', 'Updated.');
    }

    public function updateMentah(Request $request, $id)
    {
        $mentah = StokHarianMentah::with('item')->findOrFail($id);
        $masuk = $request->stok_masuk ?? 0;
        $mentah->update(['stok_awal' => $request->stok_awal, 'stok_masuk' => $masuk,
                         'stok_akhir' => $request->stok_awal + $masuk - $mentah->stok_keluar]);

        $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);
        return back()->with('success', 'Updated.');
    }

    // 🔥🔥 DISTRIBUSI LOGIC: FIX 502 & FAIR SHARE (20 20 20) 🔥🔥
    // Fungsi ini hanya memproses Menu yang terkait dengan Raw Item ID tertentu (Efisien)
    private function distributeStockToMenus($rawItemId, $dummy, $date)
    {
        // 1. Cari Resep yang menggunakan bahan ini
        $recipes = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$rawItemId]])->get();
        if ($recipes->isEmpty()) return;

        $menuItems = Item::whereIn('nama', $recipes->pluck('name'))->get();

        // 2. Ambil Menu Target yang akan diupdate
        $targetMenus = StokHarianMenu::whereIn('item_id', $menuItems->pluck('id'))
            ->where('tanggal', $date)
            ->get();

        // 3. Loop setiap menu target
        foreach ($targetMenus as $menu) {
            $recipe = Recipe::where('name', $menu->item->nama)->first();
            if (!$recipe) $recipe = Recipe::where('item_id', $menu->item_id)->first();
            if (!$recipe || !is_array($recipe->ingredients)) continue;

            $maxCapAwal = 999999;
            $maxCapAkhirReal = 999999;

            // 4. Cek bottleneck bahan baku
            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amt = $ing['amount'] ?? 0;
                if (!$ingId || $amt == 0) continue;

                $raw = StokHarianMentah::where('item_id', $ingId)->where('tanggal', $date)->first();
                if ($raw) {
                    // 🔥 FIX LOGIKA KOMPETITOR (FAIR SHARE) 🔥
                    // Hitung ada berapa menu di hari ini yang resepnya pakai bahan ini
                    $recipesUsingIngredient = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$ingId]])->pluck('name');
                    $activeCompetitors = StokHarianMenu::whereHas('item', fn($q) => $q->whereIn('nama', $recipesUsingIngredient))
                        ->where('tanggal', $date)
                        ->count();

                    $activeCompetitors = max(1, $activeCompetitors); // Hindari division by zero

                    // A. Kapasitas Awal (Bagi Rata Stok Awal Mentah)
                    $shareAwal = floor($raw->stok_awal / $activeCompetitors);
                    $capAwal   = floor($shareAwal / $amt);

                    // B. Kapasitas Akhir (Bagi Rata Sisa Fisik Mentah)
                    $shareReal = floor($raw->stok_akhir / $activeCompetitors);
                    $capReal   = floor($shareReal / $amt);

                    $maxCapAwal = min($maxCapAwal, $capAwal);
                    $maxCapAkhirReal = min($maxCapAkhirReal, $capReal);
                } else {
                    $maxCapAwal = 0; $maxCapAkhirReal = 0;
                }
            }

            if ($maxCapAwal === 999999) $maxCapAwal = 0;
            if ($maxCapAkhirReal === 999999) $maxCapAkhirReal = 0;

            // --- EKSEKUSI UPDATE ---
            // 1. Stok Awal: Diambil dari pembagian rata Stok Awal Mentah
            $menu->stok_awal = $maxCapAwal;

            // 2. Stok Akhir: Diambil dari pembagian rata Sisa Fisik Mentah
            $menu->stok_akhir = $maxCapAkhirReal;

            // 3. Stok Masuk: Penyeimbang agar Total Dinamis
            // Masuk = Akhir - Awal.
            // (Jadi Total = Awal + Masuk = Akhir/Sisa Fisik).
            $menu->stok_masuk = $menu->stok_akhir - $menu->stok_awal;

            $menu->save();
        }
    }

    public function destroyMenu($id) {
        $menu = StokHarianMenu::with('item')->findOrFail($id);
        $nama = $menu->item->nama;
        DB::transaction(function () use ($menu, $nama) {
             $menu->delete();
             ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Hapus Menu Bar', 'description' => "Menghapus menu '{$nama}'."]);
        });
        return back()->with('success', 'Menu dihapus.');
    }

    public function destroyMentah($id) {
        $mentah = StokHarianMentah::with('item')->findOrFail($id);
        $nama = $mentah->item->nama;
        $mentah->delete();
        ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Hapus Mentah Bar', 'description' => "Menghapus mentah '{$nama}'."]);
        return back()->with('success', 'Mentah dihapus.');
    }

    private function canUserInput() {
        $user = Auth::user();
        if (in_array($user->role, ['owner', 'supervisor'])) return true;
        $now = Carbon::now();
        $cutoffTime = Carbon::today()->setTime(21, 0, 0);
        if ($now->lessThan($cutoffTime)) return true;
        return IzinRevisi::where('user_id', $user->id)->where('status', 'approved')->where('start_time', '<=', $now)->where('end_time', '>=', $now)->exists();
    }
}
