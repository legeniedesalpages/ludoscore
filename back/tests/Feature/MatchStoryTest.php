<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use GuzzleHttp\Promise\PromiseInterface;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MatchStoryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'story_test', 'database.connections.story_test' => [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => 'test$',
        ], 'services.gemini.key' => 'test-key']);
        Http::preventStrayRequests();
        Schema::create('games', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->boolean('highest_score_win')->default(true);
            $table->boolean('quantifiable_score')->default(true);
            $table->boolean('is_only_cooperative')->default(false);
            $table->integer('estimated_duration_in_minutes')->nullable();
        });
        Schema::create('matches', function (Blueprint $table): void {
            $table->id();
            $table->integer('game_id');
            $table->integer('winner_team_id')->nullable();
            $table->boolean('running')->default(false);
            $table->boolean('canceled')->default(false);
            $table->dateTime('started_at')->nullable();
            $table->dateTime('finished_at')->nullable();
            $table->text('tags')->nullable();
            $table->timestamps();
        });
        (require database_path('migrations/2026_10_18_210000_add_story_to_matches.php'))->up();
        (require database_path('migrations/2026_10_19_200000_recreate_match_expansions_table.php'))->up();
        Schema::create('teams', function (Blueprint $table): void {
            $table->id();
            $table->integer('match_id');
            $table->string('name');
            $table->string('color')->nullable();
            $table->text('tags')->nullable();
            $table->integer('score')->nullable();
            $table->text('score_details')->nullable();
            $table->integer('position')->default(0);
            $table->timestamps();
        });
        Schema::create('team_players', function (Blueprint $table): void {
            $table->id();
            $table->integer('team_id');
            $table->integer('player_id');
            $table->integer('original_player_id')->nullable();
        });
        Schema::create('players', function (Blueprint $table): void {
            $table->id();
            $table->string('pseudo');
        });
        Schema::create('player_user', function (Blueprint $table): void {
            $table->integer('player_id');
            $table->integer('user_id');
            $table->boolean('can_view_other_matches')->default(false);
            $table->boolean('is_self')->default(false);
        });
        Schema::create('game_user', function (Blueprint $table): void {
            $table->integer('game_id');
            $table->integer('user_id');
            $table->boolean('in_library')->default(false);
            $table->date('ownership_date')->nullable();
        });
        Sanctum::actingAs((new User(['is_admin' => true]))->forceFill(['id' => 1]));
        DB::table('games')->insert(['id' => 1, 'title' => 'Les Royaumes', 'estimated_duration_in_minutes' => 60]);
        DB::table('matches')->insert([
            'id' => 1, 'game_id' => 1, 'winner_team_id' => 1,
            'started_at' => '2026-10-18 20:00:00', 'finished_at' => '2026-10-18 21:30:00',
            'tags' => json_encode([['category' => 'Carte', 'names' => ['Desert']]]),
        ]);
        foreach ([1 => 100, 2 => 75] as $id => $score) {
            DB::table('teams')->insert([
                'id' => $id, 'match_id' => 1, 'name' => 'Pseudo prive '.$id,
                'score' => $score, 'color' => $id === 1 ? 'Rouge' : 'Bleu',
                'tags' => json_encode([['category' => 'Faction', 'names' => ['Marchands']]]),
                'score_details' => json_encode([
                    ['categoryName' => 'Commerce', 'value' => $score + 10, 'inputString' => 'private formula'],
                    ['categoryName' => 'Penalites', 'value' => -10, 'inputString' => '10'],
                ]),
            ]);
        }
    }

    protected function tearDown(): void
    {
        DB::purge('story_test');
        parent::tearDown();
    }

    private function reply(mixed $story = '[[E1]] triomphe devant [[E2]].'): void
    {
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => json_encode(['story' => $story])]]]]],
        ])]);
    }

    private function context(): array
    {
        return json_decode(Http::recorded()[0][0]['contents'][0]['parts'][0]['text'], true, flags: JSON_THROW_ON_ERROR);
    }

    private function historyPayload(): array
    {
        return [
            'started_at' => '2026-10-18 20:00:00', 'finished_at' => '2026-10-18 21:30:00',
            'winner_team_id' => 1, 'running' => false, 'canceled' => false,
            'teams' => DB::table('teams')->get()->map(fn ($team): array => [
                'id' => $team->id, 'score' => $team->score,
                'score_details' => json_decode($team->score_details, true),
            ])->all(),
        ];
    }

    public function test_generates_persists_and_reads_story_without_sending_names_or_formulas(): void
    {
        $this->reply();
        $this->postJson('/api/game-match/1/story')->assertOk()
            ->assertJsonPath('story', 'Pseudo prive 1 triomphe devant Pseudo prive 2.');
        $this->assertDatabaseHas('matches', ['id' => 1, 'story' => 'Pseudo prive 1 triomphe devant Pseudo prive 2.']);
        $this->getJson('/api/game-match/1')->assertOk()
            ->assertJsonPath('story', 'Pseudo prive 1 triomphe devant Pseudo prive 2.');
        $this->getJson('/api/game-match?page=0&size=10')->assertOk()
            ->assertJsonPath('0.story', 'Pseudo prive 1 triomphe devant Pseudo prive 2.');
        $context = $this->context();
        $this->assertSame(90, $context['duration_minutes']);
        $this->assertSame(60, $context['estimated_duration_minutes']);
        $this->assertSame('Desert', $context['tags'][0]['names'][0]);
        $this->assertSame('Marchands', $context['teams'][0]['tags'][0]['names'][0]);
        $comparison = $context['comparisons_with_winner'][0];
        $this->assertSame(25, $comparison['winner_advantage']);
        $this->assertSame('large_gap', $comparison['closeness']);
        $this->assertSame(25, $comparison['categories'][0]['winner_advantage']);
        $this->assertSame(-10, $context['teams'][0]['categories'][1]['value']);
        Http::assertSent(fn (Request $request): bool => ! str_contains($request->body(), 'Pseudo prive')
            && ! str_contains($request->body(), 'private formula'));
        $this->postJson('/api/game-match/1/story')->assertOk();
        Http::assertSentCount(1);
    }

    public function test_requests_inventive_epic_fiction_without_changing_recorded_facts(): void
    {
        $this->reply();
        $this->postJson('/api/game-match/1/story')->assertOk();

        Http::assertSent(function (Request $request): bool {
            $system = $request['systemInstruction']['parts'][0]['text'];
            $this->assertSame(1.0, $request['generationConfig']['temperature']);
            $this->assertSame('application/json', $request['generationConfig']['responseMimeType']);
            $this->assertStringContainsString('drole, epique et volontairement provocatrice', $system);
            $this->assertStringContainsString('Tu peux inventer des dialogues, des peripeties', $system);
            $this->assertStringContainsString('Les faits restent intouchables', $system);
            $this->assertStringContainsString("Ne mentionne jamais l'IA", $system);
            $this->assertStringContainsString('Respecte strictement le vainqueur enregistre', $system);
            $this->assertStringContainsString('Ne vise jamais la personne reelle', $system);
            $this->assertStringNotContainsString("N'invente aucun chiffre, action precise", $system);

            return true;
        });
        $this->assertDatabaseHas('teams', ['id' => 1, 'score' => 100]);
        $this->assertDatabaseHas('matches', ['id' => 1, 'winner_team_id' => 1]);
    }

    public function test_close_score_threshold_is_five_percent_inclusive(): void
    {
        $this->reply();
        DB::table('teams')->where('id', 2)->update(['score' => 95]);
        $this->postJson('/api/game-match/1/story')->assertOk();
        $this->assertSame('close', $this->context()['comparisons_with_winner'][0]['closeness']);
        DB::table('matches')->update(['story' => null]);
        DB::table('teams')->where('id', 2)->update(['score' => 94]);
        $this->postJson('/api/game-match/1/story')->assertOk();
        $context = json_decode(Http::recorded()[1][0]['contents'][0]['parts'][0]['text'], true);
        $this->assertSame('moderate_gap', $context['comparisons_with_winner'][0]['closeness']);
    }

    public function test_lower_score_wins_and_negative_scores_keep_correct_advantages(): void
    {
        $this->reply();
        DB::table('games')->update(['highest_score_win' => false]);
        DB::table('teams')->where('id', 1)->update(['score' => -100]);
        DB::table('teams')->where('id', 2)->update(['score' => -75]);
        $this->postJson('/api/game-match/1/story')->assertOk();
        $comparison = $this->context()['comparisons_with_winner'][0];
        $this->assertSame(25, $comparison['winner_advantage']);
        $this->assertSame(-25, $comparison['categories'][0]['winner_advantage']);
    }

    public function test_manual_winner_and_equal_scores_are_not_overridden(): void
    {
        $this->reply();
        DB::table('matches')->update(['winner_team_id' => 2]);
        $this->postJson('/api/game-match/1/story')->assertOk();
        $this->assertSame('[[E2]]', $this->context()['winner']);
        $this->assertSame('winner_selected_despite_score', $this->context()['comparisons_with_winner'][0]['closeness']);
    }

    public function test_missing_scores_duration_and_categories_remain_unknown(): void
    {
        $this->reply();
        DB::table('teams')->where('id', 2)->update(['score' => null, 'score_details' => null]);
        DB::table('matches')->update(['finished_at' => null]);
        $this->postJson('/api/game-match/1/story')->assertOk();
        $context = $this->context();
        $this->assertNull($context['duration_minutes']);
        $this->assertNull($context['teams'][1]['score']);
        $this->assertSame([], $context['teams'][1]['categories']);
        $this->assertSame('unknown', $context['comparisons_with_winner'][0]['closeness']);
    }

    public function test_no_recorded_winner_is_distinct_from_equal_scores(): void
    {
        $this->reply('Une arrivee serree.');
        DB::table('matches')->update(['winner_team_id' => null]);
        DB::table('teams')->update(['score' => 100]);
        $this->postJson('/api/game-match/1/story')->assertOk();
        $this->assertNull($this->context()['winner']);
        $this->assertSame('no_winner_recorded', $this->context()['outcome']);
        $this->assertSame(0, $this->context()['top_two_score_gap']);
    }

    public function test_cooperative_defeat_is_explicit(): void
    {
        $this->reply('Les equipes perdent ensemble.');
        DB::table('games')->update(['is_only_cooperative' => true]);
        DB::table('matches')->update(['winner_team_id' => null]);
        $this->postJson('/api/game-match/1/story')->assertOk();
        $this->assertSame('collective_defeat', $this->context()['outcome']);
    }

    public function test_invalid_output_and_missing_configuration_allow_retry_without_losing_scores(): void
    {
        Http::fake(['generativelanguage.googleapis.com/*' => Http::sequence()
            ->push(['candidates' => [['content' => ['parts' => [['text' => '{"story":[]}']]]]]])
            ->push(['candidates' => [['content' => ['parts' => [['text' => '{"story":"Un recit enfin disponible."}']]]]]]),
        ]);
        $this->postJson('/api/game-match/1/story')->assertStatus(503);
        $this->assertDatabaseHas('matches', ['id' => 1, 'story' => null, 'winner_team_id' => 1]);
        $this->assertDatabaseHas('teams', ['id' => 1, 'score' => 100]);
        config(['services.gemini.key' => null]);
        $this->postJson('/api/game-match/1/story')->assertStatus(503);
        config(['services.gemini.key' => 'test-key']);
        $this->postJson('/api/game-match/1/story')->assertOk();
    }

    public function test_running_and_canceled_matches_are_rejected(): void
    {
        DB::table('matches')->update(['running' => true]);
        $this->postJson('/api/game-match/1/story')->assertUnprocessable();
        DB::table('matches')->update(['running' => false, 'canceled' => true]);
        $this->postJson('/api/game-match/1/story')->assertUnprocessable();
        Http::assertNothingSent();
    }

    public function test_authentication_and_match_access_are_required(): void
    {
        Sanctum::actingAs((new User(['is_admin' => false]))->forceFill(['id' => 2]));
        $this->postJson('/api/game-match/1/story')->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/game-match/1/story')->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_concurrent_generation_is_rejected(): void
    {
        $lock = Cache::lock('match-story:1', 360);
        $lock->get();
        try {
            $this->postJson('/api/game-match/1/story')->assertConflict();
            Http::assertNothingSent();
        } finally {
            $lock->release();
        }
    }

    public function test_changes_during_generation_do_not_persist_an_obsolete_story(): void
    {
        Http::fake(function (): PromiseInterface {
            DB::table('teams')->where('id', 2)->update(['score' => 99]);

            return Http::response(['candidates' => [['content' => ['parts' => [['text' => '{"story":"Ancien recit."}']]]]]]);
        });
        $this->postJson('/api/game-match/1/story')->assertConflict();
        $this->assertDatabaseHas('matches', ['id' => 1, 'story' => null]);
    }

    public function test_history_corrections_invalidate_story_but_unchanged_data_preserves_it(): void
    {
        DB::table('matches')->update(['story' => 'Recit existant.']);
        $payload = $this->historyPayload();
        $this->putJson('/api/game-match/1/history', $payload)->assertOk();
        $this->assertDatabaseHas('matches', ['id' => 1, 'story' => 'Recit existant.']);
        $payload['teams'][0]['score'] = 101;
        $this->putJson('/api/game-match/1/history', $payload)->assertOk();
        $this->assertDatabaseHas('matches', ['id' => 1, 'story' => null]);
    }

    public function test_dates_and_status_corrections_also_invalidate_story(): void
    {
        DB::table('matches')->update(['story' => 'Recit existant.']);
        $payload = $this->historyPayload();
        $payload['finished_at'] = null;
        $this->putJson('/api/game-match/1/history', $payload)->assertOk();
        $this->assertDatabaseHas('matches', ['id' => 1, 'story' => null]);
    }

    public function test_result_validation_and_team_updates_invalidate_story(): void
    {
        DB::table('matches')->update(['story' => 'Ancien recit.', 'running' => true]);
        $this->putJson('/api/game-match/1', ['running' => false, 'canceled' => false, 'winner_team_id' => 1])->assertOk();
        $this->assertDatabaseHas('matches', ['id' => 1, 'running' => false, 'story' => null]);
        DB::table('matches')->update(['story' => 'Recit existant.']);
        $this->putJson('/api/team/1', [
            'name' => 'Equipe', 'color' => 'Rouge', 'tags' => '[]', 'score' => 110, 'score_details' => '[]',
        ])->assertOk();
        $this->assertDatabaseHas('matches', ['id' => 1, 'story' => null]);
    }

    public function test_migration_rolls_back_without_deleting_matches(): void
    {
        (require database_path('migrations/2026_10_18_210000_add_story_to_matches.php'))->down();
        $this->assertFalse(Schema::hasColumn('matches', 'story'));
        $this->assertDatabaseCount('matches', 1);
    }
}
