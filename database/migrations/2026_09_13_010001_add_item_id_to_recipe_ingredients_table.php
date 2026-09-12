<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('recipe_ingredients', function (Blueprint $table) {
            $table->foreignId('item_id')
                ->nullable()
                ->after('recipe_id')
                ->constrained('items')
                ->nullOnDelete();
            $table->decimal('harga_dasar', 15, 2)->nullable()->after('unit');
            $table->decimal('subtotal', 15, 2)->nullable()->after('harga_dasar');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recipe_ingredients', function (Blueprint $table) {
            $table->dropForeign(['item_id']);
            $table->dropColumn(['item_id', 'harga_dasar', 'subtotal']);
        });
    }
};
