# ludoscore
Enregistreur de score

## Temps reel

L'application n'utilise plus de WebSockets ni de service Pusher.
Les variables et secrets `PUSHER_*` ne sont plus necessaires, y compris dans
GitHub Actions. La diffusion Laravel est desactivee, meme si un ancien
environnement definit encore `BROADCAST_DRIVER=pusher`.

La migration historique `create_websockets_statistics_entries_table` est
conservee pour ne pas modifier l'historique des migrations. La table existante
n'est plus utilisee ; ce nettoyage ne supprime aucune donnee.

## Abonnement a la newsletter

L'indicateur `users.newsletter_subscribed` vaut `false` par defaut pour les
comptes existants et futurs. Aucun utilisateur n'est abonne automatiquement.
Appliquer la migration avec
`docker compose exec -u devuser laravel-app php artisan migrate` en local.

La commande `newsletter:send` n'envoie qu'aux comptes confirmes, abonnes
(`newsletter_subscribed = 1`) et disposant d'une adresse e-mail non vide.
L'option `--to` restreint ces destinataires sans contourner le consentement.
Sans destinataire eligible, aucun appel IA n'est effectue.
L'option `--dry` et l'apercu administrateur n'envoient aucun e-mail.
L'interface de gestion de cet abonnement n'est pas encore disponible.

## Envoi hebdomadaire sur OVH (PHP 8.1)

Le fichier `back/newsletter-cron.php` est inclus dans le deploiement du backend.
Avec les chemins du deploiement actuel, il est installe dans
`/home/lgdafrg/ludoscore/newsletter-cron.php`, hors du repertoire web `www`.
Il appelle directement `newsletter:send` et refuse toute execution HTTP.

Dans le Manager OVH, ajouter une tache planifiee :

- Commande a executer (relative a la racine FTP) : `ludoscore/newsletter-cron.php`
  (si le formulaire affiche deja `./`, ne pas le saisir une seconde fois).
- Langage : PHP 8.1.
- Activation : cochee.
- Logs par e-mail : activer au moins pour les premiers envois.
- Description : Newsletter hebdomadaire LudoScore.
- Frequence : une fois par semaine, par exemple lundi a 08 h.
  Verifier le fuseau horaire et les limites de duree des taches dans le Manager OVH.

Ce script envoie des que la tache OVH le lance : il ne passe pas par
`schedule:run`. Ne pas activer en parallele un autre cron Laravel envoyant la
newsletter, sous peine de doublons. Une nouvelle execution manuelle peut
egalement renvoyer la newsletter.

Avant d'activer la tache, verifier sur le serveur :

- migrations appliquees, notamment `users.newsletter_subscribed` ;
- au moins un compte confirme, avec e-mail et `newsletter_subscribed = 1` ;
- `GEMINI_API_KEY` configuree et quota Gemini disponible ;
- `MAIL_MAILER=php_mail`, expediteur autorise et fonction PHP `mail()` disponible ;
- `storage` et `bootstrap/cache` accessibles en ecriture par le processus cron.

Le cron affiche le debut, le resultat et le code de sortie (0 = succes).
Sans abonne eligible, il n'envoie rien et ne contacte pas Gemini.
Les details d'envoi sont dans `storage/logs/laravel.log` selon la configuration
de logs de production. Une remise acceptee par `mail()` ne garantit pas la
livraison finale.

Pour verifier le point d'entree en local sans envoi ni appel IA :

```sh
docker compose exec -u devuser laravel-app php newsletter-cron.php --help
```

L'option `--dry` genere un apercu via Gemini sans envoyer d'e-mail.
L'option `--to=adresse` limite l'envoi a un compte abonne et confirme.

# démarrer l'environnement en local
```
docker-compose up -d

dans l'image laravel :
- composer install
- php artisan migrate:fresh

```

Accès à la page d'accueil :
```
http://localhost:5000/
```

trouver les comptes qui n'ont pas été utilisé pour faire des parties
```
SELECT p.id, p.pseudo, COUNT(l.player_id) AS nb_teams
FROM `ludo$players` AS p
LEFT JOIN `ludo$team_players` AS l ON l.player_id = p.id
GROUP BY p.id, p.pseudo
ORDER BY nb_teams desc
```