<?php

namespace App\Http\Controllers;

use App\Models\IzinRevisi;
use Illuminate\Http\Request;

class IzinRevisiController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();

        // cegah spam izin
        $exists = IzinRevisi::where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        if ($exists) {
            return back()->with('error', 'Izin revisi masih menunggu persetujuan');
        }

        IzinRevisi::create([
            'user_id' => $user->id,
            'role' => $user->role,
        ]);

        return back()->with('success', 'Permintaan izin revisi dikirim');
    }
}
