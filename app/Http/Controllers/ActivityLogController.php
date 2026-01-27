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
     * Export laporan aktivitas ke file .csv (Safe Excel).
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

        // Nama File (Ganti ekstensi jadi .csv)
        $fileName = 'laporan_aktivitas_' . $selectedDate . '.csv';

        // Header HTTP untuk download file CSV
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        // Callback untuk streaming konten CSV
        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');

            // Tambahkan BOM agar Excel membaca karakter UTF-8 dengan benar
            fputs($file, "\xEF\xBB\xBF");

            // Header Kolom di CSV
            fputcsv($file, ['No', 'Waktu', 'Pengguna', 'Aktivitas', 'Keterangan']);

            // Isi Data
            foreach ($logs as $index => $log) {
                $pengguna = $log->user
                    ? $log->user->name . ' (' . $log->user->username . ')'
                    : '-';

                fputcsv($file, [
                    $index + 1,
                    $log->created_at->format('d-m-Y H:i'),
                    $pengguna,
                    $log->activity,
                    $log->description
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
