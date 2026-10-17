# ludoscore
Enregistreur de score

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

## Diagnostic des e-mails (confirmation de compte et newsletter)

Les envois produisent les logs suivants, avec un `delivery_id` commun :

- `mail.sending` : tentative et configuration effective (mailer, transport,
  adresse d'expedition, hote/port/chiffrement SMTP ou commande sendmail).
- `mail.accepted` : le transport a pris en charge le message, avec son identifiant
  et la duree de l'envoi. Cela ne garantit pas la livraison en boite de reception.
  Les transports de test `array` et `log` n'expedient pas de mail.
- `mail.failed` : classe d'exception, code et message d'erreur, sans mot de passe
  SMTP, identifiant SMTP ni adresse du destinataire. L'erreur n'est pas ignoree :
  la creation de compte est annulee et retourne une erreur HTTP.

Le destinataire est represente par une empreinte SHA-256 pour la correlation,
pas par son adresse. Le contenu du mail et le lien de confirmation ne sont pas
journalises par ce diagnostic.

### Sur OVH

Avec la configuration de deploiement actuelle (`LOG_CHANNEL=stack`), consulter
`storage/logs/laravel.log` dans le repertoire Laravel du serveur, par FTP ou SSH.
Le repertoire `storage` doit etre accessible en ecriture par PHP.

`deployment/.env` selectionne `MAIL_MAILER=php_mail`, le transport personnalise
qui appelle directement la fonction PHP `mail()` recommandee par OVH.
Les modeles HTML/MIME Laravel et les logs restent utilises. Un retour `false`
ou un avertissement PHP provoque une erreur explicite (`mail.failed`).
Dans ce mode, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` et
`MAIL_ENCRYPTION` ne sont pas utilises. Un `mail.accepted` indique seulement que
`mail()` a accepte le message, pas sa livraison au destinataire.
La fonction doit etre autorisee dans la configuration PHP de l'hebergement.
Consulter aussi le suivi des e-mails
automatises dans le Manager OVH (selon l'offre), les rejets et les spams.
Verifier que l'expediteur (`MAIL_FROM_ADDRESS`, par defaut `ludoscore@lgda.fr`)
est autorise pour le domaine et que SPF/DKIM/DMARC sont correctement configures.

Pour utiliser un serveur SMTP authentifie a la place, selectionner
`MAIL_MAILER=smtp` dans `deployment/.env`, puis verifier les secrets GitHub
`MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, le port et le chiffrement selon
les instructions de l'offre OVH. Ne jamais commiter leurs valeurs.

Apres une modification de configuration, vider le cache Laravel :

```sh
# Local Docker uniquement
docker compose exec -u devuser laravel-app php artisan config:clear
docker compose logs --tail=100 laravel-app
```

Sur OVH, effectuer l'equivalent de `artisan config:clear` dans l'environnement
PHP du serveur/deploiement, puis retester une inscription avec une nouvelle
adresse et chercher les entrees `mail.*` dans les logs. Ne pas exposer les logs
ni une route de diagnostic publique.