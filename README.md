# Cercle 0.3.1 — édition GitHub gratuite

Cette édition publie le catalogue sur **GitHub Pages** et les APK sur **GitHub Releases**. Le site et les téléchargements sont publics. Les proches n'ont besoin ni de GitHub ni d'un compte : ils installent Cercle, ouvrent les fiches et suivent les confirmations Android.

Votre ordinateur n'est nécessaire que pour préparer et publier des applications. Une fois envoyés, les fichiers restent accessibles sur GitHub quand votre PC est éteint. Aucun VPS, serveur familial, domaine payant ou abonnement n'est nécessaire pour cette configuration publique, dans les limites des services gratuits de GitHub.

## État de cette livraison

- Dépôt public : **Zachiran42/cercle-store**.
- Catalogue en ligne : **https://zachiran42.github.io/cercle-store/**.
- Publication effectuée et vérifiée le 26 octobre 2026 : site HTTPS, catalogue signé et téléchargement public de l’APK. Le rapport VALIDATION.md détaille les vérifications.
- Catalogue : Lisière Compact 1.3.1 sous licence MIT. L’APK du store est inclus pour son installation et ses futures mises à jour.
- APK **0.3.1 de test**, versionCode 6, signé avec la même clé locale que la première version de test. Une installation par-dessus celle-ci conserve donc son identité de signature.
- Le rendu et les confirmations natives restent à valider sur un téléphone. Les exemples du mode Aperçu ne sont pas des applications publiées.

## Préparation de l’installation — version 0.3.1

La barre à 100 % indique la fin du téléchargement. Cercle vérifie ensuite le fichier, prépare les données pour Android puis attend sa confirmation. Ces étapes sont maintenant affichées explicitement. La copie et la synchronisation des fichiers s’exécutent en arrière-plan ; un garde dans le code interdit leur exécution sur le fil de l’interface.

La fenêtre de progression reste visible jusqu’au retour d’Android, et les demandes sont identifiées pour qu’un ancien résultat ne ferme pas la préparation d’une nouvelle installation. Le lancement de la confirmation tient compte des règles de PendingIntent d’Android 15/16. Les validations du fichier et la confirmation utilisateur sont conservées.

Des durées de préparation et de réponse Android sont journalisées localement sous le tag CercleInstall pour le diagnostic, sans envoi automatique. Le temps propre à Android n’a pas été mesuré sur téléphone et aucun gain chiffré n’est annoncé.

## Ajouts personnels depuis GitHub

Sur chaque téléphone :

1. Ouvrir Cercle puis **Ajouter depuis GitHub** dans Découvrir ou Mon Cercle.
2. Coller le lien d’un dépôt GitHub public et rechercher sa publication. Le dépôt doit proposer un APK dans GitHub Releases : Cercle ne compile pas de code et n’installe pas les fichiers AAB/ZIP.
3. Choisir le fichier APK si plusieurs variantes existent. Cercle le télécharge pour vérifier son identité et affiche un aperçu.
4. Confirmer **Ajouter** ou **Ajouter et installer**. Les applications personnelles apparaissent dans **Mes ajouts** sur ce téléphone.

Ces ajouts ne modifient pas le catalogue partagé et ne sont pas publiés dans le dépôt du store. Les requêtes de recherche et de téléchargement sont adressées directement à GitHub, sans compte ni jeton. Une fiche personnelle n’est pas une validation du logiciel par le propriétaire du store.

L’actualisation et la vérification périodique recherchent les nouvelles publications. Les nouveaux APK sont téléchargés à la demande pour vérifier leur version et leur certificat avant installation. Le certificat et l’identifiant doivent correspondre à l’application initialement choisie. Le catalogue signé reste la seule source des mises à jour de Cercle lui-même.

Dans la fiche personnelle, **Rechercher une publication GitHub** permet de choisir à nouveau un APK lorsque les noms ou variantes changent. **Retirer de mes ajouts** arrête le suivi et conserve l’application installée. Jusqu’à 20 fiches personnelles, APK limités à 200 Mo ; les dépôts privés ne sont pas pris en charge.

## Changements conservés depuis la version 0.2.1

- Au retour de l’installation Android, la fiche relit la version installée et remplace le bouton de mise à jour par le bouton d’ouverture si la version est à jour.
- Une version déjà installée ou plus ancienne est refusée avant tout téléchargement. Un téléchargement seul ne marque jamais une application comme installée.
- Les cartes des applications installées proposent « Ouvrir l’application ». Cette action reste disponible lorsqu’une mise à jour existe, y compris dans sa fiche.

## Publier depuis cet ordinateur

Utilisez le dossier de travail cercle-github existant : ses données et clés privées y sont déjà présentes, hors des fichiers publiés.

1. **CONNECTER-GITHUB.cmd** : connectez le compte Zachiran42 avec l'outil officiel GitHub CLI. Sur le site GitHub, vérifiez la demande d'autorisation et validez-la vous-même. Aucun mot de passe ni jeton ne doit être communiqué dans le chat.
2. **DEMARRER.cmd** : démarrez votre espace local et ouvrez **http://127.0.0.1:8787/admin**. Gardez la console ouverte pendant la publication ; Ctrl+C arrête l'outil.
3. Le premier mot de passe administrateur est dans le fichier privé **data/premier-acces-admin.txt**. Vous pouvez le changer dans Réglages.
4. Dans **Publier une appli**, ajoutez votre APK universel signé (200 Mo maximum), son nom, sa description et sa licence. Le lien du code source peut être renseigné plus tard.
5. Dans **Réglages**, utilisez **Préparer et voir le catalogue** pour vérifier le résultat.
6. Confirmez que les fichiers seront publics, puis cliquez sur **Envoyer sur GitHub**. Le premier envoi crée le dépôt public s'il n'existe pas, publie les APK et configure GitHub Pages.
7. GitHub peut mettre quelques minutes à construire le site. Ouvrez son adresse HTTPS pour vérifier qu'il est prêt avant de l'envoyer à vos proches.

