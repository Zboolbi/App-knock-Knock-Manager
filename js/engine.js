// Moteur de recommandations : fonctions pures, sans DOM ni stockage.
// Les chiffres sont des heuristiques qui classent les choix ; ce ne sont pas
// les formules du jeu.

import { EFFETS, ROLES, TYPES, STATS_ARTEFACT, RARETES, PALIERS_PROMOTION, AVANTAGES, SETS_CURIO, CURIO_VAULT, PLACES_BETES } from "./data.js";

const POINTS_TIER = { SS: 30, S: 24, A: 18, B: 12, C: 6 };
const EFFETS_DURABLES = ["brulure", "saignement", "poison"];
export const TAILLE_EQUIPE = 5;
/** « 1 place libre », « 2 places libres » : accord en nombre (le français compte 0 et 1 au singulier). */
export const pluriel = (n, un, plusieurs = `${un}s`) => `${n} ${Math.abs(Number(n)) >= 2 ? plusieurs : un}`;

/* ---------- Profil ---------- */

export function progression(etat, id) {
  const p = etat?.roster?.[id] || {};
  return {
    possede: !!p.possede,
    niveau: Number(p.niveau) || 1,
    promotion: Number(p.promotion) || 0,
    etoiles: Number(p.etoiles) || 0,
    skin: p.skin || null,
    artefacts: Array.isArray(p.artefacts) ? p.artefacts : [],
  };
}

export const catalogue = (etat) => etat?.catalogue || {};
export const herosDe = (etat) => catalogue(etat).heros || [];

export function skinEquipe(etat, heroId) {
  const id = progression(etat, heroId).skin;
  return id ? (catalogue(etat).skins || []).find((s) => s.id === id) || null : null;
}

/** Artefacts possédés, complétés par leur fiche du catalogue. */
export function artefactsResolus(etat) {
  const fiches = new Map((catalogue(etat).artefacts || []).map((a) => [a.id, a]));
  return (etat?.inventaire || []).map((i) => {
    const f = fiches.get(i.ref) || {};
    return { id: i.id, ref: i.ref, nom: f.nom || "Curio inconnu", stat: f.stat || "patk", set: f.set || "",
      rarete: f.set ? f.rarete : i.rarete || f.rarete || "R", niveau: Number(i.niveau) || 0, etoiles: Number(i.etoiles) || 0, effet: f.effet || "" };
  });
}

/** Porteur actuel de chaque artefact (id d'artefact → id de héros). */
export function porteurs(etat) {
  const m = new Map();
  for (const [heroId, p] of Object.entries(etat?.roster || {})) for (const a of p.artefacts || []) m.set(a, heroId);
  return m;
}

export function puissance(hero, etat) {
  const p = progression(etat, hero.id);
  let base = POINTS_TIER[hero.tier] ?? 10;
  if (!p.possede) return base;
  base += Math.min(p.niveau, 200) * 0.15 + p.promotion * 1.5 + p.etoiles * 2;
  const skin = skinEquipe(etat, hero.id);
  if (skin && Number(skin.bonusValeur)) base += Number(skin.bonusValeur) * 0.3;
  return base;
}

/* ---------- Combat ---------- */

export function scoreContre(hero, ennemi, etat) {
  const raisons = [];
  let score = puissance(hero, etat);
  const faibles = ennemi?.faiblesses || [];
  const resiste = ennemi?.resistances || [];
  const traits = ennemi?.traits || [];
  const bonus = (cond, points, texte) => { if (cond) { score += points; raisons.push(`${points >= 0 ? "+" : "−"} ${texte}`); } };

  bonus(faibles.includes(hero.type), 12, `${TYPES[hero.type]} : faiblesse du boss`);
  bonus(hero.effet !== "aucun" && faibles.includes(hero.effet), 12, `${EFFETS[hero.effet]} : faiblesse du boss`);
  bonus(resiste.includes(hero.type), -15, `${TYPES[hero.type]} : le boss y résiste`);
  bonus(hero.effet !== "aucun" && resiste.includes(hero.effet), -15, `${EFFETS[hero.effet]} : le boss y résiste`);

  if (traits.includes("sbires")) {
    bonus(hero.role === "zone", 10, "dégâts de zone contre les vagues");
    bonus(hero.role === "polyvalent", 5, "polyvalent, nettoie aussi les vagues");
    bonus(hero.role === "mono", -4, "mono-cible, lent sur les sbires");
  }
  if (traits.includes("pvEleves")) {
    bonus(hero.role === "mono", 8, "mono-cible contre une grosse réserve de PV");
    bonus(hero.role === "amplificateur", 10, "amplifie les dégâts de l'équipe sur le boss");
    bonus(EFFETS_DURABLES.includes(hero.effet), 5, "dégâts sur la durée, rentables sur un long combat");
  }
  if (traits.includes("regen")) {
    bonus(EFFETS_DURABLES.includes(hero.effet), 6, "pression constante contre la régénération");
    bonus(hero.role === "mono" || hero.role === "amplificateur", 4, "concentre les dégâts pour dépasser son soin");
  }
  if (traits.includes("frappeFort")) {
    bonus(hero.role === "soin", 10, "soigne la Porte contre les gros coups");
    bonus(hero.effet === "gel" || hero.effet === "paralysie" || hero.role === "controle", 6, "ralentit le boss, moins de coups reçus");
  }
  if (traits.includes("rapide")) {
    bonus(hero.effet === "gel" || hero.effet === "paralysie" || hero.role === "controle", 8, "ralentit un ennemi rapide");
    bonus(hero.role === "zone", 4, "touche plusieurs cibles qui arrivent vite");
  }
  if (traits.includes("armure")) {
    bonus(hero.effet === "poison" || hero.effet === "saignement", 5, "dégâts sur la durée, moins gênés par l'armure");
  }
  return { score: Math.round(score * 10) / 10, raisons };
}

