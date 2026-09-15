<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LaporanKerugian extends Model
{
    use HasFactory;

    // Kolom-kolom yang diizinkan untuk diisi secara otomatis (Mass Assignment)
    protected $fillable = [
        'division',
        'item_id',
        'kuantitas',
        'alasan',
        'catatan',
        'status',
        'staff_id',
        'supervisor_id',
    ];

    /**
     * Relasi ke tabel Item (Bahan Mentah yang terbuang)
     */
    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Relasi ke tabel User sebagai Staf yang melaporkan
     */
    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    /**
     * Relasi ke tabel User sebagai Supervisor yang memverifikasi
     */
    public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }
}