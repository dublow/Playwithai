# Grid Foundry — Analyse balance & progression (Design)

**Date :** 2026-05-17
**Scope :** Analyse de la balance et de la progression du jeu Grid Foundry via pipeline multi-agents.

---

## Objectif

Identifier les déséquilibres de balance et les problèmes de progression dans Grid Foundry en combinant :
- une analyse statique des données du jeu (ratios, profondeurs de chaîne, adjacences)
- une simulation de runs pour comparer les 3 axes de victoire (Métal, Bio, Énergie)

Résultat attendu : 3 à 5 recommandations concrètes et chiffrées (modifier un `produce`, un `cost`, un bonus d'adjacence).

---

## Architecture

```
[extract-data.js]  →  game-data.json
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
   data-analysis                    data-science
   (analyse statique)               (simulation de runs)
          │                                 │
          └────────────────┬────────────────┘
                           ▼
                    game-development
                    (synthèse + recommandations)
```

---

## Étape 0 — Extraction des données

**Fichier source :** `games/grid-foundry/script.js` (~1400 lignes)
**Fichier cible :** `games/grid-foundry/game-data.json`

Un script `extract-data.js` extrait les structures de données pures (sans logique UI) :

| Structure | Contenu |
|-----------|---------|
| `RESOURCES` | ~20 ressources, 4 tiers (base, t1, t2, t3, fin) |
| `BUILDINGS` | Coût, consume/s, produce/s, tier requis, tag |
| `ADJACENCY` | Bonus/malus par paire de bâtiments voisins |
| `CHAINS` | Bonus de chaîne (3 bâtiments alignés) |
| `SPECS` | 3 spécialisations (Métal, Bio, Énergie) avec mods |
| `OBJ_COMMON` + `OBJ_AXIS` | Objectifs communs + objectifs par axe (avec condition `win:true`) |
| `EXPAND` | Coûts d'expansion de grille (4×4, 5×5) |
| `EFF` | Rendements décroissants : `[1, 0.92, 0.84, 0.76, 0.68]` |

---

## Étape 1a — Agent `data-analysis` (analyse statique)

**Input :** `game-data.json`
**Output :** rapport structuré en markdown

Questions à traiter :

1. **Ratios de production** — `produce/s ÷ consume/s` par bâtiment. Quels bâtiments ne produisent jamais assez pour couvrir leur consommation aval ?
2. **Profondeur de chaîne par axe** — nombre minimum de bâtiments pour atteindre la victoire. Note : Métal a 10 objectifs intermédiaires, Bio et Énergie en ont 7.
3. **Rendements décroissants** — à partir de combien d'exemplaires du même bâtiment le rendement (EFF) devient-il insuffisant ? Quels bâtiments incitent le plus à la duplication ?
4. **Bonus d'adjacence** — bonus maximum atteignable par bâtiment (somme ADJACENCY positifs). Quels bâtiments ont un avantage d'adjacence disproportionné ?
5. **SPECS** — comparaison des 3 spécialisations : les bonus (`+20%`, `+15%`, malus `-10%`) sont-ils symétriques et équilibrés ?

---

## Étape 1b — Agent `data-science` (simulation)

**Input :** `game-data.json`
**Output :** tableau comparatif des 3 axes + rapport de simulation

Le simulateur Python modélise :
- Production/consommation continue (tick = 0.4/s, `RATE = 0.4`)
- Rendements décroissants par type de bâtiment (`EFF`)
- Politique greedy : construire le prochain bâtiment dès que le stock le permet

Questions à traiter :

1. **Chemin critique minimum** — plus petit ensemble de bâtiments par axe, ordre de construction optimal.
2. **Temps estimé** — nombre de ticks jusqu'à victoire pour chaque axe (stratégie greedy).
3. **Goulots d'étranglement** — quelle ressource bloque le plus longtemps la progression dans chaque axe ?
4. **Stratégie dominante** — existe-t-il un axe significativement plus rapide ?

Livrable principal :

| Axe | Bâtiments min | Ticks estimés | Ressource bloquante |
|-----|--------------|---------------|---------------------|
| Métal | ? | ? | ? |
| Bio | ? | ? | ? |
| Énergie | ? | ? | ? |

---

## Étape 2 — Agent `game-development` (synthèse)

**Input :** les deux rapports des étapes 1a et 1b
**Output :** document de recommandations

Questions à traiter :

1. Quel axe est le plus facile / le plus difficile, et pourquoi ?
2. Y a-t-il des moments de la progression où le joueur est bloqué trop longtemps ?
3. Quels bâtiments ou ressources sont sous-utilisés (jamais sur le chemin optimal) ?
4. 3 à 5 ajustements concrets avec justification (modifier un `produce`, `cost`, ou bonus `ADJACENCY`).
5. Y a-t-il une mécanique existante (CHAINS, SPECS, EFF) qui est trop invisible ou trop peu impactante en jeu ?

---

## Contraintes et notes

- Le jeu est **déterministe** (pas d'aléatoire dans la production) : une simulation greedy est suffisante, pas besoin d'entraîner un agent RL.
- L'expansion de grille (4×4 → 5×5) est une contrainte dure qui impacte tous les axes : le simulateur doit l'inclure.
- Les bonus d'adjacence dépendent du placement spatial : le simulateur peut les ignorer en première approximation (baseline sans adjacence), puis les intégrer en deuxième passe.
- Les SPECS (spécialisations) ne sont choisies qu'une fois, après le Centre-ville : le simulateur doit tester chaque axe avec et sans la spécialisation correspondante.

---

## Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `games/grid-foundry/script.js` | Source des données de jeu |
| `games/grid-foundry/game-data.json` | Données extraites (à générer) |
| `games/grid-foundry/extract-data.js` | Script d'extraction (à créer) |
| `games/grid-foundry/analysis/report-static.md` | Rapport data-analysis |
| `games/grid-foundry/analysis/report-simulation.md` | Rapport data-science |
| `games/grid-foundry/analysis/recommendations.md` | Recommandations game-development |
