# Grid Foundry — Recommandations de balance

> Basé sur `report-static.md`, `report-simulation.md` et `game-data.json`.
> Date : 2026-05-17

---

## 1. Bilan des axes : facilité comparée

### Axe Métal / Technologie — Le plus facile

L'axe Métal est le plus court en nombre absolu de bâtiments (17 au total, 5 spécifiques) et le plus
riche en objectifs (21 objectifs vs 18 pour Bio et Énergie). Ce ratio objectifs/bâtiments est le
meilleur des trois axes, ce qui procure un sentiment de progression plus régulier et plus
récompensant.

La chaîne spécifique est la plus directe : Usine → Fonderie → Circuiterie → Laboratoire quantique →
Centre de calcul. Chaque maillon a une seule ressource de sortie qui alimente le suivant (alliage →
circuit → calcul → ordinateur). Le goulot principal (énergie ×3 pour le Centre de calcul) est
partagé avec les autres axes, donc pas une surprise propre à Métal.

**Ressource bloquante principale** : énergie (consommée à 3/s par le Centre de calcul). Requiert
4 Générateurs dédiés (cumul 3.52/s). C'est contraignant mais prévisible.

### Axe Énergie / Fusion — Le plus difficile

L'axe Énergie est objectivement le plus long : 19 bâtiments pour 7 objectifs axe, soit le pire
ratio du jeu. Il impose un détour structurel non documenté : le Cristalliseur consomme de
l'`alliage` (1/s), ce qui force la construction de la Fonderie avancée et donc de l'Usine, alors
que la description du bâtiment ne mentionne que "cristallise l'énergie". Le joueur qui s'engage sur
l'axe Énergie sans avoir lu les recettes découvre en milieu de partie qu'il doit maintenir une
chaîne métal-alliage parallèle.

La chaîne terminale est aussi la plus exigeante sur l'énergie stable : le Réacteur stellaire
consomme `energieStable:3/s`, soit le ratio 0.33 le plus bas de tout le jeu (avec Centre de calcul
et Nexus). Cela implique de chaîner Stabilisateur → Réacteur plasma → Cristalliseur → Chambre
antimatière → Réacteur stellaire, chaque étape consommant la sortie de la précédente, avec une
pression croissante sur les ressources T3 (plasma, cristal, antimatière).

**Ressource bloquante principale** : énergie stable (goulot à 3/s pour le Réacteur stellaire),
elle-même alimentée par 2 unités d'énergie/s au Stabilisateur. Il faut en pratique 3 Stabilisateurs
(cumul 2.76/s) pour alimenter un seul Réacteur stellaire à plein régime, en plus de l'énergie
consommée par les autres bâtiments de la chaîne.

### Axe Bio / Organisme — Position intermédiaire

L'axe Bio compte 18 bâtiments pour 7 objectifs axe. La chaîne est longue (6 bâtiments spécifiques)
mais linéaire sans détour structurel caché. Le goulot notable est la nourriture : elle est
consommée simultanément par la Cantine (2/s), le Bio-réacteur (2/s) et l'Incubateur (2/s), soit
6/s de demande potentielle pour 2/s de production de base (une Ferme). Cela impose 3 Fermes
minimum dès que l'axe Bio est pleinement actif.

La spec Bio aggrave la situation par son malus `métal ×0.9` (−10%), qui ralentit l'accès à la
Forge, au Générateur et à tout le T2, dès l'ère industrielle — sur l'axe Bio comme sur les autres.

---

## 2. Points de friction dans la progression

### Le deadlock critique : le Fourneau (rang 5 du BUILD_ORDER)

La simulation confirme un blocage déterministe et universel après le 6e bâtiment, quel que soit
l'axe choisi. La cause est simple et documentée :

```
Scierie        : produce:{bois:2}   → +2/s
Fourneau       : consume:{bois:2}   → −2/s
──────────────────────────────────────────
Bilan net bois : 0/s
```

