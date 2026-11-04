import { test } from "node:test";
import assert from "node:assert/strict";
import { HEROS_DEPART } from "../js/data.js";
import {
  scoreContre, composerEquipe, attribuerArtefacts, statsIdeales, planProgression, conseilsCombat, herosPrincipaux,
  configurationArtefacts, analyseEquipe, prochainPalier, conseilsSkins, conseilsOffres, puissance,
} from "../js/engine.js";
import { etatInitial, fusionner } from "../js/store.js";

const hero = (id) => HEROS_DEPART.find((h) => h.id === id);
function etatAvec(ids, extra = {}) {
  const e = etatInitial();
  for (const id of ids) e.roster[id] = { possede: true, niveau: 30, promotion: 3, etoiles: 2, artefacts: [] };
  return Object.assign(e, extra);
}

test("faiblesse : score en hausse, résistance : en baisse", () => {
  const pk = hero("poison-knight");
  const neutre = scoreContre(pk, { faiblesses: [], resistances: [], traits: [] }, {}).score;
  assert.ok(scoreContre(pk, { faiblesses: ["poison"], resistances: [], traits: [] }, {}).score > neutre);
  assert.ok(scoreContre(pk, { faiblesses: [], resistances: ["poison"], traits: [] }, {}).score < neutre);
});

test("vagues : un héros de zone et un soigneur, 5 héros distincts", () => {
  const eq = composerEquipe(HEROS_DEPART, { faiblesses: [], resistances: [], traits: ["sbires"] }, {});
  assert.equal(eq.length, 5);
  assert.ok(eq.some((e) => e.hero.role === "zone"));
  assert.ok(eq.some((e) => e.hero.role === "soin"));
  assert.equal(new Set(eq.map((e) => e.hero.id)).size, 5);
});

test("rôle imposé jamais pris parmi les héros auxquels le boss résiste", () => {
  const eq = composerEquipe(HEROS_DEPART, { faiblesses: ["magique"], resistances: ["physique"], traits: ["pvEleves"] }, {});
  assert.ok(eq.filter((e) => e.pourquoi[0].startsWith("Rôle nécessaire")).every((e) => e.hero.type !== "physique"));
});

test("mes héros seulement", () => {
  const ids = ["poseidon", "frosthealer", "ghost-captain"];
  const eq = composerEquipe(HEROS_DEPART, { faiblesses: [], resistances: [], traits: [] }, etatAvec(ids), { mesHerosSeulement: true });
  assert.deepEqual(eq.map((e) => e.hero.id).sort(), [...ids].sort());
});

test("P.ATK au physique, M.ATK au magique, emplacements respectés", () => {
  const { parHero, inutilises } = attribuerArtefacts([hero("poison-knight"), hero("archangel")], [
    { id: "a", stat: "patk", rarete: "SSR" }, { id: "b", stat: "matk", rarete: "SSR" }, { id: "c", stat: "patk", rarete: "R" },
  ], { emplacements: 1 });
  assert.equal(parHero.get("poison-knight")[0].artefact.id, "a");
  assert.equal(parHero.get("archangel")[0].artefact.id, "b");
  assert.deepEqual(inutilises.map((a) => a.id), ["c"]);
});

test("un soigneur vise d'abord le soin", () => {
  assert.equal(statsIdeales(hero("bright-spirit"))[0].stat, "soin");
});

test("configuration : détecte un artefact mal placé et propose le bon", () => {
  const e = etatAvec(["poison-knight", "archangel"]);
  e.catalogue.artefacts.push({ id: "lame", nom: "Lame", stat: "patk", rarete: "CR" });
  e.inventaire.push({ id: "i1", ref: "lame", niveau: 10 });
  e.roster.archangel.artefacts = ["i1"]; // P.ATK sur un magique
  const conf = configurationArtefacts(e, [hero("poison-knight"), hero("archangel")]);
  const pk = conf.lignes.find((l) => l.hero.id === "poison-knight");
  assert.equal(pk.optimaux[0].id, "i1");
  assert.equal(conf.aChanger, 2);
});

test("analyse d'équipe : signale l'absence de soigneur", () => {
  const e = etatAvec(["poison-knight", "lazerman", "poseidon"], { equipe: ["poison-knight", "lazerman", "poseidon"] });
  const { notes } = analyseEquipe(e);
  assert.ok(notes.some((n) => /soigneur/.test(n.texte)));
  assert.ok(notes.some((n) => /place/.test(n.texte)));
});

test("paliers de promotion", () => {
  assert.equal(prochainPalier(0).niveau, 3);
  assert.equal(prochainPalier(6).niveau, 9);
  assert.equal(prochainPalier(15), null);
});

