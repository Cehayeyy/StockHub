<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\ItemController; //

Route::get('/', function () {
    return Inertia::render('welcome');
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

    // Kategori (masih static page)
    Route::get('/kategori', function () {
        return Inertia::render('MasterData/Kategori');
    })->name('kategori');

// ADD THIS
Route::get('/item/create', function () {
    return redirect()->route('item.index');
})->name('item.create');

// Baru route lainnya
Route::get('/item', [ItemController::class, 'index'])->name('item.index');
Route::get('/item/{item}/edit', [ItemController::class, 'edit'])->name('item.edit');
Route::put('/item/{item}', [ItemController::class, 'update'])->name('item.update');
Route::delete('/item/{item}', [ItemController::class, 'destroy'])->name('item.destroy');
Route::post('/item', [ItemController::class, 'store'])->name('item.store');


    /**
     * ===========================
     * RESEP
     * ===========================
     */
    Route::get('/resep', [RecipeController::class, 'index'])
        ->name('resep');

    Route::post('/resep', [RecipeController::class, 'store'])
        ->name('resep.store');

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