export function classerContre(heros, ennemi, etat, { mesHerosSeulement = false } = {}) {
  return heros
    .filter((h) => !mesHerosSeulement || progression(etat, h.id).possede)
    .map((h) => ({ hero: h, ...scoreContre(h, ennemi, etat) }))
    .sort((a, b) => b.score - a.score);
}

export function besoins(ennemi) {
  const t = ennemi?.traits || [];
  const b = [];
  if (t.includes("sbires")) b.push("zone");
  if (t.includes("pvEleves") || t.includes("regen")) b.push("amplificateur");
  b.push("soin");
  return b;
}

function synergie(candidat, equipe) {
  if (candidat.effet === "aucun") return 0;
  let s = 0;
  for (const m of equipe) {
    if (m.effet !== candidat.effet) continue;
    s += m.role === "amplificateur" || candidat.role === "amplificateur" ? 6 : 2;
  }
  return s;
}

export function composerEquipe(heros, ennemi, etat, { taille = TAILLE_EQUIPE, mesHerosSeulement = false } = {}) {
  const classes = classerContre(heros, ennemi, etat, { mesHerosSeulement });
  const resiste = ennemi?.resistances || [];
  const equipe = [];
  const pourquoi = new Map();
  const prendre = (e, motif) => { equipe.push(e.hero); pourquoi.set(e.hero.id, [motif, ...e.raisons]); };

  if (classes.length) prendre(classes[0], "Meilleur score contre ce boss");
  for (const role of besoins(ennemi)) {
    if (equipe.length >= taille) break;
    if (equipe.some((h) => h.role === role)) continue;
    const c = classes.find((e) => e.hero.role === role && !equipe.includes(e.hero) && e.score > 0
      && !resiste.includes(e.hero.type) && !resiste.includes(e.hero.effet));
    if (c) prendre(c, `Rôle nécessaire : ${ROLES[role]}`);
  }
  while (equipe.length < taille) {
    let meilleur = null, total = -Infinity;
    for (const e of classes) {
      if (equipe.includes(e.hero)) continue;
      const t = e.score + synergie(e.hero, equipe);
      if (t > total) { meilleur = e; total = t; }
    }
    if (!meilleur) break;
    const syn = synergie(meilleur.hero, equipe);
    prendre(meilleur, syn > 0 ? `Synergie ${EFFETS[meilleur.hero.effet]} (+${syn})` : "Meilleur score restant");
  }
  return equipe.map((h) => ({ hero: h, pourquoi: pourquoi.get(h.id) }));
}

export function conseilsCombat(ennemi) {
  const c = [];
  const f = ennemi?.faiblesses || [], r = ennemi?.resistances || [], t = ennemi?.traits || [];
  const nom = (k) => EFFETS[k] || TYPES[k] || k;
  if (f.length) c.push(`Jouez sur ses faiblesses : ${f.map(nom).join(", ")}.`);
  const PLURIEL = { physique: "physiques", magique: "magiques" };
  if (r.length) c.push(`Laissez sur le banc les héros ${r.map((k) => (PLURIEL[k] || `à ${nom(k)}`).toLowerCase()).join(", ")} : le boss y résiste.`);
  if (r.includes("physique")) c.push("Résiste au physique : artefacts M.ATK sur vos magiques, pas de carry physique.");
  if (r.includes("magique")) c.push("Résiste au magique : misez sur vos physiques avec des artefacts P.ATK.");
  if (t.includes("sbires")) c.push("Vagues : au moins un héros de zone (Poseidon perce les rangs).");
  if (t.includes("pvEleves")) c.push("Gros PV : un amplificateur (Spiker) avec un carry mono-cible ; gardez les ultimes pour quand il est seul.");
  if (t.includes("regen")) c.push("Régénération : Brûlure, Poison ou Saignement en continu, et tout sur lui.");
  if (t.includes("frappeFort")) c.push("Frappe fort : un soigneur (Frosthealer rend 300 PV à la Porte par attaque) et montez la Porte avant de retenter.");
  if (t.includes("rapide")) c.push("Rapide : le Gel ou la Paralysie le ralentissent.");
  if (t.includes("armure")) c.push("Armure : Poison, Saignement, et Ghost Captain qui réduit la défense physique.");
  if (!c.length) c.push("Renseignez ses faiblesses, résistances et traits (écran d'avant combat).");
  return c;
}

