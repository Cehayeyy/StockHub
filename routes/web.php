<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\UserController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\ItemController;
<<<<<<< HEAD
use App\Http\Controllers\DapurController;
use App\Http\Controllers\Api\DapurStockController;
=======
use App\Http\Controllers\StokHarianController;
>>>>>>> f3e34ffe17b26e872d31fe27bd4dc0bad3bdaea9

/*
|--------------------------------------------------------------------------
| PUBLIC
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

/*
|--------------------------------------------------------------------------
| AUTHENTICATED
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {

<<<<<<< HEAD
    /*
    |--------------------------------------------------------------------------
    | DASHBOARD
    |--------------------------------------------------------------------------
    */
=======
    // ===========================
    // DASHBOARD
    // ===========================
>>>>>>> f3e34ffe17b26e872d31fe27bd4dc0bad3bdaea9
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

<<<<<<< HEAD
    /*
    |--------------------------------------------------------------------------
    | MANAJEMEN AKUN
    |--------------------------------------------------------------------------
    */
    Route::get('/manajemen-akun', [UserController::class, 'index'])
        ->name('manajemen');

    Route::post('/users', [UserController::class, 'store'])
        ->name('users.store');

    Route::put('/manajemen/{id}', [UserController::class, 'update'])
        ->name('manajemen.update');

    Route::delete('/manajemen-akun/{id}', [UserController::class, 'destroy'])
        ->name('manajemen.destroy');

    /*
    |--------------------------------------------------------------------------
    | MASTER DATA
    |--------------------------------------------------------------------------
    */
=======
    // ===========================
    // MANAJEMEN AKUN
    // ===========================
    Route::get('/manajemen-akun', [UserController::class, 'index'])->name('manajemen');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::put('/manajemen/{id}', [UserController::class, 'update'])->name('manajemen.update');
    Route::delete('/manajemen-akun/{id}', [UserController::class, 'destroy'])->name('manajemen.destroy');

    // ===========================
    // MASTER DATA
    // ===========================
>>>>>>> f3e34ffe17b26e872d31fe27bd4dc0bad3bdaea9
    Route::get('/masterdata', function () {
        return Inertia::render('MasterData/Index');
    })->name('masterdata');

    // KATEGORI
<<<<<<< HEAD
    Route::get('/kategori', [ItemController::class, 'kategoriIndex'])
        ->name('kategori');

    Route::post('/kategori', [ItemController::class, 'kategoriStore'])
        ->name('kategori.store');

    Route::delete('/kategori/{itemCategory}', [ItemController::class, 'destroyCategory'])
        ->name('kategori.destroy');

    // ITEM
    Route::get('/item', [ItemController::class, 'index'])
        ->name('item.index');

    Route::post('/item', [ItemController::class, 'store'])
        ->name('item.store');

    Route::put('/item/{item}', [ItemController::class, 'update'])
        ->name('item.update');

    Route::delete('/item/{item}', [ItemController::class, 'destroy'])
        ->name('item.destroy');

    /*
    |--------------------------------------------------------------------------
    | RESEP
    |--------------------------------------------------------------------------
    */
    Route::get('/resep', [RecipeController::class, 'index'])
        ->name('resep');

    Route::post('/resep', [RecipeController::class, 'store'])
        ->name('resep.store');

    Route::get('/resep/{recipe}', [RecipeController::class, 'show'])
        ->name('resep.show');

    Route::get('/resep/{recipe}/edit', [RecipeController::class, 'edit'])
        ->name('resep.edit');

    Route::put('/resep/{recipe}', [RecipeController::class, 'update'])
        ->name('resep.update');

    Route::delete('/resep/{recipe}', [RecipeController::class, 'destroy'])
        ->name('resep.destroy');

    /*
    |--------------------------------------------------------------------------
    | STOK HARIAN
    |--------------------------------------------------------------------------
    */

    // BAR
    Route::get('/stok-harian/bar', function () {
        return Inertia::render('StokHarian/Bar');
    })->name('stok-harian.bar');

    // DAPUR (PAGE)
    Route::get('/stok-harian/dapur', function () {
        return Inertia::render('StokHarian/Dapur');
    })->name('stok-harian.dapur');

    // DAPUR (INPUT MENU / STEP L)
    Route::post(
        '/stok-harian/dapur/menu',
        [DapurController::class, 'storeOrUpdate']
    )->name('stok-harian.dapur.menu.store');

    // API DAPUR → dipakai React (axios)
    Route::get(
        '/dapur/stok-harian',
        [DapurStockController::class, 'index']
    );

    /*
    |--------------------------------------------------------------------------
    | LAPORAN AKTIVITAS
    |--------------------------------------------------------------------------
    */
