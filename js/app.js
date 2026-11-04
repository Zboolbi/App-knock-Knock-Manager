import {
  TYPES, EFFETS, ROLES, RARETES, TIERS, TRAITS, STATS_ARTEFACT, EQUIPES_REFERENCE, CONSEILS_SOURCES,
  PALIERS_PROMOTION, AVANTAGES, DEPENSES,
} from "./data.js";
import {
  progression, herosDe, artefactsResolus, porteurs, skinEquipe, composerEquipe, classerContre, conseilsCombat,
  configurationArtefacts, statsIdeales, analyseEquipe, equipeActuelle, planProgression, prochainPalier,
  conseilsSkins, offresActives, conseilsOffres, TAILLE_EQUIPE,
} from "./engine.js";
import { charger, sauver, etatInitial, fusionner, nouvelId } from "./store.js";

let etat = charger();
const ui = { onglet: "profil", segment: "heros", filtre: "", possedes: false, mesHeros: true, feuille: null, rechercheBoss: "" };

const $vue = document.getElementById("vue");
const $titre = document.getElementById("titre");
const $actions = document.getElementById("actions-haut");
const $feuille = document.getElementById("feuille");

/* ---------- Outils ---------- */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const opts = (dict, choisi) => Object.entries(dict).map(([k, v]) => `<option value="${esc(k)}" ${k === choisi ? "selected" : ""}>${esc(v)}</option>`).join("");
const optsListe = (l, choisi) => l.map((v) => `<option ${v === choisi ? "selected" : ""}>${esc(v)}</option>`).join("");
const DIACR = new RegExp("[\\u0300-\\u036f]", "g");
const norm = (s) => String(s || "").normalize("NFD").replace(DIACR, "").toLowerCase();
const initiales = (nom) => String(nom || "?").split(/[\s-]+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join("").toUpperCase();
const cat = () => etat.catalogue;
const heroParId = (id) => herosDe(etat).find((h) => h.id === id);
const bossParId = (id) => cat().boss.find((b) => b.id === id);
const aujourdhui = () => new Date().toISOString().slice(0, 10);

const ICONES = {
  profil: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  strategie: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  boss: '<path d="M5 19 19 5M14 5h5v5M5 5l14 14M5 14v5h5"/>',
  boutique: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  plus: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  ajouter: '<path d="M12 5v14M5 12h14"/>',
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
  grille: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  gemme: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M12 20 8 9l4-5 4 5z"/>',
  skin: '<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  retour: '<path d="m15 6-6 6 6 6"/>',
};
const ic = (nom, taille) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"${taille ? ` style="width:${taille}px;height:${taille}px"` : ""}>${ICONES[nom]}</svg>`;

// Héros sans effet : une teinte stable tirée de son nom, pour les distinguer d'un coup d'œil.
function teinte(nom) {
  let x = 0;
  for (const c of String(nom)) x = (x * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${x} 42% 42%)`;
}
function avatar(h, { coin = "", taille, terne = false } = {}) {
  if (!h) return `<div class="av vide"${taille ? ` style="--t:${taille}px"` : ""}><span>${ic("ajouter", 22)}</span></div>`;
  const style = [taille ? `--t:${taille}px` : "", h.effet === "aucun" ? `--fe:${teinte(h.nom)}` : ""].filter(Boolean).join(";");
  return `<div class="av${terne ? " terne" : ""}" data-r="${esc(h.rarete)}" data-e="${esc(h.effet)}"${style ? ` style="${style}"` : ""}>
    <span>${esc(initiales(h.nom))}</span>${coin ? `<i class="coin">${esc(coin)}</i>` : ""}</div>`;
}
function chipsHero(h) {
  return `<span class="chip fort">${esc(h.tier)}</span><span class="chip">${esc(h.rarete)}</span><span class="chip">${esc(TYPES[h.type] || h.type)}</span>
    ${h.effet !== "aucun" ? `<span class="chip">${esc(EFFETS[h.effet])}</span>` : ""}<span class="chip">${esc(ROLES[h.role] || h.role)}</span>
    ${h.aVerifier ? `<span class="chip" title="Type, effet ou rôle supposé">à vérifier</span>` : ""}`;
}
const nomCible = (k) => EFFETS[k] || TYPES[k] || k;

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("visible");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("visible"), 1800);
}
function enregistrer() {
  if (!sauver(etat)) toast("Sauvegarde impossible : stockage du navigateur bloqué");
  rendre();
}
function fiche(id) {
  if (!etat.roster[id]) etat.roster[id] = { possede: false, niveau: 1, promotion: 0, etoiles: 0, skin: null, artefacts: [] };
  const r = etat.roster[id];
  if (!Array.isArray(r.artefacts)) r.artefacts = [];
  return r;
}
function equiper(heroId, index, invId) {
  if (invId) for (const r of Object.values(etat.roster)) if (Array.isArray(r.artefacts)) r.artefacts = r.artefacts.filter((a) => a !== invId);
  const r = fiche(heroId);
  r.artefacts[index] = invId || null;
  r.artefacts = r.artefacts.filter(Boolean);
}
function supprimerCatalogue(type, id) {
  etat.catalogue[type] = etat.catalogue[type].filter((x) => x.id !== id);
  etat.supprimes = [...new Set([...(etat.supprimes || []), id])];
}

/* ---------- Onglet 1 : Profil ---------- */

function vueProfil() {
  const j = etat.joueur;
  const possedes = herosDe(etat).filter((h) => progression(etat, h.id).possede);
  const nbSkins = Object.values(etat.skinsPossedes).filter(Boolean).length;
  const equipe = equipeActuelle(etat);
  const places = Array.from({ length: TAILLE_EQUIPE }, (_, i) => equipe[i] || null);
  const pseudo = j.pseudo || "Mon profil";

  return `
  <div class="gouttiere">
    <div class="profil-tete">
      <div class="av" data-r="Mythique" style="--t:86px"><span>${esc(initiales(pseudo))}</span></div>
      <div class="compteurs">
        <div><b>${possedes.length}</b><small>héros</small></div>
        <div><b>${etat.inventaire.length}</b><small>artefacts</small></div>
        <div><b>${nbSkins}</b><small>skins</small></div>
      </div>
    </div>
    <div class="bio"><b>${esc(pseudo)}</b>
      <p>Niv. ${esc(j.niveau)} · Porte ${esc(j.porte)} · Lit ${esc(j.lit)}${j.chapitre ? ` · Chapitre ${esc(j.chapitre)}` : ""}</p></div>
    <div class="actions-profil">
      <button class="btn" data-act="ouvrir" data-f="profil">Modifier le profil</button>
      <button class="btn" data-act="ouvrir" data-f="equipe">Modifier l'équipe</button>
    </div>
  </div>
  <div class="stories" aria-label="Mon équipe">
    ${places.map((h, i) => `<button class="story" data-act="${h ? "ouvrir" : "ouvrir"}" data-f="${h ? "hero" : "equipe"}" data-id="${h ? h.id : ""}">
      ${avatar(h, { coin: h ? `${progression(etat, h.id).niveau}` : "" })}<small>${h ? esc(h.nom) : `Place ${i + 1}`}</small></button>`).join("")}
  </div>
  <div class="segments" role="tablist">
    ${[["heros", "grille", "Héros"], ["artefacts", "gemme", "Artefacts"], ["skins", "skin", "Skins"]].map(([k, i, l]) =>
      `<button role="tab" aria-selected="${ui.segment === k}" aria-label="${l}" data-act="segment" data-id="${k}">${ic(i)}</button>`).join("")}
  </div>
  ${ui.segment === "heros" ? segHeros() : ui.segment === "artefacts" ? segArtefacts() : segSkins()}`;
}

function segHeros() {
  const f = norm(ui.filtre);
  const liste = herosDe(etat)
    .filter((h) => !f || norm(h.nom).includes(f))
    .filter((h) => !ui.possedes || progression(etat, h.id).possede)
    .sort((a, b) => (progression(etat, b.id).possede - progression(etat, a.id).possede)
      || RARETES.indexOf(b.rarete) - RARETES.indexOf(a.rarete) || TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier));
  return `
  <div class="gouttiere filtres">
    <input class="recherche" type="search" id="recherche-heros" placeholder="Rechercher" data-ui="filtre" value="${esc(ui.filtre)}" aria-label="Rechercher un héros">
    <button class="puce" aria-pressed="${ui.possedes}" data-act="bascule-ui" data-id="possedes">Les miens</button>
  </div>
  <div class="grille3">
    ${liste.map((h) => {
      const p = progression(etat, h.id);
      return `<button class="tuile" data-act="ouvrir" data-f="hero" data-id="${h.id}">
        ${avatar(h, { terne: !p.possede, coin: p.possede && p.promotion ? `P${p.promotion}` : "" })}
        <b>${esc(h.nom)}</b><small>${p.possede ? `Niv. ${p.niveau} · ${p.etoiles}★` : "Pas encore"}</small></button>`;
    }).join("")}
    <button class="tuile" data-act="ouvrir" data-f="fiche-hero" data-id="">${avatar(null)}<b>Nouveau héros</b><small>Ajouter au catalogue</small></button>
  </div>`;
}

function segArtefacts() {
  const arts = artefactsResolus(etat);
  const qui = porteurs(etat);
  return `
  <div class="titre-section gouttiere"><h2>Mes artefacts</h2><button class="lien" data-act="ouvrir" data-f="ajout-artefact">Ajouter</button></div>
  ${arts.length ? `<div class="liste">${arts.map((a) => {
    const h = heroParId(qui.get(a.id));
    return `<button class="ligne-l" data-act="ouvrir" data-f="artefact" data-id="${a.id}">
      <div class="carre" data-r="${esc(a.rarete)}">${esc(STATS_ARTEFACT[a.stat]?.slice(0, 4) || "?")}</div>
      <div class="txt"><b>${esc(a.nom)}</b><small>${esc(STATS_ARTEFACT[a.stat])} · ${esc(a.rarete)} · niv. ${a.niveau}</small></div>
      <small class="discret">${h ? esc(h.nom) : "Libre"}</small>${ic("chevron", 18)}</button>`;
  }).join("")}</div>` : `<div class="vide-etat"><b>Aucun artefact</b>Ajoutez ceux de votre inventaire : la Stratégie dira qui doit les porter.</div>`}`;
}

function segSkins() {
  const skins = cat().skins;
  const parHero = new Map();
  for (const s of skins) { if (!parHero.has(s.heroId)) parHero.set(s.heroId, []); parHero.get(s.heroId).push(s); }
  return `
  <div class="titre-section gouttiere"><h2>Skins</h2><button class="lien" data-act="ouvrir" data-f="fiche-skin" data-id="">Ajouter</button></div>
  ${skins.length ? [...parHero].map(([heroId, liste]) => {
    const h = heroParId(heroId);
    return `<div class="liste">${liste.map((s) => `
      <div class="ligne-l">${avatar(h, { taille: 44 })}
        <div class="txt"><b>${esc(s.nom)}</b><small>${esc(h?.nom || "Héros inconnu")}${s.bonusValeur ? ` · +${esc(s.bonusValeur)} % ${esc(STATS_ARTEFACT[s.bonusStat] || "")}` : ""}${skinEquipe(etat, heroId)?.id === s.id ? " · équipé" : ""}</small></div>
        <label class="interrupteur" aria-label="Je l'ai"><input type="checkbox" data-skin="${s.id}" ${etat.skinsPossedes[s.id] ? "checked" : ""}></label>
        <button class="icone-btn" data-act="ouvrir" data-f="fiche-skin" data-id="${s.id}" aria-label="Modifier">${ic("chevron", 18)}</button>
      </div>`).join("")}</div>`;
  }).join("") : `<div class="vide-etat"><b>Aucun skin enregistré</b>Aucune liste publique des skins n'existe. Ajoutez les vôtres une fois : nom, héros, bonus. L'app s'en souvient.</div>`}`;
}

/* ---------- Onglet 2 : Stratégie ---------- */

function post(titre, sousTitre, corps, h = null) {
  return `<article class="post gouttiere"><div class="post-tete">${h ? avatar(h) : `<div class="av" data-r="Légendaire"><span>${ic("strategie", 18)}</span></div>`}
    <div class="txt"><b>${esc(titre)}</b>${sousTitre ? `<small>${esc(sousTitre)}</small>` : ""}</div></div>${corps}</article>`;
}
const notes = (liste) => liste.map((n) => `<div class="note ${n.niveau}">${esc(n.texte)}</div>`).join("");
const nomsArts = (l) => l.length ? l.map((a) => `${esc(a.nom)} <span class="discret">(${esc(STATS_ARTEFACT[a.stat])})</span>`).join("<br>") : `<span class="discret">Rien</span>`;

function vueStrategie() {
  const ana = analyseEquipe(etat);
  const equipe = ana.equipe.length ? ana.equipe : [];
  const conf = equipe.length ? configurationArtefacts(etat, equipe) : null;
  const plan = planProgression(etat);
  const skins = conseilsSkins(etat);
  const offres = conseilsOffres(etat);
  if (etat.quotidien.date !== aujourdhui()) etat.quotidien = { date: aujourdhui(), coches: {} };
  const TACHES = ["Récupérer le revenu du Lit", "Missions quotidiennes", "Invocations et coffres gratuits",
    "Vider l'énergie sur l'étape la plus haute battue", "Matériaux du jour sur les 5 héros", "Récompenses des passes actifs"];

  return `
  <div class="stories" style="padding-top:12px">${equipe.map((h) => `<button class="story" data-act="ouvrir" data-f="hero" data-id="${h.id}">${avatar(h, { coin: `${progression(etat, h.id).niveau}` })}<small>${esc(h.nom)}</small></button>`).join("")
    || `<button class="story" data-act="ouvrir" data-f="equipe">${avatar(null)}<small>Mon équipe</small></button>`}</div>

  ${post("Mon équipe", equipe.length ? `Puissance moyenne ${ana.score}` : "À composer", notes(ana.notes))}

  ${post("Configuration des artefacts", conf ? (conf.aChanger ? `${conf.aChanger} héros à rééquiper` : "Déjà optimale") : "Choisissez une équipe",
    conf ? `${conf.lignes.map((l) => `
      <div class="config"><div class="ligne entre" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <b>${esc(l.hero.nom)}</b>${l.identique ? `<span class="chip bon">OK</span>` : `<button class="btn" data-act="appliquer" data-id="${l.hero.id}">Appliquer</button>`}</div>
        ${l.identique ? "" : `<div class="fleche"><div>${nomsArts(l.actuels)}</div><span aria-hidden="true">→</span><div>${nomsArts(l.optimaux)}</div></div>`}
        <small class="discret">À viser : ${l.ideales.map((s) => esc(s.libelle)).join(" › ")}</small></div>`).join("")}
      ${conf.aChanger ? `<button class="btn plein large" data-act="appliquer-tout" style="margin-top:8px">Tout appliquer</button>` : ""}
      ${conf.inutilises.length ? `<p class="discret">Sans bon porteur : ${conf.inutilises.map((a) => esc(a.nom)).join(", ")}.</p>` : ""}
      ${!etat.inventaire.length ? `<p class="discret">Ajoutez vos artefacts dans Profil › Artefacts.</p>` : ""}` : `<p class="discret">Ajoutez votre équipe dans le Profil.</p>`)}

  ${post("Prochaines étapes", "Dans l'ordre", plan.map((e, i) => `<div class="etape"><div class="num">${i + 1}</div><div><b>${esc(e.titre)}</b><span class="discret">${esc(e.detail)}</span></div></div>`).join(""))}

  ${equipe.length ? post("Promotions", "Paliers 3, 6, 9, 12, 15", equipe.map((h) => {
    const p = progression(etat, h.id), pal = prochainPalier(p.promotion);
    const pct = pal ? Math.min(100, Math.round((p.promotion / pal.niveau) * 100)) : 100;
    return `<div style="padding:6px 0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(h.nom)}</b><small class="discret">P${p.promotion}${pal ? ` → P${pal.niveau} : ${esc(pal.bonus)}` : " · max"}</small></div><div class="barre"><i style="width:${pct}%"></i></div></div>`;
  }).join("")) : ""}

  ${skins.length ? post("Skins", "Bonus disponibles", skins.map((s) => `<div class="note ok">${esc(s.texte)} <button class="lien" data-act="mettre-skin" data-id="${s.hero.id}" data-skin="${s.skin.id}">Équiper</button></div>`).join("")) : ""}

  ${post("Options payantes", `${offresActives(etat).length} active(s)`, notes(offres))}

  ${post("Où dépenser", "Ressources", `<div class="liste">${DEPENSES.map((d) => `<div style="padding:5px 0"><b>${esc(d.ressource)}</b> <span class="discret">${esc(d.conseil)}</span></div>`).join("")}</div>`)}

  ${post("Routine du jour", `${TACHES.filter((_, i) => etat.quotidien.coches[i]).length}/${TACHES.length}`,
    TACHES.map((t, i) => `<label class="interrupteur" style="font-weight:500">${esc(t)}<input type="checkbox" data-quotidien="${i}" ${etat.quotidien.coches[i] ? "checked" : ""}></label>`).join(""))}

  ${post("Équipes de référence", "Guides communautaires", EQUIPES_REFERENCE.map((eq) => `
    <div style="padding:8px 0;border-top:1px solid var(--ligne)"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>${esc(eq.nom)}</b>
      <button class="lien" data-act="prendre-equipe" data-id="${esc(eq.nom)}">Utiliser</button></div>
      <small class="discret">${esc(eq.but)}</small>
      <div class="puces" style="margin-top:6px">${eq.heros.map((id) => { const h = heroParId(id); if (!h) return ""; const ok = progression(etat, id).possede;
        return `<span class="chip ${ok ? "bon" : ""}">${ok ? "✓ " : ""}${esc(h.nom)}</span>`; }).join("")}</div></div>`).join(""))}

  ${post("Règles qui font gagner du temps", "Sources : guides communautaires", `<ul class="raisons" style="color:var(--texte)">${CONSEILS_SOURCES.map((c) => `<li>${esc(c.texte)}</li>`).join("")}</ul>`)}`;
}

/* ---------- Onglet 3 : Boss ---------- */

function vueBoss() {
  const f = norm(ui.rechercheBoss);
  const liste = cat().boss.filter((b) => !f || norm(b.nom).includes(f) || norm(b.chapitre).includes(f));
  return `
  <div class="gouttiere filtres"><input class="recherche" type="search" id="recherche-boss" placeholder="Rechercher un boss" data-ui="rechercheBoss" value="${esc(ui.rechercheBoss)}" aria-label="Rechercher un boss"></div>
  <p class="gouttiere discret" style="margin:0 0 6px">Recopiez les faiblesses et résistances de l'écran d'avant combat. Les entrées « modèle » sont des archétypes.</p>
  ${liste.map((b) => {
    const top = composerEquipe(herosDe(etat), b, etat, { mesHerosSeulement: ui.mesHeros && herosDe(etat).some((h) => progression(etat, h.id).possede), taille: 3 });
    return `<article class="post gouttiere" data-act="ouvrir" data-f="boss" data-id="${b.id}" style="cursor:pointer">
      <div class="post-tete"><div class="av" data-r="Mythique" data-e="saignement" style="--t:40px"><span>${esc(initiales(b.nom))}</span></div>
        <div class="txt"><b>${esc(b.nom)}</b><small>${b.modele ? "Modèle" : b.chapitre ? `Chapitre ${esc(b.chapitre)}` : "Boss"}</small></div>${ic("chevron", 18)}</div>
      ${b.forces ? `<p style="margin:0 0 8px">${esc(b.forces)}</p>` : ""}
      <div class="puces">${b.faiblesses.map((k) => `<span class="chip bon">Faible : ${esc(nomCible(k))}</span>`).join("")}
        ${b.resistances.map((k) => `<span class="chip mauvais">Résiste : ${esc(nomCible(k))}</span>`).join("")}
        ${b.traits.map((k) => `<span class="chip">${esc(TRAITS[k])}</span>`).join("")}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px">${top.map((e) => avatar(e.hero, { taille: 32 })).join("")}
        <small class="discret">${top.map((e) => esc(e.hero.nom)).join(", ")}</small></div>
    </article>`;
  }).join("") || `<div class="vide-etat"><b>Aucun boss</b>Touchez + pour en ajouter un.</div>`}`;
}

/* ---------- Onglet 4 : Boutique ---------- */

function vueBoutique() {
  const actives = offresActives(etat);
  return `
  <div class="gouttiere" style="padding-top:14px">
    <p class="discret" style="margin:0">Cochez ce que vous avez déjà acheté ou souscrit. La Stratégie adapte ses conseils (combat auto, vitesse x2, passes quotidiens…).</p>
  </div>
  ${actives.length ? `<div class="titre-section gouttiere"><h2>Actives</h2><small class="discret">${actives.length}</small></div>` : ""}
  <div class="liste">
  ${cat().offres.map((o) => {
    const a = etat.abonnements[o.id] || {};
    const act = actives.find((x) => x.id === o.id);
    return `<div class="post gouttiere">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div class="carre" data-r="${a.actif ? "Mythique" : "Commun"}">${esc(initiales(o.nom))}</div>
        <div style="flex:1;min-width:0"><b>${esc(o.nom)}</b><div class="discret">${esc(o.prix)}</div></div>
        <label class="interrupteur" style="padding:0" aria-label="Souscrit"><input type="checkbox" data-offre="${o.id}" ${a.actif ? "checked" : ""}></label>
      </div>
      <p class="discret">${esc(o.contenu)}</p>
      <div class="puces">${(o.avantages || []).map((k) => `<span class="chip">${esc(AVANTAGES[k] || k)}</span>`).join("")}<span class="chip">Source : ${esc(o.source || "vous")}</span></div>
      ${a.actif ? `<div class="duo" style="margin-top:8px"><div class="champ"><label for="fin-${o.id}">Fin</label><input type="date" id="fin-${o.id}" data-offre-fin="${o.id}" value="${esc(a.fin || "")}"></div>
        <div class="champ"><label>Restant</label><div style="padding:10px 0;font-weight:700">${act?.joursRestants == null ? "—" : act.joursRestants < 0 ? "Expirée" : `${act.joursRestants} j`}</div></div></div>` : ""}
      <div style="display:flex;gap:12px;margin-top:6px"><button class="lien" data-act="ouvrir" data-f="offre" data-id="${o.id}">Modifier</button></div>
    </div>`;
  }).join("")}
  </div>
  <div class="gouttiere" style="padding-top:12px"><button class="btn large" data-act="ouvrir" data-f="offre" data-id="">Ajouter une option vue dans le jeu</button>
    <p class="discret">Les stores ne publient que deux prix (packs 0,99 $ et 2,99 $). Abonnement mensuel, 3 mois et 1 an : prix exacts dans la boutique du jeu.</p></div>`;
}

/* ---------- Onglet 5 : Plus ---------- */

function vuePlus() {
  const ligne = (f, titre, detail, id = "") => `<button class="ligne-l" data-act="ouvrir" data-f="${f}" data-id="${id}"><div class="txt"><b>${esc(titre)}</b><small>${esc(detail)}</small></div>${ic("chevron", 18)}</button>`;
  return `
  <div class="titre-section gouttiere"><h2>Application</h2></div>
  <div class="liste">
    ${ligne("installer", "Installer sur l'iPhone", "Écran d'accueil, hors ligne")}
    ${ligne("connexion", "Connexion au compte du jeu", "Ce qui est possible ou non")}
    ${ligne("sauvegarde", "Sauvegarde et transfert", "Copier, coller, fichier")}
  </div>
  <div class="titre-section gouttiere"><h2>Catalogue</h2><small class="discret">Ce que l'app sait du jeu, modifiable</small></div>
  <div class="liste">
    ${ligne("cat-heros", "Héros", `${herosDe(etat).length} fiches · ${herosDe(etat).filter((h) => h.aVerifier).length} à vérifier`)}
    ${ligne("cat-artefacts", "Artefacts", `${cat().artefacts.length} fiches`)}
    ${ligne("promotions", "Paliers de promotion", "3, 6, 9, 12, 15")}
  </div>
  <div class="titre-section gouttiere"><h2>À propos</h2></div>
  <div class="gouttiere">
    <p class="discret">Application non officielle, sans lien avec l'éditeur du jeu. Données : guides communautaires ProGameGeek et TreyExGaming, fiches App Store et Google Play (2026). Les caractéristiques marquées « à vérifier » sont supposées.</p>
    <button class="btn danger large" data-act="reinitialiser" data-confirmer="Touchez encore pour tout effacer">Effacer mon profil</button>
  </div>`;
}

/* ---------- Feuilles ---------- */

const stepper = (cle, valeur, min = 0) => `<div class="stepper"><button type="button" data-act="pas" data-cle="${cle}" data-pas="-1" aria-label="Moins">−</button>
  <input type="number" inputmode="numeric" min="${min}" data-num="${cle}" value="${esc(valeur)}"><button type="button" data-act="pas" data-cle="${cle}" data-pas="1" aria-label="Plus">+</button></div>`;

const FEUILLES = {
  profil() {
    const j = etat.joueur;
    return ["Profil", `
      <div class="champ"><label for="p-pseudo">Pseudo</label><input id="p-pseudo" data-joueur="pseudo" value="${esc(j.pseudo)}" autocomplete="nickname"></div>
      <div class="duo"><div class="champ"><label>Niveau joueur</label>${stepper("joueur.niveau", j.niveau, 1)}</div>
        <div class="champ"><label for="p-chap">Chapitre</label><input id="p-chap" data-joueur="chapitre" value="${esc(j.chapitre)}"></div></div>
      <div class="duo"><div class="champ"><label>Porte</label>${stepper("joueur.porte", j.porte)}</div><div class="champ"><label>Lit</label>${stepper("joueur.lit", j.lit)}</div></div>
      <div class="champ"><label>Emplacements d'artefact par héros</label>${stepper("joueur.emplacements", j.emplacements, 1)}</div>`];
  },
  equipe() {
    const possedes = herosDe(etat).filter((h) => progression(etat, h.id).possede);
    const liste = possedes.length ? possedes : herosDe(etat);
    return [`Équipe (${etat.equipe.length}/${TAILLE_EQUIPE})`, `
      ${!possedes.length ? `<p class="discret">Aucun héros marqué « Je l'ai » : tous les héros sont proposés.</p>` : ""}
      <div class="liste" style="margin:0 -16px">${liste.map((h) => `<label class="ligne-l">${avatar(h, { taille: 44 })}
        <div class="txt"><b>${esc(h.nom)}</b><small>${esc(ROLES[h.role])} · ${esc(TYPES[h.type])}</small></div>
        <span class="interrupteur" style="padding:0"><input type="checkbox" data-equipe="${h.id}" ${etat.equipe.includes(h.id) ? "checked" : ""}></span></label>`).join("")}</div>`];
  },
  hero(id) {
    const h = heroParId(id);
    if (!h) return ["Héros", "<p>Introuvable.</p>"];
    const p = progression(etat, id);
    const skins = cat().skins.filter((s) => s.heroId === id);
    const arts = artefactsResolus(etat);
    const qui = porteurs(etat);
    const empl = Number(etat.joueur.emplacements) || 2;
    const pal = prochainPalier(p.promotion);
    return [h.nom, `
      <div class="fiche-tete">${avatar(h, { terne: !p.possede })}<div><div class="puces">${chipsHero(h)}</div></div></div>
      <label class="interrupteur">Je l'ai<input type="checkbox" data-roster="${id}" data-champ="possede" ${p.possede ? "checked" : ""}></label>
      <label class="interrupteur">Dans mon équipe<input type="checkbox" data-equipe="${id}" ${etat.equipe.includes(id) ? "checked" : ""}></label>
      ${p.possede ? `
      <div class="duo"><div class="champ"><label>Niveau</label>${stepper(`roster.${id}.niveau`, p.niveau, 1)}</div>
        <div class="champ"><label>Promotion</label>${stepper(`roster.${id}.promotion`, p.promotion)}</div></div>
      <div class="champ"><label>Étoiles</label>${stepper(`roster.${id}.etoiles`, p.etoiles)}</div>
      ${pal ? `<div class="note">Prochain palier P${pal.niveau} : ${esc(pal.bonus)}.</div>` : ""}
      <div class="champ"><label for="skin-${id}">Skin</label><select id="skin-${id}" data-hero-skin="${id}"><option value="">Aucun</option>
        ${skins.map((s) => `<option value="${s.id}" ${p.skin === s.id ? "selected" : ""}>${esc(s.nom)}${etat.skinsPossedes[s.id] ? "" : " (pas possédé)"}${s.bonusValeur ? ` · +${esc(s.bonusValeur)} % ${esc(STATS_ARTEFACT[s.bonusStat] || "")}` : ""}</option>`).join("")}</select>
        <button class="lien" data-act="ouvrir" data-f="fiche-skin" data-id="" data-hero="${id}" style="justify-self:start">Nouveau skin pour ${esc(h.nom)}</button></div>
      <span class="etiquette">Artefacts équipés</span>
      ${Array.from({ length: empl }, (_, i) => `<div class="champ"><select data-slot="${id}" data-index="${i}" aria-label="Emplacement ${i + 1}"><option value="">Emplacement ${i + 1} : vide</option>
        ${arts.map((a) => { const autre = qui.get(a.id); return `<option value="${a.id}" ${p.artefacts[i] === a.id ? "selected" : ""}>${esc(a.nom)} · ${esc(STATS_ARTEFACT[a.stat])} · ${esc(a.rarete)}${autre && autre !== id ? ` (sur ${esc(heroParId(autre)?.nom || "?")})` : ""}</option>`; }).join("")}</select></div>`).join("")}
      <small class="discret">À viser : ${statsIdeales(h).slice(0, 3).map((s) => esc(s.libelle)).join(" › ")}</small>` : ""}
      <div class="titre-section"><h2>Fiche</h2><button class="lien" data-act="ouvrir" data-f="fiche-hero" data-id="${id}">Modifier</button></div>
      ${h.competences ? `<p><b>Compétences.</b> ${esc(h.competences)}</p>` : ""}
      ${h.aura ? `<p><b>Aura.</b> ${esc(h.aura)}</p>` : ""}
      ${h.note ? `<p class="discret">${esc(h.note)}</p>` : ""}
      ${!h.competences && !h.aura ? `<p class="discret">Compétences non publiées. Recopiez-les depuis la fiche du héros dans le jeu.</p>` : ""}
      <p class="discret">Source : ${esc(h.source || "vous")}</p>`];
  },
  "fiche-hero"(id) {
    const h = heroParId(id) || { id: "", nom: "", rarete: "Légendaire", type: "physique", effet: "aucun", role: "mono", tier: "B", competences: "", aura: "", note: "" };
    return [id ? `Fiche : ${h.nom}` : "Nouveau héros", `
      <form data-form="hero" data-id="${esc(id)}">
        <div class="champ"><label for="fh-nom">Nom</label><input id="fh-nom" name="nom" required value="${esc(h.nom)}"></div>
        <div class="duo"><div class="champ"><label>Rareté</label><select name="rarete">${optsListe(RARETES, h.rarete)}</select></div>
          <div class="champ"><label>Tier</label><select name="tier">${optsListe(TIERS, h.tier)}</select></div></div>
        <div class="duo"><div class="champ"><label>Type d'attaque</label><select name="type">${opts(TYPES, h.type)}</select></div>
          <div class="champ"><label>Effet</label><select name="effet">${opts(EFFETS, h.effet)}</select></div></div>
        <div class="champ"><label>Rôle</label><select name="role">${opts(ROLES, h.role)}</select></div>
        <div class="champ"><label>Compétences / ultime</label><textarea name="competences" rows="3">${esc(h.competences)}</textarea></div>
        <div class="champ"><label>Aura (quand il est déployé)</label><textarea name="aura" rows="2">${esc(h.aura)}</textarea></div>
        <div class="champ"><label>Notes</label><textarea name="note" rows="2">${esc(h.note)}</textarea></div>
        <button class="btn plein large" type="submit">Enregistrer</button>
        ${id ? `<button class="btn danger large" type="button" style="margin-top:8px" data-act="suppr-hero" data-id="${id}" data-confirmer="Touchez encore pour supprimer">Supprimer du catalogue</button>` : ""}
      </form>`];
  },
  "ajout-artefact"() {
    return ["Ajouter un artefact", `
      <form data-form="artefact-inventaire">
        <div class="champ"><label for="aa-ref">Artefact du catalogue</label><select id="aa-ref" name="ref">${cat().artefacts.map((a) => `<option value="${a.id}">${esc(a.nom)} · ${esc(STATS_ARTEFACT[a.stat])}</option>`).join("")}</select></div>
        <div class="duo"><div class="champ"><label>Rareté</label><select name="rarete">${optsListe(RARETES, "Épique")}</select></div>
          <div class="champ"><label for="aa-niv">Niveau</label><input id="aa-niv" name="niveau" type="number" inputmode="numeric" min="0" value="0"></div></div>
        <button class="btn plein large" type="submit">Ajouter à mon inventaire</button>
      </form>
      <div class="titre-section"><h2>Il n'est pas dans la liste ?</h2></div>
      <form data-form="artefact-catalogue">
        <div class="champ"><label for="ac-nom">Nom exact dans le jeu</label><input id="ac-nom" name="nom" required></div>
        <div class="duo"><div class="champ"><label>Stat principale</label><select name="stat">${opts(STATS_ARTEFACT, "patk")}</select></div>
          <div class="champ"><label>Rareté</label><select name="rarete">${optsListe(RARETES, "Épique")}</select></div></div>
        <div class="champ"><label for="ac-eff">Effet spécial</label><input id="ac-eff" name="effet" placeholder="Ex. +10 % de durée de Brûlure"></div>
        <button class="btn large" type="submit">Créer et ajouter</button>
      </form>`];
  },
  artefact(id) {
    const inv = etat.inventaire.find((i) => i.id === id);
    const a = artefactsResolus(etat).find((x) => x.id === id);
    if (!inv || !a) return ["Artefact", "<p>Introuvable.</p>"];
    const qui = porteurs(etat).get(id) || "";
    return [a.nom, `
      <div class="fiche-tete"><div class="carre" data-r="${esc(a.rarete)}" style="width:64px;height:64px">${esc(STATS_ARTEFACT[a.stat]?.slice(0, 4))}</div>
        <div><b>${esc(a.nom)}</b><div class="discret">${esc(STATS_ARTEFACT[a.stat])}${a.effet ? ` · ${esc(a.effet)}` : ""}</div></div></div>
      <div class="duo"><div class="champ"><label>Rareté</label><select data-inv="${id}" data-champ="rarete">${optsListe(RARETES, a.rarete)}</select></div>
        <div class="champ"><label>Niveau</label>${stepper(`inv.${id}.niveau`, a.niveau)}</div></div>
      <div class="champ"><label for="porteur">Porté par</label><select id="porteur" data-porteur="${id}"><option value="">Personne</option>
        ${herosDe(etat).filter((h) => progression(etat, h.id).possede).map((h) => `<option value="${h.id}" ${qui === h.id ? "selected" : ""}>${esc(h.nom)}</option>`).join("")}</select></div>
      <button class="btn danger large" data-act="suppr-inv" data-id="${id}" data-confirmer="Touchez encore pour retirer">Retirer de l'inventaire</button>`];
  },
  "fiche-skin"(id, extra) {
    const s = cat().skins.find((x) => x.id === id) || { id: "", nom: "", heroId: extra || "", bonusStat: "", bonusValeur: "", obtention: "", note: "" };
    return [id ? s.nom : "Nouveau skin", `
      <form data-form="skin" data-id="${esc(id)}">
        <div class="champ"><label for="fs-nom">Nom du skin</label><input id="fs-nom" name="nom" required value="${esc(s.nom)}"></div>
        <div class="champ"><label>Héros</label><select name="heroId" required>${herosDe(etat).map((h) => `<option value="${h.id}" ${h.id === s.heroId ? "selected" : ""}>${esc(h.nom)}</option>`).join("")}</select></div>
        <div class="duo"><div class="champ"><label>Bonus</label><select name="bonusStat"><option value="">Aucun / cosmétique</option>${opts(STATS_ARTEFACT, s.bonusStat)}</select></div>
          <div class="champ"><label for="fs-val">Valeur (%)</label><input id="fs-val" name="bonusValeur" type="number" inputmode="decimal" min="0" step="0.1" value="${esc(s.bonusValeur)}"></div></div>
        <div class="champ"><label for="fs-obt">Obtention</label><input id="fs-obt" name="obtention" value="${esc(s.obtention)}" placeholder="Ex. Halloween Fright, bonbons"></div>
        <label class="interrupteur">Je l'ai<input type="checkbox" name="possede" ${etat.skinsPossedes[id] ? "checked" : ""}></label>
        <button class="btn plein large" type="submit">Enregistrer</button>
        ${id ? `<button class="btn danger large" type="button" style="margin-top:8px" data-act="suppr-skin" data-id="${id}" data-confirmer="Touchez encore pour supprimer">Supprimer</button>` : ""}
      </form>`];
  },
  boss(id) {
    const b = bossParId(id);
    if (!b) return ["Boss", "<p>Introuvable.</p>"];
    const aDesHeros = herosDe(etat).some((h) => progression(etat, h.id).possede);
    const mes = ui.mesHeros && aDesHeros;
    const equipe = composerEquipe(herosDe(etat), b, etat, { mesHerosSeulement: mes });
    const conf = configurationArtefacts(etat, equipe.map((e) => e.hero));
    const parCible = [...b.faiblesses].map((k) => ({ k, heros: classerContre(herosDe(etat), b, etat, { mesHerosSeulement: mes })
      .filter((c) => c.hero.type === k || c.hero.effet === k).slice(0, 3) }));
    return [b.nom, `
      <div class="puces" style="padding-top:8px">${b.faiblesses.map((k) => `<span class="chip bon">Faible : ${esc(nomCible(k))}</span>`).join("")}
        ${b.resistances.map((k) => `<span class="chip mauvais">Résiste : ${esc(nomCible(k))}</span>`).join("")}
        ${b.traits.map((k) => `<span class="chip">${esc(TRAITS[k])}</span>`).join("")}</div>
      ${b.forces ? `<p><b>Forces.</b> ${esc(b.forces)}</p>` : ""}
      ${b.specificites ? `<p><b>Spécificités.</b> ${esc(b.specificites)}</p>` : ""}
      <div class="titre-section"><h2>Comment le battre</h2></div>
      ${conseilsCombat(b).map((c) => `<div class="note">${esc(c)}</div>`).join("")}
      <div class="titre-section"><h2>Équipe conseillée</h2></div>
      <label class="interrupteur">Avec mes héros seulement<input type="checkbox" data-ui-coche="mesHeros" ${ui.mesHeros ? "checked" : ""}></label>
      ${ui.mesHeros && !aDesHeros ? `<p class="discret">Aucun héros possédé : l'équipe pioche dans tout le catalogue.</p>` : ""}
      ${equipe.map(({ hero, pourquoi }) => `<div style="display:flex;gap:10px;padding:8px 0;border-top:1px solid var(--ligne)">${avatar(hero, { taille: 44 })}
        <div style="min-width:0"><b>${esc(hero.nom)}</b><ul class="raisons">${pourquoi.map((r) => `<li class="${r.startsWith("+") ? "plus" : r.startsWith("−") ? "moins" : ""}">${esc(r)}</li>`).join("")}</ul></div></div>`).join("")}
      <button class="btn plein large" data-act="equipe-boss" data-id="${b.id}">En faire mon équipe</button>
      ${parCible.length ? `<div class="titre-section"><h2>Meilleurs héros par faiblesse</h2></div>
        ${parCible.map(({ k, heros }) => `<p><b>${esc(nomCible(k))}</b> : ${heros.length ? heros.map((c) => esc(c.hero.nom)).join(", ") : `<span class="discret">aucun héros ${mes ? "possédé " : ""}de ce type</span>`}</p>`).join("")}` : ""}
      <div class="titre-section"><h2>Artefacts pour ce combat</h2></div>
      ${conf.lignes.map((l) => `<p><b>${esc(l.hero.nom)}</b> : ${l.optimaux.length ? l.optimaux.map((a) => esc(a.nom)).join(", ") : `<span class="discret">cherchez ${l.ideales.slice(0, 2).map((s) => esc(s.libelle)).join(" ou ")}</span>`}</p>`).join("")}
      <div style="display:grid;gap:8px;margin-top:12px"><button class="btn large" data-act="ouvrir" data-f="fiche-boss" data-id="${b.id}">Modifier ce boss</button></div>`];
  },
  "fiche-boss"(id) {
    const b = bossParId(id) || { id: "", nom: "", chapitre: "", forces: "", specificites: "", faiblesses: [], resistances: [], traits: [] };
    const CIBLES = { ...Object.fromEntries(Object.entries(TYPES).filter(([k]) => k !== "inconnu")), ...Object.fromEntries(Object.entries(EFFETS).filter(([k]) => k !== "aucun")) };
    const cases = (nom, dict, choisis) => `<div class="cases">${Object.entries(dict).map(([k, v]) => `<label><input type="checkbox" name="${nom}" value="${k}" ${choisis.includes(k) ? "checked" : ""}>${esc(v)}</label>`).join("")}</div>`;
    return [id ? `Modifier : ${b.nom}` : "Nouveau boss", `
      <form data-form="boss" data-id="${esc(id)}">
        <div class="duo"><div class="champ"><label for="fb-nom">Nom</label><input id="fb-nom" name="nom" required value="${esc(b.nom)}"></div>
          <div class="champ"><label for="fb-chap">Chapitre</label><input id="fb-chap" name="chapitre" value="${esc(b.chapitre)}"></div></div>
        <div class="champ"><span class="etiquette">Faiblesses</span>${cases("faiblesses", CIBLES, b.faiblesses)}</div>
        <div class="champ"><span class="etiquette">Résistances</span>${cases("resistances", CIBLES, b.resistances)}</div>
        <div class="champ"><span class="etiquette">Traits</span>${cases("traits", TRAITS, b.traits)}</div>
        <div class="champ"><label for="fb-for">Forces</label><textarea id="fb-for" name="forces" rows="2">${esc(b.forces)}</textarea></div>
        <div class="champ"><label for="fb-spe">Spécificités (attaques, phases…)</label><textarea id="fb-spe" name="specificites" rows="3">${esc(b.specificites)}</textarea></div>
        <button class="btn plein large" type="submit">Enregistrer</button>
        ${id ? `<button class="btn danger large" type="button" style="margin-top:8px" data-act="suppr-boss" data-id="${id}" data-confirmer="Touchez encore pour supprimer">Supprimer</button>` : ""}
      </form>`];
  },
  offre(id) {
    const o = cat().offres.find((x) => x.id === id) || { id: "", nom: "", categorie: "pack", prix: "", contenu: "", avantages: [] };
    return [id ? o.nom : "Nouvelle option", `
      <form data-form="offre" data-id="${esc(id)}">
        <div class="champ"><label for="fo-nom">Nom</label><input id="fo-nom" name="nom" required value="${esc(o.nom)}"></div>
        <div class="duo"><div class="champ"><label>Type</label><select name="categorie">${opts({ abonnement: "Abonnement", pass: "Pass", pack: "Pack", evenement: "Événement", autre: "Autre" }, o.categorie)}</select></div>
          <div class="champ"><label for="fo-prix">Prix</label><input id="fo-prix" name="prix" value="${esc(o.prix)}"></div></div>
        <div class="champ"><label for="fo-cont">Contenu</label><textarea id="fo-cont" name="contenu" rows="3">${esc(o.contenu)}</textarea></div>
        <div class="champ"><span class="etiquette">Ce que ça débloque</span><div class="cases">${Object.entries(AVANTAGES).map(([k, v]) => `<label><input type="checkbox" name="avantages" value="${k}" ${(o.avantages || []).includes(k) ? "checked" : ""}>${esc(v)}</label>`).join("")}</div></div>
        <button class="btn plein large" type="submit">Enregistrer</button>
        ${id ? `<button class="btn danger large" type="button" style="margin-top:8px" data-act="suppr-offre" data-id="${id}" data-confirmer="Touchez encore pour supprimer">Supprimer</button>` : ""}
      </form>`];
  },
  "cat-heros"() {
    return ["Catalogue des héros", `<div class="liste" style="margin:0 -16px">${herosDe(etat).map((h) => `<button class="ligne-l" data-act="ouvrir" data-f="fiche-hero" data-id="${h.id}">${avatar(h, { taille: 44 })}
      <div class="txt"><b>${esc(h.nom)}</b><small>${esc(h.rarete)} · ${esc(TYPES[h.type])} · ${esc(ROLES[h.role])}${h.aVerifier ? " · à vérifier" : ""}</small></div>${ic("chevron", 18)}</button>`).join("")}</div>
      <button class="btn plein large" data-act="ouvrir" data-f="fiche-hero" data-id="">Ajouter un héros</button>`];
  },
  "cat-artefacts"() {
    return ["Catalogue des artefacts", `<p class="discret">Aucune liste publique des artefacts n'existe : les entrées « Artefact P.ATK »… sont génériques. Créez les vrais depuis Profil › Artefacts › Ajouter.</p>
      <div class="liste" style="margin:0 -16px">${cat().artefacts.map((a) => `<div class="ligne-l"><div class="carre" data-r="${esc(a.rarete)}">${esc(STATS_ARTEFACT[a.stat]?.slice(0, 4))}</div>
        <div class="txt"><b>${esc(a.nom)}</b><small>${esc(STATS_ARTEFACT[a.stat])}${a.effet ? ` · ${esc(a.effet)}` : ""}</small></div>
        <button class="btn danger" data-act="suppr-cat-artefact" data-id="${a.id}" data-confirmer="Sûr ?">Suppr.</button></div>`).join("")}</div>`];
  },
  promotions() {
    return ["Paliers de promotion", `${PALIERS_PROMOTION.map((p) => `<div class="etape"><div class="num">P${p.niveau}</div><div><b>${esc(p.bonus)}</b><span class="discret">${esc(p.source)}</span></div></div>`).join("")}
      <p class="discret">Les guides conseillent de viser P6 puis P9 sur les 5 héros de l'équipe avant tout le reste.</p>`];
  },
  installer() {
    return ["Installer sur l'iPhone", `
      <div class="etape"><div class="num">1</div><div><b>Ouvrez l'adresse de l'app dans Safari</b><span class="discret">Pas dans une autre app : seul Safari sait installer sur l'écran d'accueil.</span></div></div>
      <div class="etape"><div class="num">2</div><div><b>Touchez Partager, puis « Sur l'écran d'accueil »</b><span class="discret">Activez « Ouvrir comme app web » si iOS le propose.</span></div></div>
      <div class="etape"><div class="num">3</div><div><b>Lancez-la depuis l'icône</b><span class="discret">Plein écran, sans barre Safari, et hors ligne après la première ouverture.</span></div></div>
      <div class="note">L'installation hors ligne demande que l'app soit hébergée sur sa propre adresse (GitHub Pages, Netlify…). Ouverte depuis claude.ai, elle reste une page web liée à votre compte.</div>
      <div class="note">Vos données restent dans l'app installée. Avant de changer de téléphone, faites Plus › Sauvegarde › Copier.</div>`];
  },
  connexion() {
    return ["Connexion au compte du jeu", `
      <div class="note alerte">Impossible de récupérer automatiquement votre profil du jeu.</div>
      <p>Knock Knock: Room Defense ne propose ni site de compte, ni export de données, ni API publique. Vos héros, artefacts et skins sont stockés sur les serveurs de l'éditeur, accessibles seulement depuis le jeu.</p>
      <p>Les contourner (lire le trafic du jeu, extraire les fichiers de l'app, utiliser un APK modifié) enfreint les conditions d'utilisation et peut faire bannir le compte. L'app ne le fait pas.</p>
      <p><b>Ce qui reste rapide :</b> remplissez le profil une fois (une à deux minutes par héros avec les boutons + et −), puis mettez à jour seulement ce qui change après chaque session.</p>`];
  },
  sauvegarde() {
    return ["Sauvegarde et transfert", `
      <p class="discret">Copiez ce texte pour garder votre profil, ou collez celui d'un autre appareil puis « Charger ».</p>
      <div class="champ"><label for="profil-json">Profil</label><textarea id="profil-json" class="mono" rows="7" spellcheck="false">${esc(JSON.stringify(etat))}</textarea></div>
      <div class="duo"><button class="btn plein" data-act="copier">Copier</button><button class="btn" data-act="coller">Charger ce texte</button></div>
      <div class="champ" style="margin-top:10px"><label for="import-fichier">Ou importer un fichier .json</label><input id="import-fichier" type="file" accept="application/json,.json" data-import></div>`];
  },
};

function rendreFeuille() {
  if (!ui.feuille) { $feuille.innerHTML = ""; document.body.classList.remove("sheet-ouvert"); return; }
  const corpsAvant = $feuille.querySelector(".feuille-corps");
  const defil = corpsAvant && $feuille.dataset.cle === ui.feuille.cle ? corpsAvant.scrollTop : 0;
  const fn = FEUILLES[ui.feuille.type];
  const [titre, corps] = fn(ui.feuille.id, ui.feuille.extra);
  const pile = ui.pile?.length;
  if (corpsAvant && $feuille.dataset.cle === ui.feuille.cle) {
    // Même feuille : on remplace le contenu sans rejouer l'animation d'ouverture.
    $feuille.querySelector(".feuille-tete h2").textContent = titre;
    corpsAvant.innerHTML = corps;
    corpsAvant.scrollTop = defil;
    return;
  }
  $feuille.innerHTML = `<div class="voile" data-act="fermer-fond"><div class="feuille" role="dialog" aria-modal="true" aria-label="${esc(titre)}">
    <div class="feuille-tete">${pile ? `<button class="icone-btn" data-act="retour" aria-label="Retour">${ic("retour", 22)}</button>` : "<span></span>"}
      <h2>${esc(titre)}</h2><button class="icone-btn" data-act="fermer" aria-label="Fermer">${ic("fermer", 22)}</button></div>
    <div class="feuille-corps">${corps}</div></div></div>`;
  $feuille.dataset.cle = ui.feuille.cle;
  $feuille.querySelector(".feuille-corps").scrollTop = defil;
  document.body.classList.add("sheet-ouvert");
}
function ouvrir(type, id = "", extra = "") {
  if (ui.feuille) { ui.pile = ui.pile || []; ui.pile.push(ui.feuille); }
  ui.feuille = { type, id, extra, cle: `${type}:${id}` };
  rendreFeuille();
}
function fermer() { ui.feuille = null; ui.pile = []; rendreFeuille(); }
function retour() { ui.feuille = ui.pile?.pop() || null; rendreFeuille(); }

/* ---------- Rendu général ---------- */

const ONGLETS = {
  profil: { titre: () => etat.joueur.pseudo || "Profil", vue: vueProfil, action: () => `<button class="icone-btn" data-act="ouvrir" data-f="ajout-artefact" aria-label="Ajouter un artefact">${ic("ajouter")}</button>` },
  strategie: { titre: () => "Stratégie", vue: vueStrategie },
  boss: { titre: () => "Boss", vue: vueBoss, action: () => `<button class="icone-btn" data-act="ouvrir" data-f="fiche-boss" data-id="" aria-label="Ajouter un boss">${ic("ajouter")}</button>` },
  boutique: { titre: () => "Options payantes", vue: vueBoutique },
  plus: { titre: () => "Plus", vue: vuePlus },
};

function rendre() {
  const actif = document.activeElement;
  const idFocus = actif && $vue.contains(actif) && actif.type === "search" ? actif.id : null;
  const o = ONGLETS[ui.onglet];
  $titre.textContent = o.titre();
  $actions.innerHTML = o.action ? o.action() : "";
  $vue.innerHTML = o.vue();
  document.querySelectorAll(".onglets button").forEach((b) => b.toggleAttribute("aria-current", b.dataset.onglet === ui.onglet));
  const nbChanger = (() => { const eq = equipeActuelle(etat); return eq.length ? configurationArtefacts(etat, eq).aChanger : 0; })();
  const pastille = document.getElementById("pastille-strategie");
  pastille.hidden = !nbChanger; pastille.textContent = nbChanger;
  if (idFocus) { const el = document.getElementById(idFocus); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
  if (ui.feuille) rendreFeuille();
}

/* ---------- Événements ---------- */

function setCle(cle, valeur) {
  const [racine, a, b] = cle.split(".");
  if (racine === "joueur") etat.joueur[a] = valeur;
  if (racine === "roster") fiche(a)[b] = valeur;
  if (racine === "inv") { const i = etat.inventaire.find((x) => x.id === a); if (i) i[b] = valeur; }
}
function getCle(cle) {
  const [racine, a, b] = cle.split(".");
  if (racine === "joueur") return Number(etat.joueur[a]) || 0;
  if (racine === "roster") return Number(progression(etat, a)[b]) || 0;
  if (racine === "inv") return Number(etat.inventaire.find((x) => x.id === a)?.[b]) || 0;
  return 0;
}
function basculerEquipe(id, oui) {
  etat.equipe = etat.equipe.filter((x) => x !== id);
  if (oui) {
    if (etat.equipe.length >= TAILLE_EQUIPE) { toast(`Équipe pleine (${TAILLE_EQUIPE}) : retirez un héros d'abord`); return; }
    etat.equipe.push(id);
  }
}

document.querySelector(".onglets").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-onglet]");
  if (!b) return;
  ui.onglet = b.dataset.onglet;
  rendre();
  window.scrollTo(0, 0);
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.ui) { ui[t.dataset.ui] = t.value; rendre(); }
});

