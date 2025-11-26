<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        // Ambil semua user termasuk password (agar bisa ditampilkan pada edit modal)
        $users = User::select('id', 'username', 'name', 'email', 'role', 'created_at', 'password')->get();

        return Inertia::render('manajemen', [
            'users' => $users,
            'csrf_token' => csrf_token(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'role' => 'required|in:bar,kitchen,supervisor',
            'username' => 'required',
            'password' => 'required|min:4',
        ]);

        User::create([
            'username' => $request->username,
            'name' => $request->username,
            'email' => $request->username . '@example.com',
            'role' => $request->role,
            'password' => bcrypt($request->password),
        ]);

        return redirect()->route('manajemen')->with('success', 'Akun berhasil dibuat.');
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'role' => 'required|in:bar,kitchen,supervisor',
            'username' => 'required',
            'password' => 'nullable|min:4',
        ]);

        // Update basic data
        $user->username = $request->username;
        $user->name = $request->username;
        $user->email = $request->username . '@example.com';
        $user->role = $request->role;

        // Jika password diisi → update
        if ($request->password !== null && $request->password !== "") {
            $user->password = bcrypt($request->password);
        }

        $user->save();

        return redirect()->route('manajemen')->with('success', 'Akun berhasil diperbarui.');
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return redirect()->route('manajemen')->with('success', 'Akun berhasil dihapus.');
    }
}

