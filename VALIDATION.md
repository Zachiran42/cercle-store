# Vérification de l'édition GitHub — 26 octobre 2026

- APK 0.2.0, versionCode 3, minimum Android 8 (API 26), compilé avec Java 21 et Android Build Tools 36.0.0.
- Signatures APK v2 et v3 vérifiées. Certificat identique à la première version locale de test.
- 27 tests réussis pour le serveur local, la publication des APK, les signatures, les accès et l'export GitHub.
- 1 test supplémentaire réussi pour le parcours GitHub simulé : dépôt vide, sources, assets, Pages, réexécution idempotente et refus d'un fichier différent.
- Vérification réelle sur JVM des classes Java utilisées par Android pour la signature du catalogue et les règles d'URL et de redirection. Altérations et URL non autorisées refusées.
- Catalogue public vérifié dans le navigateur, y compris sa signature ECDSA avec WebCrypto.
- Aucun APK personnel n'a été fourni : catalogue personnel vide.
- À valider sur téléphone : installation, confirmations système, notification, rendu natif et mise à jour d'une application existante sans perte de données.
- Publication réelle effectuée sur https://zachiran42.github.io/cercle-store/ et dépôt public https://github.com/Zachiran42/cercle-store. GitHub Pages indique built et HTTPS est imposé.

- Téléchargement public sans authentification vérifié : APK de 37 414 octets, SHA-256 75c274d8c20980442631dd39719584949fa113f9ca6672a2f2753d5546af3b0a.
- Signature du catalogue public vérifiée avec la clé intégrée à la configuration du client. Catalogue personnel encore vide.
