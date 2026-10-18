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

Chaque joueur a un createur obligatoire, porte uniquement par l'association
`player_user.is_creator`. L'API conserve `createdByUserId`, calcule depuis ce
lien et non stocke dans `players`. A la creation, le serveur utilise le
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
Le rollback de cette migration historique retire uniquement la donnee de
createur, pas les joueurs, apres annulation des migrations suivantes.

## Associations entre joueurs et utilisateurs

La table `player_user` est la seule source des liens entre joueurs et comptes,
y compris l'identite personnelle (« ce joueur est moi »). Elle permet aussi de
partager un joueur avec plusieurs comptes, avec une paire unique
`(player_id, user_id)` et les proprietes :

- `is_creator` : createur historique, unique et non modifiable par l'API ;
- `is_self` : identite personnelle, au plus un joueur personnel par compte et
  un compte personnel par joueur, geree via le selecteur « Compte associe » ;
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

Le createur, le compte personnel du joueur et les administrateurs gerent les
droits des comptes deja associes dans l'edition du joueur (section
« Utilisateurs associes »). L'ajout manuel et la suppression des liens restent
reserves aux administrateurs. Les trois permissions sont refusees par defaut
pour un ajout manuel ; le ludotag accorde uniquement l'ajout aux parties.
Les administrateurs conservent
tous les acces. Le lien du createur et celui de l'identite personnelle ne peuvent
pas etre retires via l'editeur de partage. Retirer d'abord l'identite personnelle
permet ensuite de retirer son lien s'il ne s'agit pas du createur.

La migration `2026_10_18_140000_create_player_user_table` cree les liens du
createur historique et du compte personnel associe (sans doublon), avec les trois
permissions accordees. Elle ne modifie ni les joueurs, ni leurs identites, ni
les parties. La date de creation du joueur sert de date de reprise, faute de
date historique d'association. Une reprise n'ecrase pas les droits deja presents.
La migration suivante `2026_10_18_170000_normalize_player_user_identity` verifie
que chaque joueur a exactement un createur coherent, et que chaque identite
historique a une association non ambigue. Elle renseigne `is_self` depuis
`users.player_id`, sans changer les droits ni les dates, puis supprime
`players.created_by_user_id` et `users.player_id`. Toute incoherence bloque la
migration avec une erreur explicite au lieu de choisir arbitrairement un compte.
Elle retire aussi la mise a jour automatique implicite de `associated_at` sur
MySQL 5.7, pour conserver cette date lors des modifications de droits ou d'identite.
Les migrations historiques restent necessaires pour les installations neuves
et les bases de production qui n'ont pas encore recu ces evolutions.

Des index uniques sur trois colonnes generees (`creator_player_key`,
`self_player_key`, `self_user_key`) garantissent au plus un createur par joueur
et l'unicite de l'identite personnelle dans les deux sens. Ces colonnes sont
calculees automatiquement, pas des donnees a synchroniser. L'API cree le joueur
et son lien createur dans la meme transaction et interdit de retirer ce lien.
Un changement d'identite personnelle conserve les anciens liens de partage et
leurs permissions ; il ne change jamais le createur. Les champs API `playerId`
du compte et `createdByUserId` du joueur restent disponibles, calcules a la lecture.
Le rollback de cette normalisation reconstruit les anciennes colonnes depuis
les associations courantes, sans supprimer les liens ni les droits.

