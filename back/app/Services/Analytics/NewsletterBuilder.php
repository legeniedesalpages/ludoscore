<?php

namespace App\Services\Analytics;

use App\Services\Ai\GeminiClient;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

/** Prépare le contenu de la newsletter hebdomadaire : faits réels + contexte externe + rédaction par IA. */
class NewsletterBuilder
{
    public function __construct(private GeminiClient $ai, private StatsAssistant $assistant, private LocationService $location)
    {
    }

    public function build(): array
    {
        $facts = $this->facts();
        $context = [
            'lune' => $this->moon(now()),
            'meteo' => $this->weather($facts['position_actuelle']),
            'actualites_locales' => $facts['news'],
            'calendrier' => $facts['calendar'],
        ];

        $prompt = "Voici les faits réels de la semaine écoulée, le contexte pour la semaine à venir et la liste des jeux de la ludothèque.\n"
            . json_encode(['lieu_de_reference' => LocationService::home()['name'], 'faits' => $facts['week'], 'les_annees_precedentes_a_cette_epoque' => $facts['past'], 'partie_au_hasard' => $facts['random'], 'contexte' => $context, 'ludotheque' => $facts['library']], JSON_UNESCAPED_UNICODE)
            . "\n\nRédige la newsletter. Format : {\"subject\":\"objet de l'e-mail accrocheur\","
            . "\"summary\":\"résumé de la semaine en 3 à 5 phrases\","
            . "\"suggestions\":[{\"game\":\"titre exact issu de la ludothèque\",\"reason\":\"pourquoi y jouer cette semaine (météo, lune, jeu délaissé...)\"}],"
            . "\"story\":[\"paragraphe 1\",\"paragraphe 2\",\"paragraphe 3\"],"
            . "\"throwback\":\"2 à 4 phrases sur ce qui s'est passé les années précédentes à la même époque, ou null s'il n'y a aucune donnée\","
            . "\"epic\":{\"title\":\"titre du récit\",\"tone\":\"ambiance choisie en quelques mots\",\"paragraphs\":[\"2 à 3 paragraphes\"]}}. "
            . "Donne 3 suggestions. L'histoire est une petite histoire drôle et chaleureuse de 2 à 3 paragraphes, qui s'appuie uniquement sur les faits fournis "
            . "(joueurs désignés par leur code J<id>) pour glisser des anecdotes ; n'invente aucun événement réel. S'il n'y a eu aucune partie, plaisante gentiment sur cette semaine calme. "
            . "Si des parties ont été jouées en déplacement (faits.parties_en_deplacement), raconte-le du point de vue du voyage : lieu, distance, ambiance. "
            . "Mets en avant les rencontres inhabituelles (faits.rencontres_inhabituelles : joueurs qui n'avaient jamais ou rarement joué ensemble, nouveaux joueurs). "
            . "Les actualités locales (contexte.actualites_locales, titres de presse de la semaine) servent à contextualiser : ne les évoque que si un rapprochement avec un jeu joué, un lieu ou une ambiance est plausible et amusant, "
            . "cite alors le titre sans le déformer, et n'en invente jamais ; sinon ignore-les. "
            . "Pour throwback, compare uniquement avec les faits de les_annees_precedentes_a_cette_epoque (année, jeux, joueurs, victoires) : « il y a 2 ans, à la même époque... ». "
            . "Pour epic, raconte comment la partie_au_hasard a PU se dérouler, comme une fiction assumée dont tu es le conteur : respecte strictement les faits fournis (jeu, joueurs, vainqueur, scores, durée, lieu) "
            . "mais invente librement le déroulé, les rebondissements et les dialogues. Choisis le ton le plus adapté aux faits (écart de score serré = combat acharné, partie longue = saga, courte ou coopérative = ballade tranquille...) "
            . "et habille-le de l'ambiance du calendrier (contexte.calendrier, y compris celui de la date de la partie) : frissons et citrouilles à Halloween, neige en février, magie à Noël, chocolat à Pâques, "
            . "chaleur de l'été, rentrée, feuilles mortes, muguet... Sois imaginatif et drôle, sans jamais prétendre que c'est réel. S'il n'y a aucune partie_au_hasard, mets epic à null.";
        $out = $this->ai->json("Tu es le rédacteur d'une newsletter hebdomadaire entre amis pour une application de suivi de parties de jeux de société. "
            . "Ton ton est chaleureux et complice. Tu écris en français et tu réponds uniquement par un objet JSON valide.", $prompt, 0.9);

        $titles = array_column($facts['library'], 'title');
        $suggestions = [];
        foreach ((array) ($out['suggestions'] ?? []) as $s) {
            if (isset($s['game'], $s['reason']) && in_array($s['game'], $titles, true)) {
                $suggestions[] = ['game' => $s['game'], 'reason' => $this->assistant->restore((string) $s['reason'])];
            }
        }

        return [
            'subject' => $this->assistant->restore((string) ($out['subject'] ?? 'Votre semaine sur LudoScore')),
            'summary' => $this->assistant->restore((string) ($out['summary'] ?? '')),
            'suggestions' => $suggestions,
            'story' => array_map(fn($p) => $this->assistant->restore((string) $p), array_slice((array) ($out['story'] ?? []), 0, 3)),
            'stats' => $facts['week']['totaux'] ?? [],
            'moon' => $context['lune'],
            'throwback' => $facts['past'] ? $this->assistant->restore((string) ($out['throwback'] ?? '')) : '',
            'epic' => $this->epic($out['epic'] ?? null, $facts['random']),
        ];
    }

