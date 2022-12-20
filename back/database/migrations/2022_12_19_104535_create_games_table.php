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
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->string('title',100);
            $table->boolean('is_expansion');
            $table->boolean('is_only_cooperative');
            $table->smallInteger('year_published');
            $table->tinyInteger('min_players');
            $table->tinyInteger('max_players');
            $table->date('ownership_date')->nullable();
            $table->string('thumbnail_id',100);
            $table->string('image_id',100);
            $table->json('match_tags');
            $table->json('player_tags');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('games');
    }
};
