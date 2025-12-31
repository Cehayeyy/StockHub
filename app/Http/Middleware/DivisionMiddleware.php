<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DivisionMiddleware
{
    public function handle(Request $request, Closure $next, $division)
    {
        $user = Auth::user();

        // Owner & Supervisor boleh akses semua
        if (in_array($user->role, ['owner', 'supervisor'])) {
            return $next($request);
        }

        // Staff hanya boleh sesuai divisinya
        if ($user->role === 'staff' && $user->division === $division) {
            return $next($request);
        }

        abort(403, 'Akses ditolak');
    }
}
