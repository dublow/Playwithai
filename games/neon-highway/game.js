/* ============================================================
 *  NEON HIGHWAY USA  —  v1 (Milestone 1)
 *  A retro pseudo-3D arcade racer. Vanilla JS, no deps.
 *
 *  v1 adds the Outrun-style branching course:
 *    - 5 stages, a fork at every checkpoint, 15 unique
 *      route segments, 5 different goals (A..E).
 *    - Each route segment has its own biome + time of day,
 *      cross-fading at the checkpoint so the world morphs.
 *    - Reaching a stage-5 goal = WIN (route map recap).
 *
 *  Rendering still uses the classic segment-projection
 *  technique (road split into Z segments, pinhole camera).
 * ============================================================ */
(function () {
  "use strict";

  /* ----------------------------------------------------------
   *  Util  - small maths / colour helpers
   * -------------------------------------------------------- */
  const Util = {
    clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); },
    lerp(a, b, t) { return a + (b - a) * t; },
    accel(v, a, dt) { return v + a * dt; },

    percentRemaining(n, total) { return (n % total) / total; },

    exponentialFog(distance, density) {
      return 1 / Math.pow(Math.E, distance * distance * density);
    },

    // do two centred ranges overlap (normalised road space)
    overlap(x1, w1, x2, w2, percent) {
      const half = (percent || 1) / 2;
      const min1 = x1 - w1 * half, max1 = x1 + w1 * half;
      const min2 = x2 - w2 * half, max2 = x2 + w2 * half;
      return !(max1 < min2 || min1 > max2);
    },

    randInt(lo, hi) { return Math.floor(lo + Math.random() * (hi - lo + 1)); },
    randChoice(arr) { return arr[Util.randInt(0, arr.length - 1)]; },

    // deterministic PRNG (mulberry32) so a given route node always
    // generates the same layout
    seedRand(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    // project a 3D point into screen space (mutates p.camera / p.screen)
    project(p, camX, camY, camZ, camDepth, w, h, roadW) {
      p.camera.x = (p.world.x || 0) - camX;
      p.camera.y = (p.world.y || 0) - camY;
      p.camera.z = (p.world.z || 0) - camZ;
      p.screen.scale = camDepth / p.camera.z;
      p.screen.x = Math.round((w / 2) + (p.screen.scale * p.camera.x * w / 2));
      p.screen.y = Math.round((h / 2) - (p.screen.scale * p.camera.y * h / 2));
      p.screen.w = Math.round((p.screen.scale * roadW * w / 2));
    },

    hexToRgb(hex) {
      const n = parseInt(hex.slice(1), 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    },
    // blend two hex colours -> {r,g,b}
    blendRgb(hexA, hexB, t) {
      const a = Util.hexToRgb(hexA), b = Util.hexToRgb(hexB);
      return {
        r: Math.round(Util.lerp(a.r, b.r, t)),
        g: Math.round(Util.lerp(a.g, b.g, t)),
        b: Math.round(Util.lerp(a.b, b.b, t))
      };
    },
    rgbStr(c) { return "rgb(" + c.r + "," + c.g + "," + c.b + ")"; },
    // colour A->B by `tm` (theme blend) then ->fog by `fog`.
    // `fogRgb` is an {r,g,b} (already blended), NOT a string.
    mixThemed(hexA, hexB, tm, fogRgb, fog) {
      const base = Util.blendRgb(hexA, hexB, tm);
      return "rgb(" +
        Math.round(Util.lerp(fogRgb.r, base.r, fog)) + "," +
        Math.round(Util.lerp(fogRgb.g, base.g, fog)) + "," +
        Math.round(Util.lerp(fogRgb.b, base.b, fog)) + ")";
    }
  };

  /* ----------------------------------------------------------
   *  Constants
   * -------------------------------------------------------- */
  const SEG_LEN = 200;          // length of a single road segment
  const RUMBLE_LEN = 3;         // segments per rumble-strip colour block
  const ROAD_WIDTH = 2000;      // half-width of the road in world units
  const LANES = 3;
  const FOV = 100;              // field of view (deg)
  const CAM_HEIGHT = 1000;      // camera height above the road
  const DRAW_DIST = 200;        // how many segments we draw ahead
  const FOG_DENSITY = 5;
  const CENTRIFUGAL = 0.32;     // how hard curves push the car out

  const CAM_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
  const PLAYER_Z = CAM_HEIGHT * CAM_DEPTH;

  const MAX_SPEED = SEG_LEN * 60;          // top speed (units / s)
  const ACCEL = MAX_SPEED / 4.2;
  const BRAKING = -MAX_SPEED / 1.4;
  const DECEL = -MAX_SPEED / 6;
  const OFFROAD_DECEL = -MAX_SPEED / 1.8;
  const OFFROAD_LIMIT = MAX_SPEED / 3.4;
  const BOOST_MULT = 1.7;
  const BOOST_TIME = 1.7;        // seconds of boost
  const BOOST_COOLDOWN = 4.5;    // seconds before boost recharges

  const START_TIME = 42;         // starting seconds on the clock
  const CP_BONUS_TIME = 16;      // seconds gained at each checkpoint

  const STAGES = 5;              // Outrun-style: 5 stages, 15 nodes, 5 goals
  const FADE_SEGS = 26;          // segments over which a new biome cross-fades
  const LOCK_AHEAD = 110;        // segments before a node end the branch locks

  // global sprite scale (tuned so the player car reads well)
  const SPRITE_SCALE = 0.3 * (1 / 300);

  /* ----------------------------------------------------------
   *  THEMES - biome + time-of-day presets (one per route node)
   *  Each: sky gradient stops, sun palette (null = night/no sun),
   *  star density, fog colour, light/dark road palettes,
   *  mountain near/far colours, decoration sprite pool, name.
   * -------------------------------------------------------- */
  const THEMES = {
    coastSunset: {
      name: "PACIFIC COAST",
      sky: [[0, "#2a0a4a"], [.30, "#5e1170"], [.46, "#d23b6e"], [.55, "#ff7e3d"], [.62, "#ffd24a"]],
      sun: ["#fff27a", "#ff7e3d", "#ff2e88"], stars: 0, fog: "#4a1166",
      light: { road: "#9a9aa6", grass: "#1d9b56", rumble: "#f4f4f8", lane: "#fbfbff" },
      dark:  { road: "#8f8f9b", grass: "#188a4c", rumble: "#c81d4e", lane: "#8f8f9b" },
      mtnFar: "#3a1466", mtnNear: "#270e4a", decor: ["palm", "palm", "billboard"]
    },
    neonCityDusk: {
      name: "NEON CITY",
      sky: [[0, "#190033"], [.34, "#3a0a5e"], [.52, "#7a1bd6"], [.64, "#ff2e88"], [.72, "#ff7e3d"]],
      sun: ["#ffe27a", "#ff3d8d", "#7a1bd6"], stars: 0.4, fog: "#280a4a",
      light: { road: "#7c7c8e", grass: "#241046", rumble: "#19f0ff", lane: "#ff2e88" },
      dark:  { road: "#727284", grass: "#1d0a3a", rumble: "#ff2e88", lane: "#727284" },
      mtnFar: "#3a0a6a", mtnNear: "#240a44", decor: ["building", "building", "billboard"]
    },
    desertDay: {
      name: "MOJAVE DESERT",
      sky: [[0, "#1e63b8"], [.40, "#5fa8d6"], [.60, "#ffd98a"], [.74, "#ffb35e"]],
      sun: ["#fff3c0", "#ffd24a", "#ff9b3d"], stars: 0, fog: "#caa066",
      light: { road: "#b8a890", grass: "#caa35a", rumble: "#fff4e0", lane: "#fffaf0" },
      dark:  { road: "#ac9c84", grass: "#bd964e", rumble: "#c8783a", lane: "#ac9c84" },
      mtnFar: "#b97a4a", mtnNear: "#8a5230", decor: ["cactus", "cactus", "billboard"]
    },
    canyonDusk: {
      name: "RED CANYON",
      sky: [[0, "#2a0a3a"], [.34, "#7a1b4a"], [.52, "#d2453b"], [.64, "#ff7e3d"], [.74, "#ffc24a"]],
      sun: ["#ffe07a", "#ff6b3d", "#c81d4e"], stars: 0.15, fog: "#5a1d2e",
      light: { road: "#9a7a72", grass: "#7a3a2a", rumble: "#ffe0d0", lane: "#fff0e8" },
      dark:  { road: "#8e7068", grass: "#6a3022", rumble: "#c83a2a", lane: "#8e7068" },
      mtnFar: "#7a2a2e", mtnNear: "#4a161e", decor: ["rock", "cactus", "rock"]
    },
    alpineTwilight: {
      name: "ALPINE FOREST",
      sky: [[0, "#0a1a3a"], [.36, "#1d3a6a"], [.56, "#3a6a9a"], [.70, "#7aa8c8"], [.80, "#e8b87a"]],
      sun: ["#ffe8c0", "#e8a87a", "#5a6a9a"], stars: 0.25, fog: "#1a2a44",
      light: { road: "#7a8290", grass: "#1a5a3a", rumble: "#e8f4f8", lane: "#f8fcff" },
      dark:  { road: "#707a88", grass: "#144a30", rumble: "#3a8ac8", lane: "#707a88" },
      mtnFar: "#27406a", mtnNear: "#16263f", decor: ["pine", "pine", "pine"]
    },
    saltFlatsBlue: {
      name: "SALT FLATS",
      sky: [[0, "#050a2a"], [.40, "#142a5a"], [.62, "#2a5a8a"], [.78, "#5a8ab8"]],
      sun: null, stars: 0.7, fog: "#16244a",
      light: { road: "#8a8ea0", grass: "#9aa0b8", rumble: "#e0e8ff", lane: "#f0f4ff" },
      dark:  { road: "#80849a", grass: "#8e94ae", rumble: "#3a6ac8", lane: "#80849a" },
      mtnFar: "#1d3060", mtnNear: "#101e40", decor: [null, "billboard", null]
    },
    mountainDawn: {
      name: "SNOW PASS",
      sky: [[0, "#1a2a5a"], [.38, "#5a5a9a"], [.56, "#c87aa8"], [.70, "#ffb8a0"], [.82, "#ffe0c0"]],
      sun: ["#fff0e0", "#ffb8a0", "#7a6a9a"], stars: 0.1, fog: "#3a3a66",
      light: { road: "#9aa0ae", grass: "#dfe6f0", rumble: "#ff7eb0", lane: "#ffffff" },
      dark:  { road: "#9096a4", grass: "#cdd6e4", rumble: "#7a8ad0", lane: "#9096a4" },
      mtnFar: "#5a5a8a", mtnNear: "#3a3a60", decor: ["pineSnow", "pineSnow", "pineSnow"]
    },
    lakeDawn: {
      name: "MIST LAKE",
      sky: [[0, "#2a2a5a"], [.38, "#6a5a8a"], [.56, "#c89ab0"], [.70, "#ffc8a8"], [.82, "#ffe8c8"]],
      sun: ["#fff2dc", "#ffc090", "#8a7a9a"], stars: 0.05, fog: "#5a5a7a",
      light: { road: "#94989e", grass: "#3a7a6a", rumble: "#ffe0e8", lane: "#fbfbff" },
      dark:  { road: "#8a8e96", grass: "#2f6a5a", rumble: "#5aaab0", lane: "#8a8e96" },
      mtnFar: "#4a4a74", mtnNear: "#2e2e50", decor: ["pine", "pine", "pine"]
    },
    highlandsSunrise: {
      name: "GOLD HIGHLANDS",
      sky: [[0, "#3a2a5a"], [.34, "#9a4a6a"], [.52, "#ff8a4a"], [.64, "#ffc24a"], [.74, "#fff0a0"]],
      sun: ["#fffbc0", "#ffd24a", "#ff7e3d"], stars: 0, fog: "#7a4a3a",
      light: { road: "#a89a86", grass: "#9a8a3a", rumble: "#fff4d0", lane: "#fffae8" },
      dark:  { road: "#9c907c", grass: "#8a7a30", rumble: "#e8a83a", lane: "#9c907c" },
      mtnFar: "#9a6a3a", mtnNear: "#6a4422", decor: ["pine", "rock", "pine"]
    },
    mesaNight: {
      name: "MESA NIGHT",
      sky: [[0, "#020012"], [.38, "#160a3a"], [.58, "#3a1b6a"], [.74, "#7a2e88"]],
      sun: null, stars: 0.85, fog: "#1a0a32",
      light: { road: "#6e6e82", grass: "#221038", rumble: "#19f0ff", lane: "#ff2e88" },
      dark:  { road: "#64647a", grass: "#1a0a2e", rumble: "#ff2e88", lane: "#64647a" },
      mtnFar: "#2a1050", mtnNear: "#180a34", decor: ["cactus", "billboard", "cactus"]
    },
    snowSummitDawn: {
      name: "SNOW SUMMIT",
      sky: [[0, "#3a4a8a"], [.38, "#7a8aba"], [.56, "#c8c0d8"], [.72, "#ffe0d8"], [.84, "#fff4e8"]],
      sun: ["#ffffff", "#ffd8c8", "#9aa8d0"], stars: 0, fog: "#7a86a8",
      light: { road: "#a4aab6", grass: "#eef2f8", rumble: "#ff9ec0", lane: "#ffffff" },
      dark:  { road: "#9aa0ac", grass: "#dee6f0", rumble: "#88a0e0", lane: "#9aa0ac" },
      mtnFar: "#7a86b0", mtnNear: "#56608a", decor: ["pineSnow", "pineSnow", "pineSnow"]
    },
    pineValleyMorning: {
      name: "PINE VALLEY",
      sky: [[0, "#1a5a8a"], [.40, "#4a9ac8"], [.60, "#a8d8e8"], [.78, "#e8f4d8"]],
      sun: ["#ffffe0", "#d8f0a0", "#7ac8d8"], stars: 0, fog: "#5a8a6a",
      light: { road: "#94a098", grass: "#2a8a4a", rumble: "#f0fae8", lane: "#fbfff8" },
      dark:  { road: "#8a968e", grass: "#227a3e", rumble: "#4abf6a", lane: "#8a968e" },
      mtnFar: "#2e6a5a", mtnNear: "#1d4a3c", decor: ["pine", "pine", "pine"]
    },
    riverCitySunrise: {
      name: "RIVER CITY",
      sky: [[0, "#2a1a5a"], [.34, "#7a3a7a"], [.52, "#ff6a5a"], [.64, "#ffa84a"], [.74, "#ffe08a"]],
      sun: ["#fff4c0", "#ffb24a", "#ff5a6a"], stars: 0.1, fog: "#4a2a5a",
      light: { road: "#84849a", grass: "#2a5a7a", rumble: "#ffe8c0", lane: "#19f0ff" },
      dark:  { road: "#7a7a90", grass: "#224a6a", rumble: "#ff7e3d", lane: "#7a7a90" },
      mtnFar: "#4a3a7a", mtnNear: "#2e2452", decor: ["building", "building", "billboard"]
    },
    vegasNight: {
      name: "NEON VEGAS",
      sky: [[0, "#02000f"], [.36, "#120a30"], [.56, "#3a0a6a"], [.72, "#ff2e88"], [.82, "#7a1bd6"]],
      sun: null, stars: 0.6, fog: "#1a0036",
      light: { road: "#70708a", grass: "#1f0a40", rumble: "#19f0ff", lane: "#ffe14a" },
      dark:  { road: "#666680", grass: "#180834", rumble: "#ff2e88", lane: "#666680" },
      mtnFar: "#2e0a60", mtnNear: "#1a0640", decor: ["building", "billboard", "building"]
    },
    desertAurora: {
      name: "DESERT DAWN",
      sky: [[0, "#1a0a4a"], [.32, "#5a1b8a"], [.48, "#c83a8a"], [.60, "#3acf9a"], [.72, "#7ae8c8"], [.82, "#ffe0a0"]],
      sun: ["#fff0c0", "#ff8aa8", "#3acf9a"], stars: 0.4, fog: "#3a1a5a",
      light: { road: "#9a8e8a", grass: "#7a5a4a", rumble: "#fff0e0", lane: "#9af0d0" },
      dark:  { road: "#8e8480", grass: "#6a4e40", rumble: "#3acf9a", lane: "#8e8480" },
      mtnFar: "#5a2a6a", mtnNear: "#3a1a48", decor: ["cactus", "rock", "cactus"]
    }
  };

  // 15 route nodes (stage 1..5). From node (s,i): LEFT -> (s+1,i),
  // RIGHT -> (s+1,i+1). Stage-5 nodes are goals A..E.
  const ROUTE = {
    "1-0": { theme: "coastSunset" },
    "2-0": { theme: "neonCityDusk" },     "2-1": { theme: "desertDay" },
    "3-0": { theme: "canyonDusk" },       "3-1": { theme: "alpineTwilight" },   "3-2": { theme: "saltFlatsBlue" },
    "4-0": { theme: "mountainDawn" },     "4-1": { theme: "lakeDawn" },         "4-2": { theme: "highlandsSunrise" }, "4-3": { theme: "mesaNight" },
    "5-0": { theme: "snowSummitDawn", goal: "A" }, "5-1": { theme: "pineValleyMorning", goal: "B" },
    "5-2": { theme: "riverCitySunrise", goal: "C" }, "5-3": { theme: "vegasNight", goal: "D" },
    "5-4": { theme: "desertAurora", goal: "E" }
  };

  /* ----------------------------------------------------------
   *  AssetFactory - builds SVG sprites, rasterises to Image
   * -------------------------------------------------------- */
  const AssetFactory = {
    sprites: {},

    svgURL(svg) {
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    },

    playerCarSVG(c) {
      c = c || { hi: "#ff4d8d", mid: "#d6195f", lo: "#7a0c34" };
      return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="190" viewBox="0 0 300 190">
        <defs>
          <linearGradient id="pb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${c.hi}"/><stop offset=".55" stop-color="${c.mid}"/>
            <stop offset="1" stop-color="${c.lo}"/>
          </linearGradient>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#9be7ff"/><stop offset="1" stop-color="#1b6a8c"/>
          </linearGradient>
        </defs>
        <ellipse cx="150" cy="176" rx="135" ry="16" fill="rgba(0,0,0,.45)"/>
        <path d="M40 150 Q35 96 70 86 L230 86 Q265 96 260 150 Z" fill="url(#pb)"/>
        <path d="M84 92 Q150 64 216 92 L206 120 Q150 104 94 120 Z" fill="url(#pg)"/>
        <rect x="46" y="120" width="208" height="42" rx="12" fill="url(#pb)"/>
        <rect x="58" y="128" width="48" height="22" rx="6" fill="#ff2a2a"/>
        <rect x="194" y="128" width="48" height="22" rx="6" fill="#ff2a2a"/>
        <rect x="58" y="128" width="48" height="9" rx="4" fill="#ff8a8a"/>
        <rect x="194" y="128" width="48" height="9" rx="4" fill="#ff8a8a"/>
        <rect x="120" y="132" width="60" height="14" rx="4" fill="#2a0014"/>
        <rect x="120" y="135" width="60" height="4" fill="#ff5577"/>
        <path d="M60 86 L74 70 H226 L240 86 Z" fill="#5a0a2c"/>
        <rect x="30" y="138" width="22" height="40" rx="7" fill="#111"/>
        <rect x="248" y="138" width="22" height="40" rx="7" fill="#111"/>
        <path d="M70 86 Q150 76 230 86" fill="none" stroke="#ffd1e4" stroke-width="3" opacity=".6"/>
        <rect x="44" y="150" width="212" height="6" fill="rgba(255,255,255,.18)"/>
      </svg>`;
    },

    trafficCarSVG(c) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="175" viewBox="0 0 280 175">
        <defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${c.hi}"/><stop offset=".55" stop-color="${c.mid}"/>
          <stop offset="1" stop-color="${c.lo}"/></linearGradient></defs>
        <ellipse cx="140" cy="160" rx="126" ry="15" fill="rgba(0,0,0,.4)"/>
        <path d="M34 138 Q30 84 64 74 L216 74 Q250 84 246 138 Z" fill="url(#t)"/>
        <path d="M76 80 Q140 56 204 80 L196 106 Q140 92 84 106 Z" fill="#0f2233"/>
        <rect x="40" y="110" width="200" height="38" rx="11" fill="url(#t)"/>
        <rect x="52" y="118" width="42" height="20" rx="5" fill="#ff3030"/>
        <rect x="186" y="118" width="42" height="20" rx="5" fill="#ff3030"/>
        <rect x="52" y="118" width="42" height="8" rx="3" fill="#ff9a9a"/>
        <rect x="186" y="118" width="42" height="8" rx="3" fill="#ff9a9a"/>
        <rect x="108" y="120" width="64" height="13" rx="4" fill="#10202b"/>
        <rect x="24" y="126" width="20" height="36" rx="6" fill="#111"/>
        <rect x="236" y="126" width="20" height="36" rx="6" fill="#111"/>
        <path d="M58 74 L72 60 H208 L222 74 Z" fill="${c.lo}"/>
      </svg>`;
    },

    palmSVG() {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="230" height="430" viewBox="0 0 230 430">
        <defs><linearGradient id="tr" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#5a3a18"/><stop offset=".5" stop-color="#8a5a28"/>
          <stop offset="1" stop-color="#4a2e12"/></linearGradient></defs>
        <ellipse cx="115" cy="420" rx="70" ry="12" fill="rgba(0,0,0,.35)"/>
        <path d="M104 420 Q98 240 118 130 L132 130 Q150 250 126 420 Z" fill="url(#tr)"/>
        <g fill="#0c8f4a">
          <path d="M118 132 Q60 96 8 110 Q66 122 116 156 Z"/>
          <path d="M118 132 Q176 92 226 112 Q166 120 122 158 Z"/>
          <path d="M118 130 Q92 60 50 30 Q104 64 124 136 Z"/>
          <path d="M120 130 Q150 58 196 34 Q142 70 126 136 Z"/>
          <path d="M119 128 Q116 52 118 8 Q132 56 127 132 Z"/>
        </g>
        <g fill="#13b85f">
          <path d="M118 134 Q70 110 30 122 Q74 126 117 152 Z"/>
          <path d="M120 134 Q168 108 206 124 Q160 126 123 154 Z"/>
        </g>
        <circle cx="119" cy="130" r="9" fill="#a06a2a"/>
      </svg>`;
    },

    cactusSVG() {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="190" height="320" viewBox="0 0 190 320">
        <defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#1f7a3a"/><stop offset=".5" stop-color="#37b85c"/>
          <stop offset="1" stop-color="#1a6630"/></linearGradient></defs>
        <ellipse cx="95" cy="312" rx="56" ry="10" fill="rgba(0,0,0,.32)"/>
        <rect x="76" y="70" width="38" height="246" rx="19" fill="url(#cg)"/>
        <path d="M76 170 q-34 0 -34 -42 v-26 a14 14 0 0 1 28 0 v22 q0 18 6 18 Z" fill="url(#cg)"/>
        <path d="M114 150 q34 0 34 -42 v-30 a14 14 0 0 1 28 0 v34 q0 36 -62 60 Z" fill="url(#cg)"/>
        <g stroke="#0e4a22" stroke-width="3"><line x1="95" y1="92" x2="95" y2="300"/></g>
      </svg>`;
    },

    pineSVG(snow) {
      const leaf = snow ? "#2a5a4a" : "#157a3e";
      const leaf2 = snow ? "#3a6a5a" : "#1d9b56";
      const cap = snow
        ? `<path d="M95 28 L122 96 Q95 84 68 96 Z" fill="#eef4f8"/>
           <path d="M95 96 L132 168 Q95 150 58 168 Z" fill="#dfeaf2" opacity=".85"/>`
        : "";
      return `<svg xmlns="http://www.w3.org/2000/svg" width="190" height="360" viewBox="0 0 190 360">
        <ellipse cx="95" cy="350" rx="60" ry="11" fill="rgba(0,0,0,.32)"/>
        <rect x="86" y="280" width="18" height="70" fill="#4a2e16"/>
        <path d="M95 20 L140 130 Q95 112 50 130 Z" fill="${leaf}"/>
        <path d="M95 80 L156 210 Q95 188 34 210 Z" fill="${leaf2}"/>
        <path d="M95 150 L172 296 Q95 270 18 296 Z" fill="${leaf}"/>
        ${cap}
      </svg>`;
    },

    rockSVG() {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="220" viewBox="0 0 260 220">
        <defs><linearGradient id="rk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#b5683f"/><stop offset=".55" stop-color="#8a472a"/>
          <stop offset="1" stop-color="#5a2c18"/></linearGradient></defs>
        <ellipse cx="130" cy="210" rx="100" ry="14" fill="rgba(0,0,0,.32)"/>
        <path d="M30 210 L52 96 L96 60 L150 44 L206 86 L232 150 L230 210 Z" fill="url(#rk)"/>
        <path d="M52 96 L96 60 L120 120 L78 150 Z" fill="rgba(255,255,255,.10)"/>
        <path d="M150 44 L206 86 L176 132 L132 96 Z" fill="rgba(0,0,0,.18)"/>
      </svg>`;
    },

    buildingSVG(c) {
      let win = "";
      for (let y = 70; y < 520; y += 46)
        for (let x = 70; x < 196; x += 38)
          win += `<rect x="${x}" y="${y}" width="22" height="28"/>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="560" viewBox="0 0 260 560">
        <defs><linearGradient id="bd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${c.hi}"/><stop offset="1" stop-color="${c.lo}"/></linearGradient></defs>
        <ellipse cx="130" cy="550" rx="96" ry="12" fill="rgba(0,0,0,.4)"/>
        <rect x="54" y="40" width="152" height="510" fill="url(#bd)" stroke="${c.edge}" stroke-width="3"/>
        <rect x="106" y="14" width="48" height="32" fill="${c.lo}"/>
        <g fill="${c.win}">${win}</g>
        <rect x="54" y="40" width="152" height="510" fill="none" stroke="${c.edge}" stroke-width="3"/>
      </svg>`;
    },

    billboardSVG(text, accent) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="340" viewBox="0 0 440 340">
        <defs><linearGradient id="bp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#241042"/><stop offset="1" stop-color="#120626"/></linearGradient></defs>
        <ellipse cx="220" cy="330" rx="150" ry="14" fill="rgba(0,0,0,.32)"/>
        <rect x="86" y="150" width="20" height="180" fill="#3a2a1a"/>
        <rect x="334" y="150" width="20" height="180" fill="#3a2a1a"/>
        <rect x="40" y="20" width="360" height="170" rx="12" fill="url(#bp)" stroke="${accent}" stroke-width="6"/>
        <rect x="40" y="20" width="360" height="170" rx="12" fill="none" stroke="${accent}" stroke-width="6" opacity=".4"/>
        <text x="220" y="118" text-anchor="middle" font-family="Arial Black, Arial, sans-serif"
              font-size="58" font-weight="900" fill="#fff" stroke="${accent}" stroke-width="2"
              style="paint-order:stroke">${text}</text>
        <circle cx="60" cy="40" r="6" fill="${accent}"/><circle cx="380" cy="40" r="6" fill="${accent}"/>
        <circle cx="60" cy="170" r="6" fill="${accent}"/><circle cx="380" cy="170" r="6" fill="${accent}"/>
      </svg>`;
    },

    // a roadside route sign: arrow + label, placed before a fork
    signSVG(dir, label, accent) {
      const arrow = dir === "L"
        ? `<path d="M150 60 L70 110 L150 160 L150 130 L210 130 L210 90 L150 90 Z" fill="${accent}"/>`
        : `<path d="M130 60 L210 110 L130 160 L130 130 L70 130 L70 90 L130 90 Z" fill="${accent}"/>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="320" viewBox="0 0 300 320">
        <ellipse cx="150" cy="310" rx="70" ry="10" fill="rgba(0,0,0,.32)"/>
        <rect x="142" y="180" width="16" height="130" fill="#2a2a2a"/>
        <rect x="24" y="24" width="252" height="170" rx="10" fill="#0c0626" stroke="${accent}" stroke-width="5"/>
        ${arrow}
        <text x="150" y="186" text-anchor="middle" font-family="Arial Black, Arial, sans-serif"
              font-size="30" font-weight="900" fill="#fff">${label}</text>
      </svg>`;
    },

    goalSVG() {
      let chk = "";
      for (let i = 0; i < 22; i++)
        chk += `<rect x="${60 + i * 36}" y="110" width="18" height="18"/><rect x="${78 + i * 36}" y="128" width="18" height="18"/>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="320" viewBox="0 0 900 320">
        <ellipse cx="450" cy="306" rx="360" ry="12" fill="rgba(0,0,0,.35)"/>
        <rect x="60" y="40" width="26" height="270" fill="#2a2a2a"/>
        <rect x="814" y="40" width="26" height="270" fill="#2a2a2a"/>
        <rect x="60" y="30" width="780" height="70" rx="8" fill="#0c0626" stroke="#19f0ff" stroke-width="6"/>
        <text x="450" y="84" text-anchor="middle" font-family="Arial Black, Arial, sans-serif"
              font-size="56" font-weight="900" fill="#fff" stroke="#ff2e88" stroke-width="2"
              style="paint-order:stroke">GOAL</text>
        <g fill="#19f0ff">${chk}</g>
      </svg>`;
    },

    load(onProgress, onDone) {
      const defs = [
        ["player", this.playerCarSVG()],
        ["car0", this.trafficCarSVG({ hi: "#7fe3ff", mid: "#1f9ad6", lo: "#0c4f73" })],
        ["car1", this.trafficCarSVG({ hi: "#ffd56b", mid: "#f59e1b", lo: "#8a560a" })],
        ["car2", this.trafficCarSVG({ hi: "#c6ff8a", mid: "#5fcf3a", lo: "#256b18" })],
        ["car3", this.trafficCarSVG({ hi: "#ff9ad0", mid: "#d63a8a", lo: "#7a1450" })],
        ["palm", this.palmSVG()],
        ["cactus", this.cactusSVG()],
        ["pine", this.pineSVG(false)],
        ["pineSnow", this.pineSVG(true)],
        ["rock", this.rockSVG()],
        ["building", this.buildingSVG({ hi: "#3a2a6a", lo: "#100626", edge: "#19f0ff", win: "#ffe14a" })],
        ["bbDiner", this.billboardSVG("DINER", "#ff2e88")],
        ["bbMotel", this.billboardSVG("MOTEL", "#19f0ff")],
        ["bbGas", this.billboardSVG("GAS", "#ffd24a")],
        ["bbVegas", this.billboardSVG("VEGAS", "#ff7e3d")],
        ["bbCoast", this.billboardSVG("COAST", "#7afcff")],
        ["signL", this.signSVG("L", "ROUTE", "#19f0ff")],
        ["signR", this.signSVG("R", "ROUTE", "#ff2e88")],
        ["goal", this.goalSVG()]
      ];
      let done = 0;
      const total = defs.length;
      defs.forEach(([key, svg]) => {
        const img = new Image();
        const rec = this.sprites[key] = { img: img, w: 1, h: 1 };
        const finish = () => {
          rec.w = img.naturalWidth || img.width || 1;
          rec.h = img.naturalHeight || img.height || 1;
          done++;
          onProgress(done / total);
          if (done === total) onDone();
        };
        img.onload = finish;
        img.onerror = finish;
        img.src = this.svgURL(svg);
      });
    }
  };

  /* ----------------------------------------------------------
   *  AudioManager - synthesised SFX + engine drone
   * -------------------------------------------------------- */
  class AudioManager {
    constructor() {
      this.ctx = null; this.muted = false;
      this.master = null; this.engine = null; this.engineGain = null;
    }
    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    resume() { this.ensure(); if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }
    setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }
    blip(freq, dur, type, vol, slideTo) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    }
    noiseBurst(dur, vol) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = this.ctx.createBufferSource();
      s.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = vol || 0.4;
      s.connect(g); g.connect(this.master);
      s.start(t);
    }
    startEngine() {
      if (!this.ctx || this.engine) return;
      this.engine = this.ctx.createOscillator();
      this.engine.type = "sawtooth";
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 900;
      this.engine.connect(lp); lp.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engine.frequency.value = 60;
      this.engine.start();
    }
    updateEngine(speedPct, boosting) {
      if (!this.engine) return;
      const t = this.ctx.currentTime;
      this.engine.frequency.setTargetAtTime(55 + speedPct * (boosting ? 230 : 170), t, 0.08);
      this.engineGain.gain.setTargetAtTime(0.05 + speedPct * 0.14, t, 0.1);
    }
    stopEngine() {
      if (!this.engine) return;
      try { this.engine.stop(); } catch (e) {}
      this.engine.disconnect();
      this.engine = null; this.engineGain = null;
    }
    sfx(name) {
      if (!this.ctx || this.muted) return;
      switch (name) {
        case "start":      this.blip(330, 0.12, "square", 0.3, 660); break;
        case "checkpoint": this.blip(660, 0.1, "square", 0.35, 990);
                           setTimeout(() => this.blip(990, 0.16, "square", 0.3), 90); break;
        case "collide":    this.noiseBurst(0.25, 0.5);
                           this.blip(120, 0.22, "sawtooth", 0.4, 50); break;
        case "boost":      this.blip(180, 0.35, "sawtooth", 0.35, 720); break;
        case "near":       this.blip(880, 0.06, "triangle", 0.18); break;
        case "count":      this.blip(440, 0.1, "square", 0.3); break;
        case "go":         this.blip(880, 0.25, "square", 0.35, 1320); break;
        case "fork":       this.blip(520, 0.09, "square", 0.3, 760);
                           setTimeout(() => this.blip(760, 0.12, "square", 0.28), 80); break;
        case "win":        [0, 140, 280, 460].forEach((d, i) =>
                             setTimeout(() => this.blip(523 + i * 130, 0.22, "square", 0.34, 660 + i * 160), d)); break;
        case "gameover":   this.blip(440, 0.2, "sawtooth", 0.35, 110);
                           setTimeout(() => this.blip(220, 0.4, "sawtooth", 0.3, 60), 180); break;
      }
    }
  }

  /* ----------------------------------------------------------
   *  Input - keyboard + multi-touch DOM buttons
   * -------------------------------------------------------- */
  class Input {
    constructor() {
      this.keyL = false; this.keyR = false;
      this.joyAxis = 0;
      this.gas = false; this.brake = false; this.boost = false;
      this._joy = null;
      this._bindKeys(); this._bindButtons(); this._bindJoystick();
    }
    get axis() {
      return Util.clamp(this.joyAxis + (this.keyR ? 1 : 0) - (this.keyL ? 1 : 0), -1, 1);
    }
    _bindKeys() {
      const k = (e, v) => {
        switch (e.code) {
          case "ArrowLeft": case "KeyA": this.keyL = v; break;
          case "ArrowRight": case "KeyD": this.keyR = v; break;
          case "ArrowUp": case "KeyW": this.gas = v; break;
          case "ArrowDown": case "KeyS": this.brake = v; break;
          case "Space": this.boost = v; break;
          default: return;
        }
        e.preventDefault();
      };
      window.addEventListener("keydown", e => k(e, true), { passive: false });
      window.addEventListener("keyup", e => k(e, false), { passive: false });
    }
    _hold(el, set) {
      if (!el) return;
      const on = (e) => { e.preventDefault(); set(true); el.classList.add("on"); };
      const off = (e) => { e.preventDefault(); set(false); el.classList.remove("on"); };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointercancel", off);
      el.addEventListener("pointerleave", off);
      el.addEventListener("touchstart", on, { passive: false });
      el.addEventListener("touchend", off, { passive: false });
    }
    _bindButtons() {
      this._hold(document.getElementById("pedal-gas"), v => this.gas = v);
      this._hold(document.getElementById("pedal-brake"), v => this.brake = v);
      this._hold(document.getElementById("pedal-boost"), v => this.boost = v);
    }
    _pt(e) {
      if (e.clientX != null) return e;
      if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0];
      if (e.touches && e.touches[0]) return e.touches[0];
      return null;
    }
    _bindJoystick() {
      const zone = document.getElementById("joy-zone");
      const base = document.getElementById("joystick");
      const knob = document.getElementById("joy-knob");
      if (!zone || !base || !knob) return;
      const J = this._joy = { id: null, ox: 0, oy: 0, r: 60 };
      const start = (e) => {
        const p = this._pt(e);
        if (!p || J.id !== null) return;
        e.preventDefault();
        J.id = (e.pointerId != null) ? e.pointerId : "t";
        J.ox = p.clientX; J.oy = p.clientY;
        const sz = base.offsetWidth || 150;
        J.r = sz * 0.40;
        base.style.left = (p.clientX - sz / 2) + "px";
        base.style.top = (p.clientY - sz / 2) + "px";
        base.style.right = "auto"; base.style.bottom = "auto";
        base.classList.add("active");
        knob.style.transform = "translate(0px,0px)";
        if (e.pointerId != null && zone.setPointerCapture) {
          try { zone.setPointerCapture(e.pointerId); } catch (err) {}
        }
      };
      const move = (e) => {
        if (J.id === null) return;
        const p = this._pt(e);
        if (!p) return;
        e.preventDefault();
        let dx = p.clientX - J.ox;
        let dy = p.clientY - J.oy;
        const r = J.r;
        const d = Math.hypot(dx, dy);
        if (d > r) { dx = dx / d * r; dy = dy / d * r; }
        knob.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
        let a = dx / r;
        const dz = 0.10;
        a = (Math.abs(a) < dz) ? 0 : (a - Math.sign(a) * dz) / (1 - dz);
        this.joyAxis = Util.clamp(a, -1, 1);
      };
      const end = (e) => {
        if (J.id === null) return;
        if (e && e.preventDefault) e.preventDefault();
        J.id = null;
        this.joyAxis = 0;
        knob.style.transform = "translate(0px,0px)";
        base.classList.remove("active");
        base.style.left = base.style.top = base.style.right = base.style.bottom = "";
      };
      zone.addEventListener("pointerdown", start);
      zone.addEventListener("pointermove", move);
      zone.addEventListener("pointerup", end);
      zone.addEventListener("pointercancel", end);
      zone.addEventListener("touchstart", start, { passive: false });
      zone.addEventListener("touchmove", move, { passive: false });
      zone.addEventListener("touchend", end, { passive: false });
      zone.addEventListener("touchcancel", end, { passive: false });
    }
    reset() {
      this.keyL = this.keyR = false;
      this.joyAxis = 0;
      this.gas = this.brake = this.boost = false;
    }
  }

  /* ----------------------------------------------------------
   *  Road - builds a FINITE, BRANCHING course node by node
   * -------------------------------------------------------- */
  class Road {
    constructor() {
      this.segments = [];
      this.nodes = [];          // committed path: [{stage,index,theme,...}]
      this.trackLength = 0;
    }
    // clamp (no looping); last segment is the finish line
    segAt(z) {
      const i = Math.floor(z / SEG_LEN);
      const s = this.segments;
      return s[i < 0 ? 0 : (i >= s.length ? s.length - 1 : i)];
    }

    _push(curve, y, themeKey, fadeFrom, fade) {
      const n = this.segments.length;
      const prevY = n === 0 ? 0 : this.segments[n - 1].p2.world.y;
      this.segments.push({
        index: n,
        curve: curve,
        p1: { world: { x: 0, y: prevY, z: n * SEG_LEN }, camera: {}, screen: {} },
        p2: { world: { x: 0, y: y, z: (n + 1) * SEG_LEN }, camera: {}, screen: {} },
        dark: Math.floor(n / RUMBLE_LEN) % 2 === 1,
        theme: themeKey, fadeFrom: fadeFrom, fade: fade,
        sprites: [], cars: [], clip: 0, fog: 0
      });
    }
    _ease(a, b, p) { return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5); }

    // emit one road piece into the current node
    _addRoad(enter, hold, leave, curve, height, themeKey, fadeFrom, fadeBaseIdx) {
      const segs = this.segments;
      const startY = segs.length ? segs[segs.length - 1].p2.world.y : 0;
      const endY = startY + height * SEG_LEN;
      const total = enter + hold + leave;
      const fadeAt = () => {
        if (!fadeFrom) return 1;
        return Util.clamp((segs.length - fadeBaseIdx) / FADE_SEGS, 0, 1);
      };
      let n;
      for (n = 0; n < enter; n++)
        this._push(this._ease(0, curve, n / enter),
          this._ease(startY, endY, n / total), themeKey, fadeFrom, fadeAt());
      for (n = 0; n < hold; n++)
        this._push(curve, this._ease(startY, endY, (enter + n) / total),
          themeKey, fadeFrom, fadeAt());
      for (n = 0; n < leave; n++)
        this._push(this._ease(curve, 0, n / leave),
          this._ease(startY, endY, (enter + hold + n) / total),
          themeKey, fadeFrom, fadeAt());
    }

    reset() {
      this.segments = [];
      this.nodes = [];
      this.trackLength = 0;
      this._buildNode(1, 0, null);
    }

    nodeKey(stage, index) { return stage + "-" + index; }

    // build one route node's segments and append them
    _buildNode(stage, index, fadeFromTheme) {
      const def = ROUTE[this.nodeKey(stage, index)];
      const theme = def.theme;
      const startSeg = this.segments.length;
      const fadeBaseIdx = startSeg;
      const rnd = Util.seedRand(stage * 131 + index * 977 + 7);

      // difficulty rises with stage; LEFT (lower index) a touch tighter
      const stageF = (stage - 1) / (STAGES - 1);          // 0..1
      const curveBase = 1.8 + stageF * 4.2;                // curve strength
      const hillBase = 16 + stageF * 56;                   // hill amplitude
      const tilt = 1 - index * 0.05;                       // left harder
      const pieces = 7 + stage * 2;                        // node length

      // gentle run-in for the very first node
      if (stage === 1 && index === 0)
        this._addRoad(45, 45, 45, 0, 0, theme, null, fadeBaseIdx);

      for (let p = 0; p < pieces; p++) {
        const dir = rnd() < 0.5 ? -1 : 1;
        const mag = (0.25 + rnd() * 0.95) * curveBase * tilt;
        const curve = (rnd() < 0.32) ? 0 : dir * mag;
        const hill = (rnd() < 0.45)
          ? (rnd() < 0.5 ? -1 : 1) * hillBase * (0.4 + rnd() * 1.0) : 0;
        const enter = 22 + Math.floor(rnd() * 22);
        const hold = 34 + Math.floor(rnd() * 46);
        const leave = 22 + Math.floor(rnd() * 22);
        const ff = (this.segments.length - fadeBaseIdx) < FADE_SEGS ? fadeFromTheme : null;
        this._addRoad(enter, hold, leave, curve, hill, theme, ff, fadeBaseIdx);
      }
      // straighten the last stretch so the checkpoint/fork reads clearly
      this._addRoad(30, 60, 30, 0, 0, theme, null, fadeBaseIdx);
      while (this.segments.length % RUMBLE_LEN !== 0)
        this._push(0, this.segments[this.segments.length - 1].p2.world.y, theme, null, 1);

      const endSeg = this.segments.length - 1;
      const node = {
        stage, index, theme,
        name: THEMES[theme].name,
        goal: def.goal || null,
        startSeg, endSeg,
        lockSeg: Math.max(startSeg, endSeg - LOCK_AHEAD),
        committed: false
      };
      this.nodes.push(node);
      this.trackLength = this.segments.length * SEG_LEN;
      this._decorate(node);
      return node;
    }

    _decorate(node) {
      const segs = this.segments;
      const th = THEMES[node.theme];
      const bb = ["bbDiner", "bbMotel", "bbGas", "bbVegas", "bbCoast"];
      let bbi = (node.stage * 3 + node.index) % bb.length;
      for (let i = node.startSeg + 6; i <= node.endSeg; i++) {
        if (i % 16 === 0) {
          const k = th.decor[((i / 16) | 0) % th.decor.length];
          if (k) segs[i].sprites.push({ key: k === "billboard" ? bb[bbi++ % bb.length] : k, offset: -1.35 });
        }
        if (i % 16 === 8) {
          const k = th.decor[((((i - 8) / 16) + 1) | 0) % th.decor.length];
          if (k) segs[i].sprites.push({ key: k === "billboard" ? bb[bbi++ % bb.length] : k, offset: 1.35 });
        }
      }
      // route signs on the approach to a fork (not on the final goal node)
      if (node.stage < STAGES) {
        const aprStart = Math.max(node.startSeg + 4, node.lockSeg - 130);
        for (let s = aprStart; s < node.lockSeg; s += 22) {
          if (segs[s]) {
            segs[s].sprites.push({ key: "signL", offset: -2.05 });
            segs[s].sprites.push({ key: "signR", offset: 2.05 });
          }
        }
      } else {
        const gs = Math.max(node.startSeg, node.endSeg - 8);
        if (segs[gs]) segs[gs].sprites.push({ key: "goal", offset: 0 });
      }
    }

    // commit the chosen branch and append the next node (or null at goal)
    commitBranch(node, goRight, fadeFromTheme) {
      node.committed = true;
      if (node.stage >= STAGES) return null;
      const nextStage = node.stage + 1;
      const nextIndex = node.index + (goRight ? 1 : 0);
      return this._buildNode(nextStage, nextIndex, fadeFromTheme);
    }
  }

  /* ----------------------------------------------------------
   *  Game
   * -------------------------------------------------------- */
  class Game {
    constructor() {
      this.canvas = document.getElementById("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.audio = new AudioManager();
      this.input = new Input();
      this.road = new Road();

      this.W = 0; this.H = 0; this.dpr = 1;
      this.state = "loading";
      this.bestScore = parseInt(localStorage.getItem("neonHighwayBest") || "0", 10);

      this.skyGrad = null;
      this.skyTheme = null;
      this.mountains = this._buildMountains();
      this.stars = this._buildStars();

      this._cacheDOM();
      this._bindUI();
      this._resize();
      window.addEventListener("resize", () => this._resize());
      window.addEventListener("orientationchange", () => setTimeout(() => this._resize(), 250));
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.state === "playing") this._pause();
      });

      this._setState("loading");
      this._updateBestUI();

      AssetFactory.load(
        p => { this.dom.loadFill.style.width = Math.round(p * 100) + "%"; },
        () => { this._setState("title"); }
      );

      this.last = performance.now();
      requestAnimationFrame(t => this._frame(t));
    }

    /* ---- DOM ---- */
    _cacheDOM() {
      const $ = id => document.getElementById(id);
      this.dom = {
        hud: $("hud"), score: $("hud-score"), time: $("hud-time"),
        timeBox: document.querySelector(".hud-time"),
        best: $("hud-best"), dist: $("hud-dist"),
        stage: $("hud-stage"), biome: $("hud-biome"), speed: $("hud-speed"),
        flash: $("flash"), controls: $("controls"),
        loadFill: $("loading-fill"),
        sTitle: $("screen-title"), sLoad: $("screen-loading"),
        sCount: $("screen-countdown"), sPause: $("screen-paused"),
        sOver: $("screen-gameover"), sFinish: $("screen-finish"),
        sRotate: $("screen-rotate"),
        countNum: $("count-num"),
        titleBest: $("title-best"),
        goScore: $("go-score"), goDist: $("go-dist"), goBest: $("go-best"),
        goNewBest: $("go-newbest"),
        finTitle: $("fin-title"), finDest: $("fin-dest"),
        finScore: $("fin-score"), finBest: $("fin-best"),
        finNewBest: $("fin-newbest"), finMap: $("fin-map"),
        boostBtn: $("pedal-boost"), btnMute: $("btn-mute")
      };
    }
    _bindUI() {
      const tap = (el, fn) => { if (el) el.addEventListener("click", fn); };
      this.dom.sTitle.addEventListener("pointerdown", () => this._startRun());
      tap(document.getElementById("btn-again"), () => this._startRun());
      tap(document.getElementById("btn-finagain"), () => this._startRun());
      tap(document.getElementById("btn-resume"), () => this._resume());
      tap(document.getElementById("btn-quit"), () => this._setState("title"));
      tap(document.getElementById("btn-pause"), () => {
        if (this.state === "playing") this._pause();
      });
      tap(this.dom.btnMute, () => {
        this.audio.setMuted(!this.audio.muted);
        this.dom.btnMute.innerHTML = this.audio.muted ? "&#128263;" : "&#128266;";
      });
    }

    /* ---- responsive canvas ---- */
    _resize() {
      const r = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.W = Math.max(1, Math.round(r.width));
      this.H = Math.max(1, Math.round(r.height));
      this.canvas.width = Math.round(this.W * this.dpr);
      this.canvas.height = Math.round(this.H * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.skyTheme = null;            // force sky rebuild
      this._checkOrientation();
    }
    _checkOrientation() {
      const portrait = window.innerHeight > window.innerWidth;
      if (portrait) {
        this.dom.sRotate.classList.remove("hide");
        if (this.state === "playing") this._pause();
      } else {
        this.dom.sRotate.classList.add("hide");
      }
    }

    // sky gradient built from a (possibly blended) theme stop list
    _skyFor(themeKey, fromKey, t) {
      const a = THEMES[themeKey].sky;
      const stops = (fromKey && t < 1)
        ? a.map((s, i) => {
            const b = THEMES[fromKey].sky;
            const bs = b[Math.min(i, b.length - 1)];
            return [Util.lerp(bs[0], s[0], t),
              Util.rgbStr(Util.blendRgb(bs[1], s[1], t))];
          })
        : a.map(s => [s[0], s[1]]);
      const g = this.ctx.createLinearGradient(0, 0, 0, this.H);
      stops.forEach(s => g.addColorStop(Util.clamp(s[0], 0, 1), s[1]));
      g.addColorStop(1, stops[stops.length - 1][1]);
      return g;
    }
    _buildMountains() {
      const pts = [];
      let y = 0.5;
      for (let i = 0; i <= 64; i++) {
        y += (Math.random() - 0.5) * 0.5;
        y = Util.clamp(y, 0.15, 0.95);
        pts.push(y);
      }
      pts[64] = pts[0];
      return pts;
    }
    _buildStars() {
      const s = [];
      for (let i = 0; i < 140; i++)
        s.push({ x: Math.random(), y: Math.random() * 0.5, r: Math.random() * 1.4 + 0.3 });
      return s;
    }

    /* ---- state machine ---- */
    _setState(s) {
      this.state = s;
      document.body.className = "state-" + s;
      const D = this.dom;
      [D.sTitle, D.sLoad, D.sCount, D.sPause, D.sOver, D.sFinish].forEach(e => e && e.classList.add("hide"));
      D.hud.classList.add("hide");
      D.controls.classList.add("hide");
      if (s === "loading") D.sLoad.classList.remove("hide");
      if (s === "title") { D.sTitle.classList.remove("hide"); this._updateBestUI(); }
      if (s === "countdown") D.sCount.classList.remove("hide");
      if (s === "paused") D.sPause.classList.remove("hide");
      if (s === "gameover") D.sOver.classList.remove("hide");
      if (s === "finish") D.sFinish.classList.remove("hide");
      if (s === "playing" || s === "countdown") {
        D.hud.classList.remove("hide");
        D.controls.classList.remove("hide");
      }
      this._checkOrientation();
    }
    _updateBestUI() {
      this.dom.best.textContent = this.bestScore;
      this.dom.titleBest.textContent = this.bestScore;
    }

    /* ---- run lifecycle ---- */
    _resetRun() {
      this.road.reset();
      this.position = 0;
      this.playerX = 0;
      this.speed = 0;
      this.traveled = 0;
      this.scoreF = 0;
      this.timeLeft = START_TIME;
      this.stageNo = 1;
      this.curNode = this.road.nodes[0];
      this.path = [{ stage: 1, index: 0, theme: this.curNode.theme }];
      this.boostT = 0; this.boostCD = 0;
      this.shake = 0; this.steerVis = 0;
      this.forkFlashed = false;
      this.cars = [];
      this._spawnTraffic(this.curNode);
      this._updateHUD();
    }

    _spawnTraffic(node) {
      const palette = ["car0", "car1", "car2", "car3"];
      const span = node.endSeg - node.startSeg;
      const n = Math.max(5, Math.floor(span * (0.05 + node.stage * 0.006)));
      for (let i = 0; i < n; i++) {
        const seg = Util.randInt(node.startSeg + 30, Math.max(node.startSeg + 31, node.endSeg - 6));
        const sp = AssetFactory.sprites[Util.randChoice(palette)];
        const car = {
          offset: (Math.random() * 1.6 - 0.8),
          z: seg * SEG_LEN + Math.random() * SEG_LEN,
          sprite: sp,
          speed: MAX_SPEED * (0.26 + Math.random() * 0.42),
          prevRel: 1, counted: false
        };
        this.cars.push(car);
        this.road.segAt(car.z).cars.push(car);
      }
    }

    _startRun() {
      this.audio.resume();
      this.audio.sfx("start");
      this._resetRun();
      this._beginCountdown();
    }
    _beginCountdown() {
      this._setState("countdown");
      let n = 3;
      this.dom.countNum.textContent = n;
      this.audio.sfx("count");
      const tick = () => {
        n--;
        if (n > 0) {
          this.dom.countNum.textContent = n;
          this.audio.sfx("count");
          this._cdTimer = setTimeout(tick, 1000);
        } else {
          this.dom.countNum.textContent = "GO!";
          this.audio.sfx("go");
          this._cdTimer = setTimeout(() => {
            this._setState("playing");
            this.audio.startEngine();
            this.last = performance.now();
          }, 700);
        }
      };
      this._cdTimer = setTimeout(tick, 1000);
    }
    _pause() {
      if (this.state !== "playing") return;
      this._setState("paused");
      this.audio.stopEngine();
    }
    _resume() {
      if (this.state !== "paused") return;
      this.audio.resume();
      this._setState("playing");
      this.audio.startEngine();
      this.last = performance.now();
    }

    _gameOver() {
      this._setState("gameover");
      this.audio.stopEngine();
      this.audio.sfx("gameover");
      const score = Math.floor(this.scoreF);
      const distM = Math.floor(this.traveled / 100);
      const isBest = score > this.bestScore;
      if (isBest) { this.bestScore = score; localStorage.setItem("neonHighwayBest", String(score)); }
      this.dom.goScore.textContent = score;
      this.dom.goDist.textContent = distM + " m";
      this.dom.goBest.textContent = this.bestScore;
      this.dom.goNewBest.classList.toggle("hide", !isBest);
      this._updateBestUI();
    }

    _finish(node) {
      this._setState("finish");
      this.audio.stopEngine();
      this.audio.sfx("win");
      const timeBonus = Math.floor(this.timeLeft) * 250;
      this.scoreF += timeBonus + 5000;
      const score = Math.floor(this.scoreF);
      const isBest = score > this.bestScore;
      if (isBest) { this.bestScore = score; localStorage.setItem("neonHighwayBest", String(score)); }
      this.dom.finTitle.textContent = "GOAL " + node.goal;
      this.dom.finDest.textContent = node.name;
      this.dom.finScore.textContent = score;
      this.dom.finBest.textContent = this.bestScore;
      this.dom.finNewBest.classList.toggle("hide", !isBest);
      this.dom.finMap.innerHTML = this._routeMapSVG(this.path);
      this._updateBestUI();
    }

    // SVG recap of the 15-node triangle with the taken path highlighted
    _routeMapSVG(path) {
      const W = 280, H = 196, pad = 22;
      const visited = {};
      path.forEach(p => visited[p.stage + "-" + p.index] = true);
      const pos = (st, ix) => {
        const y = pad + (st - 1) / (STAGES - 1) * (H - 2 * pad);
        const spread = (W - 2 * pad) * (st - 1) / (STAGES - 1);
        const x = W / 2 - spread / 2 + (st === 1 ? 0 : spread * ix / (st - 1));
        return [x, y];
      };
      let lines = "", dots = "";
      for (let st = 1; st < STAGES; st++) {
        for (let ix = 0; ix < st; ix++) {
          const a = pos(st, ix);
          [[st + 1, ix], [st + 1, ix + 1]].forEach(nn => {
            const b = pos(nn[0], nn[1]);
            const on = visited[st + "-" + ix] && visited[nn[0] + "-" + nn[1]];
            lines += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"
              stroke="${on ? "#19f0ff" : "rgba(255,255,255,.16)"}"
              stroke-width="${on ? 3 : 1.5}"/>`;
          });
        }
      }
      for (let st = 1; st <= STAGES; st++) {
        for (let ix = 0; ix < st; ix++) {
          const c = pos(st, ix);
          const key = st + "-" + ix;
          const isGoal = st === STAGES;
          const on = visited[key];
          const col = on ? (isGoal ? "#ffe14a" : "#19f0ff") : "rgba(255,255,255,.22)";
          dots += `<circle cx="${c[0]}" cy="${c[1]}" r="${on ? 6 : 4}" fill="${col}"
            ${on ? 'stroke="#fff" stroke-width="1.5"' : ""}/>`;
          if (isGoal)
            dots += `<text x="${c[0]}" y="${c[1] + 18}" text-anchor="middle"
              font-size="10" fill="${on ? "#ffe14a" : "rgba(255,255,255,.3)"}"
              font-family="Arial">${ROUTE[key].goal}</text>`;
        }
      }
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">
        ${lines}${dots}</svg>`;
    }

    _flash(msg, color) {
      const f = this.dom.flash;
      f.textContent = msg;
      if (color) f.style.webkitTextStroke = "2px " + color;
      f.classList.remove("hide");
      f.style.animation = "none";
      void f.offsetWidth;
      f.style.animation = "";
      clearTimeout(this._flashT);
      this._flashT = setTimeout(() => f.classList.add("hide"), 1100);
    }

    /* ---- main loop ---- */
    _frame(t) {
      let dt = (t - this.last) / 1000;
      this.last = t;
      if (dt > 0.05) dt = 0.05;
      // A single bad frame must never kill the loop (which would
      // freeze the screen and make the title tap look unresponsive).
      try {
        if (this.state === "playing") this._update(dt);
        this._render();
      } catch (err) {
        if (!this._loggedFrameErr) { this._loggedFrameErr = true; console.error(err); }
      }
      requestAnimationFrame(n => this._frame(n));
    }

    _update(dt) {
      const road = this.road;
      const speedPct = this.speed / MAX_SPEED;

      // ---- boost ----
      let curMax = MAX_SPEED;
      if (this.boostT > 0) {
        this.boostT -= dt;
        curMax = MAX_SPEED * BOOST_MULT;
        if (this.boostT <= 0) this.boostCD = BOOST_COOLDOWN;
      } else if (this.boostCD > 0) {
        this.boostCD -= dt;
      }
      const boostReady = this.boostT <= 0 && this.boostCD <= 0;
      if (this.input.boost && boostReady && this.speed > MAX_SPEED * 0.15) {
        this.boostT = BOOST_TIME;
        this.audio.sfx("boost");
      }
      this.dom.boostBtn.classList.toggle("cooldown", !(this.boostT <= 0 && this.boostCD <= 0));

      // ---- steering ----
      const playerSeg = road.segAt(this.position + PLAYER_Z);
      const dx = dt * 2.7 * Math.max(0.30, speedPct);
      const steer = this.input.axis;
      this.playerX += dx * steer;
      this.steerVis += (steer - this.steerVis) * Math.min(1, dt * 12);
      this.playerX -= dx * speedPct * playerSeg.curve * CENTRIFUGAL;

      // ---- throttle ----
      if (this.boostT > 0) this.speed = Util.accel(this.speed, ACCEL * 1.6, dt);
      else if (this.input.gas) this.speed = Util.accel(this.speed, ACCEL, dt);
      else if (this.input.brake) this.speed = Util.accel(this.speed, BRAKING, dt);
      else this.speed = Util.accel(this.speed, DECEL, dt);
      if ((this.playerX < -1 || this.playerX > 1) && this.speed > OFFROAD_LIMIT)
        this.speed = Util.accel(this.speed, OFFROAD_DECEL, dt);
      this.playerX = Util.clamp(this.playerX, -2.2, 2.2);
      this.speed = Util.clamp(this.speed, 0, curMax);

      // ---- advance (monotonic, no looping) ----
      const adv = dt * this.speed;
      this.position += adv;
      this.traveled += adv;

      // ---- branching / checkpoint / finish ----
      const node = this.curNode;
      const playerSegIdx = Math.floor((this.position + PLAYER_Z) / SEG_LEN);

      // heads-up flash as the fork approaches
      if (node.stage < STAGES && !this.forkFlashed &&
          playerSegIdx >= node.lockSeg - 150) {
        this.forkFlashed = true;
        this.audio.sfx("fork");
        this._flash("CHOOSE YOUR ROUTE", "#ffd24a");
      }

      // lock the branch from the player's side, build the next node
      if (!node.committed && playerSegIdx >= node.lockSeg) {
        if (node.stage >= STAGES) {
          node.committed = true;        // final stretch: ride to the goal
        } else {
          const goRight = this.playerX >= 0;
          const next = road.commitBranch(node, goRight, node.theme);
          this._spawnTraffic(next);
          this.path.push({ stage: next.stage, index: next.index, theme: next.theme });
        }
      }

      // crossing into the next node = checkpoint
      if (node.committed && node.stage < STAGES && playerSegIdx > node.endSeg) {
        const nx = road.nodes[road.nodes.indexOf(node) + 1];
        if (nx) {
          this.curNode = nx;
          this.stageNo = nx.stage;
          this.timeLeft += CP_BONUS_TIME;
          this.scoreF += 1500;
          this.forkFlashed = false;
          this.audio.sfx("checkpoint");
          this._flash("STAGE " + nx.stage + " — " + nx.name, "#19f0ff");
        }
      }

      // reached the end of a stage-5 node => WIN
      if (node.stage >= STAGES && playerSegIdx >= node.endSeg) {
        this._updateHUD();
        this._finish(node);
        return;
      }

      // ---- traffic ----
      this._updateCars(dt);
      this._collisions(playerSeg);

      // ---- score ----
      this.scoreF += this.speed * dt * 0.012;
      if (speedPct > 0.85) this.scoreF += dt * 140;

      // ---- timer ----
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this._updateHUD();
        this._gameOver();
        return;
      }

      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 14);
      this.audio.updateEngine(speedPct, this.boostT > 0);
      this._updateHUD();
    }

    _updateCars(dt) {
      const road = this.road;
      for (let i = 0; i < this.cars.length; i++) {
        const car = this.cars[i];
        const oldSeg = road.segAt(car.z);
        const rel = car.z - this.position;
        if (rel > 0 && rel < SEG_LEN * 14) {
          const lateral = car.offset - this.playerX;
          if (Math.abs(lateral) < 0.55)
            car.offset += (lateral >= 0 ? 1 : -1) * dt * 0.7;
        }
        car.offset = Util.clamp(car.offset, -1.6, 1.6);
        car.z += dt * car.speed;
        if (car.z >= road.trackLength - SEG_LEN) car.z = road.trackLength - SEG_LEN - 1;
        const newSeg = road.segAt(car.z);
        if (oldSeg !== newSeg) {
          const k = oldSeg.cars.indexOf(car);
          if (k >= 0) oldSeg.cars.splice(k, 1);
          newSeg.cars.push(car);
        }
        if (car.prevRel > 0 && rel <= 0 && !car.counted) {
          car.counted = true;
          const gap = Math.abs(car.offset - this.playerX);
          if (gap < 1.1 && gap > 0.42) {
            this.scoreF += 300;
            this.audio.sfx("near");
            this._flash("NEAR MISS +300", "#ffd24a");
          }
        }
        car.prevRel = rel;
      }
    }

    _collisions(playerSeg) {
      const playerW = AssetFactory.sprites.player.w * SPRITE_SCALE;
      for (let n = 0; n < playerSeg.cars.length; n++) {
        const car = playerSeg.cars[n];
        const carW = car.sprite.w * SPRITE_SCALE;
        if (this.speed > car.speed &&
            Util.overlap(this.playerX, playerW, car.offset, carW, 0.8)) {
          this.speed = Math.max(car.speed * 0.5, MAX_SPEED * 0.12);
          this.position = Math.max(0, car.z - PLAYER_Z * 1.2);
          this.shake = 1;
          this.audio.sfx("collide");
          this._flash("CRASH!", "#ff2e88");
          break;
        }
      }
    }

    _updateHUD() {
      const D = this.dom;
      D.score.textContent = Math.floor(this.scoreF);
      const ti = Math.ceil(this.timeLeft);
      D.time.textContent = ti;
      D.timeBox.classList.toggle("low", ti <= 8);
      D.best.textContent = Math.max(this.bestScore, Math.floor(this.scoreF));
      D.dist.innerHTML = Math.floor(this.traveled / 100) + "<small>m</small>";
      D.stage.textContent = this.stageNo + "/" + STAGES;
      D.biome.textContent = this.curNode ? this.curNode.name : "";
      D.speed.innerHTML = Math.round(this.speed / 100) + "<small>mph</small>";
    }

    /* ---- rendering ---- */
    _render() {
      const ctx = this.ctx, W = this.W, H = this.H;
      const road = this.road;
      ctx.clearRect(0, 0, W, H);

      let shx = 0, shy = 0;
      if (this.shake > 0) {
        shx = (Math.random() - 0.5) * 16 * this.shake;
        shy = (Math.random() - 0.5) * 12 * this.shake;
      }
      ctx.save();
      ctx.translate(shx, shy);

      const pos = (this.position != null) ? this.position : 0;
      const plX = (this.playerX != null) ? this.playerX : 0;

      let baseSeg;
      if ((this.state === "loading" || this.state === "title")) {
        baseSeg = road.segments.length ? road.segments[0] : null;
      } else {
        baseSeg = road.segAt(pos);
      }
      this._renderBackground(baseSeg);
      if (!road.segments.length || !baseSeg) { ctx.restore(); return; }

      const basePct = Util.percentRemaining(pos, SEG_LEN);
      const playerSeg = road.segAt(pos + PLAYER_Z);
      const playerPct = Util.percentRemaining(pos + PLAYER_Z, SEG_LEN);
      const playerY = Util.lerp(playerSeg.p1.world.y, playerSeg.p2.world.y, playerPct);

      let x = 0;
      let ddx = -(baseSeg.curve * basePct);
      let maxY = H;
      const segs = road.segments;
      const N = segs.length;
      const drawn = [];

      for (let n = 0; n < DRAW_DIST; n++) {
        const idx = baseSeg.index + n;
        if (idx >= N) break;                 // finite road: stop at the end
        const seg = segs[idx];
        seg.fog = Util.exponentialFog(n / DRAW_DIST, FOG_DENSITY);
        seg.clip = maxY;

        Util.project(seg.p1, (plX * ROAD_WIDTH) - x, playerY + CAM_HEIGHT,
          pos, CAM_DEPTH, W, H, ROAD_WIDTH);
        Util.project(seg.p2, (plX * ROAD_WIDTH) - x - ddx, playerY + CAM_HEIGHT,
          pos, CAM_DEPTH, W, H, ROAD_WIDTH);

        x += ddx;
        ddx += seg.curve;

        if (seg.p1.camera.z <= CAM_DEPTH ||
            seg.p2.screen.y >= seg.p1.screen.y ||
            seg.p2.screen.y >= maxY) continue;
        this._renderSegment(seg);
        maxY = seg.p2.screen.y;
        drawn.push(seg);
      }

      for (let i = drawn.length - 1; i >= 0; i--) {
        const seg = drawn[i];
        const p = seg.p1;
        for (let s = 0; s < seg.sprites.length; s++) {
          const sp = seg.sprites[s];
          const img = AssetFactory.sprites[sp.key];
          if (img) this._renderSprite(img, p.screen.scale, sp.offset,
            p.screen.x, p.screen.y, p.screen.w, seg.clip, seg.fog, -0.5);
        }
        for (let c = 0; c < seg.cars.length; c++) {
          const car = seg.cars[c];
          const pc = Util.percentRemaining(car.z, SEG_LEN);
          const sy = Util.lerp(seg.p1.screen.y, seg.p2.screen.y, pc);
          const ss = Util.lerp(seg.p1.screen.scale, seg.p2.screen.scale, pc);
          const sx = Util.lerp(seg.p1.screen.x, seg.p2.screen.x, pc);
          const sw = Util.lerp(seg.p1.screen.w, seg.p2.screen.w, pc);
          this._renderSprite(car.sprite, ss, car.offset, sx, sy, sw, seg.clip, seg.fog, -0.5);
        }
      }

      if (this.state === "playing" || this.state === "countdown" || this.state === "paused")
        this._renderPlayer();

      ctx.restore();
    }

    // resolve a segment's [themeA(from), themeB(to), t] blend
    _segBlend(seg) {
      const to = THEMES[seg.theme];
      if (!seg.fadeFrom || seg.fade >= 1) return { a: to, b: to, t: 1 };
      return { a: THEMES[seg.fadeFrom], b: to, t: seg.fade };
    }

    _renderBackground(baseSeg) {
      const ctx = this.ctx, W = this.W, H = this.H;
      const horizon = H * 0.52;

      const themeKey = baseSeg ? baseSeg.theme : "coastSunset";
      const fromKey = (baseSeg && baseSeg.fadeFrom && baseSeg.fade < 1) ? baseSeg.fadeFrom : null;
      const t = baseSeg ? (baseSeg.fade != null ? baseSeg.fade : 1) : 1;
      const cacheKey = themeKey + "|" + (fromKey || "") + "|" + (fromKey ? t.toFixed(2) : "1");
      if (this.skyTheme !== cacheKey) {
        this.skyGrad = this._skyFor(themeKey, fromKey, t);
        this.skyTheme = cacheKey;
      }
      const blend = baseSeg ? this._segBlend(baseSeg)
        : { a: THEMES.coastSunset, b: THEMES.coastSunset, t: 1 };

      ctx.fillStyle = this.skyGrad;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // stars (night themes)
      const starAmt = Util.lerp(blend.a.stars || 0, blend.b.stars || 0, blend.t);
      if (starAmt > 0.01) {
        ctx.save();
        ctx.fillStyle = "#fff";
        for (let i = 0; i < this.stars.length; i++) {
          if ((i / this.stars.length) > starAmt) continue;
          const s = this.stars[i];
          ctx.globalAlpha = (0.35 + 0.5 * (((i * 53) % 17) / 17)) * Math.min(1, starAmt * 1.4);
          ctx.beginPath();
          ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // retro sun (faded out on sun-less night themes)
      const sunA = blend.a.sun, sunB = blend.b.sun;
      if (sunA || sunB) {
        const curveOff = baseSeg ? -(baseSeg.curve * 30) : 0;
        const px = (this.playerX != null ? this.playerX : 0);
        const sunX = W / 2 - px * 60 + curveOff;
        const sunY = horizon - H * 0.13;
        const sunR = Math.min(W, H) * 0.16;
        const sA = sunA || sunB, sB = sunB || sunA;
        const c0 = Util.rgbStr(Util.blendRgb(sA[0], sB[0], blend.t));
        const c1 = Util.rgbStr(Util.blendRgb(sA[1], sB[1], blend.t));
        const c2 = Util.rgbStr(Util.blendRgb(sA[2], sB[2], blend.t));
        const sunAlpha = Util.lerp(sunA ? 1 : 0, sunB ? 1 : 0, blend.t);
        if (sunAlpha > 0.01) {
          const sg = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
          sg.addColorStop(0, c0); sg.addColorStop(0.5, c1); sg.addColorStop(1, c2);
          ctx.save();
          ctx.globalAlpha = sunAlpha;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = sg;
          ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
          ctx.fillStyle = "rgba(20,4,40,0.85)";
          for (let i = 0; i < 7; i++) {
            const yy = sunY + i * (sunR * 0.16) + sunR * 0.05;
            ctx.fillRect(sunX - sunR, yy, sunR * 2, Math.max(2, sunR * 0.05 + i));
          }
          ctx.restore();
        }
      }

      // parallax mountains, theme-tinted
      const pts = this.mountains;
      const span = pts.length - 1;
      const px = (this.playerX != null ? this.playerX : 0);
      const baseY = horizon;
      const mh = H * 0.30;
      const far = Util.rgbStr(Util.blendRgb(blend.a.mtnFar, blend.b.mtnFar, blend.t));
      const near = Util.rgbStr(Util.blendRgb(blend.a.mtnNear, blend.b.mtnNear, blend.t));
      const steps = 96;

      const off1 = (((this.position || 0) * 0.00006) + (px * 0.03)) % 1;
      ctx.fillStyle = far;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let i = 0; i <= steps; i++) {
        const fx = i / steps;
        const sample = ((fx + off1) * span) % span;
        const idx = Math.floor(sample), fr = sample - idx;
        const yv = Util.lerp(pts[idx], pts[(idx + 1) % span], fr);
        ctx.lineTo(fx * W, baseY - yv * mh);
      }
      ctx.lineTo(W, baseY); ctx.closePath(); ctx.fill();

      const off2 = ((((this.position || 0) * 0.00014) + px * 0.06) % 1);
      ctx.fillStyle = near;
      ctx.beginPath();
      ctx.moveTo(0, baseY + 4);
      for (let i = 0; i <= steps; i++) {
        const fx = i / steps;
        const sample = ((fx + off2) * span + 12) % span;
        const idx = Math.floor(sample), fr = sample - idx;
        const yv = Util.lerp(pts[idx], pts[(idx + 1) % span], fr);
        ctx.lineTo(fx * W, baseY - yv * mh * 0.6 + 10);
      }
      ctx.lineTo(W, baseY + 4); ctx.closePath(); ctx.fill();
    }

    _renderSegment(seg) {
      const ctx = this.ctx, W = this.W;
      const p1 = seg.p1.screen, p2 = seg.p2.screen;
      const fog = seg.fog;
      const bl = this._segBlend(seg);
      const pa = seg.dark ? bl.a.dark : bl.a.light;
      const pb = seg.dark ? bl.b.dark : bl.b.light;
      const fogRgb = Util.blendRgb(bl.a.fog, bl.b.fog, bl.t);
      const tm = bl.t;

      const grass = Util.mixThemed(pa.grass, pb.grass, tm, fogRgb, fog);
      const rumble = Util.mixThemed(pa.rumble, pb.rumble, tm, fogRgb, fog);
      const roadC = Util.mixThemed(pa.road, pb.road, tm, fogRgb, fog);
      const lane = Util.mixThemed(pa.lane, pb.lane, tm, fogRgb, fog);

      ctx.fillStyle = grass;
      ctx.fillRect(0, p2.y, W, p1.y - p2.y);

      const r1 = p1.w / 3, r2 = p2.w / 3;
      const l1 = p1.w / 18, l2 = p2.w / 18;

      this._poly(p1.x - p1.w - r1, p1.y, p1.x - p1.w, p1.y,
                 p2.x - p2.w, p2.y, p2.x - p2.w - r2, p2.y, rumble);
      this._poly(p1.x + p1.w + r1, p1.y, p1.x + p1.w, p1.y,
                 p2.x + p2.w, p2.y, p2.x + p2.w + r2, p2.y, rumble);
      this._poly(p1.x - p1.w, p1.y, p1.x + p1.w, p1.y,
                 p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, roadC);

      if (!seg.dark) {
        for (let k = 1; k < LANES; k++) {
          const lx1 = p1.x - p1.w + 2 * p1.w * (k / LANES);
          const lx2 = p2.x - p2.w + 2 * p2.w * (k / LANES);
          this._poly(lx1 - l1, p1.y, lx1 + l1, p1.y,
                     lx2 + l2, p2.y, lx2 - l2, p2.y, lane);
        }
      }
    }

    _poly(x1, y1, x2, y2, x3, y3, x4, y4, color) {
      const ctx = this.ctx;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.closePath();
      ctx.fill();
    }

    _renderSprite(spr, scale, offset, destXc, destY, segW, clipY, fog, anchorX) {
      const ctx = this.ctx, W = this.W;
      const destW = spr.w * scale * (W / 2) * SPRITE_SCALE * ROAD_WIDTH;
      const destH = spr.h * scale * (W / 2) * SPRITE_SCALE * ROAD_WIDTH;
      if (destW < 0.5 || destH < 0.5) return;
      let destX = destXc + (scale * offset * ROAD_WIDTH * (W / 2));
      destX += destW * (anchorX || -0.5);
      const dy = destY - destH;
      const clipH = clipY ? Math.max(0, dy + destH - clipY) : 0;
      if (clipH >= destH) return;
      const sH = spr.h - spr.h * clipH / destH;
      ctx.save();
      ctx.globalAlpha = Util.clamp(0.25 + fog * 0.75, 0, 1);
      ctx.drawImage(spr.img, 0, 0, spr.w, sH, destX, dy, destW, destH - clipH);
      ctx.restore();
    }

    _renderPlayer() {
      const ctx = this.ctx, W = this.W, H = this.H;
      const spr = AssetFactory.sprites.player;
      if (!spr) return;
      const speedPct = this.speed / MAX_SPEED;
      const scale = CAM_DEPTH / PLAYER_Z;
      const destW = spr.w * scale * (W / 2) * SPRITE_SCALE * ROAD_WIDTH;
      const destH = spr.h * scale * (W / 2) * SPRITE_SCALE * ROAD_WIDTH;
      const bounce = (this.speed > 0)
        ? (Math.random() - 0.5) * speedPct * (H / 480) * 2.4 : 0;
      const tilt = this.steerVis * 0.08;
      const cx = W / 2;
      const cy = H - destH * 0.55 - (H * 0.04) + bounce;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);

      ctx.fillStyle = "rgba(0,0,0,0.38)";
      ctx.beginPath();
      ctx.ellipse(0, destH * 0.46, destW * 0.5, destH * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();

      if (this.boostT > 0) {
        const fl = destH * (0.3 + Math.random() * 0.25);
        const g = ctx.createLinearGradient(0, destH * 0.42, 0, destH * 0.42 + fl);
        g.addColorStop(0, "#fff");
        g.addColorStop(0.4, "#ffd24a");
        g.addColorStop(1, "rgba(255,46,136,0)");
        ctx.fillStyle = g;
        for (const ox of [-destW * 0.22, destW * 0.22]) {
          ctx.beginPath();
          ctx.moveTo(ox - destW * 0.07, destH * 0.42);
          ctx.lineTo(ox + destW * 0.07, destH * 0.42);
          ctx.lineTo(ox, destH * 0.42 + fl);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.drawImage(spr.img, -destW / 2, -destH / 2, destW, destH);
      ctx.restore();
    }
  }

  /* ---- boot ---- */
  window.addEventListener("DOMContentLoaded", () => {
    const unlock = () => { window.__nh && window.__nh.audio.resume(); };
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    window.__nh = new Game();
  });
})();
