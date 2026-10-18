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
            $table->unsignedBigInteger('player_id')->nullable();
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
        });
        $this->owner = User::create(['email' => 'renaud_balu@hotmail.com', 'password' => 'unused']);
        $this->other = User::create(['email' => 'other@example.test', 'password' => 'unused']);
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
        $this->owner->forceFill(['player_id' => 101])->save();
        $this->other->forceFill(['player_id' => 202])->save();

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

        $this->owner->forceFill(['player_id' => null])->save();
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
        $this->game();
        $this->game(['bgg_id' => 43, 'in_library' => false]);
        $this->migration()->up();
        Http::fake([
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
