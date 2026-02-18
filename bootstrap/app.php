<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\CheckInputTime;
use App\Http\Middleware\TimeRestrictedAccess; // Import class middleware baru
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {

        // Middleware WEB
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // ALIAS MIDDLEWARE
        $middleware->alias([
            'role' => CheckRole::class,
            'checkInputTime' => CheckInputTime::class,

            // 👇 Alias lama (jika masih dipakai di tempat lain)
            'night.lock' => TimeRestrictedAccess::class,

            // 👇 Alias BARU yang kita gunakan di web.php untuk kunci jam 21:00
            'time.restricted' => TimeRestrictedAccess::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();
