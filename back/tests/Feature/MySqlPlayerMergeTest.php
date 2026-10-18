<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\Schema;

class MySqlPlayerMergeTest extends PlayerMergeTest
{
    protected function connectionConfig(): array
    {
        $connection = config('database.connections.'.config('database.default'));
        if ($connection['driver'] !== 'mysql') {
            $this->markTestSkipped('MySQL coverage requires a MySQL connection.');
        }
        $connection['prefix'] = 'merge_'.bin2hex(random_bytes(4)).'_';

        return $connection;
    }

    protected function tearDown(): void
    {
        if (config('database.default') === 'merge_test') {
            Schema::withoutForeignKeyConstraints(function (): void {
                foreach (['player_merge_participations', 'player_merges', 'team_players', 'teams', 'matches', 'player_user', 'players', 'users'] as $table) {
                    Schema::dropIfExists($table);
                }
            });
        }
        parent::tearDown();
    }
}
