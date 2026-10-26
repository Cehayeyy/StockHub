<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            // Menambahkan kolom details bertipe JSON (nullable agar log lama tidak error)
            $table->json('details')->nullable()->after('description');
        });
    }

    public function down()
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropColumn('details');
        });
    }
};