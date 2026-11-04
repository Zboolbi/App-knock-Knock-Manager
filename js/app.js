import {
  TYPES, EFFETS, ROLES, RARETES, TIERS, TRAITS, STATS_ARTEFACT, EQUIPES_REFERENCE, CONSEILS_SOURCES,
  PALIERS_PROMOTION, AVANTAGES, RESSOURCES, MODES, CODES_CADEAUX, ASTUCES_JEU, NOMS_RARETES, SETS_CURIO, CURIO_VAULT, PLACES_BETES,
} from "./data.js";
import {
  progression, herosDe, artefactsResolus, porteurs, skinEquipe, composerEquipe, classerContre, conseilsCombat,
  configurationArtefacts, statsIdeales, analyseEquipe, equipeActuelle, planProgression, prochainPalier,
  conseilsSkins, offresActives, conseilsOffres, TAILLE_EQUIPE, setsIdeaux,
} from "./engine.js";
import { charger, sauver, etatInitial, fusionner, nouvelId } from "./store.js";
import { analyserTexte, ordonnerParCartes, lireProfil, lireEcrans } from "./capture.js";
import { lireCaptures } from "./ocr.js";

let etat = charger();
const ui = { onglet: "accueil", segHeros: "equipe", filtre: "", possedes: false, mesHeros: true, rechercheBoss: "", feuille: null, pile: [] };

const $vue = document.getElementById("vue");
const $barre = document.getElementById("barre-haut");
const $petitTitre = document.getElementById("petit-titre");
const $actions = document.getElementById("actions-haut");
const $feuille = document.getElementById("feuille");

