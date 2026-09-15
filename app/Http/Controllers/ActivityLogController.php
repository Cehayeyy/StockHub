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
        $user = $request->user();

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
        $query = ActivityLog::with('user:id,name,role,username')
            ->whereDate('created_at', $selectedDate)
            ->orderBy('created_at', 'desc');

        // 🔥 JIKA AKUN STAFF, BATASI HANYA MENAMPILKAN AKTIVITAS MILIKNYA SENDIRI
        if (!in_array($user->role, ['owner', 'supervisor'])) {
            $query->where('user_id', $user->id);
        }

        // Filter berdasarkan role: supervisor tidak boleh lihat aktivitas owner
        if ($user->role === 'supervisor') {
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
        return Inertia::render('Laporan/LaporanAktivitas', [
            'logs' => $logs,
            'filters' => [
                'date'   => $selectedDate,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Export laporan aktivitas ke file Excel (.xls) atau CSV.
     */
    public function export(Request $request)
    {
        $user = $request->user();

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
        $query = ActivityLog::with('user:id,name,role,username')
            ->whereDate('created_at', $selectedDate);

        // 🔥 JIKA AKUN STAFF, BATASI HANYA EXPORT AKTIVITAS MILIKNYA SENDIRI
        if (!in_array($user->role, ['owner', 'supervisor'])) {
            $query->where('user_id', $user->id);
        }

        // Filter berdasarkan role: supervisor tidak boleh lihat aktivitas owner
        if ($user->role === 'supervisor') {
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
        $html .= 'table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; }';
        $html .= '.title { font-size: 16px; font-weight: bold; text-align: center; padding: 15px; background-color: #FDF3E4; color: #5D3A1A; border: 1px solid #000; }';
        $html .= 'th { background-color: #8B5E3C; color: white; font-weight: bold; padding: 10px; text-align: center; border: 1px solid #000; vertical-align: middle; }';
        $html .= 'td { padding: 8px; border: 1px solid #d3d3d3; vertical-align: middle; }';
        $html .= '.text-center { text-align: center; }';
        $html .= '.text-left { text-align: left; }';
        $html .= '</style>';
        $html .= '</head>';
        $html .= '<body>';
        $html .= '<table>';

        // Judul Laporan di Bagian Atas
        $html .= '<tr>';
        $html .= '<colspan="5" class="title">LAPORAN AKTIVITAS PENGGUNA - WARUNG CANGKRUK</td>';
        $html .= '</tr>';
        $html .= '<tr><td colspan="5" style="border: none;"></td></tr>'; // Baris kosong pemisah

        // Header Tabel
        $html .= '<thead>';
        $html .= '<tr>';
        $html .= '<th style="width: 50px;">No</th>';
        $html .= '<th style="width: 150px;">Waktu</th>';
        $html .= '<th style="width: 200px;">Pengguna</th>';
        $html .= '<th style="width: 150px;">Aktivitas</th>';
        $html .= '<th style="width: 300px;">Keterangan</th>';
        $html .= '</tr>';
        $html .= '</thead>';

        // Body Tabel
        $html .= '<tbody>';
        if ($logs->isEmpty()) {
            $html .= '<tr>';
            $html .= '<td colspan="5" class="text-center" style="padding: 20px; font-style: italic;">Tidak ada data aktivitas untuk tanggal ini.</td>';
            $html .= '</tr>';
        } else {
            foreach ($logs as $index => $log) {
                $pengguna = $log->user
                    ? htmlspecialchars($log->user->name . ' (@' . $log->user->username . ')')
                    : '-';

                $html .= '<tr>';
                $html .= '<td class="text-center">' . ($index + 1) . '</td>';
                $html .= '<td class="text-center">' . $log->created_at->format('d-m-Y H:i:s') . '</td>';
                $html .= '<td class="text-left">' . $pengguna . '</td>';
                $html .= '<td class="text-center">' . htmlspecialchars($log->activity) . '</td>';
                $html .= '<td class="text-left">' . htmlspecialchars($log->description) . '</td>';
                $html .= '</tr>';
            }
        }
        $html .= '</tbody>';
        $html .= '</table>';
        $html .= '</body>';
        $html .= '</html>';

        return $html;
    }
}