<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Analytics\GameStatistics;
use App\Services\Analytics\PlayerStatistics;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PlayerStatisticsController extends Controller
{
    public function index(PlayerStatistics $statistics, GameStatistics $games): JsonResponse
    {
        $players = DB::table('players')->orderByDesc('created_at')->orderByDesc('id')->get();
        $rows = $statistics->rows();
        $byPlayer = $rows->groupBy('player_id');
        $data = $players->map(fn($player) => [
            'id' => (int) $player->id, 'name' => $player->pseudo ?: 'Joueur ' . $player->id,
            'createdAt' => $player->created_at,
        ] + $statistics->summary($byPlayer->get($player->id, collect())))
            ->sortByDesc('matches')->values();
        return response()->json([
            'summary' => $games->summary($rows->unique('id')) + [
                'totalPlayers' => $players->count(), 'activePlayers' => $data->where('matches', '>', 0)->count(),
            ],
            'data' => $data,
        ]);
    }

    public function show(int $id, PlayerStatistics $statistics): JsonResponse
    {
        $player = DB::table('players')->where('id', $id)->first();
        abort_if(!$player, 404, 'Joueur introuvable.');
        return response()->json($statistics->detail($player, $statistics->rows($id)));
    }
}
