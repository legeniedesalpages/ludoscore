<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Services\BggCatalog;
use App\Services\ExpansionScoreChanges;
use App\Services\ExpansionTagChanges;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GameController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        Log::debug("Get list of all games");

        $result = Game::forUser($request->user()->id)
            ->selectSub(function($query) {
                $query->select('teams.name')
                    ->from('teams')
                    ->leftJoin('matches', 'matches.winner_team_id', '=', 'teams.id')
                    ->tap(fn ($query) => app(\App\Services\PlayerAccess::class)->scopeMatches($query))
                    ->whereColumn('matches.game_id', 'games.id')
                    ->orderByDesc('matches.started_at')
                    ->limit(1);
            }, 'last_winner')
            ->selectSub(function($query) {
                $query->select('matches.started_at')
                    ->from('matches')
                    ->tap(fn ($query) => app(\App\Services\PlayerAccess::class)->scopeMatches($query))
                    ->whereColumn('matches.game_id', 'games.id')
                    ->orderByDesc('matches.started_at')
                    ->limit(1);
            }, 'last_played')
            ->selectSub(function($query) {
                $query->from('matches')
                    ->tap(fn ($query) => app(\App\Services\PlayerAccess::class)->scopeMatches($query))
                    ->whereColumn('matches.game_id', 'games.id')
                    ->where('matches.canceled', false)
                    ->where('matches.running', false)
                    ->selectRaw('COUNT(*)');
            }, 'played_match_count')
            ->selectSub(function ($query) use ($request) {
                $query->from('matches')
                    ->whereColumn('matches.game_id', 'games.id')
                    ->where('matches.canceled', false)
                    ->where('matches.running', false)
                    ->whereExists(function ($participants) use ($request) {
                        $participants->selectRaw('1')->from('teams')
                            ->join('team_players', 'team_players.team_id', '=', 'teams.id')
                            ->whereColumn('teams.match_id', 'matches.id')
                            ->whereNotNull('team_players.player_id')
                            ->where('team_players.player_id', $request->user()->player_id);
                    })
                    ->selectRaw('COUNT(*)');
            }, 'personal_played_match_count')
            ->selectSub(function ($query) {
                $query->from('game_user as owners')
                    ->whereColumn('owners.game_id', 'games.id')
                    ->where('owners.in_library', true)
                    ->selectRaw('COUNT(*)');
            }, 'library_user_count')
            ->orderBy('games.created_at', 'desc')
            ->toBase()
            ->get();

        $parentLinks = DB::table('game_expansion')->whereIn('extension_id', $result->pluck('id'))
            ->get(['extension_id', 'base_game_bgg_id'])->groupBy('extension_id');
        foreach ($result as $game) {
            $game->base_game_bgg_ids = $parentLinks->get($game->id, collect())
                ->pluck('base_game_bgg_id')->map(fn ($id) => (int) $id)->values()->all();
        }

        return $result;
    }

    private function clean($string) {
        $string = str_replace(' ', '_', $string); // Replaces all spaces with hyphens.
        return preg_replace('/[^A-Za-z0-9\_]/', '', $string); // Removes special chars.
     }

    public function getByBggId(Request $request, $id)
    {
        Log::debug("Get by bgg id : ".$id);
        return $this->withBaseGameProperties(Game::forUser($request->user()->id)->where('games.bgg_id', $id)->firstOrFail());
    }

    public function show(Request $request, $id)
    {
        return $this->withBaseGameProperties(Game::forUser($request->user()->id)->where('games.id', $id)->firstOrFail());
    }

    private function withBaseGameProperties(Game $game): Game
    {
        $parentIds = $game->is_expansion ? $game->baseGames()->pluck('games.bgg_id')->all() : [];
        $game->base_game_colors = $game->is_expansion
            ? Game::baseGameColorGroups($parentIds) : [];
        $game->base_game_tags = $game->is_expansion ? Game::baseGameTagGroups($parentIds) : [];

        return $game;
    }

    private function saveForUser(Game $game, Request $request, ?array $baseGameIds = null): void
    {
        DB::transaction(function () use ($game, $request, $baseGameIds) {
            $game->save();
            if ($baseGameIds !== null) {
                $game->baseGames()->sync($baseGameIds);
            }
            $inLibrary = $request->has('in_library') ? $request->boolean('in_library') : true;
            $request->user()->games()->syncWithoutDetaching([
                $game->id => [
                    'in_library' => $inLibrary,
                    'ownership_date' => $inLibrary ? $request->ownership_date : null,
                ],
            ]);
        });
    }

    /**
     * Store a newly created or update an existing resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $request->validate([
            'bgg_id' => ['required', 'integer', 'min:1'],
            'in_library' => ['sometimes', 'boolean'],
            'ownership_date' => ['nullable', 'date_format:Y-m-d'],
            'is_expansion' => ['sometimes', 'boolean'],
            'additional_players' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ]);
        Log::debug("Saving game : ".$request);

        $existingGame = Game::where('bgg_id', $request->bgg_id)->first();
        $isExpansion = $existingGame ? (bool) $existingGame->is_expansion : $request->boolean('is_expansion');
        $baseGameIds = !$existingGame && $isExpansion
            ? app(BggCatalog::class)->expansionBaseGameIds((int) $request->bgg_id)
            : null;
        $tagChanges = null;
        $scoreChanges = null;
        if ($isExpansion) {
            $parentIds = $baseGameIds ?? DB::table('game_expansion')
                ->where('extension_id', $existingGame->id)->pluck('base_game_bgg_id')->all();
            if (!Game::whereIn('bgg_id', $parentIds)->where('is_expansion', false)->exists()) {
                throw ValidationException::withMessages([
                    'is_expansion' => "Ajoutez d'abord au moins un jeu de base dans le catalogue avant d'ajouter cette extension.",
                ]);
            }
            $request->validate(['player_colors' => ['required', 'json']]);
            if (!is_array(json_decode($request->player_colors, false, 512, JSON_THROW_ON_ERROR))) {
                throw ValidationException::withMessages([
                    'player_colors' => 'Les couleurs supplémentaires doivent être une liste.',
                ]);
            }
            $colors = json_decode($request->player_colors, true, 512, JSON_THROW_ON_ERROR);
            validator(['player_colors' => $colors], [
                'player_colors' => ['present', 'array', 'list'],
                'player_colors.*.code' => ['required', 'string', 'distinct:ignore_case'],
                'player_colors.*.name' => ['required', 'string'],
                'player_colors.*.invert' => ['required', 'string'],
                'player_colors.*.fallback' => ['present', 'array'],
                'player_colors.*.fallback.*' => ['string'],
            ])->validate();
            $baseCodes = collect(Game::baseGameColorGroups($parentIds))
                ->pluck('playerColors')->flatten(1)->pluck('code')->map(fn ($code) => strtolower($code));
            if (collect($colors)->contains(fn ($color) => $baseCodes->contains(strtolower($color['code'])))) {
                throw ValidationException::withMessages([
                    'player_colors' => "Les couleurs du jeu de base ne peuvent pas être ajoutées ou modifiées dans l'extension.",
                ]);
            }
            if ($request->has('expansion_tag_changes')) {
                $tagChanges = app(ExpansionTagChanges::class)->validate($request->input('expansion_tag_changes'), $parentIds);
            }
            if ($request->has('expansion_score_changes')) {
                $scoreChanges = app(ExpansionScoreChanges::class)->validate($request->input('expansion_score_changes'), $parentIds);
            }
        } elseif ($request->has('expansion_tag_changes') && $request->input('expansion_tag_changes') !== []) {
            throw ValidationException::withMessages([
                'expansion_tag_changes' => 'Seule une extension peut modifier les valeurs des tags d’un jeu de base.',
            ]);
        } elseif ($request->has('expansion_score_changes') && $request->input('expansion_score_changes') !== []) {
            throw ValidationException::withMessages([
                'expansion_score_changes' => 'Seule une extension peut modifier les catégories de score d’un jeu de base.',
            ]);
        }

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


        $game = $existingGame ?? new Game;
        $game->title = $request->name;
        $game->is_expansion = $isExpansion;
        $game->thumbnail_id = $uuid_thumbnail;
        $game->image_id = $uuid_image;
        $game->match_tags = $request->match_tags;
        $game->player_tags = $request->player_tags;
        $game->player_colors = $request->player_colors;
        $game->bgg_id = $request->bgg_id;
        $game->score_template = $request->score_template;
        $game->draw_allowed = $request->draw_allowed;
        $game->draw_breaker = $request->draw_breaker;
        if ($isExpansion) {
            $game->additional_players = $request->input('additional_players', $existingGame?->additional_players ?? 0);
            if ($tagChanges !== null) {
                $game->expansion_tag_changes = $tagChanges;
            }
            if ($scoreChanges !== null) {
                $game->expansion_score_changes = $scoreChanges;
            }
        }
        foreach ([
            'is_only_cooperative' => false,
            'min_players' => 0,
            'max_players' => 0,
            'estimated_duration_in_minutes' => 0,
            'quantifiable_score' => true,
            'highest_score_win' => true,
        ] as $property => $default) {
            if (!$isExpansion) {
                $game->{$property} = $property === 'is_only_cooperative' ? $request->boolean($property) : $request->input($property);
            } elseif (!$existingGame) {
                // Compatibility columns are unused for extensions; match rules belong to the selected base game.
                $game->{$property} = $default;
            }
        }

        $this->saveForUser($game, $request, $baseGameIds);
        Log::info(($existingGame ? 'Game updated : ' : 'Game created : ').$game);

        return response(['id' => $game->id], $existingGame ? 200 : 201);
    }
}
