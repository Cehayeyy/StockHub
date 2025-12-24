<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Recipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'division',
        'ingredients',
        'total_ingredients',
    ];

    /**
     * Casting kolom ingredients agar otomatis jadi Array/JSON
     */
    protected $casts = [
        'ingredients' => 'array',
    ];

    /**
     * Relasi ke Stok Harian Dapur (Jika diperlukan)
     */
    public function stokHarianDapur()
    {
        return $this->hasMany(StokHarianDapurMenu::class, 'recipe_id');
    }
}
