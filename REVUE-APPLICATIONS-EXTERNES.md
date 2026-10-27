# Revue ciblée des applications externes — 27 octobre 2026

Cette revue sert à choisir les versions proposées dans Cercle. Elle ne constitue ni une certification de sécurité ni une garantie d’absence de code malveillant, de bogues ou de vulnérabilités. Les applications restent créées et maintenues par leurs auteurs indépendants.

## Périmètre et méthode

- APK téléchargés depuis les publications GitHub officielles : signature vérifiée avec apksigner, empreinte SHA-256 comparée au digest de l’asset GitHub, paquet/version/minimum Android et permissions lus avec aapt.
- Code lu dans un instantané du commit résolu depuis le tag de la version, sans exécuter les scripts de compilation de ces projets. Commit, version, empreinte APK et décisions sont conservés dans [external-reviews.json](external-reviews.json).
- Lecture ciblée des manifestes, échanges réseau/TLS, rendu WebView, import/export, stockage, sauvegardes, configuration de publication et fichiers de dépendances pertinents. Les chemins ci-dessous renvoient au code effectivement examiné.
- 392 couples Maven nom/version identifiables dans les déclarations Gradle et catalogues TOML ont été comparés à OSV. Ce relevé inclut plusieurs variantes, des bibliothèques de tests et des dépendances indirectes déclarées : une correspondance n’est pas, à elle seule, une preuve d’exploitation dans l’APK Android.
- Déclarations commentées écartées. Certaines alertes n’ont donc pas été retenues : Jackson dans FairEmail est commenté/exclu ; Commons IO de Loop est réservé à jvmTest. L’absence de déclaration Maven exploitable ne couvre pas les dépendances natives, sous-modules, transitives non résolues ou services distants.
- Pas de reconstruction reproductible des dix APK, de comparaison binaire code/APK, de revue ligne par ligne complète, de test sur téléphone, de test d’intrusion ou de validation cryptographique exhaustive. La correspondance au binaire repose sur sa publication dans le dépôt officiel et son empreinte, pas sur une preuve de compilation reproductible.
- Les quatre applications déjà proposées auparavant (LocalSend, Aegis, Fossify Gallery, Markor) ne font pas partie de cette nouvelle revue de code.

## Versions retenues pour le catalogue

### Breezy Weather 6.2.2

