# Cahier des charges de test — Knock Knock Manager

Version testée : refonte « Apple / gestion » (fond noir, textes blancs, titres dorés) avec import
automatique du profil par capture d'écran.

## 1. Objectifs

Vérifier, du point de vue d'un utilisateur iPhone qui veut faire progresser son compte vite :

1. **Fonctionnel** : chaque écran fait ce qu'il promet (profil, héros, équipe, artefacts, skins,
   stratégie, boss, boutique, réglages).
2. **Import par capture** : toutes les infos lisibles (pseudo, ID, niveau, guilde, puissance, VIP,
   étape, Porte, Lit, Room Research, ressources, héros, artefacts, skins) remplissent le profil, en
   anglais et en français, et **les captures ne sont jamais conservées**.
3. **Règles métier** : les conseils respectent les règles du jeu connues (Porte plafonne le Lit,
   5 héros principaux, promotions 6 et 9, P.ATK/M.ATK, faiblesses et résistances des boss,
   tirage de 10 à 2 200 diamants).
4. **Données** : tout est gardé sur le téléphone, léger, résiste au rechargement, à une donnée
   corrompue, à l'import d'une ancienne sauvegarde.
5. **Qualité** : affichage iPhone (petits et grands écrans, zones sûres), pas de défilement
   horizontal, contraste, accessibilité de base, hors ligne, installation (manifest, icônes).
6. **Robustesse** : saisies extrêmes (négatifs, très grands nombres, texte vide, HTML injecté,
   emoji), double-clics, actions destructives confirmées.

## 2. Environnement

| Élément | Valeur |
|---|---|
| Navigateur automatisé | Chromium 153 (Playwright), émulation iPhone 13 (390×844, tactile) |
| Autres tailles | iPhone SE (320×568), iPhone 15 Pro Max (430×932), iPad (768×1024) |
| Serveur | `python3 -m http.server` (localhost : service worker actif) |
| Tests unitaires | `node --test` (moteur, analyse des captures) |
| **Non couvert ici** | Safari iOS réel (WebKit indisponible dans l'environnement) : à valider sur l'iPhone de l'utilisateur, voir § 6 |

Captures de test : générées pour imiter l'interface du jeu (texte blanc ou jaune sur fond sombre et
cartes colorées, à l'échelle ×3 d'un iPhone) — profil anglais, grille de héros anglaise, fiche de
héros française avec artefact et skin, profil français.

## 3. Critères d'acceptation

- **Bloquant** : plantage, perte de données, info fausse enregistrée sans validation, capture
  conservée, action destructive sans confirmation → doit être à 0.
- **Majeur** : fonction promise inutilisable ou conseil contraire aux règles du jeu → 0 en sortie.
- **Mineur / cosmétique** : toléré s'il est documenté.
- Les tests unitaires passent à 100 %.

## 4. Cas de test

Légende priorité : P1 bloquant, P2 majeur, P3 mineur.

### 4.1 Démarrage et navigation
| ID | Cas | Attendu | P |
|---|---|---|---|
| NAV-01 | Premier lancement, stockage vide | Tableau de bord affiché, bloc « Pour bien démarrer », aucune erreur console | P1 |
| NAV-02 | Les 5 onglets | Chaque onglet s'affiche avec son grand titre doré, l'onglet actif est doré | P1 |
| NAV-03 | Barre du haut au défilement | Le petit titre apparaît après défilement | P3 |
| NAV-04 | Feuille ouverte puis Fermer / Échap / toucher le fond | La feuille se ferme, la page ne défile plus derrière | P2 |
| NAV-06 | Défilement long | La barre d'onglets reste fixe en bas, la page entière ne bouge pas | P1 |
| NAV-05 | Navigation imbriquée (Réglages › Profil › Retour) | « ‹ Retour » revient à Réglages | P2 |

### 4.2 Profil du joueur et ressources
| ID | Cas | Attendu | P |
|---|---|---|---|
| PRO-01 | Saisir pseudo, ID, guilde, étape | Affichés sur la carte du tableau de bord, conservés après rechargement | P1 |
| PRO-02 | Boutons + / − (niveau, Porte, Lit, Research) | Valeur modifiée, jamais sous le minimum (niveau ≥ 1, Porte ≥ 0) | P2 |
| PRO-03 | Saisie négative ou décimale | Ramenée à un entier ≥ minimum | P2 |
| PRO-04 | Ressources : saisir puis vider un champ | Valeur affichée formatée (1 234 / 1,2 M), champ vidé = « — » | P2 |
| PRO-05 | Diamants ≥ 2 200 | Le tableau de bord indique le nombre de tirages de 10 possibles | P3 |
| PRO-06 | Très grand nombre (10¹²) | Affichage lisible sans débordement | P3 |

