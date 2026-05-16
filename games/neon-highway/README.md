# Neon Highway USA

A retro, pseudo-3D arcade racer in the spirit of early-90s American
cabinet racing games — neon sunset, palms, billboards, screaming
synth engine and a relentless countdown clock. **100% original**:
every car, palm, cactus, billboard, mountain and sound is generated
in code (inline SVG → `Image`, Web Audio synthesis). No external
assets, no copyrighted content, no frameworks, no dependencies.

## Run it locally

It is pure HTML/CSS/JS — just open the file:

```
games/neon-highway/index.html
```

Double-click `index.html`, or from the repo root start any static
server and browse to it, e.g.:

```
python3 -m http.server 8000
# then open http://localhost:8000/games/neon-highway/index.html
```

It is also linked from the main hub (`index.html` at the repo root).

> Tip: on iPhone, add it to the Home Screen and launch it for a
> full-screen, status-bar-free experience. Hold the phone in
> **landscape** — a "Tourne ton iPhone" overlay appears in portrait.

## Controls

**Touch (iPhone, landscape):**

- Left third of the screen — steer left
- Right third of the screen — steer right
- **GAS** (bottom-right) — accelerate
- **BRAKE** (bottom-left) — brake
- **NITRO** (above gas) — short boost (has a cooldown)
- Top-right: mute / pause

**Keyboard (desktop testing):**

- Arrow Left / Right (or A / D) — steer
- Arrow Up (or W) — accelerate
- Arrow Down (or S) — brake
- Space — nitro boost

## Gameplay

- You start with **45 seconds**. Every **checkpoint** adds time.
- Score climbs with distance and speed, with bonuses for
  checkpoints and for **near-misses** (shaving past traffic).
- Hitting traffic costs you speed and shakes the camera.
- Run the clock out → **Game Over**. Best score is saved locally.
- "Race Again" restarts instantly — no reload.

## Tech notes

- **Rendering:** Canvas 2D, classic Z-segment road projection
  (pinhole camera) for curves, hills and the arcade depth rush.
  Rendering is `devicePixelRatio`-aware for a crisp image and
  resizes cleanly; it auto-pauses when the tab loses focus.
- **Art:** an `AssetFactory` builds SVG strings once at boot and
  rasterises them to `Image` objects; the sky, retro sun and
  parallax mountains are drawn procedurally on the canvas.
- **Audio:** an `AudioManager` synthesises the engine drone and all
  SFX (start, checkpoint, crash, boost, near-miss, game over) with
  the Web Audio API. Audio only starts after a user tap (iOS Safari
  policy) and there is a mute toggle.
- **Architecture:** `Game`, `Road`, `Input`, `AudioManager`,
  `AssetFactory` and `Util`, driven by a delta-timed
  `requestAnimationFrame` loop with a `loading → title → countdown →
  playing → paused → gameover` state machine.

All trademarks belong to their owners; this game uses none of them —
the name, look, tracks, vehicles and audio are all original.
