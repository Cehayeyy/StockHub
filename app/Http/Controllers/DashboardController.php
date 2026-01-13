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

        // ================= 1. CHECK STATUS INPUT HARI INI =================
        $alreadyInputToday = false;

        if ($user->role === 'bar') {
            // Cek tabel Bar
            $alreadyInputToday = DB::table('stok_harian_menu')
                ->whereDate('tanggal', $today)
                ->where('user_id', $user->id)
                ->where('is_submitted', 1)
                ->exists();

        } elseif (in_array($user->role, ['dapur', 'kitchen', 'staff_kitchen'])) {
            // Cek tabel Dapur
            // Kita bungkus try-catch agar tidak error jika tabel belum ada (saat migrasi awal)
            try {
                // Cek apakah ada setidaknya satu item menu yang sudah disubmit oleh user ini hari ini
                $alreadyInputToday = DB::table('stok_harian_dapur_menu')
                    ->whereDate('tanggal', $today)
                    ->where('user_id', $user->id) // Sesuai dengan update di StokHarianDapurController
                    ->where('is_submitted', 1)
                    ->exists();
            } catch (\Exception $e) {
                $alreadyInputToday = false;
            }
        }

        // ================= 2. HITUNG STATISTIK BAR =================
        $barMenu = DB::table('stok_harian_menu')->whereDate('tanggal', $today)->count();
        $barMenuHabis = DB::table('stok_harian_menu')
            ->whereDate('tanggal', $today)
            ->where('stok_akhir', '>', 0)
            ->where('stok_akhir', '<=', 5)
            ->count();

        $barMentah = DB::table('stok_harian_mentah')->whereDate('tanggal', $today)->count();
        $barMentahHabis = DB::table('stok_harian_mentah')
            ->whereDate('tanggal', $today)
            ->where('stok_akhir', '>', 0)
            ->where('stok_akhir', '<=', 5)
            ->count();

        // ================= 3. HITUNG STATISTIK DAPUR =================
        $dapurMenu = 0;
        $dapurMenuHabis = 0;
        $dapurMentah = 0;
        $dapurMentahHabis = 0;

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
            // Ignore if table not found
        }

        // ================= 4. TOTAL DATA =================
        $totalStokHarian = $barMenu + $barMentah + $dapurMenu + $dapurMentah;
        $stokHampirHabis = $barMenuHabis + $barMentahHabis + $dapurMenuHabis + $dapurMentahHabis;

        // ================= 5. IZIN REVISI =================
        $izinRevisiPending = DB::table('izin_revisi')
            ->join('users', 'izin_revisi.user_id', '=', 'users.id')
            ->where('izin_revisi.status', 'pending')
            ->select('izin_revisi.id', 'users.name', 'users.role')
            ->get();

        $izinPending = IzinRevisi::where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        // ================= 6. DATA PREPARATION =================
        $data = [
            'totalItem'         => Item::count(),
            'totalResep'        => Recipe::count(),
            'totalKategori'     => ItemCategory::count(),
            'totalUser'         => User::count(),
            'izinRevisiPending' => $izinRevisiPending,
            'totalStokHarian'   => $totalStokHarian,
            'stokHampirHabis'   => $stokHampirHabis,
            'alreadyInputToday' => $alreadyInputToday, // Variabel penting untuk mengubah tampilan Dashboard
            'izinPending'       => $izinPending,
            'flash'             => [
                'success' => session('success'),
                'error'   => session('error'),
            ],
        ];

        // ================= 7. RETURN VIEW =================

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
