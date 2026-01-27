<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            // Kita taruh setelah 'item_id' atau 'name' agar rapi
            $table->foreignId('category_id')
                  ->nullable() // Wajib nullable dulu karena data lama belum punya kategori
                  ->after('name')
                  ->constrained('item_categories') // Link ke tabel 'kategoris'
                  ->nullOnDelete(); // Jika kategori dihapus, resep tidak ikut terhapus (hanya jadi null)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn('category_id');
        });
    }
};
