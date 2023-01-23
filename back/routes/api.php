<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameController;
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
Route::middleware('auth:sanctum')->resource('user', UserController::class, ['except' => ['edit', 'create', 'store']]);

/*
|--------------------------------------------------------------------------
| Game
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->resource('game', GameController::class, ['except' => ['edit', 'create', 'store']]);
