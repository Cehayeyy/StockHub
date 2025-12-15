<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyMenuStock extends Model
{
    use HasFactory;

    protected $table = 'daily_menu_stocks';

    protected $fillable = [
        'recipe_id',
        'date',
        'stok_awal',
        'stok_masuk',
        'stok_total',
        'pemakaian',
        'sisa',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    /**
     * Relasi ke Recipe (Menu)
     * 1 stok harian → 1 recipe
     */
    public function recipe()
    {
        return $this->belongsTo(Recipe::class);
    }
}