### 4.3 Héros, équipe, collection
| ID | Cas | Attendu | P |
|---|---|---|---|
| HER-01 | Collection : recherche « pos » | Seul Poseidon | P2 |
| HER-02 | Recherche par alias « pyro mech » | Pyrogon Mech trouvé | P3 |
| HER-03 | Filtre « Les miens » | Seulement les héros obtenus, compteur juste | P2 |
| HER-04 | Fiche héros : Je l'ai, niveau, promotion, étoiles | Conservés, résumé « Niv. · P · ★ » à jour | P1 |
| HER-05 | Ajouter un 6e héros à l'équipe | Refusé avec message, l'interrupteur reste éteint | P2 |
| HER-06 | Décocher « Je l'ai » d'un héros d'équipe | Il sort de l'équipe | P2 |
| HER-07 | Équipe de référence | Demande confirmation, puis remplace l'équipe | P2 |
| HER-08 | Nouveau héros au nom déjà existant | Refusé | P2 |
| HER-09 | Nom de héros avec HTML `<img onerror>` | Affiché comme texte, rien n'est exécuté | P1 |
| HER-10 | Supprimer un héros du catalogue | Confirmation en deux temps ; disparaît de l'équipe et ne revient pas au rechargement | P2 |

### 4.4 Artefacts et skins
| ID | Cas | Attendu | P |
|---|---|---|---|
| ART-01 | Ajouter depuis le catalogue / créer un nouvel artefact | Apparaît dans Héros › Artefacts | P1 |
| ART-02 | Équiper un artefact déjà porté par un autre héros | Il change de porteur (jamais sur deux héros) | P1 |
| ART-03 | Porteur via la fiche artefact au-delà des emplacements | Le plus ancien est remplacé, nombre d'emplacements respecté | P2 |
| ART-04 | Retirer un artefact de l'inventaire | Retiré aussi du héros qui le portait | P2 |
| ART-05 | Supprimer du catalogue un artefact encore possédé | Refusé avec explication | P2 |
| SKI-01 | Créer un skin depuis la fiche d'un héros | Héros présélectionné, skin listé, interrupteur « possédé » | P2 |
| SKI-02 | Skin à bonus possédé non porté | Proposé dans la Stratégie, « Équiper » l'applique | P3 |

### 4.5 Stratégie (règles métier)
| ID | Cas | Attendu | P |
|---|---|---|---|
| STR-01 | Lit = Porte | Première étape : monter la Porte | P2 |
| STR-02 | Porte − Lit ≥ 2 | Première étape : rattraper le Lit | P2 |
| STR-03 | Héros d'équipe en P0–P5 | Étape « promotion → 6 » (et palier P3 indiqué) | P2 |
| STR-04 (v2) | Curios de l'équipe | Un set par héros, pièces manquantes signalées, « Équiper ces sets », pastille mise à jour | P1 |
| STR-04 | Artefact P.ATK sur un héros magique | Proposé sur un héros physique, compteur sur l'onglet Stratégie, « Tout appliquer » le déplace | P1 |
| STR-05 | Équipe sans soigneur | Alerte « Pas de soigneur » | P2 |
| STR-06 | Abonnement actif finissant dans 2 jours | Alerte d'expiration + conseils auto / x2 | P3 |
| STR-07 | Aucune donnée | Aucun plantage, étapes d'amorçage | P1 |
| STR-09 | Noyau de 5 | Postes (carry, synergie, soutien…), ordre d'investissement, palier commun à viser | P2 |
| STR-10 | Boss par type | « Jouer cette équipe » applique l'équipe adaptée (magique contre un boss résistant au physique) | P2 |
| EQU-01 | Choix d'équipe | Tous les héros proposés (obtenus d'abord), recherche, un héros ajouté est marqué obtenu | P1 |
| REEL-03 | Vraie capture de l'équipe (local) | 5 portraits découpés, niveaux lus, aucune image enregistrée | P2 |
| UI-09 | Interrupteurs | Taille iOS 51×31 dans les fiches (non étirés) | P2 |
| STR-08 | Équipe proposée sans équipe choisie | Bouton « Utiliser » qui l'enregistre en un geste | P3 |

### 4.6 Boss
| ID | Cas | Attendu | P |
|---|---|---|---|
| BOS-01 | Créer un boss (faible Magique, résiste Physique, PV élevés) | Ouvre son détail ; l'équipe conseillée privilégie le magique, contient un amplificateur non physique | P1 |
| BOS-02 | Même type en faiblesse et résistance | Refusé avec message | P2 |
| BOS-03 | « Mes héros seulement » sans héros obtenu | Pioche dans tout le catalogue, message explicatif | P3 |
| BOS-04 | « En faire mon équipe » | L'équipe du profil devient celle conseillée | P2 |
| BOS-05 | Modifier puis supprimer un boss | Modifications gardées ; suppression confirmée | P2 |
| BOS-06 | Conseils d'un boss qui résiste au physique | Phrases correctes (« les héros physiques ») | P3 |

### 4.7 Boutique
| ID | Cas | Attendu | P |
|---|---|---|---|
| BOU-01 | Activer une option et saisir sa date de fin | Jours restants affichés, conservé | P2 |
| BOU-02 | Cocher un code cadeau, le copier | Coche conservée ; copie ou repli sans erreur | P3 |
| BOU-03 | Ajouter une option personnalisée | Listée, avantages pris en compte par la Stratégie | P3 |
| BOU-04 | Value Pass actif | Gains quotidiens cumulés, conseils Sweep, suggestion du Deluxe Pass | P3 |
| TRN-01 | Infinity Train | Arrêt dans le profil et sur la carte, tâche « 10 tentatives » dans la routine | P3 |
| REEL-02 | Vraies captures Value Pass et Infinity Train (local) | Passes souscrits / non souscrits, arrêt et tentatives lus | P2 |

