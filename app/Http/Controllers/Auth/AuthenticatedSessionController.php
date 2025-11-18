<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
// Kita HAPUS 'RouteServiceProvider' karena kita tidak membutuhkannya
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

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

        // --- INI ADALAH TAMBAHAN BARU ---
        // Kirim pesan 'login_success' ke sesi (flash)
        session()->flash('login_success', 'Berhasil! anda berhasil login');
        // --- BATAS TAMBAHAN ---

        // Arahkan ke /dashboard secara langsung (ini sudah benar)
        return redirect()->intended('/dashboard');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        // Arahkan kembali ke halaman login (ini sudah benar)
        return to_route('login');
    }
}
