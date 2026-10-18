<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('player_user')) {
            Schema::create('player_user', function (Blueprint $table) {
                $table->id();
                $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
                $table->boolean('is_creator')->default(false);
                $table->boolean('can_view_personal_info')->default(false);
                $table->boolean('can_view_other_matches')->default(false);
                $table->boolean('can_add_to_match')->default(false);
                $table->timestamp('associated_at');
                $table->timestamp('updated_at')->nullable();
                $table->unique(['player_id', 'user_id']);
            });
        }

        DB::transaction(function () {
            DB::table('players')->orderBy('id')->chunkById(500, function ($players) {
                foreach ($players as $player) {
                    $userIds = DB::table('users')->where('player_id', $player->id)->pluck('id')
                        ->push($player->created_by_user_id)->unique();
                    foreach ($userIds as $userId) {
                        if (! DB::table('player_user')->where('player_id', $player->id)->where('user_id', $userId)->exists()) {
                            DB::table('player_user')->insert([
                                'player_id' => $player->id,
                                'user_id' => $userId,
                                'is_creator' => $userId == $player->created_by_user_id,
                                'can_view_personal_info' => true,
                                'can_view_other_matches' => true,
                                'can_add_to_match' => true,
                                'associated_at' => $player->created_at ?? now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                }
            });
        });
    }

    public function down(): void
    {
        $changed = DB::table('player_user as pu')->join('players as p', 'p.id', '=', 'pu.player_id')
            ->where(function ($query) {
                $query->where('pu.can_view_personal_info', false)
                    ->orWhere('pu.can_view_other_matches', false)
                    ->orWhere('pu.can_add_to_match', false)
                    ->orWhere(function ($query) {
                        $query->whereColumn('pu.user_id', '!=', 'p.created_by_user_id')
                            ->whereNotExists(function ($users) {
                                $users->selectRaw('1')->from('users')
                                    ->whereColumn('users.id', 'pu.user_id')->whereColumn('users.player_id', 'p.id');
                            });
                    });
            })->exists();
        if ($changed) {
            throw new RuntimeException('Rollback refuse : des associations ou permissions seraient perdues. Sauvegarder et migrer ces donnees avant de revenir en arriere.');
        }
        Schema::dropIfExists('player_user');
    }
};
