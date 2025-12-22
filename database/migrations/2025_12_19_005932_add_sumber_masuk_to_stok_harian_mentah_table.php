<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('stok_harian_mentah', function (Blueprint $table) {
            $table->string('sumber_masuk')->nullable()->after('stok_masuk');
        });
    }

    public function down(): void
    {
        Schema::table('stok_harian_mentah', function (Blueprint $table) {
            $table->dropColumn('sumber_masuk');
        });
    }
};
