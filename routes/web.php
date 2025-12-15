<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\UserController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\DapurController;
use App\Http\Controllers\Api\DapurStockController;

/*
|--------------------------------------------------------------------------
| PUBLIC
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    return Inertia::render('LandingPage');
})->name('home');

/*
|--------------------------------------------------------------------------
| AUTHENTICATED
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | DASHBOARD
    |--------------------------------------------------------------------------
    */
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

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
    Route::get('/masterdata', function () {
        return Inertia::render('MasterData/Index');
    })->name('masterdata');

    // KATEGORI
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
    Route::get('/laporan-aktivitas', [ActivityLogController::class, 'index'])
        ->name('laporan-aktivitas');

    Route::get('/laporan-aktivitas/export', [ActivityLogController::class, 'export'])
        ->name('laporan-aktivitas.export');
});

/*
|--------------------------------------------------------------------------
| OTHER ROUTES
|--------------------------------------------------------------------------
*/
require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
