<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Recipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'name',
        'division',
        'ingredients',
        'total_ingredients',
    ];

    protected $casts = [
        'ingredients' => 'array',
    ];

    /**
     * Relasi ke Item (MENU)
     */
    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Relasi ke Stok Harian Dapur
     */
    public function stokHarianDapur()
    {
        return $this->hasMany(StokHarianDapurMenu::class, 'recipe_id');
    }
}
