# Grid Foundry — Workers & Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les ouvriers passifs par deux types actifs (Bâtisseur + Équipe), ajouter un système d'upgrade à 3 niveaux par bâtiment, supprimer les adjacences, et valider le tout par simulation avant de toucher au jeu.

**Architecture:** Phase 1 — simulation (game-data.json + simulate.py) pour trouver les bonnes valeurs numériques. Phase 2 — implémentation dans script.js avec les valeurs validées. Les deux phases partagent les mêmes clés JSON dans game-data.json.

**Tech Stack:** Python 3 (simulation), JavaScript ES6 strict (jeu), JSON (données)

---

## Fichiers impactés

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `games/grid-foundry/game-data.json` | Modifier | Ajouter WORKER_SLOTS, UPGRADE_COSTS, batisseur/equipe, màj Cantine |
| `games/grid-foundry/analysis/simulate.py` | Modifier | Modéliser bâtisseurs, équipe, scaling prod, upgrades |
| `games/grid-foundry/script.js` | Modifier | Supprimer adjacences, implémenter workers + upgrades |
| `games/grid-foundry/style.css` | Modifier | Styles panel workers, boutons crew/upgrade |
| `games/grid-foundry/index.html` | Modifier (mineur) | Ajouter section workers dans le header |

---

## Task 0 — script.js : audit et nettoyage (avant toute implémentation)

**Files:**
- Modify: `games/grid-foundry/script.js`

Cette tâche supprime tout le code devenu inutile avec le nouveau design. À faire en premier pour avoir un fichier propre avant d'ajouter les nouvelles mécaniques.

### 0A — Supprimer les constantes adjacence et le bloc ADJACENCY/CHAINS

- [ ] **Step 1 : Supprimer les caps d'adjacence**

Supprimer la ligne :
```js
const CAP_SINGLE = 25, CAP_POS = 50, CAP_NEG = 40, CAP_CONS = 40;
```

- [ ] **Step 2 : Supprimer ADJACENCY**

Supprimer le bloc entier `const ADJACENCY = { ... };` (lignes ~148–274 dans la version actuelle). Il commence par `const ADJACENCY = {` et se termine par `};` suivi de `/* Centre-ville / Hub...*/`.

- [ ] **Step 3 : Supprimer CHAINS**

Supprimer le bloc entier `const CHAINS = [ ... ];` (lignes ~279–285).

### 0B — Supprimer le moteur d'adjacence

- [ ] **Step 4 : Supprimer computeBonuses()**

Supprimer la fonction `computeBonuses(list)` complète (~lignes 469–549). Elle commence par `function computeBonuses(list){` et se termine par `}`.

- [ ] **Step 5 : Supprimer prodMult() et consMult()**

Supprimer les deux fonctions (~lignes 551–559) :
```js
function prodMult(bonus,res){ ... }
function consMult(bonus,res){ ... }
```

### 0C — Supprimer la feature de déplacement

- [ ] **Step 6 : Supprimer les fonctions move**

Supprimer dans l'ordre (chacune est un bloc `function ... { ... }`) :
- `primaryRes(type)` (1 ligne)
- `multMap(list)` (~7 lignes)
- `baseList()` (1 ligne)
- `listWithMoverAt(r,c)` (3 lignes)
- `previewMove(r,c)` (~12 lignes)
- `startMove(b)` (~6 lignes)
- `cancelMove()` (1 ligne)
- `doMove(r,c)` (~8 lignes)
- `renderMovePreview(r,c)` (~35 lignes)

- [ ] **Step 7 : Retirer UI.move de l'objet UI**

```js
// AVANT
const UI = {sheet:null, selected:null, inspect:null, cell:null, specPrompted:false, move:null};
// APRÈS
const UI = {sheet:null, selected:null, inspect:null, cell:null, specPrompted:false};
```

- [ ] **Step 8 : Nettoyer bind() — long-press et handlers move**

Dans `bind()`, supprimer :
- Les 4 lignes de variables long-press : `let lpT=null, lpXY=null, suppress=false;` et `const clearLP=...`
- `grid.addEventListener("contextmenu",...)` (preventDefault pour long-press)
- `grid.addEventListener("pointerdown",...)` (déclencheur long-press)
- `grid.addEventListener("pointermove",...)` (détection mouvement)
- `["pointerup","pointercancel","pointerleave"].forEach(...)` (clearLP)
- Dans le handler `grid.addEventListener("click",...)`, supprimer le bloc `if(suppress){...}` et le bloc `if(UI.move){...}` (3 branches)
- Dans le handler `$("#sheet").addEventListener("click",...)`, supprimer :
  - `if(e.target.closest('[data-act="domove"]')){...}` (handler doMove)
  - `if(e.target.closest('[data-act="cancelmove"]') || ...){...}` (handler cancelMove)
  - `if(e.target.closest("#moveBtn")){...}` (handler startMove)
- Dans `resetGame()`, supprimer `UI.move=null;`

### 0D — Nettoyer renderGrid()

- [ ] **Step 9 : Supprimer BMAP, MV, mtag, losetag dans renderGrid()**

Dans `renderGrid()`, supprimer ou remplacer :

```js
// Supprimer ces lignes :
const BMAP=computeBonuses(S.buildings.map(b=>({id:b.id,type:b.type,r:b.r,c:b.c})));
let MV=null;
if(UI.move){ ... }  // bloc complet MV

// Dans la boucle des cellules remplies, supprimer :
let m=1;
if(d.produce){
  const k=Object.keys(d.produce)[0];
  m=prodMult(BMAP[b.id],k)*specMult(k)*(b._eff||1);
}
// et supprimer :
if(b.id===UI.move.id) cls.push("moving");
else if(MV.baseM[b.id]!=null && ...) { cls.push("losing"); ... }
let losetag="";
// et supprimer mtag :
let mtag="";
if(d.produce && !b.paused){ ... }
// et remplacer dans le html :
${mtag}${losetag}
// par rien pour l'instant (crew% ajouté en Task 9)

// Dans les cellules vides, supprimer le bloc else if(MV) :
} else if(MV){
  ...
  html+=`<div class="cell empty drop" data-c="${key}">${dtag}</div>`;
}
```

- [ ] **Step 10 : Commit nettoyage**

```bash
git add games/grid-foundry/script.js
git commit -m "refactor: remove adjacency engine, move feature, dead code (pre-workers redesign)"
```

### 0E — Mettre à jour les références à ouvrier et sections adjacence dans l'UI

