// Catalogue de départ : tout ce que l'app « sait » du jeu.
//
// `source` = vu dans un guide communautaire ou une fiche de store (2026).
// `aVerifier: true` = supposé par l'app (type, effet ou rôle non publié) :
// l'utilisateur le corrige dans l'onglet Plus › Catalogue, et l'app garde sa version.

export const TYPES = { physique: "Physique", magique: "Magique", inconnu: "À renseigner" };

export const EFFETS = {
  aucun: "Aucun",
  brulure: "Brûlure",
  saignement: "Saignement",
  poison: "Poison",
  gel: "Gel",
  paralysie: "Paralysie",
  etourdissement: "Étourdissement (Stun)",
  repousser: "Repoussement (Knock)",
};

export const ROLES = {
  mono: "Mono-cible",
  zone: "Zone",
  soin: "Soin",
  amplificateur: "Amplificateur",
  controle: "Contrôle",
  polyvalent: "Polyvalent",
};

// Raretés du jeu, de la plus basse à la plus haute (cadres bleu, violet, orange, rouge).
export const RARETES = ["R", "SSR", "UR", "CR"];
export const NOMS_RARETES = { R: "R · bleu", SSR: "SSR · violet", UR: "UR · orange", CR: "CR · rouge" };
// Anciennes valeurs de l'app → raretés du jeu.
export const ANCIENNES_RARETES = { Commun: "R", Rare: "R", "Épique": "SSR", "Légendaire": "UR", Mythique: "CR" };
export const TIERS = ["SS", "S", "A", "B", "C"];

// Paliers de promotion décrits par les guides.
export const PALIERS_PROMOTION = [
  { niveau: 3, bonus: "Régénération d'énergie", source: "ProGameGeek" },
  { niveau: 6, bonus: "Amélioration propre au héros", source: "ProGameGeek" },
  { niveau: 9, bonus: "Amélioration propre au héros", source: "ProGameGeek" },
  { niveau: 12, bonus: "Vitesse d'attaque", source: "ProGameGeek" },
  { niveau: 15, bonus: "Dégâts finaux", source: "ProGameGeek" },
];

const PGG = "ProGameGeek";
const TREY = "TreyExGaming";

// Rareté, niveau de départ et icône de type relevés sur les captures du jeu
// (version anglaise, novembre 2026). Le type physique/magique est déduit de
// l'icône de la carte (lame = physique, spirale = magique) : à confirmer.
const h = (o) => ({ competences: "", aura: "", note: "", aVerifier: true, source: "Captures du jeu", ...o });
const CAP = "Captures du jeu";

