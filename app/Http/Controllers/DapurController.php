<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use App\Models\DailyMenuStock;
use App\Models\DailyRawStock;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DapurController extends Controller
{
    public function index(Request $request)
    {
        $date = $request->date
            ? Carbon::parse($request->date)->toDateString()
            : now()->toDateString();

        $menus = Recipe::where('division', 'kitchen')
            ->orderBy('name')
            ->get()
            ->map(function ($recipe) use ($date) {

                $stock = DailyMenuStock::where('recipe_id', $recipe->id)
                    ->where('date', $date)
                    ->first();

                return [
                    'id'         => $recipe->id,
                    'name'       => $recipe->name,
                    'ingredients'=> $recipe->ingredients,
                    'stok_awal'  => $stock?->stok_awal ?? 0,
                    'stok_masuk' => $stock?->stok_masuk ?? 0,
                    'stok_total' => $stock?->stok_total ?? 0,
                    'pemakaian'  => $stock?->pemakaian ?? 0,
                    'sisa'       => $stock?->sisa ?? 0,
                ];
            });

        return response()->json($menus);
    }

    /**
     * STEP L: PRODUKSI MENU → POTONG STOK MENTAH
     */
    public function storeOrUpdate(Request $request)
    {
        $data = $request->validate([
            'recipe_id'  => 'required|exists:recipes,id',
            'date'       => 'required|date',
            'stok_masuk' => 'required|numeric|min:1',
        ]);

        $recipe = Recipe::findOrFail($data['recipe_id']);
        $date   = $data['date'];
        $qty    = $data['stok_masuk'];

        // =====================
        // SIMPAN STOK MENU
        // =====================
        $menuStock = DailyMenuStock::firstOrCreate(
            ['recipe_id' => $recipe->id, 'date' => $date],
            ['stok_awal' => 0]
        );

        $menuStock->stok_masuk += $qty;
        $menuStock->stok_total = $menuStock->stok_awal + $menuStock->stok_masuk;
        $menuStock->sisa       = $menuStock->stok_total - $menuStock->pemakaian;
        $menuStock->save();

        // =====================
        // STEP L: POTONG STOK MENTAH
        // =====================
        foreach ($recipe->ingredients as $ing) {
            $totalPakai = $ing['amount'] * $qty;

            $rawStock = DailyRawStock::firstOrCreate(
                [
                    'item_id' => $ing['item_id'],
                    'date'    => $date,
                ],
                [
                    'stok_awal'  => 0,
                    'stok_masuk' => 0,
                ]
            );

            $rawStock->pemakaian += $totalPakai;
            $rawStock->stok_total = $rawStock->stok_awal + $rawStock->stok_masuk;
            $rawStock->sisa = $rawStock->stok_total - $rawStock->pemakaian;
            $rawStock->save();
        }

        return back()->with('success', 'Produksi menu & stok mentah berhasil diproses');
    }
}
