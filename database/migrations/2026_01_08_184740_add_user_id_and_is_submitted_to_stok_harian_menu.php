<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB; // Tambahkan ini

return new class extends Migration
{
    public function up(): void
    {
        // 1. UPDATE TABEL BAR (stok_harian_menu)
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            if (!Schema::hasColumn('stok_harian_menu', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
            }
            if (!Schema::hasColumn('stok_harian_menu', 'is_submitted')) {
                $table->boolean('is_submitted')->default(false)->after('unit');
            }
        });

        // Cek Index Manual sebelum membuat (Bar)
        $barIndexes = DB::select("SHOW INDEXES FROM stok_harian_menu WHERE Key_name = 'stok_menu_user_day_unique'");
        if (count($barIndexes) === 0) {
            Schema::table('stok_harian_menu', function (Blueprint $table) {
                $table->unique(['user_id', 'tanggal', 'item_id'], 'stok_menu_user_day_unique');
            });
        }

        // 2. UPDATE TABEL DAPUR (stok_harian_dapur_menu)
        if (Schema::hasTable('stok_harian_dapur_menu')) {
            Schema::table('stok_harian_dapur_menu', function (Blueprint $table) {
                if (!Schema::hasColumn('stok_harian_dapur_menu', 'user_id')) {
                    $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
                }
                if (!Schema::hasColumn('stok_harian_dapur_menu', 'is_submitted')) {
                    $table->boolean('is_submitted')->default(false)->after('unit');
                }
            });

            // Cek Index Manual sebelum membuat (Dapur)
            $dapurIndexes = DB::select("SHOW INDEXES FROM stok_harian_dapur_menu WHERE Key_name = 'stok_dapur_user_day_unique'");
            if (count($dapurIndexes) === 0) {
                Schema::table('stok_harian_dapur_menu', function (Blueprint $table) {
                    // Gunakan recipe_id sesuai controller Anda
                    $table->unique(['user_id', 'tanggal', 'recipe_id'], 'stok_dapur_user_day_unique');
                });
            }
        }
    }

    public function down(): void
    {
        // ... (Kode down sama seperti sebelumnya, tidak perlu diubah) ...
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            try { $table->dropUnique('stok_menu_user_day_unique'); } catch (\Exception $e) {}
            if (Schema::hasColumn('stok_harian_menu', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            }
            if (Schema::hasColumn('stok_harian_menu', 'is_submitted')) {
                $table->dropColumn('is_submitted');
            }
        });

        if (Schema::hasTable('stok_harian_dapur_menu')) {
            Schema::table('stok_harian_dapur_menu', function (Blueprint $table) {
                try { $table->dropUnique('stok_dapur_user_day_unique'); } catch (\Exception $e) {}
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