export const HEROS_DEPART = [
  // CR (cadre rouge)
  h({ id: "archangel", nom: "Archangel", rarete: "CR", type: "magique", effet: "aucun", role: "polyvalent", tier: "SS",
    competences: "Ultime « Divine Wrath » : dégâts de zone et +30 % de critique aux héros alliés pendant 8 s. Perforation sur une autre attaque.",
    aura: "Déployée : +10 % de vitesse d'attaque aux héros alliés.", note: "Choix SS selon un tier list.", source: `${TREY}, ${CAP}` }),
  h({ id: "spiker", nom: "Spiker", rarete: "CR", type: "physique", effet: "aucun", role: "amplificateur", tier: "SS",
    competences: "Ultime : augmente les dégâts que toute l'équipe inflige à la cible.", note: "Un des meilleurs pour abattre les boss.", source: `${TREY}, ${CAP}` }),
  h({ id: "metaman", nom: "Metaman", rarete: "CR", type: "physique", effet: "aucun", role: "polyvalent", tier: "S",
    competences: "Ultime : gros dégâts tout en se protégeant.", aura: "Déployé : +15 % de PV à toutes les unités.", source: `${TREY}, ${CAP}` }),
  h({ id: "lazerman", nom: "Laserman", alias: ["Lazerman"], rarete: "CR", type: "physique", effet: "aucun", role: "mono", tier: "S",
    note: "Choix préféré pour les dégâts mono-cible.", source: `${TREY}, ${CAP}` }),
  h({ id: "ghost-captain", nom: "Ghost Captain", rarete: "CR", type: "physique", effet: "saignement", role: "mono", tier: "A",
    competences: "Ultime : Saignement pendant 6 s.", aura: "Réduit la défense physique des ennemis proches.", note: "Cœur de l'équipe Saignement.", source: `${PGG}, ${CAP}` }),
  h({ id: "bride-wraith", nom: "Bride Wraith", rarete: "CR", type: "magique", effet: "brulure", role: "zone", tier: "A",
    note: "Équipe Brûlure : met la pression sur les groupes.", source: `${PGG}, ${CAP}` }),
  h({ id: "blue-giant", nom: "Blue Giant", rarete: "CR", type: "physique", effet: "saignement", role: "zone", tier: "B",
    note: "Saignement et dégâts de zone.", source: `${PGG}, ${CAP}` }),
  h({ id: "joker", nom: "Joker", rarete: "CR", type: "physique", effet: "repousser", role: "zone", tier: "C",
    competences: "Ultime : 3 coups de zone, chance de repousser les ennemis.", aura: "Déployé : +10 % de défense physique aux alliés.", source: `${TREY}, ${CAP}` }),
  h({ id: "thundermaster", nom: "Thundermaster", rarete: "CR", type: "magique", effet: "paralysie", role: "zone", tier: "B",
    note: "Nom évoquant la foudre : effet Paralysie supposé.", source: CAP }),
  h({ id: "cannon-girl", nom: "Cannon Girl", rarete: "CR", type: "physique", effet: "aucun", role: "zone", tier: "A",
    competences: "Ultime : charge 5 s puis tire un coup massif (400 % de l'ATK) sur tous les ennemis de sa trajectoire.", aura: "Déployée : +10 % de vitesse d'attaque aux héros alliés.",
    note: "Excellente contre les vagues regroupées ; la longue charge est son point faible.", source: `${PGG}, ${TREY}` }),
  h({ id: "mad-alice", nom: "Mad Alice", rarete: "CR", type: "physique", effet: "aucun", role: "mono", tier: "B", source: CAP }),
  h({ id: "puncher", nom: "Puncher", rarete: "CR", type: "magique", effet: "aucun", role: "mono", tier: "B",
    note: "Cité dans une équipe anti-boss avec Archangel, Spiker, Laserman et Metaman.", source: `${PGG}, ${CAP}` }),
  // UR (cadre orange)
  h({ id: "oni-samurai", nom: "Oni Samurai", rarete: "UR", type: "physique", effet: "aucun", role: "mono", tier: "A", note: "Membre de l'équipe Progression.", source: `${PGG}, ${CAP}` }),
  h({ id: "hades", nom: "Hades", rarete: "UR", type: "magique", effet: "aucun", role: "zone", tier: "A", note: "Membre des équipes Progression, Saignement et Gel.", source: `${PGG}, ${CAP}` }),
  h({ id: "scarecrow", nom: "Scarecrow", rarete: "UR", type: "physique", effet: "saignement", role: "mono", tier: "B", note: "Source de Saignement importante.", source: `${PGG}, ${CAP}` }),
  h({ id: "pinocchio", nom: "Pinocchio", rarete: "UR", type: "magique", effet: "gel", role: "zone", tier: "C", note: "Équipe Gel : Gel et dégâts de zone.", source: `${PGG}, ${CAP}` }),
  h({ id: "redhood", nom: "Redhood", rarete: "UR", type: "magique", effet: "brulure", role: "amplificateur", tier: "B", note: "Équipe Brûlure : augmente les dégâts.", source: `${PGG}, ${CAP}` }),
  h({ id: "plague-doctor", nom: "Plague Doctor", rarete: "UR", type: "magique", effet: "poison", role: "zone", tier: "B", note: "Effet Poison supposé d'après le nom.", source: CAP }),
  h({ id: "medusa", nom: "Medusa", rarete: "UR", type: "magique", effet: "etourdissement", role: "controle", tier: "B", note: "Effet de contrôle supposé d'après le nom.", source: CAP }),
  h({ id: "sherlock", nom: "Sherlock", rarete: "UR", type: "physique", effet: "aucun", role: "mono", tier: "B", source: CAP }),
  h({ id: "evil-bane", nom: "Evil Bane", rarete: "UR", type: "magique", effet: "aucun", role: "zone", tier: "B", source: CAP }),
  h({ id: "count-dracula", nom: "Count Dracula", rarete: "UR", type: "physique", effet: "saignement", role: "mono", tier: "B", note: "Effet Saignement supposé d'après le nom.", source: CAP }),
  h({ id: "ruin-hunter", nom: "Ruin Hunter", rarete: "UR", type: "physique", effet: "aucun", role: "mono", tier: "B", source: CAP }),
  h({ id: "double-faces", nom: "Double Faces", rarete: "UR", type: "physique", effet: "aucun", role: "polyvalent", tier: "B", source: CAP }),
  // SSR (cadre violet)
  h({ id: "ghoul", nom: "Ghoul", rarete: "SSR", type: "physique", effet: "aucun", role: "mono", tier: "C", source: CAP }),
  h({ id: "drillman", nom: "Drillman", rarete: "SSR", type: "physique", effet: "aucun", role: "mono", tier: "C", source: CAP }),
  h({ id: "little-mage", nom: "Little Mage", rarete: "SSR", type: "magique", effet: "aucun", role: "zone", tier: "C", source: CAP }),
  h({ id: "strawhat", nom: "Strawhat", rarete: "SSR", type: "magique", effet: "aucun", role: "mono", tier: "C", source: CAP }),
  h({ id: "jinx", nom: "Jinx", rarete: "SSR", type: "physique", effet: "aucun", role: "zone", tier: "C", source: CAP }),
  h({ id: "stapler-girl", nom: "Stapler Girl", rarete: "SSR", type: "physique", effet: "aucun", role: "mono", tier: "C", source: CAP }),
  h({ id: "reaper", nom: "Reaper", rarete: "SSR", type: "physique", effet: "aucun", role: "mono", tier: "C", source: CAP }),
  h({ id: "twin-gunner", nom: "Twin Gunner", rarete: "SSR", type: "magique", effet: "aucun", role: "zone", tier: "C", source: CAP }),
  // Cités par les guides, absents des captures de collection reçues
  h({ id: "bright-spirit", nom: "Bright Spirit", rarete: "UR", type: "magique", effet: "aucun", role: "soin", tier: "S", note: "Un des meilleurs soigneurs.", source: PGG }),
  h({ id: "poison-knight", nom: "Poison Knight", rarete: "UR", type: "physique", effet: "poison", role: "mono", tier: "S", note: "Très gros dégâts mono-cible contre les boss.", source: PGG }),
  h({ id: "poseidon", nom: "Poseidon", rarete: "CR", type: "magique", effet: "aucun", role: "zone", tier: "A", competences: "Perforation (Pierce) : traverse les rangs d'ennemis.", source: `${PGG}, ${TREY}` }),
  h({ id: "frosthealer", nom: "Frosthealer", alias: ["Frost Healer"], rarete: "UR", type: "magique", effet: "gel", role: "soin", tier: "A",
    competences: "Attaque normale : rend 300 PV à la Porte. Ultime : dégâts de zone autour de la Porte et Gel 3 s.", aura: "Déployée : +15 % de PV à toutes les unités.", source: PGG }),
  h({ id: "pyro-mech", nom: "Pyrogon Mech", alias: ["Pyro Mech"], rarete: "UR", type: "physique", effet: "brulure", role: "amplificateur", tier: "A",
    competences: "Passif : +5 % de dégâts de Brûlure subis par cumul de Brûlure, jusqu'à +50 %.", source: PGG }),
  h({ id: "flame-demon", nom: "Flame Demon", rarete: "UR", type: "magique", effet: "brulure", role: "zone", tier: "A", source: PGG }),
  h({ id: "power-ogre", nom: "Power Ogre", rarete: "UR", type: "physique", effet: "aucun", role: "mono", tier: "A", source: PGG }),
  h({ id: "omicron", nom: "Omicron", rarete: "UR", type: "magique", effet: "aucun", role: "zone", tier: "A", source: PGG }),
  h({ id: "archmage", nom: "Archmage", rarete: "UR", type: "magique", effet: "gel", role: "controle", tier: "B", competences: "Applique Gel avec son ultime et sa compétence de base.", source: PGG }),
];

