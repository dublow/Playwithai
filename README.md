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

## 🚀 Enabling GitHub Pages

This is a 100% static site, so the simplest setup needs **no build**:

1. Go to the repo **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Select the branch you want to publish (e.g. `main`) and folder **`/ (root)`**, then **Save**.
4. Wait ~1 minute, then open `https://dublow.github.io/playwithai/`.

Alternatively, a GitHub Actions workflow is included at
[`.github/workflows/pages.yml`](.github/workflows/pages.yml). If you set
**Source → GitHub Actions**, every push to `main` will deploy automatically.

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
