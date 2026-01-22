<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Item;
use App\Models\Recipe;
use App\Models\ItemCategory;
use App\Models\User;
use App\Models\IzinRevisi;
use App\Models\ActivityLog;
use App\Models\LoginHistory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $today = Carbon::today()->toDateString();

        // ================= 1. CHECK STATUS INPUT HARI INI =================
        $alreadyInputToday = false;

        if ($user->role === 'bar') {
            // Cek tabel Bar
            $alreadyInputToday = DB::table('stok_harian_menu')
                ->whereDate('tanggal', $today)
                ->where('user_id', $user->id)
                ->where('is_submitted', 1)
                ->exists();

        } elseif (in_array($user->role, ['dapur', 'kitchen', 'staff_kitchen'])) {
            // Cek tabel Dapur
            // Kita bungkus try-catch agar tidak error jika tabel belum ada (saat migrasi awal)
            try {
                // Cek apakah ada setidaknya satu item menu yang sudah disubmit oleh user ini hari ini
                $alreadyInputToday = DB::table('stok_harian_dapur_menu')
                    ->whereDate('tanggal', $today)
                    ->where('user_id', $user->id) // Sesuai dengan update di StokHarianDapurController
                    ->where('is_submitted', 1)
                    ->exists();
            } catch (\Exception $e) {
                $alreadyInputToday = false;
            }
        }

        // ================= 2. HITUNG STATISTIK BAR =================
        $barMenu = DB::table('stok_harian_menu')->whereDate('tanggal', $today)->count();
        $barMenuHabis = DB::table('stok_harian_menu')
            ->whereDate('tanggal', $today)
            ->where('stok_akhir', '>', 0)
            ->where('stok_akhir', '<=', 7)
            ->count();
        $barMenuHabisTotal = DB::table('stok_harian_menu')
            ->whereDate('tanggal', $today)
            ->where('stok_akhir', '=', 0)
            ->count();

        $barMentah = DB::table('stok_harian_mentah')->whereDate('tanggal', $today)->count();
        $barMentahHabis = DB::table('stok_harian_mentah')
            ->whereDate('tanggal', $today)
            ->where('stok_akhir', '>', 0)
            ->where('stok_akhir', '<=', 7)
            ->count();
        $barMentahHabisTotal = DB::table('stok_harian_mentah')
            ->whereDate('tanggal', $today)
            ->where('stok_akhir', '=', 0)
            ->count();

        // Hitung stok aman bar (stok_akhir > 7)
        $barMenuAman = DB::table('stok_harian_menu')
            ->whereDate('tanggal', $today)
            ->where('stok_akhir', '>', 7)
            ->count();
        $barMentahAman = DB::table('stok_harian_mentah')
            ->whereDate('tanggal', $today)
            ->where('stok_akhir', '>', 7)
            ->count();

        // ================= 3. HITUNG STATISTIK DAPUR =================
        $dapurMenu = 0;
        $dapurMenuHabis = 0;
        $dapurMenuHabisTotal = 0;
        $dapurMenuAman = 0;
        $dapurMentah = 0;
        $dapurMentahHabis = 0;
        $dapurMentahHabisTotal = 0;
        $dapurMentahAman = 0;

        try {
            $dapurMenu = DB::table('stok_harian_dapur_menu')->whereDate('tanggal', $today)->count();

            $dapurMenuHabis = DB::table('stok_harian_dapur_menu')
                ->whereDate('tanggal', $today)
                ->where('stok_akhir', '>', 0)
                ->where('stok_akhir', '<=', 7)
                ->count();

            $dapurMenuHabisTotal = DB::table('stok_harian_dapur_menu')
                ->whereDate('tanggal', $today)
                ->where('stok_akhir', '=', 0)
                ->count();

            $dapurMentah = DB::table('stok_harian_dapur_mentah')->whereDate('tanggal', $today)->count();

            $dapurMentahHabis = DB::table('stok_harian_dapur_mentah')
                ->whereDate('tanggal', $today)
                ->where('stok_akhir', '>', 0)
                ->where('stok_akhir', '<=', 7)
                ->count();

            $dapurMentahHabisTotal = DB::table('stok_harian_dapur_mentah')
                ->whereDate('tanggal', $today)
                ->where('stok_akhir', '=', 0)
                ->count();

            // Hitung stok aman dapur (stok_akhir > 7)
            $dapurMenuAman = DB::table('stok_harian_dapur_menu')
                ->whereDate('tanggal', $today)
                ->where('stok_akhir', '>', 7)
                ->count();
            $dapurMentahAman = DB::table('stok_harian_dapur_mentah')
                ->whereDate('tanggal', $today)
                ->where('stok_akhir', '>', 7)
                ->count();
        } catch (\Exception $e) {
            // Ignore if table not found
        }

        // ================= 4. TOTAL DATA =================
        $totalStokHarian = $barMenu + $barMentah + $dapurMenu + $dapurMentah;
        $stokHampirHabis = $barMenuHabis + $barMentahHabis + $dapurMenuHabis + $dapurMentahHabis;
        $stokHabis = $barMenuHabisTotal + $barMentahHabisTotal + $dapurMenuHabisTotal + $dapurMentahHabisTotal;
        $stokAman = $barMenuAman + $barMentahAman + $dapurMenuAman + $dapurMentahAman;

        // ================= 5. IZIN REVISI =================
        $izinRevisiPending = DB::table('izin_revisi')
            ->join('users', 'izin_revisi.user_id', '=', 'users.id')
            ->where('izin_revisi.status', 'pending')
            ->select('izin_revisi.id', 'users.name', 'users.role')
            ->get();

        // ================= 5.5 STATUS INPUT HARIAN STAFF =================
        // Ambil semua staff (bar dan dapur)
        $allStaff = User::whereIn('role', ['bar', 'dapur', 'kitchen', 'staff_kitchen'])
            ->select('id', 'name', 'role')
            ->get();

        // Cek status input untuk setiap staff
        $staffInputStatus = $allStaff->map(function ($staff) use ($today) {
            $hasInput = false;
            $inputTime = null;

            if ($staff->role === 'bar') {
                // Cek input bar
                $input = DB::table('stok_harian_menu')
                    ->whereDate('tanggal', $today)
                    ->where('user_id', $staff->id)
                    ->where('is_submitted', 1)
                    ->first();

                if ($input) {
                    $hasInput = true;
                    $inputTime = $input->updated_at ?? $input->created_at ?? null;
                }
            } else {
                // Cek input kitchen/dapur
                $input = DB::table('stok_harian_dapur_menu')
                    ->whereDate('tanggal', $today)
                    ->where('user_id', $staff->id)
                    ->where('is_submitted', 1)
                    ->first();

                if ($input) {
                    $hasInput = true;
                    $inputTime = $input->updated_at ?? $input->created_at ?? null;
                }
            }

            return [
                'id' => $staff->id,
                'name' => $staff->name,
                'role' => $staff->role,
                'has_input' => $hasInput,
                'input_time' => $inputTime,
            ];
        });

        // Pisahkan staff yang sudah dan belum input
        $staffSudahInput = $staffInputStatus->filter(fn($s) => $s['has_input'])->values()->toArray();
        $staffBelumInput = $staffInputStatus->filter(fn($s) => !$s['has_input'])->values()->toArray();

        $izinPending = IzinRevisi::where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        // Cek izin revisi yang sudah approved dan masih aktif (belum melewati end_time)
        $izinApproved = IzinRevisi::where('user_id', $user->id)
            ->where('status', 'approved')
            ->where('end_time', '>', Carbon::now())
            ->first();

        // ================= 6. DATA PREPARATION =================

        // Tentukan divisi berdasarkan role user
        $userDivision = null;
        if ($user->role === 'bar') {
            $userDivision = 'bar';
        } elseif (in_array($user->role, ['dapur', 'kitchen', 'staff_kitchen'])) {
            $userDivision = 'dapur'; // untuk kompatibilitas dengan data lama
        }

        // Hitung total berdasarkan role
        if (in_array($user->role, ['owner', 'supervisor'])) {
            // Supervisor/Owner melihat semua data
            $totalItem = Item::count();
            $totalResep = Recipe::count();
            $totalKategori = ItemCategory::count();
            $totalStokHarianFiltered = $totalStokHarian;
            $stokHampirHabisFiltered = $stokHampirHabis;
            $stokHabisFiltered = $stokHabis;
            $stokAmanFiltered = $stokAman;
        } elseif ($user->role === 'bar') {
            // Staff Bar hanya melihat data bar
            $totalItem = Item::where('division', 'bar')->count();
            $totalResep = Recipe::where('division', 'bar')->count();
            $totalKategori = ItemCategory::where('division', 'bar')->count();
            $totalStokHarianFiltered = $barMenu + $barMentah;
            $stokHampirHabisFiltered = $barMenuHabis + $barMentahHabis;
            $stokHabisFiltered = $barMenuHabisTotal + $barMentahHabisTotal;
            $stokAmanFiltered = $barMenuAman + $barMentahAman;
        } else {
            // Staff Dapur hanya melihat data dapur
            // Handle both 'kitchen' and 'dapur' values untuk backward compatibility
            $totalItem = Item::whereIn('division', ['kitchen', 'dapur'])->count();
            $totalResep = Recipe::whereIn('division', ['kitchen', 'dapur'])->count();
            $totalKategori = ItemCategory::whereIn('division', ['kitchen', 'dapur'])->count();
            $totalStokHarianFiltered = $dapurMenu + $dapurMentah;
            $stokHampirHabisFiltered = $dapurMenuHabis + $dapurMentahHabis;
            $stokHabisFiltered = $dapurMenuHabisTotal + $dapurMentahHabisTotal;
            $stokAmanFiltered = $dapurMenuAman + $dapurMentahAman;
        }

        $data = [
            'totalItem'         => $totalItem,
            'totalResep'        => $totalResep,
            'totalKategori'     => $totalKategori,
            'totalUser'         => User::count(),
            'izinRevisiPending' => $izinRevisiPending,
            'totalStokHarian'   => $totalStokHarianFiltered,
            'stokHampirHabis'   => $stokHampirHabisFiltered,
            'stokHabis'         => $stokHabisFiltered,
            'stokAman'          => $stokAmanFiltered,
            'alreadyInputToday' => $alreadyInputToday, // Variabel penting untuk mengubah tampilan Dashboard
            'izinPending'       => $izinPending,
            'staffSudahInput'   => $staffSudahInput,
            'staffBelumInput'   => $staffBelumInput,
            'totalStaff'        => $allStaff->count(),
            'flash'             => [
                'success' => session('success'),
                'error'   => session('error'),
            ],
        ];

        // ================= 7. DATA KHUSUS OWNER & SUPERVISOR =================
        if (in_array($user->role, ['owner', 'supervisor'])) {
            // Executive Statistics
            $weekAgo = Carbon::now()->subDays(7);
            $monthAgo = Carbon::now()->subDays(30);

            // Statistik aktivitas mingguan
            $activityThisWeek = ActivityLog::where('created_at', '>=', $weekAgo)->count();
            $activityLastWeek = ActivityLog::whereBetween('created_at', [$weekAgo->copy()->subDays(7), $weekAgo])->count();

            // Statistik login mingguan
            $loginThisWeek = LoginHistory::where('login_at', '>=', $weekAgo)->count();
            $loginLastWeek = LoginHistory::whereBetween('login_at', [$weekAgo->copy()->subDays(7), $weekAgo])->count();

            // Activity logs terbaru (semua user)
            $recentActivities = ActivityLog::with('user:id,name,role')
                ->latest()
                ->take(15)
                ->get()
                ->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'user_name' => $log->user->name ?? 'Unknown',
                        'user_role' => $log->user->role ?? 'unknown',
                        'activity' => $log->activity,
                        'description' => $log->description,
                        'created_at' => $log->created_at->toIso8601String(),
                    ];
                });

            // Login history terbaru
            $recentLogins = LoginHistory::with('user:id,name,role,username')
                ->latest('login_at')
                ->take(10)
                ->get()
                ->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'user_name' => $log->user->name ?? 'Unknown',
                        'user_role' => $log->user->role ?? 'unknown',
                        'username' => $log->user->username ?? '-',
                        'ip_address' => $log->ip_address,
                        'device_type' => $log->device_type,
                        'browser' => $log->browser,
                        'platform' => $log->platform,
                        'login_at' => $log->login_at->toIso8601String(),
                        'logout_at' => $log->logout_at ? $log->logout_at->toIso8601String() : null,
                        'is_online' => $log->logout_at === null,
                    ];
                });

            // Statistik per role
            $usersByRole = User::selectRaw('role, count(*) as total')
                ->groupBy('role')
                ->pluck('total', 'role')
                ->toArray();

            // Aktivitas per hari (7 hari terakhir) dengan detail
            $activityPerDay = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = Carbon::now()->subDays($i)->format('Y-m-d');

                $activitiesOfDay = ActivityLog::with('user:id,name,role')
                    ->whereDate('created_at', $date)
                    ->orderBy('created_at', 'desc')
                    ->get()
                    ->map(function ($log) {
                        return [
                            'id' => $log->id,
                            'user_name' => $log->user->name ?? 'Unknown',
                            'user_role' => $log->user->role ?? 'unknown',
                            'activity' => $log->activity,
                            'description' => $log->description,
                            'created_at' => $log->created_at->toIso8601String(),
                        ];
                    });

                $activityPerDay[] = [
                    'date' => $date,
                    'total' => $activitiesOfDay->count(),
                    'activities' => $activitiesOfDay,
                ];
            }

            // Total supervisor dan staff
            $totalSupervisor = User::where('role', 'supervisor')->count();
            $totalBarStaff = User::where('role', 'bar')->count();
            $totalDapurStaff = User::whereIn('role', ['kitchen', 'dapur', 'staff_kitchen'])->count();

            // Daftar supervisor untuk detail
            $supervisorList = User::where('role', 'supervisor')
                ->select('id', 'name', 'username', 'email', 'created_at')
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'username' => $user->username,
                        'email' => $user->email,
                        'created_at' => $user->created_at->toIso8601String(),
                    ];
                });

            // Izin revisi yang diproses bulan ini
            $izinProcessedThisMonth = IzinRevisi::whereMonth('updated_at', Carbon::now()->month)
                ->whereIn('status', ['approved', 'rejected'])
                ->count();

            // Daftar izin yang diproses bulan ini untuk detail
            $izinProcessedList = IzinRevisi::with('user:id,name,username,role')
                ->whereMonth('updated_at', Carbon::now()->month)
                ->whereIn('status', ['approved', 'rejected'])
                ->latest('updated_at')
                ->get()
                ->map(function ($izin) {
                    return [
                        'id' => $izin->id,
                        'user_name' => $izin->user->name ?? 'Unknown',
                        'user_username' => $izin->user->username ?? '-',
                        'user_role' => $izin->user->role ?? 'unknown',
                        'status' => $izin->status,
                        'reason' => $izin->reason ?? '-',
                        'start_time' => $izin->start_time ? $izin->start_time->toIso8601String() : null,
                        'end_time' => $izin->end_time ? $izin->end_time->toIso8601String() : null,
                        'updated_at' => $izin->updated_at->toIso8601String(),
                    ];
                });

            $data['ownerData'] = [
                'activityThisWeek' => $activityThisWeek,
                'activityLastWeek' => $activityLastWeek,
                'activityGrowth' => $activityLastWeek > 0
                    ? round((($activityThisWeek - $activityLastWeek) / $activityLastWeek) * 100, 1)
                    : 0,
                'loginThisWeek' => $loginThisWeek,
                'loginLastWeek' => $loginLastWeek,
                'loginGrowth' => $loginLastWeek > 0
                    ? round((($loginThisWeek - $loginLastWeek) / $loginLastWeek) * 100, 1)
                    : 0,
                'recentActivities' => $recentActivities,
                'recentLogins' => $recentLogins,
                'usersByRole' => $usersByRole,
                'activityPerDay' => $activityPerDay,
                'totalSupervisor' => $totalSupervisor,
                'totalBarStaff' => $totalBarStaff,
                'totalDapurStaff' => $totalDapurStaff,
                'supervisorList' => $supervisorList,
                'izinProcessedThisMonth' => $izinProcessedThisMonth,
                'izinProcessedList' => $izinProcessedList,
            ];
        }

        // ================= 8. RETURN VIEW =================

        // Jika Supervisor / Owner
        if (in_array($user->role, ['owner', 'supervisor'])) {
            return Inertia::render('Dashboard', $data);
        }

        // Jika Staff (Bar / Dapur)
        if (in_array($user->role, ['bar', 'dapur', 'kitchen', 'staff_kitchen'])) {
            return Inertia::render('DashboardStaff', array_merge($data, [
                'alreadyRequestedRevision' => $izinPending,
                'izinApproved' => $izinApproved ? [
                    'start_time' => $izinApproved->start_time->toIso8601String(),
                    'end_time' => $izinApproved->end_time->toIso8601String(),
                ] : null,
                'canInput' => $this->canUserInput(),
            ]));
        }

        // Fallback View
        return Inertia::render('DashboardStaff', $data);
    }

    /**
     * Cek apakah user bisa melakukan input stok harian
     * (untuk staff, cek apakah sudah lewat jam 8 malam dan punya izin revisi)
     */
    private function canUserInput()
    {
        $user = Auth::user();

        // Owner dan Supervisor selalu bisa input
        if (in_array($user->role, ['owner', 'supervisor'])) {
            return true;
        }

        // Cek waktu sekarang
        $now = Carbon::now();
        $cutoffTime = Carbon::today()->setTime(21, 0, 0); // 21:00 = 9 malam

        // Jika belum jam 8 malam, bisa input
        if ($now->lessThan($cutoffTime)) {
            return true;
        }

        // Jika sudah lewat jam 8 malam, cek izin revisi
        $hasActivePermission = IzinRevisi::where('user_id', $user->id)
            ->where('status', 'approved')
            ->where('start_time', '<=', $now)
            ->where('end_time', '>=', $now)
            ->exists();

        return $hasActivePermission;
    }
}
