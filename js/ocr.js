// Lecture du texte des captures, entièrement sur l'appareil (Tesseract.js,
// anglais + français). Le moteur (~8 Mo) n'est chargé qu'à la première
// utilisation, puis reste en cache : la lecture marche ensuite hors ligne.

import { ancresDu, trouverNom } from "./capture.js";

const BASE = new URL("vendor/tesseract/", document.baseURI).href;
let moteur = null;

function chargerScript(src) {
  return new Promise((ok, ko) => {
    if (window.Tesseract) return ok();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => ok();
    s.onerror = () => ko(new Error("Moteur de lecture introuvable"));
    document.head.appendChild(s);
  });
}

export async function obtenirMoteur(progression) {
  if (moteur) return moteur;
  await chargerScript(`${BASE}tesseract.min.js`);
  moteur = await window.Tesseract.createWorker(["eng", "fra"], 1, {
    workerPath: `${BASE}worker.min.js`,
    corePath: `${BASE}core/`,
    langPath: `${BASE}lang`,
    gzip: true,
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === "recognizing text") progression?.({ etape: "lecture", part: m.progress });
      else progression?.({ etape: "chargement", part: m.progress ?? 0 });
    },
  }).catch((e) => { moteur = null; throw e; });
  // Le jeu affiche des blocs de texte dispersés : mode « texte épars ».
  await moteur.setParameters({ tessedit_pageseg_mode: "11", preserve_interword_spaces: "1" });
  return moteur;
}

/** Image agrandie à ~1800 px de large, en couleurs (sert aux deux passes et aux étoiles). */
export async function toile(fichier) {
  const bitmap = await createImageBitmap(fichier);
  const echelle = Math.min(3, Math.max(1, 1800 / bitmap.width));
  const w = Math.round(bitmap.width * echelle), h = Math.round(bitmap.height * echelle);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas;
}

/**
 * Passe l'image en noir sur blanc. Sur fond sombre : mode « clair » (textes
 * blancs ou jaunes) ou « couleur » (noms orange, rouges, violets).
 */
