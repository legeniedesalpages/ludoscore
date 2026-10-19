<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class BggCatalog
{
    private const CACHE_PREFIX = 'bgg.thing.versions.v1.';

    public function request(string $url): array
    {
        Log::debug('Execute BGG request: '.$url);
        $request = Http::timeout(30);
        $token = config('services.boardgamegeek.token');
        if (! empty($token)) {
            $request = $request->withToken($token);
        }
        $response = $request->get($url)->throw();
        $previous = libxml_use_internal_errors(true);
        try {
            $xml = simplexml_load_string($response->body());
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
        if ($xml === false || $response->status() !== 200 || $xml->getName() !== 'items') {
            Log::error('Invalid BGG response', ['url' => $url, 'status' => $response->status()]);
            abort(502, 'BoardGameGeek a renvoyé une réponse invalide. Réessayez plus tard.');
        }

        return json_decode(json_encode($xml, JSON_THROW_ON_ERROR), true, 512, JSON_THROW_ON_ERROR);
    }

    public function things(array $ids): array
    {
        $items = [];
        $missingIds = [];
        foreach (array_unique($ids) as $id) {
            $cached = Cache::get(self::CACHE_PREFIX.$id);
            if ($cached !== null) {
                $items[$id] = $cached;
            } else {
                $missingIds[] = $id;
            }
        }
        foreach (array_chunk($missingIds, 20) as $chunk) {
            $data = $this->request('https://boardgamegeek.com/xmlapi2/thing?stats=1&id='.implode(',', $chunk).'&versions=1');
            foreach ($this->asList($data['item'] ?? []) as $item) {
                $id = (int) $item['@attributes']['id'];
                $items[$id] = $item;
                Cache::put(self::CACHE_PREFIX.$id, $item, now()->addHours(24));
            }
        }

        return $items;
    }

    public function expansionLinks(array $item, bool $inbound): array
    {
        $links = [];
        foreach ($this->asList($item['link'] ?? []) as $link) {
            $attributes = $link['@attributes'] ?? [];
            if (($attributes['type'] ?? null) === 'boardgameexpansion'
                && (($attributes['inbound'] ?? null) === 'true') === $inbound) {
                $links[(int) $attributes['id']] = ['id' => (int) $attributes['id'], 'name' => $attributes['value'] ?? ''];
            }
        }

        return array_values($links);
    }

    public function baseGamesOf(array $expansions, array $knownItems = []): array
    {
        $links = array_map(fn (array $item): array => $this->expansionLinks($item, true), $expansions);
        $parentIds = array_unique(array_merge([], ...array_map(fn (array $itemLinks): array => array_column($itemLinks, 'id'), array_values($links))));
        $parents = $knownItems + $this->things(array_diff($parentIds, array_keys($knownItems)));
        if (array_diff($parentIds, array_keys($parents)) !== []) {
            Log::error('BGG omitted expansion parents', ['ids' => array_diff($parentIds, array_keys($parents))]);
            abort(502, 'Impossible de récupérer les jeux de base sur BoardGameGeek. Réessayez plus tard.');
        }

        return array_map(fn (array $itemLinks): array => array_values(array_map(
            fn (array $link): array => $parents[$link['id']],
            array_filter($itemLinks, fn (array $link): bool => ($parents[$link['id']]['@attributes']['type'] ?? null) === 'boardgame')
        )), $links);
    }

    public function expansionBaseGameIds(int $bggId): array
    {
        $item = $this->things([$bggId])[$bggId] ?? null;
        if ($item === null || ($item['@attributes']['type'] ?? null) !== 'boardgameexpansion') {
            throw ValidationException::withMessages(['is_expansion' => 'Cet identifiant BGG ne correspond pas à une extension.']);
        }
        $parents = $this->baseGamesOf([$bggId => $item])[$bggId];

        return array_map(fn (array $parent): int => (int) $parent['@attributes']['id'], $parents);
    }

    private function asList(array $value): array
    {
        return empty($value) ? [] : (array_is_list($value) ? $value : [$value]);
    }
}
