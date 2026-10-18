<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('players', 'replaced_by_player_id')) {
            Schema::table('players', fn (Blueprint $table) => $table->foreignId('replaced_by_player_id')->nullable());
        }
        if (! Schema::hasColumn('players', 'replaced_at')) {
            Schema::table('players', fn (Blueprint $table) => $table->dateTime('replaced_at')->nullable());
        }
        if (! collect(Schema::getForeignKeys('players'))->contains(fn ($key) => $key['columns'] === ['replaced_by_player_id'])) {
            Schema::table('players', fn (Blueprint $table) => $table->foreign('replaced_by_player_id')->references('id')->on('players')->restrictOnDelete());
        }
        if (! Schema::hasColumn('team_players', 'original_player_id')) {
            Schema::table('team_players', fn (Blueprint $table) => $table->foreignId('original_player_id')->nullable());
        }
        if (! collect(Schema::getForeignKeys('team_players'))->contains(fn ($key) => $key['columns'] === ['original_player_id'])) {
            Schema::table('team_players', fn (Blueprint $table) => $table->foreign('original_player_id')->references('id')->on('players')->restrictOnDelete());
        }
        if (! Schema::hasTable('player_merges')) {
            Schema::create('player_merges', function (Blueprint $table) {
                $table->id();
                $table->foreignId('replaced_player_id')->unique()->constrained('players')->restrictOnDelete();
                $table->foreignId('surviving_player_id')->constrained('players')->restrictOnDelete();
                $table->foreignId('requested_by_user_id')->constrained('users')->restrictOnDelete();
                $table->json('associations_before');
                $table->dateTime('created_at');
            });
        }
        if (! Schema::hasTable('player_merge_participations')) {
            Schema::create('player_merge_participations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('player_merge_id');
                $table->foreign('player_merge_id', DB::getTablePrefix().'merge_part_merge_fk')->references('id')->on('player_merges')->restrictOnDelete();
                $table->foreignId('team_player_id')->nullable();
                $table->foreign('team_player_id', DB::getTablePrefix().'merge_part_team_player_fk')->references('id')->on('team_players')->nullOnDelete();
                $table->unsignedBigInteger('participation_id');
                $table->unsignedBigInteger('match_id');
                $table->unsignedBigInteger('team_id');
                $table->unsignedBigInteger('previous_player_id');
                $table->unsignedBigInteger('original_player_id')->nullable();
                $table->unique(['player_merge_id', 'participation_id'], 'merge_participation_unique');
            });
        }
    }

    public function down(): void
    {
        if (DB::table('player_merges')->exists()) {
            throw new RuntimeException('Rollback refuse : des fusions existent. Conserver leur journal et traiter les donnees avant tout retour en arriere.');
        }
        Schema::dropIfExists('player_merge_participations');
        Schema::dropIfExists('player_merges');
        Schema::table('team_players', function (Blueprint $table) {
            $table->dropForeign(['original_player_id']);
            $table->dropColumn('original_player_id');
        });
        Schema::table('players', function (Blueprint $table) {
            $table->dropForeign(['replaced_by_player_id']);
            $table->dropColumn(['replaced_by_player_id', 'replaced_at']);
        });
    }
};
