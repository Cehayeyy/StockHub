<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    public function index()
    {
        $users = User::select('id', 'username', 'name', 'email', 'role', 'created_at')->get();
        $currentUserRole = Auth::user()->role;
        $allowedRoles = [];

        if ($currentUserRole === 'owner') {
            $allowedRoles = ['owner', 'supervisor', 'bar', 'dapur'];
        } elseif ($currentUserRole === 'supervisor') {
            $allowedRoles = ['bar', 'dapur'];
        }

        return Inertia::render('manajemen', [
            'users' => $users,
            'csrf_token' => csrf_token(),
            'allowedRoles' => $allowedRoles,
        ]);
    }

    private function generateNextUsername(string $role): string
    {
        $role = strtolower($role);
        $prefix = match ($role) {
            'bar' => 'bar',
            'dapur' => 'dapur',
            'supervisor' => 'supervisor',
            'owner' => 'owner',
            default => $role,
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
            'role'     => 'required|in:bar,dapur,supervisor,owner',
            'name'     => 'required|string|max:255',
            'username' => 'nullable|string|max:255',
            'password' => 'required|min:5',
        ], [
            'password.min' => 'Password tidak boleh kurang dari 5 karakter.',
            'password.required' => 'Password wajib diisi.',
        ]);

        $role = strtolower($request->role);
        $currentUserRole = Auth::user()->role;

        if ($currentUserRole === 'supervisor' && in_array($role, ['supervisor', 'owner'])) {
            return back()->withErrors(['role' => 'Anda tidak memiliki izin untuk membuat akun dengan role ini.']);
        }

        // Hanya owner yang boleh membuat owner (tapi biasanya tidak diperlukan)
        if ($role === 'owner' && $currentUserRole !== 'owner') {
            return back()->withErrors(['role' => 'Hanya owner yang dapat membuat akun owner.']);
        }

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
            'role'     => 'required|in:bar,dapur,supervisor,owner',
            'name'     => 'required|string|max:255',
            'username' => 'required|string|min:5|max:255',
            'password' => 'nullable|min:5',
        ], [
            'username.min' => 'Username tidak boleh kurang dari 5 karakter.',
            'password.min' => 'Password tidak boleh kurang dari 5 karakter.',
        ]);

        $role = strtolower($request->role);
        $currentUserRole = Auth::user()->role;

        // Validasi permission: supervisor tidak boleh mengubah ke supervisor/owner
        if ($currentUserRole === 'supervisor' && in_array($role, ['supervisor', 'owner'])) {
            return back()->withErrors(['role' => 'Anda tidak memiliki izin untuk mengubah ke role ini.']);
        }

        // Supervisor tidak boleh mengedit akun owner atau supervisor lain
        if ($currentUserRole === 'supervisor' && in_array($user->role, ['supervisor', 'owner'])) {
            return back()->withErrors(['role' => 'Anda tidak memiliki izin untuk mengedit akun ini.']);
        }

        $oldUsername = $user->username;

        $user->role     = $role;
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

    /**
     * Update akun sendiri (untuk owner)
     */
    public function updateSelf(Request $request)
    {
        /** @var User $user */
        $user = User::findOrFail(Auth::id());

        $request->validate([
            'username' => 'required|string|min:5|max:255|unique:users,username,' . $user->id,
            'password' => 'nullable|min:5',
        ], [
            'username.min' => 'Username tidak boleh kurang dari 5 karakter.',
            'password.min' => 'Password tidak boleh kurang dari 5 karakter.',
        ]);

        $oldUsername = $user->username;

        $user->username = $request->username;
        $user->email    = $request->username . '@example.com';

        if ($request->filled('password')) {
            $user->password = bcrypt($request->password);
        }

        $user->save();

        // LOG AKTIVITAS
        ActivityLog::create([
            'user_id'     => Auth::id(),
            'activity'    => 'Update Akun Sendiri',
            'description' => "Mengupdate akun sendiri dari '{$oldUsername}' ke '{$user->username}'."
        ]);

        return redirect()->route('manajemen')->with('success', 'Akun Anda berhasil diperbarui.');
    }
}
