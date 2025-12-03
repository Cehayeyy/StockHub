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
        // Ambil parameter filter dari query string
        $dateParam = $request->input('date');   // YYYY-MM-DD dari input date
        $search    = $request->input('search'); // dari kotak search

        // Jika tidak ada date → pakai hari ini
        if ($dateParam) {
            try {
                $selectedDate = Carbon::createFromFormat('Y-m-d', $dateParam)->toDateString();
            } catch (\Exception $e) {
                $selectedDate = now()->toDateString();
            }
        } else {
            $selectedDate = now()->toDateString();
        }

        $query = ActivityLog::with('user')
            ->whereDate('created_at', $selectedDate)
            ->orderBy('created_at', 'desc');

        // FILTER SEARCH (nama, username, activity, description)
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

        $logs = $query->paginate(20)->withQueryString();

        // Map ke bentuk sederhana untuk front-end
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

        return Inertia::render('LaporanAktivitas', [
            'logs' => $logs,
            'filters' => [
                'date'   => $selectedDate,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Export laporan aktivitas ke file .xls (bisa dibuka di Excel).
     * Mengikuti filter tanggal & search yang sama seperti index().
     */
    public function export(Request $request)
    {
        $dateParam = $request->input('date');
        $search    = $request->input('search');

        if ($dateParam) {
            try {
                $selectedDate = Carbon::createFromFormat('Y-m-d', $dateParam)->toDateString();
            } catch (\Exception $e) {
                $selectedDate = now()->toDateString();
            }
        } else {
            $selectedDate = now()->toDateString();
        }

        $query = ActivityLog::with('user')
            ->whereDate('created_at', $selectedDate);

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

        // Untuk export, kita urutkan ASC (dari paling lama ke terbaru)
        $logs = $query->orderBy('created_at', 'asc')->get();

        $fileName = 'laporan_aktivitas_' . $selectedDate . '.xls';

        $headers = [
            'Content-Type'        => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma'              => 'no-cache',
            'Expires'             => '0',
        ];

        $callback = function () use ($logs) {
            echo '<table border="1">';
            echo '<tr>
                    <th>No</th>
                    <th>Waktu</th>
                    <th>Pengguna</th>
                    <th>Aktifitas</th>
                    <th>Keterangan</th>
                  </tr>';

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

            echo '</table>';
        };

        return response()->stream($callback, 200, $headers);
    }
}
