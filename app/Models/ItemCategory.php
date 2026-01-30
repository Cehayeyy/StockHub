<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ItemCategory extends Model
{
    use HasFactory;

    protected $table = 'item_categories';

    protected $fillable = [
        'name',
        'division',
    ];

    /**
     * Relasi ke Item.
     * Satu kategori bisa punya banyak item.
     */
    public function items()
    {
        return $this->hasMany(Item::class, 'item_category_id');
    }

    /**
     * Relasi ke Resep (LANGSUNG).
     * Satu kategori bisa digunakan oleh banyak resep.
     * (Ini tambahan baru agar sinkron dengan kolom category_id di tabel recipes)
     */
    public function recipes()
    {
        return $this->hasMany(Recipe::class, 'category_id');
    }
}
