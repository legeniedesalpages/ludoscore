<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\GameMatchController;
use App\Http\Controllers\Api\GameSearchController;
use App\Http\Controllers\Api\InsightsController;
use App\Http\Controllers\Api\NewsletterController;
use App\Http\Controllers\Api\PlayerController;
use App\Http\Controllers\Api\PlayerStatisticsController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\GameStatisticsController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VersionController;
use App\Http\Controllers\Api\LudotagController;
use App\Http\Controllers\Api\PlayerMergeController;
use App\Http\Controllers\Api\MatchStoryController;

Route::get('/version', [VersionController::class, 'show']);

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

Route::middleware('auth:sanctum')->get('/previous-team-color/{gameid}/{playerid}', [GameMatchController::class, 'previousTeamColor']);

Route::middleware('auth:sanctum')->get('/game-match-count', [GameMatchController::class, 'matchCount']);


Route::middleware('auth:sanctum')->post('/game-match/{id}/photo', [GameMatchController::class, 'storePhoto']);
Route::middleware('auth:sanctum')->get('/game-match/{id}/photo', [GameMatchController::class, 'showPhoto']);
Route::middleware('auth:sanctum')->delete('/game-match/{id}/photo', [GameMatchController::class, 'destroyPhoto']);

Route::middleware('auth:sanctum')->put('/game-match/{id}/history', [GameMatchController::class, 'updateHistory']);
Route::middleware(['auth:sanctum', 'throttle:6,1'])->post('/game-match/{id}/story', [MatchStoryController::class, 'store'])->whereNumber('id');

Route::middleware('auth:sanctum')->resource('game-match', GameMatchController::class, ['except' => ['edit', 'create']]);
/*
|--------------------------------------------------------------------------
| Player
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'throttle:ludotag'])->post('/player/associate-ludotag', [LudotagController::class, 'associate']);
Route::middleware(['auth:sanctum', 'throttle:ludotag'])->post('/player/{id}/merge/preview', [PlayerMergeController::class, 'preview'])->whereNumber('id');
Route::middleware(['auth:sanctum', 'throttle:ludotag'])->post('/player/{id}/merge', [PlayerMergeController::class, 'store'])->whereNumber('id');
Route::middleware('auth:sanctum')->get('/player/{id}/ludotag', [LudotagController::class, 'show'])->whereNumber('id');
Route::middleware('auth:sanctum')->put('/player/{id}/personal-pseudo', [PlayerController::class, 'savePersonalPseudo'])->whereNumber('id');
Route::middleware('auth:sanctum')->resource('player', PlayerController::class, ['except' => ['edit', 'create']]);
Route::middleware('auth:sanctum')->get('/player/{id}/associations', [PlayerController::class, 'associations']);
Route::middleware('auth:sanctum')->put('/player/{id}/associations/{userId}', [PlayerController::class, 'saveAssociation']);
Route::middleware('auth:sanctum')->delete('/player/{id}/associations/{userId}', [PlayerController::class, 'deleteAssociation']);

/*
|--------------------------------------------------------------------------
| Player
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->resource('team', TeamController::class, ['except' => ['edit', 'create']]);

/*
|--------------------------------------------------------------------------
| Statistics
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->get('/statistics/overview', [StatisticsController::class, 'overview']);
Route::middleware('auth:sanctum')->get('/statistics/games', [StatisticsController::class, 'games']);
Route::middleware('auth:sanctum')->get('/statistics/game-library', [GameStatisticsController::class, 'index']);
Route::middleware('auth:sanctum')->get('/statistics/games/{id}', [GameStatisticsController::class, 'show'])->whereNumber('id');
Route::middleware('auth:sanctum')->get('/statistics/players', [StatisticsController::class, 'players']);
Route::middleware('auth:sanctum')->get('/statistics/player-directory', [PlayerStatisticsController::class, 'index']);
Route::middleware('auth:sanctum')->get('/statistics/players/{id}', [PlayerStatisticsController::class, 'show'])->whereNumber('id');
Route::middleware('auth:sanctum')->get('/statistics/insights', [InsightsController::class, 'index']);
Route::middleware(['auth:sanctum', 'throttle:6,1'])->post('/statistics/ask', [InsightsController::class, 'ask']);
Route::middleware(['auth:sanctum', 'throttle:6,1'])->get('/admin/newsletter/preview', [NewsletterController::class, 'preview']);

/*
|--------------------------------------------------------------------------
| Game search
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->get('/game_search', ['as' => 'game_search', function () {
    return app()->make(GameSearchController::class)->callAction('searchByName', $parameters = ['searchText' => request()->q, 'type' => request()->type ?? GameSearchController::TYPE_GAME]);
}]);

Route::middleware('auth:sanctum')->get('/game_search_detail', ['as' => 'game_search_detail', function () {
    return app()->make(GameSearchController::class)->callAction('searchById', $parameters = ['id' => request()->id]);
}]);
