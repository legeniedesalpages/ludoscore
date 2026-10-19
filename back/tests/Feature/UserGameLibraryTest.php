<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use App\Services\Ai\GeminiClient;
use App\Services\Analytics\LocationService;
use App\Services\Analytics\NewsletterBuilder;
use App\Services\Analytics\StatsAssistant;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UserGameLibraryTest extends TestCase
{
    private User $owner;
    private User $other;

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'library_test', 'database.connections.library_test' => [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => 'test$',
            'foreign_key_constraints' => true,
        ]]);
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password');
            $table->boolean('is_admin')->default(false);
            $table->string('confirmation_key')->nullable();
            $table->boolean('newsletter_subscribed')->default(false);
            $table->timestamps();
        });
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->bigInteger('bgg_id');
            $table->boolean('in_library')->default(true);
            $table->date('ownership_date')->nullable();
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
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id');
            $table->unsignedBigInteger('winner_team_id')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('finished_at')->nullable();
            $table->text('tags')->nullable();
            $table->decimal('latitude')->nullable();
            $table->decimal('longitude')->nullable();
            $table->string('location_name')->nullable();
            $table->boolean('canceled')->default(false);
            $table->boolean('running')->default(false);
        });
        (require database_path('migrations/2026_10_19_200000_recreate_match_expansions_table.php'))->up();
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->unsignedBigInteger('match_id')->nullable();
            $table->string('color')->nullable();
            $table->integer('position')->nullable();
            $table->integer('score')->nullable();
            $table->text('tags')->nullable();
        });
        Schema::create('team_players', function (Blueprint $table) {
            $table->unsignedBigInteger('team_id');
            $table->unsignedBigInteger('player_id');
            $table->unsignedBigInteger('original_player_id')->nullable();
        });
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->string('pseudo')->nullable();
        });
        Schema::create('player_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players');
            $table->foreignId('user_id')->constrained('users');
            $table->boolean('is_self')->default(false);
            $table->boolean('is_creator')->default(false);
            $table->string('personal_pseudo')->nullable();
        });
        $this->owner = User::create(['email' => 'renaud_balu@hotmail.com', 'password' => 'unused', 'is_admin' => true]);
        $this->other = User::create(['email' => 'other@example.test', 'password' => 'unused', 'is_admin' => true]);
    }

    protected function tearDown(): void
    {
        DB::purge('library_test');
        parent::tearDown();
    }

    private function migration(): Migration
    {
        return require database_path('migrations/2026_10_18_000000_move_game_library_to_users.php');
    }

    private function game(array $attributes = []): Game
    {
        $game = new Game;
        $game->forceFill($attributes + [
            'title' => 'Test', 'bgg_id' => 42, 'image_id' => 'image.jpg',
            'thumbnail_id' => 'thumb.jpg', 'ownership_date' => '2020-02-03',
        ])->save();

        return $game;
    }

    private function payload(array $attributes = []): array
    {
        return $attributes + [
            'name' => 'Test', 'bggId' => 42, 'minPlayers' => 1, 'maxPlayers' => 4,
            'isOnlyCooperative' => false, 'estimatedDurationInMinutes' => 30,
            'matchTags' => '[]', 'playerTags' => '[]', 'playerColors' => '[]',
            'scoreTemplate' => '[]', 'drawBreaker' => '[]',
            'quantifiableScore' => true, 'highestScoreWin' => true, 'drawAllowed' => true,
        ];
    }

    public function test_personal_play_count_only_counts_completed_participations_of_the_linked_player(): void
    {
        $played = $this->game(['in_library' => false]);
        $unplayed = $this->game(['bgg_id' => 43, 'in_library' => false]);
        $this->migration()->up();
        DB::table('players')->insert([['id' => 101], ['id' => 202]]);
        DB::table('player_user')->insert([
            ['player_id' => 101, 'user_id' => $this->owner->id, 'is_self' => true],
            ['player_id' => 202, 'user_id' => $this->other->id, 'is_self' => true],
        ]);

        foreach ([
            [$played->id, 101, false, false],
            [$played->id, 101, false, false],
            [$played->id, 101, true, false],
            [$played->id, 101, false, true],
            [$unplayed->id, 202, false, false],
        ] as [$gameId, $playerId, $canceled, $running]) {
            $matchId = DB::table('matches')->insertGetId([
                'game_id' => $gameId, 'canceled' => $canceled, 'running' => $running,
            ]);
            $teamId = DB::table('teams')->insertGetId(['match_id' => $matchId]);
            DB::table('team_players')->insert([
                ['team_id' => $teamId, 'player_id' => $playerId],
                ['team_id' => $teamId, 'player_id' => $playerId],
            ]);
        }

        foreach ([
            [$this->owner, [$played->id => 2, $unplayed->id => 0]],
            [$this->other, [$played->id => 0, $unplayed->id => 1]],
        ] as [$user, $expected]) {
            $games = collect($this->actingAs($user)->getJson('/api/game')->assertOk()->json())->keyBy('id');
            foreach ($expected as $gameId => $count) {
                $this->assertSame($count, $games[$gameId]['personalPlayedMatchCount']);
            }
            $this->assertSame(2, $games[$played->id]['playedMatchCount']);
            $this->assertSame(1, $games[$unplayed->id]['playedMatchCount']);
        }

        DB::table('player_user')->where('user_id', $this->owner->id)->update(['is_self' => false]);
        $games = $this->actingAs($this->owner)->getJson('/api/game')->assertOk()->json();
        $this->assertSame([0, 0], array_column($games, 'personalPlayedMatchCount'));
    }

    public function test_library_user_count_only_includes_users_with_the_game_in_their_library(): void
    {
        $shared = $this->game();
        $outside = $this->game(['bgg_id' => 43, 'in_library' => false]);
        $this->migration()->up();
        $this->other->games()->attach($shared->id, ['in_library' => true]);
        $this->other->games()->attach($outside->id, ['in_library' => false]);

        foreach ([$this->owner, $this->other] as $user) {
            $games = collect($this->actingAs($user)->getJson('/api/game')->assertOk()->json())->keyBy('id');
            $this->assertSame(2, $games[$shared->id]['libraryUserCount']);
            $this->assertSame(0, $games[$outside->id]['libraryUserCount']);
        }

        $this->other->games()->updateExistingPivot($shared->id, ['in_library' => false]);
        $games = collect($this->getJson('/api/game')->assertOk()->json())->keyBy('id');
        $this->assertSame(1, $games[$shared->id]['libraryUserCount']);
    }

    public function test_migration_preserves_all_legacy_entries_and_dates_for_only_the_owner(): void
    {
        $in = $this->game();
        $out = $this->game(['bgg_id' => 43, 'in_library' => false, 'ownership_date' => null]);
        $this->migration()->up();

        $this->assertFalse(Schema::hasColumn('games', 'in_library'));
        $this->assertFalse(Schema::hasColumn('games', 'ownership_date'));
        $this->assertDatabaseHas('game_user', [
            'user_id' => $this->owner->id, 'game_id' => $in->id,
            'in_library' => true, 'ownership_date' => '2020-02-03',
        ]);
        $this->assertDatabaseHas('game_user', [
            'user_id' => $this->owner->id, 'game_id' => $out->id,
            'in_library' => false, 'ownership_date' => null,
        ]);
        $this->assertSame(0, $this->other->games()->count());
        $this->assertDatabaseCount('games', 2);
        $this->migration()->up();
        $this->assertDatabaseCount('game_user', 2);

        $this->migration()->down();
        $this->assertDatabaseHas('games', ['id' => $in->id, 'ownership_date' => '2020-02-03', 'in_library' => true]);
        $this->assertDatabaseHas('games', ['id' => $out->id, 'ownership_date' => null, 'in_library' => false]);
        $this->assertFalse(Schema::hasTable('game_user'));
    }

    public function test_missing_legacy_owner_aborts_without_changing_the_schema_or_data(): void
    {
        $game = $this->game();
        $this->owner->delete();
        try {
            $this->migration()->up();
            $this->fail('Missing legacy owner must abort migration.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('introuvable', $e->getMessage());
        }
        $this->assertFalse(Schema::hasTable('game_user'));
        $this->assertDatabaseHas('games', ['id' => $game->id, 'ownership_date' => '2020-02-03']);
    }

    public function test_empty_installation_does_not_require_the_legacy_account(): void
    {
        $this->owner->delete();
        $this->migration()->up();
        $this->assertDatabaseCount('game_user', 0);
        $this->assertFalse(Schema::hasColumn('games', 'ownership_date'));
    }

    public function test_migration_can_resume_after_pivot_creation_and_copy(): void
    {
        $game = $this->game();
        $this->migration()->up();
        Schema::table('games', function (Blueprint $table) {
            $table->boolean('in_library')->default(true);
            $table->date('ownership_date')->nullable();
        });
        DB::table('games')->where('id', $game->id)->update(['ownership_date' => '2020-02-03']);
        $this->migration()->up();
        $this->assertDatabaseCount('game_user', 1);
        $this->assertDatabaseHas('game_user', ['game_id' => $game->id, 'ownership_date' => '2020-02-03']);
    }

    public function test_rollback_refuses_to_lose_another_users_library(): void
    {
        $game = $this->game();
        $this->migration()->up();
        $this->other->games()->attach($game->id, ['in_library' => true]);
        try {
            $this->migration()->down();
            $this->fail('Rollback must not discard user libraries.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('sans perte', $e->getMessage());
        }
        $this->assertDatabaseCount('game_user', 2);
        $this->assertFalse(Schema::hasColumn('games', 'in_library'));
    }

    public function test_list_and_both_detail_routes_only_expose_the_current_users_library(): void
    {
        $game = $this->game();
        $this->migration()->up();
        foreach ([
            [$this->owner, 1, '2020-02-03'],
            [$this->other, 0, null],
        ] as [$user, $inLibrary, $date]) {
            $this->actingAs($user)->getJson('/api/game')->assertOk()
                ->assertJsonPath('0.inLibrary', $inLibrary)->assertJsonPath('0.ownershipDate', $date);
            foreach (['/api/game/'.$game->id, '/api/game/bgg/42'] as $url) {
                $this->getJson($url)->assertOk()
                    ->assertJsonPath('inLibrary', $inLibrary)->assertJsonPath('ownershipDate', $date);
            }
        }
        $this->getJson('/api/game/999')->assertNotFound();
    }

    public function test_saving_and_removing_only_change_the_authenticated_users_association(): void
    {
        $game = $this->game();
        $this->migration()->up();
        $this->actingAs($this->other);
        $payload = $this->payload(['inLibrary' => true, 'ownershipDate' => '2026-10-18', 'userId' => $this->owner->id]);
        $this->postJson('/api/game', $payload)->assertOk()->assertJsonPath('id', $game->id);
        $this->postJson('/api/game', $payload)->assertOk();
        $this->assertDatabaseCount('games', 1);
        $this->assertDatabaseCount('game_user', 2);
        $this->assertDatabaseHas('game_user', [
            'user_id' => $this->other->id, 'game_id' => $game->id,
            'in_library' => true, 'ownership_date' => '2026-10-18',
        ]);
        $this->postJson('/api/game', $this->payload(['inLibrary' => false, 'ownershipDate' => '2026-10-18']))->assertOk();
        $this->assertDatabaseHas('game_user', [
            'user_id' => $this->other->id, 'in_library' => false, 'ownership_date' => null,
        ]);
        $this->assertDatabaseHas('game_user', [
            'user_id' => $this->owner->id, 'in_library' => true, 'ownership_date' => '2020-02-03',
        ]);
        $this->assertDatabaseCount('games', 1);
    }

    public function test_match_history_and_detail_use_the_current_users_library(): void
    {
        $game = $this->game();
        $matchId = DB::table('matches')->insertGetId(['game_id' => $game->id, 'started_at' => '2026-10-18 10:00:00']);
        $this->migration()->up();
        foreach ([
            [$this->owner, 1, '2020-02-03'],
            [$this->other, 0, null],
        ] as [$user, $inLibrary, $date]) {
            $this->actingAs($user)->getJson('/api/game-match?page=0&size=10')->assertOk()
                ->assertJsonPath('0.idMatch', $matchId)->assertJsonPath('0.gameId', $game->id)
                ->assertJsonPath('0.inLibrary', $inLibrary)->assertJsonPath('0.ownershipDate', $date);
            $this->getJson('/api/game-match/'.$matchId)->assertOk()
                ->assertJsonPath('idMatch', $matchId)->assertJsonPath('gameId', $game->id)
                ->assertJsonPath('inLibrary', $inLibrary)->assertJsonPath('ownershipDate', $date);
        }
    }

    public function test_new_game_and_legacy_payload_attach_only_to_the_current_user(): void
    {
        Storage::fake('images');
        $this->migration()->up();
        $this->actingAs($this->other);
        $this->postJson('/api/game', $this->payload([
            'imageUrlFromBgg' => 'data://text/plain,image',
            'thumbnailUrlFromBgg' => 'data://text/plain,thumb',
        ]))->assertCreated();
        $this->assertSame(1, $this->other->games()->wherePivot('in_library', true)->count());
        $this->assertSame(0, $this->owner->games()->count());
    }

    private function fakeExpansion(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            '*xmlapi2/thing?stats=1&id=50&versions=1' => Http::response(
                '<items><item type="boardgameexpansion" id="50"><name type="primary" value="Expansion"/>'
                . '<minplayers value="1"/><maxplayers value="4"/>'
                . '<link type="boardgameexpansion" id="42" value="Base" inbound="true"/>'
                . '<link type="boardgameexpansion" id="60" value="Other base" inbound="true"/>'
                . '<link type="boardgameexpansion" id="60" value="Other base" inbound="true"/>'
                . '<link type="boardgameexpansion" id="61" value="Other expansion" inbound="true"/>'
                . '<link type="boardgameexpansion" id="62" value="Child expansion"/>'
                . '</item></items>'
            ),
            '*xmlapi2/thing?stats=1&id=42,60,61&versions=1' => Http::response(
                '<items><item type="boardgame" id="42"><name value="Base"/></item>'
                . '<item type="boardgame" id="60"><name value="Other base"/></item>'
                . '<item type="boardgameexpansion" id="61"><name value="Other expansion"/></item></items>'
            ),
        ]);
    }

    public function test_expansion_requires_one_catalogued_base_game_without_requiring_ownership(): void
    {
        $this->migration()->up();
        Storage::fake('images');
        $this->fakeExpansion();
        $this->actingAs($this->owner);
        $this->getJson('/api/game_search_detail?id=50')->assertOk()
            ->assertJsonPath('isExpansion', true)
            ->assertJsonPath('canAddExpansion', false)
            ->assertJsonPath('baseGames.0.name', 'Base')
            ->assertJsonPath('minplayers', '1')->assertJsonPath('maxplayers', '4');
        $payload = $this->payload([
            'bggId' => 50, 'name' => 'Expansion', 'isExpansion' => true,
            'imageUrlFromBgg' => 'data://text/plain,image',
            'thumbnailUrlFromBgg' => 'data://text/plain,thumb',
        ]);
        $this->postJson('/api/game', $payload)->assertUnprocessable()->assertJsonValidationErrors('isExpansion');
        $this->assertDatabaseCount('games', 0);
        $this->assertDatabaseCount('game_expansion', 0);
        $this->assertDatabaseCount('game_user', 0);
        Storage::disk('images')->assertDirectoryEmpty('/');
        $base = new Game;
        $base->forceFill(['title' => 'Base', 'bgg_id' => 42, 'is_expansion' => true])->save();
        $this->postJson('/api/game', $payload)->assertUnprocessable()->assertJsonValidationErrors('isExpansion');
        $base->is_expansion = false;
        $base->save();
        $this->getJson('/api/game_search_detail?id=50')->assertOk()
            ->assertJsonPath('canAddExpansion', true)->assertJsonPath('baseGames.0.owned', false);
        $response = $this->postJson('/api/game', $this->payload([
            'bggId' => 50, 'name' => 'Expansion', 'isExpansion' => true,
            'imageUrlFromBgg' => 'data://text/plain,image',
            'thumbnailUrlFromBgg' => 'data://text/plain,thumb',
        ]))->assertCreated();
        $extension = Game::findOrFail($response->json('id'));

        $this->assertDatabaseCount('games', 2);
        $this->assertDatabaseHas('games', ['id' => $extension->id, 'is_expansion' => true]);
        $this->assertDatabaseCount('game_expansion', 2);
        foreach ([42, 60] as $parentId) {
            $this->assertDatabaseHas('game_expansion', ['extension_id' => $extension->id, 'base_game_bgg_id' => $parentId]);
        }
        $this->assertSame([$base->id], $extension->baseGames()->pluck('games.id')->all());
        $this->assertSame(1, $this->owner->games()->wherePivot('in_library', true)->count());
        $this->assertSame(0, $this->other->games()->count());
        $this->getJson('/api/game/bgg/50')->assertOk()->assertJsonPath('isExpansion', 1);
        $this->getJson('/api/game/'.$extension->id)->assertOk()->assertJsonPath('isExpansion', 1);
        $this->getJson('/api/game')->assertOk()->assertJsonCount(2);
        $catalogue = collect($this->getJson('/api/game')->assertOk()->json())->keyBy('id');
        $this->assertSame([42, 60], $catalogue[$extension->id]['baseGameBggIds']);
        $this->assertSame([], $catalogue[$base->id]['baseGameBggIds']);

        $otherBase = new Game;
        $otherBase->forceFill(['title' => 'Other base', 'bgg_id' => 60])->save();
        $this->assertSame(2, $extension->baseGames()->count());
        $this->assertSame([$extension->id], $base->expansions()->pluck('games.id')->all());
        $this->assertSame(1, $this->owner->games()->count());
        Http::assertSentCount(2);
    }

    public function test_editing_or_adding_an_existing_expansion_preserves_its_type_and_links(): void
    {
        $this->game();
        $this->migration()->up();
        $extension = new Game;
        $extension->forceFill([
            'title' => 'Expansion', 'bgg_id' => 50, 'is_expansion' => true,
            'image_id' => 'image.jpg', 'thumbnail_id' => 'thumb.jpg',
        ])->save();
        $extension->baseGames()->sync([42, 60]);
        $this->owner->games()->attach($extension->id, ['in_library' => true]);
        Http::preventStrayRequests();
        Http::fake();

        $this->actingAs($this->other)->postJson('/api/game', $this->payload([
            'bggId' => 50, 'name' => 'Edited expansion', 'isExpansion' => false,
        ]))->assertOk();
        $this->postJson('/api/game', $this->payload([
            'bggId' => 50, 'name' => 'Edited again',
        ]))->assertOk();

        $this->assertDatabaseHas('games', ['id' => $extension->id, 'is_expansion' => true, 'title' => 'Edited again']);
        $this->assertDatabaseCount('game_expansion', 2);
        $this->assertDatabaseCount('games', 2);
        $this->assertSame(2, $this->owner->games()->count());
        $this->assertSame(1, $this->other->games()->count());
        Http::assertNothingSent();

        $extension->delete();
        $this->assertDatabaseCount('game_expansion', 0);
    }

    public function test_expansions_store_only_additional_players_and_colors_without_changing_base_games(): void
    {
        $red = ['name' => 'Rouge', 'code' => 'red', 'invert' => 'white', 'fallback' => []];
        $blue = ['name' => 'Bleu', 'code' => 'blue', 'invert' => 'white', 'fallback' => []];
        $green = ['name' => 'Vert', 'code' => 'green', 'invert' => 'white', 'fallback' => []];
        $base = $this->game(['player_colors' => json_encode([$red]), 'min_players' => 1, 'max_players' => 4,
            'estimated_duration_in_minutes' => 90, 'quantifiable_score' => false, 'highest_score_win' => false]);
        $otherBase = $this->game(['bgg_id' => 60, 'title' => 'Other base', 'player_colors' => json_encode([$blue])]);
        $this->migration()->up();
        $baseAttributes = $base->fresh()->getAttributes();
        $otherAttributes = $otherBase->fresh()->getAttributes();
        Storage::fake('images');
        $this->fakeExpansion();
        $this->actingAs($this->owner);
        $this->getJson('/api/game_search_detail?id=50')->assertOk()
            ->assertJsonCount(2, 'baseGameColors')
            ->assertJsonFragment(['playerColors' => [$red]])
            ->assertJsonFragment(['playerColors' => [$blue]]);

        $payload = $this->payload([
            'bggId' => 50, 'name' => 'Expansion', 'isExpansion' => true, 'additionalPlayers' => 2,
            'playerColors' => json_encode([$green]),
            'imageUrlFromBgg' => 'data://text/plain,image', 'thumbnailUrlFromBgg' => 'data://text/plain,thumb',
        ]);
        foreach (['minPlayers', 'maxPlayers', 'isOnlyCooperative', 'estimatedDurationInMinutes', 'quantifiableScore', 'highestScoreWin'] as $field) {
            unset($payload[$field]);
        }
        $id = $this->postJson('/api/game', $payload)->assertCreated()->json('id');
        $extension = Game::findOrFail($id);
        $this->assertSame(2, $extension->additional_players);
        $this->assertSame([$green], json_decode($extension->player_colors, true));
        foreach (['/api/game/bgg/50', '/api/game/'.$id] as $url) {
            $this->getJson($url)->assertOk()->assertJsonPath('additionalPlayers', 2)
                ->assertJsonCount(2, 'baseGameColors')
                ->assertJsonFragment(['playerColors' => [$red]])
                ->assertJsonFragment(['playerColors' => [$blue]]);
        }
        $this->postJson('/api/game', $this->payload([
            'bggId' => 50, 'additionalPlayers' => 0, 'playerColors' => '[]',
            'minPlayers' => 20, 'maxPlayers' => 30, 'estimatedDurationInMinutes' => 500,
            'isOnlyCooperative' => true, 'quantifiableScore' => false, 'highestScoreWin' => false,
        ]))->assertOk();
        $this->assertDatabaseHas('games', ['id' => $id, 'additional_players' => 0, 'min_players' => 0,
            'max_players' => 0, 'estimated_duration_in_minutes' => 0, 'is_only_cooperative' => false,
            'quantifiable_score' => true, 'highest_score_win' => true]);
        $this->assertSame($baseAttributes, $base->fresh()->getAttributes());
        $this->assertSame($otherAttributes, $otherBase->fresh()->getAttributes());
    }

    public function test_invalid_extension_players_and_inherited_or_duplicate_colors_are_rejected(): void
    {
        $red = ['name' => 'Rouge', 'code' => 'red', 'invert' => 'white', 'fallback' => []];
        $blue = ['name' => 'Bleu', 'code' => 'blue', 'invert' => 'white', 'fallback' => []];
        $this->game(['player_colors' => json_encode([$red])]);
        $extension = $this->game(['bgg_id' => 50, 'is_expansion' => true, 'additional_players' => 2, 'player_colors' => '[]']);
        $extension->baseGames()->sync([42]);
        $this->migration()->up();
        $this->actingAs($this->owner);
        foreach ([-1, 1.5, null, 'invalid', 65536] as $value) {
            $this->postJson('/api/game', $this->payload(['bggId' => 50, 'additionalPlayers' => $value]))
                ->assertUnprocessable()->assertJsonValidationErrors('additionalPlayers');
        }
        foreach (['invalid', 'null', '{}', json_encode([$red]), json_encode([array_merge($red, ['code' => 'RED'])]),
            json_encode([$blue, $blue]), json_encode([['code' => 'blue']])] as $colors) {
            $this->postJson('/api/game', $this->payload(['bggId' => 50, 'playerColors' => $colors]))
                ->assertUnprocessable();
        }
        $this->assertDatabaseHas('games', ['id' => $extension->id, 'additional_players' => 2, 'player_colors' => '[]']);
    }

    public function test_legacy_extension_hidden_properties_are_preserved_and_regular_games_remain_editable(): void
    {
        $base = $this->game(['min_players' => 1, 'max_players' => 4, 'estimated_duration_in_minutes' => 90]);
        $extension = $this->game(['bgg_id' => 50, 'is_expansion' => true, 'additional_players' => 2,
            'min_players' => 1, 'max_players' => 6, 'estimated_duration_in_minutes' => 120,
            'is_only_cooperative' => true, 'quantifiable_score' => false, 'highest_score_win' => false]);
        $extension->baseGames()->sync([42]);
        $this->migration()->up();
        $this->actingAs($this->owner)->postJson('/api/game', $this->payload(['bggId' => 50]))->assertOk();
        $this->assertDatabaseHas('games', ['id' => $extension->id, 'additional_players' => 2,
            'min_players' => 1, 'max_players' => 6, 'estimated_duration_in_minutes' => 120,
            'is_only_cooperative' => true, 'quantifiable_score' => false, 'highest_score_win' => false]);
        $this->postJson('/api/game', $this->payload([
            'minPlayers' => 2, 'maxPlayers' => 5, 'estimatedDurationInMinutes' => 60,
            'isOnlyCooperative' => true, 'quantifiableScore' => false, 'highestScoreWin' => false,
        ]))->assertOk();
        $this->assertDatabaseHas('games', ['id' => $base->id, 'min_players' => 2, 'max_players' => 5,
            'estimated_duration_in_minutes' => 60, 'is_only_cooperative' => true,
            'quantifiable_score' => false, 'highest_score_win' => false]);
    }

    public function test_expansion_tag_value_changes_are_saved_separately_for_each_parent_and_scope(): void
    {
        $tag = ['category' => 'Faction', 'unique' => true, 'minOcurrences' => 1, 'maxOcurrences' => 1,
            'revealedLater' => true, 'names' => ['A', 'B']];
        $base = $this->game(['player_tags' => json_encode([$tag]), 'match_tags' => json_encode([$tag])]);
        $other = $this->game(['bgg_id' => 60, 'title' => 'Other', 'player_tags' => json_encode([$tag])]);
        $this->migration()->up();
        $baseAttributes = $base->fresh()->getAttributes();
        $otherAttributes = $other->fresh()->getAttributes();
        $this->fakeExpansion();
        Storage::fake('images');
        $changes = [
            ['baseGameBggId' => 42, 'scope' => 'player', 'category' => 'Faction', 'addedValues' => ['C'], 'removedValues' => ['A']],
            ['baseGameBggId' => 42, 'scope' => 'match', 'category' => 'Faction', 'addedValues' => [], 'removedValues' => ['A', 'B']],
            ['baseGameBggId' => 60, 'scope' => 'player', 'category' => 'Faction', 'addedValues' => ['D'], 'removedValues' => []],
        ];
        $this->actingAs($this->other)->getJson('/api/game_search_detail?id=50')->assertOk()
            ->assertJsonCount(2, 'baseGameTags')
            ->assertJsonPath('baseGameTags.0.playerTags.0.category', 'Faction');
        $newTag = array_merge($tag, ['category' => 'New tag', 'names' => ['New value']]);
        $id = $this->postJson('/api/game', $this->payload([
            'bggId' => 50, 'isExpansion' => true, 'expansionTagChanges' => $changes,
            'playerTags' => json_encode([$newTag]), 'matchTags' => json_encode([$newTag]),
            'imageUrlFromBgg' => 'data://text/plain,image', 'thumbnailUrlFromBgg' => 'data://text/plain,thumb',
        ]))->assertCreated()->json('id');
        $this->assertSame($changes, Game::findOrFail($id)->expansion_tag_changes);
        foreach (['/api/game/bgg/50', '/api/game/'.$id] as $url) {
            $this->getJson($url)->assertOk()->assertJsonPath('expansionTagChanges', $changes)
                ->assertJsonCount(2, 'baseGameTags')->assertJsonPath('baseGameTags.0.playerTags.0.names', ['A', 'B']);
        }
        $this->postJson('/api/game', $this->payload(['bggId' => 50]))->assertOk();
        $this->assertSame($changes, Game::findOrFail($id)->expansion_tag_changes);
        $this->postJson('/api/game', $this->payload([
            'bggId' => 50, 'expansionTagChanges' => [], 'playerTags' => json_encode([$newTag]),
            'matchTags' => json_encode([$newTag]),
        ]))->assertOk();
        $this->assertSame([], Game::findOrFail($id)->expansion_tag_changes);
        $this->assertSame([$newTag], json_decode(Game::findOrFail($id)->player_tags, true));
        $this->assertSame([$newTag], json_decode(Game::findOrFail($id)->match_tags, true));
        $this->assertSame($baseAttributes, $base->fresh()->getAttributes());
        $this->assertSame($otherAttributes, $other->fresh()->getAttributes());
    }

    public function test_invalid_or_stale_tag_value_changes_cannot_modify_any_game(): void
    {
        $tag = ['category' => 'Faction', 'unique' => true, 'minOcurrences' => 1, 'maxOcurrences' => 1, 'names' => ['A', 'B']];
        $this->game(['player_tags' => json_encode([$tag])]);
        $this->game(['bgg_id' => 60, 'player_tags' => json_encode([$tag])]);
        $extension = $this->game(['bgg_id' => 50, 'is_expansion' => true]);
        $extension->baseGames()->sync([42]);
        $this->migration()->up();
        $change = ['baseGameBggId' => 42, 'scope' => 'player', 'category' => 'Faction', 'addedValues' => ['C'], 'removedValues' => ['A']];
        $this->actingAs($this->owner);
        foreach ([
            null, '[]', ['unexpected' => $change], [$change, $change],
            [$change, array_merge($change, ['baseGameBggId' => '42'])],
            [array_merge($change, ['baseGameBggId' => 60])],
            [array_merge($change, ['category' => 'Missing'])],
            [array_merge($change, ['scope' => 'score'])],
            [array_merge($change, ['scope' => 'match'])],
            [array_merge($change, ['addedValues' => ['A']])],
            [array_merge($change, ['addedValues' => ['C', 'C']])],
            [array_merge($change, ['removedValues' => ['A', 'A']])],
            [array_merge($change, ['removedValues' => ['C']])],
            [array_merge($change, ['addedValues' => [null]])],
            [array_merge($change, ['unique' => false])],
        ] as $invalid) {
            $this->postJson('/api/game', $this->payload([
                'bggId' => 50, 'name' => 'Must not change', 'expansionTagChanges' => $invalid,
            ]))->assertUnprocessable();
        }
        $this->assertSame(null, $extension->fresh()->expansion_tag_changes);
        $this->assertSame('Test', $extension->fresh()->title);
        $this->postJson('/api/game', $this->payload(['expansionTagChanges' => [$change]]))
            ->assertUnprocessable()->assertJsonValidationErrors('expansionTagChanges');
        $this->postJson('/api/game', $this->payload(['bggId' => 50, 'expansionTagChanges' => [$change]]))->assertOk();
        Game::where('bgg_id', 42)->update(['player_tags' => '[]']);
        $this->postJson('/api/game', $this->payload(['bggId' => 50, 'expansionTagChanges' => [$change]]))->assertUnprocessable();
        $this->assertSame([$change], $extension->fresh()->expansion_tag_changes);
        $this->postJson('/api/game', $this->payload(['bggId' => 50, 'expansionTagChanges' => []]))->assertOk();
        $this->assertSame([], $extension->fresh()->expansion_tag_changes);
    }

    public function test_expansion_score_category_changes_store_only_differing_properties(): void
    {
        $red = ['name' => 'Rouge', 'code' => 'red', 'invert' => 'white', 'fallback' => ['Pourpre']];
        $score = ['category' => 'Animaux', 'min' => 0, 'max' => 10, 'negatif' => false, 'complex' => false,
            'color' => ['name' => 'Aucune', 'code' => 'white', 'invert' => 'black', 'fallback' => []]];
        $base = $this->game(['score_template' => json_encode([$score])]);
        $this->game(['bgg_id' => 60, 'title' => 'Other', 'score_template' => json_encode([$score])]);
        $this->migration()->up();
        $baseAttributes = $base->fresh()->getAttributes();
        $this->fakeExpansion();
        Storage::fake('images');
        $this->actingAs($this->other)->getJson('/api/game_search_detail?id=50')->assertOk()
            ->assertJsonPath('baseGameTags.0.scoreTags.0.category', 'Animaux');
        $id = $this->postJson('/api/game', $this->payload([
            'bggId' => 50, 'isExpansion' => true,
            'imageUrlFromBgg' => 'data://text/plain,image', 'thumbnailUrlFromBgg' => 'data://text/plain,thumb',
            'expansionScoreChanges' => [
                ['baseGameBggId' => 42, 'category' => 'Animaux', 'properties' => [
                    'min' => 0, 'max' => null, 'negatif' => true, 'complex' => false, 'color' => $red,
                ]],
                ['baseGameBggId' => 60, 'category' => 'Animaux', 'properties' => [
                    'min' => '0', 'max' => 10, 'negatif' => false, 'complex' => false, 'color' => $score['color'],
                ]],
            ],
        ]))->assertCreated()->json('id');
        $expected = [['baseGameBggId' => 42, 'category' => 'Animaux', 'properties' => [
            'max' => null, 'negatif' => true, 'color' => $red,
        ]]];
        $this->assertSame($expected, Game::findOrFail($id)->expansion_score_changes);
        foreach (['/api/game/bgg/50', '/api/game/'.$id] as $url) {
            $this->getJson($url)->assertOk()->assertJsonPath('expansionScoreChanges', $expected)
                ->assertJsonPath('baseGameTags.0.scoreTags.0.max', 10);
        }
        $this->postJson('/api/game', $this->payload(['bggId' => 50]))->assertOk();
        $this->assertSame($expected, Game::findOrFail($id)->expansion_score_changes);
        $this->postJson('/api/game', $this->payload(['bggId' => 50, 'expansionScoreChanges' => []]))->assertOk();
        $this->assertSame([], Game::findOrFail($id)->expansion_score_changes);
        $this->assertSame($baseAttributes, $base->fresh()->getAttributes());
    }

    public function test_invalid_score_category_changes_are_rejected(): void
    {
        $score = ['category' => 'Animaux', 'min' => 0, 'max' => 10, 'negatif' => false, 'complex' => false,
            'color' => ['name' => 'Aucune', 'code' => 'white', 'invert' => 'black', 'fallback' => []]];
        $this->game(['score_template' => json_encode([$score])]);
        $extension = $this->game(['bgg_id' => 50, 'is_expansion' => true]);
        $extension->baseGames()->sync([42]);
        $this->migration()->up();
        $change = ['baseGameBggId' => 42, 'category' => 'Animaux', 'properties' => ['negatif' => true]];
        $this->actingAs($this->owner);
        foreach ([
            null, '[]', ['unexpected' => $change], [$change, $change],
            [array_merge($change, ['baseGameBggId' => 60])],
            [array_merge($change, ['category' => 'Missing'])],
            [array_merge($change, ['properties' => ['category' => 'Renamed']])],
            [array_merge($change, ['properties' => ['min' => 'abc']])],
            [array_merge($change, ['properties' => ['min' => 20]])],
            [array_merge($change, ['properties' => ['color' => ['code' => 'red']]])],
            [array_merge($change, ['extra' => true])],
        ] as $invalid) {
            $this->postJson('/api/game', $this->payload([
                'bggId' => 50, 'name' => 'Must not change', 'expansionScoreChanges' => $invalid,
            ]))->assertUnprocessable();
        }
        $this->assertNull($extension->fresh()->expansion_score_changes);
        $this->assertSame('Test', $extension->fresh()->title);
        $this->postJson('/api/game', $this->payload(['expansionScoreChanges' => [$change]]))
            ->assertUnprocessable()->assertJsonValidationErrors('expansionScoreChanges');
    }

    public function test_empty_tag_deltas_are_not_stored_and_parent_tags_remain_live(): void
    {
        $tag = ['category' => 'Faction', 'unique' => true, 'minOcurrences' => 1, 'maxOcurrences' => 1, 'names' => ['A']];
        $base = $this->game(['player_tags' => json_encode([$tag])]);
        $extension = $this->game(['bgg_id' => 50, 'is_expansion' => true]);
        $extension->baseGames()->sync([42]);
        $this->migration()->up();
        $this->actingAs($this->owner)->postJson('/api/game', $this->payload([
            'bggId' => 50, 'expansionTagChanges' => [
                ['baseGameBggId' => 42, 'scope' => 'player', 'category' => 'Faction', 'addedValues' => [], 'removedValues' => []],
            ],
        ]))->assertOk();
        $this->assertSame([], $extension->fresh()->expansion_tag_changes);
        $tag['names'][] = 'B';
        $base->player_tags = json_encode([$tag]);
        $base->save();
        $this->getJson('/api/game/bgg/50')->assertOk()->assertJsonPath('baseGameTags.0.playerTags.0.names', ['A', 'B']);
    }

    public function test_invalid_expansion_metadata_is_rejected_before_creating_anything(): void
    {
        $this->migration()->up();
        Http::preventStrayRequests();
        Http::fake([
            '*xmlapi2/thing*' => Http::response('<items><item type="boardgame" id="42"><name value="Base"/></item></items>'),
        ]);
        $this->actingAs($this->owner)->postJson('/api/game', $this->payload(['isExpansion' => true]))
            ->assertUnprocessable()->assertJsonValidationErrors('isExpansion');
        $this->postJson('/api/game', $this->payload(['isExpansion' => 'invalid']))->assertUnprocessable();
        $this->assertDatabaseCount('games', 0);
        $this->assertDatabaseCount('game_expansion', 0);
        $this->assertDatabaseCount('game_user', 0);
    }

    public function test_incomplete_bgg_parents_abort_expansion_creation_without_writing_links(): void
    {
        $this->migration()->up();
        Http::preventStrayRequests();
        Http::fake([
            '*xmlapi2/thing?stats=1&id=50&versions=1' => Http::response(
                '<items><item type="boardgameexpansion" id="50"><name value="Expansion"/>'
                . '<link type="boardgameexpansion" id="42" value="Missing base" inbound="true"/></item></items>'
            ),
            '*xmlapi2/thing?stats=1&id=42&versions=1' => Http::response('<items/>'),
        ]);
        $this->actingAs($this->owner)->postJson('/api/game', $this->payload(['bggId' => 50, 'isExpansion' => true]))
            ->assertStatus(502);
        $this->assertDatabaseCount('games', 0);
        $this->assertDatabaseCount('game_expansion', 0);
        $this->assertDatabaseCount('game_user', 0);
    }

    public function test_expansion_and_its_links_are_rolled_back_if_library_membership_cannot_be_saved(): void
    {
        $base = $this->game();
        $this->migration()->up();
        Storage::fake('images');
        $this->fakeExpansion();
        DB::statement('CREATE TRIGGER reject_membership BEFORE INSERT ON "test$game_user" BEGIN SELECT RAISE(ABORT, \'Membership rejected\'); END');

        $this->actingAs($this->owner)->postJson('/api/game', $this->payload([
            'bggId' => 50, 'isExpansion' => true,
            'imageUrlFromBgg' => 'data://text/plain,image',
            'thumbnailUrlFromBgg' => 'data://text/plain,thumb',
        ]))->assertStatus(500);

        $this->assertDatabaseCount('games', 1);
        $this->assertDatabaseHas('games', ['id' => $base->id]);
        $this->assertDatabaseCount('game_expansion', 0);
        $this->assertDatabaseCount('game_user', 1);
    }

    public function test_a_match_cannot_be_started_from_an_expansion(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->unsignedBigInteger('replaced_by_player_id')->nullable();
        });
        $extension = $this->game(['is_expansion' => true]);
        DB::table('players')->insert(['id' => 101, 'pseudo' => 'Player']);
        $this->actingAs($this->owner)->postJson('/api/game-match', [
            'match' => ['gameId' => $extension->id, 'tags' => []],
            'teams' => [['players' => [['playerId' => 101]]]],
        ])->assertStatus(422);
        $this->assertDatabaseCount('matches', 0);
    }

    public function test_invalid_library_fields_are_rejected_without_mutation(): void
    {
        $this->game();
        $this->migration()->up();
        $this->actingAs($this->other);
        $this->postJson('/api/game', $this->payload(['inLibrary' => 'invalid']))->assertUnprocessable();
        $this->postJson('/api/game', $this->payload(['ownershipDate' => 'not-a-date']))->assertUnprocessable();
        $this->assertSame(0, $this->other->games()->count());
    }

    public function test_bgg_search_distinguishes_catalog_presence_from_personal_ownership(): void
    {
        Http::preventStrayRequests();
        $this->game();
        $this->game(['bgg_id' => 43, 'in_library' => false]);
        $this->migration()->up();
        Http::fake([
            '*xmlapi2/search*type=boardgameexpansion*' => Http::response('<items total="0"></items>'),
            '*xmlapi2/search*' => Http::response('<items total="3"><item id="42"/><item id="43"/><item id="44"/></items>'),
            '*xmlapi2/thing*' => Http::response('<items><item id="42"><name value="First"/><poll totalvotes="3"/></item><item id="43"><name value="Second"/><poll totalvotes="2"/></item><item id="44"><name value="New"/><poll totalvotes="1"/></item></items>'),
        ]);
        $this->actingAs($this->owner)->getJson('/api/game_search?q=test')->assertOk()
            ->assertJsonPath('0.owned', true)->assertJsonPath('0.registered', true)
            ->assertJsonPath('1.owned', false)->assertJsonPath('1.registered', true)
            ->assertJsonPath('2.owned', false)->assertJsonPath('2.registered', false);
        $this->actingAs($this->other)->getJson('/api/game_search?q=test')->assertOk()
            ->assertJsonPath('0.owned', false)->assertJsonPath('0.registered', true);
    }

    public function test_bgg_french_titles_are_consistent_across_search_modes_and_creation_details(): void
    {
        Http::preventStrayRequests();
        $game = $this->game(['title' => 'My custom title']);
        $this->migration()->up();
        Cache::put('bgg.thing.42', [
            '@attributes' => ['id' => '42'],
            'name' => ['@attributes' => ['type' => 'primary', 'value' => 'Old cached English title']],
        ], now()->addDay());
        $gameXml = '<item type="boardgame" id="42"><name type="primary" value="Base game"/>'
            . '<link type="boardgameexpansion" id="50" value="Expansion"/>'
            . '<versions><item id="420"><name type="primary" value="French edition"/>'
            . '<canonicalname value="Jeu en français"/><link type="language" id="2187" value="French"/></item></versions></item>';
        $expansionXml = '<item type="boardgameexpansion" id="50"><name type="primary" value="Expansion"/>'
            . '<link type="boardgameexpansion" id="42" value="Base game" inbound="true"/>'
            . '<versions><item id="500"><name type="primary" value="French edition"/>'
            . '<canonicalname value="Extension française"/><link type="language" id="2187" value="French"/></item></versions></item>';
        Http::fake([
            '*xmlapi2/search*type=boardgameexpansion*' => Http::response('<items total="1"><item id="50"/></items>'),
            '*xmlapi2/search*' => Http::response('<items total="2"><item id="42"/><item id="50"/></items>'),
            '*xmlapi2/thing?stats=1&id=42&versions=1' => Http::response('<items>' . $gameXml . '</items>'),
            '*xmlapi2/thing?stats=1&id=50&versions=1' => Http::response('<items>' . $expansionXml . '</items>'),
        ]);

        $this->actingAs($this->owner);
        $this->getJson('/api/game_search?q=test')->assertOk()->assertJsonPath('0.name', 'Jeu en français');
        $this->getJson('/api/game_search?q=test&type=expansion')->assertOk()
            ->assertJsonPath('0.name', 'Extension française')
            ->assertJsonPath('0.baseGames.0.name', 'Jeu en français')
            ->assertJsonPath('0.baseGames.0.owned', true);
        $this->getJson('/api/game_search?q=test&type=all')->assertOk()
            ->assertJsonPath('0.name', 'Jeu en français')
            ->assertJsonPath('0.expansions.0.name', 'Extension française');
        $this->getJson('/api/game_search_detail?id=42')->assertOk()->assertJsonPath('name', 'Jeu en français');
        $this->getJson('/api/game_search_detail?id=50')->assertOk()->assertJsonPath('name', 'Extension française');

        Http::assertSentCount(6);
        Http::assertSent(fn($request) => str_contains($request->url(), 'versions=1'));
        $this->assertSame('My custom title', $game->fresh()->title);
    }

    public function test_french_title_from_creation_details_is_saved_and_returned_in_the_library(): void
    {
        Http::preventStrayRequests();
        Storage::fake('images');
        $this->migration()->up();
        Http::fake([
            '*xmlapi2/thing?stats=1&id=42&versions=1' => Http::response(
                '<items><item type="boardgame" id="42"><name type="primary" value="Ticket to Ride"/>'
                . '<versions><item><canonicalname value="Les Aventuriers du Rail"/>'
                . '<link type="language" id="2187" value="French"/></item></versions></item></items>'
            ),
        ]);
        $this->actingAs($this->owner);
        $title = $this->getJson('/api/game_search_detail?id=42')->assertOk()->json('name');
        $this->postJson('/api/game', $this->payload([
            'name' => $title,
            'imageUrlFromBgg' => 'data://text/plain,image',
            'thumbnailUrlFromBgg' => 'data://text/plain,thumb',
        ]))->assertCreated();

        $this->assertDatabaseHas('games', ['bgg_id' => 42, 'title' => 'Les Aventuriers du Rail']);
        $this->getJson('/api/game/bgg/42')->assertOk()->assertJsonPath('title', 'Les Aventuriers du Rail');
    }

    public function test_bgg_title_selection_prefers_french_only_editions_and_has_safe_fallbacks(): void
    {
        Http::preventStrayRequests();
        $frenchOnly = '<item><canonicalname value="Titre français"/><link type="language" id="2187" value="French"/></item>';
        $multilingual = '<item><canonicalname value="Titre multilingue"/>'
            . '<link type="language" id="2184" value="English"/><link type="language" id="2187" value="French"/></item>';
        $cases = [
            [$multilingual . $frenchOnly, 'Titre français'],
            [$frenchOnly . '<item><canonicalname value="Autre titre français"/><link type="language" id="2187" value="French"/></item>', 'Titre français'],
            [$multilingual, 'Titre multilingue'],
            ['<item><canonicalname value="German title"/><link type="language" id="2188" value="German"/></item>', 'Primary title'],
            ['<item><name value="French edition"/><link type="language" id="2187" value="French"/></item>', 'Primary title'],
            ['<item><canonicalname value="   "/><link type="language" id="2187" value="French"/></item>', 'Primary title'],
            ['', 'Primary title'],
        ];
        $responses = [];
        foreach ($cases as $index => [$versions, $expected]) {
            $id = 1000 + $index;
            $responses['*xmlapi2/thing?stats=1&id=' . $id . '&versions=1'] = Http::response(
                '<items><item type="boardgame" id="' . $id . '"><name type="alternate" value="Alternate title"/>'
                . '<name type="primary" value="Primary title"/><versions>' . $versions . '</versions></item></items>'
            );
        }
        Http::fake($responses);
        $this->actingAs($this->owner);
        foreach ($cases as $index => [$versions, $expected]) {
            $this->getJson('/api/game_search_detail?id=' . (1000 + $index))->assertOk()->assertJsonPath('name', $expected);
        }
    }

    public function test_bgg_game_search_excludes_expansions_by_default(): void
    {
        Http::preventStrayRequests();
        $this->migration()->up();
        Http::fake([
            '*xmlapi2/search*type=boardgameexpansion*' => Http::response('<items total="1"><item type="boardgameexpansion" id="50"/></items>'),
            '*xmlapi2/search*' => Http::response('<items total="2"><item type="boardgame" id="42"/><item type="boardgame" id="50"/></items>'),
            '*xmlapi2/thing?stats=1&id=42&versions=1' => Http::response('<items><item type="boardgame" id="42"><name type="primary" value="Base"/></item></items>'),
        ]);

        $response = $this->actingAs($this->owner)->getJson('/api/game_search?q=base')->assertOk()->json();

        $this->assertSame([42], array_column($response, 'id'));
        $this->assertSame('game', $response[0]['type']);
        Http::assertNotSent(fn($request) => str_contains($request->url(), 'thing') && str_contains($request->url(), '50'));
    }

    public function test_bgg_expansion_search_returns_base_games_with_library_status(): void
    {
        Http::preventStrayRequests();
        $this->game();
        $this->migration()->up();
        Http::fake([
            '*xmlapi2/search*' => Http::response('<items total="1"><item type="boardgameexpansion" id="50"/></items>'),
            '*xmlapi2/thing?stats=1&id=50&versions=1' => Http::response('<items><item type="boardgameexpansion" id="50"><thumbnail>thumb.jpg</thumbnail><name type="primary" value="Joker"/><yearpublished value="2017"/>'
                . '<link type="boardgameexpansion" id="42" value="Base" inbound="true"/><link type="boardgameexpansion" id="60" value="Other base" inbound="true"/>'
                . '<link type="boardgameexpansion" id="61" value="Parent expansion" inbound="true"/></item></items>'),
            '*xmlapi2/thing?stats=1&id=42,60,61&versions=1' => Http::response('<items><item type="boardgame" id="42"><name type="primary" value="Base"/></item>'
                . '<item type="boardgame" id="60"><name type="primary" value="Other base"/></item>'
                . '<item type="boardgameexpansion" id="61"><name type="primary" value="Parent expansion"/></item></items>'),
        ]);

        $this->actingAs($this->owner)->getJson('/api/game_search?q=joker&type=expansion')->assertOk()
            ->assertJsonPath('0.id', 50)->assertJsonPath('0.type', 'expansion')
            ->assertJsonPath('0.thumbnailUrlFromBgg', 'thumb.jpg')->assertJsonPath('0.year', 2017)
            ->assertJsonPath('0.baseGames.0.id', 42)->assertJsonPath('0.baseGames.0.name', 'Base')
            ->assertJsonPath('0.baseGames.0.owned', true)
            ->assertJsonPath('0.baseGames.1.id', 60)->assertJsonPath('0.baseGames.1.owned', false)
            ->assertJsonCount(2, '0.baseGames');
    }

    public function test_bgg_combined_search_groups_expansions_under_their_base_games(): void
    {
        Http::preventStrayRequests();
        $this->migration()->up();
        Http::fake([
            '*xmlapi2/search*' => Http::response('<items total="2"><item type="boardgame" id="42"/><item type="boardgame" id="51"/></items>'),
            '*xmlapi2/thing?stats=1&id=42,51&versions=1' => Http::response('<items>'
                . '<item type="boardgame" id="42"><name type="primary" value="Matched base"/><poll totalvotes="5"/>'
                . '<link type="boardgameexpansion" id="50" value="Not matched expansion"/><link type="boardgameexpansion" id="51" value="Matched expansion"/></item>'
                . '<item type="boardgameexpansion" id="51"><thumbnail>exp.jpg</thumbnail><name type="primary" value="Matched expansion"/><poll totalvotes="1"/>'
                . '<link type="boardgameexpansion" id="42" value="Matched base" inbound="true"/><link type="boardgameexpansion" id="70" value="Other base" inbound="true"/>'
                . '<link type="boardgameexpansion" id="80" value="Parent expansion" inbound="true"/></item>'
                . '</items>'),
            '*xmlapi2/thing?stats=1&id=70,80&versions=1' => Http::response('<items><item type="boardgame" id="70"><thumbnail>other.jpg</thumbnail><name type="primary" value="Other base"/><poll totalvotes="2"/></item>'
                . '<item type="boardgameexpansion" id="80"><name type="primary" value="Parent expansion"/><poll totalvotes="9"/></item></items>'),
            '*xmlapi2/thing?stats=1&id=50&versions=1' => Http::response('<items><item type="boardgameexpansion" id="50"><name type="primary" value="Not matched expansion"/><poll totalvotes="0"/></item></items>'),
        ]);

        $response = $this->actingAs($this->owner)->getJson('/api/game_search?q=test&type=all')->assertOk()->json();

        $this->assertSame([42, 70], array_column($response, 'id'));
        $this->assertTrue($response[0]['matched']);
        $this->assertSame([51, 50], array_column($response[0]['expansions'], 'id'));
        $this->assertSame([true, false], array_column($response[0]['expansions'], 'matched'));
        $this->assertSame('exp.jpg', $response[0]['expansions'][0]['thumbnailUrlFromBgg']);
        $this->assertFalse($response[1]['matched']);
        $this->assertSame('other.jpg', $response[1]['thumbnailUrlFromBgg']);
        $this->assertSame([51], array_column($response[1]['expansions'], 'id'));
        $this->assertSame(0, $response[1]['hiddenExpansionCount']);
    }

    public function test_bgg_combined_search_shows_the_most_popular_expansions_first_and_counts_hidden_ones(): void
    {
        Http::preventStrayRequests();
        $this->migration()->up();
        $rated = fn(int $count) => '<statistics><ratings><usersrated value="' . $count . '"/></ratings></statistics>';
        $links = implode('', array_map(fn($id) => '<link type="boardgameexpansion" id="' . $id . '" value="Expansion ' . $id . '"/>', range(100, 111)));
        $expansions = implode('', array_map(
            fn($id) => '<item type="boardgameexpansion" id="' . $id . '"><name type="primary" value="Expansion ' . $id . '"/>' . $rated($id) . '</item>',
            range(100, 111)
        ));
        Http::fake([
            '*xmlapi2/search*' => Http::response('<items total="2"><item type="boardgame" id="42"/><item type="boardgame" id="51"/></items>'),
            '*xmlapi2/thing?stats=1&id=42,51&versions=1' => Http::response('<items>'
                . '<item type="boardgame" id="42"><name type="primary" value="Base"/>' . $rated(5000) . $links . '<link type="boardgameexpansion" id="51" value="Matched"/></item>'
                . '<item type="boardgameexpansion" id="51"><name type="primary" value="Matched"/>' . $rated(1)
                . '<link type="boardgameexpansion" id="42" value="Base" inbound="true"/></item></items>'),
            '*xmlapi2/thing?stats=1&id=100,*' => Http::response('<items>' . $expansions . '</items>'),
        ]);

        $response = $this->actingAs($this->owner)->getJson('/api/game_search?q=test&type=all')->assertOk()->json();

        $this->assertSame([42], array_column($response, 'id'));
        $this->assertSame([111, 110, 109, 108, 107, 106, 105, 104, 103, 102], array_column($response[0]['expansions'], 'id'));
        $this->assertSame(3, $response[0]['hiddenExpansionCount']);
    }

    public function test_newsletter_prompt_and_suggestions_only_use_the_recipients_library(): void
    {
        $this->game(['title' => 'Owner game']);
        $otherGame = $this->game(['title' => 'Other game', 'bgg_id' => 43, 'in_library' => false]);
        $this->game(['title' => 'Outside library', 'bgg_id' => 44, 'in_library' => false]);
        $this->migration()->up();
        $this->other->games()->attach($otherGame->id, ['in_library' => true]);
        Http::fake(['*' => Http::response([])]);
        $this->mock(LocationService::class)->shouldReceive('news')->andReturn([]);
        $this->mock(StatsAssistant::class)->shouldReceive('restore')->andReturnUsing(fn($text) => $text);
        $ai = $this->mock(GeminiClient::class);

        foreach ([
            [$this->owner->id, ['Owner game']],
            [$this->other->id, ['Other game']],
            [null, []],
        ] as [$userId, $expectedTitles]) {
            $ai->shouldReceive('json')->once()->withArgs(function ($system, $prompt, $temperature) use ($expectedTitles) {
                $facts = json_decode(explode("\n", $prompt)[1], true, flags: JSON_THROW_ON_ERROR);
                $this->assertSame($expectedTitles, array_column($facts['ludotheque'], 'title'));

                return true;
            })->andReturn(['suggestions' => [
                ['game' => 'Owner game', 'reason' => 'Test'],
                ['game' => 'Other game', 'reason' => 'Test'],
                ['game' => 'Outside library', 'reason' => 'Test'],
            ]]);
            $newsletter = app(NewsletterBuilder::class)->build($userId);
            $this->assertSame($expectedTitles, array_column($newsletter['suggestions'], 'game'));
        }
    }

    public function test_deployment_only_marks_success_after_migration_and_allows_retry_after_failure(): void
    {
        Storage::fake('local');
        Artisan::shouldReceive('call')->with('migrate', ['--force' => true])->twice()->andReturn(1, 0);
        Artisan::shouldReceive('output')->once()->andReturn('Migration failed.');

        $this->get('/finir_installation')->assertStatus(500);
        Storage::disk('local')->assertMissing('migration.txt');
        $this->get('/finir_installation')->assertOk()->assertViewHas('migration', true);
        $this->assertSame('done', Storage::disk('local')->get('migration.txt'));
        $this->get('/finir_installation')->assertOk()->assertViewHas('migration', false);
    }

    public function test_deployment_does_not_mark_success_when_migration_throws(): void
    {
        Storage::fake('local');
        Artisan::shouldReceive('call')->with('migrate', ['--force' => true])->once()
            ->andThrow(new \RuntimeException('Missing legacy owner.'));

        $this->get('/finir_installation')->assertStatus(500);
        Storage::disk('local')->assertMissing('migration.txt');
    }
}
