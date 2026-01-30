<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Recipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'category_id', // Agar category_id bisa disimpan
        'name',
        'division',
        'ingredients',
        'total_ingredients',
    ];

    protected $casts = [
        'ingredients' => 'array',
    ];

    /**
     * Relasi ke ItemCategory
     * (Digunakan di Controller untuk mengambil nama kategori)
     */
    public function category() // 🔥 PERBAIKAN: Arahkan ke ItemCategory
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
