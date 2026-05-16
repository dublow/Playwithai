# STAR REQUIEM — Design & Development Notes

How to build a *beautiful, playable* shoot 'em up with a real intro,
upgrades, a story and an ending. This documents the decisions behind
`game.js` so the game can be tuned and extended confidently.

---

## 1. Design pillars

1. **Readability over density.** Bullets are large, bright, additive-blended
   orbs on a dark field. The player must always be able to read the
   bullet pattern. We use *moderate* bullet counts, not bullet-hell soup —
   it stays fair on a phone screen.
2. **A fair, tiny hitbox.** The ship sprite is large for visual punch, but
   the real collision radius is ~5px, drawn as the bright pink/white core
   dot. Players learn to trust the dot and thread bullets. This single
   decision is what makes a shmup feel skilful instead of unfair.
3. **Juice sells the fantasy.** Screen shake, white flash, particle bursts,
   muzzle cadence, parallax starfield, nebula drift, engine flicker, hit
   flashes, floating score, and a CRT vignette. Every impact is felt.
4. **Escalation with rhythm.** Waves arrive in readable formations with
   gaps to breathe, difficulty ramps per stage, and each stage ends with a
   telegraphed boss. Tension → release → bigger tension.
5. **A real arc.** Intro cinematic → 3 stages → upgrade bay between them →
   mid-bosses → a 3-phase final boss → ending cinematic + score. The run
   *means* something.

## 2. Architecture

Single file, no dependencies, `<canvas>` only.

- **Virtual resolution.** The world is a fixed `540×960` portrait field.
  `resize()` computes a uniform `scale` + letterbox `offX/offY` so it fills
  any device (phone/desktop) without distortion; the starfield is drawn in
  *screen* space behind the field so the letterbox isn't dead black.
- **State machine.** `game.state ∈ {title, story, play, shop, win,
  gameover}`. Only `play` simulates entities; the rest are HTML overlay
  panels (reliable taps on mobile, crisp text). `setState()` /
  `startStory()` / `showShop()` drive transitions.
- **Fixed-ish timestep.** `requestAnimationFrame`, `dt` clamped to 50ms so
  tab-switches can't tunnel bullets through the ship.
- **Entities are plain arrays** (`pBullets, enemies, eBullets, pickups,
  parts, floats`) with reverse-iteration + splice, and hard caps
  (`eBullets` ≤ 460, `parts` ≤ 320) to bound mobile cost.
- **Stages are data.** `STAGES[]` is a timeline: `events:[{t, fn}]`. When
  the script is exhausted and the field is clear, a `WARNING` telegraph
  plays and the boss spawns. Boss death sets `stageCleared`.

> **Gotcha worth knowing:** anything that wipes a live array (bomb /
> death clears `eBullets.length = 0`) can be called *from inside* that
> array's update loop. Reverse loops must `break` when the current element
> is `undefined`. This class of bug is invisible until the death path runs
> — always test death/respawn, not just the happy path.

## 3. Tuning tables (where to balance)

| Thing            | Constant / location              | Notes |
|------------------|----------------------------------|-------|
| Player hitbox    | `player.r` (5)                   | Smaller = fairer/harder to die |
| Move speed       | `360 + (speed-1)*95` in `update` | Engine Boost upgrade |
| Fire cadence     | `0.22 - (fireRate-1)*0.032`      | Fire Rate upgrade |
| Weapon shapes    | `fireWeapon()` by `up.power` 1–5 | Damage + bullet count |
| Enemy stats      | `ENEMY{}`                        | hp / r / score / core / speed |
| Enemy patterns   | `updateEnemy()`                  | weaver/turret/bomber fire |
| Boss HP & phases | `mkBoss()` / `updateBoss()`      | tier 1/2/3, phase thresholds |
| Economy          | `ENEMY.core`, boss core awards   | vs. `UPGRADES.cost()` |

Balance loop: cores earned per stage should roughly fund **one or two**
meaningful upgrades, not everything — choice is the fun.

## 4. Extending it

- **New enemy:** add to `ENEMY{}`, add a branch in `updateEnemy()` and a
  shape in `drawEnemy()`, then reference it in a stage `event`.
- **New stage:** push a `STAGES[]` entry (`name/sub/intro/bg/boss/events`).
  Stage flow, shop, and story interludes are automatic.
- **New boss / phase:** extend `mkBoss()` (hp/tier) and add a pattern
  branch in `updateBoss()`. Phases are HP fractions; each swap pauses,
  flashes, shakes, and thins bullets so the change is *readable*.
- **New upgrade:** add to `UPGRADES[]` with `max`, `cost(lvl)`, `desc(lvl)`
  and handle it in `buy()`. The shop UI renders itself.
- **Story:** `INTRO[]`, each stage's `intro[]`, and `ENDING[]` are plain
  text (`\n` = line break). Keep beats short and punchy.

## 5. Mobile & accessibility

- Drag-to-fly with a finger **offset** so the ship isn't hidden under the
  thumb; auto-fire removes a second input; a single big **BOMB** button.
- `viewport-fit=cover` + `env(safe-area-inset-*)` for notches.
- Keyboard parity (arrows/WASD, Space=bomb, Enter=advance) for desktop.
- Audio is procedural WebAudio, unlocked on first gesture (iOS-safe).

## 6. Validation

Developed test-first against a headless harness (stubs DOM/canvas, runs
the real loop). It drives the overlay flow and an aim-bot through all 3
stages, both bosses, the shop, the ending **and** the death/game-over
paths, asserting **zero runtime errors** and state-machine integrity.
The harness is dev-only and not shipped.

---

*STAR REQUIEM — part of the “Play with AI” collection.*