export const EQUIPES_REFERENCE = [
  { nom: "Progression", but: "Résultats fiables partout", heros: ["metaman", "archangel", "hades", "spiker", "oni-samurai"], source: PGG },
  { nom: "Anti-boss", but: "Mélange de types contre les boss ; Frosthealer à la place de Puncher si la Porte tombe", heros: ["archangel", "spiker", "lazerman", "metaman", "puncher"], source: PGG },
  { nom: "Équilibrée", but: "Carry mono-cible, zone, double soin : solide partout", heros: ["power-ogre", "poison-knight", "poseidon", "frosthealer", "bright-spirit"], source: PGG },
  { nom: "Vagues", but: "Cannon Girl et Poseidon nettoient, Frosthealer tient la Porte", heros: ["cannon-girl", "poseidon", "metaman", "archangel", "frosthealer"], source: `${PGG}, ${TREY}` },
  { nom: "Brûlure", but: "Pyrogon Mech et Redhood amplifient, Bride Wraith presse les groupes", heros: ["archangel", "lazerman", "pyro-mech", "bride-wraith", "redhood"], source: PGG },
  { nom: "Saignement", but: "Dégâts soutenus contre les ennemis résistants", heros: ["hades", "archangel", "scarecrow", "blue-giant", "ghost-captain"], source: PGG },
  { nom: "Gel", but: "Contrôle et survie", heros: ["frosthealer", "archangel", "hades", "archmage", "pinocchio"], source: PGG },
];

