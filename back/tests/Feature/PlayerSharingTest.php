<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use App\Services\Analytics\GameStatistics;
use App\Services\Analytics\MatchDataset;
use App\Services\Analytics\PlayerStatistics;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PlayerSharingTest extends TestCase
{
    private User $creator;

    private User $viewer;

    private User $admin;

    private int $player;

    private int $self;

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sharing_test', 'database.connections.sharing_test' => [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => 'test$',
            'foreign_key_constraints' => true,
        ]]);
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password');
            $table->unsignedBigInteger('player_id')->nullable();
            $table->boolean('is_admin')->default(false);
            $table->timestamps();
        });
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->string('pseudo');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('prefered_color')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->boolean('is_only_cooperative')->default(false);
            $table->timestamps();
        });
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('game_id')->default(1);
            $table->unsignedBigInteger('winner_team_id')->nullable();
            $table->boolean('running')->default(false);
            $table->boolean('canceled')->default(false);
            $table->dateTime('started_at')->nullable();
            $table->dateTime('finished_at')->nullable();
            $table->text('tags')->nullable();
            $table->decimal('latitude')->nullable();
            $table->decimal('longitude')->nullable();
            $table->string('location_name')->nullable();
            $table->timestamps();
        });
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('match_id');
            $table->string('name')->default('Team');
            $table->string('color')->nullable();
            $table->integer('position')->default(0);
            $table->integer('score')->nullable();
            $table->text('tags')->nullable();
            $table->timestamps();
        });
        Schema::create('team_players', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('team_id');
            $table->unsignedBigInteger('player_id');
            $table->integer('position')->default(0);
            $table->timestamps();
        });
        Schema::create('game_user', function (Blueprint $table) {
            $table->unsignedBigInteger('game_id');
            $table->unsignedBigInteger('user_id');
            $table->boolean('in_library')->default(false);
            $table->date('ownership_date')->nullable();
        });
        Schema::create('match_photos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('match_id');
            $table->string('mime_type');
            $table->text('data');
            $table->timestamps();
        });
        $this->creator = User::create(['email' => 'creator@example.test', 'password' => 'unused']);
        $this->viewer = User::create(['email' => 'viewer@example.test', 'password' => 'unused']);
        $this->admin = User::create(['email' => 'admin@example.test', 'password' => 'unused', 'is_admin' => true]);
        $this->player = $this->makePlayer('Guest');
        $this->self = $this->makePlayer('Me');
        $this->viewer->forceFill(['player_id' => $this->self])->save();
        DB::table('games')->insert(['id' => 1, 'title' => 'Test']);
        $this->migration()->up();
    }

    protected function tearDown(): void
    {
        DB::purge('sharing_test');
        parent::tearDown();
    }

    private function migration(): Migration
    {
        return require database_path('migrations/2026_10_18_140000_create_player_user_table.php');
    }

    private function makePlayer(string $pseudo): int
    {
        return DB::table('players')->insertGetId([
            'pseudo' => $pseudo, 'first_name' => 'PrivateFirst', 'last_name' => 'PrivateLast',
            'prefered_color' => 'blue', 'created_by_user_id' => $this->creator->id,
            'created_at' => '2020-01-01 12:00:00', 'updated_at' => '2021-01-01 12:00:00',
        ]);
    }

    private function link(array $rights = []): void
    {
        Player::findOrFail($this->player)->users()->syncWithoutDetaching([$this->viewer->id => $rights + [
            'is_creator' => false, 'can_view_personal_info' => false,
            'can_view_other_matches' => false, 'can_add_to_match' => false,
        ]]);
    }

    private function matchWith(array $players, bool $running = false): int
    {
        $id = DB::table('matches')->insertGetId([
            'started_at' => '2026-10-01 12:00:00', 'running' => $running,
        ]);
        $team = DB::table('teams')->insertGetId(['match_id' => $id]);
        foreach ($players as $player) {
            DB::table('team_players')->insert(['team_id' => $team, 'player_id' => $player]);
        }

        return $id;
    }

    public function test_migration_preserves_creators_identities_player_data_and_dates_and_can_resume(): void
    {
        $this->assertDatabaseHas('player_user', [
            'player_id' => $this->player, 'user_id' => $this->creator->id, 'is_creator' => true,
            'can_view_personal_info' => true, 'can_view_other_matches' => true,
            'can_add_to_match' => true, 'associated_at' => '2020-01-01 12:00:00',
        ]);
        $this->assertDatabaseHas('player_user', [
            'player_id' => $this->self, 'user_id' => $this->viewer->id, 'is_creator' => false,
        ]);
        $this->assertDatabaseCount('player_user', 3);
        $this->assertSame($this->self, $this->viewer->refresh()->player_id);
        $before = DB::table('players')->get()->toJson();
        $this->link(['can_add_to_match' => true]);
        $this->migration()->up();
        $this->assertDatabaseCount('player_user', 4);
        $this->assertDatabaseHas('player_user', [
            'player_id' => $this->player, 'user_id' => $this->viewer->id,
            'can_view_personal_info' => false, 'can_add_to_match' => true,
        ]);
        $this->assertSame($before, DB::table('players')->get()->toJson());
    }

    public function test_default_permissions_and_unique_association_are_enforced(): void
    {
        DB::table('player_user')->insert([
            'player_id' => $this->player, 'user_id' => $this->admin->id, 'associated_at' => now(),
        ]);
        $this->assertDatabaseHas('player_user', [
            'player_id' => $this->player, 'user_id' => $this->admin->id,
            'is_creator' => false, 'can_view_personal_info' => false,
            'can_view_other_matches' => false, 'can_add_to_match' => false,
        ]);
        $this->expectException(QueryException::class);
        DB::table('player_user')->insert([
            'player_id' => $this->player, 'user_id' => $this->admin->id, 'associated_at' => now(),
        ]);
    }

    public function test_rollback_preserves_original_data_but_refuses_to_lose_sharing_changes(): void
    {
        $this->migration()->down();
        $this->assertDatabaseCount('players', 2);
        $this->assertFalse(Schema::hasTable('player_user'));
        $this->migration()->up();
        $this->link();
        $this->expectException(\RuntimeException::class);
        $this->migration()->down();
    }

    public function test_multiple_users_can_see_a_player_but_private_fields_are_not_disclosed_without_permission(): void
    {
        $this->link();
        $this->actingAs($this->viewer)->getJson('/api/player/'.$this->player)->assertOk()
            ->assertJsonPath('pseudo', 'Guest')->assertJsonPath('permissions.canViewPersonalInfo', false)
            ->assertJsonMissingPath('firstName')->assertJsonMissingPath('lastName')
            ->assertJsonMissingPath('user')->assertJsonStructure(['gravatar']);
        $this->getJson('/api/player')->assertOk()->assertJsonCount(2);
        $this->getJson('/api/user')->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.id', $this->viewer->id);
        $this->actingAs($this->creator)->getJson('/api/player/'.$this->player)->assertOk()
            ->assertJsonPath('firstName', 'PrivateFirst');
        $this->link(['can_view_personal_info' => true]);
        $this->actingAs($this->viewer)->getJson('/api/player/'.$this->player)->assertOk()
            ->assertJsonPath('firstName', 'PrivateFirst');
    }

    public function test_unassociated_accounts_cannot_read_or_edit_player_and_sharing_does_not_grant_edit_rights(): void
    {
        $stranger = User::create(['email' => 'stranger@example.test', 'password' => 'unused']);
        $this->actingAs($stranger)->getJson('/api/player/'.$this->player)->assertNotFound();
        $this->link(['can_view_personal_info' => true]);
        $this->actingAs($this->viewer)->putJson('/api/player/'.$this->player, ['pseudo' => 'Overwrite'])->assertForbidden();
        $this->assertDatabaseHas('players', ['id' => $this->player, 'pseudo' => 'Guest']);
    }

    public function test_only_admin_can_manage_rights_and_neither_creator_nor_date_can_be_spoofed(): void
    {
        $path = '/api/player/'.$this->player.'/associations/'.$this->viewer->id;
        $rights = ['canViewPersonalInfo' => false, 'canViewOtherMatches' => false, 'canAddToMatch' => true];
        $this->actingAs($this->creator)->putJson($path, $rights)->assertForbidden();
        $this->getJson('/api/player/'.$this->player.'/associations')->assertForbidden();
        $this->actingAs($this->admin)->putJson($path, $rights)->assertOk();
        $date = DB::table('player_user')->where('player_id', $this->player)->where('user_id', $this->viewer->id)->value('associated_at');
        $this->putJson($path, $rights + ['isCreator' => true])->assertUnprocessable();
        $this->putJson($path, $rights + ['associatedAt' => '2000-01-01'])->assertUnprocessable();
        $this->putJson($path, array_replace($rights, ['canViewPersonalInfo' => true]))->assertOk();
        $this->assertDatabaseHas('player_user', [
            'player_id' => $this->player, 'user_id' => $this->viewer->id,
            'associated_at' => $date, 'is_creator' => false, 'can_view_personal_info' => true,
        ]);
        $this->deleteJson('/api/player/'.$this->player.'/associations/'.$this->creator->id)->assertUnprocessable();
        $this->deleteJson('/api/player/'.$this->self.'/associations/'.$this->viewer->id)->assertUnprocessable();
        $this->deleteJson($path)->assertNoContent();
        $this->actingAs($this->viewer)->getJson('/api/player/'.$this->player)->assertNotFound();
    }

    public function test_match_visibility_counts_and_photos_follow_participation_or_explicit_permission(): void
    {
        $this->link();
        $own = $this->matchWith([$this->self, $this->player]);
        $other = $this->matchWith([$this->player], true);
        DB::table('match_photos')->insert(['match_id' => $own, 'mime_type' => 'image/png', 'data' => base64_encode('photo')]);
        $this->actingAs($this->viewer)->getJson('/api/game-match-count')->assertOk()->assertContent('1');
        $photo = $this->get('/api/game-match/'.$own.'/photo')->assertOk()->assertContent('photo');
        $this->assertStringContainsString('no-store', $photo->headers->get('Cache-Control'));
        $this->getJson('/api/running-match')->assertOk()->assertContent('');
        $this->getJson('/api/game-match/'.$other)->assertForbidden();
        $this->getJson('/api/game-match/'.$other.'/photo')->assertForbidden();
        $this->deleteJson('/api/game-match/'.$other)->assertForbidden();
        $this->getJson('/api/game-match/'.$own)->assertOk()
            ->assertJsonMissingPath('teams.0.players.1.firstName')
            ->assertJsonMissingPath('teams.0.players.1.lastName');
        $this->getJson('/api/game-match?page=0&size=10')->assertOk()->assertJsonCount(1)->assertJsonPath('0.idMatch', $own);
        $this->getJson('/api/player/'.$this->player)->assertOk()->assertJsonPath('playedMatchCount', 1);
        $this->link(['can_view_other_matches' => true]);
        $this->getJson('/api/game-match-count')->assertOk()->assertContent('2');
        $this->getJson('/api/game-match/'.$other)->assertOk();
        $this->getJson('/api/running-match')->assertOk()->assertJsonPath('id', $other);
        $this->actingAs($this->admin)->getJson('/api/game-match-count')->assertOk()->assertContent('2');
    }

    public function test_add_to_match_is_separate_from_visibility_and_checked_on_server(): void
    {
        $this->link();
        $this->actingAs($this->viewer)->getJson('/api/player?purpose=match')->assertOk()->assertJsonCount(1);
        $payload = [
            'match' => ['gameId' => 1, 'tags' => null],
            'teams' => [[
                'name' => 'Team', 'color' => 'blue', 'tags' => null,
                'players' => [['playerId' => $this->self], ['playerId' => $this->player]],
            ]],
        ];
        $this->postJson('/api/game-match', $payload)->assertForbidden();
        $this->assertDatabaseCount('matches', 0);
        $this->link(['can_add_to_match' => true]);
        $this->getJson('/api/player?purpose=match')->assertOk()->assertJsonCount(2);
        $this->postJson('/api/game-match', $payload)->assertCreated();
        $this->assertDatabaseCount('matches', 1);
        $this->assertSame($this->self, $this->viewer->refresh()->player_id);
    }

    public function test_statistics_and_analytical_dataset_cannot_include_hidden_matches(): void
    {
        $this->link();
        $this->matchWith([$this->self, $this->player]);
        $this->matchWith([$this->player]);
        $this->actingAs($this->viewer);
        $this->assertCount(1, app(GameStatistics::class)->matches());
        $this->assertCount(2, app(PlayerStatistics::class)->rows());
        $this->assertCount(2, app(MatchDataset::class)->rows());
        $this->getJson('/api/statistics/player-directory')->assertOk()->assertJsonPath('summary.matches', 1);
        $this->getJson('/api/statistics/players/'.$this->player)->assertOk()->assertJsonPath('matches', 1);
        $this->getJson('/api/statistics/overview')->assertOk()->assertJsonPath('totalMatches', 1);
        $this->getJson('/api/game')->assertOk()->assertJsonPath('0.playedMatchCount', 1);
        $this->getJson('/api/previous-match/'.$this->player.'/1')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/statistics/insights?scope=player&id='.$this->player)->assertForbidden();
    }

    public function test_permissions_can_be_revoked_without_overwriting_private_data_or_changing_creator(): void
    {
        DB::table('player_user')->where('player_id', $this->player)->where('user_id', $this->creator->id)
            ->update(['can_view_personal_info' => false, 'can_view_other_matches' => false, 'can_add_to_match' => false]);
        $this->actingAs($this->creator)->putJson('/api/player/'.$this->player, [
            'pseudo' => 'Public update', 'firstName' => 'Hidden overwrite', 'lastName' => 'Hidden overwrite',
            'preferedColor' => 'red', 'isCreator' => false,
        ])->assertOk()->assertJsonMissingPath('firstName')->assertJsonMissingPath('user');
        $this->assertDatabaseHas('players', [
            'id' => $this->player, 'pseudo' => 'Public update',
            'first_name' => 'PrivateFirst', 'last_name' => 'PrivateLast',
            'created_by_user_id' => $this->creator->id,
        ]);
        $this->getJson('/api/player?purpose=match')->assertOk()->assertJsonCount(1);
        $this->assertDatabaseHas('player_user', [
            'player_id' => $this->player, 'user_id' => $this->creator->id, 'is_creator' => true,
        ]);
    }

    public function test_non_admin_cannot_assign_their_new_player_to_someone_elses_account(): void
    {
        $this->actingAs($this->viewer)->postJson('/api/player', [
            'pseudo' => 'Unauthorized identity', 'user' => ['id' => $this->creator->id],
        ])->assertForbidden();
        $this->assertDatabaseCount('players', 2);
        $this->assertDatabaseCount('player_user', 3);
        $this->assertNull($this->creator->refresh()->player_id);
    }
}
