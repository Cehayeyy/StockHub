<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('daily_menu_stocks', function (Blueprint $table) {
            $table->id();

            $table->foreignId('recipe_id')
                ->constrained('recipes')
                ->cascadeOnDelete();

            $table->date('date');

            $table->integer('stok_awal')->default(0);
            $table->integer('stok_masuk')->default(0);
            $table->integer('stok_total')->default(0);
            $table->integer('pemakaian')->default(0);
            $table->integer('sisa')->default(0);

            $table->timestamps();

            // 1 menu hanya 1 record per hari
            $table->unique(['recipe_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_menu_stocks');
    }
};
