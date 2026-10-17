<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Execution reservee a la ligne de commande.');
}

define('LARAVEL_START', microtime(true));

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

// La commande est fixe ; seuls ses arguments optionnels (--dry, --to...) sont transmis.
$input = new Symfony\Component\Console\Input\ArgvInput(
    array_merge([$argv[0], 'newsletter:send'], array_slice($argv, 1))
);
$output = new Symfony\Component\Console\Output\ConsoleOutput();

$output->writeln('Newsletter : debut du traitement '.date(DATE_ATOM));
$status = $kernel->handle($input, $output);
$kernel->terminate($input, $status);
$output->writeln('Newsletter : fin du traitement, code '.$status);

exit($status);
