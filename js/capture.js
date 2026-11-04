// Analyse du texte lu sur une capture d'écran du jeu (anglais ou français).
// Fonctions pures : elles reçoivent le texte brut de l'OCR et le catalogue,
// et proposent des fiches que l'utilisateur vérifie avant de les enregistrer.

const ACCENTS = new RegExp("[\\u0300-\\u036f]", "g");
export const normaliser = (s) => String(s || "").normalize("NFD").replace(ACCENTS, "").toLowerCase();
const compact = (s) => normaliser(s).replace(/[^a-z0-9]/g, "");

export function distance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prec = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cour = [i];
    for (let j = 1; j <= n; j++) {
      cour[j] = Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prec = cour;
  }
  return prec[n];
}

export const similarite = (a, b) => (Math.max(a.length, b.length) ? 1 - distance(a, b) / Math.max(a.length, b.length) : 0);

/**
 * Cherche dans une ligne le nom le plus proche parmi les candidats
 * ({id, nom}). Tolère les erreurs de lecture (« Lazermam », « Poseid0n »).
 */
export function trouverNom(ligne, candidats, seuil = 0.8) {
  const brut = compact(ligne);
  if (brut.length < 3) return null;
  const mots = normaliser(ligne).split(/[^a-z0-9]+/).filter(Boolean);
  let meilleur = null;
  for (const c0 of candidats.flatMap((c) => [c, ...(c.alias || []).map((a) => ({ ...c, nom: a, nomOfficiel: c.nom }))])) {
    const c = c0;
    const cible = compact(c.nom);
    if (cible.length < 3) continue;
    let sim = brut.includes(cible) ? 1 : 0;
    if (sim < 1) {
      const nbMots = Math.max(1, normaliser(c.nom).split(/[^a-z0-9]+/).filter(Boolean).length);
      for (let k = Math.max(1, nbMots - 1); k <= nbMots + 1; k++) {
        for (let i = 0; i + k <= mots.length; i++) {
          sim = Math.max(sim, similarite(mots.slice(i, i + k).join(""), cible));
        }
      }
    }
    if (sim >= seuil && (!meilleur || sim > meilleur.sim || (sim === meilleur.sim && cible.length > compact(meilleur.nom).length))) {
      meilleur = { id: c.id, nom: c.nomOfficiel || c.nom, sim: Math.round(sim * 100) / 100 };
    }
  }
  return meilleur;
}

const nombre = (m) => (m ? Number(m[1]) : null);

/** Niveau : « Lv. 45 », « LV45 », « Level 45 », « Niv. 45 », « Niveau 45 », « Nv 45 ». */
export function lireNiveau(t) {
  return nombre(normaliser(t).match(/\b(?:lv|lvl|level|niv|niveau|nv)\s*[.:]?\s*(\d{1,3})\b/));
}

/** Promotion : « Promotion 6 », « Promo 6 », « Rank 6 », « Rang 6 », « Grade 6 ». */
export function lirePromotion(t) {
  return nombre(normaliser(t).match(/\b(?:promotion|promo|rank|rang|grade)\s*[.:]?\s*(\d{1,2})\b/));
}

/** Étoiles : « 5★ », « 5 stars », « 5 étoiles », ou une suite de ★. */
export function lireEtoiles(t) {
  const n = nombre(normaliser(t).match(/\b(\d{1,2})\s*(?:★|\*|stars?|etoiles?)/));
  if (n !== null) return n;
  const pleines = (String(t).match(/★/g) || []).length;
  return pleines >= 1 ? pleines : null;
}

const RARETES_MOTS = [
  [/\b(mythic|mythique|mythical)\b/, "Mythique"],
  [/\b(legendary|legendaire|legend)\b/, "Légendaire"],
  [/\b(epic|epique)\b/, "Épique"],
  [/\b(rare)\b/, "Rare"],
  [/\b(common|commun|commune)\b/, "Commun"],
];
export function lireRarete(t) {
  const n = normaliser(t);
  for (const [re, r] of RARETES_MOTS) if (re.test(n)) return r;
  return null;
}

