<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use App\Services\PlayerIdentity;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class NormalizePlayerIdentityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'identity_test', 'database.connections.identity_test' => $this->connectionConfig()]);
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('email');
            $table->string('password');
            $table->boolean('is_admin')->default(false);
            $table->timestamps();
        });
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->string('pseudo');
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('player_id')->nullable()->index()->constrained('players');
        });
        DB::table('users')->insert([
            ['id' => 1, 'email' => 'creator@example.test', 'password' => 'unused'],
            ['id' => 2, 'email' => 'self@example.test', 'password' => 'unused'],
            ['id' => 3, 'email' => 'other@example.test', 'password' => 'unused'],
        ]);
        DB::table('players')->insert([
            ['id' => 10, 'pseudo' => 'First', 'created_by_user_id' => 1, 'created_at' => '2020-01-01 12:00:00'],
            ['id' => 20, 'pseudo' => 'Second', 'created_by_user_id' => 1, 'created_at' => '2021-01-01 12:00:00'],
        ]);
        DB::table('users')->where('id', 2)->update(['player_id' => 10]);
        (require database_path('migrations/2026_10_18_140000_create_player_user_table.php'))->up();
        (require database_path('migrations/2026_10_18_200000_add_personal_pseudo_to_player_user.php'))->up();
        DB::table('player_user')->where('user_id', 2)->update(['can_view_other_matches' => false]);
    }

    protected function tearDown(): void
    {
        DB::purge('identity_test');
        parent::tearDown();
    }

    protected function connectionConfig(): array
    {
        return [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => 'test$',
            'foreign_key_constraints' => true,
        ];
    }

    private function migration(): Migration
    {
        return require database_path('migrations/2026_10_18_170000_normalize_player_user_identity.php');
    }

    public function test_migration_removes_legacy_columns_without_changing_creators_rights_or_dates_and_can_resume(): void
    {
        $before = DB::table('player_user')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        $this->migration()->up();
        $this->assertFalse(Schema::hasColumn('players', 'created_by_user_id'));
        $this->assertFalse(Schema::hasColumn('users', 'player_id'));
        foreach ($before as $row) {
            $this->assertDatabaseHas('player_user', $row);
        }
        $this->assertDatabaseHas('player_user', ['player_id' => 10, 'user_id' => 2, 'is_self' => true]);
        $this->assertDatabaseHas('player_user', ['player_id' => 10, 'user_id' => 1, 'is_self' => false, 'is_creator' => true]);
        $this->migration()->up();
        $this->assertDatabaseCount('player_user', 3);
        $player = Player::findOrFail(10);
        $this->assertSame(1, $player->created_by_user_id);
        $this->assertSame(1, $player->creator->id);
        $this->assertSame(2, $player->user->id);
        $this->assertSame(10, User::findOrFail(2)->player_id);
        $this->assertNull(User::findOrFail(3)->player_id);
        $this->assertSame([10, 20], User::findOrFail(1)->createdPlayers()->orderBy('players.id')->pluck('players.id')->all());
        $this->assertSame(10, User::findOrFail(2)->toArray()['player_id']);
        $this->assertSame(1, $player->toArray()['created_by_user_id']);
    }

    public function test_rollback_reconstructs_current_identities_and_creators_without_losing_shares(): void
    {
        $this->migration()->up();
        app(PlayerIdentity::class)->assign(Player::findOrFail(20), User::findOrFail(2));
        $links = DB::table('player_user')->count();
        $this->migration()->down();
        $this->assertDatabaseHas('users', ['id' => 2, 'player_id' => 20]);
        $this->assertDatabaseHas('users', ['id' => 1, 'player_id' => null]);
        $this->assertDatabaseHas('players', ['id' => 10, 'created_by_user_id' => 1]);
        $this->assertDatabaseHas('players', ['id' => 20, 'created_by_user_id' => 1]);
        $this->assertDatabaseCount('player_user', $links);
        $this->assertFalse(Schema::hasColumn('player_user', 'is_self'));
        $this->migration()->up();
        $this->assertSame(20, User::findOrFail(2)->player_id);
    }

    public function test_migration_refuses_conflicting_creator_before_schema_changes(): void
    {
        DB::table('player_user')->where('player_id', 10)->where('user_id', 2)->update(['is_creator' => true]);
        try {
            $this->migration()->up();
            $this->fail('Ambiguous creator must be rejected.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('createur', $exception->getMessage());
        }
        $this->assertTrue(Schema::hasColumn('players', 'created_by_user_id'));
        $this->assertTrue(Schema::hasColumn('users', 'player_id'));
        $this->assertFalse(Schema::hasColumn('player_user', 'is_self'));
    }

    public function test_migration_refuses_missing_creator_instead_of_deleting_provenance(): void
    {
        DB::table('player_user')->where('player_id', 10)->where('is_creator', true)->delete();
        $this->expectException(\RuntimeException::class);
        $this->migration()->up();
    }

    public function test_migration_refuses_a_creator_that_disagrees_with_legacy_provenance(): void
    {
        DB::table('players')->where('id', 10)->update(['created_by_user_id' => 3]);
        $this->expectException(\RuntimeException::class);
        $this->migration()->up();
    }

    public function test_migration_refuses_two_personal_accounts_for_one_player(): void
    {
        DB::table('users')->where('id', 3)->update(['player_id' => 10]);
        $this->expectException(\RuntimeException::class);
        $this->migration()->up();
    }

    public function test_migration_refuses_identity_without_a_sharing_link(): void
    {
        DB::table('player_user')->where('user_id', 2)->delete();
        $this->expectException(\RuntimeException::class);
        $this->migration()->up();
    }

    public function test_interrupted_backfill_preserves_rights_and_resumes_without_duplicating_links(): void
    {
        Schema::table('player_user', fn (Blueprint $table) => $table->boolean('is_self')->default(false));
        DB::table('player_user')->where('user_id', 2)->update(['is_self' => true]);
        $this->migration()->up();
        $this->assertDatabaseCount('player_user', 3);
        $this->assertDatabaseHas('player_user', [
            'player_id' => 10, 'user_id' => 2, 'is_self' => true, 'can_view_other_matches' => false,
        ]);
    }

    public function test_migration_refuses_an_interrupted_identity_that_disagrees_with_legacy_identity(): void
    {
        Schema::table('player_user', fn (Blueprint $table) => $table->boolean('is_self')->default(false));
        DB::table('player_user')->where('player_id', 10)->where('user_id', 1)->update(['is_self' => true]);
        $this->expectException(\RuntimeException::class);
        $this->migration()->up();
    }

    public function test_migration_resumes_after_legacy_foreign_key_removal(): void
    {
        foreach (Schema::getForeignKeys('users') as $foreign) {
            $key = DB::getDriverName() === 'sqlite' ? ['player_id'] : $foreign['name'];
            Schema::table('users', fn (Blueprint $table) => $table->dropForeign($key));
        }
        $this->migration()->up();
        $this->assertFalse(Schema::hasColumn('users', 'player_id'));
        $this->assertSame(10, User::findOrFail(2)->player_id);
    }

    public function test_empty_database_can_migrate_and_roll_back_without_a_fallback_user(): void
    {
        DB::table('player_user')->delete();
        DB::table('users')->update(['player_id' => null]);
        DB::table('players')->delete();
        DB::table('users')->delete();
        $this->migration()->up();
        $this->assertFalse(Schema::hasColumn('users', 'player_id'));
        $this->assertFalse(Schema::hasColumn('players', 'created_by_user_id'));
        $this->migration()->down();
        $this->assertTrue(Schema::hasColumn('users', 'player_id'));
        $this->assertTrue(Schema::hasColumn('players', 'created_by_user_id'));
        $this->assertDatabaseCount('players', 0);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_database_prevents_two_creators_for_one_player(): void
    {
        $this->migration()->up();
        $this->expectException(QueryException::class);
        DB::table('player_user')->where('player_id', 10)->where('user_id', 2)->update(['is_creator' => true]);
    }

    public function test_database_prevents_two_personal_accounts_for_one_player(): void
    {
        $this->migration()->up();
        $this->expectException(QueryException::class);
        DB::table('player_user')->where('player_id', 10)->where('user_id', 1)->update(['is_self' => true]);
    }

    public function test_database_prevents_two_personal_players_for_one_account(): void
    {
        $this->migration()->up();
        $this->expectException(QueryException::class);
        DB::table('player_user')->insert([
            'player_id' => 20, 'user_id' => 2, 'is_self' => true, 'associated_at' => now(),
        ]);
    }

    public function test_identity_transfer_and_removal_preserve_creator_rights_and_association_dates(): void
    {
        $this->migration()->up();
        $identity = app(PlayerIdentity::class);
        $old = DB::table('player_user')->where('user_id', 2)->first();
        $identity->assign(Player::findOrFail(10), User::findOrFail(3));
        $this->assertNull(User::findOrFail(2)->player_id);
        $this->assertSame(10, User::findOrFail(3)->player_id);
        $identity->assign(Player::findOrFail(20), User::findOrFail(3));
        $this->assertNull(Player::findOrFail(10)->user);
        $this->assertSame(20, User::findOrFail(3)->player_id);
        $identity->assign(Player::findOrFail(20), null);
        $this->assertNull(User::findOrFail(3)->player_id);
        $identity->assign(Player::findOrFail(10), User::findOrFail(2));
        $this->assertDatabaseHas('player_user', [
            'id' => $old->id, 'associated_at' => $old->associated_at, 'can_view_other_matches' => false, 'is_self' => true,
        ]);
        $this->assertDatabaseHas('player_user', ['player_id' => 10, 'user_id' => 1, 'is_creator' => true]);
        $this->assertSame(1, Player::findOrFail(10)->created_by_user_id);
    }

    public function test_deleting_a_creator_account_is_still_restricted_after_legacy_column_is_removed(): void
    {
        $this->migration()->up();
        $this->expectException(QueryException::class);
        User::findOrFail(1)->delete();
    }
}
