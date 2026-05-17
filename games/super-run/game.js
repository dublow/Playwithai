"use strict";

/* ============================================================
   SUPER RUN — a Mario-style platformer
   Pure HTML5 Canvas. No assets, no dependencies.
   Works on iPhone (touch) and desktop (keyboard).
   ============================================================ */

const TILE = 32;
const ROWS = 15;                 // level height in tiles -> always fully visible
const VIEW_H = ROWS * TILE;      // world view height in px (480)

const GRAVITY = 2200;
const MAX_FALL = 900;
const RUN_SPEED = 200;           // auto-runner: constant rightward speed
const JUMP_VEL = -720;
const STOMP_BOUNCE = -430;
const ENEMY_SPEED = 72;
const COYOTE = 0.10;
const JUMP_BUFFER = 0.12;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let cssW = 0, cssH = 0, scale = 1, viewW = 0;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  cssW = window.innerWidth;
  cssH = window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  scale = cssH / VIEW_H;          // whole level height always fits
  viewW = cssW / scale;           // visible world width in tiles*px
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 200));
resize();

/* ---------------- Levels ----------------
   Built from a compact definition so they stay easy to edit.
   ground: list of [startCol, endCol] solid floor spans (rows 13-14)
   ground:  list of [startCol, endCol) solid floor spans (gaps = pits)
   enemies: list of ground columns where a Goomba walks
   start:   player spawn col   flag: goal col
   Coins are generated automatically along the run path and as arcs
   over every pit and enemy, so a well-timed jump scoops them up.
----------------------------------------------------------------- */
/* 8 worlds, each its own universe (theme = index into THEMES).
   Order: Forêt → Savane → Désert → Feu → Jungle → Nuit → Espace → Pôle Nord.
   Levels grow longer and busier as you advance. */
const LEVELS = [
  { theme: 0, width: 180, start: 3, flag: 176,
    ground: [[0, 34], [36, 66], [68, 100], [102, 134], [136, 180]],
    enemies: [16, 28, 46, 58, 80, 90, 112, 124, 150, 164] },
  { theme: 1, width: 190, start: 3, flag: 186,
    ground: [[0, 30], [32, 60], [62, 92], [94, 124], [126, 156], [158, 190]],
    enemies: [16, 26, 44, 54, 72, 84, 104, 116, 138, 150, 170, 180] },
  { theme: 2, width: 195, start: 3, flag: 191,
    ground: [[0, 28], [30, 56], [58, 86], [88, 116], [118, 146], [148, 176], [178, 195]],
    enemies: [16, 24, 40, 50, 68, 78, 98, 108, 128, 140, 160, 170, 184] },
  { theme: 3, width: 200, start: 3, flag: 196,
    ground: [[0, 26], [28, 52], [54, 80], [82, 108], [110, 136], [138, 164], [166, 200]],
    enemies: [14, 22, 38, 48, 64, 74, 92, 102, 120, 130, 150, 160, 180, 190] },
  { theme: 4, width: 205, start: 3, flag: 201,
    ground: [[0, 24], [26, 50], [52, 76], [78, 104], [106, 132], [134, 160], [162, 188], [190, 205]],
    enemies: [14, 20, 36, 46, 62, 72, 90, 100, 118, 128, 146, 156, 176, 186, 196] },
  { theme: 5, width: 210, start: 3, flag: 206,
    ground: [[0, 24], [26, 48], [50, 74], [76, 100], [102, 126], [128, 152], [154, 178], [180, 210]],
    enemies: [14, 20, 36, 44, 60, 70, 88, 96, 114, 124, 140, 150, 166, 176, 194] },
  { theme: 6, width: 215, start: 3, flag: 211,
    ground: [[0, 22], [24, 46], [48, 70], [72, 96], [98, 122], [124, 148], [150, 174], [176, 200], [202, 215]],
    enemies: [13, 19, 34, 42, 58, 66, 84, 92, 110, 118, 136, 146, 162, 172, 188, 196] },
  { theme: 7, width: 220, start: 3, flag: 216,
    ground: [[0, 22], [24, 44], [46, 68], [70, 92], [94, 116], [118, 140], [142, 164], [166, 190], [192, 220]],
    enemies: [12, 18, 32, 40, 54, 64, 80, 90, 106, 116, 132, 142, 158, 168, 184, 196, 208] },
];

/* ---------------- Universes / biomes ----------------
   Every world is its own universe: each level pins one biome (level.theme).
   When you reach the next world the previous biome crossfades into the new
   one over WORLD_FADE seconds — sky and ground colours are interpolated and
   the two sceneries are alpha-blended, so entering a world feels seamless.
   game.time keeps running on the menu too, so the background stays alive
   before the run even starts. */
