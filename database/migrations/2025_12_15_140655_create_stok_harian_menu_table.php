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
    Schema::create('stok_harian_menu', function (Blueprint $table) {
        $table->id();
        $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
        $table->date('tanggal');
        $table->integer('stok_awal')->default(0);
        $table->integer('stok_masuk')->nullable();
        $table->integer('stok_keluar')->nullable();
        $table->integer('stok_akhir')->nullable();
        $table->timestamps();

        $table->unique(['item_id', 'tanggal']);
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stok_harian_menu');
    }
};
