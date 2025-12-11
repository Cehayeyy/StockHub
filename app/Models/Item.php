<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama',
        'item_category_id',
        'division',
        'satuan',
        'kategori_item',
    ];

    /**
     * Relasi ke kategori.
     * Setiap item punya satu kategori.
     */
    public function itemCategory()
    {
        return $this->belongsTo(ItemCategory::class, 'item_category_id');
    }

    /**
     * Relasi ke resep.
     * Satu item bisa punya banyak resep.
     */
    public function resep()
    {
        return $this->hasMany(Recipe::class, 'item_id');
    }
}
