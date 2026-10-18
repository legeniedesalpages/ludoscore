<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Analytics\PlayerStatistics;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class PlayerStatisticsTest extends TestCase
{
    private function row(int $id, int $player, int $team, ?int $winner, ?string $start, ?string $finish): object
    {
        return (object) [
            'id' => $id, 'game_id' => 7, 'game_title' => 'Test', 'player_id' => $player,
            'team_id' => $team, 'winner_team_id' => $winner, 'started_at' => $start,
            'finished_at' => $finish, 'tags' => null,
        ];
    }

    private function mockRows(array $rows, ?int $id = null): void
    {
        $query = Mockery::mock(Builder::class);
        DB::shouldReceive('table')->with('matches as m')->once()->andReturn($query);
        $query->shouldReceive('join', 'select', 'orderBy')->andReturnSelf();
        $query->shouldReceive('where')->with('m.canceled', false)->once()->andReturnSelf();
        $query->shouldReceive('where')->with('m.running', false)->once()->andReturnSelf();
        $query->shouldReceive('when')->once()->andReturnUsing(function ($condition, $callback) use ($query, $id) {
            $this->assertSame($id !== null, $condition);
            if ($condition) $callback($query);
            return $query;
        });
        if ($id !== null) {
            $query->shouldReceive('where')->with('tp.player_id', $id)->once()->andReturnSelf();
        }
        $query->shouldReceive('get')->once()->andReturn(collect($rows));
    }

    public function test_directory_includes_inactive_players_and_counts_global_time_once(): void
    {
        Sanctum::actingAs(new User(['is_admin' => true]));
        $players = Mockery::mock(Builder::class);
        $players->shouldReceive('whereNull')->with('players.replaced_by_player_id')->once()->andReturnSelf();
        DB::shouldReceive('table')->with('players')->once()->andReturn($players);
        $players->shouldReceive('orderByDesc')->with('created_at')->once()->andReturnSelf();
        $players->shouldReceive('orderByDesc')->with('id')->once()->andReturnSelf();
        $players->shouldReceive('get')->once()->andReturn(collect([
            (object) ['id' => 3, 'pseudo' => 'Alice', 'created_at' => '2026-03-01'],
            (object) ['id' => 2, 'pseudo' => 'Alice', 'created_at' => '2026-02-01'],
            (object) ['id' => 1, 'pseudo' => 'Bob', 'created_at' => '2026-01-01'],
        ]));
        $this->mockRows([
            $this->row(1, 1, 10, 10, '2026-01-01 12:00:00', '2026-01-01 13:00:00'),
            $this->row(1, 2, 10, 10, '2026-01-01 12:00:00', '2026-01-01 13:00:00'),
        ]);
        $this->getJson('/api/statistics/player-directory')->assertOk()
            ->assertJsonPath('summary.totalPlayers', 3)->assertJsonPath('summary.activePlayers', 2)
            ->assertJsonPath('summary.matches', 1)->assertJsonPath('summary.totalPlayMinutes', 60)
            ->assertJsonPath('summary.averageDurationMinutes', 60)
            ->assertJsonPath('data.0.id', 2)->assertJsonPath('data.0.wins', 1)
            ->assertJsonPath('data.1.id', 1)->assertJsonPath('data.2.id', 3)
            ->assertJsonPath('data.2.matches', 0)->assertJsonPath('data.2.winRate', null);
    }

    public function test_detail_has_results_activity_and_player_scoped_dimensions(): void
    {
        Sanctum::actingAs(new User(['is_admin' => true]));
        $player = Mockery::mock(Builder::class);
        $player->shouldReceive('whereNull')->with('players.replaced_by_player_id')->once()->andReturnSelf();
        DB::shouldReceive('table')->with('players')->once()->andReturn($player);
        $player->shouldReceive('where')->with('id', 1)->once()->andReturnSelf();
        $player->shouldReceive('first')->once()->andReturn((object) ['id' => 1, 'pseudo' => 'Alice']);
        $this->mockRows([
            $this->row(1, 1, 10, 10, '2026-01-01 12:00:00', '2026-01-01 13:00:00'),
            $this->row(2, 1, 20, 21, '2026-01-02 12:00:00', '2026-01-02 12:30:00'),
            $this->row(3, 1, 30, null, null, null),
        ], 1);
        $participants = Mockery::mock(Builder::class);
        DB::shouldReceive('table')->with('teams as t')->once()->andReturn($participants);
        $participants->shouldReceive('leftJoin', 'select', 'whereIn')->andReturnSelf();
        $team = fn($match, $id, $player, $color) => (object) [
            'match_id' => $match, 'team_id' => $id, 'player_id' => $player,
            'name' => 'Équipe', 'pseudo' => 'Joueur', 'color' => $color, 'position' => 0, 'tags' => null,
        ];
        $participants->shouldReceive('get')->once()->andReturn(collect([
            $team(1, 10, 1, 'Rouge'), $team(1, 11, 2, 'Bleu'),
            $team(2, 20, 1, 'Rouge'), $team(2, 21, 2, 'Bleu'), $team(3, 30, 1, 'Aucune'),
        ]));
        $this->getJson('/api/statistics/players/1')->assertOk()
            ->assertJsonPath('id', 1)->assertJsonPath('name', 'Alice')
            ->assertJsonPath('matches', 3)->assertJsonPath('gamesPlayed', 1)
            ->assertJsonPath('wins', 1)->assertJsonPath('winRate', 50)
            ->assertJsonPath('totalPlayMinutes', 90)->assertJsonPath('averageDurationMinutes', 45)
            ->assertJsonPath('averageWaitDays', 1)
            ->assertJsonPath('charts.0.rows', [['Victoires', 1], ['Défaites', 1], ['Sans vainqueur renseigné', 1]])
            ->assertJsonPath('charts.3.rows', [['1', 1], ['2', 2]])
            ->assertJsonPath('charts.7.rows', [['Rouge', 2, 1, 2, 50]])
            ->assertJsonPath('charts.14.rows', [['Test', 3]]);
    }

    public function test_summary_deduplicates_matches_and_unknown_results_are_not_losses(): void
    {
        $row = $this->row(1, 1, 10, null, null, null);
        $summary = app(PlayerStatistics::class)->summary(collect([$row, $row]));
        $this->assertSame(1, $summary['matches']);
        $this->assertSame(0, $summary['wins']);
        $this->assertSame(0, $summary['decidedMatches']);
        $this->assertNull($summary['winRate']);
        $this->assertNull($summary['averageDurationMinutes']);
    }

    public function test_empty_directory_and_unknown_player(): void
    {
        Sanctum::actingAs(new User(['is_admin' => true]));
        $players = Mockery::mock(Builder::class);
        $players->shouldReceive('whereNull')->with('players.replaced_by_player_id')->twice()->andReturnSelf();
        DB::shouldReceive('table')->with('players')->twice()->andReturn($players);
        $players->shouldReceive('orderByDesc')->andReturnSelf();
        $players->shouldReceive('get')->once()->andReturn(collect());
        $players->shouldReceive('where')->with('id', 999)->once()->andReturnSelf();
        $players->shouldReceive('first')->once()->andReturnNull();
        $this->mockRows([]);
        $this->getJson('/api/statistics/player-directory')->assertOk()
            ->assertJsonPath('summary.totalPlayers', 0)->assertJsonPath('summary.activePlayers', 0)
            ->assertJsonPath('summary.averageDurationMinutes', null)->assertJsonPath('data', []);
        $this->getJson('/api/statistics/players/999')->assertNotFound();
    }

    public function test_routes_require_authentication(): void
    {
        $this->getJson('/api/statistics/player-directory')->assertUnauthorized();
        $this->getJson('/api/statistics/players/1')->assertUnauthorized();
    }
}
