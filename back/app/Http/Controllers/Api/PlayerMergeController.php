<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlayerMerge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PlayerMergeController extends Controller
{
    public function preview(Request $request, int $id, PlayerMerge $merger): JsonResponse
    {
        $data = $request->validate(['ludotag' => ['required', 'string', 'max:32']]);

        return response()->json($merger->run($request->user(), $id, $data['ludotag']))
            ->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request, int $id, PlayerMerge $merger): JsonResponse
    {
        $data = $request->validate([
            'ludotag' => ['required', 'string', 'max:32'],
            'confirmed' => ['required', 'accepted'],
        ]);

        return response()->json($merger->run($request->user(), $id, $data['ludotag'], true))
            ->header('Cache-Control', 'private, no-store');
    }
}
