// Stockage local du profil et du catalogue. Rien ne quitte l'appareil.
import { HEROS_DEPART, BOSS_DEPART, ARTEFACTS_DEPART, SKINS_DEPART, OFFRES_DEPART } from "./data.js";

const CLE = "kkrd-coach:v2";
const ANCIENNE_CLE = "kkrd-coach:v1";
const clone = (x) => JSON.parse(JSON.stringify(x));

export function etatInitial() {
  return {
    version: 2,
    joueur: { pseudo: "", niveau: 1, porte: 1, lit: 1, chapitre: "", emplacements: 2 },
    catalogue: {
      heros: clone(HEROS_DEPART),
      artefacts: clone(ARTEFACTS_DEPART),
      skins: clone(SKINS_DEPART),
      boss: clone(BOSS_DEPART),
      offres: clone(OFFRES_DEPART),
    },
    roster: {},
    equipe: [],
    inventaire: [],
    skinsPossedes: {},
    abonnements: {},
    ressources: [],
    quotidien: { date: "", coches: {} },
  };
}

export function charger() {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) return fusionner(JSON.parse(brut));
    const ancien = localStorage.getItem(ANCIENNE_CLE);
    if (ancien) return fusionner(JSON.parse(ancien));
  } catch { /* stockage indisponible : profil vierge */ }
  return etatInitial();
}

export function sauver(etat) {
  try { localStorage.setItem(CLE, JSON.stringify(etat)); return true; } catch { return false; }
}

/** Version 1 → 2 : héros, ennemis et artefacts passent dans le catalogue. */
function migrerV1(d) {
  const e = etatInitial();
  e.joueur = { ...e.joueur, ...(d.joueur || {}) };
  if (Array.isArray(d.heros)) e.catalogue.heros = d.heros;
  if (Array.isArray(d.ennemis)) e.catalogue.boss = d.ennemis.map((x) => ({ chapitre: "", forces: "", specificites: "", ...x }));
  e.roster = d.roster || {};
  for (const a of d.artefacts || []) {
    const ref = `perso-${a.id}`;
    e.catalogue.artefacts.push({ id: ref, nom: a.nom, stat: a.stat, rarete: a.rarete, effet: "" });
    e.inventaire.push({ id: a.id, ref, niveau: a.niveau || 0, rarete: a.rarete });
  }
  e.ressources = d.ressources || [];
  return e;
}

export function fusionner(d) {
  if (!d || typeof d !== "object") return etatInitial();
  if (!d.version || d.version < 2) d = migrerV1(d);
  const base = etatInitial();
  const etat = { ...base, ...d, joueur: { ...base.joueur, ...(d.joueur || {}) } };
  etat.catalogue = { ...base.catalogue, ...(d.catalogue || {}) };
  for (const k of Object.keys(base.catalogue)) if (!Array.isArray(etat.catalogue[k])) etat.catalogue[k] = base.catalogue[k];
  for (const k of ["equipe", "inventaire", "ressources"]) if (!Array.isArray(etat[k])) etat[k] = [];
  for (const k of ["roster", "skinsPossedes", "abonnements"]) if (!etat[k] || typeof etat[k] !== "object") etat[k] = {};
  if (!etat.quotidien || typeof etat.quotidien !== "object") etat.quotidien = base.quotidien;
  // Ajoute les entrées de départ apparues dans une nouvelle version de l'app,
  // sans toucher à celles que l'utilisateur a modifiées ou supprimées exprès.
  const supprimes = new Set(etat.supprimes || []);
  for (const k of Object.keys(base.catalogue)) {
    const connus = new Set(etat.catalogue[k].map((x) => x.id));
    for (const x of base.catalogue[k]) if (!connus.has(x.id) && !supprimes.has(x.id)) etat.catalogue[k].push(x);
  }
  etat.version = 2;
  return etat;
}

export function nouvelId(prefixe) {
  return `${prefixe}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
