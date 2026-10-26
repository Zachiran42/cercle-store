# Vérification de Cercle 0.2.1 — 26 octobre 2026

- Version Android 0.2.1, versionCode 4, minimum Android 8 (API 26).
- Relecture de la version installée au retour sur la fiche, à réception des événements Android d’installation/remplacement/désinstallation pendant que Cercle est visible, et lors de l’actualisation du catalogue. Aucun état « installé » n’est déduit du téléchargement : Android reste la source de vérité.
- Contrôle de version avant le téléchargement et nouvelle vérification après réception de l’APK.
- Ouverture directe des applications installées depuis leurs cartes, avec gestion d’une désinstallation ou d’un refus Android entre l’affichage et le clic. Ouverture aussi proposée dans la fiche d’une application dont une mise à jour est disponible.
- 30 tests réussis : publication des APK, versions égales/anciennes/supérieures, changement de certificat refusé, signatures du catalogue, règles de téléchargement Java, publication GitHub simulée.
- Parmi ces tests, exécution du code Java réel de téléchargement, avec services Android simulés : ancienne version, même version, version plus récente installée, application absente et numéros de version sur 64 bits. Les versions déjà installées ne provoquent aucun accès réseau ; un téléchargement ne change pas l’état installé.
- Catalogue : Lisière Compact 1.3.1 (API 24), code original sous licence MIT ; APK original avec notices tierces.
- Limite : pas de téléphone ni d’émulateur Android connecté ici. Le retour réel de la confirmation d’installation, le rendu natif et le lancement de Lisière restent à vérifier sur téléphone.
