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
        $players = $access->scopePlayers(Player::with(['personalUsers:users.id,email', 'creators:users.id,email']), $request->user(),
            includeReplaced: $request->user()->is_admin && $request->boolean('include_replaced') && $request->query('purpose') !== 'match');
        if ($request->query('purpose') === 'match') {
            $access->scopePlayers($players, $request->user(), 'players.id', 'can_add_to_match');
        }

        $players = $players->get();
        $players->load('creators.selfPlayers:players.id,pseudo');
        foreach ($players as $player) {
            $player->setAttribute('creator_name', $player->creator->player?->pseudo);
        }
        if ($request->user()->is_admin) {
            $unassociated = $players->filter(fn (Player $player) => $player->user === null);
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

        app(\App\Services\PlayerNames::class)->present($players, user: $request->user());
        return $players->map(fn (Player $player) => $access->present($player, $request->user(), personalize: false));
    }

    public function show(Request $request, $id)
    {
        Log::debug("Recherche le joueur d'id : " . $id);
        $access = app(PlayerAccess::class);
        $player = $access->scopePlayers(Player::query(), $request->user(), includeReplaced: true)->select('players.*')->selectSub(function ($query) use ($access) {
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
        $access = app(PlayerAccess::class);
        $player = $access->scopePlayers(Player::query(), $request->user())->findOrFail($id);
        $permissions = $access->permissions($player, $request->user());
        abort_unless($permissions['can_edit'], 403, 'Modification de ce joueur refusee.');
        $birth = $permissions['can_view_personal_info'] ? $this->validateBirth($request) : [];
        return DB::transaction(function () use ($request, $player, $permissions, $access, $birth) {
            $player = Player::whereKey($player->id)->lockForUpdate()->firstOrFail();
            abort_if($player->replaced_by_player_id !== null, 422, 'Ce joueur est remplace et ne peut plus etre modifie.');
            $player->pseudo = $request->pseudo;
            if ($permissions['can_view_personal_info']) {
                $player->last_name = $request->last_name;
                $player->first_name = $request->first_name;
                $player->forceFill($birth);
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
        
        $birth = $this->validateBirth($request);
        return DB::transaction(function () use ($request, $birth) {
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
            $player->forceFill($birth);
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

    private function validateBirth(Request $request): array
    {
        $data = $request->validate([
            'birth_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:0001-01-01', 'before_or_equal:today', 'prohibits:birth_year'],
            'birth_year' => ['nullable', 'integer', 'min:1', 'max:'.now()->year, 'prohibits:birth_date'],
        ], [
            'birth_date.date_format' => 'La date de naissance doit être une date valide au format AAAA-MM-JJ.',
            'birth_date.before_or_equal' => 'La date de naissance ne peut pas être dans le futur.',
            'birth_date.prohibits' => 'Renseignez soit la date complète, soit uniquement l’année de naissance.',
            'birth_year.prohibits' => 'Renseignez soit la date complète, soit uniquement l’année de naissance.',
            'birth_year.integer' => 'L’année de naissance doit être un entier.',
            'birth_year.min' => 'L’année de naissance doit être positive.',
            'birth_year.max' => 'L’année de naissance ne peut pas être dans le futur.',
        ]);

        // Omitted fields preserve existing information; an explicit null clears it.
        if ($request->exists('birth_date') || $request->exists('birth_year')) {
            return ['birth_date' => $data['birth_date'] ?? null, 'birth_year' => $data['birth_year'] ?? null];
        }

        return [];
    }

    public function associations(Request $request, int $id)
    {
        $player = Player::findOrFail($id);
        abort_unless(app(PlayerAccess::class)->permissions($player, $request->user())['can_manage_associations'], 403, 'Gestion des associations de ce joueur refusee.');
        return response()->json($player->users()->orderBy('player_user.associated_at', 'desc')->get()->map(fn (User $user) => [
            'user_id' => $user->id, 'email' => $user->email,
            'is_creator' => (bool) $user->pivot->is_creator,
            'is_self' => (bool) $user->pivot->is_self,
            'can_view_personal_info' => (bool) $user->pivot->can_view_personal_info,
            'can_view_other_matches' => (bool) $user->pivot->can_view_other_matches,
            'can_add_to_match' => (bool) $user->pivot->can_add_to_match,
            'associated_at' => $user->pivot->associated_at,
        ]))->header('Cache-Control', 'private, no-store');
    }

    public function savePersonalPseudo(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        $data = $request->validate(['personal_pseudo' => ['present', 'nullable', 'string', 'max:255']]);
        return DB::transaction(function () use ($request, $id, $data) {
            $player = Player::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_if($player->replaced_by_player_id !== null, 422, 'Ce joueur est remplace.');
            $link = $player->users()->where('users.id', $request->user()->id)->first()?->pivot;
            abort_unless($link !== null && ! $link->is_creator, 403, 'Le pseudo personnel est reserve aux autres utilisateurs associes.');
            $pseudo = trim($data['personal_pseudo'] ?? '');
            $player->users()->updateExistingPivot($request->user()->id, [
                'personal_pseudo' => $pseudo === '' || $pseudo === $player->pseudo ? null : $pseudo,
            ]);

            return response()->json(app(PlayerAccess::class)->present($player, $request->user()))
                ->header('Cache-Control', 'private, no-store');
        }, 3);
    }

    public function saveAssociation(Request $request, int $id, int $userId)
    {
        $data = $request->validate([
            'can_view_personal_info' => ['required', 'boolean'],
            'can_view_other_matches' => ['required', 'boolean'],
            'can_add_to_match' => ['required', 'boolean'],
            'is_creator' => ['prohibited'], 'is_self' => ['prohibited'], 'associated_at' => ['prohibited'],
        ]);
        $player = Player::findOrFail($id);
        User::findOrFail($userId);
        DB::transaction(function () use ($request, $player, $userId, $data) {
            $locked = Player::whereKey($player->id)->lockForUpdate()->firstOrFail();
            abort_if($locked->replaced_by_player_id !== null, 422, 'Ce joueur est remplace.');
            abort_unless(app(PlayerAccess::class)->permissions($locked, $request->user())['can_manage_associations'], 403, 'Gestion des associations de ce joueur refusee.');
            if (! $request->user()->is_admin) {
                abort_unless($locked->users()->where('users.id', $userId)->exists(), 403, 'Seuls les droits des utilisateurs deja associes peuvent etre modifies.');
            }
            $player->users()->syncWithoutDetaching([$userId => $data]);
        }, 3);
        return $this->associations($request, $id);
    }

    public function deleteAssociation(Request $request, int $id, int $userId)
    {
        abort_unless($request->user()->is_admin, 403, 'Acces reserve aux administrateurs.');
        $player = Player::findOrFail($id);
        DB::transaction(function () use ($player, $userId) {
            $locked = Player::whereKey($player->id)->lockForUpdate()->firstOrFail();
            abort_if($locked->replaced_by_player_id !== null, 422, 'Ce joueur est remplace.');
            $link = $player->users()->where('users.id', $userId)->first()?->pivot;
            abort_if($link?->is_creator, 422, 'Le lien du createur ne peut pas etre supprime.');
            abort_if($link?->is_self, 422, 'Retirer d abord l identite personnelle de ce compte.');
            $player->users()->detach($userId);
        });
        return response()->noContent();
    }
}
