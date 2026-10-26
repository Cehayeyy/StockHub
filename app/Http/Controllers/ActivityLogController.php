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
                'details'     => is_string($log->details) ? json_decode($log->details, true) : $log->details,
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
     * Export laporan aktivitas ke file Excel (.xlsx) sejati.
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

        // Format file diubah menjadi .xlsx
        $fileName = 'laporan_aktivitas_' . $selectedDate . '.xlsx';

        // Memanggil library Maatwebsite Excel
        return \Maatwebsite\Excel\Facades\Excel::download(new ActivityLogExport($logs), $fileName);
    }

    /**
     * 🔥 FUNGSI BARU: Menarik semua aktivitas user di dalam satu sesi (Dari Login sampai Logout)
     */
    public function sessionDetails($id)
    {
        $loginLog = ActivityLog::findOrFail($id);

        // 1. Cari kapan user ini Logout setelah waktu login ini
        $logoutLog = ActivityLog::where('user_id', $loginLog->user_id)
            ->where('activity', 'like', '%Logout%')
            ->where('created_at', '>', $loginLog->created_at)
            ->orderBy('created_at', 'asc')
            ->first();

        // 2. Tentukan batas waktu (Jika belum logout, batasnya adalah waktu saat ini)
        $endTime = $logoutLog ? $logoutLog->created_at : now();

        // 3. Ambil semua aktivitas di antara rentang waktu Login & Logout tersebut
        $sessionActivities = ActivityLog::where('user_id', $loginLog->user_id)
            ->where('id', '!=', $loginLog->id) // Jangan ikutkan log 'Login' itu sendiri
            ->where('activity', 'not like', '%Logout%') // Jangan ikutkan log 'Logout' di list
            ->whereBetween('created_at', [$loginLog->created_at, $endTime])
            ->orderBy('created_at', 'asc') // Urutkan dari yang pertama dilakukan
            ->get(['id', 'activity', 'description', 'details', 'created_at']); // 🔥 FIX: Tambahkan 'details'

        // 🔥 FIX: Pastikan details dikirim sebagai JSON/Array ke React, bukan String mati
        $sessionActivities->transform(function ($log) {
            $log->details = is_string($log->details) ? json_decode($log->details, true) : $log->details;
            return $log;
        });

        return response()->json([
            'logout_time' => $logoutLog ? $logoutLog->created_at->toIso8601String() : null,
            'activities'  => $sessionActivities
        ]);
    }
}