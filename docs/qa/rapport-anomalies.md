# Rapport d'anomalies — Knock Knock Manager

Référentiel : `docs/qa/cahier-des-tests.md`.
Passe 1 : 63 cas réussis sur 69 (`resultats-passe-1.json`), plus la revue visuelle des captures d'écran.
Passe 2, après corrections : 71 sur 71, dont 2 cas ajoutés pour couvrir les corrections (`resultats-passe-2.json`).

Gravité : **B** bloquant · **M** majeur · **m** mineur · **c** cosmétique.
Origine : **A** défaut de l'application · **T** défaut du script de test.

| ID | Cas | Grav. | Orig. | Constat | Cause | Correction | État |
|---|---|---|---|---|---|---|---|
| AN-01 | IMP-01 | M | A | La puissance (« Power » / « 125,400 ») n'est pas lue sur la capture du profil anglais. | Le libellé et la valeur sont lus sur deux lignes séparées (alignés de part et d'autre de la carte), et la règle attendait les deux sur la même ligne. | Si la ligne ne contient que le libellé, la valeur est prise à la ligne suivante, à condition que ce soit bien un nombre. Test unitaire ajouté. | Corrigé |
| AN-02 | IMP-03, IMP-05 | M | A | Ghost Captain n'est pas reconnu dans la grille de héros, ce qui fait 6 héros au lieu de 7 à l'import multiple. | La carte est étroite : le nom passe sur deux lignes (« Ghost », puis « Captain »), et aucune des deux moitiés ne ressemble à un héros. | Les deux morceaux d'un nom coupé sont recollés : par la position dans l'image (même colonne, ligne juste en dessous) et dans la lecture ligne par ligne. Test unitaire ajouté. | Corrigé |
| AN-03 | UI-04 | m | A | Les cases « code utilisé » de la Boutique n'offrent qu'une zone tactile de 24 × 24 px. | La case n'était pas reliée à son libellé. | Toute la ligne (case et texte) est maintenant touchable (≥ 44 px) ; un code coché affiche « Utilisé ». | Corrigé |
| AN-04 | Revue visuelle | c | A | Dans les listes de choix (artefact, skin, porteur), la flèche apparaissait au milieu de la ligne. | Le style natif était inversé pour aligner le texte à droite. | Liste de choix restylée façon iOS : valeur alignée à droite, chevron discret en bout de ligne. | Corrigé |
| AN-05 | Revue visuelle | m | A | Certains conseils renvoyaient vers un onglet « Profil » qui n'existe plus (« Ajoutez-la dans Profil », « Profil › touchez un héros »). | Libellés hérités de la version précédente. | Libellés mis à jour (Héros › Équipe, Héros › Collection, import de capture). | Corrigé |
| AN-06 | Revue métier | m | A | Après un import, l'« Équipe proposée » s'affichait sans moyen de l'adopter directement. | Il manquait une action sur cette étape. | Bouton « Utiliser » sur l'étape : l'équipe est enregistrée en un geste. Nouveau cas STR-08. | Corrigé |
| AN-07 | Revue visuelle (iPhone SE) | c | A | Sur un écran de 320 px, la tuile « Puissance » se retrouvait seule sur sa ligne. | La grille passait à 2 colonnes pour 3 tuiles. | La grille reste sur 3 colonnes, avec un texte plus petit sur les écrans étroits. | Corrigé |
| AN-08 | Revue visuelle | c | A | Fiche boss : « Laissez sur le banc les héros Physique. » | Le nom de la catégorie était inséré tel quel, avec une majuscule et sans accord. | « Laissez sur le banc les héros physiques : le boss y résiste. » Nouveau cas BOS-06. | Corrigé |
| AN-09 | IMP-08 | — | T | Le test plantait (« Cannot access 'caches' before initialization »). | Dans le script, une variable locale portait le même nom que l'objet du navigateur. | Variable renommée. Le test passe : aucune image ni texte lu n'est conservé. | Corrigé (test) |
| AN-10 | IMP-10 | — | T | Le blocage du moteur de lecture n'était pas pris en compte : 14 infos lues quand même. | Le service worker récupérait les fichiers sans passer par l'interception du test. | Le test désactive le service worker pour ce cas. L'app affiche bien « Import impossible » avec une explication. | Corrigé (test) |

## Anomalies trouvées et corrigées pendant le développement (avant la passe 1)

| ID | Constat | Correction |
|---|---|---|
| DEV-01 | Page autonome (une seule page) cassée : deux modules déclaraient tous deux une constante `DIACR`. | Renommage, et le build refuse désormais toute collision de noms. |
| DEV-02 | Le texte blanc sur cartes colorées (rouge, violet) était mal lu. | Traitement d'image : sur fond sombre, seuls les textes clairs sont gardés (canal médian) avec un seuil doux ; les textes jaunes sont conservés. |
| DEV-03 | Sur un écran en grille, les niveaux étaient attribués au mauvais héros. | Chaque valeur est rattachée à la carte du héros située au-dessus d'elle, dans la même colonne. |
| DEV-04 | La feuille d'édition rejouait son animation d'ouverture à chaque modification. | Le contenu est mis à jour sur place. |