test("plan : Porte d'abord, puis promotion vers 6", () => {
  const e = etatAvec(["poseidon", "spiker"]);
  e.joueur.porte = 4; e.joueur.lit = 4;
  const plan = planProgression(e);
  assert.match(plan[0].titre, /Porte/);
  assert.ok(plan.some((x) => /promotion 3 → 6/.test(x.titre)));
});

test("plan sans héros : demande d'ajouter ses héros", () => {
  assert.ok(planProgression(etatInitial()).some((x) => /Ajoutez vos héros/.test(x.titre)));
});

test("héros principaux : 5 possédés au plus", () => {
  const ids = HEROS_DEPART.slice(0, 9).map((h) => h.id);
  const coeur = herosPrincipaux(HEROS_DEPART, etatAvec(ids));
  assert.equal(coeur.length, 5);
  assert.ok(coeur.every((h) => ids.includes(h.id)));
});

test("skin à bonus : compte dans la puissance et est suggéré", () => {
  const e = etatAvec(["lazerman"], { equipe: ["lazerman"] });
  e.catalogue.skins.push({ id: "s1", nom: "Doré", heroId: "lazerman", bonusStat: "matk", bonusValeur: "10" });
  e.skinsPossedes.s1 = true;
  assert.equal(conseilsSkins(e).length, 1);
  const avant = puissance(hero("lazerman"), e);
  e.roster.lazerman.skin = "s1";
  assert.ok(puissance(hero("lazerman"), e) > avant);
  assert.equal(conseilsSkins(e).length, 0);
});

test("options payantes : conseils auto et alerte d'expiration", () => {
  const e = etatInitial();
  e.abonnements.abonnement = { actif: true, fin: "2026-11-06" };
  const c = conseilsOffres(e, new Date("2026-11-04"));
  assert.ok(c.some((x) => /auto/.test(x.texte)));
  assert.ok(c.some((x) => /expire dans 2 j/.test(x.texte)));
  assert.ok(conseilsOffres(etatInitial()).some((x) => /Aucune option/.test(x.texte)));
});

test("migration v1 → v2 : héros, boss et artefacts conservés", () => {
  const v1 = { version: 1, joueur: { pseudo: "Art", porte: 3 }, heros: HEROS_DEPART.slice(0, 2), roster: { archangel: { possede: true } },
    ennemis: [{ id: "b1", nom: "Boss 7", faiblesses: ["gel"], resistances: [], traits: [] }],
    artefacts: [{ id: "a1", nom: "Lame", stat: "patk", rarete: "Rare", niveau: 2 }] };
  const e = fusionner(v1);
  assert.equal(e.version, 2);
  assert.equal(e.joueur.pseudo, "Art");
  assert.ok(e.catalogue.boss.some((b) => b.nom === "Boss 7"));
  assert.equal(e.inventaire[0].id, "a1");
  assert.ok(e.catalogue.heros.length >= HEROS_DEPART.length); // héros de départ manquants rajoutés
});

test("une entrée de départ supprimée ne revient pas", () => {
  const e = etatInitial();
  e.catalogue.heros = e.catalogue.heros.filter((h) => h.id !== "joker");
  e.supprimes = ["joker"];
  assert.ok(!fusionner(JSON.parse(JSON.stringify(e))).catalogue.heros.some((h) => h.id === "joker"));
});

test("conseils de combat même sans données", () => {
  assert.equal(conseilsCombat({ faiblesses: [], resistances: [], traits: [] }).length, 1);
});

test("curios : chaque héros reçoit les pièces du set qui lui correspond", async () => {
  const { CURIOS_DEPART } = await import("../js/data.js");
  const e = etatAvec(["bride-wraith", "ghost-captain"]);
  e.joueur.emplacements = 4;
  const ids = ["purgatory-oven", "dynamite-battery", "ghost-lighter", "sacrifice-candle", "gore-grinder", "vampire-broom", "rusty-knife"];
  ids.forEach((id, i) => e.inventaire.push({ id: `c${i}`, ref: id, etoiles: 4 }));
  const conf = configurationArtefacts(e, [hero("bride-wraith"), hero("ghost-captain")]);
  const sets = (l) => new Set(l.optimaux.map((a) => a.set));
  const [bw, gc] = conf.lignes;
  assert.deepEqual([...sets(bw)], ["sky-scorch"]);     // Brûlure
  assert.deepEqual([...sets(gc)], ["wild-bloodlust"]); // Saignement
  assert.equal(bw.optimaux.length, 4);
  assert.ok(CURIOS_DEPART.length === 40);
});

test("plan : Curio Vault 400 et 3e place de bête", () => {
  const e = etatAvec(["spiker"], { equipe: ["spiker"] });
  e.joueur.coffreCurios = 392; e.joueur.etape = "176";
  const plan = planProgression(e);
  assert.ok(plan.some((x) => /Curio Vault : 392 → 400/.test(x.titre)));
  assert.ok(plan.some((x) => /Main Stage 220/.test(x.titre)));
});
