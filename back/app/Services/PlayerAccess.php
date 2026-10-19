<?php

namespace App\Services;

use App\Models\Player;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PlayerAccess
{
    public function scopePlayers(Builder|EloquentBuilder $query, User $user, string $column = 'players.id', ?string $permission = null, bool $includeReplaced = false): Builder|EloquentBuilder
    {
        if (!$includeReplaced) {
            $query->whereNull('players.replaced_by_player_id');
        }
        if ($user->is_admin) {
            return $query;
        }

        return $query->whereExists(function ($links) use ($user, $column, $permission) {
            $links->selectRaw('1')->from('player_user as access_links')
                ->whereColumn('access_links.player_id', $column)->where('access_links.user_id', $user->id);
            if ($permission !== null) {
                $links->where('access_links.'.$permission, true);
            }
        });
    }

    public function scopeMatches(Builder|EloquentBuilder $query, string $column = 'matches.id', ?User $user = null): Builder|EloquentBuilder
    {
        $user ??= Auth::user();
        // Background analytics without a recipient retain their global dataset.
        if ($user === null || $user->is_admin) {
            return $query;
        }

        return $query->whereExists(function ($participants) use ($user, $column) {
            $participants->selectRaw('1')->from('teams as access_teams')
                ->join('team_players as access_players', 'access_players.team_id', '=', 'access_teams.id')
                ->whereColumn('access_teams.match_id', $column)
                ->where(function ($allowed) use ($user) {
                    if ($user->player_id !== null) {
                        $allowed->where('access_players.player_id', $user->player_id)->orWhereExists(
                            fn ($links) => $this->matchLinks($links, $user)
                        );
                    } else {
                        $allowed->whereExists(fn ($links) => $this->matchLinks($links, $user));
                    }
                });
        });
    }

    private function matchLinks(Builder $query, User $user): void
    {
        $query->selectRaw('1')->from('player_user as access_links')
            ->whereColumn('access_links.player_id', 'access_players.player_id')
            ->where('access_links.user_id', $user->id)
            ->where('access_links.can_view_other_matches', true);
    }

    public function authorizeMatch(int $id): void
    {
        abort_unless($this->scopeMatches(DB::table('matches'))->where('matches.id', $id)->exists(), 403, 'Acces a cette partie refuse.');
    }

    public function permissions(Player $player, User $user): array
    {
        $link = $player->users()->where('users.id', $user->id)->first()?->pivot;
        $active = $player->replaced_by_player_id === null;

        return [
            'is_creator' => (bool) $link?->is_creator,
            'can_view_personal_info' => (bool) ($user->is_admin || $link?->can_view_personal_info),
            'can_view_other_matches' => (bool) ($user->is_admin || $link?->can_view_other_matches),
            'can_access_matches' => (bool) ($user->is_admin || $link?->can_view_other_matches || $user->player_id == $player->id),
            'can_add_to_match' => $active && (bool) ($user->is_admin || $link?->can_add_to_match),
            'can_edit' => $active && (bool) ($user->is_admin || $user->player_id == $player->id || $link?->is_creator),
            'can_merge' => $active && (bool) $link?->is_creator && $player->personalUsers->isEmpty(),
            'can_manage_associations' => $active && (bool) ($user->is_admin || $link?->is_self || $link?->is_creator),
            'can_personalize' => $active && $link !== null && ! $link->is_creator,
        ];
    }

    public function present(Player $player, User $user, bool $personalize = true): Player
    {
        $permissions = $this->permissions($player, $user);
        $player->loadMissing(['personalUsers:users.id,email', 'creators:users.id,email']);
        $player->getAttribute('gravatar');
        $player->setAttribute('permissions', $permissions);
        if (! $permissions['can_view_personal_info']) {
            $player->makeHidden(['first_name', 'last_name', 'user', 'birth_date', 'birth_year']);
        } else {
            $player->makeVisible(['birth_date', 'birth_year']);
        }
        if ($personalize) {
            app(PlayerNames::class)->present(collect([$player]), user: $user);
        }

        return $player;
    }
}
