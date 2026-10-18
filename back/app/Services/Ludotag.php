<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Player;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

final class Ludotag
{
    public const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

    public const LENGTH = 12;

    public static function generate(): string
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $tag = '';
            for ($index = 0; $index < self::LENGTH; $index++) {
                $tag .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
            if (! DB::table('players')->where('ludotag', $tag)->exists()) {
                return $tag;
            }
        }

        throw new RuntimeException('Impossible de generer un ludotag unique.');
    }

    public static function normalize(string $tag): string
    {
        return strtoupper(str_replace(['-', ' '], '', trim($tag)));
    }

    public static function format(string $tag): string
    {
        return implode('-', str_split($tag, 4));
    }

    public static function findPlayer(string $input): Player
    {
        $tag = self::normalize($input);
        $player = preg_match('/^['.self::ALPHABET.']{12}$/D', $tag) ? Player::where('ludotag', $tag)->first() : null;
        if ($player === null) {
            throw ValidationException::withMessages(['ludotag' => 'Ludotag invalide ou introuvable.']);
        }

        return $player;
    }
}
