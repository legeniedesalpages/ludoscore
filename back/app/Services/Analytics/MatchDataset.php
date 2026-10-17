<?php

namespace App\Services\Analytics;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Vue analytique à plat : une ligne par joueur et par partie terminée.
 * MySQL 5.7 n'a pas de fonctions de fenêtrage, les écarts entre parties sont donc calculés ici.
 */
class MatchDataset
{
    private const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

    /** Étiquette anonyme transmise à l'IA à la place du pseudo. */
    public static function label(int $playerId): string
    {
        return 'J' . $playerId;
    }

    public function rows(?Carbon $from = null, ?Carbon $to = null): Collection
    {
        $raw = DB::table('team_players as tp')
            ->join('teams as t', 't.id', '=', 'tp.team_id')
            ->join('matches as m', 'm.id', '=', 't.match_id')
            ->join('games as g', 'g.id', '=', 'm.game_id')
            ->where('m.canceled', false)
            ->where('m.running', false)
            ->whereNotNull('m.started_at')
            ->select(
                'm.id as match_id', 'm.game_id', 'g.title as game', 'g.is_only_cooperative as coop',
                'm.started_at', 'm.finished_at', 'm.winner_team_id', 'm.tags as match_tags',
                'm.latitude', 'm.longitude', 'm.location_name',
                't.id as team_id', 't.color', 't.position', 't.score', 't.tags as team_tags',
                'tp.player_id'
            )
            ->orderBy('m.started_at')
            ->orderBy('m.id')
            ->get();

        $playersPerMatch = $raw->groupBy('match_id')->map(fn($g) => $g->pluck('player_id')->unique()->count());
        $teamSize = $raw->groupBy('team_id')->map->count();

        $home = LocationService::home();
        $awayKm = (float) config('services.newsletter.away_km');

        $rows = $raw->map(function ($r) use ($playersPerMatch, $teamSize, $home, $awayKm) {
            $start = Carbon::parse($r->started_at);
            // Sans position enregistrée (anciennes parties, géolocalisation refusée), on suppose le lieu de référence.
            $hasLocation = $r->latitude !== null && $r->longitude !== null;
            $distance = $hasLocation ? LocationService::distanceKm($home['lat'], $home['lon'], (float) $r->latitude, (float) $r->longitude) : 0.0;
            $away = $distance > $awayKm;
            $duration = $r->finished_at ? $start->diffInMinutes(Carbon::parse($r->finished_at)) : null;

            return [
                'match_id' => (int) $r->match_id,
                'game_id' => (int) $r->game_id,
                'game' => $r->game,
                'coop' => (bool) $r->coop,
                'player_id' => (int) $r->player_id,
                'started_at' => $start,
                'duration' => $duration && $duration > 0 && $duration < 24 * 60 ? $duration : null,
                'weekday' => self::WEEKDAYS[$start->dayOfWeek],
                'hour' => $start->hour,
                'month' => $start->format('Y-m'),
                'color' => $r->color && $r->color !== 'Aucune' ? $r->color : null,
                'turn_order' => (int) $r->position + 1,
                'score' => $r->score,
                'won' => $r->winner_team_id !== null && (int) $r->winner_team_id === (int) $r->team_id,
                'has_winner' => $r->winner_team_id !== null,
                'team_size' => $teamSize[$r->team_id] ?? 1,
                'players_count' => $playersPerMatch[$r->match_id] ?? 1,
                'lat' => $hasLocation ? (float) $r->latitude : $home['lat'],
                'lon' => $hasLocation ? (float) $r->longitude : $home['lon'],
                'away' => $away,
                'distance_km' => (int) round($distance),
                'place' => $away ? ($r->location_name ?: 'lieu inconnu') : $home['name'],
                'match_tags' => $this->flattenTags($r->match_tags),
                'team_tags' => $this->flattenTags($r->team_tags),
            ];
        });

        return $this->withGaps($rows)
            ->filter(fn($r) => (!$from || $r['started_at'] >= $from) && (!$to || $r['started_at'] <= $to))
            ->values();
    }

    /** Ajoute le nombre de jours depuis la partie précédente du même jeu / du même joueur. */
    private function withGaps(Collection $rows): Collection
    {
        $lastByGame = [];
        $lastByPlayer = [];
        $out = collect();

        foreach ($rows->groupBy('match_id') as $group) {
            $at = $group->first()['started_at'];
            $gameId = $group->first()['game_id'];
            $gapGame = isset($lastByGame[$gameId]) ? $lastByGame[$gameId]->diffInDays($at) : null;

            foreach ($group as $row) {
                $last = $lastByPlayer[$row['player_id']] ?? null;
                $row['gap_game_days'] = $gapGame;
                $row['gap_player_days'] = $last ? $last->diffInDays($at) : null;
                $out->push($row);
            }

            $lastByGame[$gameId] = $at;
            foreach ($group as $row) {
                $lastByPlayer[$row['player_id']] = $at;
            }
        }

        return $out;
    }

    private function flattenTags($json): array
    {
        $tags = is_string($json) ? json_decode($json, true) : $json;
        if (!is_array($tags)) {
            return [];
        }

        $flat = [];
        foreach ($tags as $tag) {
            foreach ((array) ($tag['names'] ?? []) as $name) {
                $flat[] = trim(($tag['category'] ?? '') . ': ' . $name, ': ');
            }
        }

        return $flat;
    }
}
