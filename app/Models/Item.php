<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama',
        'item_category_id',
        'division',
        'satuan',
        'kategori_item',
        'harga_dasar',
    ];

    protected $casts = [
        'harga_dasar' => 'float',
    ];

    // =========================================================================
    // 🔥 SENSOR OTOMATIS: AUTO-SYNC HPP RESEP KETIKA HARGA BAHAN BERUBAH 🔥
    // =========================================================================
    protected static function booted()
    {
        static::updated(function ($item) {
            // Cek apakah nilai 'harga_dasar' benar-benar berubah saat Item disimpan
            if ($item->isDirty('harga_dasar')) {
                
                // Ambil semua data resep
                $recipes = \App\Models\Recipe::all();

                foreach ($recipes as $recipe) {
                    $ingredients = $recipe->ingredients ?? [];
                    $isAffected = false;

                    // 1. Cek apakah bahan mentah ini dipakai di resep tersebut
                    foreach ($ingredients as $ing) {
                        if (isset($ing['item_id']) && $ing['item_id'] == $item->id) {
                            $isAffected = true;
                            break;
                        }
                    }

                    // 2. Jika dipakai, hitung ulang total HPP resep ini!
                    if ($isAffected) {
                        $newTotalHpp = 0;

                        // Loop semua bahan mentah di resep ini untuk ditotal harganya
                        foreach ($ingredients as $ing) {
                            $ingItemId = $ing['item_id'] ?? null;
                            $amount = (float) ($ing['amount'] ?? 1); // porsi/takaran

                            if ($ingItemId) {
                                // Jika bahan yang sedang di-loop adalah bahan yang harganya baru diupdate
                                // gunakan harga baru. Jika bukan, ambil dari database.
                                if ($ingItemId == $item->id) {
                                    $hargaBahan = (float) $item->harga_dasar;
                                } else {
                                    $bahanLain = \App\Models\Item::find($ingItemId);
                                    $hargaBahan = $bahanLain ? (float) $bahanLain->harga_dasar : 0;
                                }
                                
                                $newTotalHpp += ($hargaBahan * $amount);
                            }
                        }

                        // 3. Kalkulasi ulang Harga Jual Hitungan dan Profit Real
                        $targetMargin = (float) $recipe->target_margin;
                        // Rumus Harga Hitungan: HPP + (HPP * Target Margin / 100)
                        $hargaJualHitungan = $newTotalHpp * (1 + ($targetMargin / 100));
                        // Rumus Profit Aktual: Harga Jual Real - Total HPP Baru
                        $profitReal = (float) $recipe->harga_jual_real - $newTotalHpp;

                        // 4. Simpan nilai baru ke resep tersebut secara diam-diam
                        $recipe->update([
                            'total_hpp'           => $newTotalHpp,
                            'harga_jual_hitungan' => $hargaJualHitungan,
                            'profit_real'         => $profitReal,
                        ]);
                    }
                }
            }
        });
    }

    public function itemCategory()
    {
        return $this->belongsTo(ItemCategory::class, 'item_category_id');
    }

    public function resep()
    {
        return $this->hasMany(Recipe::class, 'item_id');
    }
}