export const TRAITS = {
  sbires: "Vagues de sbires",
  pvEleves: "PV très élevés",
  regen: "Se régénère",
  frappeFort: "Frappe fort",
  rapide: "Rapide",
  armure: "Armure / bouclier",
};

// Aucune liste publique des boss n'a été trouvée : ce sont des modèles par
// archétype. Ajoutez les vrais boss depuis l'écran d'avant combat du jeu.
const b = (o) => ({ chapitre: "", forces: "", specificites: "", faiblesses: [], resistances: [], traits: [], modele: true, ...o });
export const BOSS_DEPART = [
  b({ id: "modele-vagues", nom: "Vagues de sbires", forces: "Nombre, arrivent vite à la Porte", traits: ["sbires", "rapide"] }),
  b({ id: "modele-tank", nom: "Boss blindé", forces: "Énorme réserve de PV, armure", faiblesses: ["magique"], resistances: ["physique"], traits: ["pvEleves", "armure"] }),
  b({ id: "modele-regen", nom: "Boss régénérant", forces: "Se soigne pendant le combat", faiblesses: ["brulure"], resistances: ["gel"], traits: ["regen", "pvEleves"] }),
  b({ id: "modele-cogneur", nom: "Boss cogneur", forces: "Gros dégâts sur la Porte", faiblesses: ["saignement"], resistances: ["brulure"], traits: ["frappeFort"] }),
];

export const STATS_ARTEFACT = {
  patk: "P.ATK",
  matk: "M.ATK",
  pv: "PV",
  def: "Défense",
  crit: "Critique",
  vitesse: "Vitesse d'attaque",
  soin: "Soin",
  effet: "Effets (durée / dégâts)",
};