/* ---------- Artefacts ---------- */

const ADEQUATION = {
  patk: (h) => (h.type === "physique" ? 10 : h.type === "inconnu" ? 4 : 0),
  matk: (h) => (h.type === "magique" ? 10 : h.type === "inconnu" ? 4 : 0),
  crit: (h) => ({ mono: 8, zone: 5, polyvalent: 6, amplificateur: 4 }[h.role] ?? 2),
  vitesse: (h) => ({ zone: 7, mono: 6, polyvalent: 6, controle: 6, amplificateur: 5 }[h.role] ?? 4),
  pv: (h) => ({ soin: 6, controle: 5 }[h.role] ?? 3),
  def: (h) => ({ soin: 5, controle: 5 }[h.role] ?? 3),
  soin: (h) => (h.role === "soin" ? 11 : 0),
  effet: (h) => (h.effet !== "aucun" ? 9 : 0),
};

/** Adéquation d'un set de curios à un héros (0 à 10). */
export function adequationSet(setId, hero) {
  const s = SETS_CURIO[setId];
  if (!s) return 0;
  if (s.affinite.effet) return hero.effet === s.affinite.effet ? 10 : 1;
  return s.affinite.roles.includes(hero.role) ? 7 : 3;
}

/** Sets de curios à viser pour un héros, du meilleur au moins bon. */
export function setsIdeaux(hero) {
  return Object.keys(SETS_CURIO).map((id) => ({ id, nom: SETS_CURIO[id].nom, valeur: adequationSet(id, hero) }))
    .sort((a, b) => b.valeur - a.valeur).slice(0, 3);
}

export function statsIdeales(hero) {
  return Object.keys(ADEQUATION)
    .map((s) => ({ stat: s, libelle: STATS_ARTEFACT[s], valeur: ADEQUATION[s](hero) }))
    .filter((x) => x.valeur > 0)
    .sort((a, b) => b.valeur - a.valeur);
}

export function valeurArtefact(artefact, hero) {
  const adequation = artefact.set ? adequationSet(artefact.set, hero) : ADEQUATION[artefact.stat]?.(hero) ?? 0;
  const rang = RARETES.indexOf(artefact.rarete);
  return adequation * (rang < 0 ? 1 : rang + 1) * (1 + (Number(artefact.niveau) || 0) / 20) * (1 + (Number(artefact.etoiles) || 0) / 5);
}

export function attribuerArtefacts(equipe, artefacts, { emplacements = 2 } = {}) {
  const poids = equipe.map((_, i) => (i === 0 ? 1.3 : i < 3 ? 1.1 : 1));
  const pris = new Set();
  const parHero = new Map(equipe.map((h) => [h.id, []]));
  // 1. Les curios vont par set : chaque héros (carry d'abord) prend le set qui
  //    lui convient le mieux parmi les pièces encore libres.
  equipe.forEach((h, i) => {
    const parSet = new Map();
    for (const a of artefacts) if (a.set && !pris.has(a.id)) { if (!parSet.has(a.set)) parSet.set(a.set, []); parSet.get(a.set).push(a); }
    let meilleur = null, total = 0;
    for (const [set, liste] of parSet) {
      const top = liste.sort((x, y) => valeurArtefact(y, h) - valeurArtefact(x, h)).slice(0, emplacements);
      const t = top.reduce((sum, a) => sum + valeurArtefact(a, h), 0) * (adequationSet(set, h) >= 7 ? 1.5 : 1);
      if (t > total) { total = t; meilleur = top; }
    }
    for (const a of meilleur || []) { pris.add(a.id); parHero.get(h.id).push({ artefact: a, valeur: Math.round(valeurArtefact(a, h) * poids[i] * 10) / 10 }); }
  });
  // 2. Les places restantes : meilleure paire (pièce, héros) d'abord.
  const paires = [];
  artefacts.forEach((a) => equipe.forEach((h, i) => {
    const v = valeurArtefact(a, h) * poids[i];
    if (v > 0) paires.push({ a, h, v });
  }));
  paires.sort((x, y) => y.v - x.v);
  for (const { a, h, v } of paires) {
    if (pris.has(a.id) || parHero.get(h.id).length >= emplacements) continue;
    pris.add(a.id);
    parHero.get(h.id).push({ artefact: a, valeur: Math.round(v * 10) / 10 });
  }
  return { parHero, inutilises: artefacts.filter((a) => !pris.has(a.id)) };
}

