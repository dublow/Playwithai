"use strict";

/* ============================================================
   STAR REQUIEM — a neon vertical shoot 'em up.
   Pure HTML5 Canvas. No assets, no dependencies.
   Intro story, upgrade shop between stages, 3 stages, a mid-boss
   and a 3-phase final boss, and an ending. Touch + keyboard.
   See DESIGN.md for the design rationale and how to extend it.
   ============================================================ */

const VW = 540, VH = 960;                 // virtual portrait play-field
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let cssW = 0, cssH = 0, scale = 1, offX = 0, offY = 0, stars = [];

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cssW = window.innerWidth; cssH = window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = Math.min(cssW / VW, cssH / VH);
  offX = (cssW - VW * scale) / 2;
  offY = (cssH - VH * scale) / 2;
  buildStars();
}
function buildStars() {
  stars = [];
  const n = Math.round(clamp((cssW * cssH) / 6500, 70, 220));
  for (let i = 0; i < n; i++) {
    stars.push({ x: Math.random() * cssW, y: Math.random() * cssH, z: rand(0.25, 1) });
  }
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 200));
resize();

/* ---------------- Audio (tiny WebAudio) ---------------- */
let actx = null;
function resumeAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
  if (actx.state === "suspended") actx.resume();
}
function tone(freq, dur, type = "square", vol = 0.05, slideTo) {
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, actx.currentTime + dur);
  g.gain.value = vol;
  o.connect(g); g.connect(actx.destination);
  const t = actx.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur);
}
const sfx = {
  shoot: () => tone(880, 0.05, "square", 0.018, 1400),
  hit: () => tone(220, 0.05, "sawtooth", 0.03),
  boom: () => { tone(120, 0.28, "sawtooth", 0.06, 40); tone(80, 0.3, "triangle", 0.05); },
  pick: () => { tone(740, 0.05, "square", 0.04); setTimeout(() => tone(1180, 0.08, "square", 0.04), 45); },
  hurt: () => { tone(200, 0.25, "sawtooth", 0.07, 60); },
  bomb: () => { tone(60, 0.5, "sawtooth", 0.09, 30); tone(300, 0.4, "triangle", 0.05, 40); },
  phase: () => { [330, 440, 587].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.05), i * 90)); },
  win: () => { [523, 659, 784, 1047, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.22, "triangle", 0.05), i * 150)); },
};

/* ---------------- Game state ---------------- */
const game = {
  state: "title",        // title | story | shop | play | win | gameover
  stageIndex: 0,
  score: 0,
  cores: 0,
  lives: 3,
  time: 0,
  shake: 0,
  flash: 0,
};

const player = {
  x: VW / 2, y: VH - 170,
  vx: 0, vy: 0,
  r: 5,                  // tiny, fair hitbox (the bright core dot)
  hp: 100, maxhp: 100,
  bombs: 2,
  invuln: 0,
  fireT: 0,
  alive: true,
  tilt: 0,
};

const up = {             // upgrade levels (persist across a run)
  power: 1, fireRate: 1, speed: 1, hpLvl: 1,
};

let pBullets = [], enemies = [], eBullets = [], pickups = [], parts = [], floats = [];
let boss = null;
let stageT = 0, spawnIdx = 0, stageCleared = false, bossWarned = false;

/* ---------------- Stages & story script ---------------- */
const STORY_TITLE = "STAR REQUIEM";

const INTRO = [
  "2197.  The colony gates fall silent, one by one.",
  "From the dark between stars came the HIVE —\nand the world-eater they call THE DEVOURER.",
  "Earth's fleets are ash.\nOne prototype remains: the strike craft REQUIEM.",
  "Pilot — you are the last shot we have.\nBurn a path to the Devourer. End this.",
];
const ENDING = [
  "The Devourer convulses — and the dark goes quiet.",
  "Debris drifts where a god-engine hung.\nThe gate seals behind you.",
  "You set a course home. The stars, for the\nfirst time in years, are only stars.",
];