- [ ] **Step 11 : Mettre à jour SPECS.bio**

```js
// AVANT
bio: {name:"Axe Bio / Organisme", icon:"biotech",
  mods:{nourriture:1.20,ouvrier:1.20,biomasse:1.15,charbon:0.90},
  txt:[["nourriture",20],["ouvrier",20],["biomasse",15],["charbon",-10]]},
// APRÈS
bio: {name:"Axe Bio / Organisme", icon:"biotech",
  mods:{nourriture:1.20,equipe:1.20,biomasse:1.15,charbon:0.90},
  txt:[["nourriture",20],["equipe",20],["biomasse",15],["charbon",-10]]},
```

- [ ] **Step 12 : Mettre à jour l'objectif "Produire des ouvriers" dans OBJ_COMMON**

```js
// AVANT
{ic:"engineering", t:"Produire des ouvriers", f:s=>s.total.ouvrier>=10, g:s=>`${fmt(s.total.ouvrier||0)}/10`},
// APRÈS
{ic:"construction", t:"Former des bâtisseurs", f:s=>(s.workers?.batisseurs||0)+(s.total?.batisseur||0)>=10,
  g:s=>`${fmt((s.workers?.batisseurs||0)+(s.total?.batisseur||0))}/10`},
```

- [ ] **Step 13 : Mettre à jour expandReady() — ouvrier → batisseur**

```js
// Dans expandReady(), la vérification de EXPAND[4].need.produced
// contient ouvrier:10 dans game-data.json — sera mis à jour en Task 1 Step 5.
// Aucun changement nécessaire dans expandReady() lui-même car il lit
// dynamiquement e.need.produced depuis EXPAND.
```

- [ ] **Step 14 : Mettre à jour renderInspect() — retirer adjacence, eff, prodMult**

Remplacer dans `renderInspect(b)` :
```js
// Supprimer ces lignes :
const bonus=computeBonuses(S.buildings.map(x=>({id:x.id,type:x.type,r:x.r,c:x.c})));
const bo=bonus[b.id];
const eff=b._eff||1;

// Remplacer le bloc production par (sans adjacence) :
if(d.produce) for(const k in d.produce){
  const pf = prodFactor(b);  // défini en Task 6
  h+=`<div class="kv"><span>Production ${rname(k)}</span>
    <b class="pos">${(d.produce[k]*pf*RATE).toFixed(2)}/s (${Math.round(pf*100)}% équipe)</b></div>`;
}
if(d.consume) for(const k in d.consume){
  const pf = prodFactor(b);
  h+=`<div class="kv"><span>Conso ${rname(k)}</span>
    <b class="neg">-${(d.consume[k]*pf*RATE).toFixed(2)}/s</b></div>`;
}

// Supprimer entièrement la section "Voisinage" :
const rules=ADJACENCY[b.type]||[];
if(rules.length){ ... }

// Supprimer le bouton "Déplacer" et le tooltip :
<button class="btn" id="moveBtn">...</button>
<p class="empty-note" ...>Astuce : appui long...</p>
```

- [ ] **Step 15 : Mettre à jour renderBuildDetail() — retirer adjacence et chaînes**

```js
// Supprimer entièrement :
const rules=ADJACENCY[type]||[];
if(rules.length){ h+=`<div class="sec-title">Voisinage possible</div>...`; }

const chs=CHAINS.filter(c=>c.mid===type||c.a===type||c.c===type);
if(chs.length){ h+=`<div class="sec-title">Chaînes</div>...`; }
```

- [ ] **Step 16 : Mettre à jour destroyBuilding() — rembourser l'équipe**

```js
function destroyBuilding(b){
  const def=BUILDINGS[b.type];
  // Rembourser les ressources (50%)
  for(const k in def.cost){
    S.stock[k]=(S.stock[k]||0)+Math.floor(def.cost[k]*0.5);
  }
  // Rembourser l'équipe affectée dans le pool
  if(b.crew && b.crew > 0){
    S.workers.equipe = (S.workers.equipe||0) + b.crew;
  }
  S.buildings=S.buildings.filter(x=>x.id!==b.id);
  log("Démoli : "+def.name+" (remboursement 50%)", "warn");
  UI.inspect=null; checkObjectives(false); render();
}
```

- [ ] **Step 17 : Commit nettoyage UI**

```bash
git add games/grid-foundry/script.js
git commit -m "refactor: update UI refs — remove ouvrier, adjacency sections, move button"
```

---

## Task 1 — game-data.json : modèle de données workers + upgrades

**Files:**
- Modify: `games/grid-foundry/game-data.json`

- [ ] **Step 1 : Ajouter WORKER_SLOTS et UPGRADE_COSTS globaux**

Ajouter après la clé `"EFF"` dans game-data.json :

```json
"WORKER_SLOTS": {
  "t1":    { "n1": [1,2], "n2": [2,4], "n3": [3,6]   },
  "t2":    { "n1": [2,4], "n2": [4,6], "n3": [6,8]   },
  "t3":    { "n1": [3,6], "n2": [6,9], "n3": [9,12]  },
  "civic": { "n1": [5,10],"n2": [10,15],"n3": [15,20] }
},
"BUILDER_INTERVAL": 4,
"CREW_INTERVAL": 12
```

`BUILDER_INTERVAL` = ticks entre deux bâtisseurs produits par une Cantine (4 ticks = 10s réelles à RATE=0.4, 1 tick = 2.5s).  
`CREW_INTERVAL` = ticks entre deux équipiers (12 ticks = 30s).

- [ ] **Step 2 : Ajouter batisseur et equipe comme ressources**

Dans `"RESOURCES"`, après `"ouvrier"` :

```json
"batisseur": {
  "name": "Bâtisseur",
  "icon": "construction",
  "cls": "t1"
},
"equipe": {
  "name": "Équipe",
  "icon": "groups",
  "cls": "t1"
}
```

`ouvrier` reste dans RESOURCES pour la rétrocompatibilité des objectifs (il sera retiré des flux de production).

- [ ] **Step 3 : Mettre à jour la Cantine**

Remplacer la Cantine dans `"BUILDINGS"` :

```json
"cantine": {
  "name": "Cantine",
  "icon": "restaurant",
  "tier": 1,
  "tag": "t1",
  "desc": "Nourrit la colonie. Forme des bâtisseurs (rapide) et de l'équipe (lent).",
  "cost": { "bois": 15, "pierre": 10 },
  "consume": { "nourriture": 2, "eau": 1 },
  "produce": { "batisseur": 0.25, "equipe": 0.083 }
}
```

