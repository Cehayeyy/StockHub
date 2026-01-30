<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Exports\ActivityLogExport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class ActivityLogController extends Controller
{
    /**
     * Halaman index laporan aktivitas (tampil di Inertia).
     */
    public function index(Request $request)
    {
        // 1. Ambil parameter filter
        $dateParam = $request->input('date');   // YYYY-MM-DD
        $search    = $request->input('search'); // Keyword pencarian

        // 2. Tentukan Tanggal (Default: Hari Ini jika kosong/invalid)
        if ($dateParam) {
            try {
                $selectedDate = Carbon::createFromFormat('Y-m-d', $dateParam)->toDateString();
            } catch (\Exception $e) {
                $selectedDate = now()->toDateString();
            }
        } else {
            $selectedDate = now()->toDateString();
        }

        // 3. Query Dasar
        $query = ActivityLog::with('user')
            ->whereDate('created_at', $selectedDate)
            ->orderBy('created_at', 'desc');

        // Filter berdasarkan role: supervisor tidak boleh lihat aktivitas owner
        if (auth()->user()->role === 'supervisor') {
            $query->whereHas('user', function ($q) {
                $q->where('role', '!=', 'owner');
            });
        }

        // 4. Filter Pencarian (Nama, Username, Aktivitas, Keterangan)
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('username', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                })
                ->orWhere('activity', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // 5. Pagination (10 Per Halaman sesuai permintaan)
        $logs = $query->paginate(10)->withQueryString();

        // 6. Transformasi Data untuk Frontend
        $logs->getCollection()->transform(function ($log) {
            return [
                'id'          => $log->id,
                'username'    => $log->user?->username,
                'name'        => $log->user?->name,
                'role'        => $log->user?->role,
                'activity'    => $log->activity,
                'description' => $log->description,
                'created_at'  => $log->created_at->toIso8601String(),
            ];
        });

        // 7. Return ke Inertia View
        return Inertia::render('LaporanAktivitas', [
            'logs' => $logs,
            'filters' => [
                'date'   => $selectedDate,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Export laporan aktivitas ke file Excel (.xlsx) atau CSV.
     */
    public function export(Request $request)
    {
        // Ambil filter yang sama dengan index
        $dateParam = $request->input('date');
        $search    = $request->input('search');

        // Validasi Tanggal
        if ($dateParam) {
            try {
                $selectedDate = Carbon::createFromFormat('Y-m-d', $dateParam)->toDateString();
            } catch (\Exception $e) {
                $selectedDate = now()->toDateString();
            }
        } else {
            $selectedDate = now()->toDateString();
        }

        // Query Data (Tanpa Pagination untuk Export)
        $query = ActivityLog::with('user')
            ->whereDate('created_at', $selectedDate);

        // Filter berdasarkan role: supervisor tidak boleh lihat aktivitas owner
        if (auth()->user()->role === 'supervisor') {
            $query->whereHas('user', function ($q) {
                $q->where('role', '!=', 'owner');
            });
        }

        // Filter Pencarian
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('username', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                })
                ->orWhere('activity', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Urutkan dari terlama ke terbaru untuk laporan excel
        $logs = $query->orderBy('created_at', 'asc')->get();

        // Nama File Excel (.xls format yang kompatibel)
        $fileName = 'laporan_aktivitas_' . $selectedDate . '.xls';

        // Generate HTML Table yang akan dibaca sebagai Excel
        $html = $this->generateExcelHTML($logs);

        return response($html, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ]);
    }

    /**
     * Generate HTML table untuk Excel
     */
    private function generateExcelHTML($logs)
    {
        $html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
        $html .= '<head>';
        $html .= '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';
        $html .= '<xml>';
        $html .= '<x:ExcelWorkbook>';
        $html .= '<x:ExcelWorksheets>';
        $html .= '<x:ExcelWorksheet>';
        $html .= '<x:Name>Laporan Aktivitas</x:Name>';
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
        $html .= '</style>';
        $html .= '</head>';
        $html .= '<body>';
        $html .= '<table>';

        // Header
        $html .= '<thead>';
        $html .= '<tr>';
        $html .= '<th>No</th>';
        $html .= '<th>Waktu</th>';
        $html .= '<th>Pengguna</th>';
        $html .= '<th>Aktivitas</th>';
        $html .= '<th>Keterangan</th>';
        $html .= '</tr>';
        $html .= '</thead>';

        // Body
        $html .= '<tbody>';
        foreach ($logs as $index => $log) {
            $pengguna = $log->user
                ? htmlspecialchars($log->user->name . ' (@' . $log->user->username . ')')
                : '-';

            $html .= '<tr>';
            $html .= '<td class="text-center">' . ($index + 1) . '</td>';
            $html .= '<td>' . $log->created_at->format('d-m-Y H:i:s') . '</td>';
            $html .= '<td>' . $pengguna . '</td>';
            $html .= '<td>' . htmlspecialchars($log->activity) . '</td>';
            $html .= '<td>' . htmlspecialchars($log->description) . '</td>';
            $html .= '</tr>';
        }
        $html .= '</tbody>';
        $html .= '</table>';
        $html .= '</body>';
        $html .= '</html>';

        return $html;
    }
}
