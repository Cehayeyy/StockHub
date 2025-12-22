<?php

namespace App\Services;

use App\Models\StokHarianMentah;
use Carbon\Carbon;

class StokHarianMentahService
{
    public static function simpan(
        int $itemId,
        string $tanggal,
        float $stokMasuk,
        string $sumberMasuk
    ) {
        $tanggal = Carbon::parse($tanggal);

        $hariIni = StokHarianMentah::where('item_id', $itemId)
            ->whereDate('tanggal', $tanggal)
            ->first();

        if ($hariIni) {
            $stokAwal  = $hariIni->stok_awal;
            $stokMasuk = $hariIni->stok_masuk + $stokMasuk;
        } else {
            $stokKemarin = StokHarianMentah::where('item_id', $itemId)
                ->whereDate('tanggal', $tanggal->copy()->subDay())
                ->first();

            $stokAwal = $stokKemarin?->stok_akhir ?? 0;
        }

        $stokAkhir = $stokAwal + $stokMasuk;

        return StokHarianMentah::updateOrCreate(
            [
                'item_id' => $itemId,
                'tanggal' => $tanggal,
            ],
            [
                'stok_awal'    => $stokAwal,
                'stok_masuk'   => $stokMasuk,
                'stok_akhir'   => $stokAkhir,
                'sumber_masuk' => $sumberMasuk,
            ]
        );
    }
}
