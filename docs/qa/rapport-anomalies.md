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
