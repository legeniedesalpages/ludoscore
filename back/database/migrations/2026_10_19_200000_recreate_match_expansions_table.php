<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('match_expansions')) {
            // Legacy table from 2022: never written by the application, recreated with proper constraints when empty.
            if (DB::table('match_expansions')->exists()) {
                return;
            }
            Schema::drop('match_expansions');
        }

        Schema::create('match_expansions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('game_id')->constrained('games')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['match_id', 'game_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_expansions');
    }
};
