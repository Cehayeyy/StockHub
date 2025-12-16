<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StokHarianDapurMenu extends Model
{
    protected $table = 'stok_harian_dapur_menu';

    protected $fillable = [
        'item_id',
        'tanggal',
        'stok_awal',
        'stok_masuk',
        'stok_keluar',
        'stok_akhir',
    ];

    protected $casts = [
        'tanggal' => 'date',
    ];

    /**
     * =========================
     * RELATION
     * =========================
     */
    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
