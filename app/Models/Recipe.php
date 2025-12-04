<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Recipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'ingredients',        // json
        'total_ingredients',  // jumlah bahan
    ];

    protected $casts = [
        'ingredients' => 'array',
    ];
}
