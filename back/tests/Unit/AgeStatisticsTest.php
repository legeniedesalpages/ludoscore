<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\Analytics\AgeStatistics;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class AgeStatisticsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Auth::shouldReceive('user')->andReturn(new User(['is_admin' => true]));
    }

    private function charts(array $participants, ?int $playerId = null, ?int $winner = 10, ?string $start = '2026-06-15 12:00:00'): array
    {
        $matches = collect([(object) ['id' => 1, 'started_at' => $start, 'winner_team_id' => $winner]]);
        $players = collect($participants)->map(fn ($p) => (object) ($p + ['match_id' => 1, 'is_cooperative' => false]));

        return (new AgeStatistics)->charts($matches, $players, $playerId);
    }

    public function test_exact_age_uses_the_match_date_and_birthday_and_counts_extremes_only(): void
    {
        $players = [
            ['player_id' => 1, 'team_id' => 10, 'birth_date' => '2006-06-16'],
            ['player_id' => 2, 'team_id' => 20, 'birth_date' => '1996-06-15'],
            ['player_id' => 3, 'team_id' => 30, 'birth_date' => '2001-01-01'],
        ];
        $charts = $this->charts($players);
        $this->assertSame([['10–19 ans', 1], ['20–29 ans', 1], ['30–39 ans', 1]], $charts[0]['rows']);
        $this->assertSame([
            ['Plus jeunes', 1, 1, 1, 1, 1, 100.0], ['Plus âgés', 1, 1, 1, 0, 1, 0.0],
        ], $charts[1]['rows']);
        $scoped = $this->charts($players, 2);
        $this->assertSame([['30–39 ans', 1]], $scoped[0]['rows']);
        $this->assertSame([['Plus âgés', 1, 1, 1, 0, 1, 0.0]], $scoped[1]['rows']);
    }

    public function test_year_only_uncertainty_must_guarantee_a_ten_year_gap(): void
    {
        $players = [
            ['player_id' => 1, 'team_id' => 10, 'birth_year' => 2000],
            ['player_id' => 2, 'team_id' => 20, 'birth_year' => 1990],
        ];
        $charts = $this->charts($players);
        $this->assertSame([], $charts[1]['rows']);
        $this->assertStringContainsString('2 participation(s) avec âge approximatif', $charts[0]['comment']);
        $players[1]['birth_year'] = 1989;
        $this->assertCount(2, $this->charts($players)[1]['rows']);
    }

    public function test_exact_ten_year_boundary_qualifies_but_nine_does_not(): void
    {
        $players = [
            ['player_id' => 1, 'team_id' => 10, 'birth_date' => '2000-06-15'],
            ['player_id' => 2, 'team_id' => 20, 'birth_date' => '1990-06-15'],
        ];
        $this->assertCount(2, $this->charts($players)[1]['rows']);
        $players[1]['birth_date'] = '1990-06-16';
        $this->assertSame([], $this->charts($players)[1]['rows']);
    }

    public function test_unknown_future_birth_and_missing_start_are_excluded_not_treated_as_zero(): void
    {
        foreach ([[], ['birth_date' => '2026-06-16'], ['birth_year' => 2027]] as $birth) {
            $charts = $this->charts([['player_id' => 1, 'team_id' => 10] + $birth]);
            $this->assertSame([], $charts[0]['rows']);
            $this->assertStringContainsString('1 sans âge disponible', $charts[0]['comment']);
        }
        $charts = $this->charts([['player_id' => 1, 'team_id' => 10, 'birth_year' => 2000]], start: null);
        $this->assertSame([], $charts[0]['rows']);
    }

    public function test_same_team_cooperative_and_incomplete_age_coverage_do_not_compare(): void
    {
        $young = ['player_id' => 1, 'team_id' => 10, 'birth_year' => 2000];
        $old = ['player_id' => 2, 'team_id' => 20, 'birth_year' => 1980];
        $this->assertSame([], $this->charts([$young, array_replace($old, ['team_id' => 10])])[1]['rows']);
        $this->assertSame([], $this->charts([$young, $old + ['is_cooperative' => true]])[1]['rows']);
        $this->assertSame([], $this->charts([$young, $old, ['player_id' => 3, 'team_id' => 30]])[1]['rows']);
    }

    public function test_duplicates_do_not_inflate_participations_and_unknown_winner_has_no_win_rate(): void
    {
        $young = ['player_id' => 1, 'team_id' => 10, 'birth_year' => 2000];
        $old = ['player_id' => 2, 'team_id' => 20, 'birth_year' => 1980];
        $charts = $this->charts([$young, $young, $old], winner: null);
        $this->assertSame([['20–29 ans', 1], ['40–49 ans', 1]], $charts[0]['rows']);
        $this->assertSame([
            ['Plus jeunes', 1, 1, 1, 0, 0, null], ['Plus âgés', 1, 1, 1, 0, 0, null],
        ], $charts[1]['rows']);
    }

    public function test_repeated_players_count_once_but_each_match_and_participation_is_counted(): void
    {
        $matches = collect();
        $players = collect();
        foreach ([1, 2, 3] as $id) {
            $matches->push((object) ['id' => $id, 'started_at' => '2026-06-15', 'winner_team_id' => $id === 3 ? 20 : 10]);
            $players->push((object) ['match_id' => $id, 'player_id' => 1, 'team_id' => 10, 'birth_year' => 2000]);
            $players->push((object) ['match_id' => $id, 'player_id' => 2, 'team_id' => 20, 'birth_year' => 1980]);
        }
        $charts = (new AgeStatistics)->charts($matches, $players);
        $this->assertSame([
            ['Plus jeunes', 1, 3, 3, 2, 3, 66.7], ['Plus âgés', 1, 3, 3, 1, 3, 33.3],
        ], $charts[1]['rows']);
    }
}
