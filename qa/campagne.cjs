// Campagne de tests automatisée (cahier : docs/qa/cahier-des-tests.md).
// Usage : node qa/campagne.cjs [nom-de-passe]
// Lance un serveur local, joue chaque cas dans Chromium (émulation iPhone),
// écrit docs/qa/resultats-<passe>.json et des captures dans qa/sortie/.
const { chromium, devices } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const RACINE = path.resolve(__dirname, "..");
const SORTIE = path.join(__dirname, "sortie");
const PASSE = process.argv[2] || "passe";
const PORT = 8790;
const URL = `http://localhost:${PORT}/`;
const CLE = "kkrd-coach:v2";
fs.mkdirSync(SORTIE, { recursive: true });

const resultats = [];
async function cas(id, titre, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    resultats.push({ id, titre, ok: true, detail: detail || "", ms: Date.now() - t0 });
    console.log(`✓ ${id} ${titre}`);
  } catch (e) {
    resultats.push({ id, titre, ok: false, detail: String(e?.message || e).split("\n")[0], ms: Date.now() - t0 });
    console.log(`✗ ${id} ${titre} — ${String(e?.message || e).split("\n")[0]}`);
  }
}
function verifier(cond, msg) { if (!cond) throw new Error(msg); }

async function main() {
  const serveur = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: RACINE, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 900));
  const store = await import(path.join(RACINE, "js/store.js"));
  const navigateur = await chromium.launch();

  // Contexte neuf (stockage vide ou pré-rempli une seule fois).
  async function page(etat, { appareil = devices["iPhone 13"], horsLigne = false } = {}) {
    const ctx = await navigateur.newContext({ ...appareil });
    const p = await ctx.newPage();
    p.erreurs = [];
    p.on("pageerror", (e) => p.erreurs.push(e.message));
    p.on("console", (m) => { if (m.type() === "error") p.erreurs.push(m.text()); });
    if (etat !== undefined) {
      await p.addInitScript(([cle, valeur]) => {
        if (!sessionStorage.getItem("qa-seme")) { sessionStorage.setItem("qa-seme", "1"); if (valeur === null) localStorage.removeItem(cle); else localStorage.setItem(cle, valeur); }
      }, [CLE, etat === null ? null : typeof etat === "string" ? etat : JSON.stringify(etat)]);
    }
    await p.goto(URL);
    p.etat = () => p.evaluate((c) => JSON.parse(localStorage.getItem(c) || "null"), CLE);
    p.fermerFeuille = async () => { if (await p.locator(".feuille").count()) await p.click(".feuille-tete [data-act=fermer]"); };
    p.ctx = ctx;
    return p;
  }
  const avec = (modif) => { const e = store.etatInitial(); modif(e); return e; };
  const possede = (e, ids, extra = {}) => { for (const id of ids) e.roster[id] = { possede: true, niveau: 30, promotion: 3, etoiles: 2, artefacts: [], ...extra }; };

  // Captures de test imitant le jeu.
  const capt = path.join(SORTIE, "captures");
  fs.mkdirSync(capt, { recursive: true });
  {
    const s = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    const base = `<style>body{margin:0;height:844px;background:linear-gradient(#1d2b4a,#0c1224);font:700 17px Arial;color:#fff;padding:24px;box-sizing:border-box;display:grid;gap:14px;align-content:start}.r{display:flex;justify-content:space-between;background:#0006;border-radius:12px;padding:12px 16px}.g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.c{border-radius:12px;padding:10px 6px;display:grid;justify-items:center;gap:4px;font-size:14px}.av{width:56px;height:56px;border-radius:50%;background:#fff3}</style>`;
    await s.setContent(`${base}<div class="r"><span>Player: ArtKnight</span><span>Lv. 37</span></div><div class="r">ID: 48213977</div><div class="r">Guild: Night Owls</div><div class="r"><span>Power</span><span>125,400</span></div><div class="r">VIP 3</div><div class="r">Stage 24-5</div><div class="r"><span>Door Lv. 12</span><span>Bed Lv. 11</span></div><div class="r">Room Research Lv. 6</div><div class="r"><span>Diamonds</span><span>2,450</span></div><div class="r"><span>Gold</span><span>1.2M</span></div><div class="r"><span>Soul Flame</span><span>3,400</span></div><div class="r"><span>Hero Pact</span><span>12</span></div><div class="r"><span>Stamina</span><span>85/120</span></div>`);
    await s.screenshot({ path: path.join(capt, "profil-en.png") });
    await s.setContent(`${base}<div class="r"><span>Joueur : Artémis</span><span>Niv. 22</span></div><div class="r">Guilde : Les Hiboux</div><div class="r">Puissance 98 000</div><div class="r">Étape 18</div><div class="r"><span>Porte niv. 9</span><span>Lit niv. 8</span></div><div class="r"><span>Diamants</span><span>1 200</span></div><div class="r"><span>Or</span><span>45 600</span></div><div class="r"><span>Cuir</span><span>320</span></div>`);
    await s.screenshot({ path: path.join(capt, "profil-fr.png") });
    const c = (n, a, b, col) => `<div class="c" style="background:${col}"><div class="av"></div><b>${n}</b><span>${a}</span><span>${b}</span></div>`;
    await s.setContent(`${base}<h1 style="text-align:center;font-size:22px;margin:0">HEROES</h1><div class="g">${c("Archangel", "Lv. 52", "Rank 6", "#b3263a")}${c("Spiker", "Lv. 48", "5 stars", "#b3263a")}${c("Lazerman", "Lv. 40", "Rank 3", "#c2410c")}${c("Poseidon", "Lv. 37", "4 stars", "#c2410c")}${c("Bright Spirit", "Lv. 33", "Rank 2", "#7c3aed")}${c("Ghost Captain", "Lv. 30", "3 stars", "#7c3aed")}</div>`);
    await s.screenshot({ path: path.join(capt, "heros-en.png") });
    await s.setContent(`${base}<h1 style="text-align:center;font-size:22px;margin:0">FROSTHEALER</h1><div style="display:grid;gap:12px;text-align:center"><div>Niveau 35</div><div>Promotion 3</div><div>4 étoiles</div><div style="background:#0006;border-radius:12px;padding:12px;text-align:left"><div style="color:#ffd60a">Lame ancestrale +7</div><div>Légendaire</div><div>Attaque physique +12 %</div></div><div style="background:#0006;border-radius:12px;padding:12px;text-align:left">Skin : Reine des glaces</div></div>`);
    await s.screenshot({ path: path.join(capt, "heros-fr.png") });
    await s.setContent(`<style>body{margin:0;height:844px;background:radial-gradient(#334,#000)}</style>`);
    await s.screenshot({ path: path.join(capt, "vide.png") });
    await s.close();
  }

  /* ---------- 4.1 Navigation ---------- */
  await cas("NAV-01", "Premier lancement", async () => {
    const p = await page(null);
    verifier(await p.locator("h1.grand-titre").textContent() === "Tableau de bord", "titre absent");
    verifier(await p.getByText("Pour bien démarrer").count() === 1, "bloc d'accueil absent");
    await p.screenshot({ path: path.join(SORTIE, `${PASSE}-accueil-vide.png`) });
    verifier(!p.erreurs.length, `erreurs : ${p.erreurs.join(" | ")}`);
    await p.ctx.close();
  });
  await cas("NAV-02", "Les 5 onglets", async () => {
    const p = await page(null);
    const titres = [];
    for (const o of ["accueil", "heros", "strategie", "boss", "boutique"]) {
      await p.click(`.onglets [data-onglet=${o}]`);
      titres.push(await p.locator("h1.grand-titre").textContent());
      verifier(await p.locator(`.onglets [data-onglet=${o}][aria-current]`).count() === 1, `onglet ${o} non actif`);
      const couleur = await p.locator("h1.grand-titre").evaluate((el) => getComputedStyle(el).color);
      verifier(couleur === "rgb(216, 180, 90)", `titre ${o} pas doré (${couleur})`);
      await p.screenshot({ path: path.join(SORTIE, `${PASSE}-onglet-${o}.png`), fullPage: true });
    }
    verifier(!p.erreurs.length, p.erreurs.join(" | "));
    await p.ctx.close();
    return titres.join(", ");
  });
  await cas("NAV-03", "Petit titre au défilement", async () => {
    const p = await page(avec((e) => possede(e, ["archangel"])));
    await p.click(".onglets [data-onglet=strategie]");
    await p.mouse.wheel(0, 600); await p.waitForTimeout(300);
    verifier(await p.locator("#barre-haut.defile").count() === 1, "pas d'état défilé");
    await p.ctx.close();
  });
  await cas("NAV-04", "Fermeture des feuilles", async () => {
    const p = await page(null);
    await p.click("#actions-haut [data-f=reglages]");
    verifier(await p.evaluate(() => document.body.classList.contains("feuille-ouverte")), "défilement non bloqué");
    await p.click(".feuille-tete [data-act=fermer]");
    verifier(await p.locator(".feuille").count() === 0, "Fermer inopérant");
    await p.click("#actions-haut [data-f=reglages]"); await p.keyboard.press("Escape");
    verifier(await p.locator(".feuille").count() === 0, "Échap inopérant");
    await p.click("#actions-haut [data-f=reglages]"); await p.mouse.click(195, 8);
    verifier(await p.locator(".feuille").count() === 0, "toucher le fond inopérant");
    verifier(!(await p.evaluate(() => document.body.classList.contains("feuille-ouverte"))), "défilement resté bloqué");
    await p.ctx.close();
  });
  await cas("NAV-05", "Navigation imbriquée", async () => {
    const p = await page(null);
    await p.click("#actions-haut [data-f=reglages]");
    await p.click(".feuille [data-f=profil]");
    verifier((await p.textContent(".feuille-tete h2")) === "Profil du joueur", "Profil non ouvert");
    await p.click(".feuille-tete [data-act=retour]");
    verifier((await p.textContent(".feuille-tete h2")) === "Réglages", "Retour inopérant");
    await p.ctx.close();
  });

  /* ---------- 4.2 Profil ---------- */
  await cas("PRO-01", "Identité conservée", async () => {
    const p = await page(null);
    await p.click(".carte-profil [data-f=profil]");
    await p.fill("#p-pseudo", "Testeur"); await p.press("#p-pseudo", "Tab");
    await p.fill("#p-id", "123456"); await p.press("#p-id", "Tab");
    await p.fill("#p-guilde", "Les Portes"); await p.press("#p-guilde", "Tab");
    await p.fill("#p-etape", "12-3"); await p.press("#p-etape", "Tab");
    await p.fermerFeuille(); await p.reload();
    const t = await p.textContent(".carte-profil");
    verifier(t.includes("Testeur") && t.includes("Les Portes") && t.includes("123456") && t.includes("12-3"), `carte : ${t.replace(/\s+/g, " ")}`);
    await p.ctx.close();
  });
  await cas("PRO-02", "Steppers et minimums", async () => {
    const p = await page(null);
    await p.click(".carte-profil [data-f=profil]");
    for (let i = 0; i < 3; i++) await p.click('[data-act=pas][data-cle="joueur.niveau"][data-pas="-1"]');
    for (let i = 0; i < 3; i++) await p.click('[data-act=pas][data-cle="joueur.porte"][data-pas="-1"]');
    await p.click('[data-act=pas][data-cle="joueur.lit"][data-pas="1"]');
    const j = (await p.etat()).joueur;
    verifier(j.niveau === 1 && j.porte === 0 && j.lit === 2, JSON.stringify({ niveau: j.niveau, porte: j.porte, lit: j.lit }));
    await p.ctx.close();
  });
  await cas("PRO-03", "Saisie négative ou décimale", async () => {
    const p = await page(null);
    await p.click(".carte-profil [data-f=profil]");
    await p.fill('[data-num="joueur.porte"]', "-5"); await p.press('[data-num="joueur.porte"]', "Tab");
    await p.fill('[data-num="joueur.lit"]', "3.7"); await p.press('[data-num="joueur.lit"]', "Tab");
    await p.fill("#p-puiss", "-10"); await p.press("#p-puiss", "Tab");
    const j = (await p.etat()).joueur;
    verifier(j.porte === 0 && j.lit === 4 && j.puissance === 0, JSON.stringify({ porte: j.porte, lit: j.lit, puissance: j.puissance }));
    await p.ctx.close();
  });
  await cas("PRO-04", "Ressources saisies et formatées", async () => {
    const p = await page(null);
    await p.click(".tuile-res >> nth=0");
    await p.fill("#r-diamants", "1234"); await p.press("#r-diamants", "Tab");
    await p.fill("#r-or", "1250000"); await p.press("#r-or", "Tab");
    await p.fill("#r-or", ""); await p.press("#r-or", "Tab");
    await p.fermerFeuille();
    const tuiles = await p.$$eval(".tuile-res b", (els) => els.map((e) => e.textContent));
    verifier(tuiles[0].replace(/\s/g, " ").replace(/ /g, " ") === "1 234" && tuiles[1] === "—", JSON.stringify(tuiles));
    await p.ctx.close();
  });
  await cas("PRO-05", "Tirages de 10 possibles", async () => {
    const p = await page(avec((e) => { e.stock.diamants = 4500; }));
    verifier(await p.getByText("2 tirage(s) de 10").count() === 1, "message absent");
    await p.ctx.close();
  });
  await cas("PRO-06", "Très grand nombre", async () => {
    const p = await page(avec((e) => { e.stock.or = 1e12; e.joueur.puissance = 123456789012; }));
    const larg = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const t = await p.textContent(".tuile-res >> nth=1");
    verifier(larg === 0 && /Md/.test(t), `défilement ${larg}, tuile « ${t} »`);
    await p.ctx.close();
  });

  /* ---------- 4.3 Héros ---------- */
  await cas("HER-01", "Recherche", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=collection]");
    await p.fill("#recherche-heros", "pos");
    const noms = await p.$$eval("button[data-f=hero] .corps b", (els) => els.map((e) => e.textContent));
    verifier(noms.length === 1 && noms[0] === "Poseidon", JSON.stringify(noms));
    await p.ctx.close();
  });
  await cas("HER-02", "Recherche par alias", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=collection]");
    await p.fill("#recherche-heros", "pyro mech");
    const noms = await p.$$eval("button[data-f=hero] .corps b", (els) => els.map((e) => e.textContent));
    verifier(noms.includes("Pyrogon Mech"), JSON.stringify(noms));
    await p.ctx.close();
  });
  await cas("HER-03", "Filtre Les miens", async () => {
    const p = await page(avec((e) => possede(e, ["archangel", "spiker"])));
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=collection]");
    await p.click("[data-act=possedes][data-id='1']");
    const n = await p.locator("button[data-f=hero]").count();
    const lib = await p.textContent("[data-act=possedes][data-id='1']");
    verifier(n === 2 && lib.includes("(2)"), `${n} héros, « ${lib} »`);
    await p.ctx.close();
  });
  await cas("HER-04", "Fiche héros modifiée et conservée", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=collection]");
    await p.click("button[data-f=hero][data-id=lazerman]");
    await p.click(".feuille label.champ:has([data-champ=possede])");
    await p.click('[data-act=pas][data-cle="roster.lazerman.niveau"][data-pas="1"]');
    await p.fill('[data-num="roster.lazerman.promotion"]', "6"); await p.press('[data-num="roster.lazerman.promotion"]', "Tab");
    await p.click('[data-act=pas][data-cle="roster.lazerman.etoiles"][data-pas="1"]');
    await p.fermerFeuille(); await p.reload();
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=collection]");
    const r = await p.textContent("button[data-f=hero][data-id=lazerman] small");
    verifier(r === "Niv. 2 · P6 · 1★", r);
    await p.ctx.close();
  });
  await cas("HER-05", "Sixième héros refusé", async () => {
    const ids = ["archangel", "spiker", "lazerman", "poseidon", "bright-spirit", "metaman"];
    const p = await page(avec((e) => { possede(e, ids); e.equipe = ids.slice(0, 5); }));
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=collection]");
    await p.click("button[data-f=hero][data-id=metaman]");
    await p.click(".feuille label.champ:has([data-equipe])");
    const coche = await p.isChecked(".feuille [data-equipe=metaman]");
    const eq = (await p.etat()).equipe;
    verifier(!coche && eq.length === 5 && !eq.includes("metaman"), `coché=${coche}, équipe=${eq}`);
    await p.ctx.close();
  });
  await cas("HER-06", "Héros retiré de l'équipe s'il n'est plus obtenu", async () => {
    const p = await page(avec((e) => { possede(e, ["archangel"]); e.equipe = ["archangel"]; }));
    await p.click(".onglets [data-onglet=heros]"); await p.click("button[data-f=hero][data-id=archangel]");
    await p.click(".feuille label.champ:has([data-champ=possede])");
    verifier(!(await p.etat()).equipe.includes("archangel"), "toujours dans l'équipe");
    await p.ctx.close();
  });
  await cas("HER-07", "Équipe de référence avec confirmation", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=heros]");
    await p.click("[data-act=prendre-equipe][data-id=Gel]");
    verifier((await p.etat())?.equipe?.length ? false : true, "remplacée sans confirmation");
    await p.click("[data-act=prendre-equipe][data-id=Gel]");
    const eq = (await p.etat()).equipe;
    verifier(eq.length === 5 && eq.includes("frosthealer"), JSON.stringify(eq));
    await p.ctx.close();
  });
  await cas("HER-08", "Doublon de nom refusé", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=collection]");
    await p.click("text=Ajouter un héros absent du catalogue");
    await p.fill("#fh-nom", "poseidon"); await p.click(".feuille button[type=submit]");
    const n = ((await p.etat())?.catalogue?.heros || []).filter((h) => h.nom.toLowerCase() === "poseidon").length;
    verifier(n <= 1, `${n} Poseidon`);
    await p.ctx.close();
  });
  await cas("HER-09", "Injection HTML neutralisée", async () => {
    const p = await page(null);
    await p.evaluate(() => { window.__xss = 0; });
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=collection]");
    await p.click("text=Ajouter un héros absent du catalogue");
    await p.fill("#fh-nom", '<img src=x onerror="window.__xss=1">Pirate'); await p.click(".feuille button[type=submit]");
    await p.waitForTimeout(300);
    const x = await p.evaluate(() => window.__xss);
    const visible = await p.getByText("<img src=x", { exact: false }).count();
    verifier(x === 0 && visible >= 1, `exécuté=${x}, affiché=${visible}`);
    await p.ctx.close();
  });
  await cas("HER-10", "Suppression d'un héros du catalogue", async () => {
    const p = await page(avec((e) => { possede(e, ["joker"]); e.equipe = ["joker"]; }));
    await p.click(".onglets [data-onglet=heros]"); await p.click("button[data-f=hero][data-id=joker]");
    await p.click(".feuille [data-f=fiche-hero]");
    await p.click("[data-act=suppr-hero]");
    verifier((await p.etat()).catalogue.heros.some((h) => h.id === "joker"), "supprimé sans confirmation");
    await p.click("[data-act=suppr-hero]");
    await p.reload();
    const e = await p.etat();
    verifier(!e.catalogue.heros.some((h) => h.id === "joker") && !e.equipe.includes("joker"), "revenu ou resté dans l'équipe");
    await p.ctx.close();
  });

  /* ---------- 4.4 Artefacts et skins ---------- */
  await cas("ART-01", "Ajout d'artefacts", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=artefacts]");
    await p.click("#actions-haut [data-f=ajout-artefact]");
    await p.selectOption("#aa-ref", "bone-drill"); await p.click("form[data-form=artefact-inventaire] button[type=submit]");
    await p.click("#actions-haut [data-f=ajout-artefact]");
    await p.fill("#ac-nom", "Croc de sang"); await p.click("form[data-form=artefact-catalogue] button[type=submit]");
    const n = await p.locator("button[data-f=artefact]").count();
    verifier(n === 2, `${n} artefacts listés`);
    await p.ctx.close();
  });
  const etatArtefacts = () => avec((e) => {
    possede(e, ["poison-knight", "archangel", "spiker"]);
    e.equipe = ["poison-knight", "archangel", "spiker"];
    e.catalogue.artefacts.push({ id: "lame", nom: "Lame", stat: "patk", rarete: "CR" }, { id: "orbe", nom: "Orbe", stat: "matk", rarete: "CR" });
    e.inventaire.push({ id: "i1", ref: "lame", niveau: 10 }, { id: "i2", ref: "orbe", niveau: 10 }, { id: "i3", ref: "lame", niveau: 1 });
    e.roster.archangel.artefacts = ["i1"];
  });
  await cas("ART-02", "Un artefact n'est jamais sur deux héros", async () => {
    const p = await page(etatArtefacts());
    await p.click(".onglets [data-onglet=heros]"); await p.click("button[data-f=hero][data-id=poison-knight]");
    await p.selectOption('[data-slot=poison-knight][data-index="0"]', "i1");
    const e = await p.etat();
    verifier(e.roster["poison-knight"].artefacts.includes("i1") && !e.roster.archangel.artefacts.includes("i1"), JSON.stringify([e.roster["poison-knight"].artefacts, e.roster.archangel.artefacts]));
    await p.ctx.close();
  });
  await cas("ART-03", "Emplacements respectés via « Porté par »", async () => {
    const p = await page(avec((e) => {
      possede(e, ["spiker"]); e.joueur.emplacements = 1;
      e.catalogue.artefacts.push({ id: "x1", nom: "Lame", stat: "patk", rarete: "UR" }, { id: "x2", nom: "Lunette", stat: "crit", rarete: "UR" });
      e.inventaire.push({ id: "a", ref: "x1", niveau: 0 }, { id: "b", ref: "x2", niveau: 0 });
      e.roster.spiker.artefacts = ["a"];
    }));
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=artefacts]");
    await p.click("button[data-f=artefact][data-id=b]");
    await p.selectOption("#porteur", "spiker");
    const a = (await p.etat()).roster.spiker.artefacts;
    verifier(a.length === 1 && a[0] === "b", JSON.stringify(a));
    await p.ctx.close();
  });
  await cas("ART-04", "Retrait de l'inventaire", async () => {
    const p = await page(etatArtefacts());
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=artefacts]");
    await p.click("button[data-f=artefact][data-id=i1]");
    await p.click("[data-act=suppr-inv]"); await p.click("[data-act=suppr-inv]");
    const e = await p.etat();
    verifier(!e.inventaire.some((i) => i.id === "i1") && !e.roster.archangel.artefacts.includes("i1"), "toujours présent");
    await p.ctx.close();
  });
  await cas("ART-05", "Suppression d'une fiche encore possédée refusée", async () => {
    const p = await page(etatArtefacts());
    await p.click("#actions-haut [data-f=reglages]"); await p.click(".feuille [data-f=cat-artefacts]");
    await p.click('[data-act=suppr-cat-artefact][data-id=lame]'); await p.click('[data-act=suppr-cat-artefact][data-id=lame]');
    verifier((await p.etat()).catalogue.artefacts.some((a) => a.id === "lame"), "fiche supprimée alors qu'elle est possédée");
    await p.ctx.close();
  });
  await cas("SKI-01", "Skin créé depuis la fiche du héros", async () => {
    const p = await page(avec((e) => possede(e, ["lazerman"])));
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=collection]");
    await p.click("button[data-f=hero][data-id=lazerman]");
    await p.click(".feuille [data-f=fiche-skin]");
    const pre = await p.inputValue(".feuille select[name=heroId]");
    await p.fill("#fs-nom", "Lazerman doré"); await p.selectOption(".feuille select[name=bonusStat]", "matk"); await p.fill("#fs-val", "8");
    await p.click(".feuille form[data-form=skin] label.champ:has([name=possede])");
    await p.click(".feuille form[data-form=skin] button[type=submit]");
    const e = await p.etat();
    const s = e.catalogue.skins[0];
    verifier(pre === "lazerman" && s?.heroId === "lazerman" && e.skinsPossedes[s.id], JSON.stringify({ pre, s }));
    await p.ctx.close();
  });
  await cas("SKI-02", "Skin à bonus proposé puis équipé", async () => {
    const p = await page(avec((e) => { possede(e, ["lazerman"]); e.equipe = ["lazerman"]; e.catalogue.skins.push({ id: "s1", nom: "Doré", heroId: "lazerman", bonusStat: "matk", bonusValeur: "8" }); e.skinsPossedes.s1 = true; }));
    await p.click(".onglets [data-onglet=strategie]");
    await p.click("[data-act=mettre-skin]");
    verifier((await p.etat()).roster.lazerman.skin === "s1", "skin non équipé");
    await p.ctx.close();
  });

  await cas("CUR-01", "Curios par set : interrupteur et compteur", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=artefacts]");
    await p.click('label:has(+ x) , [data-curio="ghost-lighter"]').catch(() => {});
    await p.check('[data-curio="sacrifice-candle"]');
    const titre = await p.locator(".section-titre h2", { hasText: "Sky Scorch" }).textContent();
    await p.uncheck('[data-curio="sacrifice-candle"]');
    const e = await p.etat();
    verifier(/Sky Scorch · [12]\/4/.test(titre) && !e.inventaire.some((i) => i.ref === "sacrifice-candle"), `${titre}`);
    await p.ctx.close();
  });
  await cas("CUR-02", "Héros Brûlure : set Sky Scorch complet appliqué", async () => {
    const p = await page(avec((e) => { possede(e, ["bride-wraith"]); e.equipe = ["bride-wraith"]; e.joueur.emplacements = 4;
      ["purgatory-oven", "dynamite-battery", "ghost-lighter", "sacrifice-candle", "rusty-knife"].forEach((r, i) => e.inventaire.push({ id: `k${i}`, ref: r, etoiles: 3 })); }));
    await p.click(".onglets [data-onglet=strategie]"); await p.click("[data-act=appliquer-tout]");
    const e = await p.etat();
    const refs = e.roster["bride-wraith"].artefacts.map((id) => e.inventaire.find((i) => i.id === id).ref).sort();
    verifier(JSON.stringify(refs) === JSON.stringify(["dynamite-battery", "ghost-lighter", "purgatory-oven", "sacrifice-candle"]), refs.join(","));
    await p.ctx.close();
  });
  await cas("CMP-01", "Pièges : déploiement limité à 3", async () => {
    const p = await page(avec((e) => { for (const id of ["iron-fist", "molten-furnace", "lethal-fence"]) e.pieges[id] = { possede: true, niveau: 10, deploye: true }; e.pieges["demon-spike"] = { possede: true, niveau: 5 }; }));
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=pieges]");
    await p.click('button[data-f=compagnon][data-id="pieges:demon-spike"]');
    await p.click('.feuille label.champ:has([data-comp-deploye])');
    const e = await p.etat();
    verifier(!e.pieges["demon-spike"].deploye, "4e piège déployé");
    await p.ctx.close();
  });
  await cas("CMP-02", "Bêtes : 3e place seulement après Main Stage 220", async () => {
    const p = await page(avec((e) => { e.joueur.etape = "176"; for (const id of ["titan-mammoth", "colossal-ape"]) e.betes[id] = { possede: true, deploye: true }; e.betes["alien-critter"] = { possede: true }; }));
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=betes]");
    const t = await p.textContent(".sous-titre");
    await p.click('button[data-f=compagnon][data-id="betes:alien-critter"]');
    await p.click('.feuille label.champ:has([data-comp-deploye])');
    const refuse = !(await p.etat()).betes["alien-critter"].deploye;
    verifier(/2\/2/.test(t) && /220/.test(t) && refuse, `${t} / refus=${refuse}`);
    await p.ctx.close();
  });
  await cas("LOGO-01", "Logo de l'app sur l'accueil", async () => {
    const p = await page(null);
    verifier(await p.locator(".logo svg").count() === 1 && (await p.textContent(".logo")).includes("Knock Knock"), "logo absent");
    await p.ctx.close();
  });

  /* ---------- 4.5 Stratégie ---------- */
  const premiereEtape = async (e) => { const p = await page(e); await p.click(".onglets [data-onglet=strategie]"); const t = await p.textContent(".section .ligne b"); await p.ctx.close(); return t; };
  await cas("STR-01", "Lit = Porte → monter la Porte", async () => { const t = await premiereEtape(avec((e) => { e.joueur.porte = 5; e.joueur.lit = 5; possede(e, ["spiker"]); })); verifier(/Porte/.test(t), t); return t; });
  await cas("STR-02", "Porte − Lit ≥ 2 → rattraper le Lit", async () => { const t = await premiereEtape(avec((e) => { e.joueur.porte = 9; e.joueur.lit = 6; possede(e, ["spiker"]); })); verifier(/Lit/.test(t), t); return t; });
  await cas("STR-03", "Promotion vers 6", async () => {
    const p = await page(avec((e) => { possede(e, ["spiker"], { promotion: 4 }); e.equipe = ["spiker"]; }));
    await p.click(".onglets [data-onglet=strategie]");
    verifier(await p.getByText("Spiker : promotion 4 → 6").count() === 1, "étape P6 absente");
    await p.ctx.close();
  });
  await cas("STR-04", "P.ATK déplacé vers un physique", async () => {
    const p = await page(etatArtefacts());
    const compteur = await p.textContent("#compteur-strategie");
    await p.click(".onglets [data-onglet=strategie]");
    await p.click("[data-act=appliquer-tout]");
    const e = await p.etat();
    const pk = e.roster["poison-knight"].artefacts, lz = e.roster.archangel.artefacts;
    verifier(Number(compteur) >= 1 && pk.includes("i1") && lz.includes("i2") && await p.locator("#compteur-strategie").isHidden(), JSON.stringify({ compteur, pk, lz }));
    await p.ctx.close();
  });
  await cas("STR-05", "Alerte sans soigneur", async () => {
    const p = await page(avec((e) => { possede(e, ["spiker", "lazerman"]); e.equipe = ["spiker", "lazerman"]; }));
    await p.click(".onglets [data-onglet=strategie]");
    verifier(await p.getByText("Pas de soigneur", { exact: false }).count() >= 1, "alerte absente");
    await p.ctx.close();
  });
  await cas("STR-06", "Abonnement qui expire", async () => {
    const fin = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const p = await page(avec((e) => { e.abonnements.abonnement = { actif: true, fin }; }));
    await p.click(".onglets [data-onglet=strategie]");
    const ok = await p.getByText("expire dans", { exact: false }).count() >= 1 && await p.getByText("Combat automatique", { exact: false }).count() >= 1;
    verifier(ok, "alerte ou conseil auto absent");
    await p.ctx.close();
  });
  await cas("STR-07", "Stratégie sans données", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=strategie]");
    verifier(!p.erreurs.length && await p.getByText("Ajoutez vos héros").count() >= 1, p.erreurs.join(" | ") || "étape d'amorçage absente");
    await p.ctx.close();
  });

  await cas("STR-08", "Équipe proposée appliquée en un geste", async () => {
    const p = await page(avec((e) => possede(e, ["archangel", "spiker", "lazerman", "poseidon", "bright-spirit", "frosthealer"])));
    await p.click("[data-act=equipe-proposee]");
    const eq = (await p.etat()).equipe;
    verifier(eq.length === 5 && await p.locator("[data-act=equipe-proposee]").count() === 0, JSON.stringify(eq));
    await p.ctx.close();
  });

  /* ---------- 4.6 Boss ---------- */
  await cas("BOS-01", "Création et équipe conseillée", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=boss]"); await p.click("#actions-haut [data-f=fiche-boss]");
    await p.fill("#fb-nom", "Roi des égouts"); await p.fill("#fb-chap", "7");
    await p.click(".feuille .choix label:has([name=faiblesses][value=magique])");
    await p.click(".feuille .choix label:has([name=resistances][value=physique])");
    await p.click(".feuille .choix label:has([name=traits][value=pvEleves])");
    await p.click(".feuille form[data-form=boss] button[type=submit]");
    await p.waitForTimeout(300);
    const titre = await p.textContent(".feuille-tete h2");
    const noms = await p.$$eval(".feuille .section .ligne .corps > b", (els) => els.map((e) => e.textContent));
    await p.screenshot({ path: path.join(SORTIE, `${PASSE}-boss-detail.png`) });
    verifier(titre === "Roi des égouts", `titre ${titre}`);
    const e = await p.etat();
    const heros = Object.fromEntries(e.catalogue.heros.map((h) => [h.nom, h]));
    const equipe = noms.filter((n) => heros[n]).slice(0, 5);
    const amplisPhysiques = equipe.filter((n) => heros[n].role === "amplificateur" && heros[n].type === "physique");
    verifier(heros[equipe[0]]?.type === "magique" && !amplisPhysiques.length, `équipe : ${equipe.join(", ")}`);
    await p.ctx.close();
    return equipe.join(", ");
  });
  await cas("BOS-02", "Faiblesse = résistance refusée", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=boss]"); await p.click("#actions-haut [data-f=fiche-boss]");
    await p.fill("#fb-nom", "Paradoxe");
    await p.click(".feuille .choix label:has([name=faiblesses][value=gel])");
    await p.click(".feuille .choix label:has([name=resistances][value=gel])");
    await p.click(".feuille form[data-form=boss] button[type=submit]");
    const n = ((await p.etat())?.catalogue?.boss || []).filter((b) => b.nom === "Paradoxe").length;
    verifier(n === 0, "boss incohérent enregistré");
    await p.ctx.close();
  });
  await cas("BOS-03", "Mes héros seulement sans héros", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=boss]"); await p.click("button[data-f=boss] >> nth=0");
    verifier(await p.getByText("Aucun héros obtenu", { exact: false }).count() >= 1, "message absent");
    await p.ctx.close();
  });
  await cas("BOS-04", "En faire mon équipe", async () => {
    const p = await page(avec((e) => possede(e, ["archangel", "spiker", "lazerman", "poseidon", "bright-spirit", "frosthealer"])));
    await p.click(".onglets [data-onglet=boss]"); await p.click("button[data-f=boss][data-id=modele-tank]");
    await p.click("[data-act=equipe-boss]");
    const eq = (await p.etat()).equipe;
    verifier(eq.length === 5, JSON.stringify(eq));
    await p.ctx.close();
  });
  await cas("BOS-05", "Modifier puis supprimer un boss", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=boss]"); await p.click("button[data-f=boss][data-id=modele-regen]");
    await p.click(".feuille [data-f=fiche-boss]");
    await p.fill("#fb-spe", "Phase 2 à 50 % de PV"); await p.click(".feuille form[data-form=boss] button[type=submit]");
    const spe = (await p.etat()).catalogue.boss.find((b) => b.id === "modele-regen").specificites;
    await p.click(".feuille [data-f=fiche-boss]");
    await p.click("[data-act=suppr-boss]"); await p.click("[data-act=suppr-boss]");
    const reste = (await p.etat()).catalogue.boss.some((b) => b.id === "modele-regen");
    verifier(spe === "Phase 2 à 50 % de PV" && !reste, JSON.stringify({ spe, reste }));
    await p.ctx.close();
  });

  await cas("BOS-06", "Conseils boss bien formulés", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=boss]"); await p.click("button[data-f=boss][data-id=modele-tank]");
    const t = await p.textContent(".feuille");
    verifier(t.includes("les héros physiques") && !t.includes("héros Physique"), "formulation incorrecte");
    await p.ctx.close();
  });

  /* ---------- 4.7 Boutique ---------- */
  await cas("BOU-01", "Option active avec date de fin", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=boutique]");
    await p.check("[data-offre=abonnement]");
    const fin = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    await p.fill("[data-offre-fin=abonnement]", fin); await p.press("[data-offre-fin=abonnement]", "Tab");
    await p.reload(); await p.click(".onglets [data-onglet=boutique]");
    const t = await p.textContent("[data-f=offre][data-id=abonnement] small");
    verifier(/j restants/.test(t), t);
    await p.ctx.close();
    return t;
  });
  await cas("BOU-02", "Code cadeau coché et copié", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=boutique]");
    await p.check("[data-code=knock2026]");
    await p.click("[data-act=copier-code][data-id=knock2026]");
    await p.waitForTimeout(200);
    verifier((await p.etat()).codesUtilises.knock2026 === true && !p.erreurs.length, p.erreurs.join(" | ") || "coche non gardée");
    await p.ctx.close();
  });
  await cas("BOU-03", "Option personnalisée prise en compte", async () => {
    const p = await page(null);
    await p.click(".onglets [data-onglet=boutique]");
    await p.click("text=Ajouter une option vue dans le jeu");
    await p.fill("#fo-nom", "Carte mensuelle");
    await p.click(".feuille .choix label:has([value=ressourcesQuotidiennes])");
    await p.click(".feuille form[data-form=offre] button[type=submit]");
    const o = (await p.etat()).catalogue.offres.find((x) => x.nom === "Carte mensuelle");
    await p.check(`[data-offre="${o.id}"]`);
    await p.click(".onglets [data-onglet=strategie]");
    verifier(await p.getByText("Pass actif", { exact: false }).count() >= 1, "conseil absent");
    await p.ctx.close();
  });

  /* ---------- 4.8 Import ---------- */
  const pageImport = await page(null);
  async function importer(fichiers) {
    const p = pageImport;
    await p.fermerFeuille();
    await p.click(".onglets [data-onglet=accueil]");
    await p.click("#actions-haut [data-f=import]");
    await p.setInputFiles(".feuille input[data-import-captures]", fichiers.map((f) => path.join(capt, f)));
    await p.waitForSelector(".feuille [data-act=import-recommencer]", { timeout: 120000 });
    return {
      titre: await p.textContent(".feuille-tete h2"),
      champs: await p.$$eval(".feuille [data-imp]", (els) => Object.fromEntries(els.map((e) => [e.dataset.imp, e.value]))),
    };
  }
  await cas("IMP-01", "Profil anglais", async () => {
    const t0 = Date.now();
    const { champs } = await importer(["profil-en.png"]);
    const attendu = { "profil.pseudo": "ArtKnight", "profil.idJoueur": "48213977", "profil.niveau": "37", "profil.guilde": "Night Owls", "profil.puissance": "125400", "profil.vip": "3", "profil.etape": "24-5", "profil.porte": "12", "profil.lit": "11", "profil.recherche": "6", "stock.diamants": "2450", "stock.or": "1200000", "stock.flammeAme": "3400", "stock.pacteHeros": "12", "stock.endurance": "85" };
    const ecarts = Object.entries(attendu).filter(([k, v]) => champs[k] !== v).map(([k, v]) => `${k}: lu « ${champs[k] ?? "absent"} », attendu « ${v} »`);
    verifier(!ecarts.length, ecarts.join(" ; "));
    return `${Object.keys(attendu).length} champs justes en ${Math.round((Date.now() - t0) / 1000)} s`;
  });
  await cas("IMP-02", "Profil français", async () => {
    const { champs } = await importer(["profil-fr.png"]);
    const attendu = { "profil.pseudo": "Artémis", "profil.niveau": "22", "profil.guilde": "Les Hiboux", "profil.puissance": "98000", "profil.etape": "18", "profil.porte": "9", "profil.lit": "8", "stock.diamants": "1200", "stock.or": "45600", "stock.cuir": "320" };
    const ecarts = Object.entries(attendu).filter(([k, v]) => champs[k] !== v).map(([k, v]) => `${k}: lu « ${champs[k] ?? "absent"} », attendu « ${v} »`);
    verifier(!ecarts.length, ecarts.join(" ; "));
  });
  await cas("IMP-03", "Grille de héros anglaise", async () => {
    const { champs } = await importer(["heros-en.png"]);
    const parHero = {};
    for (const [k, v] of Object.entries(champs)) { const m = k.match(/^heros\.(\d+)\.(\w+)$/); if (m) (parHero[m[1]] ||= {})[m[2]] = v; }
    const lu = Object.fromEntries(Object.values(parHero).map((h) => [h.heroId, [h.niveau, h.promotion, h.etoiles]]));
    const attendu = { archangel: ["52", "6", ""], spiker: ["48", "", "5"], lazerman: ["40", "3", ""], poseidon: ["37", "", "4"], "bright-spirit": ["33", "2", ""], "ghost-captain": ["30", "", "3"] };
    const ecarts = Object.entries(attendu).filter(([k, v]) => JSON.stringify(lu[k]) !== JSON.stringify(v)).map(([k, v]) => `${k}: ${JSON.stringify(lu[k])} au lieu de ${JSON.stringify(v)}`);
    verifier(!ecarts.length, ecarts.join(" ; "));
  });
  await cas("IMP-04", "Fiche française : héros, artefact, skin", async () => {
    const { champs } = await importer(["heros-fr.png"]);
    const ok = champs["heros.0.heroId"] === "frosthealer" && champs["heros.0.niveau"] === "35" && champs["heros.0.promotion"] === "3" && champs["heros.0.etoiles"] === "4"
      && champs["artefacts.0.nom"] === "Lame ancestrale" && champs["artefacts.0.stat"] === "patk" && champs["artefacts.0.rarete"] === "UR" && champs["artefacts.0.niveau"] === "7"
      && champs["skins.0.nom"] === "Reine des glaces" && champs["skins.0.heroId"] === "frosthealer";
    verifier(ok, JSON.stringify(champs));
  });
  await cas("IMP-05", "Quatre captures en une fois", async () => {
    const t0 = Date.now();
    const { titre, champs } = await importer(["profil-en.png", "profil-fr.png", "heros-en.png", "heros-fr.png"]);
    const duree = (Date.now() - t0) / 1000;
    const nbHeros = Object.keys(champs).filter((k) => /^heros\.\d+\.heroId$/.test(k)).length;
    verifier(nbHeros === 7 && champs["profil.pseudo"] && duree < 30, `${nbHeros} héros, pseudo « ${champs["profil.pseudo"]} », ${duree} s`);
    return `${titre} en ${Math.round(duree)} s`;
  });
  await cas("IMP-06", "Seules les propositions cochées sont enregistrées", async () => {
    const p = pageImport;
    await p.uncheck('[data-imp-coche="heros.1"]');
    await p.fill('[data-imp="heros.0.niveau"]', "99"); await p.press('[data-imp="heros.0.niveau"]', "Tab");
    const h0 = await p.inputValue('[data-imp="heros.0.heroId"]'), h1 = await p.inputValue('[data-imp="heros.1.heroId"]');
    await p.uncheck('[data-imp-coche="profil.guilde"]');
    await p.click("[data-act=import-appliquer]");
    const e = await p.etat();
    verifier(e.roster[h0]?.niveau === 99 && !e.roster[h1]?.possede && e.joueur.guilde === "" && e.joueur.pseudo === "ArtKnight", JSON.stringify({ h0: e.roster[h0], h1: e.roster[h1], guilde: e.joueur.guilde, pseudo: e.joueur.pseudo }));
  });
  await cas("IMP-07", "Image sans texte", async () => {
    const avant = JSON.stringify(await pageImport.etat());
    const { titre } = await importer(["vide.png"]);
    const msg = await pageImport.getByText("Rien de reconnu", { exact: false }).count();
    verifier(/^0 info/.test(titre) && msg === 1 && JSON.stringify(await pageImport.etat()) === avant, titre);
  });
  await cas("IMP-08", "Aucune capture conservée", async () => {
    const p = pageImport;
    await p.fermerFeuille();
    const stockage = await p.evaluate(async () => {
      const ls = Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]);
      const total = ls.reduce((s, [, v]) => s + v.length, 0);
      const image = ls.some(([, v]) => /data:image|base64,|blob:/.test(v));
      const texteLu = ls.some(([, v]) => /HEROES|Reine des glaces Skin|Room Research Lv/.test(v));
      const enCache = "caches" in window ? await Promise.all((await window.caches.keys()).map(async (c) => (await (await window.caches.open(c)).keys()).map((r) => r.url))) : [];
      const imagesEnCache = enCache.flat().filter((u) => /\.(png|jpe?g|heic)$/i.test(u) && !/icons\//.test(u));
      const bases = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [];
      return { total, image, texteLu, imagesEnCache, bases, sessionImg: Object.values(sessionStorage).some((v) => /data:image/.test(v)) };
    });
    verifier(!stockage.image && !stockage.texteLu && !stockage.imagesEnCache.length && !stockage.sessionImg, JSON.stringify(stockage));
    return `profil ${Math.round(stockage.total / 1024)} Ko ; bases IndexedDB : ${stockage.bases.join(", ") || "aucune"} (cache du moteur de lecture uniquement)`;
  });
  await cas("IMP-09", "Pas de doublon au catalogue en réimportant", async () => {
    await importer(["heros-fr.png"]); await pageImport.click("[data-act=import-appliquer]");
    await importer(["heros-fr.png"]); await pageImport.click("[data-act=import-appliquer]");
    const e = await pageImport.etat();
    const n = e.catalogue.artefacts.filter((a) => a.nom === "Lame ancestrale").length;
    const s = e.catalogue.skins.filter((a) => a.nom === "Reine des glaces").length;
    verifier(n === 1 && s === 1, `${n} fiche(s) artefact, ${s} skin(s)`);
  });
  await pageImport.ctx.close();
  await cas("IMP-10", "Moteur de lecture indisponible", async () => {
    const ctx = await navigateur.newContext({ ...devices["iPhone 13"], serviceWorkers: "block" });
    const p = await ctx.newPage(); p.ctx = ctx;
    await p.goto(URL);
    await p.route("**/vendor/tesseract/**", (r) => r.abort());
    await p.click("#actions-haut [data-f=import]");
    await p.setInputFiles(".feuille input[data-import-captures]", path.join(capt, "profil-en.png"));
    await p.waitForSelector(".feuille [data-act=import-recommencer]", { timeout: 60000 });
    const t = await p.textContent(".feuille-tete h2");
    verifier(t === "Import impossible", t);
    await p.ctx.close();
  });

  const dossierReel = path.join(__dirname, "captures-reelles");
  if (fs.existsSync(dossierReel)) {
    await cas("REEL-01", "16 vraies captures du jeu (anglais)", async () => {
      const p = await page(null);
      await p.click("#actions-haut [data-f=import]");
      const fichiers = fs.readdirSync(dossierReel).filter((f) => /\.png$/i.test(f)).map((f) => path.join(dossierReel, f));
      await p.setInputFiles(".feuille input[data-import-captures]", fichiers);
      await p.waitForSelector(".feuille [data-act=import-recommencer]", { timeout: 600000 });
      await p.click("[data-act=import-appliquer]");
      const e = await p.etat();
      const heros = Object.values(e.roster).filter((r) => r.possede).length;
      const ok = heros === 31 && e.inventaire.length === 29 && Object.values(e.pieges).filter((x) => x.possede).length === 5 && Object.values(e.betes).filter((x) => x.possede).length === 4
        && e.stock.diamants === 352 && e.stock.or === 16630 && e.stock.endurance === 274 && e.joueur.niveau === 69 && e.joueur.coffreCurios === 392 && e.joueur.equipementNiveau === 171;
      const niveaux = Object.values(e.roster).filter((r) => r.possede && r.niveau === 67).length;
      verifier(ok, JSON.stringify({ heros, curios: e.inventaire.length, stock: e.stock, niveau: e.joueur.niveau }));
      await p.ctx.close();
      return `31 héros (${niveaux} avec le bon niveau 67), 29 curios, 5 pièges, 4 bêtes, ressources et profil justes`;
    });
  }

  /* ---------- 4.9 Données ---------- */
  await cas("DON-01", "Rechargement", async () => {
    const p = await page(etatArtefacts());
    await p.reload();
    const e = await p.etat();
    verifier(e.inventaire.length === 3 && e.equipe.length === 3, "données perdues");
    await p.ctx.close();
  });
  await cas("DON-02", "Copier puis charger la sauvegarde", async () => {
    const p = await page(etatArtefacts());
    await p.click("#actions-haut [data-f=reglages]"); await p.click(".feuille [data-f=sauvegarde]");
    const texte = await p.inputValue("#profil-json");
    await p.evaluate(() => localStorage.clear());
    await p.fill("#profil-json", texte); await p.click("[data-act=coller]");
    const e = await p.etat();
    verifier(e.inventaire.length === 3 && e.roster.archangel.possede, "état différent");
    await p.ctx.close();
  });
  await cas("DON-03", "Texte invalide", async () => {
    const p = await page(etatArtefacts());
    await p.click("#actions-haut [data-f=reglages]"); await p.click(".feuille [data-f=sauvegarde]");
    await p.fill("#profil-json", "{pas du json"); await p.click("[data-act=coller]");
    verifier((await p.etat()).inventaire.length === 3 && !p.erreurs.length, "données perdues ou erreur");
    await p.ctx.close();
  });
  await cas("DON-04", "Migration d'un profil v1", async () => {
    const v1 = { version: 1, joueur: { pseudo: "Ancien", porte: 4, lit: 3 }, roster: { spiker: { possede: true, niveau: 20 } }, heros: [], ennemis: [{ id: "b1", nom: "Boss 7", faiblesses: ["gel"], resistances: [], traits: [] }], artefacts: [{ id: "a1", nom: "Vieille lame", stat: "patk", rarete: "Rare", niveau: 2 }] };
    const ctx = await navigateur.newContext({ ...devices["iPhone 13"] });
    const p = await ctx.newPage();
    await p.addInitScript((v) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); localStorage.clear(); localStorage.setItem("kkrd-coach:v1", v); } }, JSON.stringify(v1));
    await p.goto(URL);
    await p.click(".onglets [data-onglet=heros]");
    const t = await p.textContent(".carte-profil, main").catch(() => "");
    await p.click(".onglets [data-onglet=accueil]");
    const carte = await p.textContent(".carte-profil");
    await p.click(".onglets [data-onglet=boss]");
    const boss = await p.getByText("Boss 7").count();
    verifier(carte.includes("Ancien") && boss === 1, `carte « ${carte.replace(/\s+/g, " ").slice(0, 80)} », boss ${boss}`);
    await ctx.close();
  });
  await cas("DON-05", "Stockage corrompu", async () => {
    const p = await page("{corrompu");
    verifier(await p.locator("h1.grand-titre").count() === 1 && !p.erreurs.length, p.erreurs.join(" | "));
    await p.ctx.close();
  });
  await cas("DON-06", "Effacer mon profil", async () => {
    const p = await page(etatArtefacts());
    await p.click("#actions-haut [data-f=reglages]");
    await p.click("[data-act=reinitialiser]");
    verifier((await p.etat()).inventaire.length === 3, "effacé sans confirmation");
    await p.click("[data-act=reinitialiser]");
    verifier((await p.etat()).inventaire.length === 0, "non effacé");
    await p.ctx.close();
  });
  await cas("DON-07", "Poids d'un profil complet", async () => {
    const e = etatArtefacts();
    for (const h of e.catalogue.heros) e.roster[h.id] = { possede: true, niveau: 80, promotion: 9, etoiles: 5, artefacts: [] };
    for (let i = 0; i < 40; i++) e.inventaire.push({ id: `x${i}`, ref: e.catalogue.artefacts[i].id, etoiles: 4 });
    const ko = JSON.stringify(e).length / 1024;
    verifier(ko < 100, `${ko.toFixed(1)} Ko`);
    return `${ko.toFixed(1)} Ko pour ${e.catalogue.heros.length} héros, ${e.inventaire.length} curios`;
  });

  /* ---------- 4.10 Qualité ---------- */
  await cas("UI-01", "Pas de défilement horizontal (4 tailles × 5 onglets)", async () => {
    const tailles = [["SE", { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ["13", devices["iPhone 13"]], ["Pro Max", { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ["iPad", { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]];
    const ecarts = [];
    for (const [nom, app] of tailles) {
      const p = await page(etatArtefacts(), { appareil: app });
      for (const o of ["accueil", "heros", "strategie", "boss", "boutique"]) {
        await p.click(`.onglets [data-onglet=${o}]`);
        const d = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (d > 0) ecarts.push(`${nom}/${o}: +${d}px`);
      }
      await p.click(".onglets [data-onglet=accueil]");
      if (nom === "SE") await p.screenshot({ path: path.join(SORTIE, `${PASSE}-iphone-se.png`), fullPage: true });
      await p.ctx.close();
    }
    verifier(!ecarts.length, ecarts.join(", "));
  });
  await cas("UI-02", "Thème noir, blanc, doré", async () => {
    const p = await page(null);
    const c = await p.evaluate(() => ({ fond: getComputedStyle(document.body).backgroundColor, texte: getComputedStyle(document.body).color, titre: getComputedStyle(document.querySelector(".section-titre h2")).color }));
    verifier(c.fond === "rgb(0, 0, 0)" && c.texte === "rgb(255, 255, 255)" && c.titre === "rgb(216, 180, 90)", JSON.stringify(c));
    await p.ctx.close();
  });
  await cas("UI-03", "Contraste du texte secondaire", async () => {
    const lum = (hex) => { const [r, g, b] = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const r1 = ratio("a1a1a8", "1c1c1e"), r2 = ratio("d8b45a", "000000"), r3 = ratio("6e6e75", "1c1c1e");
    verifier(r1 >= 4.5 && r2 >= 4.5, `secondaire ${r1.toFixed(2)}, doré ${r2.toFixed(2)}`);
    return `secondaire ${r1.toFixed(2)}:1, doré ${r2.toFixed(2)}:1, tertiaire (indices « — ») ${r3.toFixed(2)}:1`;
  });
  await cas("UI-04", "Cibles tactiles ≥ 44 px", async () => {
    const p = await page(etatArtefacts());
    const petits = [];
    for (const o of ["accueil", "heros", "strategie", "boss", "boutique"]) {
      await p.click(`.onglets [data-onglet=${o}]`);
      petits.push(...await p.$$eval("main button, main label.ligne, main input[type=checkbox]", (els) => els.filter((e) => e.offsetParent !== null).map((e) => { const zone = e.closest("label") || e; const r = zone.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), t: (e.textContent || e.getAttribute("aria-label") || e.className).trim().slice(0, 30) }; })
        .filter((r) => r.h < 44 && r.w < 44)).then((l) => l.map((r) => `${o}: « ${r.t} » ${r.w}×${r.h}`)));
    }
    verifier(!petits.length, petits.slice(0, 6).join(" ; "));
    await p.ctx.close();
  });
  await cas("UI-05", "Noms accessibles", async () => {
    const p = await page(etatArtefacts());
    const sans = [];
    for (const o of ["accueil", "heros", "strategie", "boss", "boutique"]) {
      await p.click(`.onglets [data-onglet=${o}]`);
      sans.push(...await p.$$eval("button, input, select", (els) => els.filter((e) => e.offsetParent !== null && e.type !== "hidden").filter((e) => {
        const nom = e.getAttribute("aria-label") || e.textContent.trim() || (e.id && document.querySelector(`label[for="${e.id}"]`)?.textContent) || e.closest("label")?.textContent.trim() || e.placeholder;
        return !nom;
      }).map((e) => `${e.tagName}.${e.className}`)).then((l) => l.map((x) => `${o}: ${x}`)));
    }
    verifier(!sans.length, sans.slice(0, 6).join(" ; "));
    await p.ctx.close();
  });
  await cas("UI-06", "Champs en 16 px minimum", async () => {
    const p = await page(etatArtefacts());
    await p.click(".carte-profil [data-f=profil]");
    const petits = await p.$$eval(".feuille input, .feuille select", (els) => els.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id || e.dataset.num));
    await p.fermerFeuille();
    await p.click(".onglets [data-onglet=heros]"); await p.click("[data-act=seg][data-id=collection]");
    petits.push(...await p.$$eval("main input", (els) => els.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id)));
    verifier(!petits.length, petits.join(", "));
    await p.ctx.close();
  });
  await cas("PWA-01", "Manifest et icônes", async () => {
    const p = await page(null);
    const r = await p.evaluate(async () => {
      const m = await (await fetch("manifest.webmanifest")).json();
      const icones = await Promise.all(["icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"].map(async (u) => (await fetch(u)).ok));
      return { display: m.display, nom: m.name, fond: m.background_color, icones, apple: !!document.querySelector('link[rel="apple-touch-icon"]') };
    });
    verifier(r.display === "standalone" && r.icones.every(Boolean) && r.apple, JSON.stringify(r));
    await p.ctx.close();
    return `${r.nom}, fond ${r.fond}`;
  });
  await cas("PWA-02", "Hors ligne", async () => {
    const p = await page(null);
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload(); await p.waitForTimeout(500);
    await p.ctx.setOffline(true); await p.reload();
    const t = await p.locator("h1.grand-titre").textContent();
    verifier(t === "Tableau de bord", t);
    await p.ctx.close();
  });
  await cas("PERF-01", "Premier affichage", async () => {
    const ctx = await navigateur.newContext({ ...devices["iPhone 13"] });
    const p = await ctx.newPage();
    const t0 = Date.now(); await p.goto(URL); await p.waitForSelector("h1.grand-titre");
    const ms = Date.now() - t0;
    await ctx.close();
    verifier(ms < 1000, `${ms} ms`);
    return `${ms} ms`;
  });

  await navigateur.close();
  serveur.kill();
  const ok = resultats.filter((r) => r.ok).length;
  fs.writeFileSync(path.join(RACINE, "docs/qa", `resultats-${PASSE}.json`), JSON.stringify({ passe: PASSE, date: new Date().toISOString(), total: resultats.length, reussis: ok, echecs: resultats.length - ok, resultats }, null, 2));
  console.log(`\n${ok}/${resultats.length} cas réussis`);
}

main().catch((e) => { console.error(e); process.exit(1); });