// Curios (le jeu les appelle ainsi ; ce sont les « artefacts » de l'app).
// 10 sets × 4 raretés, relevés sur le Curio Codex et le Set Preview du jeu.
export const SETS_CURIO = {
  "force-nature": { nom: "Force of Nature", effet: "DMG contre les ennemis au-dessus de 50 % de PV +60 %", affinite: { roles: ["mono", "amplificateur"] } },
  "total-annihilation": { nom: "Total Annihilation", effet: "DMG contre les ennemis sous 50 % de PV +60 %", affinite: { roles: ["mono", "zone", "polyvalent"] } },
  "sky-scorch": { nom: "Sky Scorch", effet: "Chaque Brûlure appliquée : DMG +0,3 %, max 30 %", affinite: { effet: "brulure" } },
  "wild-bloodlust": { nom: "Wild Bloodlust", effet: "Chaque Saignement appliqué : DMG +0,3 %, max 30 %", affinite: { effet: "saignement" } },
  "thunder-tremor": { nom: "Thunder Tremor", effet: "Chaque Paralysie infligée : DMG +0,3 %, max 30 %", affinite: { effet: "paralysie" } },
  "sundered-spirit": { nom: "Sundered Spirit", effet: "En combat, Crit DMG supplémentaire égal à 1 × votre taux de critique", affinite: { roles: ["mono", "polyvalent"] } },
  "chaos-incarnate": { nom: "Chaos Incarnate", effet: "Après un Stun, les ennemis subissent +30 % de DMG pendant 8 s", affinite: { effet: "etourdissement" } },
  "brutal-carnage": { nom: "Brutal Carnage", effet: "En infligeant Knock : dégâts bruts égaux à 75 % de l'ATK", affinite: { effet: "repousser" } },
  "absolute-zero": { nom: "Absolute Zero", effet: "En infligeant Gel : 2 % des PV actuels par seconde, jusqu'à 75 % de l'ATK", affinite: { effet: "gel" } },
  "wild-rhapsody": { nom: "Wild Rhapsody", effet: "À chaque attaque de base : DMG Boost et Final DMG Boost de toute l'équipe +0,2 %, jusqu'à 20 %", affinite: { roles: ["soin", "amplificateur", "polyvalent", "zone"] } },
};
const c = (id, nom, rarete, set) => ({ id, nom, rarete, set, stat: "set", effet: "", source: "Curio Codex" });
export const CURIOS_DEPART = [
  c("maniac-bonesaw", "Maniac Bonesaw", "CR", "force-nature"), c("carnivore-stapler", "Carnivore Stapler", "UR", "force-nature"),
  c("cannibal-shelf", "Cannibal Shelf", "SSR", "force-nature"), c("bone-drill", "Bone Drill", "R", "force-nature"),
  c("stygian-ouija", "Stygian Ouija", "CR", "total-annihilation"), c("necropedia", "Necropedia", "UR", "total-annihilation"),
  c("skeleton-pendant", "Skeleton Pendant", "SSR", "total-annihilation"), c("evil-eye-bracelet", "Evil-Eye Bracelet", "R", "total-annihilation"),
  c("purgatory-oven", "Purgatory Oven", "CR", "sky-scorch"), c("dynamite-battery", "Dynamite Battery", "UR", "sky-scorch"),
  c("ghost-lighter", "Ghost Lighter", "SSR", "sky-scorch"), c("sacrifice-candle", "Sacrifice Candle", "R", "sky-scorch"),
  c("glutton-vacuum", "Glutton Vacuum", "CR", "wild-bloodlust"), c("gore-grinder", "Gore Grinder", "UR", "wild-bloodlust"),
  c("vampire-broom", "Vampire Broom", "SSR", "wild-bloodlust"), c("rusty-knife", "Rusty Knife", "R", "wild-bloodlust"),
  c("quantum-washer", "Quantum Washer", "CR", "thunder-tremor"), c("spooky-screen", "Spooky Screen", "UR", "thunder-tremor"),
  c("shock-powerboard", "Shock Powerboard", "SSR", "thunder-tremor"), c("vicious-lantern", "Vicious Lantern", "R", "thunder-tremor"),
  c("brawler-joystick", "Brawler Joystick", "CR", "sundered-spirit"), c("killer-camera", "Killer Camera", "UR", "sundered-spirit"),
  c("glutton-can", "Glutton Can", "SSR", "sundered-spirit"), c("rotten-scissors", "Rotten Scissors", "R", "sundered-spirit"),
  c("abyssal-mask", "Abyssal Mask", "CR", "chaos-incarnate"), c("psycho-headphones", "Psycho Headphones", "UR", "chaos-incarnate"),
  c("tentacle-plug", "Tentacle Plug", "SSR", "chaos-incarnate"), c("eyeball-wrench", "Eyeball Wrench", "R", "chaos-incarnate"),
  c("cyclone-fan", "Cyclone Fan", "CR", "brutal-carnage"), c("haunted-faucet", "Haunted Faucet", "UR", "brutal-carnage"),
  c("backward-watch", "Backward Watch", "SSR", "brutal-carnage"), c("elastic-measure", "Elastic Measure", "R", "brutal-carnage"),
  c("cryo-cabinet", "Cryo Cabinet", "CR", "absolute-zero"), c("devil-router", "Devil Router", "UR", "absolute-zero"),
  c("scream-egg", "Scream Egg", "SSR", "absolute-zero"), c("whitening-brush", "Whitening Brush", "R", "absolute-zero"),
  c("deadly-phonograph", "Deadly Phonograph", "CR", "wild-rhapsody"), c("skeleton-umbrella", "Skeleton Umbrella", "UR", "wild-rhapsody"),
  c("esports-bubble-tea", "Esports Bubble Tea", "SSR", "wild-rhapsody"), c("poisoned-apple", "Poisoned Apple", "R", "wild-rhapsody"),
];
export const ARTEFACTS_DEPART = CURIOS_DEPART;

export const CURIO_VAULT = {
  bonusParNiveau: "Team ATK +2, Team HP +20, Team All DEF +0,4 par niveau",
  paliers: [{ niveau: 400, bonus: "Team DMG Boost +12 %, Team DMG Immunity +12 %" }],
};

// Pièges (Trap) et bêtes (Beast), relevés sur les captures.
export const PIEGES_DEPART = [
  { id: "iron-fist", nom: "Iron Fist", rarete: "UR", competence: "Frenzy Fists", effet: "etourdissement" },
  { id: "blood-hammer", nom: "Blood Hammer", rarete: "UR", competence: "", effet: "aucun" },
  { id: "molten-furnace", nom: "Molten Furnace", rarete: "SSR", competence: "Inferno Breath", effet: "brulure" },
  { id: "lethal-fence", nom: "Lethal Fence", rarete: "SSR", competence: "Magnetic Dead Zone", effet: "paralysie" },
  { id: "demon-spike", nom: "Demon Spike", rarete: "SSR", competence: "", effet: "aucun" },
  { id: "doomsday-cyborg", nom: "Doomsday Cyborg", rarete: "UR", competence: "", effet: "aucun", fragments: 50 },
  { id: "calamity-altar", nom: "Calamity Altar", rarete: "UR", competence: "", effet: "aucun", fragments: 50 },
  { id: "metarooster", nom: "Metarooster", rarete: "UR", competence: "", effet: "aucun", fragments: 50 },
];
export const BETES_DEPART = [
  { id: "titan-mammoth", nom: "Titan Mammoth", rarete: "UR", type: "physique" },
  { id: "dreamweaver-spider", nom: "Dreamweaver Spider", rarete: "UR", type: "magique" },
  { id: "colossal-ape", nom: "Colossal Ape", rarete: "SSR", type: "physique" },
  { id: "alien-critter", nom: "Alien Critter", rarete: "SSR", type: "magique" },
  { id: "wings-of-death", nom: "Wings of Death", rarete: "UR", type: "magique", fragments: 1 },
  { id: "cyanic-tyrant", nom: "Cyanic Tyrant", rarete: "UR", type: "magique", fragments: 1 },
  { id: "scavenger-kraken", nom: "Scavenger Kraken", rarete: "CR", type: "physique", fragments: 1 },
  { id: "storm-griffin", nom: "Storm Griffin", rarete: "CR", type: "magique", fragments: 1 },
];
export const PLACES_BETES = [{ places: 2, condition: "" }, { places: 3, condition: "Main Stage 220" }];

