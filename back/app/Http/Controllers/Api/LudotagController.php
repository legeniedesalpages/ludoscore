<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Services\Ludotag;
use App\Services\PlayerAccess;
use App\Services\PlayerNames;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class LudotagController extends Controller
{
    public function show(Request $request, int $id, PlayerAccess $access): JsonResponse
    {
        $player = $access->scopePlayers(Player::query(), $request->user())->findOrFail($id);

        return response()->json(['ludotag' => Ludotag::format($player->ludotag)])
            ->header('Cache-Control', 'private, no-store');
    }

    public function associate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ludotag' => ['required', 'string', 'max:32'],
            'personal_pseudo' => ['nullable', 'string', 'max:255'],
        ]);
        $player = Ludotag::findPlayer($data['ludotag']);

        DB::transaction(function () use ($player, $request, $data): void {
            $locked = Player::whereKey($player->id)->lockForUpdate()->firstOrFail();
            abort_if($locked->replaced_by_player_id !== null, 422, 'Ce joueur est remplace. Demandez le ludotag du joueur actif.');
            if (! $player->users()->where('users.id', $request->user()->id)->exists()) {
                $pseudo = trim($data['personal_pseudo'] ?? '');
                $player->users()->attach($request->user()->id, [
                    'is_creator' => false, 'is_self' => false,
                    'can_view_personal_info' => false, 'can_view_other_matches' => false,
                    'can_add_to_match' => true,
                    'personal_pseudo' => $pseudo !== '' && $pseudo !== $locked->pseudo ? $pseudo : null,
                ]);
            }
        }, 3);

        $presented = app(PlayerNames::class)->present(collect([$player]))->first();

        return response()->json(['id' => $player->id, 'pseudo' => $presented->pseudo])
            ->header('Cache-Control', 'private, no-store');
    }
}
