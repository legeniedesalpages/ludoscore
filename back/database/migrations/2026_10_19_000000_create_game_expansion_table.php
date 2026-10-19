<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_expansion', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('extension_id')->constrained('games')->cascadeOnDelete();
            // The base game need not exist in our catalogue yet.
            $table->bigInteger('base_game_bgg_id')->index();
            $table->timestamps();
            $table->unique(['extension_id', 'base_game_bgg_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_expansion');
    }
};
