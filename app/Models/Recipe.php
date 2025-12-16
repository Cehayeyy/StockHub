<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Recipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'division',
        'ingredients',
        'total_ingredients',
    ];

    protected $casts = [
        'ingredients' => 'array',
    ];

    // ❌ RELASI DAPUR DIHAPUS
    // public function dailyStocks()
    // {
    //     return $this->hasMany(DailyMenuStock::class);
    // }
}
