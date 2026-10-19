<?php

namespace App\Services;

use App\Models\Game;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ExpansionTagChanges
{
    public function validate(mixed $changes, array $parentIds): array
    {
        Validator::make(['expansion_tag_changes' => $changes], [
            'expansion_tag_changes' => ['present', 'array', 'list'],
            'expansion_tag_changes.*' => ['required', 'array:baseGameBggId,scope,category,addedValues,removedValues'],
            'expansion_tag_changes.*.baseGameBggId' => ['required', 'integer', Rule::in($parentIds)],
            'expansion_tag_changes.*.scope' => ['required', Rule::in(['player', 'match'])],
            'expansion_tag_changes.*.category' => ['required', 'string'],
            'expansion_tag_changes.*.addedValues' => ['present', 'array', 'list'],
            'expansion_tag_changes.*.removedValues' => ['present', 'array', 'list'],
            'expansion_tag_changes.*.addedValues.*' => ['required', 'string'],
            'expansion_tag_changes.*.removedValues.*' => ['required', 'string'],
        ])->validate();

        $parents = collect(Game::baseGameTagGroups($parentIds))->keyBy('bggId');
        $seen = [];
        $result = [];
        foreach ($changes as $index => $change) {
            $change['baseGameBggId'] = (int) $change['baseGameBggId'];
            $key = json_encode([$change['baseGameBggId'], $change['scope'], $change['category']], JSON_THROW_ON_ERROR);
            $parent = $parents->get($change['baseGameBggId']);
            $tags = collect($parent[$change['scope'] === 'player' ? 'playerTags' : 'matchTags'] ?? [])
                ->whereStrict('category', $change['category']);
            if (isset($seen[$key]) || $tags->count() !== 1) {
                throw ValidationException::withMessages([
                    "expansion_tag_changes.$index" => 'Le tag doit exister sur un jeu de base compatible et ne peut être modifié qu’une fois.',
                ]);
            }
            $seen[$key] = true;
            $added = $change['addedValues'];
            $removed = $change['removedValues'];
            $values = $tags->first()['names'];
            if (count($added) !== count(array_unique($added)) || count($removed) !== count(array_unique($removed))
                || array_intersect($added, $removed) || array_intersect($added, $values) || array_diff($removed, $values)) {
                throw ValidationException::withMessages([
                    "expansion_tag_changes.$index" => 'Valeurs incohérentes avec le tag du jeu de base. Réinitialisez la modification puis réessayez.',
                ]);
            }
            if ($added || $removed) {
                $result[] = $change;
            }
        }

        return $result;
    }
}
