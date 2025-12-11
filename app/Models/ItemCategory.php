<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ItemCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'division',
    ];

    /**
     * Relasi ke item.
     * Satu kategori bisa punya banyak item.
     */
    public function items()
    {
        return $this->hasMany(Item::class, 'item_category_id');
    }

    /**
     * Relasi ke resep lewat item (opsional, kalau dibutuhkan)
     */
    public function resep()
    {
        return $this->hasManyThrough(
            Recipe::class,
            Item::class,
            'item_category_id', // FK di table items
            'item_id',          // FK di table resep
            'id',               // PK di ItemCategory
            'id'                // PK di Item
        );
    }
}
