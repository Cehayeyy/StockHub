<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecipeIngredient extends Model
{
    use HasFactory;

    protected $fillable = [
        'recipe_id',
        'item_id',
        'amount',
        'unit',
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
