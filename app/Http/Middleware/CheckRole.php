<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        if (! auth()->check()) {
            abort(403);
        }

        $userRole = strtolower(trim((string) auth()->user()->role));
        $allowedRoles = array_map(
            fn (string $role) => strtolower(trim($role)),
            $roles
        );

        if (! in_array($userRole, $allowedRoles, true)) {
            abort(403, 'Anda tidak punya akses');
        }

        return $next($request);
    }
}
