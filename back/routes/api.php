<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameSearchController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\UserController;


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
