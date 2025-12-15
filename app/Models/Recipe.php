<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Recipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'division',          // pastikan ada
        'ingredients',
        'total_ingredients',
        'division',
    ];

    protected $casts = [
        'ingredients' => 'array', // wajib kalau simpan array
    ];

    public function dailyStocks()
    {
        return $this->hasMany(DailyMenuStock::class);
    }
}
