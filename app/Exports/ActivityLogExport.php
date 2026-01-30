<?php

namespace App\Exports;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ActivityLogExport
{
    protected $logs;

    public function __construct($logs)
    {
        $this->logs = $logs;
    }

    /**
     * Generate Excel file dan return path
     */
    public function generate()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set judul kolom
        $sheet->setCellValue('A1', 'No');
        $sheet->setCellValue('B1', 'Waktu');
        $sheet->setCellValue('C1', 'Pengguna');
        $sheet->setCellValue('D1', 'Aktivitas');
        $sheet->setCellValue('E1', 'Keterangan');

        // Styling header
        $headerStyle = [
            'font' => [
                'bold' => true,
                'size' => 12,
                'color' => ['rgb' => 'FFFFFF']
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '8B5E3C']
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ];
        $sheet->getStyle('A1:E1')->applyFromArray($headerStyle);

        // Set lebar kolom
        $sheet->getColumnDimension('A')->setWidth(8);
        $sheet->getColumnDimension('B')->setWidth(20);
        $sheet->getColumnDimension('C')->setWidth(30);
        $sheet->getColumnDimension('D')->setWidth(25);
        $sheet->getColumnDimension('E')->setWidth(50);

        // Isi data
        $row = 2;
        foreach ($this->logs as $index => $log) {
            $pengguna = $log->user
                ? $log->user->name . ' (@' . $log->user->username . ')'
                : '-';

            $sheet->setCellValue('A' . $row, $index + 1);
            $sheet->setCellValue('B' . $row, $log->created_at->format('d-m-Y H:i:s'));
            $sheet->setCellValue('C' . $row, $pengguna);
            $sheet->setCellValue('D' . $row, $log->activity);
            $sheet->setCellValue('E' . $row, $log->description);

            $row++;
        }

        // Set auto-height untuk semua baris
        foreach (range(1, $row - 1) as $r) {
            $sheet->getRowDimension($r)->setRowHeight(-1);
        }

        return $spreadsheet;
    }
}