const THEMES = [
  { id: "forest", name: "Forêt",     emoji: "🌲",
    sky: ["#6db3f2", "#bfe3c0"],
    ground: "#3aa53a", groundEdge: "#2f8a2f", dirt: "#8a5a2b", dirtTop: "#6f4420" },
  { id: "savanna", name: "Savane",   emoji: "🦒",
    sky: ["#f0a64a", "#ffd98a"],
    ground: "#c9a24a", groundEdge: "#a9842f", dirt: "#8a6a2b", dirtTop: "#6f5420" },
  { id: "desert",  name: "Désert",   emoji: "🏜️",
    sky: ["#f6b352", "#ffe6b0"],
    ground: "#e0c068", groundEdge: "#caa84f", dirt: "#c8a24a", dirtTop: "#b08a35" },
  { id: "fire",    name: "Feu",      emoji: "🔥",
    sky: ["#2a0707", "#b5371f"],
    ground: "#542a1a", groundEdge: "#3a1810", dirt: "#2a1208", dirtTop: "#ff5e1f" },
  { id: "jungle",  name: "Jungle",   emoji: "🌴",
    sky: ["#2f9e6e", "#9ee0b4"],
    ground: "#2e7d32", groundEdge: "#1f5e22", dirt: "#5a3a17", dirtTop: "#432b10" },
  { id: "night",   name: "Nuit",     emoji: "🌙",
    sky: ["#0b1640", "#2a2f6b"],
    ground: "#234d23", groundEdge: "#173417", dirt: "#4a3520", dirtTop: "#34250f" },
  { id: "space",   name: "Espace",   emoji: "🚀",
    sky: ["#050314", "#1a0a3a"],
    ground: "#4a4a6a", groundEdge: "#34344f", dirt: "#2a2a40", dirtTop: "#6a6a8a" },
  { id: "pole",    name: "Pôle Nord", emoji: "❄️",
    sky: ["#8fc7e8", "#e8f6ff"],
    ground: "#eaf4fb", groundEdge: "#cfe6f2", dirt: "#bcd6e4", dirtTop: "#d8ecf6" },
];

/* Tile codes: 0 empty, 1 ground (no other solids in this auto-runner) */
function isSolid(c) { return c === 1; }

function buildLevel(def) {
  const W = def.width;
  const grid = [];
  for (let r = 0; r < ROWS; r++) grid.push(new Array(W).fill(0));

  for (const [s, e] of def.ground) {
    for (let c = s; c < e && c < W; c++) { grid[13][c] = 1; grid[14][c] = 1; }
  }
  const ground = (c) => c >= 0 && c < W && grid[13][c] === 1;
  const enemyCols = def.enemies;

  // Coins: a flowing trail along the ground, plus an arc over each
  // pit and each enemy (rows 10-11 are reliably scooped mid-jump).
  const pts = [];
  for (let c = 4; c < W - 4; c++) {
    if (!ground(c) || c % 3 !== 0) continue;
    if (enemyCols.some((e) => Math.abs(e - c) <= 1)) continue;
    pts.push([c, 12]);
  }
  for (let c = 0; c < W; c++) {
    if (ground(c) || (c > 0 && ground(c - 1))) continue;     // start of a pit run
    let b = c; while (b < W && !ground(b)) b++;
    b -= 1;                                                   // last pit col
    pts.push([c - 2, 11], [c - 1, 10], [c, 10], [b, 10], [b + 1, 10], [b + 2, 11]);
    c = b;
  }
  for (const e of enemyCols) pts.push([e - 1, 11], [e, 10], [e + 1, 11]);

  const coins = pts
    .filter(([c]) => c >= 0 && c < W)
    .map(([c, r]) => ({
      x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, got: false,
      t: Math.random() * Math.PI * 2,
    }));
  const enemies = enemyCols.map((c) => makeEnemy(c * TILE, 12 * TILE));

  return {
    grid, W, pixelW: W * TILE,
    coins, enemies,
    startX: def.start * TILE, startY: 11 * TILE,
    flagX: def.flag * TILE,
  };
}

function makeEnemy(x, y) {
  return { x, y, w: 26, h: 26, vx: -ENEMY_SPEED, vy: 0, dead: false, squashT: 0, t: 0 };
}

/* ---------------- Game state ---------------- */
const game = {
  state: "menu",   // menu | play | dead | win
  levelIndex: 0,
  level: null,
  score: 0,
  coins: 0,
  lives: 3,
  cameraX: 0,
  time: 0,
  particles: [],
  theme: THEMES[0],
  themePrev: THEMES[0],
  themeFade: 0,
};

const player = {
  x: 0, y: 0, w: 26, h: 30,
  vx: 0, vy: 0,
  onGround: false,
  face: 1,
  coyote: 0,
  buffer: 0,
  jumpHeld: false,
  jumping: false,
  anim: 0,
  invuln: 0,
  alive: true,
};

function loadLevel(i) {
  game.levelIndex = i;
  game.level = buildLevel(LEVELS[i]);
  const next = THEMES[LEVELS[i].theme] || THEMES[0];
  game.themePrev = game.theme;
  game.theme = next;
  game.themeFade = game.themePrev === next ? 0 : WORLD_FADE;
  respawn(true);
}

function respawn(full) {
  const lv = game.level;
  player.x = lv.startX;
  player.y = lv.startY;
  player.vx = 0; player.vy = 0;
  player.onGround = false;
  player.face = 1;
  player.invuln = full ? 0 : 1.2;
  player.alive = true;
  game.cameraX = 0;
  if (full) {
    // rebuild enemies/coins to their original state
    game.level = buildLevel(LEVELS[game.levelIndex]);
  } else {
    for (const e of game.level.enemies) { e.dead = false; }
  }
}

