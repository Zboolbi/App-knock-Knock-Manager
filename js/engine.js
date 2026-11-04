// Moteur de recommandations : fonctions pures, sans DOM ni stockage.
// Les chiffres sont des heuristiques qui classent les choix ; ce ne sont pas
// les formules du jeu.

import { EFFETS, ROLES, TYPES, STATS_ARTEFACT, RARETES, PALIERS_PROMOTION, AVANTAGES } from "./data.js";

const POINTS_TIER = { SS: 30, S: 24, A: 18, B: 12, C: 6 };
const EFFETS_DURABLES = ["brulure", "saignement", "poison"];
export const TAILLE_EQUIPE = 5;

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
    return { id: i.id, ref: i.ref, nom: f.nom || "Artefact inconnu", stat: f.stat || "patk",
      rarete: i.rarete || f.rarete || "Commun", niveau: Number(i.niveau) || 0, effet: f.effet || "" };
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
  if (r.length) c.push(`Laissez sur le banc les héros ${r.map(nom).join(", ")}.`);
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

export function statsIdeales(hero) {
  return Object.keys(ADEQUATION)
    .map((s) => ({ stat: s, libelle: STATS_ARTEFACT[s], valeur: ADEQUATION[s](hero) }))
    .filter((x) => x.valeur > 0)
    .sort((a, b) => b.valeur - a.valeur);
}

export function valeurArtefact(artefact, hero) {
  const adequation = ADEQUATION[artefact.stat]?.(hero) ?? 0;
  const rang = RARETES.indexOf(artefact.rarete);
  return adequation * (rang < 0 ? 1 : rang + 1) * (1 + (Number(artefact.niveau) || 0) / 20);
}

export function attribuerArtefacts(equipe, artefacts, { emplacements = 2 } = {}) {
  const poids = equipe.map((_, i) => (i === 0 ? 1.3 : i < 3 ? 1.1 : 1));
  const paires = [];
  artefacts.forEach((a) => equipe.forEach((h, i) => {
    const v = valeurArtefact(a, h) * poids[i];
    if (v > 0) paires.push({ a, h, v });
  }));
  paires.sort((x, y) => y.v - x.v);
  const pris = new Set();
  const parHero = new Map(equipe.map((h) => [h.id, []]));
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
    return { hero: h, actuels, optimaux, identique, gain: Math.round(gain * 10) / 10, ideales: statsIdeales(h).slice(0, 3) };
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
  if (!equipe.length) return { equipe, notes: [{ niveau: "info", texte: "Choisissez vos 5 héros dans l'onglet Profil." }], score: 0 };
  const roles = new Set(equipe.map((h) => h.role));
  if (equipe.length < TAILLE_EQUIPE) notes.push({ niveau: "alerte", texte: `${TAILLE_EQUIPE - equipe.length} place(s) libre(s) dans l'équipe.` });
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

  if (porte || lit) {
    if (lit >= porte) etapes.push({ priorite: 1, titre: `Montez la Porte (${porte} → ${porte + 1})`, detail: "Elle plafonne le Lit : sans elle, le Lit ne progresse plus." });
    else if (porte - lit >= 2) etapes.push({ priorite: 1, titre: `Rattrapez le Lit (${lit} → ${porte})`, detail: "Le Lit fait votre revenu : gardez-le au niveau de la Porte." });
  }

  const equipe = equipeActuelle(etat).filter((h) => progression(etat, h.id).possede);
  const coeur = equipe.length ? equipe : herosPrincipaux(heros, etat);
  if (!coeur.length) {
    etapes.push({ priorite: 1, titre: "Ajoutez vos héros", detail: "Profil › touchez un héros › « Je l'ai »." });
    return etapes;
  }
  if (!equipe.length) etapes.push({ priorite: 2, titre: "Équipe proposée", detail: `${coeur.map((h) => h.nom).join(", ")}. Ajoutez-la dans Profil pour la suivre.` });

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
  if (gaspilles.length) etapes.push({ priorite: 5, titre: "Arrêtez d'investir hors équipe", detail: `${gaspilles.map((h) => h.nom).join(", ")} : à garder pour les boss qui craignent leurs effets.` });

  const conf = configurationArtefacts(etat, coeur);
  if (conf.aChanger) etapes.push({ priorite: 2, titre: `${conf.aChanger} héros avec de meilleurs artefacts disponibles`, detail: "Stratégie › Artefacts › « Appliquer »." });
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
  if (!actives.length) c.push({ niveau: "info", texte: "Aucune option payante : misez sur les codes cadeaux, les tâches quotidiennes et la boutique d'événement." });
  else if (!av.has("auto")) c.push({ niveau: "info", texte: "Sans combat auto, gardez les combats manuels pour les boss et faites les étapes faciles en série." });
  return c;
}
