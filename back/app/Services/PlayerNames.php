<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

final class PlayerNames
{
    public function teams(Collection $teams): Collection
    {
        if ($teams->isEmpty()) {
            return $teams;
        }
        $players = DB::table('team_players as name_participants')
            ->join('players as name_players', 'name_players.id', '=', 'name_participants.player_id')
            ->leftJoin('players as original_players', 'original_players.id', '=', 'name_participants.original_player_id')
            ->whereIn('name_participants.team_id', $teams->pluck('id'))
            ->select('name_participants.team_id', 'name_players.id', 'name_players.pseudo', 'original_players.pseudo as previous_pseudo')
            ->get();
        $canonical = $players->pluck('pseudo', 'team_id');
        $byTeam = $this->present($players)->groupBy('team_id');
        foreach ($teams as $team) {
            $participants = $byTeam->get($team->id, collect());
            $player = $participants->first();
            $team->display_name = $team->name;
            $team->creator_pseudo = null;
            if ($participants->count() === 1 && in_array($team->name, [$canonical->get($team->id), $player->previous_pseudo, $player->pseudo], true)) {
                $team->display_name = $player->pseudo;
                $team->creator_pseudo = $player->creator_pseudo;
            }
        }

        return $teams;
    }

    public function present(Collection $players, string $idColumn = 'id', ?User $user = null): Collection
    {
        $user ??= Auth::user();
        $aliases = $user?->id === null || $players->isEmpty() ? collect() : DB::table('player_user')
            ->where('user_id', $user->id)->where('is_creator', false)
            ->whereIn('player_id', $players->pluck($idColumn)->filter()->unique())
            ->whereNotNull('personal_pseudo')->pluck('personal_pseudo', 'player_id');

        foreach ($players as $player) {
            $canonical = $player->creator_pseudo ?? $player->pseudo;
            $alias = $aliases->get($player->{$idColumn});
            $player->pseudo = $alias ?? $canonical;
            $player->creator_pseudo = $alias !== null && $alias !== $canonical ? $canonical : null;
            $player->personal_pseudo = $alias;
        }

        return $players;
    }
}
