# Vérification de Cercle 0.3.1 — 26 octobre 2026

- Version Android 0.3.1, versionCode 6, minimum Android 8 (API 26).
- Ajout personnel depuis un dépôt GitHub public : recherche d’une publication stable, ou d’une préversion si aucune version stable n’est disponible ; choix du fichier APK si nécessaire ; téléchargement pour inspection ; aperçu puis confirmation explicite de l’ajout.
- Les fiches sont enregistrées dans les préférences privées de Cercle sur ce téléphone, séparément du catalogue partagé. Aucun ajout personnel n’est envoyé au serveur d’administration, au catalogue Pages ou au dépôt du propriétaire du store.
- Les demandes réseau de recherche et de téléchargement sont envoyées à GitHub, sans jeton ni connexion GitHub. GitHub reçoit nécessairement les requêtes des dépôts consultés.
- Les APK sont limités à 200 Mo. Contrôle du dépôt, des URL HTTPS, de la taille et de l’empreinte publiée par GitHub lorsqu’elle est disponible ; après inspection initiale, l’empreinte du fichier est conservée localement. Les certificats et l’identifiant du paquet sont conservés et comparés lors des mises à jour. Android effectue la validation finale de l’installation.
- Une source personnelle ne peut pas remplacer le paquet de Cercle ; ses mises à jour continuent à provenir du catalogue signé. Le contrôle strict des téléchargements du catalogue partagé reste inchangé.
- Le suivi des ajouts personnels consulte uniquement les métadonnées des publications. Les APK des nouvelles publications sont téléchargés quand l’utilisateur demande leur vérification/installation ; les comparaisons de version reposent alors sur le contenu réel de l’APK.
- Si plusieurs variantes APK existent, le suivi conserve la famille de nom sélectionnée. Une sélection ambiguë ne bascule pas silencieusement vers une autre variante ; l’utilisateur peut rechercher et sélectionner une publication depuis la fiche.
- Le retrait d’une fiche personnelle arrête son suivi sans désinstaller l’application.
- 32 tests automatisés : serveur, catalogue signé, publication GitHub simulée et code Java. Le test des ajouts personnels exécute plus de 50 contrôles avec services Android et réponses GitHub simulés : isolation entre utilisateurs, confirmation avant sauvegarde, persistance, fusion sans écrasement du catalogue partagé, cache, empreinte incorrecte, changement de paquet/certificat, APK fractionné, blocage d’une autre source pour Cercle, nouvelles publications, variantes, limitations GitHub, suppression et fiches périmées.
- Dépendance JSON de test téléchargée depuis Maven Central et vérifiée par SHA-256 ; elle est utilisée uniquement sur JVM pour les tests, jamais embarquée dans l’APK.
- Signature APK v2/v3, certificat de mise à jour et clé publique de catalogue contrôlés lors de la compilation/publication.
- Limite : aucun téléphone ni émulateur Android connecté ici. Le rendu natif, le sélecteur d’APK, les confirmations d’installation et l’ouverture des applications restent à confirmer sur téléphone.

- Préparation Android : exécution hors du fil principal imposée par le code ; indications distinctes pour la vérification, la copie, la synchronisation et l’attente de confirmation.
- Nouveau test sur InstallSession réel avec services Android simulés, plus de 80 contrôles : copie complète, synchronisation avant fermeture, fermeture avant commit, abandon sur annulation/erreur, refus d’exécution sur le fil principal et compatibilité des flags de confirmation sur API 26/31/35/36.
- Le résultat d’installation est associé à la demande active. La progression est fermée à réception du statut Android, pas dès la fin du téléchargement.
- Les durées inscrites dans les journaux locaux servent au diagnostic ; aucune mesure sur téléphone ni garantie de réduction du temps pris par Android.
