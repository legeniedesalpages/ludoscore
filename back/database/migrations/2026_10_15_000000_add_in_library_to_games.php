<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasColumn('games', 'in_library')) {
            return;
        }

        Schema::table('games', function (Blueprint $table) {
            // les jeux déjà enregistrés sont considérés comme faisant partie de la ludothèque
            $table->boolean('in_library')->default(true);
        });
    }

    public function down()
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn('in_library');
        });
    }
};
