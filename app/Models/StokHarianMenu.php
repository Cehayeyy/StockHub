<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StokHarianMenu extends Model
{
    protected $table = 'stok_harian_menu';

    protected $fillable = [
        'user_id',
        'item_id',
        'tanggal',
        'stok_awal',
        'stok_masuk',
        'stok_keluar',
        'stok_akhir',
        'pemakaian',
        'is_submitted',
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
