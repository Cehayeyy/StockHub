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

        // Standardisasi format untuk query agar tidak tabrakan format dengan SQLite
        $tanggalFormatted = Carbon::parse($tanggal)->startOfDay()->toDateTimeString();

        // 🔥 LOGIKA PENTING: Cegah generate data masa depan
        if ($tanggal <= $today) {
            $this->ensureStokExists($tanggalFormatted);
            
            // Fix: Reset is_submitted yang salah di-set
            // Hanya reset jika user belum pernah input pemakaian (stok_keluar masih 0)
            StokHarianDapurMenu::where('tanggal', $tanggalFormatted)
                ->where('is_submitted', true)
                ->where('stok_keluar', 0)
                ->update(['is_submitted' => false]);
        }

        if ($tab === 'menu') {
            $query = StokHarianDapurMenu::with('recipe')->where('tanggal', $tanggalFormatted);

            if ($search) {
                $query->whereHas('recipe', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            }

            $items = $query->orderByDesc('id')->paginate(10)->through(function ($s) {
                return [
                    'id'           => $s->id,
                    'recipe_id'    => $s->recipe_id,
                    'nama'         => $s->recipe->name ?? '-',
                    'satuan'       => $s->unit ?? 'porsi',
                    'stok_awal'    => $s->stok_awal,
                    'stok_masuk'   => $s->stok_masuk,
                    'stok_total'   => $s->stok_awal + $s->stok_masuk,
                    'pemakaian'    => $s->stok_keluar,
                    'tersisa'      => $s->stok_akhir,
                    'is_submitted' => $s->is_submitted,
                ];
            })->withQueryString();
        } else {
            $query = StokHarianDapurMentah::with('item')->where('tanggal', $tanggalFormatted);

            if ($search) {
                $query->whereHas('item', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            }

            $items = $query->orderByDesc('id')->paginate(10)->through(fn ($s) => [
                'id'           => $s->id,
                'item_id'      => $s->item_id,
                'nama'         => $s->item->nama ?? '-',
                'satuan'       => $s->unit ?? ($s->item->satuan ?? 'unit'),
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
            $this->ensureStokExists($tanggalFormatted); // PENTING: Paksa hitung ulang

            if ($tab === 'menu') {
                $inputableMenus = StokHarianDapurMenu::with('recipe')
                    ->where('tanggal', $tanggalFormatted)->get()
                    ->map(fn ($s) => [
                        'id'         => $s->recipe_id,
                        'recipe_id'  => $s->recipe_id,
                        'nama'       => $s->recipe->name ?? '-',
                        'satuan'     => $s->unit,
                        'stok_awal'  => (float)$s->stok_akhir,
                        'tersisa'    => (float)$s->stok_akhir,
                        'pemakaian'  => (float)$s->stok_keluar
                    ]);
            } else {
                $inputableMenus = StokHarianDapurMentah::with('item')
                    ->where('tanggal', $tanggalFormatted)->get()
                    ->map(fn ($s) => [
                        'id' => $s->item_id, 'nama' => $s->item->nama ?? '-', 'stok_awal' => (float)$s->stok_akhir
                    ]);
            }
        }

        $lowMentah = StokHarianDapurMentah::with('item')
            ->where('tanggal', $tanggalFormatted)
            ->where('stok_akhir', '<', 7)
            ->get()->toBase()
            ->map(fn($i) => ['nama' => $i->item->nama ?? '-', 'tersisa' => $i->stok_akhir, 'kategori' => 'Bahan Mentah']);

        $lowMenu = StokHarianDapurMenu::with('recipe')
            ->where('tanggal', $tanggalFormatted)
            ->where('stok_akhir', '<', 7)
            ->get()->toBase()
            ->map(fn($i) => ['nama' => $i->recipe->name ?? '-', 'tersisa' => $i->stok_akhir, 'kategori' => 'Menu']);

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
        $formattedDateString = Carbon::parse($tanggal)->toDateString();

        // =========================================================================
        // 1. GENERATE & SINKRONISASI AMAN STOK MENTAH DAPUR
        // =========================================================================
        $recipes = Recipe::where('division', 'dapur')->get();
        $allIngredients = $recipes->pluck('ingredients')->flatten(1);
        $ingredientIds = $allIngredients->pluck('item_id')->unique();

        foreach ($ingredientIds as $itemId) {
            if (!$itemId) continue;
            $itemInfo = Item::find($itemId);
            if ($itemInfo) {
                $lastMentah = StokHarianDapurMentah::where('item_id', $itemId)
                                ->whereDate('tanggal', '<', $formattedDateString)
                                ->orderBy('tanggal', 'desc')
                                ->first();
                $stokKemarin = $lastMentah ? (float)$lastMentah->stok_akhir : 0;

                $mentah = StokHarianDapurMentah::firstOrCreate(
                    ['item_id' => $itemId, 'tanggal' => Carbon::parse($tanggal)->startOfDay()->toDateTimeString()],
                    ['stok_awal' => $stokKemarin, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => $stokKemarin, 'unit' => $itemInfo->satuan ?? 'unit']
                );

                if ($mentah->stok_awal == 0 && $stokKemarin > 0 && $mentah->stok_masuk == 0 && $mentah->stok_keluar == 0) {
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
            $lastMenu = StokHarianDapurMenu::where('recipe_id', $recipe->id)
                            ->whereDate('tanggal', '<', $formattedDateString)
                            ->orderBy('tanggal', 'desc')
                            ->first();
            $sisaMenuKemarin = $lastMenu ? (float)$lastMenu->stok_akhir : 0;

            $kapasitasAwalPagi = 0;
            if (is_array($recipe->ingredients)) {
                $minCap = 999999;
                foreach ($recipe->ingredients as $ing) {
                    $ingId = $ing['item_id'] ?? null;
                    $amt = $ing['amount'] ?? 0;
                    if (!$ingId || $amt == 0) continue;

                    $raw = StokHarianDapurMentah::where('item_id', $ingId)->where('tanggal', Carbon::parse($tanggal)->startOfDay()->toDateTimeString())->first();
                    if ($raw) {
                        $cap = floor($raw->stok_awal / $amt);
                        $minCap = min($minCap, $cap);
                    } else { $minCap = 0; break; }
                }
                $kapasitasAwalPagi = ($minCap === 999999) ? 0 : $minCap;
            }

            $stokAwalFixed = (is_array($recipe->ingredients) && count($recipe->ingredients) > 0) ? $kapasitasAwalPagi : $sisaMenuKemarin;

            $menu = StokHarianDapurMenu::firstOrCreate(
                ['recipe_id' => $recipe->id, 'tanggal' => Carbon::parse($tanggal)->startOfDay()->toDateTimeString()],
                ['stok_awal' => $stokAwalFixed, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => $stokAwalFixed, 'unit' => 'porsi', 'user_id' => $userId, 'is_submitted' => false]
            );

            if ($menu->stok_awal != $stokAwalFixed) {
                $menu->stok_awal = $stokAwalFixed;
                $menu->stok_akhir = ($stokAwalFixed + $menu->stok_masuk) - $menu->stok_keluar;
                $menu->save();
            }
        }
    }

    public function storeMenu(Request $request)
    {
        if (!$this->canUserInput($request->tanggal)) {
            return back()->withErrors(['pemakaian' => 'Akses ditutup! Harap ajukan revisi untuk input kembali.']);
        }

        $request->validate([
            'tanggal' => 'required|date',
            'items'   => 'required|array',
            'items.*.item_id'   => 'required|exists:recipes,id', 
            'items.*.pemakaian' => 'required|numeric|min:0.01'
        ]);

        $tanggalFormatted = Carbon::parse($request->tanggal)->startOfDay()->toDateTimeString();

        try {
            DB::transaction(function () use ($request, $tanggalFormatted) {
                foreach ($request->items as $row) {
                    $recipeId = $row['item_id']; 
                    $delta    = (float)$row['pemakaian'];

                    if ($delta <= 0) continue;

                    $recipe = Recipe::find($recipeId);
                    $menu = StokHarianDapurMenu::firstOrCreate(
                        ['recipe_id' => $recipeId, 'tanggal' => $tanggalFormatted],
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]
                    );

                    $currentKeluar = (float)$menu->stok_keluar;
                    $menu->stok_keluar = $currentKeluar + $delta;

                    $totalTersedia = (float)$menu->stok_awal + (float)$menu->stok_masuk;
                    $menu->stok_akhir = $totalTersedia - $menu->stok_keluar;

                    $menu->is_submitted = true;
                    $menu->user_id = Auth::id();
                    $menu->save();

                    if ($recipe && is_array($recipe->ingredients)) {
                        foreach ($recipe->ingredients as $ing) {
                            $qty = $delta * (float)($ing['amount'] ?? 0);
                            $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $tanggalFormatted])->first();
                            if ($mentah) {
                                $mentah->stok_keluar = (float)$mentah->stok_keluar + $qty;
                                $mentah->stok_akhir = ((float)$mentah->stok_awal + (float)$mentah->stok_masuk) - $mentah->stok_keluar;
                                $mentah->save();
                                $this->distributeStockToMenus($mentah->item_id, 0, $tanggalFormatted);
                            }
                        }
                    }
                    ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Input Dapur', 'description' => "Input borongan '{$recipe->name}': {$delta}"]);
                }

                IzinRevisi::where('user_id', Auth::id())
                    ->where('status', 'approved')
                    ->update(['status' => 'used']);
            });

            return back()->with('success', 'Berhasil! Data dapur tersimpan dan card tertutup.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
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

        $tanggalFormatted = Carbon::parse($request->tanggal)->startOfDay()->toDateTimeString();

        try {
            DB::transaction(function () use ($request, $tanggalFormatted) {
                foreach ($request->items as $row) {
                    $itemId = $row['item_id'];
                    $awal   = (float)$row['stok_awal'];
                    $masuk  = (float)($row['stok_masuk'] ?? 0); 

                    $mentah = StokHarianDapurMentah::firstOrNew([
                        'item_id' => $itemId,
                        'tanggal' => $tanggalFormatted
                    ]);

                    $mentah->stok_awal = $awal;
                    $mentah->stok_masuk = $masuk;
                    $mentah->stok_akhir = ($awal + $masuk) - (float)$mentah->stok_keluar;
                    $mentah->save();

                    $this->distributeStockToMenus($itemId, 0, $tanggalFormatted);
                }
                ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Input Mentah Dapur', 'description' => "Input borongan stok mentah dapur"]);
            });

            return back()->with('success', 'Stok bahan mentah berhasil disimpan.');
        } catch (\Exception $e) {
            return back()->withErrors(['stok_awal' => 'Gagal simpan: ' . $e->getMessage()]);
        }
    }

    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianDapurMenu::with('recipe')->findOrFail($id);
        $newKeluar = $request->input('stok_keluar') ?? $request->input('pemakaian') ?? $menu->stok_keluar;

        DB::transaction(function () use ($request, $menu, $newKeluar) {
            $delta = $newKeluar - $menu->stok_keluar;

            $menu->stok_keluar = $newKeluar;
            $menu->stok_akhir = $menu->stok_awal + $menu->stok_masuk - $newKeluar;
            $menu->is_submitted = 1;
            $menu->save();

            if ($delta != 0) {
                $recipe = $menu->recipe;
                if ($recipe && is_array($recipe->ingredients)) {
                    foreach ($recipe->ingredients as $ing) {
                        $qty = $delta * (float)($ing['amount'] ?? 0);
                        if ($qty == 0) continue;

                        $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $menu->tanggal])->first();
                        if ($mentah) {
                            $mentah->update([
                                'stok_keluar' => max(0, $mentah->stok_keluar + $qty),
                                'stok_akhir' => max(0, $mentah->stok_awal + $mentah->stok_masuk - ($mentah->stok_keluar + $qty))
                            ]);
                            $this->distributeStockToMenus($mentah->item_id, 0, $menu->tanggal);
                        }
                    }
                }
            }
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Update Menu Dapur', 'description' => "Update penjualan '{$menu->item->nama}'. Terjual: {$newKeluar}."]);
        });
        return back()->with('success', 'Data diperbarui.');
    }

    public function updateMentah(Request $request, $id)
    {
        $request->validate([
            'stok_awal' => 'required|numeric',
        ]);

        $mentah = StokHarianDapurMentah::findOrFail($id);

        DB::transaction(function () use ($request, $mentah) {
            $awalBaru = (float) $request->stok_awal;
            $masukBaru = (float) ($request->stok_masuk ?? $mentah->stok_masuk);
            $stokAkhirBaru = ($awalBaru + $masukBaru) - $mentah->stok_keluar;

            DB::table('stok_harian_dapur_mentah')
                ->where('id', $mentah->id)
                ->update([
                    'stok_awal' => $awalBaru,
                    'stok_masuk' => $masukBaru,
                    'stok_akhir' => $stokAkhirBaru,
                    'updated_at' => now(),
                ]);

            $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);
        });

        return back()->with('success', 'Koreksi Stok Mentah Dapur Berhasil Disimpan (Super Override).');
    }

    private function distributeStockToMenus($rawItemId, $dummy, $date)
    {
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

            $minCapAwal = 999999;  
            $minCapTotal = 999999; 
            $minCapSisa = 999999;  

            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amt = $ing['amount'] ?? 0;
                if (!$ingId || $amt == 0) continue;

                $raw = StokHarianDapurMentah::where('item_id', $ingId)->where('tanggal', $date)->first();
                if ($raw) {
                    $capAwal = floor($raw->stok_awal / $amt);
                    $minCapAwal = min($minCapAwal, $capAwal);

                    $rawTotalAvailable = $raw->stok_awal + $raw->stok_masuk;
                    $capTotal = floor($rawTotalAvailable / $amt);
                    $minCapTotal = min($minCapTotal, $capTotal);

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

            $menu->stok_awal = $minCapAwal;
            $menu->stok_masuk = max(0, $minCapTotal - $minCapAwal);

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

        $alreadySubmitted = StokHarianDapurMenu::where('tanggal', Carbon::parse($tanggal)->startOfDay()->toDateTimeString())
            ->where('user_id', $user->id)
            ->where('is_submitted', true)
            ->exists();

        if ($alreadySubmitted) return false;

        if ($now->greaterThanOrEqualTo($cutoffTime)) {
            return false;
        }

        return true;
    }

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