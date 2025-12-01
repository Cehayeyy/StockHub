<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        // TIDAK perlu kirim password ke frontend
        $users = User::select('id', 'username', 'name', 'email', 'role', 'created_at')->get();

        return Inertia::render('manajemen', [
            'users' => $users,
            'csrf_token' => csrf_token(),
        ]);
    }

    /**
     * Generate username berikutnya berdasarkan role.
     * contoh: bar1, bar2, kitchen1, supervisor1, dst.
     */
    private function generateNextUsername(string $role): string
    {
        $role = strtolower($role);

        // prefix username
        $prefix = match ($role) {
            'bar' => 'bar',
            'kitchen' => 'kitchen',
            'supervisor' => 'supervisor',
            default => $role,
        };

        // cari username terakhir dengan prefix yang sama
        $lastUser = User::where('role', $role)
            ->where('username', 'like', $prefix . '%')
            ->orderBy('id', 'desc')
            ->first();

        $nextNumber = 1;

        if ($lastUser && preg_match('/^' . preg_quote($prefix, '/') . '(\d+)$/i', $lastUser->username, $m)) {
            $nextNumber = ((int) $m[1]) + 1;
        }

        return $prefix . $nextNumber;
    }

    public function store(Request $request)
    {
        $request->validate([
            'role'     => 'required|in:bar,kitchen,supervisor',
            'name'     => 'required|string|max:255',
            'username' => 'nullable|string|max:255',
            'password' => 'required|min:4',
        ]);

        $role = strtolower($request->role);

        // Jika username tidak dikirim dari frontend, generate di backend
        $username = $request->username ?: $this->generateNextUsername($role);

        User::create([
            'username' => $username,
            'name'     => $request->name,
            // email dummy supaya unik, kalau login pakai username tidak masalah
            'email'    => $username . '@example.com',
            'role'     => $role,
            'password' => bcrypt($request->password),
        ]);

        return redirect()->route('manajemen')->with('success', 'Akun berhasil dibuat.');
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'role'     => 'required|in:bar,kitchen,supervisor',
            'name'     => 'required|string|max:255',
            'username' => 'required|string|max:255',
            'password' => 'nullable|min:4',
        ]);

        $user->role     = strtolower($request->role);
        $user->username = $request->username;
        $user->name     = $request->name;
        $user->email    = $request->username . '@example.com';

        // ganti password hanya kalau diisi
        if ($request->filled('password')) {
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
