<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\StokHarianMentah;
use App\Models\StokHarianDapurMentah;
use App\Models\StokHarianMenu;
use App\Models\StokHarianDapurMenu;
use App\Models\ActivityLog;
use App\Models\Recipe;
use App\Models\Item;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class VerifikasiStokController extends Controller
{
    public function index(Request $request)
    {
        $tab = $request->get('tab', 'bar');
        $rawDate = $request->get('tanggal') ?: Carbon::now()->toDateString();

        $targetDate = Carbon::parse($rawDate)->toDateString();

        $stokController = new StokHarianController();
        $dapurController = new StokHarianDapurController();

        if ($targetDate <= Carbon::now()->toDateString()) {
            if ($tab === 'bar') {
                $stokController->ensureStokExists($targetDate);
            } else {
                $dapurController->ensureStokExists($targetDate);
            }
        }

        if ($tab === 'bar') {
            $items = StokHarianMentah::with('item')
                ->whereDate('tanggal', $targetDate)
                ->get()
                ->map(fn($item) => [
                    'id' => $item->id,
                    'nama' => optional($item->item)->nama ?? '-',
                    'satuan' => $item->unit ?? optional($item->item)->satuan ?? 'unit',
                    'stok_sistem' => $item->stok_akhir,
                ]);
        } else {
            $items = StokHarianDapurMentah::with('item')
                ->whereDate('tanggal', $targetDate)
                ->get()
                ->map(fn($item) => [
                    'id' => $item->id,
                    'nama' => optional($item->item)->nama ?? '-',
                    'satuan' => $item->unit ?? optional($item->item)->satuan ?? 'unit',
                    'stok_sistem' => $item->stok_akhir,
                ]);
        }

        return Inertia::render('Verifikasi/VerifikasiStok', [
            'items'          => $items,
            'tab'            => $tab,
            'tanggal_picker' => $targetDate,
            'tanggal_data'   => $targetDate
        ]);
    }

    public function store(Request $request)
    {
        $tab = $request->input('tab', 'bar');
        $tanggal = $request->input('tanggal') ?: Carbon::now()->toDateString();
        $fisikData = $request->input('fisik', []);

        DB::transaction(function () use ($tab, $tanggal, $fisikData) {
            foreach ($fisikData as $id => $stokFisik) {
                $stokFisik = (float)$stokFisik;

                if ($tab === 'bar') {
                    $mentah = StokHarianMentah::find($id);
                    if ($mentah) {
                        // 🔥 Perbaikan Simbol Kurang (-)
                        $stokSistem = $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar;
                        $selisih = $stokFisik - $stokSistem;

                        if ($selisih != 0) {
                            if ($selisih < 0) {
                                $mentah->stok_keluar += abs($selisih);
                            } else {
                                $mentah->stok_masuk += $selisih;
                            }
                            $mentah->stok_akhir = $stokFisik;
                            $mentah->save();
                        }

                        $this->syncMenuBar($mentah->item_id, $mentah->tanggal);

                        $startDate = Carbon::parse($mentah->tanggal)->addDay();
                        $endDate = Carbon::now();
                        $stokEstafet = $stokFisik;

                        for ($date = $startDate; $date->lte($endDate); $date->addDay()) {
                            $currentDateStr = $date->toDateString();

                            $hariIni = StokHarianMentah::firstOrCreate(
                                ['item_id' => $mentah->item_id, 'tanggal' => $currentDateStr],
                                ['stok_masuk' => 0, 'stok_keluar' => 0, 'unit' => $mentah->unit]
                            );

                            $hariIni->stok_awal = $stokEstafet;
                            // 🔥 Perbaikan Simbol Kurang (-)
                            $hariIni->stok_akhir = ($hariIni->stok_awal + $hariIni->stok_masuk) - $hariIni->stok_keluar;
                            $hariIni->save();

                            $this->syncMenuBar($mentah->item_id, $currentDateStr);
                            $stokEstafet = $hariIni->stok_akhir;
                        }
                    }
                } else {
                    $mentah = StokHarianDapurMentah::find($id);
                    if ($mentah) {
                        // 🔥 Perbaikan Simbol Kurang (-)
                        $stokSistem = $mentah->stok_awal + $mentah->stok_masuk - $mentah->stok_keluar;
                        $selisih = $stokFisik - $stokSistem;

                        if ($selisih != 0) {
                            if ($selisih < 0) {
                                $mentah->stok_keluar += abs($selisih);
                            } else {
                                $mentah->stok_masuk += $selisih;
                            }
                            $mentah->stok_akhir = $stokFisik;
                            $mentah->save();
                        }

                        $this->syncMenuDapur($mentah->item_id, $mentah->tanggal);

                        $startDate = Carbon::parse($mentah->tanggal)->addDay();
                        $endDate = Carbon::now();
                        $stokEstafet = $stokFisik;

                        for ($date = $startDate; $date->lte($endDate); $date->addDay()) {
                            $currentDateStr = $date->toDateString();

                            $hariIni = StokHarianDapurMentah::firstOrCreate(
                                ['item_id' => $mentah->item_id, 'tanggal' => $currentDateStr],
                                ['stok_masuk' => 0, 'stok_keluar' => 0, 'unit' => $mentah->unit]
                            );

                            $hariIni->stok_awal = $stokEstafet;
                            // 🔥 Perbaikan Simbol Kurang (-)
                            $hariIni->stok_akhir = ($hariIni->stok_awal + $hariIni->stok_masuk) - $hariIni->stok_keluar;
                            $hariIni->save();

                            $this->syncMenuDapur($mentah->item_id, $currentDateStr);
                            $stokEstafet = $hariIni->stok_akhir;
                        }
                    }
                }
            }
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'activity' => 'Verifikasi Stok',
            'description' => sprintf(
                'Verifikasi stok opname %s pada %s untuk %d item.',
                $tab === 'bar' ? 'bar' : 'dapur',
                Carbon::parse($tanggal)->format('Y-m-d'),
                count($fisikData)
            ),
        ]);

        return back()->with('success', 'Stok berhasil diverifikasi dan disinkronkan ke semua hari!');
    }

    private function syncMenuBar($rawItemId, $date)
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
        $targetMenus = StokHarianMenu::whereIn('item_id', $menuItems->pluck('id'))->where('tanggal', $date)->get();

        foreach ($targetMenus as $menu) {
            $recipe = Recipe::where('name', $menu->item->nama)->first();
            if (!$recipe) $recipe = Recipe::where('item_id', $menu->item_id)->first();
            if (!$recipe || !is_array($recipe->ingredients)) continue;

            $minCapAwal = 999999; $minCapTotal = 999999; $minCapSisa = 999999;
            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amt = $ing['amount'] ?? 0;
                if (!$ingId || $amt == 0) continue;

                $raw = StokHarianMentah::where('item_id', $ingId)->where('tanggal', $date)->first();
                if ($raw) {
                    $minCapAwal = min($minCapAwal, floor($raw->stok_awal / $amt));
                    $minCapTotal = min($minCapTotal, floor(($raw->stok_awal + $raw->stok_masuk) / $amt));
                    $minCapSisa = min($minCapSisa, floor($raw->stok_akhir / $amt));
                } else {
                    $minCapAwal = 0; $minCapTotal = 0; $minCapSisa = 0; break;
                }
            }

            if ($minCapAwal === 999999) $minCapAwal = 0;
            if ($minCapTotal === 999999) $minCapTotal = 0;
            if ($minCapSisa === 999999) $minCapSisa = 0;

            $menu->stok_awal = $minCapAwal;
            // 🔥 Perbaikan Simbol Kurang (-)
            $menu->stok_masuk = max(0, $minCapTotal - $minCapAwal);
            $sisaMatematis = ($menu->stok_awal + $menu->stok_masuk) - $menu->stok_keluar;
            $menu->stok_akhir = min($sisaMatematis, $minCapSisa);
            $menu->save();
        }
    }

    private function syncMenuDapur($rawItemId, $date)
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

            $minCapAwal = 999999; $minCapTotal = 999999; $minCapSisa = 999999;
            foreach ($recipe->ingredients as $ing) {
                $ingId = $ing['item_id'] ?? null;
                $amt = $ing['amount'] ?? 0;
                if (!$ingId || $amt == 0) continue;

                $raw = StokHarianDapurMentah::where('item_id', $ingId)->where('tanggal', $date)->first();
                if ($raw) {
                    $minCapAwal = min($minCapAwal, floor($raw->stok_awal / $amt));
                    $minCapTotal = min($minCapTotal, floor(($raw->stok_awal + $raw->stok_masuk) / $amt));
                    $minCapSisa = min($minCapSisa, floor($raw->stok_akhir / $amt));
                } else {
                    $minCapAwal = 0; $minCapTotal = 0; $minCapSisa = 0; break;
                }
            }

            if ($minCapAwal === 999999) $minCapAwal = 0;
            if ($minCapTotal === 999999) $minCapTotal = 0;
            if ($minCapSisa === 999999) $minCapSisa = 0;

            $menu->stok_awal = $minCapAwal;
            // 🔥 Perbaikan Simbol Kurang (-)
            $menu->stok_masuk = max(0, $minCapTotal - $minCapAwal);
            $sisaMatematis = ($menu->stok_awal + $menu->stok_masuk) - $menu->stok_keluar;
            $menu->stok_akhir = min($sisaMatematis, $minCapSisa);
            $menu->save();
        }
    }

    public function export(Request $request)
    {
        $tab = $request->get('tab', 'bar');
        $rawDate = $request->get('tanggal') ?: Carbon::now()->toDateString();

        $fisikData = json_decode($request->get('fisik', '{}'), true);
        $sistemData = json_decode($request->get('sistem', '{}'), true);
        $catatanData = json_decode($request->get('catatan', '{}'), true);

        $items = $tab === 'bar'
            ? StokHarianMentah::with('item')->whereDate('tanggal', $rawDate)->get()
            : StokHarianDapurMentah::with('item')->whereDate('tanggal', $rawDate)->get();

        $divisionName = $tab === 'bar' ? 'Bar' : 'Dapur';
        
        $filename = "verifikasi-stok-{$tab}-{$rawDate}.xlsx";

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\VerifikasiStokExport($items, $rawDate, $divisionName, $fisikData, $catatanData, $sistemData), 
            $filename
        );
    }
}