    private function epic($epic, ?array $random): ?array
    {
        $paragraphs = is_array($epic) ? array_slice(array_filter((array) ($epic['paragraphs'] ?? []), 'is_string'), 0, 3) : [];
        if (!$random || !$paragraphs) {
            return null;
        }

        return [
            'title' => $this->assistant->restore((string) ($epic['title'] ?? $random['jeu'])),
            'tone' => $this->assistant->restore((string) ($epic['tone'] ?? '')),
            'paragraphs' => array_map(fn($p) => $this->assistant->restore($p), $paragraphs),
            'game' => $random['jeu'],
            'date' => $random['date'],
        ];
    }

    private function facts(): array
    {
        $rows = (new MatchDataset())->rows();
        $since = now()->subDays(7);
        $week = $rows->filter(fn($r) => $r['started_at'] >= $since);
        $matches = $week->groupBy('match_id');

        $gamesPlayed = $matches->map(fn($g) => $g->first()['game'])->countBy()->sortDesc()->all();
        $minutes = (int) $matches->sum(fn($g) => $g->first()['duration'] ?? 0);

        $winners = $week->where('won', true)->groupBy('player_id')->map->count()->sortDesc()
            ->mapWithKeys(fn($n, $id) => [MatchDataset::label($id) => $n])->all();

        $longest = $matches->sortByDesc(fn($g) => $g->first()['duration'] ?? 0)->first();

        $firstTimeGames = $matches->filter(fn($g) => !$rows->contains(fn($r) => $r['game_id'] === $g->first()['game_id'] && $r['started_at'] < $since))
            ->map(fn($g) => $g->first()['game'])->unique()->values()->all();

        $streaks = [];
        foreach ($rows->where('has_winner', true)->groupBy('player_id') as $playerId => $playerRows) {
            $streak = 0;
            foreach ($playerRows->reverse() as $r) {
                if (!$r['won']) {
                    break;
                }
                $streak++;
            }
            if ($streak >= 3) {
                $streaks[MatchDataset::label($playerId)] = $streak;
            }
        }

        $lastPlayed = $rows->groupBy('game_id')->map(fn($g) => $g->max('started_at'));
        $library = DB::table('games')->where('in_library', true)->where('is_expansion', false)
            ->get(['id', 'title', 'min_players', 'max_players', 'is_only_cooperative'])
            ->map(fn($g) => [
                'title' => $g->title,
                'joueurs' => $g->min_players . '-' . $g->max_players,
                'cooperatif' => (bool) $g->is_only_cooperative,
                'derniere_partie' => isset($lastPlayed[$g->id]) ? $lastPlayed[$g->id]->toDateString() : 'jamais jouée',
            ])->all();

        $places = $matches->map(fn($g) => $g->first())->filter(fn($r) => $r['away'])
            ->map(fn($r) => ['lieu' => $r['place'], 'distance_km' => $r['distance_km'], 'jeu' => $r['game'], 'date' => $r['started_at']->toDateString()])
            ->values()->all();

        $latest = $matches->map(fn($g) => $g->first())->sortByDesc('started_at')->first();
        $home = LocationService::home();
        $current = $latest && $latest['away'] && $latest['started_at'] >= now()->subDays(3)
            ? ['name' => $latest['place'], 'lat' => $latest['lat'], 'lon' => $latest['lon']]
            : $home;

        $newsPlaces = collect([$home['name']])->merge(collect($places)->pluck('lieu')->reject(fn($p) => $p === 'lieu inconnu'))->unique()->take(3);
        $news = [];
        foreach ($newsPlaces as $place) {
            $news[$place] = $this->location->news($place);
        }

        return [
            'past' => $this->pastYears($rows),
            'random' => $this->randomMatch($rows),
            'calendar' => $this->calendar(now()),
            'position_actuelle' => $current,
            'news' => array_filter($news),
            'week' => [
                'parties_en_deplacement' => $places,
                'rencontres_inhabituelles' => $this->unusualEncounters($rows, $matches, $since),
                'totaux' => ['parties' => $matches->count(), 'minutes_de_jeu' => $minutes],
                'jeux_joues' => $gamesPlayed,
                'victoires_par_joueur' => $winners,
                'partie_la_plus_longue' => $longest ? ['jeu' => $longest->first()['game'], 'minutes' => $longest->first()['duration']] : null,
                'jeux_joues_pour_la_premiere_fois' => $firstTimeGames,
                'series_de_victoires_en_cours' => $streaks,
            ],
            'library' => $library,
        ];
    }

