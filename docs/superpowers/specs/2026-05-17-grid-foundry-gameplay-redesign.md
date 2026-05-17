# Grid Foundry — Redesign Gameplay

> Date : 2026-05-17  
> Statut : approuvé  
> Références : Factorio, Age of Empires

---

## Contexte et motivations

Le système de chaînes de production et les axes de spécialisation (Métal / Bio / Énergie) sont solides. Les problèmes identifiés :

- **Ouvriers sous-utilisés** : produits par la Cantine, consommés uniquement pour construire le Centre-ville, l'expansion et le Bio-réacteur. Pas de tension permanente.
- **"Détruire pour gagner"** : en fin d'axe Métal, les bâtiments T3 consomment plus que ce que les producteurs T1 génèrent. Le joueur doit détruire des bâtiments pour revenir en flux positif, vider son stock, puis construire les bâtiments finaux. Ce comportement est contra-intuitif.
- **Adjacences ignorées** : les bonus d'adjacence ne sont pas utilisés en pratique. Ils ajoutent de la complexité sans valeur perçue.
- **Difficulté plate** : le jeu ne devient pas significativement plus difficile avec l'expansion. La nourriture et l'eau perdent leur intérêt après le T1.

---

## Design cible

### Principe directeur

La difficulté monte de l'intérieur : plus le joueur s'étend, plus il a besoin de main-d'œuvre, plus il doit investir dans la base agricole. Aucun événement externe. La pression vient des choix du joueur lui-même.