let tapHintTimer = 0;
function flashTapHint() {
  if (!tapHint) return;
  tapHint.classList.add("show");
  clearTimeout(tapHintTimer);
  tapHintTimer = setTimeout(() => tapHint.classList.remove("show"), 2200);
}

function startGame() {
  game.score = 0;
  game.coins = 0;
  game.lives = 3;
  game.particles.length = 0;
  loadLevel(0);
  game.state = "play";
  hideOverlay();
  flashTapHint();
}

/* ---------------- Input ----------------
   Auto-runner: the only control is "jump". Tap anywhere on the screen
   (or Space / Up / W / click) to jump. Mario runs by himself. */
const input = { jump: false };
const JUMP_KEYS = { ArrowUp: 1, KeyW: 1, Space: 1 };

addEventListener("keydown", (e) => {
  if (JUMP_KEYS[e.code]) { input.jump = true; e.preventDefault(); }
  if ((e.code === "Enter" || e.code === "Space") &&
      (game.state === "menu" || game.state === "dead" || game.state === "win")) {
    overlayAction();
  }
});
addEventListener("keyup", (e) => {
  if (JUMP_KEYS[e.code]) { input.jump = false; e.preventDefault(); }
});

// Whole screen is the jump pad while playing.
const wrap = document.getElementById("game-wrap");
const tapHint = document.getElementById("tap-hint");
const tapDown = (e) => {
  resumeAudio();
  if (game.state === "play") { input.jump = true; if (e.cancelable) e.preventDefault(); }
};
const tapUp = () => { input.jump = false; };
wrap.addEventListener("touchstart", tapDown, { passive: false });
wrap.addEventListener("touchend", tapUp, { passive: false });
wrap.addEventListener("touchcancel", tapUp, { passive: false });
wrap.addEventListener("pointerdown", tapDown);
wrap.addEventListener("pointerup", tapUp);
wrap.addEventListener("pointercancel", tapUp);
wrap.addEventListener("contextmenu", (e) => e.preventDefault());

/* ---------------- Audio (tiny WebAudio beeps) ---------------- */
let actx = null;
function resumeAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
  if (actx.state === "suspended") actx.resume();
}
function beep(freq, dur, type = "square", vol = 0.06) {
  if (!actx) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g); g.connect(actx.destination);
  const t = actx.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur);
}
const sfx = {
  jump: () => beep(520, 0.14, "square", 0.05),
  coin: () => { beep(880, 0.07); setTimeout(() => beep(1320, 0.1), 60); },
  stomp: () => beep(180, 0.12, "sawtooth", 0.07),
  hurt: () => { beep(300, 0.18, "sawtooth", 0.07); setTimeout(() => beep(150, 0.25, "sawtooth", 0.07), 120); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18, "triangle", 0.06), i * 130)); },
};

/* ---------------- Overlay UI ---------------- */
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("start-btn");

function showOverlay(html) { overlay.querySelector(".panel").innerHTML = html; overlay.classList.remove("hidden"); }
function hideOverlay() { overlay.classList.add("hidden"); }

function overlayAction() { resumeAudio(); startGame(); }
startBtn.addEventListener("click", overlayAction);
overlay.addEventListener("click", (e) => { if (e.target.id === "start-btn") return; if (game.state !== "play") overlayAction(); });

function menuPanel() {
  showOverlay(
    `<h1>SUPER RUN</h1>
     <p class="sub">A one-tap auto-runner</p>
     <p class="hint">Mario runs by himself.<br/>Tap anywhere to jump.</p>
     <button id="start-btn" class="big-btn" type="button">TAP TO PLAY</button>
     <p class="controls-note">iPhone: tap anywhere to jump.<br/>Desktop: click or Space / Up / W.</p>`);
  document.getElementById("start-btn").addEventListener("click", overlayAction);
}
function deadPanel() {
  showOverlay(
    `<h1 style="color:#ff5c5c;text-shadow:3px 3px 0 #7a0c0c">GAME OVER</h1>
     <p class="stat">Score: ${game.score} &nbsp;•&nbsp; Coins: ${game.coins}</p>
     <button id="start-btn" class="big-btn" type="button">TRY AGAIN</button>`);
  document.getElementById("start-btn").addEventListener("click", overlayAction);
}
function winPanel() {
  showOverlay(
    `<h1 style="color:#7CFC00;text-shadow:3px 3px 0 #1a6b00">YOU WIN!</h1>
     <p class="stat">Final score: ${game.score} &nbsp;•&nbsp; Coins: ${game.coins}</p>
     <button id="start-btn" class="big-btn" type="button">PLAY AGAIN</button>`);
  document.getElementById("start-btn").addEventListener("click", overlayAction);
}

