<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recipe;
use App\Models\Item;

class DapurStockController extends Controller
{
    public function index()
    {
        $recipes = Recipe::where('division', 'kitchen')
            ->orderBy('name')
            ->get()
            ->map(function ($recipe) {
                return [
                    'id' => $recipe->id,
                    'name' => $recipe->name,
                    'ingredients' => collect($recipe->ingredients)->map(function ($ing) {
                        $item = Item::find($ing['item_id']);

                        return [
                            'item_id' => $ing['item_id'],
                            'amount'  => $ing['amount'],
                            'unit'    => $ing['unit'],
                            'item'    => [
                                'name'   => $item?->nama,
                                'satuan' => $item?->satuan,
                            ],
                        ];
                    })->values(),
                ];
            });

        return response()->json($recipes);
    }
}
