<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\UserController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {

    //bagian dashbord
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    //bagian manajemen akun
    Route::get('/manajemen-akun', [UserController::class, 'index'])
        ->name('manajemen');
        Route::delete('/manajemen-akun/{id}', [UserController::class, 'destroy'])
        ->name('manajemen.destroy');
    Route::post('/users', [UserController::class, 'store'])
        ->name('users.store');
    Route::put('/manajemen/{id}', [UserController::class, 'update'])
        ->name('manajemen.update');




    //bagian master data
    Route::get('/masterdata', function () {
            return Inertia::render('masterdata');
        })->name('masterdata');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
