<?php

namespace App\Console\Commands;

use App\Services\Analytics\StatsAssistant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class GenerateInsights extends Command
{
    protected $signature = 'stats:generate-insights {--scope= : player ou game} {--id= : identifiant du joueur/jeu} {--min=5 : nombre minimal de parties}';

    protected $description = "Génère par IA les insights dynamiques des joueurs et des jeux";

    public function handle(StatsAssistant $assistant): int
    {
        $min = (int) $this->option('min');
        $subjects = [];

        if ($this->option('scope') && $this->option('id')) {
            $subjects[] = [$this->option('scope'), (int) $this->option('id')];
        } else {
            $players = DB::table('team_players as tp')->join('teams as t', 't.id', '=', 'tp.team_id')
                ->join('matches as m', 'm.id', '=', 't.match_id')->where('m.canceled', false)
                ->groupBy('tp.player_id')->havingRaw('COUNT(DISTINCT ' . DB::getTablePrefix() . 'm.id) >= ?', [$min])->pluck('tp.player_id');
            $games = DB::table('matches')->where('canceled', false)
                ->groupBy('game_id')->havingRaw('COUNT(*) >= ?', [$min])->pluck('game_id');

            foreach ($players as $id) {
                $subjects[] = ['player', (int) $id];
            }
            foreach ($games as $id) {
                $subjects[] = ['game', (int) $id];
            }
        }

        $failures = 0;
        foreach ($subjects as $i => [$scope, $id]) {
            try {
                $count = $assistant->generateInsights($scope, $id);
                $this->info("{$scope} #{$id} : {$count} insight(s)");
            } catch (Throwable $e) {
                $failures++;
                $this->error("{$scope} #{$id} : " . $e->getMessage());
            }
            if ($i < count($subjects) - 1) {
                sleep(8); // respecte les limites de débit de l'offre gratuite
            }
        }

        return $failures ? self::FAILURE : self::SUCCESS;
    }
}
