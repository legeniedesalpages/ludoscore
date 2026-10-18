<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const LEGACY_OWNER_EMAIL = 'renaud_balu@hotmail.com';

    public function up(): void
    {
        $ownerId = DB::table('users')->where('email', self::LEGACY_OWNER_EMAIL)->value('id');
        if (!$ownerId && DB::table('games')->exists()) {
            throw new RuntimeException('Migration de la ludotheque impossible : compte '.self::LEGACY_OWNER_EMAIL.' introuvable.');
        }

        if (!Schema::hasTable('game_user')) {
            Schema::create('game_user', function (Blueprint $table) {
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('game_id')->constrained()->cascadeOnDelete();
                $table->boolean('in_library')->default(false);
                $table->date('ownership_date')->nullable();
                $table->timestamps();
                $table->primary(['user_id', 'game_id']);
            });
        }

        // MySQL DDL is not transactional: allow a retry after an interrupted migration.
        $legacyColumns = array_values(array_filter(
            ['in_library', 'ownership_date'],
            fn($column) => Schema::hasColumn('games', $column)
        ));
        if ($ownerId && $legacyColumns) {
            DB::transaction(function () use ($ownerId, $legacyColumns) {
                DB::table('games')->orderBy('id')->chunkById(500, function ($games) use ($ownerId, $legacyColumns) {
                    foreach ($games as $game) {
                        $values = ['updated_at' => $game->updated_at];
                        foreach ($legacyColumns as $column) {
                            $values[$column] = $game->$column;
                        }
                        DB::table('game_user')->updateOrInsert(
                            ['user_id' => $ownerId, 'game_id' => $game->id],
                            $values + ['created_at' => $game->created_at]
                        );
                    }
                });
            });
        }

        if ($legacyColumns) {
            Schema::table('games', fn(Blueprint $table) => $table->dropColumn($legacyColumns));
        }
    }

    public function down(): void
    {
        $ownerId = DB::table('users')->where('email', self::LEGACY_OWNER_EMAIL)->value('id');
        $otherLibraries = DB::table('game_user');
        if ($ownerId) {
            $otherLibraries->where('user_id', '<>', $ownerId);
        }
        if ($otherLibraries->exists()) {
            throw new RuntimeException('Rollback impossible sans perte : plusieurs utilisateurs ont une ludotheque. Sauvegarder et exporter leurs donnees avant de revenir au modele global.');
        }

        foreach (['in_library', 'ownership_date'] as $column) {
            if (!Schema::hasColumn('games', $column)) {
                Schema::table('games', function (Blueprint $table) use ($column) {
                    if ($column === 'in_library') {
                        $table->boolean('in_library')->default(false);
                    } else {
                        $table->date('ownership_date')->nullable();
                    }
                });
            }
        }

        DB::table('game_user')->where('user_id', $ownerId)->orderBy('game_id')
            ->chunkById(500, function ($entries) {
                foreach ($entries as $entry) {
                    DB::table('games')->where('id', $entry->game_id)->update([
                        'in_library' => $entry->in_library,
                        'ownership_date' => $entry->ownership_date,
                    ]);
                }
            }, 'game_id');

        Schema::drop('game_user');
    }
};
