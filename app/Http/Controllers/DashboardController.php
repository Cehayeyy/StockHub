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
use Illuminate\Support\Str;
use Carbon\Carbon;
use Dompdf\Dompdf;
use Dompdf\Options;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $today = Carbon::today()->toDateString();

        // ================= 0. TENTUKAN TANGGAL EFEKTIF UNTUK STOK =================
        // Jika tidak ada data stok hari ini, gunakan tanggal terakhir yang memiliki data
        $stokDate = $today;
        $hasDataToday = DB::table('stok_harian_menu')->whereDate('tanggal', $today)->exists()
            || DB::table('stok_harian_mentah')->whereDate('tanggal', $today)->exists();

        if (!$hasDataToday) {
            try {
                $hasDataToday = DB::table('stok_harian_dapur_menu')->whereDate('tanggal', $today)->exists()
                    || DB::table('stok_harian_dapur_mentah')->whereDate('tanggal', $today)->exists();
            } catch (\Exception $e) {
                // tabel dapur belum ada
            }
        }

        if (!$hasDataToday) {
            // Cari tanggal terakhir yang punya data dari semua tabel stok
            $latestDates = collect();

            $latestBar = DB::table('stok_harian_menu')->max('tanggal');
            if ($latestBar) $latestDates->push($latestBar);

            $latestBarMentah = DB::table('stok_harian_mentah')->max('tanggal');
            if ($latestBarMentah) $latestDates->push($latestBarMentah);

            try {
                $latestDapur = DB::table('stok_harian_dapur_menu')->max('tanggal');
                if ($latestDapur) $latestDates->push($latestDapur);

                $latestDapurMentah = DB::table('stok_harian_dapur_mentah')->max('tanggal');
                if ($latestDapurMentah) $latestDates->push($latestDapurMentah);
            } catch (\Exception $e) {
                // tabel dapur belum ada
            }

            if ($latestDates->isNotEmpty()) {
                $stokDate = $latestDates->max();
            }
        }

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
        // Gunakan $stokDate (bukan $today) untuk query stok agar data tetap muncul saat hari berganti
        $barMenu = DB::table('stok_harian_menu')->whereDate('tanggal', $stokDate)->count();
        $barMenuHabis = DB::table('stok_harian_menu')
            ->whereDate('tanggal', $stokDate)
            ->where('stok_akhir', '>', 0)
            ->where('stok_akhir', '<=', 7)
            ->count();
        $barMenuHabisTotal = DB::table('stok_harian_menu')
            ->whereDate('tanggal', $stokDate)
            ->where('stok_akhir', '=', 0)
            ->count();

        $barMentah = DB::table('stok_harian_mentah')->whereDate('tanggal', $stokDate)->count();
        $barMentahHabis = DB::table('stok_harian_mentah')
            ->whereDate('tanggal', $stokDate)
            ->where('stok_akhir', '>', 0)
            ->where('stok_akhir', '<=', 7)
            ->count();
        $barMentahHabisTotal = DB::table('stok_harian_mentah')
            ->whereDate('tanggal', $stokDate)
            ->where('stok_akhir', '=', 0)
            ->count();

        // Hitung stok aman bar (stok_akhir > 7)
        $barMenuAman = DB::table('stok_harian_menu')
            ->whereDate('tanggal', $stokDate)
            ->where('stok_akhir', '>', 7)
            ->count();
        $barMentahAman = DB::table('stok_harian_mentah')
            ->whereDate('tanggal', $stokDate)
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
            $dapurMenu = DB::table('stok_harian_dapur_menu')->whereDate('tanggal', $stokDate)->count();

            $dapurMenuHabis = DB::table('stok_harian_dapur_menu')
                ->whereDate('tanggal', $stokDate)
                ->where('stok_akhir', '>', 0)
                ->where('stok_akhir', '<=', 7)
                ->count();

            $dapurMenuHabisTotal = DB::table('stok_harian_dapur_menu')
                ->whereDate('tanggal', $stokDate)
                ->where('stok_akhir', '=', 0)
                ->count();

            $dapurMentah = DB::table('stok_harian_dapur_mentah')->whereDate('tanggal', $stokDate)->count();

            $dapurMentahHabis = DB::table('stok_harian_dapur_mentah')
                ->whereDate('tanggal', $stokDate)
                ->where('stok_akhir', '>', 0)
                ->where('stok_akhir', '<=', 7)
                ->count();

            $dapurMentahHabisTotal = DB::table('stok_harian_dapur_mentah')
                ->whereDate('tanggal', $stokDate)
                ->where('stok_akhir', '=', 0)
                ->count();

            // Hitung stok aman dapur (stok_akhir > 7)
            $dapurMenuAman = DB::table('stok_harian_dapur_menu')
                ->whereDate('tanggal', $stokDate)
                ->where('stok_akhir', '>', 7)
                ->count();
            $dapurMentahAman = DB::table('stok_harian_dapur_mentah')
                ->whereDate('tanggal', $stokDate)
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

     // ================= 4.5 LIST NAMA ITEM UNTUK DETAIL (FINAL REVISI) =================

        // 1. Helper untuk Ambil Data Tabel (Cek Singular/Plural)
        $getDataSafe = function($singularName) use ($stokDate) {
            $pluralName = $singularName . 's';
            try {
                // Cek Plural dulu
                $data = DB::table($pluralName)->whereDate('tanggal', $stokDate)->get();
                if ($data->isNotEmpty()) return $data;
                // Cek Singular
                return DB::table($singularName)->whereDate('tanggal', $stokDate)->get();
            } catch (\Exception $e) {
                try {
                    return DB::table($singularName)->whereDate('tanggal', $stokDate)->get();
                } catch (\Exception $ex) {
                    return collect([]);
                }
            }
        };

        // 2. Ambil Data Mentah
        $barMenuData = $getDataSafe('stok_harian_menu');
        $barMentahData = $getDataSafe('stok_harian_mentah');
        $dapurMenuData = $getDataSafe('stok_harian_dapur_menu');
        $dapurMentahData = $getDataSafe('stok_harian_dapur_mentah');

        // 3. Helper Pengambil Nama (SUPER ROBUST - Cek Semua Kemungkinan)
        $mapToNames = function($data) {
            return $data->map(function($row) {
                $name = null;

                // DETEKSI ID: Cek apakah pakai kolom 'item_id' atau 'recipe_id'
                // Kita gunakan operator null coalescing (??) untuk fallback
                $id = $row->item_id ?? $row->recipe_id ?? 0;

                // LOGIKA 1: Cek di tabel ITEMS dulu
                if ($id) {
                    $name = DB::table('items')->where('id', $id)->value('nama');
                }

                // LOGIKA 2: Jika tidak ketemu di Items, cek di tabel RECIPES
                // (Menu Dapur seringkali ID-nya mengarah ke sini)
                if (!$name && $id) {
                    $name = DB::table('recipes')->where('id', $id)->value('name');
                }

                // LOGIKA 3: Fallback terakhir jika ID pun tidak ketemu di object row
                if (!$name) {
                    $name = 'Item Tidak Dikenal (ID: ' . $id . ')';
                }

                return [
                    'nama' => $name,
                    'stok' => $row->stok_akhir
                ];
            })->values();
        };

        // 4. Proses Data (Gunakan helper yang sama untuk SEMUA)
        $barItemsProcessed = $mapToNames($barMenuData)->merge($mapToNames($barMentahData));
        $dapurItemsProcessed = $mapToNames($dapurMenuData)->merge($mapToNames($dapurMentahData));

        // 5. Filter Status Stok
        $filterStatus = function ($collection, $status) {
            return $collection->filter(function ($i) use ($status) {
                if ($status === 'habis') return $i['stok'] == 0;
                if ($status === 'hampir') return $i['stok'] > 0 && $i['stok'] <= 7;
                if ($status === 'aman') return $i['stok'] > 7;
                return false;
            })->values();
        };

        // 6. Masukkan ke Array Data
        $data['itemDetails'] = [
            'bar' => [
                'habis' => $filterStatus($barItemsProcessed, 'habis'),
                'hampir' => $filterStatus($barItemsProcessed, 'hampir'),
                'aman' => $filterStatus($barItemsProcessed, 'aman'),
            ],
            'dapur' => [
                'habis' => $filterStatus($dapurItemsProcessed, 'habis'),
                'hampir' => $filterStatus($dapurItemsProcessed, 'hampir'),
                'aman' => $filterStatus($dapurItemsProcessed, 'aman'),
            ]
        ];
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
// ================= 4.5 AMBIL DETAIL NAMA ITEM (TAMBAHAN BARU) =================

        // Helper function: Ambil nama dan stok dari tabel stok harian
        $getNames = function ($table) use ($stokDate) {
            try {
                $query = DB::table($table)->whereDate('tanggal', $stokDate);

                // stok_harian_dapur_menu pakai recipe_id (join ke recipes), sisanya pakai item_id (join ke items)
                if ($table === 'stok_harian_dapur_menu') {
                    return $query
                        ->join('recipes', "$table.recipe_id", '=', 'recipes.id')
                        ->select('recipes.name as nama', "$table.stok_akhir as stok")
                        ->get();
                }

                return $query
                    ->join('items', "$table.item_id", '=', 'items.id')
                    ->select('items.nama', "$table.stok_akhir as stok")
                    ->get();
            } catch (\Exception $e) {
                return collect([]); // Return kosong jika tabel belum ada
            }
        };

        // Ambil data bar dan dapur
        $barItems = $getNames('stok_harian_menu')->merge($getNames('stok_harian_mentah'));
        $dapurItems = $getNames('stok_harian_dapur_menu')->merge($getNames('stok_harian_dapur_mentah'));

        // Helper filter status
        $filterStatus = function ($collection, $status) {
            return $collection->filter(function ($i) use ($status) {
                if ($status === 'habis') return $i->stok == 0;
                if ($status === 'hampir') return $i->stok > 0 && $i->stok <= 7;
                if ($status === 'aman') return $i->stok > 7;
                return false;
            })->values();
        };

        // Susun struktur data untuk frontend
        $itemDetails = [
            'bar' => [
                'habis' => $filterStatus($barItems, 'habis'),
                'hampir' => $filterStatus($barItems, 'hampir'),
                'aman' => $filterStatus($barItems, 'aman'),
            ],
            'dapur' => [
                'habis' => $filterStatus($dapurItems, 'habis'),
                'hampir' => $filterStatus($dapurItems, 'hampir'),
                'aman' => $filterStatus($dapurItems, 'aman'),
            ]
        ];

        $data = [
            'totalItem'         => $totalItem ?? 0,
            'totalResep'        => $totalResep ?? 0,
            'totalKategori'     => $totalKategori ?? 0,
            'totalUser'         => User::count(),
            'izinRevisiPending' => $izinRevisiPending ?? collect([]),
            'totalStokHarian'   => $totalStokHarianFiltered ?? 0,
            'stokHampirHabis'   => $stokHampirHabisFiltered ?? 0,
            'stokHabis'         => $stokHabisFiltered ?? 0,
            'stokAman'          => $stokAmanFiltered ?? 0,
            'alreadyInputToday' => $alreadyInputToday,
            'izinPending'       => $izinPending ?? false,
            'staffSudahInput'   => $staffSudahInput ?? [],
            'staffBelumInput'   => $staffBelumInput ?? [],
            'totalStaff'        => $allStaff->count(),
            'itemDetails'       => $itemDetails,
            'stokDate'          => $stokDate,
            'isStokFromPreviousDay' => $stokDate !== $today,
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

    public function exportOwnerWeeklyStockPdf(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'owner') {
            abort(403, 'Akses ditolak.');
        }

        $endDate = Carbon::today();
        $startDate = $endDate->copy()->subDays(6);

        $barMenuRows = DB::table('stok_harian_menu')
            ->leftJoin('items', 'stok_harian_menu.item_id', '=', 'items.id')
            ->leftJoin('users', 'stok_harian_menu.user_id', '=', 'users.id')
            ->whereBetween('stok_harian_menu.tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->selectRaw("
                stok_harian_menu.tanggal as tanggal,
                'Bar' as divisi,
                'Menu' as jenis,
                COALESCE(items.nama, '-') as nama_stok,
                COALESCE(stok_harian_menu.unit, '-') as unit,
                stok_harian_menu.stok_awal as stok_awal,
                stok_harian_menu.stok_masuk as stok_masuk,
                COALESCE(stok_harian_menu.pemakaian, stok_harian_menu.stok_keluar, 0) as stok_pemakaian,
                stok_harian_menu.stok_akhir as stok_tersisa,
                COALESCE(users.name, '-') as staff_input
            ")
            ->get();

        $barMentahRows = DB::table('stok_harian_mentah')
            ->leftJoin('items', 'stok_harian_mentah.item_id', '=', 'items.id')
            ->whereBetween('stok_harian_mentah.tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->selectRaw("
                stok_harian_mentah.tanggal as tanggal,
                'Bar' as divisi,
                'Mentah' as jenis,
                COALESCE(items.nama, '-') as nama_stok,
                COALESCE(stok_harian_mentah.unit, '-') as unit,
                stok_harian_mentah.stok_awal as stok_awal,
                stok_harian_mentah.stok_masuk as stok_masuk,
                COALESCE(stok_harian_mentah.stok_keluar, 0) as stok_pemakaian,
                stok_harian_mentah.stok_akhir as stok_tersisa,
                '-' as staff_input
            ")
            ->get();

        $dapurMenuRows = DB::table('stok_harian_dapur_menu')
            ->leftJoin('recipes', 'stok_harian_dapur_menu.recipe_id', '=', 'recipes.id')
            ->leftJoin('users', 'stok_harian_dapur_menu.user_id', '=', 'users.id')
            ->whereBetween('stok_harian_dapur_menu.tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->selectRaw("
                stok_harian_dapur_menu.tanggal as tanggal,
                'Dapur' as divisi,
                'Menu' as jenis,
                COALESCE(recipes.name, '-') as nama_stok,
                COALESCE(stok_harian_dapur_menu.unit, '-') as unit,
                stok_harian_dapur_menu.stok_awal as stok_awal,
                stok_harian_dapur_menu.stok_masuk as stok_masuk,
                COALESCE(stok_harian_dapur_menu.stok_keluar, 0) as stok_pemakaian,
                stok_harian_dapur_menu.stok_akhir as stok_tersisa,
                COALESCE(users.name, '-') as staff_input
            ")
            ->get();

        $dapurMentahRows = DB::table('stok_harian_dapur_mentah')
            ->leftJoin('items', 'stok_harian_dapur_mentah.item_id', '=', 'items.id')
            ->whereBetween('stok_harian_dapur_mentah.tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->selectRaw("
                stok_harian_dapur_mentah.tanggal as tanggal,
                'Dapur' as divisi,
                'Mentah' as jenis,
                COALESCE(items.nama, '-') as nama_stok,
                COALESCE(stok_harian_dapur_mentah.unit, '-') as unit,
                stok_harian_dapur_mentah.stok_awal as stok_awal,
                stok_harian_dapur_mentah.stok_masuk as stok_masuk,
                COALESCE(stok_harian_dapur_mentah.stok_keluar, 0) as stok_pemakaian,
                stok_harian_dapur_mentah.stok_akhir as stok_tersisa,
                '-' as staff_input
            ")
            ->get();

        $reportRows = $barMenuRows
            ->merge($barMentahRows)
            ->merge($dapurMenuRows)
            ->merge($dapurMentahRows)
            ->sortBy(function ($row) {
                return sprintf('%s|%s|%s|%s', $row->tanggal, $row->divisi, $row->jenis, $row->nama_stok);
            })
            ->values();

        $dateRange = collect(range(0, 6))
            ->map(fn (int $offset) => $startDate->copy()->addDays($offset)->toDateString());

        $rowsByDate = $reportRows->groupBy('tanggal');

        $normalizedRows = collect();
        foreach ($dateRange as $date) {
            $rowsOnDate = $rowsByDate->get($date, collect());

            if ($rowsOnDate->isEmpty()) {
                $placeholder = (object) [
                    'tanggal' => $date,
                    'divisi' => '-',
                    'jenis' => '-',
                    'nama_stok' => 'Tidak ada input stok pada tanggal ini',
                    'unit' => '-',
                    'stok_awal' => 0,
                    'stok_masuk' => 0,
                    'stok_pemakaian' => 0,
                    'stok_tersisa' => 0,
                    'staff_input' => '-',
                    'is_placeholder' => true,
                ];
                $normalizedRows->push($placeholder);
                continue;
            }

            foreach ($rowsOnDate as $row) {
                $row->is_placeholder = false;
                $normalizedRows->push($row);
            }
        }

        $dailySummary = $dateRange->map(function ($date) use ($rowsByDate) {
            $rowsOnDate = $rowsByDate->get($date, collect());
            $validRows = $rowsOnDate->filter(function ($row) {
                return !empty($row->nama_stok) && $row->nama_stok !== '-';
            });

            $uniqueStaff = $rowsOnDate
                ->pluck('staff_input')
                ->filter(fn ($staff) => !empty($staff) && $staff !== '-')
                ->unique()
                ->values();

            return [
                'tanggal' => $date,
                'jumlah_baris' => $validRows->count(),
                'jumlah_staff' => $uniqueStaff->count(),
                'status' => $validRows->isNotEmpty() ? 'Ada Input' : 'Tidak Ada Input',
            ];
        })->values();

        $mondayDatesInRange = collect(range(0, 6))
            ->map(fn (int $offset) => $startDate->copy()->addDays($offset))
            ->filter(fn (Carbon $date) => $date->isMonday())
            ->map(fn (Carbon $date) => $date->toDateString())
            ->values();

        $mondayOpnameLogs = ActivityLog::with('user:id,name,role')
            ->where('activity', 'Verifikasi Stok')
            ->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
            ->when($mondayDatesInRange->isNotEmpty(), function ($query) use ($mondayDatesInRange) {
                $query->whereIn(DB::raw('DATE(created_at)'), $mondayDatesInRange->all());
            })
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($log) {
                $description = (string) ($log->description ?? '');
                $descriptionLower = Str::lower($description);

                $divisi = 'Tidak Diketahui';
                if (Str::contains($descriptionLower, 'bar')) {
                    $divisi = 'Bar';
                } elseif (Str::contains($descriptionLower, 'dapur')) {
                    $divisi = 'Dapur';
                }

                return [
                    'waktu' => $log->created_at,
                    'divisi' => $divisi,
                    'staff' => $log->user?->name ?? '-',
                    'keterangan' => $description,
                ];
            })
            ->values();

        $staffInputSummary = $normalizedRows
            ->filter(fn ($row) => !empty($row->staff_input) && $row->staff_input !== '-')
            ->groupBy('staff_input')
            ->map(function ($rows, $staffName) {
                return [
                    'staff' => $staffName,
                    'jumlah_input' => $rows->count(),
                ];
            })
            ->sortByDesc('jumlah_input')
            ->values();

        $html = view('reports.owner-stock-seven-days', [
            'startDate' => $startDate,
            'endDate' => $endDate,
            'generatedAt' => Carbon::now(),
            'dailySummary' => $dailySummary,
            'reportRows' => $normalizedRows,
            'mondayOpnameLogs' => $mondayOpnameLogs,
            'staffInputSummary' => $staffInputSummary,
        ])->render();

        $options = new Options();
        $options->set('isRemoteEnabled', false);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        $fileName = 'report_stok_7_hari_' . $endDate->format('Ymd') . '.pdf';

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $fileName . '"',
        ]);
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
