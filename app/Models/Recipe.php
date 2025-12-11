<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Recipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'ingredients',
        'total_ingredients',
    ];

    // Laravel otomatis konversi array ↔ JSON
    protected $casts = [
        'ingredients' => 'array',
    ];
}