Références gameplay : Factorio (gestion de flux et goulots d'étranglement) + Age of Empires (population, bâtisseurs, équipe affectée aux bâtiments).

---

## Mécanique 1 — Deux types d'ouvriers

### Bâtisseur

- **Produit par** : Cantine (rapide — 1 toutes les 10 secondes, consomme nourriture + eau)
- **Rôle** : consommé à la construction d'un bâtiment. La construction est instantanée (le bâtisseur est consommé au clic, pas de délai). Cela simplifie la simulation et évite une file d'attente à gérer.
- **Analogie** : villageois AoE envoyé construire.

### Équipe (crew)

- **Produite par** : Cantine (lent — 1 toutes les 30 secondes, consomme nourriture + eau)
- **Rôle** : affectée en permanence à un bâtiment pour le faire fonctionner. Sans équipe = bâtiment inactif (0%). Équipe minimale = 50% de production. Équipe complète = 100%.
- **Retrait d'équipe** : retirer l'équipe d'un bâtiment le met en pause (ni consommation, ni production). Le bâtiment reste construit. Cela remplace la destruction comme outil de gestion de flux.

### Slots d'équipe par tier (niveau 1)

| Tier | Slots min (50%) | Slots optimal (100%) | Exemples |
|------|-----------------|----------------------|----------|
| T1 — Pionnier | 1 | 2 | Scierie, Ferme, Puits |
| T2 — Industriel | 2 | 4 | Forge, Générateur, Atelier |
| T3 — Avancé | 3 | 6 | Usine, Fonderie, Labo quantique |
| Civique | 5 | 10 | Centre-ville, Hub |

---

## Mécanique 2 — Upgrades de bâtiments

### Principe

Chaque bâtiment a 3 niveaux. L'upgrade débloque des slots d'équipe supplémentaires et augmente la production maximale. Un bâtiment upgradé remplace plusieurs copies du même bâtiment sur la grille.

**Règle** : 1 bâtiment niveau 3 pleine équipe = 3 bâtiments niveau 1 pleine équipe, mais sur 1 seule case.

### Structure d'un upgrade (exemple : Scierie T1)

| Niveau | Slots équipe | Production max | Coût upgrade |
|--------|--------------|----------------|--------------|
| ⭐ N1 (base) | 2 | bois ×3/s | — |
| ⭐⭐ N2 | 4 | bois ×6/s | bois ×30, pierre ×20, 1 bâtisseur |
| ⭐⭐⭐ N3 | 6 | bois ×9/s | bois ×60, outil ×10, 2 bâtisseurs |

### Scaling de production

La production est proportionnelle au nombre d'équipiers affectés par rapport aux slots disponibles :

```
production = production_max × (équipiers_affectés / slots_total)
```

Un bâtiment N2 avec 2 équipiers sur 4 slots produit à 50%.

### Coûts d'upgrade par axe de spécialisation

- **Axe Métal** : upgrades T2/T3 coûtent métal + outil — incite à upgrader la chaîne industrielle.
- **Axe Bio** : upgrades Ferme et Cantine coûtent nourriture + eau — l'axe Bio scale l'équipe plus vite.
- **Axe Énergie** : upgrades T3 coûtent de l'énergie — l'axe Énergie réduit ce coût pour ses bâtiments.

---

## Mécanique 3 — Suppression des adjacences

Les bonus d'adjacence sont supprimés. Le placement sur la grille est libre. La stratégie passe par la gestion de l'équipe et des upgrades, pas par la géométrie des cases.

---

## Conséquences sur la progression

### Résolution du problème "détruire pour gagner"

Quand le joueur arrive en fin d'axe et que son flux est négatif sur certaines ressources, il retire l'équipe des bâtiments non critiques (ils passent en pause) et réaffecte l'équipe libérée aux bâtiments finaux. Aucune destruction nécessaire.

### Pression naturelle par tier

- 10 bâtiments T1 pleins = 20 équipiers nécessaires
- 10 bâtiments T3 pleins = 60 équipiers nécessaires
- La Cantine (nourriture + eau) devient critique toute la partie, pas seulement en début.

### Rôle des axes de spécialisation

- **Axe Bio** : naturellement le meilleur pour scaler l'équipe (nourriture et eau sont ses forces)
- **Axe Métal** : upgrades industriels moins chers, chaîne métal → outil valorisée
- **Axe Énergie** : upgrades T3 moins chers en énergie, maintient la pression en fin de partie

---

## Plan de simulation (avant implémentation)

### Objectif

Valider les valeurs numériques (slots, coûts d'upgrade, taux de production de la Cantine) via le simulateur avant de modifier `script.js`.

### 3 courbes à mesurer pour chaque axe

1. **Courbe de progression** : temps pour débloquer chaque étape. Doit monter régulièrement sans mur brutal.
2. **Demande en équipe** : nombre d'équipiers nécessaires vs. disponibles à chaque étape. L'offre doit être ≈ 90% de la demande en permanence.
3. **Demande en bâtisseurs** : fréquence des constructions et upgrades. La Cantine doit produire assez vite pour que l'expansion ne soit jamais bloquée.

### Critères d'équilibre

| Critère | Objectif | Signal d'alerte |
|---------|----------|-----------------|
| Durée par axe | Métal ≤ Bio ≤ Énergie | Un axe 2× plus long que les autres |
| Taux d'équipe | Offre ≈ 90% de la demande | Surplus ou déficit constant >30% |
| Nourriture/eau | Jamais en surplus en T3 | Stock illimité dès le T2 |
| Upgrades | 1 upgrade tous les 3-5 constructions | Jamais utilisés ou bloquants dès T1 |

### Étapes dans l'ordre

1. Mettre à jour `simulate.py` : intégrer bâtisseurs, équipe, slots par tier, scaling de production
2. Définir les valeurs numériques dans `game-data.json` (slots, coûts d'upgrade)
3. Simuler les 3 axes et tracer les courbes
4. Ajuster les valeurs jusqu'à ce que les critères soient remplis
5. Seulement après : modifier `script.js` pour implémenter les mécaniques

---

## Ce qui ne change pas

- Les 3 axes de spécialisation (Métal / Bio / Énergie) et leurs bâtiments
- Les chaînes de production (les recettes de transformation)
- Les conditions de victoire par axe
- La grille avec expansion par tiers (3×3 → 4×4 → 5×5)
- Le BUILD_ORDER et les ères (Pionnière → Industrielle → Avancée)