/* ---------- Outils ---------- */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const opts = (dict, choisi) => Object.entries(dict).map(([k, v]) => `<option value="${esc(k)}" ${k === choisi ? "selected" : ""}>${esc(v)}</option>`).join("");
const optsListe = (l, choisi) => l.map((v) => `<option ${v === choisi ? "selected" : ""}>${esc(v)}</option>`).join("");
const DIACRITIQUES = new RegExp("[\\u0300-\\u036f]", "g");
const norm = (s) => String(s || "").normalize("NFD").replace(DIACRITIQUES, "").toLowerCase();
const initiales = (nom) => String(nom || "?").split(/[\s-]+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join("").toUpperCase();
const cat = () => etat.catalogue;
const heroParId = (id) => herosDe(etat).find((h) => h.id === id);
const bossParId = (id) => cat().boss.find((b) => b.id === id);
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const nomCible = (k) => EFFETS[k] || TYPES[k] || k;

/** 1234 → « 1 234 », 1 250 000 → « 1,25 M ». */
function fmt(n) {
  if (n === null || n === undefined || n === "" || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Md`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M`;
  return v.toLocaleString("fr-FR");
}
function dateCourte(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const ICONES = {
  accueil: '<path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4z"/>',
  heros: '<circle cx="9" cy="8" r="3.3"/><path d="M3 19c.8-3.2 3.1-5 6-5s5.2 1.8 6 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c2.6-.3 4.7 1.2 5.5 4.3"/>',
  strategie: '<path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 3 5-6"/>',
  boss: '<path d="M12 3c4.4 0 7.5 3 7.5 7.2 0 2.6-1.3 4.3-3 5.3V19h-9v-3.5c-1.7-1-3-2.7-3-5.3C4.5 6 7.6 3 12 3z"/><circle cx="9.3" cy="10.5" r="1.4"/><circle cx="14.7" cy="10.5" r="1.4"/><path d="M10.5 19v-2M13.5 19v-2"/>',
  boutique: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  reglages: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/>',
  photo: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  ajouter: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  gemme: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18"/>',
  piece: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
  flamme: '<path d="M12 3c1 3.5 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2 3.2C11 9 11 6 12 3z"/>',
  pacte: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>',
  cuir: '<path d="M6 4h12l-1 6 2 10H5l2-10z"/>',
  eclair: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  utilisateur: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  sauvegarde: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  telephone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  cadenas: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  lien: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  corbeille: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  etoile: '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  copier: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
};
const ic = (nom, taille) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"${taille ? ` style="width:${taille}px;height:${taille}px"` : ""}>${ICONES[nom] || ""}</svg>`;
const chevron = () => `<svg class="ic chevron" viewBox="0 0 24 24" aria-hidden="true">${ICONES.chevron}</svg>`;
const ICONE_RESSOURCE = { diamants: "gemme", or: "piece", flammeAme: "flamme", pacteHeros: "pacte", cuir: "cuir", endurance: "eclair" };
const COULEUR_RARETE = { CR: "var(--r-mythique)", UR: "var(--r-legendaire)", SSR: "var(--r-epique)", R: "var(--r-rare)" };
const pastilleRarete = (r) => `<span class="rarete" style="background:${COULEUR_RARETE[r] || "var(--groupe-2)"}">${esc(r)}</span>`;
const etoilesTexte = (n) => (Number(n) > 0 ? `<span class="etoiles" aria-label="${n} étoiles">${"★".repeat(Math.min(10, Number(n)))}</span>` : "");
const LOGO = `<div class="logo" aria-label="Knock Knock Manager"><svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0cf78"/><stop offset="1" stop-color="#b8923a"/></linearGradient></defs>
  <rect x="1.5" y="1.5" width="45" height="45" rx="11" fill="#111" stroke="url(#lg)" stroke-width="1.5"/><rect x="15" y="9" width="18" height="29" rx="2" fill="none" stroke="url(#lg)" stroke-width="2.6"/>
  <circle cx="28.5" cy="24" r="1.8" fill="url(#lg)"/><path d="M9 38.5h30" stroke="url(#lg)" stroke-width="2.6" stroke-linecap="round"/><path d="M37 13c2 1.5 3 3.5 3 6M40 9.5c3 2.5 4.5 5.5 4.5 9.5" stroke="url(#lg)" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>
  <span class="mots"><span class="k">Knock Knock</span><span class="m">Manager</span></span></div>`;

function teinte(nom) {
  let x = 0;
  for (const c of String(nom)) x = (x * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${x} 35% 34%)`;
}
function avatar(h, { taille, terne = false } = {}) {
  if (!h) return `<div class="av vide"${taille ? ` style="--t:${taille}px"` : ""}>${ic("ajouter", 20)}</div>`;
  const style = [taille ? `--t:${taille}px` : "", h.effet === "aucun" ? `--fe:${teinte(h.nom)}` : ""].filter(Boolean).join(";");
  return `<div class="av${terne ? " terne" : ""}" data-r="${esc(h.rarete)}" data-e="${esc(h.effet)}"${style ? ` style="${style}"` : ""}>${esc(initiales(h.nom))}</div>`;
}
function resumeHero(id) {
  const p = progression(etat, id);
  if (!p.possede) return "Pas encore obtenu";
  return [`Niv. ${p.niveau}`, p.promotion ? `P${p.promotion}` : "", p.etoiles ? `${p.etoiles}★` : ""].filter(Boolean).join(" · ");
}
function puces(h) {
  return `<span class="puce or tier">${esc(h.tier)}</span><span class="puce">${esc(h.rarete)}</span><span class="puce">${esc(TYPES[h.type] || h.type)}</span>
    ${h.effet !== "aucun" ? `<span class="puce">${esc(EFFETS[h.effet])}</span>` : ""}<span class="puce">${esc(ROLES[h.role] || h.role)}</span>
    ${h.aVerifier ? `<span class="puce" title="Type, effet ou rôle supposé">à vérifier</span>` : ""}`;
}
const section = (titre, contenu, { lien = "", pied = "", nu = false } = {}) => `<section class="section">
  ${titre ? `<div class="section-titre"><h2>${esc(titre)}</h2>${lien}</div>` : ""}<div class="groupe"${nu ? ' style="background:none;border-radius:0"' : ""}>${contenu}</div>${pied ? `<p class="pied">${pied}</p>` : ""}</section>`;
const ligneNav = (f, titre, detail = "", { id = "", icone = "", valeur = "" } = {}) => `<button class="ligne" data-act="ouvrir" data-f="${f}" data-id="${esc(id)}">
  ${icone ? `<span class="pastille-icone">${ic(icone)}</span>` : ""}<span class="corps"><b>${esc(titre)}</b>${detail ? `<small>${esc(detail)}</small>` : ""}</span>
  ${valeur ? `<span class="valeur">${esc(valeur)}</span>` : ""}${chevron()}</button>`;
const notes = (liste) => liste.map((n) => `<div class="note ${n.niveau}">${esc(n.texte)}</div>`).join("");
const etapes = (liste) => liste.map((e, i) => `<div class="ligne" style="align-items:flex-start"><span class="etape-num">${i + 1}</span><span class="corps"><b style="white-space:normal">${esc(e.titre)}</b><small class="multi">${esc(e.detail)}</small></span>
  ${e.action ? `<button class="btn or" style="min-height:34px;padding:6px 14px;font-size:15px;align-self:center" data-act="equipe-proposee" data-id="${esc(e.action.ids.join(","))}">${esc(e.action.libelle)}</button>` : ""}</div>`).join("");

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("visible");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("visible"), 2200);
}
function enregistrer() {
  if (!sauver(etat)) toast("Sauvegarde impossible : le stockage du navigateur est bloqué");
  rendre();
}
function fiche(id) {
  if (!etat.roster[id]) etat.roster[id] = { possede: false, niveau: 1, promotion: 0, etoiles: 0, skin: null, artefacts: [] };
  const r = etat.roster[id];
  if (!Array.isArray(r.artefacts)) r.artefacts = [];
  return r;
}
function retirerArtefactPartout(invId) {
  for (const r of Object.values(etat.roster)) if (Array.isArray(r.artefacts)) r.artefacts = r.artefacts.filter((a) => a !== invId);
}
function equiper(heroId, index, invId) {
  if (invId) retirerArtefactPartout(invId);
  const r = fiche(heroId);
  r.artefacts[index] = invId || null;
  r.artefacts = r.artefacts.filter(Boolean);
}
function supprimerCatalogue(type, id) {
  etat.catalogue[type] = etat.catalogue[type].filter((x) => x.id !== id);
  etat.supprimes = [...new Set([...(etat.supprimes || []), id])];
}
function basculerEquipe(id, oui) {
  etat.equipe = etat.equipe.filter((x) => x !== id);
  if (oui) {
    if (etat.equipe.length >= TAILLE_EQUIPE) { toast(`Équipe complète (${TAILLE_EQUIPE}) : retirez d'abord un héros`); return false; }
    etat.equipe.push(id);
  }
  return true;
}

const TACHES = ["Récupérer le revenu du Lit", "Faire les missions quotidiennes", "Invocations et coffres gratuits",
  "Vider la Stamina sur l'étape la plus haute battue", "Matériaux du jour sur les 5 héros de l'équipe", "Récompenses des passes et de la guilde",
  "Infinity Train : utiliser les 10 tentatives (Sweep)"];
const TACHE_TRAIN = TACHES.length - 1;

/* ---------- Accueil (tableau de bord) ---------- */

function vueAccueil() {
  const j = etat.joueur;
  if (etat.quotidien.date !== aujourdhui()) etat.quotidien = { date: aujourdhui(), coches: {} };
  const equipe = equipeActuelle(etat);
  const plan = planProgression(etat).slice(0, 4);
  const ana = analyseEquipe(etat);
  const alertes = ana.notes.filter((n) => n.niveau === "alerte").length;
  const faites = TACHES.filter((_, i) => etat.quotidien.coches[i]).length;
  const nouveau = !j.pseudo && !herosDe(etat).some((h) => progression(etat, h.id).possede);
  const meta = [j.niveau ? `Niv. ${j.niveau}` : "", j.guilde ? `Guilde ${j.guilde}` : "Sans guilde", j.vip ? `VIP ${j.vip}` : ""].filter(Boolean).join(" · ");

  return `
  ${LOGO}
  <h1 class="grand-titre">Tableau de bord</h1>
  <p class="sous-titre">${j.majImport ? `Mis à jour par capture le ${esc(dateCourte(j.majImport))}` : "Importez une capture de votre profil pour tout remplir d'un coup."}</p>

  <div class="carte-profil">
    <div class="haut"><div class="av">${esc(initiales(j.pseudo || "?"))}</div>
      <div style="min-width:0"><h2>${esc(j.pseudo || "Joueur")}</h2><div class="meta">${esc(meta)}${j.idJoueur ? ` · ID ${esc(j.idJoueur)}` : ""}</div></div></div>
    <div class="chiffres">
      <div class="chiffre"><small>Étape</small><b>${esc(j.etape || "—")}</b></div>
      <div class="chiffre"><small>Porte / Lit</small><b>${esc(j.porte || "—")} / ${esc(j.lit || "—")}</b></div>
      <div class="chiffre"><small>Puissance</small><b>${esc(fmt(j.puissance))}</b></div>
      <div class="chiffre"><small>Curio Vault</small><b>${esc(j.coffreCurios || "—")}</b></div>
      <div class="chiffre"><small>Gear</small><b>${j.equipementNiveau ? `+${esc(j.equipementNiveau)}${j.palierEquipement ? ` · T${esc(j.palierEquipement)}` : ""}` : "—"}</b></div>
      <div class="chiffre"><small>Infinity Train</small><b>${j.arretTrain ? `Stop ${esc(j.arretTrain)}` : "—"}</b></div>
    </div>
    <div class="actions">
      <button class="btn or" data-act="ouvrir" data-f="import">${ic("photo", 20)} Importer</button>
      <button class="btn" data-act="ouvrir" data-f="profil">Modifier</button>
    </div>
  </div>

  ${nouveau ? section("Pour bien démarrer", `
    <div class="note or">Dans le jeu, faites des captures de votre profil, de l'écran principal, de vos héros et de vos artefacts.</div>
    <div class="note or">Touchez « Importer » et choisissez-les : l'app remplit tout.</div>
    <div class="note or">Vérifiez et enregistrez : la Stratégie se met à jour toute seule.</div>`) : ""}

  ${section("Ressources", `<div class="grille-res">${RESSOURCES.map((r) => `
    <button class="tuile-res" data-act="ouvrir" data-f="ressources"><small>${esc(r.nom)}</small><b class="${etat.stock[r.id] == null ? "vide" : ""}">${esc(fmt(etat.stock[r.id]))}</b></button>`).join("")}</div>`,
    { nu: true, pied: Number(etat.stock.diamants) >= 2200 ? `De quoi faire ${fmt(Math.floor(etat.stock.diamants / 2200))} tirage(s) de 10.` : "" })}

  ${section("Mon équipe", `<div class="rangee-equipe">${Array.from({ length: TAILLE_EQUIPE }, (_, i) => equipe[i]).map((h, i) => `
    <button class="membre" data-act="ouvrir" data-f="${h ? "hero" : "equipe"}" data-id="${h ? h.id : ""}">${avatar(h || null)}<small>${h ? esc(h.nom) : `Place ${i + 1}`}</small></button>`).join("")}</div>
    ${equipe.length ? `<button class="ligne" data-act="onglet" data-id="strategie"><span class="corps"><b>${alertes ? `${alertes} point(s) à corriger` : "Équipe équilibrée"}</b><small>Puissance moyenne ${ana.score}</small></span>${chevron()}</button>` : ""}`)}

  ${section("À faire maintenant", etapes(plan), { lien: `<button class="lien" data-act="onglet" data-id="strategie">Tout voir</button>` })}

  ${section("Routine du jour", TACHES.map((t, i) => `<label class="ligne"><input type="checkbox" class="coche" data-quotidien="${i}" ${etat.quotidien.coches[i] ? "checked" : ""}><span class="corps"><b style="white-space:normal">${esc(t)}</b></span></label>`).join(""),
    { lien: `<span class="valeur" style="color:var(--texte-2);font-size:15px">${faites}/${TACHES.length}</span>` })}`;
}

/* ---------- Héros ---------- */

function vueHeros() {
  const segs = [["equipe", "Équipe"], ["collection", "Collection"], ["artefacts", "Curios"], ["pieges", "Pièges"], ["betes", "Bêtes"], ["skins", "Skins"]];
  return `<h1 class="grand-titre">Héros</h1>
  <div class="segments defilant" role="tablist">${segs.map(([k, l]) => `<button role="tab" aria-selected="${ui.segHeros === k}" data-act="seg" data-id="${k}">${l}</button>`).join("")}</div>
  ${{ equipe: segEquipe, collection: segCollection, artefacts: segArtefacts, pieges: () => segCompagnons("pieges"), betes: () => segCompagnons("betes"), skins: segSkins }[ui.segHeros]()}`;
}

function segEquipe() {
  const equipe = equipeActuelle(etat);
  const ana = analyseEquipe(etat);
  return `${section("", Array.from({ length: TAILLE_EQUIPE }, (_, i) => equipe[i]).map((h, i) => h
    ? `<button class="ligne" data-act="ouvrir" data-f="hero" data-id="${h.id}">${avatar(h)}<span class="corps"><b>${esc(h.nom)}</b><small>${esc(resumeHero(h.id))} · ${esc(ROLES[h.role])}</small></span><span class="puce or tier">${esc(h.tier)}</span>${chevron()}</button>`
    : `<button class="ligne" data-act="ouvrir" data-f="equipe">${avatar(null)}<span class="corps"><b style="color:var(--or-vif)">Ajouter un héros</b><small>Place ${i + 1}</small></span></button>`).join(""))}
  <div style="margin-top:10px"><button class="btn plein" data-act="ouvrir" data-f="equipe">Modifier l'équipe</button></div>
  ${equipe.length ? section("Analyse", notes(ana.notes)) : ""}
  ${section("Équipes de référence", EQUIPES_REFERENCE.map((eq) => {
    const ok = eq.heros.filter((id) => progression(etat, id).possede).length;
    return `<button class="ligne" data-act="prendre-equipe" data-id="${esc(eq.nom)}" data-confirmer="Touchez encore pour remplacer votre équipe"><span class="corps"><b>${esc(eq.nom)}</b><small class="multi">${esc(eq.heros.map((id) => heroParId(id)?.nom).filter(Boolean).join(", "))}</small></span><span class="valeur">${ok}/5</span></button>`;
  }).join(""), { pied: "Touchez deux fois une équipe pour l'utiliser. Le chiffre indique combien de ses héros vous possédez." })}`;
}

function segCollection() {
  const f = norm(ui.filtre);
  const liste = herosDe(etat).filter((h) => (!f || norm(h.nom).includes(f) || (h.alias || []).some((a) => norm(a).includes(f))) && (!ui.possedes || progression(etat, h.id).possede));
  const nb = herosDe(etat).filter((h) => progression(etat, h.id).possede).length;
  const groupes = [...RARETES].reverse().map((r) => [r, liste.filter((h) => h.rarete === r)
    .sort((a, b) => progression(etat, b.id).possede - progression(etat, a.id).possede || TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || a.nom.localeCompare(b.nom))]).filter(([, l]) => l.length);
  return `<input class="recherche" type="search" id="recherche-heros" placeholder="Rechercher un héros" data-ui="filtre" value="${esc(ui.filtre)}" aria-label="Rechercher un héros">
  <div class="segments" style="margin-top:0"><button aria-selected="${!ui.possedes}" data-act="possedes" data-id="0">Tous (${herosDe(etat).length})</button><button aria-selected="${ui.possedes}" data-act="possedes" data-id="1">Les miens (${nb})</button></div>
  ${groupes.map(([r, l]) => section(r, l.map((h) => `<button class="ligne" data-act="ouvrir" data-f="hero" data-id="${h.id}">${avatar(h, { terne: !progression(etat, h.id).possede })}
    <span class="corps"><b>${esc(h.nom)}</b><small>${esc(resumeHero(h.id))}</small></span><span class="puce or tier">${esc(h.tier)}</span>${chevron()}</button>`).join(""))).join("")
    || `<div class="vide-etat"><b>Aucun héros</b>${ui.possedes ? "Ouvrez un héros dans « Tous » et activez « Je l'ai », ou importez une capture." : "Aucun nom ne correspond."}</div>`}
  <div style="margin-top:14px"><button class="btn plein" data-act="ouvrir" data-f="fiche-hero" data-id="">Ajouter un héros absent du catalogue</button></div>`;
}

function segArtefacts() {
  const arts = artefactsResolus(etat);
  const qui = porteurs(etat);
  const parRef = new Map(arts.map((a) => [a.ref, a]));
  const curios = cat().artefacts.filter((a) => a.set);
  const autres = arts.filter((a) => !a.set);
  const nb = curios.filter((c) => parRef.has(c.id)).length;
  return `<p class="sous-titre">${nb} curio(s) sur ${curios.length}. Activez ceux que vous avez et réglez leurs étoiles ; un import du Curio Codex le fait pour vous.</p>
  ${Object.entries(SETS_CURIO).map(([id, set]) => {
    const pieces = curios.filter((c) => c.set === id).sort((a, b) => RARETES.indexOf(b.rarete) - RARETES.indexOf(a.rarete));
    const eu = pieces.filter((c) => parRef.has(c.id)).length;
    return section(`${set.nom} · ${eu}/${pieces.length}`, pieces.map((c) => {
      const a = parRef.get(c.id);
      const h = a ? heroParId(qui.get(a.id)) : null;
      return `<div class="ligne">${pastilleRarete(c.rarete)}
        <button class="corps" style="border:0;background:none;text-align:left;padding:0;color:inherit" ${a ? `data-act="ouvrir" data-f="artefact" data-id="${a.id}"` : "disabled"}>
          <b style="${a ? "" : "color:var(--texte-3)"}">${esc(c.nom)}</b><small>${a ? `${etoilesTexte(a.etoiles) || "0 étoile"}${h ? ` · sur ${esc(h.nom)}` : ""}` : "Pas encore obtenu"}</small></button>
        <input type="checkbox" class="interrupteur" data-curio="${c.id}" ${a ? "checked" : ""} aria-label="J'ai ${esc(c.nom)}"></div>`;
    }).join(""), { pied: esc(set.effet) });
  }).join("")}
  ${autres.length ? section("Autres artefacts", autres.map((a) => `<button class="ligne" data-act="ouvrir" data-f="artefact" data-id="${a.id}">${pastilleRarete(a.rarete)}<span class="corps"><b>${esc(a.nom)}</b><small>${esc(STATS_ARTEFACT[a.stat] || "")} · niv. ${a.niveau}</small></span>${chevron()}</button>`).join("")) : ""}
  <div style="margin-top:12px;display:grid;gap:8px"><button class="btn or plein" data-act="ouvrir" data-f="import">${ic("photo", 20)} Importer le Curio Codex</button></div>`;
}

const NOMS_COMPAGNONS = { pieges: ["Pièges", "piège", 3], betes: ["Bêtes", "bête", 2] };
function placesBetes() {
  const etape = parseInt(String(etat.joueur.etape || "").split("-")[0], 10) || 0;
  return PLACES_BETES.reduce((n, p) => (!p.condition || etape >= parseInt(p.condition.replace(/\D+/g, ""), 10) ? p.places : n), 2);
}
function segCompagnons(sorte) {
  const [titre, unite] = NOMS_COMPAGNONS[sorte];
  const max = sorte === "betes" ? placesBetes() : NOMS_COMPAGNONS[sorte][2];
  const liste = cat()[sorte] || [];
  const deployes = liste.filter((x) => etat[sorte][x.id]?.deploye).length;
  return `<p class="sous-titre">${deployes}/${max} ${unite}(s) déployé(s).${sorte === "betes" && max < 3 ? " 3e place à Main Stage 220." : ""}</p>
  ${section(titre, liste.map((x) => {
    const p = etat[sorte][x.id] || {};
    return `<button class="ligne" data-act="ouvrir" data-f="compagnon" data-id="${sorte}:${x.id}">${pastilleRarete(x.rarete)}
      <span class="corps"><b style="${p.possede ? "" : "color:var(--texte-3)"}">${esc(x.nom)}</b><small>${p.possede ? `Niv. ${p.niveau || 1}${p.etoiles ? ` · ${p.etoiles}★` : ""}${p.deploye ? " · déployé" : ""}` : x.fragments ? `Verrouillé · ${x.fragments} fragments` : "Pas encore obtenu"}${x.effet && x.effet !== "aucun" ? ` · ${esc(EFFETS[x.effet])}` : ""}</small></span>${chevron()}</button>`;
  }).join(""))}
  <div style="margin-top:12px"><button class="btn or plein" data-act="ouvrir" data-f="import">${ic("photo", 20)} Importer l'écran ${sorte === "pieges" ? "Trap" : "Beast"}</button></div>`;
}

function segSkins() {
  const skins = cat().skins;
  return `${skins.length ? section(`${skins.length} skin(s)`, skins.map((s) => {
    const h = heroParId(s.heroId);
    return `<div class="ligne">${avatar(h, { taille: 36 })}<button class="corps" style="border:0;background:none;text-align:left;padding:0;color:inherit" data-act="ouvrir" data-f="fiche-skin" data-id="${s.id}">
      <b>${esc(s.nom)}</b><small>${esc(h?.nom || "Héros inconnu")}${s.bonusValeur ? ` · +${esc(s.bonusValeur)} % ${esc(STATS_ARTEFACT[s.bonusStat] || "")}` : ""}${skinEquipe(etat, s.heroId)?.id === s.id ? " · porté" : ""}</small></button>
      <input type="checkbox" class="interrupteur" data-skin="${s.id}" ${etat.skinsPossedes[s.id] ? "checked" : ""} aria-label="Je possède ${esc(s.nom)}"></div>`;
  }).join(""), { pied: "L'interrupteur indique si vous possédez le skin." }) : `<div class="vide-etat"><b>Aucun skin</b>Aucune liste publique des skins n'existe. Ajoutez les vôtres ou importez la capture de l'écran des skins.</div>`}
  <div style="margin-top:12px"><button class="btn or plein" data-act="ouvrir" data-f="fiche-skin" data-id="">Ajouter un skin</button></div>`;
}

/* ---------- Stratégie ---------- */

function vueStrategie() {
  const ana = analyseEquipe(etat);
  const equipe = ana.equipe;
  const conf = equipe.length ? configurationArtefacts(etat, equipe) : null;
  const skins = conseilsSkins(etat);
  const nomsArts = (l) => (l.length ? l.map((a) => esc(a.nom)).join(", ") : "Rien");
  return `<h1 class="grand-titre">Stratégie</h1>
  <p class="sous-titre">Recalculée à chaque modification de votre profil.</p>
  ${section("Prochaines étapes", etapes(planProgression(etat)))}

  ${section("Équipe", equipe.length ? notes(ana.notes) : `<button class="ligne" data-act="onglet" data-id="heros"><span class="corps"><b>Composez votre équipe</b><small>Héros › Équipe</small></span>${chevron()}</button>`)}

  ${conf ? section("Curios", `${conf.lignes.map((l) => `<div class="ligne" style="align-items:flex-start">${avatar(l.hero, { taille: 36 })}<span class="corps">
      <b>${esc(l.hero.nom)}</b>${l.identique ? `<small>Configuration optimale</small>` : `<div class="fleche"><span>${nomsArts(l.actuels)}</span><span>→</span><b>${nomsArts(l.optimaux)}</b></div>`}
      <small class="multi">À viser : ${l.ideales.map((s) => esc(s.libelle)).join(" › ")}</small></span>
      ${l.identique ? `<span class="puce bon">OK</span>` : `<button class="btn" style="min-height:34px;padding:6px 12px;font-size:15px" data-act="appliquer" data-id="${l.hero.id}">Appliquer</button>`}</div>`).join("")}
    ${conf.aChanger ? `<div style="padding:10px 14px"><button class="btn or plein" data-act="appliquer-tout">Tout appliquer</button></div>` : ""}`,
    { pied: !etat.inventaire.length ? "Indiquez vos curios (Héros › Curios ou import du Curio Codex) pour une répartition automatique par set." : conf.inutilises.length ? `Sans bon porteur : ${esc(conf.inutilises.map((a) => a.nom).join(", "))}.` : "Après « Appliquer », reproduisez la configuration dans le jeu." }) : ""}

  ${equipe.length ? section("Promotions", equipe.map((h) => {
    const p = progression(etat, h.id), pal = prochainPalier(p.promotion);
    const pct = pal ? Math.min(100, Math.round((p.promotion / pal.niveau) * 100)) : 100;
    return `<div class="ligne"><span class="corps"><b>${esc(h.nom)}</b><small>P${p.promotion}${pal ? ` → P${pal.niveau} : ${esc(pal.bonus)}` : " · palier maximal"}</small><div class="barre-prog"><i style="width:${pct}%"></i></div></span></div>`;
  }).join("")) : ""}

  ${section("Pièges et bêtes", conseilsCompagnons().map((c) => `<div class="note ${c.niveau}">${esc(c.texte)}</div>`).join(""))}

  ${section("Ressources", RESSOURCES.map((r) => `<div class="ligne" style="align-items:flex-start"><span class="pastille-icone">${ic(ICONE_RESSOURCE[r.id])}</span><span class="corps"><b>${esc(r.nom)} <span style="color:var(--texte-2);font-weight:400">${etat.stock[r.id] != null ? esc(fmt(etat.stock[r.id])) : ""}</span></b><small class="multi">${esc(r.conseil)}</small></span></div>`).join(""))}

  ${skins.length ? section("Skins", skins.map((s) => `<div class="ligne"><span class="corps"><b style="white-space:normal">${esc(s.texte)}</b></span><button class="lien" data-act="mettre-skin" data-id="${s.hero.id}" data-skin="${s.skin.id}">Équiper</button></div>`).join("")) : ""}

  ${section("Options payantes", notes(conseilsOffres(etat)))}
  ${section("Modes de jeu", MODES.map((m) => `<div class="ligne"><span class="corps"><b>${esc(m.nom)}</b><small class="multi">${esc(m.note)}</small></span></div>`).join(""))}
  ${section("Astuces", [...ASTUCES_JEU, ...CONSEILS_SOURCES].map((c) => `<div class="note or">${esc(c.texte)}</div>`).join(""), { pied: "Sources : guides communautaires ProGameGeek et TreyExGaming (2026)." })}`;
}

function conseilsCompagnons() {
  const c = [];
  const pieges = cat().pieges.map((x) => ({ ...x, ...(etat.pieges[x.id] || {}) }));
  const betes = cat().betes.map((x) => ({ ...x, ...(etat.betes[x.id] || {}) }));
  const effetsEquipe = new Set(equipeActuelle(etat).map((h) => h.effet).filter((e) => e !== "aucun"));
  const setsEquipe = new Set(equipeActuelle(etat).flatMap((h) => progression(etat, h.id).artefacts).map((id) => artefactsResolus(etat).find((a) => a.id === id)?.set).filter(Boolean));
  for (const p of pieges.filter((x) => x.possede && x.effet && x.effet !== "aucun")) {
    const setLie = Object.entries(SETS_CURIO).find(([, s]) => s.affinite.effet === p.effet);
    if (setLie && setsEquipe.has(setLie[0]) && !p.deploye) c.push({ niveau: "or", texte: `Déployez ${p.nom} (${EFFETS[p.effet]}) : chaque ${EFFETS[p.effet]} qu'il applique alimente votre set ${setLie[1].nom}.` });
    else if (effetsEquipe.has(p.effet) && !p.deploye) c.push({ niveau: "or", texte: `${p.nom} applique ${EFFETS[p.effet]}, comme votre équipe : bon candidat au déploiement.` });
  }
  const dep = pieges.filter((x) => x.deploye);
  if (dep.length) {
    const faible = [...dep].sort((a, b) => (a.niveau || 0) - (b.niveau || 0))[0];
    c.push({ niveau: "info", texte: `Pièges déployés : ${dep.map((x) => `${x.nom} niv. ${x.niveau || 1}`).join(", ")}. Montez d'abord ${faible.nom}.` });
  }
  const verr = pieges.filter((x) => x.fragments && !x.possede);
  if (verr.length) c.push({ niveau: "info", texte: `À débloquer avec ${verr[0].fragments} fragments : ${verr.map((x) => x.nom).join(", ")}.` });
  const places = placesBetes();
  const bDep = betes.filter((x) => x.deploye);
  if (bDep.length < places && betes.some((x) => x.possede && !x.deploye)) c.push({ niveau: "alerte", texte: `${places - bDep.length} place(s) de bête libre(s) : déployez ${betes.filter((x) => x.possede && !x.deploye).map((x) => x.nom).join(" ou ")}.` });
  if (bDep.length) c.push({ niveau: "info", texte: `Bêtes déployées : ${bDep.map((x) => `${x.nom} niv. ${x.niveau || 1}`).join(", ")}.` });
  if (!c.length) c.push({ niveau: "info", texte: "Indiquez vos pièges et bêtes (Héros › Pièges / Bêtes, ou import des écrans Trap et Beast)." });
  return c;
}

/* ---------- Boss ---------- */

function vueBoss() {
  const f = norm(ui.rechercheBoss);
  const liste = cat().boss.filter((b) => !f || norm(b.nom).includes(f) || norm(b.chapitre).includes(f));
  const aDesHeros = herosDe(etat).some((h) => progression(etat, h.id).possede);
  return `<h1 class="grand-titre">Boss</h1>
  <input class="recherche" type="search" id="recherche-boss" placeholder="Rechercher un boss ou un chapitre" data-ui="rechercheBoss" value="${esc(ui.rechercheBoss)}" aria-label="Rechercher un boss">
  ${liste.length ? section("", liste.map((b) => {
    const top = composerEquipe(herosDe(etat), b, etat, { mesHerosSeulement: ui.mesHeros && aDesHeros, taille: 3 });
    return `<button class="ligne" data-act="ouvrir" data-f="boss" data-id="${b.id}" style="align-items:flex-start"><span class="pastille-icone" style="background:var(--e-saignement)">${ic("boss", 18)}</span>
      <span class="corps"><b>${esc(b.nom)}</b><small class="multi">${b.modele ? "Modèle" : b.chapitre ? `Chapitre ${esc(b.chapitre)}` : "Boss"} · Conseillés : ${esc(top.map((e) => e.hero.nom).join(", "))}</small>
      <div class="puces" style="margin-top:6px">${b.faiblesses.map((k) => `<span class="puce bon">${esc(nomCible(k))}</span>`).join("")}${b.resistances.map((k) => `<span class="puce mauvais">${esc(nomCible(k))}</span>`).join("")}${b.traits.map((k) => `<span class="puce">${esc(TRAITS[k])}</span>`).join("")}</div></span>
      ${chevron()}</button>`;
  }).join(""), { pied: "Vert : faiblesse. Rouge : résistance. Recopiez-les depuis l'écran d'avant combat ; les « modèles » sont des archétypes." }) : `<div class="vide-etat"><b>Aucun boss</b>${f ? "Aucun boss ne correspond." : "Touchez + pour en ajouter un."}</div>`}
  <div style="margin-top:12px"><button class="btn or plein" data-act="ouvrir" data-f="fiche-boss" data-id="">Ajouter un boss</button></div>`;
}

/* ---------- Boutique ---------- */

function vueBoutique() {
  const actives = offresActives(etat);
  return `<h1 class="grand-titre">Boutique</h1>
  <p class="sous-titre">${actives.length ? `${actives.length} option(s) active(s).` : "Indiquez ce que vous avez acheté : la Stratégie s'adapte."}</p>
  ${section("Options payantes", cat().offres.map((o) => {
    const a = etat.abonnements[o.id] || {};
    const act = actives.find((x) => x.id === o.id);
    const reste = act?.joursRestants == null ? "" : act.joursRestants < 0 ? "Expirée" : `${act.joursRestants} j restants`;
    return `<div class="ligne"><button class="corps" style="border:0;background:none;text-align:left;padding:0;color:inherit" data-act="ouvrir" data-f="offre" data-id="${o.id}">
        <b>${esc(o.nom)}</b><small>${esc(a.actif ? reste || "Active" : o.prix)}</small></button>
        <input type="checkbox" class="interrupteur" data-offre="${o.id}" ${a.actif ? "checked" : ""} aria-label="J'ai souscrit ${esc(o.nom)}"></div>
      ${a.actif ? `<div class="champ"><label for="fin-${o.id}">Fin</label><input type="date" id="fin-${o.id}" data-offre-fin="${o.id}" value="${esc(a.fin || "")}"></div>` : ""}`;
  }).join(""), { pied: "Seuls deux prix sont publiés par les stores (packs 0,99 $ et 2,99 $). Touchez une option pour voir son contenu ou la modifier." })}
  <div style="margin-top:10px"><button class="btn plein" data-act="ouvrir" data-f="offre" data-id="">Ajouter une option vue dans le jeu</button></div>
  ${section("Codes cadeaux", CODES_CADEAUX.map((c) => `<div class="ligne" style="padding-right:4px"><label style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;min-height:44px"><input type="checkbox" class="coche" data-code="${esc(c.code)}" ${etat.codesUtilises[c.code] ? "checked" : ""} aria-label="Code ${esc(c.code)} utilisé">
      <span class="corps"><b style="font-family:ui-monospace,'SF Mono',Menlo,monospace">${esc(c.code)}</b><small>${etat.codesUtilises[c.code] ? "Utilisé" : esc(c.recompense)}</small></span></label>
      <button class="bouton-icone" data-act="copier-code" data-id="${esc(c.code)}" aria-label="Copier ${esc(c.code)}">${ic("copier", 20)}</button></div>`).join(""),
    { pied: "Dans le jeu : Profil › Paramètres › Échanger un code. Un code ne sert qu'une fois par compte ; validité non garantie." })}`;
}

/* ---------- Feuilles ---------- */

const stepper = (cle, valeur, min = 0) => `<div class="stepper"><button type="button" data-act="pas" data-cle="${cle}" data-pas="-1" aria-label="Moins">−</button>
  <input type="number" inputmode="numeric" min="${min}" data-num="${cle}" value="${esc(valeur)}" aria-label="Valeur"><button type="button" data-act="pas" data-cle="${cle}" data-pas="1" aria-label="Plus">+</button></div>`;
const champTexte = (id, label, cle, valeur, { type = "text", mode = "", ph = "" } = {}) => `<div class="champ"><label for="${id}">${label}</label>
  <input id="${id}" type="${type}" ${mode ? `inputmode="${mode}"` : ""} data-joueur="${cle}" value="${esc(valeur)}" placeholder="${esc(ph)}"></div>`;
const champStepper = (label, cle, valeur, min = 0) => `<div class="champ"><span class="etiquette">${label}</span><span style="flex:1"></span>${stepper(cle, valeur, min)}</div>`;
const champSaisie = "width:100%;background:var(--groupe-2);border:0;border-radius:8px;padding:8px 10px;font-size:16px";

/* Import par capture d'écran : les images ne sont jamais conservées. */
const imp = { etat: "attente", message: "", part: 0, propositions: null, textes: [] };
function viderImport() { imp.etat = "attente"; imp.message = ""; imp.part = 0; imp.propositions = null; imp.textes = []; }

const LIBELLES_PROFIL = { pseudo: "Pseudo", idJoueur: "ID joueur", niveau: "Niveau", guilde: "Guilde", puissance: "Puissance", vip: "VIP", etape: "Étape", porte: "Porte", lit: "Lit", recherche: "Room Research",
  coffreCurios: "Curio Vault", equipementNiveau: "Gear (amélioration)", palierEquipement: "Palier Gear", serveur: "Serveur", arretTrain: "Infinity Train (Stop)" };

function feuilleImport() {
  if (imp.etat === "lecture") {
    return ["Lecture", `<div style="padding:40px 8px;text-align:center"><b>${esc(imp.message)}</b>
      <div class="barre-prog" style="margin:16px 0"><i style="width:${Math.round(imp.part * 100)}%"></i></div>
      <p class="pied">La lecture se fait sur votre téléphone. Les captures ne sont ni envoyées ni conservées.</p></div>`];
  }
  if (imp.etat === "erreur") return ["Import impossible", `${section("", `<div class="note alerte">${esc(imp.message)}</div>`)}<div style="margin-top:12px"><button class="btn plein" data-act="import-recommencer">Réessayer</button></div>`];
  if (imp.etat === "resultats") {
    const p = imp.propositions;
    const champsProfil = Object.keys(p.profil);
    const nb = champsProfil.length + Object.keys(p.stock).length + p.heros.length + p.artefacts.length + p.skins.length + p.pieges.length + p.betes.length + p.abonnements.length + (p.tentativesTrain ? 1 : 0);
    const coche = (cle, x) => `<input type="checkbox" class="coche" data-imp-coche="${cle}" ${x.garder ? "checked" : ""} aria-label="Garder">`;
    const nombre = (cle, v, label) => `<label style="min-width:0;display:block"><small style="color:var(--texte-2);font-size:12px">${label}</small><input type="number" inputmode="numeric" min="0" data-imp="${cle}" value="${v ?? ""}" placeholder="—" style="${champSaisie}"></label>`;
    const choixHero = (cle, id) => `<select data-imp="${cle}" aria-label="Héros" style="${champSaisie}"><option value="">Héros ?</option>${herosDe(etat).map((h) => `<option value="${h.id}" ${h.id === id ? "selected" : ""}>${esc(h.nom)}</option>`).join("")}</select>`;
    const champLibre = (cle, v, label) => `<input data-imp="${cle}" value="${esc(v)}" aria-label="${esc(label)}" style="${champSaisie}">`;
    return [`${nb} info(s) trouvée(s)`, `
      <p class="pied" style="padding-top:8px">${nb ? "Décochez ce qui est faux, corrigez si besoin, puis enregistrez. Les champs vides ne changent rien." : ""}</p>
      ${!nb ? section("", `<div class="note alerte">Rien de reconnu. Essayez une capture plus nette, en plein écran, sans recadrer les textes.</div>`) : ""}
      ${champsProfil.length ? section("Compte", champsProfil.map((k) => `<div class="ligne">${coche(`profil.${k}`, p.profil[k])}<span class="corps"><small>${LIBELLES_PROFIL[k]}</small>${champLibre(`profil.${k}`, p.profil[k].valeur, LIBELLES_PROFIL[k])}</span></div>`).join("")) : ""}
      ${p.abonnements.length ? section("Passes", p.abonnements.map((x, i) => {
        const o = cat().offres.find((y) => y.id === x.id);
        return `<div class="ligne">${coche(`abonnements.${i}`, x)}<span class="corps"><b>${esc(o?.nom || x.id)}</b><small>${x.actif ? `Souscrit${x.jours ? ` · encore ${x.jours} j` : " · durée non lue"}` : "Non souscrit"}</small></span>
          ${x.actif ? `<div style="width:82px">${nombre(`abonnements.${i}.jours`, x.jours, "Jours")}</div>` : ""}</div>`;
      }).join("")) : ""}
      ${p.tentativesTrain ? section("Infinity Train", `<div class="ligne"><span class="corps"><b>Tentatives du jour : ${p.tentativesTrain.restantes}/${p.tentativesTrain.total}</b><small>${p.tentativesTrain.restantes === 0 ? "La tâche du jour sera cochée." : "La tâche du jour reste à faire."}</small></span></div>`) : ""}
      ${Object.keys(p.stock).length ? section("Ressources", Object.entries(p.stock).map(([k, x]) => `<div class="ligne">${coche(`stock.${k}`, x)}<span class="corps"><small>${esc(RESSOURCES.find((r) => r.id === k)?.nom)}</small>${champLibre(`stock.${k}`, x.valeur, k)}</span></div>`).join("")) : ""}
      ${p.heros.length ? section(`Héros (${p.heros.length})`, p.heros.map((x, i) => `<div class="ligne" style="align-items:flex-start">${coche(`heros.${i}`, x)}<span class="corps">
        ${choixHero(`heros.${i}.heroId`, x.heroId)}<small style="margin:4px 0 6px">Lu : « ${esc(x.lu)} »${x.sim < 1 ? ` · ressemblance ${Math.round(x.sim * 100)} %` : ""}${x.douteux ? ` · niveau lu « ${x.douteux} » écarté, à vérifier` : ""}</small>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${nombre(`heros.${i}.niveau`, x.niveau, "Niveau")}${nombre(`heros.${i}.promotion`, x.promotion, "Promotion")}${nombre(`heros.${i}.etoiles`, x.etoiles, "Étoiles")}</div></span></div>`).join("")) : ""}
      ${p.artefacts.filter((x) => x.set).length ? section(`Curios (${p.artefacts.filter((x) => x.set).length})`, p.artefacts.map((x, i) => x.set ? `<div class="ligne">${coche(`artefacts.${i}`, x)}${pastilleRarete(x.rarete)}<span class="corps"><b>${esc(x.nom)}</b><small>${esc(SETS_CURIO[x.set]?.nom || "")}</small></span>
        <div style="width:82px">${nombre(`artefacts.${i}.etoiles`, x.etoiles, "Étoiles")}</div></div>` : "").join(""), { pied: "Les étoiles ne se lisent pas sur la capture : indiquez-les si vous le souhaitez." }) : ""}
      ${p.artefacts.filter((x) => !x.set).length ? section(`Artefacts (${p.artefacts.filter((x) => !x.set).length})`, p.artefacts.map((x, i) => x.set ? "" : `<div class="ligne" style="align-items:flex-start">${coche(`artefacts.${i}`, x)}<span class="corps" style="display:grid;gap:6px">
        ${champLibre(`artefacts.${i}.nom`, x.nom, "Nom")}<small>${x.ref ? "Déjà au catalogue" : "Nouveau : sera ajouté au catalogue"}</small>
        <div style="display:grid;grid-template-columns:1fr 1fr 70px;gap:6px;align-items:end"><select data-imp="artefacts.${i}.stat" style="${champSaisie}" aria-label="Stat">${opts(STATS_ARTEFACT, x.stat)}</select>
          <select data-imp="artefacts.${i}.rarete" style="${champSaisie}" aria-label="Rareté">${optsListe(RARETES, x.rarete)}</select>${nombre(`artefacts.${i}.niveau`, x.niveau, "Niv.")}</div></span></div>`).join("")) : ""}
      ${[["pieges", "Pièges"], ["betes", "Bêtes"]].map(([k, titre]) => p[k].length ? section(`${titre} (${p[k].length})`, p[k].map((x, i) => `<div class="ligne">${coche(`${k}.${i}`, x)}<span class="corps"><b>${esc(x.nom)}</b><small>${x.verrouille ? "Verrouillé : ne sera pas marqué comme obtenu" : "Obtenu"}</small></span>
        <div style="width:82px">${nombre(`${k}.${i}.niveau`, x.niveau, "Niveau")}</div></div>`).join("")) : "").join("")}
      ${p.skins.length ? section(`Skins (${p.skins.length})`, p.skins.map((x, i) => `<div class="ligne" style="align-items:flex-start">${coche(`skins.${i}`, x)}<span class="corps" style="display:grid;gap:6px">
        ${champLibre(`skins.${i}.nom`, x.nom, "Nom du skin")}${choixHero(`skins.${i}.heroId`, x.heroId)}</span></div>`).join("")) : ""}
      <div style="display:grid;gap:8px;margin-top:16px">${nb ? `<button class="btn or plein" data-act="import-appliquer">Enregistrer la sélection</button>` : ""}<button class="btn plein" data-act="import-recommencer">Importer d'autres captures</button></div>
      <details class="section"><summary class="pied" style="cursor:pointer">Voir le texte lu</summary><div class="groupe" style="margin-top:6px">${imp.textes.map((t) => `<pre class="lu">${esc(t)}</pre>`).join("")}</div></details>`];
  }
  return ["Importer des captures", `
    ${section("Captures à faire dans le jeu", `<div class="note or">Écran principal : niveau, puissance, étape, Diamants, Or, Stamina.</div>
      <div class="note or">My Heroes : faites défiler et capturez chaque page (niveaux des héros).</div>
      <div class="note or">Curio Codex : les onglets R, SSR, UR et CR (curios possédés, Curio Vault).</div>
      <div class="note or">Gear : niveau d'amélioration, palier, Leather, Or, Soul Flame.</div>
      <div class="note or">Trap et Beast : niveaux et éléments débloqués.</div>
      <div class="note or">Value Pass : passes souscrits et jours restants.</div>
      <div class="note or">Infinity Train : arrêt atteint et tentatives du jour.</div>`,
      { pied: "Anglais et français. Vous pouvez choisir plusieurs captures à la fois." })}
    <label class="btn or plein" style="margin-top:14px">${ic("photo", 20)} Choisir des captures<input type="file" accept="image/*" multiple data-import-captures class="cache"></label>
    ${section("Confidentialité", `<div class="note ok">La lecture se fait sur le téléphone : rien n'est envoyé.</div><div class="note ok">Les captures ne sont pas conservées : seules les infos validées sont enregistrées.</div>`,
      { pied: "La première fois, l'app télécharge son moteur de lecture (environ 8 Mo), puis il fonctionne hors ligne." })}`];
}

async function lancerImport(fichiers) {
  imp.etat = "lecture"; imp.message = "Préparation"; imp.part = 0;
  rendreFeuille();
  let dernier = 0;
  try {
    const lus = await lireCaptures(fichiers, (p) => {
      if (p.etape === "image") { imp.message = `Lecture de la capture ${p.index} sur ${p.total}`; imp.part = (p.index - 1) / p.total; }
      else if (p.etape === "chargement") { imp.message = "Chargement du moteur de lecture"; imp.part = p.part || 0; }
      else if (p.etape === "lecture") imp.part = Math.max(imp.part, p.part || 0);
      const now = Date.now();
      if (now - dernier > 150) { dernier = now; rendreFeuille(); }
    });
    fichiers.length = 0; // on lâche les références aux images
    const ordonne = lus.map((t) => (t.elements?.length ? ordonnerParCartes(t.elements, cat()) : t.texte)).join("\n");
    const brut = lus.map((t) => t.texte).join("\n");
    imp.textes = lus.map((t) => t.texte);
    const prop = analyserTexte(ordonne, cat());
    const compte = lireProfil(brut, RESSOURCES);
    const abonnementsLus = {};
    let tentativesTrain = null;
    for (const t of lus) {
      const e = lireEcrans(t.elements, { largeur: t.largeur, hauteur: t.hauteur });
      if (e.profil.tentativesTrain) { tentativesTrain = e.profil.tentativesTrain; delete e.profil.tentativesTrain; }
      Object.assign(compte.profil, e.profil); Object.assign(compte.stock, e.stock); Object.assign(abonnementsLus, e.abonnements);
    }
    for (const k of ["heros", "artefacts", "skins", "pieges", "betes"]) for (const x of prop[k]) x.garder = true;
    // Niveau incohérent avec le reste de l'import (« Lv.675 » ou « Lv.6 » pour 67) : écarté, à saisir.
    const niv = prop.heros.map((h) => h.niveau).filter((v) => v !== null).sort((a, b) => a - b);
    const median = niv.length >= 4 ? niv[Math.floor(niv.length / 2)] : null;
    if (median) for (const h of prop.heros) if (h.niveau !== null && (h.niveau > median * 3 || h.niveau < median / 3)) { h.douteux = h.niveau; h.niveau = null; }
    imp.propositions = {
      ...prop,
      profil: Object.fromEntries(Object.entries(compte.profil).map(([k, v]) => [k, { valeur: v, garder: true }])),
      stock: Object.fromEntries(Object.entries(compte.stock).map(([k, v]) => [k, { valeur: v, garder: true }])),
      abonnements: Object.entries(abonnementsLus).map(([id, a]) => ({ id, ...a, garder: true })),
      tentativesTrain,
    };
    imp.etat = "resultats";
  } catch (e) {
    imp.etat = "erreur";
    imp.message = /introuvable|Failed to fetch|NetworkError|load/i.test(String(e?.message || e))
      ? "Le moteur de lecture n'a pas pu se charger. Ouvrez l'app installée (zboolbi.github.io/app-knock-knock-manager) avec une connexion la première fois."
      : `La lecture a échoué : ${e?.message || e}. Essayez avec moins de captures à la fois.`;
  }
  if (ui.feuille?.type === "import") rendreFeuille();
}

function appliquerImport() {
  const p = imp.propositions;
  if (!p) return;
  let n = 0;
  for (const [k, x] of Object.entries(p.profil)) {
    if (!x.garder || x.valeur === "" || x.valeur == null) continue;
    const nombre = ["niveau", "porte", "lit", "recherche", "vip", "puissance", "coffreCurios", "equipementNiveau", "palierEquipement", "arretTrain"].includes(k);
    const v = nombre ? Number(String(x.valeur).replace(/[\s  ]/g, "")) : String(x.valeur).trim();
    if (nombre && !Number.isFinite(v)) continue;
    etat.joueur[k] = v; n++;
  }
  for (const [k, x] of Object.entries(p.stock)) {
    const v = Number(String(x.valeur).replace(/[\s  ]/g, ""));
    if (x.garder && String(x.valeur).trim() !== "" && Number.isFinite(v)) { etat.stock[k] = Math.max(0, Math.round(v)); n++; }
  }
  for (const x of p.heros) {
    if (!x.garder || !x.heroId || !heroParId(x.heroId)) continue;
    const r = fiche(x.heroId);
    r.possede = true;
    for (const c of ["niveau", "promotion", "etoiles"]) if (x[c] !== null && x[c] !== "" && Number.isFinite(Number(x[c]))) r[c] = Math.max(c === "niveau" ? 1 : 0, Number(x[c]));
    n++;
  }
  for (const x of p.artefacts) {
    if (!x.garder || !String(x.nom || "").trim()) continue;
    // Curio du catalogue : on le marque comme possédé, sans doublon.
    const fiche = x.ref && cat().artefacts.find((a) => a.id === x.ref);
    if (fiche?.set) {
      let inv = etat.inventaire.find((i) => i.ref === fiche.id);
      if (!inv) { inv = { id: nouvelId("art"), ref: fiche.id, etoiles: 1, niveau: 0 }; etat.inventaire.push(inv); }
      if (x.etoiles !== null && x.etoiles !== "" && Number.isFinite(Number(x.etoiles))) inv.etoiles = Math.max(0, Number(x.etoiles));
      n++; continue;
    }
    let ref = x.ref && cat().artefacts.some((a) => a.id === x.ref) ? x.ref : null;
    if (!ref) {
      const meme = cat().artefacts.find((a) => norm(a.nom) === norm(x.nom));
      ref = meme?.id || nouvelId("cat-art");
      if (!meme) cat().artefacts.push({ id: ref, nom: String(x.nom).trim(), stat: x.stat, rarete: x.rarete, effet: "" });
    }
    etat.inventaire.push({ id: nouvelId("art"), ref, rarete: x.rarete, niveau: Math.max(0, Number(x.niveau) || 0) });
    n++;
  }
  for (const x of p.skins) {
    if (!x.garder || !String(x.nom || "").trim() || !x.heroId) continue;
    let s = x.ref ? cat().skins.find((k) => k.id === x.ref) : cat().skins.find((k) => norm(k.nom) === norm(x.nom) && k.heroId === x.heroId);
    if (!s) { s = { id: nouvelId("skin"), nom: String(x.nom).trim(), heroId: x.heroId, bonusStat: "", bonusValeur: "", obtention: "" }; cat().skins.push(s); }
    etat.skinsPossedes[s.id] = true; n++;
  }
  for (const sorte of ["pieges", "betes"]) for (const x of p[sorte] || []) {
    if (!x.garder) continue;
    const actuel = etat[sorte][x.id] || {};
    etat[sorte][x.id] = { ...actuel, possede: !x.verrouille || actuel.possede, ...(x.niveau !== null && x.niveau !== "" && Number.isFinite(Number(x.niveau)) ? { niveau: Math.max(1, Number(x.niveau)) } : {}) };
    n++;
  }
  for (const x of p.abonnements || []) {
    if (!x.garder) continue;
    const fin = x.actif && Number(x.jours) > 0 ? new Date(Date.now() + Number(x.jours) * 86400000).toISOString().slice(0, 10) : etat.abonnements[x.id]?.fin || "";
    etat.abonnements[x.id] = { ...(etat.abonnements[x.id] || {}), actif: !!x.actif, fin: x.actif ? fin : "" };
    n++;
  }
  if (p.tentativesTrain) {
    if (etat.quotidien.date !== aujourdhui()) etat.quotidien = { date: aujourdhui(), coches: {} };
    etat.quotidien.coches[TACHE_TRAIN] = p.tentativesTrain.restantes === 0;
  }
  etat.joueur.majImport = new Date().toISOString();
  viderImport();
  fermer(); enregistrer();
  toast(`${n} info(s) enregistrée(s)`);
}

const FEUILLES = {
  import: feuilleImport,
  reglages() {
    return ["Réglages", `
      ${section("Compte", `${ligneNav("profil", "Profil du joueur", etat.joueur.pseudo || "À compléter", { icone: "utilisateur" })}${ligneNav("import", "Importer des captures", "Remplit le profil automatiquement", { icone: "photo" })}${ligneNav("ressources", "Ressources", "Diamants, Or, Soul Flame…", { icone: "gemme" })}`)}
      ${section("Données", `${ligneNav("sauvegarde", "Sauvegarde et transfert", "Copier, coller, fichier", { icone: "sauvegarde" })}${ligneNav("confidentialite", "Confidentialité", "Ce qui est gardé sur le téléphone", { icone: "cadenas" })}`)}
      ${section("Catalogue du jeu", `${ligneNav("cat-heros", "Héros", "", { icone: "heros", valeur: String(herosDe(etat).length) })}${ligneNav("cat-artefacts", "Artefacts", "", { icone: "gemme", valeur: String(cat().artefacts.length) })}${ligneNav("promotions", "Paliers de promotion", "", { icone: "etoile" })}`)}
      ${section("Aide", `${ligneNav("installer", "Installer sur l'iPhone", "", { icone: "telephone" })}${ligneNav("connexion", "Connexion au compte du jeu", "", { icone: "lien" })}`)}
      ${section("", `<button class="ligne" data-act="reinitialiser" data-confirmer="Touchez encore pour tout effacer"><span class="pastille-icone" style="background:var(--mauvais-fond);color:var(--mauvais)">${ic("corbeille", 18)}</span><span class="corps"><b style="color:var(--mauvais)">Effacer mon profil</b></span></button>`,
        { pied: "Application non officielle, sans lien avec l'éditeur du jeu. Données : guides communautaires et fiches des stores (2026)." })}`];
  },
  profil() {
    const j = etat.joueur;
    return ["Profil du joueur", `
      ${section("Identité", `${champTexte("p-pseudo", "Pseudo", "pseudo", j.pseudo, { ph: "Votre pseudo" })}${champTexte("p-id", "ID joueur", "idJoueur", j.idJoueur, { mode: "numeric", ph: "—" })}${champTexte("p-guilde", "Guilde", "guilde", j.guilde, { ph: "Aucune" })}`)}
      ${section("Progression", `${champStepper("Niveau", "joueur.niveau", j.niveau, 1)}${champTexte("p-etape", "Étape", "etape", j.etape, { ph: "Ex. 24-5" })}${champTexte("p-puiss", "Puissance", "puissance", j.puissance, { type: "number", mode: "numeric", ph: "—" })}${champTexte("p-vip", "VIP", "vip", j.vip, { type: "number", mode: "numeric", ph: "—" })}`)}
      ${section("Équipement", `${champTexte("p-vault", "Curio Vault (niv.)", "coffreCurios", j.coffreCurios, { type: "number", mode: "numeric", ph: "—" })}${champTexte("p-gear", "Gear (amélioration)", "equipementNiveau", j.equipementNiveau, { type: "number", mode: "numeric", ph: "+—" })}${champTexte("p-tier", "Palier Gear (Tier)", "palierEquipement", j.palierEquipement, { type: "number", mode: "numeric", ph: "—" })}${champTexte("p-train", "Infinity Train (Stop)", "arretTrain", j.arretTrain, { type: "number", mode: "numeric", ph: "—" })}${champTexte("p-serveur", "Serveur", "serveur", j.serveur, { ph: "Ex. Europe" })}`,
        { pied: `Curio Vault : ${esc(CURIO_VAULT.bonusParNiveau)}. Niveau 400 : ${esc(CURIO_VAULT.paliers[0].bonus)}.` })}
      ${section("Pièce", `${champStepper("Porte", "joueur.porte", j.porte)}${champStepper("Lit", "joueur.lit", j.lit)}${champStepper("Room Research", "joueur.recherche", j.recherche || 0)}${champStepper("Emplacements d'artefact", "joueur.emplacements", j.emplacements, 1)}`,
        { pied: "La Porte plafonne le Lit. Room Research relève les plafonds des deux. Les héros portent 4 curios : un set complet." })}`];
  },
  ressources() {
    return ["Ressources", `${section("", RESSOURCES.map((r) => `<div class="champ"><label for="r-${r.id}">${esc(r.nom)}</label><input id="r-${r.id}" type="number" inputmode="numeric" min="0" data-stock="${r.id}" value="${esc(etat.stock[r.id] ?? "")}" placeholder="—"></div>`).join(""),
      { pied: "Remplies automatiquement par l'import de captures, modifiables ici." })}
      ${section("Comment les dépenser", RESSOURCES.map((r) => `<div class="ligne" style="align-items:flex-start"><span class="pastille-icone">${ic(ICONE_RESSOURCE[r.id])}</span><span class="corps"><b>${esc(r.nom)}</b><small class="multi">${esc(r.conseil)}</small></span></div>`).join(""))}`];
  },
  equipe() {
    const possedes = herosDe(etat).filter((h) => progression(etat, h.id).possede);
    const liste = possedes.length ? possedes : herosDe(etat);
    return [`Équipe · ${etat.equipe.length}/${TAILLE_EQUIPE}`, `
      ${!possedes.length ? `<p class="pied" style="padding-top:8px">Aucun héros marqué comme obtenu : tout le catalogue est proposé.</p>` : ""}
      ${section("", liste.map((h) => `<label class="ligne">${avatar(h, { taille: 36 })}<span class="corps"><b>${esc(h.nom)}</b><small>${esc(resumeHero(h.id))} · ${esc(ROLES[h.role])}</small></span>
        <input type="checkbox" class="coche" data-equipe="${h.id}" ${etat.equipe.includes(h.id) ? "checked" : ""}></label>`).join(""))}`];
  },
  hero(id) {
    const h = heroParId(id);
    if (!h) return ["Héros", `<div class="vide-etat">Héros introuvable.</div>`];
    const p = progression(etat, id);
    const skins = cat().skins.filter((s) => s.heroId === id);
    const arts = artefactsResolus(etat);
    const qui = porteurs(etat);
    const empl = Number(etat.joueur.emplacements) || 2;
    const pal = prochainPalier(p.promotion);
    const sel = (attrs, inner) => `<select ${attrs} style="flex:1;min-width:0;background:none;border:0;text-align:right;color:var(--texte-2);font-size:17px">${inner}</select>`;
    return [h.nom, `
      <div class="entete-fiche">${avatar(h, { terne: !p.possede })}<div style="min-width:0"><h3>${esc(h.nom)}</h3><div class="puces" style="margin-top:6px">${puces(h)}</div></div></div>
      ${section("", `<label class="champ"><span class="etiquette">Je l'ai</span><span style="flex:1"></span><input type="checkbox" class="interrupteur" data-roster="${id}" data-champ="possede" ${p.possede ? "checked" : ""}></label>
        <label class="champ"><span class="etiquette">Dans mon équipe</span><span style="flex:1"></span><input type="checkbox" class="interrupteur" data-equipe="${id}" ${etat.equipe.includes(id) ? "checked" : ""}></label>`)}
      ${p.possede ? section("Progression", `${champStepper("Niveau", `roster.${id}.niveau`, p.niveau, 1)}${champStepper("Promotion", `roster.${id}.promotion`, p.promotion)}${champStepper("Étoiles", `roster.${id}.etoiles`, p.etoiles)}`,
        { pied: pal ? `Prochain palier P${pal.niveau} : ${esc(pal.bonus)}.` : "Palier de promotion maximal atteint." }) : ""}
      ${p.possede ? section("Équipement", `${Array.from({ length: empl }, (_, i) => `<div class="champ"><span class="etiquette">Curio ${i + 1}</span>${sel(`data-slot="${id}" data-index="${i}" aria-label="Curio ${i + 1}"`, `<option value="">Vide</option>${arts.map((a) => { const autre = qui.get(a.id); return `<option value="${a.id}" ${p.artefacts[i] === a.id ? "selected" : ""}>${esc(a.nom)} (${esc(STATS_ARTEFACT[a.stat])})${autre && autre !== id ? ` · sur ${esc(heroParId(autre)?.nom || "?")}` : ""}</option>`; }).join("")}`)}</div>`).join("")}
        <div class="champ"><span class="etiquette">Skin</span>${sel(`data-hero-skin="${id}" aria-label="Skin"`, `<option value="">Aucun</option>${skins.map((s) => `<option value="${s.id}" ${p.skin === s.id ? "selected" : ""}>${esc(s.nom)}${etat.skinsPossedes[s.id] ? "" : " (non possédé)"}</option>`).join("")}`)}</div>
        ${ligneNav("fiche-skin", "Ajouter un skin pour ce héros")}`.replace('data-f="fiche-skin" data-id=""', `data-f="fiche-skin" data-id="" data-hero="${id}"`),
        { pied: `Sets de curios à viser : ${setsIdeaux(h).map((x) => esc(x.nom)).join(" › ")}.` }) : ""}
      ${section("Fiche", `${h.competences ? `<div class="ligne"><span class="corps"><small>Compétences</small><b style="white-space:normal;font-size:15px">${esc(h.competences)}</b></span></div>` : ""}
        ${h.aura ? `<div class="ligne"><span class="corps"><small>Aura</small><b style="white-space:normal;font-size:15px">${esc(h.aura)}</b></span></div>` : ""}
        ${h.note ? `<div class="ligne"><span class="corps"><small>Note</small><b style="white-space:normal;font-size:15px">${esc(h.note)}</b></span></div>` : ""}
        ${!h.competences && !h.aura ? `<div class="ligne"><span class="corps"><small class="multi">Compétences non publiées : recopiez-les depuis la fiche du héros dans le jeu.</small></span></div>` : ""}
        ${ligneNav("fiche-hero", "Modifier la fiche", `Source : ${h.source || "vous"}`, { id })}`)}`];
  },
  "fiche-hero"(id) {
    const h = heroParId(id) || { nom: "", rarete: "UR", type: "physique", effet: "aucun", role: "mono", tier: "B", competences: "", aura: "", note: "" };
    const ch = (label, inner) => `<div class="champ"><label>${label}</label>${inner}</div>`;
    return [id ? "Modifier la fiche" : "Nouveau héros", `<form data-form="hero" data-id="${esc(id)}">
      ${section("", `<div class="champ bloc"><label for="fh-nom">Nom</label><input id="fh-nom" name="nom" required value="${esc(h.nom)}"></div>
        ${ch("Rareté", `<select name="rarete">${optsListe(RARETES, h.rarete)}</select>`)}${ch("Tier", `<select name="tier">${optsListe(TIERS, h.tier)}</select>`)}
        ${ch("Type d'attaque", `<select name="type">${opts(TYPES, h.type)}</select>`)}${ch("Effet", `<select name="effet">${opts(EFFETS, h.effet)}</select>`)}${ch("Rôle", `<select name="role">${opts(ROLES, h.role)}</select>`)}`)}
      ${section("Description", `<div class="champ bloc"><label for="fh-comp">Compétences / ultime</label><textarea id="fh-comp" name="competences" rows="3">${esc(h.competences)}</textarea></div>
        <div class="champ bloc"><label for="fh-aura">Aura (déployé)</label><textarea id="fh-aura" name="aura" rows="2">${esc(h.aura)}</textarea></div>
        <div class="champ bloc"><label for="fh-note">Notes</label><textarea id="fh-note" name="note" rows="2">${esc(h.note)}</textarea></div>`)}
      <div style="display:grid;gap:8px;margin-top:16px"><button class="btn or plein" type="submit">Enregistrer</button>
      ${id ? `<button class="btn danger plein" type="button" data-act="suppr-hero" data-id="${id}" data-confirmer="Touchez encore pour supprimer">Supprimer du catalogue</button>` : ""}</div></form>`];
  },
  "ajout-artefact"() {
    return ["Ajouter un artefact", `
      <form data-form="artefact-inventaire">${section("Depuis le catalogue", `<div class="champ"><label for="aa-ref">Artefact</label><select id="aa-ref" name="ref">${cat().artefacts.map((a) => `<option value="${a.id}">${esc(a.nom)}</option>`).join("")}</select></div>
        <div class="champ"><label>Rareté</label><select name="rarete">${optsListe(RARETES, "SSR")}</select></div>
        <div class="champ"><label for="aa-niv">Niveau</label><input id="aa-niv" name="niveau" type="number" inputmode="numeric" min="0" value="0"></div>`)}
        <div style="margin-top:10px"><button class="btn or plein" type="submit">Ajouter à mon inventaire</button></div></form>
      <form data-form="artefact-catalogue">${section("Nouvel artefact", `<div class="champ bloc"><label for="ac-nom">Nom exact dans le jeu</label><input id="ac-nom" name="nom" required></div>
        <div class="champ"><label>Stat principale</label><select name="stat">${opts(STATS_ARTEFACT, "patk")}</select></div>
        <div class="champ"><label>Rareté</label><select name="rarete">${optsListe(RARETES, "SSR")}</select></div>
        <div class="champ bloc"><label for="ac-eff">Effet spécial</label><input id="ac-eff" name="effet" placeholder="Ex. +10 % de durée de Brûlure"></div>`)}
        <div style="margin-top:10px"><button class="btn plein" type="submit">Créer et ajouter</button></div></form>`];
  },
  artefact(id) {
    const inv = etat.inventaire.find((i) => i.id === id);
    const a = artefactsResolus(etat).find((x) => x.id === id);
    if (!inv || !a) return ["Artefact", `<div class="vide-etat">Artefact introuvable.</div>`];
    const qui = porteurs(etat).get(id) || "";
    const set = SETS_CURIO[a.set];
    return [a.nom, `${section("", `${set ? `<div class="champ"><span class="etiquette">Set</span><span class="valeur" style="flex:1;text-align:right">${esc(set.nom)}</span></div>
      <div class="champ"><span class="etiquette">Rareté</span><span style="flex:1"></span>${pastilleRarete(a.rarete)}</div>${champStepper("Étoiles", `inv.${id}.etoiles`, a.etoiles)}`
      : `<div class="champ"><span class="etiquette">Stat</span><span class="valeur" style="flex:1;text-align:right">${esc(STATS_ARTEFACT[a.stat])}</span></div>
      <div class="champ"><label>Rareté</label><select data-inv="${id}" data-champ="rarete">${optsListe(RARETES, a.rarete)}</select></div>${champStepper("Niveau", `inv.${id}.niveau`, a.niveau)}`}
      ${a.effet ? `<div class="champ"><span class="etiquette">Effet</span><span class="valeur" style="flex:1;text-align:right;white-space:normal">${esc(a.effet)}</span></div>` : ""}
      <div class="champ"><label for="porteur">Porté par</label><select id="porteur" data-porteur="${id}"><option value="">Personne</option>${herosDe(etat).filter((h) => progression(etat, h.id).possede).map((h) => `<option value="${h.id}" ${qui === h.id ? "selected" : ""}>${esc(h.nom)}</option>`).join("")}</select></div>`)}
      ${set ? `<p class="pied">Effet du set : ${esc(set.effet)}</p>` : ""}
      <div style="margin-top:16px"><button class="btn danger plein" data-act="suppr-inv" data-id="${id}" data-confirmer="Touchez encore pour retirer">Je ne l'ai plus</button></div>`];
  },
  compagnon(cle) {
    const [sorte, id] = cle.split(":");
    const x = (cat()[sorte] || []).find((y) => y.id === id);
    if (!x) return ["Introuvable", `<div class="vide-etat">Élément introuvable.</div>`];
    const p = etat[sorte][id] || {};
    return [x.nom, `
      <div class="entete-fiche">${pastilleRarete(x.rarete)}<div><h3>${esc(x.nom)}</h3><div class="pied" style="padding:2px 0 0">${sorte === "pieges" ? "Piège" : "Bête"}${x.competence ? ` · ${esc(x.competence)}` : ""}${x.effet && x.effet !== "aucun" ? ` · ${esc(EFFETS[x.effet])}` : ""}${x.type ? ` · ${esc(TYPES[x.type])}` : ""}</div></div></div>
      ${section("", `<label class="champ"><span class="etiquette">Je l'ai</span><span style="flex:1"></span><input type="checkbox" class="interrupteur" data-comp-possede="${sorte}:${id}" ${p.possede ? "checked" : ""}></label>
        <label class="champ"><span class="etiquette">Déployé</span><span style="flex:1"></span><input type="checkbox" class="interrupteur" data-comp-deploye="${sorte}:${id}" ${p.deploye ? "checked" : ""}></label>`)}
      ${p.possede ? section("Progression", `${champStepper("Niveau", `${sorte}.${id}.niveau`, p.niveau || 1, 1)}${champStepper("Étoiles", `${sorte}.${id}.etoiles`, p.etoiles || 0)}`) : ""}
      ${x.fragments && !p.possede ? `<p class="pied">Se débloque avec ${x.fragments} fragment(s).</p>` : ""}`];
  },
  "fiche-skin"(id, extra) {
    const s = cat().skins.find((x) => x.id === id) || { nom: "", heroId: extra || "", bonusStat: "", bonusValeur: "", obtention: "" };
    return [id ? s.nom : "Nouveau skin", `<form data-form="skin" data-id="${esc(id)}">
      ${section("", `<div class="champ bloc"><label for="fs-nom">Nom du skin</label><input id="fs-nom" name="nom" required value="${esc(s.nom)}"></div>
        <div class="champ"><label>Héros</label><select name="heroId" required>${herosDe(etat).map((h) => `<option value="${h.id}" ${h.id === s.heroId ? "selected" : ""}>${esc(h.nom)}</option>`).join("")}</select></div>
        <div class="champ"><label>Bonus</label><select name="bonusStat"><option value="">Cosmétique</option>${opts(STATS_ARTEFACT, s.bonusStat)}</select></div>
        <div class="champ"><label for="fs-val">Valeur (%)</label><input id="fs-val" name="bonusValeur" type="number" inputmode="decimal" min="0" step="0.1" value="${esc(s.bonusValeur)}" placeholder="—"></div>
        <div class="champ"><label for="fs-obt">Obtention</label><input id="fs-obt" name="obtention" value="${esc(s.obtention)}" placeholder="Ex. événement"></div>
        <label class="champ"><span class="etiquette">Je l'ai</span><span style="flex:1"></span><input type="checkbox" class="interrupteur" name="possede" ${etat.skinsPossedes[id] ? "checked" : ""}></label>`)}
      <div style="display:grid;gap:8px;margin-top:16px"><button class="btn or plein" type="submit">Enregistrer</button>
      ${id ? `<button class="btn danger plein" type="button" data-act="suppr-skin" data-id="${id}" data-confirmer="Touchez encore pour supprimer">Supprimer</button>` : ""}</div></form>`];
  },
  boss(id) {
    const b = bossParId(id);
    if (!b) return ["Boss", `<div class="vide-etat">Boss introuvable.</div>`];
    const aDesHeros = herosDe(etat).some((h) => progression(etat, h.id).possede);
    const mes = ui.mesHeros && aDesHeros;
    const equipe = composerEquipe(herosDe(etat), b, etat, { mesHerosSeulement: mes });
    const conf = configurationArtefacts(etat, equipe.map((e) => e.hero));
    const parFaiblesse = b.faiblesses.map((k) => ({ k, heros: classerContre(herosDe(etat), b, etat, { mesHerosSeulement: mes }).filter((c) => c.hero.type === k || c.hero.effet === k).slice(0, 3) }));
    return [b.nom, `
      <div class="entete-fiche"><span class="pastille-icone" style="width:56px;height:56px;border-radius:14px;background:var(--e-saignement)">${ic("boss", 30)}</span><div><h3>${esc(b.nom)}</h3><div class="pied" style="padding:2px 0 0">${b.modele ? "Modèle d'archétype" : b.chapitre ? `Chapitre ${esc(b.chapitre)}` : ""}</div></div></div>
      <div class="puces" style="margin-top:12px">${b.faiblesses.map((k) => `<span class="puce bon">Faible : ${esc(nomCible(k))}</span>`).join("")}${b.resistances.map((k) => `<span class="puce mauvais">Résiste : ${esc(nomCible(k))}</span>`).join("")}${b.traits.map((k) => `<span class="puce">${esc(TRAITS[k])}</span>`).join("")}</div>
      ${b.forces || b.specificites ? section("Caractéristiques", `${b.forces ? `<div class="ligne"><span class="corps"><small>Forces</small><b style="white-space:normal;font-size:15px">${esc(b.forces)}</b></span></div>` : ""}${b.specificites ? `<div class="ligne"><span class="corps"><small>Spécificités</small><b style="white-space:normal;font-size:15px">${esc(b.specificites)}</b></span></div>` : ""}`) : ""}
      ${section("Comment le battre", conseilsCombat(b).map((c) => `<div class="note or">${esc(c)}</div>`).join(""))}
      ${section("Équipe conseillée", `<label class="champ"><span class="etiquette">Mes héros seulement</span><span style="flex:1"></span><input type="checkbox" class="interrupteur" data-ui-coche="mesHeros" ${ui.mesHeros ? "checked" : ""}></label>
        ${equipe.map(({ hero, pourquoi }) => `<div class="ligne" style="align-items:flex-start">${avatar(hero, { taille: 36 })}<span class="corps"><b>${esc(hero.nom)}</b><ul class="raisons">${pourquoi.map((r) => `<li class="${r.startsWith("+") ? "plus" : r.startsWith("−") ? "moins" : ""}">${esc(r)}</li>`).join("")}</ul></span></div>`).join("")}`,
        { pied: ui.mesHeros && !aDesHeros ? "Aucun héros obtenu : l'équipe pioche dans tout le catalogue." : "" })}
      <div style="margin-top:10px"><button class="btn or plein" data-act="equipe-boss" data-id="${b.id}">En faire mon équipe</button></div>
      ${parFaiblesse.length ? section("Meilleurs héros par faiblesse", parFaiblesse.map(({ k, heros }) => `<div class="ligne"><span class="corps"><small>${esc(nomCible(k))}</small><b style="white-space:normal;font-size:15px">${heros.length ? esc(heros.map((c) => c.hero.nom).join(", ")) : `Aucun héros ${mes ? "obtenu " : ""}de ce type`}</b></span></div>`).join("")) : ""}
      ${section("Artefacts pour ce combat", conf.lignes.map((l) => `<div class="ligne"><span class="corps"><small>${esc(l.hero.nom)}</small><b style="white-space:normal;font-size:15px">${l.optimaux.length ? esc(l.optimaux.map((a) => a.nom).join(", ")) : `Cherchez ${esc(l.ideales.slice(0, 2).map((s) => s.libelle).join(" ou "))}`}</b></span></div>`).join(""))}
      ${section("", ligneNav("fiche-boss", "Modifier ce boss", "", { id: b.id }))}`];
  },
  "fiche-boss"(id) {
    const b = bossParId(id) || { nom: "", chapitre: "", forces: "", specificites: "", faiblesses: [], resistances: [], traits: [] };
    const CIBLES = { physique: "Physique", magique: "Magique", ...Object.fromEntries(Object.entries(EFFETS).filter(([k]) => k !== "aucun")) };
    const cases = (nom, dict, choisis) => `<div class="choix">${Object.entries(dict).map(([k, v]) => `<label><input type="checkbox" name="${nom}" value="${k}" ${choisis.includes(k) ? "checked" : ""}>${esc(v)}</label>`).join("")}</div>`;
    return [id ? "Modifier le boss" : "Nouveau boss", `<form data-form="boss" data-id="${esc(id)}">
      ${section("", `<div class="champ bloc"><label for="fb-nom">Nom</label><input id="fb-nom" name="nom" required value="${esc(b.nom)}"></div><div class="champ"><label for="fb-chap">Chapitre</label><input id="fb-chap" name="chapitre" value="${esc(b.chapitre)}" placeholder="—"></div>`)}
      ${section("Faiblesses", `<div class="champ bloc">${cases("faiblesses", CIBLES, b.faiblesses)}</div>`)}
      ${section("Résistances", `<div class="champ bloc">${cases("resistances", CIBLES, b.resistances)}</div>`)}
      ${section("Traits", `<div class="champ bloc">${cases("traits", TRAITS, b.traits)}</div>`)}
      ${section("Description", `<div class="champ bloc"><label for="fb-for">Forces</label><textarea id="fb-for" name="forces" rows="2">${esc(b.forces)}</textarea></div><div class="champ bloc"><label for="fb-spe">Spécificités</label><textarea id="fb-spe" name="specificites" rows="3">${esc(b.specificites)}</textarea></div>`)}
      <div style="display:grid;gap:8px;margin-top:16px"><button class="btn or plein" type="submit">Enregistrer</button>
      ${id ? `<button class="btn danger plein" type="button" data-act="suppr-boss" data-id="${id}" data-confirmer="Touchez encore pour supprimer">Supprimer</button>` : ""}</div></form>`];
  },
  offre(id) {
    const o = cat().offres.find((x) => x.id === id) || { nom: "", categorie: "pack", prix: "", contenu: "", avantages: [] };
    return [id ? o.nom : "Nouvelle option", `<form data-form="offre" data-id="${esc(id)}">
      ${section("", `<div class="champ bloc"><label for="fo-nom">Nom</label><input id="fo-nom" name="nom" required value="${esc(o.nom)}"></div>
        <div class="champ"><label>Type</label><select name="categorie">${opts({ abonnement: "Abonnement", pass: "Pass", pack: "Pack", evenement: "Événement", autre: "Autre" }, o.categorie)}</select></div>
        <div class="champ"><label for="fo-prix">Prix</label><input id="fo-prix" name="prix" value="${esc(o.prix)}" placeholder="—"></div>
        <div class="champ bloc"><label for="fo-cont">Contenu</label><textarea id="fo-cont" name="contenu" rows="3">${esc(o.contenu)}</textarea></div>`, { pied: o.source ? `Source : ${esc(o.source)}` : "" })}
      ${section("Ce que ça débloque", `<div class="champ bloc"><div class="choix">${Object.entries(AVANTAGES).map(([k, v]) => `<label><input type="checkbox" name="avantages" value="${k}" ${(o.avantages || []).includes(k) ? "checked" : ""}>${esc(v)}</label>`).join("")}</div></div>`)}
      <div style="display:grid;gap:8px;margin-top:16px"><button class="btn or plein" type="submit">Enregistrer</button>
      ${id ? `<button class="btn danger plein" type="button" data-act="suppr-offre" data-id="${id}" data-confirmer="Touchez encore pour supprimer">Supprimer</button>` : ""}</div></form>`];
  },
  "cat-heros"() {
    return ["Catalogue des héros", `${section(`${herosDe(etat).length} héros`, herosDe(etat).map((h) => `<button class="ligne" data-act="ouvrir" data-f="fiche-hero" data-id="${h.id}">${avatar(h, { taille: 36 })}<span class="corps"><b>${esc(h.nom)}</b><small>${esc(h.rarete)} · ${esc(TYPES[h.type])} · ${esc(ROLES[h.role])}${h.aVerifier ? " · à vérifier" : ""}</small></span>${chevron()}</button>`).join(""),
      { pied: "Le jeu annonce une centaine de héros ; seuls ceux cités par les guides sont listés. Ajoutez les autres : ils seront aussi reconnus à l'import." })}
      <div style="margin-top:10px"><button class="btn or plein" data-act="ouvrir" data-f="fiche-hero" data-id="">Ajouter un héros</button></div>`];
  },
  "cat-artefacts"() {
    return ["Catalogue des artefacts", `${section(`${cat().artefacts.length} artefacts`, cat().artefacts.map((a) => `<div class="ligne"><span class="corps"><b>${esc(a.nom)}</b><small>${esc(STATS_ARTEFACT[a.stat])}${a.effet ? ` · ${esc(a.effet)}` : ""}</small></span>
      <button class="bouton-icone" style="color:var(--mauvais)" data-act="suppr-cat-artefact" data-id="${a.id}" data-confirmer="Sûr ?" aria-label="Supprimer ${esc(a.nom)}">${ic("corbeille", 20)}</button></div>`).join(""),
      { pied: "Aucune liste publique des artefacts n'existe : les « Artefact P.ATK »… sont génériques. Les vrais s'ajoutent à l'import ou depuis Héros › Artefacts." })}`];
  },
  promotions() {
    return ["Paliers de promotion", section("", PALIERS_PROMOTION.map((p) => `<div class="ligne"><span class="etape-num" style="width:34px">P${p.niveau}</span><span class="corps"><b>${esc(p.bonus)}</b><small>${esc(p.source)}</small></span></div>`).join(""),
      { pied: "Visez P6 puis P9 sur les 5 héros de l'équipe avant tout le reste." })];
  },
  sauvegarde() {
    const json = JSON.stringify(etat);
    return ["Sauvegarde", `${section("Profil", `<div class="champ bloc"><label for="profil-json">Copiez ce texte pour garder votre profil, ou collez-en un puis « Charger ».</label><textarea id="profil-json" rows="6" spellcheck="false" style="font:12px ui-monospace,monospace">${esc(json)}</textarea></div>`,
      { pied: `Taille : ${fmt(Math.max(1, Math.round(json.length / 1024)))} Ko, gardés sur ce téléphone uniquement.` })}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"><button class="btn or" data-act="copier">Copier</button><button class="btn" data-act="coller">Charger</button></div>
      ${section("Fichier", `<div class="champ bloc"><label for="import-fichier">Importer un fichier .json</label><input id="import-fichier" type="file" accept="application/json,.json" data-import-json></div>`)}`];
  },
  confidentialite() {
    return ["Confidentialité", section("", `<div class="note ok">Vos données restent sur ce téléphone, dans l'app. Aucun compte, aucun serveur.</div>
      <div class="note ok">Les captures d'écran sont lues sur le téléphone puis oubliées : elles ne sont ni envoyées ni gardées.</div>
      <div class="note ok">Seules les informations que vous validez sont enregistrées (quelques kilo-octets).</div>
      <div class="note">Effacer les données de Safari ou supprimer l'app efface le profil : faites une sauvegarde avant.</div>`)];
  },
  installer() {
    return ["Installer sur l'iPhone", section("", etapes([
      { titre: "Ouvrez l'app dans Safari", detail: "zboolbi.github.io/app-knock-knock-manager" },
      { titre: "Partager › Sur l'écran d'accueil", detail: "Puis « Ajouter »." },
      { titre: "Lancez-la depuis son icône", detail: "Plein écran, et hors ligne après la première ouverture." },
    ]))];
  },
  connexion() {
    return ["Connexion au jeu", section("", `<div class="note alerte">Impossible de lire directement le compte du jeu.</div>
      <div class="note">iOS isole chaque app, et le jeu ne propose ni export ni accès public. Les contournements enfreignent ses conditions d'utilisation et peuvent faire bannir le compte.</div>
      <div class="note ok">À la place : l'import par capture d'écran remplit le profil en quelques secondes.</div>`)
      + `<div style="margin-top:10px"><button class="btn or plein" data-act="ouvrir" data-f="import">${ic("photo", 20)} Importer des captures</button></div>`];
  },
};

function rendreFeuille() {
  if (!ui.feuille) { $feuille.innerHTML = ""; delete $feuille.dataset.cle; document.body.classList.remove("feuille-ouverte"); return; }
  const corpsAvant = $feuille.querySelector(".feuille-corps");
  const meme = corpsAvant && $feuille.dataset.cle === ui.feuille.cle;
  const defil = meme ? corpsAvant.scrollTop : 0;
  const [titre, corps] = FEUILLES[ui.feuille.type](ui.feuille.id, ui.feuille.extra);
  if (meme) {
    $feuille.querySelector(".feuille-tete h2").textContent = titre;
    corpsAvant.innerHTML = corps;
    corpsAvant.scrollTop = defil;
    return;
  }
  const avecRetour = ui.pile.length > 0;
  $feuille.innerHTML = `<div class="voile" data-act="fermer-fond"><div class="feuille" role="dialog" aria-modal="true" aria-label="${esc(titre)}">
    <div class="feuille-tete"><button class="bouton-texte g" data-act="${avecRetour ? "retour" : "fermer"}">${avecRetour ? "‹ Retour" : "Fermer"}</button><h2>${esc(titre)}</h2>
      ${avecRetour ? `<button class="bouton-texte d" data-act="fermer">OK</button>` : "<span></span>"}</div>
    <div class="feuille-corps">${corps}</div></div></div>`;
  $feuille.dataset.cle = ui.feuille.cle;
  document.body.classList.add("feuille-ouverte");
}
function ouvrir(type, id = "", extra = "") {
  if (!FEUILLES[type]) return;
  if (ui.feuille) ui.pile.push(ui.feuille);
  ui.feuille = { type, id, extra, cle: `${type}:${id}:${ui.pile.length}` };
  rendreFeuille();
}
function fermer() {
  if (imp.etat !== "lecture") viderImport();
  ui.feuille = null; ui.pile = []; rendreFeuille();
}
function retour() { ui.feuille = ui.pile.pop() || null; rendreFeuille(); }

/* ---------- Rendu ---------- */

const ONGLETS = {
  accueil: { titre: "Tableau de bord", vue: vueAccueil, actions: () => `<button class="bouton-icone" data-act="ouvrir" data-f="import" aria-label="Importer des captures">${ic("photo")}</button><button class="bouton-icone" data-act="ouvrir" data-f="reglages" aria-label="Réglages">${ic("reglages")}</button>` },
  heros: { titre: "Héros", vue: vueHeros, actions: () => {
    const f = { equipe: "equipe", collection: "fiche-hero", artefacts: "ajout-artefact", skins: "fiche-skin", pieges: "import", betes: "import" }[ui.segHeros];
    return `<button class="bouton-icone" data-act="ouvrir" data-f="${f}" data-id="" aria-label="${f === "import" ? "Importer des captures" : "Ajouter"}">${ic(f === "import" ? "photo" : "ajouter")}</button>`;
  } },
  strategie: { titre: "Stratégie", vue: vueStrategie, actions: () => "" },
  boss: { titre: "Boss", vue: vueBoss, actions: () => `<button class="bouton-icone" data-act="ouvrir" data-f="fiche-boss" data-id="" aria-label="Ajouter un boss">${ic("ajouter")}</button>` },
  boutique: { titre: "Boutique", vue: vueBoutique, actions: () => "" },
};

function rendre() {
  const actif = document.activeElement;
  const idFocus = actif && $vue.contains(actif) && actif.type === "search" ? actif.id : null;
  const o = ONGLETS[ui.onglet];
  $petitTitre.textContent = o.titre;
  $actions.innerHTML = o.actions();
  $vue.innerHTML = o.vue();
  document.querySelectorAll(".onglets button").forEach((b) => b.toggleAttribute("aria-current", b.dataset.onglet === ui.onglet));
  const eq = equipeActuelle(etat);
  const nb = eq.length ? configurationArtefacts(etat, eq).aChanger : 0;
  const c = document.getElementById("compteur-strategie");
  c.hidden = !nb; c.textContent = nb;
  if (idFocus) { const el = document.getElementById(idFocus); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
  if (ui.feuille) rendreFeuille();
}

window.addEventListener("scroll", () => $barre.classList.toggle("defile", window.scrollY > 40), { passive: true });

/* ---------- Événements ---------- */

function setCle(cle, valeur) {
  const [racine, a, b] = cle.split(".");
  if (racine === "joueur") etat.joueur[a] = valeur;
  if (racine === "roster") fiche(a)[b] = valeur;
  if (racine === "inv") { const i = etat.inventaire.find((x) => x.id === a); if (i) i[b] = valeur; }
  if (racine === "pieges" || racine === "betes") etat[racine][a] = { ...(etat[racine][a] || {}), [b]: valeur };
}
function getCle(cle) {
  const [racine, a, b] = cle.split(".");
  if (racine === "joueur") return Number(etat.joueur[a]) || 0;
  if (racine === "roster") return Number(progression(etat, a)[b]) || 0;
  if (racine === "inv") return Number(etat.inventaire.find((x) => x.id === a)?.[b]) || 0;
  if (racine === "pieges" || racine === "betes") return Number(etat[racine][a]?.[b]) || (b === "niveau" ? 1 : 0);
  return 0;
}
const minimumDe = (cle) => (/\.(niveau|emplacements)$/.test(cle) && !cle.startsWith("inv.") ? 1 : 0);
function basculerCurio(ref, oui) {
  const existant = etat.inventaire.find((i) => i.ref === ref);
  if (oui && !existant) etat.inventaire.push({ id: nouvelId("art"), ref, etoiles: 1, niveau: 0 });
  if (!oui && existant) { etat.inventaire = etat.inventaire.filter((i) => i.ref !== ref); for (const i of [existant]) retirerArtefactPartout(i.id); }
}
function basculerDeploiement(sorte, id, oui) {
  const max = sorte === "betes" ? placesBetes() : NOMS_COMPAGNONS[sorte][2];
  if (oui && cat()[sorte].filter((x) => x.id !== id && etat[sorte][x.id]?.deploye).length >= max) { toast(`${max} place(s) seulement : retirez d'abord un ${NOMS_COMPAGNONS[sorte][1]}`); return false; }
  etat[sorte][id] = { ...(etat[sorte][id] || {}), deploye: oui, ...(oui ? { possede: true } : {}) };
  return true;
}

document.querySelector(".onglets").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-onglet]");
  if (!b) return;
  ui.onglet = b.dataset.onglet;
  rendre();
  window.scrollTo(0, 0);
});