const STAGES = [
  {
    name: "STAGE 1", sub: "DEBRIS FIELD",
    intro: ["The vanguard screens the swarm.\nCut a path through the debris."],
    bg: ["#0a0f2e", "#1b0a3a"],
    boss: "warden_lite",
    events: [
      { t: 0.6, fn: () => formation("drone", 5, 90) },
      { t: 2.6, fn: () => formation("drone", 5, 90, true) },
      { t: 4.6, fn: () => spawn("weaver", VW * 0.3) },
      { t: 4.9, fn: () => spawn("weaver", VW * 0.7) },
      { t: 7.0, fn: () => formation("drone", 6, 70) },
      { t: 9.5, fn: () => spawn("turret", VW * 0.5) },
      { t: 11.0, fn: () => { spawn("weaver", VW * 0.2); spawn("weaver", VW * 0.8); } },
      { t: 13.5, fn: () => formation("drone", 6, 70, true) },
      { t: 16.0, fn: () => { spawn("turret", VW * 0.3); spawn("turret", VW * 0.7); } },
      { t: 19.0, fn: () => formation("weaver", 4, 110) },
    ],
  },
  {
    name: "STAGE 2", sub: "THE SWARM",
    intro: ["The vanguard breaks. The Hive swarm closes.\nIts WARDEN guards the gate — tear it down."],
    bg: ["#1b0a3a", "#3a0a2e"],
    boss: "warden",
    events: [
      { t: 0.5, fn: () => formation("weaver", 5, 90) },
      { t: 2.5, fn: () => { spawn("bomber", VW * 0.35); spawn("bomber", VW * 0.65); } },
      { t: 5.0, fn: () => formation("drone", 7, 60) },
      { t: 7.0, fn: () => { spawn("turret", VW * 0.25); spawn("turret", VW * 0.75); } },
      { t: 9.0, fn: () => formation("weaver", 5, 90, true) },
      { t: 11.0, fn: () => spawn("bomber", VW * 0.5) },
      { t: 12.5, fn: () => { spawn("turret", VW * 0.5); formation("drone", 6, 70); } },
      { t: 15.5, fn: () => { spawn("bomber", VW * 0.3); spawn("bomber", VW * 0.7); } },
      { t: 18.0, fn: () => formation("weaver", 6, 80) },
    ],
  },
  {
    name: "STAGE 3", sub: "THE DEVOURER",
    intro: ["The gate is open. Beyond it,\nthe Devourer's heart. Everything we were\nrides with you now."],
    bg: ["#3a0a2e", "#3a0606"],
    boss: "devourer",
    events: [
      { t: 0.5, fn: () => formation("weaver", 6, 80) },
      { t: 2.5, fn: () => { spawn("turret", VW * 0.2); spawn("turret", VW * 0.8); } },
      { t: 4.5, fn: () => { spawn("bomber", VW * 0.3); spawn("bomber", VW * 0.7); formation("drone", 6, 70); } },
      { t: 7.0, fn: () => formation("weaver", 6, 80, true) },
      { t: 9.0, fn: () => { spawn("turret", VW * 0.35); spawn("turret", VW * 0.65); spawn("bomber", VW * 0.5); } },
      { t: 12.0, fn: () => formation("weaver", 7, 70) },
    ],
  },
];

function formation(type, n, gap, alt) {
  const total = (n - 1) * gap;
  const x0 = VW / 2 - total / 2;
  for (let i = 0; i < n; i++) {
    const e = spawn(type, x0 + i * gap, -40 - (alt ? (i % 2) * 46 : 0));
    e.delay = i * 0.12;
  }
}

/* ---------------- Entities ---------------- */
const ENEMY = {
  drone:  { hp: 3,  r: 16, score: 80,  core: 1, color: "#7df0ff", speed: 150 },
  weaver: { hp: 5,  r: 17, score: 140, core: 2, color: "#9b7bff", speed: 120 },
  turret: { hp: 10, r: 20, score: 220, core: 3, color: "#ffb14e", speed: 90  },
  bomber: { hp: 18, r: 24, score: 320, core: 4, color: "#ff5d7a", speed: 70  },
};

function spawn(type, x, y) {
  const d = ENEMY[type];
  const e = {
    type, x, y: y == null ? -40 : y,
    vx: 0, vy: d.speed,
    hp: d.hp, r: d.r, color: d.color,
    t: 0, delay: 0, fireT: rand(0.6, 1.6),
    flash: 0, base: x,
  };
  enemies.push(e);
  return e;
}

function updateEnemy(e, dt) {
  if (e.delay > 0) { e.delay -= dt; return; }
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt * 6);

  if (e.type === "drone") {
    e.y += ENEMY.drone.speed * dt;
  } else if (e.type === "weaver") {
    e.y += ENEMY.weaver.speed * dt;
    e.x = e.base + Math.sin(e.t * 2.4) * 90;
    e.fireT -= dt;
    if (e.fireT <= 0 && e.y > 40 && e.y < VH * 0.7) { e.fireT = 1.8; aimedShot(e.x, e.y, 230, 1); }
  } else if (e.type === "turret") {
    if (e.y < 150) e.y += ENEMY.turret.speed * dt;
    else {
      e.hold = (e.hold || 0) + dt;
      e.fireT -= dt;
      if (e.fireT <= 0) { e.fireT = 1.5; for (let k = -1; k <= 1; k++) aimedShot(e.x, e.y, 240, 1, k * 0.22); }
      if (e.hold > 4.5) e.y += ENEMY.turret.speed * 1.4 * dt;
    }
  } else if (e.type === "bomber") {
    e.y += ENEMY.bomber.speed * dt;
    e.fireT -= dt;
    if (e.fireT <= 0 && e.y > 30 && e.y < VH * 0.75) {
      e.fireT = 2.2;
      for (let a = -2; a <= 2; a++) eBullet(e.x, e.y, Math.sin(a * 0.28) * 150, 170 + Math.cos(a * 0.28) * 40, "#ff6a8a");
    }
  }
}

function aimedShot(x, y, sp, n, spread) {
  const ang = Math.atan2(player.y - y, player.x - x) + (spread || 0);
  eBullet(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, "#ff4df0");
}
function eBullet(x, y, vx, vy, color) {
  if (eBullets.length > 460) eBullets.shift();
  eBullets.push({ x, y, vx, vy, r: 6, color: color || "#ff4df0" });
}
function pBullet(x, y, vx, vy, dmg) {
  pBullets.push({ x, y, vx, vy, r: 5, dmg });
}

