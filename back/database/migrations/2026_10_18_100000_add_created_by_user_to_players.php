<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $fallbackId = DB::table('users')->where('email', 'renaud_balu@hotmail.com')->value('id');
        $ambiguous = DB::table('users')->join('players', 'players.id', '=', 'users.player_id')
            ->select('users.player_id')
            ->groupBy('users.player_id')->havingRaw('COUNT(*) > 1')->exists();
        if ($ambiguous) {
            throw new RuntimeException('Migration des createurs impossible : plusieurs comptes sont associes au meme joueur.');
        }

        $unassociated = DB::table('players')->whereNotExists(function ($query) {
            $query->selectRaw('1')->from('users')->whereColumn('users.player_id', 'players.id');
        })->exists();
        if (!$fallbackId && $unassociated) {
            throw new RuntimeException('Migration des createurs impossible : compte renaud_balu@hotmail.com introuvable.');
        }

        if (!Schema::hasColumn('players', 'created_by_user_id')) {
            Schema::table('players', function (Blueprint $table) {
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            });
        }

        DB::transaction(function () use ($fallbackId) {
            DB::table('players')->whereNull('created_by_user_id')->orderBy('id')
                ->chunkById(500, function ($players) use ($fallbackId) {
                    foreach ($players as $player) {
                        $creatorId = DB::table('users')->where('player_id', $player->id)->value('id') ?? $fallbackId;
                        DB::table('players')->where('id', $player->id)
                            ->update(['created_by_user_id' => $creatorId]);
                    }
                });
        });

        Schema::table('players', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by_user_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('players', fn(Blueprint $table) => $table->dropConstrainedForeignId('created_by_user_id'));
    }
};
