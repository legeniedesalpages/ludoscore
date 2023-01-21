<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\TeamPlayer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class MatchController extends Controller
{

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
                Log::debug("Request player");
                Log::debug($requestPlayer);
                Log::debug("************");


                $teamPlayer = new TeamPlayer;
                $teamPlayer->team_id = $team->id;
                $teamPlayer->player_id = $requestPlayer['id'];
                $teamPlayer->position = $j;
                $teamPlayer->save();
            }
        }
    }
}
