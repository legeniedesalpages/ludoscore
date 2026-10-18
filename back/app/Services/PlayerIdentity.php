<?php

namespace App\Services;

use App\Models\Player;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PlayerIdentity
{
    public function assign(Player $player, ?User $user): void
    {
        DB::transaction(function () use ($player, $user) {
            if ($user !== null) {
                User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            }
            $locked = Player::whereKey($player->id)->lockForUpdate()->firstOrFail();
            abort_if($locked->replaced_by_player_id !== null, 422, 'Ce joueur est remplace.');
            DB::table('player_user')->where('player_id', $player->id)->where('is_self', true)->update(['is_self' => false]);
            if ($user !== null) {
                DB::table('player_user')->where('user_id', $user->id)->where('is_self', true)->update(['is_self' => false]);
                $link = DB::table('player_user')->where('player_id', $player->id)->where('user_id', $user->id)->first();
                if ($link === null) {
                    $player->users()->attach($user->id, [
                        'is_self' => true, 'is_creator' => false,
                        'can_view_personal_info' => true, 'can_view_other_matches' => true, 'can_add_to_match' => true,
                    ]);
                } else {
                    $player->users()->updateExistingPivot($user->id, ['is_self' => true]);
                }
                $user->unsetRelation('selfPlayers');
            }
            $player->unsetRelation('personalUsers');
        }, 3);
    }
}
