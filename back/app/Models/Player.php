<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Player extends Model
{
    use HasFactory;

    protected $appends = ['gravatar'];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot(
            'is_creator', 'can_view_personal_info', 'can_view_other_matches', 'can_add_to_match', 'associated_at'
        )->withTimestamps('associated_at', 'updated_at');
    }

    public function user(): HasOne
    {
        return $this->hasOne('App\Models\User');
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
