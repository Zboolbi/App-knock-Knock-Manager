# Instructions de travail

1. Avant toute tâche, lire **`docs/RECAP.md`** (état de l'app, fichiers, données du jeu, limites) au lieu de relire tout le code. N'ouvrir que les fichiers concernés par la demande.
2. Après chaque évolution, **mettre à jour `docs/RECAP.md`** : sections touchées + une ligne dans « Historique ».
3. Avant de pousser : `npm test` puis `node qa/campagne.cjs passe-N` (doit rester à 100 %).
4. Ne jamais committer de captures réelles du joueur (dépôt public) : elles vont dans `qa/captures-reelles/` (ignoré par git).
5. Interface en français, fond noir, textes blancs, titres dorés, style Apple.
