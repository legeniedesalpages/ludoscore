<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\User;
use App\Services\PlayerAccess;
use App\Services\PlayerIdentity;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlayerController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        Log::debug("Liste les joueurs");
        $access = app(PlayerAccess::class);
        $players = $access->scopePlayers(Player::with(['personalUsers:users.id,email', 'creators:users.id,email']), $request->user());
        if ($request->query('purpose') === 'match') {
            $access->scopePlayers($players, $request->user(), 'players.id', 'can_add_to_match');
        }

        $players = $players->get();
        if ($request->user()->is_admin) {
            $unassociated = $players->filter(fn (Player $player) => $player->user === null);
            $unassociated->load('creators.selfPlayers:players.id,pseudo');
            foreach ($unassociated as $player) {
                $creator = $player->creator;
                $creatorPlayer = $creator->player;
                $player->setAttribute('creator', [
                    'id' => $creator->id,
                    'email' => $creator->email,
                    'player' => $creatorPlayer === null ? null : [
                        'id' => $creatorPlayer->id,
                        'pseudo' => $creatorPlayer->pseudo,
                    ],
                ]);
            }
        }

        return $players->map(fn (Player $player) => $access->present($player, $request->user()));
    }

    public function show(Request $request, $id)
    {
        Log::debug("Recherche le joueur d'id : " . $id);
        $access = app(PlayerAccess::class);
        $player = $access->scopePlayers(Player::query(), $request->user())->select('players.*')->selectSub(function ($query) use ($access) {
            $access->scopeMatches($query);
            $query->from('matches')
                ->where('matches.canceled', false)
                ->where('matches.running', false)
                ->whereExists(function ($participants) {
                    $participants->selectRaw('1')->from('teams')
                        ->join('team_players', 'team_players.team_id', '=', 'teams.id')
                        ->whereColumn('teams.match_id', 'matches.id')
                        ->whereColumn('team_players.player_id', 'players.id');
                })
                ->selectRaw('COUNT(*)');
        }, 'played_match_count')->findOrFail($id);
        return $access->present($player, $request->user());
    }

    public function update(Request $request, $id)
    {        
        Log::info("Mise à jour du joueur d'id : " . $id);
        Log::debug($request);
        $access = app(PlayerAccess::class);
        $player = $access->scopePlayers(Player::query(), $request->user())->findOrFail($id);
        $permissions = $access->permissions($player, $request->user());
        abort_unless($permissions['can_edit'], 403, 'Modification de ce joueur refusee.');
        return DB::transaction(function () use ($request, $player, $permissions, $access, $id) {
            $player->pseudo = $request->pseudo;
            if ($permissions['can_view_personal_info']) {
                $player->last_name = $request->last_name;
                $player->first_name = $request->first_name;
            }
            $player->prefered_color = $request->prefered_color;
            $player->save();

            if ($request->user()->is_admin && $request->has('user')) {
                $userId = $request->input('user.id');
                app(PlayerIdentity::class)->assign($player, $userId ? User::findOrFail($userId) : null);
            }

            return $access->present($player, $request->user());
        }, 3);
    }

    public function store(Request $request)
    {
        Log::info("Enregistrement du joueur");
        Log::debug($request);
        
        return DB::transaction(function () use ($request) {
            $user = null;
            $userId = $request->input('user.id');
            if ($userId !== null) {
                abort_unless($request->user()->is_admin || $userId == $request->user()->id, 403, 'Association a ce compte refusee.');
                $user = User::whereKey($userId)->lockForUpdate()->firstOrFail();
                abort_if(!$request->user()->is_admin && $user->player_id !== null, 422, 'Ce compte possede deja une identite personnelle.');
            }
            $player = new Player();
            $player->pseudo = $request->pseudo;
            $player->last_name = $request->last_name;
            $player->first_name = $request->first_name;
            $player->prefered_color = $request->prefered_color;
            $player->save();
            $player->users()->attach($request->user()->id, [
                'is_creator' => true, 'can_view_personal_info' => true,
                'can_view_other_matches' => true, 'can_add_to_match' => true,
            ]);

            if ($user !== null) {
                Log::info("Mise à jour de l'utilisateur du joueur d'id : " . $player->id. " -> ".$user->id);
                app(PlayerIdentity::class)->assign($player, $user);
            }

            return app(PlayerAccess::class)->present($player, $request->user());
        }, 3);
    }

    public function associations(Request $request, int $id)
    {
        abort_unless($request->user()->is_admin, 403, 'Acces reserve aux administrateurs.');
        $player = Player::findOrFail($id);
        return $player->users()->get()->map(fn (User $user) => [
            'user_id' => $user->id, 'email' => $user->email,
            'is_creator' => (bool) $user->pivot->is_creator,
            'is_self' => (bool) $user->pivot->is_self,
            'can_view_personal_info' => (bool) $user->pivot->can_view_personal_info,
            'can_view_other_matches' => (bool) $user->pivot->can_view_other_matches,
            'can_add_to_match' => (bool) $user->pivot->can_add_to_match,
            'associated_at' => $user->pivot->associated_at,
        ]);
    }

    public function saveAssociation(Request $request, int $id, int $userId)
    {
        abort_unless($request->user()->is_admin, 403, 'Acces reserve aux administrateurs.');
        $data = $request->validate([
            'can_view_personal_info' => ['required', 'boolean'],
            'can_view_other_matches' => ['required', 'boolean'],
            'can_add_to_match' => ['required', 'boolean'],
            'is_creator' => ['prohibited'], 'is_self' => ['prohibited'], 'associated_at' => ['prohibited'],
        ]);
        $player = Player::findOrFail($id);
        User::findOrFail($userId);
        $player->users()->syncWithoutDetaching([$userId => $data]);
        return $this->associations($request, $id);
    }

    public function deleteAssociation(Request $request, int $id, int $userId)
    {
        abort_unless($request->user()->is_admin, 403, 'Acces reserve aux administrateurs.');
        $player = Player::findOrFail($id);
        DB::transaction(function () use ($player, $userId) {
            Player::whereKey($player->id)->lockForUpdate()->firstOrFail();
            $link = $player->users()->where('users.id', $userId)->first()?->pivot;
            abort_if($link?->is_creator, 422, 'Le lien du createur ne peut pas etre supprime.');
            abort_if($link?->is_self, 422, 'Retirer d abord l identite personnelle de ce compte.');
            $player->users()->detach($userId);
        });
        return response()->noContent();
    }
}