// L'ordre compte : « attack speed » avant « attack ».
const STATS_MOTS = [
  [/\b(attack speed|atk ?spd|atk speed|vitesse d'?attaque|vit\.? ?att)/, "vitesse"],
  [/\b(p\.? ?atk|physical (attack|atk|dmg|damage)|attaque physique|atq\.? ?phys)/, "patk"],
  [/\b(m\.? ?atk|magic(al)? (attack|atk|dmg|damage)|attaque magique|atq\.? ?mag)/, "matk"],
  [/\b(crit(ical)?( rate| chance| dmg| damage)?|critique|coup critique)\b/, "crit"],
  [/\b(heal(ing)?|soins?|regen(eration)?)\b/, "soin"],
  [/\b(hp|pv|health|sante|points de vie)\b/, "pv"],
  [/\b(def(ense|ence)?|defense|armor|armure)\b/, "def"],
  [/\b(burn|bleed|poison|frost|freeze|paraly[sz]\w*|brulure|saignement|gel|effect|effet)\b/, "effet"],
];
export function lireStat(t) {
  const n = normaliser(t);
  for (const [re, s] of STATS_MOTS) if (re.test(n)) return s;
  return null;
}

/** Niveau d'artefact : « +12 » ou un niveau classique. */
export function lireNiveauArtefact(t) {
  const plus = String(t).match(/\+\s?(\d{1,2})\b(?!\s*%)/);
  return plus ? Number(plus[1]) : lireNiveau(t);
}

const MOTS_SKIN = /\b(skin|skins|apparence|tenue|costume|outfit)\b/;

function nettoyerNom(ligne) {
  return String(ligne).replace(/[^\p{L}\p{N}' .-]/gu, " ").replace(/\s+/g, " ").trim();
}

/**
 * Analyse le texte d'une ou plusieurs captures.
 * Retourne des propositions : héros (avec niveau, promotion, étoiles lus à
 * proximité du nom), artefacts et skins.
 */
export function analyserTexte(texte, catalogue) {
  const brutes = String(texte || "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 2);
  const heros = catalogue.heros || [];
  // Recolle un nom de héros coupé sur deux lignes consécutives.
  const lignes = [];
  for (let i = 0; i < brutes.length; i++) {
    const l = brutes[i], suiv = brutes[i + 1];
    if (suiv && !trouverNom(l, heros) && !trouverNom(suiv, heros) && /^\p{L}[\p{L}' .-]*$/u.test(l) && /^\p{L}[\p{L}' .-]*$/u.test(suiv)
      && trouverNom(`${l} ${suiv}`, heros)?.sim >= 0.9) { lignes.push(`${l} ${suiv}`); i++; }
    else lignes.push(l);
  }
  const artefactsNommes = (catalogue.artefacts || []).filter((a) => !a.generique);
  const skinsConnus = catalogue.skins || [];

  // 1. Repère la ligne de chaque nom de héros.
  const reperes = [];
  lignes.forEach((l, i) => {
    const h = trouverNom(l, heros);
    if (h) reperes.push({ i, h });
  });

  // 2. Lit les valeurs autour de chaque nom, sans déborder sur le héros suivant.
  const parHero = new Map();
  reperes.forEach(({ i, h }, k) => {
    // Les valeurs sont sous le nom ; la ligne du dessus ne sert que pour le
    // premier héros (elle appartient sinon au héros précédent).
    const fin = Math.min(lignes.length - 1, i + 4, k + 1 < reperes.length ? reperes[k + 1].i - 1 : Infinity);
    const dessus = k === 0 && i > 0 ? [lignes[i - 1]] : [];
    const zone = [lignes[i], ...lignes.slice(i + 1, fin + 1), ...dessus];
    const lire = (fn) => { for (const l of zone) { const v = fn(l); if (v !== null) return v; } return null; };
    const prop = { heroId: h.id, nom: h.nom, lu: lignes[i], sim: h.sim, niveau: lire(lireNiveau), promotion: lire(lirePromotion), etoiles: lire(lireEtoiles) };
    const ancien = parHero.get(h.id);
    if (!ancien) parHero.set(h.id, prop);
    else for (const c of ["niveau", "promotion", "etoiles"]) if (ancien[c] === null && prop[c] !== null) ancien[c] = prop[c];
  });

  // 3. Artefacts : nom connu du catalogue, ou ligne avec une statistique et une rareté proches.
  const artefacts = [];
  const lignesHeros = new Set(reperes.map((r) => r.i));
  lignes.forEach((l, i) => {
    if (lignesHeros.has(i) || MOTS_SKIN.test(normaliser(l))) return;
    const voisines = [l, lignes[i + 1] || "", lignes[i + 2] || ""];
    const connu = trouverNom(l, artefactsNommes, 0.85);
    if (connu) {
      const fiche = artefactsNommes.find((a) => a.id === connu.id);
      artefacts.push({ ref: connu.id, nom: fiche.nom, stat: fiche.stat, rarete: voisines.map(lireRarete).find(Boolean) || fiche.rarete,
        niveau: voisines.map(lireNiveauArtefact).find((v) => v !== null) ?? 0, lu: l });
      return;
    }
    // Ligne-titre d'un artefact : un vrai nom, une rareté sur la ligne ou la
    // suivante, une statistique juste en dessous. Une ligne de valeur
    // (« Attaque physique +12 % ») n'est pas un titre.
    const rarete = lireRarete(l) || lireRarete(lignes[i + 1] || "");
    const stat = voisines.slice(1).map(lireStat).find(Boolean) || lireStat(l);
    const nom = nettoyerNom(l.replace(/\+\s?\d+/, ""));
    const estValeur = lireStat(l) && /%|\d/.test(l.replace(/\+\s?\d+\s*$/, ""));
    const sansRarete = nom.replace(/\b(mythic|mythique|legendary|l[ée]gendaire|epic|[ée]pique|rare|common|commun)\b/gi, "");
    if (rarete && stat && !estValeur && /\p{L}{3,}/u.test(sansRarete) && !lireNiveau(l) && !lirePromotion(l) && lireEtoiles(l) === null) {
      artefacts.push({ ref: null, nom, stat, rarete, niveau: voisines.map(lireNiveauArtefact).find((v) => v !== null) ?? 0, lu: l });
    }
  });

  // 4. Skins : une ligne avec « skin / apparence / tenue », rattachée au héros nommé à côté.
  const skins = [];
  lignes.forEach((l, i) => {
    if (!MOTS_SKIN.test(normaliser(l))) return;
    const voisines = [l, lignes[i - 1] || "", lignes[i + 1] || ""];
    // Héros nommé à côté, sinon le dernier héros cité plus haut (fiche de héros).
    const precedent = [...reperes].reverse().find((r) => r.i < i);
    const hero = voisines.map((v) => trouverNom(v, heros)).find(Boolean) || precedent?.h;
    let nom = nettoyerNom(l.replace(/\b(skins?|apparence|tenue|costume|outfit)\b\s*[:-]?/gi, ""));
    if (hero) nom = nettoyerNom(nom.replace(new RegExp(hero.nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "")) || nom;
    if (!nom || nom.length < 3) nom = lignes[i + 1] && !trouverNom(lignes[i + 1], heros) ? nettoyerNom(lignes[i + 1]) : "";
    if (!nom) return;
    const existant = skinsConnus.find((s) => similarite(compact(s.nom), compact(nom)) >= 0.85);
    skins.push({ ref: existant?.id || null, nom: existant?.nom || nom, heroId: hero?.id || existant?.heroId || "", lu: l });
  });

  const dedoublonner = (liste, cle) => [...new Map(liste.map((x) => [cle(x), x])).values()];
  return {
    heros: [...parHero.values()],
    artefacts: dedoublonner(artefacts, (a) => `${a.ref || compact(a.nom)}|${a.niveau}`),
    skins: dedoublonner(skins, (s) => compact(s.nom)),
    lignes: lignes.length,
  };
}

/**
 * Remet dans l'ordre les lignes lues sur un écran en grille (cartes de héros) :
 * chaque valeur est rattachée au nom de héros situé juste au-dessus d'elle, dans
 * la même colonne. Une liste verticale reste dans l'ordre. Les éléments ont la
 * forme { texte, x0, y0, x1, y1 } (pixels de l'image).
 */
export function ordonnerParCartes(elements, catalogue) {
  if (!elements?.length) return "";
  const heros = catalogue.heros || [];
  // Un nom coupé sur deux lignes dans une carte (« Ghost » / « Captain ») est recollé.
  const base = [...elements].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const pris = new Set();
  const tries = [];
  for (const e of base) {
    if (pris.has(e)) continue;
    if (!trouverNom(e.texte, heros)) {
      const h = Math.max(1, e.y1 - e.y0);
      const dessous = base.find((f) => f !== e && !pris.has(f) && f.y0 > e.y0 && f.y0 - e.y1 < h * 0.9
        && Math.abs((f.x0 + f.x1) / 2 - (e.x0 + e.x1) / 2) < Math.max(e.x1 - e.x0, f.x1 - f.x0));
      if (dessous && trouverNom(`${e.texte} ${dessous.texte}`, heros) && !trouverNom(dessous.texte, heros)) {
        pris.add(dessous);
        tries.push({ texte: `${e.texte} ${dessous.texte}`, x0: Math.min(e.x0, dessous.x0), y0: e.y0, x1: Math.max(e.x1, dessous.x1), y1: dessous.y1 });
        continue;
      }
    }
    tries.push(e);
  }
  const ancres = tries.filter((e) => trouverNom(e.texte, catalogue.heros || []));
  if (!ancres.length) return tries.map((e) => e.texte).join("\n");
  const rattaches = new Map(ancres.map((a) => [a, []]));
  const libres = [];
  for (const e of tries) {
    if (rattaches.has(e)) continue;
    const cx = (e.x0 + e.x1) / 2;
    let meilleure = null, ecart = Infinity;
    for (const a of ancres) {
      const largeur = a.x1 - a.x0, hauteur = Math.max(1, a.y1 - a.y0);
      const memeColonne = cx >= a.x0 - largeur * 0.6 && cx <= a.x1 + largeur * 0.6;
      const dy = e.y0 - a.y0;
      if (memeColonne && dy >= 0 && dy <= hauteur * 8 && dy < ecart) { meilleure = a; ecart = dy; }
    }
    if (meilleure) rattaches.get(meilleure).push(e); else libres.push(e);
  }
  const blocs = ancres.map((a) => [a, ...rattaches.get(a)].map((e) => e.texte).join("\n"));
  return [...libres.filter((e) => e.y0 < ancres[0].y0).map((e) => e.texte), ...blocs,
    ...libres.filter((e) => e.y0 >= ancres[0].y0).map((e) => e.texte)].join("\n");
}

/** Quantité lue : « 12,500 », « 12 500 », « 12.5K », « 1,2 M », « 3B ». */
export function lireQuantite(t) {
  const m = String(t).replace(/[\u00a0\u202f]/g, " ").match(/(\d{1,3}(?:[ ,.]\d{3})+|\d+(?:[.,]\d+)?)\s*([kmb])?\b/i);
  if (!m) return null;
  let brut = m[1], mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || "").toLowerCase()] || 1;
  if (/^\d{1,3}([ ,.]\d{3})+$/.test(brut) && !(mult > 1 && /[.,]\d{1,2}$/.test(brut))) brut = brut.replace(/[ ,.]/g, "");
  else brut = brut.replace(",", ".").replace(/ /g, "");
  const v = Number(brut) * mult;
  return Number.isFinite(v) ? Math.round(v) : null;
}

const apres = (ligne, re) => {
  const m = ligne.match(re);
  return m ? ligne.slice(m.index + m[0].length).replace(/^\s*[:#=\-–]\s*/, "").trim() : null;
};

/**
 * Infos du compte lisibles sur les écrans de profil, d'accueil et de guilde :
 * pseudo, ID, niveau, guilde, puissance, VIP, étape, Porte, Lit, Room Research
 * et quantités des ressources. Ne renvoie que ce qui a été lu.
 */
export function lireProfil(texte, ressources = []) {
  const lignes = String(texte || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const p = {};
  const stock = {};
  lignes.forEach((l, i) => {
    const n = normaliser(l);
    const suivante = lignes[i + 1] || "";
    const valeurOuSuivante = (re) => { const v = apres(l, re); return v || (re.test(l) && suivante) || null; };
    let m;
    if (p.idJoueur == null && (m = n.match(/\b(?:id|uid|player id|id joueur)\s*[:#.]?\s*(\d{5,12})\b/))) p.idJoueur = m[1];
    if (p.guilde == null && /\b(guild|guilde|clan)\b/.test(n) && !/\b(guild shop|boutique de guilde|join|rejoindre|create|creer)\b/.test(n)) {
      const v = valeurOuSuivante(/\b(?:guild|guilde|clan)\b(?:\s*name|\s*nom)?/i);
      if (v && /\p{L}/u.test(v) && v.length <= 30) p.guilde = v;
    }
    if (p.pseudo == null && /\b(name|nom|pseudo|nickname|player|joueur)\s*[:\-]/.test(n)) {
      const v = apres(l, /\b(?:name|nom|pseudo|nickname|player|joueur)\b/i);
      if (v && v.length <= 24) p.pseudo = v;
    }
    if (p.puissance == null && (m = n.match(/\b(?:combat power|power|puissance|force|cp)\s*[:.]?\s*([\d][\d ,.]*\s*[kmb]?)/))) p.puissance = lireQuantite(m[1]);
    else if (p.puissance == null && /^(?:combat power|power|puissance|force|cp)\s*[:.]?$/.test(n) && lireQuantite(suivante) !== null && !/[a-z]{3,}/.test(normaliser(suivante))) p.puissance = lireQuantite(suivante);
    if (p.vip == null && (m = n.match(/\bvip\s*[:.]?\s*(\d{1,2})\b/))) p.vip = Number(m[1]);
    if (p.etape == null && (m = n.match(/\b(?:main stage|stage|etape|chapter|chapitre|level|niveau)\s*[:.]?\s*(\d{1,3}\s*-\s*\d{1,3})\b/))) p.etape = m[1].replace(/\s/g, "");
    else if (p.etape == null && (m = n.match(/\b(?:main stage|stage|etape)\s*[:.]?\s*(\d{1,4})\b/))) p.etape = m[1];
    if (p.porte == null && (m = n.match(/\b(?:door|porte)\b\s*(?:lv|lvl|level|niv|niveau|nv)?\s*[.:]?\s*(\d{1,3})\b/))) p.porte = Number(m[1]);
    if (p.lit == null && (m = n.match(/\b(?:bed|lit)\b\s*(?:lv|lvl|level|niv|niveau|nv)?\s*[.:]?\s*(\d{1,3})\b/))) p.lit = Number(m[1]);
    if (p.recherche == null && (m = n.match(/\b(?:room research|research|recherche)\b\s*(?:lv|lvl|level|niv|niveau|nv)?\s*[.:]?\s*(\d{1,3})\b/))) p.recherche = Number(m[1]);
    if (p.niveau == null && (m = n.match(/\b(?:player level|account level|niveau du joueur|niveau joueur|niveau du compte)\s*[.:]?\s*(\d{1,3})\b/))) p.niveau = Number(m[1]);
    for (const r of ressources) {
      if (stock[r.id] != null) continue;
      const mot = r.motsOcr.find((mo) => new RegExp(`(^|[^a-z])${mo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(n));
      if (!mot) continue;
      // « or » est aussi un mot courant : ligne courte exigée.
      if (mot.length <= 3 && n.split(/\s+/).length > 4) continue;
      const reste = n.replace(mot, " ");
      const q = lireQuantite(reste) ?? (lireQuantite(suivante) !== null && !/[a-z]{4,}/.test(normaliser(suivante)) ? lireQuantite(suivante) : null);
      if (q !== null) stock[r.id] = q;
    }
  });
  // Premier « Lv. N » d'un écran de profil sans nom de héros autour : niveau du joueur.
  if (p.niveau == null && p.pseudo != null) {
    const i = lignes.findIndex((l) => p.pseudo && l.includes(p.pseudo));
    const zone = lignes.slice(Math.max(0, i - 1), i + 3).join(" ");
    const v = lireNiveau(zone);
    if (v !== null) p.niveau = v;
  }
  return { profil: p, stock };
}
