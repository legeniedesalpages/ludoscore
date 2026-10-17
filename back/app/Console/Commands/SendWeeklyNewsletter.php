<?php

namespace App\Console\Commands;

use App\Mail\WeeklyNewsletter;
use App\Services\Analytics\NewsletterBuilder;
use App\Services\MailDelivery;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendWeeklyNewsletter extends Command
{
    protected $signature = 'newsletter:send {--to= : limite l’envoi à cette adresse abonnée et confirmée} {--dry : affiche le contenu sans envoyer}';

    protected $description = 'Génère par IA et envoie la newsletter hebdomadaire';

    public function handle(NewsletterBuilder $builder): int
    {
        if ($this->option('dry')) {
            $newsletter = $builder->build();
            $this->line(json_encode($newsletter, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            return self::SUCCESS;
        }

        $query = DB::table('users')
            ->where('newsletter_subscribed', true)
            ->whereNotNull('email')
            ->whereRaw("TRIM(email) <> ''")
            ->whereNull('confirmation_key');

        if ($this->option('to')) {
            $query->where('email', $this->option('to'));
        }

        $recipients = $query->distinct()->pluck('email')->all();
        if (!$recipients) {
            $this->info('Aucun destinataire éligible : aucun e-mail envoyé.');

            return self::SUCCESS;
        }

        $newsletter = $builder->build();

        foreach ($recipients as $email) {
            app(MailDelivery::class)->send($email, new WeeklyNewsletter($newsletter));
        }

        $this->info(count($recipients) . " e-mail(s) envoyé(s).");

        return self::SUCCESS;
    }
}
