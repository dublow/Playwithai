/* =========================================================================
   ROYAUME — jeu de stratégie / gestion médiéval (vanilla JS)
   -------------------------------------------------------------------------
   Architecture :
     1. Définitions statiques (bâtiments, unités, technos, objectifs)
     2. État du jeu (state) + sauvegarde localStorage
     3. Calculs (coûts, production, puissance, combat)
     4. Rendu DOM
     5. Boucle de jeu + sauvegarde + progression hors-ligne
   Tout est conçu pour être facile à étendre : ajoute une entrée dans
   BUILDINGS / UNITS / TECHS / OBJECTIVES et le reste suit automatiquement.
   ========================================================================= */

"use strict";

const SAVE_KEY = "royaume.save.v1";
const TICK_MS = 200;                 // 5 ticks par seconde
const OFFLINE_CAP = 8 * 3600;        // 8 h de progression hors-ligne max
const OFFLINE_EFFICIENCY = 0.5;      // 50 % de la prod en hors-ligne

const RES = ["wood", "stone", "food", "gold"];
const RES_ICON = { wood: "🪵", stone: "🪨", food: "🌾", gold: "🪙" };
const RES_NAME = { wood: "bois", stone: "pierre", food: "nourriture", gold: "or" };

/* ========================== 1. DÉFINITIONS ============================== */

// Chaque bâtiment : coût de base, croissance du prix, production /s.
// `unlock(state)` décide quand le bâtiment apparaît (progression guidée).
const BUILDINGS = [
  {
    id: "bucheron", name: "Cabane de bûcheron", icon: "🪵",
    desc: "Produit du bois automatiquement.",
    baseCost: { wood: 10 }, growth: 1.15,
    produces: { res: "wood", amount: 0.6 },
    unlock: () => true,
  },
  {
    id: "ferme", name: "Ferme", icon: "🌾",
    desc: "Produit de la nourriture.",
    baseCost: { wood: 18, stone: 5 }, growth: 1.15,
    produces: { res: "food", amount: 0.7 },
    unlock: (s) => s.buildings.bucheron >= 1,
  },
  {
    id: "mine", name: "Mine", icon: "⛏️",
    desc: "Produit de la pierre.",
    baseCost: { wood: 28, food: 12 }, growth: 1.16,
    produces: { res: "stone", amount: 0.5 },
    unlock: (s) => s.buildings.ferme >= 1,
  },
  {
    id: "marche", name: "Marché", icon: "🏪",
    desc: "Génère de l'or grâce au commerce.",
    baseCost: { wood: 60, stone: 35 }, growth: 1.18,
    produces: { res: "gold", amount: 0.25 },
    unlock: (s) => s.buildings.mine >= 1,
  },
  {
    id: "caserne", name: "Caserne", icon: "🏯",
    desc: "Débloque le recrutement. +5 % puissance / niveau.",
    baseCost: { wood: 90, stone: 70, food: 40 }, growth: 1.20,
    produces: null,
    unlock: (s) => s.buildings.marche >= 1,
  },
  {
    id: "chateau", name: "Château", icon: "🏰",
    desc: "Débloque les technologies. +5 % production globale / niveau.",
    baseCost: { wood: 220, stone: 170, gold: 120 }, growth: 1.25,
    produces: null,
    unlock: (s) => s.buildings.caserne >= 1,
  },
];

// Unités militaires : coût fixe, puissance fixe.
const UNITS = [
  {
    id: "paysan", name: "Paysan", icon: "🧑‍🌾",
    desc: "Recrue de base, peu coûteuse.",
    cost: { food: 12 }, power: 1,
    unlock: (s) => s.buildings.caserne >= 1,
  },
  {
    id: "archer", name: "Archer", icon: "🏹",
    desc: "Bon rapport puissance / coût.",
    cost: { food: 18, wood: 25 }, power: 4,
    unlock: (s) => s.buildings.caserne >= 1,
  },
  {
    id: "chevalier", name: "Chevalier", icon: "🐎",
    desc: "Unité d'élite très puissante.",
    cost: { food: 35, stone: 25, gold: 30 }, power: 10,
    unlock: (s) => s.buildings.caserne >= 2,
  },
];