/** Configuration optimale comparée à ce qui est équipé aujourd'hui. */
export function configurationArtefacts(etat, equipe) {
  const arts = artefactsResolus(etat);
  const parId = new Map(arts.map((a) => [a.id, a]));
  const emplacements = Number(etat?.joueur?.emplacements) || 2;
  const { parHero, inutilises } = attribuerArtefacts(equipe, arts, { emplacements });
  const lignes = equipe.map((h) => {
    const optimaux = parHero.get(h.id).map((x) => x.artefact);
    const actuels = progression(etat, h.id).artefacts.map((id) => parId.get(id)).filter(Boolean);
    const a = new Set(actuels.map((x) => x.id)), o = new Set(optimaux.map((x) => x.id));
    const identique = a.size === o.size && [...a].every((id) => o.has(id));
    const gain = optimaux.reduce((s, x) => s + valeurArtefact(x, h), 0) - actuels.reduce((s, x) => s + valeurArtefact(x, h), 0);
    const ideales = arts.some((x) => x.set) ? setsIdeaux(h).map((x) => ({ libelle: `set ${x.nom}` })) : statsIdeales(h).slice(0, 3);
    return { hero: h, actuels, optimaux, identique, gain: Math.round(gain * 10) / 10, ideales };
  });
  return { lignes, inutilises, aChanger: lignes.filter((l) => !l.identique).length };
}

/* ---------- Équipe ---------- */

export function equipeActuelle(etat) {
  const parId = new Map(herosDe(etat).map((h) => [h.id, h]));
  return (etat?.equipe || []).map((id) => parId.get(id)).filter(Boolean);
}

export function herosPrincipaux(heros, etat) {
  const general = { faiblesses: [], resistances: [], traits: ["sbires", "pvEleves"] };
  return composerEquipe(heros.filter((h) => progression(etat, h.id).possede), general, etat).map((e) => e.hero);
}

/** Forces et manques de l'équipe choisie. */
export function analyseEquipe(etat) {
  const equipe = equipeActuelle(etat);
  const notes = [];
  if (!equipe.length) return { equipe, notes: [{ niveau: "info", texte: "Choisissez vos 5 héros : Héros › Équipe." }], score: 0 };
  const roles = new Set(equipe.map((h) => h.role));
  if (equipe.length < TAILLE_EQUIPE) notes.push({ niveau: "alerte", texte: `${pluriel(TAILLE_EQUIPE - equipe.length, "place libre", "places libres")} dans l'équipe.` });
  if (!roles.has("soin")) notes.push({ niveau: "alerte", texte: "Pas de soigneur : la Porte encaisse tout. Bright Spirit ou Frosthealer." });
  if (!roles.has("zone") && !roles.has("polyvalent")) notes.push({ niveau: "alerte", texte: "Pas de dégâts de zone : les vagues vont atteindre la Porte." });
  if (!roles.has("mono") && !roles.has("amplificateur")) notes.push({ niveau: "alerte", texte: "Pas de spécialiste boss (mono-cible ou amplificateur)." });
  if (roles.has("amplificateur")) notes.push({ niveau: "ok", texte: "Amplificateur présent : bon contre les boss." });
  const effets = {};
  for (const h of equipe) if (h.effet !== "aucun") effets[h.effet] = (effets[h.effet] || 0) + 1;
  for (const [e, n] of Object.entries(effets)) if (n >= 2) notes.push({ niveau: "ok", texte: `${n} héros ${EFFETS[e]} : synergie d'effet.` });
  const types = new Set(equipe.map((h) => h.type));
  if (types.size === 1 && equipe.length >= 3) notes.push({ niveau: "alerte", texte: `Équipe 100 % ${TYPES[[...types][0]]} : un boss qui y résiste vous bloquera.` });
  const nonPossedes = equipe.filter((h) => !progression(etat, h.id).possede);
  if (nonPossedes.length) notes.push({ niveau: "alerte", texte: `Non possédés : ${nonPossedes.map((h) => h.nom).join(", ")}.` });
  const score = Math.round(equipe.reduce((s, h) => s + puissance(h, etat), 0) / equipe.length);
  return { equipe, notes, score };
}

export function prochainPalier(promotion) {
  return PALIERS_PROMOTION.find((p) => p.niveau > (Number(promotion) || 0)) || null;
}

/* ---------- Plan de progression ---------- */

