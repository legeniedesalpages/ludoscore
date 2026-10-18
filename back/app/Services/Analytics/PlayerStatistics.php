<?php

namespace App\Services\Analytics;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PlayerStatistics
{
    public function __construct(private GameStatistics $games)
    {
    }

    public function rows(?int $playerId = null): Collection
    {
        $query = app(\App\Services\PlayerAccess::class)->scopeMatches(DB::table('matches as m'), 'm.id');
        return $query
            ->join('teams as t', 't.match_id', '=', 'm.id')
            ->join('team_players as tp', 'tp.team_id', '=', 't.id')
            ->join('games as g', 'g.id', '=', 'm.game_id')
            ->where('m.canceled', false)->where('m.running', false)
            ->when($playerId !== null, fn($q) => $q->where('tp.player_id', $playerId))
            ->select('m.*', 'tp.player_id', 't.id as team_id', 'g.title as game_title')
            ->orderBy('m.started_at')->orderBy('m.id')->get();
    }

    public function summary(Collection $rows): array
    {
        $matches = $rows->unique('id');
        $decided = $matches->whereNotNull('winner_team_id')->count();
        $wins = $matches->filter(fn($m) => $m->winner_team_id !== null && (int) $m->winner_team_id === (int) $m->team_id)->count();
        return $this->games->summary($matches) + [
            'wins' => $wins, 'decidedMatches' => $decided,
            'winRate' => $decided ? round(100 * $wins / $decided, 1) : null,
            'gamesPlayed' => $matches->pluck('game_id')->unique()->count(),
        ];
    }

    public function detail(object $player, Collection $rows): array
    {
        $matches = $rows->unique('id')->values();
        $activity = $this->games->activity($matches, (int) $player->id);
        $summary = $this->summary($rows);
        $activity['charts'][0] = [
            'title' => 'Résultats des parties', 'type' => 'pie', 'columns' => ['Résultat', 'Parties'],
            'rows' => [
                ['Victoires', $summary['wins']],
                ['Défaites', $summary['decidedMatches'] - $summary['wins']],
                ['Sans vainqueur renseigné', $summary['matches'] - $summary['decidedMatches']],
            ],
            'comment' => 'Une victoire pour chaque membre de l’équipe gagnante. Les parties sans vainqueur ne comptent pas dans le taux de victoire.',
        ];
        $activity['charts'][] = [
            'title' => 'Jeux les plus joués', 'type' => 'bar', 'columns' => ['Jeu', 'Parties'],
            'rows' => $matches->groupBy('game_id')->sortByDesc(fn($items) => $items->count())
                ->map(fn($items) => [$items->first()->game_title, $items->count()])->values()->all(),
        ];
        return $summary + $activity + ['id' => (int) $player->id, 'name' => $player->pseudo ?: 'Joueur ' . $player->id, 'creatorPseudo' => $player->creator_pseudo ?? null];
    }
}
