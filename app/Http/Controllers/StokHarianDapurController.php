<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\StokHarianDapurMenu;
use App\Models\StokHarianDapurMentah;
use App\Models\Recipe;
use App\Models\Item;
use App\Models\ActivityLog;
use App\Models\IzinRevisi;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class StokHarianDapurController extends Controller
{
    public function dapur(Request $request)
    {
        $tab     = $request->get('tab', 'menu');
        $search  = $request->input('search');
        $tanggal = $request->get('tanggal', Carbon::now()->toDateString());

        // 1. Generate Data Harian
        $this->ensureStokExists($tanggal);

        // 2. Query Data
        if ($tab === 'menu') {
            $query = StokHarianDapurMenu::with('recipe')
                ->whereDate('tanggal', $tanggal);

            if ($search) {
                $query->whereHas('recipe', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            }

            $items = $query->orderByDesc('id')->paginate(10)->through(function ($s) {
                return [
                    'id'         => $s->id,
                    'recipe_id'  => $s->recipe_id,
                    'nama'       => $s->recipe->name,
                    'satuan'     => $s->unit,
                    'stok_awal'  => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $s->stok_akhir,
                ];
            })->withQueryString();
        } else {
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
            ])->withQueryString();
        }

        // 3. Dropdown Data (Shared)
        $inputableMenus = [];
        if ($tab === 'menu') {
            $inputableMenus = StokHarianDapurMenu::with('recipe')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn ($s) => [
                    'id'        => $s->recipe_id,
                    'nama'      => $s->recipe->name,
                    'satuan'    => $s->unit,
                    'stok_awal' => $s->stok_awal,
                    'tersisa'   => $s->stok_akhir,
                    'pemakaian' => $s->stok_keluar
                ]);
        } else {
            $inputableMenus = StokHarianDapurMentah::with('item')
                ->whereDate('tanggal', $tanggal)
                ->get()
                ->map(fn ($s) => [
                    'id'        => $s->item_id,
                    'nama'      => $s->item->nama,
                    'satuan'    => $s->unit,
                    'stok_awal' => $s->stok_awal,
                    'tersisa'   => $s->stok_akhir
                ]);
        }

        // 4. Low Stock Logic
        $lowMentah = StokHarianDapurMentah::with('item')
            ->whereDate('tanggal', $tanggal)
            ->where('stok_akhir', '<', 7)
            ->get()->toBase()
            ->map(fn($i) => ['nama' => $i->item->nama, 'tersisa' => $i->stok_akhir, 'kategori' => 'Bahan Mentah']);

        $lowMenu = StokHarianDapurMenu::with('recipe')
            ->whereDate('tanggal', $tanggal)
            ->where('stok_akhir', '<', 7)
            ->get()->toBase()
            ->map(fn($i) => ['nama' => $i->recipe->name, 'tersisa' => $i->stok_akhir, 'kategori' => 'Menu']);

        $lowStockItems = $lowMentah->merge($lowMenu);

        // Cek apakah user bisa input
      $canInput = $this->canUserInput($tanggal);

        return Inertia::render('StokHarian/Dapur', [
            'items'          => $items,
            'tab'            => $tab,
            'tanggal'        => $tanggal,
            'availableMenus' => [],
            'inputableMenus' => $inputableMenus,
            'lowStockItems'  => $lowStockItems,
            'canInput'       => $this->canUserInput($tanggal), // Tambah parameter $tanggal
        'isPastCutoff'   => Carbon::now()->greaterThan(Carbon::today()->setTime(21, 0, 0)), // Tambah ini
            'search'         => $search, // 🔥 PENTING: Kirim parameter search ke frontend
        ]);
    }

    // --- AUTO GENERATE DATA ---
    private function ensureStokExists($tanggal)
    {
        $userId = Auth::id();
        $kemarin = Carbon::parse($tanggal)->subDay()->toDateString();

        // A. Generate Mentah
        $existsMentah = StokHarianDapurMentah::whereDate('tanggal', $tanggal)->exists();
        if (!$existsMentah) {
            $recipes = Recipe::where('division', 'dapur')->get();
            $ingredientIds = collect();
            foreach($recipes as $r) {
                if(is_array($r->ingredients)) {
                    foreach($r->ingredients as $ing) {
                        if(isset($ing['item_id'])) $ingredientIds->push($ing['item_id']);
                    }
                }
            }

            foreach ($ingredientIds->unique() as $itemId) {
                $itemInfo = Item::find($itemId);
                if ($itemInfo) {
                    $stokKemarin = StokHarianDapurMentah::where('item_id', $itemId)->where('tanggal', $kemarin)->value('stok_akhir') ?? 0;
                    StokHarianDapurMentah::firstOrCreate(['item_id' => $itemId, 'tanggal' => $tanggal], [
                        'stok_awal' => $stokKemarin, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => $stokKemarin, 'unit' => $itemInfo->satuan ?? 'unit'
                    ]);
                }
            }
        }

        // B. Generate Menu
        if (!StokHarianDapurMenu::whereDate('tanggal', $tanggal)->exists()) {
            $recipes = Recipe::where('division', 'dapur')->get();
            foreach ($recipes as $recipe) {
                StokHarianDapurMenu::firstOrCreate(['recipe_id' => $recipe->id, 'tanggal' => $tanggal], [
                    'stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0, 'unit' => 'porsi', 'user_id' => $userId
                ]);
            }

            // Trigger perhitungan awal
            if (!$existsMentah) {
                $allMentah = StokHarianDapurMentah::where('tanggal', $tanggal)->get();
                foreach($allMentah as $m) $this->distributeStockToMenus($m->item_id, 0, $tanggal);
            }
        }
    }

    // --- STORE MENU ---
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'recipe_id' => 'required|exists:recipes,id', 'tanggal' => 'required|date', 'pemakaian' => 'required|numeric|min:0'
        ]);

        DB::transaction(function () use ($data) {
            $menu = StokHarianDapurMenu::firstOrCreate(['recipe_id' => $data['recipe_id'], 'tanggal' => $data['tanggal']],
                ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]);

            // ✅ PERBAIKAN: Accumulate pemakaian, bukan mengganti
            $delta = $data['pemakaian']; // Delta adalah nilai input (penambahan)
            $menu->stok_keluar = $menu->stok_keluar + $delta; // Tambah ke nilai existing
            $menu->stok_akhir = max(0, $menu->stok_awal + $menu->stok_masuk - $menu->stok_keluar);
            $menu->is_submitted = 1;
            $menu->user_id = Auth::id();
            $menu->save();

            $recipe = Recipe::find($data['recipe_id']);
            if ($recipe && is_array($recipe->ingredients) && $delta != 0) {
                foreach ($recipe->ingredients as $ing) {
                    $qty = $delta * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    $mentah = StokHarianDapurMentah::where('item_id', $ing['item_id'])->whereDate('tanggal', $data['tanggal'])->first();
                    if ($mentah) {
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir = max(0, $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar);
                        $mentah->save();

                        // 🔥 RECALCULATE: Update Capacity because Raw Material decreased
                        $this->distributeStockToMenus($mentah->item_id, 0, $data['tanggal']);
                    }
                }
            }
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Input Pemakaian Dapur', 'description' => "Input pemakaian '{$recipe->name}': {$data['pemakaian']} porsi."]);
            IzinRevisi::where('user_id', Auth::id())->where('status', 'approved')->where('end_time', '>', Carbon::now())->update(['status' => 'used']);
        });
        return back()->with('success', 'Stok harian berhasil disimpan!');
    }

    public function storeMentah(Request $request)
    {
        $data = $request->validate(['item_id' => 'required|exists:items,id', 'tanggal' => 'required|date', 'stok_awal' => 'required|numeric|min:0', 'stok_masuk' => 'nullable|numeric|min:0']);

        DB::transaction(function () use ($data) {
            $mentah = StokHarianDapurMentah::firstOrNew(['item_id' => $data['item_id'], 'tanggal' => $data['tanggal']]);
            $masuk = $data['stok_masuk'] ?? 0;
            $mentah->stok_awal = $data['stok_awal'];
            $mentah->stok_masuk = $masuk;
            $mentah->stok_akhir = $data['stok_awal'] + $masuk - $mentah->stok_keluar;
            $mentah->save();

            $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Input Mentah Dapur', 'description' => "Update stok mentah via Input Data."]);
        });
        return back()->with('success', 'Stok bahan mentah disimpan.');
    }

    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);
        $newKeluar = $request->input('stok_keluar') ?? $request->input('pemakaian');
        if (is_null($newKeluar)) return back()->withErrors(['stok_keluar' => 'Jumlah pemakaian harus diisi']);

        DB::transaction(function () use ($request, $menu, $newKeluar) {
            $delta = $newKeluar - $menu->stok_keluar;
            $menu->stok_keluar = $newKeluar;
            $menu->is_submitted = 1;
            $menu->user_id = Auth::id();
            $menu->save();

            if (is_array($menu->recipe->ingredients) && $delta != 0) {
                foreach ($menu->recipe->ingredients as $ing) {
                    $qty = $delta * ($ing['amount'] ?? 0);
                    if ($qty == 0) continue;

                    $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $menu->tanggal])->first();
                    if ($mentah) {
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir = max(0, $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar);
                        $mentah->save();
                        $this->distributeStockToMenus($mentah->item_id, 0, $menu->tanggal);
                    }
                }
            }
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Update Menu Dapur', 'description' => "Update penjualan '{$menu->recipe->name}'. Terjual: {$newKeluar}."]);
        });
        return back()->with('success', 'Produksi disimpan & stok dibagi ulang.');
    }

    public function updateMentah(Request $request, $id)
    {
        $mentah = StokHarianDapurMentah::with('item')->findOrFail($id);
        $masuk = $request->stok_masuk ?? 0;
        $mentah->update(['stok_awal' => $request->stok_awal, 'stok_masuk' => $masuk, 'stok_akhir' => $request->stok_awal + $masuk - $mentah->stok_keluar]);

        $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);
        ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Update Mentah Dapur', 'description' => "Update stok mentah '{$mentah->item->nama}'."]);
        return back()->with('success', 'Stok diperbarui.');
    }

    // 🔥🔥 DISTRIBUSI LOGIC: TOTAL DINAMIS & FAIR SHARE 🔥🔥
    // 1. Fair Share: Stok Mentah dibagi rata ke semua menu aktif.
    // 2. Total Dinamis: Total = Sisa Fisik (Akhir).
    private function distributeStockToMenus($rawItemId, $dummy, $date)
    {
        $recipes = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$rawItemId]])->get();
        if ($recipes->isEmpty()) return;

        $targetMenus = StokHarianDapurMenu::whereIn('recipe_id', $recipes->pluck('id'))->where('tanggal', $date)->get();

        foreach ($targetMenus as $menu) {
            $recipe = Recipe::find($menu->recipe_id);
            if (!$recipe || !is_array($recipe->ingredients)) continue;

            $maxCapAwal = 999999;
            $maxCapReal = 999999;

            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amt = $ing['amount'] ?? 0;
                if (!$ingId || $amt == 0) continue;

                $raw = StokHarianDapurMentah::where('item_id', $ingId)->where('tanggal', $date)->first();
                if ($raw) {
                    // Fair Share Calculation
                    $recipesUsingIngredient = Recipe::whereJsonContains('ingredients', [['item_id' => (int)$ingId]])->pluck('id');
                    $activeCompetitors = StokHarianDapurMenu::whereIn('recipe_id', $recipesUsingIngredient)
                        ->where('tanggal', $date)
                        ->count();
                    $activeCompetitors = max(1, $activeCompetitors);

                    $shareAwal = floor($raw->stok_awal / $activeCompetitors);
                    $shareReal = floor($raw->stok_akhir / $activeCompetitors);

                    $capAwal = floor($shareAwal / $amt);
                    $capReal = floor($shareReal / $amt);

                    $maxCapAwal = min($maxCapAwal, $capAwal);
                    $maxCapReal = min($maxCapReal, $capReal);
                } else {
                    $maxCapAwal = 0; $maxCapReal = 0;
                }
            }

            if ($maxCapAwal === 999999) $maxCapAwal = 0;
            if ($maxCapReal === 999999) $maxCapReal = 0;

            // --- EKSEKUSI UPDATE ---
            $menu->stok_awal = $maxCapAwal;
            $menu->stok_akhir = $maxCapReal;

            // Rumus Masuk agar Total = Akhir
            $menu->stok_masuk = $menu->stok_akhir - $menu->stok_awal;

            $menu->save();
        }
    }

    public function destroyMenu($id) {
        $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);
        $nama = $menu->recipe->name;
        DB::transaction(function () use ($menu, $nama) {
             $menu->delete();
             ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Hapus Menu Dapur', 'description' => "Menghapus menu '{$nama}'."]);
        });
        return back()->with('success', 'Menu dapur dihapus.');
    }

    public function destroyMentah($id) {
        $mentah = StokHarianDapurMentah::with('item')->findOrFail($id);
        $nama = $mentah->item->nama;
        $mentah->delete();
        ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Hapus Mentah Dapur', 'description' => "Menghapus stok mentah '{$nama}'."]);
        return back()->with('success', 'Stok bahan mentah dihapus.');
    }

    private function canUserInput($tanggal) {
    $user = Auth::user();
    $now = Carbon::now();
    $cutoffTime = Carbon::parse($tanggal)->setTime(21, 0, 0);

    // 1. Cek apakah sudah pernah klik 'Simpan' (is_submitted)
    $alreadySubmitted = StokHarianDapurMenu::whereDate('tanggal', $tanggal)
                        ->where('is_submitted', 1)
                        ->exists();

    // Jika Owner/Supervisor, selalu boleh
    if (in_array($user->role, ['owner', 'supervisor'])) return true;

    // 2. Cek Izin Revisi (Prioritas untuk staff)
    $hasIzin = IzinRevisi::where('user_id', $user->id)
                ->where('status', 'approved')
                ->where('start_time', '<=', $now)
                ->where('end_time', '>=', $now)
                ->exists();

    if ($hasIzin) return true;

    // 3. Logic Staff: Mati jika sudah malam ATAU sudah pernah simpan
    if ($now->greaterThan($cutoffTime) || $alreadySubmitted) {
        return false;
    }

    return true;
}
}