export function planProgression(etat) {
  const heros = herosDe(etat);
  const etapes = [];
  const j = etat?.joueur || {};
  const porte = Number(j.porte) || 0, lit = Number(j.lit) || 0;
  // Porte et Lit à 1 sur un compte avancé : valeurs jamais renseignées (le jeu ne les affiche pas sur l'écran principal).
  const inconnus = (!porte && !lit) || (porte <= 1 && lit <= 1 && (Number(j.niveau) > 15 || parseInt(j.etape, 10) > 20));
  if (inconnus) etapes.push({ priorite: 3, titre: "Renseignez vos niveaux de Porte et de Lit", detail: "Accueil › Modifier : la Porte plafonne le Lit, l'app vous dira lequel monter." });
  else {
    if (lit >= porte) etapes.push({ priorite: 1, titre: `Montez la Porte (${porte} → ${porte + 1})`, detail: "Elle plafonne le Lit : sans elle, le Lit ne progresse plus." });
    else if (porte - lit >= 2) etapes.push({ priorite: 1, titre: `Rattrapez le Lit (${lit} → ${porte})`, detail: "Le Lit fait votre revenu : gardez-le au niveau de la Porte." });
  }

  const equipe = equipeActuelle(etat).filter((h) => progression(etat, h.id).possede);
  const coeur = equipe.length ? equipe : herosPrincipaux(heros, etat);
  if (!coeur.length) {
    etapes.push({ priorite: 1, titre: "Ajoutez vos héros", detail: "Importez une capture de votre collection, ou Héros › Collection › touchez un héros › « Je l'ai »." });
    return etapes;
  }
  if (!equipe.length) etapes.push({ priorite: 2, titre: "Équipe proposée", detail: `${coeur.map((h) => h.nom).join(", ")}.`, action: { libelle: "Utiliser", ids: coeur.map((h) => h.id) } });

  for (const h of coeur) {
    const p = progression(etat, h.id);
    const palier = prochainPalier(p.promotion);
    if (palier && palier.niveau <= 9) etapes.push({ priorite: palier.niveau <= 6 ? 3 : 4, titre: `${h.nom} : promotion ${p.promotion} → ${palier.niveau}`, detail: `Débloque : ${palier.bonus}.` });
  }

  const plusFaible = [...coeur].sort((a, b) => progression(etat, a.id).niveau - progression(etat, b.id).niveau)[0];
  const meilleur = [...coeur].sort((a, b) => progression(etat, b.id).niveau - progression(etat, a.id).niveau)[0];
  const ecart = progression(etat, meilleur.id).niveau - progression(etat, plusFaible.id).niveau;
  if (ecart >= 10) etapes.push({ priorite: 3, titre: `Rattrapez ${plusFaible.nom} (niv. ${progression(etat, plusFaible.id).niveau})`, detail: `${ecart} niveaux de retard sur ${meilleur.nom} : le maillon faible fait tomber l'équipe.` });

  const gaspilles = heros.filter((h) => !coeur.includes(h) && progression(etat, h.id).possede && progression(etat, h.id).niveau > 20);
  if (gaspilles.length) {
    const noms = gaspilles.slice(0, 4).map((h) => h.nom).join(", ") + (gaspilles.length > 4 ? ` et ${gaspilles.length - 4} autres` : "");
    etapes.push({ priorite: 5, titre: `Arrêtez d'investir dans ${gaspilles.length} héros hors équipe`, detail: `${noms} : gardez-les pour les boss qui craignent leurs effets.` });
  }

  const aChanger = curiosAChanger(etat).length;
  if (aChanger) etapes.push({ priorite: 2, titre: `${aChanger} héros avec de meilleurs curios disponibles`, detail: "Stratégie › Curios › « Équiper ces sets »." });

  const coffre = Number(j.coffreCurios) || 0;
  for (const pal of CURIO_VAULT.paliers) {
    if (coffre && coffre < pal.niveau) etapes.push({ priorite: pal.niveau - coffre <= 20 ? 2 : 4, titre: `Curio Vault : ${coffre} → ${pal.niveau} (${pluriel(pal.niveau - coffre, "niveau", "niveaux")})`, detail: `Débloque ${pal.bonus} pour toute l'équipe.` });
  }
  const etape = parseInt(String(j.etape || "").split("-")[0], 10);
  for (const p of PLACES_BETES.filter((x) => x.condition)) {
    const cible = parseInt(p.condition.replace(/\D+/g, ""), 10);
    if (etape && etape < cible) etapes.push({ priorite: cible - etape <= 50 ? 3 : 5, titre: `${p.condition} : ${p.places}e place de bête`, detail: `Encore ${cible - etape} étapes de campagne (vous êtes à l'étape ${etape}).` });
  }
  // Sets de curios presque complets pour l'équipe.
  const possedes = new Set(artefactsResolus(etat).map((a) => a.ref));
  const curios = (catalogue(etat).artefacts || []).filter((a) => a.set);
  for (const h of coeur.slice(0, 3)) {
    const set = setsIdeaux(h)[0];
    if (!set || set.valeur < 7) continue;
    const manquants = curios.filter((a) => a.set === set.id && !possedes.has(a.id));
    const nb = curios.filter((a) => a.set === set.id).length;
    if (manquants.length && manquants.length < nb) etapes.push({ priorite: 4, titre: `${h.nom} : compléter le set ${set.nom}`, detail: `Il manque ${manquants.map((a) => `${a.nom} (${a.rarete})`).join(", ")}.` });
  }
  return etapes.sort((a, b) => a.priorite - b.priorite);
}

/* ---------- Skins ---------- */

