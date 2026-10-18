<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Analytics\NewsletterBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Throwable;

class NewsletterController extends Controller
{
    private const CACHE_KEY = 'newsletter.preview';

    /** Aperçu de la newsletter, mis en cache pour ménager le quota gratuit de l'IA. */
    public function preview(Request $request, NewsletterBuilder $builder): JsonResponse
    {
        if (!Auth::user()->is_admin) {
            return response()->json(['message' => 'Accès réservé aux administrateurs.'], 403);
        }

        $userId = $request->user()->id;
        $cacheKey = self::CACHE_KEY.'.'.$userId;
        if ($request->boolean('refresh')) {
            Cache::forget($cacheKey);
        }

        try {
            $preview = Cache::remember($cacheKey, now()->addHours(6), function () use ($builder, $userId) {
                $newsletter = $builder->build($userId);

                return [
                    'subject' => $newsletter['subject'],
                    'html' => view('email.weekly_newsletter', ['newsletter' => $newsletter])->render(),
                    'generatedAt' => now()->toIso8601String(),
                ];
            });
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => "Impossible de générer la newsletter : " . $e->getMessage()], 503);
        }

        return response()->json($preview);
    }
}
