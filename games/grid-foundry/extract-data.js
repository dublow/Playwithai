"use strict";
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "script.js"), "utf8");

// Garde uniquement la section données (avant le moteur d'adjacence UI)
const dataSection = src.split("/* ===================== ADJACENCY ENGINE")[0];

const fn = new Function(`
  "use strict";
  ${dataSection}

  // Nettoie les objectifs : supprime les fonctions f/g, garde ic, t, win
  function cleanObjs(arr) {
    return arr.map(o => Object.assign(
      { ic: o.ic, t: o.t },
      o.win ? { win: true } : {}
    ));
  }

  return {
    RESOURCES,
    BUILDINGS,
    BUILD_ORDER,
    ADJACENCY,
    CHAINS,
    SPECS: Object.fromEntries(
      Object.entries(SPECS).map(([k, v]) => [k, { name: v.name, icon: v.icon, mods: v.mods, txt: v.txt }])
    ),
    OBJ_COMMON: cleanObjs(OBJ_COMMON),
    OBJ_AXIS: Object.fromEntries(
      Object.entries(OBJ_AXIS).map(([k, v]) => [k, cleanObjs(v)])
    ),
    EXPAND,
    EFF,
  };
`);

const data = fn();
const out = path.join(__dirname, "game-data.json");
fs.writeFileSync(out, JSON.stringify(data, null, 2));

console.log("game-data.json écrit :", out);
console.log("  Bâtiments :", Object.keys(data.BUILDINGS).length);
console.log("  Ressources :", Object.keys(data.RESOURCES).length);
console.log("  EFF :", data.EFF);
