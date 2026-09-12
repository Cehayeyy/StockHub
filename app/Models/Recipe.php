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
        'total_hpp',
        'target_margin',
        'harga_jual_hitungan',
        'harga_jual_real',
        'profit_real',
    ];

    // 🔥 INI ADALAH PENERJEMAH AGAR JSON TERBACA SEBAGAI ARRAY 🔥
    protected $casts = [
        'ingredients'       => 'array',
        'total_hpp'         => 'float',
        'target_margin'     => 'float',
        'harga_jual_hitungan' => 'float',
        'harga_jual_real'   => 'float',
        'profit_real'       => 'float',
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