document.addEventListener("input", (e) => {
  if (e.target.dataset.ui) { ui[e.target.dataset.ui] = e.target.value; rendre(); }
});

document.addEventListener("change", (e) => {
  const t = e.target, d = t.dataset;
  if (d.joueur) {
    etat.joueur[d.joueur] = t.type === "number" ? (t.value === "" ? "" : Math.max(0, Number(t.value))) : t.value.trim();
    return enregistrer();
  }
  if (d.num) { setCle(d.num, Math.max(minimumDe(d.num), Math.round(Number(t.value) || 0))); return enregistrer(); }
  if (d.stock) { if (t.value === "") delete etat.stock[d.stock]; else etat.stock[d.stock] = Math.max(0, Math.round(Number(t.value) || 0)); return enregistrer(); }
  if (d.roster) {
    fiche(d.roster)[d.champ] = t.checked;
    if (d.champ === "possede" && !t.checked) etat.equipe = etat.equipe.filter((x) => x !== d.roster);
    return enregistrer();
  }
  if (d.equipe) { if (!basculerEquipe(d.equipe, t.checked)) t.checked = false; return enregistrer(); }
  if (d.skin) { etat.skinsPossedes[d.skin] = t.checked; return enregistrer(); }
  if (d.curio) { basculerCurio(d.curio, t.checked); return enregistrer(); }
  if (d.compPossede) { const [so, id] = d.compPossede.split(":"); etat[so][id] = { ...(etat[so][id] || {}), possede: t.checked, ...(t.checked ? {} : { deploye: false }) }; return enregistrer(); }
  if (d.compDeploye) { const [so, id] = d.compDeploye.split(":"); if (!basculerDeploiement(so, id, t.checked)) t.checked = false; return enregistrer(); }
  if (d.heroSkin) { fiche(d.heroSkin).skin = t.value || null; return enregistrer(); }
  if (d.slot) { equiper(d.slot, Number(d.index), t.value); return enregistrer(); }
  if (d.inv) { const i = etat.inventaire.find((x) => x.id === d.inv); if (i) i[d.champ] = t.value; return enregistrer(); }
  if (d.porteur) {
    retirerArtefactPartout(d.porteur);
    if (t.value) {
      const r = fiche(t.value), max = Number(etat.joueur.emplacements) || 2;
      if (r.artefacts.length >= max) r.artefacts.shift();
      r.artefacts.push(d.porteur);
    }
    return enregistrer();
  }
  if (d.offre) { etat.abonnements[d.offre] = { ...(etat.abonnements[d.offre] || {}), actif: t.checked }; return enregistrer(); }
  if (d.offreFin) { etat.abonnements[d.offreFin] = { ...(etat.abonnements[d.offreFin] || {}), fin: t.value }; return enregistrer(); }
  if (d.code) { etat.codesUtilises[d.code] = t.checked; return enregistrer(); }
  if (d.quotidien !== undefined) { etat.quotidien.coches[d.quotidien] = t.checked; return enregistrer(); }
  if (d.uiCoche) { ui[d.uiCoche] = t.checked; return rendre(); }
  if (t.hasAttribute("data-import-captures") && t.files.length) {
    const fichiers = [...t.files];
    t.value = ""; // le champ ne garde pas la sélection
    lancerImport(fichiers);
    return;
  }
  if (d.impCoche) { const [k, i] = d.impCoche.split("."); imp.propositions[k][i].garder = t.checked; return; }
  if (d.imp) {
    const [k, i, c] = d.imp.split(".");
    if (k === "profil" || k === "stock") imp.propositions[k][i].valeur = t.value;
    else imp.propositions[k][i][c] = t.type === "number" ? (t.value === "" ? null : Number(t.value)) : t.value;
    return;
  }
  if (t.hasAttribute("data-import-json") && t.files[0]) {
    t.files[0].text().then((txt) => { etat = fusionner(JSON.parse(txt)); enregistrer(); toast("Profil importé"); })
      .catch(() => toast("Fichier illisible : choisissez une sauvegarde de l'app"));
    t.value = "";
  }
});

