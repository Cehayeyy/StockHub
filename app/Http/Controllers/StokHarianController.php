<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\StokHarianMenu;
use App\Models\StokHarianMentah;

class StokHarianController extends Controller
{
    // =========================
    // VIEW BAR
    // =========================
    public function bar(Request $request)
    {
        $tab     = $request->tab ?? 'menu';
        $search  = $request->search;
        $tanggal = $request->tanggal ?? now()->toDateString();

        if ($tab === 'menu') {
            $items = StokHarianMenu::with('item')
                ->whereDate('tanggal', $tanggal)
                ->when($search, function ($q) use ($search) {
                    $q->whereHas('item', fn ($i) =>
                        $i->where('nama', 'like', "%{$search}%")
                    );
                })
                ->orderByDesc('id')
                ->paginate(10)
                ->through(fn ($s) => [
                    'id'         => $s->item_id,
                    'nama'       => $s->item->nama,
                    'satuan'     => $s->item->satuan,
                    'stok_awal'  => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_masuk !== null
                        ? $s->stok_awal + $s->stok_masuk
                        : null,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $s->stok_akhir,
                ]);
        } else {
            $items = StokHarianMentah::with('item')
                ->whereDate('tanggal', $tanggal)
                ->when($search, function ($q) use ($search) {
                    $q->whereHas('item', fn ($i) =>
                        $i->where('nama', 'like', "%{$search}%")
                    );
                })
                ->orderByDesc('id')
                ->paginate(10)
                ->through(fn ($s) => [
                    'id'         => $s->item_id,
                    'nama'       => $s->item->nama,
                    'satuan'     => $s->unit,
                    'stok_awal'  => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_masuk !== null
                        ? $s->stok_awal + $s->stok_masuk
                        : null,
                    'pemakaian'  => $s->stok_keluar,
                    'tersisa'    => $s->stok_akhir,
                ]);
        }

        return Inertia::render('StokHarian/Bar', [
            'items'    => $items,
            'tab'      => $tab,
            'division' => 'bar',
            'tanggal'  => $tanggal,
        ]);
    }

    // =========================
    // STORE MENU
    // (SUPERVISOR / OWNER)
    // =========================
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:items,id',
            'tanggal'   => 'required|date',
            'stok_awal' => 'required|numeric|min:0',
        ]);

        StokHarianMenu::updateOrCreate(
            [
                'item_id' => $data['item_id'],
                'tanggal' => $data['tanggal'],
            ],
            [
                'stok_awal'   => $data['stok_awal'],
                'stok_masuk'  => null,
                'stok_keluar' => null,
                'stok_akhir'  => null,
            ]
        );

        return back()->with('success', 'Stok awal menu berhasil disimpan');
    }

    // =========================
    // STORE MENTAH
    // (SUPERVISOR / OWNER)
    // =========================
    public function storeMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:items,id',
            'tanggal'   => 'required|date',
            'stok_awal' => 'required|numeric|min:0',
        ]);

        StokHarianMentah::updateOrCreate(
            [
                'item_id' => $data['item_id'],
                'tanggal' => $data['tanggal'],
            ],
            [
                'stok_awal'   => $data['stok_awal'],
                'stok_masuk'  => null,
                'stok_keluar' => null,
                'stok_akhir'  => null,
                'unit'        => 'porsi',
            ]
        );

        return back()->with('success', 'Stok awal bahan mentah berhasil disimpan');
    }
}
