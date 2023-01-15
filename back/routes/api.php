<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameSearchController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\PlayerController;

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

Route::post('/auth/register', [AuthController::class, 'createUser']);
Route::post('/auth/login', [AuthController::class, 'loginUser']);
Route::get('/auth/logout', [AuthController::class, 'logoutUser']);

/*
|--------------------------------------------------------------------------
| User
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->resource('users', UserController::class);

/*
|--------------------------------------------------------------------------
| Player
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->resource('player', PlayerController::class);

/*
|--------------------------------------------------------------------------
| Game
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->resource('games', GameController::class);

/*
|--------------------------------------------------------------------------
| Match
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->controller(MatchController::class)->group(function () {
    Route::get('/matches/current', 'currentMatch');
});

/*
|--------------------------------------------------------------------------
| Search
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->get('/game_search', ['as' => 'game_search', function () {
    return app()->make(GameSearchController::class)->callAction('searchByName', $parameters = ['searchText' => request()->q]);
}]);

Route::middleware('auth:sanctum')->get('/game_search_detail', ['as' => 'game_search_detail', function () {
    return app()->make(GameSearchController::class)->callAction('searchById', $parameters = ['id' => request()->id]);
}]);