function fireWeapon() {
  const lv = up.power;
  const dmg = 1 + (lv - 1) * 0.6;
  const y = player.y - 22;
  sfx.shoot();
  if (lv === 1) {
    pBullet(player.x, y, 0, -780, dmg);
  } else if (lv === 2) {
    pBullet(player.x - 9, y, 0, -800, dmg); pBullet(player.x + 9, y, 0, -800, dmg);
  } else if (lv === 3) {
    pBullet(player.x, y, 0, -840, dmg);
    pBullet(player.x - 12, y + 4, -90, -800, dmg); pBullet(player.x + 12, y + 4, 90, -800, dmg);
  } else if (lv === 4) {
    pBullet(player.x - 9, y, 0, -860, dmg); pBullet(player.x + 9, y, 0, -860, dmg);
    pBullet(player.x - 16, y + 4, -150, -800, dmg); pBullet(player.x + 16, y + 4, 150, -800, dmg);
  } else {
    pBullet(player.x, y, 0, -900, dmg + 0.5);
    pBullet(player.x - 11, y, -70, -870, dmg); pBullet(player.x + 11, y, 70, -870, dmg);
    pBullet(player.x - 20, y + 6, -230, -780, dmg); pBullet(player.x + 20, y + 6, 230, -780, dmg);
  }
}

function makeParticles(x, y, color, n, spd) {
  for (let i = 0; i < n; i++) {
    if (parts.length > 320) parts.shift();
    const a = Math.random() * Math.PI * 2, s = rand(0.3, 1) * spd;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.8), max: 0.8, color, r: rand(1.5, 3.5) });
  }
}
function explode(x, y, color, big) {
  makeParticles(x, y, color, big ? 26 : 12, big ? 320 : 200);
  game.shake = Math.min(18, game.shake + (big ? 12 : 5));
  if (big) game.flash = Math.min(0.5, game.flash + 0.35);
  sfx.boom();
}
function floatText(x, y, txt, color) {
  floats.push({ x, y, txt, color: color || "#ffd23f", life: 0.9 });
}
function dropPickup(x, y, kind) {
  pickups.push({ x, y, vy: 90, kind, t: 0, r: 14 });
}

/* ---------------- Bosses ---------------- */
function spawnBoss(kind) {
  if (kind === "warden_lite") boss = mkBoss("WARDEN SCOUT", 360, "#ffb14e", 1);
  else if (kind === "warden") boss = mkBoss("HIVE WARDEN", 760, "#ff8d3a", 2);
  else boss = mkBoss("THE DEVOURER", 1500, "#ff3df0", 3);
  boss.kind = kind;
  sfx.phase();
  game.flash = 0.4;
}
function mkBoss(name, hp, color, tier) {
  return {
    name, hp, maxhp: hp, color, tier,
    x: VW / 2, y: -120, ty: 150,
    t: 0, fireT: 1.2, phase: 0, swap: 0, alive: true,
    intro: true, r: 70,
  };
}
function updateBoss(dt) {
  const b = boss;
  b.t += dt;
  if (b.intro) {
    b.y += (b.ty - b.y) * Math.min(1, dt * 2);
    if (b.y > b.ty - 2) { b.y = b.ty; b.intro = false; }
    return;
  }
  b.x = VW / 2 + Math.sin(b.t * 0.7) * (VW * 0.28);

  const frac = b.hp / b.maxhp;
  const wantPhase = b.tier >= 3 ? (frac < 0.33 ? 2 : frac < 0.66 ? 1 : 0)
                  : b.tier === 2 ? (frac < 0.5 ? 1 : 0) : 0;
  if (wantPhase !== b.phase) {
    b.phase = wantPhase; b.swap = 0.9; sfx.phase();
    game.shake += 12; game.flash = 0.35;
    eBullets.length = Math.min(eBullets.length, 40);
  }
  if (b.swap > 0) { b.swap -= dt; return; }

  b.fireT -= dt;
  if (b.fireT > 0) return;

  if (b.tier === 1) {                                  // scout: gentle fans
    b.fireT = 1.15;
    for (let k = -2; k <= 2; k++) aimedShot(b.x, b.y + 40, 230, 1, k * 0.16);
  } else if (b.tier === 2) {                           // warden
    if (b.phase === 0) {
      b.fireT = 0.95;
      for (let k = -3; k <= 3; k++) aimedShot(b.x, b.y + 40, 250, 1, k * 0.13);
    } else {
      b.fireT = 0.6;
      const a0 = b.t * 2.2;
      for (let k = 0; k < 8; k++) {
        const a = a0 + k * (Math.PI * 2 / 8);
        eBullet(b.x, b.y + 30, Math.cos(a) * 200, Math.sin(a) * 200, "#ff7b00");
      }
      if (Math.random() < 0.3) aimedShot(b.x, b.y + 40, 300, 1);
    }
  } else {                                             // THE DEVOURER (3 phases)
    if (b.phase === 0) {
      b.fireT = 0.85;
      for (let k = -3; k <= 3; k++) aimedShot(b.x, b.y + 50, 240, 1, k * 0.12);
      if (Math.random() < 0.25) { const e = spawn("weaver", b.x); e.y = b.y + 60; }
    } else if (b.phase === 1) {
      b.fireT = 0.42;
      const a0 = b.t * 2.6;
      for (let k = 0; k < 6; k++) {
        const a = a0 + k * (Math.PI * 2 / 6);
        eBullet(b.x, b.y + 30, Math.cos(a) * 210, Math.sin(a) * 210, "#ff5df0");
      }
    } else {
      b.fireT = 0.55;
      for (let k = 0; k < 14; k++) {
        const a = k * (Math.PI * 2 / 14) + b.t;
        eBullet(b.x, b.y + 30, Math.cos(a) * 175, Math.sin(a) * 175 + 30, "#ff2a2a");
      }
      for (let k = -2; k <= 2; k++) aimedShot(b.x, b.y + 50, 320, 1, k * 0.1);
    }
  }
}
function hitBoss(dmg) {
  const b = boss;
  b.hp -= dmg;
  b.flash = 0.12;
  if (b.hp <= 0) {
    b.alive = false;
    for (let i = 0; i < 5; i++) setTimeout(() => explode(b.x + rand(-50, 50), b.y + rand(-40, 40), b.color, true), i * 120);
    game.score += b.tier * 1500;
    game.cores += [0, 30, 55, 90][b.tier] || 30;
    boss = null;
    stageCleared = true;
  }
}

