<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StokHarianDapurMenu extends Model
{
    protected $table = 'stok_harian_dapur_menu';

    protected $fillable = [
        'recipe_id',
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

    /**
     * =========================
     * RELATION
     * =========================
     */
    public function recipe()
    {
        return $this->belongsTo(Recipe::class);
    }
}
