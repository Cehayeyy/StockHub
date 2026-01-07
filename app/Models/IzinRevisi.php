<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IzinRevisi extends Model
{
    protected $table = 'izin_revisi';

    protected $fillable = [
        'user_id',
        'role',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
