<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'boardgamegeek' => [
        'token' => env('BGG_API_TOKEN'),
    ],

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-3.8-flash'),
    ],

    'newsletter' => [
        'latitude' => env('NEWSLETTER_LATITUDE', 43.66),
        'longitude' => env('NEWSLETTER_LONGITUDE', 6.99),
        'city' => env('NEWSLETTER_CITY', 'Châteauneuf-Grasse'),
        // Au-delà de cette distance du lieu de référence, une partie est considérée comme jouée en déplacement.
        'away_km' => env('NEWSLETTER_AWAY_KM', 30),
    ],

];
