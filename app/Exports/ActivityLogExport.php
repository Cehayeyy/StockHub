<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Illuminate\Support\Enumerable;
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

class ActivityLogExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithEvents
{
    protected $logs;
    protected $rowNumber = 0;

    public function __construct($logs)
    {
        $this->logs = $logs;
    }

    public function collection(): Enumerable 
    {
        return new Collection($this->logs);
    }

    public function map($log): array
    {
        $this->rowNumber++;
        
        $pengguna = $log->user 
            ? $log->user->name . ' (@' . $log->user->username . ')' 
            : '-';

        return [
            $this->rowNumber,
            $log->created_at->format('d-m-Y H:i:s'),
            $pengguna,
            $log->activity,
            $log->description
        ];
    }

    public function headings(): array
    {
        return [
            ['LAPORAN AKTIVITAS PENGGUNA - WARUNG CANGKRUK'],
            ['Tanggal Cetak: ' . \Carbon\Carbon::now()->locale('id')->isoFormat('D MMMM YYYY HH:mm')],
            [''],
            [
                'No',
                'Waktu',
                'Pengguna',
                'Aktivitas',
                'Keterangan'
            ]
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();

                // 1. Merge & Ratakan Tengah Judul
                $sheet->mergeCells('A1:E1');
                $sheet->mergeCells('A2:E2');
                $sheet->getStyle('A1:A2')->applyFromArray([
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                    ],
                ]);
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
                $sheet->getStyle('A2')->getFont()->setSize(10);

                // 2. Pewarnaan Header Tabel (Cokelat)
                $sheet->getStyle('A4:E4')->applyFromArray([
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

                // 3. Garis Tepi (Border) Seluruh Tabel
                $sheet->getStyle("A4:E{$highestRow}")->applyFromArray([
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

                // 4. Wrap text dan Width fix untuk Keterangan
                $sheet->getColumnDimension('E')->setAutoSize(false);
                $sheet->getColumnDimension('E')->setWidth(50);
                $sheet->getStyle("E5:E{$highestRow}")->getAlignment()->setWrapText(true);

                // Ratakan Tengah untuk No, Waktu, dan Aktivitas
                $sheet->getStyle("A5:B{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D5:D{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            },
        ];
    }
}