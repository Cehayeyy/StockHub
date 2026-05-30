<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            if (!Schema::hasColumn('stok_harian_menu', 'user_id')) {
                $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('stok_harian_menu', 'is_submitted')) {
                $table->boolean('is_submitted')->default(false);
            }
        });

        // 🛠️ FIX CROSS-DATABASE INDEX CHECK (Aman untuk SQLite AWS & MySQL Rumahweb)
        $indexExists = false;

        if (config('database.default') === 'sqlite') {
            $indexes = DB::select("PRAGMA index_list('stok_harian_menu')");
            foreach ($indexes as $index) {
                if ($index->name === 'stok_menu_user_day_unique') {
                    $indexExists = true;
                    break;
                }
            }
        } else {
            // Jalur MySQL untuk Hosting Rumahweb kalian
            $indexes = DB::select("SHOW INDEXES FROM stok_harian_menu WHERE Key_name = 'stok_menu_user_day_unique'");
            $indexExists = count($indexes) > 0;
        }

        if (!$indexExists) {
            Schema::table('stok_harian_menu', function (Blueprint $table) {
                $table->unique(['item_id', 'tanggal'], 'stok_menu_user_day_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            if (config('database.default') !== 'sqlite') {
                $table->dropUnique('stok_menu_user_day_unique');
            }
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'is_submitted']);
        });
    }
};