/* ---------------- Player damage / bomb ---------------- */
function hurtPlayer(amount) {
  if (player.invuln > 0 || !player.alive) return;
  player.hp -= amount;
  game.shake += 8; game.flash = Math.min(0.6, game.flash + 0.3);
  sfx.hurt();
  if (player.hp <= 0) {
    player.hp = 0;
    explode(player.x, player.y, "#7df0ff", true);
    game.lives -= 1;
    if (game.lives <= 0) {
      player.alive = false;
      setState("gameover");
    } else {
      player.invuln = 2.2;
      player.hp = player.maxhp;
      player.x = VW / 2; player.y = VH - 170;
      eBullets.length = 0;
    }
  } else {
    player.invuln = 1.0;
  }
}
function useBomb() {
  if (player.bombs <= 0 || game.state !== "play" || !player.alive) return;
  player.bombs -= 1;
  sfx.bomb();
  game.shake += 16; game.flash = 0.6;
  for (const e of enemies) { e.hp -= 6; e.flash = 1; }
  if (boss && !boss.intro && boss.swap <= 0) hitBoss(40);
  for (const b of eBullets) makeParticles(b.x, b.y, "#9bf", 1, 60);
  eBullets.length = 0;
  player.invuln = Math.max(player.invuln, 1.2);
  updateBombBtn();
}

/* ---------------- Input ---------------- */
const keys = {};
let pointerId = null, dragOff = { x: 0, y: 0 };

addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "Space" && game.state === "play") useBomb();
  if ((e.code === "Enter" || e.code === "Space") && game.state !== "play") advanceOverlay();
});
addEventListener("keyup", (e) => { keys[e.code] = false; });

const wrap = document.getElementById("game-wrap");
function toWorld(cx, cy) { return { x: (cx - offX) / scale, y: (cy - offY) / scale }; }
function onDown(e) {
  resumeAudio();
  if (game.state !== "play") return;
  const t = e.touches ? e.touches[0] : e;
  if (pointerId != null) return;
  pointerId = e.touches ? t.identifier : "m";
  const w = toWorld(t.clientX, t.clientY);
  dragOff.x = clamp(player.x - w.x, -90, 90);
  dragOff.y = clamp(player.y - w.y, -130, 40);
  if (e.cancelable) e.preventDefault();
}
function onMove(e) {
  if (game.state !== "play" || pointerId == null) return;
  let t = e.touches ? [...e.touches].find((x) => x.identifier === pointerId) : e;
  if (!t) return;
  const w = toWorld(t.clientX, t.clientY);
  player.tx = clamp(w.x + dragOff.x, 18, VW - 18);
  player.ty = clamp(w.y + dragOff.y, 70, VH - 30);
  if (e.cancelable) e.preventDefault();
}
function onUp() { pointerId = null; }
wrap.addEventListener("touchstart", onDown, { passive: false });
wrap.addEventListener("touchmove", onMove, { passive: false });
wrap.addEventListener("touchend", onUp);
wrap.addEventListener("touchcancel", onUp);
wrap.addEventListener("pointerdown", onDown);
wrap.addEventListener("pointermove", onMove);
wrap.addEventListener("pointerup", onUp);
wrap.addEventListener("contextmenu", (e) => e.preventDefault());

const bombBtn = document.getElementById("bomb-btn");
bombBtn.addEventListener("touchstart", (e) => { e.preventDefault(); useBomb(); }, { passive: false });
bombBtn.addEventListener("click", useBomb);
function updateBombBtn() {
  bombBtn.textContent = "BOMB " + player.bombs;
  bombBtn.classList.toggle("empty", player.bombs <= 0);
  bombBtn.classList.toggle("show", game.state === "play");
}

/* ---------------- Overlay / story / shop ---------------- */
const overlay = document.getElementById("overlay");
const panel = document.getElementById("panel");
let storyQueue = null, storyIdx = 0, storyDone = null;

