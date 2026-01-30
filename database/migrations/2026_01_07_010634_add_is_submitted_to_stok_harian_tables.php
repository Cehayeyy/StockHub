<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('stok_harian_menu', 'is_submitted')) {
            Schema::table('stok_harian_menu', function (Blueprint $table) {
                $table->boolean('is_submitted')->default(false)->after('stok_akhir');
            });
        }

        if (!Schema::hasColumn('stok_harian_mentah', 'is_submitted')) {
            Schema::table('stok_harian_mentah', function (Blueprint $table) {
                $table->boolean('is_submitted')->default(false)->after('stok_akhir');
            });
        }

        // kalau ada dapur
        if (!Schema::hasColumn('stok_harian_dapur_menu', 'is_submitted')) {
            Schema::table('stok_harian_dapur_menu', function (Blueprint $table) {
                $table->boolean('is_submitted')->default(false)->after('stok_akhir');
            });
        }

        if (!Schema::hasColumn('stok_harian_dapur_mentah', 'is_submitted')) {
            Schema::table('stok_harian_dapur_mentah', function (Blueprint $table) {
                $table->boolean('is_submitted')->default(false)->after('stok_akhir');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('stok_harian_menu', 'is_submitted')) {
            Schema::table('stok_harian_menu', fn (Blueprint $t) => $t->dropColumn('is_submitted'));
        }

        if (Schema::hasColumn('stok_harian_mentah', 'is_submitted')) {
            Schema::table('stok_harian_mentah', fn (Blueprint $t) => $t->dropColumn('is_submitted'));
        }

        if (Schema::hasColumn('stok_harian_dapur_menu', 'is_submitted')) {
            Schema::table('stok_harian_dapur_menu', fn (Blueprint $t) => $t->dropColumn('is_submitted'));
        }

        if (Schema::hasColumn('stok_harian_dapur_mentah', 'is_submitted')) {
            Schema::table('stok_harian_dapur_mentah', fn (Blueprint $t) => $t->dropColumn('is_submitted'));
        }
    }
};
