<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\GameMatchController;
use App\Http\Controllers\Api\GameSearchController;
use App\Http\Controllers\Api\PlayerController;
use App\Http\Controllers\Api\UserController;

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

Route::post('/auth/register', [AuthController::class, 'createUser']);
Route::post('/auth/login', [AuthController::class, 'loginUser']);
Route::get('/auth/logout', [AuthController::class, 'logoutUser']);
Route::post('/auth/confirm', [AuthController::class, 'confirmUser']);

/*
|--------------------------------------------------------------------------
| User
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->resource('user', UserController::class, ['except' => ['edit', 'create', 'store']]);

Route::middleware('auth:sanctum')->post('/user/{id}/first-connection', [AuthController::class, 'deactivateFirstConnection']);
/*
|--------------------------------------------------------------------------
| Game
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->resource('game', GameController::class, ['except' => ['edit', 'create']]);

Route::middleware('auth:sanctum')->get('/game/bgg/{id}', [GameController::class, 'getByBggId']);

/*
|--------------------------------------------------------------------------
| Match
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->get('/running-match', [GameMatchController::class, 'findRunning']);

Route::middleware('auth:sanctum')->get('/previous-match/{playerid}/{gameid}', [GameMatchController::class, 'previousMatch']);

Route::middleware('auth:sanctum')->put('/game-match/update-score', [GameMatchController::class, 'updatePlayerScore']);

Route::middleware('auth:sanctum')->resource('game-match', GameMatchController::class, ['except' => ['edit', 'create']]);
/*
|--------------------------------------------------------------------------
| Player
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->resource('player', PlayerController::class, ['except' => ['edit', 'create', 'store']]);

/*
|--------------------------------------------------------------------------
| Game search
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->get('/game_search', ['as' => 'game_search', function () {
    return app()->make(GameSearchController::class)->callAction('searchByName', $parameters = ['searchText' => request()->q]);
}]);

Route::middleware('auth:sanctum')->get('/game_search_detail', ['as' => 'game_search_detail', function () {
    return app()->make(GameSearchController::class)->callAction('searchById', $parameters = ['id' => request()->id]);
}]);