// Technologies : achat unique, effet permanent.
const TECHS = [
  {
    id: "haches", name: "Meilleures haches", icon: "🪓",
    desc: "+50 % de production de bois.",
    cost: { wood: 120, gold: 40 },
    unlock: (s) => s.buildings.chateau >= 1,
  },
  {
    id: "agriculture", name: "Agriculture", icon: "🚜",
    desc: "+50 % de production de nourriture.",
    cost: { wood: 90, food: 70 },
    unlock: (s) => s.buildings.chateau >= 1,
  },
  {
    id: "armures", name: "Armures", icon: "🛡️",
    desc: "+30 % de puissance militaire.",
    cost: { stone: 140, gold: 80 },
    unlock: (s) => s.buildings.chateau >= 1,
  },
  {
    id: "commerce", name: "Commerce", icon: "💰",
    desc: "+50 % de production d'or.",
    cost: { wood: 70, stone: 70, gold: 60 },
    unlock: (s) => s.buildings.chateau >= 1,
  },
];

// Objectifs séquentiels : il y a TOUJOURS un prochain but affiché.
const OBJECTIVES = [
  {
    text: "Coupe 60 🪵 bois (clique sur « Récolte manuelle »).",
    hint: "Astuce : chaque clic rapporte des ressources instantanément.",
    progress: (s) => ({ cur: Math.floor(s.resources.wood), max: 60 }),
    done: (s) => s.resources.wood >= 60,
  },
  {
    text: "Construis ta première Cabane de bûcheron.",
    hint: "Les bâtiments produisent des ressources tout seuls.",
    progress: (s) => ({ cur: s.buildings.bucheron, max: 1 }),
    done: (s) => s.buildings.bucheron >= 1,
    reward: { wood: 25 },
  },
  {
    text: "Construis une Ferme.",
    hint: "La nourriture sert à recruter ton armée.",
    progress: (s) => ({ cur: s.buildings.ferme, max: 1 }),
    done: (s) => s.buildings.ferme >= 1,
    reward: { wood: 30, food: 15 },
  },
  {
    text: "Possède 5 bâtiments au total.",
    hint: "Diversifie : mine, marché…",
    progress: (s) => ({ cur: totalBuildings(s), max: 5 }),
    done: (s) => totalBuildings(s) >= 5,
    reward: { gold: 20 },
  },
  {
    text: "Construis une Caserne.",
    hint: "Elle débloque le recrutement d'unités.",
    progress: (s) => ({ cur: s.buildings.caserne, max: 1 }),
    done: (s) => s.buildings.caserne >= 1,
    reward: { gold: 40 },
  },
  {
    text: "Recrute 3 unités.",
    hint: "La puissance de ton armée décide des combats.",
    progress: (s) => ({ cur: totalUnits(s), max: 3 }),
    done: (s) => totalUnits(s) >= 3,
    reward: { food: 40 },
  },
  {
    text: "Remporte ton premier combat.",
    hint: "Clique sur « Attaquer » quand ta puissance est suffisante.",
    progress: (s) => ({ cur: Math.min(s.stats.wins, 1), max: 1 }),
    done: (s) => s.stats.wins >= 1,
    reward: { gold: 60 },
  },
  {
    text: "Construis un Château.",
    hint: "Il débloque l'arbre des technologies.",
    progress: (s) => ({ cur: s.buildings.chateau, max: 1 }),
    done: (s) => s.buildings.chateau >= 1,
    reward: { wood: 120, stone: 80 },
  },
  {
    text: "Débloque une technologie.",
    hint: "Les technos améliorent durablement ton royaume.",
    progress: (s) => ({ cur: Math.min(s.techs.length, 1), max: 1 }),
    done: (s) => s.techs.length >= 1,
    reward: { gold: 100 },
  },
  {
    text: "Atteins le niveau ennemi 5.",
    hint: "Chaque victoire augmente le niveau du prochain ennemi.",
    progress: (s) => ({ cur: Math.min(s.enemyLevel, 5), max: 5 }),
    done: (s) => s.enemyLevel >= 5,
    reward: { gold: 150 },
  },
  {
    text: "Possède 15 bâtiments au total.",
    hint: "Une économie large = une armée plus forte.",
    progress: (s) => ({ cur: Math.min(totalBuildings(s), 15), max: 15 }),
    done: (s) => totalBuildings(s) >= 15,
    reward: { gold: 250 },
  },
  {
    text: "Atteins le niveau ennemi 10.",
    hint: "Les récompenses explosent à haut niveau.",
    progress: (s) => ({ cur: Math.min(s.enemyLevel, 10), max: 10 }),
    done: (s) => s.enemyLevel >= 10,
    reward: { gold: 500 },
  },
];

