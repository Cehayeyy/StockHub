<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ActivityLogController; // ⬅️ tambah ini

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {

    // Dashboard
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // Manajemen Akun
    Route::get('/manajemen-akun', [UserController::class, 'index'])
        ->name('manajemen');

    Route::delete('/manajemen-akun/{id}', [UserController::class, 'destroy'])
        ->name('manajemen.destroy');

    Route::post('/users', [UserController::class, 'store'])
        ->name('users.store');

    Route::put('/manajemen/{id}', [UserController::class, 'update'])
        ->name('manajemen.update');

    // MASTER DATA (Parent + sub)
    Route::get('/masterdata', function () {
        return Inertia::render('MasterData/Index');
    })->name('masterdata');

    Route::get('/kategori', function () {
        return Inertia::render('MasterData/Kategori');
    })->name('kategori');

    Route::get('/item', function () {
        return Inertia::render('MasterData/Item');
    })->name('item');

    Route::get('/resep', function () {
        return Inertia::render('MasterData/Resep');
    })->name('resep');

    // STOK HARIAN (submenu: Bar & Dapur)
    Route::get('/stok-harian/bar', function () {
        return Inertia::render('StokHarian/Bar');
    })->name('stok-harian.bar');

    Route::get('/stok-harian/dapur', function () {
        return Inertia::render('StokHarian/Dapur');
    })->name('stok-harian.dapur');

    // LAPORAN AKTIVITAS (pakai controller)
    Route::get('/laporan-aktivitas', [ActivityLogController::class, 'index'])
        ->name('laporan-aktivitas');
});

// File lain (auth dan settings)
require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