    /** Ce qui s'est joué autour de la même date (±7 jours) lors des années précédentes. */
    private function pastYears($rows): array
    {
        $today = now();
        $out = [];

        foreach ($rows->groupBy(fn($r) => $r['started_at']->year) as $year => $yearRows) {
            if ($year >= $today->year) {
                continue;
            }
            $center = Carbon::create($year, $today->month, min($today->day, Carbon::create($year, $today->month, 1)->daysInMonth));
            $window = $yearRows->filter(fn($r) => $r['started_at']->between($center->copy()->subDays(7)->startOfDay(), $center->copy()->addDays(7)->endOfDay()));
            if ($window->isEmpty()) {
                continue;
            }

            $matches = $window->groupBy('match_id');
            $out[] = [
                'annee' => (int) $year,
                'il_y_a_ans' => $today->year - $year,
                'parties' => $matches->count(),
                'minutes_de_jeu' => (int) $matches->sum(fn($g) => $g->first()['duration'] ?? 0),
                'jeux' => $matches->map(fn($g) => $g->first()['game'])->countBy()->sortDesc()->take(5)->all(),
                'joueurs_presents' => $window->pluck('player_id')->unique()->map(fn($id) => MatchDataset::label($id))->values()->all(),
                'victoires' => $window->where('won', true)->groupBy('player_id')->map->count()->sortDesc()->take(3)
                    ->mapWithKeys(fn($n, $id) => [MatchDataset::label($id) => $n])->all(),
                'lieux_en_deplacement' => $window->where('away', true)->pluck('place')->unique()->values()->all(),
            ];
        }

        return array_slice(array_reverse($out), 0, 5);
    }

    /** Une partie de l'historique, choisie au hasard mais de façon stable pour une semaine donnée (aperçu = e-mail). */
    private function randomMatch($rows): ?array
    {
        $matches = $rows->groupBy('match_id')->values();
        if ($matches->isEmpty()) {
            return null;
        }

        $group = $matches[crc32(now()->format('o-W')) % $matches->count()];
        $first = $group->first();
        $teams = [];
        foreach ($group->groupBy('team_id') as $members) {
            $teams[] = [
                'joueurs' => $members->map(fn($r) => MatchDataset::label($r['player_id']))->all(),
                'couleur' => $members->first()['color'],
                'score' => $members->first()['score'],
                'gagnante' => $members->first()['won'],
            ];
        }

        return [
            'jeu' => $first['game'],
            'date' => $first['started_at']->toDateString(),
            'jour' => $first['weekday'],
            'heure' => $first['hour'] . 'h',
            'duree_minutes' => $first['duration'],
            'cooperatif' => $first['coop'],
            'lieu' => $first['place'],
            'equipes' => $teams,
            'calendrier_a_la_date_de_la_partie' => $this->calendar($first['started_at']),
        ];
    }

