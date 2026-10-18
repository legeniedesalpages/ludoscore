<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use App\Services\PlayerIdentity;
use App\Services\PlayerMerge;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class PlayerMergeTest extends TestCase
{
    protected User $actor;

    protected User $owner;

    protected User $guest;

    protected function connectionConfig(): array
    {
        return ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => 'test$', 'foreign_key_constraints' => true];
    }

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'merge_test', 'database.connections.merge_test' => $this->connectionConfig()]);
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('email');
            $table->string('password');
            $table->boolean('is_admin')->default(false);
            $table->unsignedBigInteger('player_id')->nullable();
            $table->timestamps();
        });
        Schema::create('players', function (Blueprint $table): void {
            $table->id();
            $table->string('pseudo');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('prefered_color')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->timestamps();
        });
        Schema::create('matches', function (Blueprint $table): void {
            $table->id();
            $table->boolean('canceled')->default(false);
            $table->boolean('running')->default(false);
            $table->timestamps();
        });
        Schema::create('teams', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('match_id')->constrained('matches');
            $table->string('name')->default('Team');
            $table->integer('score')->nullable();
            $table->timestamps();
        });
        Schema::create('team_players', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('team_id')->constrained('teams');
            $table->foreignId('player_id')->constrained('players');
            $table->integer('position')->default(0);
            $table->timestamps();
        });
        $this->actor = User::create(['email' => 'actor@example.test', 'password' => 'unused']);
        $this->owner = User::create(['email' => 'owner@example.test', 'password' => 'unused']);
        $this->guest = User::create(['email' => 'guest@example.test', 'password' => 'unused']);
        foreach ([10 => $this->actor->id, 20 => $this->owner->id, 30 => $this->actor->id] as $id => $creator) {
            DB::table('players')->insert([
                'id' => $id, 'pseudo' => 'Player '.$id, 'first_name' => 'Private',
                'created_by_user_id' => $creator, 'created_at' => '2020-01-01 12:00:00',
            ]);
        }
        DB::table('users')->where('id', $this->owner->id)->update(['player_id' => 20]);
        (require database_path('migrations/2026_10_18_140000_create_player_user_table.php'))->up();
        (require database_path('migrations/2026_10_18_170000_normalize_player_user_identity.php'))->up();
        (require database_path('migrations/2026_10_18_180000_add_ludotag_to_players.php'))->up();
        $this->migration()->up();
        (require database_path('migrations/2026_10_18_200000_add_personal_pseudo_to_player_user.php'))->up();
        $this->actingAs($this->actor);
    }

    protected function tearDown(): void
    {
        DB::purge('merge_test');
        parent::tearDown();
    }

    private function migration(): Migration
    {
        return require database_path('migrations/2026_10_18_190000_add_player_merges.php');
    }

    private function tag(int $id = 20): string
    {
        return DB::table('players')->where('id', $id)->value('ludotag');
    }

    private function participation(int $player, ?int $match = null, bool $running = false, bool $canceled = false): int
    {
        $match ??= DB::table('matches')->insertGetId(['running' => $running, 'canceled' => $canceled]);
        $team = DB::table('teams')->insertGetId(['match_id' => $match, 'score' => 42]);

        return DB::table('team_players')->insertGetId([
            'team_id' => $team, 'player_id' => $player, 'position' => 2, 'created_at' => '2020-01-01 12:00:00',
        ]);
    }

    private function merge(int $survivor = 20, int $source = 10): TestResponse
    {
        return $this->postJson('/api/player/'.$source.'/merge', ['ludotag' => $this->tag($survivor), 'confirmed' => true]);
    }

    public function test_preview_is_read_only_and_reveals_only_public_names_counts_and_conflict_ids(): void
    {
        $this->participation(10);
        $before = DB::table('team_players')->get()->toJson();
        $this->postJson('/api/player/10/merge/preview', ['ludotag' => strtolower($this->tag())])->assertOk()
            ->assertExactJson([
                'replaced' => ['id' => 10, 'pseudo' => 'Player 10'], 'survivor' => ['id' => 20, 'pseudo' => 'Player 20'],
                'matchCount' => 1, 'participationCount' => 1, 'conflictMatchIds' => [],
            ]);
        $this->assertSame($before, DB::table('team_players')->get()->toJson());
        $this->assertDatabaseCount('player_merges', 0);
        $this->assertNull(Player::findOrFail(10)->replaced_by_player_id);
    }

    public function test_all_participations_move_without_deleting_players_teams_scores_or_dates(): void
    {
        foreach ([[false, false], [true, false], [false, true]] as [$running, $canceled]) {
            $this->participation(10, running: $running, canceled: $canceled);
        }
        $unchanged = $this->participation(20);
        $matches = DB::table('matches')->get()->toJson();
        $teams = DB::table('teams')->get()->toJson();
        $before = DB::table('team_players')->where('player_id', 10)->get();
        $survivorBefore = (array) DB::table('players')->where('id', 20)->first();
        $survivorLinksBefore = DB::table('player_user')->where('player_id', 20)->get();
        $this->merge()->assertOk()->assertJsonPath('participationCount', 3)->assertJsonPath('matchCount', 3);
        $this->assertDatabaseHas('players', $survivorBefore);
        foreach ($survivorLinksBefore as $link) {
            $this->assertDatabaseHas('player_user', (array) $link);
        }
        $this->assertDatabaseCount('players', 3);
        $this->assertDatabaseCount('team_players', 4);
        $this->assertSame($matches, DB::table('matches')->get()->toJson());
        $this->assertSame($teams, DB::table('teams')->get()->toJson());
        foreach ($before as $row) {
            $expected = (array) $row;
            $expected['player_id'] = 20;
            $expected['original_player_id'] = 10;
            $this->assertDatabaseHas('team_players', $expected);
        }
        $this->assertDatabaseHas('team_players', ['id' => $unchanged, 'player_id' => 20, 'original_player_id' => null]);
        $this->assertDatabaseHas('players', ['id' => 10, 'replaced_by_player_id' => 20, 'pseudo' => 'Player 10']);
        $this->assertNotNull(Player::findOrFail(10)->replaced_at);
        $this->assertSame('replaced', Player::findOrFail(10)->status);
        $this->assertSame('active', Player::findOrFail(20)->status);
        $this->assertDatabaseCount('player_merge_participations', 3);
        $this->assertDatabaseHas('player_merges', [
            'replaced_player_id' => 10, 'surviving_player_id' => 20, 'requested_by_user_id' => $this->actor->id,
        ]);
        $this->assertSame(20, $this->owner->refresh()->player_id);
        $this->assertNull($this->actor->refresh()->player_id);
    }

    public function test_new_links_have_no_rights_and_existing_permissions_creator_identity_and_dates_are_preserved(): void
    {
        DB::table('player_user')->insert([
            ['player_id' => 10, 'user_id' => $this->guest->id, 'can_view_personal_info' => false, 'can_view_other_matches' => true, 'can_add_to_match' => false, 'associated_at' => '2021-01-01 12:00:00'],
            ['player_id' => 20, 'user_id' => $this->actor->id, 'can_view_personal_info' => false, 'can_view_other_matches' => false, 'can_add_to_match' => false, 'associated_at' => '2022-01-01 12:00:00'],
        ]);
        $before = DB::table('player_user')->orderBy('id')->get();
        $this->merge()->assertOk();
        foreach ($before as $row) {
            $expected = (array) $row;
            if ($row->player_id === 20 && $row->user_id === $this->actor->id) {
                $expected['personal_pseudo'] = 'Player 10';
                unset($expected['updated_at']);
            }
            $this->assertDatabaseHas('player_user', $expected);
        }
        $this->assertDatabaseHas('player_user', [
            'player_id' => 20, 'user_id' => $this->guest->id, 'is_creator' => false, 'is_self' => false,
            'can_view_personal_info' => false, 'can_view_other_matches' => false, 'can_add_to_match' => false,
        ]);
        $this->assertEquals(
            json_decode($before->whereIn('player_id', [10, 20])->values()->toJson(), true),
            json_decode(DB::table('player_merges')->value('associations_before'), true),
        );
        $this->assertDatabaseCount('player_user', $before->count() + 1);
    }

    public function test_requester_receives_no_rights_on_survivor_despite_full_rights_on_source(): void
    {
        $sourceLink = (array) DB::table('player_user')->where('player_id', 10)->where('user_id', $this->actor->id)->first();
        $this->assertDatabaseHas('player_user', [
            'id' => $sourceLink['id'], 'can_view_personal_info' => true,
            'can_view_other_matches' => true, 'can_add_to_match' => true,
        ]);
        $this->merge()->assertOk();
        $this->assertDatabaseHas('player_user', [
            'player_id' => 20, 'user_id' => $this->actor->id,
            'is_creator' => false, 'is_self' => false,
            'can_view_personal_info' => false, 'can_view_other_matches' => false, 'can_add_to_match' => false,
        ]);
        $this->assertDatabaseHas('player_user', $sourceLink);
        $this->getJson('/api/player/20')->assertOk()->assertJsonMissingPath('firstName')
            ->assertJsonPath('permissions.canViewPersonalInfo', false)
            ->assertJsonPath('permissions.canViewOtherMatches', false)
            ->assertJsonPath('permissions.canAddToMatch', false)
            ->assertJsonPath('permissions.canEdit', false)
            ->assertJsonPath('permissions.canMerge', false)
            ->assertJsonPath('permissions.canManageAssociations', false);
        $this->getJson('/api/player?purpose=match')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', 30);
        $this->postJson('/api/game-match', ['teams' => [['players' => [['playerId' => 20]]]]])->assertForbidden();
        $this->postJson('/api/player/associate-ludotag', ['ludotag' => $this->tag()])->assertOk();
        $this->assertDatabaseHas('player_user', [
            'player_id' => 20, 'user_id' => $this->actor->id,
            'can_view_personal_info' => false, 'can_view_other_matches' => false, 'can_add_to_match' => false,
        ]);
    }

    public function test_merge_preserves_rights_already_granted_on_survivor(): void
    {
        DB::table('player_user')->insert([
            'player_id' => 20, 'user_id' => $this->actor->id,
            'can_view_personal_info' => true, 'can_view_other_matches' => true, 'can_add_to_match' => true,
            'associated_at' => '2022-01-01 12:00:00',
        ]);
        $before = (array) DB::table('player_user')->where('player_id', 20)->where('user_id', $this->actor->id)->first();
        $this->merge()->assertOk();
        $before['personal_pseudo'] = 'Player 10';
        unset($before['updated_at']);
        $this->assertDatabaseHas('player_user', $before);
    }

    public function test_conflicts_in_different_teams_block_the_entire_merge_even_for_canceled_matches(): void
    {
        $this->participation(10);
        $this->participation(10, canceled: true);
        $conflict = DB::table('matches')->max('id');
        $this->participation(20, $conflict);
        $before = DB::table('team_players')->get()->toJson();
        $links = DB::table('player_user')->get()->toJson();
        $this->postJson('/api/player/10/merge/preview', ['ludotag' => $this->tag()])->assertOk()
            ->assertJsonPath('conflictMatchIds', [$conflict]);
        $this->merge()->assertUnprocessable()->assertJsonValidationErrors('conflicts');
        $this->assertSame($before, DB::table('team_players')->get()->toJson());
        $this->assertSame($links, DB::table('player_user')->get()->toJson());
        $this->assertDatabaseCount('player_merges', 0);
        $this->assertNull(Player::findOrFail(10)->replaced_by_player_id);
    }

    public function test_merge_keeps_source_name_locally_and_preserves_existing_target_aliases(): void
    {
        DB::table('player_user')->insert([
            'player_id' => 10, 'user_id' => $this->guest->id, 'personal_pseudo' => 'My source alias', 'associated_at' => now(),
        ]);
        $this->merge()->assertOk();
        $this->getJson('/api/player/20')->assertOk()->assertJsonPath('pseudo', 'Player 10')->assertJsonPath('creatorPseudo', 'Player 20');
        $this->actingAs($this->owner)->getJson('/api/player/20')->assertOk()->assertJsonPath('pseudo', 'Player 20')->assertJsonPath('creatorPseudo', null);
        $this->actingAs($this->guest)->getJson('/api/player/20')->assertOk()->assertJsonPath('pseudo', 'My source alias')->assertJsonPath('creatorPseudo', 'Player 20');
        $this->assertDatabaseHas('players', ['id' => 20, 'pseudo' => 'Player 20']);
        $this->assertDatabaseHas('player_user', [
            'player_id' => 20, 'user_id' => $this->guest->id,
            'can_view_personal_info' => false, 'can_view_other_matches' => false, 'can_add_to_match' => false,
        ]);
    }

    public function test_merge_never_overwrites_an_existing_alias(): void
    {
        DB::table('player_user')->insert([
            'player_id' => 20, 'user_id' => $this->actor->id, 'personal_pseudo' => 'Already chosen', 'associated_at' => now(),
        ]);
        $before = (array) DB::table('player_user')->where('player_id', 20)->where('user_id', $this->actor->id)->first();
        $this->merge()->assertOk();
        $this->assertDatabaseHas('player_user', $before);
        $this->getJson('/api/player/20')->assertOk()->assertJsonPath('pseudo', 'Already chosen');
    }

    public function test_merge_never_overwrites_the_survivor_creators_name(): void
    {
        $this->merge(30)->assertOk();
        $this->assertDatabaseHas('player_user', ['player_id' => 30, 'user_id' => $this->actor->id, 'is_creator' => true, 'personal_pseudo' => null]);
    }

    public function test_equal_names_do_not_create_a_redundant_alias_and_migration_is_lossless_and_resumable(): void
    {
        $migration = require database_path('migrations/2026_10_18_200000_add_personal_pseudo_to_player_user.php');
        $links = DB::table('player_user')->get()->toJson();
        $migration->up();
        $this->assertSame($links, DB::table('player_user')->get()->toJson());
        DB::table('players')->where('id', 10)->update(['pseudo' => 'Player 20']);
        $this->merge()->assertOk();
        $this->assertDatabaseHas('player_user', ['player_id' => 20, 'user_id' => $this->actor->id, 'personal_pseudo' => null]);
        DB::table('player_user')->where('player_id', 20)->where('user_id', $this->actor->id)->update(['personal_pseudo' => 'Keep this']);
        $migration->up();
        $this->assertDatabaseHas('player_user', ['player_id' => 20, 'user_id' => $this->actor->id, 'personal_pseudo' => 'Keep this']);
        $this->expectException(\RuntimeException::class);
        $migration->down();
    }

    public function test_personal_pseudo_migration_preserves_existing_rows_and_rolls_back_when_unused(): void
    {
        $migration = require database_path('migrations/2026_10_18_200000_add_personal_pseudo_to_player_user.php');
        $migration->down();
        $before = DB::table('player_user')->orderBy('id')->get();
        $players = DB::table('players')->orderBy('id')->get()->toJson();
        $migration->up();
        foreach ($before as $link) {
            $this->assertDatabaseHas('player_user', (array) $link + ['personal_pseudo' => null]);
        }
        $this->assertSame($players, DB::table('players')->orderBy('id')->get()->toJson());
        $this->assertDatabaseCount('player_user', $before->count());
    }

    public function test_conflict_created_after_preview_is_rechecked_at_confirmation(): void
    {
        $this->participation(10);
        $match = DB::table('matches')->max('id');
        $this->postJson('/api/player/10/merge/preview', ['ludotag' => $this->tag()])->assertOk()->assertJsonPath('conflictMatchIds', []);
        $this->participation(20, $match);
        $this->merge()->assertUnprocessable();
        $this->assertDatabaseCount('player_merges', 0);
    }

    public function test_successive_merges_keep_original_player_and_every_intermediate_step(): void
    {
        $id = $this->participation(10);
        $this->merge(30)->assertOk();
        $this->merge(20, 30)->assertOk();
        $this->assertDatabaseHas('team_players', ['id' => $id, 'player_id' => 20, 'original_player_id' => 10]);
        $journal = DB::table('player_merge_participations')->where('participation_id', $id)->orderBy('id')->get();
        $this->assertSame([10, 30], $journal->pluck('previous_player_id')->all());
        $this->assertSame([null, 10], $journal->pluck('original_player_id')->all());
        $this->assertDatabaseHas('players', ['id' => 10, 'replaced_by_player_id' => 30]);
        $this->assertDatabaseHas('players', ['id' => 30, 'replaced_by_player_id' => 20]);
        $this->assertDatabaseCount('player_merges', 2);
    }

    public function test_replaced_players_are_read_only_archives_not_selectable_and_their_tags_cannot_be_reused(): void
    {
        $this->merge()->assertOk();
        $this->actingAs($this->actor)->getJson('/api/player')->assertOk()->assertJsonCount(2);
        $this->getJson('/api/player/10')->assertOk()->assertJsonPath('status', 'replaced')
            ->assertJsonPath('replacedByPlayerId', 20)->assertJsonPath('permissions.canEdit', false);
        $this->getJson('/api/player?purpose=match')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', 30);
        $this->postJson('/api/player/associate-ludotag', ['ludotag' => $this->tag(10)])->assertUnprocessable();
        $this->actor->forceFill(['is_admin' => true])->save();
        $this->getJson('/api/player')->assertOk()->assertJsonCount(3);
        $this->getJson('/api/player?purpose=match')->assertOk()->assertJsonCount(2);
        $this->putJson('/api/player/10', ['pseudo' => 'Overwrite'])->assertNotFound();
        $this->postJson('/api/game-match', ['teams' => [['players' => [['playerId' => 10]]]]])->assertForbidden();
        $this->assertDatabaseCount('matches', 0);
    }

    public function test_only_creator_can_replace_the_source_even_for_an_admin(): void
    {
        $this->actingAs($this->owner);
        $this->merge()->assertForbidden();
        $this->actingAs($this->guest);
        $this->merge()->assertForbidden();
        $this->guest->forceFill(['is_admin' => true])->save();
        $this->merge()->assertForbidden();
        $this->assertDatabaseCount('player_merges', 0);
    }

    public function test_personal_players_cannot_be_replaced_by_their_creator_personal_account_or_admin(): void
    {
        app(PlayerIdentity::class)->assign(Player::findOrFail(10), $this->actor);
        $this->participation(10);
        $beforePlayers = DB::table('players')->orderBy('id')->get()->toJson();
        $beforeLinks = DB::table('player_user')->orderBy('id')->get()->toJson();
        $beforeParticipations = DB::table('team_players')->orderBy('id')->get()->toJson();
        foreach ([false, true] as $admin) {
            $this->actor->forceFill(['is_admin' => $admin])->save();
            $this->getJson('/api/player/10')->assertOk()->assertJsonPath('permissions.canMerge', false);
            $this->postJson('/api/player/10/merge/preview', ['ludotag' => $this->tag()])->assertUnprocessable();
            $this->merge()->assertUnprocessable();
        }
        $this->assertSame($beforePlayers, DB::table('players')->orderBy('id')->get()->toJson());
        $this->assertSame($beforeLinks, DB::table('player_user')->orderBy('id')->get()->toJson());
        $this->assertSame($beforeParticipations, DB::table('team_players')->orderBy('id')->get()->toJson());
        $this->assertDatabaseCount('player_merges', 0);
        $this->assertDatabaseCount('player_merge_participations', 0);
        $this->assertSame(10, $this->actor->refresh()->player_id);
    }

    public function test_creator_cannot_replace_a_player_representing_another_account(): void
    {
        app(PlayerIdentity::class)->assign(Player::findOrFail(10), $this->guest);
        $this->getJson('/api/player/10')->assertOk()->assertJsonPath('permissions.canMerge', false);
        $this->postJson('/api/player/10/merge/preview', ['ludotag' => $this->tag()])->assertUnprocessable();
        $this->merge()->assertUnprocessable();
        $this->assertSame(10, $this->guest->refresh()->player_id);
        $this->assertNull(Player::findOrFail(10)->replaced_by_player_id);
        $this->assertDatabaseCount('player_merges', 0);
    }

    public function test_personal_identity_is_checked_again_when_confirming_a_merge(): void
    {
        $this->postJson('/api/player/10/merge/preview', ['ludotag' => $this->tag()])->assertOk();
        app(PlayerIdentity::class)->assign(Player::findOrFail(10), $this->guest);
        $this->merge()->assertUnprocessable();
        $this->assertDatabaseCount('player_merges', 0);
        $this->assertNull(Player::findOrFail(10)->replaced_by_player_id);
    }

    public function test_personal_identity_without_creator_rights_cannot_request_replacement(): void
    {
        app(PlayerIdentity::class)->assign(Player::findOrFail(10), $this->actor);
        DB::table('player_user')->where('player_id', 10)->where('user_id', $this->actor->id)->update(['is_creator' => false]);
        DB::table('player_user')->insert([
            'player_id' => 10, 'user_id' => $this->guest->id, 'is_creator' => true, 'associated_at' => now(),
        ]);
        $this->getJson('/api/player/10')->assertOk()->assertJsonPath('permissions.canMerge', false);
        $this->merge()->assertForbidden();
        $this->merge(20, 30)->assertOk();
        $this->assertSame(20, $this->owner->refresh()->player_id);
        $this->assertDatabaseCount('player_merges', 1);
    }

    public function test_confirmation_is_mandatory_and_self_merge_replay_cycles_and_replaced_survivor_are_rejected(): void
    {
        $this->postJson('/api/player/10/merge', ['ludotag' => $this->tag()])->assertUnprocessable();
        $this->merge(20, 20)->assertUnprocessable();
        $this->merge()->assertOk();
        $this->merge()->assertUnprocessable();
        $this->merge(10, 20)->assertUnprocessable();
        $this->merge(30, 10)->assertUnprocessable();
        $this->assertDatabaseCount('player_merges', 1);
    }

    public function test_invalid_ludotag_is_rejected_without_mutation(): void
    {
        $this->postJson('/api/player/10/merge/preview', ['ludotag' => 'invalid'])->assertUnprocessable();
        $this->assertDatabaseCount('player_merges', 0);
        $this->assertNull(Player::findOrFail(10)->replaced_by_player_id);
    }

    public function test_preview_and_confirmation_share_the_ludotag_attempt_limit(): void
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson('/api/player/10/merge/preview', ['ludotag' => 'invalid'])->assertUnprocessable();
        }
        $this->merge()->assertTooManyRequests();
        $this->assertDatabaseCount('player_merges', 0);
    }

    public function test_merge_endpoints_require_authentication(): void
    {
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/player/10/merge/preview', ['ludotag' => $this->tag()])->assertUnauthorized();
        $this->merge()->assertUnauthorized();
    }

    public function test_failure_after_participation_updates_rolls_back_every_change_and_the_audit(): void
    {
        $this->participation(10);
        $before = DB::table('team_players')->get()->toJson();
        $links = DB::table('player_user')->get()->toJson();
        $event = 'eloquent.saving: '.Player::class;
        Event::listen($event, function (Player $player): void {
            if ($player->replaced_by_player_id !== null) {
                throw new \RuntimeException('Simulated failure after participation updates.');
            }
        });
        try {
            app(PlayerMerge::class)->run($this->actor, 10, $this->tag(), true);
            $this->fail('The failure must be surfaced.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('Simulated failure', $exception->getMessage());
        } finally {
            Event::forget($event);
        }
        $this->assertSame($before, DB::table('team_players')->get()->toJson());
        $this->assertSame($links, DB::table('player_user')->get()->toJson());
        $this->assertDatabaseCount('player_merges', 0);
        $this->assertDatabaseCount('player_merge_participations', 0);
        $this->assertNull(Player::findOrFail(10)->replaced_by_player_id);
    }

    public function test_new_identity_cannot_be_assigned_to_an_archived_player(): void
    {
        $this->merge()->assertOk();
        $this->expectException(HttpException::class);
        app(PlayerIdentity::class)->assign(Player::findOrFail(10), $this->guest);
    }

    public function test_journal_survives_participation_deletion_and_rollback_refuses_to_erase_merges(): void
    {
        $id = $this->participation(10);
        $this->merge()->assertOk();
        DB::table('team_players')->where('id', $id)->delete();
        $this->assertDatabaseHas('player_merge_participations', ['participation_id' => $id, 'team_player_id' => null, 'previous_player_id' => 10]);
        $this->expectException(\RuntimeException::class);
        $this->migration()->down();
    }

    public function test_empty_migration_can_resume_and_roll_back_without_changing_historical_data(): void
    {
        $this->participation(10);
        $players = DB::table('players')->get()->toJson();
        $participations = DB::table('team_players')->get()->toJson();
        $this->migration()->up();
        $this->assertSame($players, DB::table('players')->get()->toJson());
        $this->assertSame($participations, DB::table('team_players')->get()->toJson());
        $this->migration()->down();
        $this->assertFalse(Schema::hasColumn('players', 'replaced_by_player_id'));
        $this->assertFalse(Schema::hasColumn('team_players', 'original_player_id'));
        $this->assertDatabaseCount('players', 3);
        $this->assertDatabaseCount('team_players', 1);
        $this->migration()->up();
        $this->assertDatabaseCount('player_merges', 0);
    }

    public function test_migration_resumes_when_columns_exist_but_constraints_are_missing(): void
    {
        $this->migration()->down();
        Schema::table('players', fn (Blueprint $table) => $table->unsignedBigInteger('replaced_by_player_id')->nullable());
        Schema::table('team_players', fn (Blueprint $table) => $table->unsignedBigInteger('original_player_id')->nullable());
        $this->migration()->up();
        $this->assertTrue(Schema::hasColumn('players', 'replaced_at'));
        $this->assertTrue(collect(Schema::getForeignKeys('players'))->contains(fn ($key) => $key['columns'] === ['replaced_by_player_id']));
        $this->assertTrue(collect(Schema::getForeignKeys('team_players'))->contains(fn ($key) => $key['columns'] === ['original_player_id']));
        $this->merge()->assertOk();
    }
}