// Aucune liste publique des skins n'a été trouvée. Le jeu propose des skins
// dorés lors d'événements (Hot Spring Stroll, Halloween avec des bonbons) et un
// skin dans le pack de pré-inscription (fiches App Store / Google Play).
export const SKINS_DEPART = [];

// Options payantes repérées. Les prix ne sont publiés que pour deux packs.
export const OFFRES_DEPART = [
  { id: "value-pass", nom: "Value Pass", categorie: "pass", prix: "Boutique du jeu (renouvelable)",
    contenu: "À la souscription : 300 diamants. Vitesse de combat x2, plafond d'AFK +4 h, Quick Sweeps illimités, Multi-Stamina Sweep. Chaque jour : 10 diamants, 30 Stamina, 100 or.",
    avantages: ["vitesse2x", "sweep", "idle", "ressourcesQuotidiennes"], journalier: { diamants: 10, endurance: 30, or: 100 }, bonusSouscription: { diamants: 300 }, source: "Écran Value Pass" },
  { id: "deluxe-pass", nom: "Deluxe Pass", categorie: "pass", prix: "10,99 $",
    contenu: "À la souscription : 600 diamants. Battle AFK Mode (combat automatique), Story Stamina cap +20, Story idle rewards +30 %, 2e emplacement de Guild Tech. Chaque jour : 20 diamants, 1 parchemin, 200 or.",
    avantages: ["auto", "staminaMax", "idle30", "guildeTech", "ressourcesQuotidiennes"], journalier: { diamants: 20, or: 200 }, bonusSouscription: { diamants: 600 }, source: "Écran Value Pass" },
  { id: "abonnement", nom: "Privileges", categorie: "abonnement", prix: "Mensuel, 3 mois ou 1 an : prix dans la boutique du jeu",
    contenu: "Avantages détaillés dans la boutique du jeu. La vitesse x2 et le combat AFK viennent des passes (Value Pass, Deluxe Pass).", avantages: [], source: "Écran principal, fiche Google Play" },
  { id: "ad-free", nom: "Ad-Free", categorie: "abonnement", prix: "Boutique du jeu", contenu: "Supprime les publicités.", avantages: ["sansPub"], source: "Écran principal" },
  { id: "super-value-fund", nom: "Super Value Fund", categorie: "pass", prix: "Boutique du jeu", contenu: "Fonds à récompenses progressives.", avantages: ["ressourcesQuotidiennes"], source: "Écran principal" },
  { id: "first-top-up", nom: "1st Top-Up", categorie: "pack", prix: "Premier achat", contenu: "Bonus du premier achat.", avantages: ["tirages"], source: "Écran principal" },
  { id: "midnight-gift", nom: "Midnight Gift", categorie: "pack", prix: "Boutique du jeu", contenu: "", avantages: [], source: "Écran principal" },
  { id: "shadow-recruitment", nom: "Shadow Recruitment", categorie: "evenement", prix: "Variable", contenu: "Recrutement de héros en événement.", avantages: ["tirages"], source: "Écran principal" },
  { id: "link-celebration", nom: "Link Celebration", categorie: "evenement", prix: "Variable", contenu: "", avantages: [], source: "Écran principal" },
  { id: "community-offers", nom: "Community Offers", categorie: "pack", prix: "Variable", contenu: "", avantages: [], source: "Écran principal" },
  { id: "check-in", nom: "Check-In Event", categorie: "evenement", prix: "Gratuit", contenu: "Récompenses de connexion quotidienne.", avantages: ["ressourcesQuotidiennes"], source: "Écran principal" },
  { id: "offres-vedette", nom: "Featured Events", categorie: "evenement", prix: "Variable", contenu: "Événements et packs mis en avant, riches en matériaux.", avantages: ["materiaux"], source: `Écran principal, ${PGG}` },
  { id: "pack-099", nom: "Pack 0,99 $", categorie: "pack", prix: "0,99 $", contenu: "", avantages: [], source: "App Store" },
  { id: "pack-299", nom: "Pack 2,99 $", categorie: "pack", prix: "2,99 $", contenu: "", avantages: [], source: "App Store, Google Play" },
  { id: "skins-dores", nom: "Skins dorés d'événement", categorie: "evenement", prix: "Tirages / monnaie d'événement",
    contenu: "Hot Spring Stroll (tirages), Halloween Fright (bonbons à échanger).", avantages: [], source: "App Store, écran principal" },
];

