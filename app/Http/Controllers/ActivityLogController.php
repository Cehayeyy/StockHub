<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
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
     * Export laporan aktivitas ke file .xls (HTML Table).
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

        // Nama File
        $fileName = 'laporan_aktivitas_' . $selectedDate . '.xls';

        // Header HTTP untuk download file
        $headers = [
            'Content-Type'        => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma'              => 'no-cache',
            'Expires'             => '0',
        ];

        // Callback untuk streaming konten HTML Table
        $callback = function () use ($logs) {
            echo '<table border="1">';
            echo '<thead>
                    <tr>
                        <th style="background-color: #f0f0f0;">No</th>
                        <th style="background-color: #f0f0f0;">Waktu</th>
                        <th style="background-color: #f0f0f0;">Pengguna</th>
                        <th style="background-color: #f0f0f0;">Aktifitas</th>
                        <th style="background-color: #f0f0f0;">Keterangan</th>
                    </tr>
                  </thead>';
            echo '<tbody>';

            foreach ($logs as $index => $log) {
                $waktu = $log->created_at->format('d-m-Y H:i');
                $pengguna = $log->user
                    ? $log->user->name . ' (' . $log->user->username . ')'
                    : '-';

                echo '<tr>';
                echo '<td>' . ($index + 1) . '</td>';
                echo '<td>' . $waktu . '</td>';
                echo '<td>' . e($pengguna) . '</td>';
                echo '<td>' . e($log->activity) . '</td>';
                echo '<td>' . e($log->description) . '</td>';
                echo '</tr>';
            }

            echo '</tbody>';
            echo '</table>';
        };

        return response()->stream($callback, 200, $headers);
    }
}