function showOverlay(html) { panel.innerHTML = html; overlay.classList.remove("hidden"); }
function hideOverlay() { overlay.classList.add("hidden"); }

function setState(s) {
  game.state = s;
  updateBombBtn();
  if (s === "title") titlePanel();
  else if (s === "gameover") gameoverPanel();
  else if (s === "win") winPanel();
  if (s === "play") hideOverlay();
}

function titlePanel() {
  showOverlay(
    `<h1>STAR<br/>REQUIEM</h1>
     <p class="tag">A NEON SHOOT 'EM UP</p>
     <p class="story">The last fighter. One run at the dark.</p>
     <button class="btn" id="ov-btn">BEGIN</button>
     <p class="hint">Drag to fly • auto-fire<br/>Bomb button clears the screen<br/>Desktop: arrows/WASD • Space = bomb</p>`);
  bindOv(() => startStory(INTRO.concat(stageIntro(0)), () => beginStage(0)));
}
function stageIntro(i) {
  const s = STAGES[i];
  return s.intro.concat([`${s.name}\n${s.sub}`]);
}
function startStory(pages, done) {
  storyQueue = pages; storyIdx = 0; storyDone = done;
  game.state = "story"; renderStory();
}
function renderStory() {
  const txt = storyQueue[storyIdx].replace(/\n/g, "<br/>");
  const last = storyIdx >= storyQueue.length - 1;
  showOverlay(
    `<p class="tag">STAR REQUIEM</p>
     <p class="story">${txt}</p>
     <button class="btn" id="ov-btn">${last ? "LAUNCH" : "CONTINUE"}</button>
     <p class="hint">${storyIdx + 1} / ${storyQueue.length}</p>`);
  bindOv(advanceOverlay);
}
function advanceOverlay() {
  if (game.state === "story") {
    storyIdx++;
    if (storyIdx >= storyQueue.length) { const d = storyDone; storyDone = null; d && d(); }
    else renderStory();
  } else if (game.state === "title") {
    startStory(INTRO.concat(stageIntro(0)), () => beginStage(0));
  } else if (game.state === "gameover" || game.state === "win") {
    location.reload();
  }
}
function bindOv(fn) {
  const b = document.getElementById("ov-btn");
  if (b) b.addEventListener("click", () => { resumeAudio(); fn(); });
}

/* Upgrade shop */
const UPGRADES = [
  { id: "power", name: "Weapon Power", max: 5, cost: (l) => [0, 0, 9, 16, 26, 40][l] || 99,
    desc: (l) => l >= 5 ? "MAX — five-way cannon" : `Lv ${l} → ${l + 1}: more shots & damage` },
  { id: "fireRate", name: "Fire Rate", max: 5, cost: (l) => [0, 0, 7, 12, 19, 30][l] || 99,
    desc: (l) => l >= 5 ? "MAX — minigun cadence" : `Lv ${l} → ${l + 1}: faster auto-fire` },
  { id: "speed", name: "Engine Boost", max: 4, cost: (l) => [0, 0, 7, 13, 22][l] || 99,
    desc: (l) => l >= 4 ? "MAX — razor handling" : `Lv ${l} → ${l + 1}: more agility` },
  { id: "hpLvl", name: "Hull Plating", max: 5, cost: (l) => [0, 0, 9, 15, 24, 36][l] || 99,
    desc: (l) => l >= 5 ? "MAX — +100 hull" : `Lv ${l} → ${l + 1}: +25 max hull (& repair)` },
  { id: "bomb", name: "Spare Bomb", max: 9, cost: () => 12,
    desc: () => "+1 screen-clearing bomb" },
  { id: "repair", name: "Field Repair", max: 99, cost: () => 6,
    desc: () => "Restore hull to full now" },
  { id: "life", name: "Backup Core", max: 9, cost: () => 28,
    desc: () => "+1 extra life" },
];
function lvlOf(idDef) {
  if (idDef.id === "bomb") return player.bombs;
  if (idDef.id === "life") return game.lives;
  if (idDef.id === "repair") return 0;
  return up[idDef.id];
}
function showShop(done) {
  game.state = "shop"; storyDone = done;
  renderShop();
}
function renderShop() {
  let rows = "";
  for (const u of UPGRADES) {
    const lv = lvlOf(u);
    const maxed = lv >= u.max;
    const cost = u.cost(lv);
    const afford = game.cores >= cost && !maxed;
    rows +=
      `<div class="up ${maxed ? "max" : ""}">
         <div><div class="name">${u.name}</div><div class="desc">${u.desc(lv)}</div></div>
         <button class="buy" data-id="${u.id}" ${afford ? "" : "disabled"}>
           ${maxed ? "MAX" : cost + " ◆"}</button>
       </div>`;
  }
  showOverlay(
    `<h2>UPGRADE BAY</h2>
     <div class="shop-head"><span>Spend your cores</span><span class="cores">${game.cores} ◆</span></div>
     <div class="shop-list">${rows}</div>
     <button class="btn alt" id="ov-btn">LAUNCH →</button>`);
  panel.querySelectorAll(".buy").forEach((btn) =>
    btn.addEventListener("click", () => { resumeAudio(); buy(btn.dataset.id); }));
  bindOv(() => { const d = storyDone; storyDone = null; d && d(); });
}
function buy(id) {
  const u = UPGRADES.find((x) => x.id === id);
  const lv = lvlOf(u);
  if (lv >= u.max) return;
  const cost = u.cost(lv);
  if (game.cores < cost) return;
  game.cores -= cost;
  sfx.pick();
  if (id === "bomb") player.bombs++;
  else if (id === "life") game.lives++;
  else if (id === "repair") player.hp = player.maxhp;
  else {
    up[id]++;
    if (id === "hpLvl") { player.maxhp = 100 + (up.hpLvl - 1) * 25; player.hp = player.maxhp; }
  }
  renderShop();
}

