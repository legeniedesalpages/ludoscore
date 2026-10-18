<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use App\Services\Ludotag;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LudotagTest extends TestCase
{
    protected User $creator;

    protected User $recipient;

    protected function connectionConfig(): array
    {
        return [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => 'test$',
            'foreign_key_constraints' => true,
        ];
    }

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'ludotag_test', 'database.connections.ludotag_test' => $this->connectionConfig()]);
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
            $table->unsignedBigInteger('replaced_by_player_id')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->timestamps();
        });
        $this->creator = User::create(['email' => 'creator@example.test', 'password' => 'unused']);
        $this->recipient = User::create(['email' => 'recipient@example.test', 'password' => 'unused']);
        DB::table('players')->insert([
            ['id' => 1, 'pseudo' => 'Guest', 'first_name' => 'Private', 'created_by_user_id' => $this->creator->id, 'created_at' => '2020-01-01 12:00:00'],
            ['id' => 2, 'pseudo' => 'Other', 'first_name' => null, 'created_by_user_id' => $this->creator->id, 'created_at' => '2021-01-01 12:00:00'],
        ]);
        (require database_path('migrations/2026_10_18_140000_create_player_user_table.php'))->up();
        (require database_path('migrations/2026_10_18_170000_normalize_player_user_identity.php'))->up();
        (require database_path('migrations/2026_10_18_200000_add_personal_pseudo_to_player_user.php'))->up();
    }

    protected function tearDown(): void
    {
        DB::purge('ludotag_test');
        parent::tearDown();
    }

    private function migration(): Migration
    {
        return require database_path('migrations/2026_10_18_180000_add_ludotag_to_players.php');
    }

    private function tag(): string
    {
        return DB::table('players')->where('id', 1)->value('ludotag');
    }

    public function test_migration_preserves_all_existing_data_generates_distinct_tags_and_can_resume(): void
    {
        $players = DB::table('players')->orderBy('id')->get();
        $links = DB::table('player_user')->orderBy('id')->get()->toJson();
        $this->migration()->up();
        foreach ($players as $player) {
            $this->assertDatabaseHas('players', (array) $player);
        }
        $tags = DB::table('players')->orderBy('id')->pluck('ludotag')->all();
        $this->assertCount(2, array_unique($tags));
        foreach ($tags as $tag) {
            $this->assertMatchesRegularExpression('/^['.Ludotag::ALPHABET.']{12}$/D', $tag);
        }
        $this->migration()->up();
        $this->assertSame($tags, DB::table('players')->orderBy('id')->pluck('ludotag')->all());
        $this->assertSame($links, DB::table('player_user')->orderBy('id')->get()->toJson());
        $this->migration()->down();
        $this->assertFalse(Schema::hasColumn('players', 'ludotag'));
        $this->assertDatabaseCount('players', 2);
        $this->assertSame($links, DB::table('player_user')->orderBy('id')->get()->toJson());
    }

    public function test_migration_resumes_partial_backfill_without_replacing_issued_tags(): void
    {
        Schema::table('players', fn (Blueprint $table) => $table->string('ludotag', 12)->nullable());
        DB::table('players')->where('id', 1)->update(['ludotag' => 'ABCD2345EFGH']);
        $this->migration()->up();
        $this->assertSame('ABCD2345EFGH', $this->tag());
        $this->assertNotNull(DB::table('players')->where('id', 2)->value('ludotag'));
    }

    public function test_database_rejects_duplicate_tags(): void
    {
        $this->migration()->up();
        $this->expectException(QueryException::class);
        DB::table('players')->where('id', 2)->update(['ludotag' => $this->tag()]);
    }

    public function test_only_associated_accounts_and_admins_can_consult_a_tag_and_it_is_not_publicly_serialized(): void
    {
        $this->migration()->up();
        $this->getJson('/api/player/1/ludotag')->assertUnauthorized();
        $this->actingAs($this->recipient)->getJson('/api/player/1/ludotag')->assertNotFound();
        $response = $this->actingAs($this->creator)->getJson('/api/player/1/ludotag')->assertOk()
            ->assertJsonPath('ludotag', Ludotag::format($this->tag()));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->getJson('/api/player')->assertOk()->assertJsonMissingPath('0.ludotag');
        $this->assertArrayNotHasKey('ludotag', Player::findOrFail(1)->toArray());
        $this->recipient->forceFill(['is_admin' => true])->save();
        $this->actingAs($this->recipient)->getJson('/api/player/1/ludotag')->assertOk();
    }

    public function test_case_insensitive_grouped_input_creates_only_a_sharing_link_and_allows_resharing(): void
    {
        $this->migration()->up();
        $before = DB::table('players')->orderBy('id')->get()->toJson();
        $this->actingAs($this->recipient)->postJson('/api/player/associate-ludotag', [
            'ludotag' => ' '.strtolower(Ludotag::format($this->tag())).' ',
            'isCreator' => true, 'isSelf' => true, 'canViewPersonalInfo' => true, 'canViewOtherMatches' => true,
        ])->assertOk()->assertExactJson(['id' => 1, 'pseudo' => 'Guest']);
        $this->assertDatabaseHas('player_user', [
            'player_id' => 1, 'user_id' => $this->recipient->id,
            'is_creator' => false, 'is_self' => false, 'can_add_to_match' => true,
            'can_view_personal_info' => false, 'can_view_other_matches' => false,
        ]);
        $this->assertSame($before, DB::table('players')->orderBy('id')->get()->toJson());
        $this->assertNull($this->recipient->player_id);
        $this->getJson('/api/player?purpose=match')->assertOk()->assertJsonCount(1)
            ->assertJsonMissingPath('0.firstName')->assertJsonMissingPath('0.user')
            ->assertJsonPath('0.permissions.can_edit', false);
        $this->getJson('/api/player/1/ludotag')->assertOk()->assertJsonPath('ludotag', Ludotag::format($this->tag()));
        $this->assertDatabaseCount('player_user', 3);
    }

    public function test_repeated_association_keeps_existing_rights_creator_identity_and_dates_unchanged(): void
    {
        $this->migration()->up();
        DB::table('player_user')->insert([
            'player_id' => 1, 'user_id' => $this->recipient->id, 'is_self' => true,
            'can_view_personal_info' => true, 'can_add_to_match' => false,
            'associated_at' => '2020-01-01 12:00:00',
        ]);
        $before = DB::table('player_user')->orderBy('id')->get()->toJson();
        $this->actingAs($this->recipient)->postJson('/api/player/associate-ludotag', ['ludotag' => $this->tag()])->assertOk();
        $this->postJson('/api/player/associate-ludotag', ['ludotag' => $this->tag()])->assertOk();
        $this->actingAs($this->creator)->postJson('/api/player/associate-ludotag', ['ludotag' => $this->tag()])->assertOk();
        $this->assertSame($before, DB::table('player_user')->orderBy('id')->get()->toJson());
    }

    public function test_invalid_unknown_and_missing_tags_do_not_create_links(): void
    {
        $this->migration()->up();
        $this->postJson('/api/player/associate-ludotag', ['ludotag' => $this->tag()])->assertUnauthorized();
        $this->actingAs($this->recipient);
        foreach (['', 'ABC', 'ABCD-0000-EFGH', 'éBCD2345EFGH', 'ABCDEFGHJKMNP', 'ZZZZZZZZZZZZ'] as $tag) {
            $this->postJson('/api/player/associate-ludotag', ['ludotag' => $tag])->assertUnprocessable()->assertJsonValidationErrors('ludotag');
        }
        $this->assertDatabaseCount('player_user', 2);
    }

    public function test_attempts_are_rate_limited_even_when_tags_do_not_exist(): void
    {
        $this->migration()->up();
        $this->actingAs($this->recipient);
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson('/api/player/associate-ludotag', ['ludotag' => 'invalid'])->assertUnprocessable();
        }
        $this->postJson('/api/player/associate-ludotag', ['ludotag' => $this->tag()])->assertTooManyRequests();
        $this->assertDatabaseCount('player_user', 2);
    }

    public function test_new_players_receive_a_server_generated_immutable_tag(): void
    {
        $this->migration()->up();
        $response = $this->actingAs($this->creator)->postJson('/api/player', [
            'pseudo' => 'New', 'ludotag' => 'CLIENT234567',
        ])->assertCreated()->assertJsonMissingPath('ludotag');
        $id = $response->json('id');
        $tag = DB::table('players')->where('id', $id)->value('ludotag');
        $this->assertMatchesRegularExpression('/^['.Ludotag::ALPHABET.']{12}$/D', $tag);
        $this->assertNotSame('CLIENT234567', $tag);
        $this->putJson('/api/player/'.$id, ['pseudo' => 'Updated', 'ludotag' => 'REPLACEMENT2'])->assertOk();
        $this->assertSame($tag, DB::table('players')->where('id', $id)->value('ludotag'));
        $this->assertDatabaseHas('player_user', ['player_id' => $id, 'user_id' => $this->creator->id, 'is_creator' => true]);
    }
}
