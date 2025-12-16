<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Recipe;
use App\Models\ItemCategory;
use App\Models\User;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        return Inertia::render('Dashboard', [
            // TOTAL DATA
            'totalItem'     => Item::count(),
            'totalResep'    => Recipe::count(),
            'totalKategori' => ItemCategory::count(),
            'totalUser'     => User::count(),

            // OPTIONAL (kalau nanti dipakai)
            'stokHampirHabis' => Item::where('stok', '<=', 5)->count(),
        ]);
       

    }

}