/* ============================ 2. ÉTAT ================================== */

function defaultState() {
  const s = {
    resources: { wood: 25, stone: 5, food: 10, gold: 0 },
    buildings: {},
    units: {},
    techs: [],            // ids des technos débloquées
    enemyLevel: 1,
    xp: 0,
    kingdomLevel: 1,
    objective: 0,         // index dans OBJECTIVES
    stats: { wins: 0, losses: 0 },
    lastSave: Date.now(),
  };
  BUILDINGS.forEach((b) => (s.buildings[b.id] = 0));
  UNITS.forEach((u) => (s.units[u.id] = 0));
  return s;
}

let state = defaultState();

function save() {
  state.lastSave = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    /* localStorage indisponible : on ignore silencieusement */
  }
}

function load() {
  let raw;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (e) {
    raw = null;
  }
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    // Fusion défensive : on repart d'un état par défaut et on écrase.
    state = Object.assign(defaultState(), data);
    state.resources = Object.assign(defaultState().resources, data.resources);
    BUILDINGS.forEach((b) => (state.buildings[b.id] = data.buildings?.[b.id] || 0));
    UNITS.forEach((u) => (state.units[u.id] = data.units?.[u.id] || 0));
    state.techs = Array.isArray(data.techs) ? data.techs : [];
    state.stats = Object.assign({ wins: 0, losses: 0 }, data.stats);
    return true;
  } catch (e) {
    return false;
  }
}

/* ===================== 3. CALCULS DE JEU =============================== */

function totalBuildings(s = state) {
  return BUILDINGS.reduce((n, b) => n + s.buildings[b.id], 0);
}
function totalUnits(s = state) {
  return UNITS.reduce((n, u) => n + s.units[u.id], 0);
}
function hasTech(id) {
  return state.techs.includes(id);
}

// Coût du prochain exemplaire d'un bâtiment (prix progressif).
function buildingCost(def) {
  const owned = state.buildings[def.id];
  const cost = {};
  for (const r in def.baseCost) {
    cost[r] = Math.ceil(def.baseCost[r] * Math.pow(def.growth, owned));
  }
  return cost;
}

function canAfford(cost) {
  return Object.keys(cost).every((r) => state.resources[r] >= cost[r]);
}
function pay(cost) {
  for (const r in cost) state.resources[r] -= cost[r];
}

// Multiplicateur global de production (château + niveau du royaume).
function globalMultiplier() {
  const chateau = state.buildings.chateau || 0;
  return (1 + 0.05 * chateau) * (1 + 0.02 * (state.kingdomLevel - 1));
}

// Production par seconde, ressource par ressource (toutes bonifications incluses).
function productionPerSec() {
  const prod = { wood: 0, stone: 0, food: 0, gold: 0 };
  BUILDINGS.forEach((b) => {
    if (!b.produces) return;
    prod[b.produces.res] += b.produces.amount * state.buildings[b.id];
  });
  if (hasTech("haches")) prod.wood *= 1.5;
  if (hasTech("agriculture")) prod.food *= 1.5;
  if (hasTech("commerce")) prod.gold *= 1.5;
  const g = globalMultiplier();
  for (const r in prod) prod[r] *= g;
  return prod;
}

// Puissance militaire totale.
function armyPower() {
  let p = 0;
  UNITS.forEach((u) => (p += u.power * state.units[u.id]));
  if (hasTech("armures")) p *= 1.3;
  p *= 1 + 0.05 * (state.buildings.caserne || 0);
  return Math.round(p);
}

// Puissance estimée de l'ennemi courant.
function enemyPower() {
  return Math.round(20 * Math.pow(state.enemyLevel, 1.6));
}

function winChance() {
  const p = armyPower();
  const e = enemyPower();
  if (p <= 0) return 0;
  return Math.min(0.95, Math.max(0.05, p / (p + e)));
}

function xpNeeded() {
  return 100 * state.kingdomLevel;
}

