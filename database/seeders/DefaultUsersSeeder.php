<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DefaultUsersSeeder extends Seeder
{
    public function run(): void
    {
        // Supervisor utama
        User::updateOrCreate(
            ['username' => 'supervisor1'], // key unik
            [
                'name'     => 'dimas (supervisor)',
                'email'    => 'supervisor@example.com',
                'role'     => 'supervisor',
                'password' => Hash::make('password123'), // password login
            ]
        );
    }
}
