import { test } from "node:test";
import assert from "node:assert/strict";
import { etatInitial } from "../js/store.js";
import {
  trouverNom, lireNiveau, lirePromotion, lireEtoiles, lireRarete, lireStat, lireNiveauArtefact, analyserTexte, ordonnerParCartes,
} from "../js/capture.js";

const catalogue = etatInitial().catalogue;

test("noms de héros malgré les erreurs de lecture", () => {
  assert.equal(trouverNom("Lazermam", catalogue.heros)?.id, "lazerman");
  assert.equal(trouverNom("POSEID0N", catalogue.heros)?.id, "poseidon");
  assert.equal(trouverNom("Ghost Captaln Lv.40", catalogue.heros)?.id, "ghost-captain");
  assert.equal(trouverNom("Frost healer", catalogue.heros)?.id, "frosthealer");
  assert.equal(trouverNom("Battle", catalogue.heros), null);
  assert.equal(trouverNom("Gold 12500", catalogue.heros), null);
});

test("niveau, promotion, étoiles en anglais et en français", () => {
  assert.equal(lireNiveau("Lv. 45"), 45);
  assert.equal(lireNiveau("LV45"), 45);
  assert.equal(lireNiveau("Level 120"), 120);
  assert.equal(lireNiveau("Niv. 33"), 33);
  assert.equal(lireNiveau("Niveau 7"), 7);
  assert.equal(lirePromotion("Promotion 6"), 6);
  assert.equal(lirePromotion("Rang : 9"), 9);
  assert.equal(lirePromotion("Rank 3"), 3);
  assert.equal(lireEtoiles("5 stars"), 5);
  assert.equal(lireEtoiles("4 étoiles"), 4);
  assert.equal(lireEtoiles("★★★"), 3);
  assert.equal(lireNiveau("ATK 1250"), null);
});

test("rareté et statistiques dans les deux langues", () => {
  assert.equal(lireRarete("Legendary"), "Légendaire");
  assert.equal(lireRarete("Légendaire"), "Légendaire");
  assert.equal(lireRarete("MYTHIC"), "Mythique");
  assert.equal(lireRarete("Épique"), "Épique");
  assert.equal(lireStat("P.ATK +12%"), "patk");
  assert.equal(lireStat("Attaque magique +8 %"), "matk");
  assert.equal(lireStat("Attack Speed +5%"), "vitesse");
  assert.equal(lireStat("Vitesse d'attaque +5 %"), "vitesse");
  assert.equal(lireStat("Crit Rate +4%"), "crit");
  assert.equal(lireStat("PV +300"), "pv");
  assert.equal(lireStat("Burn damage +10%"), "effet");
  assert.equal(lireNiveauArtefact("Ancient Blade +12"), 12);
  assert.equal(lireNiveauArtefact("+15%"), null);
});

test("liste de héros en anglais", () => {
  const texte = `Heroes
Archangel
Lv. 52  Rank 6
Spiker
Lv.48
5 stars
Lazermam
LV 40
Battle`;
  const r = analyserTexte(texte, catalogue);
  const parId = Object.fromEntries(r.heros.map((h) => [h.heroId, h]));
  assert.deepEqual(Object.keys(parId).sort(), ["archangel", "lazerman", "spiker"]);
  assert.equal(parId.archangel.niveau, 52);
  assert.equal(parId.archangel.promotion, 6);
  assert.equal(parId.spiker.niveau, 48);
  assert.equal(parId.spiker.etoiles, 5);
  assert.equal(parId.lazerman.niveau, 40);
  assert.equal(parId.lazerman.promotion, null); // jamais pris au voisin
});

