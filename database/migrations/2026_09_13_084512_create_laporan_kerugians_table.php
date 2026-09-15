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
        Schema::create('laporan_kerugians', function (Blueprint $table) {
            $table->id();
            
            // Divisi tempat terjadinya kerugian (bar / dapur)
            $table->enum('division', ['bar', 'dapur']);

            // Relasi ke barang mentah yang terbuang
            $table->foreignId('item_id')->constrained('items')->onDelete('cascade');
            
            // Jumlah yang terbuang (menggunakan decimal untuk antisipasi koma seperti 1.5 kg)
            $table->decimal('kuantitas', 8, 2); 
            
            // Alasan kerugian (Kadaluarsa, Tumpah/Rusak, dll)
            $table->string('alasan'); 
            
            // Catatan tambahan opsional dari staf
            $table->text('catatan')->nullable(); 
            
            // Status pengajuan
            $table->enum('status', ['Menunggu Verifikasi', 'Disetujui', 'Ditolak'])->default('Menunggu Verifikasi');
            
            // Relasi ke user (staf) yang melapor
            $table->foreignId('staff_id')->constrained('users')->onDelete('cascade');
            
            // Relasi ke user (supervisor) yang memverifikasi (bisa null jika belum divalidasi)
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->onDelete('set null');
            
            // Timestamps (created_at otomatis bertindak sebagai 'Tanggal' laporan)
            $table->timestamps(); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('laporan_kerugians');
    }
};