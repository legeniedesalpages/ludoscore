# ludoscore
Enregistreur de score

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

## Naissance des joueurs et statistiques d’âge

La fiche joueur propose une naissance facultative : date complète, année seule
ou « Non renseignée » (qui permet aussi d’effacer une valeur existante).
Les valeurs futures, dates impossibles et saisies simultanées d’une date et
d’une année sont refusées. Une mise à jour API qui omet ces deux champs conserve
la valeur existante ; un `null` explicite la supprime.

Les informations de naissance suivent le droit d’accès aux informations
personnelles. Les statistiques détaillées des jeux et des joueurs affichent
la répartition par tranches de dix ans, calculée à la date de chaque partie.
Une année seule donne un âge approximatif ; les données absentes ou
inaccessibles sont exclues et leur nombre est indiqué.

Une comparaison locale « Plus jeunes / plus âgés » porte sur les âges extrêmes
de chaque partie, avec au moins **10 ans d’écart garanti**. Avec une année seule,
l’incertitude d’un an est prise en compte. Les âges intermédiaires, parties aux
âges incomplets, groupes extrêmes dans une même équipe et jeux exclusivement
coopératifs sont exclus de cette comparaison. Les effectifs et taux de victoire
sont affichés ; en dessous de trois parties par groupe, il ne s’agit que d’une
tendance, sans conclusion de causalité. Les naissances ne sont pas transmises
au service d’IA.

Appliquer la migration avant utilisation :

```sh
docker compose exec laravel-app php artisan migrate
```

## Joueurs remplacés

Les joueurs remplacés sont masqués par défaut dans les listes, y compris pour
l’administrateur. Dans la gestion des joueurs, seul l’administrateur peut
décocher **Masquer les joueurs remplacés** pour consulter leurs fiches archivées.
Cette option ne modifie ni les listes de sélection pour une partie ni les
répertoires statistiques. L’API n’accepte `include_replaced=true` que pour un
administrateur et hors sélection de participants (`purpose=match`).

Les joueurs associés depuis un autre compte affichent « Copié depuis le compte
de [pseudo du créateur] ». Seul le pseudo est communiqué aux autres utilisateurs,
jamais l’email du créateur. Si celui-ci n’a pas d’identité joueur, une mention
générique de copie est affichée.

Le joueur personnel du compte connecté possède un encart dédié au-dessus de
la liste, avec accès à sa fiche et la mention « C’est vous, vous êtes ici depuis
le … ». Il n’est pas répété parmi les autres joueurs. Leur ordre relatif est
conservé, y compris lorsque l’administrateur change le filtre des joueurs remplacés.
