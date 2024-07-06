<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use Illuminate\Support\Facades\Log;

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
}
