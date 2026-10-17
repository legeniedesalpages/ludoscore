<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Analytics\GameStatistics;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class GameStatisticsTest extends TestCase
{
    private function matchRow(int $id, int $gameId, ?string $start, ?string $finish, ?int $winner = null): object
    {
        return (object) [
            'id' => $id, 'game_id' => $gameId, 'started_at' => $start, 'finished_at' => $finish,
            'winner_team_id' => $winner,
        ];
    }

    private function mockMatches(array $matches, ?int $gameId = null): void
    {
        $query = Mockery::mock(Builder::class);
        DB::shouldReceive('table')->with('matches')->once()->andReturn($query);
        $query->shouldReceive('where')->with('canceled', false)->once()->andReturnSelf();
        $query->shouldReceive('where')->with('running', false)->once()->andReturnSelf();
        $query->shouldReceive('when')->once()->andReturnUsing(function ($condition, $callback) use ($query, $gameId) {
            $this->assertSame($gameId !== null, $condition);
            if ($condition) $callback($query);
            return $query;
        });
        if ($gameId !== null) {
            $query->shouldReceive('where')->with('game_id', $gameId)->once()->andReturnSelf();
        }
        $query->shouldReceive('orderBy')->with('started_at')->once()->andReturnSelf();
        $query->shouldReceive('orderBy')->with('id')->once()->andReturnSelf();
        $query->shouldReceive('get')->once()->andReturn(collect($matches));
    }

    public function test_library_includes_unplayed_games_and_breaks_ties_by_newest_addition(): void
    {
        Sanctum::actingAs(new User());
        $games = Mockery::mock(Builder::class);
        DB::shouldReceive('table')->with('games')->once()->andReturn($games);
        $games->shouldReceive('orderByDesc')->with('created_at')->once()->andReturnSelf();
        $games->shouldReceive('orderByDesc')->with('id')->once()->andReturnSelf();
        $games->shouldReceive('get')->once()->andReturn(collect([
            (object) ['id' => 3, 'title' => 'Même titre', 'thumbnail_id' => null, 'created_at' => '2026-03-01'],
            (object) ['id' => 2, 'title' => 'Même titre', 'thumbnail_id' => 'test.jpg', 'created_at' => '2026-02-01'],
            (object) ['id' => 1, 'title' => 'Ancien', 'thumbnail_id' => null, 'created_at' => '2026-01-01'],
        ]));
        $this->mockMatches([
            $this->matchRow(1, 1, '2026-01-01 12:00:00', '2026-01-01 13:00:00'),
            $this->matchRow(2, 2, '2026-01-02 12:00:00', '2026-01-02 12:30:00'),
        ]);

        $this->getJson('/api/statistics/game-library')->assertOk()
            ->assertJsonPath('summary.totalGames', 3)
            ->assertJsonPath('summary.playedGames', 2)
            ->assertJsonPath('summary.totalPlayMinutes', 90)
            ->assertJsonPath('summary.averageDurationMinutes', 45)
            ->assertJsonPath('data.0.id', 2)
            ->assertJsonPath('data.1.id', 1)
            ->assertJsonPath('data.2.id', 3)
            ->assertJsonPath('data.2.matches', 0)
            ->assertJsonPath('data.2.averageDurationMinutes', null);
    }

    public function test_detail_counts_distinct_players_and_team_victories_and_fills_months(): void
    {
        Sanctum::actingAs(new User());
        $game = Mockery::mock(Builder::class);
        DB::shouldReceive('table')->with('games')->once()->andReturn($game);
        $game->shouldReceive('where')->with('id', 7)->once()->andReturnSelf();
        $game->shouldReceive('first')->once()->andReturn((object) ['id' => 7, 'title' => 'Test']);
        $this->mockMatches([
            $this->matchRow(1, 7, '2026-01-01 18:00:00', '2026-01-01 19:00:00', 10),
            $this->matchRow(2, 7, '2026-03-01 10:00:00', null),
        ], 7);
        $players = Mockery::mock(Builder::class);
        DB::shouldReceive('table')->with('teams as t')->once()->andReturn($players);
        $players->shouldReceive('leftJoin', 'select')->andReturnSelf();
        $players->shouldReceive('whereIn')->once()->with('t.match_id', Mockery::on(fn($ids) => $ids->all() === [1, 2]))->andReturnSelf();
        $row = fn($match, $team, $player, $pseudo) => (object) [
            'match_id' => $match, 'team_id' => $team, 'player_id' => $player, 'pseudo' => $pseudo, 'name' => 'Équipe',
        ];
        $players->shouldReceive('get')->once()->andReturn(collect([
            $row(1, 10, 1, 'Alice'), $row(1, 10, 2, 'Bob'), $row(1, 11, 3, 'Charlie'),
            $row(2, 12, 1, 'Alice'),
        ]));

        $this->getJson('/api/statistics/games/7')->assertOk()
            ->assertJsonPath('matches', 2)
            ->assertJsonPath('measuredMatches', 1)
            ->assertJsonPath('totalPlayMinutes', 60)
            ->assertJsonPath('averageDurationMinutes', 60)
            ->assertJsonPath('minDurationMinutes', 60)
            ->assertJsonPath('maxDurationMinutes', 60)
            ->assertJsonPath('charts.0.rows', [['Alice', 1], ['Bob', 1], ['Sans vainqueur renseigné', 1]])
            ->assertJsonPath('charts.3.rows', [['1', 1], ['3', 1]])
            ->assertJsonPath('charts.4.rows', [['2026-01', 1], ['2026-02', 0], ['2026-03', 1]])
            ->assertJsonPath('charts.5.rows', [['2026-01-01 18:00', 60]]);
    }

    public function test_summary_excludes_unknown_zero_and_negative_durations(): void
    {
        $stats = app(GameStatistics::class)->summary(collect([
            $this->matchRow(1, 1, null, null),
            $this->matchRow(2, 1, '2026-01-01 12:00:00', '2026-01-01 12:00:00'),
            $this->matchRow(3, 1, '2026-01-01 12:00:00', '2026-01-01 11:00:00'),
        ]));
        $this->assertSame(3, $stats['matches']);
        $this->assertSame(0, $stats['measuredMatches']);
        $this->assertNull($stats['averageDurationMinutes']);
        $this->assertNull($stats['minDurationMinutes']);
        $this->assertSame(0, $stats['totalPlayMinutes']);
    }

    public function test_empty_library_has_zero_counts_and_no_average(): void
    {
        Sanctum::actingAs(new User());
        $games = Mockery::mock(Builder::class);
        DB::shouldReceive('table')->with('games')->once()->andReturn($games);
        $games->shouldReceive('orderByDesc')->andReturnSelf();
        $games->shouldReceive('get')->once()->andReturn(collect());
        $this->mockMatches([]);
        $this->getJson('/api/statistics/game-library')->assertOk()
            ->assertJsonPath('summary.totalGames', 0)
            ->assertJsonPath('summary.playedGames', 0)
            ->assertJsonPath('summary.averageDurationMinutes', null)
            ->assertJsonPath('summary.totalPlayMinutes', 0)
            ->assertJsonPath('data', []);
    }

    public function test_missing_game_returns_not_found(): void
    {
        Sanctum::actingAs(new User());
        $query = Mockery::mock(Builder::class);
        DB::shouldReceive('table')->with('games')->once()->andReturn($query);
        $query->shouldReceive('where')->with('id', 999)->once()->andReturnSelf();
        $query->shouldReceive('first')->once()->andReturnNull();
        $this->getJson('/api/statistics/games/999')->assertNotFound();
    }

    public function test_statistics_require_authentication(): void
    {
        $this->getJson('/api/statistics/game-library')->assertUnauthorized();
        $this->getJson('/api/statistics/games/1')->assertUnauthorized();
    }
}
