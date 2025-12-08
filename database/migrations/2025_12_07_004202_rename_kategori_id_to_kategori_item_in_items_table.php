<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Migration ini sudah tidak dibutuhkan lagi,
        // karena tabel `items` sekarang sudah memakai kolom `kategori_item`
        // dan tidak punya foreign key `kategori_id` lagi.
    }

    public function down(): void
    {
        // Biarkan kosong juga, supaya tidak mengubah struktur tabel saat rollback.
    }
};
