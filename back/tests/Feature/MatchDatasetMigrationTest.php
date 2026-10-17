<?php

namespace Tests\Feature;

use App\Services\Analytics\MatchDataset;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MatchDatasetMigrationTest extends TestCase
{
    private function matchRow(int $id, string $start, ?string $finish): object
    {
        return (object) [
            'match_id' => $id, 'game_id' => 1, 'game' => 'Test', 'coop' => false,
            'player_id' => 1, 'team_id' => $id, 'started_at' => $start, 'finished_at' => $finish,
            'winner_team_id' => $id, 'color' => null, 'position' => 0, 'score' => 10,
            'latitude' => null, 'longitude' => null, 'location_name' => null,
            'match_tags' => null, 'team_tags' => null,
        ];
    }

    private function mockRows(array $rows): void
    {
        $query = Mockery::mock(Builder::class);
        DB::shouldReceive('table')->with('team_players as tp')->once()->andReturn($query);
        $query->shouldReceive('join', 'where', 'whereNotNull', 'select', 'orderBy')->andReturnSelf();
        $query->shouldReceive('get')->once()->andReturn(collect($rows));
    }

    #[DataProvider('durations')]
    public function test_duration_preserves_integer_minutes_and_limits(?string $finish, ?int $expected): void
    {
        $this->mockRows([$this->matchRow(1, '2026-10-01 12:00:00', $finish)]);

        $this->assertSame($expected, app(MatchDataset::class)->rows()->first()['duration']);
    }

    public static function durations(): array
    {
        return [
            'unfinished' => [null, null],
            'under one minute' => ['2026-10-01 12:00:59', null],
            'fractional minute' => ['2026-10-01 12:01:59', 1],
            'absolute difference' => ['2026-10-01 11:58:01', 1],
            'under 24 hours' => ['2026-10-02 11:59:59', 1439],
            '24 hours excluded' => ['2026-10-02 12:00:00', null],
        ];
    }

    public function test_gaps_remain_whole_days_with_carbon_three(): void
    {
        $this->mockRows([
            $this->matchRow(1, '2026-10-01 12:00:00', null),
            $this->matchRow(2, '2026-10-03 18:00:00', null),
        ]);

        $rows = app(MatchDataset::class)->rows();

        $this->assertNull($rows[0]['gap_game_days']);
        $this->assertNull($rows[0]['gap_player_days']);
        $this->assertSame(2, $rows[1]['gap_game_days']);
        $this->assertSame(2, $rows[1]['gap_player_days']);
    }
}
