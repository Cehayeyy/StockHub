<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('stok_harian_dapur_menu', function (Blueprint $table) {
            $table->id();

            // MENU = RECIPE
            $table->foreignId('recipe_id')
                ->constrained('recipes')
                ->cascadeOnDelete();

            $table->date('tanggal');

            $table->integer('stok_awal')->default(0);
            $table->integer('stok_masuk')->default(0);
            $table->integer('stok_keluar')->default(0);
            $table->integer('stok_akhir')->default(0);

            $table->string('unit')->default('porsi');

            $table->timestamps();

            // 1 menu (resep) hanya boleh 1 data per hari
            $table->unique(['recipe_id', 'tanggal'], 'stok_dapur_menu_recipe_tanggal_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stok_harian_dapur_menu');
    }
};
