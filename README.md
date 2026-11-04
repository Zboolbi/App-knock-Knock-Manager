# Knock Knock Manager

Application compagnon **non officielle** pour *Knock Knock: Room Defense* (iOS / Android).
Elle aide à faire progresser un profil vite : plan d'action priorisé, équipe à composer contre chaque boss,
répartition des artefacts et ordre de dépense des ressources.

C'est une **PWA** : une page web installable sur l'écran d'accueil du téléphone, qui marche hors ligne.
Aucune dépendance, aucun serveur, aucun compte : le profil reste sur l'appareil (export/import JSON).

**Installer sur l'iPhone :** ouvrez https://zboolbi.github.io/App-knock-Knock-Manager/ dans Safari,
puis Partager › « Sur l'écran d'accueil ».

## Les 5 onglets

Style Apple (listes groupées, grands titres, feuilles modales), fond noir, textes blancs, titres dorés.

| Onglet | Contenu |
|---|---|
| **Accueil** | Tableau de bord : carte du joueur (pseudo, niveau, guilde, VIP, ID, étape, Porte / Lit, puissance), bouton **Importer**, ressources (Diamants, Or, Soul Flame, Hero Pact, Leather, Stamina, tirages de 10 possibles), équipe, « À faire maintenant », routine du jour. Réglages par l'icône en haut à droite. |
| **Héros** | Contrôle segmenté **Équipe** (5 places, analyse, équipes de référence) · **Collection** (par rareté, recherche, « Les miens ») · **Artefacts** (inventaire, porteur) · **Skins**. Chaque héros : obtenu, niveau, promotion, étoiles, artefacts, skin, fiche. |
| **Stratégie** | Recalculée à chaque modification : prochaines étapes, analyse d'équipe, configuration optimale des artefacts (« Tout appliquer »), promotions, ressources, skins, options payantes, modes de jeu, astuces. |
| **Boss** | Forces, faiblesses, résistances, spécificités, équipe conseillée argumentée, meilleurs héros par faiblesse, artefacts du combat. |
| **Boutique** | Options payantes souscrites (dates de fin), codes cadeaux. |

## Lancer en local

```bash
npm start            # ou : python3 -m http.server 8080  → http://localhost:8080
npm test             # tests du moteur
python3 outils/build.py   # dist/ : page unique + archive PWA
```

## Installer sur l'iPhone (en dur, hors ligne)

Une app web s'installe sur iOS depuis Safari quand elle est servie en HTTPS :

1. Ce dépôt se publie tout seul sur GitHub Pages à chaque push sur `main` (`.github/workflows/pages.yml`).
2. Ouvrez https://zboolbi.github.io/App-knock-Knock-Manager/ dans **Safari** › Partager › **Sur l'écran d'accueil**.
3. L'app s'ouvre en plein écran, avec son icône, et marche hors ligne après la première ouverture.

Une app native de l'App Store demanderait un Mac avec Xcode et un compte développeur Apple
(par exemple en emballant ce dossier avec Capacitor).

## Import par capture d'écran

Accueil › **Importer** : choisissez des captures du jeu (profil, écran principal, collection,
fiche d'un héros, artefacts, skins). Tout ce qui est lisible remplit le profil : pseudo, ID,
niveau, guilde, puissance, VIP, étape, Porte, Lit, Room Research, ressources, héros, artefacts,
skins. **Les captures ne sont pas conservées** : seules les infos validées sont enregistrées. L'app lit le texte **en anglais ou en
français** avec Tesseract.js, embarqué dans `vendor/tesseract/` (environ 12 Mo, chargé seulement à
la première utilisation puis gardé en cache, donc hors ligne ensuite). Rien n'est envoyé : la
lecture se fait sur le téléphone.

- Préparation de l'image (`js/ocr.js`) : agrandissement, puis sur fond sombre seuls les textes
  clairs (blanc, jaune) sont gardés, pour que les cartes colorées ne gênent pas.
- Analyse (`js/capture.js`, testée) : noms de héros reconnus malgré les erreurs de lecture,
  niveau (« Lv. 45 », « Niv. 45 »), promotion (« Rank 6 », « Rang 6 »), étoiles, rareté et
  statistiques d'artefacts dans les deux langues, skins. Sur un écran en grille, chaque valeur est
  rattachée à la carte du héros au-dessus d'elle.
- Tout est proposé à vérifier avant l'enregistrement.

## Connexion au compte du jeu

Impossible : le jeu n'a ni site de compte, ni export, ni API publique. Lire son trafic réseau ou ses
fichiers enfreindrait ses conditions d'utilisation. Le profil se remplit donc à la main.

## Comment les recommandations sont calculées

`js/engine.js`, fonctions pures testées (`npm test`) :

- **Score d'un héros contre un ennemi** = tier + investissement (niveau, promotion, étoiles)
  + 12 par faiblesse touchée (type d'attaque ou effet) − 15 par résistance
  + bonus de rôle selon les traits (zone contre les vagues, mono-cible et amplificateur contre les gros PV,
  effets sur la durée contre la régénération, soin contre un boss qui frappe fort, gel contre un ennemi rapide…).
- **Équipe** : le meilleur score, puis les rôles nécessaires (zone, amplificateur, soin) parmi les héros
  auxquels le boss ne résiste pas, puis les meilleurs scores restants avec un bonus de synergie d'effet
  (ex. Pyro Mech + héros Brûlure).
- **Artefacts** : adéquation stat ↔ héros (P.ATK → physique, M.ATK → magique, soin → soigneur,
  durée des effets → héros à effet, critique → mono-cible…) × rareté × niveau, carries prioritaires,
  en respectant le nombre d'emplacements par héros.
- **Plan** : équilibre Porte / Lit, 5 héros principaux, promotions 6 puis 9, maillon faible à rattraper,
  héros hors équipe à ne plus nourrir, artefacts sans porteur.

Ce sont des heuristiques qui classent les choix ; elles ne reproduisent pas les formules du jeu.

## Sources et limites des données

Les tiers, équipes et règles (5 héros principaux, promotions 6 et 9, Porte qui plafonne le Lit,
P.ATK/M.ATK, faiblesses sur l'écran d'avant combat) viennent de guides communautaires de 2026 :
ProGameGeek et TreyExGaming. Les guides ne se recoupent pas toujours.

**Le type d'attaque, l'effet et le rôle de la plupart des héros sont supposés** et portent le badge
« à vérifier » : corrigez-les dans l'onglet Héros. Les ennemis fournis sont des *modèles* ; ajoutez
les vrais boss de vos chapitres. Les conseils de dépense des gemmes, tickets et énergie sont des règles
générales de jeu à invocation.

Les données de départ sont dans `js/data.js`.

Aucune liste publique complète n'a été trouvée pour les **artefacts**, les **skins** et les **boss** :
le catalogue démarre avec des artefacts génériques (un par statistique), aucun skin et des boss
« modèles » par archétype. Les **options payantes** viennent des fiches App Store / Google Play
et d'avis de joueurs ; seuls deux prix sont publiés (packs 0,99 $ et 2,99 $).
Les paliers de promotion (P3 énergie, P6 et P9 amélioration du héros, P12 vitesse d'attaque,
P15 dégâts finaux) viennent de ProGameGeek.

## Qualité

Cahier des charges de test, résultats des passes, rapport d'anomalies et diagnostic : `docs/qa/`.
`node qa/campagne.cjs <passe>` rejoue les 71 cas dans Chromium (émulation iPhone).
