# 🕹️ Play with AI — Game Arcade

A little arcade of mobile-first browser games. The root `index.html` is the
landing page that lists every game; each game lives in its own folder under
`games/`. Pure HTML5/canvas — no build step, no dependencies.

```
index.html                       # landing page (the games list)
games/
  pocket-city/index.html         # 🏙️ Pocket City  — SimCity-style city builder
  super-run/index.html           # 🍄 Super Run     — Mario-style auto-runner
  star-requiem/index.html        # 🚀 Star Requiem  — neon shoot 'em up
  zelda-like/index.html          # ⚔️ Mini Quest    — Zelda-style adventure
  mega-man/index.html            # 🤖 Bolt Buster   — Mega Man-style platformer
  micro-racers/index.html        # 🏎️ Micro Racers  — Micro Machines-style racer
  faxanadu-like/index.html       # 🌲 Worldtree     — Faxanadu-style action RPG
  temple-pinball/index.html      # 🏺 Temple Raiders — Indiana-style pinball
  royaume/index.html             # 🏰 Royaume       — medieval strategy / idle
.github/workflows/deploy.yml     # builds the site → gh-pages branch
```

To add a game: drop it in `games/<name>/index.html` and add an entry to the
`GAMES` array near the bottom of the root `index.html` — it then appears on
the hub automatically.

## Play it

### Online (via GitHub Actions → GitHub Pages)

The deploy workflow builds the site and pushes it to a `gh-pages` branch
(this avoids the protected `github-pages` *Actions* deployment environment).

1. Push to `main` (or the game branch), or run the workflow manually from
   the **Actions** tab → *Run workflow*. It creates/updates the **`gh-pages`**
   branch.
2. One-time: **Settings → Pages → Build and deployment → Source = "Deploy
   from a branch"**, then select branch **`gh-pages`** / **`/ (root)`** and
   save.
3. Open the published URL (shown under **Settings → Pages**) on your phone.
   You'll land on the arcade — tap a game to play. Add it to your home
   screen for a full-screen, app-like experience.

> If Pages still reports an environment protection error, add `gh-pages`
> under **Settings → Environments → `github-pages` → Deployment branches and
> tags**, then re-run.

### Locally

Serve the folder so the hub can link into the game folders:

```
python3 -m http.server 8080   # then visit http://localhost:8080
```

## Games

### 🏙️ Pocket City — `games/pocket-city/`

A SimCity-style city builder, redesigned for touch.

- **Pick a tool** from the bottom toolbar, then **drag on the map** to build.
- **✋ button** toggles pan mode; **two-finger drag** pans, **pinch** zooms,
  **🎯** recenters the view.
- Lay **roads**, then zone **🏠 Residential**, **🏬 Commercial** and
  **🏭 Industrial**. Zones only develop when they're next to a road **and**
  powered.
- Build a **⚡ Power Plant** before your city outgrows its grid — brownouts
  cause decline and unhappy citizens.
- Watch the **R / C / I demand bars**; **🌳 Parks** raise approval; keep
  industry away from homes. Taxes fund upkeep — don't go broke.
- Progress autosaves to your browser (`localStorage`); use the **☰ menu** to
  continue or start fresh. Adjust speed with **⏸ / ▶ / ▶▶**.

### 🍄 Super Run — `games/super-run/`

A Mario-style **one-tap auto-runner**. Mario runs forward automatically; the
only control is jump.

- **Touch:** tap *anywhere* to jump. **Desktop:** click, or `Space` / `↑` / `W`.
- Time jumps to clear pits and stomp enemies from above, grab coin trails and
  reach the flag. 3 lives across 2 levels.

### 🚀 Star Requiem — `games/star-requiem/`

A neon **shoot 'em up** with an intro, an upgrade bay, story beats and an
ending — 3 stages and a 3-phase final boss.

- **Drag to fly**, fire is automatic, **tap to bomb**. See
  [`games/star-requiem/DESIGN.md`](games/star-requiem/DESIGN.md) for design
  notes.