export function conseilsSkins(etat) {
  const skins = catalogue(etat).skins || [];
  const possedes = etat?.skinsPossedes || {};
  const c = [];
  for (const h of equipeActuelle(etat)) {
    const dispo = skins.filter((s) => s.heroId === h.id && possedes[s.id]);
    const actuel = skinEquipe(etat, h.id);
    const meilleur = [...dispo].sort((a, b) => (Number(b.bonusValeur) || 0) - (Number(a.bonusValeur) || 0))[0];
    if (meilleur && meilleur.id !== actuel?.id && (Number(meilleur.bonusValeur) || 0) > (Number(actuel?.bonusValeur) || 0)) {
      c.push({ hero: h, skin: meilleur, texte: `Équipez « ${meilleur.nom} » sur ${h.nom}${meilleur.bonusValeur ? ` (+${meilleur.bonusValeur} % ${STATS_ARTEFACT[meilleur.bonusStat] || ""})` : ""}.` });
    }
  }
  return c;
}

/* ---------- Options payantes ---------- */

export function offresActives(etat, aujourdhui = new Date()) {
  const offres = catalogue(etat).offres || [];
  const ab = etat?.abonnements || {};
  return offres.filter((o) => ab[o.id]?.actif).map((o) => {
    const fin = ab[o.id].fin ? new Date(ab[o.id].fin) : null;
    const jours = fin ? Math.ceil((fin - aujourdhui) / 86400000) : null;
    return { ...o, fin: ab[o.id].fin || "", joursRestants: jours };
  });
}

export function conseilsOffres(etat, aujourdhui = new Date()) {
  const actives = offresActives(etat, aujourdhui);
  const av = new Set(actives.flatMap((o) => o.avantages || []));
  const c = [];
  for (const o of actives) {
    if (o.joursRestants !== null && o.joursRestants < 0) c.push({ niveau: "alerte", texte: `${o.nom} a expiré le ${o.fin}. Décochez-la ou renouvelez-la.` });
    else if (o.joursRestants !== null && o.joursRestants <= 3) c.push({ niveau: "alerte", texte: `${o.nom} expire dans ${o.joursRestants} j : récupérez toutes ses récompenses avant.` });
  }
  if (av.has("auto")) c.push({ niveau: "ok", texte: `${AVANTAGES.auto} : farmez en auto l'étape la plus haute battue de façon fiable, plusieurs fois par jour.` });
  if (av.has("vitesse2x")) c.push({ niveau: "ok", texte: `${AVANTAGES.vitesse2x} : deux fois plus de combats par session, pensez à vider l'énergie.` });
  if (av.has("ressourcesQuotidiennes")) c.push({ niveau: "ok", texte: "Pass actif : connectez-vous chaque jour, une récompense manquée est perdue." });
  if (av.has("tirages")) c.push({ niveau: "ok", texte: "Tirages en réserve : visez la bannière qui a l'amplificateur ou le carry qui manque à votre équipe." });
  if (av.has("sweep")) c.push({ niveau: "ok", texte: `${AVANTAGES.sweep} : balayez les étapes déjà battues et l'Infinity Train au lieu de les rejouer.` });
  if (av.has("idle") || av.has("idle30")) c.push({ niveau: "ok", texte: "AFK amélioré : récupérez les gains avant que le plafond soit atteint, au moins deux fois par jour." });
  if (av.has("staminaMax")) c.push({ niveau: "ok", texte: `${AVANTAGES.staminaMax} : la Stamina déborde moins, mais videz-la quand même chaque jour.` });
  if (av.has("guildeTech")) c.push({ niveau: "ok", texte: `${AVANTAGES.guildeTech} : gardez deux recherches de guilde en cours.` });
  // Gains quotidiens cumulés des passes actifs.
  const parJour = {};
  for (const o of actives) for (const [k, v] of Object.entries(o.journalier || {})) parJour[k] = (parJour[k] || 0) + v;
  const NOMS = { diamants: "diamants", or: "or", endurance: "Stamina" };
  if (Object.keys(parJour).length) {
    const jours = Math.max(0, ...actives.filter((o) => o.journalier && o.joursRestants != null).map((o) => o.joursRestants));
    c.push({ niveau: "or", texte: `Passes : chaque jour ${Object.entries(parJour).map(([k, v]) => `${v} ${NOMS[k] || k}`).join(", ")} à récupérer${jours ? ` (encore ${jours} j, soit ${parJour.diamants ? parJour.diamants * jours : 0} diamants)` : ""}.` });
  }
  const offres = catalogue(etat).offres || [];
  const deluxe = offres.find((o) => o.id === "deluxe-pass");
  if (deluxe && !actives.some((o) => o.id === "deluxe-pass") && actives.some((o) => o.id === "value-pass"))
    c.push({ niveau: "info", texte: `Deluxe Pass non souscrit (${deluxe.prix}) : il ajoute le combat AFK, +20 de Stamina max, +30 % de gains d'AFK, 600 diamants puis 20 par jour.` });
  if (!actives.length) c.push({ niveau: "info", texte: "Aucune option payante : misez sur les codes cadeaux, les tâches quotidiennes et la boutique d'événement." });
  else if (!av.has("auto")) c.push({ niveau: "info", texte: "Sans combat auto, gardez les combats manuels pour les boss et faites les étapes faciles en série." });
  return c;
}

