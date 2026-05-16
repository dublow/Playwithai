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

- **Touch:** left side of the screen is a floating move stick, right side
  swings the sword. **Desktop:** arrows / WASD to move, `Space` or `J` to
  attack.
- Slash bushes and monsters (octoroks & bats) for rupees, mind the
  hearts — contact costs health, with brief invulnerability after a hit.
- Find the hidden **key**, open the **locked door**, and grab the
  **Triforce** to win.

Enjoy the arcade!
