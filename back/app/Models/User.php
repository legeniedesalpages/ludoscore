<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $appends = ['player_id'];

    public function games(): BelongsToMany
    {
        return $this->belongsToMany(Game::class)->withPivot('in_library', 'ownership_date')->withTimestamps();
    }

    public function createdPlayers(): BelongsToMany
    {
        return $this->players()->wherePivot('is_creator', true);
    }

    public function players(): BelongsToMany
    {
        return $this->belongsToMany(Player::class)->withPivot(
            'is_creator', 'is_self', 'can_view_personal_info', 'can_view_other_matches', 'can_add_to_match', 'associated_at'
        )->withTimestamps('associated_at', 'updated_at');
    }

    public function selfPlayers(): BelongsToMany
    {
        return $this->players()->wherePivot('is_self', true);
    }

    public function getPlayerAttribute(): ?Player
    {
        return $this->selfPlayers->first();
    }

    public function getPlayerIdAttribute(): ?int
    {
        return $this->selfPlayers()->value('players.id');
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'email',
        'password',
        "is_admin",
        "confirmation_key",
        "first_connection",
        'newsletter_subscribed',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'pivot',
        'selfPlayers',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'newsletter_subscribed' => 'boolean',
    ];
}
