<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\UserController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {

<<<<<<< HEAD
    // Dashboard
=======
    /*
    |--------------------------------------------------------------------------
    | Dashboard
    |--------------------------------------------------------------------------
    */
>>>>>>> b2ff960a95917d8dae342da6956ea8387cd97c1f
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

<<<<<<< HEAD
    // Manajemen Akun
=======
    /*
    |--------------------------------------------------------------------------
    | Manajemen Akun
    |--------------------------------------------------------------------------
    */
>>>>>>> b2ff960a95917d8dae342da6956ea8387cd97c1f
    Route::get('/manajemen-akun', [UserController::class, 'index'])
        ->name('manajemen');

    Route::delete('/manajemen-akun/{id}', [UserController::class, 'destroy'])
        ->name('manajemen.destroy');

    Route::post('/users', [UserController::class, 'store'])
        ->name('users.store');

    Route::put('/manajemen/{id}', [UserController::class, 'update'])
        ->name('manajemen.update');

<<<<<<< HEAD



    // MASTER DATA (Parent)
    Route::get('/masterdata', function () {
        return Inertia::render('MasterData/Index');
    })->name('masterdata');

    // Sub menu Master Data
    Route::get('/kategori', function () {
        return Inertia::render('MasterData/Kategori');
    })->name('kategori');

    Route::get('/item', function () {
        return Inertia::render('MasterData/Item');
    })->name('item');

    Route::get('/resep', function () {
        return Inertia::render('MasterData/Resep');
    })->name('resep');
});

// File lain (auth dan settings)
require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
=======
    /*
    |--------------------------------------------------------------------------
    | Master Data
    |--------------------------------------------------------------------------
    */
    Route::get('/masterdata', function () {
        return Inertia::render('masterdata');
    })->name('masterdata');

    /*
    |--------------------------------------------------------------------------
    | Stok Harian (submenu: Bar & Dapur)
    |--------------------------------------------------------------------------
    */
    Route::get('/stok-harian/bar', function () {
        // Pages/StokHarian/Bar.tsx
        return Inertia::render('StokHarian/Bar');
    })->name('stok-harian.bar');

    Route::get('/stok-harian/dapur', function () {
        // Pages/StokHarian/Dapur.tsx
        return Inertia::render('StokHarian/Dapur');
    })->name('stok-harian.dapur');
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
>>>>>>> b2ff960a95917d8dae342da6956ea8387cd97c1f
