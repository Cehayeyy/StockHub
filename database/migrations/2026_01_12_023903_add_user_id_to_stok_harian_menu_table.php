<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. UPDATE TABEL BAR (stok_harian_menu)
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            if (!Schema::hasColumn('stok_harian_menu', 'user_id')) {
                $table->foreignId('user_id')
                      ->nullable()
                      ->after('id')
                      ->constrained('users')
                      ->onDelete('cascade');
            }
            if (!Schema::hasColumn('stok_harian_menu', 'is_submitted')) {
                $table->boolean('is_submitted')->default(false)->after('unit');
            }
        });

        // 2. UPDATE TABEL DAPUR (stok_harian_dapur_menu)
        // Cek dulu apakah tabelnya ada (untuk jaga-jaga)
        if (Schema::hasTable('stok_harian_dapur_menu')) {
            Schema::table('stok_harian_dapur_menu', function (Blueprint $table) {
                if (!Schema::hasColumn('stok_harian_dapur_menu', 'user_id')) {
                    $table->foreignId('user_id')
                          ->nullable()
                          ->after('id')
                          ->constrained('users')
                          ->onDelete('cascade');
                }
                if (!Schema::hasColumn('stok_harian_dapur_menu', 'is_submitted')) {
                    $table->boolean('is_submitted')->default(false)->after('unit');
                }
            });
        }
    }

    public function down(): void
    {
        // ROLLBACK BAR
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            if (Schema::hasColumn('stok_harian_menu', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            }
            if (Schema::hasColumn('stok_harian_menu', 'is_submitted')) {
                $table->dropColumn('is_submitted');
            }
        });

        // ROLLBACK DAPUR
        if (Schema::hasTable('stok_harian_dapur_menu')) {
            Schema::table('stok_harian_dapur_menu', function (Blueprint $table) {
                if (Schema::hasColumn('stok_harian_dapur_menu', 'user_id')) {
                    $table->dropForeign(['user_id']);
                    $table->dropColumn('user_id');
                }
                if (Schema::hasColumn('stok_harian_dapur_menu', 'is_submitted')) {
                    $table->dropColumn('is_submitted');
                }
            });
        }
    }
};
