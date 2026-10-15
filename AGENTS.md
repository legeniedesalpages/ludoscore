# Instructions pour les agents

- L'environnement tourne sous Docker via `docker-compose.yml` : ne jamais lancer `npm`, `ng`, `php`, `composer` ou `artisan` directement sur l'hôte.
- Front (Angular) : conteneur `angular-app`, code monté dans `/usr/src/app`. Exemple : `docker compose exec angular-app npm run build` (ou `docker compose run --rm angular-app ...` si le conteneur ne tourne pas).
- Back (Laravel) : conteneur `laravel-app`, code monté dans `/var/www/html`. Exemple : `docker compose exec laravel-app php artisan ...`.
