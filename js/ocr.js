// Lecture du texte des captures, entièrement sur l'appareil (Tesseract.js,
// anglais + français). Le moteur (~8 Mo) n'est chargé qu'à la première
// utilisation, puis reste en cache : la lecture marche ensuite hors ligne.

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

async function obtenirMoteur(progression) {
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

/**
 * Agrandit l'image et la passe en noir sur blanc. Sur fond sombre, ne garde
 * que le texte blanc : les cartes colorées du jeu ne gênent plus la lecture.
 */
async function preparer(fichier, mode = "clair") {
  const bitmap = await createImageBitmap(fichier);
  const echelle = Math.min(3, Math.max(1, 1800 / bitmap.width));
  const w = Math.round(bitmap.width * echelle), h = Math.round(bitmap.height * echelle);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  let somme = 0;
  for (let i = 0; i < d.length; i += 4) somme += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const sombre = somme / (d.length / 4) < 128;
  for (let i = 0; i < d.length; i += 4) {
    let g;
    if (sombre) {
      // Interface sombre aux cartes colorées, textes blancs ou jaunes. Le canal
      // médian reste haut pour le blanc et le jaune, bas pour un rouge ou un
      // orange vif : le texte ressort en noir sur fond clair.
      if (mode === "couleur") {
        // Textes de couleur vive (noms orange, rouges, violets) : on garde la
        // luminosité du canal le plus fort, le fond sombre devient blanc.
        const max = Math.max(d[i], d[i + 1], d[i + 2]);
        g = 255 - (max - 150) * 3;
      } else {
        const median = [d[i], d[i + 1], d[i + 2]].sort((x, y) => x - y)[1];
        g = 255 - (median - 120) * 3.5; // seuil doux : fond coloré → blanc, texte clair → noir
      }
    } else {
      g = ((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) - 128) * 1.8 + 128;
    }
    g = Math.max(0, Math.min(255, g));
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Lit une liste de fichiers image ; renvoie le texte de chacun et ses lignes positionnées. */
export async function lireCaptures(fichiers, progression) {
  const m = await obtenirMoteur(progression);
  const textes = [];
  for (let i = 0; i < fichiers.length; i++) {
    progression?.({ etape: "image", index: i + 1, total: fichiers.length });
    // Deux lectures : textes clairs (blanc, jaune), puis textes de couleur vive.
    const elements = [];
    let texte = "", largeur = 0, hauteur = 0;
    for (const mode of ["clair", "couleur"]) {
      const canvas = await preparer(fichiers[i], mode);
      largeur = canvas.width; hauteur = canvas.height;
      const { data } = await m.recognize(canvas);
      texte += `${data.text || ""}\n`;
      for (const l of data.lines || []) {
        const t = l.text.trim();
        if (!t || l.confidence < 35) continue;
        // Même texte au même endroit lu par les deux passes : on ne le garde qu'une fois.
        if (elements.some((e) => Math.abs(e.y0 - l.bbox.y0) < 20 && Math.abs(e.x0 - l.bbox.x0) < 40 && e.texte === t)) continue;
        elements.push({ texte: t, ...l.bbox, confiance: l.confidence });
      }
      canvas.width = canvas.height = 0; // libère l'image
    }
    textes.push({ nom: fichiers[i].name, texte, elements, largeur, hauteur });
  }
  return textes;
}
