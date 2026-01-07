<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Item;
use App\Models\Recipe;
use App\Models\ItemCategory;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\IzinRevisi;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // ================= TAMBAHAN STOK HARIAN =================
        $today = Carbon::today()->toDateString();
        $alreadyInputToday = false;

        if ($user->role === 'bar') {
            $alreadyInputToday = DB::table('stok_harian_menu')
                ->whereDate('tanggal', $today)
                ->where('user_id', $user->id)
                ->where('is_submitted', true)
                ->exists();
        }


        if ($user->role === 'dapur' || $user->role === 'kitchen') {
            $alreadyInputToday = DB::table('stok_harian_dapur_menu')
                ->whereDate('tanggal', $today)
                ->where('user_id', $user->id)
                ->where('is_submitted', true)
                ->exists();
        }




        // BAR
        $barMenu = DB::table('stok_harian_menu')
        ->whereDate('tanggal', $today)
        ->count();

    $barMenuHabis = DB::table('stok_harian_menu')
        ->whereDate('tanggal', $today)
        ->where('stok_akhir', '>', 0)
        ->where('stok_akhir', '<=', 5)
        ->count();


        $barMentah = DB::table('stok_harian_mentah')
        ->whereDate('tanggal', $today)
        ->count();

    $barMentahHabis = DB::table('stok_harian_mentah')
        ->whereDate('tanggal', $today)
        ->where('stok_akhir', '>', 0)
        ->where('stok_akhir', '<=', 5)
        ->count();


        // DAPUR
        $dapurMenu = DB::table('stok_harian_dapur_menu')
        ->whereDate('tanggal', $today)
        ->count();

    $dapurMenuHabis = DB::table('stok_harian_dapur_menu')
        ->whereDate('tanggal', $today)
        ->where('stok_akhir', '>', 0)
        ->where('stok_akhir', '<=', 5)
        ->count();


        $dapurMentah = DB::table('stok_harian_dapur_mentah')
        ->whereDate('tanggal', $today)
        ->count();

    $dapurMentahHabis = DB::table('stok_harian_dapur_mentah')
        ->whereDate('tanggal', $today)
        ->where('stok_akhir', '>', 0)
        ->where('stok_akhir', '<=', 5)
        ->count();


        $totalStokHarian =
            $barMenu + $barMentah + $dapurMenu + $dapurMentah;

        $stokHampirHabis =
            $barMenuHabis + $barMentahHabis + $dapurMenuHabis + $dapurMentahHabis;
        // ================= END TAMBAHAN =================

        // ================= IZIN REVISI =================
        $izinRevisiPending = DB::table('izin_revisi')
        ->join('users', 'izin_revisi.user_id', '=', 'users.id')
        ->where('izin_revisi.status', 'pending')
        ->select(
            'izin_revisi.id',
            'users.name',
            'users.role'
        )
        ->get();


        $data = [
            'totalItem'     => Item::count(),
            'totalResep'    => Recipe::count(),
            'totalKategori' => ItemCategory::count(),
            'totalUser'     => User::count(),
            'izinRevisiPending' => $izinRevisiPending,
            'totalStokHarian' => $totalStokHarian,
            'stokHampirHabis' => $stokHampirHabis,
            'alreadyInputToday' => $alreadyInputToday,

        ];

        // ================= SUPERVISOR / OWNER =================
        if (in_array($user->role, ['owner', 'supervisor'])) {
            return Inertia::render('Dashboard', array_merge($data, [
                'totalUser' => User::count(),
            ]));
        }

        // ================= STAFF (BAR / DAPUR) =================
        if (in_array($user->role, ['bar', 'dapur', 'kitchen', 'staff_kitchen'])) {
            return Inertia::render('DashboardStaff', array_merge($data, [
                'alreadyInputToday' => $alreadyInputToday,
                'flash' => [
                    'success' => session('success'),
                ],

    ]));
        }


        // ================= FALLBACK =================
        abort(403, 'Role tidak dikenali');

        $izinRevisiPending = IzinRevisi::with('user')
    ->where('status', 'pending')
    ->latest()
    ->get();
    }
}
