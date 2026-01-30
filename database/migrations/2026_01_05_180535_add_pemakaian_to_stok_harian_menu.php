<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            $table->integer('pemakaian')->default(0)->after('stok_keluar');
        });
    }

    public function down(): void
    {
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            $table->dropColumn('pemakaian');
        });
    }
};
