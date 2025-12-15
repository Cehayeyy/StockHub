<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stok_harian_mentah', function (Blueprint $table) {
            $table->integer('stok_masuk')->nullable()->change();
            $table->integer('stok_keluar')->nullable()->change();
            $table->integer('stok_akhir')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('stok_harian_mentah', function (Blueprint $table) {
            $table->integer('stok_masuk')->default(0)->change();
            $table->integer('stok_keluar')->default(0)->change();
            $table->integer('stok_akhir')->default(0)->change();
        });
    }
};
