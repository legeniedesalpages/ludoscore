<?php

namespace Tests\Feature;

use App\Models\GameMatch;
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
        $this->normalization()->up();
        (require database_path('migrations/2026_10_18_180000_add_ludotag_to_players.php'))->up();
        (require database_path('migrations/2026_10_18_190000_add_player_merges.php'))->up();
        (require database_path('migrations/2026_10_18_200000_add_personal_pseudo_to_player_user.php'))->up();
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

    private function normalization(): Migration
    {
        return require database_path('migrations/2026_10_18_170000_normalize_player_user_identity.php');
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
        $this->normalization()->up();
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
        $this->normalization()->down();
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

    public function test_only_admin_can_create_links_and_neither_creator_nor_date_can_be_spoofed(): void
    {
        $path = '/api/player/'.$this->player.'/associations/'.$this->viewer->id;
        $rights = ['canViewPersonalInfo' => false, 'canViewOtherMatches' => false, 'canAddToMatch' => true];
        $this->actingAs($this->creator)->putJson($path, $rights)->assertForbidden();
        $this->getJson('/api/player/'.$this->player.'/associations')->assertOk()->assertJsonCount(1);
        $this->actingAs($this->admin)->putJson($path, $rights)->assertOk();
        $date = DB::table('player_user')->where('player_id', $this->player)->where('user_id', $this->viewer->id)->value('associated_at');
        $this->putJson($path, $rights + ['isCreator' => true])->assertUnprocessable();
        $this->putJson($path, $rights + ['isSelf' => true])->assertUnprocessable();
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

    public function test_creator_sees_ludotag_recipient_and_can_grant_and_revoke_rights_without_changing_identity_or_dates(): void
    {
        $otherMatch = $this->matchWith([$this->player]);
        $tag = DB::table('players')->where('id', $this->player)->value('ludotag');
        $this->actingAs($this->viewer)->postJson('/api/player/associate-ludotag', ['ludotag' => $tag])->assertOk();
        $link = DB::table('player_user')->where('player_id', $this->player)->where('user_id', $this->viewer->id)->first();
        $this->getJson('/api/player/'.$this->player)->assertOk()
            ->assertJsonPath('permissions.canManageAssociations', false)->assertJsonMissingPath('firstName');
        $this->getJson('/api/game-match/'.$otherMatch)->assertForbidden();

        $this->actingAs($this->creator)->getJson('/api/player/'.$this->player)->assertOk()
            ->assertJsonPath('permissions.canManageAssociations', true);
        $response = $this->getJson('/api/player/'.$this->player.'/associations')->assertOk()->assertJsonCount(2);
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $response->assertJsonFragment(['userId' => $this->viewer->id, 'email' => $this->viewer->email, 'isCreator' => false, 'isSelf' => false]);
        $path = '/api/player/'.$this->player.'/associations/'.$this->viewer->id;
        $this->putJson($path, [
            'canViewPersonalInfo' => true, 'canViewOtherMatches' => true, 'canAddToMatch' => true,
        ])->assertOk();
        $this->assertDatabaseHas('player_user', [
            'id' => $link->id, 'is_creator' => false, 'is_self' => false, 'associated_at' => $link->associated_at,
        ]);
        $this->actingAs($this->viewer)->getJson('/api/player/'.$this->player)->assertOk()->assertJsonPath('firstName', 'PrivateFirst')
            ->assertJsonPath('permissions.canManageAssociations', false);
        $this->getJson('/api/game-match/'.$otherMatch)->assertOk();
        $this->actingAs($this->creator)->putJson($path, [
            'canViewPersonalInfo' => false, 'canViewOtherMatches' => false, 'canAddToMatch' => false,
        ])->assertOk();
        $this->actingAs($this->viewer)->getJson('/api/player/'.$this->player)->assertOk()->assertJsonMissingPath('firstName');
        $this->getJson('/api/game-match/'.$otherMatch)->assertForbidden();
        $this->assertDatabaseHas('player_user', [
            'id' => $link->id, 'is_creator' => false, 'is_self' => false, 'associated_at' => $link->associated_at,
        ]);
    }

    public function test_personal_account_can_manage_existing_associations_without_being_creator(): void
    {
        $this->actingAs($this->viewer)->getJson('/api/player/'.$this->self)->assertOk()
            ->assertJsonPath('permissions.isCreator', false)->assertJsonPath('permissions.canManageAssociations', true);
        $this->getJson('/api/player/'.$this->self.'/associations')->assertOk()->assertJsonCount(2)
            ->assertJsonFragment(['userId' => $this->viewer->id, 'isSelf' => true]);
        $this->putJson('/api/player/'.$this->self.'/associations/'.$this->creator->id, [
            'canViewPersonalInfo' => false, 'canViewOtherMatches' => true, 'canAddToMatch' => true,
        ])->assertOk();
        $this->assertDatabaseHas('player_user', [
            'player_id' => $this->self, 'user_id' => $this->creator->id,
            'is_creator' => true, 'is_self' => false, 'can_view_personal_info' => false,
        ]);
    }

    public function test_associated_users_cannot_manage_links_and_managers_cannot_create_or_delete_them(): void
    {
        $this->link(['can_view_personal_info' => true, 'can_view_other_matches' => true, 'can_add_to_match' => true]);
        $rights = ['canViewPersonalInfo' => true, 'canViewOtherMatches' => true, 'canAddToMatch' => true];
        $base = '/api/player/'.$this->player.'/associations';
        $before = DB::table('player_user')->orderBy('id')->get()->toJson();
        foreach ([$this->viewer, User::create(['email' => 'outsider@example.test', 'password' => 'unused'])] as $user) {
            $this->actingAs($user)->getJson($base)->assertForbidden();
            $this->putJson($base.'/'.$this->viewer->id, $rights)->assertForbidden();
        }
        $this->actingAs($this->creator)->putJson($base.'/'.$this->admin->id, $rights)->assertForbidden();
        $this->deleteJson($base.'/'.$this->viewer->id)->assertForbidden();
        foreach (['isCreator', 'isSelf', 'associatedAt'] as $field) {
            $this->putJson($base.'/'.$this->viewer->id, $rights + [$field => true])->assertUnprocessable();
        }
        $this->putJson($base.'/'.$this->viewer->id, ['canViewPersonalInfo' => 'invalid'])->assertUnprocessable();
        $this->assertSame($before, DB::table('player_user')->orderBy('id')->get()->toJson());
    }

    public function test_replaced_player_associations_remain_read_only_for_managers(): void
    {
        $this->link();
        DB::table('players')->where('id', $this->player)->update(['replaced_by_player_id' => $this->self, 'replaced_at' => now()]);
        $before = DB::table('player_user')->orderBy('id')->get()->toJson();
        foreach ([$this->creator, $this->admin] as $user) {
            $this->actingAs($user)->getJson('/api/player/'.$this->player)->assertOk()
                ->assertJsonPath('permissions.canManageAssociations', false);
            $this->getJson('/api/player/'.$this->player.'/associations')->assertForbidden();
            $this->putJson('/api/player/'.$this->player.'/associations/'.$this->viewer->id, [
                'canViewPersonalInfo' => true, 'canViewOtherMatches' => true, 'canAddToMatch' => true,
            ])->assertUnprocessable();
        }
        $this->assertSame($before, DB::table('player_user')->orderBy('id')->get()->toJson());
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
        $match = $this->getJson('/api/game-match/'.$own)->assertOk()
            ->assertJsonMissingPath('teams.0.players.1.firstName')
            ->assertJsonMissingPath('teams.0.players.1.lastName');
        $this->assertStringNotContainsString('ludotag', $match->getContent());
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

    public function test_match_creation_preserves_team_and_player_id_order_in_response(): void
    {
        $this->link(['can_add_to_match' => true]);
        $response = $this->actingAs($this->viewer)->postJson('/api/game-match', [
            'match' => ['gameId' => 1, 'tags' => '[]'],
            'teams' => [
                [
                    'name' => 'First', 'color' => 'blue', 'tags' => '[]',
                    'players' => [['playerId' => $this->self], ['playerId' => $this->player]],
                ],
                [
                    'name' => 'Second', 'color' => 'red', 'tags' => '[]',
                    'players' => [['playerId' => $this->player]],
                ],
            ],
        ])->assertCreated()->assertJsonPath('gameId', 1)
            ->assertJsonPath('running', true)->assertJsonPath('canceled', false)
            ->assertJsonPath('tags', '[]');

        $match = GameMatch::findOrFail($response->json('id'));
        $teams = $match->teams()->orderBy('position')->get();
        $expected = $teams->map(fn ($team) => [
            $team->id,
            $team->teamplayers()->orderBy('position')->pluck('id')->all(),
        ])->all();

        $this->assertCount(2, $expected);
        $this->assertCount(2, $expected[0][1]);
        $this->assertCount(1, $expected[1][1]);
        $response->assertJsonPath('teams', $expected);
        $this->assertNotEmpty($response->json('startedAt'));
        $this->assertSame(['First', 'Second'], $teams->pluck('name')->all());
        $this->assertSame(
            [$this->self, $this->player],
            $teams->first()->teamplayers()->orderBy('position')->pluck('player_id')->all(),
        );
        $this->assertDatabaseCount('matches', 1);
        $this->assertDatabaseCount('teams', 2);
        $this->assertDatabaseCount('team_players', 3);
    }

    public function test_copied_player_is_selectable_but_requires_a_participant_granting_match_access(): void
    {
        $this->link(['can_add_to_match' => true]);
        $payload = [
            'match' => ['gameId' => 1, 'tags' => null],
            'teams' => [[
                'name' => 'Copied player', 'color' => 'blue', 'tags' => null,
                'players' => [['playerId' => $this->player]],
            ]],
        ];
        $this->actingAs($this->viewer);
        $players = $this->getJson('/api/player?purpose=match')->assertOk()->json();
        $byId = collect($players)->keyBy('id');
        $this->assertFalse($byId[$this->player]['permissions']['can_access_matches']);
        $this->assertTrue($byId[$this->self]['permissions']['can_access_matches']);
        $this->postJson('/api/game-match', $payload)->assertForbidden()
            ->assertJsonPath('message', 'Ajoutez votre joueur personnel ou un joueur dont vous pouvez consulter les parties sans y participer. Le droit d’ajouter un joueur copié ne suffit pas à consulter cette partie.');
        $this->assertDatabaseCount('matches', 0);
        $this->assertDatabaseCount('teams', 0);

        $this->link(['can_add_to_match' => true, 'can_view_other_matches' => true]);
        $players = collect($this->getJson('/api/player?purpose=match')->assertOk()->json())->keyBy('id');
        $this->assertTrue($players[$this->player]['permissions']['can_access_matches']);
        $created = $this->postJson('/api/game-match', $payload)->assertCreated();
        $this->getJson('/api/game-match/'.$created->json('id'))->assertOk();
        $this->assertDatabaseCount('matches', 1);
    }

    public function test_personal_participation_and_administration_grant_access_without_extended_player_rights(): void
    {
        DB::table('player_user')->where('user_id', $this->viewer->id)->where('player_id', $this->self)
            ->update(['can_view_other_matches' => false]);
        $players = collect($this->actingAs($this->viewer)->getJson('/api/player?purpose=match')->assertOk()->json())->keyBy('id');
        $this->assertTrue($players[$this->self]['permissions']['can_access_matches']);
        $this->assertFalse($players[$this->self]['permissions']['can_view_other_matches']);
        $players = $this->actingAs($this->admin)->getJson('/api/player?purpose=match')->assertOk()->json();
        foreach ($players as $player) {
            $this->assertTrue($player['permissions']['can_access_matches']);
        }
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
        ]);
        $this->getJson('/api/player?purpose=match')->assertOk()->assertJsonCount(1);
        $this->assertDatabaseHas('player_user', [
            'player_id' => $this->player, 'user_id' => $this->creator->id, 'is_creator' => true,
        ]);
    }

    public function test_merge_updates_history_counts_statistics_and_running_participants_without_changing_teams(): void
    {
        $old = $this->matchWith([$this->player]);
        $running = $this->matchWith([$this->player], true);
        $own = $this->matchWith([$this->self]);
        $beforeTeams = DB::table('teams')->orderBy('id')->get()->toJson();
        $tag = DB::table('players')->where('id', $this->self)->value('ludotag');
        $this->actingAs($this->creator)->postJson('/api/player/'.$this->player.'/merge', [
            'ludotag' => $tag, 'confirmed' => true,
        ])->assertOk()->assertJsonPath('matchCount', 2);
        $this->assertSame($beforeTeams, DB::table('teams')->orderBy('id')->get()->toJson());
        $this->actingAs($this->viewer)->getJson('/api/game-match-count')->assertOk()->assertContent('3');
        $this->getJson('/api/player/'.$this->self)->assertOk()->assertJsonPath('playedMatchCount', 2);
        $this->getJson('/api/game-match/'.$old)->assertOk()
            ->assertJsonPath('teams.0.players.0.player_id', $this->self)
            ->assertJsonPath('teams.0.players.0.original_player_id', $this->player);
        $this->getJson('/api/running-match')->assertOk()->assertJsonPath('id', $running);
        $this->getJson('/api/statistics/overview')->assertOk()->assertJsonPath('totalPlayers', 1);
        $this->getJson('/api/statistics/player-directory')->assertOk()->assertJsonPath('summary.totalPlayers', 1);
        $this->getJson('/api/player?purpose=match')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $this->self);
    }

    public function test_personal_pseudo_is_private_and_does_not_change_identity_permissions_or_association_date(): void
    {
        $this->link();
        $link = (array) DB::table('player_user')->where('player_id', $this->player)->where('user_id', $this->viewer->id)->first();
        $this->actingAs($this->viewer)->putJson('/api/player/'.$this->player.'/personal-pseudo', [
            'personalPseudo' => '  My friend  ', 'isCreator' => true, 'canAddToMatch' => true,
        ])->assertOk()->assertJsonPath('pseudo', 'My friend')->assertJsonPath('creatorPseudo', 'Guest')
            ->assertJsonPath('personalPseudo', 'My friend')->assertJsonMissingPath('firstName')
            ->assertJsonPath('permissions.canAddToMatch', false)->assertJsonPath('permissions.canPersonalize', true);
        $link['personal_pseudo'] = 'My friend';
        unset($link['updated_at']);
        $this->assertDatabaseHas('player_user', $link);
        $this->assertDatabaseHas('players', ['id' => $this->player, 'pseudo' => 'Guest']);
        $this->getJson('/api/player')->assertOk()->assertJsonFragment(['pseudo' => 'My friend', 'creatorPseudo' => 'Guest']);
        $this->getJson('/api/player/'.$this->player)->assertOk()->assertJsonPath('pseudo', 'My friend');
        $this->putJson('/api/player/'.$this->player, ['pseudo' => 'Global overwrite'])->assertForbidden();
        foreach ([$this->creator, $this->admin] as $user) {
            $this->actingAs($user)->getJson('/api/player/'.$this->player)->assertOk()
                ->assertJsonPath('pseudo', 'Guest')->assertJsonPath('creatorPseudo', null)->assertJsonPath('personalPseudo', null);
            $this->putJson('/api/player/'.$this->player.'/personal-pseudo', ['personalPseudo' => 'Forbidden'])->assertForbidden();
        }
        $this->actingAs($this->creator)->putJson('/api/player/'.$this->player, ['pseudo' => 'New canonical'])->assertOk();
        $this->actingAs($this->viewer)->getJson('/api/player/'.$this->player)->assertOk()
            ->assertJsonPath('pseudo', 'My friend')->assertJsonPath('creatorPseudo', 'New canonical');
        $this->putJson('/api/player/'.$this->player.'/personal-pseudo', ['personalPseudo' => null])->assertOk()
            ->assertJsonPath('pseudo', 'New canonical')->assertJsonPath('creatorPseudo', null);
    }

    public function test_ludotag_can_set_a_personal_pseudo_without_overwriting_existing_alias_or_rights(): void
    {
        $tag = DB::table('players')->where('id', $this->player)->value('ludotag');
        $this->actingAs($this->viewer)->postJson('/api/player/associate-ludotag', [
            'ludotag' => $tag, 'personalPseudo' => 'Nickname',
        ])->assertOk()->assertJsonPath('pseudo', 'Nickname');
        $link = (array) DB::table('player_user')->where('player_id', $this->player)->where('user_id', $this->viewer->id)->first();
        $this->assertFalse((bool) $link['can_view_personal_info']);
        $this->assertFalse((bool) $link['can_view_other_matches']);
        $this->assertTrue((bool) $link['can_add_to_match']);
        $this->postJson('/api/player/associate-ludotag', ['ludotag' => $tag, 'personalPseudo' => 'Overwrite'])->assertOk()
            ->assertJsonPath('pseudo', 'Nickname');
        $this->assertDatabaseHas('player_user', $link);
        $this->putJson('/api/player/'.$this->player.'/personal-pseudo', ['personalPseudo' => 'Guest'])->assertOk()
            ->assertJsonPath('pseudo', 'Guest')->assertJsonPath('personalPseudo', null)->assertJsonPath('creatorPseudo', null);
        $this->putJson('/api/player/'.$this->player.'/personal-pseudo', ['personalPseudo' => '   '])->assertOk()->assertJsonPath('personalPseudo', null);
        foreach ([[], ['personalPseudo' => []], ['personalPseudo' => str_repeat('A', 256)]] as $invalid) {
            $this->putJson('/api/player/'.$this->player.'/personal-pseudo', $invalid)->assertUnprocessable();
        }
        DB::table('players')->where('id', $this->player)->update(['replaced_by_player_id' => $this->self]);
        $this->putJson('/api/player/'.$this->player.'/personal-pseudo', ['personalPseudo' => 'Archived'])->assertUnprocessable();
    }

    public function test_personal_pseudo_is_used_in_match_participants_history_and_statistics_without_renaming_teams(): void
    {
        $this->link(['can_view_other_matches' => true, 'can_add_to_match' => true]);
        $match = $this->matchWith([$this->player]);
        DB::table('teams')->where('match_id', $match)->update(['name' => 'Guest']);
        $this->actingAs($this->viewer)->putJson('/api/player/'.$this->player.'/personal-pseudo', ['personalPseudo' => 'Local name'])->assertOk();
        $this->getJson('/api/game-match/'.$match)->assertOk()->assertJsonPath('teams.0.players.0.pseudo', 'Local name')
            ->assertJsonPath('teams.0.players.0.creator_pseudo', 'Guest')
            ->assertJsonPath('teams.0.display_name', 'Local name')->assertJsonPath('teams.0.creator_pseudo', 'Guest')
            ->assertJsonPath('teams.0.name', 'Guest');
        $this->getJson('/api/game-match?page=0&size=10')->assertOk()->assertJsonPath('0.teams.0.display_name', 'Local name');
        $this->getJson('/api/player?purpose=match')->assertOk()->assertJsonFragment(['pseudo' => 'Local name', 'creatorPseudo' => 'Guest']);
        $this->getJson('/api/statistics/player-directory')->assertOk()->assertJsonFragment(['name' => 'Local name', 'creatorPseudo' => 'Guest']);
        $this->getJson('/api/statistics/players/'.$this->player)->assertOk()->assertJsonPath('name', 'Local name')->assertJsonPath('creatorPseudo', 'Guest');
        DB::table('teams')->where('match_id', $match)->update(['name' => 'Custom team']);
        $this->getJson('/api/game-match/'.$match)->assertOk()->assertJsonPath('teams.0.display_name', 'Custom team');
        $this->actingAs($this->creator)->getJson('/api/game-match/'.$match)->assertOk()->assertJsonPath('teams.0.players.0.pseudo', 'Guest');
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

    public function test_identity_api_preserves_omitted_identity_transfers_it_and_removes_only_its_flag(): void
    {
        $this->actingAs($this->admin)->putJson('/api/player/'.$this->self, [
            'pseudo' => 'Still me',
        ])->assertOk()->assertJsonPath('user.id', $this->viewer->id)
            ->assertJsonPath('user.playerId', $this->self)->assertJsonMissingPath('user.pivot')
            ->assertJsonMissingPath('personalUsers')->assertJsonMissingPath('creators');
        $this->putJson('/api/player/'.$this->player, [
            'pseudo' => 'Now me', 'user' => ['id' => $this->viewer->id],
        ])->assertOk()->assertJsonPath('user.id', $this->viewer->id)
            ->assertJsonPath('user.playerId', $this->player)
            ->assertJsonPath('createdByUserId', $this->creator->id);
        $this->assertSame($this->player, $this->viewer->refresh()->player_id);
        $this->assertNull(Player::findOrFail($this->self)->user);
        $this->assertDatabaseHas('player_user', [
            'player_id' => $this->self, 'user_id' => $this->viewer->id, 'is_self' => false,
        ]);
        $this->putJson('/api/player/'.$this->player, [
            'pseudo' => 'No identity', 'user' => null,
        ])->assertOk()->assertJsonPath('user', null);
        $this->assertNull($this->viewer->refresh()->player_id);
        $this->assertDatabaseHas('player_user', [
            'player_id' => $this->player, 'user_id' => $this->viewer->id, 'is_self' => false,
        ]);
    }

    public function test_non_admin_cannot_replace_their_existing_identity_by_creating_another_player(): void
    {
        $this->actingAs($this->viewer)->postJson('/api/player', [
            'pseudo' => 'Duplicate me', 'user' => ['id' => $this->viewer->id],
        ])->assertUnprocessable();
        $this->assertDatabaseCount('players', 2);
        $this->assertDatabaseCount('player_user', 3);
        $this->assertSame($this->self, $this->viewer->refresh()->player_id);
    }
}
