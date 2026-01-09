<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StokHarianMenu extends Model
{
    protected $table = 'stok_harian_menu';

    protected $fillable = [
        'user_id',
        'item_id',
        'tanggal',
        'stok_awal',
        'stok_masuk',
        'stok_keluar',
        'stok_akhir',
        'pemakaian',
        'is_submitted',
        'unit',
    ];

    protected $casts = [
        'tanggal' => 'date',
    ];

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            // Perbarui kolom is_submitted jika stok_keluar atau stok_masuk diubah
            if ($model->isDirty(['stok_keluar', 'stok_masuk'])) {
                $model->is_submitted = true;
            }
        });
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
