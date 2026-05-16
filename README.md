# Play with AI

A growing collection of AI-built games and apps. **Each project lives in its own folder** and the root page links them all together.

## 🎮 Projects

| Project | Folder | Description |
|---|---|---|
| **Super Run** | [`mario-game/`](mario-game/) | A Mario-style **one-tap auto-runner** for iPhone & desktop — Mario runs by himself, tap to jump, stomp enemies and grab coins across 2 levels. |
| **Star Requiem** | [`shmup/`](shmup/) | A neon **shoot 'em up** with intro, upgrade bay, story & ending — 3 stages and a 3-phase final boss. Drag to fly, auto-fire, tap to bomb. See [`shmup/DESIGN.md`](shmup/DESIGN.md). |
| **Grid Foundry** | [`industry/`](industry/) | A compact **strategic industrial puzzle** (Factorio/Shapez/Slipways-inspired) — production chains on a 3×3→5×5 grid, neighbour bonuses, specializations, 3 end-game tech axes. One screen, no scroll, autosaved. |

## ▶️ Play it

Once GitHub Pages is enabled (see below), the site is live at:

- **Portfolio:** `https://dublow.github.io/playwithai/`
- **Super Run:** `https://dublow.github.io/playwithai/mario-game/`
- **Star Requiem:** `https://dublow.github.io/playwithai/shmup/`

> Tip on iPhone: open the link in Safari, tap **Share → Add to Home Screen** to play full‑screen like a native app.

## 📱 Super Run controls

It's a one-tap auto-runner: **Mario runs forward automatically** and the
landscape scrolls by itself. The only control is **jump**.

- **iPhone / touch:** tap *anywhere* on the screen to jump.
- **Desktop:** click anywhere, or press `Space` / `↑` / `W`.
- Time your jumps to clear pits and stomp enemies from above. Grab the
  coin trails and reach the flag. You have 3 lives across 2 levels.

The game is pure HTML5 Canvas — no assets, no dependencies, fully offline-capable.

## 🚀 GitHub Pages (automatic)

The workflow at [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
**enables Pages and deploys automatically** on every push to `main`, `master`,
or any `claude/**` branch — no manual Settings step required. After the push,
check the repo's **Actions** tab for the "Deploy to GitHub Pages" run; the
first run takes 1–2 minutes, then the site is live at
`https://dublow.github.io/playwithai/`.

If the Actions run is ever blocked by org policy, the manual fallback is
**Settings → Pages → Build and deployment → Source: Deploy from a branch**,
pick the branch and folder **`/ (root)`**, then Save.

## 🗂️ Repository layout

```
.
├── index.html            # Portfolio landing page (links every project)
├── mario-game/           # Super Run auto-runner
│   ├── index.html
│   ├── style.css
│   └── game.js
├── shmup/                # Star Requiem shoot 'em up
│   ├── index.html
│   ├── style.css
│   ├── game.js
│   └── DESIGN.md         # design & dev documentation
├── industry/             # Grid Foundry industrial puzzle
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .github/workflows/    # Optional Pages deploy workflow
└── .nojekyll             # Serve files as-is (skip Jekyll)
```

To add a new project later: create a new folder with its own `index.html`,
then add a card linking to it in the root `index.html`.
