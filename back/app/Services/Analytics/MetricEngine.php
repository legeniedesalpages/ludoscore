<?php

namespace App\Services\Analytics;

use Illuminate\Support\Collection;

/**
 * Exécute des "spécifications" de requêtes proposées par l'IA sur la vue analytique.
 * L'IA choisit quoi calculer (dimension x mesure), ce moteur calcule : aucun SQL libre, aucun chiffre inventé.
 */
class MetricEngine
{
    public const MIN_SAMPLE = 3;

    public const DIMENSIONS = [
        'weekday' => 'jour de la semaine',
        'day_part' => 'moment de la journée (matin, après-midi, soirée, nuit)',
        'hour' => 'heure de début',
        'month' => 'mois (AAAA-MM)',
        'color' => 'couleur jouée',
        'turn_order' => "ordre dans le tour (1 = premier à jouer)",
        'game' => 'jeu',
        'player' => 'joueur',
        'players_count' => 'nombre de joueurs dans la partie',
        'match_tag' => 'tags de la partie (catégorie: valeur)',
        'player_tag' => 'tags du joueur / de son équipe (catégorie: valeur)',
        'gap_game' => 'jours écoulés depuis la partie précédente du même jeu',
        'gap_player' => 'jours écoulés depuis la partie précédente du joueur (régularité)',
        'duration_bucket' => 'durée de la partie',
        'coop' => 'jeu coopératif ou compétitif',
        'place' => 'lieu de la partie (domicile ou en déplacement)',
    ];

    public const MEASURES = [
        'matches' => 'nombre de parties',
        'wins' => 'nombre de victoires',
        'win_rate' => 'taux de victoire en % (sur les parties avec un vainqueur)',
        'avg_score' => 'score moyen',
        'avg_duration' => 'durée moyenne en minutes',
        'total_duration' => 'temps de jeu total en minutes',
    ];

    public function __construct(private Collection $rows)
    {
    }

    /**
     * @param array{measure?:string,dimension?:string,filters?:array,limit?:int} $spec
     * @return array{measure:string,dimension:string,filters:array,rows:array,reliable:int}|null
     */
    public function run(array $spec, array $scope = []): ?array
    {
        $measure = $spec['measure'] ?? null;
        $dimension = $spec['dimension'] ?? null;
        if (!isset(self::MEASURES[$measure]) || !isset(self::DIMENSIONS[$dimension])) {
            return null;
        }

        // Le périmètre (joueur ou jeu concerné) est imposé par le serveur, jamais par l'IA.
        $filters = array_merge(array_intersect_key((array) ($spec['filters'] ?? []), ['player_id' => 1, 'game_id' => 1]), $scope);
        $rows = $this->rows;
        if (isset($filters['player_id'])) {
            $rows = $rows->where('player_id', (int) $filters['player_id']);
        }
        if (isset($filters['game_id'])) {
            $rows = $rows->where('game_id', (int) $filters['game_id']);
        }

        $groups = [];
        foreach ($rows as $row) {
            foreach ($this->keys($dimension, $row) as $key) {
                $groups[$key][] = $row;
            }
        }

        $result = [];
        foreach ($groups as $label => $items) {
            $matchCount = count(array_unique(array_column($items, 'match_id')));
            $value = $this->measure($measure, $items);
            if ($value === null) {
                continue;
            }
            $result[] = ['label' => (string) $label, 'value' => $value, 'n' => $matchCount];
        }

        $this->sort($dimension, $result);
        $limit = max(1, min(30, (int) ($spec['limit'] ?? 15)));

        return [
            'measure' => $measure,
            'dimension' => $dimension,
            'filters' => $filters,
            'rows' => array_slice($result, 0, $limit),
            'reliable' => count(array_filter($result, fn($r) => $r['n'] >= self::MIN_SAMPLE)),
        ];
    }

    private function keys(string $dimension, array $row): array
    {
        return match ($dimension) {
            'weekday' => [$row['weekday']],
            'day_part' => [match (true) {
                $row['hour'] >= 6 && $row['hour'] < 12 => 'matin',
                $row['hour'] >= 12 && $row['hour'] < 18 => 'après-midi',
                $row['hour'] >= 18 => 'soirée',
                default => 'nuit',
            }],
            'hour' => [sprintf('%02dh', $row['hour'])],
            'month' => [$row['month']],
            'color' => $row['color'] ? [$row['color']] : [],
            'turn_order' => [(string) $row['turn_order']],
            'game' => [$row['game']],
            'player' => [MatchDataset::label($row['player_id'])],
            'players_count' => [$row['players_count'] . ' joueurs'],
            'match_tag' => $row['match_tags'],
            'player_tag' => $row['team_tags'],
            'gap_game' => [$this->gapBucket($row['gap_game_days'])],
            'gap_player' => [$this->gapBucket($row['gap_player_days'])],
            'duration_bucket' => $row['duration'] === null ? [] : [match (true) {
                $row['duration'] < 30 => '< 30 min',
                $row['duration'] < 60 => '30-60 min',
                $row['duration'] < 120 => '1-2 h',
                default => '> 2 h',
            }],
            'coop' => [$row['coop'] ? 'coopératif' : 'compétitif'],
            'place' => [$row['place']],
        };
    }

    private function gapBucket(?int $days): string
    {
        return match (true) {
            $days === null => 'première fois',
            $days < 1 => 'même jour',
            $days <= 3 => '1-3 jours',
            $days <= 7 => '4-7 jours',
            $days <= 30 => '8-30 jours',
            default => '> 30 jours',
        };
    }

    private function measure(string $measure, array $items): int|float|null
    {
        switch ($measure) {
            case 'matches':
                return count(array_unique(array_column($items, 'match_id')));
            case 'wins':
                return count(array_filter($items, fn($r) => $r['won']));
            case 'win_rate':
                $decided = array_filter($items, fn($r) => $r['has_winner']);
                return $decided ? round(100 * count(array_filter($decided, fn($r) => $r['won'])) / count($decided), 1) : null;
            case 'avg_score':
                $scores = array_filter(array_column($items, 'score'), fn($s) => $s !== null);
                return $scores ? round(array_sum($scores) / count($scores), 1) : null;
            case 'avg_duration':
            case 'total_duration':
                $byMatch = [];
                foreach ($items as $r) {
                    if ($r['duration'] !== null) {
                        $byMatch[$r['match_id']] = $r['duration'];
                    }
                }
                if (!$byMatch) {
                    return null;
                }
                return $measure === 'avg_duration' ? (int) round(array_sum($byMatch) / count($byMatch)) : (int) array_sum($byMatch);
        }

        return null;
    }

    private function sort(string $dimension, array &$result): void
    {
        $order = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        if (in_array($dimension, ['month', 'hour', 'turn_order'])) {
            usort($result, fn($a, $b) => strnatcmp($a['label'], $b['label']));
        } elseif ($dimension === 'weekday') {
            usort($result, fn($a, $b) => array_search($a['label'], $order) <=> array_search($b['label'], $order));
        } else {
            usort($result, fn($a, $b) => $b['value'] <=> $a['value']);
        }
    }
}
