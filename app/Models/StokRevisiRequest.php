<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StokRevisiRequest extends Model
{
    protected $fillable = [
        'user_id',
        'tanggal',
        'status'
    ];
}

