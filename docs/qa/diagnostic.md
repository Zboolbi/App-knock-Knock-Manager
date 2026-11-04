# Diagnostic complet — Knock Knock Manager

Date : 4 novembre 2026. Base : 2 passes de la campagne automatisée (71 cas), 27 tests unitaires,
revue visuelle sur 4 tailles d'écran, revue métier. Les résultats détaillés sont dans
`resultats-passe-1.json`, `resultats-passe-2.json` et `rapport-anomalies.md`.

## 1. Verdict

**Prête à l'usage sur iPhone, avec deux validations à faire de votre côté** : l'installation dans
Safari et l'import de vraies captures du jeu.

| Indicateur | Passe 1 | Passe 2 |
|---|---|---|
| Cas de test réussis | 63 / 69 (91 %) | **71 / 71 (100 %)** |
| Tests unitaires | 25 / 25 | **27 / 27** |
| Anomalies bloquantes ouvertes | 0 | **0** |
| Anomalies majeures ouvertes | 2 | **0** |
| Anomalies mineures et cosmétiques ouvertes | 6 (dont 2 dans le script de test) | **0** |

## 2. Couverture par domaine (passe 2)

| Domaine | Cas | Résultat | Remarques |
|---|---|---|---|
| Navigation | 5 | 5/5 | Feuilles : Fermer, Échap, fond et Retour imbriqué |
| Profil et ressources | 6 | 6/6 | Minimums respectés, nombres formatés (1 234, 1,2 M, Md) |
| Héros et équipe | 10 | 10/10 | Équipe limitée à 5, doublons refusés, injection HTML neutralisée |
| Artefacts et skins | 7 | 7/7 | Un artefact n'est jamais porté par deux héros ; emplacements respectés |
| Stratégie (règles du jeu) | 8 | 8/8 | Porte et Lit, P6 et P9, P.ATK et M.ATK, soigneur, expiration des abonnements |
| Boss | 6 | 6/6 | Contre un boss résistant au physique : équipe magique, sans amplificateur physique |
| Boutique | 3 | 3/3 | Dates de fin, codes cadeaux, options personnalisées |
| Import par capture | 10 | 10/10 | Anglais et français, grille, nom coupé sur deux lignes, confidentialité |
| Données | 7 | 7/7 | Ancien profil migré, stockage corrompu toléré, effacement confirmé |
| Qualité, iPhone, hors ligne | 9 | 9/9 | 320 à 768 px, contraste, cibles tactiles, hors ligne, manifest |

## 3. Import par capture d'écran : ce qui est prouvé

| Mesure | Valeur |
|---|---|
| Profil anglais : champs justes | **15 / 15**<br>Pseudo, ID, niveau, guilde, puissance, VIP, étape, Porte, Lit, Room Research, Diamants, Or, Soul Flame, Hero Pact, Stamina |
| Profil français : champs justes | **10 / 10**<br>Joueur, niveau, guilde, puissance, étape, Porte, Lit, Diamants, Or, Cuir |
| Grille de 6 héros | **6 / 6** héros, chaque niveau, rang et étoiles attribué au bon héros |
| Fiche héros française | Héros, artefact (nom, stat, rareté, niveau) et skin rattaché au bon héros |
| 4 captures en une fois | 25 infos en **6 s** (moteur déjà chargé) ; 3 s pour une capture |
| Captures conservées | **Aucune**<br>Rien dans le stockage local ni dans le cache, champ fichier vidé, texte lu oublié à la fermeture |
| Seul stockage ajouté | `keyval-store` : le cache des fichiers du moteur de lecture, pas vos images |

Une seule limite : ces captures **imitent** l'interface du jeu. Les règles reconnaissent les
libellés usuels dans les deux langues, mais un écran qui affiche une ressource par une icône sans
libellé texte n'est pas lisible. Il faut des vraies captures pour finir le réglage (risque R-01).

## 4. Données et légèreté

- Profil de test complet (23 héros, 63 artefacts) : **14,6 Ko**. Profil après import : **11 Ko**.
- Tout est stocké dans l'app, sur le téléphone : aucun compte, aucun serveur.
- Le moteur de lecture (environ 12 Mo) n'est téléchargé qu'à la première importation, puis il
  reste en cache et marche hors ligne.
- Premier affichage : **92 ms** en local.

## 5. Analyse métier : la demande est-elle couverte ?

| Besoin exprimé | Couverture | Commentaire |
|---|---|---|
| Design Apple, pratique comme une app de gestion | ✔ | Tableau de bord, listes groupées, contrôle segmenté, feuilles modales, onglets avec libellés |
| Fond noir, textes blancs, titres dorés | ✔ | Vérifié par test (UI-02). Contraste du texte secondaire 6,6:1, doré 10,6:1 |
| Onglet pour renseigner équipe, niveaux, artefacts, skins | ✔ | Onglet Héros, avec Équipe, Collection, Artefacts et Skins |
| Infos gardées, modifiables à la main | ✔ | Tout est éditable ; persistance testée |
| Onglet Stratégie mis à jour automatiquement | ✔ | Recalculé à chaque modification. Le compteur de l'onglet indique les artefacts à déplacer |
| Options payantes déjà souscrites | ✔ | Boutique : options repérées, dates de fin, impact sur la stratégie |
| Boss : forces, faiblesses, héros adaptés | ✔ | Équipe argumentée, meilleurs héros par faiblesse, artefacts pour le combat |
| Remplissage automatique par captures, captures non gardées | ✔ | Prouvé par IMP-01 à IMP-08 |
| Toutes les infos du jeu (héros, artefacts, guildes…) | ◐ | Partiel : 23 héros sur une centaine, aucune liste publique d'artefacts, de skins ni de boss (R-03). La guilde du joueur est gérée |
| Connexion directe au compte du jeu | ✘ | Impossible sur iOS : chaque app est isolée, et le jeu n'a pas d'accès ouvert. L'import par capture le remplace |
| Installable sur iPhone | ✔ | Manifest et icônes vérifiés, hors ligne vérifié. Installation Safari à confirmer (R-02) |

## 6. Recommandations, par ordre d'impact

1. **Envoyer de vraies captures du jeu** : profil, écran principal avec les ressources, collection,
   fiche de héros, artefact ouvert, guilde. C'est le seul levier restant pour fiabiliser l'import à
   100 % sur votre compte.
2. **Compléter le catalogue à partir de ces captures.** Chaque héros, artefact ou skin ajouté est
   ensuite reconnu automatiquement.
3. **Corriger les types d'attaque** des héros marqués « à vérifier » : la répartition des artefacts
   en dépend.
4. Faire une sauvegarde (Réglages › Sauvegarde) avant de changer de téléphone ou de vider Safari.

## 7. Rejouer les tests

```bash
npm test                         # tests unitaires
node qa/campagne.cjs passe-3     # campagne complète → docs/qa/resultats-passe-3.json
```
