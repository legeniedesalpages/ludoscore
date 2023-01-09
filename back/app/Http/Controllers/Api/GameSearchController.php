<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class GameSearchController extends Controller
{

    public function searchById($id)
    {
        $detailRequest = 'https://boardgamegeek.com/xmlapi2/thing?type=boardgame&stats=1&id=' . $id;
        $jsonDetailData = $this->requester($detailRequest);

        if (array_key_exists('item', $jsonDetailData)) {
            return json_encode($this->extractDetail($jsonDetailData['item']));
        }
        else {
            Log::info("No detail results");
            return json_encode("");
        }
    }

    public function searchByName($searchText)
    {
        $searchRequest = 'https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=' . $searchText;
        $jsonSearchData = $this->requester($searchRequest);

        Log::info($jsonSearchData);

        $idList = array();
        $totalFound = $jsonSearchData['@attributes']['total'];
        if ($totalFound == '0') {
            Log::info("No result for query " . $searchText);
            return json_encode([]);
        } else if ($totalFound == '1') {
            Log::info("Found 1 result for query " . $searchText);
            $id = $jsonSearchData['item']['@attributes']['id'];
            array_push($idList, $id);
        } else {

            Log::info("Found " . $totalFound . " results for query " . $searchText);
            foreach ($jsonSearchData['item'] as $item) {
                $id = $item['@attributes']['id'];
                array_push($idList, $id);
            }
        }

        
        
        $detailRequest = 'https://boardgamegeek.com/xmlapi2/thing?type=boardgame&id=' . implode(',', array_slice($idList, 0, 50));
        $jsonDetailData = $this->requester($detailRequest);

        $returnList = array();
        if (array_key_exists('item', $jsonDetailData)) {
            if (array_key_exists('@attributes', $jsonDetailData['item'])) {

                Log::debug("One result");
                $data = $this->extractData($jsonDetailData['item']);
                array_push($returnList, $data);
            } else {

                Log::debug("Many results");
                foreach ($jsonDetailData['item'] as $item) {
                    $data = $this->extractData($item);
                    array_push($returnList, $data);
                }

                usort($returnList, function ($a, $b) {
                    return $b['popularity'] - $a['popularity'];
                });
            }
        } else {
            Log::info("No detail results");
        }

        $newRetunrList = $this->addDetails($returnList);
        Log::debug($newRetunrList);
        return json_encode($newRetunrList);
    }

    private function addDetails($list) {
        $idList = collect($list)->map(function($game) {
            return $game['id'];
        });
        Log::debug("Board game list :");
        Log::debug($idList);

        $games = DB::table('games')
                    ->whereIn('bgg_id', $idList)
                    ->get();

        $newList = array();
        foreach($list as $returnedGame) {
            if (array_search($returnedGame['id'], array_column($games->toArray(), 'bgg_id')) !== false) {
                array_push($newList, array_merge($returnedGame, array('owned' => true)));
            } else {
                array_push($newList, array_merge($returnedGame, array('owned' => false)));
            }
        }
        return $newList;
    }

    private function extractDetail($item)
    {
        return array(
            'id' => $item['@attributes']['id'],
            'thumbnail' => $this->extractThumbnail($item),
            'image' => $this->extractImage($item),
            'name' => $this->extractName($item),
            'year' => $this->extractYear($item),
            'popularity' => $this->extractPopularity($item),
            'minplayers' => $this->extractMinPlayer($item),
            'maxplayers' => $this->extractMaxPlayer($item)
        );
    }

    private function extractData($item)
    {
        return array(
            'id' => $item['@attributes']['id'],
            'thumbnail' => $this->extractThumbnail($item),
            'name' => $this->extractName($item),
            'year' => $this->extractYear($item),
            'popularity' => $this->extractPopularity($item)
        );
    }

    private function extractMinPlayer($item)
    {
        try {
            return $item['minplayers']['@attributes']['value'];
        } catch (Exception $e) {
            return "";
        }
    }

    private function extractMaxPlayer($item)
    {
        try {
            return $item['maxplayers']['@attributes']['value'];
        } catch (Exception $e) {
            return "";
        }
    }

    private function extractThumbnail($item)
    {
        try {
            return $item['thumbnail'];
        } catch (Exception $e) {
            return "";
        }
    }

    private function extractImage($item)
    {
        try {
            return $item['image'];
        } catch (Exception $e) {
            return "";
        }
    }

    private function extractYear($item)
    {
        try {
            return $item['yearpublished']['@attributes']['value'];
        } catch (Exception $e) {
            return "";
        }
    }

    private function extractPopularity($item)
    {
        try {
            return $item['poll'][0]['@attributes']['totalvotes'];
        } catch (Exception $e1) {
            try {
                return $item['poll']['@attributes']['totalvotes'];
            } catch (Exception $e2) {
                return "";
            }
        }
    }

    private function extractName($item)
    {
        try {
            return $item['name'][0]['@attributes']['value'];
        } catch (Exception $e1) {
            try {
                return $item['name']['@attributes']['value'];
            } catch (Exception $e2) {
                return "";
            }
        }
    }

    private function requester($request)
    {
        Log::debug("Execute request: " . $request);
        return json_decode(json_encode(simplexml_load_string(Http::get($request))), true);
    }
}
