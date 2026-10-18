<?php

namespace App\Services\Analytics;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class GameStatistics
{
    public function matches(?int $gameId = null): Collection
    {
        $query = app(\App\Services\PlayerAccess::class)->scopeMatches(DB::table('matches'));
        return $query
            ->where('canceled', false)->where('running', false)
            ->when($gameId !== null, fn($q) => $q->where('game_id', $gameId))
            ->orderBy('started_at')->orderBy('id')->get();
    }

    public function summary(Collection $matches): array
    {
        $durations = $matches->map(fn($m) => $this->duration($m))->filter(fn($d) => $d !== null)->values();
        return [
            'matches' => $matches->count(),
            'totalPlayMinutes' => (int) round($durations->sum()),
            'averageDurationMinutes' => $durations->isEmpty() ? null : (int) round($durations->avg()),
            'minDurationMinutes' => $durations->isEmpty() ? null : (int) round($durations->min()),
            'maxDurationMinutes' => $durations->isEmpty() ? null : (int) round($durations->max()),
            'measuredMatches' => $durations->count(),
        ];
    }

    public function detail(object $game, Collection $matches): array
    {
        return $this->activity($matches) + ['id' => (int) $game->id, 'title' => $game->title];
    }

    public function activity(Collection $matches, ?int $playerId = null): array
    {
        $participants = DB::table('teams as t')
            ->leftJoin('team_players as tp', 'tp.team_id', '=', 't.id')
            ->leftJoin('players as p', 'p.id', '=', 'tp.player_id')
            ->whereIn('t.match_id', $matches->pluck('id'))
            ->select('t.match_id', 't.id as team_id', 't.name', 't.color', 't.position', 't.tags', 'tp.player_id', 'p.pseudo')
            ->get();
        $participants = app(\App\Services\PlayerNames::class)->present($participants, 'player_id')->groupBy('match_id');
        $winners = [];
        $playerCounts = [];
        $weekdays = array_fill_keys(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'], 0);
        $hours = array_fill(0, 24, 0);
        $months = [];
        $durations = [];
        $gaps = [];
        $previous = null;
        foreach ($matches as $match) {
            $players = $participants->get($match->id, collect());
            $count = $players->pluck('player_id')->filter(fn($id) => $id !== null)->unique()->count();
            $label = $count ? (string) $count : 'Non renseigné';
            $playerCounts[$label] = ($playerCounts[$label] ?? 0) + 1;
            $winningPlayers = $players->where('team_id', $match->winner_team_id)
                ->filter(fn($p) => $p->player_id !== null)->unique('player_id');
            if ($match->winner_team_id !== null && $winningPlayers->isNotEmpty()) {
                foreach ($winningPlayers as $player) {
                    $key = 'player-' . $player->player_id;
                    $winners[$key] ??= ['label' => $player->pseudo ?: 'Joueur ' . $player->player_id, 'value' => 0];
                    $winners[$key]['value']++;
                }
            } else {
                $team = $players->firstWhere('team_id', $match->winner_team_id);
                $key = $match->winner_team_id === null ? 'none' : 'team-' . $match->winner_team_id;
                $winners[$key] ??= ['label' => $team?->name ?: 'Sans vainqueur renseigné', 'value' => 0];
                $winners[$key]['value']++;
            }
            if (!$match->started_at) {
                continue;
            }
            $start = Carbon::parse($match->started_at);
            $days = array_keys($weekdays);
            $weekdays[$days[$start->isoWeekday() - 1]]++;
            $hours[$start->hour]++;
            $month = $start->format('Y-m');
            $months[$month] = ($months[$month] ?? 0) + 1;
            if ($previous) {
                $gaps[] = $previous->diffInSeconds($start) / 86400;
            }
            $previous = $start;
            $duration = $this->duration($match);
            if ($duration !== null) {
                $durations[] = [$start->format('Y-m-d H:i'), round($duration, 1)];
            }
        }
        if ($months) {
            $month = Carbon::parse(array_key_first($months) . '-01');
            $last = Carbon::parse(array_key_last($months) . '-01');
            while ($month <= $last) {
                $months[$month->format('Y-m')] ??= 0;
                $month->addMonth();
            }
            ksort($months);
        }
        uksort($playerCounts, 'strnatcmp');
        usort($winners, fn($a, $b) => $b['value'] <=> $a['value']);
        $chart = fn($title, $type, $column, $values) => [
            'title' => $title, 'type' => $type, 'columns' => [$column, 'Parties'],
            'rows' => collect($values)->map(fn($value, $label) => [(string) $label, $value])->values()->all(),
        ];
        return $this->summary($matches) + [
            'averageWaitDays' => $gaps ? round(array_sum($gaps) / count($gaps), 1) : null,
            'charts' => array_merge([
                ['title' => 'Répartition des vainqueurs', 'type' => 'pie', 'columns' => ['Vainqueur', 'Victoires'],
                    'rows' => array_map(fn($w) => [$w['label'], $w['value']], array_values($winners)),
                    'comment' => 'Une victoire par membre de l’équipe gagnante. Les parties sans vainqueur sont indiquées séparément.'],
                $chart('Jours de jeu', 'bar', 'Jour', $weekdays),
                $chart('Heures de début', 'bar', 'Heure', array_combine(array_map(fn($h) => sprintf('%02dh', $h), range(0, 23)), $hours)),
                $chart('Nombre de joueurs', 'bar', 'Joueurs', $playerCounts),
                $chart('Parties par mois', 'line', 'Mois', $months),
                ['title' => 'Évolution des durées', 'type' => 'line', 'columns' => ['Début de partie', 'Minutes'], 'rows' => $durations],
            ], (new ParticipationStatistics())->charts($matches, $participants->collapse(), $playerId)),
        ];
    }

    private function duration(object $match): ?float
    {
        if (!$match->started_at || !$match->finished_at) {
            return null;
        }
        $minutes = (strtotime($match->finished_at) - strtotime($match->started_at)) / 60;
        return $minutes > 0 ? $minutes : null;
    }
}
