<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\Game;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GameController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return Game::get();
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    function clean($string) {
        $string = str_replace(' ', '_', $string); // Replaces all spaces with hyphens.
        return preg_replace('/[^A-Za-z0-9\_]/', '', $string); // Removes special chars.
     }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        Log::debug("Saving game : ".$request->name);

        $existingGame = Game::where('bgg_id', $request->bggId)->first();
        if ($existingGame) {
            return response(['message'=>'Game with this bggid already exist'], 409);
        }

        $clean_name = Str::limit($this->clean($request->name), 20, '');
        $uuidImage = $clean_name."_".Str::uuid().".jpg";
        Storage::disk('images')->writeStream($uuidImage, fopen($request->image_id, 'r'));
        $uuidThumbnail = $clean_name."_thumb_".Str::uuid().".jpg";
        Storage::disk('images')->writeStream($uuidThumbnail, fopen($request->thumbnail_id, 'r'));

        $game = new Game;
        $game->title = $request->name;
        $game->is_expansion = false;
        $game->is_only_cooperative = $request->isOnlyCooperative;
        $game->min_players = $request->minPlayers;
        $game->max_players = $request->maxPlayers;
        $game->ownership_date = $request->ownershipDate;
        $game->thumbnail_id = $uuidThumbnail;
        $game->image_id = $uuidImage;
        $game->match_tags = $request->matchTags;
        $game->player_tags = $request->playerTags;
        $game->player_colors = $request->playerColors;
        $game->bgg_id = $request->bggId;
        $game->save();

        Log::debug("Game created : ".$game);
        return response(['id'=> $game->id], 201);
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }
}
