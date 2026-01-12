<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $tableName = 'stok_harian_menu';
        $fkName    = 'stok_harian_menu_item_id_foreign';
        $oldIndex  = 'stok_harian_menu_item_id_tanggal_unique';
        $newIndex  = 'stok_menu_user_day_unique';

        // =========================================================
        // 1. HAPUS FOREIGN KEY (Cek Manual ke Database Dulu)
        // =========================================================
        $fkExists = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND CONSTRAINT_NAME = ?
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        ", [$tableName, $fkName]);

        if (!empty($fkExists)) {
            Schema::table($tableName, function (Blueprint $table) use ($fkName) {
                $table->dropForeign($fkName);
            });
        }

        // =========================================================
        // 2. HAPUS INDEX LAMA (Cek Manual)
        // =========================================================
        $indexExists = DB::select("SHOW INDEXES FROM {$tableName} WHERE Key_name = ?", [$oldIndex]);

        if (!empty($indexExists)) {
            Schema::table($tableName, function (Blueprint $table) use ($oldIndex) {
                $table->dropUnique($oldIndex);
            });
        }

        // =========================================================
        // 3. PASANG KEMBALI FOREIGN KEY (Jika belum ada)
        // =========================================================
        // Cek lagi apakah FK sudah terpasang (jaga-jaga)
        $fkCheck = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND CONSTRAINT_NAME = ?
        ", [$tableName, $fkName]);

        if (empty($fkCheck)) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('item_id')
                      ->references('id')
                      ->on('items')
                      ->onDelete('cascade');
            });
        }

        // =========================================================
        // 4. BUAT INDEX BARU (Jika belum ada)
        // =========================================================
        $newIndexCheck = DB::select("SHOW INDEXES FROM {$tableName} WHERE Key_name = ?", [$newIndex]);

        if (empty($newIndexCheck)) {
            Schema::table($tableName, function (Blueprint $table) use ($newIndex) {
                $table->unique(['user_id', 'item_id', 'tanggal'], $newIndex);
            });
        }
    }

    public function down(): void
    {
        // Tidak perlu rollback
    }
};
