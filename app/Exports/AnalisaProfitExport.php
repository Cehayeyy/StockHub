<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Illuminate\Support\Enumerable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class AnalisaProfitExport implements FromCollection, WithHeadings, ShouldAutoSize, WithEvents
{
    protected $groupedItems;
    protected $periode;
    protected $startDate;
    protected $endDate;
    protected $totalOmsetReal;
    protected $totalProfitRealSum;
    protected $totalTerjualSum;
    protected $totalHppSum;

    public function __construct($groupedItems, $periode, $startDate, $endDate, $totalOmsetReal, $totalProfitRealSum, $totalTerjualSum, $totalHppSum)
    {
        $this->groupedItems = $groupedItems;
        $this->periode = $periode;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->totalOmsetReal = $totalOmsetReal;
        $this->totalProfitRealSum = $totalProfitRealSum;
        $this->totalTerjualSum = $totalTerjualSum;
        $this->totalHppSum = $totalHppSum;
    }

    public function collection(): Enumerable
    {
        // Menyusun isi data per menu
        $data = collect($this->groupedItems)->map(function ($row, $index) {
            return [
                $index + 1,
                $row['nama'],
                strtoupper($row['kategori']),
                $row['terjual'],
                $row['total_hpp'],
                $row['harga_jual_riil'],
                $row['profit_riil_satuan'],
                $row['total_profit_real'],
            ];
        });

        // Menambahkan baris TOTAL KESELURUHAN di paling bawah
        $data->push([
            'TOTAL KESELURUHAN',
            '', // Kosong karena akan di-merge
            '', // Kosong karena akan di-merge
            $this->totalTerjualSum,
            $this->totalHppSum,
            '-',
            '-',
            $this->totalProfitRealSum,
        ]);

        return $data;
    }

    public function headings(): array
    {
        return [
            ['WARUNG CANGKRUK - LAPORAN ANALISIS PROFIT PER MENU'],
            ['Periode Laporan: ' . $this->periode],
            ['Rentang Tanggal: ' . $this->startDate->format('d/m/Y') . ' s/d ' . $this->endDate->format('d/m/Y')],
            ['Tanggal Cetak: ' . now()->format('d/m/Y H:i') . ' WIB'],
            [''], // Baris 5 Kosong
            ['RINGKASAN EKSEKUTIF'], // Baris 6
            ['Total Omset Real / Net (Setelah Diskon & Fee):', 'Rp ' . number_format($this->totalOmsetReal, 0, ',', '.')], // Baris 7
            ['Total Profit Real (Keuntungan Bersih):', 'Rp ' . number_format($this->totalProfitRealSum, 0, ',', '.')], // Baris 8
            [''], // Baris 9 Kosong
            ['RINCIAN ANALISIS PER MENU'], // Baris 10
            [
                'No',
                'Nama Menu',
                'Kategori',
                'Terjual (Porsi)',
                'Total HPP (Rp)',
                'Harga Jual Riil Net (Rp)',
                'Profit Riil Satuan (Rp)',
                'Total Profit Real (Rp)'
            ] // Baris 11 (Header Tabel)
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();

                // 1. Styling Judul Utama
                $sheet->mergeCells('A1:H1');
                $sheet->getStyle('A1')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 14],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // 2. Styling Header Ringkasan Eksekutif (Cokelat)
                $sheet->mergeCells('A6:H6');
                $sheet->getStyle('A6')->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FF8B4513']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
                $sheet->getStyle('A7:A8')->getFont()->setBold(true);

                // 3. Styling Header Judul Rincian Menu (Cokelat)
                $sheet->mergeCells('A10:H10');
                $sheet->getStyle('A10')->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FF8B4513']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // 4. Styling Header Kolom Tabel (Abu-abu Terang)
                $sheet->getStyle('A11:H11')->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FFD3D3D3']],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                ]);

                // 5. Garis Tepi (Border) Tabel Utama
                $sheet->getStyle("A11:H{$highestRow}")->applyFromArray([
                    'borders' => [
                        'allBorders' => ['borderStyle' => Border::BORDER_THIN],
                    ],
                ]);

                // 6. Styling Baris Paling Bawah (TOTAL KESELURUHAN)
                $sheet->mergeCells("A{$highestRow}:C{$highestRow}");
                $sheet->getStyle("A{$highestRow}:H{$highestRow}")->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FFFFFF00']], // Warna Kuning agar sangat jelas
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // Ratakan tengah untuk semua kolom angka
                $sheet->getStyle("A12:A{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("C12:H{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            },
        ];
    }
}