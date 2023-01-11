<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use App\Models\User;

Route::get('/finir_installation', function () {
    $storage = Storage::disk('local');
    $contenu = $storage->get('migration.txt');
    if ($contenu != 'done') {
        $storage->put('migration.txt', 'done');
        Artisan::call("migrate");
        $migration = true;
    } else {
        $migration = false;
    }
    
    $users = User::all();
    return view('check', ['users' => $users, 'migration' => $migration]);
});