Avec un bilan net nul, le stock de bois ne croît jamais. Or le 7e bâtiment est la Cantine
(`cost:{bois:15, pierre:10}`), qui devient inaccessible indéfiniment. La simulation tourne 499 977
ticks sur bois bloqué (≈ 99,99 % du temps de simulation).

La Briqueterie (rang 6) aggrave le même problème sur la pierre :

```
Carrière       : produce:{pierre:2} → +2/s
Briqueterie    : consume:{pierre:2} → −2/s
──────────────────────────────────────────
Bilan net pierre : 0/s
```

Les 23 ticks résiduels bloqués sur pierre confirment que la double annulation (bois + pierre) laisse
le joueur sans aucun flux positif pour financer la suite.

**Impact joueur** : le jeu se fige silencieusement. Aucun message d'erreur n'indique que la
progression est impossible. Un joueur qui a construit ces 6 bâtiments dans l'ordre conseillé attend
une accumulation de bois qui ne viendra jamais. C'est la friction la plus grave du jeu actuel.

### Friction secondaire : énergie stable pour l'axe Énergie (T3)

Le Stabilisateur consomme `energie:2` pour produire `energieStable:1`. Avec un Générateur de base
à 1 énergie/s (EFF cap à 0.68/s à partir du 5e), atteindre 3 énergies stables/s pour le Réacteur
stellaire requiert un parc de 12 à 15 Générateurs dédiés, en tenant compte des pertes EFF et des
autres consommateurs. Ce mur de ressources arrive après une longue chaîne de construction et peut
surprendre le joueur en fin de partie.

---

## 3. Bâtiments sous-utilisés

### Bâtiments hors du chemin critique de tout axe

En croisant les chaînes de production des trois axes, les bâtiments suivants n'apparaissent dans
la chaîne critique d'aucun axe de victoire :

**Bio-réacteur** : il est sur le chemin critique de l'axe Bio (produit biomasse pour le Labo ADN),
donc pas strictement "hors" de tout axe, mais il est inutile sur Métal et Énergie. Sur l'axe Bio
lui-même, sa contrainte de `nourriture:2/s` entre directement en concurrence avec la Cantine et
l'Incubateur — trois bâtiments qui se partagent la même ressource T1.

**Réacteur plasma** : présent uniquement sur l'axe Énergie. Jamais construit sur Métal ou Bio. Sur
Énergie, il est un maillon intermédiaire obligatoire (plasma pour le Cristalliseur), mais son bonus
d'adjacence (Générateur → +20% plasma) est rarement exploitable car le Générateur est déjà très
demandé ailleurs sur la grille.

**Chambre antimatière** : même cas que le Réacteur plasma — exclusivement sur l'axe Énergie, avant-
dernier maillon. Sa recette consomme trois ressources T3 distinctes (cristal, energieStable, plasma),
ce qui en fait le bâtiment avec la contrainte d'approvisionnement la plus large du jeu. Jamais
atteint dans la simulation.

**Stabilisateur** : uniquement sur l'axe Énergie. Mais son bonus d'adjacence (Puits → +15%
énergieStable) est peu connu des joueurs qui n'ont pas maximisé le placement de la grille.

### Sont-ils des dead ends ou juste optionnels ?

Ces bâtiments ne sont pas des dead ends : ils sont tous nécessaires sur leur axe respectif. Le
problème est qu'ils sont **monoaxe et sériels** — aucun n'a de valeur transversale. Contrairement
au Générateur (utilisé par tous les axes) ou à l'Usine (requise par tous via l'expansion 5×5), ces
bâtiments n'ont aucun rôle dans les choix de placement ou d'optimisation pour un joueur qui n'a
pas choisi l'axe Énergie ou Bio. Leur visibilité dans l'interface est donc quasi nulle pour 2/3 des
parties.

---

## 4. Cinq ajustements concrets pour `script.js`

