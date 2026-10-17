<?php

namespace App\Mail;

use Closure;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Message;

class PhpMailTransport extends AbstractTransport
{
    private Closure $sendMail;

    public function __construct(?Closure $sendMail = null)
    {
        parent::__construct();
        $this->sendMail = $sendMail ?? static fn(string $to, string $subject, string $body, string $headers): bool =>
            \mail($to, $subject, $body, $headers);
    }

    public function __toString(): string
    {
        return 'php_mail';
    }

    protected function doSend(SentMessage $message): void
    {
        $original = $message->getOriginalMessage();
        if (!$original instanceof Message) {
            throw new TransportException('Le transport PHP mail() requiert un message MIME.');
        }

        $headers = $original->getPreparedHeaders();
        $subject = $headers->get('Subject')?->getBodyAsString() ?? '';
        $headers->remove('Subject');
        // Les destinataires viennent de l'enveloppe, y compris Cc/Bcc, sans divulguer les Bcc.
        $headers->remove('To');
        $headers->remove('Bcc');
        $headers->remove('Message-ID');
        $headers->addIdHeader('Message-ID', $message->getMessageId());
        $body = $original->getBody();
        if ($body !== null) {
            foreach ($body->getPreparedHeaders()->all() as $header) {
                $headers->remove($header->getName());
                $headers->add($header);
            }
        }
        $to = implode(', ', array_map(
            static fn($address) => $address->getEncodedAddress(),
            $message->getEnvelope()->getRecipients()
        ));

        // Aucun cinquieme argument : OVH gere lui-meme les options du programme mail.
        // PHP peut emettre un warning ou retourner false : les deux doivent devenir un echec explicite.
        set_error_handler(static function (int $severity, string $error) {
            throw new TransportException('PHP mail() : ' . $error);
        }, E_WARNING);
        try {
            $accepted = ($this->sendMail)($to, $subject, $body?->bodyToString() ?? '', $headers->toString());
        } finally {
            restore_error_handler();
        }

        if (!$accepted) {
            throw new TransportException('PHP mail() a retourne false : le serveur n’a pas accepte le message.');
        }
    }
}
