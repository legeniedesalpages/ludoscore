<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/** Client Gemini (offre gratuite Google AI Studio) avec sortie JSON imposée. */
class GeminiClient
{
    public function available(): bool
    {
        return (bool) config('services.gemini.key');
    }

    public function json(string $system, string $prompt, float $temperature = 0.4): array
    {
        if (!$this->available()) {
            throw new RuntimeException('GEMINI_API_KEY non configurée.');
        }

        $model = config('services.gemini.model');
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        // L'offre gratuite est limitée en requêtes par minute : une nouvelle tentative après pause suffit.
        $response = null;
        foreach ([0, 20, 45] as $wait) {
            sleep($wait);
            $response = Http::withHeaders(['x-goog-api-key' => config('services.gemini.key')])
                ->timeout(90)
                ->post($url, [
                    'systemInstruction' => ['parts' => [['text' => $system]]],
                    'contents' => [['role' => 'user', 'parts' => [['text' => $prompt]]]],
                    'generationConfig' => ['responseMimeType' => 'application/json', 'temperature' => $temperature],
                ]);
            if (!in_array($response->status(), [429, 503])) {
                break;
            }
        }

        if (!$response->successful()) {
            throw new RuntimeException('Erreur Gemini ' . $response->status() . ' : ' . mb_substr($response->body(), 0, 300));
        }

        $text = $response->json('candidates.0.content.parts.0.text');
        $data = json_decode((string) $text, true);
        if (!is_array($data)) {
            throw new RuntimeException('Réponse Gemini non exploitable.');
        }

        return $data;
    }
}
