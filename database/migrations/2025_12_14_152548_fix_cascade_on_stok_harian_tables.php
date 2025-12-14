<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Saat item dihapus, stok harian ikut terhapus
     */
    public function up(): void
    {
        // ===============================
        // STOK HARIAN MENU
        // ===============================
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            $table->dropForeign(['item_id']);

            $table->foreign('item_id')
                ->references('id')
                ->on('items')
                ->onDelete('cascade');
        });

        // ===============================
        // STOK HARIAN MENTAH
        // ===============================
        Schema::table('stok_harian_mentah', function (Blueprint $table) {
            $table->dropForeign(['item_id']);

            $table->foreign('item_id')
                ->references('id')
                ->on('items')
                ->onDelete('cascade');
        });
    }

    /**
     * Rollback (kembali tanpa cascade)
     */
    public function down(): void
    {
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            $table->dropForeign(['item_id']);

            $table->foreign('item_id')
                ->references('id')
                ->on('items');
        });

        Schema::table('stok_harian_mentah', function (Blueprint $table) {
            $table->dropForeign(['item_id']);

            $table->foreign('item_id')
                ->references('id')
                ->on('items');
        });
    }
};
