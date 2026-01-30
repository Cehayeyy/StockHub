<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DefaultUsersSeeder extends Seeder
{
    public function run(): void
    {
        // Owner utama (paling tinggi)
        User::updateOrCreate(
            ['username' => 'owner1'], // key unik
            [
                'name'     => 'Owner Warung Cangkruk',
                'email'    => 'owner@warungcangkruk.com',
                'role'     => 'owner',
                'password' => Hash::make('owner123'), // password login
            ]
        );

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
