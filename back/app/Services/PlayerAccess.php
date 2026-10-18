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
    public function scopePlayers(Builder|EloquentBuilder $query, User $user, string $column = 'players.id', ?string $permission = null): Builder|EloquentBuilder
    {
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

        return [
            'is_creator' => (bool) $link?->is_creator,
            'can_view_personal_info' => (bool) ($user->is_admin || $link?->can_view_personal_info),
            'can_view_other_matches' => (bool) ($user->is_admin || $link?->can_view_other_matches),
            'can_add_to_match' => (bool) ($user->is_admin || $link?->can_add_to_match),
            'can_edit' => (bool) ($user->is_admin || $user->player_id == $player->id || $link?->is_creator),
        ];
    }

    public function present(Player $player, User $user): Player
    {
        $permissions = $this->permissions($player, $user);
        $player->loadMissing('user:id,email,player_id');
        $player->getAttribute('gravatar');
        $player->setAttribute('permissions', $permissions);
        if (! $permissions['can_view_personal_info']) {
            $player->makeHidden(['first_name', 'last_name', 'user']);
        }

        return $player;
    }
}
