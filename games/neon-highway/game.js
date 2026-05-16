/* ============================================================
 *  NEON HIGHWAY USA
 *  A retro pseudo-3D arcade racer. Vanilla JS, no deps.
 *  All art is generated as inline SVG -> Image, all audio is
 *  synthesised with the Web Audio API. Nothing is loaded
 *  from disk or network.
 *
 *  Rendering uses the classic segment-projection technique
 *  (road split into Z segments, each projected with a pinhole
 *  camera) which gives the arcade "into the screen" depth.
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

    // increase a looping value (track position) wrapping at max
    increase(start, inc, max) {
      let r = start + inc;
      while (r >= max) r -= max;
      while (r < 0) r += max;
      return r;
    },

    // shortest signed distance from b to a on a ring of length len
    loopDelta(a, b, len) {
      let d = a - b;
      while (d > len / 2) d -= len;
      while (d < -len / 2) d += len;
      return d;
    },

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
    mix(hexA, hexB, t) {
      const a = Util.hexToRgb(hexA), b = Util.hexToRgb(hexB);
      const r = Math.round(Util.lerp(a.r, b.r, t));
      const g = Math.round(Util.lerp(a.g, b.g, t));
      const bl = Math.round(Util.lerp(a.b, b.b, t));
      return "rgb(" + r + "," + g + "," + bl + ")";
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
  const DRAW_DIST = 240;        // how many segments we draw ahead
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

  const START_TIME = 45;         // starting seconds on the clock
  const CP_BONUS_TIME = 11;      // seconds gained at a checkpoint
  const CP_DISTANCE = 60000;     // world units between checkpoints

  // global sprite scale (tuned so the player car reads well)
  const SPRITE_SCALE = 0.3 * (1 / 300);

  const COLORS = {
    LIGHT: { road: "#9a9aa6", grass: "#1d9b56", rumble: "#f4f4f8", lane: "#fbfbff" },
    DARK:  { road: "#8f8f9b", grass: "#188a4c", rumble: "#c81d4e", lane: "#8f8f9b" },
    FOG: "#4a1166"
  };

  /* ----------------------------------------------------------
   *  AssetFactory - builds SVG sprites, rasterises to Image
   * -------------------------------------------------------- */
  const AssetFactory = {
    sprites: {},

    svgURL(svg) {
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    },

    // ---- player car (rear three-quarter view) ----
    playerCarSVG() {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="190" viewBox="0 0 300 190">
        <defs>
          <linearGradient id="pb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ff4d8d"/><stop offset=".55" stop-color="#d6195f"/>
            <stop offset="1" stop-color="#7a0c34"/>
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

    // ---- a traffic car, palette driven, rear view ----
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
        <g stroke="#0e4a22" stroke-width="3">
          <line x1="95" y1="92" x2="95" y2="300"/>
        </g>
      </svg>`;
    },

    billboardSVG(text, accent) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="340" viewBox="0 0 440 340">
        <defs>
          <linearGradient id="bp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#241042"/><stop offset="1" stop-color="#120626"/>
          </linearGradient>
        </defs>
        <ellipse cx="220" cy="330" rx="150" ry="14" fill="rgba(0,0,0,.32)"/>
        <rect x="86" y="150" width="20" height="180" fill="#3a2a1a"/>
        <rect x="334" y="150" width="20" height="180" fill="#3a2a1a"/>
        <rect x="40" y="20" width="360" height="170" rx="12" fill="url(#bp)"
              stroke="${accent}" stroke-width="6"/>
        <rect x="40" y="20" width="360" height="170" rx="12" fill="none"
              stroke="${accent}" stroke-width="6" opacity=".4"/>
        <text x="220" y="118" text-anchor="middle"
              font-family="Arial Black, Arial, sans-serif" font-size="68"
              font-weight="900" fill="#fff" stroke="${accent}" stroke-width="2"
              style="paint-order:stroke">${text}</text>
        <circle cx="60" cy="40" r="6" fill="${accent}"/>
        <circle cx="380" cy="40" r="6" fill="${accent}"/>
        <circle cx="60" cy="170" r="6" fill="${accent}"/>
        <circle cx="380" cy="170" r="6" fill="${accent}"/>
      </svg>`;
    },

    load(onProgress, onDone) {
      const defs = [
        ["player", this.playerCarSVG()],
        ["car0", this.trafficCarSVG({ hi: "#7fe3ff", mid: "#1f9ad6", lo: "#0c4f73" })],
        ["car1", this.trafficCarSVG({ hi: "#ffd56b", mid: "#f59e1b", lo: "#8a560a" })],
        ["car2", this.trafficCarSVG({ hi: "#c6ff8a", mid: "#5fcf3a", lo: "#256b18" })],
        ["palm", this.palmSVG()],
        ["cactus", this.cactusSVG()],
        ["bbDiner", this.billboardSVG("DINER", "#ff2e88")],
        ["bbMotel", this.billboardSVG("MOTEL", "#19f0ff")],
        ["bbGas", this.billboardSVG("GAS", "#ffd24a")],
        ["bbVegas", this.billboardSVG("VEGAS", "#ff7e3d")],
        ["bbCoast", this.billboardSVG("COAST", "#7afcff")]
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
      this.ctx = null;
      this.muted = false;
      this.master = null;
      this.engine = null;
      this.engineGain = null;
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
    resume() {
      this.ensure();
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    }
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.5;
    }
    // short synth blip
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
      this.left = false; this.right = false;
      this.gas = false; this.brake = false; this.boost = false;
      this._bindKeys();
      this._bindTouch();
    }
    _bindKeys() {
      const k = (e, v) => {
        switch (e.code) {
          case "ArrowLeft": case "KeyA": this.left = v; break;
          case "ArrowRight": case "KeyD": this.right = v; break;
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
      // fallback for very old iOS
      el.addEventListener("touchstart", on, { passive: false });
      el.addEventListener("touchend", off, { passive: false });
    }
    _bindTouch() {
      this._hold(document.getElementById("steer-left"), v => this.left = v);
      this._hold(document.getElementById("steer-right"), v => this.right = v);
      this._hold(document.getElementById("pedal-gas"), v => this.gas = v);
      this._hold(document.getElementById("pedal-brake"), v => this.brake = v);
      this._hold(document.getElementById("pedal-boost"), v => this.boost = v);
    }
    reset() {
      this.left = this.right = this.gas = this.brake = this.boost = false;
    }
  }

  /* ----------------------------------------------------------
   *  Road - builds the looping track + projects/renders it
   * -------------------------------------------------------- */
  class Road {
    constructor() {
      this.segments = [];
      this.trackLength = 0;
    }
    segAt(z) { return this.segments[Math.floor(z / SEG_LEN) % this.segments.length]; }

    _push(curve, y) {
      const n = this.segments.length;
      const prevY = n === 0 ? 0 : this.segments[n - 1].p2.world.y;
      this.segments.push({
        index: n,
        curve: curve,
        p1: { world: { x: 0, y: prevY, z: n * SEG_LEN }, camera: {}, screen: {} },
        p2: { world: { x: 0, y: y, z: (n + 1) * SEG_LEN }, camera: {}, screen: {} },
        color: Math.floor(n / RUMBLE_LEN) % 2 ? COLORS.DARK : COLORS.LIGHT,
        sprites: [],
        cars: [],
        clip: 0,
        fog: 0
      });
    }
    _ease(a, b, p) { return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5); }

    _addRoad(enter, hold, leave, curve, height) {
      const startY = this.segments.length ? this.segments[this.segments.length - 1].p2.world.y : 0;
      const endY = startY + height * SEG_LEN;
      const total = enter + hold + leave;
      let n;
      for (n = 0; n < enter; n++) this._push(this._ease(0, curve, n / enter), this._ease(startY, endY, n / total));
      for (n = 0; n < hold; n++) this._push(curve, this._ease(startY, endY, (enter + n) / total));
      for (n = 0; n < leave; n++) this._push(this._ease(curve, 0, n / leave), this._ease(startY, endY, (enter + hold + n) / total));
    }

    build() {
      this.segments = [];
      const S = 0, M = 2.4, H = 5.0;          // curve strengths
      const LO = 22, MED = 42, BIG = 70;       // hill heights
      // a varied, looping circuit
      this._addRoad(40, 40, 40, 0, 0);
      this._addRoad(40, 50, 40, M, LO);
      this._addRoad(40, 60, 40, -M, -LO);
      this._addRoad(30, 40, 30, -H, 0);
      this._addRoad(40, 80, 40, 0, MED);
      this._addRoad(40, 50, 40, H, -MED);
      this._addRoad(40, 60, 40, -M, BIG);
      this._addRoad(50, 90, 50, 0, -BIG);
      this._addRoad(30, 40, 30, H, 0);
      this._addRoad(40, 60, 40, -H, LO);
      this._addRoad(40, 70, 40, M, -LO);
      this._addRoad(40, 50, 40, 0, MED);
      this._addRoad(40, 60, 40, -H, -MED);
      this._addRoad(50, 60, 50, M, 0);
      this._addRoad(40, 40, 40, 0, 0);

      // make it a clean loop
      while (this.segments.length % RUMBLE_LEN !== 0) this._push(0, this.segments[this.segments.length - 1].p2.world.y);

      this.trackLength = this.segments.length * SEG_LEN;
      this._decorate();
    }

    _decorate() {
      const segs = this.segments;
      const bb = ["bbDiner", "bbMotel", "bbGas", "bbVegas", "bbCoast"];
      let bbi = 0;
      for (let i = 20; i < segs.length; i++) {
        // roadside scenery alternates palms / cactus
        if (i % 18 === 0) {
          segs[i].sprites.push({ key: (i % 36 === 0) ? "cactus" : "palm", offset: -1.35 });
        }
        if (i % 18 === 9) {
          segs[i].sprites.push({ key: (i % 36 === 9) ? "cactus" : "palm", offset: 1.35 });
        }
        // billboards less frequently, further out
        if (i % 70 === 0) {
          segs[i].sprites.push({ key: bb[bbi % bb.length], offset: -2.0 });
          bbi++;
        }
        if (i % 70 === 35) {
          segs[i].sprites.push({ key: bb[bbi % bb.length], offset: 2.0 });
          bbi++;
        }
      }
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
      this.mountains = this._buildMountains();

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
        best: $("hud-best"), dist: $("hud-dist"), cp: $("hud-cp"), speed: $("hud-speed"),
        flash: $("flash"), controls: $("controls"),
        loadFill: $("loading-fill"),
        sTitle: $("screen-title"), sLoad: $("screen-loading"),
        sCount: $("screen-countdown"), sPause: $("screen-paused"),
        sOver: $("screen-gameover"), sRotate: $("screen-rotate"),
        countNum: $("count-num"),
        titleBest: $("title-best"),
        goScore: $("go-score"), goDist: $("go-dist"), goBest: $("go-best"),
        goNewBest: $("go-newbest"),
        boostBtn: $("pedal-boost"),
        btnMute: $("btn-mute")
      };
    }
    _bindUI() {
      const tap = (el, fn) => {
        if (!el) return;
        el.addEventListener("click", fn);
      };
      this.dom.sTitle.addEventListener("pointerdown", () => this._startRun());
      tap(document.getElementById("btn-again"), () => this._startRun());
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
      this.skyGrad = this._buildSky();
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

    _buildSky() {
      const g = this.ctx.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0.00, "#2a0a4a");
      g.addColorStop(0.30, "#5e1170");
      g.addColorStop(0.46, "#d23b6e");
      g.addColorStop(0.55, "#ff7e3d");
      g.addColorStop(0.62, "#ffd24a");
      return g;
    }
    _buildMountains() {
      // one period of a jagged silhouette, sampled 0..1
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

    /* ---- state machine ---- */
    _setState(s) {
      this.state = s;
      document.body.className = "state-" + s;
      const D = this.dom;
      [D.sTitle, D.sLoad, D.sCount, D.sPause, D.sOver].forEach(e => e.classList.add("hide"));
      D.hud.classList.add("hide");
      D.controls.classList.add("hide");
      if (s === "loading") D.sLoad.classList.remove("hide");
      if (s === "title") { D.sTitle.classList.remove("hide"); this._updateBestUI(); }
      if (s === "countdown") D.sCount.classList.remove("hide");
      if (s === "paused") D.sPause.classList.remove("hide");
      if (s === "gameover") D.sOver.classList.remove("hide");
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
      this.road.build();
      this.position = 0;
      this.playerX = 0;
      this.speed = 0;
      this.traveled = 0;
      this.scoreF = 0;
      this.timeLeft = START_TIME;
      this.checkpoint = 1;
      this.nextCP = CP_DISTANCE;
      this.boostT = 0;
      this.boostCD = 0;
      this.shake = 0;
      this.steerVis = 0;
      this._spawnTraffic();
      this._updateHUD();
    }

    _spawnTraffic() {
      this.cars = [];
      const segs = this.road.segments;
      const n = Math.floor(segs.length / 9);
      const palette = ["car0", "car1", "car2"];
      for (let i = 0; i < n; i++) {
        const seg = Util.randInt(40, segs.length - 1);
        const sp = AssetFactory.sprites[Util.randChoice(palette)];
        const car = {
          offset: (Math.random() * 1.6 - 0.8),
          z: seg * SEG_LEN + Math.random() * SEG_LEN,
          sprite: sp,
          speed: MAX_SPEED * (0.28 + Math.random() * 0.42),
          prevRel: 1,
          counted: false
        };
        car.z = Util.increase(car.z, 0, this.road.trackLength);
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
      if (isBest) {
        this.bestScore = score;
        localStorage.setItem("neonHighwayBest", String(score));
      }
      this.dom.goScore.textContent = score;
      this.dom.goDist.textContent = distM + " m";
      this.dom.goBest.textContent = this.bestScore;
      this.dom.goNewBest.classList.toggle("hide", !isBest);
      this._updateBestUI();
    }

    _flash(msg, color) {
      const f = this.dom.flash;
      f.textContent = msg;
      if (color) f.style.webkitTextStroke = "2px " + color;
      f.classList.remove("hide");
      // restart CSS animation
      f.style.animation = "none";
      // force reflow
      void f.offsetWidth;
      f.style.animation = "";
      clearTimeout(this._flashT);
      this._flashT = setTimeout(() => f.classList.add("hide"), 900);
    }

    /* ---- main loop ---- */
    _frame(t) {
      let dt = (t - this.last) / 1000;
      this.last = t;
      if (dt > 0.05) dt = 0.05;          // clamp big stalls
      if (this.state === "playing") this._update(dt);
      this._render();
      requestAnimationFrame(n => this._frame(n));
    }

    _update(dt) {
      const road = this.road;
      const trackLen = road.trackLength;
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
      const dx = dt * 2.6 * Math.max(0.35, speedPct);
      let steerDir = 0;
      if (this.input.left) { this.playerX -= dx; steerDir = -1; }
      if (this.input.right) { this.playerX += dx; steerDir = 1; }
      this.steerVis += ((steerDir) - this.steerVis) * Math.min(1, dt * 12);
      // centrifugal push on curves
      this.playerX -= dx * speedPct * playerSeg.curve * CENTRIFUGAL;

      // ---- throttle ----
      if (this.boostT > 0) {
        this.speed = Util.accel(this.speed, ACCEL * 1.6, dt);
      } else if (this.input.gas) {
        this.speed = Util.accel(this.speed, ACCEL, dt);
      } else if (this.input.brake) {
        this.speed = Util.accel(this.speed, BRAKING, dt);
      } else {
        this.speed = Util.accel(this.speed, DECEL, dt);
      }
      // off-road penalty
      if ((this.playerX < -1 || this.playerX > 1) && this.speed > OFFROAD_LIMIT) {
        this.speed = Util.accel(this.speed, OFFROAD_DECEL, dt);
      }
      this.playerX = Util.clamp(this.playerX, -2.2, 2.2);
      this.speed = Util.clamp(this.speed, 0, curMax);

      // ---- advance ----
      const adv = dt * this.speed;
      this.position = Util.increase(this.position, adv, trackLen);
      this.traveled += adv;

      // ---- traffic ----
      this._updateCars(dt);
      this._collisions(playerSeg);

      // ---- checkpoint ----
      if (this.traveled >= this.nextCP) {
        this.nextCP += CP_DISTANCE;
        this.checkpoint++;
        this.timeLeft += CP_BONUS_TIME;
        this.scoreF += 1000;
        this.audio.sfx("checkpoint");
        this._flash("CHECKPOINT!", "#19f0ff");
      }

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

      // ---- camera shake decay ----
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 14);

      this.audio.updateEngine(this.speed / MAX_SPEED, this.boostT > 0);
      this._updateHUD();
    }

    _updateCars(dt) {
      const road = this.road, trackLen = road.trackLength;
      for (let i = 0; i < this.cars.length; i++) {
        const car = this.cars[i];
        const oldSeg = road.segAt(car.z);
        // gentle AI: dodge the player when overtaken
        const rel = Util.loopDelta(car.z, this.position, trackLen);
        if (rel > 0 && rel < SEG_LEN * 14) {
          const lateral = car.offset - this.playerX;
          if (Math.abs(lateral) < 0.55) {
            car.offset += (lateral >= 0 ? 1 : -1) * dt * 0.7;
          }
        }
        car.offset = Util.clamp(car.offset, -1.6, 1.6);
        car.z = Util.increase(car.z, dt * car.speed, trackLen);
        const newSeg = road.segAt(car.z);
        if (oldSeg !== newSeg) {
          const k = oldSeg.cars.indexOf(car);
          if (k >= 0) oldSeg.cars.splice(k, 1);
          newSeg.cars.push(car);
        }
        // near-miss detection: player overtakes car (rel sign flips + -> -)
        if (car.prevRel > 0 && rel <= 0 && !car.counted) {
          car.counted = true;
          const gap = Math.abs(car.offset - this.playerX);
          if (gap < 1.1 && gap > 0.42) {
            this.scoreF += 300;
            this.audio.sfx("near");
            this._flash("NEAR MISS +300", "#ffd24a");
          }
        }
        if (rel > SEG_LEN) car.counted = false;   // re-arm for next lap
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
          this.position = Util.increase(car.z, -PLAYER_Z * 1.2, this.road.trackLength);
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
      D.cp.textContent = this.checkpoint;
      D.speed.innerHTML = Math.round(this.speed / 100) + "<small>mph</small>";
    }

    /* ---- rendering ---- */
    _render() {
      const ctx = this.ctx, W = this.W, H = this.H;
      const road = this.road;

      ctx.clearRect(0, 0, W, H);

      // camera shake offset
      let shx = 0, shy = 0;
      if (this.shake > 0) {
        shx = (Math.random() - 0.5) * 16 * this.shake;
        shy = (Math.random() - 0.5) * 12 * this.shake;
      }
      ctx.save();
      ctx.translate(shx, shy);

      // for non-playing states, animate a gentle demo scroll on the title
      const pos = (this.position != null) ? this.position : 0;
      const plX = (this.playerX != null) ? this.playerX : 0;

      const baseSeg = (this.state === "loading" || this.state === "title")
        ? this.road.segments.length ? this.road.segAt(performance.now() * 30) : null
        : road.segAt(pos);

      this._renderBackground(baseSeg);

      if (!road.segments.length || !baseSeg) { ctx.restore(); return; }

      // ---- project + draw road segments ----
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
        const seg = segs[(baseSeg.index + n) % N];
        const looped = seg.index < baseSeg.index;
        seg.fog = Util.exponentialFog(n / DRAW_DIST, FOG_DENSITY);
        seg.clip = maxY;

        Util.project(seg.p1, (plX * ROAD_WIDTH) - x, playerY + CAM_HEIGHT,
          pos - (looped ? road.trackLength : 0), CAM_DEPTH, W, H, ROAD_WIDTH);
        Util.project(seg.p2, (plX * ROAD_WIDTH) - x - ddx, playerY + CAM_HEIGHT,
          pos - (looped ? road.trackLength : 0), CAM_DEPTH, W, H, ROAD_WIDTH);

        x += ddx;
        ddx += seg.curve;

        if (seg.p1.camera.z <= CAM_DEPTH ||
            seg.p2.screen.y >= seg.p1.screen.y ||
            seg.p2.screen.y >= maxY) {
          continue;
        }
        this._renderSegment(seg);
        maxY = seg.p2.screen.y;
        drawn.push(seg);
      }

      // ---- sprites + traffic, far -> near ----
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

      // ---- player car ----
      if (this.state === "playing" || this.state === "countdown" ||
          this.state === "paused") {
        this._renderPlayer();
      }

      ctx.restore();
    }

    _renderBackground(baseSeg) {
      const ctx = this.ctx, W = this.W, H = this.H;
      const horizon = H * 0.52;

      // sky
      ctx.fillStyle = this.skyGrad;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // retro sun with horizontal slits
      const curveOff = baseSeg ? -(baseSeg.curve * 30) : 0;
      const px = (this.playerX != null ? this.playerX : 0);
      const sunX = W / 2 - px * 60 + curveOff;
      const sunY = horizon - H * 0.13;
      const sunR = Math.min(W, H) * 0.16;
      const sg = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sg.addColorStop(0, "#fff27a");
      sg.addColorStop(0.5, "#ff7e3d");
      sg.addColorStop(1, "#ff2e88");
      ctx.save();
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = sg;
      ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
      ctx.fillStyle = "rgba(42,10,74,0.9)";
      for (let i = 0; i < 7; i++) {
        const yy = sunY + i * (sunR * 0.16) + sunR * 0.05;
        ctx.fillRect(sunX - sunR, yy, sunR * 2, Math.max(2, sunR * 0.05 + i));
      }
      ctx.restore();

      // parallax mountains
      const pts = this.mountains;
      const span = pts.length - 1;
      const off = (((this.position || 0) * 0.00006) + (px * 0.03)) % 1;
      const baseY = horizon;
      const mh = H * 0.30;
      ctx.fillStyle = "#3a1466";
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      const steps = 96;
      for (let i = 0; i <= steps; i++) {
        const fx = i / steps;
        const sample = ((fx + off) * span) % span;
        const idx = Math.floor(sample);
        const fr = sample - idx;
        const yv = Util.lerp(pts[idx], pts[(idx + 1) % span], fr);
        ctx.lineTo(fx * W, baseY - yv * mh);
      }
      ctx.lineTo(W, baseY);
      ctx.closePath();
      ctx.fill();

      // closer, darker ridge
      const off2 = ((((this.position || 0) * 0.00014) + px * 0.06) % 1);
      ctx.fillStyle = "#270e4a";
      ctx.beginPath();
      ctx.moveTo(0, baseY + 4);
      for (let i = 0; i <= steps; i++) {
        const fx = i / steps;
        const sample = ((fx + off2) * span + 12) % span;
        const idx = Math.floor(sample);
        const fr = sample - idx;
        const yv = Util.lerp(pts[idx], pts[(idx + 1) % span], fr);
        ctx.lineTo(fx * W, baseY - yv * mh * 0.6 + 10);
      }
      ctx.lineTo(W, baseY + 4);
      ctx.closePath();
      ctx.fill();
    }

    _renderSegment(seg) {
      const ctx = this.ctx, W = this.W;
      const p1 = seg.p1.screen, p2 = seg.p2.screen;
      const fog = seg.fog;
      const col = seg.color;

      const grass = Util.mix(COLORS.FOG, col.grass, fog);
      const rumble = Util.mix(COLORS.FOG, col.rumble, fog);
      const road = Util.mix(COLORS.FOG, col.road, fog);
      const lane = Util.mix(COLORS.FOG, col.lane, fog);

      // grass band
      ctx.fillStyle = grass;
      ctx.fillRect(0, p2.y, W, p1.y - p2.y);

      const r1 = p1.w / 3, r2 = p2.w / 3;
      const l1 = p1.w / 18, l2 = p2.w / 18;

      // rumble strips
      this._poly(p1.x - p1.w - r1, p1.y, p1.x - p1.w, p1.y,
                 p2.x - p2.w, p2.y, p2.x - p2.w - r2, p2.y, rumble);
      this._poly(p1.x + p1.w + r1, p1.y, p1.x + p1.w, p1.y,
                 p2.x + p2.w, p2.y, p2.x + p2.w + r2, p2.y, rumble);

      // road
      this._poly(p1.x - p1.w, p1.y, p1.x + p1.w, p1.y,
                 p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, road);

      // lane markers (only on light blocks)
      if (col === COLORS.LIGHT) {
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

      // ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.38)";
      ctx.beginPath();
      ctx.ellipse(0, destH * 0.46, destW * 0.5, destH * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();

      // boost flames
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
    // a tap anywhere unlocks audio on iOS Safari
    const unlock = () => {
      window.__nh && window.__nh.audio.resume();
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    window.__nh = new Game();
  });
})();
