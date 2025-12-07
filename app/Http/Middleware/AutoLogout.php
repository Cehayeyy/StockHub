<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;

class AutoLogout
{
    public function handle($request, Closure $next)
    {
        $limit = 10 * 60; // 10 menit

        if (Auth::check()) {
            $last = session('last_activity', time());

            // Jika beda waktu melebihi batas → logout
            if (time() - $last > $limit) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect('/login')->with('error', 'Session expired.');
            }

            // Update waktu terakhir aktivitas
            session(['last_activity' => time()]);
        }

        return $next($request);
    }
}