/* ---------- Coaching long terme ---------- */

const triPuissance = (etat) => (a, b) => puissance(b, etat) - puissance(a, etat);

/** Postes du noyau de 5 (carry, synergie, soutien, dégâts secondaires, libre) et manques. */
export function coachNoyau(etat) {
  const equipe = equipeActuelle(etat);
  const restants = [...equipe];
  const prendre = (pred) => { const c = restants.filter(pred).sort(triPuissance(etat))[0]; if (c) restants.splice(restants.indexOf(c), 1); return c || null; };
  const carry = prendre((h) => ["mono", "polyvalent", "zone"].includes(h.role)) || prendre(() => true);
  const synergie = prendre((h) => h.role === "amplificateur" || (carry && h.effet !== "aucun" && h.effet === carry.effet));
  const soutien = prendre((h) => ["soin", "controle"].includes(h.role));
  const second = prendre((h) => ["zone", "mono", "polyvalent"].includes(h.role));
  const postes = [["Carry", carry], ["Synergie", synergie], ["Soutien", soutien], ["Dégâts secondaires", second], ...restants.map((h) => ["Poste libre", h])]
    .filter(([, h]) => h).map(([poste, h], i) => {
      const p = progression(etat, h.id);
      return { ordre: i + 1, poste, hero: h, niveau: p.niveau, promotion: p.promotion, palier: prochainPalier(p.promotion) };
    });
  // Remplaçants possibles pour les postes vides, parmi les héros possédés hors équipe.
  const horsEquipe = herosDe(etat).filter((h) => progression(etat, h.id).possede && !equipe.includes(h)).sort(triPuissance(etat));
  const manques = [];
  if (equipe.length && !soutien) manques.push({ poste: "Soutien", texte: "Personne ne soigne la Porte.", candidats: horsEquipe.filter((h) => h.role === "soin" || h.role === "controle").slice(0, 3) });
  if (equipe.length && !synergie) manques.push({ poste: "Synergie", texte: "Aucun héros ne multiplie les dégâts du carry.", candidats: horsEquipe.filter((h) => h.role === "amplificateur" || (carry && h.effet === carry.effet && h.effet !== "aucun")).slice(0, 3) });
  if (equipe.length && !equipe.some((h) => h.role === "zone" || h.role === "polyvalent")) manques.push({ poste: "Zone", texte: "Rien pour nettoyer les vagues.", candidats: horsEquipe.filter((h) => h.role === "zone").slice(0, 3) });
  // Palier de promotion commun à viser pour tout le noyau.
  const promos = postes.map((x) => x.promotion);
  const cible = promos.length ? PALIERS_PROMOTION.find((pl) => promos.some((v) => v < pl.niveau)) : null;
  return { postes, manques, cible, enRetard: cible ? postes.filter((x) => x.promotion < cible.niveau) : [] };
}

/** Un set de curios par héros de l'équipe, sans conflit (chaque curio n'existe qu'une fois). */
export function coachCurios(etat) {
  const equipe = coachNoyau(etat).postes.map((x) => x.hero);
  const possedes = new Map(artefactsResolus(etat).map((a) => [a.ref, a]));
  const curios = (catalogue(etat).artefacts || []).filter((a) => a.set);
  const qualite = (c) => { const a = possedes.get(c.id); return a ? (RARETES.indexOf(c.rarete) + 1) * (1 + (a.etoiles || 0) / 5) : 0; };
  const pris = new Set();
  return equipe.map((h) => {
    let meilleur = null;
    for (const id of Object.keys(SETS_CURIO)) {
      if (pris.has(id)) continue;
      const pieces = curios.filter((c) => c.set === id);
      const score = adequationSet(id, h) * (1 + pieces.reduce((s, c) => s + qualite(c), 0) / 4);
      if (!meilleur || score > meilleur.score) meilleur = { id, score };
    }
    if (!meilleur) return { hero: h, set: null };
    pris.add(meilleur.id);
    const set = SETS_CURIO[meilleur.id];
    const pieces = curios.filter((c) => c.set === meilleur.id).sort((a, b) => RARETES.indexOf(b.rarete) - RARETES.indexOf(a.rarete))
      .map((c) => ({ nom: c.nom, rarete: c.rarete, possede: possedes.has(c.id), etoiles: possedes.get(c.id)?.etoiles || 0 }));
    const raison = set.affinite.effet ? (h.effet === set.affinite.effet ? `${h.nom} applique ${EFFETS[h.effet]} : le set en profite à chaque fois.` : "Meilleur set disponible pour ce héros.")
      : set.affinite.roles.includes(h.role) ? `Adapté à un héros ${ROLES[h.role].toLowerCase()}.` : "Meilleur set encore libre pour ce héros.";
    return { hero: h, set: meilleur.id, nomSet: set.nom, effet: set.effet, raison, pieces, complet: pieces.every((p) => p.possede) };
  });
}