function preparer(source, mode = "clair", zone = null, agrandir = 1) {
  const [sx, sy, sw, sh] = zone || [0, 0, source.width, source.height];
  const w = Math.max(1, Math.round(sw * agrandir)), h = Math.max(1, Math.round(sh * agrandir));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  let somme = 0;
  for (let i = 0; i < d.length; i += 4) somme += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const sombre = somme / (d.length / 4) < 128;
  for (let i = 0; i < d.length; i += 4) {
    let g;
    if (sombre && mode === "couleur") {
      g = 255 - (Math.max(d[i], d[i + 1], d[i + 2]) - 150) * 3;
    } else if (sombre) {
      const median = [d[i], d[i + 1], d[i + 2]].sort((x, y) => x - y)[1];
      g = 255 - (median - 120) * 3.5;
    } else {
      g = ((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) - 128) * 1.8 + 128;
    }
    g = Math.max(0, Math.min(255, g));
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

const dore = (r, g, b) => r > 200 && g > 160 && b < 120 && r - b > 110;

/**
 * Compte les étoiles dorées sous l'icône d'une carte (Curio Codex) : sur
 * chaque ligne de pixels de la bande, on compte les segments dorés séparés ;
 * le maximum est le nombre d'étoiles.
 */
export function compterEtoiles(canvas, e) {
  const W = canvas.width;
  const cx = (e.x0 + e.x1) / 2;
  const x0 = Math.max(0, Math.round(cx - W * 0.095)), x1 = Math.min(W, Math.round(cx + W * 0.095));
  const y0 = Math.max(0, Math.round(e.y0 - W * 0.11)), y1 = Math.max(y0 + 1, Math.round(e.y0 - W * 0.008));
  const d = canvas.getContext("2d", { willReadFrequently: true }).getImageData(x0, y0, x1 - x0, y1 - y0).data;
  const larg = x1 - x0, minSeg = W * 0.007, trou = W * 0.004;
  let max = 0;
  for (let y = 0; y < y1 - y0; y += 2) {
    const segments = [];
    for (let x = 0; x < larg; x++) {
      const i = (y * larg + x) * 4;
      if (!dore(d[i], d[i + 1], d[i + 2])) continue;
      const dernier = segments[segments.length - 1];
      if (dernier && x - dernier[1] <= trou) dernier[1] = x; else segments.push([x, x]);
    }
    max = Math.max(max, segments.filter(([a, b]) => b - a >= minSeg).length);
  }
  return Math.min(max, 10);
}

/**
 * Relit en gros plan le niveau d'une carte : « 30Lv. » en haut à gauche d'un
 * piège, « Lv.10 » en haut à droite d'une bête.
 */
export async function relireNiveau(m, canvas, e, sorte, debug) {
  const W = canvas.width;
  const cx = (e.x0 + e.x1) / 2;
  const zone = sorte === "betes"
    ? [cx - W * 0.005, e.y0 - W * 0.24, W * 0.125, W * 0.07]
    : [cx - W * 0.12, e.y0 - W * 0.27, W * 0.24, W * 0.14];
  const petit = preparer(canvas, "clair", zone.map((v, i) => (i < 2 ? Math.max(0, v) : v)), 3);
  await m.setParameters({ tessedit_pageseg_mode: sorte === "betes" ? "7" : "6", tessedit_char_whitelist: "Lv.0123456789 " });
  const { data } = await m.recognize(petit);
  await m.setParameters({ tessedit_pageseg_mode: "11", tessedit_char_whitelist: "" });
  petit.width = petit.height = 0;
  // « 1v10 » : le L de « Lv » est souvent lu comme un 1.
  const t = (data.text || "").replace(/\s+/g, " ").trim().replace(/(^|\s)[1lI|]v\.?/g, "$1Lv.");
  if (debug) debug.push(t);
  const v = sorte === "betes"
    ? t.match(/lv\.?\s*(\d{1,3})/i) || t.match(/^\D*(\d{1,3})\D*$/)
    : t.match(/(\d{1,3})\s*lv/i) || t.match(/lv\.?\s*(\d{1,3})/i);
  return v ? Number(v[1]) : null;
}

/**
 * Lit une liste de fichiers image ; renvoie le texte de chacun et ses lignes
 * positionnées. Avec le catalogue, ajoute les étoiles des curios et relit les
 * niveaux des bêtes et des pièges.
 */
export async function lireCaptures(fichiers, progression, catalogue = null) {
  const m = await obtenirMoteur(progression);
  const textes = [];
  const ancres = catalogue ? ancresDu(catalogue) : [];
  for (let i = 0; i < fichiers.length; i++) {
    progression?.({ etape: "image", index: i + 1, total: fichiers.length });
    const couleur = await toile(fichiers[i]);
    const elements = [];
    let texte = "";
    for (const mode of ["clair", "couleur"]) {
      const canvas = preparer(couleur, mode);
      const { data } = await m.recognize(canvas);
      texte += `${data.text || ""}\n`;
      for (const l of data.lines || []) {
        const t = l.text.trim();
        if (!t || l.confidence < 35) continue;
        // Même texte au même endroit lu par les deux passes : on ne le garde qu'une fois.
        if (elements.some((e) => Math.abs(e.y0 - l.bbox.y0) < 20 && Math.abs(e.x0 - l.bbox.x0) < 40 && e.texte === t)) continue;
        elements.push({ texte: t, ...l.bbox, confiance: l.confidence });
      }
      canvas.width = canvas.height = 0;
    }
    if (ancres.length) {
      const vus = new Set();
      for (const e of [...elements]) {
        let a = trouverNom(e.texte, ancres);
        if (!a) {
          // Nom sur deux lignes (« Psycho » / « Headphones ») : on le recolle.
          const h = Math.max(1, e.y1 - e.y0);
          const dessous = elements.find((f) => f !== e && f.y0 > e.y0 && f.y0 - e.y1 < h * 0.9 && Math.abs((f.x0 + f.x1) / 2 - (e.x0 + e.x1) / 2) < Math.max(e.x1 - e.x0, f.x1 - f.x0));
          a = dessous && !trouverNom(dessous.texte, ancres) ? trouverNom(`${e.texte} ${dessous.texte}`, ancres) : null;
          if (!a || a.sorte !== "artefacts") continue;
        }
        if (a.sorte === "artefacts" && (catalogue.artefacts.find((x) => x.id === a.id) || {}).set) {
          const n = compterEtoiles(couleur, e);
          if (n) e.texte = `${e.texte} ${"★".repeat(n)}`;
        } else if ((a.sorte === "betes" || a.sorte === "pieges") && !vus.has(a.id) && e.y0 > couleur.height * 0.3) {
          vus.add(a.id);
          const niv = await relireNiveau(m, couleur, e, a.sorte).catch(() => null);
          if (niv) e.texte = `${e.texte} Lv.${niv}`; else vus.delete(a.id);
        }
      }
    }
    textes.push({ nom: fichiers[i].name, texte, elements, largeur: couleur.width, hauteur: couleur.height });
    couleur.width = couleur.height = 0; // l'image n'est pas conservée
  }
  return textes;
}

/**
 * Écran d'équipe (« Main ») : les cartes n'ont pas de nom, seulement « Lv.68 ».
 * Renvoie, de gauche à droite, une vignette de chaque carte (gardée en mémoire
 * le temps de la saisie, jamais enregistrée) et le niveau lu.
 */
export async function lireEquipe(fichier, progression) {
  const m = await obtenirMoteur(progression);
  const couleur = await toile(fichier);
  const W = couleur.width, H = couleur.height;
  const canvas = preparer(couleur, "clair");
  const { data } = await m.recognize(canvas);
  canvas.width = canvas.height = 0;
  const niv = (t) => { const x = String(t).replace(/(lv)[?'’`]/gi, "$1.").match(/lv\.?\s*(\d{1,3})/i); return x ? Number(x[1]) : null; };
  // Repère la rangée de l'équipe : les « Lv.68 » lus en haut de l'écran.
  const ys = (data.lines || []).filter((l) => l.bbox.y0 < H * 0.3 && (niv(l.text) !== null || /\b\d{1,2}[.,]\d{2}\b/.test(l.text))).map((l) => l.bbox.y0).sort((x, y) => x - y);
  if (!ys.length) { couleur.width = couleur.height = 0; return []; }
  const y = ys[Math.floor(ys.length / 2)];
  // Niveaux déjà lus par la lecture d'ensemble, rattachés à leur carte.
  const lus = (data.lines || []).filter((l) => l.bbox.y0 < H * 0.3).map((l) => ({ cx: (l.bbox.x0 + l.bbox.x1) / 2, v: niv(l.text) })).filter((x) => x.v !== null && x.v >= 10);
  // 5 cartes de même largeur sur toute la largeur de l'écran (géométrie fixe du jeu).
  const resultat = [];
  await m.setParameters({ tessedit_pageseg_mode: "7", tessedit_char_whitelist: "Lv.0123456789 " });
  for (let k = 0; k < 5; k++) {
    const cx = W * (0.110 + k * 0.1935);
    const zoneNiv = [cx - W * 0.075, y - W * 0.012, W * 0.15, W * 0.05];
    const petit = preparer(couleur, "clair", zoneNiv, 3);
    const { data: d } = await m.recognize(petit);
    petit.width = petit.height = 0;
    const t = (d.text || "").replace(/\s+/g, " ").replace(/(^|\s)[1lI|]v\.?/g, "$1Lv.");
    const n = t.match(/lv\.?\s*(\d{2,3})/i) || t.match(/(\d{2,3})/);
    const [sx, sy, sw, sh] = [Math.max(0, cx - W * 0.09), Math.max(0, y - W * 0.17), W * 0.18, W * 0.22];
    const v = document.createElement("canvas");
    v.width = 120; v.height = Math.round(120 * sh / sw);
    v.getContext("2d").drawImage(couleur, sx, sy, sw, sh, 0, 0, v.width, v.height);
    const deja = lus.find((x) => Math.abs(x.cx - cx) < W * 0.09);
    resultat.push({ vignette: v.toDataURL("image/jpeg", 0.8), niveau: deja ? deja.v : n ? Number(n[1]) : null });
    v.width = v.height = 0;
  }
  await m.setParameters({ tessedit_pageseg_mode: "11", tessedit_char_whitelist: "" });
  // Niveau manquant : celui des autres cartes (une équipe est montée au même niveau), signalé « à vérifier ».
  const connus = resultat.map((r) => r.niveau).filter(Boolean).sort((a, b) => a - b);
  const median = connus.length ? connus[Math.floor(connus.length / 2)] : null;
  for (const r of resultat) {
    if (r.niveau && median && (r.niveau > median * 1.5 || r.niveau < median / 1.5)) r.niveau = null; // « Lv267 » pour 67
    if (!r.niveau && median) { r.niveau = median; r.devine = true; }
  }
  couleur.width = couleur.height = 0;
  return resultat;
}
