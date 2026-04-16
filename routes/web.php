<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

use App\Http\Controllers\UserController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\IzinRevisiController;
use App\Http\Controllers\StokHarianController;
use App\Http\Controllers\StokHarianDapurController;
use App\Http\Controllers\VerifikasiStokController;
use App\Http\Controllers\AuditDataController;

/*
|--------------------------------------------------------------------------
| WEB ROUTES
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    return Inertia::render('LandingPage');
})->name('home');

/*
|--------------------------------------------------------------------------
| AUTHENTICATED ROUTES
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {

    // ===========================
    // DASHBOARD
    // ===========================
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->name('dashboard');

    Route::middleware(['role:owner'])->group(function () {
        Route::get('/dashboard/owner/report-stok-7-hari/pdf', [DashboardController::class, 'exportOwnerWeeklyStockPdf'])
            ->name('dashboard.owner.stock-report.pdf');
    });

    // ===========================
    // IZIN REVISI STOK
    // ===========================
    // Staff mengajukan izin (Bisa kapan saja)
    Route::post('/izin-revisi/ajukan', [IzinRevisiController::class, 'store'])
        ->name('izin-revisi.store');

    Route::post('/izin-revisi', [IzinRevisiController::class, 'store']);

    // Supervisor/Owner menyetujui izin
    Route::middleware(['role:supervisor,owner'])->group(function () {
        Route::post('/izin-revisi/{izinRevisi}/update', [IzinRevisiController::class, 'update'])
            ->name('izin-revisi.update');
    });

    // ==============================================================================
    // 🛡️ WRAPPER TIME LOCK (Kunci Otomatis Jam 21:00 - 23:59)
    // Middleware ini HANYA membungkus aksi perubahan data (POST, PUT, DELETE).
    // ==============================================================================
    Route::middleware(['time.restricted'])->group(function () {

        // ===========================
        // MANAJEMEN AKUN (Owner & Supervisor Only)
        // ===========================
        Route::middleware(['role:owner,supervisor'])->group(function () {

            // View Manajemen Akun
            Route::get('/manajemen-akun', [UserController::class, 'index'])
                ->name('manajemen');

            // Create User
            Route::post('/users', [UserController::class, 'store'])
                ->name('users.store');

            // Update User Lain
            Route::put('/manajemen/{id}', [UserController::class, 'update'])
                ->name('manajemen.update');

            // Delete User
            Route::delete('/manajemen-akun/{id}', [UserController::class, 'destroy'])
                ->name('manajemen.destroy');

            // Update Akun Sendiri (Khusus Owner)
            Route::put('/manajemen/self/update', [UserController::class, 'updateSelf'])
                ->name('manajemen.updateSelf')
                ->middleware('role:owner');
        });

        // ===========================
        // MASTER DATA (Aksi Tulis: POST, PUT, DELETE)
        // ===========================

        // --- KATEGORI ---
        Route::post('/kategori', [ItemController::class, 'kategoriStore'])
            ->name('kategori.store');

        Route::delete('/kategori/{itemCategory}', [ItemController::class, 'destroyCategory'])
            ->name('kategori.destroy');

        // --- ITEM / BAHAN ---
        Route::post('/item', [ItemController::class, 'store'])
            ->name('item.store');

        Route::put('/item/{item}', [ItemController::class, 'update'])
            ->name('item.update');

        Route::delete('/item/{item}', [ItemController::class, 'destroy'])
            ->name('item.destroy');

        // --- RESEP ---
        Route::post('/resep', [RecipeController::class, 'store'])
            ->name('resep.store');

        Route::put('/resep/{recipe}', [RecipeController::class, 'update'])
            ->name('resep.update');

        Route::delete('/resep/{recipe}', [RecipeController::class, 'destroy'])
            ->name('resep.destroy');

        // =========================================================
        // STOK HARIAN - BAR (Aksi Tulis)
        // =========================================================
        Route::middleware(['role:owner,supervisor,bar'])->group(function () {

            // Menu Bar
            Route::post('/stok-harian/menu', [StokHarianController::class, 'storeMenu'])
                ->name('stok-harian-menu.store');

            Route::put('/stok-harian/menu/{id}', [StokHarianController::class, 'updateMenu'])
                ->name('stok-harian-menu.update');

            Route::delete('/stok-harian/menu/{id}', [StokHarianController::class, 'destroyMenu'])
                ->name('stok-harian-menu.destroy');

            // Mentah Bar
            Route::post('/stok-harian/mentah', [StokHarianController::class, 'storeMentah'])
                ->name('stok-harian-mentah.store');

            Route::match(['put', 'patch'], '/stok-harian/mentah/{id}', [StokHarianController::class, 'updateMentah'])
                ->name('stok-harian-mentah.update');

            Route::delete('/stok-harian/mentah/{id}', [StokHarianController::class, 'destroyMentah'])
                ->name('stok-harian-mentah.destroy');
        });

        // =========================================================
        // STOK HARIAN - DAPUR (Aksi Tulis)
        // =========================================================
        Route::middleware(['role:owner,supervisor,dapur,staff_kitchen'])->group(function () {

            // Menu Dapur
            Route::post('/stok-harian-dapur/menu', [StokHarianDapurController::class, 'storeMenu'])
                ->name('stok-harian-dapur-menu.store');

            Route::put('/stok-harian-dapur/menu/{id}', [StokHarianDapurController::class, 'updateMenu'])
                ->name('stok-harian-dapur-menu.update');

            Route::delete('/stok-harian-dapur/menu/{id}', [StokHarianDapurController::class, 'destroyMenu'])
                ->name('stok-harian-dapur-menu.destroy');

            // Mentah Dapur
            Route::post('/stok-harian-dapur/mentah', [StokHarianDapurController::class, 'storeMentah'])
                ->name('stok-harian-dapur-mentah.store');

            Route::match(['put', 'patch'], '/stok-harian-dapur/mentah/{id}', [StokHarianDapurController::class, 'updateMentah'])
                ->name('stok-harian-dapur-mentah.update');

            Route::delete('/stok-harian-dapur/mentah/{id}', [StokHarianDapurController::class, 'destroyMentah'])
                ->name('stok-harian-dapur-mentah.destroy');
        });

    }); // 🛡️ End Wrapper Time Lock

    // ==============================================================================
    // 📖 ROUTE VIEW (READ ONLY) - Bebas Akses Kapan Saja
    // Route ini TIDAK dikunci oleh time.restricted agar staff bisa melihat data di malam hari.
    // ==============================================================================

    // Rute Rahasia Developer (CCTV Data)
    Route::get('/audit-data', [AuditDataController::class, 'index'])->name('audit.index');

    // User Management View (Supervisor)
    Route::get('/users', [UserController::class, 'index'])
        ->name('users.index');

    // User Management View (Supervisor)
    Route::get('/users', [UserController::class, 'index'])
        ->name('users.index');

    // Master Data Index
    Route::get('/masterdata', function () {
        return Inertia::render('MasterData/Index');
    })->name('masterdata');

    // Kategori View
    Route::get('/kategori', [ItemController::class, 'kategoriIndex'])
        ->name('kategori');

    Route::get('/categories', [CategoryController::class, 'index'])
        ->name('categories.index');

    // Item View
    Route::get('/item', [ItemController::class, 'index'])
        ->name('item.index');

    Route::get('/items', [ItemController::class, 'index'])
        ->name('items.index');

    // Resep View
    Route::get('/resep', [RecipeController::class, 'index'])
        ->name('resep');

    Route::get('/recipes', [RecipeController::class, 'index'])
        ->name('recipes.index');

    Route::get('/resep/{recipe}', [RecipeController::class, 'show'])
        ->name('resep.show');

    Route::get('/resep/{recipe}/edit', [RecipeController::class, 'edit'])
        ->name('resep.edit');

    // Stok Harian View - BAR
    Route::get('/stok-harian/bar', [StokHarianController::class, 'bar'])
        ->name('stok-harian.bar');

    // Stok Harian View - DAPUR
    Route::get('/stok-harian/dapur', [StokHarianDapurController::class, 'dapur'])
        ->name('stok-harian.dapur');

    // Verifikasi Stok
    Route::get('/verifikasi-stok', [VerifikasiStokController::class, 'index'])
        ->name('verifikasi-stok.index');

    Route::post('/verifikasi-stok', [App\Http\Controllers\VerifikasiStokController::class, 'store'])
        ->name('verifikasi-stok.store');

    Route::get('/verifikasi-stok/export', [VerifikasiStokController::class, 'export'])
        ->name('verifikasi-stok.export');

    // Laporan Aktivitas
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
