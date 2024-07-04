<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Player extends Model
{
    use HasFactory;

    protected $appends = ['gravatar'];
    //protected $hidden = ['user'];

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
