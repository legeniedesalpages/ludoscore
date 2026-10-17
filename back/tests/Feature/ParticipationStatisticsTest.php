<?php

namespace Tests\Feature;

use App\Services\Analytics\ParticipationStatistics;
use Tests\TestCase;

class ParticipationStatisticsTest extends TestCase
{
    private function fixtures(): array
    {
        $tags = json_encode([['category' => 'Mode', 'names' => ['Expert', 'Expert']], ['category' => 'Carte', 'names' => ['Expert']]]);
        $matches = collect([
            (object) ['id' => 1, 'winner_team_id' => 10, 'tags' => $tags],
            (object) ['id' => 2, 'winner_team_id' => 20, 'tags' => $tags],
            (object) ['id' => 3, 'winner_team_id' => null, 'tags' => null],
        ]);
        $team = fn($match, $id, $player, $color, $position) => (object) [
            'match_id' => $match, 'team_id' => $id, 'player_id' => $player,
            'color' => $color, 'position' => $position, 'tags' => $tags,
        ];
        return [$matches, collect([
            $team(1, 10, 1, 'Rouge', 0), $team(1, 10, 2, 'Rouge', 0),
            $team(1, 11, 3, 'Bleu', 1),
            $team(2, 20, 3, 'Bleu', 0), $team(2, 21, 1, 'Rouge', 1),
            $team(3, 30, 1, 'Aucune', null),
        ])];
    }

    public function test_game_dimensions_count_teams_once_and_do_not_merge_tag_categories(): void
    {
        [$matches, $teams] = $this->fixtures();
        $charts = app(ParticipationStatistics::class)->charts($matches, $teams);
        $this->assertSame([['Bleu', 2, 1, 2, 50.0], ['Rouge', 2, 1, 2, 50.0]], $charts[1]['rows']);
        $this->assertSame([['1', 2, 2, 2, 100.0], ['2', 2, 0, 2, 0.0]], $charts[3]['rows']);
        $this->assertSame([['Carte: Expert', 4, 2, 4, 50.0], ['Mode: Expert', 4, 2, 4, 50.0]], $charts[5]['rows']);
        $this->assertSame([['Carte: Expert', 5, 2, 4, 50.0], ['Mode: Expert', 5, 2, 4, 50.0]], $charts[7]['rows']);
    }

    public function test_player_dimensions_are_scoped_and_undecided_matches_do_not_lower_the_win_rate(): void
    {
        [$matches, $teams] = $this->fixtures();
        $charts = app(ParticipationStatistics::class)->charts($matches, $teams, 1);
        $this->assertSame([['Rouge', 2, 1, 2, 50.0]], $charts[1]['rows']);
        $this->assertSame([['1', 1, 1, 1, 100.0], ['2', 1, 0, 1, 0.0]], $charts[3]['rows']);
        $this->assertSame([['Carte: Expert', 3, 1, 2, 50.0], ['Mode: Expert', 3, 1, 2, 50.0]], $charts[7]['rows']);
        $unknown = app(ParticipationStatistics::class)->charts($matches->where('id', 3), $teams->where('match_id', 3), 1);
        $this->assertSame([], $unknown[1]['rows']);
        $this->assertSame([], $unknown[3]['rows']);
        $this->assertNull($unknown[7]['rows'][0][4]);
    }

    public function test_tags_accept_arrays_or_json_and_ignore_absent_data(): void
    {
        $this->assertSame(['Mode: Expert'], ParticipationStatistics::tags([['category' => 'Mode', 'names' => ['Expert', 'Expert']]]));
        $this->assertSame([], ParticipationStatistics::tags(null));
        $this->assertSame([], ParticipationStatistics::tags('null'));
        $this->assertSame([], ParticipationStatistics::tags('invalid'));
    }
}
