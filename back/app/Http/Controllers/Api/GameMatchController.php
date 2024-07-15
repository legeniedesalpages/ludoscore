<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\TeamPlayer;
use App\Models\Player;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GameMatchController extends Controller
{
    public function index()
    {
        return GameMatch::get();
    }

    public function update(Request $request, $id)
    {
        Log::info("Update match id : " . $id);
        Log::debug($request);

        $gameMatch = GameMatch::find($id);
        $gameMatch->running = $request->running;
        $gameMatch->canceled = $request->canceled;
        $gameMatch->finished_at = Carbon::createFromFormat('Y-m-d\TH:i:s+', $request->finished_at);
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

    public function updatePlayerScore(Request $request)
    {
        $id = $request->id;
        Log::info("Mise à jour du joueur d'id : " . $id . " et de macthId : " . $request->match_id);
        Log::debug($request);

        $matchId = $request->match_id;

        DB::table('teams')
            ->where('match_id', $matchId)
            ->join('team_players', 'teams.id', '=', 'team_players.team_id')
            ->where('team_players.player_id', $id)
            ->update(['score' => $request->score]);

        return Player::find($id);
    }

    public function updatePlayerMatch(Request $request)
    {
        $id = $request->id;
        Log::info("Mise à jour du joueur d'id : " . $id . " et de macthId : " . $request->match_id);
        Log::debug($request);

        $matchId = $request->match_id;

        DB::table('teams')
            ->where('match_id', $matchId)
            ->join('team_players', 'teams.id', '=', 'team_players.team_id')
            ->where('team_players.player_id', $id)
            ->update(['tags' => $request->tags, "color" => $request->color]);

        return Player::find($id);
    }
}
