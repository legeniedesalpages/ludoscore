<?php

namespace Tests\Feature;

use App\Http\Middleware\VerifyCsrfToken;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationMigrationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        config(['sanctum.stateful' => ['localhost:5000']]);
        $this->withHeader('Origin', 'http://localhost:5000');
        $this->app->instance(VerifyCsrfToken::class, new class($this->app, $this->app['encrypter']) extends VerifyCsrfToken
        {
            protected function runningUnitTests()
            {
                return false;
            }
        });
    }

    public function test_spa_login_preserves_response_and_authenticated_session(): void
    {
        $user = User::create([
            'email' => 'migration-login@example.test',
            'password' => Hash::make('migration-password'),
            'is_admin' => false,
            'confirmation_key' => null,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $this->get('/sanctum/csrf-cookie')->assertNoContent()->assertCookie('XSRF-TOKEN');
        $token = session()->token();

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'migration-password',
        ], ['X-CSRF-TOKEN' => $token]);

        $response->assertOk();
        $this->assertSame($user->id, $response->json());
        $this->assertAuthenticatedAs($user);

        $this->getJson('/api/user/'.$user->id)->assertOk()
            ->assertJsonPath('email', $user->email)
            ->assertJsonPath('newsletterSubscribed', false)
            ->assertJsonMissingPath('password');

        $this->getJson('/api/auth/logout')->assertOk();
        $this->assertGuest('web');
    }

    public function test_spa_login_still_requires_csrf_token(): void
    {
        $this->postJson('/api/auth/login', [
            'email' => 'migration-login@example.test',
            'password' => 'migration-password',
        ])->assertStatus(419);
    }

    public function test_protected_api_still_requires_authentication(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_personal_access_tokens_still_authenticate(): void
    {
        $user = User::create([
            'email' => 'migration-token@example.test',
            'password' => Hash::make('migration-password'),
            'is_admin' => false,
        ]);
        $token = $user->createToken('migration-test')->plainTextToken;

        $this->withHeader('Origin', 'https://external.example.test')
            ->withToken($token)->getJson('/api/user/'.$user->id)
            ->assertOk()->assertJsonPath('email', $user->email);
    }

    public function test_statistics_overview_remains_available_to_authenticated_users(): void
    {
        $user = User::create([
            'email' => 'migration-stats@example.test',
            'password' => Hash::make('migration-password'),
            'is_admin' => false,
        ]);

        $this->actingAs($user, 'web')->getJson('/api/statistics/overview?period=lastweek')
            ->assertOk()->assertJsonPath('status', 'success')
            ->assertJsonStructure([
                'totalMatches', 'totalGames', 'totalPlayers', 'averageDurationMinutes',
                'gameRanking', 'winnerDistribution',
            ]);
    }
}
