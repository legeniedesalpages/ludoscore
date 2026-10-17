<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AuthController;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Broadcasting\Broadcasters\NullBroadcaster;
use Illuminate\Contracts\Session\Session;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Mockery;
use Tests\TestCase;

class AuthenticationWithoutBroadcastingTest extends TestCase
{
    public function test_confirmed_user_can_log_in_without_broadcasting(): void
    {
        $credentials = ['email' => 'user@example.test', 'password' => 'password'];
        $request = Request::create('/api/auth/login', 'POST', $credentials);
        $session = Mockery::mock(Session::class);
        $session->shouldReceive('regenerate')->once()->andReturn(true);
        $request->setLaravelSession($session);

        Auth::shouldReceive('attempt')->with($credentials)->once()->andReturn(true);
        Auth::shouldReceive('user')->twice()->andReturn((object) [
            'id' => 42,
            'email_verified_at' => now(),
        ]);
        $this->mock(BroadcastManager::class)->shouldNotReceive('queue');

        $response = app(AuthController::class)->loginUser($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(42, $response->getData());
    }

    public function test_broadcasting_is_disabled(): void
    {
        $this->assertSame('null', config('broadcasting.default'));
        $this->assertInstanceOf(NullBroadcaster::class, app(BroadcastManager::class)->connection());
    }
}
