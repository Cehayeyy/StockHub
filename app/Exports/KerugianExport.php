<?php

namespace App\Exports;

use App\Models\LaporanKerugian;
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

class KerugianExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithEvents
{
    protected $rowNumber = 0;

    public function collection(): Enumerable 
    {
        // Mengambil semua data kerugian untuk di-export
        return LaporanKerugian::with(['item:id,nama,satuan', 'staff:id,name,username,role', 'supervisor:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function map($item): array
    {
        $this->rowNumber++;
        
        $tanggal = $item->created_at ? $item->created_at->format('d F Y') : '-';
        $namaItem = $item->item->nama ?? '-';
        $kuantitas = number_format($item->kuantitas, 0) . ' porsi';
        
        // Format pelapor lengkap dengan divisi
        $staffName = $item->staff->name ?? $item->staff->username ?? 'Staff';
        $divisiStaff = strtolower($item->staff->division ?? $item->staff->role ?? 'umum');
        $pelapor = "{$staffName} ({$divisiStaff})";

        return [
            $this->rowNumber,
            $tanggal,
            $namaItem,
            $kuantitas,
            $item->alasan ?? '-',
            $pelapor,
            $item->status ?? '-',
            $item->supervisor->name ?? '-'
        ];
    }

    public function headings(): array
    {
        return [
            ['REKAPITULASI LAPORAN KERUGIAN BAHAN BAKU'],
            ['Warung Cangkruk - Dicetak pada: ' . date('d F Y H:i') . ' WIB'],
            [''], 
            [
                'No', 
                'Tanggal', 
                'Nama Bahan Baku', 
                'Kuantitas', 
                'Alasan Kerugian', 
                'Pelapor (Divisi)', 
                'Status', 
                'Verifikator'
            ]
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();

                // 1. Merge & Tengah untuk Judul
                $sheet->mergeCells('A1:H1');
                $sheet->mergeCells('A2:H2');
                $sheet->getStyle('A1:A2')->applyFromArray([
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                    ],
                ]);
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
                $sheet->getStyle('A2')->getFont()->setSize(10); // Tanggal cetak sedikit lebih kecil

                // 2. Pewarnaan Header Tabel (Cokelat)
                $sheet->getStyle('A4:H4')->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'color' => ['argb' => 'FFFFFFFF'], // Teks Putih
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'color' => ['argb' => 'FF8B4513'], // Cokelat (SaddleBrown)
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                ]);

                // 3. Garis Tepi (Border) Seluruh Tabel
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

                // 4. Pengaturan Wrap Text untuk Alasan Kerugian (Kolom E)
                $sheet->getColumnDimension('E')->setAutoSize(false);
                $sheet->getColumnDimension('E')->setWidth(40);
                $sheet->getStyle("E5:E{$highestRow}")->getAlignment()->setWrapText(true);

                // Ratakan tengah untuk kolom No, Tanggal, Kuantitas, Status
                $sheet->getStyle("A5:B{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D5:D{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("G5:G{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            },
        ];
    }
}