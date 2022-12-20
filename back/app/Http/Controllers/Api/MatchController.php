<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use Illuminate\Support\Facades\Http;

class MatchController extends Controller
{

    public function currentMatch()
    {
        $match = GameMatch::where('running', true)->get();

        if (count($match) == 0) {
            $hasCurrent = false;
            $currentMatch = [];
        } else {
            $hasCurrent = true;
            $currentMatch = $match->toArray()[0];
        }
        

        return ['hasCurrent' => $hasCurrent, 'match' => $currentMatch];
    }
}