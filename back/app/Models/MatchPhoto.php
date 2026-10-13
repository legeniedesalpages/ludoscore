<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MatchPhoto extends Model
{
    protected $table = 'match_photos';

    protected $fillable = ['match_id', 'mime_type', 'data'];
}
