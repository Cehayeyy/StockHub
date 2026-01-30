<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            // kolom FK ke tabel item_categories
            $table->foreignId('item_category_id')
                ->nullable()
                ->after('division')
                ->constrained('item_categories')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropForeign(['item_category_id']);
            $table->dropColumn('item_category_id');
        });
    }
};