`batisseur: 0.25` = 1 bâtisseur tous les 4 ticks. `equipe: 0.083` ≈ 1 équipier tous les 12 ticks. Ces fractions s'accumulent dans le stock et produisent des unités entières.

- [ ] **Step 3b : Ajouter produce aux bâtiments civiques**

Dans `"BUILDINGS"`, ajouter une clé `"produce"` à `centreville` et `hub` :

```json
"centreville": {
  "name": "Centre-ville",
  "icon": "location_city",
  "tier": 1,
  "tag": "civic",
  "desc": "Cœur de la colonie. Ouvre l'Ère Industrielle et l'expansion 4×4. Génère de l'équipe.",
  "cost": { "bois": 50, "pierre": 40, "brique": 20 },
  "produce": { "equipe": 0.033 }
},
"hub": {
  "name": "Hub industriel",
  "icon": "hub",
  "tier": 2,
  "tag": "civic",
  "desc": "Ouvre l'Ère Avancée et l'expansion 5×5. Génère de l'équipe plus rapidement.",
  "cost": { "metal": 40, "outil": 25, "energie": 30, "brique": 20 },
  "produce": { "equipe": 0.05 }
}
```

Note : `equipe: 0.033` ≈ 1 équipier/30s, `equipe: 0.05` ≈ 1/20s. Inférieurs à la Cantine (0.083) — supplément, pas substitut. Le coût `ouvrier` est remplacé par `batisseur` implicitement (la Cantine produit des batisseurs, le Centre-ville en coûte un à la construction via `placeBuilding()`).

- [ ] **Step 4 : Ajouter les coûts d'upgrade par bâtiment**

Ajouter une clé `"upgrades"` dans chaque bâtiment. Exemples représentatifs — appliquer le même patron à tous :

```json
"scierie": {
  "upgrades": [
    { "level": 2, "cost": { "bois": 30, "pierre": 20, "batisseur": 1 } },
    { "level": 3, "cost": { "bois": 60, "outil": 10, "batisseur": 2 } }
  ]
},
"cantine": {
  "upgrades": [
    { "level": 2, "cost": { "nourriture": 40, "eau": 20, "batisseur": 1 } },
    { "level": 3, "cost": { "nourriture": 80, "brique": 20, "batisseur": 2 } }
  ]
},
"forge": {
  "upgrades": [
    { "level": 2, "cost": { "metal": 40, "charbon": 20, "batisseur": 1 } },
    { "level": 3, "cost": { "metal": 80, "outil": 20, "batisseur": 2 } }
  ]
},
"usine": {
  "upgrades": [
    { "level": 2, "cost": { "metal": 60, "outil": 30, "energie": 20, "batisseur": 2 } },
    { "level": 3, "cost": { "metal": 120, "outil": 60, "energie": 40, "batisseur": 3 } }
  ]
}
```

Patron général par tier :
- T1 N2 : 3× coût de construction en ressources de base + 1 batisseur
- T1 N3 : 6× coût + outil × 10 + 2 batisseurs
- T2 N2 : métal × 40 + ressource principale × 20 + 1 batisseur
- T2 N3 : métal × 80 + outil × 20 + 2 batisseurs
- T3 N2 : métal × 60 + énergie × 20 + outil × 30 + 2 batisseurs
- T3 N3 : métal × 120 + énergie × 40 + outil × 60 + 3 batisseurs

- [ ] **Step 5 : Mettre à jour les coûts d'expansion**

Dans `"EXPAND"`, remplacer `ouvrier` par `batisseur` :

```json
"4": {
  "cost": { "brique": 30, "batisseur": 20, "metal": 10 }
},
"5": {
  "cost": { "brique": 50, "batisseur": 30, "energie": 30, "machine": 20 }
}
```

- [ ] **Step 6 : Commit**

```bash
git add games/grid-foundry/game-data.json
git commit -m "data: add worker slots, upgrade costs, batisseur/equipe resources"
```

---

## Task 2 — simulate.py : modèle worker

**Files:**
- Modify: `games/grid-foundry/analysis/simulate.py`

- [ ] **Step 1 : Ajouter les constantes et helpers workers**

Après les imports et la lecture de DATA, ajouter :

```python
WORKER_SLOTS = DATA["WORKER_SLOTS"]
BUILDER_INTERVAL = DATA["BUILDER_INTERVAL"]   # 4
CREW_INTERVAL    = DATA["CREW_INTERVAL"]       # 12

def slots(tag, level):
    """Retourne (min_crew, optimal_crew) pour un tag et un niveau."""
    return WORKER_SLOTS[tag][f"n{level}"]

def prod_factor(tag, level, crew):
    """Fraction de production [0.0 – 1.0] selon l'équipe affectée."""
    _, optimal = slots(tag, level)
    return min(1.0, crew / optimal) if optimal > 0 else 0.0
```

- [ ] **Step 2 : Remplacer la liste PRODUCERS pour les nouvelles ressources**

```python
PRODUCERS = {
    "bois":              "scierie",
    "pierre":            "carriere",
    "eau":               "puits",
    "nourriture":        "ferme",
    "charbon":           "fourneau",
    "brique":            "briqueterie",
    "batisseur":         "cantine",
    "equipe":            "cantine",
    "metal":             "forge",
    "energie":           "generateur",
    "outil":             "atelier",
    "machine":           "usine",
    "alliage":           "fonderie",
    "circuit":           "circuiterie",
    "calcul":            "labquantique",
    "ordinateur":        "centrecalcul",
    "biomasse":          "bioreacteur",
    "adn":               "labadn",
    "cellule":           "incubateur",
    "organisme":         "chambreevo",
    "conscience":        "nexus",
    "energieStable":     "stabilisateur",
    "plasma":            "reacteurplasma",
    "cristal":           "cristalliseur",
    "antimatiere":       "chambreantimatiere",
    "reacteurStellaire": "reacteurstellaire",
}
```

- [ ] **Step 3 : Réécrire simulate() avec l'état workers**

Remplacer la fonction `simulate()` par :