/* ---------------- Stage flow ---------------- */
function beginStage(i) {
  game.stageIndex = i;
  stageT = 0; spawnIdx = 0; stageCleared = false; bossWarned = false;
  enemies = []; eBullets = []; pBullets = []; pickups = []; floats = [];
  boss = null;
  player.x = VW / 2; player.y = VH - 170;
  player.tx = player.x; player.ty = player.y;
  player.hp = player.maxhp; player.invuln = 1.2;
  player.alive = true;
  setState("play");
}
function stageClearedFlow() {
  game.score += 800 + game.stageIndex * 600;
  const next = game.stageIndex + 1;
  if (next >= STAGES.length) {
    sfx.win();
    startStory(ENDING, () => setState("win"));
  } else {
    showShop(() => startStory(stageIntro(next), () => beginStage(next)));
  }
}

function titleScore() { return game.score; }
function gameoverPanel() {
  showOverlay(
    `<h1 style="color:#ff5c7a;text-shadow:0 0 14px #ff3d6e">THE REQUIEM<br/>GOES DARK</h1>
     <p class="story">The strike craft is lost to the void.</p>
     <p class="score">SCORE  ${titleScore()}</p>
     <button class="btn alt" id="ov-btn">TRY AGAIN</button>`);
  bindOv(() => location.reload());
}
function winPanel() {
  showOverlay(
    `<h1 style="color:#9bffb0;text-shadow:0 0 16px #2cff7a">YOU WIN</h1>
     <p class="story">The dark is quiet. You fly home.</p>
     <p class="score">FINAL SCORE  ${titleScore()}</p>
     <button class="btn" id="ov-btn">PLAY AGAIN</button>
     <p class="hint">STAR REQUIEM — a Play with AI project</p>`);
  bindOv(() => location.reload());
}

/* ---------------- Update ---------------- */
function update(dt) {
  game.time += dt;
  game.shake = Math.max(0, game.shake - dt * 40);
  game.flash = Math.max(0, game.flash - dt * 1.6);
  for (const s of stars) { s.y += (40 + s.z * 220) * dt; if (s.y > cssH) { s.y = -2; s.x = Math.random() * cssW; } }

  if (game.state !== "play") return;

  // player movement
  const sp = 360 + (up.speed - 1) * 95;
  let kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  let ky = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  if (kx || ky) {
    player.x = clamp(player.x + kx * sp * dt, 18, VW - 18);
    player.y = clamp(player.y + ky * sp * dt, 70, VH - 30);
    player.tx = player.x; player.ty = player.y;
    player.tilt += (kx - player.tilt) * Math.min(1, dt * 12);
  } else if (player.tx != null) {
    const dx = player.tx - player.x, dy = player.ty - player.y;
    const f = Math.min(1, dt * 16);
    player.x += dx * f; player.y += dy * f;
    player.tilt += (clamp(dx * 0.05, -1, 1) - player.tilt) * Math.min(1, dt * 10);
  }
  if (player.invuln > 0) player.invuln -= dt;

  // auto-fire
  player.fireT -= dt;
  const interval = 0.22 - (up.fireRate - 1) * 0.032;
  if (player.fireT <= 0 && player.alive) { player.fireT = interval; fireWeapon(); }

  // stage script
  if (!stageCleared) {
    stageT += dt;
    const ev = STAGES[game.stageIndex].events;
    while (spawnIdx < ev.length && stageT >= ev[spawnIdx].t) { ev[spawnIdx].fn(); spawnIdx++; }
    if (spawnIdx >= ev.length && enemies.length === 0 && !boss) {
      if (!bossWarned) { bossWarned = true; game.bossWarnT = 1.4; }
      else if ((game.bossWarnT -= dt) <= 0) spawnBoss(STAGES[game.stageIndex].boss);
    }
  }
  if (boss) updateBoss(dt);

  // bullets
  for (let i = pBullets.length - 1; i >= 0; i--) {
    const b = pBullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -20 || b.x < -20 || b.x > VW + 20) { pBullets.splice(i, 1); continue; }
    let hit = false;
    for (const e of enemies) {
      if (e.delay > 0) continue;
      if (dist2(b.x, b.y, e.x, e.y) < (e.r + b.r) ** 2) {
        e.hp -= b.dmg; e.flash = 1; hit = true;
        makeParticles(b.x, b.y, "#bff", 2, 70);
        break;
      }
    }
    if (!hit && boss && !boss.intro && dist2(b.x, b.y, boss.x, boss.y) < (boss.r + b.r) ** 2) {
      hitBoss(b.dmg); makeParticles(b.x, b.y, "#fbf", 2, 80); hit = true;
    }
    if (hit) pBullets.splice(i, 1);
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    updateEnemy(e, dt);
    if (e.hp <= 0) {
      explode(e.x, e.y, e.color, e.type === "bomber");
      game.score += ENEMY[e.type].score;
      game.cores += ENEMY[e.type].core;
      floatText(e.x, e.y, "+" + ENEMY[e.type].score, "#bff");
      if (e.type === "bomber" || (e.type === "turret" && Math.random() < 0.5)) dropPickup(e.x, e.y, "hp");
      enemies.splice(i, 1); continue;
    }
    if (e.y > VH + 50) { enemies.splice(i, 1); continue; }
    if (e.delay <= 0 && player.alive && player.invuln <= 0 &&
        dist2(e.x, e.y, player.x, player.y) < (e.r + player.r) ** 2) {
      e.hp = 0; explode(e.x, e.y, e.color, true); hurtPlayer(40);
    }
  }
  for (let i = eBullets.length - 1; i >= 0; i--) {
    const b = eBullets[i];
    if (!b) break;                       // array cleared mid-loop (death/respawn/bomb)
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y > VH + 30 || b.y < -40 || b.x < -40 || b.x > VW + 40) { eBullets.splice(i, 1); continue; }
    if (player.alive && player.invuln <= 0 && dist2(b.x, b.y, player.x, player.y) < (b.r + player.r) ** 2) {
      eBullets.splice(i, 1); hurtPlayer(20);
    }
  }
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]; p.t += dt; p.y += p.vy * dt;
    if (p.y > VH + 30) { pickups.splice(i, 1); continue; }
    if (dist2(p.x, p.y, player.x, player.y) < (p.r + 16) ** 2) {
      if (p.kind === "hp") { player.hp = Math.min(player.maxhp, player.hp + 30); floatText(player.x, player.y - 20, "+HULL", "#9bffb0"); }
      sfx.pick(); pickups.splice(i, 1);
    }
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i]; q.life -= dt;
    if (q.life <= 0) { parts.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96;
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.life -= dt; f.y -= 26 * dt;
    if (f.life <= 0) floats.splice(i, 1);
  }

  if (stageCleared && enemies.length === 0 && eBullets.length === 0) {
    stageCleared = false;
    stageClearedFlow();
  }
  updateBombBtn();
}

