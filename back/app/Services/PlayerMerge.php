<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Player;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class PlayerMerge
{
    public function run(User $actor, int $sourceId, string $ludotag, bool $confirm = false): array
    {
        return DB::transaction(function () use ($actor, $sourceId, $ludotag, $confirm): array {
            $survivor = Ludotag::findPlayer($ludotag);
            abort_if($survivor->id === $sourceId, 422, 'Impossible de fusionner un joueur avec lui-meme.');
            $players = Player::whereIn('id', [$sourceId, $survivor->id])->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $source = $players->get($sourceId);
            abort_if($source === null, 404, 'Joueur introuvable.');
            $survivor = $players->get($survivor->id);
            abort_if($source->replaced_by_player_id !== null || $survivor->replaced_by_player_id !== null, 422, 'Un de ces joueurs est deja remplace. Utilisez le ludotag du joueur actif.');
            $actorLink = DB::table('player_user')->where('player_id', $source->id)->where('user_id', $actor->id)
                ->lockForUpdate()->first();
            abort_unless($actorLink?->is_creator, 403, 'Vous devez etre le createur du joueur a remplacer.');
            $personalLink = DB::table('player_user')->where('player_id', $source->id)->where('is_self', true)
                ->lockForUpdate()->first();
            abort_if($personalLink !== null, 422, 'Le joueur personnel d un compte utilisateur ne peut pas etre remplace.');

            $participants = DB::table('team_players')->whereIn('player_id', [$source->id, $survivor->id])
                ->orderBy('id')->lockForUpdate()->get();
            $teams = DB::table('teams')->whereIn('id', $participants->pluck('team_id'))->orderBy('id')
                ->lockForUpdate()->pluck('match_id', 'id');
            $byMatch = $participants->groupBy(fn ($row) => $teams[$row->team_id]);
            $conflicts = $byMatch->filter(fn ($rows) => $rows->pluck('player_id')->unique()->count() > 1)
                ->keys()->map(fn ($id) => (int) $id)->sort()->values()->all();
            $affected = $participants->where('player_id', $source->id);
            $result = [
                'replaced' => ['id' => $source->id, 'pseudo' => $source->pseudo],
                'survivor' => ['id' => $survivor->id, 'pseudo' => $survivor->pseudo],
                'matchCount' => $affected->map(fn ($row) => $teams[$row->team_id])->unique()->count(),
                'participationCount' => $affected->count(),
                'conflictMatchIds' => $conflicts,
            ];
            if (! $confirm) {
                return $result;
            }
            if ($conflicts !== []) {
                throw ValidationException::withMessages([
                    'conflicts' => 'Fusion bloquee : les deux joueurs participent deja aux parties '.implode(', ', $conflicts).'.',
                ]);
            }

            $links = DB::table('player_user')->whereIn('player_id', [$source->id, $survivor->id])
                ->orderBy('id')->lockForUpdate()->get();
            $mergeId = DB::table('player_merges')->insertGetId([
                'replaced_player_id' => $source->id, 'surviving_player_id' => $survivor->id,
                'requested_by_user_id' => $actor->id, 'created_at' => now(),
                'associations_before' => json_encode($links, JSON_THROW_ON_ERROR),
            ]);
            foreach ($affected as $row) {
                DB::table('player_merge_participations')->insert([
                    'player_merge_id' => $mergeId, 'team_player_id' => $row->id, 'participation_id' => $row->id,
                    'match_id' => $teams[$row->team_id], 'team_id' => $row->team_id,
                    'previous_player_id' => $source->id, 'original_player_id' => $row->original_player_id,
                ]);
                DB::table('team_players')->where('id', $row->id)->update([
                    'player_id' => $survivor->id, 'original_player_id' => $row->original_player_id ?? $source->id,
                ]);
            }
            foreach ($links->where('player_id', $source->id) as $link) {
                $existing = $links->where('player_id', $survivor->id)->firstWhere('user_id', $link->user_id);
                $sourcePseudo = $link->personal_pseudo ?? $source->pseudo;
                $personalPseudo = $sourcePseudo !== $survivor->pseudo ? $sourcePseudo : null;
                if ($existing === null) {
                    DB::table('player_user')->insert([
                        'player_id' => $survivor->id, 'user_id' => $link->user_id,
                        'is_creator' => false, 'is_self' => false,
                        'can_view_personal_info' => false,
                        'can_view_other_matches' => false,
                        'can_add_to_match' => false,
                        'personal_pseudo' => $personalPseudo,
                        'associated_at' => now(), 'updated_at' => now(),
                    ]);
                } elseif (! $existing->is_creator && $existing->personal_pseudo === null && $personalPseudo !== null) {
                    DB::table('player_user')->where('id', $existing->id)->update([
                        'personal_pseudo' => $personalPseudo, 'updated_at' => now(),
                    ]);
                }
            }
            $source->replaced_by_player_id = $survivor->id;
            $source->replaced_at = now();
            $source->save();

            return $result + ['mergeId' => $mergeId];
        }, 3);
    }
}
