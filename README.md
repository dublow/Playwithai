# 🏙️ Pocket City

A SimCity-style city builder, redesigned for mobile and playable straight
from your phone's browser. Pure HTML5 canvas — no build step, no
dependencies, one file.

## Play it

### Online (via GitHub Actions → GitHub Pages)

1. In the repo: **Settings → Pages → Build and deployment → Source =
   "GitHub Actions"**.
2. The **Deploy Pocket City to GitHub Pages** workflow runs automatically on
   every push to the game branch (or trigger it manually from the **Actions**
   tab → *Run workflow*).
3. Open the URL printed at the end of the workflow run on your phone and
   add it to your home screen for a full-screen, app-like experience.

### Locally

Just open `index.html` in any browser, or serve the folder:

```
python3 -m http.server 8080   # then visit http://localhost:8080
```

## How to play

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

Enjoy building your pocket-sized metropolis!