/* ---------------- Helpers ---------------- */
function tileAt(px, py) {
  const lv = game.level;
  const c = Math.floor(px / TILE);
  const r = Math.floor(py / TILE);
  if (r < 0 || r >= ROWS || c < 0 || c >= lv.W) return 0;
  return lv.grid[r][c];
}
function addParticles(x, y, color, n, spread) {
  for (let i = 0; i < n; i++) {
    game.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * spread,
      vy: -Math.random() * spread * 0.8 - 60,
      life: 0.5 + Math.random() * 0.4,
      color,
    });
  }
}

/* ---------------- Physics / collision ---------------- */
function collideAxis(ent, axis) {
  const lv = game.level;
  const left = Math.floor(ent.x / TILE);
  const right = Math.floor((ent.x + ent.w - 0.01) / TILE);
  const top = Math.floor(ent.y / TILE);
  const bottom = Math.floor((ent.y + ent.h - 0.01) / TILE);

  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      if (r < 0 || r >= ROWS || c < 0 || c >= lv.W) continue;
      if (!isSolid(lv.grid[r][c])) continue;
      if (axis === "x") {
        if (ent.vx > 0) ent.x = c * TILE - ent.w;
        else if (ent.vx < 0) ent.x = (c + 1) * TILE;
        ent.vx = 0;
        ent.hitWall = true;
      } else if (ent.vy > 0) {
        ent.y = r * TILE - ent.h;
        ent.vy = 0;
        ent.onGround = true;
      } else if (ent.vy < 0) {
        ent.y = (r + 1) * TILE;
        ent.vy = 0;
      }
    }
  }
}

function updatePlayer(dt) {
  // auto-run: constant rightward speed
  player.vx = RUN_SPEED;
  player.face = 1;

  // jump buffering + coyote time (tap = full, consistent jump)
  if (input.jump && !player.jumpHeld) player.buffer = JUMP_BUFFER;
  player.jumpHeld = input.jump;
  player.buffer -= dt;
  player.coyote -= dt;

  if (player.buffer > 0 && player.coyote > 0) {
    player.vy = JUMP_VEL;
    player.jumping = true;
    player.onGround = false;
    player.buffer = 0;
    player.coyote = 0;
    sfx.jump();
  }
  if (player.vy >= 0) player.jumping = false;

  // gravity
  player.vy = Math.min(MAX_FALL, player.vy + GRAVITY * dt);

  // integrate + collide
  player.onGround = false;
  player.x += player.vx * dt;
  if (player.x < 0) { player.x = 0; player.vx = 0; }
  collideAxis(player, "x");

  player.y += player.vy * dt;
  collideAxis(player, "y");
  if (player.onGround) player.coyote = COYOTE;

  // animation phase
  if (player.onGround && Math.abs(player.vx) > 10) player.anim += dt * Math.abs(player.vx) * 0.05;
  else player.anim = 0;

  if (player.invuln > 0) player.invuln -= dt;

  // coins
  for (const co of game.level.coins) {
    if (co.got) continue;
    if (Math.abs((player.x + player.w / 2) - co.x) < 20 && Math.abs((player.y + player.h / 2) - co.y) < 22) {
      co.got = true;
      game.coins += 1; game.score += 100;
      addParticles(co.x, co.y, "#ffd23f", 6, 180);
      sfx.coin();
    }
  }

  // enemies
  for (const e of game.level.enemies) {
    if (e.dead) continue;
    const overlap =
      player.x < e.x + e.w && player.x + player.w > e.x &&
      player.y < e.y + e.h && player.y + player.h > e.y;
    if (!overlap) continue;

    const falling = player.vy > 20;
    const fromAbove = (player.y + player.h) - e.y < e.h * 0.8;
    if (falling && fromAbove) {
      e.dead = true; e.squashT = 0.35;
      player.vy = STOMP_BOUNCE;
      player.jumping = true;
      game.score += 150;
      addParticles(e.x + e.w / 2, e.y + e.h / 2, "#8a5a2b", 8, 200);
      sfx.stomp();
    } else if (player.invuln <= 0) {
      hurtPlayer();
    }
  }

  // fell into a pit
  if (player.y > VIEW_H + 80) hurtPlayer(true);

  // reached the flag
  if (player.x + player.w > game.level.flagX) {
    nextLevel();
  }
}

function hurtPlayer(pit) {
  if (!player.alive) return;
  player.alive = false;
  game.lives -= 1;
  sfx.hurt();
  addParticles(player.x + player.w / 2, player.y + player.h / 2, "#ff5c5c", 12, 260);
  if (game.lives <= 0) {
    game.state = "dead";
    setTimeout(deadPanel, 350);
  } else {
    game.state = "respawn";
    setTimeout(() => {
      respawn(false);
      game.state = "play";
    }, 700);
  }
}

function nextLevel() {
  if (game.state === "win") return;
  if (game.levelIndex + 1 < LEVELS.length) {
    game.score += 1000;
    sfx.win();
    game.state = "transition";
    setTimeout(() => {
      loadLevel(game.levelIndex + 1);
      game.state = "play";
    }, 900);
  } else {
    game.score += 2000;
    game.state = "win";
    sfx.win();
    setTimeout(winPanel, 500);
  }
}

