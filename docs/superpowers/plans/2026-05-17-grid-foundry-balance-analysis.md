# Grid Foundry Balance Analysis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Analyser la balance et la progression de Grid Foundry via 3 sub-agents (data-analysis, data-science, game-development) alimentés par un JSON extrait du code source.

**Architecture:** Un script d'extraction génère `game-data.json` à partir de `script.js`. Deux agents tournent en parallèle (analyse statique + simulation Python). Un troisième agent synthétise leurs rapports en recommandations concrètes.

**Tech Stack:** Node.js (extraction), Python 3 (simulateur), sous-agents Claude Code (`data-analysis`, `data-science`, `game-development`), dispatching via `superpowers:dispatching-parallel-agents`.

---

## Fichiers créés / modifiés

| Fichier | Rôle |
|---------|------|
| `games/grid-foundry/extract-data.js` | Script Node.js — extrait les constantes de jeu vers JSON |
| `games/grid-foundry/game-data.json` | Données de jeu (généré, ne pas éditer à la main) |
| `games/grid-foundry/analysis/simulate.py` | Simulateur Python (écrit par l'agent data-science) |
| `games/grid-foundry/analysis/report-static.md` | Rapport d'analyse statique (écrit par data-analysis) |
| `games/grid-foundry/analysis/report-simulation.md` | Rapport de simulation (écrit par data-science) |
| `games/grid-foundry/analysis/recommendations.md` | Recommandations finales (écrit par game-development) |

---

## Task 1 : Écrire et exécuter extract-data.js

**Files:**
- Create: `games/grid-foundry/extract-data.js`
- Create: `games/grid-foundry/game-data.json` (généré)

- [ ] **Step 1 : Créer le script d'extraction**

Crée `games/grid-foundry/extract-data.js` avec ce contenu exact :

```javascript
"use strict";
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "script.js"), "utf8");

// Garde uniquement la section données (avant le moteur d'adjacence UI)
const dataSection = src.split("/* ===================== ADJACENCY ENGINE")[0];

const fn = new Function(`
  "use strict";
  ${dataSection}

  // Nettoie les objectifs : supprime les fonctions f/g, garde ic, t, win
  function cleanObjs(arr) {
    return arr.map(o => Object.assign(
      { ic: o.ic, t: o.t },
      o.win ? { win: true } : {}
    ));
  }

  return {
    RESOURCES,
    BUILDINGS,
    BUILD_ORDER,
    ADJACENCY,
    CHAINS,
    SPECS: Object.fromEntries(
      Object.entries(SPECS).map(([k, v]) => [k, { name: v.name, icon: v.icon, mods: v.mods, txt: v.txt }])
    ),
    OBJ_COMMON: cleanObjs(OBJ_COMMON),
    OBJ_AXIS: Object.fromEntries(
      Object.entries(OBJ_AXIS).map(([k, v]) => [k, cleanObjs(v)])
    ),
    EXPAND,
    EFF,
  };
`);

const data = fn();
const out = path.join(__dirname, "game-data.json");
fs.writeFileSync(out, JSON.stringify(data, null, 2));

console.log("game-data.json écrit :", out);
console.log("  Bâtiments :", Object.keys(data.BUILDINGS).length);
console.log("  Ressources :", Object.keys(data.RESOURCES).length);
console.log("  EFF :", data.EFF);
```

- [ ] **Step 2 : Exécuter le script**

```bash
cd games/grid-foundry && node extract-data.js
```

Sortie attendue :
```
game-data.json écrit : .../games/grid-foundry/game-data.json
  Bâtiments : 27
  Ressources : 20
  EFF : [1, 0.92, 0.84, 0.76, 0.68]
```

Si le nombre de bâtiments ou ressources diffère, ouvre `script.js` et vérifie que la section `BUILDINGS` / `RESOURCES` est bien complète.

- [ ] **Step 3 : Vérifier le JSON**

```bash
node -e "const d=require('./game-data.json'); console.log(Object.keys(d))"
```

Sortie attendue :
```
[ 'RESOURCES', 'BUILDINGS', 'BUILD_ORDER', 'ADJACENCY', 'CHAINS', 'SPECS', 'OBJ_COMMON', 'OBJ_AXIS', 'EXPAND', 'EFF' ]
```

- [ ] **Step 4 : Créer le répertoire d'analyse et committer**

```bash
mkdir -p games/grid-foundry/analysis
git add games/grid-foundry/extract-data.js games/grid-foundry/game-data.json
git commit -m "feat: extract Grid Foundry game data to JSON"
```

---

## Task 2 + 3 : Lancer data-analysis et data-science en parallèle

> Utilise `superpowers:dispatching-parallel-agents` pour lancer les deux agents simultanément. Les deux agents lisent `games/grid-foundry/game-data.json` et écrivent leurs rapports dans `games/grid-foundry/analysis/`.

**Files:**
- Create: `games/grid-foundry/analysis/report-static.md` (par data-analysis)
- Create: `games/grid-foundry/analysis/report-simulation.md` (par data-science)
- Create: `games/grid-foundry/analysis/simulate.py` (par data-science)

- [ ] **Step 1 : Dispatcher les deux agents en parallèle**

Donne à chaque agent le prompt ci-dessous. Les deux tournent en même temps.

**Prompt pour `data-analysis` :**

```
Tu analyses le jeu de gestion industrielle Grid Foundry. Lis `games/grid-foundry/game-data.json`.

Effectue l'analyse statique suivante et écris le rapport dans `games/grid-foundry/analysis/report-static.md` :

1. **Ratios de production** : pour chaque bâtiment qui consomme ET produit, calcule produce/s ÷ consume/s par ressource impliquée. Liste les bâtiments où le ratio est inférieur à 1 (production insuffisante si seul exemplaire).

2. **Profondeur de chaîne par axe** : en suivant BUILD_ORDER et OBJ_AXIS, liste le chemin minimal de bâtiments pour atteindre win:true sur chaque axe (Métal, Bio, Énergie). Compte le nombre de bâtiments et le nombre d'objectifs. Note que OBJ_AXIS.metal a 10 objectifs, bio et energie en ont 7.

3. **Rendements décroissants** : EFF = [1, 0.92, 0.84, 0.76, 0.68] (5ème exemplaire et plus = ×0.68). Pour chaque bâtiment producteur de ressource goulot (consommée par plusieurs chaînes), à partir de quel exemplaire le rendement marginal ne vaut plus la construction ?

4. **Bonus d'adjacence max** : pour chaque bâtiment dans ADJACENCY, somme les pct positifs. Classe les 5 bâtiments avec le bonus d'adjacence maximum potentiel.

5. **Comparaison des SPECS** : pour chaque spécialisation (metal, bio, energie), liste les mods. Y a-t-il une spec qui donne un avantage net supérieur aux autres (somme des bonus - somme des malus) ?

Chaque section doit contenir des chiffres précis. Signale les anomalies en gras.
```

**Prompt pour `data-science` :**

```
Tu dois simuler des runs du jeu de gestion industrielle Grid Foundry. Lis `games/grid-foundry/game-data.json`.

Écris un simulateur Python dans `games/grid-foundry/analysis/simulate.py`, exécute-le, et écris le rapport dans `games/grid-foundry/analysis/report-simulation.md`.

**Règles du simulateur :**
- Ressources produites/consommées en continu. RATE = 0.4 tick/s (1 tick = 2.5s réel).
- Un bâtiment produit uniquement s'il a assez de ressources pour couvrir sa consommation ce tick.
- Rendements décroissants : le Nième bâtiment d'un même type a un facteur EFF[min(N-1, 4)].
- On ignore les bonus d'adjacence en première passe (baseline sans placement).
- L'expansion de grille est une contrainte dure :
  - Grille 4×4 (max 16 bâtiments) déblocable seulement après avoir construit centreville ET produit bois≥100, pierre≥50, brique≥20, ouvrier≥10, coût brique:30, ouvrier:20, metal:10.
  - Grille 5×5 (max 25 bâtiments) déblocable seulement après avoir construit hub ET produit metal≥1, energie≥1, outil≥1, coût brique:50, ouvrier:30, energie:30, machine:20.

**Politique greedy :** à chaque tick, si le stock le permet, construire le prochain bâtiment de la file (BUILD_ORDER dans l'ordre, axe choisi en 3ème groupe). Pas de priorisation avancée.

**Simule les 3 axes séparément** (Métal → ordinateur, Bio → conscience, Énergie → réacteurStellaire). Pour chaque axe, ajouter les bâtiments de l'axe correspondant à BUILD_ORDER après les bâtiments communs (jusqu'à hub inclus).

**Rapport à produire (report-simulation.md) :**

1. Tableau comparatif :

| Axe    | Bâtiments construits | Ticks jusqu'à victoire | Temps réel estimé | Ressource bloquante principale |
|--------|---------------------|------------------------|-------------------|-------------------------------|
| Métal  | ?                   | ?                      | ? min             | ?                             |
| Bio    | ?                   | ?                      | ? min             | ?                             |
| Énergie| ?                   | ?                      | ? min             | ?                             |

2. Pour chaque axe : liste des 3 ressources qui ont bloqué la construction le plus longtemps (en ticks d'attente).

3. Existe-t-il un axe dont le temps de victoire est >20% plus court qu'un autre ? Si oui, identifie pourquoi (moins de bâtiments, ressource plus facile, etc.).
```

- [ ] **Step 2 : Vérifier les fichiers générés**

```bash
ls games/grid-foundry/analysis/
```

Attendu : `report-static.md`, `report-simulation.md`, `simulate.py`.

```bash
wc -l games/grid-foundry/analysis/report-static.md games/grid-foundry/analysis/report-simulation.md
```

Chaque rapport doit faire au moins 50 lignes. Si un fichier est vide ou absent, relancer l'agent concerné.

- [ ] **Step 3 : Committer les rapports**

```bash
git add games/grid-foundry/analysis/
git commit -m "analysis: static balance report and simulation results"
```

---

## Task 4 : Lancer game-development pour la synthèse

**Files:**
- Create: `games/grid-foundry/analysis/recommendations.md`

- [ ] **Step 1 : Lancer l'agent game-development**

**Prompt pour `game-development` :**

```
Tu reçois deux rapports d'analyse sur Grid Foundry, un jeu de gestion industrielle sur grille.

Lis :
- `games/grid-foundry/analysis/report-static.md` (analyse statique : ratios, adjacences, specs)
- `games/grid-foundry/analysis/report-simulation.md` (simulation : temps de victoire, goulots)
- `games/grid-foundry/game-data.json` (données brutes si besoin de vérifier un chiffre)

Écris `games/grid-foundry/analysis/recommendations.md` avec :

1. **Bilan des axes** : quel axe est le plus facile / le plus difficile, et pourquoi en termes concrets (nombre de bâtiments, ressource bloquante, longueur de chaîne).

2. **Points de friction** : y a-t-il des moments dans la progression où le joueur attend trop longtemps sans pouvoir construire ? Si oui, à quelle étape et pour quelle ressource ?

3. **Bâtiments sous-utilisés** : quels bâtiments n'apparaissent jamais sur le chemin critique d'aucun axe ? Sont-ils des dead ends ou juste optionnels ?

4. **5 ajustements concrets** : formule des modifications précises du fichier `script.js`, en citant la valeur actuelle et la valeur proposée. Format :
   - Bâtiment / ressource concernée
   - Valeur actuelle : `produce:{bois:2}` / `cost:{pierre:30}`
   - Valeur proposée : `produce:{bois:3}` / `cost:{pierre:20}`
   - Justification en 1 phrase

5. **Mécanique sous-exploitée** : parmi CHAINS, SPECS, et EFF (rendements décroissants), laquelle a l'impact le plus faible sur les décisions du joueur ? Propose comment la rendre plus visible ou plus impactante.
```

- [ ] **Step 2 : Vérifier le rapport**

```bash
wc -l games/grid-foundry/analysis/recommendations.md
```

Attendu : au moins 60 lignes. Ouvre le fichier et vérifie que la section "5 ajustements concrets" contient bien des valeurs chiffrées (`produce:`, `cost:`, etc.), pas du texte vague.

- [ ] **Step 3 : Committer**

```bash
git add games/grid-foundry/analysis/recommendations.md
git commit -m "analysis: game-development balance recommendations"
```

---

## Task 5 : Revue finale et application des ajustements

**Files:**
- Modify: `games/grid-foundry/script.js`

- [ ] **Step 1 : Lire les recommandations**

Ouvre `games/grid-foundry/analysis/recommendations.md` et note les 5 ajustements concrets de la section 4.

- [ ] **Step 2 : Appliquer les ajustements dans script.js**

Pour chaque ajustement, localise la ligne dans `script.js` via :

```bash
grep -n "nom_du_batiment\|valeur_cherchée" games/grid-foundry/script.js
```

Modifie uniquement les valeurs numériques indiquées (pas de restructuration). Vérifie que le jeu se charge sans erreur en ouvrant `games/grid-foundry/index.html` dans un navigateur.

- [ ] **Step 3 : Régénérer game-data.json après les modifications**

```bash
cd games/grid-foundry && node extract-data.js
```

- [ ] **Step 4 : Committer les ajustements**

```bash
git add games/grid-foundry/script.js games/grid-foundry/game-data.json
git commit -m "balance: apply game-development recommendations to Grid Foundry"
```
