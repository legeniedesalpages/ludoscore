<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $match_id
 * @property string|null $name
 * @property string|null $color
 * @property string $tags
 * @property int $position
 * @property int|null $score
 * @property string|null $score_details
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, TeamPlayer> $teamplayers
 */
class Team extends Model
{
    use HasFactory;

    /** @return HasMany<TeamPlayer, $this> */
    public function teamplayers(): HasMany
    {
        return $this->hasMany(TeamPlayer::class);
    }
}