### 4.8 Import par capture d'écran
| ID | Cas | Attendu | P |
|---|---|---|---|
| IMP-01 | Capture de profil anglaise | Pseudo, ID, niveau, guilde, puissance, VIP, étape, Porte, Lit, ressources proposés | P1 |
| IMP-02 | Capture de profil française | Idem en français (Joueur, Guilde, Puissance, Porte niv., Diamants, Or…) | P1 |
| IMP-03 | Grille de 6 héros (anglais) | 6 héros, chaque niveau / rang / étoiles au bon héros | P1 |
| IMP-04 | Fiche héros française avec artefact jaune et skin | Héros + artefact (nom, stat, rareté, niveau) + skin rattaché au héros | P1 |
| IMP-05 | Plusieurs captures en une fois | Toutes lues, résultats fusionnés | P2 |
| IMP-06 | Décocher / corriger une proposition | Seul ce qui est coché et corrigé est enregistré | P1 |
| IMP-11 | Résultats d'import longs | « Enregistrer » visible en haut à droite et en barre fixe en bas | P1 |
| IMP-12 | Résultats d'import : éléments cochés, saisie d'un niveau | Rien n'est barré ; le champ actif reste visible au-dessus du clavier | P1 |
| IMP-07 | Image sans texte utile | « Rien de reconnu », aucune donnée modifiée | P2 |
| IMP-08 | **Aucune capture conservée** | Après import : rien de l'image ni du texte lu dans localStorage ; champ fichier vidé ; texte lu oublié à la fermeture | P1 |
| IMP-09 | Import répété du même artefact | Pas de doublon au catalogue (l'inventaire peut en contenir plusieurs) | P3 |
| IMP-10 | Moteur indisponible | Message clair, pas de plantage | P2 |

### 4.9 Données et persistance
| ID | Cas | Attendu | P |
|---|---|---|---|
| DON-01 | Rechargement | Tout est conservé | P1 |
| DON-02 | Copier puis Charger la sauvegarde | État identique | P1 |
| DON-03 | Charger un texte invalide | Message, aucune donnée perdue | P1 |
| DON-04 | Profil v1 (ancienne version) en mémoire | Migré sans perte | P1 |
| DON-05 | localStorage corrompu (JSON invalide) | L'app démarre sur un profil vierge sans planter | P1 |
| DON-06 | Effacer mon profil | Confirmation en deux temps, puis profil vierge | P1 |
| DON-07 | Poids du profil complet | Quelques dizaines de Ko au plus | P3 |

### 4.10 Qualité, iPhone, accessibilité
| ID | Cas | Attendu | P |
|---|---|---|---|
| UI-01 | 320 / 390 / 430 / 768 px | Aucun défilement horizontal, rien de coupé | P2 |
| UI-02 | Thème | Fond noir, textes blancs, titres dorés partout | P2 |
| UI-03 | Contraste texte secondaire | ≥ 4,5:1 sur les cellules | P3 |
| UI-04 | Cibles tactiles | Boutons ≥ 44 px de haut | P3 |
| UI-05 | Libellés accessibles | Boutons icône et interrupteurs ont un nom accessible | P3 |
| UI-06 | Champs texte | Police ≥ 16 px (pas de zoom automatique sur iOS) | P3 |
| INS-01 | Installer, iPhone Safari | Étapes guidées + flèche vers Partager | P2 |
| INS-02 | Installer, navigateur intégré (Instagram…) | Explication + copie de l'adresse pour Safari | P2 |
| INS-03 | Installer, Android / Chrome | Fenêtre d'installation native | P2 |
| INS-04 | App déjà installée | Bouton masqué | P3 |
| PWA-01 | Manifest et icônes | `standalone`, icônes 180/192/512 présentes | P2 |
| PWA-02 | Hors ligne | Après une visite, l'app s'ouvre sans réseau | P2 |
| PERF-01 | Premier affichage | < 1 s en local | P3 |
| PERF-02 | Import de 3 captures | < 30 s | P3 |

## 5. Méthode

- `npm test` : tests unitaires.
- `node qa/campagne.cjs` : campagne automatisée (tous les cas marqués automatisables), sortie
  dans `docs/qa/resultats-<passe>.json`.
- Revue visuelle des captures d'écran produites par la campagne.
- Chaque anomalie va dans `docs/qa/rapport-anomalies.md` (ID, gravité, reproduction, correction).

## 6. À valider sur l'iPhone réel (hors de portée de l'automatisation)

- Installation depuis Safari, icône, lancement plein écran, barre d'état.
- Sélecteur de photos iOS (plusieurs captures).
- Vraies captures du jeu : mise en page, polices et icônes réelles (les captures de test les imitent).
- Presse-papiers iOS (bouton Copier).
