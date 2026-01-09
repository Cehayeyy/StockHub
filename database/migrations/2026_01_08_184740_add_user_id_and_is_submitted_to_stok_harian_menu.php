<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stok_harian_menu', function (Blueprint $table) {

            // ❌ JANGAN TAMBAH user_id (SUDAH ADA DI DB)

            // ✅ TAMBAH is_submitted JIKA BELUM ADA
            if (!Schema::hasColumn('stok_harian_menu', 'is_submitted')) {
                $table->boolean('is_submitted')
                    ->default(false)
                    ->after('stok_akhir');
            }

            // ✅ UNIQUE PER USER PER ITEM PER TANGGAL
            $table->unique(['user_id', 'tanggal', 'item_id'], 'stok_menu_user_day_unique');
        });
    }

    public function down(): void
    {
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            $table->dropUnique('stok_menu_user_day_unique');

            if (Schema::hasColumn('stok_harian_menu', 'is_submitted')) {
                $table->dropColumn('is_submitted');
            }
        });
    }
};
