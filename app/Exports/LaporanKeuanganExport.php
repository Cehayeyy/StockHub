<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

class LaporanKeuanganExport implements FromArray, WithEvents, WithColumnWidths, WithColumnFormatting
{
    protected $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    // Helper untuk hitung persentase
    private function pct($value, $total)
    {
        return $total > 0 ? ($value / $total) : 0;
    }

    public function array(): array
    {
        $d = $this->data;

        // Kalkulasi Total
        $totalPenjualan = $d['pendapatanBar'] + $d['pendapatanDapur'] + $d['pendapatanTrekking'];
        $totalHpp = $d['hppBar'] + $d['hppDapur'] + $d['hppTrekking'];
        $labaKotor = $totalPenjualan - $totalHpp;

        $totalOpex = $d['biayaGaji'] + $d['perlengkapanWarung'] + $d['kerugianBahanBaku'] +
                     $d['adminBank'] + $d['operasionalWarung'] + $d['biayaSewa'] +
                     $d['perbaikanInventaris'] + $d['pemeliharaanWarung'] + $d['biayaMarketing'] +
                     $d['biayaLainLain'] + $d['biayaPajak'] + $d['utilitas'];

        $labaSetelahBeban = $labaKotor - $totalOpex;
        $bebanLain = $d['bebanLainLain'];
        $labaSebelumPajak = $labaSetelahBeban - $bebanLain;
        $pajak = $d['pajakPenghasilan'];
        $labaBersih = $labaSebelumPajak - $pajak;

        /* 
           Merakit baris per baris Excel.
           Sengaja tidak ada baris kosong ['','',''] di tengah data
           agar tabelnya menyatu rapi dan bordernya tidak terputus.
        */
        return [
            ['WARUNG CANGKRUK - LAPORAN LABA RUGI', '', ''],
            ['Periode: ' . $d['periode'], '', ''],
            ['Dicetak pada: ' . now()->format('d/m/Y H:i') . ' WIB', '', ''],
            
            // Baris 4: Header Tabel
            ['Nama Akun', 'Transaksi', '%'],

            // Baris 5 dst: Data
            ['PENJUALAN', '', ''],
            ['Pendapatan Bar', $d['pendapatanBar'], $this->pct($d['pendapatanBar'], $totalPenjualan)],
            ['Pendapatan Dapur', $d['pendapatanDapur'], $this->pct($d['pendapatanDapur'], $totalPenjualan)],
            ['Pendapatan Trekking', $d['pendapatanTrekking'], $this->pct($d['pendapatanTrekking'], $totalPenjualan)],
            ['TOTAL PENJUALAN', $totalPenjualan, $this->pct($totalPenjualan, $totalPenjualan)],

            ['HARGA POKOK PENJUALAN', '', ''],
            ['Harga Pokok Penjualan Dapur', $d['hppDapur'], $this->pct($d['hppDapur'], $totalPenjualan)],
            ['Harga Pokok Penjualan Bar', $d['hppBar'], $this->pct($d['hppBar'], $totalPenjualan)],
            ['Harga Pokok Penjualan Trekking', $d['hppTrekking'], $this->pct($d['hppTrekking'], $totalPenjualan)],
            ['JUMLAH HARGA POKOK PENJUALAN', $totalHpp, $this->pct($totalHpp, $totalPenjualan)],

            ['LABA (RUGI) KOTOR', $labaKotor, $this->pct($labaKotor, $totalPenjualan)],

            ['BEBAN OPERASIONAL', '', ''],
            ['Biaya Gaji', $d['biayaGaji'], $this->pct($d['biayaGaji'], $totalPenjualan)],
            ['Perlengkapan Warung', $d['perlengkapanWarung'], $this->pct($d['perlengkapanWarung'], $totalPenjualan)],
            ['Biaya Kerugian Bahan Baku', $d['kerugianBahanBaku'], $this->pct($d['kerugianBahanBaku'], $totalPenjualan)],
            ['Biaya Administrasi Bank', $d['adminBank'], $this->pct($d['adminBank'], $totalPenjualan)],
            ['Biaya Operasional Warung', $d['operasionalWarung'], $this->pct($d['operasionalWarung'], $totalPenjualan)],
            ['Biaya Sewa', $d['biayaSewa'], $this->pct($d['biayaSewa'], $totalPenjualan)],
            ['Biaya Perbaikan Inventaris Peralatan Warung', $d['perbaikanInventaris'], $this->pct($d['perbaikanInventaris'], $totalPenjualan)],
            ['Biaya Perbaikan dan Pemeliharaan Warung', $d['pemeliharaanWarung'], $this->pct($d['pemeliharaanWarung'], $totalPenjualan)],
            ['Biaya Marketing', $d['biayaMarketing'], $this->pct($d['biayaMarketing'], $totalPenjualan)],
            ['Biaya Lain-lain', $d['biayaLainLain'], $this->pct($d['biayaLainLain'], $totalPenjualan)],
            ['Biaya Pajak (OPEX)', $d['biayaPajak'], $this->pct($d['biayaPajak'], $totalPenjualan)],
            ['Wifi, Listrik dan Air', $d['utilitas'], $this->pct($d['utilitas'], $totalPenjualan)],
            ['TOTAL BEBAN OPERASIONAL', $totalOpex, $this->pct($totalOpex, $totalPenjualan)],

            ['LABA (RUGI) USAHA SETELAH BEBAN', $labaSetelahBeban, $this->pct($labaSetelahBeban, $totalPenjualan)],

            ['BEBAN LAIN', '', ''],
            ['Jumlah (Beban) dan Pendapatan Lain-Lain', $bebanLain, $this->pct($bebanLain, $totalPenjualan)],

            ['LABA (RUGI) SEBELUM PAJAK', $labaSebelumPajak, $this->pct($labaSebelumPajak, $totalPenjualan)],
            ['PAJAK PENGHASILAN', $pajak, $this->pct($pajak, $totalPenjualan)],
            ['LABA (RUGI) SETELAH PAJAK', $labaBersih, $this->pct($labaBersih, $totalPenjualan)],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 50, // Lebar Nama Akun
            'B' => 22, // Lebar Transaksi
            'C' => 12, // Lebar Persen (%)
        ];
    }

