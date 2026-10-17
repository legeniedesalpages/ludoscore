<?php

namespace Tests\Feature;

use App\Mail\WeeklyNewsletter;
use App\Models\User;
use App\Services\Analytics\NewsletterBuilder;
use App\Services\MailDelivery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class NewsletterSubscriptionTest extends TestCase
{
    use DatabaseTransactions;

    private function user(string $email, ?bool $subscribed = null, ?string $confirmation = null): User
    {
        $attributes = [
            'email' => $email,
            'password' => 'not-used-for-login',
            'is_admin' => false,
            'confirmation_key' => $confirmation,
        ];
        if ($subscribed !== null) {
            $attributes['newsletter_subscribed'] = $subscribed;
        }

        return User::create($attributes)->refresh();
    }

    public function test_new_users_are_not_subscribed_by_default(): void
    {
        $this->assertFalse($this->user('default@example.test')->newsletter_subscribed);
    }

    public function test_only_confirmed_subscribers_with_non_empty_email_receive_newsletter(): void
    {
        DB::table('users')->update(['newsletter_subscribed' => false]);
        $this->user('yes@example.test', true);
        $this->user('no@example.test', false);
        $this->user('pending@example.test', true, 'pending');
        $this->user('   ', true);

        $this->mock(NewsletterBuilder::class)->shouldReceive('build')->once()->andReturn(['subject' => 'Test']);
        $this->mock(MailDelivery::class)->shouldReceive('send')
            ->with('yes@example.test', Mockery::type(WeeklyNewsletter::class))->once();

        $this->artisan('newsletter:send')->assertExitCode(0);
    }

    public function test_to_option_does_not_bypass_subscription_and_skips_ai(): void
    {
        $this->user('unsubscribed@example.test', false);
        $this->mock(NewsletterBuilder::class)->shouldNotReceive('build');
        $this->mock(MailDelivery::class)->shouldNotReceive('send');

        $this->artisan('newsletter:send', ['--to' => 'unsubscribed@example.test'])
            ->expectsOutput('Aucun destinataire éligible : aucun e-mail envoyé.')
            ->assertExitCode(0);
    }

    public function test_dry_run_only_builds_content(): void
    {
        $this->mock(NewsletterBuilder::class)->shouldReceive('build')->once()->andReturn(['subject' => 'Test']);
        $this->mock(MailDelivery::class)->shouldNotReceive('send');

        $this->artisan('newsletter:send', ['--dry' => true])->assertExitCode(0);
    }
}
