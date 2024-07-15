<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
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
        return Team::get();
    }

    public function show($id)
    {
        Log::debug("Get team of id : " . $id);
        return Team::find($id);
    }

    public function update(Request $request, $id)
    {        
        Log::info("Update team of id: " . $id. ", score:".$request->score);
        Log::debug($request);

        $team = Team::find($id);
        $team->name = $request->name;
        $team->color = $request->color;
        $team->tags = $request->tags;
        if (array_key_exists('position', $request->input())) {
            $team->position = $request->position;
        }
        $team->score = $request->score;
        $team->save();
        return $team;
    }

    public function store(Request $request)
    {
        Log::info("Saving team");
        Log::debug($request);
    }
}
