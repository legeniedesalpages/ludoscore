<?php

declare(strict_types=1);

namespace App\Services\Analytics;

use App\Services\PlayerAccess;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

final class AgeStatistics
{
    public const MIN_AGE_GAP = 10;

    public function charts(Collection $matches, Collection $participants, ?int $playerId = null): array
    {
        $known = $participants->filter(fn ($p) => ($p->birth_date ?? null) !== null || ($p->birth_year ?? null) !== null);
        $user = Auth::user();
        if ($known->isNotEmpty() && $user !== null && ! $user->is_admin) {
            $visible = app(PlayerAccess::class)->scopePlayers(DB::table('players'), $user, permission: 'can_view_personal_info')
                ->whereIn('players.id', $known->pluck('player_id'))->pluck('players.id')->all();
            $known = $known->whereIn('player_id', $visible);
        }
        $births = $known->keyBy('player_id');
        $byMatch = $participants->groupBy('match_id');
        $distribution = [];
        $comparison = [];
        $unknown = 0;
        $approximate = 0;
        foreach ($matches as $match) {
            $group = $byMatch->get($match->id, collect())->whereNotNull('player_id')->unique('player_id');
            $ages = [];
            foreach ($group as $participant) {
                $birth = $births->get($participant->player_id);
                $age = $match->started_at && $birth !== null ? $this->age($birth, Carbon::parse($match->started_at)) : null;
                if ($age !== null) {
                    $ages[$participant->player_id] = $age;
                }
                if ($playerId !== null && (int) $participant->player_id !== $playerId) {
                    continue;
                }
                if ($age === null) {
                    $unknown++;

                    continue;
                }
                $approximate += (int) $age['approximate'];
                $bucket = (int) floor($age['estimate'] / 10) * 10;
                $distribution[$bucket] = ($distribution[$bucket] ?? 0) + 1;
            }

            // Complete coverage avoids comparing selectively known opponents.
            if ($group->count() < 2 || count($ages) !== $group->count() || $group->contains(fn ($p) => (bool) ($p->is_cooperative ?? false))) {
                continue;
            }
            $youngest = min(array_column($ages, 'estimate'));
            $oldest = max(array_column($ages, 'estimate'));
            $young = $group->filter(fn ($p) => $ages[$p->player_id]['estimate'] === $youngest);
            $old = $group->filter(fn ($p) => $ages[$p->player_id]['estimate'] === $oldest);
            $youngMax = $young->max(fn ($p) => $ages[$p->player_id]['max']);
            $oldMin = $old->min(fn ($p) => $ages[$p->player_id]['min']);
            if ($oldMin - $youngMax < self::MIN_AGE_GAP || $young->pluck('team_id')->intersect($old->pluck('team_id'))->isNotEmpty()) {
                continue;
            }
            foreach (['Plus jeunes' => $young, 'Plus âgés' => $old] as $label => $cohort) {
                foreach ($cohort as $participant) {
                    if ($playerId !== null && (int) $participant->player_id !== $playerId) {
                        continue;
                    }
                    $comparison[$label] ??= ['players' => [], 'matches' => [], 'participations' => 0, 'wins' => 0, 'decided' => 0];
                    $result = &$comparison[$label];
                    $result['players'][$participant->player_id] = true;
                    $result['matches'][$match->id] = true;
                    $result['participations']++;
                    if ($match->winner_team_id !== null) {
                        $result['decided']++;
                        $result['wins'] += (int) ((int) $match->winner_team_id === (int) $participant->team_id);
                    }
                    unset($result);
                }
            }
        }
        ksort($distribution);
        $rows = [];
        foreach ($comparison as $label => $result) {
            $rows[] = [$label, count($result['players']), count($result['matches']), $result['participations'],
                $result['wins'], $result['decided'], $result['decided'] ? round(100 * $result['wins'] / $result['decided'], 1) : null];
        }

        return [
            [
                'title' => 'Âge des participants au moment des parties', 'type' => 'bar',
                'columns' => ['Âge', 'Participations'],
                'rows' => collect($distribution)->map(fn ($count, $age) => [$age.'–'.($age + 9).' ans', $count])->values()->all(),
                'comment' => 'Une participation par joueur et par partie. Âge à la date de la partie ; année seule : âge approximatif (année de la partie moins année de naissance). '
                    .$approximate.' participation(s) avec âge approximatif ; '.$unknown.' sans âge disponible (naissance absente, inaccessible, postérieure à la partie ou début non renseigné).',
            ],
            [
                'title' => 'Plus jeunes / plus âgés : au moins '.self::MIN_AGE_GAP.' ans d’écart', 'type' => 'table',
                'columns' => ['Groupe', 'Joueurs distincts', 'Parties', 'Participations', 'Victoires', 'Avec vainqueur', 'Taux de victoire (%)'],
                'rows' => $rows,
                'comment' => 'Comparaison des âges extrêmes de chaque partie, pas des générations fixes. Les âges intermédiaires sont exclus. '
                    .'Uniquement les jeux non exclusivement coopératifs où tous les âges sont disponibles et où les groupes extrêmes sont dans des équipes différentes. '
                    .'L’écart de '.self::MIN_AGE_GAP.' ans doit être garanti même avec une année seule (incertitude d’un an). Une victoire par joueur de l’équipe gagnante. '
                    .'Taux sur les participations avec vainqueur uniquement. Moins de 3 parties par groupe : simple tendance. '
                    .'Les différences de jeux, d’équipes et l’expérience peuvent expliquer les écarts ; aucune causalité liée à l’âge ne peut être conclue.'
                    .($rows === [] ? ' Aucune partie comparable avec les données accessibles.' : ''),
            ],
        ];
    }

    /** @return array{estimate:int,min:int,max:int,approximate:bool}|null */
    private function age(object $birth, Carbon $at): ?array
    {
        if (($birth->birth_date ?? null) !== null) {
            $date = Carbon::parse($birth->birth_date)->startOfDay();
            if ($date->greaterThan($at)) {
                return null;
            }
            $age = (int) $date->diffInYears($at);

            return ['estimate' => $age, 'min' => $age, 'max' => $age, 'approximate' => false];
        }
        $age = $at->year - (int) $birth->birth_year;
        if ($age < 0) {
            return null;
        }

        return ['estimate' => $age, 'min' => max(0, $age - 1), 'max' => $age, 'approximate' => true];
    }
}