/* ----- Combat : simulation simple et lisible ----- */
function doCombat() {
  const power = armyPower();
  if (power <= 0) {
    toast("Recrute des unités avant d'attaquer !", "bad");
    return;
  }
  const chance = winChance();
  const win = Math.random() < chance;
  const lvl = state.enemyLevel;

  if (win) {
    const reward = {
      gold: Math.round(enemyPower() * 0.8 + 10 + Math.random() * lvl * 5),
      wood: Math.round(enemyPower() * 0.4),
      stone: Math.round(enemyPower() * 0.35),
      food: Math.round(enemyPower() * 0.3),
    };
    for (const r in reward) state.resources[r] += reward[r];
    const xpGain = lvl * 12;
    gainXp(xpGain);
    applyCasualties(0.08);
    state.stats.wins++;
    state.enemyLevel++;
    log(
      `🏆 Victoire niv. ${lvl} ! +${reward.gold}🪙 +${reward.wood}🪵 ` +
        `+${reward.stone}🪨 +${reward.food}🌾 (+${xpGain} XP)`,
      "win"
    );
    toast(`Victoire ! +${reward.gold} 🪙 et du butin`, "good");
  } else {
    const xpGain = lvl * 3;
    gainXp(xpGain);
    applyCasualties(0.22);
    state.stats.losses++;
    log(`💀 Défaite contre l'ennemi niv. ${lvl}. Pertes dans l'armée.`, "lose");
    toast("Défaite… ton armée a subi des pertes.", "bad");
  }
  renderLists();
  save();
}

// Retire un pourcentage (aléatoire) des unités après un combat.
function applyCasualties(rate) {
  UNITS.forEach((u) => {
    const n = state.units[u.id];
    if (n <= 0) return;
    const lost = Math.min(n, Math.round(n * rate * (0.5 + Math.random())));
    state.units[u.id] -= lost;
  });
}

function gainXp(amount) {
  state.xp += amount;
  while (state.xp >= xpNeeded()) {
    state.xp -= xpNeeded();
    state.kingdomLevel++;
    log(`⭐ Royaume niveau ${state.kingdomLevel} ! Production globale améliorée.`);
    toast(`Niveau ${state.kingdomLevel} du royaume !`, "good");
  }
}

/* ----- Objectifs ----- */
function checkObjective() {
  const idx = state.objective;
  if (idx >= OBJECTIVES.length) return;
  const obj = OBJECTIVES[idx];
  if (obj.done(state)) {
    if (obj.reward) {
      for (const r in obj.reward) state.resources[r] += obj.reward[r];
      const txt = Object.keys(obj.reward)
        .map((r) => `+${obj.reward[r]} ${RES_ICON[r]}`)
        .join(" ");
      log(`🎯 Objectif accompli ! Récompense : ${txt}`);
      toast(`Objectif accompli ! ${txt}`, "good");
    } else {
      log("🎯 Objectif accompli !");
      toast("Objectif accompli !", "good");
    }
    state.objective++;
    renderLists();
  }
}

/* ============================ 4. RENDU ================================= */

const $ = (id) => document.getElementById(id);
const fmt = (n) => {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "k";
  return String(n);
};
const fmtRate = (n) => (n >= 100 ? fmt(n) : n.toFixed(1));

function costHtml(cost) {
  return Object.keys(cost)
    .map((r) => {
      const ok = state.resources[r] >= cost[r];
      return `<span class="${ok ? "ok" : "no"}">${RES_ICON[r]} ${fmt(
        cost[r]
      )}</span>`;
    })
    .join("");
}

// Construit (une fois) la liste des bâtiments / unités / technos.
function renderLists() {
  renderBuildings();
  renderUnits();
  renderTechs();
  renderObjective();
}

function renderBuildings() {
  const box = $("buildings");
  box.innerHTML = "";
  BUILDINGS.forEach((b) => {
    if (!b.unlock(state)) return;
    const cost = buildingCost(b);
    const owned = state.buildings[b.id];
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div class="icon">${b.icon}</div>
      <div class="info">
        <div class="name">${b.name} <small>×${owned}</small></div>
        <div class="desc">${b.desc}${
      b.produces
        ? ` (${b.produces.amount}/s ${RES_ICON[b.produces.res]})`
        : ""
    }</div>
        <div class="cost">${costHtml(cost)}</div>
      </div>
      <button class="buy-btn" data-buy-building="${b.id}">Construire</button>`;
    box.appendChild(row);
  });
}

function renderUnits() {
  const box = $("units");
  box.innerHTML = "";
  const anyUnlocked = UNITS.some((u) => u.unlock(state));
  if (!anyUnlocked) {
    box.innerHTML =
      '<p class="muted">Construis une Caserne pour recruter des unités.</p>';
    return;
  }
  UNITS.forEach((u) => {
    if (!u.unlock(state)) return;
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div class="icon">${u.icon}</div>
      <div class="info">
        <div class="name">${u.name} <small>×${state.units[u.id]}</small>
          <span class="tag">⚔ ${u.power}</span></div>
        <div class="desc">${u.desc}</div>
        <div class="cost">${costHtml(u.cost)}</div>
      </div>
      <button class="buy-btn" data-buy-unit="${u.id}">Recruter</button>`;
    box.appendChild(row);
  });
}