=======
    Route::get('/kategori', [ItemController::class, 'kategoriIndex'])->name('kategori');
    Route::post('/kategori', [ItemController::class, 'kategoriStore'])->name('kategori.store');
    Route::delete('/kategori/{itemCategory}', [ItemController::class, 'destroyCategory'])->name('kategori.destroy');

    // ITEM
    Route::get('/item', [ItemController::class, 'index'])->name('item.index');
    Route::post('/item', [ItemController::class, 'store'])->name('item.store');
    Route::put('/item/{item}', [ItemController::class, 'update'])->name('item.update');
    Route::delete('/item/{item}', [ItemController::class, 'destroy'])->name('item.destroy');

    // ===========================
    // RESEP
    // ===========================
    Route::get('/resep', [RecipeController::class, 'index'])->name('resep');
    Route::post('/resep', [RecipeController::class, 'store'])->name('resep.store');
    Route::get('/resep/{recipe}', [RecipeController::class, 'show'])->name('resep.show');
    Route::get('/resep/{recipe}/edit', [RecipeController::class, 'edit'])->name('resep.edit');
    Route::put('/resep/{recipe}', [RecipeController::class, 'update'])->name('resep.update');
    Route::delete('/resep/{recipe}', [RecipeController::class, 'destroy'])->name('resep.destroy');

    // ===========================
    // STOK HARIAN
    // ===========================

    // VIEW (SEMUA ROLE)
    Route::get('/stok-harian/bar', [StokHarianController::class, 'bar'])
    ->name('stok-harian.bar');

    Route::get('/stok-harian/dapur', [StokHarianController::class, 'dapur'])
    ->name('stok-harian.dapur');

    // ===========================
    // INPUT STOK AWAL
    // OWNER & SUPERVISOR ONLY
    // ===========================
    Route::middleware(['role:owner,supervisor'])->group(function () {

        Route::post('/stok-harian/menu', [StokHarianController::class, 'storeMenu'])
            ->name('stok-harian-menu.store');

        Route::post('/stok-harian/mentah', [StokHarianController::class, 'storeMentah'])
            ->name('stok-harian-mentah.store');
    });

     Route::post('/stok-harian/menu', [StokHarianController::class, 'storeMenu'])
            ->name('stok-harian-menu.store');

        Route::post('/stok-harian/mentah', [StokHarianController::class, 'storeMentah'])
            ->name('stok-harian-mentah.store');


    // ===========================
    // LAPORAN AKTIVITAS
    // ===========================
>>>>>>> f3e34ffe17b26e872d31fe27bd4dc0bad3bdaea9
    Route::get('/laporan-aktivitas', [ActivityLogController::class, 'index'])
        ->name('laporan-aktivitas');

    Route::get('/laporan-aktivitas/export', [ActivityLogController::class, 'export'])
        ->name('laporan-aktivitas.export');
});

/*
|--------------------------------------------------------------------------
<<<<<<< HEAD
| OTHER ROUTES
|--------------------------------------------------------------------------
*/
require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
=======
| AUTH & SETTINGS
|--------------------------------------------------------------------------
*/
require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
>>>>>>> f3e34ffe17b26e872d31fe27bd4dc0bad3bdaea9
