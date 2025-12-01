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

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();
        $request->session()->regenerate();

        // Ambil user yang baru saja login
        $user = Auth::user();

        if ($user) {
            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'login',
                'description' => 'User melakukan login ke sistem',
            ]);
        }

        // Flash message login sukses
        session()->flash('login_success', 'Berhasil! anda berhasil login');

        return redirect()->intended('/dashboard');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        // Catat log sebelum logout (karena setelah logout user-nya sudah hilang)
        $user = Auth::user();

        if ($user) {
            ActivityLog::create([
                'user_id'     => $user->id,
                'activity'    => 'logout',
                'description' => 'User keluar dari sistem',
            ]);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('login');
    }
}
