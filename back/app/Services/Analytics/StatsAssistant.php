<?php

namespace App\Services\Analytics;

use App\Services\Ai\GeminiClient;
use Illuminate\Support\Facades\DB;

/**
 * Orchestration IA en deux temps : l'IA planifie des requêtes (spécifications), le serveur les exécute,
 * puis l'IA commente les résultats réels. Seuls des identifiants anonymes (J<id>) sont transmis.
 */
class StatsAssistant
{
    private const SYSTEM = "Tu es l'analyste d'une application personnelle de suivi de parties de jeux de société. "
        . "Tu écris en français, de façon claire et sans jargon. Les joueurs sont désignés par des codes (J1, J2...) : reprends ces codes tels quels. "
        . "Tu ne calcules jamais toi-même : tu ne cites que des chiffres présents dans les résultats fournis. "
        . "Tu restes prudent : en dessous de 3 parties par groupe (n), tu parles de simple tendance ; tu ne conclus jamais à une causalité. "
        . "Tu réponds uniquement par un objet JSON valide.";

    public function __construct(private GeminiClient $ai)
    {
    }

    /** Génère et stocke les insights d'un joueur ou d'un jeu. Retourne le nombre d'insights enregistrés. */
    public function generateInsights(string $scope, int $subjectId, int $max = 6): int
    {
        $rows = (new MatchDataset())->rows();
        $scopeFilter = $this->scopeFilter($scope, $subjectId);
        $engine = new MetricEngine($rows);

        $plan = $this->plan($rows, $scope, $scopeFilter, "Imagine les analyses les plus parlantes et surprenantes pour ce sujet (jusqu'à 8 requêtes variées : jour de la semaine, couleur, ordre du tour, régularité, tags, durée...).", 8);
        $results = $this->execute($engine, $plan, $scopeFilter);
        if (!$results) {
            return 0;
        }

        $prompt = "Contexte : " . $this->describeScope($scope, $subjectId) . "\nRésultats calculés (n = nombre de parties du groupe) :\n"
            . json_encode($results, JSON_UNESCAPED_UNICODE)
            . "\n\nProduis jusqu'à {$max} insights pertinents, classés du plus intéressant au moins intéressant. "
            . "Format : {\"insights\":[{\"title\":\"titre court\",\"text\":\"1 à 2 phrases\",\"relevance\":0-100,\"query_id\":\"id du résultat illustrant l'insight\",\"chart\":\"bar|line|pie|table\"}]}. "
            . "Ignore les résultats dont tous les groupes ont n < 3.";
        $out = $this->ai->json(self::SYSTEM, $prompt);

        DB::table('insights')->where('scope', $scope)->where('subject_id', $subjectId)->delete();

        $saved = 0;
        foreach (array_slice((array) ($out['insights'] ?? []), 0, $max) as $insight) {
            if (empty($insight['title']) || empty($insight['text'])) {
                continue;
            }
            $chart = isset($results[$insight['query_id'] ?? '']) ? $this->buildChart([$results[$insight['query_id']]], $insight['chart'] ?? 'bar', $insight['title']) : null;
            DB::table('insights')->insert([
                'scope' => $scope,
                'subject_id' => $subjectId,
                'title' => mb_substr($this->restore($insight['title']), 0, 150),
                'text' => $this->restore($insight['text']),
                'chart' => $chart ? json_encode($chart) : null,
                'relevance' => max(0, min(100, (int) ($insight['relevance'] ?? 50))),
                'generated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $saved++;
        }

        return $saved;
    }

    /** Répond à une question libre sous forme de tableau / graphique. */
    public function answer(string $question, ?string $scope = null, ?int $subjectId = null): array
    {
        $rows = (new MatchDataset())->rows();
        $scopeFilter = $scope ? $this->scopeFilter($scope, (int) $subjectId) : [];
        $engine = new MetricEngine($rows);

        $plan = $this->plan($rows, $scope, $scopeFilter, "Question de l'utilisateur : « " . mb_substr($question, 0, 500) . " ». Propose jusqu'à 3 requêtes qui permettent d'y répondre au mieux.", 3);
        $results = $this->execute($engine, $plan, $scopeFilter);
        if (!$results) {
            return ['title' => 'Aucune donnée', 'type' => 'table', 'columns' => [], 'rows' => [], 'comment' => "Je n'ai pas trouvé de calcul possible pour cette question avec les données disponibles."];
        }

        $prompt = "Question : « " . mb_substr($question, 0, 500) . " »\nRésultats calculés :\n" . json_encode($results, JSON_UNESCAPED_UNICODE)
            . "\n\nChoisis la meilleure présentation. Format : {\"title\":\"...\",\"type\":\"bar|line|pie|table\",\"query_ids\":[\"ids à afficher\"],\"comment\":\"2-3 phrases d'interprétation prudente\"}.";
        $out = $this->ai->json(self::SYSTEM, $prompt);

        $selected = array_values(array_intersect_key($results, array_flip((array) ($out['query_ids'] ?? []))));
        $chart = $this->buildChart($selected ?: [reset($results)], $out['type'] ?? 'table', $out['title'] ?? 'Résultat');
        $chart['comment'] = $this->restore((string) ($out['comment'] ?? ''));

        return $chart;
    }

    private function plan($rows, ?string $scope, array $scopeFilter, string $task, int $maxQueries): array
    {
        $prompt = "Contexte : " . ($scope ? $this->describeScope($scope, (int) ($scopeFilter['player_id'] ?? $scopeFilter['game_id'])) : 'statistiques globales')
            . ".\nDonnées : " . $rows->pluck('match_id')->unique()->count() . " parties terminées entre "
            . ($rows->min('started_at')?->toDateString() ?? '?') . " et " . ($rows->max('started_at')?->toDateString() ?? '?') . ".\n"
            . "Dimensions disponibles : " . json_encode(MetricEngine::DIMENSIONS, JSON_UNESCAPED_UNICODE) . "\n"
            . "Mesures disponibles : " . json_encode(MetricEngine::MEASURES, JSON_UNESCAPED_UNICODE) . "\n"
            . $task . "\nFormat : {\"queries\":[{\"id\":\"q1\",\"measure\":\"...\",\"dimension\":\"...\",\"limit\":15}]} avec au plus {$maxQueries} requêtes. N'utilise que les dimensions et mesures listées.";

        return (array) ($this->ai->json(self::SYSTEM, $prompt, 0.7)['queries'] ?? []);
    }

    /** @return array<string,array> résultats indexés par id de requête */
    private function execute(MetricEngine $engine, array $plan, array $scopeFilter): array
    {
        $results = [];
        foreach (array_slice($plan, 0, 8) as $i => $spec) {
            if (!is_array($spec)) {
                continue;
            }
            $res = $engine->run($spec, $scopeFilter);
            if ($res && $res['rows']) {
                $id = (string) ($spec['id'] ?? 'q' . ($i + 1));
                $results[$id] = ['id' => $id] + $res;
            }
        }

        return $results;
    }

    private function buildChart(array $results, string $type, string $title): array
    {
        $type = in_array($type, ['bar', 'line', 'pie', 'table']) ? $type : 'table';
        $labels = [];
        foreach ($results as $r) {
            foreach ($r['rows'] as $row) {
                $labels[$row['label']] = true;
            }
        }

        $columns = array_merge(['Libellé'], array_map(fn($r) => MetricEngine::MEASURES[$r['measure']] . ' par ' . MetricEngine::DIMENSIONS[$r['dimension']], $results));
        $rows = [];
        foreach (array_keys($labels) as $label) {
            $line = [$this->restore((string) $label)];
            foreach ($results as $r) {
                $found = collect($r['rows'])->firstWhere('label', (string) $label);
                $line[] = $found['value'] ?? null;
            }
            $rows[] = $line;
        }

        return ['title' => $this->restore($title), 'type' => $type, 'columns' => $columns, 'rows' => $rows];
    }

    private function scopeFilter(string $scope, int $subjectId): array
    {
        return $scope === 'player' ? ['player_id' => $subjectId] : ['game_id' => $subjectId];
    }

    private function describeScope(string $scope, int $subjectId): string
    {
        if ($scope === 'player') {
            return 'statistiques du joueur ' . MatchDataset::label($subjectId);
        }

        return 'statistiques du jeu « ' . DB::table('games')->where('id', $subjectId)->value('title') . ' »';
    }

    /** Remplace les codes anonymes (J12) par les pseudos pour l'affichage. */
    public function restore(string $text): string
    {
        $pseudos = app(\App\Services\PlayerNames::class)->present(DB::table('players')->select('id', 'pseudo')->get())->pluck('pseudo', 'id');

        return preg_replace_callback('/\bJ(\d+)\b/', fn($m) => $pseudos[(int) $m[1]] ?? $m[0], $text);
    }
}
