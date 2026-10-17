<?php

namespace App\Services\Analytics;

use Illuminate\Support\Collection;

class ParticipationStatistics
{
    public static function tags($json): array
    {
        $tags = is_string($json) ? json_decode($json, true) : $json;
        if (!is_array($tags)) {
            return [];
        }
        $labels = [];
        foreach ($tags as $tag) {
            foreach ((array) ($tag['names'] ?? []) as $name) {
                $labels[] = trim(($tag['category'] ?? '') . ': ' . $name, ': ');
            }
        }
        return array_values(array_unique($labels));
    }

    public function charts(Collection $matches, Collection $participants, ?int $playerId = null): array
    {
        $byMatch = $matches->keyBy('id');
        $teams = $participants
            ->when($playerId !== null, fn($rows) => $rows->where('player_id', $playerId))
            ->unique('team_id');
        $dimensions = [
            'color' => ['Couleurs jouées', 'Couleur'],
            'position' => ['Places dans l’ordre de jeu', 'Place'],
            'match_tags' => ['Tags de jeux / parties', 'Tag de partie'],
            'team_tags' => ['Tags des joueurs / équipes', 'Tag de joueur'],
        ];
        $charts = [];
        foreach ($dimensions as $dimension => [$title, $column]) {
            $groups = [];
            foreach ($teams as $team) {
                $match = $byMatch->get($team->match_id);
                $labels = match ($dimension) {
                    'color' => $team->color && $team->color !== 'Aucune' ? [$team->color] : [],
                    'position' => $team->position !== null ? [(string) ((int) $team->position + 1)] : [],
                    'match_tags' => self::tags($match->tags),
                    'team_tags' => self::tags($team->tags),
                };
                foreach ($labels as $label) {
                    // A team is counted once even when it has several players.
                    $groups[$label][$team->team_id] = [
                        'decided' => $match->winner_team_id !== null,
                        'won' => $match->winner_team_id !== null && (int) $match->winner_team_id === (int) $team->team_id,
                    ];
                }
            }
            uksort($groups, 'strnatcasecmp');
            $rows = [];
            foreach ($groups as $label => $items) {
                $wins = count(array_filter($items, fn($item) => $item['won']));
                $decided = count(array_filter($items, fn($item) => $item['decided']));
                $rows[] = [(string) $label, count($items), $wins, $decided, $decided ? round(100 * $wins / $decided, 1) : null];
            }
            $comment = 'Une participation par équipe et par partie (ou par partie du joueur sur sa fiche). '
                . 'Taux calculé uniquement sur les parties avec un vainqueur. Moins de 3 parties : simple tendance. '
                . 'Les valeurs non renseignées sont exclues.';
            if (str_contains($dimension, 'tags')) {
                $comment .= ' Seuls les tags sélectionnés pendant la partie sont analysés ; une partie peut avoir plusieurs tags.';
            }
            $charts[] = [
                'title' => $title, 'type' => 'bar', 'columns' => [$column, 'Participations', 'Victoires'],
                'rows' => array_map(fn($row) => array_slice($row, 0, 3), $rows), 'comment' => $comment,
            ];
            $charts[] = [
                'title' => $title . ' : taux de victoire', 'type' => 'table',
                'columns' => [$column, 'Participations', 'Victoires', 'Avec vainqueur', 'Taux de victoire (%)'],
                'rows' => $rows, 'comment' => $comment,
            ];
        }
        return $charts;
    }
}