## Risques résiduels (non corrigeables ici)

| ID | Risque | Pourquoi | Mesure proposée |
|---|---|---|---|
| R-01 | Lecture des **vraies** captures du jeu | Les tests utilisent des captures qui imitent le jeu. Les polices, icônes et positions réelles peuvent différer, par exemple des ressources affichées en icône sans libellé texte. | Fournir 4 à 6 vraies captures (profil, écran principal, collection, fiche de héros, artefact, guilde) pour ajuster les règles. |
| R-02 | Safari iOS non testé automatiquement | WebKit n'est pas disponible dans l'environnement de test. | Contrôle manuel sur iPhone (§ 6 du cahier). |
| R-03 | Catalogue incomplet | Aucune source publique ne liste tous les héros (~100), artefacts, skins et boss. | Catalogue modifiable ; chaque ajout est reconnu aux imports suivants. |
| R-04 | Types d'attaque des héros supposés | Les guides donnent rarement le type physique ou magique, alors qu'il sert à répartir les artefacts. | Badge « à vérifier » ; correction en deux touches dans la fiche du héros. |

## V4 — données réelles du jeu (passes 3 et 4)

Passe 3 : 74/77. Passe 4 : **77/77**. Les nouveaux cas couvrent les curios (CUR-01, CUR-02), les pièges et bêtes (CMP-01, CMP-02), le logo (LOGO-01) et l'import des **16 vraies captures** (REEL-01, exécuté seulement là où les captures sont présentes en local).

| ID | Constat | Cause | Correction | État |
|---|---|---|---|---|
| AN-11 | Les noms des héros (texte orange, violet ou rouge) n'étaient pas lus. | Le traitement d'image ne gardait que les textes blancs et jaunes. | Deuxième passe de lecture qui garde les textes de couleur vive ; les résultats des deux passes sont fusionnés. | Corrigé |
| AN-12 | Aucun niveau n'était rattaché sur les écrans du jeu. | Dans le jeu, la valeur est au-dessus du nom ; de plus, les doublons des deux passes faussaient la largeur de carte (2 px). | Détection automatique du sens de lecture ; doublons ignorés ; valeurs classées par proximité. | Corrigé |
| AN-13 | Écran principal : Diamants, Or et Stamina lus en double ou décalés. | Ces chiffres n'ont pas de libellé, et les deux passes les rendaient en double. | Repérage par position et dédoublonnage. | Corrigé |
| AN-14 | « Clear Main Stage 220 » était pris pour l'étape du joueur. | Condition de déblocage d'une bête. | Les écrans de conditions sont ignorés pour l'étape. | Corrigé |
| AN-15 | « Lv.675 » ou « Lv.6 » lus pour 67. | Bruit de lecture. | Un niveau incohérent avec le reste de l'import est écarté et signalé « à vérifier ». | Corrigé |
| AN-16 | « Or » suivi du montant à la ligne suivante n'était plus lu (régression). | Règle anti-faux positifs trop stricte. | Mot seul sur sa ligne accepté. Test unitaire ajouté. | Corrigé |
| AN-17 | Chiffre de promotion (losange vert) lu de façon erratique. | Chiffre isolé sur un dessin. | Plus proposé (mieux vaut vide que faux). | Contourné |
| AN-18 | Cas de test ART-01 et IMP-04 en échec. | Script resté sur l'ancienne interface (bouton déplacé, raretés renommées). | Script mis à jour. | Corrigé (test) |


## Revue de code V8.2 (04/11)
| # | Gravité | Anomalie | Correction |
|---|---|---|---|
| RC-01 | Majeure | « Équiper ces sets » vidait les curios d'un héros dont le set conseillé n'avait aucune pièce possédée | Héros ignoré s'il n'a aucune pièce du set (STR-11) |
| RC-02 | Majeure | Erreur pendant une relecture en gros plan : le moteur OCR restait en « chiffres seulement » | `try/finally` dans `relireNiveau` et `lireEquipe` |
| RC-03 | Mineure | Accueil : « N héros avec de meilleurs curios » restait affiché après avoir équipé les sets | Plan et pastille sur `curiosAChanger` |
| RC-04 | Mineure | Routine remise à zéro à 1-2 h du matin (date UTC) | Date locale (ROU-01) |
| RC-05 | Mineure | Héros d'une équipe appliquée par bouton restés « non obtenus » | `definirEquipe` (STR-12) |
| RC-06 | Mineure | Texte « les étoiles ne se lisent pas » obsolète | Texte corrigé |
| RC-07..10 | Code | Code mort, calculs répétés à chaque rendu, boucle inutile | Nettoyés |
