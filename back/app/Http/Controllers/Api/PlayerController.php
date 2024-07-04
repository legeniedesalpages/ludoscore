<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlayerController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        Log::debug("Liste les joueurs");
        return Player::get();
    }

    public function show($id)
    {
        Log::debug("Recherche le joueur d'id : " . $id);
        return Player::find($id);
    }

    public function update(Request $request, $id) {        
        Log::info("Mise à jour du joueur d'id : " . $id. " et de macthId : " . $request->match_id);
        Log::debug($request);
        
        $matchId = $request->match_id;

        DB::table('teams')
            ->where('match_id', $matchId)
            ->join('team_players', 'teams.id', '=', 'team_players.team_id')
            ->where('team_players.player_id', $id)
            ->update(['score' => $request->score]);

        return Player::find($id);
    }
}
