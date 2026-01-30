<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Route; // Pastikan ini di-import
use App\Providers\RouteServiceProvider; // Pastikan ini di-import

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        // --- KITA UBAH BAGIAN INI ---
        $request->validate([
            'name' => 'required|string|max:255',
            // Tambahkan validasi untuk 'username'
            'username' => 'required|string|lowercase|max:255|unique:'.User::class,
            // Ubah 'email' menjadi 'nullable' (opsional)
            'email' => 'nullable|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'username' => $request->username, // <-- Tambahkan ini
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);
        // --- BATAS PERUBAHAN ---

        event(new Registered($user));

        Auth::login($user);

        // Ganti 'to_route('dashboard')' agar lebih standar
        return redirect(RouteServiceProvider::HOME);
    }
}
