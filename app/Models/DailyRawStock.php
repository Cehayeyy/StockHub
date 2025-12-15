<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyRawStock extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'date',
        'stok_awal',
        'stok_masuk',
        'stok_total',
        'pemakaian',
        'sisa',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
