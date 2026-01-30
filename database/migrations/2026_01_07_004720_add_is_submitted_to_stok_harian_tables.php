<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            $table->boolean('is_submitted')->default(false);
        });

        Schema::table('stok_harian_dapur_menu', function (Blueprint $table) {
            $table->boolean('is_submitted')->default(false);
        });
    }

    public function down()
    {
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            $table->dropColumn('is_submitted');
        });

        Schema::table('stok_harian_dapur_menu', function (Blueprint $table) {
            $table->dropColumn('is_submitted');
        });
    }

};
