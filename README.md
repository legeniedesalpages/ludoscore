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

## Ludotheques par utilisateur

La table `games` reste le catalogue commun. La table d'association `game_user`
relie un **user**, et non un player, a un jeu ; elle contient `in_library` et
`ownership_date`. Sans association, un jeu est hors de la ludotheque du compte.
Les listes et fiches API exposent toujours `inLibrary` et `ownershipDate`, mais
pour l'utilisateur authentifie uniquement. Retirer un jeu ne supprime ni le
catalogue, ni les parties, ni l'association des autres comptes.
La recherche distingue `registered` (present au catalogue) et `owned`
(dans la ludotheque du compte), pour reutiliser les fiches existantes.

La bibliotheque propose une liste deroulante adaptee aux petits ecrans
avec trois filtres exclusifs : dans la ludotheque
(selectionne par defaut), hors ludotheque deja joue, et hors ludotheque
jamais joue. Le statut « deja joue » repose sur les parties terminees et non
annulees auxquelles le player lie au compte connecte a participe, et non sur
les parties des autres utilisateurs. Sans player lie, aucun jeu n'est considere
comme deja joue. L'API expose ce compteur dans `personalPlayedMatchCount`,
sans modifier le compteur global `playedMatchCount`.
Les lignes affichent la date d'obtention lorsqu'elle est renseignee et le nombre de
parties personnelles pour les jeux de la ludotheque. Hors ludotheque, elles
affichent le nombre de comptes possedant le jeu (`libraryUserCount`, uniquement
les associations avec `in_library = true`), puis le nombre de parties personnelles
si le compte y a deja joue, sinon le nombre global de parties. Chaque partie
terminee non annulee compte une seule fois, meme avec plusieurs participants.
Un compteur nul est affiche sous la forme « Aucune partie jouee ».
Le compteur de parties est sur une ligne dediee ; les informations peuvent
revenir a la ligne et la hauteur des jeux s'adapte aux petits ecrans.

La migration `2026_10_18_000000_move_game_library_to_users` :

- copie tous les jeux existants, y compris hors ludotheque, avec leurs dates
  d'acquisition vers le compte `renaud_balu@hotmail.com` ;
- refuse de migrer une base contenant des jeux si ce compte est absent ;
- supprime les deux anciennes colonnes de `games` seulement apres la copie ;
- n'attribue aucun jeu aux autres comptes, existants ou nouveaux.

Avant le deploiement, sauvegarder la base, verifier la presence de ce compte
et suspendre les ecritures (mode maintenance). Deployer ensemble le backend
et le frontend, puis appliquer les migrations avec `php artisan migrate --force`
dans l'environnement PHP de production, avant de rouvrir le site.
En local : `docker compose exec -u devuser laravel-app php artisan migrate`.
La migration peut reprendre apres une interruption de DDL MySQL.
Le point d'entree de deploiement `/finir_installation` lance les migrations
avec `--force` et ne les marque comme terminees qu'apres leur reussite.
Un echec renvoie HTTP 500 et permet une nouvelle tentative apres correction.
Le rollback restaure la ludotheque historique ; il refuse de supprimer la table
si d'autres comptes y ont ajoute des associations, pour eviter une perte.

Les fiches de jeux restent communes. Les acces aux joueurs, aux parties et aux
statistiques sont maintenant regis par les associations de joueurs ci-dessous.

## Createur des joueurs

Chaque joueur a un `created_by_user_id` obligatoire, cle etrangere vers `users`.
L'API le renvoie dans `createdByUserId`. A la creation, le serveur utilise le
compte authentifie, jamais une valeur fournie par le client. Le createur reste
inchange lors d'une modification ou d'une association a un autre compte.
La suppression d'un compte createur est refusee tant que ses joueurs existent.

La liste de gestion affiche les joueurs associes au compte connecte ; le choix
des participants ne conserve que ceux autorises a etre ajoutes a une partie.
Les administrateurs voient tous les joueurs. Ce filtrage est applique par l'API.
Le cache des joueurs et la partie memorisee localement sont vides a la connexion
et a la deconnexion. Le choix des participants recharge toujours les droits.
Pour un administrateur, les joueurs sans compte associe affichent aussi
l'adresse du compte createur et le pseudo de son joueur associe, s'il existe.
Ces informations de createur ne sont renvoyees par la liste API qu'aux
administrateurs et uniquement pour les joueurs sans compte associe.
En haut de l'edition d'un joueur, le nombre de parties terminees non annulees
accessibles auxquelles il a participe est affiche (une fois par partie).
Sans participation, le message indique qu'il n'a jamais participe ; lorsque
les droits limitent l'historique, il indique plutot qu'aucune participation
n'est visible avec les droits actuels.
Ce resume n'apparait pas lors de la creation d'un joueur.

