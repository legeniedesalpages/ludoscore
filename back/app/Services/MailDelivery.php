<?php

namespace App\Services;

use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class MailDelivery
{
    public function send(string $recipient, Mailable $mail): void
    {
        $mailer = config('mail.default');
        $settings = config("mail.mailers.{$mailer}", []);
        $context = [
            'delivery_id' => (string) Str::uuid(),
            'mailable' => get_class($mail),
            'recipient_hash' => hash('sha256', strtolower(trim($recipient))),
            'mailer' => $mailer,
            'transport' => $settings['transport'] ?? null,
            'from' => config('mail.from.address'),
        ];

        if (($settings['transport'] ?? null) === 'smtp') {
            $context += [
                'host' => $settings['host'] ?? null,
                'port' => $settings['port'] ?? null,
                'encryption' => $settings['encryption'] ?? null,
                'username_configured' => !empty($settings['username']),
                'password_configured' => !empty($settings['password']),
            ];
        } elseif (($settings['transport'] ?? null) === 'sendmail') {
            $context['sendmail_path'] = $settings['path'] ?? null;
        }

        Log::info('mail.sending', $context);
        $started = microtime(true);

        try {
            $sent = Mail::to($recipient)->send($mail);
            if ($sent === null) {
                throw new RuntimeException('Envoi annulé : aucun message pris en charge par le transport.');
            }
        } catch (Throwable $exception) {
            $message = $exception->getMessage();
            foreach (array_filter([
                $settings['password'] ?? null,
                $settings['username'] ?? null,
                $recipient,
            ]) as $sensitive) {
                $message = str_replace($sensitive, '[masque]', $message);
            }
            // Ne pas journaliser le Mailable, son contenu, l'URL de confirmation ou la trace avec ses arguments.
            Log::error('mail.failed', $context + [
                'duration_ms' => (int) round((microtime(true) - $started) * 1000),
                'exception_class' => get_class($exception),
                'error_code' => $exception->getCode(),
                'error' => mb_substr($message, 0, 2000),
            ]);

            throw $exception;
        }

        Log::info('mail.accepted', $context + [
            'duration_ms' => (int) round((microtime(true) - $started) * 1000),
            'message_id' => $sent->getMessageId(),
        ]);
    }
}
