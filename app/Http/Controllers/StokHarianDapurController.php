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

        $today   = Carbon::now()->toDateString();
        $tanggal = $request->get('tanggal', $today);

        // ðŸ”¥ LOGIKA PENTING: Cegah generate data masa depan
        if ($tanggal <= $today) {
            $this->ensureStokExists($tanggal);
            // Fix: Reset is_submitted yang salah di-set
            // Hanya reset jika user belum pernah input pemakaian (stok_keluar masih 0)
            StokHarianDapurMenu::whereDate('tanggal', $tanggal)
                ->where('is_submitted', true)
                ->where('stok_keluar', 0)
                ->update(['is_submitted' => false]);        }

        if ($tab === 'menu') {
            $query = StokHarianDapurMenu::with('recipe')
                ->whereDate('tanggal', $tanggal);

            if ($search) {
                $query->whereHas('recipe', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            }

            $items = $query->orderByDesc('id')->paginate(10)->through(function ($s) {
                return [
                    'id'           => $s->id,
                    'recipe_id'    => $s->recipe_id,
                    'nama'         => $s->recipe->name,
                    'satuan'       => $s->unit,
                    'stok_awal'    => $s->stok_awal,
                    'stok_masuk'   => $s->stok_masuk,
                    'stok_total'   => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'    => $s->stok_keluar,
                    'tersisa'      => $s->stok_akhir,
                    'is_submitted' => $s->is_submitted,
                ];
            })->withQueryString();
        } else {
            $query = StokHarianDapurMentah::with('item')->whereDate('tanggal', $tanggal);

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

            $inputableMenus = [];
    if ($tanggal <= $today) {
        $this->ensureStokExists($tanggal); // PENTING: Paksa hitung ulang

        if ($tab === 'menu') {
            $inputableMenus = StokHarianDapurMenu::with('recipe')
                ->whereDate('tanggal', $tanggal)->get()
                ->map(fn ($s) => [
                    'id'         => $s->recipe_id,
                    'recipe_id'  => $s->recipe_id,
                    'nama'       => $s->recipe->name,
                    'satuan'     => $s->unit,
                    'stok_awal'  => (float)$s->stok_awal,
                    'tersisa'    => (float)$s->stok_akhir,
                    'pemakaian'  => (float)$s->stok_keluar
                ]);
        } else {
            // Bagian mentah tetap seperti aslinya tapi tambahkan (float) pada stok_awal
            $inputableMenus = StokHarianDapurMentah::with('item')
                ->whereDate('tanggal', $tanggal)->get()
                ->map(fn ($s) => [
                    'id' => $s->item_id, 'nama' => $s->item->nama, 'stok_awal' => (float)$s->stok_awal
                ]);
        }
    }

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

        $canInput = $this->canUserInput($tanggal);
        $canInputMentah = $this->canUserInputMentah($tanggal);

        return Inertia::render('StokHarian/Dapur', [
            'items'          => $items,
            'tab'            => $tab,
            'tanggal'        => $tanggal,
            'availableMenus' => [],
            'inputableMenus' => $inputableMenus,
            'lowStockItems'  => $lowStockItems,
            'canInput'       => $canInput,
            'canInputMentah' => $canInputMentah,
            'isPastCutoff'   => Carbon::now()->greaterThan(Carbon::parse($tanggal)->setTime(21, 0, 0)),
            'search'         => $search,
        ]);
    }

    private function ensureStokExists($tanggal)
    {
        $userId = Auth::id();
        $kemarin = Carbon::parse($tanggal)->subDay()->toDateString();

        // =========================================================================
        // 1. GENERATE & SINKRONISASI AMAN STOK MENTAH DAPUR
        // =========================================================================
        $recipes = Recipe::where('division', 'dapur')->get();
        $ingredientIds = collect();
        // Ganti blok looping ingredients di Dapur dengan ini:
        $allIngredients = $recipes->pluck('ingredients')->flatten(1);
        $ingredientIds = $allIngredients->pluck('item_id')->unique();

        foreach ($ingredientIds->unique() as $itemId) {
            $itemInfo = Item::find($itemId);
            if ($itemInfo) {
                $stokKemarin = StokHarianDapurMentah::where('item_id', $itemId)
                                ->where('tanggal', $kemarin)
                                ->value('stok_akhir') ?? 0;

                $mentah = StokHarianDapurMentah::firstOrCreate(
                    ['item_id' => $itemId, 'tanggal' => $tanggal],
                    ['stok_awal' => $stokKemarin, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => $stokKemarin, 'unit' => $itemInfo->satuan ?? 'unit']
                );

                // 🔥 REM PENGAMAN: Hanya tarik otomatis JIKA hari ini BELUM ADA TRANSAKSI 🔥
                if ($mentah->stok_masuk == 0 && $mentah->stok_keluar == 0 && $mentah->stok_awal != $stokKemarin) {
                    $mentah->stok_awal = $stokKemarin;
                    $mentah->stok_akhir = $stokKemarin;
                    $mentah->save();
                }
            }
        }

        // =========================================================================
        // 2. GENERATE & SINKRONISASI AMAN STOK MENU DAPUR
        // =========================================================================
        foreach ($recipes as $recipe) {
            $sisaMenuKemarin = StokHarianDapurMenu::where('recipe_id', $recipe->id)
                                ->where('tanggal', $kemarin)
                                ->value('stok_akhir') ?? 0;

            $kapasitasAwalPagi = 0;
            if (is_array($recipe->ingredients)) {
                $minCap = 999999;
                foreach ($recipe->ingredients as $ing) {
                    $raw = StokHarianDapurMentah::where('item_id', $ing['item_id'])->where('tanggal', $tanggal)->first();
                    if ($raw) {
                        $cap = floor($raw->stok_awal / ($ing['amount'] ?? 1));
                        $minCap = min($minCap, $cap);
                    } else { $minCap = 0; break; }
                }
                $kapasitasAwalPagi = ($minCap === 999999) ? 0 : $minCap;
            }

            if (is_array($recipe->ingredients) && count($recipe->ingredients) > 0) {
                $stokAwalFixed = $kapasitasAwalPagi;
            } else {
                $stokAwalFixed = $sisaMenuKemarin;
            }

            $menu = StokHarianDapurMenu::firstOrCreate(
                ['recipe_id' => $recipe->id, 'tanggal' => $tanggal],
                ['stok_awal' => $stokAwalFixed, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => $stokAwalFixed, 'unit' => 'porsi', 'user_id' => $userId, 'is_submitted' => false]
            );

            // 🔥 REM PENGAMAN MENU DAPUR 🔥
            if ($menu->stok_masuk == 0 && $menu->stok_keluar == 0 && $menu->stok_awal != $stokAwalFixed) {
                $menu->stok_awal = $stokAwalFixed;
                $menu->stok_akhir = $stokAwalFixed;
                $menu->save();
            }
        }
    }

    public function storeMenu(Request $request)
    {
        // 1. Cek izin akses (Pintu Masuk)
        if (!$this->canUserInput($request->tanggal)) {
            return back()->withErrors(['pemakaian' => 'Akses ditutup! Harap ajukan revisi untuk input kembali.']);
        }

        // 2. Validasi Struktur Data Borongan
        $request->validate([
            'tanggal' => 'required|date',
            'items'   => 'required|array',
            'items.*.item_id'   => 'required|exists:recipes,id', // Di Dapur menggunakan recipe_id
            'items.*.pemakaian' => 'required|numeric|min:0.01'
        ]);

        $tanggal = $request->tanggal;

        try {
            DB::transaction(function () use ($request, $tanggal) {
                foreach ($request->items as $row) {
                    $recipeId = $row['item_id']; // ID dari dropdown adalah recipe_id
                    $delta    = (float)$row['pemakaian'];

                    if ($delta <= 0) continue;

                    $recipe = Recipe::find($recipeId);
                    $menu = StokHarianDapurMenu::firstOrCreate(
                        ['recipe_id' => $recipeId, 'tanggal' => $tanggal],
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]
                    );

                    // --- PROSES SIMPAN DATA (Matematis) ---
                    $currentKeluar = (float)$menu->stok_keluar;
                    $menu->stok_keluar = $currentKeluar + $delta;

                    $totalTersedia = (float)$menu->stok_awal + (float)$menu->stok_masuk;
                    $menu->stok_akhir = $totalTersedia - $menu->stok_keluar;

                    $menu->is_submitted = true;
                    $menu->user_id = Auth::id();
                    $menu->save();

                    // --- PROSES POTONG BAHAN MENTAH DAPUR ---
                    if ($recipe && is_array($recipe->ingredients)) {
                        foreach ($recipe->ingredients as $ing) {
                            $qty = $delta * (float)($ing['amount'] ?? 0);
                            $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $tanggal])->first();
                            if ($mentah) {
                                $mentah->stok_keluar = (float)$mentah->stok_keluar + $qty;
                                $mentah->stok_akhir = ((float)$mentah->stok_awal + (float)$mentah->stok_masuk) - $mentah->stok_keluar;
                                $mentah->save();
                                // Update porsi menu matang lain yang menggunakan bahan mentah ini
                                $this->distributeStockToMenus($mentah->item_id, 0, $tanggal);
                            }
                        }
                    }
                    ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Input Dapur', 'description' => "Input borongan '{$recipe->name}': {$delta}"]);
                }

                // 🔥 KUNCI IZIN (Baru dieksekusi setelah looping SELESAI)
                IzinRevisi::where('user_id', Auth::id())
                    ->where('status', 'approved')
                    ->update(['status' => 'used']);
            });

            return back()->with('success', 'Berhasil! Data dapur tersimpan dan card tertutup.');

        } catch (\Exception $e) {
            return back()->withErrors(['pemakaian' => 'Gagal simpan: ' . $e->getMessage()]);
        }
    }

    public function storeMentah(Request $request)
    {
        $request->validate([
            'tanggal' => 'required|date',
            'items'   => 'required|array',
            'items.*.item_id'   => 'required|exists:items,id',
            'items.*.stok_awal' => 'required|numeric|min:0'
        ]);

        try {
            DB::transaction(function () use ($request) {
                foreach ($request->items as $row) {
                    $itemId = $row['item_id'];
                    $awal   = (float)$row['stok_awal'];
                    $masuk  = (float)($row['stok_masuk'] ?? 0);

                    $mentah = StokHarianDapurMentah::firstOrNew([
                        'item_id' => $itemId,
                        'tanggal' => $request->tanggal
                    ]);

                    $mentah->stok_awal = $awal;
                    $mentah->stok_masuk = $masuk;
                    // Hitung stok akhir mentah
                    $mentah->stok_akhir = ($awal + $masuk) - (float)$mentah->stok_keluar;
                    $mentah->save();

                    // Sinkronisasi ke porsi menu matang
                    $this->distributeStockToMenus($itemId, 0, $request->tanggal);
                }
                ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Input Mentah Dapur', 'description' => "Input borongan stok mentah dapur"]);
            });

            return back()->with('success', 'Stok bahan mentah berhasil disimpan.');
        } catch (\Exception $e) {
            return back()->withErrors(['stok_awal' => 'Gagal simpan: ' . $e->getMessage()]);
        }
    }

    public function updateMentah(Request $request, $id)
    {
        // 1. Validasi input
        $request->validate([
            'stok_awal' => 'required|numeric',
        ]);

        $mentah = StokHarianDapurMentah::findOrFail($id);

        DB::transaction(function () use ($request, $mentah) {
            // 2. Ambil nilai baru dari form Edit
            $awalBaru = (float) $request->stok_awal;
            $masukBaru = (float) ($request->stok_masuk ?? $mentah->stok_masuk);

            // 3. Hitung ulang stok akhir secara matematis
            $stokAkhirBaru = ($awalBaru + $masukBaru) - $mentah->stok_keluar;

            // 4. 🔥 SUPER OVERRIDE DAPUR: Tembak langsung ke tabel database
            DB::table('stok_harian_dapur_mentah')
                ->where('id', $mentah->id)
                ->update([
                    'stok_awal' => $awalBaru,
                    'stok_masuk' => $masukBaru,
                    'stok_akhir' => $stokAkhirBaru,
                    'updated_at' => now(),
                ]);

            // 5. Sinkronisasi otomatis ke porsi Menu Matang Dapur
            $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);
        });

        return back()->with('success', 'Koreksi Stok Mentah Dapur Berhasil Disimpan (Super Override).');
    }

    private function distributeStockToMenus($rawItemId, $dummy, $date)
    {
        // Cari resep dapur yang mengandung bahan mentah ini
        // Gunakan PHP filter karena format JSON bisa bervariasi (dengan/tanpa spasi)
        $recipes = Recipe::where('division', 'dapur')->get()->filter(function ($recipe) use ($rawItemId) {
            if (!is_array($recipe->ingredients)) return false;
            foreach ($recipe->ingredients as $ing) {
                if (isset($ing['item_id']) && $ing['item_id'] == $rawItemId) return true;
            }
            return false;
        });
        if ($recipes->isEmpty()) return;

        $targetMenus = StokHarianDapurMenu::whereIn('recipe_id', $recipes->pluck('id'))->where('tanggal', $date)->get();

        foreach ($targetMenus as $menu) {
            $recipe = Recipe::find($menu->recipe_id);
            if (!$recipe || !is_array($recipe->ingredients)) continue;

            // --- ðŸ”¥ UPDATE LOGIKA SINKRONISASI 3 TINGKAT ðŸ”¥ ---
            $minCapAwal = 999999;  // Kapasitas dari Stok Awal Mentah
            $minCapTotal = 999999; // Kapasitas dari (Awal + Masuk) Mentah
            $minCapSisa = 999999;  // Kapasitas Real-time (Sisa Mentah saat ini)

            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amt = $ing['amount'] ?? 0;
                if (!$ingId || $amt == 0) continue;

                $raw = StokHarianDapurMentah::where('item_id', $ingId)->where('tanggal', $date)->first();
                if ($raw) {
                    // 1. Hitung Kapasitas AWAL (Fixed)
                    $capAwal = floor($raw->stok_awal / $amt);
                    $minCapAwal = min($minCapAwal, $capAwal);

                    // 2. Hitung Kapasitas TOTAL (Awal + Belanja)
                    $rawTotalAvailable = $raw->stok_awal + $raw->stok_masuk;
                    $capTotal = floor($rawTotalAvailable / $amt);
                    $minCapTotal = min($minCapTotal, $capTotal);

                    // 3. Hitung Kapasitas SISA (Real-time)
                    $capSisa = floor($raw->stok_akhir / $amt);
                    $minCapSisa = min($minCapSisa, $capSisa);

                } else {
                    $minCapAwal = 0; $minCapTotal = 0; $minCapSisa = 0;
                    break;
                }
            }

            if ($minCapAwal === 999999) $minCapAwal = 0;
            if ($minCapTotal === 999999) $minCapTotal = 0;
            if ($minCapSisa === 999999) $minCapSisa = 0;

            // --- PENERAPAN KE DATABASE ---

            // 1. Stok Awal Menu = Murni dari Stok Awal Mentah
            $menu->stok_awal = $minCapAwal;

            // 2. Stok Masuk Menu = Selisih antara Kapasitas Total dengan Awal
            $menu->stok_masuk = max(0, $minCapTotal - $minCapAwal);

            // 3. Stok Akhir (Tersisa)
            // Ambil yang terkecil antara hitungan sendiri vs sisa mentah aktual
            $sisaMatematis = ($menu->stok_awal + $menu->stok_masuk) - $menu->stok_keluar;
            $menu->stok_akhir = min($sisaMatematis, $minCapSisa);

            $menu->save();
        }
    }

    public function destroyMenu($id) {
        StokHarianDapurMenu::findOrFail($id)->delete();
        return back()->with('success', 'Data dihapus.');
    }

    public function destroyMentah($id) {
        StokHarianDapurMentah::findOrFail($id)->delete();
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

        // Cek apakah sudah pernah input pemakaian menu hari ini
        $alreadySubmitted = StokHarianDapurMenu::whereDate('tanggal', $tanggal)
            ->where('user_id', $user->id)
            ->where('is_submitted', true)
            ->exists();

        if ($alreadySubmitted) return false;

        if ($now->greaterThanOrEqualTo($cutoffTime)) {
            return false;
        }

        return true;
    }

    /**
     * Cek apakah user bisa input mentah (TIDAK terkunci oleh submit menu)
     */
    private function canUserInputMentah($tanggal) {
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
