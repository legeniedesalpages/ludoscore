<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Game;
use App\Models\User;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class MatchExpansions
{
    /**
     * @param  array<mixed>  $ids
     * @return list<int>
     */
    public function validatedIds(Game $baseGame, array $ids): array
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));
        if ($ids === []) {
            return [];
        }
        $linked = $baseGame->expansions()->whereIn('games.id', $ids)->where('games.is_expansion', true)->count();
        if ($linked !== count($ids)) {
            throw ValidationException::withMessages([
                'match.expansionIds' => "Certaines extensions ne correspondent pas au jeu « {$baseGame->title} ».",
            ]);
        }

        return $ids;
    }

    /**
     * Expansions of the most recent match of this game: matches of the user's own player first,
     * otherwise the most recent match visible to the user.
     *
     * @return array{hasPreviousMatch: bool, expansionIds: list<int>}
     */
    public function lastUsed(User $user, Game $baseGame): array
    {
        $matches = fn (): Builder => DB::table('matches')->where('matches.game_id', $baseGame->id)
            ->orderByDesc('matches.started_at')->orderByDesc('matches.id');
        $matchId = null;
        if ($user->player_id !== null) {
            $matchId = $matches()->whereExists(fn (Builder $participants) => $participants->selectRaw('1')
                ->from('teams')->join('team_players', 'team_players.team_id', '=', 'teams.id')
                ->whereColumn('teams.match_id', 'matches.id')->where('team_players.player_id', $user->player_id))
                ->value('matches.id');
        }
        $matchId ??= app(PlayerAccess::class)->scopeMatches($matches(), 'matches.id', $user)->value('matches.id');
        if ($matchId === null) {
            return ['hasPreviousMatch' => false, 'expansionIds' => []];
        }

        $ids = $baseGame->expansions()
            ->whereIn('games.id', DB::table('match_expansions')->where('match_id', $matchId)->select('game_id'))
            ->orderBy('games.title')->pluck('games.id')->map(fn ($id): int => (int) $id)->values()->all();

        return ['hasPreviousMatch' => true, 'expansionIds' => $ids];
    }

    /**
     * @param  list<int>  $matchIds
     * @return Collection<int|string, Collection<int, array<string, mixed>>>
     */
    public function byMatch(array $matchIds, bool $withRules = false): Collection
    {
        if ($matchIds === []) {
            return collect();
        }

        return DB::table('match_expansions')->join('games', 'games.id', '=', 'match_expansions.game_id')
            ->whereIn('match_expansions.match_id', $matchIds)->orderBy('games.title')
            ->get(['match_expansions.match_id', 'games.*'])
            ->groupBy('match_id')
            ->map(fn (Collection $expansions): Collection => $expansions->map(
                fn (object $game): array => $this->present($game, $withRules)
            )->values());
    }

    /** @return array<string, mixed> */
    private function present(object $game, bool $withRules): array
    {
        $summary = [
            'id' => (int) $game->id,
            'title' => $game->title,
            'bggId' => (int) $game->bgg_id,
            'thumbnailId' => $game->thumbnail_id,
            'imageId' => $game->image_id,
        ];
        if (! $withRules) {
            return $summary;
        }

        $json = fn (?string $value): array => $value ? (json_decode($value, true) ?? []) : [];

        return $summary + [
            'additionalPlayers' => (int) ($game->additional_players ?? 0),
            'matchTags' => $json($game->match_tags),
            'playerTags' => $json($game->player_tags),
            'playerColors' => $json($game->player_colors),
            'scoreTags' => $json($game->score_template),
            'expansionTagChanges' => $json($game->expansion_tag_changes),
            'expansionScoreChanges' => $json($game->expansion_score_changes),
        ];
    }
}
