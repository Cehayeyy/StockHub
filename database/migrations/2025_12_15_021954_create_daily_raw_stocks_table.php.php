<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('daily_raw_stocks', function (Blueprint $table) {
            $table->id();

            $table->foreignId('item_id')
                ->constrained('items')
                ->cascadeOnDelete();

            $table->date('date');

            $table->integer('stok_awal')->default(0);
            $table->integer('stok_masuk')->default(0);
            $table->integer('stok_total')->default(0);
            $table->integer('pemakaian')->default(0);
            $table->integer('sisa')->default(0);

            $table->timestamps();

            $table->unique(['item_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_raw_stocks');
    }
};
