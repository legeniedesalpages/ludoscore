<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Services\Ludotag;

class Player extends Model
{
    use HasFactory;

    protected $appends = ['gravatar', 'user', 'created_by_user_id', 'status'];
    protected $hidden = ['creators', 'personalUsers', 'ludotag', 'birth_date', 'birth_year'];

    protected $casts = ['birth_year' => 'integer'];

    protected static function booted(): void
    {
        static::creating(function (Player $player): void {
            $player->ludotag = Ludotag::generate();
        });
    }

    public function getStatusAttribute(): string
    {
        return $this->replaced_by_player_id === null ? 'active' : 'replaced';
    }

    public function creators(): BelongsToMany
    {
        return $this->users()->wherePivot('is_creator', true);
    }

    public function getCreatorAttribute($value = null): User|array
    {
        return $value ?? $this->creators->sole();
    }

    public function getCreatedByUserIdAttribute(): int
    {
        return $this->creators->sole()->id;
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot(
            'is_creator', 'is_self', 'can_view_personal_info', 'can_view_other_matches', 'can_add_to_match', 'associated_at', 'personal_pseudo'
        )->withTimestamps('associated_at', 'updated_at');
    }

    public function personalUsers(): BelongsToMany
    {
        return $this->users()->wherePivot('is_self', true);
    }

    public function getUserAttribute(): ?User
    {
        return $this->personalUsers->first();
    }

    public function getGravatarAttribute()
    {
        if ($this->user == null) {
            return md5(strtolower(trim($this->getRawOriginal('pseudo') ?? $this->pseudo)));
        } else {
            return md5(strtolower(trim($this->user->email)));
        }
    }

    public function teamplayers()
    {
        return $this->hasMany(TeamPlayer::class);
    }
}
