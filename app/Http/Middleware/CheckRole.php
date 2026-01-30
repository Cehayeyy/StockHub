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

        if (! in_array(auth()->user()->role, $roles)) {
            abort(403, 'Anda tidak punya akses');
        }

        return $next($request);
    }
}
