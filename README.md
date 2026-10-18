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

## Récit de fin de partie

Après validation des scores, l'application revient à l'accueil et ouvre une popup
qui génère puis affiche un court récit en français avec Gemini. Le bouton **OK**
ferme la popup et laisse l'utilisateur sur l'accueil. En cas d'échec de l'IA,
la popup propose de réessayer ou de fermer ; les scores restent enregistrés.
Le récit s'appuie sur les tags de la partie et des équipes,
la durée, le vainqueur enregistré, les écarts de score et les catégories de points.
Les équipes sont désignées par des codes lors de l'appel à l'IA ; leurs noms sont
réinsérés localement avant sauvegarde. Le texte est une évocation imaginée, pas
un relevé des actions réellement jouées.
Le ton demandé est littéraire, drôle, épique et volontairement provocateur :
Gemini peut inventer des scènes, dialogues et péripéties, avec des piques complices
sur les stratégies et les personnages fictifs, jamais des attaques personnelles.
Les résultats restent fidèles aux données enregistrées. La température de génération
des récits est fixée à `1.0`, sans modifier celle de l'assistant statistiques.
Ce style s'applique aux nouveaux récits ; les textes déjà sauvegardés sont conservés.

Le récit est conservé dans la partie et affiché dans son historique. Une ancienne
partie sans récit propose **Générer le récit de la partie**. En cas d'indisponibilité
de l'IA, les scores restent enregistrés et la génération peut être relancée.
La correction des résultats ou des dates invalide le récit pour permettre sa
régénération avec les nouvelles données.

Configuration : `GEMINI_API_KEY` et, facultativement, `GEMINI_MODEL` dans
l'environnement du conteneur Laravel, comme pour l'assistant statistiques.
Appliquer la migration avant utilisation :

```sh
docker compose exec laravel-app php artisan migrate
```