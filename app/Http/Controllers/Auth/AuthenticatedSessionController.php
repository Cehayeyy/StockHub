<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\ActivityLog;
use App\Models\LoginHistory;
use Carbon\Carbon;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status'           => session('status'),
        ]);
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();
        $request->session()->regenerate();

        $user = Auth::user();

        if ($user) {
            $userAgent = $request->header('User-Agent');
            $device    = $this->getDeviceType($userAgent);
            $browser   = $this->getBrowser($userAgent);
            $platform  = $this->getPlatform($userAgent);
            $ip        = $request->ip();

            // 1. Simpan Login History ke database
            $loginHistory = LoginHistory::create([
                'user_id'     => $user->id,
                'ip_address'  => $ip,
                'user_agent'  => $userAgent,
                'device_type' => $device,
                'browser'     => $browser,
                'platform'    => $platform,
                'login_at'    => now(),
            ]);

            // 2. Catat ActivityLog dengan rincian lengkap pada kolom 'details'
            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'Login',
                'description' => 'User melakukan login ke sistem',
                'details'     => [
                    'ip_address'       => $ip,
                    'device_type'      => $device,
                    'browser'          => $browser,
                    'platform'         => $platform,
                    'role'             => $user->role ?? 'staff',
                    'login_history_id' => $loginHistory->id ?? null,
                ],
            ]);
        }

        return redirect()->intended('/dashboard')->with('login_success', 'Selamat datang, ' . Auth::user()->name . '!');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = Auth::user();

        if ($user) {
            $ip = $request->ip();

            // Update logout time di login history terakhir
            $lastLogin = LoginHistory::where('user_id', $user->id)
                ->whereNull('logout_at')
                ->latest('login_at')
                ->first();

            $durationMinutes = null;
            if ($lastLogin) {
                $lastLogin->update(['logout_at' => now()]);
                // Hitung durasi sesi dalam menit
                $durationMinutes = now()->diffInMinutes($lastLogin->login_at);
            }

            // Catat ActivityLog Logout dengan rincian durasi sesi
            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'Logout',
                'description' => 'User keluar dari sistem',
                'details'     => [
                    'ip_address'       => $ip,
                    'durasi_sesi'      => $durationMinutes !== null ? "{$durationMinutes} menit" : 'N/A',
                    'role'             => $user->role ?? 'staff',
                ],
            ]);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('home');
    }

    /**
     * Detect device type from user agent
     */
    private function getDeviceType(?string $userAgent): string
    {
        if (!$userAgent) return 'unknown';

        if (preg_match('/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i', $userAgent)) {
            if (preg_match('/ipad|tablet/i', $userAgent)) {
                return 'tablet';
            }
            return 'mobile';
        }
        return 'desktop';
    }

    /**
     * Detect browser from user agent
     */
    private function getBrowser(?string $userAgent): string
    {
        if (!$userAgent) return 'unknown';

        if (preg_match('/MSIE|Trident/i', $userAgent)) return 'Internet Explorer';
        if (preg_match('/Edg/i', $userAgent)) return 'Edge';
        if (preg_match('/Firefox/i', $userAgent)) return 'Firefox';
        if (preg_match('/Chrome/i', $userAgent)) return 'Chrome';
        if (preg_match('/Safari/i', $userAgent)) return 'Safari';
        if (preg_match('/Opera|OPR/i', $userAgent)) return 'Opera';

        return 'unknown';
    }

    /**
     * Detect platform from user agent
     */
    private function getPlatform(?string $userAgent): string
    {
        if (!$userAgent) return 'unknown';

        if (preg_match('/windows/i', $userAgent)) return 'Windows';
        if (preg_match('/macintosh|mac os/i', $userAgent)) return 'MacOS';
        if (preg_match('/linux/i', $userAgent)) return 'Linux';
        if (preg_match('/android/i', $userAgent)) return 'Android';
        if (preg_match('/iphone|ipad|ipod/i', $userAgent)) return 'iOS';

        return 'unknown';
    }
}