```python
def simulate(axis, max_ticks=5_000_000):
    build_target = COMMON_BUILDINGS + AXIS_BUILDINGS[axis]

    stock         = defaultdict(float, {"bois": 60, "pierre": 40, "eau": 20})
    total_produced = defaultdict(float)
    # (bldg_id, tag, level, crew_assigned)
    built_instances = []
    type_count    = defaultdict(int)
    bldg_level    = {}   # bldg_index -> level (1-3)
    bldg_crew     = {}   # bldg_index -> crew assigned

    batisseurs    = 0.0  # stock de bâtisseurs disponibles
    equipe_pool   = 0.0  # stock d'équipiers non encore affectés

    grid_capacity = 9
    expanded_4    = False
    expanded_5    = False
    centreville_built = False
    hub_built     = False
    victory_tick  = None

    main_idx   = 0
    extra_queue = []
    blocking_ticks = defaultdict(int)

    # Métriques pour courbes
    crew_demand_history = []
    crew_supply_history = []

    for tick in range(max_ticks):

        # ── Production Cantine → batisseurs + equipe ──────────────────────
        cantines = [(i, bldg_crew.get(i, 0))
                    for i, (bid, *_) in enumerate(built_instances)
                    if bid == "cantine"]
        for i, crew in cantines:
            pf = prod_factor("t1", bldg_level.get(i, 1), crew)
            if pf <= 0:
                continue
            bdef = BUILDINGS["cantine"]
            consume = bdef.get("consume", {})
            can = all(stock[r] >= v / RATE * pf for r, v in consume.items())
            if can:
                for r, v in consume.items():
                    stock[r] -= v / RATE * pf
                batisseurs += bdef["produce"]["batisseur"] / RATE * pf
                equipe_pool += bdef["produce"]["equipe"] / RATE * pf

        # ── Production autres bâtiments ──────────────────────────────────
        for i, (bldg_id, tag, level, _) in enumerate(built_instances):
            if bldg_id == "cantine":
                continue
            bdef = BUILDINGS[bldg_id]
            crew = bldg_crew.get(i, 0)
            pf   = prod_factor(tag, level, crew)
            if pf <= 0:
                continue
            consume = bdef.get("consume", {})
            produce = bdef.get("produce", {})
            if not produce:
                continue
            can = all(stock[r] >= v / RATE * pf for r, v in consume.items())
            if can:
                for r, v in consume.items():
                    stock[r] -= v / RATE * pf
                for r, v in produce.items():
                    gained = v / RATE * pf
                    stock[r] += gained
                    total_produced[r] += gained

        # ── Métriques workers ────────────────────────────────────────────
        demand = sum(slots(t, bldg_level.get(i, 1))[1]
                     for i, (_, t, *__) in enumerate(built_instances))
        supply = int(equipe_pool) + sum(bldg_crew.values())
        crew_demand_history.append(demand)
        crew_supply_history.append(supply)

        # ── Victory ─────────────────────────────────────────────────────
        if total_produced[VICTORY[axis]] >= 1.0:
            victory_tick = tick
            break

        # ── Grid expansion ───────────────────────────────────────────────
        if not expanded_4:
            if (centreville_built
                    and total_produced["bois"] >= 100
                    and total_produced["pierre"] >= 50
                    and total_produced["brique"] >= 20
                    and int(batisseurs) >= 10):
                c = EXPAND["4"]["cost"]
                if all(stock.get(r, 0) >= c[r] for r in c
                       if r not in ("batisseur",)) and batisseurs >= c.get("batisseur", 0):
                    for r, v in c.items():
                        if r == "batisseur":
                            batisseurs -= v
                        else:
                            stock[r] -= v
                    grid_capacity = 16
                    expanded_4 = True

        if not expanded_5:
            if (hub_built
                    and total_produced["metal"] >= 1
                    and total_produced["energie"] >= 1
                    and total_produced["outil"] >= 1):
                c = EXPAND["5"]["cost"]
                if all(stock.get(r, 0) >= c[r] for r in c
                       if r not in ("batisseur",)) and batisseurs >= c.get("batisseur", 0):
                    for r, v in c.items():
                        if r == "batisseur":
                            batisseurs -= v
                        else:
                            stock[r] -= v
                    grid_capacity = 25
                    expanded_5 = True

        # ── Build phase ──────────────────────────────────────────────────
        if len(built_instances) >= grid_capacity:
            continue

        if extra_queue:
            next_bldg = extra_queue[0]
            from_extra = True
        elif main_idx < len(build_target):
            next_bldg = build_target[main_idx]
            from_extra = False
        else:
            continue

        bdef = BUILDINGS[next_bldg]
        cost = {k: v for k, v in bdef.get("cost", {}).items()
                if k not in ("batisseur",)}
        builder_cost = bdef.get("cost", {}).get("batisseur", 1)

        can_build = (all(stock[r] >= cost.get(r, 0) for r in cost)
                     and batisseurs >= builder_cost)

        if can_build:
            for r, v in cost.items():
                stock[r] -= v
            batisseurs -= builder_cost

            i = len(built_instances)
            tag = bdef.get("tag", "t1")
            built_instances.append((next_bldg, tag, 1, 0))
            bldg_level[i] = 1

            # Affecter equipe disponible immédiatement
            _, optimal = slots(tag, 1)
            assigned = min(optimal, int(equipe_pool))
            bldg_crew[i] = assigned
            equipe_pool -= assigned

            type_count[next_bldg] += 1
            if next_bldg == "centreville":
                centreville_built = True
            if next_bldg == "hub":
                hub_built = True
            if from_extra:
                extra_queue.pop(0)
            else:
                main_idx += 1
        else:
            net = net_production_workers(built_instances, bldg_level, bldg_crew)
            blocked_res = max(
                ((r, cost[r] - stock[r]) for r in cost if stock[r] < cost.get(r, 0)),
                key=lambda x: x[1], default=(None, 0),
            )
            if blocked_res[0]:
                blocking_ticks[blocked_res[0]] += 1
                r = blocked_res[0]
                if net.get(r, 0) <= 0 and r in PRODUCERS:
                    producer = PRODUCERS[r]
                    if (producer != next_bldg
                            and type_count.get(producer, 0) < MAX_COPIES
                            and (not extra_queue or extra_queue[0] != producer)):
                        extra_queue.insert(0, producer)

    if victory_tick is None:
        victory_tick = max_ticks

    real_time_min = victory_tick * 2.5 / 60
    top_blocking  = sorted(blocking_ticks.items(), key=lambda x: -x[1])[:3]

    # Métriques finales
    n = len(crew_demand_history) or 1
    avg_demand = sum(crew_demand_history) / n
    avg_supply = sum(crew_supply_history) / n
    crew_ratio = avg_supply / avg_demand if avg_demand > 0 else 1.0

    return {
        "axis":           axis,
        "victory_tick":   victory_tick,
        "real_time_min":  real_time_min,
        "buildings_built": len(built_instances),
        "type_counts":    dict(type_count),
        "top_blocking":   top_blocking,
        "hit_cap":        victory_tick == max_ticks,
        "crew_ratio":     crew_ratio,
        "avg_demand":     avg_demand,
        "avg_supply":     avg_supply,
    }
```

