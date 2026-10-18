<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('player_user', 'personal_pseudo')) {
            Schema::table('player_user', function (Blueprint $table): void {
                $table->string('personal_pseudo')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (DB::table('player_user')->whereNotNull('personal_pseudo')->exists()) {
            throw new RuntimeException('Des pseudos personnels existent. Exportez-les avant de supprimer cette colonne.');
        }
        Schema::table('player_user', function (Blueprint $table): void {
            $table->dropColumn('personal_pseudo');
        });
    }
};
