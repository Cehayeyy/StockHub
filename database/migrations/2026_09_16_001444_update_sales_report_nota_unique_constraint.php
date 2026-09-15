<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_reports', function (Blueprint $table) {
            $table->dropUnique('sales_reports_nomor_nota_unique');
            $table->unique(
                ['user_id', 'tanggal_transaksi', 'partner_nota', 'nomor_nota'],
                'sales_reports_nota_context_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('sales_reports', function (Blueprint $table) {
            $table->dropUnique('sales_reports_nota_context_unique');
            $table->unique('nomor_nota');
        });
    }
};
