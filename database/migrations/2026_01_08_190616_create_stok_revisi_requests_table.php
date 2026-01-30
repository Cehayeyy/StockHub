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
        Schema::create('stok_revisi_requests', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->date('tanggal');
    $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
    $table->timestamps();

    // 🔒 1 user hanya boleh 1 request aktif per hari
    $table->unique(['user_id', 'tanggal']);
});

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stok_revisi_requests');
    }
};