Les valeurs ci-dessous référencent les données actuelles de `game-data.json`. Les modifications
doivent être appliquées dans les définitions de bâtiments correspondantes dans `script.js`.

---

### Ajustement 1 — Fourneau : réduire la consommation de bois

- **Bâtiment** : Fourneau (`fourneau`)
- **Valeur actuelle** : `consume:{bois:2}`
- **Valeur proposée** : `consume:{bois:1}`
- **Justification** : avec `bois:1` consommé pour `charbon:1` produit, le bilan net bois redevient
  `+1/s` avec une seule Scierie, ce qui débloque l'accumulation nécessaire pour financer la Cantine
  (`cost:{bois:15}`) et le Centre-ville (`cost:{bois:50}`), éliminant le deadlock universel
  confirmé par simulation.

---

### Ajustement 2 — Scierie : augmenter la production de bois

- **Bâtiment** : Scierie (`scierie`)
- **Valeur actuelle** : `produce:{bois:2}`
- **Valeur proposée** : `produce:{bois:3}`
- **Justification** : alternative complémentaire à l'ajustement 1 (peut être appliquée seule ou
  en combinaison réduite) — avec `bois:3/s` et un Fourneau à `bois:2/s`, le bilan net est `+1/s`,
  ce qui suffit à sortir du deadlock ; cette approche préserve la tension du Fourneau comme
  consommateur agressif tout en garantissant une marge minimale de progression.

---

### Ajustement 3 — Spec Bio : changer le malus de métal vers nourriture