- [ ] **Step 4 : Ajouter net_production_workers()**

Ajouter avant `simulate()` :

```python
def net_production_workers(built_instances, bldg_level, bldg_crew):
    net = defaultdict(float)
    for i, (bldg_id, tag, level, _) in enumerate(built_instances):
        bdef = BUILDINGS[bldg_id]
        crew = bldg_crew.get(i, 0)
        pf   = prod_factor(tag, bldg_level.get(i, 1), crew)
        for r, v in bdef.get("produce", {}).items():
            net[r] += v * pf
        for r, v in bdef.get("consume", {}).items():
            net[r] -= v * pf
    return net
```

- [ ] **Step 5 : Mettre à jour main() pour afficher les métriques workers**

```python
def main():
    results = {}
    for axis in ["metal", "bio", "energie"]:
        print(f"Simulating axis: {axis}...")
        r = simulate(axis)
        results[axis] = r
        status = "CAP HIT" if r["hit_cap"] else f"victory at tick {r['victory_tick']}"
        print(f"  Status        : {status}")
        print(f"  Real time     : {r['real_time_min']:.1f} min")
        print(f"  Buildings     : {r['buildings_built']}")
        print(f"  Crew ratio    : {r['crew_ratio']:.2f}  (objectif ≥ 0.80)")
        print(f"  Avg demand    : {r['avg_demand']:.1f} équipiers")
        print(f"  Top blocking  : {r['top_blocking']}")
        print()

    print("\n=== CRITÈRES D'ÉQUILIBRE ===")
    for axis, r in results.items():
        ok_time  = not r["hit_cap"]
        ok_crew  = 0.75 <= r["crew_ratio"] <= 0.95
        status   = "✓" if (ok_time and ok_crew) else "✗"
        print(f"  {status} {axis:<10}  temps={r['real_time_min']:.0f}min  crew_ratio={r['crew_ratio']:.2f}")
    return results
```

- [ ] **Step 6 : Commit**

```bash
git add games/grid-foundry/analysis/simulate.py
git commit -m "sim: add worker model (batisseur, equipe, crew-scaled production)"
```

---

## Task 3 — Simulation : valider et calibrer les valeurs

**Files:**
- Run: `games/grid-foundry/analysis/simulate.py`
- Adjust: `games/grid-foundry/game-data.json` (BUILDER_INTERVAL, CREW_INTERVAL, upgrade costs)

- [ ] **Step 1 : Lancer la simulation**

```bash
cd games/grid-foundry && python analysis/simulate.py
```

Sortie attendue : 3 lignes de résultats + section critères. Objectifs :
- Aucun axe en "CAP HIT"
- `crew_ratio` entre 0.75 et 0.95 pour chaque axe
- Métal ≤ Bio ≤ Énergie en temps

