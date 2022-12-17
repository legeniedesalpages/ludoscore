<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Http;

class GameSearchController extends Controller
{

    public function searchByName($searchText)
    {
        $xmlData = Http::get('https://boardgamegeek.com/xmlapi2/search?type=boardgame&query='.$searchText);

        $xmlResponse = simplexml_load_string($xmlData);
        $jsonData = json_decode(json_encode($xmlResponse), true);
		
        $list = array();
        foreach ($jsonData['item'] as $item) {
            $id = $item['@attributes']['id'];
            $name = $item['name']['@attributes']['value'];
            array_push($list,
                array(
                'id' => $id,
                'name' => $name)
                );
        }

        return json_encode($list);
    }
}