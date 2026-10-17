# ludoscore
Enregistreur de score

## Backend : Laravel 13 et PHP 8.5

Le backend utilise Laravel 13 avec PHP 8.5, en local comme dans le build de
deploiement. Composer 2.2 minimum est requis. La plateforme Composer est fixee
a PHP 8.5.0 pour que les mises a jour restent compatibles avec l'hebergement.
Installer les versions de `back/composer.lock`, sans executer `composer update`
en production.

Pour mettre a jour l'environnement local existant :

```sh
docker compose build laravel-app
docker compose up -d --no-deps laravel-app
docker compose exec -u devuser laravel-app composer install
docker compose exec -u devuser laravel-app php artisan optimize:clear
docker compose exec -u devuser laravel-app php artisan migrate
docker compose exec -u devuser laravel-app php artisan test
```

La structure historique du backend (kernels, providers et routes) est conservee.
Sanctum 4 garde l'authentification SPA par cookies et les jetons personnels.
La serialisation PHP des sessions est conservee pour ne pas invalider les
sessions existantes. Les durees et ecarts des statistiques restent des nombres
entiers malgre le passage a Carbon 3. Doctrine DBAL n'est plus necessaire.
MySQL 5.7 reste compatible ; cette migration ne change pas le serveur de base.

Avant de deployer sur OVH :

- sauvegarder la base et les fichiers persistants ;
- selectionner PHP 8.5 pour le site **avant** de deployer ce backend ;
- selectionner aussi PHP 8.5 pour les taches planifiees (la version CLI/cron
  peut etre differente de celle du site) ;
- verifier les extensions PHP requises avec `composer check-platform-reqs --no-dev`
  si un acces CLI est disponible, et conserver les extensions applicatives
  `pdo_mysql`, `calendar`, `mbstring`, `intl` et `zip` ;
- appliquer les migrations et vider les anciens caches Laravel ;
- verifier une connexion, la consultation des statistiques et le cron avec
  `--help` (sans envoi d'e-mail).

## Statistiques des jeux

Depuis la carte « Stats par jeux », l'ecran `/statistics/games` affiche le
nombre de jeux enregistres (y compris hors ludotheque), le nombre de jeux
joues, le temps cumule et la duree moyenne par partie mesuree.
La liste reprend le format de l'historique : nombre de parties decroissant,
puis date d'enregistrement decroissante (`created_at` et identifiant a egalite).
Les jeux jamais joues restent visibles et les titres identiques ne sont pas fusionnes.

Seules les parties terminees et non annulees sont comptees. Les durees
absentes, nulles ou negatives sont exclues des calculs de temps, pas du
nombre de parties. Chaque fiche `/statistics/games/:id` presente les
vainqueurs (une victoire par membre de l'equipe gagnante), les jours et
heures de debut, le nombre de joueurs distincts, les parties par mois,
les durees et l'intervalle moyen entre deux parties datees.

Le champ IA utilise l'API existante `POST /api/statistics/ask` et ouvre
une modale avec le commentaire et un tableau, des barres, des courbes
ou un camembert. Sur une fiche de jeu, le perimetre est impose a ce jeu.
Les graphiques proposent aussi leurs donnees sous forme de tableau.
L'assistant necessite `GEMINI_API_KEY` et reste limite a six requetes
par minute ; les erreurs sont affichees avec possibilite de reessayer.

## Statistiques des joueurs et dimensions de jeu

La carte « Stats par joueurs » ouvre `/statistics/players` : resume,
question IA et liste au format historique. Le classement suit le nombre
de parties decroissant, puis la date d'ajout decroissante a egalite.
Les joueurs sans partie sont inclus et les pseudos identiques restent
distincts. Le temps global compte chaque partie une seule fois, pas une
fois par participant. Les parties annulees et en cours sont exclues.

Chaque fiche `/statistics/players/:id` affiche victoires, taux de victoire,
jeux joues, durees, rythme de jeu, resultats et jeux favoris.
L'assistant IA est restreint au joueur de la fiche.

Les fiches joueurs **et** jeux proposent les participations, victoires
et taux selon la couleur, la place dans l'ordre de jeu (1 = premier),
les tags de jeux/parties et les tags de joueurs/equipes. Les tags sont
les valeurs selectionnees pendant les parties, pas les choix possibles
configures dans la fiche du jeu. Le libelle inclut la categorie ; les
doublons d'un meme tag ne multiplient pas les participations.
Une equipe n'est comptee qu'une fois par partie, meme avec plusieurs
joueurs. Sur une fiche joueur, seules ses propres equipes sont analysees.
Les valeurs non renseignees sont exclues de ces repartitions.
Les taux excluent les parties sans vainqueur ; un taux sans resultat
connu reste non determine. Moins de trois parties reste une simple tendance.

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

## Envoi hebdomadaire sur OVH (PHP 8.5)

Le fichier `back/newsletter-cron.php` est inclus dans le deploiement du backend.
Avec les chemins du deploiement actuel, il est installe dans
`/home/lgdafrg/ludoscore/newsletter-cron.php`, hors du repertoire web `www`.
Il appelle directement `newsletter:send` et refuse toute execution HTTP.

Dans le Manager OVH, ajouter une tache planifiee :

- Commande a executer (relative a la racine FTP) : `ludoscore/newsletter-cron.php`
  (si le formulaire affiche deja `./`, ne pas le saisir une seconde fois).
- Langage : PHP 8.5.
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
docker compose up -d --build
docker compose exec -u devuser laravel-app composer install
docker compose exec -u devuser laravel-app php artisan migrate
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