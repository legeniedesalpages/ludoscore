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
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('name');
            $table->string('last_name',100)->nullable();
            $table->string('first_name',100)->nullable();
            $table->string('initials',2)->nullable();
            $table->string('prefered_color',50)->nullable();
            $table->string('gravatar',100)->nullable();
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
