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
      meilleur = { id: c.id, nom: c.nomOfficiel || c.nom, sim: Math.round(sim * 100) / 100, sorte: c.sorte };
    }
  }
  return meilleur;
}

const nombre = (m) => (m ? Number(m[1]) : null);

/** Niveau : « Lv. 45 », « LV45 », « Level 45 », « Niv. 45 », « Niveau 45 », « Nv 45 ». */
export function lireNiveau(t) {
  const n = normaliser(t).replace(/(lv)[?'’`]/g, "$1.");
  return nombre(n.match(/\b(?:lv|lvl|level|niv|niveau|nv)\s*[.:]?\s*(\d{1,3})\b/)) ?? nombre(n.match(/(?:^|[^\d])(\d{1,3})\s*lv\b/));
}

/** « 0/50 », « 0/1 » sous une carte : élément pas encore obtenu. */
export const lireVerrou = (t) => /(^|[^\d])0\s*\/\s*\d{1,3}\b/.test(String(t));

/** Toutes les fiches reconnaissables sur une capture, avec leur sorte. */
export function ancresDu(catalogue) {
  return [
    ...(catalogue.heros || []).map((x) => ({ ...x, sorte: "heros" })),
    ...(catalogue.artefacts || []).filter((x) => !x.generique).map((x) => ({ ...x, sorte: "artefacts" })),
    ...(catalogue.pieges || []).map((x) => ({ ...x, sorte: "pieges" })),
    ...(catalogue.betes || []).map((x) => ({ ...x, sorte: "betes" })),
  ];
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
  [/\b(cr|mythic|mythique|mythical)\b/, "CR"],
  [/\b(ur|legendary|legendaire|legend)\b/, "UR"],
  [/\b(ssr|epic|epique)\b/, "SSR"],
  [/\b(r|rare|common|commun|commune)\b/, "R"],
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
  const brutes = String(texte || "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 1);
  const heros = catalogue.heros || [];
  const ancres = ancresDu(catalogue);
  const autres = ancres.filter((a) => a.sorte === "pieges" || a.sorte === "betes");
  // Recolle un nom de héros coupé sur deux lignes consécutives.
  const lignes = [];
  for (let i = 0; i < brutes.length; i++) {
    const l = brutes[i], suiv = brutes[i + 1];
    if (suiv && !trouverNom(l, ancres) && !trouverNom(suiv, ancres) && /^\p{L}[\p{L}' .-]*$/u.test(l) && /^\p{L}[\p{L}' .-]*$/u.test(suiv)
      && trouverNom(`${l} ${suiv}`, ancres)?.sim >= 0.9) { lignes.push(`${l} ${suiv}`); i++; }
    else lignes.push(l);
  }
  const artefactsNommes = (catalogue.artefacts || []).filter((a) => !a.generique);
  const skinsConnus = catalogue.skins || [];

  // 1. Repère la ligne de chaque nom de héros.
  const reperes = [];
  const toutes = [];
  lignes.forEach((l, i) => {
    const a = trouverNom(l, ancres);
    if (!a) return;
    toutes.push({ i, a });
    if (a.sorte === "heros") reperes.push({ i, h: a });
  });

  // 2. Lit les valeurs autour de chaque nom, sans déborder sur le héros suivant.
  const parHero = new Map();
  reperes.forEach(({ i, h }, k) => {
    // Les valeurs sont sous le nom ; la ligne du dessus ne sert que pour le
    // premier héros (elle appartient sinon au héros précédent).
    const suivante = toutes.find((t) => t.i > i);
    const fin = Math.min(lignes.length - 1, i + 6, suivante ? suivante.i - 1 : Infinity);
    const dessus = k === 0 && i > 0 ? [lignes[i - 1]] : [];
    const zone = [lignes[i], ...lignes.slice(i + 1, fin + 1), ...dessus];
    const lire = (fn) => { for (const l of zone) { const v = fn(l); if (v !== null) return v; } return null; };
    // Le chiffre seul dans le losange vert d'une carte de héros : sa promotion.
    // Deux passes de lecture peuvent donner « Lv.6 » et « Lv.67 » : on garde le plus complet.
    const niveaux = zone.map(lireNiveau).filter((v) => v !== null);
    const prop = { heroId: h.id, nom: h.nom, lu: lignes[i], sim: h.sim, niveau: niveaux.length ? Math.max(...niveaux) : null, promotion: lire(lirePromotion), etoiles: lire(lireEtoiles) };
    const ancien = parHero.get(h.id);
    if (!ancien) parHero.set(h.id, prop);
    else for (const c of ["niveau", "promotion", "etoiles"]) if (ancien[c] === null && prop[c] !== null) ancien[c] = prop[c];
  });

  // 3. Artefacts : nom connu du catalogue, ou ligne avec une statistique et une rareté proches.
  const artefacts = [];
  const lignesHeros = new Set(reperes.map((r) => r.i));
  lignes.forEach((l, i) => {
    if (lignesHeros.has(i) || MOTS_SKIN.test(normaliser(l)) || trouverNom(l, autres)) return;
    const voisines = [l, lignes[i + 1] || "", lignes[i + 2] || ""];
    const connu = trouverNom(l, artefactsNommes, 0.85);
    if (connu) {
      const fiche = artefactsNommes.find((a) => a.id === connu.id);
      artefacts.push({ ref: connu.id, nom: fiche.nom, stat: fiche.stat, set: fiche.set || "", etoiles: null, rarete: fiche.set ? fiche.rarete : voisines.map(lireRarete).find(Boolean) || fiche.rarete,
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
    const sansRarete = nom.replace(/\b(mythic|mythique|legendary|l[ée]gendaire|epic|[ée]pique|rare|common|commun|ssr|ur|cr)\b/gi, "");
    if (rarete && stat && !estValeur && /\p{L}{3,}/u.test(sansRarete) && !lireNiveau(l) && !lirePromotion(l) && lireEtoiles(l) === null) {
      artefacts.push({ ref: null, nom, stat, rarete, niveau: voisines.map(lireNiveauArtefact).find((v) => v !== null) ?? 0, lu: l });
    }
  });

  // 3 bis. Pièges et bêtes : niveau (« 30Lv », « Lv.27 ») et verrou (« 0/50 »).
  const parAutre = new Map();
  toutes.filter((t) => t.a.sorte === "pieges" || t.a.sorte === "betes").forEach(({ i, a }) => {
    const suivante = toutes.find((t) => t.i > i);
    const zone = lignes.slice(i + 1, Math.min(lignes.length, i + 7, suivante ? suivante.i : Infinity));
    const prop = parAutre.get(a.id) || { sorte: a.sorte, id: a.id, nom: a.nom, lu: lignes[i], niveau: null, etoiles: null, verrouille: false, garder: true };
    for (const l of zone) {
      const v = lireNiveau(l);
      if (v !== null && (prop.niveau === null || v > prop.niveau)) prop.niveau = v;
      if (lireVerrou(l)) prop.verrouille = true;
    }
    parAutre.set(a.id, prop);
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
    artefacts: dedoublonner(artefacts, (a) => (a.ref ? a.ref : `${compact(a.nom)}|${a.niveau}`)),
    skins: dedoublonner(skins, (s) => compact(s.nom)),
    pieges: [...parAutre.values()].filter((x) => x.sorte === "pieges"),
    betes: [...parAutre.values()].filter((x) => x.sorte === "betes"),
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
  const ancresCat = ancresDu(catalogue);
  // Un nom coupé sur deux lignes dans une carte (« Ghost » / « Captain ») est recollé.
  const base = [...elements].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const pris = new Set();
  const tries = [];
  for (const e of base) {
    if (pris.has(e)) continue;
    if (!trouverNom(e.texte, ancresCat)) {
      const h = Math.max(1, e.y1 - e.y0);
      const dessous = base.find((f) => f !== e && !pris.has(f) && f.y0 > e.y0 && f.y0 - e.y1 < h * 0.9
        && Math.abs((f.x0 + f.x1) / 2 - (e.x0 + e.x1) / 2) < Math.max(e.x1 - e.x0, f.x1 - f.x0));
      if (dessous && trouverNom(`${e.texte} ${dessous.texte}`, ancresCat) && !trouverNom(dessous.texte, ancresCat)) {
        pris.add(dessous);
        tries.push({ texte: `${e.texte} ${dessous.texte}`, x0: Math.min(e.x0, dessous.x0), y0: e.y0, x1: Math.max(e.x1, dessous.x1), y1: dessous.y1 });
        continue;
      }
    }
    tries.push(e);
  }
  const ancres = tries.filter((e) => trouverNom(e.texte, ancresCat));
  if (!ancres.length) return tries.map((e) => e.texte).join("\n");
  const centre = (e) => (e.x0 + e.x1) / 2;
  // Écart horizontal typique entre deux cartes voisines : la taille d'une carte.
  const ecarts = [];
  // (les doublons d'une même ligne, lus par les deux passes, sont ignorés)
  for (const a of ancres) for (const b of ancres) if (b !== a && Math.abs(b.y0 - a.y0) < 40 && centre(b) - centre(a) > Math.max(60, (a.x1 - a.x0) * 0.5)) ecarts.push(centre(b) - centre(a));
  const pas = ecarts.length ? Math.min(...ecarts) : 400;
  const memeColonne = (e, a) => Math.abs(centre(e) - centre(a)) < pas * 0.5;
  // Sens de lecture : dans le jeu, « Lv.67 » est au-dessus du nom ; ailleurs, en dessous.
  let dessus = 0, dessous = 0;
  for (const e of tries) {
    if (ancres.includes(e) || lireNiveau(e.texte) === null) continue;
    let haut = Infinity, bas = Infinity;
    for (const a of ancres) if (memeColonne(e, a)) { const dy = a.y0 - e.y0; if (dy > 0) bas = Math.min(bas, dy); else haut = Math.min(haut, -dy); }
    if (bas < haut) dessus++; else if (haut < Infinity) dessous++;
  }
  const valeursAuDessus = dessus > dessous;
  const rattaches = new Map(ancres.map((a) => [a, []]));
  const libres = [];
  for (const e of tries) {
    if (rattaches.has(e)) continue;
    let meilleure = null, ecart = Infinity;
    for (const a of ancres) {
      if (!memeColonne(e, a)) continue;
      const hauteur = Math.max(1, a.y1 - a.y0);
      const dy = valeursAuDessus ? a.y0 - e.y0 : e.y0 - a.y0;
      const limite = valeursAuDessus ? pas * 1.6 : hauteur * 8;
      if (dy >= 0 && dy <= limite && dy < ecart) { meilleure = a; ecart = dy; }
    }
    if (meilleure) rattaches.get(meilleure).push(e); else libres.push(e);
  }
  // Du plus proche au plus lointain du nom : les valeurs utiles d'abord, le décor ensuite.
  const blocs = ancres.map((a) => [a, ...rattaches.get(a).sort((x, y) => Math.abs(x.y0 - a.y0) - Math.abs(y.y0 - a.y0))].map((e) => e.texte).join("\n"));
  return [...libres.filter((e) => e.y0 < ancres[0].y0).map((e) => e.texte), ...blocs,
    ...libres.filter((e) => e.y0 >= ancres[0].y0).map((e) => e.texte)].join("\n");
}

/**
 * Écrans à chiffres sans libellé, reconnus à leur mise en page :
 * - écran principal (« Stage 176 ») : barre du haut = Diamants, Or, Stamina ;
 *   dessous, la puissance (1.6M) et le niveau du joueur à gauche ;
 * - écran Gear : colonne de ressources en haut à gauche = Leather, Or, Soul Flame.
 * `dims` = { largeur, hauteur } de l'image lue.
 */
export function lireEcrans(elements, dims) {
  const p = {}, stock = {};
  if (!elements?.length || !dims?.hauteur) return { profil: p, stock };
  const W = dims.largeur, H = dims.hauteur;
  const tout = elements.map((e) => e.texte).join(" ");
  const n = normaliser(tout);
  const nombres = (e) => [...String(e.texte).matchAll(/(\d+(?:[.,]\d+)?\s*[kmb]?)(?:\s*\/\s*\d+)?/gi)].map((m) => ({ brut: m[0], q: lireQuantite(m[1]), x: e.x0 + (m.index / Math.max(1, e.texte.length)) * (e.x1 - e.x0), y: e.y0 }));
  // Les deux passes de lecture peuvent rendre le même nombre deux fois : un seul par position.
  const uniques = (liste) => liste.filter((x, i) => !liste.slice(0, i).some((y) => y.q === x.q && Math.abs(y.x - x.x) < W * 0.08 && Math.abs(y.y - x.y) < H * 0.02));
  if (/\bstage\s*\d+/.test(n) && /(start challenge|codex|moments|mail|friend|afk|privileges)/.test(n)) {
    const m = n.match(/\bstage\s*(\d{1,4})/); if (m) p.etape = m[1];
    const haut = uniques(elements.filter((e) => e.y0 < H * 0.075 && e.x0 > W * 0.15).flatMap(nombres).filter((x) => x.q !== null && /\d\d|[kmb]/i.test(x.brut))).sort((a, b) => a.x - b.x);
    if (haut[0]) stock.diamants = haut[0].q;
    if (haut[1]) stock.or = haut[1].q;
    if (haut[2]) stock.endurance = haut[2].q;
    const puiss = elements.filter((e) => e.y0 >= H * 0.07 && e.y0 < H * 0.12 && e.x0 < W * 0.5).flatMap(nombres).find((x) => /[kmb]/i.test(x.brut));
    if (puiss) p.puissance = puiss.q;
    const niv = elements.find((e) => e.x0 < W * 0.08 && e.y0 > H * 0.07 && e.y0 < H * 0.13 && /^\d{1,3}$/.test(e.texte.trim()));
    if (niv) p.niveau = Number(niv.texte.trim());
  }
  if (/\benhance level\b/.test(n)) {
    const m = n.match(/enhance level\s*:?\s*\+?(\d{1,4})/); if (m) p.equipementNiveau = Number(m[1]);
    const t = n.match(/tier\s*(\d{1,2})\b/); if (t) p.palierEquipement = Number(t[1]);
    const ordre = uniques(elements.filter((e) => e.x0 < W * 0.25 && e.y0 < H * 0.2).flatMap((e) => nombres(e).slice(-1)).filter((x) => x.q !== null)).sort((a, b) => a.y - b.y);
    if (ordre.length >= 3) { stock.cuir = ordre[0].q; stock.or = ordre[1].q; stock.flammeAme = ordre[2].q; }
  }
  const vault = n.match(/curio vault\s*[:.]?\s*(\d{1,4})/); if (vault) p.coffreCurios = Number(vault[1]);
  const serveur = n.match(/online_(\w+?)_(\w+?)_/); if (serveur) p.serveur = `${serveur[2]} (${serveur[1]})`;
  return { profil: p, stock };
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
  // Écran avec des conditions de déblocage (« Clear Main Stage 220 ») : ce n'est pas l'étape du joueur.
  const conditions = /(unlock|condition|debloqu)/.test(normaliser(texte));
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
    if (conditions) { /* étape ignorée */ }
    else if (p.etape == null && (m = n.match(/\b(?:main stage|stage|etape|chapter|chapitre|level|niveau)\s*[:.]?\s*(\d{1,3}\s*-\s*\d{1,3})\b/))) p.etape = m[1].replace(/\s/g, "");
    else if (p.etape == null && !/(clear|condition|unlock|debloqu)/.test(`${normaliser(lignes[i - 1] || "")} ${n}`) && (m = n.match(/\b(?:main stage|stage|etape)\s*[:.]?\s*(\d{1,4})\b/))) p.etape = m[1];
    if (p.porte == null && (m = n.match(/\b(?:door|porte)\b\s*(?:lv|lvl|level|niv|niveau|nv)?\s*[.:]?\s*(\d{1,3})\b/))) p.porte = Number(m[1]);
    if (p.lit == null && (m = n.match(/\b(?:bed|lit)\b\s*(?:lv|lvl|level|niv|niveau|nv)?\s*[.:]?\s*(\d{1,3})\b/))) p.lit = Number(m[1]);
    if (p.recherche == null && (m = n.match(/\b(?:room research|research|recherche)\b\s*(?:lv|lvl|level|niv|niveau|nv)?\s*[.:]?\s*(\d{1,3})\b/))) p.recherche = Number(m[1]);
    if (p.niveau == null && (m = n.match(/\b(?:player level|account level|niveau du joueur|niveau joueur|niveau du compte)\s*[.:]?\s*(\d{1,3})\b/))) p.niveau = Number(m[1]);
    for (const r of ressources) {
      if (stock[r.id] != null) continue;
      const mot = r.motsOcr.find((mo) => new RegExp(`(^|[^a-z])${mo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(n));
      if (!mot) continue;
      // « or » est aussi un mot courant : seulement « Or 1 234 » ou « Or : 1 234 ».
      if (mot.length <= 3 && !new RegExp(`^\\W*${mot}\\W*(\\d|$)`).test(n)) continue;
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
