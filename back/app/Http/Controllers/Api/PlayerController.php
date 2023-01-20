<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Player;
use App\Models\User;

class PlayerController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return DB::table('players')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        Log::debug("Saving player : ".$request->name);

        if ($request->user_id != null) {
            $gravatar = calcGravatar();
        }

        $player = new Player();
        $player->pseudo = $request->pseudo;
        $player->last_name = $request->last_name;
        $player->first_name = $request->first_name;
        $player->initials = $request->initials;
        $player->prefered_color = $request->prefered_color;
        $player->save();
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $player = DB::table('players')->where('id', $id)->first();
        return $player;
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        Log::debug("Updating player : ".$request->name);

        $player = Player::whereId($id);
        $player->update($request->except(['user_id']));

        if ($request->user_id != null) {
            $gravatar = $this->calcGravatar($request->user_id);
            $player->update(['gravatar' => $gravatar]);
        }
    }

    private function calcGravatar($user_id) {
        $user = User::where(['id' => $user_id])->first();
        $gravatar = md5(strtolower(trim($user->email)));
        Log::debug("Gravatar : ".$gravatar);
        return $gravatar;
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }
}
