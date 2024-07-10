<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('games', function (Blueprint $table) {
            $table->boolean('draw_allowed')->default(true);
            $table->json('draw_breaker')->nullable();
            $table->boolean('quantifiable_score')->default(true);
            $table->boolean('highest_score_win')->default(true);
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->unsignedBigInteger('winner_team_id')->index()->nullable();
            $table->foreign('winner_team_id')->references('id')->on('teams');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
    }
};
