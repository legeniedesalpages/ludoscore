<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Analytics\StatsAssistant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class InsightsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'scope' => 'required|in:player,game',
            'id' => 'required|integer',
        ]);

        $insights = DB::table('insights')
            ->where('scope', $data['scope'])
            ->where('subject_id', $data['id'])
            ->orderByDesc('relevance')
            ->get()
            ->map(fn($i) => [
                'title' => $i->title,
                'text' => $i->text,
                'chart' => $i->chart ? json_decode($i->chart, true) : null,
                'relevance' => $i->relevance,
                'generatedAt' => $i->generated_at,
            ]);

        return response()->json($insights);
    }

    public function ask(Request $request, StatsAssistant $assistant): JsonResponse
    {
        $data = $request->validate([
            'question' => 'required|string|min:3|max:500',
            'scope' => 'nullable|in:player,game',
            'id' => 'required_with:scope|nullable|integer',
        ]);

        try {
            return response()->json($assistant->answer($data['question'], $data['scope'] ?? null, $data['id'] ?? null));
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => "L'assistant statistiques est indisponible pour le moment."], 503);
        }
    }
}