/* ---------------- Render ---------------- */
function drawBackground() {
  const stg = STAGES[clamp(game.stageIndex, 0, STAGES.length - 1)];
  const g = ctx.createLinearGradient(0, 0, 0, cssH);
  g.addColorStop(0, stg.bg[0]); g.addColorStop(1, stg.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cssW, cssH);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const ny = (game.time * 14) % (cssH + 300) - 150;
  radial(cssW * 0.3, ny, 240, "rgba(70,30,140,0.16)");
  radial(cssW * 0.75, ny + cssH * 0.5, 300, "rgba(140,30,90,0.14)");
  for (const s of stars) {
    ctx.globalAlpha = 0.4 + s.z * 0.6;
    ctx.fillStyle = s.z > 0.7 ? "#bfe9ff" : "#7fa8d8";
    const r = s.z * 1.8;
    ctx.fillRect(s.x, s.y, r, r);
  }
  ctx.restore();
}
function radial(x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}

function drawShip(x, y, tilt, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt * 0.28);
  // engine flame
  ctx.globalCompositeOperation = "lighter";
  const fl = 14 + Math.sin(t * 40) * 5;
  const fg = ctx.createLinearGradient(0, 14, 0, 14 + fl);
  fg.addColorStop(0, "rgba(120,240,255,0.9)"); fg.addColorStop(1, "rgba(120,240,255,0)");
  ctx.fillStyle = fg;
  ctx.beginPath(); ctx.moveTo(-6, 14); ctx.lineTo(6, 14); ctx.lineTo(0, 14 + fl); ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  // hull
  ctx.fillStyle = "#0a1830";
  ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -24); ctx.lineTo(16, 14); ctx.lineTo(7, 8);
  ctx.lineTo(0, 16); ctx.lineTo(-7, 8); ctx.lineTo(-16, 14);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // wings
  ctx.fillStyle = "#0e2747";
  ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-26, 10); ctx.lineTo(-9, 9); ctx.fill();
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(26, 10); ctx.lineTo(9, 9); ctx.fill();
  // cockpit glow + the true hitbox dot
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#ff3df0";
  ctx.beginPath(); ctx.arc(0, -2, 4.5, 0, 7); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(0, -2, 2, 0, 7); ctx.fill();
  ctx.restore();
}

function drawEnemy(e) {
  if (e.delay > 0) return;
  ctx.save(); ctx.translate(e.x, e.y);
  const col = e.flash > 0.4 ? "#ffffff" : e.color;
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.fillStyle = "#10101e";
  ctx.beginPath();
  if (e.type === "drone") {
    ctx.moveTo(0, e.r); ctx.lineTo(e.r, -e.r * 0.5); ctx.lineTo(-e.r, -e.r * 0.5); ctx.closePath();
  } else if (e.type === "weaver") {
    ctx.moveTo(0, e.r); ctx.lineTo(e.r, 0); ctx.lineTo(0, -e.r); ctx.lineTo(-e.r, 0); ctx.closePath();
  } else if (e.type === "turret") {
    ctx.arc(0, 0, e.r, 0, 7);
  } else {
    ctx.moveTo(-e.r, -e.r * 0.6); ctx.lineTo(e.r, -e.r * 0.6);
    ctx.lineTo(e.r * 0.6, e.r); ctx.lineTo(-e.r * 0.6, e.r); ctx.closePath();
  }
  ctx.fill(); ctx.stroke();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, 7); ctx.fill();
  ctx.restore();
}

