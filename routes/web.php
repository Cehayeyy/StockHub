<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\ItemController;

Route::get('/', function () {
    return Inertia::render('LandingPage');
})->name('home');


Route::middleware(['auth'])->group(function () {

    // Dashboard
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    /**
     * ===========================
     * MANEJEMEN AKUN
     * ===========================
     */
    Route::get('/manajemen-akun', [UserController::class, 'index'])
        ->name('manajemen');

    Route::delete('/manajemen-akun/{id}', [UserController::class, 'destroy'])
        ->name('manajemen.destroy');

    Route::post('/users', [UserController::class, 'store'])
        ->name('users.store');

    Route::put('/manajemen/{id}', [UserController::class, 'update'])
        ->name('manajemen.update');

    /**
     * ===========================
     * MASTER DATA
     * ===========================
     */

    // Parent Master Data Index
    Route::get('/masterdata', function () {
        return Inertia::render('MasterData/Index');
    })->name('masterdata');

    // KATEGORI
    Route::get('/kategori', [ItemController::class, 'kategoriIndex'])
        ->name('kategori');
    Route::post('/kategori', [ItemController::class, 'kategoriStore'])
        ->name('kategori.store');

    // ITEM
    Route::get('/item', [ItemController::class, 'index'])->name('item.index');
    Route::get('/item/create', function () {
        return redirect()->route('item.index');
    })->name('item.create');
    Route::post('/item', [ItemController::class, 'store'])->name('item.store');
    Route::put('/item/{item}', [ItemController::class, 'update'])->name('item.update');
    Route::delete('/item/{item}', [ItemController::class, 'destroy'])->name('item.destroy');;

    // Hapus seluruh item berdasarkan kategori (Finish / Raw)
    Route::delete('/kategori/{itemCategory}', [ItemController::class, 'destroyCategory'])
        ->name('kategori.destroy');

    /**
     * ===========================
     * RESEP
     * ===========================
     */
    Route::get('/resep', [RecipeController::class, 'index'])->name('resep');
    Route::post('/resep', [RecipeController::class, 'store'])->name('resep.store');

    // Detail resep
    Route::get('/resep/{recipe}', [RecipeController::class, 'show'])->name('resep.show');

    // Edit resep (opsional, bisa pakai modal yang sama)
    Route::get('/resep/{recipe}/edit', [RecipeController::class, 'edit'])->name('resep.edit');
    Route::put('/resep/{recipe}', [RecipeController::class, 'update'])->name('resep.update');

    // Hapus resep
    Route::delete('/resep/{recipe}', [RecipeController::class, 'destroy'])->name('resep.destroy');


    /**
     * ===========================
     * STOK HARIAN (Bar & Dapur)
     * ===========================
     */
    Route::get('/stok-harian/bar', function () {
        return Inertia::render('StokHarian/Bar');
    })->name('stok-harian.bar');

    Route::get('/stok-harian/dapur', function () {
        return Inertia::render('StokHarian/Dapur');
    })->name('stok-harian.dapur');

    /**
     * ===========================
     * LAPORAN AKTIVITAS
     * ===========================
     */
    Route::get('/laporan-aktivitas', [ActivityLogController::class, 'index'])
        ->name('laporan-aktivitas');

    Route::get('/laporan-aktivitas/export', [ActivityLogController::class, 'export'])
        ->name('laporan-aktivitas.export');
});

// File lain (auth dan settings)
require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
