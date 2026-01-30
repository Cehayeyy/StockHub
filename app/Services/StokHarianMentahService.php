<?php

namespace App\Services;

use App\Models\StokHarianMentah;
use Carbon\Carbon;

class StokHarianMentahService
{
    /**
     * Simpan/Update stok harian mentah
     *
     * @param int $itemId ID item bahan mentah
     * @param string $tanggal Tanggal stok
     * @param float $stokMasuk Jumlah stok masuk yang ditambahkan
     */
    public static function simpan(
        int $itemId,
        string $tanggal,
        float $stokMasuk
    ) {
        $tanggal = Carbon::parse($tanggal);

        $hariIni = StokHarianMentah::where('item_id', $itemId)
            ->whereDate('tanggal', $tanggal)
            ->first();

        if ($hariIni) {
            $stokAwal  = $hariIni->stok_awal;
            $stokMasuk = $hariIni->stok_masuk + $stokMasuk;
            $stokKeluar = $hariIni->stok_keluar ?? 0;
        } else {
            $stokKemarin = StokHarianMentah::where('item_id', $itemId)
                ->whereDate('tanggal', $tanggal->copy()->subDay())
                ->first();

            $stokAwal = $stokKemarin?->stok_akhir ?? 0;
            $stokKeluar = 0;
        }

        // Rumus: Stok Akhir = Stok Awal + Stok Masuk - Stok Keluar
        $stokAkhir = $stokAwal + $stokMasuk - $stokKeluar;

        return StokHarianMentah::updateOrCreate(
            [
                'item_id' => $itemId,
                'tanggal' => $tanggal,
            ],
            [
                'stok_awal'    => $stokAwal,
                'stok_masuk'   => $stokMasuk,
                'stok_keluar'  => $stokKeluar,
                'stok_akhir'   => $stokAkhir,
            ]
        );
    }
}
