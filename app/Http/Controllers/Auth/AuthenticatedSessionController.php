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

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();
        $request->session()->regenerate();

        $user = Auth::user();

        if ($user) {
            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'Login',
                'description' => 'User melakukan login ke sistem',
            ]);

            // Simpan login history
            $userAgent = $request->header('User-Agent');
            LoginHistory::create([
                'user_id'     => $user->id,
                'ip_address'  => $request->ip(),
                'user_agent'  => $userAgent,
                'device_type' => $this->getDeviceType($userAgent),
                'browser'     => $this->getBrowser($userAgent),
                'platform'    => $this->getPlatform($userAgent),
                'login_at'    => now(),
            ]);
        }

        return redirect()->intended('/dashboard')->with('login_success', 'Selamat datang, ' . Auth::user()->name . '!');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = Auth::user();

        if ($user) {
            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'Logout',
                'description' => 'User keluar dari sistem',
            ]);

            // Update logout time di login history terakhir
            $lastLogin = LoginHistory::where('user_id', $user->id)
                ->whereNull('logout_at')
                ->latest('login_at')
                ->first();

            if ($lastLogin) {
                $lastLogin->update(['logout_at' => now()]);
            }
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