function updateEnemy(e, dt) {
  if (e.dead) { e.squashT -= dt; return; }
  e.t += dt;
  e.vy = Math.min(MAX_FALL, e.vy + GRAVITY * dt);

  e.hitWall = false;
  e.x += e.vx * dt;
  collideAxis(e, "x");
  if (e.hitWall) e.vx = -e.vx;

  e.onGround = false;
  e.y += e.vy * dt;
  collideAxis(e, "y");

  // turn around at ledges so they stay on platforms
  if (e.onGround) {
    const aheadX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
    if (!isSolid(tileAt(aheadX, e.y + e.h + 4))) e.vx = -e.vx;
  }
  if (e.y > VIEW_H + 120) e.dead = true;
}

function updateParticles(dt) {
  const p = game.particles;
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    q.vy += GRAVITY * 0.6 * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.life -= dt;
    if (q.life <= 0) p.splice(i, 1);
  }
}

const WORLD_FADE = 1.2;      // seconds to crossfade when entering a world

let themeView = { a: THEMES[0], b: THEMES[0], t: 1 };

function rgb(c) {
  c = c.replace("#", "");
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16),
          parseInt(c.slice(4, 6), 16)];
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},` +
         `${Math.round(A[1] + (B[1] - A[1]) * t)},` +
         `${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}
function rnd(i) { const x = Math.sin(i * 127.1 + i * i * 0.0137) * 43758.5; return x - Math.floor(x); }
// stable starfield (used by night & space)
const STARS = Array.from({ length: 90 }, (_, i) => ({
  x: rnd(i), y: rnd(i + 7) * 0.62, r: rnd(i + 13) * 1.6 + 0.6, p: rnd(i + 19) * 6.28,
}));

/* ---------------- Rendering ---------------- */
function biomeScroll(f) {
  return (game.cameraX + game.time * 34) * f * scale;
}
function mounds(color, baseY, r, spacing, f) {
  ctx.fillStyle = color;
  const sp = spacing * scale;
  const off = biomeScroll(f) % sp;
  for (let i = -1; i < cssW / sp + 2; i++) {
    ctx.beginPath();
    ctx.arc(i * sp - off, cssH - baseY * scale, r * scale, Math.PI, 0);
    ctx.fill();
  }
}
function cloud(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r, y + 4, r * 0.8, 0, Math.PI * 2);
  ctx.arc(x - r, y + 6, r * 0.7, 0, Math.PI * 2);
  ctx.arc(x + r * 0.4, y - r * 0.6, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
}
function clouds(color, spacing, f) {
  ctx.fillStyle = color;
  const sp = spacing * scale;
  const off = biomeScroll(f) % sp;
  for (let i = -1; i < cssW / sp + 2; i++) {
    cloud(i * sp - off, (50 + (i % 3) * 46) * scale, 26 * scale);
  }
}
function trees(trunk, leaf, kind, spacing, f, baseY) {
  const sp = spacing * scale;
  const off = biomeScroll(f) % sp;
  for (let i = -1; i < cssW / sp + 2; i++) {
    const x = i * sp - off;
    const gy = cssH - baseY * scale;
    if (kind === "pine") {
      ctx.fillStyle = trunk;
      ctx.fillRect(x - 4 * scale, gy - 18 * scale, 8 * scale, 22 * scale);
      ctx.fillStyle = leaf;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(x - (26 - k * 6) * scale, gy - (16 + k * 14) * scale);
        ctx.lineTo(x + (26 - k * 6) * scale, gy - (16 + k * 14) * scale);
        ctx.lineTo(x, gy - (40 + k * 14) * scale);
        ctx.closePath();
        ctx.fill();
      }
    } else if (kind === "acacia") {
      ctx.fillStyle = trunk;
      ctx.fillRect(x - 3 * scale, gy - 34 * scale, 6 * scale, 36 * scale);
      ctx.fillStyle = leaf;
      ctx.beginPath();
      ctx.ellipse(x, gy - 40 * scale, 34 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "palm") {
      ctx.fillStyle = trunk;
      ctx.fillRect(x - 4 * scale, gy - 46 * scale, 8 * scale, 50 * scale);
      ctx.fillStyle = leaf;
      for (let a = -2; a <= 2; a++) {
        ctx.beginPath();
        ctx.ellipse(x + a * 16 * scale, gy - 48 * scale - Math.abs(a) * 3 * scale,
                    22 * scale, 9 * scale, a * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === "cactus") {
      ctx.fillStyle = leaf;
      ctx.fillRect(x - 5 * scale, gy - 40 * scale, 10 * scale, 42 * scale);
      ctx.fillRect(x - 16 * scale, gy - 30 * scale, 8 * scale, 6 * scale);
      ctx.fillRect(x - 16 * scale, gy - 30 * scale, 6 * scale, 18 * scale);
      ctx.fillRect(x + 8 * scale, gy - 24 * scale, 8 * scale, 6 * scale);
      ctx.fillRect(x + 10 * scale, gy - 24 * scale, 6 * scale, 14 * scale);
    }
  }
}
function starfield(twinkle) {
  const base = ctx.globalAlpha;
  ctx.fillStyle = "#ffffff";
  for (let s of STARS) {
    const a = twinkle ? 0.5 + 0.5 * Math.sin(game.time * 3 + s.p) : 0.9;
    ctx.globalAlpha = base * a;
    ctx.fillRect(s.x * cssW, s.y * cssH, s.r * scale, s.r * scale);
  }
  ctx.globalAlpha = base;
}
function fallingBits(color, count, speed, sway, size) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const bx = (rnd(i) * cssW + Math.sin(game.time * sway + i) * 14 * scale +
               cssW) % cssW;
    const by = ((rnd(i + 3) * cssH + game.time * speed * scale) % cssH);
    ctx.fillRect(bx, by, size * scale, size * scale);
  }
}
function risingEmbers() {
  for (let i = 0; i < 40; i++) {
    const ex = (rnd(i) * cssW + Math.sin(game.time * 1.4 + i) * 20 * scale + cssW) % cssW;
    const ey = cssH - ((rnd(i + 5) * cssH + game.time * 70 * scale) % cssH);
    ctx.fillStyle = i % 2 ? "#ffb24a" : "#ff6a2a";
    ctx.fillRect(ex, ey, 3 * scale, 3 * scale);
  }
}