function copierTexte(texte, zone) {
  const repli = () => { if (zone) { zone.focus(); zone.select(); toast("Texte sélectionné : copiez-le"); } else toast(texte); };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(texte).then(() => toast("Copié"), repli); else repli();
}
function appliquerConfig(lignes) {
  for (const l of lignes) fiche(l.hero.id).artefacts = [];
  for (const l of lignes) l.optimaux.forEach((a, i) => equiper(l.hero.id, i, a.id));
}

const ACTIONS = {
  ouvrir: (b) => ouvrir(b.dataset.f, b.dataset.id || "", b.dataset.hero || ""),
  fermer, retour,
  "fermer-fond": (b, e) => { if (e.target === b) fermer(); },
  onglet: (b) => { ui.onglet = b.dataset.id; fermer(); rendre(); window.scrollTo(0, 0); },
  seg: (b) => { ui.segHeros = b.dataset.id; rendre(); },
  possedes: (b) => { ui.possedes = b.dataset.id === "1"; rendre(); },
  pas: (b) => { const cle = b.dataset.cle; setCle(cle, Math.max(minimumDe(cle), getCle(cle) + Number(b.dataset.pas))); enregistrer(); },
  appliquer: (b) => {
    const l = configurationArtefacts(etat, equipeActuelle(etat)).lignes.find((x) => x.hero.id === b.dataset.id);
    if (!l) return;
    fiche(l.hero.id).artefacts = [];
    l.optimaux.forEach((a, i) => equiper(l.hero.id, i, a.id));
    enregistrer(); toast(`Artefacts de ${l.hero.nom} mis à jour`);
  },
  "appliquer-tout": () => { appliquerConfig(configurationArtefacts(etat, equipeActuelle(etat)).lignes); enregistrer(); toast("Configuration appliquée : reproduisez-la dans le jeu"); },
  "equipe-proposee": (b) => { etat.equipe = b.dataset.id.split(",").filter((id) => heroParId(id)).slice(0, TAILLE_EQUIPE); enregistrer(); toast("Équipe enregistrée"); },
  "mettre-skin": (b) => { fiche(b.dataset.id).skin = b.dataset.skin; enregistrer(); toast("Skin équipé"); },
  "prendre-equipe": (b) => { const eq = EQUIPES_REFERENCE.find((x) => x.nom === b.dataset.id); if (!eq) return;
    etat.equipe = eq.heros.filter((id) => heroParId(id)).slice(0, TAILLE_EQUIPE); enregistrer(); toast(`Équipe ${eq.nom} sélectionnée`); },
  "equipe-boss": (b) => { const boss = bossParId(b.dataset.id);
    const aDesHeros = herosDe(etat).some((h) => progression(etat, h.id).possede);
    etat.equipe = composerEquipe(herosDe(etat), boss, etat, { mesHerosSeulement: ui.mesHeros && aDesHeros }).map((e) => e.hero.id);
    enregistrer(); toast("Équipe mise à jour"); },
  "suppr-hero": (b) => { supprimerCatalogue("heros", b.dataset.id); delete etat.roster[b.dataset.id]; etat.equipe = etat.equipe.filter((x) => x !== b.dataset.id); fermer(); enregistrer(); toast("Héros supprimé"); },
  "suppr-skin": (b) => { supprimerCatalogue("skins", b.dataset.id); delete etat.skinsPossedes[b.dataset.id];
    for (const r of Object.values(etat.roster)) if (r.skin === b.dataset.id) r.skin = null; fermer(); enregistrer(); toast("Skin supprimé"); },
  "suppr-boss": (b) => { supprimerCatalogue("boss", b.dataset.id); fermer(); enregistrer(); toast("Boss supprimé"); },
  "suppr-offre": (b) => { supprimerCatalogue("offres", b.dataset.id); delete etat.abonnements[b.dataset.id]; fermer(); enregistrer(); toast("Option supprimée"); },
  "suppr-inv": (b) => { etat.inventaire = etat.inventaire.filter((x) => x.id !== b.dataset.id); retirerArtefactPartout(b.dataset.id); fermer(); enregistrer(); toast("Artefact retiré"); },
  "suppr-cat-artefact": (b) => {
    if (etat.inventaire.some((i) => i.ref === b.dataset.id)) { toast("Retirez d'abord cet artefact de votre inventaire"); return; }
    supprimerCatalogue("artefacts", b.dataset.id); enregistrer();
  },
  "copier-code": (b) => copierTexte(b.dataset.id),
  copier: () => { const z = document.getElementById("profil-json"); copierTexte(z.value, z); },
  coller: () => {
    try { etat = fusionner(JSON.parse(document.getElementById("profil-json").value)); enregistrer(); toast("Profil chargé"); }
    catch { toast("Texte invalide : collez une sauvegarde copiée depuis l'app"); }
  },
  "import-appliquer": () => appliquerImport(),
  "import-recommencer": () => { viderImport(); rendreFeuille(); },
  reinitialiser: () => { etat = etatInitial(); sauver(etat); fermer(); rendre(); toast("Profil effacé"); },
};

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  if (b.dataset.confirmer && !b.dataset.arme) {
    b.dataset.arme = "1"; b.dataset.texte = b.innerHTML;
    const cible = b.querySelector("b") || b;
    cible.textContent = b.dataset.confirmer;
    setTimeout(() => { if (b.isConnected) { delete b.dataset.arme; b.innerHTML = b.dataset.texte; } }, 3000);
    return;
  }
  ACTIONS[b.dataset.act]?.(b, e);
});

