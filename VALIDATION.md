# Vérification de Cercle 0.3.3 — 27 octobre 2026

- Version Android 0.3.3, versionCode 8, minimum Android 8 (API 26).
- Ajout personnel depuis un dépôt GitHub public : recherche d’une publication stable, ou d’une préversion si aucune version stable n’est disponible ; choix du fichier APK si nécessaire ; téléchargement pour inspection ; aperçu puis confirmation explicite de l’ajout.
- Les fiches sont enregistrées dans les préférences privées de Cercle sur ce téléphone, séparément du catalogue partagé. Aucun ajout personnel n’est envoyé au serveur d’administration, au catalogue Pages ou au dépôt du propriétaire du store.
- Les demandes réseau de recherche et de téléchargement sont envoyées à GitHub, sans jeton ni connexion GitHub. GitHub reçoit nécessairement les requêtes des dépôts consultés.
- Les APK sont limités à 200 Mo. Contrôle du dépôt, des URL HTTPS, de la taille et de l’empreinte publiée par GitHub lorsqu’elle est disponible ; après inspection initiale, l’empreinte du fichier est conservée localement. Les certificats et l’identifiant du paquet sont conservés et comparés lors des mises à jour. Android effectue la validation finale de l’installation.
- Une source personnelle ne peut pas remplacer le paquet de Cercle ; ses mises à jour continuent à provenir du catalogue signé. Les mises à jour directes des applications partagées doivent conserver le dépôt et le certificat de leur fiche signée.
- Le suivi des ajouts personnels consulte uniquement les métadonnées des publications. Les APK des nouvelles publications sont téléchargés quand l’utilisateur demande leur vérification/installation ; les comparaisons de version reposent alors sur le contenu réel de l’APK.
- Si plusieurs variantes APK existent, le suivi conserve la famille de nom sélectionnée. Une sélection ambiguë ne bascule pas silencieusement vers une autre variante ; l’utilisateur peut rechercher et sélectionner une publication depuis la fiche.
- Le retrait d’une fiche personnelle arrête son suivi sans désinstaller l’application.
- 34 tests automatisés : serveur, catalogue signé, publication GitHub simulée et code Java. Le test des ajouts personnels exécute plus de 50 contrôles avec services Android et réponses GitHub simulés : isolation entre utilisateurs, confirmation avant sauvegarde, persistance, fusion sans écrasement du catalogue partagé, cache, empreinte incorrecte, changement de paquet/certificat, APK fractionné, blocage d’une autre source pour Cercle, nouvelles publications, variantes, limitations GitHub, suppression et fiches périmées.
- Dépendance JSON de test téléchargée depuis Maven Central et vérifiée par SHA-256 ; elle est utilisée uniquement sur JVM pour les tests, jamais embarquée dans l’APK.
- Signature APK v2/v3, certificat de mise à jour et clé publique de catalogue contrôlés lors de la compilation/publication.
- Limite : aucun téléphone ni émulateur Android connecté ici. Le rendu natif, le sélecteur d’APK, les confirmations d’installation et l’ouverture des applications restent à confirmer sur téléphone.

- Préparation Android : exécution hors du fil principal imposée par le code ; indications distinctes pour la vérification, la copie, la synchronisation et l’attente de confirmation.
- Nouveau test sur InstallSession réel avec services Android simulés, plus de 80 contrôles : copie complète, synchronisation avant fermeture, fermeture avant commit, abandon sur annulation/erreur, refus d’exécution sur le fil principal et compatibilité des flags de confirmation sur API 26/31/35/36.
- Le résultat d’installation est associé à la demande active. La progression est fermée à réception du statut Android, pas dès la fin du téléchargement.
- Les durées inscrites dans les journaux locaux servent au diagnostic ; aucune mesure sur téléphone ni garantie de réduction du temps pris par Android.

- Accès permanent à la vérification de Cercle depuis Mon Cercle et Mises à jour, y compris en mode Aperçu ; version installée lue dans PackageManager.
- Sélecteur de mise à jour de Cercle testé sur catalogue JSON réel avec refus d’une fiche personnelle, de doublons, d’une mauvaise identité de paquet et de liens externes au dépôt du store.
- Client API réel testé avec transport HTTPS et préférences Android simulés : vérification ECDSA, cache désactivé, requête fraîche, refus d’altération et de révisions anciennes, protection de la persistance lors de réponses concurrentes.
- Lisière 1.4.0 : versionCode 6, API 24, APK SHA-256 02fb781cef751eeaa566223eb2dab2aa65fdbbd79a8109375fbe1cad934d5775 ; même certificat que la 1.3.1. Permission Internet ajoutée pour Gutenberg. Notices MIT et tierces présentes dans l’APK et identiques aux fichiers publiés.
- Le catalogue du site reste republié explicitement par son propriétaire. Le client Android recherche désormais les publications stables du dépôt GitHub source des applications partagées, au clic, au démarrage et lors de la vérification périodique.

- Noël Sucré 1.2.0 ajouté au catalogue : paquet fr.noelsucre.app, versionCode 3, Android 8 minimum, aucune permission demandée. APK SHA-256 8039155039851dd0bfc0d528bd9baf6b8a53a4e74792848972a61c6284b7b35e, signature vérifiée. Polices DM Sans et Fraunces avec licences SIL OFL présentes dans l’APK ; code original publié sous MIT au choix du propriétaire. Fichier APK original conservé. Aucun essai du jeu sur téléphone effectué ici.

- Version 0.3.3 : tests du code SharedUpdates réel avec services Android et réponses GitHub simulés : détection sans télécharger les APK, conservation des métadonnées signées, identité et certificat épinglés, indépendance des ajouts personnels, persistance, refus d’APK fractionné, version égale/ancienne traitée une seule fois, absence de régression après inspection, limites GitHub, publication absente, variantes, invalidation par un nouveau catalogue ou retrait d’une application, protection spécifique de Cercle.
- Lisière 1.5.0 : versionCode 7, APK SHA-256 8a7b6dd29c9af4cd33d04ffc3d1d09ac8112b0e210fc5962c1f2ce41ee19f85f, même certificat Compact. Notices MIT et tierces contrôlées. Aucun essai sur téléphone.
