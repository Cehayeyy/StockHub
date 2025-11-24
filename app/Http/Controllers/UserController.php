<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        $users = User::select('id', 'username', 'name', 'email', 'role', 'created_at')->get();

        return Inertia::render('manajemen', [
            'users' => $users,
            'csrf_token' => csrf_token(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'role' => 'required|in:bar,kitchen',
            'nomor' => 'required|numeric|min:1',
            'password' => 'required|min:4',
        ]);

        $username = strtolower($request->role) . $request->nomor;

        if (User::where('username', $username)->exists()) {
            return back()->withErrors(['nomor' => 'Username sudah ada. Gunakan nomor lain.'])->withInput();
        }

        User::create([
            'username' => $username,
            'name' => $username,
            'email' => $username . '@example.com',
            'role' => $request->role,
            'password' => bcrypt($request->password),
        ]);

        return redirect()->route('manajemen')->with('success', 'Akun berhasil dibuat.');
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return redirect()->route('manajemen')->with('success', 'Akun berhasil dihapus.');
    }
}