function drawBoss() {
  const b = boss;
  ctx.save(); ctx.translate(b.x, b.y);
  const flash = (b.flash || 0) > 0 ? "#fff" : b.color;
  if (b.flash) b.flash -= 0.016;
  ctx.globalCompositeOperation = "lighter";
  radial(0, 0, 110, "rgba(255,80,240,0.10)");
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = flash; ctx.lineWidth = 3; ctx.fillStyle = "#180626";
  ctx.beginPath();
  ctx.moveTo(0, 64); ctx.lineTo(72, 18); ctx.lineTo(54, -34);
  ctx.lineTo(0, -56); ctx.lineTo(-54, -34); ctx.lineTo(-72, 18); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-30, -10); ctx.lineTo(30, -10); ctx.lineTo(0, 40); ctx.closePath();
  ctx.fillStyle = "#2a0a3a"; ctx.fill(); ctx.stroke();
  ctx.globalCompositeOperation = "lighter";
  const pc = ["#ff3df0", "#ff5df0", "#ff2a2a"][b.phase] || b.color;
  ctx.fillStyle = pc;
  ctx.beginPath(); ctx.arc(0, 6, 13 + Math.sin(b.t * 6) * 3, 0, 7); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(0, 6, 6, 0, 7); ctx.fill();
  ctx.restore();
}

function drawWorld() {
  for (const p of pickups) {
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = p.kind === "hp" ? "#2cff7a" : "#ffd23f";
    const s = 7 + Math.sin(p.t * 8) * 2;
    ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.globalCompositeOperation = "source-over";
    ctx.fillText(p.kind === "hp" ? "+" : "◆", 0, 1);
    ctx.restore();
  }

  for (const e of enemies) drawEnemy(e);
  if (boss && !boss.intro) drawBoss();
  else if (boss) drawBoss();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const b of pBullets) {
    ctx.fillStyle = "#9beaff";
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 3, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, 7); ctx.fill();
  }
  for (const b of eBullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.4, 0, 7); ctx.fill();
  }
  for (const q of parts) {
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
    ctx.fillStyle = q.color;
    ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  for (const f of floats) {
    ctx.globalAlpha = clamp(f.life / 0.9, 0, 1);
    ctx.fillStyle = f.color;
    ctx.font = "bold 15px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  if (player.alive && (player.invuln <= 0 || Math.floor(game.time * 20) % 2 === 0)) {
    drawShip(player.x, player.y, player.tilt || 0, game.time);
  }

  if (game.bossWarnT > 0 && !boss && game.state === "play") {
    ctx.fillStyle = "#ff3df0";
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(game.time * 18);
    ctx.font = "900 30px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("⚠  WARNING  ⚠", VW / 2, VH / 2);
    ctx.globalAlpha = 1;
  }
}

function render() {
  drawBackground();
  ctx.save();
  let sx = 0, sy = 0;
  if (game.shake > 0) { sx = rand(-1, 1) * game.shake; sy = rand(-1, 1) * game.shake; }
  ctx.translate(offX + sx, offY + sy);
  ctx.scale(scale, scale);
  ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  // faint play-field frame
  ctx.strokeStyle = "rgba(0,229,255,0.18)"; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, VW - 2, VH - 2);
  if (game.state === "play" || boss || enemies.length) drawWorld();
  ctx.restore();

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${game.flash * 0.5})`;
    ctx.fillRect(0, 0, cssW, cssH);
  }
  drawHUD();
}

const hud = document.getElementById("hud");
function drawHUD() {
  if (game.state !== "play") { hud.innerHTML = ""; return; }
  const hpPct = clamp(player.hp / player.maxhp, 0, 1) * 100;
  let html =
    `<div class="row">
       <span>◆ ${game.cores}</span>
       <span>${STAGES[game.stageIndex].name}</span>
       <span>SCORE ${game.score}</span>
     </div>
     <div class="bar"><i style="width:${hpPct}%"></i></div>
     <div class="row" style="margin-top:6px">
       <span>HULL</span><span>♥ ${game.lives}　◎ ${player.bombs}</span>
     </div>`;
  if (boss) {
    const bp = clamp(boss.hp / boss.maxhp, 0, 1) * 100;
    html += `<div class="boss"><div class="row"><span class="label">${boss.name}</span></div>
             <div class="bar"><i style="width:${bp}%"></i></div></div>`;
  }
  hud.innerHTML = html;
}

/* ---------------- Loop ---------------- */
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;
  if (game.bossWarnT == null) game.bossWarnT = 0;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
setState("title");
updateBombBtn();
requestAnimationFrame((t) => { last = t; frame(t); });
document.addEventListener("visibilitychange", () => { last = performance.now(); });
