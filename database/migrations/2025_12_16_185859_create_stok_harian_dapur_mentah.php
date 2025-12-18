<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stok_harian_dapur_mentah', function (Blueprint $table) {
            $table->id();

            // bahan mentah dapur
            $table->foreignId('item_id')
                  ->constrained('items')
                  ->cascadeOnDelete();

            $table->date('tanggal');

            $table->integer('stok_awal')->default(0);
            $table->integer('stok_masuk')->default(0);
            $table->integer('stok_keluar')->default(0);
            $table->integer('stok_akhir')->default(0);

            // satuan khusus dapur
            $table->string('unit')->default('porsi');

            $table->timestamps();

            // 1 item hanya boleh 1 data per hari
            $table->unique(['item_id', 'tanggal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stok_harian_dapur_mentah');
    }
};