export const AVANTAGES = {
  auto: "Combat automatique",
  vitesse2x: "Vitesse x2",
  ressourcesQuotidiennes: "Ressources chaque jour",
  materiaux: "Matériaux de progression",
  tirages: "Tirages de héros",
  sansPub: "Sans publicité",
  sweep: "Quick Sweeps illimités",
  idle: "Plafond d'AFK +4 h",
  staminaMax: "Stamina max +20",
  idle30: "Gains d'AFK +30 %",
  guildeTech: "2e emplacement Guild Tech",
};

export const CONSEILS_SOURCES = [
  { texte: "Concentrez les ressources sur 5 héros principaux.", source: PGG },
  { texte: "Priorisez les promotions 6 et 9 : elles débloquent l'amélioration propre au héros.", source: PGG },
  { texte: "Le niveau de la Porte plafonne celui du Lit : montez-les ensemble.", source: PGG },
  { texte: "Lisez les faiblesses et résistances du boss sur l'écran d'avant combat avant de choisir l'équipe.", source: PGG },
  { texte: "Artefacts P.ATK sur les héros physiques, M.ATK sur les magiques.", source: PGG },
  { texte: "Gardez vos devises pour les Featured Offer Packs et la boutique d'événement.", source: PGG },
  { texte: "Codes cadeaux : Profil › Paramètres › Échanger un code (une fois par compte).", source: PGG },
];

// Où dépenser chaque ressource. Diamants et Soul Flame sont les devises citées
// par les codes cadeaux ; le reste est une règle générale de jeu à invocation.
export const DEPENSES = [
  { ressource: "Or", conseil: "Porte et Lit d'abord, puis les niveaux des 5 héros de l'équipe. Jamais hors équipe." },
  { ressource: "Diamants", conseil: "Tirages sur la bannière qui a le Mythique manquant à l'équipe. Pas de rafraîchissement de boutique." },
  { ressource: "Soul Flame", conseil: "Vérifiez son usage dans le jeu, puis réservez-la aux 5 héros de l'équipe." },
  { ressource: "Matériaux de promotion", conseil: "Promotions 6 puis 9 : carry, puis amplificateur, puis soigneur." },
  { ressource: "Matériaux d'artefact", conseil: "Sur les artefacts au bon type (P.ATK / M.ATK) du carry. Rien sur Commun ou Rare." },
  { ressource: "Énergie", conseil: "Ne la laissez jamais plafonner : étape la plus haute battue de façon fiable." },
];

// Ressources du compte. `motsOcr` : libellés reconnus sur les captures (EN/FR).
export const RESSOURCES = [
  { id: "diamants", nom: "Diamants", motsOcr: ["diamonds", "diamond", "diamants", "diamant", "gems", "gemmes"],
    conseil: "Gardez-les pour les tirages de 10 (2 200 diamants) sur la bannière qui a le Mythique manquant à l'équipe." },
  { id: "or", nom: "Or", motsOcr: ["gold", "or", "coins", "pieces"],
    conseil: "Porte et Lit d'abord, puis les niveaux des 5 héros de l'équipe." },
  { id: "flammeAme", nom: "Soul Flame (orbe violet)", motsOcr: ["soul flame", "soulflame", "soulfire", "soul fire", "flamme d'ame", "flamme ame"],
    conseil: "Ressource clé pour renforcer le compte : réservez-la aux 5 héros de l'équipe." },
  { id: "pacteHeros", nom: "Hero Pact", motsOcr: ["hero pact", "hero pacts", "hero contract", "hero contracts", "pacte de heros", "pacte heros", "contrat de heros"],
    conseil: "Sert aux invocations de héros : utilisez-les avant les diamants." },
  { id: "cuir", nom: "Leather (amélioration Gear)", motsOcr: ["leather", "cuir"],
    conseil: "Matériau d'amélioration : sur le carry et l'amplificateur d'abord." },
  { id: "endurance", nom: "Stamina (viande)", motsOcr: ["stamina", "energy", "endurance", "energie"],
    conseil: "Ne la laissez jamais plafonner : étape la plus haute battue de façon fiable." },
];

