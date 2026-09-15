<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Tabel Utama Nota / Bill
        Schema::create('sales_reports', function (Blueprint $table) {
            $table->id();
            $table->string('nomor_nota')->unique();
            $table->date('tanggal_transaksi');
            $table->string('partner_nota')->default('Internal / Umum (Kasir)');
            $table->decimal('diskon_persen', 5, 2)->default(0);
            $table->decimal('fee_mitra', 12, 2)->default(0);
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('total_bersih', 12, 2)->default(0);
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        // Tabel Rincian Menu per Nota (Item Pesanan)
        Schema::create('sales_report_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_report_id')->constrained('sales_reports')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->integer('quantity')->default(1);
            $table->decimal('harga_satuan', 12, 2)->default(0);
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_report_items');
        Schema::dropIfExists('sales_reports');
    }
};