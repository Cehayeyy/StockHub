<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Recipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'category_id',
        'name',
        'division',
        'ingredients',
        'total_ingredients',
    ];

    // 🔥 INI ADALAH PENERJEMAH AGAR JSON TERBACA SEBAGAI ARRAY 🔥
    protected $casts = [
        'ingredients' => 'array',
    ];

    /**
     * Relasi ke ItemCategory
     */
    public function category()
    {
        return $this->belongsTo(ItemCategory::class, 'category_id');
    }

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
