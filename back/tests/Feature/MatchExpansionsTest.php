<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class MatchExpansionsTest extends TestCase
{
    private User $admin;

    private Game $base;

    private Game $expansion;

    private Game $otherExpansion;

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'match_expansions_test', 'database.connections.match_expansions_test' => [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => 'test$',
            'foreign_key_constraints' => true,
        ]]);
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password');
            $table->boolean('is_admin')->default(false);
            $table->timestamps();
        });
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->string('pseudo');
            $table->unsignedBigInteger('replaced_by_player_id')->nullable();
            $table->timestamps();
        });
        Schema::create('player_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players');
            $table->foreignId('user_id')->constrained('users');
            foreach (['is_self', 'is_creator', 'can_view_personal_info', 'can_view_other_matches', 'can_add_to_match'] as $column) {
                $table->boolean($column)->default(false);
            }
            $table->string('personal_pseudo')->nullable();
            $table->timestamp('associated_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->bigInteger('bgg_id');
            foreach (['is_expansion', 'is_only_cooperative', 'draw_allowed', 'quantifiable_score', 'highest_score_win'] as $column) {
                $table->boolean($column)->default(false);
            }
            foreach (['min_players', 'max_players', 'estimated_duration_in_minutes'] as $column) {
                $table->integer($column)->nullable();
            }
            foreach (['thumbnail_id', 'image_id', 'match_tags', 'player_tags', 'player_colors', 'score_template', 'draw_breaker'] as $column) {
                $table->text($column)->nullable();
            }
            $table->timestamps();
        });
        (require database_path('migrations/2026_10_19_000000_create_game_expansion_table.php'))->up();
        (require database_path('migrations/2026_10_19_000001_add_additional_players_to_games.php'))->up();
        (require database_path('migrations/2026_10_19_000002_add_expansion_tag_changes_to_games.php'))->up();
        (require database_path('migrations/2026_10_19_000003_add_expansion_score_changes_to_games.php'))->up();
        Schema::create('game_user', function (Blueprint $table) {
            $table->unsignedBigInteger('game_id');
            $table->unsignedBigInteger('user_id');
            $table->boolean('in_library')->default(false);
            $table->date('ownership_date')->nullable();
        });
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained('games');
            $table->unsignedBigInteger('winner_team_id')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('finished_at')->nullable();
            $table->text('tags')->nullable();
            $table->decimal('latitude')->nullable();
            $table->decimal('longitude')->nullable();
            $table->string('location_name')->nullable();
            $table->boolean('canceled')->default(false);
            $table->boolean('running')->default(false);
            $table->text('story')->nullable();
            $table->timestamps();
        });
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->unsignedBigInteger('match_id');
            $table->string('color')->nullable();
            $table->integer('position')->nullable();
            $table->integer('score')->nullable();
            $table->text('score_details')->nullable();
            $table->text('tags')->nullable();
            $table->timestamps();
        });
        Schema::create('team_players', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('team_id');
            $table->unsignedBigInteger('player_id');
            $table->unsignedBigInteger('original_player_id')->nullable();
            $table->integer('position')->default(0);
            $table->timestamps();
        });
        Schema::create('match_photos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('match_id');
        });
        (require database_path('migrations/2026_10_19_200000_recreate_match_expansions_table.php'))->up();

        DB::table('players')->insert([['id' => 101, 'pseudo' => 'Alice'], ['id' => 102, 'pseudo' => 'Bob']]);
        $this->admin = User::create(['email' => 'admin@example.test', 'password' => 'unused', 'is_admin' => true]);
        $this->base = $this->game(['title' => 'Base', 'bgg_id' => 42, 'min_players' => 1, 'max_players' => 4]);
        $this->expansion = $this->game([
            'title' => 'Extension B', 'bgg_id' => 50, 'is_expansion' => true, 'additional_players' => 1,
            'player_tags' => '[{"category":"Rôle","names":["Mage"]}]', 'score_template' => '[{"category":"Bonus"}]',
            'expansion_tag_changes' => [['baseGameBggId' => 42, 'scope' => 'player', 'category' => 'Faction', 'addedValues' => ['C'], 'removedValues' => []]],
        ]);
        $this->otherExpansion = $this->game(['title' => 'Extension A', 'bgg_id' => 51, 'is_expansion' => true]);
        DB::table('game_expansion')->insert([
            ['extension_id' => $this->expansion->id, 'base_game_bgg_id' => 42],
            ['extension_id' => $this->otherExpansion->id, 'base_game_bgg_id' => 42],
        ]);
    }

    protected function tearDown(): void
    {
        DB::purge('match_expansions_test');
        parent::tearDown();
    }

    private function game(array $attributes): Game
    {
        $game = new Game;
        $game->forceFill($attributes + ['thumbnail_id' => 'thumb.jpg', 'image_id' => 'image.jpg'])->save();

        return $game;
    }

    private function startMatch(array $expansionIds, int $playerId = 101): TestResponse
    {
        return $this->actingAs($this->admin)->postJson('/api/game-match', [
            'match' => ['gameId' => $this->base->id, 'tags' => '[]', 'expansionIds' => $expansionIds],
            'teams' => [['name' => 'Team', 'color' => 'Rouge', 'tags' => '[]', 'players' => [['playerId' => $playerId]]]],
        ]);
    }

    public function test_a_match_stores_its_expansions_and_exposes_them_in_history(): void
    {
        $matchId = $this->startMatch([$this->expansion->id, $this->otherExpansion->id])->assertCreated()
            ->assertJsonPath('expansionIds', [$this->expansion->id, $this->otherExpansion->id])->json('id');

        $this->assertDatabaseCount('match_expansions', 2);
        $this->getJson('/api/game-match?page=0&size=10')->assertOk()
            ->assertJsonPath('0.expansions.0.title', 'Extension A')
            ->assertJsonPath('0.expansions.1.title', 'Extension B')
            ->assertJsonMissingPath('0.expansions.0.playerTags');
        $this->getJson('/api/game-match/'.$matchId)->assertOk()
            ->assertJsonPath('expansions.1.id', $this->expansion->id)
            ->assertJsonPath('expansions.1.additionalPlayers', 1)
            ->assertJsonPath('expansions.1.playerTags.0.category', 'Rôle')
            ->assertJsonPath('expansions.1.scoreTags.0.category', 'Bonus')
            ->assertJsonPath('expansions.1.expansionTagChanges.0.addedValues', ['C']);

        $this->deleteJson('/api/game-match/'.$matchId)->assertOk();
        $this->assertDatabaseCount('match_expansions', 0);
        $this->assertDatabaseCount('games', 3);
    }

    public function test_a_match_without_expansions_remains_valid(): void
    {
        $this->actingAs($this->admin)->postJson('/api/game-match', [
            'match' => ['gameId' => $this->base->id, 'tags' => '[]'],
            'teams' => [['name' => 'Team', 'color' => 'Rouge', 'tags' => '[]', 'players' => [['playerId' => 101]]]],
        ])->assertCreated()->assertJsonPath('expansionIds', []);
        $this->assertDatabaseCount('match_expansions', 0);
    }

    public function test_expansions_of_another_game_or_base_games_are_rejected_without_writing(): void
    {
        $foreign = $this->game(['title' => 'Foreign', 'bgg_id' => 60, 'is_expansion' => true]);
        $otherBase = $this->game(['title' => 'Other base', 'bgg_id' => 61]);
        DB::table('game_expansion')->insert(['extension_id' => $foreign->id, 'base_game_bgg_id' => 61]);

        foreach ([[$foreign->id], [$otherBase->id], [$this->expansion->id, $this->expansion->id], [999]] as $ids) {
            $this->startMatch($ids)->assertStatus(422);
        }
        $this->assertDatabaseCount('matches', 0);
        $this->assertDatabaseCount('match_expansions', 0);
    }

    public function test_last_expansions_prefer_the_users_own_participation(): void
    {
        $this->getJson('/api/match-expansions/last/'.$this->base->id)->assertUnauthorized();
        $this->actingAs($this->admin)->getJson('/api/match-expansions/last/'.$this->base->id)->assertOk()
            ->assertExactJson(['hasPreviousMatch' => false, 'expansionIds' => []]);

        $this->startMatch([$this->expansion->id])->assertCreated();
        DB::table('matches')->update(['started_at' => '2026-01-01 10:00:00', 'running' => false]);
        $this->startMatch([$this->otherExpansion->id], 102)->assertCreated();

        $this->getJson('/api/match-expansions/last/'.$this->base->id)->assertOk()
            ->assertExactJson(['hasPreviousMatch' => true, 'expansionIds' => [$this->otherExpansion->id]]);

        DB::table('player_user')->insert(['player_id' => 101, 'user_id' => $this->admin->id, 'is_self' => true, 'is_creator' => true]);
        $this->actingAs($this->admin->fresh())->getJson('/api/match-expansions/last/'.$this->base->id)->assertOk()
            ->assertExactJson(['hasPreviousMatch' => true, 'expansionIds' => [$this->expansion->id]]);

        $this->getJson('/api/match-expansions/last/'.$this->expansion->id)->assertStatus(422);
    }

    public function test_catalogue_counts_finished_matches_played_with_each_expansion(): void
    {
        $this->startMatch([$this->expansion->id])->assertCreated();
        $this->startMatch([$this->expansion->id, $this->otherExpansion->id], 102)->assertCreated();
        $this->startMatch([$this->otherExpansion->id])->assertCreated();
        DB::table('matches')->whereIn('id', [1, 2])->update(['running' => false]);
        DB::table('player_user')->insert(['player_id' => 101, 'user_id' => $this->admin->id, 'is_self' => true, 'is_creator' => true]);

        $games = collect($this->actingAs($this->admin->fresh())->getJson('/api/game')->assertOk()->json())->keyBy('id');

        $this->assertSame([2, 1], [$games[$this->base->id]['playedMatchCount'], $games[$this->base->id]['personalPlayedMatchCount']]);
        $this->assertSame([2, 1], [$games[$this->expansion->id]['playedMatchCount'], $games[$this->expansion->id]['personalPlayedMatchCount']]);
        $this->assertSame([1, 0], [$games[$this->otherExpansion->id]['playedMatchCount'], $games[$this->otherExpansion->id]['personalPlayedMatchCount']]);
    }
}
