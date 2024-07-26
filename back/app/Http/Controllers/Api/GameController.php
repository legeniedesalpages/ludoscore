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
        Log::debug("Get list of all games");

        $result = DB::table('games')
            ->select('games.*')
            ->selectSub(function($query) {
                $query->select('teams.name')
                    ->from('teams')
                    ->leftJoin('matches', 'matches.winner_team_id', '=', 'teams.id')
                    ->whereColumn('matches.game_id', 'games.id')
                    ->orderByDesc('matches.started_at')
                    ->limit(1);
            }, 'last_winner')
            ->selectSub(function($query) {
                $query->select('matches.started_at')
                    ->from('matches')
                    ->whereColumn('matches.game_id', 'games.id')
                    ->orderByDesc('matches.started_at')
                    ->limit(1);
            }, 'last_played')
            ->orderBy('games.created_at', 'desc')
            ->get();

        return $result;
    }

    private function clean($string) {
        $string = str_replace(' ', '_', $string); // Replaces all spaces with hyphens.
        return preg_replace('/[^A-Za-z0-9\_]/', '', $string); // Removes special chars.
     }

    public function getByBggId($id)
    {
        Log::debug("Get by bgg id : ".$id);
        return Game::where('bgg_id', $id)->first();
    }

    /**
     * Store a newly created or update an existing resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        Log::debug("Saving game : ".$request);

        $existingGame = Game::where('bgg_id', $request->bgg_id)->first();

        $clean_name = Str::limit($this->clean($request->name), 20, '');

        if ($existingGame == null || $existingGame->image_id == null) {
            $uuid_image = $clean_name."_".Str::uuid().".jpg";
            Storage::disk('images')->writeStream($uuid_image, fopen($request->image_url_from_bgg, 'r'));
        } else {
            $uuid_image = $existingGame->image_id;
        }
        Log::debug("Image : ".$uuid_image);

        if ($existingGame == null || $existingGame->thumbnail_id == null) {
            $uuid_thumbnail = $clean_name."_thumb_".Str::uuid().".jpg";
            Storage::disk('images')->writeStream($uuid_thumbnail, fopen($request->thumbnail_url_from_bgg, 'r'));
        } else {
            $uuid_thumbnail = $existingGame->thumbnail_id;
        }
        Log::debug("Thumbnail : ".$uuid_thumbnail);


        $is_only_cooperative = false;
        if ($request->is_only_cooperative) {
            $is_only_cooperative = true;
        }


        if ($existingGame) {
            $existingGame->title = $request->name;
            $existingGame->is_expansion = false;
            $existingGame->is_only_cooperative = $is_only_cooperative;
            $existingGame->min_players = $request->min_players;
            $existingGame->max_players = $request->max_players;
            $existingGame->ownership_date = $request->ownership_date;
            $existingGame->thumbnail_id = $uuid_thumbnail;
            $existingGame->image_id = $uuid_image;
            $existingGame->match_tags = $request->match_tags;
            $existingGame->player_tags = $request->player_tags;
            $existingGame->player_colors = $request->player_colors;
            $existingGame->bgg_id = $request->bgg_id;
            $existingGame->score_template = $request->score_template;
            $existingGame->estimated_duration_in_minutes = $request->estimated_duration_in_minutes;
            $existingGame->quantifiable_score = $request->quantifiable_score;
            $existingGame->draw_allowed = $request->draw_allowed;
            $existingGame->draw_breaker = $request->draw_breaker;

            $existingGame->save();
            Log::info("Game updated : ".$existingGame);
            return response(['id'=> $existingGame->id], 200);

        } else {
            $game = new Game;
            $game->title = $request->name;
            $game->is_expansion = false;
            $game->is_only_cooperative = $is_only_cooperative;
            $game->min_players = $request->min_players;
            $game->max_players = $request->max_players;
            $game->ownership_date = $request->ownership_date;
            $game->thumbnail_id = $uuid_thumbnail;
            $game->image_id = $uuid_image;
            $game->match_tags = $request->match_tags;
            $game->player_tags = $request->player_tags;
            $game->player_colors = $request->player_colors;
            $game->bgg_id = $request->bgg_id;
            $game->score_template = $request->score_template;
            $game->estimated_duration_in_minutes = $request->estimated_duration_in_minutes;
            $game->quantifiable_score = $request->quantifiable_score;
            $game->highest_score_win = $request->highest_score_win;
            $game->draw_allowed = $request->draw_allowed;
            $game->draw_breaker = $request->draw_breaker;

            $game->save();
            Log::info("Game created : ".$game);
            return response(['id'=> $game->id], 201);
        }
    }
}
