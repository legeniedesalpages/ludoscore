<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class StatisticsController extends Controller
{
    public function overview(): JsonResponse
    {
        $matches = DB::table('matches as m')
            ->leftJoin('games as g', 'g.id', '=', 'm.game_id')
            ->leftJoin('teams as w', 'w.id', '=', 'm.winner_team_id')
            ->select(
                'm.id',
                'm.game_id',
                'g.title as game_title',
                'm.started_at',
                'm.finished_at',
                'm.canceled',
                'm.running',
                'w.name as winner_name'
            )
            ->orderBy('m.started_at', 'desc')
            ->get();

        $totalMatches = $matches->count();
        $totalGames = DB::table('games')->count();
        $totalPlayers = DB::table('players')->count();

        $durationValues = [];
        foreach ($matches as $match) {
            if ($match->started_at && $match->finished_at) {
                $diff = (strtotime($match->finished_at) - strtotime($match->started_at)) / 60;
                if ($diff > 0) {
                    $durationValues[] = $diff;
                }
            }
        }

        $averageDurationMinutes = count($durationValues) > 0 ? (int) round(array_sum($durationValues) / count($durationValues)) : 0;

        $gameCount = [];
        foreach ($matches as $match) {
            $key = $match->game_title ?? 'Inconnu';
            $gameCount[$key] = ($gameCount[$key] ?? 0) + 1;
        }
        arsort($gameCount);
        $mostPlayedGame = $gameCount ? ['name' => array_key_first($gameCount), 'value' => (int) reset($gameCount)] : ['name' => 'Aucun', 'value' => 0];

        $playerWins = DB::table('team_players as tp')
            ->join('teams as t', 't.id', '=', 'tp.team_id')
            ->join('matches as m', 'm.winner_team_id', '=', 't.id')
            ->join('players as p', 'p.id', '=', 'tp.player_id')
            ->select('p.id', 'p.pseudo', DB::raw('COUNT(*) as wins'))
            ->groupBy('p.id', 'p.pseudo')
            ->orderByDesc('wins')
            ->limit(8)
            ->get();

        $bestPlayer = $playerWins->first();

        $winnerDistribution = DB::table('matches as m')
            ->join('teams as t', 't.id', '=', 'm.winner_team_id')
            ->select('t.name as name', DB::raw('COUNT(*) as value'))
            ->whereNotNull('m.winner_team_id')
            ->groupBy('t.id', 't.name')
            ->orderByDesc('value')
            ->limit(6)
            ->get();

        $gameRanking = DB::table('matches as m')
            ->join('games as g', 'g.id', '=', 'm.game_id')
            ->select('g.title as name', DB::raw('COUNT(*) as value'))
            ->groupBy('g.id', 'g.title')
            ->orderByDesc('value')
            ->limit(6)
            ->get();

        return response()->json([
            'totalMatches' => $totalMatches,
            'totalGames' => $totalGames,
            'totalPlayers' => $totalPlayers,
            'averageDurationMinutes' => $averageDurationMinutes,
            'mostPlayedGame' => $mostPlayedGame,
            'bestPlayer' => $bestPlayer?->pseudo ?: 'Aucun',
            'gameRanking' => $gameRanking,
            'winnerDistribution' => $winnerDistribution,
            'status' => 'success',
        ]);
    }

    public function games(): JsonResponse
    {
        $matches = DB::table('matches as m')
            ->join('games as g', 'g.id', '=', 'm.game_id')
            ->select('m.id', 'm.started_at', 'm.finished_at', 'm.game_id', 'm.winner_team_id', 'g.title as game_title')
            ->orderBy('m.started_at', 'desc')
            ->get();

        $teamsByMatch = DB::table('teams as t')
            ->leftJoin('team_players as tp', 'tp.team_id', '=', 't.id')
            ->leftJoin('players as p', 'p.id', '=', 'tp.player_id')
            ->select('t.match_id', 't.id as team_id', 't.name as team_name', 't.score', 'tp.player_id', 'p.pseudo')
            ->get()
            ->groupBy('match_id');

        $stats = [];
        foreach ($matches as $match) {
            $gameTitle = $match->game_title ?? 'Inconnu';
            if (!isset($stats[$gameTitle])) {
                $stats[$gameTitle] = [
                    'title' => $gameTitle,
                    'matches' => 0,
                    'durations' => [],
                    'scoreGaps' => [],
                    'waitDays' => [],
                    'winners' => [],
                ];
            }

            $stats[$gameTitle]['matches']++;

            if ($match->started_at && $match->finished_at) {
                $diff = (strtotime($match->finished_at) - strtotime($match->started_at)) / 60;
                if ($diff > 0) {
                    $stats[$gameTitle]['durations'][] = $diff;
                }
            }

            if (isset($teamsByMatch[$match->id])) {
                $scores = array_values(array_filter($teamsByMatch[$match->id]
                    ->map(fn($team) => (int) ($team->score ?? 0))
                    ->all()));
                if (count($scores) > 1) {
                    $stats[$gameTitle]['scoreGaps'][] = max($scores) - min($scores);
                }

                $winner = null;
                foreach ($teamsByMatch[$match->id] as $team) {
                    $winner = $team->team_id == $match->winner_team_id ? $team->team_name : $winner;
                }
                if ($winner) {
                    $stats[$gameTitle]['winners'][$winner] = ($stats[$gameTitle]['winners'][$winner] ?? 0) + 1;
                }
            }
        }

        $result = [];
        foreach ($stats as $data) {
            $waitDays = [];
            $gameMatches = DB::table('matches')->where('game_id', function ($query) use ($data) {
                $query->select('id')->from('games')->where('title', $data['title'])->limit(1);
            })->orderBy('started_at')->pluck('started_at')->all();

            for ($i = 1; $i < count($gameMatches); $i++) {
                $prev = strtotime($gameMatches[$i - 1]);
                $curr = strtotime($gameMatches[$i]);
                if ($prev && $curr) {
                    $waitDays[] = abs(($curr - $prev) / 86400);
                }
            }

            $winner = $data['winners'] ? array_key_first($data['winners']) : 'Aucun';
            $averageDuration = count($data['durations']) > 0 ? round(array_sum($data['durations']) / count($data['durations'])) : 0;
            $averageGap = count($data['scoreGaps']) > 0 ? round(array_sum($data['scoreGaps']) / count($data['scoreGaps'])) : 0;
            $averageWait = count($waitDays) > 0 ? round(array_sum($waitDays) / count($waitDays), 1) : 0;

            $result[] = [
                'title' => $data['title'],
                'matches' => $data['matches'],
                'averageDurationMinutes' => $averageDuration,
                'averageScoreGap' => $averageGap,
                'averageWaitDays' => $averageWait,
                'winner' => $winner,
            ];
        }

        usort($result, fn ($a, $b) => $b['matches'] <=> $a['matches']);

        return response()->json([
            'data' => $result,
            'status' => 'success',
        ]);
    }

    public function players(): JsonResponse
    {
        $players = DB::table('players')->select('id', 'pseudo')->get();
        $matches = DB::table('matches as m')
            ->join('teams as t', 't.match_id', '=', 'm.id')
            ->join('team_players as tp', 'tp.team_id', '=', 't.id')
            ->select('m.id as match_id', 'm.game_id', 'm.winner_team_id', 't.id as team_id', 't.score', 'tp.player_id', 'm.started_at', 'm.finished_at')
            ->get();

        $gameById = DB::table('games')->select('id', 'title')->pluck('title', 'id')->all();
        $results = [];

        foreach ($players as $player) {
            $playerMatches = $matches->where('player_id', $player->id);
            $playerRecords = [];
            $wins = 0;
            $scoreGap = [];
            $countByGame = [];

            foreach ($playerMatches as $match) {
                $countByGame[$gameById[$match->game_id] ?? 'Inconnu'] = ($countByGame[$gameById[$match->game_id] ?? 'Inconnu'] ?? 0) + 1;

                if ($match->winner_team_id && $match->team_id == $match->winner_team_id) {
                    $wins++;
                }

                $sameMatchScores = $matches->filter(fn ($row) => (int) $row->match_id === (int) $match->match_id)
                    ->map(fn ($row) => (int) ($row->score ?? 0))
                    ->all();

                if (count($sameMatchScores) > 1) {
                    $scoreGap[] = max($sameMatchScores) - min($sameMatchScores);
                }
            }

            arsort($countByGame);
            $favoriteGame = $countByGame ? array_key_first($countByGame) : 'Aucun';
            $averageGap = count($scoreGap) > 0 ? round(array_sum($scoreGap) / count($scoreGap)) : 0;
            $totalMatches = $playerMatches->count();

            $results[] = [
                'name' => $player->pseudo ?: 'Joueur',
                'matches' => $totalMatches,
                'wins' => $wins,
                'winRate' => $totalMatches > 0 ? round(($wins / $totalMatches) * 100) : 0,
                'favoriteGame' => $favoriteGame,
                'averageScoreGap' => $averageGap,
            ];
        }

        usort($results, fn ($a, $b) => $b['wins'] <=> $a['wins'] ?: $b['matches'] <=> $a['matches']);

        return response()->json([
            'data' => $results,
            'status' => 'success',
        ]);
    }
}
