<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\TeamPlayer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GameMatchController extends Controller
{
    public function index(Request $request)
    {
        $page = $request->query('page');
        $size = $request->query('size');
        Log::info("Liste des match, page : " . $page . " size : " . $size);

        $matches = DB::table('matches')
            ->select('matches.*', 'games.*', 'matches.id as id_match')
            ->join('games', 'games.id', '=', 'matches.game_id')
            ->orderBy('matches.started_at', 'desc')
            ->offset($page * $size)
            ->limit($size)
            ->get();

        $matches->each(function ($match) {
            $match->match_id = $match->id;
            $match->teams = DB::table('teams')
                ->where('teams.match_id', $match->id_match)
                ->get();
        });

        return $matches;
    }

    public function matchCount()
    {
        return GameMatch::count();
    }

    public function update(Request $request, $id)
    {
        Log::info("Update match id : " . $id);
        Log::debug($request);

        $gameMatch = GameMatch::find($id);
        $gameMatch->running = $request->running;
        $gameMatch->canceled = $request->canceled;
        $gameMatch->winner_team_id = $request->winner_team_id;
        Log::info("winner_team_id : " . $gameMatch->winner_team_id);
        $gameMatch->finished_at = now(); //Carbon::createFromFormat('Y-m-d\TH:i:s+', $request->finished_at);
        $gameMatch->save();

        return $gameMatch;
    }

    public function store(Request $request)
    {
        Log::info("Request");
        Log::debug($request);
        $match = $request->match;

        Log::info("Match");
        Log::debug($match);

        $returnedteams = [];
        $gameMatch = new GameMatch();
        DB::transaction(function () use (&$gameMatch, $match, $request, $returnedteams) {

            Log::debug("Game Id:" . $match['gameId']);
            $gameMatch->game_id = $match['gameId'];
            $gameMatch->canceled = false;
            $gameMatch->running = true;
            $gameMatch->started_at = now();
            $gameMatch->tags = $match['tags'];
            $gameMatch->save();


            $position_equipe = 0;
            foreach ($request->teams as $t) {
                $team_request = (object)$t;
                Log::debug("Add team " . print_r($team_request, true));

                $team = new Team();
                $team->color = $team_request->color;
                $team->tags = $team_request->tags;
                $team->position = $position_equipe;
                $team->match_id = $gameMatch->id;
                $team->name = $team_request->name;
                $team->save();


                $returnPlayers = [];
                $position_joueur = 0;
                foreach ($team_request->players as $p) {

                    $player = (object)$p;
                    $teamPlayer = new TeamPlayer();
                    $teamPlayer->position = $position_joueur;
                    $teamPlayer->team_id = $team->id;
                    $teamPlayer->player_id = $player->playerId;
                    $teamPlayer->save();
                    $position_joueur++;

                    array_push($returnPlayers, $teamPlayer->id);
                }
                $position_equipe++;

                array_push($returnedteams, [$team->id, $returnPlayers]);
                Log::debug($returnedteams);
            }

            $gameMatch->teams = $returnedteams;
        });

        $gameMatchId = $gameMatch->id;
        Log::debug("Newly created match id : " . $gameMatchId);
        Log::debug($returnedteams);
        return $gameMatch;
    }

    public function findRunning()
    {
        Log::info("Recherche du match en cours");
        return GameMatch::where('running', true)->first();
    }

    public function previousMatch($playerid, $gameid)
    {
        Log::debug("Get previousMatch, player : " . $playerid . " game : " . $gameid);
        return DB::table('teams')
            ->join('matches', 'matches.id', '=', 'teams.match_id')
            ->where('matches.game_id', $gameid)
            ->where('matches.canceled', false)
            ->join('team_players', 'teams.id', '=', 'team_players.team_id')
            ->where('team_players.player_id', $playerid)
            ->orderBy('matches.started_at', 'desc')
            ->get('teams.*');
    }

    public function show($id)
    {
        Log::debug("Recherche le match d'id : " . $id);
        return GameMatch::find($id);
    }
}