function renderTechs() {
  const box = $("techs");
  box.innerHTML = "";
  const anyUnlocked = TECHS.some((t) => t.unlock(state));
  if (!anyUnlocked) {
    box.innerHTML =
      '<p class="muted">Construis un Château pour débloquer les technologies.</p>';
    return;
  }
  TECHS.forEach((t) => {
    if (!t.unlock(state)) return;
    const owned = state.techs.includes(t.id);
    const row = document.createElement("div");
    row.className = "item" + (owned ? " locked" : "");
    row.innerHTML = `
      <div class="icon">${t.icon}</div>
      <div class="info">
        <div class="name">${t.name}
          ${owned ? '<span class="tag done">✔ Recherchée</span>' : ""}</div>
        <div class="desc">${t.desc}</div>
        ${owned ? "" : `<div class="cost">${costHtml(t.cost)}</div>`}
      </div>
      ${
        owned
          ? ""
          : `<button class="buy-btn" data-buy-tech="${t.id}">Rechercher</button>`
      }`;
    box.appendChild(row);
  });
}

function renderObjective() {
  const idx = state.objective;
  if (idx >= OBJECTIVES.length) {
    $("objectiveText").textContent =
      "👑 Tous les objectifs sont accomplis ! Agrandis ton royaume sans limite.";
    $("objectiveBar").style.width = "100%";
    $("objectiveHint").textContent = "Vise le plus haut niveau ennemi possible.";
    return;
  }
  const obj = OBJECTIVES[idx];
  const p = obj.progress(state);
  $("objectiveText").textContent = obj.text;
  $("objectiveBar").style.width =
    Math.min(100, (p.cur / p.max) * 100).toFixed(0) + "%";
  $("objectiveHint").textContent = `${obj.hint}  (${Math.min(
    p.cur,
    p.max
  )}/${p.max})`;
}

// Mise à jour légère appelée à chaque tick (chiffres + boutons).
function tickRender() {
  const prod = productionPerSec();
  RES.forEach((r) => {
    $("r-" + r).textContent = fmt(state.resources[r]);
    $("rp-" + r).textContent = "+" + fmtRate(prod[r]) + "/s";
  });

  $("armyPower").textContent = fmt(armyPower());
  $("enemyLevel").textContent = state.enemyLevel;
  $("enemyPower").textContent = fmt(enemyPower());
  $("winChance").textContent =
    armyPower() > 0 ? Math.round(winChance() * 100) + " %" : "—";

  $("kingdomLevel").textContent = state.kingdomLevel;
  $("xpText").textContent = `${Math.floor(state.xp)}/${xpNeeded()}`;
  $("xpBar").style.width =
    Math.min(100, (state.xp / xpNeeded()) * 100).toFixed(0) + "%";

  $("attackBtn").disabled = armyPower() <= 0;

  // Active / désactive les boutons d'achat selon les ressources.
  document.querySelectorAll("[data-buy-building]").forEach((btn) => {
    const def = BUILDINGS.find((b) => b.id === btn.dataset.buyBuilding);
    btn.disabled = !canAfford(buildingCost(def));
  });
  document.querySelectorAll("[data-buy-unit]").forEach((btn) => {
    const def = UNITS.find((u) => u.id === btn.dataset.buyUnit);
    btn.disabled = !canAfford(def.cost);
  });
  document.querySelectorAll("[data-buy-tech]").forEach((btn) => {
    const def = TECHS.find((t) => t.id === btn.dataset.buyTech);
    btn.disabled = !canAfford(def.cost);
  });

  renderObjective();
}

/* ----- Journal & notifications ----- */
function log(msg, cls = "") {
  const ul = $("log");
  const li = document.createElement("li");
  if (cls) li.className = cls;
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  li.innerHTML = `<b>[${hh}:${mm}]</b> ${msg}`;
  ul.prepend(li);
  while (ul.children.length > 40) ul.removeChild(ul.lastChild);
}

function toast(msg, kind = "") {
  const box = $("toasts");
  const el = document.createElement("div");
  el.className = "toast" + (kind ? " " + kind : "");
  el.innerHTML = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3900);
}

