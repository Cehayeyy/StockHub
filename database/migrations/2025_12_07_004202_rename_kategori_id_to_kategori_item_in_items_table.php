<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {

            // Hapus foreign key dulu jika ada
            $table->dropForeign(['kategori_id']);

            // Rename kolom
            $table->renameColumn('kategori_id', 'kategori_item');

            // Ubah tipe jadi string (text)
            $table->string('kategori_item')->change();
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->string('kategori_item')->change();
            $table->renameColumn('kategori_item', 'kategori_id');
        });
    }
};
