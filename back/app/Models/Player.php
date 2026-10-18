<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Player extends Model
{
    use HasFactory;

    protected $appends = ['gravatar', 'user', 'created_by_user_id'];
    protected $hidden = ['creators', 'personalUsers'];

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
            'is_creator', 'is_self', 'can_view_personal_info', 'can_view_other_matches', 'can_add_to_match', 'associated_at'
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
            return md5(strtolower(trim($this->pseudo)));
        } else {
            return md5(strtolower(trim($this->user->email)));
        }
    }

    public function teamplayers()
    {
        return $this->hasMany(TeamPlayer::class);
    }
}
