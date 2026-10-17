<?php

namespace Tests\Feature;

use App\Mail\PhpMailTransport;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

class PhpMailTransportTest extends TestCase
{
    private function email(): Email
    {
        return (new Email())
            ->from('sender@example.test')
            ->to('recipient@example.test')
            ->cc('copy@example.test')
            ->bcc('hidden@example.test')
            ->subject('Confirmation été')
            ->html('<p>Confirmer le compte</p>')
            ->text('Confirmer le compte');
    }

    public function test_it_passes_mime_message_to_php_mail_without_exposing_bcc(): void
    {
        $calls = 0;
        $transport = new PhpMailTransport(function ($to, $subject, $body, $headers) use (&$calls) {
            $calls++;
            $this->assertStringContainsString('recipient@example.test', $to);
            $this->assertStringContainsString('copy@example.test', $to);
            $this->assertStringContainsString('hidden@example.test', $to);
            $this->assertStringContainsString('=?utf-8?', strtolower($subject));
            $this->assertStringNotContainsString('hidden@example.test', $headers);
            $this->assertStringNotContainsString('Subject:', $headers);
            $this->assertStringContainsString('Message-ID:', $headers);
            $this->assertStringContainsString('multipart/alternative', $headers);
            $this->assertStringContainsString('<p>Confirmer le compte</p>', $body);

            return true;
        });

        $this->assertNotNull($transport->send($this->email()));
        $this->assertSame(1, $calls);
    }

    public function test_false_return_is_a_transport_error(): void
    {
        $transport = new PhpMailTransport(static fn() => false);
        $this->expectException(TransportException::class);
        $this->expectExceptionMessage('retourne false');
        $transport->send($this->email());
    }

    public function test_php_warning_is_a_transport_error_and_handler_is_restored(): void
    {
        $previous = static fn() => true;
        set_error_handler($previous);
        try {
            $transport = new PhpMailTransport(function () {
                // fopen emet un E_WARNING, comme mail() en cas d'erreur.
                fopen('/nonexistent-ludoscore-mail-test/file', 'r');

                return true;
            });
            try {
                $transport->send($this->email());
                $this->fail('A warning must fail the delivery.');
            } catch (TransportException $exception) {
                $this->assertStringContainsString('PHP mail()', $exception->getMessage());
            }
            $restored = set_error_handler($previous);
            $this->assertSame($previous, $restored);
            restore_error_handler();
        } finally {
            restore_error_handler();
        }
    }

    public function test_laravel_resolves_the_registered_transport(): void
    {
        $transport = Mail::mailer('php_mail')->getSymfonyTransport();
        $this->assertInstanceOf(PhpMailTransport::class, $transport);
    }
}
