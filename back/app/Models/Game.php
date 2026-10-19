<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Query\JoinClause;

class Game extends Model
{
    use HasFactory;

    protected $casts = ['expansion_tag_changes' => 'array', 'expansion_score_changes' => 'array'];

    public static function baseGameTagGroups(array $bggIds): array
    {
        return self::whereIn('bgg_id', $bggIds)->where('is_expansion', false)
            ->orderBy('title')->get(['bgg_id', 'title', 'player_tags', 'match_tags', 'score_template'])
            ->map(fn (self $game): array => [
                'bggId' => (int) $game->bgg_id,
                'title' => $game->title,
                'playerTags' => $game->player_tags ? json_decode($game->player_tags, true, 512, JSON_THROW_ON_ERROR) : [],
                'matchTags' => $game->match_tags ? json_decode($game->match_tags, true, 512, JSON_THROW_ON_ERROR) : [],
                'scoreTags' => $game->score_template ? json_decode($game->score_template, true, 512, JSON_THROW_ON_ERROR) : [],
            ])->all();
    }

    public static function baseGameColorGroups(array $bggIds): array
    {
        return self::whereIn('bgg_id', $bggIds)->where('is_expansion', false)
            ->orderBy('title')->get(['bgg_id', 'title', 'player_colors'])
            ->map(fn (self $game): array => [
                'bggId' => (int) $game->bgg_id,
                'title' => $game->title,
                'playerColors' => $game->player_colors
                    ? json_decode($game->player_colors, true, 512, JSON_THROW_ON_ERROR) : [],
            ])->all();
    }

    public function baseGames(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'game_expansion', 'extension_id', 'base_game_bgg_id', 'id', 'bgg_id')
            ->withPivot('id')->withTimestamps();
    }

    public function expansions(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'game_expansion', 'base_game_bgg_id', 'extension_id', 'bgg_id', 'id')
            ->withPivot('id')->withTimestamps();
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('in_library', 'ownership_date')->withTimestamps();
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        $inLibrary = $query->getQuery()->getGrammar()->wrap('game_user.in_library');

        return $query->leftJoin('game_user', function (JoinClause $join) use ($userId) {
            $join->on('game_user.game_id', '=', 'games.id')->where('game_user.user_id', $userId);
        })->addSelect('games.*', 'game_user.ownership_date')
            ->selectRaw("COALESCE($inLibrary, 0) as in_library");
    }
}
