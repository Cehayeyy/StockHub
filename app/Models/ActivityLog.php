<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory;

    // 🔥 1. Tambahkan 'details' agar data diizinkan masuk ke database
    protected $fillable = [
        'user_id',
        'activity',
        'description',
        'details', 
    ];

    // 🔥 2. Tambahkan casts agar array otomatis diubah menjadi JSON saat disimpan
    protected $casts = [
        'details' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }
}