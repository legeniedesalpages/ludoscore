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