/** Héros de l'équipe qui ne portent pas les pièces possédées de leur set conseillé. */
export function curiosAChanger(etat, plan = coachCurios(etat)) {
  const refs = new Map((etat?.inventaire || []).map((i) => [i.id, i.ref]));
  const parRef = new Map((etat?.inventaire || []).map((i) => [i.ref, i.id]));
  const curios = (catalogue(etat).artefacts || []).filter((a) => a.set);
  const emplacements = Number(etat?.joueur?.emplacements) || 4;
  return plan.filter((x) => {
    if (!x.set) return false;
    const voulus = curios.filter((c) => c.set === x.set && parRef.has(c.id)).sort((a, b) => RARETES.indexOf(b.rarete) - RARETES.indexOf(a.rarete)).slice(0, emplacements).map((c) => c.id);
    if (!voulus.length) return false;
    const portes = new Set(progression(etat, x.hero.id).artefacts.map((id) => refs.get(id)));
    return voulus.some((ref) => !portes.has(ref));
  });
}

/** Les héros possédés à jouer contre chaque grand type de boss. */
export const TYPES_BOSS = [
  { nom: "Vagues de sbires", ennemi: { faiblesses: [], resistances: [], traits: ["sbires", "rapide"] }, cle: "Zone et contrôle avant tout." },
  { nom: "Boss à gros PV", ennemi: { faiblesses: [], resistances: [], traits: ["pvEleves"] }, cle: "Un amplificateur et un carry mono-cible ; ultimes gardés pour le boss." },
  { nom: "Boss qui résiste au physique", ennemi: { faiblesses: ["magique"], resistances: ["physique"], traits: ["pvEleves"] }, cle: "Équipe magique, curios adaptés aux magiques." },
  { nom: "Boss qui résiste au magique", ennemi: { faiblesses: ["physique"], resistances: ["magique"], traits: ["pvEleves"] }, cle: "Équipe physique." },
  { nom: "Boss qui se régénère", ennemi: { faiblesses: [], resistances: [], traits: ["regen", "pvEleves"] }, cle: "Dégâts sur la durée (Brûlure, Saignement, Poison) en continu." },
  { nom: "Boss qui frappe fort", ennemi: { faiblesses: [], resistances: [], traits: ["frappeFort"] }, cle: "Soin et Gel pour tenir ; montez la Porte avant." },
];
export function coachBoss(etat) {
  const possedes = herosDe(etat).filter((h) => progression(etat, h.id).possede);
  const liste = possedes.length ? possedes : herosDe(etat);
  const equipe = new Set(etat?.equipe || []);
  return TYPES_BOSS.map((t) => {
    const choix = composerEquipe(liste, t.ennemi, etat, { taille: 5 }).map((e) => e.hero);
    return { ...t, heros: choix, changements: choix.filter((h) => !equipe.has(h.id)) };
  });
}

/** Plan diamants : revenu des passes, prochain tirage de 10, cible conseillée. */
export function coachDiamants(etat, aujourdhui = new Date()) {
  const stock = Number(etat?.stock?.diamants) || 0;
  const actives = offresActives(etat, aujourdhui);
  const parJour = actives.reduce((s, o) => s + (o.journalier?.diamants || 0), 0);
  const tirages = Math.floor(stock / 2200);
  const manque = tirages ? 0 : 2200 - stock;
  const jours = manque && parJour ? Math.ceil(manque / parJour) : null;
  const noyau = coachNoyau(etat);
  const posteVise = noyau.manques[0]?.poste || null;
  return { stock, parJour, tirages, manque, jours, posteVise };
}

/** Jalons à long terme du compte, du plus proche au plus lointain. */
export function coachJalons(etat) {
  const j = etat?.joueur || {};
  const jal = [];
  const coffre = Number(j.coffreCurios) || 0;
  if (coffre && coffre < 400) jal.push({ titre: `Curio Vault ${coffre} → 400`, reste: pluriel(400 - coffre, "niveau", "niveaux"), gain: "DMG Boost +12 % et DMG Immunity +12 % pour toute l'équipe", proche: 400 - coffre <= 20 });
  const etape = parseInt(String(j.etape || "").split("-")[0], 10);
  if (etape && etape < 220) jal.push({ titre: `Main Stage ${etape} → 220`, reste: `${220 - etape} étapes`, gain: "3e place de bête déployée", proche: 220 - etape <= 30 });
  const n = coachNoyau(etat);
  if (n.cible && n.enRetard.length) jal.push({ titre: `Tout le noyau en P${n.cible.niveau}`, reste: n.enRetard.map((x) => `${x.hero.nom} P${x.promotion}`).join(", "), gain: n.cible.bonus, proche: n.enRetard.length <= 2 });
  const pieges = catalogue(etat).pieges || [];
  const verr = pieges.filter((p) => p.fragments && !etat?.pieges?.[p.id]?.possede);
  if (verr.length) jal.push({ titre: `Débloquer ${verr[0].nom}`, reste: `${verr[0].fragments} fragments`, gain: "Un piège de plus à déployer", proche: false });
  return jal.sort((a, b) => b.proche - a.proche);
}
