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
        'start_time',
        'end_time',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
