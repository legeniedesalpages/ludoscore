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
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->string("color", 50)->nullable();
            $table->json("tags");
            $table->tinyInteger("position");
            $table->smallInteger("score")->nullable();
            $table->unsignedBigInteger('match_id')->index();
            $table->foreign('match_id')->references('id')->on('game_matches');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('teams');
    }
};
