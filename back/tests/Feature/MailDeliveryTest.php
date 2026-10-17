<?php

namespace Tests\Feature;

use App\Mail\ConfirmAccountEmail;
use App\Services\MailDelivery;
use Illuminate\Mail\PendingMail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class MailDeliveryTest extends TestCase
{
    public function test_it_logs_acceptance_without_message_body_or_recipient(): void
    {
        config(['mail.default' => 'array']);
        Log::spy();

        app(MailDelivery::class)->send('test@example.test', new ConfirmAccountEmail('https://example.test/secret-link'));

        Log::shouldHaveReceived('info')->with('mail.sending', Mockery::on(function ($context) {
            return $context['mailer'] === 'array'
                && $context['recipient_hash'] === hash('sha256', 'test@example.test')
                && !str_contains(json_encode($context), 'secret-link')
                && !str_contains(json_encode($context), 'test@example.test');
        }))->once();
        Log::shouldHaveReceived('info')->with('mail.accepted', Mockery::on(fn($context) => !empty($context['message_id'])))->once();
    }

    public function test_it_logs_smtp_failure_without_credentials_and_rethrows(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.username' => 'private-login',
            'mail.mailers.smtp.password' => 'private-password',
        ]);
        Log::spy();
        $pending = Mockery::mock(PendingMail::class);
        Mail::shouldReceive('to')->with('test@example.test')->once()->andReturn($pending);
        $pending->shouldReceive('send')->once()->andThrow(new RuntimeException('SMTP rejected private-login private-password test@example.test'));

        try {
            app(MailDelivery::class)->send('test@example.test', new ConfirmAccountEmail('secret-link'));
            $this->fail('The transport error must be rethrown.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('SMTP rejected', $exception->getMessage());
        }

        Log::shouldHaveReceived('error')->with('mail.failed', Mockery::on(function ($context) {
            $json = json_encode($context);

            return $context['username_configured'] && $context['password_configured']
                && !str_contains($json, 'private-login')
                && !str_contains($json, 'private-password')
                && !str_contains($json, 'test@example.test');
        }))->once();
        Log::shouldNotHaveReceived('info', ['mail.accepted', Mockery::any()]);
    }

    public function test_cancelled_delivery_is_not_logged_as_accepted(): void
    {
        Log::spy();
        $pending = Mockery::mock(PendingMail::class);
        Mail::shouldReceive('to')->once()->andReturn($pending);
        $pending->shouldReceive('send')->once()->andReturnNull();

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Envoi annulé');
        app(MailDelivery::class)->send('test@example.test', new ConfirmAccountEmail('secret-link'));
    }
}
