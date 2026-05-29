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

        // Standardisasi format untuk query agar tidak tabrakan format dengan SQLite
        $tanggalFormatted = Carbon::parse($tanggal)->startOfDay()->toDateTimeString();

        // 🌟 LOGIKA PENTING:
        // Hanya generate/hitung stok jika tanggal yang dilihat adalah HARI INI atau MASA LALU.
        if ($tanggal <= $today) {
            $this->ensureStokExists($tanggalFormatted);

            // Fix: Reset is_submitted yang salah di-set
            StokHarianMenu::where('tanggal', $tanggalFormatted)
                ->where('is_submitted', true)
                ->where('stok_keluar', 0)
                ->update(['is_submitted' => false]);
        }

        if ($tab === 'menu') {
            $query = StokHarianMenu::with('item')->where('tanggal', $tanggalFormatted);

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
            $query = StokHarianMentah::with('item')->where('tanggal', $tanggalFormatted);

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
        if ($tanggal <= $today) {
            $this->ensureStokExists($tanggalFormatted);

            if ($tab === 'menu') {
                $inputableMenus = StokHarianMenu::with('item')
                    ->where('tanggal', $tanggalFormatted)
                    ->get()
                    ->map(fn ($s) => [
                        'id'         => $s->item_id,
                        'nama'       => $s->item->nama,
                        'satuan'     => $s->unit,
                        'stok_awal'  => (float)$s->stok_akhir, 
                        'tersisa'    => (float)$s->stok_akhir,
                        'pemakaian'  => (float)$s->stok_keluar
                    ]);
            } else {
                $inputableMenus = StokHarianMentah::with('item')
                    ->where('tanggal', $tanggalFormatted)
                    ->get()
                    ->map(fn ($s) => [
                        'id'         => $s->item_id,
                        'nama'       => $s->item->nama,
                        'satuan'     => $s->unit,
                        'stok_awal'  => (float)$s->stok_akhir,
                        'tersisa'    => (float)$s->stok_akhir
                    ]);
            }
        }

        // Low Stock Logic
        $lowMentah = StokHarianMentah::with('item')->where('tanggal', $tanggalFormatted)->where('stok_akhir', '<', 7)->get()
            ->map(fn($i) => ['nama' => $i->item->nama, 'tersisa' => $i->stok_akhir, 'kategori' => 'Bahan Bar']);
        $lowMenu = StokHarianMenu::with('item')->where('tanggal', $tanggalFormatted)->get()
            ->map(fn($s) => ['nama' => $s->item->nama, 'tersisa' => $s->stok_akhir, 'kategori' => 'Menu Bar'])
            ->filter(fn($item) => $item['tersisa'] < 7)->values();

        $lowStockItems = $lowMentah->concat($lowMenu);

        $canInput = $this->canUserInput($tanggal);
        $canInputMentah = $this->canUserInputMentah($tanggal);

        return Inertia::render('StokHarian/Bar', [
            'items'          => $items,
            'tab'            => $tab,
            'division'       => 'bar',
            'tanggal'        => $tanggal,
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

        // 1. GENERATE & SINKRONISASI AMAN STOK MENTAH BAR
        $recipes = Recipe::where('division', 'bar')->get();
        $allIngredients = $recipes->pluck('ingredients')->flatten(1);
        $ingredientIds = $allIngredients->pluck('item_id')->unique();

        foreach ($ingredientIds as $itemId) {
            if (!$itemId) continue;
            $itemInfo = Item::find($itemId);
            if ($itemInfo) {
                $lastMentah = StokHarianMentah::where('item_id', $itemId)
                                ->whereDate('tanggal', '<', $formattedDateString)
                                ->orderBy('tanggal', 'desc')
                                ->first();
                $stokKemarin = $lastMentah ? (float)$lastMentah->stok_akhir : 0;

                $mentah = StokHarianMentah::firstOrCreate(
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

        // 2. GENERATE & SINKRONISASI AMAN STOK MENU BAR
        foreach ($recipes as $recipe) {
            $menuItem = Item::where('nama', $recipe->name)->where('division', 'bar')->first();
            if ($menuItem) {
                $lastMenu = StokHarianMenu::where('item_id', $menuItem->id)
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

                        $raw = StokHarianMentah::where('item_id', $ingId)->where('tanggal', Carbon::parse($tanggal)->startOfDay()->toDateTimeString())->first();
                        if ($raw) {
                            $cap = floor($raw->stok_awal / $amt);
                            $minCap = min($minCap, $cap);
                        } else { $minCap = 0; break; }
                    }
                    $kapasitasAwalPagi = ($minCap === 999999) ? 0 : $minCap;
                }

                $stokAwalFixed = (is_array($recipe->ingredients) && count($recipe->ingredients) > 0) ? $kapasitasAwalPagi : $sisaMenuKemarin;

                $menu = StokHarianMenu::firstOrCreate(
                    ['item_id' => $menuItem->id, 'tanggal' => Carbon::parse($tanggal)->startOfDay()->toDateTimeString()],
                    ['stok_awal' => $stokAwalFixed, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => $stokAwalFixed, 'unit' => $menuItem->satuan ?? 'porsi', 'user_id' => $userId, 'is_submitted' => false]
                );

                if ($menu->stok_awal != $stokAwalFixed) {
                    $menu->stok_awal = $stokAwalFixed;
                    $menu->stok_akhir = ($stokAwalFixed + $menu->stok_masuk) - $menu->stok_keluar;
                    $menu->save();
                }
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
            'items.*.item_id'   => 'required|exists:items,id',
            'items.*.pemakaian' => 'required|numeric|min:0.01'
        ]);

        $tanggalFormatted = Carbon::parse($request->tanggal)->startOfDay()->toDateTimeString();

        try {
            DB::transaction(function () use ($request, $tanggalFormatted) {
                foreach ($request->items as $row) {
                    $itemId = $row['item_id'];
                    $delta  = (float)$row['pemakaian']; 

                    if ($delta <= 0) continue;

                    $item = Item::find($itemId);
                    $menu = StokHarianMenu::firstOrCreate(
                        ['item_id' => $itemId, 'tanggal' => $tanggalFormatted],
                        ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]
                    );

                    $currentKeluar = (float)$menu->stok_keluar;
                    $menu->stok_keluar = $currentKeluar + $delta;

                    $totalTersedia = (float)$menu->stok_awal + (float)$menu->stok_masuk;
                    $menu->stok_akhir = $totalTersedia - $menu->stok_keluar;

                    $menu->is_submitted = true;
                    $menu->user_id = Auth::id();
                    $menu->save();

                    $recipe = Recipe::where('name', $item->nama)->first() ?? Recipe::where('item_id', $itemId)->first();
                    if ($recipe && is_array($recipe->ingredients)) {
                        foreach ($recipe->ingredients as $ing) {
                            $qty = $delta * (float)($ing['amount'] ?? 0);
                            $mentah = StokHarianMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $tanggalFormatted])->first();
                            if ($mentah) {
                                $mentah->stok_keluar = (float)$mentah->stok_keluar + $qty;
                                $mentah->stok_akhir = ((float)$mentah->stok_awal + (float)$mentah->stok_masuk) - $mentah->stok_keluar;
                                $mentah->save();
                                $this->distributeStockToMenus($mentah->item_id, 0, $tanggalFormatted);
                            }
                        }
                    }
                    ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Input Bar', 'description' => "Input borongan '{$item->nama}': {$delta}"]);
                }

                IzinRevisi::where('user_id', Auth::id())
                    ->where('status', 'approved')
                    ->update(['status' => 'used']);
            });

            return back()->with('success', 'Berhasil! Data tersimpan dan card tertutup.');

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
                    $masuk  = isset($row['stok_masuk']) ? (float)$row['stok_masuk'] : 0;

                    $mentah = StokHarianMentah::firstOrNew([
                        'item_id' => $itemId,
                        'tanggal' => $tanggalFormatted
                    ]);

                    $mentah->stok_awal = $awal;
                    $mentah->stok_masuk = $masuk;
                    $mentah->stok_akhir = ($awal + $masuk) - (float)$mentah->stok_keluar;
                    $mentah->save();

                    $this->distributeStockToMenus($itemId, 0, $tanggalFormatted);
                }

                ActivityLog::create([
                    'user_id' => Auth::id(),
                    'activity' => 'Input Mentah',
                    'description' => "Input borongan stok mentah"
                ]);
            });

            return back()->with('success', 'Stok bahan mentah berhasil disimpan.');

        } catch (\Exception $e) {
            return back()->withErrors(['stok_awal' => 'Gagal simpan: ' . $e->getMessage()]);
        }
    }

    public function updateMenu(Request $request, $id)
    {
        $menu = StokHarianMenu::with('item')->findOrFail($id);
        $newKeluar = $request->input('stok_keluar') ?? $request->input('pemakaian') ?? $menu->stok_keluar;
        
        DB::transaction(function () use ($request, $menu, $newKeluar) {
            $delta = $newKeluar - $menu->stok_keluar;
            $menu->stok_keluar = $newKeluar;
            $menu->stok_akhir = $menu->stok_awal + $menu->stok_masuk - $newKeluar;
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
        $request->validate([
            'stok_awal' => 'required|numeric',
        ]);

        $mentah = StokHarianMentah::findOrFail($id);

        DB::transaction(function () use ($request, $mentah) {
            $awalBaru = (float) $request->stok_awal;
            $masukBaru = (float) ($request->stok_masuk ?? $mentah->stok_masuk);
            $stokAkhirBaru = ($awalBaru + $masukBaru) - $mentah->stok_keluar;

            DB::table('stok_harian_mentah')
                ->where('id', $mentah->id)
                ->update([
                    'stok_awal' => $awalBaru,
                    'stok_masuk' => $masukBaru,
                    'stok_akhir' => $stokAkhirBaru,
                    'updated_at' => now(),
                ]);

            $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);
        });

        return back()->with('success', 'Koreksi Stok Mentah Berhasil Disimpan (Super Override).');
    }

    private function distributeStockToMenus($rawItemId, $dummy, $date)
    {
        $recipes = Recipe::all()->filter(function ($recipe) use ($rawItemId) {
            if (!is_array($recipe->ingredients)) return false;
            foreach ($recipe->ingredients as $ing) {
                if (isset($ing['item_id']) && $ing['item_id'] == $rawItemId) return true;
            }
            return false;
        });
        if ($recipes->isEmpty()) return;

        $menuItems = Item::whereIn('nama', $recipes->pluck('name'))->get();
        $targetMenus = StokHarianMenu::whereIn('item_id', $menuItems->pluck('id'))
            ->where('tanggal', $date)
            ->get();

        foreach ($targetMenus as $menu) {
            $recipe = Recipe::where('name', $menu->item->nama)->first();
            if (!$recipe) $recipe = Recipe::where('item_id', $menu->item_id)->first();
            if (!$recipe || !is_array($recipe->ingredients)) continue;

            $minCapAwal = 999999;  
            $minCapTotal = 999999; 
            $minCapSisa = 999999;  

            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amt = $ing['amount'] ?? 0;
                if (!$ingId || $amt == 0) continue;

                $raw = StokHarianMentah::where('item_id', $ingId)->where('tanggal', $date)->first();

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

        $alreadySubmitted = StokHarianMenu::where('tanggal', Carbon::parse($tanggal)->startOfDay()->toDateTimeString())
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