<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Ai\MatchStory;
use App\Services\PlayerAccess;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use JsonException;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class MatchStoryController extends Controller
{
    public function store(int $id, PlayerAccess $access, MatchStory $stories): JsonResponse
    {
        $access->authorizeMatch($id);

        try {
            return response()->json(['story' => $stories->generate($id)]);
        } catch (ConnectionException|RuntimeException|JsonException $e) {
            if ($e instanceof HttpExceptionInterface) {
                throw $e;
            }
            report($e);

            return response()->json(['message' => 'Le récit est indisponible pour le moment. Les scores restent enregistrés. Vous pouvez réessayer.'], 503);
        }
    }
}
