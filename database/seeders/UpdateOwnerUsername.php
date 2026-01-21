<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class UpdateOwnerUsername extends Seeder
{
    public function run(): void
    {
        User::where('role', 'owner')->update(['username' => 'owner1']);
    }
}
