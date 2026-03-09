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

    // CATATAN: Boot event untuk auto-set is_submitted DIHAPUS.
    // is_submitted sekarang HANYA di-set secara eksplisit di controller
    // saat user benar-benar input pemakaian (storeMenu/updateMenu).
    // Boot event sebelumnya menyebabkan false positive karena distributeStockToMenus
    // mengupdate stok_masuk menu (dari input mentah), yang salah ditandai sebagai submitted.

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