document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ui.feuille) fermer(); });

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target, fd = new FormData(f), type = f.dataset.form, id = f.dataset.id;
  const champs = (liste) => Object.fromEntries(liste.map((k) => [k, String(fd.get(k) ?? "").trim()]));
  if (type === "hero") {
    const v = champs(["nom", "rarete", "tier", "type", "effet", "role", "competences", "aura", "note"]);
    if (!v.nom) return toast("Donnez un nom au héros");
    const h = heroParId(id);
    if (herosDe(etat).some((x) => x.id !== id && norm(x.nom) === norm(v.nom))) return toast("Ce héros existe déjà dans le catalogue");
    if (h) Object.assign(h, v, { aVerifier: false });
    else cat().heros.push({ id: nouvelId("hero"), ...v, source: "Ajouté par vous", aVerifier: false });
    toast("Fiche enregistrée"); if (ui.pile.length) retour(); else fermer();
  }
  if (type === "artefact-inventaire") {
    etat.inventaire.push({ id: nouvelId("art"), ref: fd.get("ref"), rarete: fd.get("rarete"), niveau: Math.max(0, Number(fd.get("niveau")) || 0) });
    toast("Artefact ajouté"); fermer(); ui.onglet = "heros"; ui.segHeros = "artefacts";
  }
  if (type === "artefact-catalogue") {
    const v = champs(["nom", "stat", "rarete", "effet"]);
    if (!v.nom) return toast("Donnez un nom à l'artefact");
    const ref = nouvelId("cat-art");
    cat().artefacts.push({ id: ref, ...v });
    etat.inventaire.push({ id: nouvelId("art"), ref, rarete: v.rarete, niveau: 0 });
    toast("Artefact créé et ajouté"); fermer(); ui.onglet = "heros"; ui.segHeros = "artefacts";
  }
  if (type === "skin") {
    const v = champs(["nom", "heroId", "bonusStat", "bonusValeur", "obtention"]);
    if (!v.nom) return toast("Donnez un nom au skin");
    let s = cat().skins.find((x) => x.id === id);
    if (s) Object.assign(s, v); else { s = { id: nouvelId("skin"), ...v }; cat().skins.push(s); }
    etat.skinsPossedes[s.id] = fd.get("possede") === "on";
    toast("Skin enregistré"); if (ui.pile.length) retour(); else fermer();
  }
  if (type === "boss") {
    const v = { ...champs(["nom", "chapitre", "forces", "specificites"]), faiblesses: fd.getAll("faiblesses"), resistances: fd.getAll("resistances"), traits: fd.getAll("traits") };
    if (!v.nom) return toast("Donnez un nom au boss");
    const conflit = v.faiblesses.find((k) => v.resistances.includes(k));
    if (conflit) return toast(`${nomCible(conflit)} ne peut pas être à la fois faiblesse et résistance`);
    const b = bossParId(id);
    if (b) { Object.assign(b, v, { modele: false }); toast("Boss enregistré"); if (ui.pile.length) retour(); else fermer(); }
    else { const nb = { id: nouvelId("boss"), ...v, modele: false }; cat().boss.unshift(nb); ui.feuille = null; ui.pile = []; ouvrir("boss", nb.id); toast("Boss ajouté"); }
  }
  if (type === "offre") {
    const v = { ...champs(["nom", "categorie", "prix", "contenu"]), avantages: fd.getAll("avantages") };
    if (!v.nom) return toast("Donnez un nom à l'option");
    const o = cat().offres.find((x) => x.id === id);
    if (o) Object.assign(o, v); else cat().offres.push({ id: nouvelId("offre"), ...v, source: "Ajouté par vous" });
    toast("Option enregistrée"); fermer();
  }
  enregistrer();
});

rendre();

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
