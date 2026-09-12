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
        Schema::table('recipes', function (Blueprint $table) {
            $table->decimal('total_hpp', 15, 2)->nullable()->after('total_ingredients');
            $table->decimal('target_margin', 8, 2)->nullable()->default(0)->after('total_hpp');
            $table->decimal('harga_jual_hitungan', 15, 2)->nullable()->after('target_margin');
            $table->decimal('harga_jual_real', 15, 2)->nullable()->after('harga_jual_hitungan');
            $table->decimal('profit_real', 15, 2)->nullable()->after('harga_jual_real');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            $table->dropColumn([
                'total_hpp',
                'target_margin',
                'harga_jual_hitungan',
                'harga_jual_real',
                'profit_real',
            ]);
        });
    }
};
