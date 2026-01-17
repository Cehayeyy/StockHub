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
        // 1. Ubah ENUM untuk menambah 'dapur'
        DB::statement("ALTER TABLE item_categories MODIFY COLUMN division ENUM('bar','kitchen','dapur') NOT NULL");

        // 2. Update data 'kitchen' menjadi 'dapur'
        DB::table('item_categories')->where('division', 'kitchen')->update(['division' => 'dapur']);

        // 3. Hapus 'kitchen' dari ENUM (optional, bisa dipertahankan untuk backward compat)
        DB::statement("ALTER TABLE item_categories MODIFY COLUMN division ENUM('bar','dapur') NOT NULL DEFAULT 'bar'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Kembalikan ke ENUM lama
        DB::statement("ALTER TABLE item_categories MODIFY COLUMN division ENUM('bar','kitchen','dapur') NOT NULL");
        DB::table('item_categories')->where('division', 'dapur')->update(['division' => 'kitchen']);
        DB::statement("ALTER TABLE item_categories MODIFY COLUMN division ENUM('bar','kitchen') NOT NULL DEFAULT 'bar'");
    }
};
