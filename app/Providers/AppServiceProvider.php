<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // PERBAIKAN: Menggunakan 'instance' agar tidak error di VS Code
        // Logikanya: Jika folder ../public_html ditemukan, beri tahu Laravel
        // bahwa 'path.public' yang resmi adalah folder tersebut.

        if (is_dir(base_path('../public_html'))) {
            $this->app->instance('path.public', base_path('../public_html'));
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
