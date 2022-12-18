<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameSearchController;
use App\Http\Controllers\Api\UserController;


/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

Route::post('/auth/register', [AuthController::class, 'createUser']);

Route::post('/auth/login', [AuthController::class, 'loginUser']);

/*
|--------------------------------------------------------------------------
| User
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->resource('users', UserController::class);

/*
|--------------------------------------------------------------------------
| Search
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->get('/game_search', [ 'as' => 'game_search', function()
{
    return app()->make(GameSearchController::class)->callAction('searchByName', $parameters = [ 'searchText' => request()->q]);
}]);

