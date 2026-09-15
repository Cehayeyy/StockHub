<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesReportItem extends Model
{
    protected $table = 'sales_report_items';

    protected $fillable = [
        'sales_report_id',
        'item_id',
        'quantity',
        'harga_satuan',
        'subtotal',
    ];

    public function salesReport(): BelongsTo
    {
        return $this->belongsTo(SalesReport::class, 'sales_report_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }
}