La migration `2026_10_18_100000_add_created_by_user_to_players` attribue les
joueurs existants au compte qui les reference via `users.player_id`, sinon a
`renaud_balu@hotmail.com`. Elle refuse les associations ambigues (plusieurs
comptes pour le meme joueur) et l'absence du compte de reprise lorsqu'il est
necessaire. Elle conserve les joueurs, leurs associations et leurs dates.
La colonne temporairement nullable est remplie avant de devenir obligatoire ;
une execution interrompue peut reprendre sans remplacer les createurs deja
renseignes.

En production, sauvegarder la base et suspendre les ecritures avant le
deploiement du backend et l'execution des migrations. Le deploiement existant
applique cette migration via `/finir_installation`. En local :
`docker compose exec -u devuser laravel-app php artisan migrate`.
Le rollback retire uniquement la donnee de createur, pas les joueurs.

## Associations entre joueurs et utilisateurs

`users.player_id` conserve l'identite personnelle du compte (« ce joueur est
moi »). La table `player_user` permet en plus de partager un joueur avec plusieurs
comptes, avec une paire unique `(player_id, user_id)` et les proprietes :

- `is_creator` : createur historique, unique et non modifiable par l'API ;
- `can_view_personal_info` : voir le prenom, le nom et le compte/e-mail associe ;
- `can_view_other_matches` : voir les parties de ce joueur sans y avoir joue ;
- `can_add_to_match` : ajouter ce joueur a une nouvelle partie ;
- `associated_at` : date de l'association, conservee lors des changements de droits.

Le pseudo, l'avatar et la couleur preferee restent visibles. Sans droit sur les
informations personnelles, celles-ci sont exclues des reponses API, y compris
des participants de l'historique. Les fiches de joueurs non associes sont
inaccessibles. Un lien de partage n'accorde pas le droit de modifier un joueur :
ce droit reste au createur, au compte personnel et aux administrateurs.
Sans droit personnel, une modification publique ne remplace pas le nom/prenom.

Une partie est accessible si le joueur personnel du compte y participe **ou**
si au moins un participant est associe au compte avec `can_view_other_matches`.
Ce filtre couvre l'historique, les photos, les parties en cours, les equipes,
les precedentes parties/couleurs, les compteurs, les statistiques et les donnees
de l'assistant IA. Les compteurs de jeu auparavant globaux portent desormais sur
les parties accessibles. Les newsletters sont filtrees selon leur destinataire.
Les analyses IA pregenerees, calculees globalement, restent reservees aux
administrateurs ; l'assistant interactif utilise les donnees accessibles.
Une partie sans participation personnelle ni permission de consultation ne
peut pas etre creee par ce compte. L'ajout de chaque participant est aussi
verifie cote serveur, meme si le client contourne le selecteur.

Seuls les administrateurs gerent les associations et leurs droits dans
l'edition du joueur (section « Utilisateurs associes »). Les trois permissions
sont refusees par defaut pour un nouveau partage. Les administrateurs conservent
tous les acces. Le lien du createur et celui de l'identite personnelle ne peuvent
pas etre retires via l'editeur de partage. Retirer d'abord l'identite personnelle
permet ensuite de retirer son lien s'il ne s'agit pas du createur.

La migration `2026_10_18_140000_create_player_user_table` cree les liens du
createur historique et du compte personnel associe (sans doublon), avec les trois
permissions accordees. Elle ne modifie ni les joueurs, ni leurs identites, ni
les parties. La date de creation du joueur sert de date de reprise, faute de
date historique d'association. Une reprise n'ecrase pas les droits deja presents.
`players.created_by_user_id` est conserve comme reference historique immuable et
contrainte d'integrite ; `is_creator` le reflete, sans changer l'origine du joueur.

Sauvegarder la base, suspendre les ecritures et deployer backend/frontend ensemble.
Appliquer toutes les migrations dans l'ordre avant de rouvrir l'application :
`docker compose exec -T laravel-app php artisan migrate --force` en local Docker
(en production, utiliser l'environnement PHP du deploiement habituel).
Le rollback refuse de supprimer la table si des partages supplementaires ou des
permissions modifiees seraient perdus ; exporter et traiter ces donnees avant
tout retour en arriere. Ne pas annuler la migration des createurs tant que
celle des associations est en place.

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
Les suggestions sont generees separement avec la ludotheque de chaque
destinataire. L'apercu utilise celle de l'administrateur connecte, avec un cache
par compte. Pour un apercu CLI avec une ludotheque, utiliser
`--dry --to=adresse` ; sans `--to`, aucune ludotheque n'est incluse.
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