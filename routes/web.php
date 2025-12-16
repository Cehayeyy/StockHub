<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\UserController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\StokHarianController;

/*
|--------------------------------------------------------------------------
| PUBLIC
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
<<<<<<< HEAD
=======
    // Pastikan file LandingPage.tsx ada di resources/js/pages
>>>>>>> 79955bb44940c55f88a4e72207ac32b8ebd54f26
    return Inertia::render('LandingPage');
})->name('home');

/*
|--------------------------------------------------------------------------
| AUTHENTICATED
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {

    // ===========================
    // DASHBOARD
    // ===========================
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware(['auth'])
        ->name('dashboard');



    // ===========================
    // MANAJEMEN AKUN
    // ===========================
    Route::get('/manajemen-akun', [UserController::class, 'index'])
        ->name('manajemen');

    Route::post('/users', [UserController::class, 'store'])
        ->name('users.store');

    Route::put('/manajemen/{id}', [UserController::class, 'update'])
        ->name('manajemen.update');

    Route::delete('/manajemen-akun/{id}', [UserController::class, 'destroy'])
        ->name('manajemen.destroy');

    // ===========================
    // MASTER DATA (INDEX)
    // ===========================
    Route::get('/masterdata', function () {
        return Inertia::render('MasterData/Index');
    })->name('masterdata');

    // ===========================
    // KATEGORI
    // ===========================
    Route::get('/kategori', [ItemController::class, 'kategoriIndex'])
        ->name('kategori');

    Route::post('/kategori', [ItemController::class, 'kategoriStore'])
        ->name('kategori.store');

    Route::delete('/kategori/{itemCategory}', [ItemController::class, 'destroyCategory'])
        ->name('kategori.destroy');

    // ===========================
    // ITEM
    // ===========================
    Route::get('/item', [ItemController::class, 'index'])
        ->name('item.index');

    Route::post('/item', [ItemController::class, 'store'])
        ->name('item.store');

    Route::put('/item/{item}', [ItemController::class, 'update'])
        ->name('item.update');

    Route::delete('/item/{item}', [ItemController::class, 'destroy'])
        ->name('item.destroy');

    // ===========================
    // RESEP
    // ===========================
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

    // ===========================
    // STOK HARIAN (VIEW)
    // ===========================
    Route::get('/stok-harian/bar', [StokHarianController::class, 'bar'])
        ->name('stok-harian.bar');

    // ===========================
    // STOK HARIAN (ACTIONS: STORE, UPDATE, DELETE)
    // ===========================
    Route::middleware(['role:owner,supervisor,bar'])->group(function () {

        // --- STOK MENU JADI ---
        // Simpan (Create & Auto-Generate Mentah)
        Route::post('/stok-harian/menu', [StokHarianController::class, 'storeMenu'])
            ->name('stok-harian-menu.store');

        // Edit (Update)
        Route::put('/stok-harian/menu/{id}', [StokHarianController::class, 'updateMenu'])
            ->name('stok-harian-menu.update');

        // Hapus (Destroy)
        Route::delete('/stok-harian/menu/{id}', [StokHarianController::class, 'destroyMenu'])
            ->name('stok-harian-menu.destroy');


        // --- STOK BAHAN MENTAH ---
        // Simpan Manual
        Route::post('/stok-harian/mentah', [StokHarianController::class, 'storeMentah'])
            ->name('stok-harian-mentah.store');

        // Edit (Update) - [PERBAIKAN 404]
        Route::put('/stok-harian/mentah/{id}', [StokHarianController::class, 'updateMentah'])
            ->name('stok-harian-mentah.update');

        // Hapus (Destroy) - [PERBAIKAN 404]
        Route::delete('/stok-harian/mentah/{id}', [StokHarianController::class, 'destroyMentah'])
            ->name('stok-harian-mentah.destroy');
    });

    // ===========================
    // LAPORAN AKTIVITAS
    // ===========================
    Route::get('/laporan-aktivitas', [ActivityLogController::class, 'index'])
        ->name('laporan-aktivitas');

    Route::get('/laporan-aktivitas/export', [ActivityLogController::class, 'export'])
        ->name('laporan-aktivitas.export');
});

/*
|--------------------------------------------------------------------------
| AUTH & SETTINGS
|--------------------------------------------------------------------------
*/
require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