document.addEventListener("change", (e) => {
  const t = e.target, d = t.dataset;
  if (d.joueur) { etat.joueur[d.joueur] = t.value; return enregistrer(); }
  if (d.num) { setCle(d.num, Math.max(Number(t.min) || 0, Number(t.value) || 0)); return enregistrer(); }
  if (d.roster) {
    fiche(d.roster)[d.champ] = t.checked;
    if (d.champ === "possede" && !t.checked) etat.equipe = etat.equipe.filter((x) => x !== d.roster);
    return enregistrer();
  }
  if (d.equipe) { basculerEquipe(d.equipe, t.checked); return enregistrer(); }
  if (d.skin) { etat.skinsPossedes[d.skin] = t.checked; return enregistrer(); }
  if (d.heroSkin) { fiche(d.heroSkin).skin = t.value || null; return enregistrer(); }
  if (d.slot) { equiper(d.slot, Number(d.index), t.value); return enregistrer(); }
  if (d.inv) { const i = etat.inventaire.find((x) => x.id === d.inv); if (i) i[d.champ] = t.value; return enregistrer(); }
  if (d.porteur) {
    for (const r of Object.values(etat.roster)) if (Array.isArray(r.artefacts)) r.artefacts = r.artefacts.filter((a) => a !== d.porteur);
    if (t.value) {
      const r = fiche(t.value), max = Number(etat.joueur.emplacements) || 2;
      if (r.artefacts.length >= max) r.artefacts.shift();
      r.artefacts.push(d.porteur);
    }
    return enregistrer();
  }
  if (d.offre) { etat.abonnements[d.offre] = { ...(etat.abonnements[d.offre] || {}), actif: t.checked }; return enregistrer(); }
  if (d.offreFin) { etat.abonnements[d.offreFin] = { ...(etat.abonnements[d.offreFin] || {}), fin: t.value }; return enregistrer(); }
  if (d.quotidien !== undefined) { etat.quotidien.coches[d.quotidien] = t.checked; return enregistrer(); }
  if (d.uiCoche) { ui[d.uiCoche] = t.checked; return rendre(); }
  if (t.hasAttribute("data-import") && t.files[0]) {
    t.files[0].text().then((txt) => { etat = fusionner(JSON.parse(txt)); enregistrer(); toast("Profil importé"); }).catch(() => toast("Fichier illisible : choisissez un profil exporté par l'app"));
  }
});