    public function columnFormats(): array
    {
        return [
            // Format Akuntansi Profesional: Rp di kiri, angka di kanan. Angka minus jadi merah & dalam kurung (Rp ...)
            'B' => '"Rp"* #,##0;[Red]"Rp"* (#,##0);_("Rp"* "-"_);_(@_)',
            'C' => '0.0%', // Format Persentase
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastRow = $sheet->getHighestRow();

                // 1. Style Judul Laporan (Baris 1-3)
                $sheet->mergeCells('A1:C1');
                $sheet->mergeCells('A2:C2');
                $sheet->mergeCells('A3:C3');
                
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
                $sheet->getStyle('A1:A3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                // 2. Style Table Header Cokelat (Baris 4)
                $sheet->getStyle('A4:C4')->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FF8B5E3C']], 
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);

                // 3. Tambahkan Garis Border Keseluruhan Tabel (Baris 4 sampai Akhir)
                $sheet->getStyle('A4:C' . $lastRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['argb' => 'FF000000'],
                        ],
                    ],
                ]);

                // 4. Auto-Style dan Indentasi per Baris Data (Mulai baris 5)
                for ($row = 5; $row <= $lastRow; $row++) {
                    $cellValue = $sheet->getCell('A' . $row)->getValue();

                    // Bagian Kategori Utama (Background Krem Gelap, Teks Bold)
                    if (in_array($cellValue, ['PENJUALAN', 'HARGA POKOK PENJUALAN', 'BEBAN OPERASIONAL', 'BEBAN LAIN'])) {
                        $sheet->getStyle('A' . $row . ':C' . $row)->applyFromArray([
                            'font' => ['bold' => true],
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FFE8D5C4']], 
                        ]);
                    }
                    // Baris Total / Laba / Pajak (Background Kuning Keemasan Terang, Teks Bold seperti di Analisa Profit)
                    elseif (is_string($cellValue) && (str_starts_with($cellValue, 'TOTAL') || str_starts_with($cellValue, 'JUMLAH') || str_starts_with($cellValue, 'LABA') || str_starts_with($cellValue, 'PAJAK'))) {
                        $sheet->getStyle('A' . $row . ':C' . $row)->applyFromArray([
                            'font' => ['bold' => true],
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FFFFE6B3']], 
                        ]);
                    }
                    // Sub-item biasa (Berikan Indentasi/Menjorok ke dalam agar rapi)
                    else {
                        $sheet->getStyle('A' . $row)->getAlignment()->setIndent(2);
                    }
                }
            }
        ];
    }
}