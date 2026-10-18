<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DropWebsocketsStatisticsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'websocket_cleanup_test', 'database.connections.websocket_cleanup_test' => [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => 'test$',
        ]]);
    }

    protected function tearDown(): void
    {
        DB::purge('websocket_cleanup_test');
        parent::tearDown();
    }

    public function test_cleanup_drops_legacy_statistics_and_rollback_restores_the_empty_schema(): void
    {
        require_once database_path('migrations/0000_00_00_000000_create_websockets_statistics_entries_table.php');
        (new \CreateWebSocketsStatisticsEntriesTable)->up();
        DB::table('websockets_statistics_entries')->insert([
            'app_id' => 'legacy', 'peak_connection_count' => 2,
            'websocket_message_count' => 10, 'api_message_count' => 5,
        ]);
        $columns = Schema::getColumnListing('websockets_statistics_entries');
        $migration = require database_path('migrations/2026_10_18_160000_drop_websockets_statistics_entries_table.php');

        $migration->up();
        $this->assertFalse(Schema::hasTable('websockets_statistics_entries'));
        $migration->up();
        $this->assertFalse(Schema::hasTable('websockets_statistics_entries'));

        $migration->down();
        $this->assertSame($columns, Schema::getColumnListing('websockets_statistics_entries'));
        $this->assertDatabaseCount('websockets_statistics_entries', 0);
        DB::table('websockets_statistics_entries')->insert([
            'app_id' => 'restored', 'peak_connection_count' => 0,
            'websocket_message_count' => 0, 'api_message_count' => 0,
        ]);
        $this->assertDatabaseCount('websockets_statistics_entries', 1);
    }
}
