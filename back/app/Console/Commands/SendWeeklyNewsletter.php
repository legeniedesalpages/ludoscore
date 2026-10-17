<?php

namespace App\Console\Commands;

use App\Mail\WeeklyNewsletter;
use App\Services\Analytics\NewsletterBuilder;
use App\Services\MailDelivery;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendWeeklyNewsletter extends Command
{
    protected $signature = 'newsletter:send {--to= : envoie uniquement à cette adresse (test)} {--dry : affiche le contenu sans envoyer}';

    protected $description = 'Génère par IA et envoie la newsletter hebdomadaire';

    public function handle(NewsletterBuilder $builder): int
    {
        $newsletter = $builder->build();

        if ($this->option('dry')) {
            $this->line(json_encode($newsletter, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            return self::SUCCESS;
        }

        $recipients = $this->option('to')
            ? [$this->option('to')]
            : DB::table('users')->whereNotNull('email')->where('email', '!=', '')->whereNull('confirmation_key')->pluck('email')->all();

        foreach ($recipients as $email) {
            app(MailDelivery::class)->send($email, new WeeklyNewsletter($newsletter));
        }

        $this->info(count($recipients) . " e-mail(s) envoyé(s).");

        return self::SUCCESS;
    }
}
