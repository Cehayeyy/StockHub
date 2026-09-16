<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sales_reports', function (Blueprint $table) {
            $table->decimal('fee_mitra_persen', 5, 2)->default(0)->after('diskon_persen');
        });
    }

    public function down(): void
    {
        Schema::table('sales_reports', function (Blueprint $table) {
            $table->dropColumn('fee_mitra_persen');
        });
    }
};
