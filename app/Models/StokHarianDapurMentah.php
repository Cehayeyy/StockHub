<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Item;

class StokHarianDapurMentah extends Model
{
    protected $table = 'stok_harian_dapur_mentah';

    protected $fillable = [
        'item_id',
        'tanggal',
        'stok_awal',
        'stok_masuk',
        'stok_keluar',
        'stok_akhir',
        'unit',
        'is_submitted',
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
