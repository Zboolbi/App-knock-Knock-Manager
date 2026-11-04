# Room Defense Coach

Application compagnon **non officielle** pour *Knock Knock: Room Defense* (iOS / Android).
Elle aide à faire progresser un profil vite : plan d'action priorisé, équipe à composer contre chaque boss,
répartition des artefacts et ordre de dépense des ressources.

C'est une **PWA** : une page web installable sur l'écran d'accueil du téléphone, qui marche hors ligne.
Aucune dépendance, aucun serveur, aucun compte : le profil reste sur l'appareil (export/import JSON).

**Installer sur l'iPhone :** ouvrez https://zboolbi.github.io/app-knock-knock-manager/ dans Safari,
puis Partager › « Sur l'écran d'accueil ».

## Les 5 onglets

| Onglet | Contenu |
|---|---|
| **Profil** | Façon profil Instagram : compteurs (héros, artefacts, skins), l'équipe en « stories », grille des héros. Touchez un héros : possédé, niveau, promotion, étoiles (boutons + et −), skin porté, artefacts équipés, fiche (compétences, aura). Sous-onglets Artefacts (inventaire, porteur) et Skins (possédés, bonus). |
| **Stratégie** | Fil mis à jour à chaque modification du profil : analyse de l'équipe (rôles manquants, synergies), configuration optimale des artefacts avec « Appliquer », prochaines étapes, paliers de promotion, skins à équiper, effet des options payantes, où dépenser, routine du jour, équipes de référence. La pastille sur l'onglet compte les héros à rééquiper. |
| **Boss** | Chaque boss avec forces, faiblesses, résistances, traits, spécificités ; l'équipe conseillée et ses raisons, les meilleurs héros par faiblesse, les artefacts pour ce combat, « En faire mon équipe ». |
| **Options payantes** | Les options repérées (abonnement, Value Pass, packs, offres d'événement) : cochez celles souscrites et leur date de fin. La Stratégie s'adapte (combat auto, vitesse x2, passes quotidiens) et prévient avant l'expiration. |
| **Plus** | Installation iPhone, connexion au jeu, sauvegarde (copier-coller ou fichier), catalogue modifiable des héros et artefacts, paliers de promotion. |

Tout est gardé sur l'appareil (stockage du navigateur) et modifiable à la main. Le catalogue
(héros, artefacts, skins, boss, offres) est la « mémoire » de l'app : chaque fiche corrigée ou ajoutée
est conservée, et les nouvelles fiches d'une mise à jour de l'app s'y ajoutent sans écraser les vôtres.

## Lancer en local

```bash

npm start            # ou : python3 -m http.server 8080  → http://localhost:8080
npm test             # tests du moteur
python3 outils/build.py   # dist/ : page unique + archive PWA
```

## Installer sur l'iPhone (en dur, hors ligne)

Une app web s'installe sur iOS depuis Safari quand elle est servie en HTTPS :

1. Ce dépôt se publie tout seul sur GitHub Pages à chaque push sur `main`
   (`.github/workflows/pages.yml`). Réglage à faire une fois : Settings › Pages › Source : **GitHub Actions**.
2. Ouvrez https://zboolbi.github.io/app-knock-knock-manager/ dans **Safari** › Partager › **Sur l'écran d'accueil**.
3. L'app s'ouvre en plein écran, avec son icône, et marche hors ligne après la première ouverture.

Une app native de l'App Store demanderait un Mac avec Xcode et un compte développeur Apple
(par exemple en emballant ce dossier avec Capacitor).

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
