<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\StokHarianMentah;
use App\Models\StokHarianDapurMentah;
use Carbon\Carbon;

class VerifikasiStokController extends Controller
{
    public function index(Request $request)
    {
        $tab = $request->get('tab', 'bar');
        $rawDate = $request->get('tanggal') ?: Carbon::now()->toDateString();
        $mondayDate = Carbon::parse($rawDate)->startOfWeek(Carbon::MONDAY)->toDateString();

        if ($tab === 'bar') {
            $items = StokHarianMentah::with('item')
                ->whereDate('tanggal', $mondayDate)
                ->get()
                ->map(fn($item) => [
                    'id' => $item->id,
                    'nama' => $item->item->nama,
                    'satuan' => $item->unit ?? $item->item->satuan,
                    'stok_sistem' => $item->stok_akhir,
                ]);
        } else {
            $items = StokHarianDapurMentah::with('item')
                ->whereDate('tanggal', $mondayDate)
                ->get()
                ->map(fn($item) => [
                    'id' => $item->id,
                    'nama' => $item->item->nama,
                    'satuan' => $item->unit ?? $item->item->satuan,
                    'stok_sistem' => $item->stok_akhir,
                ]);
        }

        return Inertia::render('VerifikasiStok', [
            'items'          => $items,
            'tab'            => $tab,
            'tanggal_picker' => $rawDate,
            'tanggal_data'   => $mondayDate
        ]);
    }

    // ==================== 🔽 EXPORT EXCEL (HTML-BASED) ====================
    public function export(Request $request)
    {
        $tab = $request->get('tab', 'bar');
        $rawDate = $request->get('tanggal') ?: Carbon::now()->toDateString();
        $mondayDate = Carbon::parse($rawDate)->startOfWeek(Carbon::MONDAY)->toDateString();

        $items = $tab === 'bar'
            ? StokHarianMentah::with('item')->whereDate('tanggal', $mondayDate)->get()
            : StokHarianDapurMentah::with('item')->whereDate('tanggal', $mondayDate)->get();

        // Nama file Excel (.xls)
        $divisionName = $tab === 'bar' ? 'Bar' : 'Dapur';
        $filename = "verifikasi-stok-{$tab}-{$mondayDate}.xls";

        // Generate HTML Table untuk Excel
        $html = $this->generateExcelHTML($items, $mondayDate, $divisionName);

        return response($html, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ]);
    }

    /**
     * Generate HTML table untuk Excel
     */
    private function generateExcelHTML($items, $date, $division)
    {
        $formattedDate = Carbon::parse($date)->locale('id')->isoFormat('D MMMM YYYY');

        $html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
        $html .= '<head>';
        $html .= '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';
        $html .= '<xml>';
        $html .= '<x:ExcelWorkbook>';
        $html .= '<x:ExcelWorksheets>';
        $html .= '<x:ExcelWorksheet>';
        $html .= '<x:Name>Verifikasi Stok</x:Name>';
        $html .= '<x:WorksheetOptions>';
        $html .= '<x:Print><x:ValidPrinterInfo/></x:Print>';
        $html .= '</x:WorksheetOptions>';
        $html .= '</x:ExcelWorksheet>';
        $html .= '</x:ExcelWorksheets>';
        $html .= '</x:ExcelWorkbook>';
        $html .= '</xml>';
        $html .= '<style>';
        $html .= 'table { border-collapse: collapse; width: 100%; }';
        $html .= 'th { background-color: #8B5E3C; color: white; font-weight: bold; padding: 10px; text-align: center; border: 1px solid #000; }';
        $html .= 'td { padding: 8px; border: 1px solid #ddd; }';
        $html .= '.text-center { text-align: center; }';
        $html .= '.title { font-size: 16px; font-weight: bold; text-align: center; padding: 10px; }';
        $html .= '.subtitle { font-size: 12px; text-align: center; padding: 5px; color: #666; }';
        $html .= '</style>';
        $html .= '</head>';
        $html .= '<body>';

        // Title
        $html .= '<div class="title">VERIFIKASI STOK MINGGUAN - ' . strtoupper($division) . '</div>';
        $html .= '<div class="subtitle">Tanggal Acuan: ' . $formattedDate . ' (Senin)</div>';
        $html .= '<br/>';

        $html .= '<table>';

        // Header
        $html .= '<thead>';
        $html .= '<tr>';
        $html .= '<th>No</th>';
        $html .= '<th>Nama Item</th>';
        $html .= '<th>Satuan</th>';
        $html .= '<th>Stok Sistem (Senin)</th>';
        $html .= '<th>Stok Fisik</th>';
        $html .= '<th>Selisih</th>';
        $html .= '<th>Status</th>';
        $html .= '</tr>';
        $html .= '</thead>';

        // Body
        $html .= '<tbody>';
        foreach ($items as $index => $item) {
            $namaItem = htmlspecialchars(optional($item->item)->nama ?? '-');
            $satuan = htmlspecialchars($item->unit ?? optional($item->item)->satuan ?? '-');
            $stokSistem = $item->stok_akhir ?? 0;

            $html .= '<tr>';
            $html .= '<td class="text-center">' . ($index + 1) . '</td>';
            $html .= '<td>' . $namaItem . '</td>';
            $html .= '<td class="text-center">' . $satuan . '</td>';
            $html .= '<td class="text-center">' . $stokSistem . '</td>';
            $html .= '<td class="text-center"></td>'; // Kosong untuk diisi manual
            $html .= '<td class="text-center"></td>'; // Kosong untuk diisi manual
            $html .= '<td class="text-center"></td>'; // Kosong untuk diisi manual
            $html .= '</tr>';
        }
        $html .= '</tbody>';
        $html .= '</table>';
        $html .= '</body>';
        $html .= '</html>';

        return $html;
    }
}
