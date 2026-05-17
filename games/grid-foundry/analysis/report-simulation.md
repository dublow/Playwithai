# Rapport de simulation — Grid Foundry Balance Analysis

Date : 2026-05-17  
Simulateur : `games/grid-foundry/analysis/simulate.py`  
Cap de simulation : 500 000 ticks  

---

## Résumé des résultats

Les trois axes de progression (Métal, Bio, Énergie) ont été simulés avec la politique gloutonne `BUILD_ORDER` (construire les bâtiments dans l'ordre défini, le plus tôt possible). Les trois axes atteignent le cap de simulation sans jamais atteindre la victoire.

### Tableau comparatif

| Axe     | Bâtiments construits | Ticks jusqu'à victoire | Temps réel estimé | Ressource bloquante principale |
|---------|---------------------|------------------------|-------------------|-------------------------------|
| Métal   | 6                   | > 500 000 (cap)        | > 20 833 min      | bois (net = 0/s)              |
| Bio     | 6                   | > 500 000 (cap)        | > 20 833 min      | bois (net = 0/s)              |
| Énergie | 6                   | > 500 000 (cap)        | > 20 833 min      | bois (net = 0/s)              |

---

## Détail par axe

### Axe Métal

- **Bâtiments construits** : 6 (sur l'ensemble de la chaîne)
- **Ticks jusqu'à victoire** : 500 000 (cap atteint — victoire jamais obtenue)
- **Temps réel estimé** : 20 833,3 minutes

Ressources bloquantes (ticks de blocage cumulés) :

| Ressource | Ticks bloqués | Part |
|-----------|--------------|------|
| bois      | 499 977      | ≈ 99,99 % |
| pierre    | 23           | ≈ 0,01 % |

---

### Axe Bio

- **Bâtiments construits** : 6
- **Ticks jusqu'à victoire** : 500 000 (cap atteint — victoire jamais obtenue)
- **Temps réel estimé** : 20 833,3 minutes

Ressources bloquantes (ticks de blocage cumulés) :

| Ressource | Ticks bloqués | Part |
|-----------|--------------|------|
| bois      | 499 977      | ≈ 99,99 % |
| pierre    | 23           | ≈ 0,01 % |

---

### Axe Énergie

- **Bâtiments construits** : 6
- **Ticks jusqu'à victoire** : 500 000 (cap atteint — victoire jamais obtenue)
- **Temps réel estimé** : 20 833,3 minutes

Ressources bloquantes (ticks de blocage cumulés) :

| Ressource | Ticks bloqués | Part |
|-----------|--------------|------|
| bois      | 499 977      | ≈ 99,99 % |
| pierre    | 23           | ≈ 0,01 % |

---

## Analyse de la cause du deadlock

### Bâtiments construits avec le stock initial (bois: 60, pierre: 40, eau: 20)

| Ordre | Bâtiment     | Produit                                               |
|-------|-------------|-------------------------------------------------------|
| 1     | scierie      | bois : +2/s                                           |
| 2     | carrière     | pierre : +2/s                                         |
| 3     | puits        | eau : +2/s                                            |
| 4     | ferme        | nourriture : +2/s                                     |
| 5     | fourneau     | consomme bois : 2/s → produit charbon : 1/s           |
| 6     | briqueterie  | consomme pierre : 2/s + eau : 1/s → produit brique : 1/s |

### Pourquoi le fourneau crée une impasse

Après la construction du bâtiment 5 (`fourneau`), le bilan net du bois devient :

```
bois produit/s  =  scierie (+2/s)
bois consommé/s =  fourneau (−2/s)
──────────────────────────────────
Bilan net bois  =  0/s
```

Avec un bilan net **nul**, le stock de bois ne croît jamais au-delà du résidu laissé après la construction du fourneau. Or, le bâtiment suivant dans `BUILD_ORDER` est :

- **Bâtiment 7 : cantine** — coût : bois: 15
- **Bâtiment 8 : centreville** — coût : bois: 50, pierre: 40, brique: 20, ouvrier: 10

Aucun de ces bâtiments ne peut jamais être financé si le stock de bois stagne à 0. La simulation tourne alors à l'infini sans aucune progression.

### Rôle de la briqueterie (bâtiment 6)

La briqueterie aggrave la situation côté pierre :

```
pierre produit/s  =  carrière (+2/s)
pierre consommé/s =  briqueterie (−2/s)
───────────────────────────────────────
Bilan net pierre  =  0/s
```

Les 23 ticks de blocage sur `pierre` correspondent à la brève période où la briqueterie commence à consommer de la pierre avant que le stock ne soit complètement épuisé. Après ce court délai, la pierre aussi stagne à 0, mais c'est le bois qui reste le goulot d'étranglement principal puisque `cantine` en a besoin en premier.

---

## Comparaison des axes

Les trois axes (Métal, Bio, Énergie) sont **strictement identiques** jusqu'au deadlock :

- Même `BUILD_ORDER` initial (scierie → carrière → puits → ferme → fourneau → briqueterie)
- Même timing de construction (déterminé par le stock initial commun)
- Même deadlock au bâtiment 7 (`cantine`), bloqué sur bois net = 0/s
- Même répartition des ticks bloquants : 499 977 sur bois, 23 sur pierre

La divergence entre axes n'a aucune occasion de se manifester car le simulateur ne dépasse jamais le 6e bâtiment. Les bâtiments spécifiques à chaque axe (centrale, laboratoire, etc.) ne sont jamais atteints.

---

## Implications pour la balance

### Problème identifié

La politique gloutonne `BUILD_ORDER` (1 de chaque bâtiment dans l'ordre) **n'est pas viable** dans la configuration actuelle. Elle conduit systématiquement à une impasse de production après 6 bâtiments, quelle que soit la trajectoire de progression choisie.

### Causes profondes

1. **Le fourneau annule complètement la scierie** : avec 1 scierie et 1 fourneau, la production nette de bois est exactement 0. Il n'y a aucune marge pour financer de nouveaux bâtiments en bois.
2. **La briqueterie annule complètement la carrière** : même constat côté pierre.
3. **Les deux consommateurs arrivent trop tôt dans l'ordre** : fourneau (rang 5) et briqueterie (rang 6) apparaissent avant que la base productive soit suffisamment large.

### Correctifs envisageables

**Option A — Modifier le BUILD_ORDER :**
Construire 2 scieries avant le fourneau, de façon à maintenir un bilan net positif sur bois :

```
bois net = scierie×2 (+4/s) − fourneau (−2/s) = +2/s  ✓
```

**Option B — Réduire la consommation du fourneau :**
Si la consommation du fourneau passe de 2/s à 1/s de bois, le bilan redevient positif avec une seule scierie :

```
bois net = scierie (+2/s) − fourneau (−1/s) = +1/s  ✓
```

**Option C — Augmenter la production de la scierie :**
Passer la scierie de 2/s à 3/s permettrait d'absorber le fourneau et de laisser une marge de +1/s.

**Option D — Repousser fourneau et briqueterie dans l'ordre :**
Les placer après `cantine` garantit que le joueur dispose d'une base productive plus large avant d'introduire des consommateurs de ressources primaires.

---

## Conclusion

La simulation confirme que le deadlock est **déterministe, systématique et identique** sur les trois axes. La root cause est claire : le fourneau consomme autant de bois que la scierie en produit, ce qui empêche toute accumulation de bois pour les bâtiments ultérieurs. Une correction ciblée sur la consommation du fourneau ou l'ordre de construction suffit à débloquer la progression.
