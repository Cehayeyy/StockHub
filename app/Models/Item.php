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

    public function itemCategory()
    {
        return $this->belongsTo(ItemCategory::class, 'item_category_id');
    }

    public function resep()
    {
        return $this->hasMany(Recipe::class, 'item_id');
    }
}
