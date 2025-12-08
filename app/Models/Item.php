<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\ItemCategory;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama',
        'satuan',
        'division',        // bar / kitchen
        'kategori_item',   // optional (teks lama)
        'item_category_id' // <-- FK ke item_categories
    ];

    /**
     * Relasi ke master kategori (ItemCategory)
     */
    public function itemCategory(): BelongsTo
    {
        return $this->belongsTo(ItemCategory::class);
    }
}
