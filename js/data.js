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
};

export const ROLES = {
  mono: "Mono-cible",
  zone: "Zone",
  soin: "Soin",
  amplificateur: "Amplificateur",
  controle: "Contrôle",
  polyvalent: "Polyvalent",
};

export const RARETES = ["Commun", "Rare", "Épique", "Légendaire", "Mythique"];
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

const h = (o) => ({ competences: "", aura: "", note: "", aVerifier: true, ...o });

export const HEROS_DEPART = [
  h({ id: "archangel", nom: "Archangel", rarete: "Mythique", type: "magique", effet: "aucun", role: "polyvalent", tier: "SS",
    competences: "Ultime « Divine Wrath » : dégâts de zone et +30 % de critique aux héros alliés pendant 8 s. Perforation sur une autre attaque.",
    aura: "Déployée : +10 % de vitesse d'attaque aux héros alliés.", note: "Choix SS évident selon un tier list Mythique.", source: TREY }),
  h({ id: "spiker", nom: "Spiker", rarete: "Mythique", type: "physique", effet: "aucun", role: "amplificateur", tier: "SS",
    competences: "Ultime : augmente les dégâts que toute l'équipe inflige à la cible.", note: "Un des meilleurs pour abattre les boss.", source: TREY }),
  h({ id: "metaman", nom: "Metaman", rarete: "Mythique", type: "magique", effet: "aucun", role: "polyvalent", tier: "S",
    competences: "Ultime : inflige de gros dégâts tout en se protégeant.", aura: "Déployé : +15 % de PV à toutes les unités.",
    note: "Bon nettoyage de zone si vous n'avez pas Poseidon.", source: TREY }),
  h({ id: "lazerman", nom: "Lazerman", rarete: "Mythique", type: "magique", effet: "aucun", role: "mono", tier: "S",
    note: "Choix préféré pour les dégâts mono-cible.", source: TREY }),
  h({ id: "poseidon", nom: "Poseidon", rarete: "Mythique", type: "magique", effet: "aucun", role: "zone", tier: "A",
    competences: "Perforation (Pierce) : traverse les rangs d'ennemis.", note: "Excellent contre les vagues.", source: `${PGG}, ${TREY}` }),
  h({ id: "ghost-captain", nom: "Ghost Captain", rarete: "Mythique", type: "physique", effet: "saignement", role: "mono", tier: "A",
    competences: "Ultime : Saignement pendant 6 s.", aura: "Réduit la défense physique des ennemis proches.",
    note: "Cœur de l'équipe Saignement.", source: `${PGG}, ${TREY}` }),
  h({ id: "hades", nom: "Hades", rarete: "Mythique", type: "magique", effet: "aucun", role: "zone", tier: "A",
    note: "Membre de l'équipe Progression.", source: PGG }),
  h({ id: "oni-samurai", nom: "Oni Samurai", rarete: "Mythique", type: "physique", effet: "aucun", role: "mono", tier: "A",
    note: "Membre de l'équipe Progression.", source: PGG }),
  h({ id: "joker", nom: "Joker", rarete: "Mythique", type: "physique", effet: "aucun", role: "zone", tier: "C",
    competences: "Ultime : 3 coups de zone, chance de repousser les ennemis.", aura: "Déployé : +10 % de défense physique aux unités alliées.",
    note: "Classé dernier du tier list Mythique.", source: TREY }),
  h({ id: "bright-spirit", nom: "Bright Spirit", rarete: "Légendaire", type: "magique", effet: "aucun", role: "soin", tier: "S",
    note: "Classé S. Un des meilleurs soigneurs.", source: PGG }),
  h({ id: "poison-knight", nom: "Poison Knight", rarete: "Légendaire", type: "physique", effet: "poison", role: "mono", tier: "S",
    note: "Classé S. Très gros dégâts mono-cible contre les boss.", source: PGG }),
  h({ id: "frosthealer", nom: "Frosthealer", rarete: "Légendaire", type: "magique", effet: "gel", role: "soin", tier: "A",
    competences: "Attaque normale : rend 300 PV à la Porte. Ultime : dégâts de zone autour de la Porte et Gel 3 s.",
    aura: "Déployée : +15 % de PV à toutes les unités.", note: "Apporte la survie à l'équipe Gel.", source: PGG }),
  h({ id: "pyro-mech", nom: "Pyrogon Mech", alias: ["Pyro Mech"], rarete: "Légendaire", type: "physique", effet: "brulure", role: "amplificateur", tier: "A",
    competences: "Passif : +5 % de dégâts de Brûlure subis par cumul de Brûlure, jusqu'à +50 %.", note: "Cœur de l'équipe Brûlure.", source: PGG }),
  h({ id: "flame-demon", nom: "Flame Demon", rarete: "Légendaire", type: "magique", effet: "brulure", role: "zone", tier: "A", note: "Classé A.", source: PGG }),
  h({ id: "power-ogre", nom: "Power Ogre", rarete: "Légendaire", type: "physique", effet: "aucun", role: "mono", tier: "A", note: "Classé A.", source: PGG }),
  h({ id: "omicron", nom: "Omicron", rarete: "Légendaire", type: "magique", effet: "aucun", role: "zone", tier: "A", note: "Classé A.", source: PGG }),
  h({ id: "bride-wraith", nom: "Bride Wraith", rarete: "Mythique", type: "magique", effet: "brulure", role: "zone", tier: "A",
    note: "Équipe Brûlure : met la pression sur les groupes.", source: `${PGG}, ${TREY}` }),
  h({ id: "redhood", nom: "Redhood", rarete: "Légendaire", type: "physique", effet: "brulure", role: "amplificateur", tier: "B",
    note: "Équipe Brûlure : augmente les dégâts. Classé bas par un autre tier list.", source: PGG }),
  h({ id: "scarecrow", nom: "Scarecrow", rarete: "Légendaire", type: "physique", effet: "saignement", role: "mono", tier: "B",
    note: "Source de Saignement importante de l'équipe Saignement.", source: PGG }),
  h({ id: "blue-giant", nom: "Blue Giant", rarete: "Mythique", type: "physique", effet: "saignement", role: "zone", tier: "B",
    note: "Saignement et dégâts de zone. Classé B (TreyExGaming), S ailleurs.", source: `${PGG}, ${TREY}` }),
  h({ id: "pinocchio", nom: "Pinocchio", rarete: "Légendaire", type: "magique", effet: "gel", role: "zone", tier: "C",
    note: "Équipe Gel : Gel et dégâts de zone.", source: PGG }),
  h({ id: "puncher", nom: "Puncher", rarete: "Légendaire", type: "physique", effet: "aucun", role: "mono", tier: "B",
    note: "Cité dans une équipe anti-boss avec Archangel, Spiker, Lazerman et Metaman.", source: PGG }),
  h({ id: "archmage", nom: "Archmage", rarete: "Légendaire", type: "magique", effet: "gel", role: "controle", tier: "B",
    competences: "Applique Gel avec son ultime et sa compétence de base.", source: PGG }),
];

