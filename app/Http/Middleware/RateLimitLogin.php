<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RateLimitLogin
{
    public function handle(Request $request, Closure $next)
    {
        $key = 'login_attempts_' . $request->ip();
        $maxAttempts = 5;
        $decayMinutes = 15;

        if (cache()->has($key)) {
            $attempts = cache()->get($key);

            if ($attempts >= $maxAttempts) {
                abort(429, 'Too many login attempts. Please try again in 15 minutes.');
            }

            cache()->put($key, $attempts + 1, now()->addMinutes($decayMinutes));
        } else {
            cache()->put($key, 1, now()->addMinutes($decayMinutes));
        }

        return $next($request);
    }
}
