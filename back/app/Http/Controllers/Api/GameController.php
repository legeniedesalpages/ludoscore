<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\Game;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class GameController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return Game::orderBy('created_at', 'desc')->get();
    }

    private function clean($string) {
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

        $existingGame = Game::where('bgg_id', $request->bgg_id)->first();
        if ($existingGame) {
            return response(['message'=>'Game with this bggid already exist'], 409);
        }

        $clean_name = Str::limit($this->clean($request->name), 20, '');
        $uuidImage = $clean_name."_".Str::uuid().".jpg";
        Storage::disk('images')->writeStream($uuidImage, fopen($request->image_id, 'r'));
        $uuidThumbnail = $clean_name."_thumb_".Str::uuid().".jpg";
        Storage::disk('images')->writeStream($uuidThumbnail, fopen($request->thumbnail_id, 'r'));

        $isOnlyCooperative = false;
        if ($request->is_only_cooperative) {
            $isOnlyCooperative = true;
        }

        $game = new Game;
        $game->title = $request->name;
        $game->is_expansion = false;
        $game->is_only_cooperative = $isOnlyCooperative;
        $game->min_players = $request->min_players;
        $game->max_players = $request->max_players;
        $game->ownership_date = $request->ownership_date;
        $game->thumbnail_id = $uuidThumbnail;
        $game->image_id = $uuidImage;
        $game->match_tags = $request->match_tags;
        $game->player_tags = $request->player_tags;
        $game->player_colors = $request->player_colors;
        $game->bgg_id = $request->bgg_id;
        $game->save();

        Log::debug("Game created : ".$game);
        return response(['id'=> $game->id], 201);
    }
}
