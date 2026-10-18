<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Services\PlayerAccess;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        Log::debug("Team list");
        return Team::whereIn('match_id', app(PlayerAccess::class)->scopeMatches(\Illuminate\Support\Facades\DB::table('matches'))->select('id'))->get();
    }

    public function show($id)
    {
        Log::debug("Get team of id : " . $id);
        $team = Team::findOrFail($id);
        app(PlayerAccess::class)->authorizeMatch($team->match_id);
        return $team;
    }

    public function update(Request $request, $id)
    {        
        Log::info("Update team of id: " . $id. ", score:".$request->score);
        Log::debug($request);

        $team = Team::findOrFail($id);
        app(PlayerAccess::class)->authorizeMatch($team->match_id);
        $team->name = $request->name;
        $team->color = $request->color;
        $team->tags = $request->tags;
        if (array_key_exists('position', $request->input())) {
            $team->position = $request->position;
        }
        $team->score = $request->score;
        $team->score_details = $request->score_details;
        $team->save();
        if ($team->wasChanged(['name', 'color', 'tags', 'score', 'score_details'])) {
            \App\Models\GameMatch::whereKey($team->match_id)->update(['story' => null]);
        }
        return $team;
    }

    public function store(Request $request)
    {
        Log::info("Saving team");
        Log::debug($request);
    }
}
