<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kategori extends Model
{
    protected $table = 'kategoris';

    protected $fillable = [
        'name',
    ];

    public function items()
    {
        return $this->hasMany(Item::class);
    }
}
