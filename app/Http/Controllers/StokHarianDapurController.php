<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Recipe;
use App\Models\DailyMenuStock;
use App\Models\DailyRawStock;

class StokHarianDapurController extends Controller
{
    // =========================
    // VIEW DAPUR
    // =========================
    public function index(Request $request)
    {
        $tab     = $request->tab ?? 'menu';
        $search  = $request->search;
        $tanggal = $request->tanggal ?? now()->toDateString();

        if ($tab === 'menu') {
            $items = DailyMenuStock::with('recipe')
                ->whereDate('date', $tanggal)
                ->when($search, function ($q) use ($search) {
                    $q->whereHas('recipe', fn ($r) =>
                        $r->where('name', 'like', "%{$search}%")
                    );
                })
                ->orderByDesc('id')
                ->paginate(10)
                ->through(fn ($s) => [
                    'id'         => $s->recipe_id,
                    'nama'       => $s->recipe->name,
                    'satuan'     => 'porsi',
                    'stok_awal'  => $s->stok_awal,
                    'stok_masuk' => $s->stok_masuk,
                    'stok_total' => $s->stok_total,
                    'pemakaian'  => $s->pemakaian,
                    'tersisa'    => $s->sisa,
                ]);
        } else {
            $items = DailyRawStock::with('item')
                ->whereDate('date', $tanggal)
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
                    'stok_total' => $s->stok_total,
                    'pemakaian'  => $s->pemakaian,
                    'tersisa'    => $s->sisa,
                ]);
        }

        return Inertia::render('StokHarian/Dapur', [
            'items'    => $items,
            'tab'      => $tab,
            'division' => 'dapur',
            'tanggal'  => $tanggal,
        ]);
    }

    // =========================
    // INPUT STOK AWAL MENU
    // =========================
    public function storeMenu(Request $request)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:recipes,id',
            'tanggal'   => 'required|date',
            'stok_awal' => 'required|numeric|min:0',
        ]);

        DailyMenuStock::updateOrCreate(
            [
                'recipe_id' => $data['item_id'],
                'date'      => $data['tanggal'],
            ],
            [
                'stok_awal'  => $data['stok_awal'],
                'stok_masuk' => 0,
                'stok_total' => $data['stok_awal'],
                'pemakaian'  => 0,
                'sisa'       => $data['stok_awal'],
            ]
        );

        return back()->with('success', 'Stok awal menu dapur berhasil disimpan');
    }

    // =========================
    // INPUT STOK AWAL MENTAH
    // =========================
    public function storeMentah(Request $request)
    {
        $data = $request->validate([
            'item_id'   => 'required|exists:items,id',
            'tanggal'   => 'required|date',
            'stok_awal' => 'required|numeric|min:0',
        ]);

        DailyRawStock::updateOrCreate(
            [
                'item_id' => $data['item_id'],
                'date'    => $data['tanggal'],
            ],
            [
                'stok_awal'  => $data['stok_awal'],
                'stok_masuk' => 0,
                'stok_total' => $data['stok_awal'],
                'pemakaian'  => 0,
                'sisa'       => $data['stok_awal'],
            ]
        );

        return back()->with('success', 'Stok awal bahan dapur berhasil disimpan');
    }
}
