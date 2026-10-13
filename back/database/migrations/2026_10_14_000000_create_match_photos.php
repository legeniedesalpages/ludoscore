<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasTable('match_photos')) {
            return;
        }

        Schema::create('match_photos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('match_id')->unique();
            $table->foreign('match_id')->references('id')->on('matches')->onDelete('cascade');
            $table->string('mime_type', 50);
            // image encodée en base64 pour rester portable entre les SGBD
            $table->longText('data');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('match_photos');
    }
};