L'outil de publication est privé et local ; seul le catalogue statique est envoyé sur Pages. Votre mot de passe administrateur, les jetons, données privées et clés privées ne sont jamais ajoutés aux sources ou aux Pages.

### Ajouter ou mettre à jour une application

Ajoutez l'APK dans l'administration, puis envoyez le nouveau catalogue sur GitHub. Une mise à jour conserve le même identifiant et le même certificat de signature, avec un versionCode supérieur. Cercle refuse les anciennes versions et les changements de certificat.

Chaque version possède sa propre Release. Un APK déjà présent avec un autre contenu n'est jamais écrasé : publiez une nouvelle version. Masquer une application la retire du prochain catalogue, mais ne supprime pas son ancien fichier public de GitHub.

## Les clés à conserver

Sauvegardez de façon privée et chiffrée :

- **data/** : notamment catalog-private.pem et store.json, qui conservent la clé de confiance du catalogue et les informations de publication ;
- **build/cercle-preview.keystore** pour cette phase de test, afin de pouvoir mettre le store à jour avec le même certificat ;
- les clés de signature de chacune de vos propres applications.

Ces éléments sont exclus du dépôt public et de l'archive de sources. Ne supprimez pas le dossier de travail après avoir téléchargé uniquement l'archive : les clés n'y sont volontairement pas incluses. En cas de changement de machine, restaurez vos clés et données privées avant de republier. Avant une distribution durable, validez la gestion de la clé du store et une sauvegarde récupérable ; la livraison reste une version de test.

## Sur un autre ordinateur

Node.js 22+, Java 21, Android SDK plateforme API 36, Build Tools 36.0.0 et GitHub CLI sont utilisés. Aucune dépendance npm n'est nécessaire.

Copiez .toolchain.example.json en .toolchain.json et renseignez javaHome, androidJar et buildTools. Les champs optionnels ghExecutable et ghConfigDir permettent de choisir le binaire GitHub CLI et son dossier de configuration local. Sans ces champs, le programme utilise gh depuis le PATH et sa configuration habituelle.

Les chemins de cet ordinateur sont dans .toolchain.json, exclu de Git et de l'archive. Sur cet ordinateur, la connexion GitHub CLI est séparée de la connexion du plugin GitHub de Codex.

## Configuration et commandes

Une configuration neuve s'initialise avec :

    node scripts/configure-github.mjs PROPRIETAIRE/DEPOT

Cette commande conserve la clé locale existante, écrit github-store.json et intègre l'adresse et la clé publique dans les ressources Android. Si le dépôt ou la clé de confiance change, il faut recompiler et redistribuer le client. Ne lancez pas une nouvelle initialisation sur un store existant sans restaurer d'abord ses clés.

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-android.ps1
    node scripts/publish-github.mjs
    node scripts/publish-github.mjs --publish

La première commande compile le client et vérifie sa signature. La deuxième prépare les fichiers localement, sans envoi. La troisième effectue une publication publique avec le compte GitHub connecté. Arrêtez l’administration locale avant cette commande manuelle ; avec le bouton de l’administration, gardez au contraire le serveur ouvert.

Pour une prochaine version du store, augmenter storeVersion et storeVersionCode dans github-store.json, puis compiler avec les mêmes VersionName et VersionCode. Une empreinte de compilation empêche de publier un APK construit avec une autre configuration.

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test.ps1

Ce script construit les APK de test et vérifie les publications, signatures et mises à jour. La publication GitHub est simulée pendant les tests : ils ne créent aucun dépôt ni Release réels.

## Sécurité et fonctionnement

- Catalogue signé en ECDSA P-256 ; la clé publique est intégrée au client Android.
- Numéro de révision signé pour refuser un retour à un catalogue antérieur déjà reçu. Un catalogue statique ne devient pas invalide après une semaine sans nouvelle application.
- Contrôle du SHA-256, du nom de paquet, de la version et des certificats de chaque APK téléchargé, puis confirmation par l'installateur Android.
- URL d'origine limitée aux Releases du dépôt configuré, redirections HTTPS limitées aux domaines de téléchargement GitHub autorisés ; aucun jeton GitHub dans l'application.
- Recherche périodique des mises à jour et notification facultative selon les autorisations et contraintes Android.
- Administration locale protégée par mot de passe, cookie HttpOnly et anti-CSRF.

Cette édition utilise un client natif dédié et un catalogue signé spécifique, pas le format F-Droid. Les APK et le catalogue sont publics ; il n'y a plus d'invitations pour les proches. Les anciens endpoints privés conservés dans l'outil local ne sont pas déployés sur GitHub Pages.

## Limites actuelles

Pas encore de test sur téléphone/émulateur, d'APK fractionnés, de rotation de certificats, de gestion multi-administrateurs ni de publication automatique lors d'un push de chaque projet. Vous pouvez cependant ajouter vos applications progressivement depuis leurs fichiers locaux. Les exigences Android de distribution hors Google Play restent applicables.

Code du store sous licence MIT. Chaque application conserve sa propre licence.

<!-- cercle-ddl:start -->
## APK Android

[📥 Télécharger la dernière version de Cercle.apk](https://github.com/Zachiran42/cercle-store/releases/download/store-v0.3.1/Cercle.apk)

Version actuelle : **0.3.1**. Depuis votre téléphone Android, ouvrez le fichier téléchargé pour lancer son installation.
<!-- cercle-ddl:end -->
