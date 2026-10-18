<?php

use App\Services\Ludotag;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('players', 'ludotag')) {
            Schema::table('players', fn (Blueprint $table) => $table->string('ludotag', Ludotag::LENGTH)->nullable());
        }
        if (! Schema::hasIndex('players', 'players_ludotag_unique')) {
            Schema::table('players', fn (Blueprint $table) => $table->unique('ludotag', 'players_ludotag_unique'));
        }
        DB::transaction(function () {
            DB::table('players')->whereNull('ludotag')->orderBy('id')->chunkById(500, function ($players) {
                foreach ($players as $player) {
                    DB::table('players')->where('id', $player->id)->update(['ludotag' => Ludotag::generate()]);
                }
            });
        });
        Schema::table('players', fn (Blueprint $table) => $table->string('ludotag', Ludotag::LENGTH)->nullable(false)->change());
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropUnique('players_ludotag_unique');
            $table->dropColumn('ludotag');
        });
    }
};
