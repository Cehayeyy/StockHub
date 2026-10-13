<?php

namespace App\Exports;

use App\Models\Recipe;
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

class ResepExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithEvents
{
    protected $division;
    protected $rowNumber = 0;

    public function __construct($division)
    {
        $this->division = $division;
    }

    public function collection(): Enumerable 
    {
        return Recipe::where('division', $this->division)->with('category')->latest()->get();
    }

    public function map($recipe): array
    {
        $this->rowNumber++;
        
        $ingredientsList = '';
        if (is_array($recipe->ingredients)) {
            $arr = [];
            foreach ($recipe->ingredients as $ing) {
                $arr[] = ($ing['item_name'] ?? 'Bahan') . ' (' . $ing['amount'] . ' ' . $ing['unit'] . ')';
            }
            $ingredientsList = implode(', ', $arr);
        }

        return [
            $this->rowNumber,
            $recipe->name,
            $recipe->category->name ?? '-',
            $recipe->total_ingredients,
            $ingredientsList,
            $recipe->total_hpp ?? 0,
            $recipe->target_margin ?? 0,
            $recipe->harga_jual_hitungan ?? 0,
            $recipe->harga_jual_real ?? 0,
            $recipe->profit_real ?? 0,
            $recipe->created_at ? $recipe->created_at->format('d/m/Y') : '-'
        ];
    }

    public function headings(): array
    {
        return [
            ['WARUNG CANGKRUK - REKAP DATA RESEP DIVISI ' . strtoupper($this->division)],
            ['Periode Cetak: ' . date('d F Y')],
            [''], 
            [
                'No', 
                'Nama Menu Jadi', 
                'Kategori', 
                'Total Bahan', 
                'Komposisi Bahan & Jumlah', 
                'Total HPP (Rp)', 
                'Target Margin (%)', 
                'Harga Jual Hitungan (Rp)', 
                'Harga Jual Real (Rp)', 
                'Profit Real (Rp)', 
                'Tanggal Dibuat'
            ]
        ];
    }

    // 🔥 KUNCI KECANTIKAN EXCEL ADA DI SINI 🔥
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $highestRow = $sheet->getHighestRow();

                // 1. Menggabungkan (Merge) dan Menengahkan Judul & Tanggal
                $sheet->mergeCells('A1:K1');
                $sheet->mergeCells('A2:K2');
                $sheet->getStyle('A1:A2')->applyFromArray([
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                    ],
                ]);
                
                // Membesarkan font judul utama
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

                // 2. Memberikan Warna Background Cokelat & Teks Putih pada Header Tabel (Baris 4)
                $sheet->getStyle('A4:K4')->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'color' => ['argb' => 'FFFFFFFF'], // Teks Putih
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'color' => ['argb' => 'FF8B4513'], // Background Cokelat (SaddleBrown)
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                ]);

                // 3. Memberikan Garis Tepi (Border) ke Seluruh Tabel (Baris 4 sampai bawah)
                $sheet->getStyle("A4:K{$highestRow}")->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['argb' => 'FF000000'], // Border Hitam
                        ],
                    ],
                    'alignment' => [
                        'vertical' => Alignment::VERTICAL_TOP, // Teks sejajar atas
                    ],
                ]);

                // 4. Memperbaiki Kolom "Komposisi" yang Terlalu Lebar
                // Kita matikan auto-size untuk kolom E, beri lebar fix, dan aktifkan Wrap Text
                $sheet->getColumnDimension('E')->setAutoSize(false);
                $sheet->getColumnDimension('E')->setWidth(50); // Lebar maksimal 50
                $sheet->getStyle("E5:E{$highestRow}")->getAlignment()->setWrapText(true);
            },
        ];
    }
}