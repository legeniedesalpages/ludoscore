<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\TeamPlayer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GameMatchController extends Controller
{
    public function index()
    {
        return GameMatch::get();
    }

    public function update(Request $request, $id)
    {        
        Log::info("Mise à jour du match d'id : " . $id);
        Log::debug($request);

        $gameMatch = GameMatch::find($id);
        $gameMatch->running = $request->running;
        $gameMatch->canceled = $request->canceled;
        $gameMatch->finished_at = Carbon::createFromFormat('Y-m-d\TH:i:s+', $request->finished_at);
        $gameMatch->save();

        return $gameMatch;
    }

    public function store(Request $request)
    {
        Log::info("Enregistrement du match");
        Log::debug($request);
        
        $gameMatch = new GameMatch();        
        DB::transaction(function () use(&$gameMatch, $request) {
            
            $gameMatch->game_id = $request->game_id;
            $gameMatch->canceled = false;
            $gameMatch->tags = "{}";
            $gameMatch->running = true;
            $gameMatch->started_at = now();
            $gameMatch->save();

            $position = 0;
            foreach ($request->players as $playerId) {
                Log::debug("Ajout joueur " . $playerId);

                $team = new Team();
                $team->tags = "{}";
                $team->position = $position;
                $team->match_id = $gameMatch->id;
                $team->save();
                
                $teamPlayer = new TeamPlayer();
                $teamPlayer->position = 0;            
                $teamPlayer->team_id = $team->id;
                $teamPlayer->player_id = $playerId;
                $teamPlayer->save();

                $position++;
            }
        });

        $gameMatchId = $gameMatch->id;
        Log::debug("Game match ID : " . $gameMatchId);
        return $gameMatch;
    }

    public function show($id)
    {
        Log::debug("Recherche le match d'id : " . $id);
        return GameMatch::find($id);
    }
}
