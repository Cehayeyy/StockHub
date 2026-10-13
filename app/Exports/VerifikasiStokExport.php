<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Illuminate\Support\Enumerable; // 🔥 Tambahan untuk PHP 8.3
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class VerifikasiStokExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithEvents
{
    protected $items;
    protected $date;
    protected $division;
    protected $fisikData;
    protected $catatanData;
    protected $sistemData;
    protected $rowNumber = 0;

    public function __construct($items, $date, $division, $fisikData, $catatanData, $sistemData)
    {
        $this->items = $items;
        $this->date = $date;
        $this->division = $division;
        $this->fisikData = $fisikData;
        $this->catatanData = $catatanData;
        $this->sistemData = $sistemData;
    }

    // 🔥 Perbaikan Tipe Data
    public function collection(): Enumerable 
    {
        return new Collection($this->items);
    }

    public function map($item): array
    {
        $this->rowNumber++;
        
        $namaItem = $item->item->nama ?? '-';
        $satuan = $item->unit ?? $item->item->satuan ?? '-';
        
        $stokSistem = isset($this->sistemData[$item->id]) ? (float) $this->sistemData[$item->id] : ($item->stok_akhir ?? 0);
        $stokFisik = isset($this->fisikData[$item->id]) ? (float) $this->fisikData[$item->id] : $stokSistem;
        
        // 🔥 Perbaikan Simbol Pengurangan yang Hilang
        $selisih = $stokFisik - $stokSistem; 
        
        $status = $selisih == 0 ? 'Sesuai' : ($selisih > 0 ? 'Lebih' : 'Kurang');
        $selisihDisplay = $selisih > 0 ? '+' . $selisih : (string) $selisih;
        $catatan = !empty($this->catatanData[$item->id]) ? $this->catatanData[$item->id] : '-';

        return [
            $this->rowNumber,
            $namaItem,
            $satuan,
            $stokSistem,
            $stokFisik,
            $selisihDisplay,
            $status,
            $catatan
        ];
    }

    public function headings(): array
    {
        return [
            ['VERIFIKASI STOK - ' . strtoupper($this->division)],
            ['Tanggal Verifikasi: ' . \Carbon\Carbon::parse($this->date)->locale('id')->isoFormat('D MMMM YYYY')],
            [''], 
            [
                'No', 
                'Nama Item', 
                'Satuan', 
                'Stok Sistem', 
                'Stok Fisik', 
                'Selisih', 
                'Status', 
                'Catatan'
            ]
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();

                $sheet->mergeCells('A1:H1');
                $sheet->mergeCells('A2:H2');
                $sheet->getStyle('A1:A2')->applyFromArray([
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                    ],
                ]);
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
                $sheet->getStyle('A2')->getFont()->setSize(10);

                $sheet->getStyle('A4:H4')->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'color' => ['argb' => 'FFFFFFFF'], 
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'color' => ['argb' => 'FF8B4513'], 
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                ]);

                $sheet->getStyle("A4:H{$highestRow}")->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['argb' => 'FF000000'],
                        ],
                    ],
                    'alignment' => [
                        'vertical' => Alignment::VERTICAL_TOP,
                    ],
                ]);

                $sheet->getColumnDimension('H')->setAutoSize(false);
                $sheet->getColumnDimension('H')->setWidth(40);
                $sheet->getStyle("H5:H{$highestRow}")->getAlignment()->setWrapText(true);

                $sheet->getStyle("A5:A{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("C5:G{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            },
        ];
    }
}