### ⚔️ Mini Quest — `games/zelda-like/`

A Zelda-style top-down action adventure across a 6-room overworld.

- **Touch:** left joystick to move · **A** swings the sword.
  **Desktop:** arrows / WASD to move, `Space` or `J` to attack.
- Slash bushes and monsters (octoroks & bats) for rupees, mind the
  hearts — contact costs health, with brief invulnerability after a hit.
- Find the hidden **key**, open the **locked door**, and grab the
  **Triforce** to win.

### 🤖 Bolt Buster — `games/mega-man/`

A Mega Man-style action platformer through a factory stage with a boss.

- **Touch:** left joystick to move · **A** jump (tap height-variable) ·
  **B** fire — *hold B* to charge a stronger Mega shot.
  **Desktop:** ←/→ move, ↑/Space jump,
  J/X fire.
- Dodge spikes (instant death), pits, turrets and hard-hat enemies;
  checkpoints respawn you on death (3 lives).
- Survive to the arena and drain **Bolt Man's** health bar to win.

### 🏎️ Micro Racers — `games/micro-racers/`

A Micro Machines-style **top-down toy racer** on one twisty circuit.

- **Touch:** left joystick to steer · **A** gas · **B** brake (brake to a
  stop also reverses). **Desktop:** ←/→ steer, ↑/W gas, ↓/S brake.
- Race **3 laps** against **3 AI rivals** — stay on the tarmac (grass kills
  your speed), clip the apexes and bump cleanly.
- Live **lap counter, position and a minimap**; finish first across the
  chequered line to take the trophy.

### 🌲 Worldtree — `games/faxanadu-like/`

A Faxanadu-style **action RPG platformer** up the poisoned world tree.

- **Touch:** left joystick to move · **A** jump · **B** sword · **C** ✦
  magic bolt (costs MP). **Desktop:** ←/→ move, ↑/Space jump,
  J attack, K magic.
- Slay bugs, bats and knights for **gold**; banked gold raises your
  **title** (Pilgrim → Aleph → … → He), boosting max HP.
- Visit the **Eolis shop** to buy potions, elixirs, sword/armour upgrades
  and the **Mantra Key**; the key shatters the sealed door.
- 3 lives, checkpoints (death costs half your gold); reach the root and
  defeat the **Evil One** to save the tree.

### 🏺 Temple Raiders — `games/temple-pinball/`

A 1990s **Indiana-Jones-style pinball machine** with a dot-matrix display
and CRT scanline look.

- **Touch:** tap/hold the **left half** of the screen for the left flipper,
  the **right half** for the right flipper. **Desktop:** `A` / `←` and
  `D` / `→`.
- **Launch:** hold the **LAUNCH** button (or `Space`) to charge the
  plunger, release to fire the ball.
- Hit the **pop bumpers** and **slingshots** for points; knock down the
  **I-D-O-L** drop-target bank to raise your **multiplier** and light the
  **left orbit** — shoot it for the **Golden Idol jackpot**.
- 3 balls, a 7-second ball-save after each launch, and a saved high score.

### 🏰 Royaume — `games/royaume/`

A simple, addictive **medieval strategy & idle-management** game (vanilla
HTML/CSS/JS) in a dark fantasy theme.

- **Harvest** wood, stone, food and gold by hand, then build six
  **buildings** (lumberjack, farm, mine, market, barracks, castle) that
  auto-produce — each with progressive cost scaling.
- **Recruit** peasants, archers and knights to grow your military power,
  then hit **Attack**: a simple auto-resolved combat against scaling
  enemies, with loot, XP and casualties.
- Research a **4-node tech tree** (axes, agriculture, armour, trade) for
  permanent bonuses.
- A guided **objective system** always points to the next goal; reward
  toasts, an event log, **localStorage autosave**, reset, and **offline
  progression** (50% efficiency, capped at 8h).

Enjoy the arcade!
