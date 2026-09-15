<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesReport extends Model
{
    protected $table = 'sales_reports';

    protected $fillable = [
        'nomor_nota',
        'tanggal_transaksi',
        'partner_nota',
        'diskon_persen',
        'fee_mitra',
        'subtotal',
        'total_bersih',
        'user_id',
    ];

    protected $casts = [
        'tanggal_transaksi' => 'date',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(SalesReportItem::class, 'sales_report_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}