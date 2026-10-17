<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WeeklyNewsletter extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public array $newsletter)
    {
    }

    public function envelope()
    {
        return new Envelope(subject: $this->newsletter['subject']);
    }

    public function content()
    {
        return new Content(html: 'email.weekly_newsletter');
    }
}
