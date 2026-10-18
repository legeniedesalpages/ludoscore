<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const KEYS = [
        'creator_player_key' => ['is_creator', 'player_id'],
        'self_player_key' => ['is_self', 'player_id'],
        'self_user_key' => ['is_self', 'user_id'],
    ];

    public function up(): void
    {
        $this->validateCreators();
        if (Schema::hasColumn('users', 'player_id')) {
            $ambiguous = DB::table('users')->whereNotNull('player_id')->select('player_id')
                ->groupBy('player_id')->havingRaw('COUNT(*) > 1')->exists();
            $missing = DB::table('users')->whereNotNull('player_id')->whereNotExists(function ($links) {
                $links->selectRaw('1')->from('player_user')
                    ->whereColumn('player_user.user_id', 'users.id')
                    ->whereColumn('player_user.player_id', 'users.player_id');
            })->exists();
            if ($ambiguous || $missing) {
                throw new RuntimeException('Normalisation impossible : identites personnelles ambigues ou associations manquantes.');
            }
        }
        if (!Schema::hasColumn('player_user', 'is_self')) {
            Schema::table('player_user', fn (Blueprint $table) => $table->boolean('is_self')->default(false));
        }
        // MySQL 5.7 can implicitly add ON UPDATE to the first TIMESTAMP column.
        Schema::table('player_user', fn (Blueprint $table) => $table->timestamp('associated_at')->useCurrent()->change());
        if (Schema::hasColumn('users', 'player_id')) {
            $conflict = DB::table('player_user as pu')->join('users as u', 'u.id', '=', 'pu.user_id')
                ->where('pu.is_self', true)->where(function ($query) {
                    $query->whereNull('u.player_id')->orWhereColumn('u.player_id', '!=', 'pu.player_id');
                })->exists();
            if ($conflict) {
                throw new RuntimeException('Normalisation impossible : les identites personnelles divergent.');
            }
            DB::transaction(function () {
                DB::table('users')->whereNotNull('player_id')->orderBy('id')->chunkById(500, function ($users) {
                    foreach ($users as $user) {
                        DB::table('player_user')->where('user_id', $user->id)->where('player_id', $user->player_id)
                            ->update(['is_self' => true]);
                    }
                });
            });
        }
        foreach (self::KEYS as $key => [$flag, $id]) {
            if (!Schema::hasColumn('player_user', $key)) {
                Schema::table('player_user', function (Blueprint $table) use ($key, $flag, $id) {
                    $table->unsignedBigInteger($key)->nullable()->virtualAs("CASE WHEN $flag THEN $id ELSE NULL END");
                });
            }
            if (!Schema::hasIndex('player_user', $key.'_unique')) {
                Schema::table('player_user', fn (Blueprint $table) => $table->unique($key, $key.'_unique'));
            }
        }
        $this->dropLegacyColumn('players', 'created_by_user_id');
        $this->dropLegacyColumn('users', 'player_id');
    }

    private function validateCreators(): void
    {
        $invalid = DB::table('players')->where(function ($query) {
            $query->whereNotExists(function ($links) {
                $links->selectRaw('1')->from('player_user')->whereColumn('player_user.player_id', 'players.id')
                    ->where('is_creator', true);
            })->orWhereExists(function ($links) {
                $links->select('player_id')->from('player_user')->whereColumn('player_user.player_id', 'players.id')
                    ->where('is_creator', true)->groupBy('player_id')->havingRaw('COUNT(*) > 1');
            });
        })->exists();
        if (Schema::hasColumn('players', 'created_by_user_id')) {
            $invalid = $invalid || DB::table('player_user as pu')->join('players as p', 'p.id', '=', 'pu.player_id')
                ->where('pu.is_creator', true)->whereColumn('pu.user_id', '!=', 'p.created_by_user_id')->exists();
        }
        if ($invalid) {
            throw new RuntimeException('Normalisation impossible : chaque joueur doit avoir exactement un createur coherent dans player_user.');
        }
    }

    private function dropLegacyColumn(string $table, string $column): void
    {
        if (!Schema::hasColumn($table, $column)) {
            return;
        }
        foreach (Schema::getForeignKeys($table) as $foreign) {
            if ($foreign['columns'] === [$column]) {
                $key = DB::getDriverName() === 'sqlite' ? [$column] : $foreign['name'];
                Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropForeign($key));
            }
        }
        foreach (Schema::getIndexes($table) as $index) {
            if (!$index['primary'] && in_array($column, $index['columns'], true)) {
                Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropIndex($index['name']));
            }
        }
        Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropColumn($column));
    }

    public function down(): void
    {
        $this->validateCreators();
        if (!Schema::hasColumn('players', 'created_by_user_id')) {
            Schema::table('players', fn (Blueprint $table) => $table->foreignId('created_by_user_id')->nullable()->constrained('users')->restrictOnDelete());
        }
        if (!Schema::hasColumn('users', 'player_id')) {
            Schema::table('users', fn (Blueprint $table) => $table->foreignId('player_id')->nullable()->constrained('players'));
        }
        DB::transaction(function () {
            DB::table('players')->orderBy('id')->chunkById(500, function ($players) {
                foreach ($players as $player) {
                    $creator = DB::table('player_user')->where('player_id', $player->id)->where('is_creator', true)->value('user_id');
                    DB::table('players')->where('id', $player->id)->update(['created_by_user_id' => $creator]);
                }
            });
            DB::table('users')->update(['player_id' => null]);
            DB::table('player_user')->where('is_self', true)->orderBy('id')->chunkById(500, function ($links) {
                foreach ($links as $link) {
                    DB::table('users')->where('id', $link->user_id)->update(['player_id' => $link->player_id]);
                }
            });
        });
        Schema::table('players', fn (Blueprint $table) => $table->unsignedBigInteger('created_by_user_id')->nullable(false)->change());
        foreach (array_keys(self::KEYS) as $key) {
            Schema::table('player_user', function (Blueprint $table) use ($key) {
                $table->dropUnique($key.'_unique');
                $table->dropColumn($key);
            });
        }
        Schema::table('player_user', fn (Blueprint $table) => $table->dropColumn('is_self'));
    }
};