export const MODES = [
  { id: "campagne", nom: "Campagne (Main Stage)", note: "Débloque les autres modes. Main Stage 220 ouvre la 3e place de bête." },
  { id: "afk", nom: "AFK", note: "Gains passifs : récupérez-les plusieurs fois par jour." },
  { id: "infinity-fort", nom: "Infinity Fort", note: "Mode à étages." },
  { id: "infinity-train", nom: "Infinity Train", note: "Arrêts (« Stop ») successifs. Chaque jour : 10 tentatives de récompense et 10 tentatives d'étape, remises à zéro au rafraîchissement. Sweep pour les arrêts déjà battus. Récompenses de progression aux vagues 1 à 5 (flammes, tickets, parchemin) ; tickets à dépenser dans l'Exchange Shop." },
  { id: "dimension-link", nom: "Dimension Link", note: "" },
  { id: "capital-defense", nom: "Capital Defense", note: "Mode saisonnier." },
  { id: "phantom-killzone", nom: "Phantom Killzone", note: "Ouvert de 12:00 à 14:00." },
  { id: "arena", nom: "Arena", note: "" },
  { id: "evenement", nom: "Événements (Halloween Fright…)", note: "Monnaie d'événement à échanger contre des skins dorés." },
];

export const CODES_CADEAUX = [
  { code: "knock2026", recompense: "Diamants et Soul Flame" },
  { code: "knock1m", recompense: "Récompenses variées" },
  { code: "knock500k", recompense: "Récompenses variées" },
  { code: "knock100k", recompense: "Récompenses variées" },
  { code: "knockdc", recompense: "Récompenses variées" },
];

export const ASTUCES_JEU = [
  { texte: "En combat, une amélioration de Porte remet ses PV au maximum : gardez-la pour le boss final ou une vague difficile.", source: PGG },
  { texte: "Room Research (depuis votre personnage sur l'écran principal) donne des bonus permanents et relève les plafonds du Lit et de la Porte.", source: PGG },
  { texte: "Un tirage de 10 coûte 2 200 diamants : évitez les invocations standard au coup par coup.", source: PGG },
  { texte: "Visez l'étape 20 de la campagne avant de farmer le meilleur équipement.", source: PGG },
];

// Ordre d'investissement dans le noyau de 5 (guides) : à qui donner les ressources d'abord.
export const ORDRE_INVESTISSEMENT = [
  { poste: "Carry", roles: ["mono", "polyvalent", "zone"], pourquoi: "Il fait l'essentiel des dégâts : chaque niveau et chaque promotion se voient sur l'étape franchie." },
  { poste: "Synergie", roles: ["amplificateur"], pourquoi: "Il multiplie les dégâts du carry (amplification, effet partagé avec le set de curios)." },
  { poste: "Soutien", roles: ["soin", "controle"], pourquoi: "Il garde la Porte en vie : sans lui, le carry n'a pas le temps de finir le boss." },
  { poste: "Dégâts secondaires", roles: ["zone", "mono", "polyvalent"], pourquoi: "Il couvre ce que le carry fait mal (vagues ou boss)." },
  { poste: "Poste libre", roles: [], pourquoi: "À changer selon le boss : c'est le héros qu'on n'investit qu'au minimum." },
];

export const PRINCIPES = [
  { titre: "Un noyau de 5, pas plus", texte: "Le jeu a un système de Résonance : 5 héros bien montés valent mieux que 15 moyens. Tout l'EXP, l'or et les matériaux de promotion vont au noyau." },
  { titre: "Les diamants se gardent", texte: "Un tirage de 10 coûte 2 200 diamants. Ne dépensez rien en tirages simples ni en rafraîchissements : attendez une bannière qui contient le héros CR qui manque à votre noyau." },
  { titre: "La Stamina, c'est de l'EXP de compte", texte: "Où qu'elle soit dépensée, elle fait monter le compte : ne la laissez jamais plafonner, et utilisez le Sweep sur l'étape la plus haute déjà battue." },
  { titre: "La campagne d'abord", texte: "Avancer dans les Main Stages débloque modes, places de bête (220) et meilleures récompenses : c'est le moteur de tout le reste." },
  { titre: "Les promotions clés", texte: "P3 (énergie), P6 et P9 (amélioration propre au héros), P12 (vitesse d'attaque), P15 (dégâts finaux) : visez un palier pour tout le noyau avant d'aller plus loin sur un seul héros." },
];
