<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('stok_harian_menu', function (Blueprint $table) {

            // 1️⃣ TAMBAH item_id
            $table->foreignId('item_id')
                ->nullable()
                ->after('id')
                ->constrained('items')
                ->cascadeOnDelete();

            // 2️⃣ HAPUS UNIQUE LAMA
            $table->dropUnique(['menu_name', 'tanggal']);

            // 3️⃣ BUAT UNIQUE BARU
            $table->unique(['item_id', 'tanggal']);

            // 4️⃣ OPSIONAL: biarkan menu_name dulu (jangan drop dulu)
        });
    }

    public function down(): void
    {
        Schema::table('stok_harian_menu', function (Blueprint $table) {
            $table->dropUnique(['item_id', 'tanggal']);
            $table->dropConstrainedForeignId('item_id');
            $table->unique(['menu_name', 'tanggal']);
        });
    }
};
