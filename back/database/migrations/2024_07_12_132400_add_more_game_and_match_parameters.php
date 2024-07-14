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
            $table->timestamp("estimated_duration")->nullable();
            $table->json('score_template')->nullable();
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->json('draw_breaker')->nullable();
            $table->json('cancel_reason')->nullable();
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->json("score_details")->nullable();
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
