<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Game;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GameSearchController extends Controller
{

    public function searchById($id)
    {
        $items = $this->fetchThings([(int) $id]);

        if (isset($items[(int) $id])) {
            return json_encode($this->extractDetail($items[(int) $id]));
        }
        else {
            Log::info("No detail results");
            return json_encode("");
        }
    }

    public const TYPE_GAME = 'game';
    public const TYPE_EXPANSION = 'expansion';
    public const TYPE_ALL = 'all';

    private const BGG_URL = 'https://boardgamegeek.com/xmlapi2/';
    private const MAX_THING_IDS = 20;
    private const MAX_DISPLAYED_EXPANSIONS = 10;
    private const THING_CACHE_HOURS = 24;
    private const THING_CACHE_PREFIX = 'bgg.thing.versions.v1.';

    public function searchByName($searchText, $type = self::TYPE_GAME)
    {
        $searchText = (string) $searchText;
        $results = match ($type) {
            self::TYPE_EXPANSION => $this->searchExpansions($searchText),
            self::TYPE_ALL => $this->searchGamesAndExpansions($searchText),
            default => $this->searchGames($searchText),
        };

        Log::info('Found ' . count($results) . ' results for query ' . $searchText . ' (' . $type . ')');
        return json_encode($this->applyLibraryStatus($results));
    }

    private function searchGames(string $searchText): array
    {
        // La recherche BGG "boardgame" remonte aussi les extensions : on les exclut grâce à une recherche dédiée
        $expansionIds = array_flip($this->searchIds($searchText, 'boardgameexpansion'));
        $gameIds = array_values(array_filter(
            $this->searchIds($searchText, 'boardgame'),
            fn($id) => !isset($expansionIds[$id])
        ));

        $results = [];
        foreach ($this->fetchThings(array_slice($gameIds, 0, self::MAX_THING_IDS)) as $item) {
            if ($this->itemType($item) === self::TYPE_GAME) {
                $results[] = $this->fullEntry($item) + ['expansions' => []];
            }
        }
        return $this->sortByPopularity($results);
    }

    private function searchExpansions(string $searchText): array
    {
        $ids = array_slice($this->searchIds($searchText, 'boardgameexpansion'), 0, self::MAX_THING_IDS);
        $expansions = $this->fetchThings($ids);
        $baseGames = $this->baseGamesOf($expansions);

        $results = [];
        foreach ($expansions as $id => $item) {
            $results[] = array_merge($this->fullEntry($item), [
                'type' => self::TYPE_EXPANSION,
                'baseGames' => array_map(
                    fn($baseGame) => ['id' => $baseGame['id'], 'name' => $baseGame['name']],
                    $baseGames[$id]
                ),
            ]);
        }
        return $this->sortByPopularity($results);
    }

    private function searchGamesAndExpansions(string $searchText): array
    {
        $ids = array_slice($this->searchIds($searchText, 'boardgame'), 0, self::MAX_THING_IDS);

        $matchedGames = [];
        $matchedExpansions = [];
        foreach ($this->fetchThings($ids) as $id => $item) {
            if ($this->itemType($item) === self::TYPE_EXPANSION) {
                $matchedExpansions[$id] = $item;
            } else {
                $matchedGames[$id] = $item;
            }
        }

        $expansionLinks = array_map(fn($item) => $this->expansionLinks($item, false), $matchedGames);
        $otherExpansions = $this->fetchThings(array_diff(
            array_merge([], ...array_map(fn($links) => array_column($links, 'id'), array_values($expansionLinks))),
            array_keys($matchedExpansions)
        ));

        $results = [];
        foreach ($matchedGames as $id => $item) {
            $expansions = array_map(function ($link) use ($matchedExpansions, $otherExpansions) {
                if (isset($matchedExpansions[$link['id']])) {
                    return $this->fullEntry($matchedExpansions[$link['id']]);
                }
                if (isset($otherExpansions[$link['id']])) {
                    return array_merge($this->fullEntry($otherExpansions[$link['id']]), ['matched' => false]);
                }
                return $this->compactEntry($link['id'], $link['name'], self::TYPE_EXPANSION);
            }, $expansionLinks[$id]);
            $results[$id] = $this->fullEntry($item) + $this->limitExpansions($expansions);
        }

        foreach ($this->baseGamesOf($matchedExpansions, $matchedGames) as $id => $baseGames) {
            if (empty($baseGames)) {
                $results['expansion-' . $id] = $this->fullEntry($matchedExpansions[$id]) + ['baseGames' => []];
                continue;
            }
            foreach ($baseGames as $baseGame) {
                if (isset($matchedGames[$baseGame['id']])) {
                    continue;
                }
                if (!isset($results[$baseGame['id']])) {
                    $results[$baseGame['id']] = array_merge($baseGame, ['matched' => false, 'expansions' => [], 'hiddenExpansionCount' => 0]);
                }
                if (!in_array($id, array_column($results[$baseGame['id']]['expansions'], 'id'), true)) {
                    $results[$baseGame['id']]['expansions'][] = $this->fullEntry($matchedExpansions[$id]);
                }
            }
        }

        $results = array_map(
            fn($result) => isset($result['expansions']) ? array_merge($result, ['expansions' => $this->sortByPopularity($result['expansions'])]) : $result,
            $results
        );
        return $this->sortByPopularity(array_values($results));
    }

    /**
     * Extensions d'un jeu trouvé par la recherche : seules les plus populaires sont renvoyées.
     */
    private function limitExpansions(array $expansions): array
    {
        $expansions = $this->sortByPopularity($expansions);
        return [
            'expansions' => array_slice($expansions, 0, self::MAX_DISPLAYED_EXPANSIONS),
            'hiddenExpansionCount' => max(0, count($expansions) - self::MAX_DISPLAYED_EXPANSIONS),
        ];
    }

    /**
     * Jeux de base de chaque extension. BGG lie aussi une extension aux extensions qu'elle complète
     * (ex. "Prelude 2" -> "Venus Next") : seuls les éléments de type jeu sont conservés.
     */
    private function baseGamesOf(array $expansions, array $knownItems = []): array
    {
        $links = array_map(fn($item) => $this->expansionLinks($item, true), $expansions);
        $parentIds = array_unique(array_merge([], ...array_map(fn($itemLinks) => array_column($itemLinks, 'id'), array_values($links))));
        $parents = $knownItems + $this->fetchThings(array_diff($parentIds, array_keys($knownItems)));

        return array_map(fn($itemLinks) => array_values(array_map(
            fn($link) => $this->fullEntry($parents[$link['id']]),
            array_filter($itemLinks, fn($link) => isset($parents[$link['id']]) && $this->itemType($parents[$link['id']]) === self::TYPE_GAME)
        )), $links);
    }

    private function searchIds(string $searchText, string $bggType): array
    {
        $data = $this->requester(self::BGG_URL . 'search?' . http_build_query(['type' => $bggType, 'query' => $searchText]));
        return array_map(fn($item) => (int) $item['@attributes']['id'], $this->asList($data['item'] ?? []));
    }

    private function fetchThings(array $ids): array
    {
        $items = [];
        $missingIds = [];
        foreach (array_unique($ids) as $id) {
            $cached = Cache::get(self::THING_CACHE_PREFIX . $id);
            if ($cached !== null) {
                $items[$id] = $cached;
            } else {
                $missingIds[] = $id;
            }
        }

        foreach (array_chunk($missingIds, self::MAX_THING_IDS) as $chunk) {
            $data = $this->requester(self::BGG_URL . 'thing?stats=1&id=' . implode(',', $chunk) . '&versions=1');
            foreach ($this->asList($data['item'] ?? []) as $item) {
                $id = (int) $item['@attributes']['id'];
                $items[$id] = $item;
                Cache::put(self::THING_CACHE_PREFIX . $id, $item, now()->addHours(self::THING_CACHE_HOURS));
            }
        }
        return $items;
    }

    private function fullEntry(array $item): array
    {
        return [
            'id' => (int) $item['@attributes']['id'],
            'type' => $this->itemType($item),
            'name' => $this->extractName($item),
            'thumbnailUrlFromBgg' => $this->extractThumbnail($item) ?: null,
            'year' => $this->toInt($this->extractYear($item)),
            'popularity' => $this->toInt($this->extractPopularity($item)),
            'matched' => true,
        ];
    }

    private function compactEntry(int $id, string $name, string $type): array
    {
        return [
            'id' => $id,
            'type' => $type,
            'name' => $name,
            'thumbnailUrlFromBgg' => null,
            'year' => null,
            'popularity' => null,
            'matched' => false,
        ];
    }

    /**
     * Liens "boardgameexpansion" d'un élément BGG : pour un jeu, ses extensions ;
     * pour une extension ($inbound = true), les jeux qu'elle étend.
     */
    private function expansionLinks(array $item, bool $inbound): array
    {
        $links = [];
        foreach ($this->asList($item['link'] ?? []) as $link) {
            $attributes = $link['@attributes'] ?? [];
            if (($attributes['type'] ?? null) === 'boardgameexpansion'
                && (($attributes['inbound'] ?? null) === 'true') === $inbound) {
                $links[] = ['id' => (int) $attributes['id'], 'name' => $attributes['value'] ?? ''];
            }
        }
        return $links;
    }

    private function itemType(array $item): string
    {
        return ($item['@attributes']['type'] ?? null) === 'boardgameexpansion' ? self::TYPE_EXPANSION : self::TYPE_GAME;
    }

    private function sortByPopularity(array $results): array
    {
        usort($results, fn($a, $b) => ($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0));
        return $results;
    }

    private function applyLibraryStatus(array $results): array
    {
        $ids = [];
        foreach ($results as $result) {
            $ids[] = $result['id'];
            array_push($ids, ...array_column($result['expansions'] ?? [], 'id'), ...array_column($result['baseGames'] ?? [], 'id'));
        }

        $games = empty($ids) ? collect() : Game::forUser(auth()->id())->whereIn('games.bgg_id', array_unique($ids))->get()->keyBy('bgg_id');
        $withStatus = function (array $entry) use ($games) {
            $game = $games->get($entry['id']);
            return array_merge($entry, [
                'registered' => $game !== null,
                'owned' => $game !== null && (bool) $game->in_library,
            ]);
        };

        return array_map(function ($result) use ($withStatus) {
            foreach (['expansions', 'baseGames'] as $children) {
                if (isset($result[$children])) {
                    $result[$children] = array_map($withStatus, $result[$children]);
                }
            }
            return $withStatus($result);
        }, $results);
    }

    private function asList($value): array
    {
        if (empty($value) || !is_array($value)) {
            return [];
        }
        return array_is_list($value) ? $value : [$value];
    }

    private function toInt($value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }

    private function extractDetail($item)
    {
        return array(
            'id' => $item['@attributes']['id'],
            'thumbnail_url_from_bgg' => $this->extractThumbnail($item),
            'image_url_from_bgg' => $this->extractImage($item),
            'name' => $this->extractName($item),
            'year' => $this->extractYear($item),
            'popularity' => $this->extractPopularity($item),
            'minplayers' => $this->extractMinPlayer($item),
            'maxplayers' => $this->extractMaxPlayer($item)
        );
    }

    private function extractMinPlayer($item)
    {
        return $item['minplayers']['@attributes']['value'] ?? "";
    }

    private function extractMaxPlayer($item)
    {
        return $item['maxplayers']['@attributes']['value'] ?? "";
    }

    private function extractThumbnail($item)
    {
        return is_string($item['thumbnail'] ?? null) ? $item['thumbnail'] : "";
    }

    private function extractImage($item)
    {
        return is_string($item['image'] ?? null) ? $item['image'] : "";
    }

    private function extractYear($item)
    {
        return $item['yearpublished']['@attributes']['value'] ?? "";
    }

    private function extractPopularity($item)
    {
        $usersRated = $item['statistics']['ratings']['usersrated']['@attributes']['value'] ?? null;
        if ($usersRated !== null) {
            return $usersRated;
        }
        $polls = $this->asList($item['poll'] ?? []);
        return $polls[0]['@attributes']['totalvotes'] ?? "";
    }

    private function extractName($item)
    {
        $frenchTitle = $this->extractFrenchTitle($item);
        if ($frenchTitle !== null) {
            return $frenchTitle;
        }

        $names = $this->asList($item['name'] ?? []);
        foreach ($names as $name) {
            if (($name['@attributes']['type'] ?? null) === 'primary') {
                return $name['@attributes']['value'];
            }
        }
        return $names[0]['@attributes']['value'] ?? "";
    }

    private function extractFrenchTitle(array $item): ?string
    {
        $multilingualTitle = null;
        foreach ($this->asList($item['versions']['item'] ?? []) as $version) {
            $title = $version['canonicalname']['@attributes']['value'] ?? null;
            if (!is_string($title) || trim($title) === '') {
                continue;
            }

            $languages = array_filter(
                $this->asList($version['link'] ?? []),
                fn(array $link): bool => ($link['@attributes']['type'] ?? null) === 'language'
            );
            foreach ($languages as $language) {
                if (($language['@attributes']['id'] ?? null) === '2187'
                    || ($language['@attributes']['value'] ?? null) === 'French') {
                    if (count($languages) === 1) {
                        return trim($title);
                    }
                    $multilingualTitle ??= trim($title);
                }
            }
        }

        return $multilingualTitle;
    }

    private function requester($request)
    {
        Log::debug("Execute request: " . $request);

        $headers = [];
        $token = config('services.boardgamegeek.token');

        if (!empty($token)) {
            $headers['Authorization'] = 'Bearer ' . $token;
        }

        return json_decode(json_encode(simplexml_load_string(Http::withHeaders($headers)->get($request))), true);
    }
}
