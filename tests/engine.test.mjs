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
  e.abonnements["deluxe-pass"] = { actif: true, fin: "2026-11-06" };
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

test("passes : gains quotidiens cumulés et suggestion du Deluxe", () => {
  const e = etatInitial();
  e.abonnements["value-pass"] = { actif: true, fin: "2026-11-14" };
  const c = conseilsOffres(e, new Date("2026-11-04"));
  assert.ok(c.some((x) => /chaque jour 10 diamants, 30 Stamina, 100 or/.test(x.texte) && /10 j, soit 100 diamants/.test(x.texte)));
  assert.ok(c.some((x) => /Deluxe Pass non souscrit/.test(x.texte)));
  assert.ok(c.some((x) => /Quick Sweeps/.test(x.texte)));
  e.abonnements["deluxe-pass"] = { actif: true, fin: "2026-11-14" };
  assert.ok(conseilsOffres(e, new Date("2026-11-04")).some((x) => /chaque jour 30 diamants, 30 Stamina, 300 or/.test(x.texte)));
});

test("coaching : postes du noyau, manques et palier commun", async () => {
  const { coachNoyau } = await import("../js/engine.js");
  const e = etatAvec(["cannon-girl", "spiker", "poseidon", "archmage", "pinocchio"], { equipe: ["cannon-girl", "spiker", "poseidon", "archmage", "pinocchio"] });
  e.roster["bright-spirit"] = { possede: true, niveau: 60, promotion: 3 };
  const n = coachNoyau(e);
  assert.equal(n.postes.length, 5);
  assert.equal(n.postes.find((x) => x.poste === "Synergie").hero.id, "spiker");
  assert.equal(n.postes.find((x) => x.poste === "Soutien").hero.id, "archmage");
  assert.equal(n.cible.niveau, 6); // tous en P3 → objectif P6
  assert.equal(n.manques.length, 0);
  const e2 = etatAvec(["cannon-girl", "spiker", "lazerman"], { equipe: ["cannon-girl", "spiker", "lazerman"] });
  e2.roster["bright-spirit"] = { possede: true, niveau: 60 };
  const m = coachNoyau(e2).manques.find((x) => x.poste === "Soutien");
  assert.ok(m && m.candidats.some((h) => h.id === "bright-spirit"));
});

test("coaching : un set de curios différent par héros", async () => {
  const { coachCurios } = await import("../js/engine.js");
  const e = etatAvec(["bride-wraith", "ghost-captain"], { equipe: ["bride-wraith", "ghost-captain"] });
  ["purgatory-oven", "ghost-lighter", "gore-grinder", "rusty-knife"].forEach((r, i) => e.inventaire.push({ id: `c${i}`, ref: r, etoiles: 4 }));
  const plan = coachCurios(e);
  const sets = Object.fromEntries(plan.map((x) => [x.hero.id, x.set]));
  assert.equal(sets["bride-wraith"], "sky-scorch");
  assert.equal(sets["ghost-captain"], "wild-bloodlust");
  assert.equal(new Set(Object.values(sets)).size, 2);
  assert.ok(plan[0].pieces.some((p) => !p.possede)); // pièces manquantes signalées
});

test("coaching : boss, diamants et jalons", async () => {
  const { coachBoss, coachDiamants, coachJalons } = await import("../js/engine.js");
  const e = etatAvec(["cannon-girl", "poseidon", "archangel", "frosthealer", "spiker", "lazerman", "bride-wraith"]);
  const b = coachBoss(e);
  assert.equal(b.length, 6);
  const physique = b.find((x) => /résiste au physique/.test(x.nom));
  assert.ok(physique.heros[0].type === "magique");
  e.stock.diamants = 1200; e.abonnements["value-pass"] = { actif: true, fin: "2026-12-30" };
  const d = coachDiamants(e, new Date("2026-11-04"));
  assert.deepEqual([d.tirages, d.manque, d.parJour, d.jours], [0, 1000, 10, 100]);
  e.joueur.coffreCurios = 392; e.joueur.etape = "176";
  const j = coachJalons(e).map((x) => x.titre);
  assert.ok(j.some((t) => /Curio Vault 392 → 400/.test(t)) && j.some((t) => /Main Stage 176 → 220/.test(t)));
});

test("curios à changer : même calcul pour le plan et la pastille, à zéro une fois les sets portés", async () => {
  const { curiosAChanger } = await import("../js/engine.js");
  const e = etatAvec(["bride-wraith", "ghost-captain"], { equipe: ["bride-wraith", "ghost-captain"] });
  ["purgatory-oven", "ghost-lighter", "gore-grinder", "rusty-knife"].forEach((r, i) => e.inventaire.push({ id: `c${i}`, ref: r, etoiles: 2 }));
  assert.equal(curiosAChanger(e).length, 2);
  assert.ok(planProgression(e).some((x) => /2 héros avec de meilleurs curios/.test(x.titre) && /Équiper ces sets/.test(x.detail)));
  e.roster["bride-wraith"].artefacts = ["c0", "c1"];
  e.roster["ghost-captain"].artefacts = ["c2", "c3"];
  assert.equal(curiosAChanger(e).length, 0);
  assert.ok(!planProgression(e).some((x) => /meilleurs curios/.test(x.titre)));
});

test("pluriel : 0 et 1 au singulier, nombres bruts", async () => {
  const { pluriel } = await import("../js/engine.js");
  assert.equal(pluriel(0, "tirage"), "0 tirage");
  assert.equal(pluriel(1, "place libre", "places libres"), "1 place libre");
  assert.equal(pluriel(1000, "tirage"), "1000 tirages");
});

test("pièces à équiper : du plus rare au moins rare, limitées aux emplacements", async () => {
  const { piecesAEquiper } = await import("../js/engine.js");
  const e = etatAvec(["bride-wraith"]);
  e.joueur.emplacements = 2;
  ["ghost-lighter", "purgatory-oven", "dynamite-battery"].forEach((r, i) => e.inventaire.push({ id: `p${i}`, ref: r, etoiles: 1 }));
  assert.deepEqual(piecesAEquiper(e, "sky-scorch"), ["p1", "p2"]); // CR puis UR
  assert.deepEqual(piecesAEquiper(e, "wild-bloodlust"), []);
});

test("sauvegarde modifiée : les identifiants ne peuvent pas contenir de balisage", () => {
  const e = etatInitial();
  e.roster['x"><img src=x onerror=alert(1)>'] = { possede: true };
  e.equipe = ['x"><img src=x onerror=alert(1)>'];
  e.catalogue.heros.push({ id: 'h"><b>', nom: "Piège", rarete: "R" });
  const f = fusionner(JSON.parse(JSON.stringify(e)));
  const ids = [...Object.keys(f.roster), ...f.equipe, ...f.catalogue.heros.map((h) => h.id)];
  assert.ok(ids.every((id) => /^[\w-]*$/.test(id)), ids.join(" "));
});
