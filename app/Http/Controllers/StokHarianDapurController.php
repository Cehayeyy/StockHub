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

        // 🔥 LOGIKA PENTING: Cegah generate data masa depan
        if ($tanggal <= $today) {
            $this->ensureStokExists($tanggal);
        }

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
        // Cegah input dropdown jika masa depan
        if ($tanggal <= $today) {
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

        return Inertia::render('StokHarian/Dapur', [
            'items'          => $items,
            'tab'            => $tab,
            'tanggal'        => $tanggal,
            'availableMenus' => [],
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

        if (!StokHarianDapurMenu::whereDate('tanggal', $tanggal)->exists()) {
            $recipes = Recipe::where('division', 'dapur')->get();
            foreach ($recipes as $recipe) {
                $sisaMenuKemarin = StokHarianDapurMenu::where('recipe_id', $recipe->id)->where('tanggal', $kemarin)->value('stok_akhir') ?? 0;

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

                // 🔥 LOGIKA PERHITUNGAN BARU (Mencegah Double Counting) 🔥
                if (is_array($recipe->ingredients) && count($recipe->ingredients) > 0) {
                    // Jika Menu Racikan (Dapur biasanya racikan semua): Stok Awal = Kapasitas Mentah
                    $stokAwalFixed = $kapasitasAwalPagi;
                } else {
                    // Jaga-jaga jika ada barang jadi (non-racikan)
                    $stokAwalFixed = $sisaMenuKemarin;
                }

                StokHarianDapurMenu::firstOrCreate(['recipe_id' => $recipe->id, 'tanggal' => $tanggal], [
                    'stok_awal' => $stokAwalFixed,
                    'stok_masuk' => 0,
                    'stok_keluar' => 0,
                    'stok_akhir' => $stokAwalFixed,
                    'unit' => 'porsi',
                    'user_id' => $userId
                ]);
            }
        }
    }

    public function storeMenu(Request $request)
    {
        if (!$this->canUserInput($request->tanggal)) abort(403, 'Akses ditutup.');

        $data = $request->validate([
            'recipe_id' => 'required|exists:recipes,id', 'tanggal' => 'required|date', 'pemakaian' => 'required|numeric|min:0'
        ]);

        DB::transaction(function () use ($data) {
            $menu = StokHarianDapurMenu::firstOrCreate(['recipe_id' => $data['recipe_id'], 'tanggal' => $data['tanggal']],
                ['stok_awal' => 0, 'stok_masuk' => 0, 'stok_keluar' => 0, 'stok_akhir' => 0]);

            $delta = $data['pemakaian'];
            $menu->stok_keluar = $menu->stok_keluar + $delta;
            $menu->stok_akhir = max(0, $menu->stok_awal + $menu->stok_masuk - $menu->stok_keluar);
            $menu->is_submitted = 1;
            $menu->user_id = Auth::id();
            $menu->save();

            $recipe = Recipe::find($data['recipe_id']);
            if ($recipe && is_array($recipe->ingredients) && $delta != 0) {
                foreach ($recipe->ingredients as $ing) {
                    $qty = $delta * ($ing['amount'] ?? 0);
                    $mentah = StokHarianDapurMentah::where('item_id', $ing['item_id'])->whereDate('tanggal', $data['tanggal'])->first();
                    if ($mentah) {
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir = max(0, $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar);
                        $mentah->save();
                        $this->distributeStockToMenus($mentah->item_id, 0, $data['tanggal']);
                    }
                }
            }
            ActivityLog::create(['user_id' => Auth::id(), 'activity' => 'Input Pemakaian Dapur', 'description' => "Input pemakaian '{$recipe->name}'"]);
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

        DB::transaction(function () use ($request, $menu, $newKeluar) {
            $delta = $newKeluar - $menu->stok_keluar;
            $menu->stok_keluar = $newKeluar;
            $menu->is_submitted = 1;
            $menu->save();

            if (is_array($menu->recipe->ingredients) && $delta != 0) {
                foreach ($menu->recipe->ingredients as $ing) {
                    $qty = $delta * ($ing['amount'] ?? 0);
                    $mentah = StokHarianDapurMentah::where(['item_id' => $ing['item_id'], 'tanggal' => $menu->tanggal])->first();
                    if ($mentah) {
                        $mentah->stok_keluar = max(0, $mentah->stok_keluar + $qty);
                        $mentah->stok_akhir = max(0, $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar);
                        $mentah->save();
                        $this->distributeStockToMenus($mentah->item_id, 0, $menu->tanggal);
                    }
                }
            }
        });
        return back()->with('success', 'Data diperbarui.');
    }

    public function updateMentah(Request $request, $id)
    {
        $mentah = StokHarianDapurMentah::with('item')->findOrFail($id);
        $masuk = $request->stok_masuk ?? 0;
        $mentah->update(['stok_awal' => $request->stok_awal, 'stok_masuk' => $masuk, 'stok_akhir' => $request->stok_awal + $masuk - $mentah->stok_keluar]);
        $this->distributeStockToMenus($mentah->item_id, 0, $mentah->tanggal);
        return back()->with('success', 'Stok diperbarui.');
    }

    private function distributeStockToMenus($rawItemId, $dummy, $date)
    {
        $recipes = Recipe::where('division', 'dapur')->whereJsonContains('ingredients', [['item_id' => (int)$rawItemId]])->get();
        if ($recipes->isEmpty()) return;

        $targetMenus = StokHarianDapurMenu::whereIn('recipe_id', $recipes->pluck('id'))->where('tanggal', $date)->get();

        foreach ($targetMenus as $menu) {
            $recipe = Recipe::find($menu->recipe_id);
            if (!$recipe || !is_array($recipe->ingredients)) continue;

            $minCapReal = 999999;
            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amt = $ing['amount'] ?? 0;
                if (!$ingId || $amt == 0) continue;

                $raw = StokHarianDapurMentah::where('item_id', $ingId)->where('tanggal', $date)->first();
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

        if ($now->greaterThanOrEqualTo($cutoffTime)) {
            return false;
        }

        return true;
    }
}
