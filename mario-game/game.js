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
const LEVELS = [
  {
    width: 190,
    start: 3,
    flag: 186,
    ground: [[0, 30], [32, 60], [62, 92], [94, 124], [126, 156], [158, 190]],
    enemies: [18, 26, 44, 54, 70, 80, 100, 110, 134, 146, 168, 180],
  },
  {
    width: 200,
    start: 3,
    flag: 196,
    ground: [[0, 24], [26, 48], [50, 72], [74, 98], [100, 124], [126, 150], [152, 176], [178, 200]],
    enemies: [18, 30, 40, 56, 66, 82, 92, 108, 118, 130, 144, 158, 170, 184],
  },
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

/* ---------------- Rendering ---------------- */
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, cssH);
  g.addColorStop(0, "#5c94fc");
  g.addColorStop(1, "#9fd0ff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssW, cssH);

  // sun
  ctx.fillStyle = "rgba(255,236,150,0.9)";
  ctx.beginPath();
  ctx.arc(cssW - 70, 70, 38, 0, Math.PI * 2);
  ctx.fill();

  // parallax hills
  const off = game.cameraX * 0.3 * scale;
  ctx.fillStyle = "#4fae4f";
  for (let i = -1; i < 12; i++) {
    const hx = (i * 260 - (off % 260)) ;
    ctx.beginPath();
    ctx.arc(hx, cssH - 40 * scale, 90 * scale, Math.PI, 0);
    ctx.fill();
  }
  // clouds
  const coff = game.cameraX * 0.15 * scale;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = -1; i < 10; i++) {
    const cx = (i * 340 - (coff % 340));
    const cy = (60 + (i % 3) * 50) * scale;
    cloud(cx, cy, 26 * scale);
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

function w2s(wx) { return (wx - game.cameraX) * scale; }

function drawTiles() {
  const lv = game.level;
  const c0 = Math.max(0, Math.floor(game.cameraX / TILE) - 1);
  const c1 = Math.min(lv.W - 1, Math.ceil((game.cameraX + viewW) / TILE) + 1);
  for (let c = c0; c <= c1; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (lv.grid[r][c] !== 1) continue;
      const x = w2s(c * TILE);
      const y = r * TILE * scale;
      const s = TILE * scale;
      ctx.fillStyle = (r === 13) ? "#3aa53a" : "#8a5a2b";
      ctx.fillRect(x, y, s + 1, s + 1);
      if (r === 13) { ctx.fillStyle = "#2f8a2f"; ctx.fillRect(x, y + s * 0.7, s + 1, s * 0.3); }
      else { ctx.fillStyle = "#6f4420"; ctx.fillRect(x, y, s + 1, s * 0.18); }
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
    `<span class="pill">WORLD ${game.levelIndex + 1}-1</span>`;
}

/* ---------------- Main loop ---------------- */
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;          // clamp after tab switches
  game.time += dt;

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
