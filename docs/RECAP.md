# RECAP — Knock Knock Manager

> Document de reprise : à lire **avant** tout travail sur l'app, à la place de relire le code.
> **À mettre à jour à chaque évolution** (section « Historique » + sections touchées).

## 1. L'app en bref
- Companion **non officiel** de *Knock Knock: Room Defense* (jeu en **anglais** chez l'utilisateur, serveur Europe).
- **PWA** installable sur iPhone : https://zboolbi.github.io/App-knock-Knock-Manager/ (Safari › Partager › Sur l'écran d'accueil). Hors ligne.
- Dépôt de l'app : `Zboolbi/App-knock-Knock-Manager`, branche `main`, racine = app. Publication auto GitHub Pages (`.github/workflows/pages.yml`, tests avant déploiement).
- Copie de travail : `crypto-agent/kkrd-coach/` (branche `claude/profile-team-management-app-bfq8lk`), synchronisée vers le dépôt de l'app.
- Pas de serveur, pas de compte : tout est dans `localStorage` (clé `kkrd-coach:v2`), ~15 Ko.

## 2. Design (demandé par l'utilisateur)
- Style **Apple** (listes groupées, grands titres, feuilles modales, contrôle segmenté), pratique comme une app de gestion.
- **Fond noir, textes blancs, titres dorés** (`--or: #d8b45a`). Thème unique sombre.
- Accessibilité (V8.3) : texte tertiaire `--texte-3: #8b8b92` (≥ 4,5:1), pastilles de rareté teintées (texte ≥ 5:1), libellés en casse de phrase (pas de majuscules espacées), cibles ≥ 44 px sauf contrôles natifs iOS, focus géré dans les feuilles (arrière-plan `inert`), libellés reliés aux champs (`associerLibelles`), accords au pluriel via `pluriel()` (engine.js). Vérifié : axe-core 0 violation (20 écrans), détecteur impeccable 0 constat, 320 → 1024 px sans débordement.
- Logo : **logo du jeu fourni par l'utilisateur** (`assets/logo-jeu.png`, détouré) à la place du titre, « MANAGER » dessous. Fond : tête-citrouille (`assets/fond.jpg`) en transparence (22 %). Icône d'app (écran d'accueil uniquement) : « K » orange + tête-citrouille (`icons/`, 180/192/512 + maskable Android, coins comblés en #1f2125).

## 3. Onglets
| Onglet | Contenu |
|---|---|
| Accueil | Logo, carte joueur (niveau, guilde, VIP, étape, Porte/Lit, puissance, Curio Vault, Gear, palier), **Importer**, ressources, équipe, « À faire maintenant », routine du jour. Réglages (roue dentée). |
| Héros | Segments **Équipe · Collection · Curios · Pièges · Bêtes · Skins**. Équipe : choix parmi **tous les héros** (recherche), **import de la capture d'équipe** (5 portraits + niveaux lus, héros à choisir). Fiche héros : obtenu, niveau, promotion, étoiles, 4 curios, skin. |
| Stratégie | Coaching long terme en 4 segments : **Noyau** (postes Carry/Synergie/Soutien… dans l'ordre d'investissement, palier P6 commun, principes), **Curios** (un set par héros sans conflit, pièces manquantes, « Équiper ces sets »), **Boss** (6 types de boss → équipe à jouer, « Jouer cette équipe »), **Investir** (diamants → tirage ×10, jalons, ressources, skins, offres). Le plan « À faire maintenant » reste sur l'accueil. |
| Boss | Faiblesses/résistances/traits, équipe conseillée argumentée, héros par faiblesse, curios du combat. |
| Boutique | Options payantes souscrites (dates de fin), codes cadeaux. |

## 4. Fichiers
| Fichier | Rôle |
|---|---|
| `js/data.js` | Catalogue : 41 héros (dont Cannon Girl), 40 curios + 10 sets, 8 pièges, 8 bêtes, offres, modes, ressources, codes, astuces |
| `js/engine.js` | Règles (fonctions pures) : scores boss, équipe, curios par set, plan, conseils, coaching (`coachNoyau`, `coachCurios`, `coachBoss`, `coachDiamants`, `coachJalons`) |
| `js/store.js` | Stockage, migration v1→v2, anciennes raretés → R/SSR/UR/CR, mise à jour des fiches non modifiées |
| `js/capture.js` | Analyse du texte des captures (héros, curios, pièges, bêtes, profil, ressources, écrans à chiffres sans libellé) |
| `js/ocr.js` | Tesseract.js embarqué (`vendor/`, eng+fra), **2 passes** (textes clairs / textes colorés), image jamais conservée |
| `js/app.js` | Interface (vues, feuilles, import, événements) |
| `tests/*.mjs` | 42 tests unitaires (`npm test`) |
| `qa/campagne.cjs` | 103 cas de test navigateur (`node qa/campagne.cjs passe-N`) |
| `docs/qa/` | Cahier des tests, résultats, anomalies, diagnostic |
| `outils/build.py` | Page unique + archive PWA (`dist/`) |

## 5. Données du jeu (source : captures de l'utilisateur, nov. 2026)
- **Raretés** : R (bleu) < SSR (violet) < UR (orange) < CR (rouge).
- **Héros** : 31 de la collection de l'utilisateur + 9 cités par les guides. Type physique/magique **déduit de l'icône** de la carte (lame / spirale), marqué « à vérifier ». 5 héros de l'équipe principale du joueur **non identifiés** (pas de nom à l'écran).
- **Curios** (= artefacts) : 10 sets × 4 raretés. Sets et effets : Force of Nature (>50 % PV), Total Annihilation (<50 % PV), Sky Scorch (Brûlure), Wild Bloodlust (Saignement), Thunder Tremor (Paralysie), Sundered Spirit (crit), Chaos Incarnate (Stun), Brutal Carnage (Knock), Absolute Zero (Gel), Wild Rhapsody (attaque de base, équipe). 4 emplacements par héros.
- **Curio Vault** : par niveau Team ATK +2, HP +20, All DEF +0,4 ; niv. 400 → DMG Boost +12 %, DMG Immunity +12 %.
- **Pièges** : Iron Fist (Stun), Blood Hammer, Molten Furnace (Burn), Lethal Fence (Paralyze), Demon Spike ; verrouillés : Doomsday Cyborg, Calamity Altar, Metarooster (50 fragments). 3 déployés max.
- **Bêtes** : Titan Mammoth, Dreamweaver Spider, Colossal Ape, Alien Critter ; verrouillées : Wings of Death, Cyanic Tyrant, Scavenger Kraken, Storm Griffin. 2 places, 3e à **Main Stage 220**.
- **Ressources** : Diamants, Or, Stamina (viande), Leather (amélioration Gear), Soul Flame (orbe violet), Hero Pact. Tirage ×10 = 2 200 diamants.
- **Modes** : Main Stage, AFK, Infinity Fort, **Infinity Train** (arrêts « Stop N », 10 tentatives de récompense + 10 d'étape par jour, Sweep, Exchange Shop, récompenses vagues 1-5), Dimension Link, Capital Defense, Phantom Killzone (12-14 h), Arena, événements.
- **Passes** : **Value Pass** (300 diamants, vitesse x2, AFK +4 h, Quick Sweeps illimités, Multi-Stamina Sweep ; par jour 10 diamants, 30 Stamina, 100 or) · **Deluxe Pass** 10,99 $ (600 diamants, Battle AFK Mode, Stamina max +20, AFK +30 %, 2e Guild Tech ; par jour 20 diamants, 1 parchemin, 200 or). La vitesse x2 et l'AFK viennent des passes, pas de Privileges.
- **Offres** (écran principal) : Privileges, Ad-Free, Super Value Fund, 1st Top-Up, Midnight Gift, Shadow Recruitment, Link Celebration, Community Offers, Check-In, Featured Events.

## 6. Profil réel de l'utilisateur (dernier import)
Niveau 69 · puissance 1,6 M · Stage 176 · Curio Vault 392 · Gear +171 (Tier 18) · Diamants 352 · Or 16,63 K · Stamina 274 · Leather 5,55 K · Soul Flame 925 · 31 héros (niv. 67-68) · 29 curios (Wild Rhapsody 0/4) · 5 pièges · 4 bêtes.

## 7. Import par capture — état de la lecture (16 vraies captures)
- ✔ Écran Value Pass (souscrit si « Renew » / « Claimable » dans la colonne, non souscrit si « Not Subscribed » / prix ; jours restants si lisibles), écran Infinity Train (arrêt, tentatives du jour → coche la tâche si 0 restante).
- ✔ Noms des 31 héros, niveaux (« Lv.67 » au-dessus du nom), curios possédés (les non possédés, grisés, ne sont pas lus), pièges et bêtes (verrous « 0/50 »), écran principal (chiffres sans libellé repérés par position), écran Gear, Curio Vault, serveur.
- ✔ **Étoiles des curios** : comptées par couleur (segments dorés sous l'icône) → 29/29 justes. **Niveaux des pièges/bêtes** : relecture en gros plan du coin de carte (chiffres seulement) → 5/5 pièges, 3/4 bêtes.
- ✘ Non lisible : **promotion** (losange vert), noms des 5 héros de l'équipe principale, nom du joueur (absent des écrans reçus : il faut la fiche joueur), Porte/Lit (absents). Niveaux incohérents écartés ; héros sans niveau lu marqués « Niv. à saisir ».
- Durée : ~7 s par capture sur ordinateur (2 passes).

## 8. Limites connues / pistes
- Interface : écran fixe (`body` fixe, `#defile` défile seul) → la barre d'onglets ne bouge plus sur iPhone. Feuilles : action principale en haut à droite + barre fixe en bas ; hauteur = `visualViewport` (clavier iOS) et champ actif recentré.
- L'adresse est sensible à la casse : `zboolbi.github.io/App-knock-Knock-Manager/`. Pour une adresse en minuscules, renommer le dépôt en `app-knock-knock-manager` (Settings › General).
- Installation : bouton « Installer » sur l'accueil (masqué si déjà installée). Android/Chrome : fenêtre native (`beforeinstallprompt`). iPhone : Apple interdit l'installation par une page → étapes Safari guidées + flèche vers Partager ; navigateur intégré (Instagram, Gmail…) ou Chrome iOS → copie de l'adresse pour Safari.
- Lire les étoiles par détection de couleur des icônes (non fait).
- Pas de connexion directe au compte (iOS isole les apps, aucun accès public au jeu).
- Safari iOS non testé automatiquement (WebKit indisponible ici).
- Captures réelles conservées **uniquement en local** (`qa/captures-reelles/`, ignoré par git : dépôt public, une capture montre l'identifiant Apple).

## 9. Historique
| Date | Évolution |
|---|---|
| 04/11 | V1 : PWA 6 onglets (plan, héros, boss, artefacts, ressources, données). |
| 04/11 | V2 : refonte façon Instagram, import OCR (eng+fra), publication GitHub Pages. |
| 04/11 | V3 : refonte Apple noir/blanc/or, import complet du profil, campagne QA 71 cas (10 anomalies corrigées). |
| 04/11 | V8.4 : revue Superpowers : plan complet dépliable sur l'accueil, « Jouer cette équipe » ne déclare plus obtenus des héros non possédés, focus restauré après re-rendu, `piecesAEquiper` partagé (les artefacts hors set restent), jalons lus dans data.js, diamants non renseignés signalés, identifiants nettoyés au chargement (anti-injection), image toujours libérée. QA 103/103. |
| 04/11 | V8.3 : polish front et UX (skills impeccable, web-design-guidelines, ui-ux-pro-max, frontend-ui-engineering) : interrupteurs de nouveau verts une fois activés (régression V8.1), contraste AA partout, pastilles de rareté teintées, 5 héros visibles sur l'accueil, noms non superposés (Stratégie › Boss), libellés non tronqués, pluriels, focus clavier/VoiceOver dans les feuilles, cibles tactiles agrandies. QA 102/102. |
| 04/11 | V8.2 : revue de code (10 corrections) : « Équiper ces sets » ne vide plus un héros sans pièce, moteur OCR toujours remis en lecture normale, plan d'accueil et pastille sur le même calcul (`curiosAChanger`), date locale (routine à minuit), héros joués marqués obtenus, code mort retiré. QA 99/99 (feuilles, routine, déploiements, limite d'équipe, mauvais écran d'équipe). |
| 04/11 | V8.1 : interrupteurs (Je l'ai, Dans mon équipe…) remis à la taille iOS 51×31 (étirés par `.champ input`), QA 92/92. |
| 04/11 | V8 : Stratégie refondue en coaching long terme (Noyau, Curios, Boss, Investir ; « Prochaines étapes » retirée), import de la capture d'équipe, choix d'équipe parmi tous les héros (Archmage, Cannon Girl, Poseidon, Frosthealer…), Cannon Girl ajoutée, QA 91/91. |
| 04/11 | V7.1 : icône d'app « K » (iPhone, Android, favicon). |
| 04/11 | V7 : étoiles des curios et niveaux des pièges/bêtes lus sur l'image, bouton « Enregistrer » fixe dans les résultats, coches non barrées, clavier iOS géré, barre d'onglets fixe, carte joueur lisible (Train/Gear), Porte/Lit inconnus détectés, logo du jeu + fond citrouille, QA 87/87. |
| 04/11 | V6.1 : correction de l'adresse (404) : le chemin GitHub Pages respecte la casse du dépôt → `/App-knock-Knock-Manager/` ; l'app utilise désormais son adresse réelle. |
| 04/11 | V6 : bouton « Installer l'app » adapté à l'appareil (Android natif, iPhone guidé, navigateurs intégrés), QA 84/84. |
| 04/11 | V5 : Value Pass / Deluxe Pass (contenu, gains quotidiens, import de l'écran), Infinity Train (mode, arrêt dans le profil, tâche du jour, import), QA 80/80. Valeurs du joueur non figées dans les tests. |
| 04/11 | V4 : données réelles du jeu (curios et sets, pièges, bêtes, 31 héros, raretés R/SSR/UR/CR), OCR 2 passes, écrans sans libellé, logo original, QA 77/77 avec 16 vraies captures. |
