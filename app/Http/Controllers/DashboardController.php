<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Item;
use App\Models\Recipe;
use App\Models\ItemCategory;
use App\Models\User;
use App\Models\IzinRevisi;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $today = Carbon::today()->toDateString();

        // ================= 1. AUTO UPDATE STATUS =================
        if ($user->role === 'bar') {
            DB::table('stok_harian_menu')
                ->whereDate('tanggal', $today)
                ->where('user_id', $user->id)
                ->update(['is_submitted' => true]);
        } elseif (in_array($user->role, ['dapur', 'kitchen', 'staff_kitchen'])) {
            try {
                DB::table('stok_harian_dapur_menu')
                    ->whereDate('tanggal', $today)
                    ->where('user_id', $user->id)
                    ->update(['is_submitted' => true]);
            } catch (\Exception $e) {
                // Ignore if the table is not ready
            }
        }

        // ================= 2. CHECK STATUS INPUT TODAY =================
        $alreadyInputToday = false;
        if ($user->role === 'bar') {
            $alreadyInputToday = DB::table('stok_harian_menu')
                ->whereDate('tanggal', $today)
                ->where('user_id', $user->id)
                ->where('is_submitted', true)
                ->exists();
        } elseif (in_array($user->role, ['dapur', 'kitchen', 'staff_kitchen'])) {
            try {
                $alreadyInputToday = DB::table('stok_harian_dapur_menu')
                    ->whereDate('tanggal', $today)
                    ->where('user_id', $user->id)
                    ->where('is_submitted', true)
                    ->exists();
            } catch (\Exception $e) {
                // Ignore if the table is not ready
            }
        }

        // ✅ FIX: Log::info sekarang akan berfungsi
        Log::info('Dashboard Access', [
            'user' => $user->name,
            'role' => $user->role,
            'alreadyInputToday' => $alreadyInputToday
        ]);

        // ================= 3. HITUNG STATISTIK BAR =================
        $barMenu = DB::table('stok_harian_menu')
            ->whereDate('tanggal', $today)
            ->where('user_id', $user->id)
            ->count();

        $barMenuHabis = DB::table('stok_harian_menu')
            ->whereDate('tanggal', $today)
            ->where('user_id', $user->id)
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

        // ================= 4. HITUNG STATISTIK DAPUR =================
        $dapurMenu = 0;
        $dapurMenuHabis = 0;
        $dapurMentah = 0;
        $dapurMentahHabis = 0;

        // Bungkus try-catch agar Dashboard tidak error total jika tabel dapur belum ada
        try {
            $dapurMenu = DB::table('stok_harian_dapur_menu')->whereDate('tanggal', $today)->count();

            $dapurMenuHabis = DB::table('stok_harian_dapur_menu')
                ->whereDate('tanggal', $today)
                ->where('stok_akhir', '>', 0)
                ->where('stok_akhir', '<=', 5)
                ->count();

            $dapurMentah = DB::table('stok_harian_dapur_mentah')->whereDate('tanggal', $today)->count();

            $dapurMentahHabis = DB::table('stok_harian_dapur_mentah')
                ->whereDate('tanggal', $today)
                ->where('stok_akhir', '>', 0)
                ->where('stok_akhir', '<=', 5)
                ->count();
        } catch (\Exception $e) {
            // Tabel dapur belum siap, nilai tetap 0
        }

        // ================= 5. TOTAL DATA =================
        $totalStokHarian = $barMenu + $barMentah + $dapurMenu + $dapurMentah;
        $stokHampirHabis = $barMenuHabis + $barMentahHabis + $dapurMenuHabis + $dapurMentahHabis;

        // ================= 6. IZIN REVISI =================
        $izinRevisiPending = DB::table('izin_revisi')
            ->join('users', 'izin_revisi.user_id', '=', 'users.id')
            ->where('izin_revisi.status', 'pending')
            ->select(
                'izin_revisi.id',
                'users.name',
                'users.role'
            )
            ->get();

        $izinPending = IzinRevisi::where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        // ================= 7. DATA PREPARATION =================
        $data = [
            'totalItem'         => Item::count(),
            'totalResep'        => Recipe::count(),
            'totalKategori'     => ItemCategory::count(),
            'totalUser'         => User::count(),
            'izinRevisiPending' => $izinRevisiPending,
            'totalStokHarian'   => $totalStokHarian,
            'stokHampirHabis'   => $stokHampirHabis,
            'alreadyInputToday' => $alreadyInputToday,
            'izinPending'       => $izinPending,
            'flash'             => [
                'success' => session('success'),
                'error'   => session('error'),
            ],
        ];

        // ================= 8. RETURN VIEW =================

        // Jika Supervisor / Owner
        if (in_array($user->role, ['owner', 'supervisor'])) {
            return Inertia::render('Dashboard', $data);
        }

        // Jika Staff (Bar / Dapur / Kitchen)
        if (in_array($user->role, ['bar', 'dapur', 'kitchen', 'staff_kitchen'])) {
            return Inertia::render('DashboardStaff', array_merge($data, [
                'alreadyRequestedRevision' => $izinPending,
            ]));
        }

        // Fallback View
        return Inertia::render('DashboardStaff', $data);
    }
}
