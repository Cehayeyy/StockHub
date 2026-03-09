<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use App\Models\IzinRevisi;

class TimeRestrictedAccess
{
    public function handle(Request $request, Closure $next)
    {
        // 1. Cek apakah user sudah login
        if (Auth::check()) {
            $user = Auth::user();

            // 🛡️ Bypass: Jika user adalah 'owner' atau 'supervisor', izinkan semua aksi kapan saja
            if (in_array($user->role, ['owner', 'supervisor'])) {
                return $next($request);
            }

            $now = Carbon::now();

            // 🕒 2. Tentukan rentang waktu kunci malam (21:00 - 23:59)
            // Middleware ini bertugas sebagai "Satpam Jam Malam"
            $startTime = Carbon::today()->setTime(21, 0, 0);
            $endTime = Carbon::today()->setTime(23, 59, 59);

            // 🚫 3. Kondisi Pemblokiran Waktu
            // Jika sekarang sudah lewat jam 21:00, blokir semua aksi perubahan data (POST, PUT, DELETE)
            if ($now->between($startTime, $endTime)) {

                // Aksi GET (melihat halaman) tetap diizinkan
                if (!$request->isMethod('get')) {

                    // ✅ Cek apakah user punya izin revisi aktif
                    $hasActivePermission = IzinRevisi::where('user_id', $user->id)
                        ->where('status', 'approved')
                        ->where('start_time', '<=', $now)
                        ->where('end_time', '>=', $now)
                        ->exists();

                    // Jika punya izin revisi aktif, izinkan aksi
                    if ($hasActivePermission) {
                        return $next($request);
                    }

                    return back()->with('error', 'Waktu operasional berakhir. Input/Edit/Hapus tidak diizinkan setelah pukul 21:00.');
                }
            }

            // CATATAN:
            // Logika pengecekan "Sudah Simpan (Is Submitted)" DIHAPUS dari middleware ini.
            // Alasannya: Agar Tab 'Mentah' tetap bisa diinput meskipun Tab 'Menu' sudah disubmit.
            // Penguncian Tab 'Menu' dilakukan secara spesifik di Controller (storeMenu) dan Frontend.
        }

        return $next($request);
    }
}
