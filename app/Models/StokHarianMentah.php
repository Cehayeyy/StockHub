<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Item;

class StokHarianMentah extends Model
{
    protected $table = 'stok_harian_mentah';

    protected $fillable = [
        'item_id',
        'tanggal',
        'stok_awal',
        'stok_masuk',
        'stok_keluar',
        'stok_akhir',
        'unit',
    ];

    protected $casts = [
        'tanggal' => 'date',
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