[Source exacte](https://github.com/breezy-weather/breezy-weather/tree/17fd71dd00e0668368c9c7844433f79f09ad9e93) — [APK et publication](https://github.com/breezy-weather/breezy-weather/releases/tag/v6.2.2).

Lecture de AndroidManifest.xml, common/di/HttpModule.kt, des règles network_security_config.xml et des déclarations de dépendances. Le client conserve la vérification TLS ; les racines supplémentaires concernent la compatibilité avec d’anciens Android. Le réseau en clair est interdit dans la configuration standard examinée. La journalisation détaillée est conditionnée au mode de débogage. Les autorisations de localisation correspondent aux fonctions météo ; la position consultée est transmise aux fournisseurs. Aucune alerte OSV n’a été remontée pour les coordonnées Maven identifiées de ce projet. Variante standard universelle retenue.

### AnkiDroid 2.25.3

[Source exacte](https://github.com/ankidroid/Anki-Android/tree/d9bf072f814a0c37d30a694192593b31ff2df875) — [APK et publication](https://github.com/ankidroid/Anki-Android/releases/tag/v2.25.3).

Lecture du manifeste et de la configuration réseau, AbstractFlashcardViewer.kt, FileUtil.kt et jsaddons/TgzPackageExtract.kt. Les extractions examinées contrôlent le chemin canonique avec un séparateur, y compris contre les préfixes de répertoires voisins. Le rendu de cartes autorise HTML/JavaScript et des fichiers locaux : c’est une capacité fonctionnelle à considérer lors du choix de paquets de cartes, pas un contenu automatiquement digne de confiance. HTTP et autorités ajoutées par l’utilisateur sont permis par la configuration ; aucun contournement SSL spécifique n’a été repéré dans les chemins recherchés. Aucune alerte OSV sur les dépendances identifiables. APK full-universal officiel retenu, sans version de test parallèle.

### KeePassDX Libre 4.5.6

[Source exacte](https://github.com/Kunzisoft/KeePassDX/tree/b5cb8057786fb7e638b79735d1e21e35ca5a21f9) — [APK et publication](https://github.com/Kunzisoft/KeePassDX/releases/tag/4.5.6).

Lecture du manifeste, des règles de sauvegarde, CipherFactory.kt et HmacBlockInputStream.kt. L’APK Libre ne demande pas la permission Internet. Le service de remplissage automatique est protégé par BIND_AUTOFILL_SERVICE ; la base interne sensible est exclue des sauvegardes Android examinées. Le code utilise les primitives de chiffrement prévues pour KeePass et contrôle les blocs HMAC ; cela ne constitue pas un audit de leur implémentation. Aucun avis OSV remonté sur les dépendances identifiées. La variante Libre a son propre identifiant com.kunzisoft.keepass.libre ; elle ne remplace pas automatiquement une variante Free d’un autre identifiant.

### Organic Maps 2026.09.29-32-Web

[Source exacte](https://github.com/organicmaps/organicmaps/tree/b20d1417eef1e3c63a447ac8658db4307a066024) — [APK et publication](https://github.com/organicmaps/organicmaps/releases/tag/2026.09.29-32-android).

L’archive complète dépassant la limite locale fixée pour cette revue, 60 fichiers ciblés ont été récupérés au commit exact : manifestes Android, client HTTP Java/C++, politique réseau, utilitaires de stockage, fichiers de compilation et notices. Le client Android utilise OkHttp avec vérification TLS ; les racines supplémentaires visent d’anciens Android. La configuration autorise également HTTP : aucune confidentialité n’est présumée pour un transfert en clair. Les permissions position/réseau correspondent à la navigation et au téléchargement des cartes. Aucun avis OSV sur les coordonnées Maven récupérées ; le code natif et les formats de cartes ne sont pas couverts exhaustivement. Attribution Organic Maps Project conservée ; licences distinctes du code et des données signalées.

### Just Player 0.217

[Source exacte](https://github.com/moneytoo/Player/tree/aa85148f6ccbfdf931fe207bb75ec77c478d8eb0) — [APK et publication](https://github.com/moneytoo/Player/releases/tag/v0.217).

Lecture du manifeste, des règles réseau, des dépendances et de Prefs.java. La sérialisation des positions de lecture utilise un fichier interne privé créé par l’application ; aucun import de ce fichier depuis un téléchargement n’a été repéré dans ce chemin. HTTP et les certificats installés par l’utilisateur sont autorisés pour les flux vidéo : le catalogue ne présente pas tous les flux comme chiffrés. Aucun avis OSV sur les dépendances Maven identifiées. Variante officielle normale retenue, sans variante legacy.

### Unciv 4.22.14-patch1

[Source exacte](https://github.com/yairm210/Unciv/tree/77b0939c36d99e8e1e2d4ed69c95018a3f115b84) — [APK et publication](https://github.com/yairm210/Unciv/releases/tag/4.22.14-patch1).

Lecture du manifeste, des dépendances et des fonctions de téléchargement/extraction de mods de GithubAPI.kt. Le chemin utilisé contrôle les noms d’entrées ZIP par chemin canonique et refuse la sortie du répertoire de destination. Un ancien utilitaire Zip.kt sans ce contrôle a aussi été trouvé ; la recherche dans l’instantané n’a pas trouvé d’appel à cet utilitaire en dehors de sa récursion interne. Ce constat est limité à l’arbre examiné. Les mods restent des contenus tiers choisis par l’utilisateur. Aucun avis OSV sur les dépendances Maven identifiées. Licence MPL-2.0 confirmée dans LICENSE.

### Loop Habit Tracker 2.3.2 — retenu après réexamen

[Source exacte](https://github.com/iSoron/uhabits/tree/7afc799cfb6959f8a9d892417d6427a262bfb13a) — [APK et publication](https://github.com/iSoron/uhabits/releases/tag/v2.3.2).

La mise en attente initiale était trop conservatrice pour le périmètre Android examiné. Le manifeste ne demande pas Internet et l’APK ne contient aucune bibliothèque native. L’inspection des tables de types/méthodes de son unique DEX (6 153 classes) n’a trouvé ni référence à ObjectInputStream, ni méthode de désérialisation Java correspondante, ni chaîne de réflexion désignant cette classe. La revue des imports GenericImporter et ImportDataTask montre des imports CSV/SQLite, pas une entrée de sérialisation Java.

Commons IO 1.3.2 est limité aux tests JVM. Les usages applicatifs recherchés de Commons Lang concernent notamment la jointure de chaînes et les paires ; aucun appel à ClassUtils.getClass, méthode de l’avis [GHSA-j288-q9x7-2f5v](https://github.com/advisories/GHSA-j288-q9x7-2f5v), n’a été trouvé dans ces sources. La précondition de désérialisation de [GHSA-xxph-c9ww-hj94](https://github.com/advisories/GHSA-xxph-c9ww-hj94) n’a pas été identifiée dans cet APK. Les alertes de dépendances sont conservées pour le suivi ; ce constat n’est pas une preuve universelle d’inaccessibilité par réflexion, ni une validation des versions futures. Variante release officielle revérifiée : signature et digest inchangés. Décision de catalogue révisée : retenu.

### Shattered Pixel Dungeon 4.0.2 — retenu après réexamen

[Source exacte](https://github.com/00-Evan/shattered-pixel-dungeon/tree/57a4e06a4caf162446d1c28caa7983f0493fecf0) — [APK et publication](https://github.com/00-Evan/shattered-pixel-dungeon/releases/tag/v4.0.2).

Ajout demandé explicitement par le propriétaire du catalogue. L’APK Android autonome officiel a été contrôlé à nouveau : signature valide, digest GitHub inchangé, paquet et version cohérents. Il ne s’agit pas d’un APK recompilé par Cercle, ni d’une validation basée seulement sur sa présence dans Google Play.

Le code de Bundle.java explique qu’Android fournit sa propre version de org.json. Cela rend la simple correspondance Maven insuffisante pour affirmer que le binaire Android est affecté. Il faut cependant garder la nuance : l’APK est optimisé/obfusqué et l’inspection des noms de types ne permet pas de prouver quelle implémentation JSON est exécutée. L’hypothèse d’un faux positif n’est donc pas présentée comme un fait établi.

Les avis [GHSA-3vqj-43w4-2q58](https://github.com/advisories/GHSA-3vqj-43w4-2q58) et [GHSA-4jq9-2xhw-jpx7](https://github.com/advisories/GHSA-4jq9-2xhw-jpx7) sont conservés dans les métadonnées de revue comme points de suivi. Aucun exploit Android ou comportement malveillant du jeu n’a été établi ici. Décision de catalogue : retenu à la demande du propriétaire, avec revue limitée et incertitude documentée, sans certification d’absence de vulnérabilité.

## Versions différées

Une mise en attente n’est pas une accusation de comportement malveillant, ni la preuve qu’une attaque est possible dans toutes les configurations. C’est un choix conservateur de catalogue tant que ces points restent non résolus dans cette revue.

### NewPipe 0.29.1

La signature de l’APK correspond au certificat publié dans son README. La correction de l’ancienne désérialisation dangereuse est présente dans PreferencesObjectInputStream.kt : liste de types autorisés ; [avis historique corrigé à partir de 0.27.0](https://github.com/TeamNewPipe/NewPipe/security/advisories/GHSA-wxrm-jhpf-vp6v).

La version déclare toutefois jsoup 1.22.2, concerné par [GHSA-65r4-943x-97jj](https://github.com/advisories/GHSA-65r4-943x-97jj). SrtFromTtmlWriter.java appelle Parser.xmlParser pour des sous-titres. Le second examen confirme que la dernière publication stable est inchangée et que le chemin XML est appelé pour les sous-titres. Un test de la bibliothèque jsoup 1.22.2 officielle, dans une JVM limitée à 64 Mio, a épuisé le tas avec un document synthétique de 102 793 caractères. Ce test ne porte pas sur l’APK Android et ne prouve pas une exploitation sur téléphone ; il étaye le maintien en attente. Une autre alerte jsoup de nettoyage HTML est conservée dans le relevé sans conclure à son exploitation ici.

### FairEmail 1.2339

WebViewEx.java désactive JavaScript et l’accès aux fichiers, et conditionne le chargement réseau des images au choix de l’utilisateur. Mais jsoup 1.23.1 figure dans les dépendances actives et TextHelper.formatXml, appelé pour des rapports DMARC, utilise le parseur XML concerné par [GHSA-65r4-943x-97jj](https://github.com/advisories/GHSA-65r4-943x-97jj). Des alertes Guava et POI restent également à qualifier. Les nombreuses correspondances Jackson initiales ont été écartées : déclarations commentées et exclusions explicites dans le build. Le second examen confirme la version stable inchangée et le chemin ActivityDMARC → TextHelper.formatXml, qui charge puis analyse le document. Un test de jsoup 1.23.1 officiel dans une JVM limitée à 64 Mio reproduit un épuisement du tas avec le même document synthétique de 102 793 caractères. Aucun essai sur l’APK Android ; mise en attente maintenue.

## Publication et mises à jour

Après réexamen, huit versions sont retenues parmi les dix examinées et rejoignent les quatre fiches externes précédentes. Les douze APK restent sur les Releases de leurs auteurs ; ils ne sont pas copiés ni recompilés par Cercle. Les mentions « application externe, non créée par Cercle » et les auteurs restent visibles.

Cette revue porte seulement sur les versions et commits indiqués. La recherche automatique de mises à jour dans Cercle contrôle le dépôt, l’identité, la version et le certificat du nouvel APK ; elle ne réalise pas une nouvelle revue de code de chaque version future.

Ces ajouts ne nécessitent pas une nouvelle version de Cercle : avec Cercle 0.3.4, « Actualiser le catalogue » récupère les nouvelles fiches signées.