- [ ] **Step 2 : Si crew_ratio > 0.95 (trop d'équipe)**

Augmenter `CREW_INTERVAL` dans game-data.json (ex: 12 → 15). Relancer.

- [ ] **Step 3 : Si crew_ratio < 0.75 (manque d'équipe)**

Diminuer `CREW_INTERVAL` (ex: 12 → 9). Relancer.

- [ ] **Step 4 : Si un axe est en CAP HIT**

Vérifier `top_blocking` — si `batisseur` bloque : baisser `BUILDER_INTERVAL`. Si `equipe` bloque : baisser `CREW_INTERVAL`.

- [ ] **Step 5 : Commit des valeurs validées**

```bash
git add games/grid-foundry/game-data.json
git commit -m "sim: calibrated BUILDER_INTERVAL and CREW_INTERVAL from simulation"
```

---

## Task 4 — script.js : state et ressources

**Files:**
- Modify: `games/grid-foundry/script.js`

- [ ] **Step 1 : Ajouter batisseur et equipe dans RESOURCES**

Après `ouvrier` dans l'objet `RESOURCES` (ligne ~17) :

```js
batisseur:   {name:"Bâtisseur",   icon:"construction",  cls:"t1"},
equipe:      {name:"Équipe",      icon:"groups",        cls:"t1"},
```

- [ ] **Step 2 : Mettre à jour freshState()**

```js
function freshState(){
  return {
    gridSize:3, tierUnlocked:1, spec:null,
    stock:{bois:60, pierre:40, eau:20}, total:{}, won:false,
    buildings:[], nextOrder:1,
    objIdx:0, axisIdx:0, badges:{},
    logs:[], lastSave:Date.now(), headerOpen:true,
    workers:{ batisseurs:0, equipe:0 },
  };
}
```

- [ ] **Step 3 : Changer la clé de sauvegarde**

```js
const SAVE_KEY = "gridfoundry.v2";
```

Cela force un nouveau jeu propre (ancienne sauvegarde ignorée).

- [ ] **Step 4 : Note sur level et crew**

`level:1` et `crew:0` seront ajoutés dans le push de `placeBuilding()` (script.js:656) lors de la Task 7. Cette étape valide seulement que la structure de state est bien comprise avant d'y toucher.

- [ ] **Step 5 : Commit**

```bash
git add games/grid-foundry/script.js
git commit -m "feat: add workers state and batisseur/equipe resources"
```

---

## Task 5 — script.js : supprimer le moteur d'adjacence

**Files:**
- Modify: `games/grid-foundry/script.js`

- [ ] **Step 1 : Supprimer les constantes d'adjacence**

Supprimer les lignes :
```js
const CAP_SINGLE = 25, CAP_POS = 50, CAP_NEG = 40, CAP_CONS = 40;
```

- [ ] **Step 2 : Supprimer ADJACENCY, CHAINS, et leurs fonctions**

Supprimer entièrement :
- Le bloc `const ADJACENCY = { ... };` (lignes ~148–274)
- Le bloc `const CHAINS = [ ... ];` (lignes ~279–285)
- La fonction `computeBonuses()` (~469–549)
- Les fonctions `prodMult()` et `consMult()` (~551–559)

- [ ] **Step 3 : Supprimer les specs qui référencent ouvrier**

Dans `SPECS`, `bio.mods` contient `ouvrier:1.20`. Remplacer par `equipe:1.20` :

```js
bio: {name:"Axe Bio / Organisme", icon:"biotech",
  mods:{nourriture:1.20, equipe:1.20, biomasse:1.15, charbon:0.90},
  txt:[["nourriture",20],["equipe",20],["biomasse",15],["charbon",-10]]},
```

- [ ] **Step 4 : Mettre à jour tick() — supprimer les appels bonus**

Dans `tick()`, remplacer :
```js
const list=S.buildings.map(b=>({id:b.id,type:b.type,r:b.r,c:b.c}));
const bonus=computeBonuses(list);
```
Par :
```js
// adjacences supprimées
```

Et supprimer tous les arguments `bonus[b.id]` dans les appels à `prodMult` / `consMult`.

- [ ] **Step 5 : Commit**

```bash
git add games/grid-foundry/script.js
git commit -m "refactor: remove adjacency engine (ADJACENCY, CHAINS, computeBonuses)"
```

---

## Task 6 — script.js : tick() avec production scalée par équipe

**Files:**
- Modify: `games/grid-foundry/script.js`

- [ ] **Step 1 : Ajouter la constante WORKER_SLOTS côté JS**

Après `const EFF = [1, 0.92, 0.84, 0.76, 0.68];` :

```js
const WORKER_SLOTS = {
  t1:    {n1:[1,2],  n2:[2,4],  n3:[3,6]  },
  t2:    {n1:[2,4],  n2:[4,6],  n3:[6,8]  },
  t3:    {n1:[3,6],  n2:[6,9],  n3:[9,12] },
  civic: {n1:[5,10], n2:[10,15],n3:[15,20]},
};
function slotKey(b){ return `n${b.level||1}`; }
function optimalCrew(b){
  const tag = BUILDINGS[b.type].tag||"t1";
  return (WORKER_SLOTS[tag]||WORKER_SLOTS.t1)[slotKey(b)][1];
}
function prodFactor(b){
  const opt = optimalCrew(b);
  return opt > 0 ? Math.min(1, (b.crew||0) / opt) : 0;
}
```

- [ ] **Step 2 : Réécrire le cœur de tick()**

Remplacer le bloc de production dans `tick()` par :

```js
NET={}; PROD={}; CONS={}; ACTIVE={};

const seq=[...S.buildings].sort((a,b)=>
  (BUILDINGS[a.type].tier - BUILDINGS[b.type].tier) || (a.order - b.order));

for(const b of seq){
  const def = BUILDINGS[b.type];
  const pf  = prodFactor(b);

  // Cantine : produit batisseurs et equipe proportionnellement à son équipe
  if(b.type === "cantine"){
    const consume = def.consume || {};
    const can = Object.entries(consume).every(([k,v]) => (S.stock[k]||0) >= v * pf * RATE);
    if(can && pf > 0){
      ACTIVE[b.id] = true;
      for(const [k,v] of Object.entries(consume)){
        const amt = v * pf * RATE;
        S.stock[k] -= amt;
        NET[k] = (NET[k]||0) - amt;
        CONS[k] = (CONS[k]||0) + amt;
      }
      // batisseur
      const ba = (def.produce.batisseur||0) * pf * specMult("batisseur") * RATE;
      S.workers.batisseurs = Math.min(999, (S.workers.batisseurs||0) + ba);
      S.total.batisseur = (S.total.batisseur||0) + ba;
      NET.batisseur = (NET.batisseur||0) + ba;
      PROD.batisseur = (PROD.batisseur||0) + ba;
      // equipe
      const eq = (def.produce.equipe||0) * pf * specMult("equipe") * RATE;
      S.workers.equipe = Math.min(999, (S.workers.equipe||0) + eq);
      S.total.equipe = (S.total.equipe||0) + eq;
      NET.equipe = (NET.equipe||0) + eq;
      PROD.equipe = (PROD.equipe||0) + eq;
    } else {
      ACTIVE[b.id] = false;
    }
    b._starve = ACTIVE[b.id] ? 0 : (b._starve||0) + 1;
    continue;
  }

  // Bâtiments normaux : inactifs si crew = 0
  if(pf <= 0){ ACTIVE[b.id] = false; b._starve = (b._starve||0)+1; continue; }

  const consume = def.consume || {};
  const can = Object.entries(consume).every(([k,v]) => (S.stock[k]||0) >= v * pf * RATE);
  if(!can){ ACTIVE[b.id] = false; b._starve = (b._starve||0)+1; continue; }

  ACTIVE[b.id] = true;
  b._starve = 0;
  for(const [k,v] of Object.entries(consume)){
    const amt = v * pf * RATE;
    S.stock[k] -= amt;
    NET[k] = (NET[k]||0) - amt;
    CONS[k] = (CONS[k]||0) + amt;
  }
  if(def.produce){
    for(const [k,v] of Object.entries(def.produce)){
      const amt = v * pf * specMult(k) * b._eff * RATE;
      S.stock[k] = Math.min(1e9, (S.stock[k]||0) + amt);
      S.total[k] = (S.total[k]||0) + amt;
      NET[k] = (NET[k]||0) + amt;
      PROD[k] = (PROD[k]||0) + amt;
    }
  }
}
for(const k in S.stock) if(S.stock[k]<0) S.stock[k]=0;
```

- [ ] **Step 3 : Commit**

```bash
git add games/grid-foundry/script.js
git commit -m "feat: crew-scaled production in tick(), Cantine produces batisseur+equipe"
```

---

## Task 7 — script.js : buildAt() avec coût en bâtisseur

**Files:**
- Modify: `games/grid-foundry/script.js`

- [ ] **Step 1 : Modifier placeBuilding() (script.js:650)**

La fonction `placeBuilding(type,r,c)` appelle `canAfford(def.cost)` puis `pay(def.cost)`. Ajouter la vérification du bâtisseur avant `pay` et la déduction après :

```js
function placeBuilding(type,r,c){
  const def=BUILDINGS[type];
  if(def.tier>S.tierUnlocked){ toast("Palier verrouillé",true); return; }
  if(at(r,c)){ toast("Case occupée",true); return; }
  if(!canAfford(def.cost)){ toast("Ressources insuffisantes",true); return; }
  // nouveau : coût en bâtisseur
  if(Math.floor(S.workers?.batisseurs||0) < 1){ toast("Pas de bâtisseur disponible",true); return; }
  pay(def.cost);
  S.workers.batisseurs -= 1;
  S.buildings.push({id:"b"+(S.nextOrder),type,r,c,paused:false,order:S.nextOrder,level:1,crew:0});
  S.nextOrder++;
  if(def.unlock && S.tierUnlocked<def.unlock){
    S.tierUnlocked=def.unlock;
    log("Nouvelle ère : "+eraName(def.unlock)+" ("+def.name+")","info");
    toast(eraName(def.unlock)+" — votre colonie progresse !");
  }
  log("Construit : "+def.name);
  UI.selected=null; checkObjectives(false); render();
}
```

- [ ] **Step 2 : Mettre à jour canAfford pour l'affichage du bouton**

La fonction `canAfford()` est utilisée pour griser les boutons. Ajouter une version étendue :

```js
function canAffordWithWorker(cost){
  return canAfford(cost) && Math.floor(S.workers?.batisseurs||0) >= 1;
}
```

Remplacer les appels `canAfford(def.cost)` dans le rendu du panneau de construction par `canAffordWithWorker(def.cost)`.

- [ ] **Step 4 : Commit**

```bash
git add games/grid-foundry/script.js
git commit -m "feat: building placement costs 1 batisseur"
```

---

## Task 8 — script.js : système d'upgrade

**Files:**
- Modify: `games/grid-foundry/script.js`

- [ ] **Step 1 : Ajouter la fonction upgradeBuilding()**

```js
function upgradeBuilding(id){
  const b = S.buildings.find(x => x.id === id);
  if(!b) return;
  const def = BUILDINGS[b.type];
  const nextLevel = (b.level||1) + 1;
  if(nextLevel > 3) return;
  const upgrades = def.upgrades || [];
  const upg = upgrades.find(u => u.level === nextLevel);
  if(!upg) return;

  // Vérifier ressources + bâtisseurs
  const cost = {...upg.cost};
  const builderCost = cost.batisseur || 0;
  delete cost.batisseur;
  if(!canAfford(cost) || Math.floor(S.workers.batisseurs) < builderCost){
    toast("Ressources insuffisantes pour l'upgrade", true);
    return;
  }

  pay(cost);
  S.workers.batisseurs -= builderCost;
  b.level = nextLevel;

  // Le crew existant reste affecté ; les nouveaux slots sont vides
  log(`${def.name} amélioré niveau ${nextLevel}`, "good");
  toast(`${def.name} → Niveau ${nextLevel}`);
  render();
}
```

- [ ] **Step 2 : Ajouter le bouton upgrade dans le panneau d'inspection**

Dans la fonction qui génère le HTML du panneau d'inspection (chercher `inspect` ou `sheet`), après les infos du bâtiment, ajouter :

```js
function upgradeHTML(b){
  const def = BUILDINGS[b.type];
  const lvl = b.level || 1;
  if(lvl >= 3) return `<p class="upg-max">Niveau maximum ⭐⭐⭐</p>`;
  const upg = (def.upgrades||[]).find(u => u.level === lvl + 1);
  if(!upg) return "";
  const cost = {...upg.cost};
  const bc   = cost.batisseur || 0;
  delete cost.batisseur;
  const canUp = canAfford(cost) && Math.floor(S.workers.batisseurs) >= bc;
  const costStr = Object.entries(cost).map(([k,v])=>`${rname(k)}: ${v}`).join(", ")
                + (bc ? `, Bâtisseur: ${bc}` : "");
  return `<button class="btn-upgrade${canUp?"":" disabled"}"
    onclick="upgradeBuilding('${b.id}')">
    ⭐ Améliorer → N${lvl+1}<br><small>${costStr}</small>
  </button>`;
}
```

- [ ] **Step 3 : Commit**

```bash
git add games/grid-foundry/script.js
git commit -m "feat: building upgrade system (3 levels, unlocks crew slots)"
```

---

## Task 9 — script.js : interface d'affectation d'équipe

**Files:**
- Modify: `games/grid-foundry/script.js`

- [ ] **Step 1 : Ajouter addCrew() et removeCrew()**

```js
function addCrew(id){
  const b = S.buildings.find(x => x.id === id);
  if(!b) return;
  const opt = optimalCrew(b);
  if((b.crew||0) >= opt){ toast("Slots pleins", true); return; }
  if((S.workers.equipe||0) < 1){ toast("Pas d'équipiers disponibles", true); return; }
  S.workers.equipe -= 1;
  b.crew = (b.crew||0) + 1;
  render();
}

function removeCrew(id){
  const b = S.buildings.find(x => x.id === id);
  if(!b || !b.crew) return;
  b.crew -= 1;
  S.workers.equipe = (S.workers.equipe||0) + 1;
  render();
}
```

- [ ] **Step 2 : Ajouter crewHTML() pour le panneau d'inspection**

```js
function crewHTML(b){
  const opt = optimalCrew(b);
  const cur = b.crew || 0;
  const pct = opt > 0 ? Math.round(cur / opt * 100) : 0;
  const stars = "⭐".repeat(b.level||1);
  return `
    <div class="crew-panel">
      <span class="crew-label">${stars} Équipe : ${cur}/${opt} (${pct}%)</span>
      <div class="crew-bar"><div class="crew-fill" style="width:${pct}%"></div></div>
      <div class="crew-btns">
        <button onclick="removeCrew('${b.id}')">−</button>
        <button onclick="addCrew('${b.id}')">+</button>
      </div>
    </div>`;
}
```

- [ ] **Step 2.5 : Mettre à jour renderGrid() — états visuels des tuiles**

Ajouter avant `renderGrid()` :

```js
function crewStateClass(b){
  if(b.paused) return "s-pause";
  const opt = optimalCrew(b);
  if(opt === 0 || (b.crew||0) === 0) return "s-none";
  const ratio = (b.crew||0) / opt;
  if(ratio >= 1.0) return "s-full";
  if(ratio >= 0.5) return "s-mid";
  return "s-low";
}
```

Dans `renderGrid()`, dans le bloc qui génère le HTML d'une cellule remplie (chercher la div `.cell.filled`), remplacer par :

```js
const sc   = crewStateClass(b);
const lvl  = b.level || 1;
const stars = "★".repeat(lvl);
const opt  = optimalCrew(b);
const cur  = b.crew || 0;
let prodTag = "";
if(def.produce && !b.paused && cur > 0){
  const pf = prodFactor(b);
  const mainRes = Object.keys(def.produce)[0];
  const rate = (def.produce[mainRes] * pf * RATE).toFixed(1);
  prodTag = `<span class="prod-tag">+${rate}/s</span>`;
}
html += `<div class="cell filled ${sc}" data-c="${key}">
  <span class="lvl">${stars}</span>
  <span class="crew-tag">${cur}/${opt}</span>
  <span class="ms bicon">${def.icon}</span>
  <span class="bname">${def.name}</span>
  ${prodTag}
</div>`;
```

- [ ] **Step 3 : Afficher batisseurs et equipe dans le header**

Dans la fonction qui rend le compteur de ressources (chercher où `S.stock` est affiché), ajouter l'affichage des workers :

```js
function workersBarHTML(){
  const ba = Math.floor(S.workers?.batisseurs || 0);
  const eq = Math.floor(S.workers?.equipe || 0);
  const totalCrew = S.buildings.reduce((s,b) => s + (b.crew||0), 0);
  const totalDemand = S.buildings.reduce((s,b) => s + optimalCrew(b), 0);
  return `<div class="workers-bar">
    <span title="Bâtisseurs disponibles">🔨 ${ba}</span>
    <span title="Équipiers libres / affectés / demande totale">👷 ${eq} libre · ${totalCrew}/${totalDemand}</span>
  </div>`;
}
```

- [ ] **Step 4 : Commit**

```bash
git add games/grid-foundry/script.js
git commit -m "feat: crew assignment UI (add/remove crew per building, workers bar)"
```

---

## Task 10 — style.css : styles workers et upgrades

**Files:**
- Modify: `games/grid-foundry/style.css`

- [ ] **Step 1 : Ajouter les styles**

À la fin de style.css :

```css
/* ── Infos tuile : niveau + équipe + production ── */
.cell .lvl      { position:absolute; top:3px; left:4px; font-size:9px; color:var(--gold); font-weight:700; }
.cell .crew-tag { position:absolute; top:3px; right:4px; font-size:9px; color:var(--muted); font-weight:600; font-variant-numeric:tabular-nums; }
.cell .prod-tag { position:absolute; bottom:3px; font-size:9px; font-weight:600; color:var(--good); font-variant-numeric:tabular-nums; }

/* ── États tuile selon remplissage crew ── */
/* 100% — vert */
.cell.s-full { border-color:#2d8a5e; }
.cell.s-full .ms.bicon { color:var(--good); }
.cell.s-full .crew-tag { color:var(--good); }

/* 50–99% — bleu (couleur par défaut) */
.cell.s-mid { border-color:var(--acc2); }
.cell.s-mid .ms.bicon { color:var(--acc2); }

/* 1–49% — orange */
.cell.s-low { border-color:#c07820; }
.cell.s-low .ms.bicon  { color:#ffb74d; }
.cell.s-low .crew-tag  { color:#ffb74d; }
.cell.s-low .prod-tag  { color:#ffb74d; }

/* 0% crew — rouge pulsé (reprend la classe .idle existante) */
.cell.s-none { border-color:rgba(255,93,93,.45); animation:idle 1.6s infinite; }
.cell.s-none .ms.bicon { color:rgba(255,93,93,.6); }
.cell.s-none .crew-tag { color:var(--warn); }
.cell.s-none .prod-tag { display:none; }

/* Pause explicite — désaturé (reprend .paused existant) */
/* .cell.s-pause déjà géré par .cell.paused { filter:grayscale(.7) brightness(.7) } */

/* ── Workers bar ── */
.workers-bar {
  display: flex;
  gap: 16px;
  padding: 6px 12px;
  background: #1a1a2e;
  border-bottom: 1px solid #333;
  font-size: 0.85rem;
  color: #ccc;
}
.workers-bar span { cursor: default; }

/* ── Crew panel ── */
.crew-panel {
  margin: 10px 0;
  padding: 10px;
  background: #111;
  border-radius: 6px;
  border: 1px solid #333;
}
.crew-label { font-size: 0.85rem; color: #aaa; }
.crew-bar {
  height: 6px;
  background: #333;
  border-radius: 3px;
  margin: 6px 0;
  overflow: hidden;
}
.crew-fill {
  height: 100%;
  background: linear-gradient(90deg, #2a7, #4af);
  border-radius: 3px;
  transition: width 0.3s;
}
.crew-btns {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
.crew-btns button {
  padding: 4px 12px;
  border: 1px solid #444;
  background: #222;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}
.crew-btns button:hover { background: #333; }

/* ── Upgrade button ── */
.btn-upgrade {
  display: block;
  width: 100%;
  margin: 8px 0;
  padding: 8px;
  background: #1a3a1a;
  border: 1px solid #3a7a3a;
  color: #8f8;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  font-size: 0.85rem;
}
.btn-upgrade:hover { background: #2a4a2a; }
.btn-upgrade.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
.upg-max {
  color: #fa0;
  font-size: 0.85rem;
  text-align: center;
  margin: 8px 0;
}
```

- [ ] **Step 2 : Commit**

```bash
git add games/grid-foundry/style.css
git commit -m "style: workers bar, crew panel, upgrade button"
```

---

## Task 11 — Vérification navigateur

**Files:**
- Run: `games/grid-foundry/index.html` dans un navigateur

- [ ] **Step 1 : Ouvrir le jeu**

```bash
# Depuis le dossier du projet
python3 -m http.server 8080
# Ouvrir http://localhost:8080/games/grid-foundry/
```

- [ ] **Step 2 : Vérifier le chemin critique (axe Métal)**

1. Nouveau jeu → construire Scierie, Carrière, Puits, Ferme
2. Vérifier que les bâtisseurs s'accumulent dans la workers bar
3. Construire Fourneau → coûte 1 bâtisseur, vérifier déduction
4. Ouvrir l'inspection d'un bâtiment → vérifier panneau crew (+/−)
5. Affecter équipe à la Scierie → vérifier que la production démarre
6. Construire jusqu'au Centre-ville puis au Hub
7. Vérifier que la mise en pause (crew=0) arrête la consommation
8. Tester l'upgrade d'une Scierie → vérifier que les slots augmentent

- [ ] **Step 3 : Vérifier le problème "détruire pour gagner" résolu**

Construire jusqu'à l'axe Métal avancé. Vérifier qu'en retirant l'équipe d'un bâtiment T1, les ressources reviennent en positif sans détruire le bâtiment.

- [ ] **Step 4 : Commit final**

```bash
git add -A
git commit -m "feat: Grid Foundry workers & upgrades — gameplay redesign complete"
```
