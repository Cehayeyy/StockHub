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
        $table->dropColumn('menu_name');
    });
}

public function down()
{
    Schema::table('stok_harian_menu', function (Blueprint $table) {
        $table->string('menu_name');
    });
}

};
