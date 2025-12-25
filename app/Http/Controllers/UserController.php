<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\ActivityLog; // Import
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

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

    private function generateNextUsername(string $role): string
    {
        $role = strtolower($role);
        $prefix = match ($role) {
            'bar' => 'bar',
            'kitchen' => 'kitchen',
            'supervisor' => 'supervisor',
            'default' => $role,
        };

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
        $username = $request->username ?: $this->generateNextUsername($role);

        $user = User::create([
            'username' => $username,
            'name'     => $request->name,
            'email'    => $username . '@example.com',
            'role'     => $role,
            'password' => bcrypt($request->password),
        ]);

        // LOG AKTIVITAS
        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Tambah Akun',
            'description' => "Membuat akun baru: {$username} (Role: {$role})."
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

        $oldUsername = $user->username;

        $user->role     = strtolower($request->role);
        $user->username = $request->username;
        $user->name     = $request->name;
        $user->email    = $request->username . '@example.com';

        if ($request->filled('password')) {
            $user->password = bcrypt($request->password);
        }

        $user->save();

        // LOG AKTIVITAS
        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Update Akun',
            'description' => "Mengupdate data akun '{$oldUsername}'."
        ]);

        return redirect()->route('manajemen')->with('success', 'Akun berhasil diperbarui.');
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $username = $user->username;

        $user->delete();

        // LOG AKTIVITAS
        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Hapus Akun',
            'description' => "Menghapus akun '{$username}'."
        ]);

        return redirect()->route('manajemen')->with('success', 'Akun berhasil dihapus.');
    }
}
