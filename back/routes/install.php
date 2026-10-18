<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Models\User;

Route::get('/finir_installation', function () {
    $storage = Storage::disk('local');
    $contenu = $storage->get('migration.txt');
    if ($contenu != 'done') {
        if (Artisan::call('migrate', ['--force' => true]) !== 0) {
            Log::error('Echec des migrations de deploiement : '.Artisan::output());
            abort(500, 'Echec des migrations. Le deploiement doit etre relance apres correction.');
        }
        if (!$storage->put('migration.txt', 'done')) {
            throw new RuntimeException('Impossible de marquer les migrations du deploiement comme terminees.');
        }
        $migration = true;
    } else {
        $migration = false;
    }
    
    $users = User::all();
    return view('check', ['users' => $users, 'migration' => $migration]);
});