// Petit "+N" flottant à l'endroit du clic de récolte.
function floatText(x, y, text) {
  const el = document.createElement("div");
  el.className = "float";
  el.textContent = text;
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

/* ===================== 5. ACTIONS JOUEUR ============================== */

function buyBuilding(id) {
  const def = BUILDINGS.find((b) => b.id === id);
  const cost = buildingCost(def);
  if (!canAfford(cost)) return;
  pay(cost);
  state.buildings[id]++;
  log(`🏗️ ${def.name} construit (×${state.buildings[id]}).`);
  renderLists();
  save();
}

function buyUnit(id) {
  const def = UNITS.find((u) => u.id === id);
  if (!canAfford(def.cost)) return;
  pay(def.cost);
  state.units[id]++;
  log(`🎖️ ${def.name} recruté (×${state.units[id]}).`);
  renderLists();
  save();
}

function buyTech(id) {
  const def = TECHS.find((t) => t.id === id);
  if (state.techs.includes(id) || !canAfford(def.cost)) return;
  pay(def.cost);
  state.techs.push(id);
  log(`📜 Technologie « ${def.name} » débloquée !`);
  toast(`Technologie : ${def.name}`, "good");
  renderLists();
  save();
}

function manualHarvest(res, x, y) {
  // Le gain manuel grandit légèrement avec le niveau du royaume.
  const gain = 1 + Math.floor(state.kingdomLevel / 3);
  state.resources[res] += gain;
  floatText(x, y, `+${gain} ${RES_ICON[res]}`);
}

function hardReset() {
  if (
    !confirm(
      "Réinitialiser toute la partie ? Cette action est irréversible."
    )
  )
    return;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {}
  state = defaultState();
  $("log").innerHTML = "";
  renderLists();
  log("🌅 Nouvelle partie. Bonne chance, Seigneur !");
  toast("Partie réinitialisée.", "good");
}

/* ----- Progression hors-ligne ----- */
function applyOffline() {
  const dt = Math.min(OFFLINE_CAP, (Date.now() - state.lastSave) / 1000);
  if (dt < 60) return; // moins d'une minute : on ignore
  const prod = productionPerSec();
  const gained = {};
  let any = false;
  RES.forEach((r) => {
    const g = prod[r] * dt * OFFLINE_EFFICIENCY;
    if (g >= 1) {
      state.resources[r] += g;
      gained[r] = Math.floor(g);
      any = true;
    }
  });
  if (any) {
    const mins = Math.floor(dt / 60);
    const txt = RES.filter((r) => gained[r])
      .map((r) => `+${fmt(gained[r])} ${RES_ICON[r]}`)
      .join(" ");
    log(`🌙 Absence ${mins} min — butin hors-ligne : ${txt}`);
    toast(`De retour ! Hors-ligne (${mins} min) : ${txt}`, "good");
  }
}

/* ======================= 6. BOUCLE DE JEU ============================= */

function tick() {
  const dt = TICK_MS / 1000;
  const prod = productionPerSec();
  RES.forEach((r) => (state.resources[r] += prod[r] * dt));
  checkObjective();
  tickRender();
}

function bindEvents() {
  // Récolte manuelle (souris + tactile via le même évènement click).
  document.querySelectorAll(".harvest-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      manualHarvest(btn.dataset.res, e.clientX, e.clientY);
    });
  });

  // Délégation : un seul listener pour tous les boutons d'achat.
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.buyBuilding) buyBuilding(t.dataset.buyBuilding);
    else if (t.dataset.buyUnit) buyUnit(t.dataset.buyUnit);
    else if (t.dataset.buyTech) buyTech(t.dataset.buyTech);
  });

  $("attackBtn").addEventListener("click", doCombat);
  $("saveBtn").addEventListener("click", () => {
    save();
    toast("Partie sauvegardée 💾", "good");
  });
  $("resetBtn").addEventListener("click", hardReset);

  // Sauvegarde quand l'onglet passe en arrière-plan / se ferme.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) save();
  });
  window.addEventListener("beforeunload", save);
}

function init() {
  const loaded = load();
  bindEvents();
  if (loaded) {
    applyOffline();
    log("📜 Royaume chargé. Reprends ta conquête !");
  } else {
    log("🌅 Bienvenue, Seigneur ! Récolte du bois pour bâtir ton village.");
  }
  renderLists();
  tickRender();

  setInterval(tick, TICK_MS);     // boucle principale
  setInterval(save, 10000);       // sauvegarde automatique
}

document.addEventListener("DOMContentLoaded", init);
