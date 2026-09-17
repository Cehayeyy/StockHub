<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operational_expenses', function (Blueprint $table) {
            $table->id();
            $table->string('periode')->unique(); // Format: 'YYYY-MM' (Contoh: '2026-09')
            $table->decimal('biaya_gaji', 15, 2)->default(0);
            $table->decimal('biaya_perlengkapan', 15, 2)->default(0);
            $table->decimal('biaya_utilitas', 15, 2)->default(0);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operational_expenses');
    }
};
