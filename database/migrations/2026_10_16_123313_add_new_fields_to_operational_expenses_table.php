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
        Schema::table('operational_expenses', function (Blueprint $table) {
            // Cek dan tambah kolom jika belum ada agar tidak error
            if (!Schema::hasColumn('operational_expenses', 'perlengkapan_warung')) {
                $table->decimal('perlengkapan_warung', 15, 2)->default(0)->after('biaya_gaji');
            }
            if (!Schema::hasColumn('operational_expenses', 'admin_bank')) {
                $table->decimal('admin_bank', 15, 2)->default(0);
            }
            if (!Schema::hasColumn('operational_expenses', 'operasional_warung')) {
                $table->decimal('operasional_warung', 15, 2)->default(0);
            }
            if (!Schema::hasColumn('operational_expenses', 'biaya_sewa')) {
                $table->decimal('biaya_sewa', 15, 2)->default(0);
            }
            if (!Schema::hasColumn('operational_expenses', 'perbaikan_inventaris')) {
                $table->decimal('perbaikan_inventaris', 15, 2)->default(0);
            }
            if (!Schema::hasColumn('operational_expenses', 'pemeliharaan_warung')) {
                $table->decimal('pemeliharaan_warung', 15, 2)->default(0);
            }
            if (!Schema::hasColumn('operational_expenses', 'biaya_marketing')) {
                $table->decimal('biaya_marketing', 15, 2)->default(0);
            }
            if (!Schema::hasColumn('operational_expenses', 'biaya_lain_lain')) {
                $table->decimal('biaya_lain_lain', 15, 2)->default(0);
            }
            if (!Schema::hasColumn('operational_expenses', 'biaya_pajak')) {
                $table->decimal('biaya_pajak', 15, 2)->default(0);
            }
            if (!Schema::hasColumn('operational_expenses', 'utilitas')) {
                $table->decimal('utilitas', 15, 2)->default(0);
            }
            if (!Schema::hasColumn('operational_expenses', 'beban_lain_lain')) {
                $table->decimal('beban_lain_lain', 15, 2)->default(0);
            }
            if (!Schema::hasColumn('operational_expenses', 'pajak_penghasilan')) {
                $table->decimal('pajak_penghasilan', 15, 2)->default(0);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('operational_expenses', function (Blueprint $table) {
            $table->dropColumn([
                'perlengkapan_warung',
                'admin_bank',
                'operasional_warung',
                'biaya_sewa',
                'perbaikan_inventaris',
                'pemeliharaan_warung',
                'biaya_marketing',
                'biaya_lain_lain',
                'biaya_pajak',
                'utilitas',
                'beban_lain_lain',
                'pajak_penghasilan'
            ]);
        });
    }
};