    /** Saison et événements du calendrier proches d'une date (±15 jours), pour donner une ambiance. */
    private function calendar(Carbon $date): array
    {
        $year = $date->year;
        $easter = Carbon::createFromTimestamp(easter_date($year), $date->getTimezone())->startOfDay();
        $fixed = [
            'Nouvel An' => [1, 1], 'Épiphanie (galette des rois)' => [1, 6], 'Chandeleur (crêpes)' => [2, 2],
            'Saint-Valentin' => [2, 14], 'Poisson d\'avril' => [4, 1], 'Fête du travail (muguet)' => [5, 1],
            'Fête de la musique' => [6, 21], 'Fête nationale (14 juillet)' => [7, 14], 'Rentrée des classes' => [9, 1],
            'Halloween' => [10, 31], 'Toussaint' => [11, 1], 'Armistice' => [11, 11], 'Noël' => [12, 25], 'Réveillon du Nouvel An' => [12, 31],
        ];
        $events = [];
        foreach ($fixed as $name => [$month, $day]) {
            foreach ([$year - 1, $year, $year + 1] as $y) {
                $events[] = [$name, Carbon::create($y, $month, $day)->startOfDay()];
            }
        }
        $events[] = ['Pâques (chocolat)', $easter];
        $events[] = ['Mardi gras (carnaval)', $easter->copy()->subDays(47)];
        $events[] = ['Ascension', $easter->copy()->addDays(39)];

        $near = [];
        foreach ($events as [$name, $at]) {
            $diff = (int) $date->copy()->startOfDay()->diffInDays($at, false);
            if (abs($diff) <= 15) {
                $near[] = ['evenement' => $name, 'dans_jours' => $diff];
            }
        }
        usort($near, fn($a, $b) => abs($a['dans_jours']) <=> abs($b['dans_jours']));

        $season = match (true) {
            in_array($date->month, [12, 1, 2]) => 'hiver',
            in_array($date->month, [3, 4, 5]) => 'printemps',
            in_array($date->month, [6, 7, 8]) => 'été',
            default => 'automne',
        };

        return ['date' => $date->toDateString(), 'saison' => $season, 'evenements_proches' => $near];
    }

    /** Joueurs réunis pour la première fois (ou presque) et nouveaux joueurs, d'après l'historique antérieur à chaque partie. */
    private function unusualEncounters($rows, $weekMatches, $since): array
    {
        $before = $rows->groupBy('match_id');
        $out = [];

        foreach ($weekMatches as $matchId => $group) {
            $start = $group->first()['started_at'];
            $ids = $group->pluck('player_id')->unique()->sort()->values()->all();
            $earlier = $before->filter(fn($g) => $g->first()['started_at'] < $start);

            foreach ($ids as $playerId) {
                if (!$earlier->contains(fn($g) => $g->contains('player_id', $playerId))) {
                    $out[] = ['type' => 'premiere_partie_du_joueur', 'joueurs' => [MatchDataset::label($playerId)], 'jeu' => $group->first()['game']];
                }
            }

            for ($i = 0; $i < count($ids); $i++) {
                for ($j = $i + 1; $j < count($ids); $j++) {
                    $together = $earlier->filter(fn($g) => $g->contains('player_id', $ids[$i]) && $g->contains('player_id', $ids[$j]))->count();
                    $knownBoth = $earlier->contains(fn($g) => $g->contains('player_id', $ids[$i])) && $earlier->contains(fn($g) => $g->contains('player_id', $ids[$j]));
                    if ($knownBoth && $together <= 1) {
                        $out[] = ['type' => $together === 0 ? 'jamais_joue_ensemble' : 'joue_ensemble_une_seule_fois',
                            'joueurs' => [MatchDataset::label($ids[$i]), MatchDataset::label($ids[$j])], 'jeu' => $group->first()['game']];
                    }
                }
            }
        }

        return array_slice(array_values(array_unique($out, SORT_REGULAR)), 0, 12);
    }

    /** Phase de lune calculée localement (cycle synodique moyen). */
    public function moon(Carbon $date): array
    {
        $age = fmod(($date->copy()->utc()->timestamp - 947182440) / 86400, 29.530588853);
        $age = $age < 0 ? $age + 29.530588853 : $age;
        $name = match (true) {
            $age < 1.85 || $age >= 27.68 => 'nouvelle lune',
            $age < 5.54 => 'premier croissant',
            $age < 9.23 => 'premier quartier',
            $age < 12.91 => 'lune gibbeuse croissante',
            $age < 16.61 => 'pleine lune',
            $age < 20.30 => 'lune gibbeuse décroissante',
            $age < 23.99 => 'dernier quartier',
            default => 'dernier croissant',
        };

        return ['phase' => $name, 'age_jours' => round($age, 1)];
    }

    private function weather(array $position): ?array
    {
        $lat = $position['lat'];
        $lon = $position['lon'];

        try {
            $res = Http::timeout(15)->get('https://api.open-meteo.com/v1/forecast', [
                'latitude' => $lat, 'longitude' => $lon, 'timezone' => 'auto', 'forecast_days' => 7,
                'daily' => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
            ])->throw()->json('daily');
        } catch (Throwable) {
            return null;
        }

        $days = [];
        foreach ($res['time'] ?? [] as $i => $day) {
            $days[] = [
                'jour' => $day,
                'code_meteo_wmo' => $res['weather_code'][$i] ?? null,
                'temp_max' => $res['temperature_2m_max'][$i] ?? null,
                'temp_min' => $res['temperature_2m_min'][$i] ?? null,
                'pluie_mm' => $res['precipitation_sum'][$i] ?? null,
            ];
        }

        return ['ville' => $position['name'], 'previsions' => $days];
    }
}
