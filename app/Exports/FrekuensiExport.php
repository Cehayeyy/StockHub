<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Illuminate\Support\Enumerable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class FrekuensiExport implements FromCollection, WithHeadings, ShouldAutoSize, WithEvents
{
    protected $items;
    protected $ringkasan;
    protected $periodeFormatted;
    
    // Variabel untuk 4 Card Data
    protected $menuTerlaris;
    protected $menuKurangDiminati;
    protected $menuProfitTertinggi;
    protected $menuProfitTerendah;

    public function __construct($items, $ringkasan, $periodeFormatted)
    {
        $this->items = $items;
        $this->ringkasan = $ringkasan;
        $this->periodeFormatted = $periodeFormatted;

        // Mencari data untuk 4 Card Sorotan (sama seperti logika di React)
        $itemsCollection = collect($items);
        
        if ($itemsCollection->isNotEmpty()) {
            $this->menuTerlaris = $itemsCollection->sortByDesc('total_kuantitas')->first();
            $this->menuKurangDiminati = $itemsCollection->sortBy('total_kuantitas')->first();
            
            $this->menuProfitTertinggi = $itemsCollection->sortByDesc('total_profit')->first();
            $this->menuProfitTerendah = $itemsCollection->sortBy('total_profit')->first();
        }
    }

    public function collection(): Enumerable
    {
        $data = collect($this->items)->map(function ($item, $index) {
            $totalTerjual = (float) $item->total_kuantitas;
            $totalOmset = (float) $item->total_nominal;
            $totalProfit = (float) $item->total_profit;
            $hargaSatuan = $totalTerjual > 0 ? round($totalOmset / $totalTerjual) : 0;
            $peringkat = $index + 1;

            $status = 'Stabil';
            if ($peringkat === 1 || $totalTerjual >= 100) {
                $status = 'Sangat Laku';
            } elseif ($peringkat <= 3 || $totalTerjual >= 50) {
                $status = 'Laku';
            } elseif ($peringkat <= 7 || $totalTerjual >= 20) {
                $status = 'Stabil';
            } elseif ($peringkat <= 9) {
                $status = 'Perlu Evaluasi';
            } else {
                $status = 'Kurang Diminati';
            }

            return [
                $peringkat,
                $item->nama_item,
                $item->kategori,
                $hargaSatuan,
                $totalTerjual,
                $totalOmset,
                $totalProfit,
                $status
            ];
        });

        $data->push([
            'TOTAL KESELURUHAN',
            '', 
            '', 
            '', 
            $this->ringkasan['totalTerjual'],
            $this->ringkasan['totalOmset'],
            $this->ringkasan['totalProfit'],
            ''
        ]);

        return $data;
    }

    public function headings(): array
    {
        // Menyiapkan teks untuk Card Data
        $terlarisNama = $this->menuTerlaris->nama_item ?? '-';
        $terlarisVal = ($this->menuTerlaris->total_kuantitas ?? 0) . ' Porsi Terjual';

        $kurangNama = $this->menuKurangDiminati->nama_item ?? '-';
        $kurangVal = ($this->menuKurangDiminati->total_kuantitas ?? 0) . ' Porsi Terjual';

        $profitTinggiNama = $this->menuProfitTertinggi->nama_item ?? '-';
        $profitTinggiVal = 'Rp ' . number_format((float)($this->menuProfitTertinggi->total_profit ?? 0), 0, ',', '.');

        $profitRendahNama = $this->menuProfitTerendah->nama_item ?? '-';
        $profitRendahVal = 'Rp ' . number_format((float)($this->menuProfitTerendah->total_profit ?? 0), 0, ',', '.');

        return [
            ['WARUNG CANGKRUK - LAPORAN FREKUENSI & ANALISIS MENU'], // 1
            ['Periode Laporan: ' . $this->periodeFormatted], // 2
            ['Tanggal Cetak: ' . now()->format('d/m/Y H:i') . ' WIB'], // 3
            [''], // 4
            ['RINGKASAN EKSEKUTIF'], // 5
            ['Total Porsi Terjual:', $this->ringkasan['totalTerjual'] . ' Porsi'], // 6
            ['Total Omset:', 'Rp ' . number_format($this->ringkasan['totalOmset'], 0, ',', '.')], // 7
            ['Total Profit:', 'Rp ' . number_format($this->ringkasan['totalProfit'], 0, ',', '.')], // 8
            [''], // 9
            ['SOROTAN MENU (TOP & BOTTOM)'], // 10
            [
                '1. Menu Terlaris:', $terlarisNama . ' (' . $terlarisVal . ')', 
                '', 
                '3. Profit Tertinggi:', $profitTinggiNama . ' (' . $profitTinggiVal . ')'
            ], // 11
            [
                '2. Kurang Diminati:', $kurangNama . ' (' . $kurangVal . ')', 
                '', 
                '4. Profit Terendah:', $profitRendahNama . ' (' . $profitRendahVal . ')'
            ], // 12
            [''], // 13
            ['RINCIAN PERINGKAT MENU'], // 14
            [
                'Peringkat',
                'Nama Menu',
                'Kategori',
                'Estimasi Harga (Rp)',
                'Total Terjual (Porsi)',
                'Total Omset (Rp)',
                'Total Profit (Rp)',
                'Status Popularitas'
            ] // 15
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

                // 2. Styling Header Ringkasan Eksekutif
                $sheet->mergeCells('A5:H5');
                $sheet->getStyle('A5')->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FF8B4513']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
                $sheet->getStyle('A6:A8')->getFont()->setBold(true);

                // 3. Styling Header Sorotan Menu (Card Data)
                $sheet->mergeCells('A10:H10');
                $sheet->getStyle('A10')->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FF8B4513']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);
                $sheet->getStyle('A11:A12')->getFont()->setBold(true); // Label Card Kiri
                $sheet->getStyle('D11:D12')->getFont()->setBold(true); // Label Card Kanan

                // 4. Styling Header Judul Rincian Menu
                $sheet->mergeCells('A14:H14');
                $sheet->getStyle('A14')->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FF8B4513']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // 5. Styling Header Kolom Tabel Utama
                $sheet->getStyle('A15:H15')->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FFD3D3D3']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // 6. Garis Tepi (Border) Tabel Utama Saja (Baris 15 ke bawah)
                $sheet->getStyle("A15:H{$highestRow}")->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                ]);

                // 7. Styling Baris Paling Bawah (TOTAL KESELURUHAN)
                $sheet->mergeCells("A{$highestRow}:D{$highestRow}");
                $sheet->getStyle("A{$highestRow}:H{$highestRow}")->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['argb' => 'FFFFFF00']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // Ratakan tengah/kanan untuk angka pada Tabel
                $sheet->getStyle("A16:A{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D16:G{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("H16:H{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            },
        ];
    }
}