export const EQUIPES_REFERENCE = [
  { nom: "Progression", but: "Résultats fiables partout", heros: ["metaman", "archangel", "hades", "spiker", "oni-samurai"], source: PGG },
  { nom: "Anti-boss", but: "Mélange de types contre les boss ; Frosthealer à la place de Puncher si la Porte tombe", heros: ["archangel", "spiker", "lazerman", "metaman", "puncher"], source: PGG },
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

// Aucune liste publique des artefacts n'a été trouvée : le catalogue démarre
// avec une entrée générique par statistique. Ajoutez les vrais noms.
export const ARTEFACTS_DEPART = Object.entries(STATS_ARTEFACT).map(([stat, libelle]) => ({
  id: `generique-${stat}`, nom: `Artefact ${libelle}`, stat, rarete: "Épique", effet: "", generique: true,
}));

// Aucune liste publique des skins n'a été trouvée. Le jeu propose des skins
// dorés lors d'événements (Hot Spring Stroll, Halloween avec des bonbons) et un
// skin dans le pack de pré-inscription (fiches App Store / Google Play).
export const SKINS_DEPART = [];

// Options payantes repérées. Les prix ne sont publiés que pour deux packs.
export const OFFRES_DEPART = [
  { id: "abonnement", nom: "Abonnement", categorie: "abonnement", prix: "Mensuel, 3 mois ou 1 an : prix dans la boutique du jeu",
    contenu: "Selon un avis App Store, débloque la vitesse x2 et le combat automatique.", avantages: ["auto", "vitesse2x"], source: "Fiche Google Play, avis App Store" },
  { id: "value-pass", nom: "Value Pass", categorie: "pass", prix: "À renseigner",
    contenu: "Passes de valeur cités par les joueurs ; durée (hebdo, mensuelle ou unique) non confirmée.", avantages: ["ressourcesQuotidiennes"], source: "Avis Google Play" },
  { id: "pack-099", nom: "Pack 0,99 $", categorie: "pack", prix: "0,99 $", contenu: "Contenu affiché dans la boutique du jeu.", avantages: [], source: "App Store" },
  { id: "pack-299", nom: "Pack 2,99 $", categorie: "pack", prix: "2,99 $", contenu: "Contenu affiché dans la boutique du jeu.", avantages: [], source: "App Store, Google Play" },
  { id: "offres-vedette", nom: "Featured Offer Packs", categorie: "pack", prix: "Variable",
    contenu: "Packs mis en avant, souvent riches en matériaux de progression.", avantages: ["materiaux"], source: PGG },
  { id: "preinscription", nom: "Pack de pré-inscription Deluxe", categorie: "evenement", prix: "Gratuit (pré-inscription)",
    contenu: "404 tirages, un skin de personnage, un héros orange aléatoire, une décoration limitée.", avantages: ["tirages"], source: "Fiche store" },
  { id: "skins-dores", nom: "Skins dorés d'événement", categorie: "evenement", prix: "Tirages / monnaie d'événement",
    contenu: "Hot Spring Stroll (tirages), Halloween Fright (bonbons à échanger).", avantages: [], source: "App Store" },
];

export const AVANTAGES = {
  auto: "Combat automatique",
  vitesse2x: "Vitesse x2",
  ressourcesQuotidiennes: "Ressources chaque jour",
  materiaux: "Matériaux de progression",
  tirages: "Tirages de héros",
  sansPub: "Sans publicité",
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
  { id: "flammeAme", nom: "Soul Flame", motsOcr: ["soul flame", "soulflame", "soulfire", "soul fire", "flamme d'ame", "flamme ame"],
    conseil: "Ressource clé pour renforcer le compte : réservez-la aux 5 héros de l'équipe." },
  { id: "pacteHeros", nom: "Hero Pact", motsOcr: ["hero pact", "hero pacts", "hero contract", "hero contracts", "pacte de heros", "pacte heros", "contrat de heros"],
    conseil: "Sert aux invocations de héros : utilisez-les avant les diamants." },
  { id: "cuir", nom: "Leather", motsOcr: ["leather", "cuir"],
    conseil: "Matériau d'amélioration : sur le carry et l'amplificateur d'abord." },
  { id: "endurance", nom: "Stamina", motsOcr: ["stamina", "energy", "endurance", "energie"],
    conseil: "Ne la laissez jamais plafonner : étape la plus haute battue de façon fiable." },
];

export const MODES = [
  { id: "campagne", nom: "Campagne principale", note: "Débloque les autres modes. Objectif conseillé : étape 20 avant de farmer l'équipement." },
  { id: "arena", nom: "Arena", note: "Débloquée par la campagne." },
  { id: "infinity-train", nom: "Infinity Train", note: "Débloqué par la campagne." },
  { id: "school-trip", nom: "School Trip", note: "Débloqué par la campagne." },
  { id: "endless-nightmare", nom: "Endless Nightmare", note: "Débloqué par la campagne." },
  { id: "beast", nom: "Beast", note: "Arrivé avec la mise à jour Spring Tales." },
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
