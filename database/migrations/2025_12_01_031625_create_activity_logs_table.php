<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->string('activity');          // contoh: login, logout, update stok, dll
            $table->text('description')->nullable(); // detail aktivitas
            $table->timestamps();               // created_at dipakai untuk "waktu"
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
