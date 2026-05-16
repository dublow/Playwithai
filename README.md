# 🕹️ Play with AI — Game Arcade

A little arcade of mobile-first browser games. The root `index.html` is the
landing page that lists every game; each game lives in its own folder under
`games/`. Pure HTML5/canvas — no build step, no dependencies.

```
index.html                  # landing page (the games list)
games/
  pocket-city/index.html    # 🏙️ Pocket City — SimCity-style city builder
.github/workflows/deploy.yml
```

To add a game: drop it in `games/<name>/index.html` and add an entry to the
`GAMES` array near the bottom of the root `index.html` — it then appears on
the hub automatically.

## Play it

### Online (via GitHub Actions → GitHub Pages)

1. In the repo: **Settings → Pages → Build and deployment → Source =
   "GitHub Actions"**.
2. The deploy workflow runs automatically on every push to the game branch
   (or trigger it manually from the **Actions** tab → *Run workflow*).
3. Open the URL printed at the end of the workflow run on your phone. You'll
   land on the arcade — tap a game to play. Add it to your home screen for a
   full-screen, app-like experience.

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
- Watch the **R / C / I demand bars**: build what your city is asking for.
- **🌳 Parks** raise approval; keep industry away from homes.
- Money comes in monthly from taxes; roads and power cost upkeep. Don't go
  broke.
- Progress autosaves to your browser (`localStorage`); use the **☰ menu** to
  continue or start fresh. Adjust speed with **⏸ / ▶ / ▶▶**.

Enjoy the arcade!
