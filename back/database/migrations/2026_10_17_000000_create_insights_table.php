<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('insights', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->string('scope', 10);
            $table->unsignedBigInteger('subject_id');
            $table->string('title', 150);
            $table->text('text');
            $table->json('chart')->nullable();
            $table->unsignedTinyInteger('relevance')->default(0);
            $table->timestamp('generated_at')->useCurrent();
            $table->index(['scope', 'subject_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('insights');
    }
};