- **Spécialisation** : Bio (`SPECS.bio`)
- **Valeur actuelle** : `"metal": 0.9` (malus métal −10%)
- **Valeur proposée** : `"nourriture": 0.9` (malus nourriture −10%), et supprimer le malus métal
- **Justification** : le malus métal pénalise une ressource transversale T2 utilisée par tous les
  axes dès l'ère industrielle (Forge, Atelier, Générateur, Usine, Fonderie), rendant la spec Bio
  structurellement désavantagée même sur son propre axe ; le déplacer vers la nourriture crée un
  malus thématiquement cohérent (moins efficace sur la nourriture de base, car l'axe Bio optimise
  la biochimie, pas l'agriculture) tout en alignant la pénalité pratique sur celle des autres specs.

---

### Ajustement 4 — Briqueterie : réduire la consommation de pierre

- **Bâtiment** : Briqueterie (`briqueterie`)
- **Valeur actuelle** : `consume:{pierre:2, eau:1}`
- **Valeur proposée** : `consume:{pierre:1, eau:1}`
- **Justification** : avec `pierre:2/s` consommée et `pierre:2/s` produite par la Carrière, le
  bilan net pierre est exactement 0, bloquant tout achat de bâtiments à base de pierre après le
  rang 6 (notamment la Forge à `cost:{pierre:30}` et le Hub à coût indirect en pierre via la
  Forge) ; passer à `pierre:1/s` libère `+1/s` net et maintient une progression fluide en T2.

---

### Ajustement 5 — Cristalliseur : supprimer la consommation d'alliage ou l'indiquer en description

- **Bâtiment** : Cristalliseur (`cristalliseur`)
- **Valeur actuelle** : `consume:{plasma:1, alliage:1}` / `desc:"Axe Énergie — cristallise l'énergie."`
- **Valeur proposée (option A — correction de balance)** : `consume:{plasma:1, energieStable:1}` —
  remplacer `alliage` par `energieStable` pour rester dans la chaîne Énergie sans détour métal.
- **Valeur proposée (option B — correction de description)** : conserver `consume:{plasma:1, alliage:1}`
  mais modifier la description en `"Axe Énergie — fond le plasma et l'alliage en cristal. Nécessite
  une Fonderie avancée."`.
- **Justification** : le Cristalliseur est le seul bâtiment de l'axe Énergie à consommer une
  ressource T3 métal (alliage), imposant un détour non signalé par Fonderie+Usine qui porte la
  longueur de l'axe Énergie à 19 bâtiments contre 17 pour l'axe Métal, pour un nombre d'objectifs
  inférieur (7 vs 10) ; l'option A réduit la longueur à 18 bâtiments et supprime la contrainte
  cachée, l'option B préserve la difficulté mais la rend explicite.

---

## 5. Mécanique sous-exploitée : CHAINS

### Diagnostic

Parmi les trois mécaniques — **CHAINS** (bonus de chaîne), **SPECS** (spécialisations) et **EFF**
(rendements décroissants) — c'est **CHAINS** qui a l'impact le plus faible sur les décisions du
joueur.

**Pourquoi ?** Les cinq chaînes définies accordent un bonus de `+10%` sur une ressource spécifique
lorsque le bâtiment "mid" est flanqué des bâtiments "a" et "c". Exemple : la chaîne métal donne
`+10% outil` à l'Atelier si la Forge est à gauche et l'Atelier à droite du Fourneau. Ce bonus de
10% est trop faible pour modifier une décision de placement de grille : sur un Atelier produisant
`outil:1/s`, le gain est `+0.10 outil/s`, soit l'équivalent d'un dixième d'Atelier supplémentaire.
Comparé aux adjacences (jusqu'à +25% sur un seul voisin) ou aux specs (+15 à +20% sur une ressource
entière), le bonus de chaîne est invisible dans la progression.

De plus, les chaînes exigent un arrangement linéaire précis (a — mid — c) qui entre souvent en
conflit avec les adjacences optimales. Un joueur qui optimise les adjacences (Fourneau adjacent à
Forge pour +25% métal) peut briser la condition de chaîne sans s'en rendre compte.

### Pistes pour rendre CHAINS plus visible et plus impactante

**Option 1 — Augmenter le bonus à +20 ou +25%** : au lieu de `pct:10`, passer à `pct:20` ou
`pct:25`. À ce niveau, le bonus de chaîne est comparable aux meilleures adjacences et justifie
de sacrifier un placement sous-optimal pour maintenir l'alignement a-mid-c.

**Option 2 — Bonus sur la ressource consommée plutôt que produite** : une chaîne qui réduit la
consommation de −15% (ex. : le Fourneau encadré consomme `bois:1.7/s` au lieu de `bois:2/s`) a
un effet immédiatement lisible sur le bilan net, là où le joueur regarde déjà.

**Option 3 — Indicateur visuel explicite sur la grille** : ajouter un marqueur visuel (surbrillance,
icône) sur les bâtiments qui forment une chaîne active, avec le pourcentage de bonus affiché en
tooltip. Sans feedback visuel, le joueur ne sait pas si la condition est remplie, ce qui rend la
mécanique opaque même quand elle fonctionne.

**Option 4 — Chaîne à trois niveaux** : distinguer chaîne partielle (a+mid OU mid+c) à +5% et
chaîne complète (a+mid+c) à +20%. Cela crée une progression de décision : le joueur cherche
d'abord le bonus partiel puis optimise pour le bonus complet, rendant la mécanique visible à deux
paliers de jeu différents.

---

## Résumé des priorités

| Priorité | Problème | Correctif recommandé |
|----------|----------|----------------------|
| **Critique** | Deadlock universel bois net=0 après rang 5 | Ajustement 1 : `consume:{bois:1}` sur Fourneau |
| **Critique** | Deadlock secondaire pierre net=0 après rang 6 | Ajustement 4 : `consume:{pierre:1}` sur Briqueterie |
| **Élevée** | Spec Bio malus métal pénalise tous les axes | Ajustement 3 : malus sur nourriture, pas métal |
| **Moyenne** | Axe Énergie 2 bâtiments plus long, détour caché | Ajustement 5 option A ou B sur Cristalliseur |
| **Faible** | CHAINS invisible, +10% trop faible | Monter à +20% et ajouter feedback visuel |
