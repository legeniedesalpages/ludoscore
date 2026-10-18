<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\User;
use App\Services\PlayerAccess;
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
        $players = $access->scopePlayers(Player::with('user:id,email,player_id'), $request->user());
        if ($request->query('purpose') === 'match') {
            $access->scopePlayers($players, $request->user(), 'players.id', 'can_add_to_match');
        }

        $players = $players->get();
        if ($request->user()->is_admin) {
            $unassociated = $players->filter(fn (Player $player) => $player->user === null);
            $unassociated->load(['creator:id,email,player_id', 'creator.player:id,pseudo']);
            foreach ($unassociated as $player) {
                $creator = $player->creator;
                $creatorPlayer = $creator->player;
                $player->unsetRelation('creator');
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

            if ($request->user()->is_admin && $request->user != null && $request->user['id'] != null) {
                $user = User::findOrFail($request->user['id']);
                Log::info("Mise à jour de l'utilisateur du joueur d'id : " . $id. " -> ".$request->user['id']);
                $user->player_id = $id;
                $user->save();
                if (!$player->users()->where('users.id', $user->id)->exists()) {
                    $player->users()->attach($user->id, [
                        'is_creator' => $user->id == $player->created_by_user_id,
                        'can_view_personal_info' => true, 'can_view_other_matches' => true, 'can_add_to_match' => true,
                    ]);
                }
            } elseif ($request->user()->is_admin) {
                DB::table('users')->where('player_id', $id)->update(['player_id' => null]);
            }

            return $access->present($player, $request->user());
        });
    }

    public function store(Request $request)
    {
        Log::info("Enregistrement du joueur");
        Log::debug($request);
        
        return DB::transaction(function () use ($request) {
            $player = new Player();
            $player->created_by_user_id = $request->user()->id;
            $player->pseudo = $request->pseudo;
            $player->last_name = $request->last_name;
            $player->first_name = $request->first_name;
            $player->prefered_color = $request->prefered_color;
            $player->save();
            $player->users()->attach($request->user()->id, [
                'is_creator' => true, 'can_view_personal_info' => true,
                'can_view_other_matches' => true, 'can_add_to_match' => true,
            ]);

            if ($request->user != null && $request->user['id'] != null) {
                abort_unless($request->user()->is_admin || $request->user['id'] == $request->user()->id, 403, 'Association a ce compte refusee.');
                $user = User::findOrFail($request->user['id']);
                Log::info("Mise à jour de l'utilisateur du joueur d'id : " . $player->id. " -> ".$request->user['id']);
                $user->player_id = $player->id;
                $user->save();
                if ($user->id != $request->user()->id) {
                    $player->users()->attach($user->id, [
                        'is_creator' => false, 'can_view_personal_info' => true,
                        'can_view_other_matches' => true, 'can_add_to_match' => true,
                    ]);
                }
            }

            return app(PlayerAccess::class)->present($player, $request->user());
        });
    }

    public function associations(Request $request, int $id)
    {
        abort_unless($request->user()->is_admin, 403, 'Acces reserve aux administrateurs.');
        $player = Player::findOrFail($id);
        return $player->users()->get()->map(fn (User $user) => [
            'user_id' => $user->id, 'email' => $user->email,
            'is_creator' => (bool) $user->pivot->is_creator,
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
            'is_creator' => ['prohibited'], 'associated_at' => ['prohibited'],
        ]);
        $player = Player::findOrFail($id);
        User::findOrFail($userId);
        $player->users()->syncWithoutDetaching([$userId => $data + ['is_creator' => $userId == $player->created_by_user_id]]);
        return $this->associations($request, $id);
    }

    public function deleteAssociation(Request $request, int $id, int $userId)
    {
        abort_unless($request->user()->is_admin, 403, 'Acces reserve aux administrateurs.');
        $player = Player::findOrFail($id);
        abort_if($userId == $player->created_by_user_id, 422, 'Le lien du createur ne peut pas etre supprime.');
        abort_if(User::where('id', $userId)->where('player_id', $id)->exists(), 422, 'Retirer d abord l identite personnelle de ce compte.');
        $player->users()->detach($userId);
        return response()->noContent();
    }
}
