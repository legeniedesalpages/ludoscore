<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\Schema;

class MySqlLudotagTest extends LudotagTest
{
    protected function connectionConfig(): array
    {
        $connection = config('database.connections.'.config('database.default'));
        if ($connection['driver'] !== 'mysql') {
            $this->markTestSkipped('MySQL coverage requires a MySQL connection.');
        }
        $connection['prefix'] = 'ludotag_'.bin2hex(random_bytes(4)).'_';

        return $connection;
    }

    protected function tearDown(): void
    {
        if (config('database.default') === 'ludotag_test') {
            Schema::withoutForeignKeyConstraints(function (): void {
                Schema::dropIfExists('player_user');
                Schema::dropIfExists('players');
                Schema::dropIfExists('users');
            });
        }
        parent::tearDown();
    }
}
