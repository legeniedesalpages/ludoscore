<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GameMatchController extends Controller
{
    public function index()
    {
        return GameMatch::get();
    }

    public function update(Request $request, $id)
    {        
    }

    public function store(Request $request)
    {
        Log::debug($request);
        $gameMatch = new GameMatch();
        $gameMatch->game_id = $request->game_id;
        $gameMatch->canceled = false;
        $gameMatch->tags = "{}";
        $gameMatch->running = true;
        $gameMatch->started_at = now();
        $gameMatch->save();

        return $gameMatch->id;
    }
}