Sauvegarder la base, suspendre les ecritures et deployer backend/frontend ensemble.
Appliquer toutes les migrations dans l'ordre avant de rouvrir l'application :
`docker compose exec -T laravel-app php artisan migrate --force` en local Docker
(en production, utiliser l'environnement PHP du deploiement habituel).
Le rollback refuse de supprimer la table si des partages supplementaires ou des
permissions modifiees seraient perdus ; exporter et traiter ces donnees avant
tout retour en arriere. Ne pas annuler la migration des createurs tant que
celle des associations est en place.

## Partage de joueurs par ludotag

Chaque joueur a un ludotag permanent de 12 caracteres aleatoires, genere par
un generateur cryptographique et protege par un index unique en base.
Il utilise les chiffres 2 a 9 et les lettres A a Z, sauf I, L et O pour eviter
les confusions. Il est affiche sous la forme `ABCD-EFGH-JK23` ; les tirets ne
font pas partie de l'identifiant. La saisie accepte les minuscules/majuscules,
les tirets et les espaces. Le code n'est pas derive de l'identifiant du joueur.

Dans la fiche d'un joueur, « Afficher le ludotag » puis « Copier le ludotag »
permettent de le transmettre par le moyen de son choix. Tous les comptes deja
associes au joueur, ainsi que les administrateurs, peuvent consulter ce code
et le repartager. Les autres comptes ne peuvent pas le consulter, meme s'ils
connaissent l'identifiant numerique du joueur. Le ludotag n'est pas expose dans
les listes, l'historique des parties ou les reponses habituelles des joueurs.

Dans l'ecran d'ajout d'un joueur, la section « Ajouter un joueur par ludotag »
associe un joueur existant au compte connecte, sans creer de doublon. Le
nouveau lien accorde uniquement `can_add_to_match` : pas d'acces aux informations
personnelles, ni aux parties sans participation personnelle, ni de droit de
modification. Il ne change ni le createur ni l'identite personnelle. Si le
lien existe deja, ses droits et sa date restent inchanges, meme si les droits
avaient ete retires. Les tentatives sont limitees a 10 par minute par compte
et 30 par minute par adresse IP, en plus de la limite API generale.

La possession du ludotag suffit pour creer ce lien, sans approbation du
createur. Il faut donc le communiquer uniquement aux personnes souhaitees ;
le code est reutilisable et aucun renouvellement n'est propose a ce stade.
Il permet aussi a un utilisateur de remplacer sa propre fiche par celle qui
porte ce ludotag, sans validation supplementaire du createur de la fiche conservee.
La section « Utilisateurs associes » de la fiche du joueur est accessible a son
createur, a son compte personnel et aux administrateurs. Elle affiche les comptes
associes, leur date d'association et leurs droits ; « Actualiser la liste »
permet de retrouver les nouveaux destinataires du ludotag. Le createur est
entierement masque dans cette liste, sans modifier son lien ni ses permissions
en base. Les autres liens sont affiches, sans pretendre identifier qui a
transmis le code ou comment le lien
a ete cree. Ces responsables peuvent accorder ou retirer les trois droits
des comptes deja associes, sans changer le createur, l'identite personnelle
ni la date d'association. Recevoir ou retransmettre le ludotag ne donne pas
ce pouvoir. L'ajout manuel et la suppression des liens restent reserves aux
administrateurs. Aucune migration supplementaire n'est necessaire.

La migration `2026_10_18_180000_add_ludotag_to_players` attribue un ludotag a
chaque joueur existant sans modifier les joueurs, les parties, les identites
ou les associations. Une reprise conserve les codes deja attribues. Comme pour
les migrations precedentes, sauvegarder la base et suspendre les ecritures
pendant le deploiement. Le rollback supprime uniquement les ludotags : les
associations creees avec eux sont conservees, mais les codes devront etre
redistribues si la migration est ensuite reappliquee.

## Pseudos personnels

Le pseudo de reference reste dans `players.pseudo`. Un utilisateur associe qui
n'est pas le createur peut choisir son propre pseudo dans
`player_user.personal_pseudo`, sans obtenir aucun droit supplementaire.
Il peut le saisir lors de l'ajout par ludotag ou le modifier ensuite dans
« Votre pseudo pour ce joueur », meme sans droit de modification de la fiche.
Les champs de la fiche de reference sont desactives lorsque l'utilisateur
ne peut pas les enregistrer ; seul le pseudo personnel reste modifiable
si cette permission est accordee. Les champs et actions principales de ces
formulaires occupent la largeur disponible, comme les autres formulaires.
Les actions secondaires (pseudo personnel, partage, fusion et utilisateurs
associes) sont regroupees dans des panneaux Material replies par defaut.
Pour lancer une partie, il faut y inclure son joueur personnel ou un joueur
dont on peut consulter les parties sans y participer (sauf administrateur).
Le seul droit d'ajouter un joueur copie ne suffit pas : la selection explique
ce blocage et desactive le lancement tant que cette condition n'est pas remplie.
Un champ vide remet le pseudo du createur ; un pseudo identique n'est pas
stocke en double. Un nouvel ajout du meme ludotag ne remplace pas un choix existant.

Seul le compte concerne voit son pseudo personnel. Les listes, participants,
historiques et statistiques utilisent ce nom ; les principales vues ajoutent
le pseudo actuel du createur entre parentheses, plus petit et grise, lorsqu'il
est different. L'avatar et les noms d'equipes en base ne sont pas renommes.
Les noms d'equipe personnalises restent distincts du pseudo du joueur.

La migration `2026_10_18_200000_add_personal_pseudo_to_player_user` ajoute
uniquement une colonne nullable : les pseudos et les droits existants sont
conserves, sans reinterpretation des fusions passees. Appliquer les migrations
avant de deployer le nouveau code, apres sauvegarde et pendant l'arret des
ecritures : `docker compose exec -T laravel-app php artisan migrate --force`.
La reprise conserve les pseudos personnels deja saisis ; le rollback est refuse
tant que cette colonne contient des pseudos, pour eviter leur perte.

## Fusion de joueurs

Dans la fiche du joueur a remplacer, « Remplacer ce joueur par un autre »
permet de saisir le ludotag du joueur a conserver. Celui qui donne son tag
conserve donc sa fiche, son ludotag et ses participations existantes ; la fiche
du demandeur passe au statut « remplace » et ses participations sont reattribuees.
Seul le createur du joueur a remplacer peut demander cette operation
(etre administrateur ou simplement associe ne suffit pas).
Un joueur qui represente le compte personnel d'un utilisateur (`is_self`)
ne peut jamais etre remplace, meme par son createur ou un administrateur.
Il peut en revanche etre le joueur conserve lors de la fusion.
La connaissance du ludotag du joueur a conserver vaut autorisation :
aucune validation supplementaire de son createur n'est demandee.
Cela peut modifier des parties enregistrees par d'autres utilisateurs.

Un apercu indique le sens du remplacement, le nombre de parties et de
participations concernees. Une case de confirmation et un second bouton sont
necessaires avant l'execution. Toutes les participations sont concernees :
parties terminees, annulees et en cours. Si les deux joueurs figurent dans une
meme partie, meme dans des equipes differentes, la fusion entiere est bloquee.
Les identifiants des parties en conflit sont affiches, sans exposer leur contenu
prive. Les conflits sont verifies de nouveau lors de la confirmation.

La fusion est transactionnelle. Aucun joueur, aucune equipe et aucune
participation n'est supprime. Les scores, positions et dates des participations
restent inchanges. `team_players.player_id` prend l'identifiant du joueur
conserve ; `original_player_id` memorise le premier joueur remplace et n'est
jamais ecrase lors d'une fusion suivante. Le journal `player_merges` memorise
les deux joueurs, le demandeur, la date et les associations avant l'operation.
`player_merge_participations` conserve chaque etape de remplacement, avec les
identifiants de participation, d'equipe et de partie. Ce journal reste present
meme si une partie est ensuite supprimee.

Le joueur remplace conserve sa fiche, son ludotag et ses associations. Son
statut API `replaced` est derive de `replaced_by_player_id` ; `replaced_at`
date le remplacement. Il ne peut plus etre modifie, associe par ludotag ou
selectionne pour une nouvelle partie. Les administrateurs le voient dans
leur liste avec son statut ; les comptes deja associes peuvent encore consulter
sa fiche en lecture seule. Les listes et statistiques actives l'excluent.
Son ancien ludotag n'est pas redirige automatiquement : demander celui de la
fiche active. Les fusions successives sont possibles entre joueurs actifs,
sans cycle ni reutilisation d'un joueur deja remplace.

Les utilisateurs du joueur remplace sont aussi associes au joueur conserve.
Pour un nouveau lien, les trois permissions de partage sont toutes refusees,
y compris l'ajout aux parties : aucun droit de l'ancienne fiche n'est transfere,
ni `is_creator` ni `is_self`. Le createur, le compte personnel du joueur conserve
ou un administrateur peut ensuite accorder les droits depuis sa fiche.
Si le lien existe deja, aucun droit ni aucune date
n'est modifie. Les liens historiques restent intacts. En particulier, une
identite personnelle portee par la fiche remplacee n'est pas transferee :
l'administrateur peut la reattribuer separement a une fiche active si necessaire.
Le joueur conserve garde ses informations personnelles et son createur.
Si les pseudos different, le nom utilise sur l'ancienne fiche devient le
pseudo personnel de chaque utilisateur transfere (son ancien pseudo personnel,
s'il en avait un, sinon le pseudo de l'ancienne fiche). Un pseudo personnel
deja choisi sur la fiche conservee reste prioritaire. Le createur de cette
fiche conserve toujours son propre pseudo. Cette reprise des noms ne transfere
aucun droit.

La migration `2026_10_18_190000_add_player_merges` ajoute les champs et journaux
sans lancer de fusion ni modifier les participations existantes. Appliquer avec
les autres migrations, apres sauvegarde et pendant l'arret des ecritures.
Son rollback est refuse si une fusion existe, pour ne pas detruire la trace
des changements. Il n'y a pas d'annulation automatique de fusion dans l'interface.

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
conservee pour ne pas modifier l'historique des migrations. La migration
`2026_10_18_160000_drop_websockets_statistics_entries_table` supprime la table
inutilisee `websockets_statistics_entries` et ses anciennes statistiques techniques.
Elle est appliquee au deploiement habituel ; sauvegarder la base au prealable.
Le rollback recree uniquement la structure vide, pas les statistiques supprimees.

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