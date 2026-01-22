<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\IzinRevisi;
use Illuminate\Support\Facades\Auth;

class CheckInputTime
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();

        // Owner dan Supervisor bisa input kapan saja
        if (in_array($user->role, ['owner', 'supervisor'])) {
            return $next($request);
        }

        // Cek waktu sekarang
        $now = Carbon::now();
        $cutoffTime = Carbon::today()->setTime(21, 0, 0); // 21:00 = 9 malam

        // Jika sudah lewat jam 8 malam
        if ($now->greaterThanOrEqualTo($cutoffTime)) {
            // Cek apakah ada izin revisi aktif
            $hasActivePermission = IzinRevisi::where('user_id', $user->id)
                ->where('status', 'approved')
                ->where('start_time', '<=', $now)
                ->where('end_time', '>=', $now)
                ->exists();

            if (!$hasActivePermission) {
                return back()->with('error', 'Waktu input harian telah ditutup (jam 21:00). Silakan ajukan izin revisi terlebih dahulu.');
            }
        }

        return $next($request);
    }
}
