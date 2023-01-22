<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\TeamPlayer;
use Illuminate\Http\Request;

class MatchController extends Controller
{

    public function show($id)
    {
        return GameMatch::findOrFail($id);
    }

    public function currentMatch()
    {
        $match = GameMatch::where('running', true)->get();

        if (count($match) == 0) {
            $hasCurrent = false;
            $currentMatch = [];
        } else {
            $hasCurrent = true;
            $currentMatch = $match->toArray()[0];
        }


        return ['hasCurrent' => $hasCurrent, 'match' => $currentMatch];
    }

    public function store(Request $request)
    {
        $hasCurrentMatch = GameMatch::where('running', true)->get();
        if (count($hasCurrentMatch) == 0) {
            return response()->json([
                'status' => false,
                'message' => "Another match has already started"
            ], 500);
        }

        $match = new GameMatch;
        $match->game_id = $request->id_game;
        $match->canceled = false;
        $match->tags = "{}";
        $match->running = true;
        $match->started_at = now();
        $match->save();

        $i = 0;
        foreach ($request->teams as $requestTeam) {
            $i++;

            $team = new Team;
            $team->color = "";
            $team->tags = "{}";
            $team->position = $i;
            $team->score = null;
            $team->match_id = $match->id;
            $team->save();

            $j = 0;
            foreach ($requestTeam['players'] as $requestPlayer) {
                $j++;

                $teamPlayer = new TeamPlayer;
                $teamPlayer->team_id = $team->id;
                $teamPlayer->player_id = $requestPlayer['id'];
                $teamPlayer->position = $j;
                $teamPlayer->save();
            }
        }

        return $match->id;
    }
}
