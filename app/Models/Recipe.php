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
        'division',
    ];

    protected $casts = [
        'ingredients' => 'array',
    ];

    public function dailyStocks()
    {
        return $this->hasMany(DailyMenuStock::class);
    }
}