test("fiche héros en français avec artefact et skin", () => {
  const texte = `Frosthealer
Niveau 35
Promotion 3
4 étoiles
Lame ancestrale +7
Légendaire
Attaque physique +12 %
Skin : Reine des glaces`;
  const r = analyserTexte(texte, catalogue);
  assert.equal(r.heros.length, 1);
  assert.deepEqual([r.heros[0].niveau, r.heros[0].promotion, r.heros[0].etoiles], [35, 3, 4]);
  assert.equal(r.artefacts.length, 1);
  assert.equal(r.artefacts[0].nom, "Lame ancestrale");
  assert.equal(r.artefacts[0].stat, "patk");
  assert.equal(r.artefacts[0].rarete, "Légendaire");
  assert.equal(r.artefacts[0].niveau, 7);
  assert.equal(r.skins.length, 1);
  assert.equal(r.skins[0].nom, "Reine des glaces");
  assert.equal(r.skins[0].heroId, "frosthealer");
});

test("artefact déjà au catalogue reconnu par son nom", () => {
  const cat = etatInitial().catalogue;
  cat.artefacts.push({ id: "croc", nom: "Blood Fang", stat: "effet", rarete: "Épique" });
  const r = analyserTexte("Blood Fanq +4\nEpic\nBleed duration +20%", cat);
  assert.equal(r.artefacts[0].ref, "croc");
  assert.equal(r.artefacts[0].niveau, 4);
});

test("texte vide ou sans rapport : aucune proposition", () => {
  const r = analyserTexte("Settings\nMusic ON\nSound OFF", catalogue);
  assert.deepEqual([r.heros.length, r.artefacts.length, r.skins.length], [0, 0, 0]);
});

test("grille de cartes : chaque valeur va au héros de sa colonne", () => {
  // 3 cartes par rangée : noms en haut, niveaux et rangs dessous, 2 rangées.
  const el = (texte, x, y) => ({ texte, x0: x, y0: y, x1: x + 200, y1: y + 40 });
  const elements = [
    el("Archangel", 50, 300), el("Spiker", 450, 300), el("Lazerman", 850, 300),
    el("Lv. 52", 50, 350), el("Lv. 48", 450, 350), el("Lv. 40", 850, 350),
    el("Rank 6", 50, 400), el("5 stars", 450, 400), el("Rank 3", 850, 400),
    el("Poseidon", 50, 700), el("Bright Spirit", 450, 700), el("Ghost Captain", 850, 700),
    el("Lv. 37", 50, 750), el("Lv. 33", 450, 750), el("Lv. 30", 850, 750),
    el("HEROES", 450, 100), el("Battle", 50, 1500),
  ];
  const r = analyserTexte(ordonnerParCartes(elements, catalogue), catalogue);
  const v = Object.fromEntries(r.heros.map((h) => [h.heroId, [h.niveau, h.promotion, h.etoiles]]));
  assert.deepEqual(v.archangel, [52, 6, null]);
  assert.deepEqual(v.spiker, [48, null, 5]);
  assert.deepEqual(v.lazerman, [40, 3, null]);
  assert.deepEqual(v.poseidon, [37, null, null]);
  assert.deepEqual(v["ghost-captain"], [30, null, null]);
});

test("nom de héros coupé sur deux lignes", () => {
  const r = analyserTexte("Ghost\nCaptain\nLv. 30\n3 stars", catalogue);
  assert.deepEqual([r.heros[0]?.heroId, r.heros[0]?.niveau, r.heros[0]?.etoiles], ["ghost-captain", 30, 3]);
  const el = (texte, x, y) => ({ texte, x0: x, y0: y, x1: x + 180, y1: y + 50 });
  const t = ordonnerParCartes([el("Ghost", 1223, 1304), el("Captain", 1223, 1378), el("Lv. 30", 1356, 1472)], catalogue);
  assert.match(t, /^Ghost Captain\nLv\. 30/);
});

test("libellé et valeur sur deux lignes (Power / 125,400)", async () => {
  const { lireProfil } = await import("../js/capture.js");
  const { RESSOURCES } = await import("../js/data.js");
  assert.equal(lireProfil("Power\n125,400\nDiamonds\n2,450", RESSOURCES).profil.puissance, 125400);
});