const ACTIONS = {
  ouvrir: (b) => ouvrir(b.dataset.f, b.dataset.id || "", b.dataset.hero || ""),
  fermer, retour,
  "fermer-fond": (b, e) => { if (e.target === b) fermer(); },
  segment: (b) => { ui.segment = b.dataset.id; rendre(); },
  "bascule-ui": (b) => { ui[b.dataset.id] = !ui[b.dataset.id]; rendre(); },
  pas: (b) => { const cle = b.dataset.cle; const min = cle.endsWith("niveau") || cle.endsWith("emplacements") ? 1 : 0;
    setCle(cle, Math.max(min, getCle(cle) + Number(b.dataset.pas))); enregistrer(); },
  appliquer: (b) => {
    const l = configurationArtefacts(etat, equipeActuelle(etat)).lignes.find((x) => x.hero.id === b.dataset.id);
    if (!l) return;
    fiche(l.hero.id).artefacts = [];
    l.optimaux.forEach((a, i) => equiper(l.hero.id, i, a.id));
    enregistrer(); toast(`Artefacts de ${l.hero.nom} mis à jour`);
  },
  "appliquer-tout": () => {
    const { lignes } = configurationArtefacts(etat, equipeActuelle(etat));
    for (const l of lignes) fiche(l.hero.id).artefacts = [];
    for (const l of lignes) l.optimaux.forEach((a, i) => equiper(l.hero.id, i, a.id));
    enregistrer(); toast("Configuration appliquée. Reproduisez-la dans le jeu.");
  },
  "mettre-skin": (b) => { fiche(b.dataset.id).skin = b.dataset.skin; enregistrer(); toast("Skin équipé"); },
  "prendre-equipe": (b) => { const eq = EQUIPES_REFERENCE.find((x) => x.nom === b.dataset.id); if (!eq) return;
    etat.equipe = eq.heros.filter((id) => heroParId(id)).slice(0, TAILLE_EQUIPE); enregistrer(); toast(`Équipe ${eq.nom} sélectionnée`); },
  "equipe-boss": (b) => { const boss = bossParId(b.dataset.id);
    const aDesHeros = herosDe(etat).some((h) => progression(etat, h.id).possede);
    etat.equipe = composerEquipe(herosDe(etat), boss, etat, { mesHerosSeulement: ui.mesHeros && aDesHeros }).map((e) => e.hero.id);
    enregistrer(); toast("Équipe mise à jour"); },
  "suppr-hero": (b) => { supprimerCatalogue("heros", b.dataset.id); delete etat.roster[b.dataset.id]; etat.equipe = etat.equipe.filter((x) => x !== b.dataset.id); fermer(); enregistrer(); },
  "suppr-skin": (b) => { supprimerCatalogue("skins", b.dataset.id); delete etat.skinsPossedes[b.dataset.id];
    for (const r of Object.values(etat.roster)) if (r.skin === b.dataset.id) r.skin = null; retour(); enregistrer(); },
  "suppr-boss": (b) => { supprimerCatalogue("boss", b.dataset.id); fermer(); enregistrer(); },
  "suppr-offre": (b) => { supprimerCatalogue("offres", b.dataset.id); delete etat.abonnements[b.dataset.id]; fermer(); enregistrer(); },
  "suppr-inv": (b) => { etat.inventaire = etat.inventaire.filter((x) => x.id !== b.dataset.id); equiper("__aucun__", 0, b.dataset.id); delete etat.roster.__aucun__; fermer(); enregistrer(); },
  "suppr-cat-artefact": (b) => { supprimerCatalogue("artefacts", b.dataset.id); enregistrer(); },
  copier: () => {
    const zone = document.getElementById("profil-json");
    const selection = () => { zone.focus(); zone.select(); toast("Texte sélectionné : copiez-le"); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(zone.value).then(() => toast("Profil copié"), selection); else selection();
  },
  coller: () => {
    try { etat = fusionner(JSON.parse(document.getElementById("profil-json").value)); enregistrer(); toast("Profil chargé"); }
    catch { toast("Texte invalide : collez un profil copié depuis l'app"); }
  },
  reinitialiser: () => { etat = etatInitial(); fermer(); enregistrer(); toast("Profil effacé"); },
};

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  if (b.dataset.confirmer && !b.dataset.arme) {
    b.dataset.arme = "1"; b.dataset.texte = b.textContent; b.textContent = b.dataset.confirmer;
    setTimeout(() => { if (b.isConnected) { delete b.dataset.arme; b.textContent = b.dataset.texte; } }, 3000);
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
    const h = heroParId(id);
    if (h) Object.assign(h, v, { aVerifier: false });
    else cat().heros.push({ id: nouvelId("hero"), ...v, source: "Ajouté par vous", aVerifier: false });
    toast("Fiche enregistrée"); retour();
  }
  if (type === "artefact-inventaire") {
    etat.inventaire.push({ id: nouvelId("art"), ref: fd.get("ref"), rarete: fd.get("rarete"), niveau: Number(fd.get("niveau")) || 0 });
    toast("Artefact ajouté"); fermer(); ui.onglet = "profil"; ui.segment = "artefacts";
  }
  if (type === "artefact-catalogue") {
    const ref = nouvelId("cat-art");
    cat().artefacts.push({ id: ref, ...champs(["nom", "stat", "rarete", "effet"]) });
    etat.inventaire.push({ id: nouvelId("art"), ref, rarete: fd.get("rarete"), niveau: 0 });
    toast("Artefact créé et ajouté"); fermer(); ui.onglet = "profil"; ui.segment = "artefacts";
  }
  if (type === "skin") {
    const v = champs(["nom", "heroId", "bonusStat", "bonusValeur", "obtention"]);
    let s = cat().skins.find((x) => x.id === id);
    if (s) Object.assign(s, v); else { s = { id: nouvelId("skin"), ...v }; cat().skins.push(s); }
    etat.skinsPossedes[s.id] = fd.get("possede") === "on";
    toast("Skin enregistré"); retour();
  }
  if (type === "boss") {
    const v = { ...champs(["nom", "chapitre", "forces", "specificites"]), faiblesses: fd.getAll("faiblesses"), resistances: fd.getAll("resistances"), traits: fd.getAll("traits") };
    const b = bossParId(id);
    if (b) Object.assign(b, v, { modele: false });
    else { const nb = { id: nouvelId("boss"), ...v, modele: false }; cat().boss.unshift(nb); ui.feuille = null; ui.pile = []; ouvrir("boss", nb.id); }
    toast("Boss enregistré"); if (b) retour();
  }
  if (type === "offre") {
    const v = { ...champs(["nom", "categorie", "prix", "contenu"]), avantages: fd.getAll("avantages") };
    const o = cat().offres.find((x) => x.id === id);
    if (o) Object.assign(o, v); else cat().offres.push({ id: nouvelId("offre"), ...v, source: "Ajouté par vous" });
    toast("Option enregistrée"); fermer();
  }
  enregistrer();
});

rendre();

if ("serviceWorker" in navigator && location.protocol === "https:" || location.hostname === "localhost") {
  navigator.serviceWorker?.register("sw.js").catch(() => {});
}
