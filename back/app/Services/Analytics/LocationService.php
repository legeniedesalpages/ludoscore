<?php

namespace App\Services\Analytics;

use Illuminate\Support\Facades\Http;
use Throwable;

/** Lieu de référence, distances, géocodage inverse (Nominatim) et actualités locales (Google Actualités, flux RSS). */
class LocationService
{
    public static function home(): array
    {
        return [
            'name' => config('services.newsletter.city'),
            'lat' => (float) config('services.newsletter.latitude'),
            'lon' => (float) config('services.newsletter.longitude'),
        ];
    }

    public static function distanceKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return 6371 * 2 * asin(min(1, sqrt($a)));
    }

    /** Nom de la commune pour des coordonnées, ou null si le service est indisponible. */
    public function reverse(float $lat, float $lon): ?string
    {
        try {
            $address = Http::timeout(3)
                ->withHeaders(['User-Agent' => 'LudoScore/1.0 (usage personnel)'])
                ->get('https://nominatim.openstreetmap.org/reverse', [
                    'format' => 'jsonv2', 'lat' => $lat, 'lon' => $lon, 'zoom' => 10, 'accept-language' => 'fr',
                ])->throw()->json('address');
        } catch (Throwable) {
            return null;
        }

        $name = $address['city'] ?? $address['town'] ?? $address['village'] ?? $address['municipality'] ?? $address['county'] ?? null;

        return $name ? mb_substr($name, 0, 120) : null;
    }

    /** Titres d'actualité des 7 derniers jours pour un lieu. */
    public function news(string $place, int $limit = 5): array
    {
        try {
            $xml = Http::timeout(10)->get('https://news.google.com/rss/search', [
                'q' => $place . ' when:7d', 'hl' => 'fr', 'gl' => 'FR', 'ceid' => 'FR:fr',
            ])->throw()->body();
            $feed = @simplexml_load_string($xml);
        } catch (Throwable) {
            return [];
        }

        $items = [];
        foreach ($feed->channel->item ?? [] as $item) {
            // Google ajoute " - Nom du média" à la fin des titres.
            $items[] = trim(preg_replace('/\s+-\s+[^-]+$/u', '', (string) $item->title));
            if (count($items) >= $limit) {
                break;
            }
        }

        return $items;
    }
}
