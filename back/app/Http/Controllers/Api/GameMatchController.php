<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Models\GameMatch;
use App\Models\MatchPhoto;
use App\Models\Team;
use App\Models\TeamPlayer;
use App\Services\Analytics\LocationService;
use App\Services\PlayerAccess;
use App\Models\Player;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GameMatchController extends Controller
{
    public function destroy ($id)
    {
        app(PlayerAccess::class)->authorizeMatch((int) $id);
        Log::info("Suppression du match id : " . $id);
        DB::transaction(function () use ($id) {
            DB::table('match_photos')
                ->where('match_id', $id)
                ->delete();

            DB::table('matches')
                ->where('id', $id)
                ->update(['winner_team_id' => null]);

            DB::table('team_players')
                ->whereIn('team_id', function ($query) use ($id) {
                    $query->select('id')
                        ->from('teams')
                        ->where('match_id', $id);
                })
                ->delete();

            DB::table('teams')
                ->where('match_id', $id)
                ->delete();

            DB::table('matches')
                ->where('id', $id)
                ->delete();
        });
    }

    public function storePhoto(Request $request, $id)
    {
        app(PlayerAccess::class)->authorizeMatch((int) $id);
        $request->validate([
            'photo' => 'required|file|mimes:jpeg,png,webp|max:8192',
        ]);

        $gameMatch = GameMatch::findOrFail($id);
        $file = $request->file('photo');
        Log::info("Ajout de la photo du match id : " . $id);

        MatchPhoto::updateOrCreate(
            ['match_id' => $gameMatch->id],
            [
                'mime_type' => $file->getMimeType(),
                'data' => base64_encode(file_get_contents($file->getRealPath())),
            ]
        );

        return response()->noContent();
    }

    public function destroyPhoto($id)
    {
        app(PlayerAccess::class)->authorizeMatch((int) $id);
        $gameMatch = GameMatch::findOrFail($id);
        Log::info("Suppression de la photo du match id : " . $id);
        MatchPhoto::where('match_id', $gameMatch->id)->delete();

        return response()->noContent();
    }

    public function showPhoto($id)
    {
        app(PlayerAccess::class)->authorizeMatch((int) $id);
        $photo = MatchPhoto::where('match_id', $id)->first();
        if ($photo === null) {
            return response()->noContent();
        }

        return response(base64_decode($photo->data), 200, [
            'Content-Type' => $photo->mime_type,
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function index(Request $request)
    {
        $page = $request->query('page');
        $size = $request->query('size');
        Log::info("Liste des match, page : " . $page . " size : " . $size);

        $matches = Game::select('matches.*')->forUser($request->user()->id)
            ->addSelect('matches.id as id_match')
            ->join('matches', 'games.id', '=', 'matches.game_id')
            ->tap(fn ($query) => app(PlayerAccess::class)->scopeMatches($query))
            ->orderBy('matches.started_at', 'desc')
            ->offset($page * $size)
            ->limit($size)
            ->toBase()
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
        return app(PlayerAccess::class)->scopeMatches(GameMatch::query())->count();
    }

    public function update(Request $request, $id)
    {
        app(PlayerAccess::class)->authorizeMatch((int) $id);
        Log::info("Update match id : " . $id);
        Log::debug($request);

        $gameMatch = GameMatch::find($id);
        $gameMatch->running = $request->running;
        $gameMatch->canceled = $request->canceled;
        $gameMatch->winner_team_id = $request->winner_team_id;
        if ($request->has('tags')) {
            $gameMatch->tags = $request->tags;
        }
        Log::info("winner_team_id : " . $gameMatch->winner_team_id);
        $gameMatch->finished_at = now(); //Carbon::createFromFormat('Y-m-d\TH:i:s+', $request->finished_at);
        $gameMatch->save();

        return $gameMatch;
    }

    /**
     * Correction a posteriori d'une partie de l'historique : dates (la date de fin peut être nulle),
     * scores des équipes et vainqueur.
     */
    public function updateHistory(Request $request, $id)
    {
        app(PlayerAccess::class)->authorizeMatch((int) $id);
        $gameMatch = GameMatch::findOrFail($id);

        $data = $request->validate([
            'started_at' => ['required', 'date_format:Y-m-d H:i:s'],
            'finished_at' => ['nullable', 'date_format:Y-m-d H:i:s', 'after_or_equal:started_at'],
            'winner_team_id' => ['nullable', 'integer'],
            'running' => ['required', 'boolean'],
            'canceled' => ['required', 'boolean'],
            'teams' => ['required', 'array'],
            'teams.*.id' => ['required', 'integer'],
            'teams.*.score' => ['nullable', 'integer', 'between:-32768,32767'],
            'teams.*.score_details' => ['nullable', 'array'],
        ]);

        $teamIds = DB::table('teams')->where('match_id', $gameMatch->id)->pluck('id')->all();
        foreach ($data['teams'] as $team) {
            if (!in_array($team['id'], $teamIds)) {
                abort(422, "L'équipe " . $team['id'] . " n'appartient pas à cette partie");
            }
        }
        if ($data['running'] && $data['canceled']) {
            abort(422, "Une partie ne peut pas être à la fois en cours et abandonnée");
        }
        if ($data['running'] && GameMatch::where('running', true)->where('id', '!=', $gameMatch->id)->exists()) {
            abort(422, "Une autre partie est déjà en cours");
        }
        $winnerTeamId = $data['winner_team_id'] ?? null;
        if ($winnerTeamId !== null && !in_array($winnerTeamId, $teamIds)) {
            abort(422, "L'équipe gagnante n'appartient pas à cette partie");
        }

        Log::info("Update history of match id : " . $id);
        DB::transaction(function () use ($gameMatch, $data, $winnerTeamId) {
            $gameMatch->started_at = $data['started_at'];
            $gameMatch->finished_at = $data['finished_at'] ?? null;
            $gameMatch->winner_team_id = $winnerTeamId;
            $gameMatch->running = $data['running'];
            $gameMatch->canceled = $data['canceled'];
            $gameMatch->save();

            foreach ($data['teams'] as $teamData) {
                $team = Team::find($teamData['id']);
                $team->score = $teamData['score'] ?? null;
                if (array_key_exists('score_details', $teamData)) {
                    $team->score_details = $teamData['score_details'] === null
                        ? null
                        : json_encode($teamData['score_details']);
                }
                $team->save();
            }
        });

        return response()->json(['id' => $gameMatch->id]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'teams' => ['required', 'array', 'min:1'],
            'teams.*.players' => ['required', 'array', 'min:1'],
            'teams.*.players.*.playerId' => ['required', 'integer'],
        ]);
        $ids = collect($data['teams'])->flatMap(fn ($team) => collect($team['players'])->pluck('playerId'))->unique();
        $allowed = app(PlayerAccess::class)->scopePlayers(Player::query(), $request->user(), 'players.id', 'can_add_to_match')
            ->whereIn('players.id', $ids)->count();
        abort_unless($allowed === $ids->count(), 403, 'Ajout de certains joueurs a une partie refuse.');
        $visible = $request->user()->is_admin
            || $ids->contains($request->user()->player_id)
            || DB::table('player_user')->where('user_id', $request->user()->id)
                ->whereIn('player_id', $ids)->where('can_view_other_matches', true)->exists();
        abort_unless($visible, 403, 'Vous ne pouvez pas creer une partie a laquelle vous n aurez pas acces.');
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

            $lat = $match['latitude'] ?? null;
            $lon = $match['longitude'] ?? null;
            if (is_numeric($lat) && is_numeric($lon) && abs($lat) <= 90 && abs($lon) <= 180) {
                $gameMatch->latitude = round((float) $lat, 6);
                $gameMatch->longitude = round((float) $lon, 6);
                $gameMatch->location_name = app(LocationService::class)->reverse((float) $lat, (float) $lon);
            }
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
        return app(PlayerAccess::class)->scopeMatches(GameMatch::where('running', true))->first();
    }

    public function previousMatch($playerid, $gameid)
    {
        Log::debug("Get previousMatch, player : " . $playerid . " game : " . $gameid);
        return DB::table('teams')
            ->join('matches', 'matches.id', '=', 'teams.match_id')
            ->tap(fn ($query) => app(PlayerAccess::class)->scopeMatches($query))
            ->where('matches.game_id', $gameid)
            ->where('matches.canceled', false)
            ->join('team_players', 'teams.id', '=', 'team_players.team_id')
            ->where('team_players.player_id', $playerid)
            ->orderBy('matches.started_at', 'desc')
            ->get('teams.*');
    }

    /**
     * Couleur utilisée par un joueur lors de la partie la plus récente du même jeu.
     * Si "with" (ids de joueurs séparés par des virgules) est fourni, seules les parties où
     * tous ces joueurs étaient aussi présents sont considérées.
     */
    public function previousTeamColor(Request $request, $gameid, $playerid)
    {
        $with = array_filter(array_map('intval', explode(',', (string) $request->query('with', ''))));

        $query = DB::table('teams')
            ->join('matches', 'matches.id', '=', 'teams.match_id')
            ->join('team_players', 'team_players.team_id', '=', 'teams.id')
            ->where('matches.game_id', $gameid)
            ->where('matches.canceled', false)
            ->where('matches.running', false)
            ->where('team_players.player_id', $playerid)
            ->whereNotNull('teams.color')
            ->where('teams.color', '!=', 'Aucune');
        app(PlayerAccess::class)->scopeMatches($query);

        foreach ($with as $otherPlayerId) {
            $query->whereExists(function ($sub) use ($otherPlayerId) {
                $sub->select(DB::raw(1))
                    ->from('teams as other_teams')
                    ->join('team_players as other_tp', 'other_tp.team_id', '=', 'other_teams.id')
                    ->whereColumn('other_teams.match_id', 'matches.id')
                    ->where('other_tp.player_id', $otherPlayerId);
            });
        }

        $color = $query->orderByDesc('matches.started_at')->orderByDesc('matches.id')->value('teams.color');

        return response()->json(['color' => $color]);
    }

    public function show(Request $request, $id)
    {
        app(PlayerAccess::class)->authorizeMatch((int) $id);
        Log::debug("Recherche le match d'id : " . $id);

        $returnedMatch = Game::select('matches.*')->forUser($request->user()->id)
        ->addSelect('matches.id as id_match')
        ->join('matches', 'games.id', '=', 'matches.game_id')
        ->where('matches.id', $id)
        ->toBase()
        ->first();

        $returnedMatch->teams = DB::table('teams')
                ->where('teams.match_id', $returnedMatch->id_match)
                ->get();

        $returnedMatch->teams->each(function ($team) {
            $team->players = DB::table('players')
                ->join('team_players', 'team_players.player_id', '=', 'players.id')
                ->where('team_players.team_id', $team->id)
                ->get()->map(function ($player) {
                    $permissions = app(PlayerAccess::class)->permissions(Player::findOrFail($player->player_id), request()->user());
                    if (!$permissions['can_view_personal_info']) {
                        unset($player->first_name, $player->last_name);
                    }
                    return $player;
                });
        });
            

        return $returnedMatch;
    }
}
