<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $game_id
 * @property int|null $winner_team_id
 * @property bool|int $canceled
 * @property bool|int $running
 * @property string $tags
 * @property string|Carbon $started_at
 * @property string|Carbon|null $finished_at
 * @property string|null $draw_breaker
 * @property string|null $cancel_reason
 * @property string|float|null $latitude
 * @property string|float|null $longitude
 * @property string|null $location_name
 * @property string|null $story
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Team> $teams
 * @property-read Collection<int, Game> $expansions
 */
class GameMatch extends Model
{
    use HasFactory;

    protected $table = 'matches';

    /** @return HasMany<Team, $this> */
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class, 'match_id');
    }

    /** @return BelongsToMany<Game, $this> */
    public function expansions(): BelongsToMany
    {
        return $this->belongsToMany(Game::class, 'match_expansions', 'match_id', 'game_id')->withTimestamps();
    }
}
