# Play with AI

A growing collection of AI-built games and apps. **Each project lives in its own folder** and the root page links them all together.

## 🎮 Projects

| Project | Folder | Description |
|---|---|---|
| **Super Run** | [`mario-game/`](mario-game/) | A Mario-style platformer for iPhone & desktop — run, jump, stomp enemies, collect coins across 2 levels. |

## ▶️ Play it

Once GitHub Pages is enabled (see below), the site is live at:

- **Portfolio:** `https://dublow.github.io/playwithai/`
- **Super Run:** `https://dublow.github.io/playwithai/mario-game/`

> Tip on iPhone: open the link in Safari, tap **Share → Add to Home Screen** to play full‑screen like a native app.

## 📱 Super Run controls

- **iPhone / touch:** on-screen ◀ ▶ buttons to move, **JUMP** button to jump (hold for a higher jump).
- **Desktop:** Arrow keys or `A`/`D` to move, `Space` / `↑` / `W` to jump.
- Stomp enemies from above, grab coins, hit `?` blocks, and reach the flag. You have 3 lives.

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
├── mario-game/           # Super Run platformer
│   ├── index.html
│   ├── style.css
│   └── game.js
├── .github/workflows/    # Optional Pages deploy workflow
└── .nojekyll             # Serve files as-is (skip Jekyll)
```

To add a new project later: create a new folder with its own `index.html`,
then add a card linking to it in the root `index.html`.
