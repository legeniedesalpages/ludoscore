<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Schema;

class MySqlPlayerIdentityTest extends NormalizePlayerIdentityTest
{
    protected function connectionConfig(): array
    {
        $connection = config('database.connections.'.config('database.default'));
        if ($connection['driver'] !== 'mysql') {
            $this->markTestSkipped('MySQL migration coverage requires a MySQL connection.');
        }
        $connection['prefix'] = 'identity_'.bin2hex(random_bytes(4)).'_';

        return $connection;
    }

    protected function tearDown(): void
    {
        if (config('database.default') === 'identity_test') {
            Schema::withoutForeignKeyConstraints(function () {
                Schema::dropIfExists('player_user');
                Schema::dropIfExists('users');
                Schema::dropIfExists('players');
            });
        }
        parent::tearDown();
    }
}