function drawCelestial(th) {
  if (th.id === "fire") {
    const r = ctx.createRadialGradient(cssW * 0.5, cssH, 0, cssW * 0.5, cssH, cssH * 0.9);
    r.addColorStop(0, "rgba(255,120,40,0.55)");
    r.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, cssW, cssH);
    return;
  }
  if (th.id === "space") return;
  if (th.id === "night") {                                  // crescent moon
    const mx = cssW - 80 * scale, my = 70 * scale, mr = 32 * scale;
    ctx.fillStyle = "#f3f3d6";
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = mix(th.sky[0], "#000000", 0.15);
    ctx.beginPath(); ctx.arc(mx + 12 * scale, my - 6 * scale, mr, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const low = th.id === "savanna" || th.id === "desert" || th.id === "pole";
  ctx.fillStyle = th.id === "pole" ? "rgba(255,255,255,0.85)"
                : low ? "rgba(255,180,90,0.95)" : "rgba(255,236,150,0.9)";
  ctx.beginPath();
  ctx.arc(cssW - 80 * scale, (low ? 130 : 70) * scale,
          (low ? 50 : 38) * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawScenery(th, alpha) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  if (th.id === "night" || th.id === "space") starfield(th.id === "night");
  drawCelestial(th);

  switch (th.id) {
    case "forest":
      mounds("#3f8f4f", 38, 90, 260, 0.3);
      trees("#5a3a17", "#2f7d39", "pine", 150, 0.55, 90);
      clouds("rgba(255,255,255,0.85)", 340, 0.15);
      break;
    case "savanna":
      mounds("#caa257", 36, 100, 300, 0.3);
      trees("#6b4a22", "#7d8a3a", "acacia", 230, 0.5, 86);
      ctx.strokeStyle = "rgba(60,40,20,0.6)"; ctx.lineWidth = 2 * scale;
      for (let i = 0; i < 5; i++) {
        const bx = (i * 240 - biomeScroll(0.12) % (240 * scale)) ;
        const by = 90 * scale + (i % 2) * 30 * scale;
        ctx.beginPath();
        ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 9 * scale, by - 7 * scale, bx + 18 * scale, by);
        ctx.quadraticCurveTo(bx + 27 * scale, by - 7 * scale, bx + 36 * scale, by);
        ctx.stroke();
      }
      break;
    case "desert":
      mounds("#e6cf94", 30, 70, 220, 0.3);
      mounds("#d8bd78", 22, 60, 300, 0.45);
      trees("#3f7d39", "#3f7d39", "cactus", 320, 0.55, 26);
      clouds("rgba(255,255,255,0.5)", 520, 0.1);
      break;
    case "fire":
      ctx.fillStyle = "#1c0c0c";
      mounds("#1c0c0c", 30, 120, 280, 0.3);
      ctx.strokeStyle = "#ff7a2a"; ctx.lineWidth = 3 * scale;
      for (let i = -1; i < cssW / (280 * scale) + 2; i++) {
        const hx = i * 280 * scale - biomeScroll(0.3) % (280 * scale);
        ctx.beginPath();
        ctx.moveTo(hx, cssH - 30 * scale);
        ctx.lineTo(hx + 10 * scale, cssH - 80 * scale);
        ctx.lineTo(hx + 24 * scale, cssH - 40 * scale);
        ctx.stroke();
      }
      risingEmbers();
      break;
    case "jungle":
      mounds("#1f6e3a", 44, 110, 240, 0.25);
      mounds("#2e8a45", 30, 90, 200, 0.4);
      trees("#5a3a17", "#1f7d3a", "palm", 170, 0.55, 90);
      fallingBits("rgba(120,200,120,0.7)", 26, 26, 0.7, 5);
      break;
    case "night":
      mounds("#16261a", 40, 95, 270, 0.3);
      break;
    case "space": {
      ctx.fillStyle = "#6a4fb0";
      ctx.beginPath();
      ctx.arc(cssW * 0.22, 90 * scale, 34 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8a6fd0";
      ctx.beginPath();
      ctx.arc(cssW * 0.22 - 10 * scale, 82 * scale, 34 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#d98a3a";
      ctx.beginPath();
      ctx.arc(cssW - 70 * scale, 150 * scale, 18 * scale, 0, Math.PI * 2); ctx.fill();
      const shoot = (game.time * 0.5) % 1;
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(shoot * cssW, shoot * cssH * 0.4);
      ctx.lineTo(shoot * cssW + 40 * scale, shoot * cssH * 0.4 + 16 * scale);
      ctx.stroke();
      break;
    }
    case "pole":
      ctx.fillStyle = "rgba(120,230,200,0.35)";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(cssW * (0.3 + i * 0.25), 70 * scale,
                    120 * scale, 26 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      mounds("#cfe6f2", 38, 95, 260, 0.3);
      mounds("#eaf4fb", 26, 70, 200, 0.45);
      fallingBits("rgba(255,255,255,0.9)", 40, 36, 1.0, 4);
      break;
  }
  ctx.restore();
}

function drawBackground() {
  const { a, b, t } = themeView;
  const g = ctx.createLinearGradient(0, 0, 0, cssH);
  g.addColorStop(0, mix(a.sky[0], b.sky[0], t));
  g.addColorStop(1, mix(a.sky[1], b.sky[1], t));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssW, cssH);

  drawScenery(a, 1 - t);
  drawScenery(b, t);
}

function w2s(wx) { return (wx - game.cameraX) * scale; }

function drawTiles() {
  const lv = game.level;
  const { a, b, t } = themeView;
  const gTop = mix(a.ground, b.ground, t);
  const gEdge = mix(a.groundEdge, b.groundEdge, t);
  const dBody = mix(a.dirt, b.dirt, t);
  const dTop = mix(a.dirtTop, b.dirtTop, t);
  const c0 = Math.max(0, Math.floor(game.cameraX / TILE) - 1);
  const c1 = Math.min(lv.W - 1, Math.ceil((game.cameraX + viewW) / TILE) + 1);
  for (let c = c0; c <= c1; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (lv.grid[r][c] !== 1) continue;
      const x = w2s(c * TILE);
      const y = r * TILE * scale;
      const s = TILE * scale;
      ctx.fillStyle = (r === 13) ? gTop : dBody;
      ctx.fillRect(x, y, s + 1, s + 1);
      if (r === 13) { ctx.fillStyle = gEdge; ctx.fillRect(x, y + s * 0.7, s + 1, s * 0.3); }
      else { ctx.fillStyle = dTop; ctx.fillRect(x, y, s + 1, s * 0.18); }
    }
  }
}

function drawCoin(co) {
  if (co.got) return;
  const x = w2s(co.x);
  if (x < -40 || x > cssW + 40) return;
  const y = co.y * scale;
  const sw = Math.abs(Math.cos(game.time * 4 + co.t)) * 9 + 3;
  ctx.fillStyle = "#ffd23f";
  ctx.beginPath();
  ctx.ellipse(x, y, sw * scale, 11 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff3b0";
  ctx.beginPath();
  ctx.ellipse(x - sw * 0.25 * scale, y - 2 * scale, sw * 0.3 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemy(e) {
  const x = w2s(e.x);
  if (x < -60 || x > cssW + 60) return;
  const s = scale;
  if (e.dead) {
    if (e.squashT <= 0) return;
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(x, (e.y + e.h - 8) * s, e.w * s, 8 * s);
    return;
  }
  const y = e.y * s;
  const wob = Math.sin(e.t * 10) * 2 * s;
  // body
  ctx.fillStyle = "#8a5a2b";
  ctx.beginPath();
  ctx.arc(x + e.w / 2 * s, y + e.h * 0.45 * s, e.w * 0.5 * s, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x, y + e.h * 0.45 * s, e.w * s, e.h * 0.4 * s);
  // feet
  ctx.fillStyle = "#5a3a17";
  ctx.fillRect(x + 1 * s, (e.y + e.h - 6) * s + wob, 9 * s, 6 * s);
  ctx.fillRect(x + (e.w - 10) * s, (e.y + e.h - 6) * s - wob, 9 * s, 6 * s);
  // eyes
  ctx.fillStyle = "#fff";
  const ed = e.vx < 0 ? -1 : 1;
  ctx.fillRect(x + (e.w * 0.5 + ed * 5 - 5) * s, y + e.h * 0.42 * s, 5 * s, 6 * s);
  ctx.fillRect(x + (e.w * 0.5 + ed * 5 + 2) * s, y + e.h * 0.42 * s, 5 * s, 6 * s);
  ctx.fillStyle = "#000";
  ctx.fillRect(x + (e.w * 0.5 + ed * 7 - 4) * s, y + e.h * 0.46 * s, 3 * s, 3 * s);
}

function drawPlayer() {
  if (!player.alive && game.state !== "play") { /* still draw fading */ }
  if (player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0) return;

  const x = w2s(player.x);
  const y = player.y * scale;
  const s = scale;
  const W = player.w, H = player.h;
  const step = Math.sin(player.anim) * 4;
  const f = player.face;

  ctx.save();
  // legs
  ctx.fillStyle = "#1f6fd6";
  if (player.onGround) {
    ctx.fillRect(x + 4 * s, y + (H - 8) * s, 7 * s, (8 + step) * s);
    ctx.fillRect(x + (W - 11) * s, y + (H - 8) * s, 7 * s, (8 - step) * s);
  } else {
    ctx.fillRect(x + 3 * s, y + (H - 9) * s, 8 * s, 9 * s);
    ctx.fillRect(x + (W - 11) * s, y + (H - 6) * s, 8 * s, 6 * s);
  }
  // body / overalls
  ctx.fillStyle = "#1f6fd6";
  ctx.fillRect(x + 2 * s, y + 14 * s, (W - 4) * s, 12 * s);
  // shirt arms
  ctx.fillStyle = "#e52521";
  ctx.fillRect(x + 1 * s, y + 13 * s, (W - 2) * s, 6 * s);
  ctx.fillRect(x + (f > 0 ? W - 6 : 1) * s, y + 14 * s, 5 * s, 9 * s);
  // overall straps
  ctx.fillStyle = "#1f6fd6";
  ctx.fillRect(x + 7 * s, y + 11 * s, 3 * s, 6 * s);
  ctx.fillRect(x + (W - 10) * s, y + 11 * s, 3 * s, 6 * s);
  // face
  ctx.fillStyle = "#ffcc99";
  ctx.fillRect(x + 5 * s, y + 5 * s, (W - 10) * s, 9 * s);
  // cap
  ctx.fillStyle = "#e52521";
  ctx.fillRect(x + 3 * s, y + 1 * s, (W - 6) * s, 5 * s);
  ctx.fillRect(x + (f > 0 ? W - 8 : 2) * s, y + 4 * s, 6 * s, 3 * s);
  // eye
  ctx.fillStyle = "#222";
  ctx.fillRect(x + (f > 0 ? W - 10 : 7) * s, y + 7 * s, 3 * s, 4 * s);
  // mustache
  ctx.fillStyle = "#5a3a17";
  ctx.fillRect(x + 5 * s, y + 11 * s, (W - 10) * s, 2 * s);
  ctx.restore();
}

function drawFlag() {
  const x = w2s(game.level.flagX);
  if (x < -40 || x > cssW + 40) return;
  const s = scale;
  const topY = 3 * TILE * s;
  const botY = 13 * TILE * s;
  ctx.fillStyle = "#dddddd";
  ctx.fillRect(x, topY, 5 * s, botY - topY);
  ctx.fillStyle = "#2ecc40";
  ctx.beginPath();
  const wave = Math.sin(game.time * 4) * 6 * s;
  ctx.moveTo(x + 5 * s, topY + 4 * s);
  ctx.lineTo(x + 5 * s + 46 * s + wave, topY + 16 * s);
  ctx.lineTo(x + 5 * s, topY + 28 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.arc(x + 2.5 * s, topY, 6 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles() {
  for (const q of game.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, q.life * 2));
    ctx.fillStyle = q.color;
    ctx.fillRect(w2s(q.x), q.y * scale, 5 * scale, 5 * scale);
  }
  ctx.globalAlpha = 1;
}

const hud = document.getElementById("hud");
function drawHUD() {
  hud.innerHTML =
    `<span class="pill">SCORE ${String(game.score).padStart(6, "0")}</span>` +
    `<span class="pill">🪙 ${game.coins}</span>` +
    `<span class="pill">♥ ${game.lives}</span>` +
    `<span class="pill">WORLD ${game.levelIndex + 1}/${LEVELS.length}</span>` +
    `<span class="pill">${game.theme.emoji} ${game.theme.name}</span>`;
}

/* ---------------- Main loop ---------------- */
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;          // clamp after tab switches
  game.time += dt;

  if (game.themeFade > 0) game.themeFade = Math.max(0, game.themeFade - dt);
  themeView = {
    a: game.themePrev, b: game.theme,
    t: game.themeFade > 0 ? 1 - game.themeFade / WORLD_FADE : 1,
  };

  if (game.state === "play" || game.state === "respawn" || game.state === "transition") {
    if (game.state === "play" && player.alive) updatePlayer(dt);
    for (const e of game.level.enemies) updateEnemy(e, dt);
    updateParticles(dt);

    const target = player.x + player.w / 2 - viewW / 2;
    game.cameraX = Math.max(0, Math.min(target, game.level.pixelW - viewW));
  }

  // draw
  drawBackground();
  if (game.level) {
    drawTiles();
    for (const co of game.level.coins) drawCoin(co);
    drawFlag();
    for (const e of game.level.enemies) drawEnemy(e);
    if (game.state !== "dead") drawPlayer();
    drawParticles();
    drawHUD();
  }

  requestAnimationFrame(frame);
}

menuPanel();
requestAnimationFrame((t) => { last = t; frame(t); });

document.addEventListener("visibilitychange", () => { last = performance.now(); });
