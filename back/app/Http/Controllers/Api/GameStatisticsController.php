<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Analytics\GameStatistics;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class GameStatisticsController extends Controller
{
    public function index(GameStatistics $statistics): JsonResponse
    {
        $games = DB::table('games')->orderByDesc('created_at')->orderByDesc('id')->get();
        $matches = $statistics->matches();
        $byGame = $matches->groupBy('game_id');
        $data = $games->map(fn($game) => [
            'id' => (int) $game->id,
            'title' => $game->title,
            'thumbnailId' => $game->thumbnail_id,
            'createdAt' => $game->created_at,
        ] + $statistics->summary($byGame->get($game->id, collect())))
            ->sortByDesc('matches')->values();

        return response()->json([
            'summary' => $statistics->summary($matches) + [
                'totalGames' => $games->count(),
                'playedGames' => $data->where('matches', '>', 0)->count(),
            ],
            'data' => $data,
        ]);
    }

    public function show(int $id, GameStatistics $statistics): JsonResponse
    {
        $game = DB::table('games')->where('id', $id)->first();
        abort_if(!$game, 404, 'Jeu introuvable.');
        return response()->json($statistics->detail($game, $statistics->matches($id)));
    }
}
