<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PlayerCreatorTest extends TestCase
{
    private User $owner;
    private User $other;

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'creator_test', 'database.connections.creator_test' => [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => 'test$',
            'foreign_key_constraints' => true,
        ]]);
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password');
            $table->boolean('is_admin')->default(false);
            $table->unsignedBigInteger('player_id')->nullable();
            $table->timestamps();
        });
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->string('pseudo');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('prefered_color')->nullable();
            $table->timestamps();
        });
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->boolean('running')->default(false);
            $table->boolean('canceled')->default(false);
        });
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('match_id');
        });
        Schema::create('team_players', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('team_id');
            $table->unsignedBigInteger('player_id');
        });
        $this->owner = User::create(['email' => 'renaud_balu@hotmail.com', 'password' => 'unused']);
        $this->other = User::create(['email' => 'other@example.test', 'password' => 'unused']);
    }

    protected function tearDown(): void
    {
        DB::purge('creator_test');
        parent::tearDown();
    }

    private function migration(): Migration
    {
        return require database_path('migrations/2026_10_18_100000_add_created_by_user_to_players.php');
    }

    private function migrateAccess(): void
    {
        (require database_path('migrations/2026_10_18_140000_create_player_user_table.php'))->up();
        (require database_path('migrations/2026_10_18_170000_normalize_player_user_identity.php'))->up();
    }

    private function player(string $pseudo = 'Test'): int
    {
        return DB::table('players')->insertGetId([
            'pseudo' => $pseudo, 'first_name' => 'First', 'last_name' => 'Last',
            'prefered_color' => 'blue', 'created_at' => '2020-01-02 03:04:05',
            'updated_at' => '2021-02-03 04:05:06',
        ]);
    }

    public function test_migration_uses_associated_account_before_fallback_and_preserves_player_data(): void
    {
        $unassociated = $this->player('Unassociated');
        $associated = $this->player('Associated');
        $this->other->forceFill(['player_id' => $associated])->save();
        $before = DB::table('players')->orderBy('id')->get()->map(fn($row) => (array) $row)->all();
        $this->migration()->up();

        $this->assertDatabaseHas('players', ['id' => $unassociated, 'created_by_user_id' => $this->owner->id]);
        $this->assertDatabaseHas('players', ['id' => $associated, 'created_by_user_id' => $this->other->id]);
        foreach ($before as $row) {
            $this->assertDatabaseHas('players', $row);
        }
        $this->assertSame($associated, DB::table('users')->where('id', $this->other->id)->value('player_id'));
        $this->migration()->up();
        $this->assertDatabaseCount('players', 2);

        $this->migration()->down();
        $this->assertFalse(Schema::hasColumn('players', 'created_by_user_id'));
        $this->assertSame($before, DB::table('players')->orderBy('id')->get()->map(fn($row) => (array) $row)->all());
    }

    public function test_missing_fallback_account_aborts_before_schema_changes(): void
    {
        $this->player();
        $this->owner->delete();
        try {
            $this->migration()->up();
            $this->fail('Missing fallback must abort.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('introuvable', $e->getMessage());
        }
        $this->assertFalse(Schema::hasColumn('players', 'created_by_user_id'));
        $this->assertDatabaseCount('players', 1);
    }

    public function test_fallback_account_is_not_required_when_all_players_have_associated_accounts(): void
    {
        $id = $this->player();
        $this->other->forceFill(['player_id' => $id])->save();
        $this->owner->delete();
        $this->migration()->up();
        $this->assertDatabaseHas('players', ['id' => $id, 'created_by_user_id' => $this->other->id]);
    }

    public function test_empty_database_can_migrate_without_the_legacy_account(): void
    {
        $this->owner->delete();
        $this->migration()->up();
        $this->assertDatabaseCount('players', 0);
        $this->assertTrue(Schema::hasColumn('players', 'created_by_user_id'));
    }

    public function test_multiple_accounts_associated_with_one_player_abort_without_choosing_arbitrarily(): void
    {
        $id = $this->player();
        $this->owner->forceFill(['player_id' => $id])->save();
        $this->other->forceFill(['player_id' => $id])->save();
        try {
            $this->migration()->up();
            $this->fail('Ambiguous associations must abort.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('plusieurs comptes', $e->getMessage());
        }
        $this->assertFalse(Schema::hasColumn('players', 'created_by_user_id'));
    }

    public function test_interrupted_backfill_can_resume_without_overwriting_existing_creators(): void
    {
        $first = $this->player('First');
        $second = $this->player('Second');
        Schema::table('players', function (Blueprint $table) {
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
        });
        DB::table('players')->where('id', $first)->update(['created_by_user_id' => $this->other->id]);
        $this->migration()->up();
        $this->assertDatabaseHas('players', ['id' => $first, 'created_by_user_id' => $this->other->id]);
        $this->assertDatabaseHas('players', ['id' => $second, 'created_by_user_id' => $this->owner->id]);
    }

    public function test_creator_is_required_by_the_database(): void
    {
        $this->migration()->up();
        $this->expectException(QueryException::class);
        $this->player();
    }

    public function test_creator_must_reference_an_existing_account(): void
    {
        $this->migration()->up();
        $this->expectException(QueryException::class);
        DB::table('players')->insert(['pseudo' => 'Invalid', 'created_by_user_id' => 999999]);
    }

    public function test_deleting_a_creator_cannot_orphan_or_delete_their_players(): void
    {
        $id = $this->player();
        $this->migration()->up();
        try {
            $this->owner->delete();
            $this->fail('Deleting a creator must fail.');
        } catch (QueryException $e) {
            $this->assertDatabaseHas('players', ['id' => $id, 'created_by_user_id' => $this->owner->id]);
            $this->assertDatabaseHas('users', ['id' => $this->owner->id]);
        }
    }

    public function test_api_assigns_authenticated_creator_independently_of_the_linked_account_and_client_value(): void
    {
        $this->migration()->up();
        $this->migrateAccess();
        $this->other->forceFill(['is_admin' => true])->save();
        $response = $this->actingAs($this->other)->postJson('/api/player', [
            'pseudo' => 'New', 'createdByUserId' => $this->owner->id,
            'user' => ['id' => $this->owner->id],
        ])->assertCreated()->assertJsonPath('createdByUserId', $this->other->id);
        $id = $response->json('id');
        $this->assertSame($id, $this->owner->refresh()->player_id);
        $this->getJson('/api/player/'.$id)->assertOk()->assertJsonPath('createdByUserId', $this->other->id);
        $this->getJson('/api/player')->assertOk()->assertJsonPath('0.createdByUserId', $this->other->id);

        $this->actingAs($this->other)->putJson('/api/player/'.$id, [
            'pseudo' => 'Updated', 'createdByUserId' => $this->owner->id,
            'user' => null,
        ])->assertOk()->assertJsonPath('createdByUserId', $this->other->id);
        $this->assertDatabaseHas('players', ['id' => $id, 'pseudo' => 'Updated']);
        $this->assertDatabaseHas('player_user', ['player_id' => $id, 'user_id' => $this->other->id, 'is_creator' => true]);
        $this->assertNull($this->owner->refresh()->player_id);
    }

    public function test_new_player_without_a_linked_account_still_has_a_creator(): void
    {
        $this->migration()->up();
        $this->migrateAccess();
        $this->actingAs($this->other)->postJson('/api/player', ['pseudo' => 'Guest'])
            ->assertCreated()->assertJsonPath('createdByUserId', $this->other->id);
        $this->assertNull($this->other->refresh()->player_id);
    }

    public function test_player_list_only_contains_players_created_by_the_authenticated_user(): void
    {
        $owned = $this->player('Owned');
        $foreign = $this->player('Foreign');
        $this->other->forceFill(['player_id' => $foreign])->save();
        $this->migration()->up();
        $this->migrateAccess();
        DB::table('player_user')->where('user_id', $this->other->id)->update(['is_self' => false]);

        $this->actingAs($this->owner)->getJson('/api/player?created_by_user_id='.$this->other->id.'&is_admin=1')
            ->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.id', $owned)
            ->assertJsonPath('0.createdByUserId', $this->owner->id);
        $this->actingAs($this->other)->getJson('/api/player')
            ->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.id', $foreign)
            ->assertJsonPath('0.createdByUserId', $this->other->id);
    }

    public function test_admin_can_list_players_created_by_all_accounts(): void
    {
        $first = $this->player('First');
        $second = $this->player('Second');
        $this->other->forceFill(['player_id' => $second])->save();
        $this->migration()->up();
        $this->migrateAccess();
        $admin = User::create(['email' => 'admin@example.test', 'password' => 'unused', 'is_admin' => true]);

        $response = $this->actingAs($admin)->getJson('/api/player')
            ->assertOk()->assertJsonCount(2);
        $this->assertEqualsCanonicalizing([$first, $second], array_column($response->json(), 'id'));
    }

    public function test_account_without_created_players_receives_an_empty_list(): void
    {
        $this->player();
        $this->migration()->up();
        $this->migrateAccess();
        $this->actingAs($this->other)->getJson('/api/player')->assertOk()->assertExactJson([]);
    }

    public function test_admin_sees_only_creator_identity_and_linked_player_for_unassociated_players(): void
    {
        $guest = $this->player('Guest');
        $identity = $this->player('Creator identity');
        $this->owner->forceFill(['player_id' => $identity, 'is_admin' => true])->save();
        $this->migration()->up();
        $this->migrateAccess();

        $response = $this->actingAs($this->owner)->getJson('/api/player')->assertOk();
        $rows = collect($response->json())->keyBy('id');
        $this->assertSame([
            'id' => $this->owner->id,
            'email' => $this->owner->email,
            'player' => ['id' => $identity, 'pseudo' => 'Creator identity'],
        ], $rows[$guest]['creator']);
        $this->assertArrayNotHasKey('creator', $rows[$identity]);
    }

    public function test_admin_sees_creator_even_without_a_linked_player(): void
    {
        $this->player('Guest');
        $this->migration()->up();
        $this->migrateAccess();
        $this->other->forceFill(['is_admin' => true])->save();

        $this->actingAs($this->other)->getJson('/api/player')->assertOk()
            ->assertJsonPath('0.creator.email', $this->owner->email)
            ->assertJsonPath('0.creator.player', null);
    }

    public function test_non_admin_does_not_receive_creator_details(): void
    {
        $this->player('Guest');
        $this->migration()->up();
        $this->migrateAccess();

        $this->actingAs($this->owner)->getJson('/api/player?is_admin=1')->assertOk()
            ->assertJsonMissingPath('0.creator');
    }

    public function test_unauthenticated_player_list_is_rejected(): void
    {
        $this->migration()->up();
        $this->getJson('/api/player')->assertUnauthorized();
    }

    public function test_player_detail_counts_completed_matches_once_and_excludes_other_players(): void
    {
        $id = $this->player('Participant');
        $inactive = $this->player('Inactive');
        $this->migration()->up();
        $this->migrateAccess();
        DB::table('matches')->insert([
            ['id' => 1, 'running' => false, 'canceled' => false],
            ['id' => 2, 'running' => false, 'canceled' => false],
            ['id' => 3, 'running' => true, 'canceled' => false],
            ['id' => 4, 'running' => false, 'canceled' => true],
            ['id' => 5, 'running' => false, 'canceled' => false],
        ]);
        DB::table('teams')->insert([
            ['id' => 1, 'match_id' => 1], ['id' => 2, 'match_id' => 1],
            ['id' => 3, 'match_id' => 2], ['id' => 4, 'match_id' => 3],
            ['id' => 5, 'match_id' => 4], ['id' => 6, 'match_id' => 5],
        ]);
        foreach ([1, 1, 2, 3, 4, 5] as $teamId) {
            DB::table('team_players')->insert(['team_id' => $teamId, 'player_id' => $id]);
        }
        DB::table('team_players')->insert(['team_id' => 6, 'player_id' => $inactive]);
        $this->actingAs($this->owner)->getJson('/api/player/'.$id)
            ->assertOk()->assertJsonPath('playedMatchCount', 2);
        $this->getJson('/api/player/'.$inactive)
            ->assertOk()->assertJsonPath('playedMatchCount', 1);
    }

    public function test_player_detail_reports_zero_when_the_player_never_participated(): void
    {
        $id = $this->player();
        $this->migration()->up();
        $this->migrateAccess();
        $this->actingAs($this->owner)->getJson('/api/player/'.$id)
            ->assertOk()->assertJsonPath('playedMatchCount', 0);
    }

    public function test_unauthenticated_creation_is_rejected(): void
    {
        $this->migration()->up();
        $this->postJson('/api/player', ['pseudo' => 'Guest'])->assertUnauthorized();
        $this->assertDatabaseCount('players', 0);
    }
}
