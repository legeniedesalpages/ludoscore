<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\User;
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

    public function update(Request $request, $id)
    {        
        Log::info("Mise à jour du joueur d'id : " . $id);
        Log::debug($request);
        $player = Player::find($id);
        $player->pseudo = $request->pseudo;
        $player->last_name = $request->last_name;
        $player->first_name = $request->first_name;
        $player->prefered_color = $request->prefered_color;
        $player->save();

        if ($request->user != null && $request->user['id'] != null) {
            $user = User::find($request->user['id']);
            Log::info("Mise à jour de l'utilisateur du joueur d'id : " . $id. " -> ".$request->user['id']);            
            $user->player_id = $id;
            $user->save();
        } else {
            DB::table('users')->where('player_id', $id)->update(['player_id' => null]);
        }

        return $player;
    }

    public function store(Request $request)
    {
        Log::info("Enregistrement du joueur");
        Log::debug($request);
        
        $player = new Player();
        $player->pseudo = $request->pseudo;
        $player->last_name = $request->last_name;
        $player->first_name = $request->first_name;
        $player->prefered_color = $request->prefered_color;
        $player->save();

        if ($request->user != null && $request->user['id'] != null) {
            $user = User::find($request->user['id']);
            Log::info("Mise à jour de l'utilisateur du joueur d'id : " . $player->id. " -> ".$request->user['id']);            
            $user->player_id = $player->id;
            $user->save();
        }

        return $player;
    }
}
