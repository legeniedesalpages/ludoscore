<?php

namespace App\Services;

use App\Models\Game;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ExpansionScoreChanges
{
    private const PROPERTIES = ['min', 'max', 'negatif', 'complex', 'color'];

    public function validate(mixed $changes, array $parentIds): array
    {
        $field = 'expansion_score_changes';
        Validator::make([$field => $changes], [
            $field => ['present', 'array', 'list'],
            "$field.*" => ['required', 'array:baseGameBggId,category,properties'],
            "$field.*.baseGameBggId" => ['required', 'integer', Rule::in($parentIds)],
            "$field.*.category" => ['required', 'string'],
            "$field.*.properties" => ['present', 'array:'.implode(',', self::PROPERTIES)],
            "$field.*.properties.min" => ['nullable', 'integer'],
            "$field.*.properties.max" => ['nullable', 'integer'],
            "$field.*.properties.negatif" => ['sometimes', 'boolean'],
            "$field.*.properties.complex" => ['sometimes', 'boolean'],
            "$field.*.properties.color" => ['sometimes', 'array:name,code,invert,fallback'],
            "$field.*.properties.color.name" => ['required_with:'."$field.*.properties.color", 'string'],
            "$field.*.properties.color.code" => ['required_with:'."$field.*.properties.color", 'string'],
            "$field.*.properties.color.invert" => ['required_with:'."$field.*.properties.color", 'string'],
            "$field.*.properties.color.fallback" => ['present_with:'."$field.*.properties.color", 'array', 'list'],
            "$field.*.properties.color.fallback.*" => ['string'],
        ])->validate();

        $parents = collect(Game::baseGameTagGroups($parentIds))->keyBy('bggId');
        $seen = [];
        $result = [];
        foreach ($changes as $index => $change) {
            $bggId = (int) $change['baseGameBggId'];
            $key = json_encode([$bggId, $change['category']], JSON_THROW_ON_ERROR);
            $categories = collect($parents->get($bggId)['scoreTags'] ?? [])->whereStrict('category', $change['category']);
            if (isset($seen[$key]) || $categories->count() !== 1) {
                throw ValidationException::withMessages([
                    "$field.$index" => 'La catégorie de score doit exister sur un jeu de base compatible et ne peut être modifiée qu’une fois.',
                ]);
            }
            $seen[$key] = true;
            $base = $categories->first();
            $properties = [];
            foreach (self::PROPERTIES as $property) {
                if (array_key_exists($property, $change['properties'])
                    && ! $this->same($property, $change['properties'][$property], $base[$property] ?? null)) {
                    $properties[$property] = $this->normalize($property, $change['properties'][$property]);
                }
            }
            $min = array_key_exists('min', $properties) ? $properties['min'] : $this->normalize('min', $base['min'] ?? null);
            $max = array_key_exists('max', $properties) ? $properties['max'] : $this->normalize('max', $base['max'] ?? null);
            if ($min !== null && $max !== null && $min > $max) {
                throw ValidationException::withMessages([
                    "$field.$index" => 'La valeur minimum ne peut pas dépasser la valeur maximum.',
                ]);
            }
            if ($properties) {
                $result[] = ['baseGameBggId' => $bggId, 'category' => $change['category'], 'properties' => $properties];
            }
        }

        return $result;
    }

    private function normalize(string $property, mixed $value): mixed
    {
        return match ($property) {
            'min', 'max' => $value === null || $value === '' ? null : (int) $value,
            'negatif', 'complex' => (bool) $value,
            default => $value,
        };
    }

    private function same(string $property, mixed $value, mixed $base): bool
    {
        if ($property === 'color') {
            return strtolower((string) ($value['code'] ?? '')) === strtolower((string) ($base['code'] ?? ''));
        }

        return $this->normalize($property, $value) === $this->normalize($property, $base);
    }
}
