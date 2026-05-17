# Grid Foundry — Rapport d'analyse statique

> Basé sur `game-data.json` : 25 ressources, 27 bâtiments, 3 axes de victoire.
> Date : 2026-05-17

---

## 1. Ratios de production (produce/s ÷ consume/s)

Pour chaque bâtiment qui consomme ET produit, le ratio est calculé entre chaque ressource produite et chaque ressource consommée. Un ratio < 1 indique que le bâtiment "compresse" le débit : il faut plusieurs sources de la ressource consommée pour alimenter un seul de ces bâtiments.

### Bâtiments avec ratio < 1 (goulots d'étranglement unitaires)

| Bâtiment | Ressource produite | Ressource consommée | Ratio |
|---|---|---|---|
| Fourneau | charbon (1/s) | bois (2/s) | **0.50** |
| Briqueterie | brique (1/s) | pierre (2/s) | **0.50** |
| Cantine | ouvrier (1/s) | nourriture (2/s) | **0.50** |
| Fonderie avancée | alliage (1/s) | métal (2/s) | **0.50** |
| Laboratoire quantique | calcul (1/s) | énergie (2/s) | **0.50** |
| Centre de calcul | ordinateur (1/s) | calcul (2/s) | **0.50** |
| Centre de calcul | ordinateur (1/s) | circuit (2/s) | **0.50** |
| **Centre de calcul** | **ordinateur (1/s)** | **énergie (3/s)** | **0.33** |
| Bio-réacteur | biomasse (1/s) | nourriture (2/s) | **0.50** |
| Incubateur | cellule (1/s) | nourriture (2/s) | **0.50** |
| Chambre d'évolution | organisme (1/s) | énergie (2/s) | **0.50** |
| Nexus organique | conscience (1/s) | ADN (2/s) | **0.50** |
| **Nexus organique** | **conscience (1/s)** | **énergie (3/s)** | **0.33** |
| Stabilisateur | énergie stable (1/s) | énergie (2/s) | **0.50** |
| Réacteur stellaire | réacteur stellaire (1/s) | cristal (2/s) | **0.50** |
| **Réacteur stellaire** | **réacteur stellaire (1/s)** | **énergie stable (3/s)** | **0.33** |

### Bâtiments avec tous les ratios ≥ 1

| Bâtiment | Résumé |
|---|---|
| Forge | métal/pierre=1.0, métal/charbon=1.0 |
| Générateur | énergie/charbon=1.0, énergie/eau=1.0 |
| Atelier | outil/métal=1.0, outil/bois=1.0 |
| Usine | machine/métal=1.0, machine/outil=1.0, machine/énergie=1.0 |
| Circuiterie | circuit/alliage=1.0, circuit/énergie=1.0, circuit/outil=1.0 |
| Laboratoire ADN | ADN/biomasse=1.0, ADN/énergie=1.0 |
| Chambre antimatière | antimatière/cristal=1.0, antimatière/énergie stable=1.0, antimatière/plasma=1.0 |
| Réacteur plasma | plasma/énergie stable=1.0, plasma/charbon=1.0 |
| Cristalliseur | cristal/plasma=1.0, cristal/alliage=1.0 |

### Anomalies notables

- **Le Centre de calcul, le Nexus organique et le Réacteur stellaire affichent tous un ratio de 0.33 sur leur ressource énergétique** (consomment 3/s pour produire 1/s). Ce sont les trois bâtiments de fin de chaîne — chacun nécessite au minimum 3-4 générateurs dédiés pour fonctionner à plein régime.
- Le Fourneau (ratio charbon/bois = 0.5) impose un ratio 2:1 de Scieries par Fourneau. Compte tenu que la Forge et le Générateur consomment chacun 1 charbon/s, **un seul Fourneau alimente un seul Forge ou un seul Générateur, jamais les deux simultanément**.

---

## 2. Profondeur de chaîne par axe

### Chemin commun (tous axes)

**Ère Pionnière** (8 bâtiments) :
`scierie → carriere → puits → ferme → fourneau → briqueterie → cantine → centreville`

**Ère Industrielle** (4 bâtiments) :
`forge → generateur → atelier → hub`

Sous-total commun : **12 bâtiments**, **11 objectifs** (OBJ_COMMON complet).

Note : l'expansion 5×5 requiert de payer machine×20, ce qui impose la construction d'une **Usine** sur tous les axes (objectif "Étendre l'industrie en 5×5" présent dans OBJ_AXIS pour les 3 axes).

---

### Axe Métal / Technologie

**Objectif final** : "Construire un Ordinateur quantique" (`win: true`) — **OBJ_AXIS.metal : 10 objectifs**

**Bâtiments spécifiques** : `usine → fonderie → circuiterie → labquantique → centrecalcul`

Chaîne de consommation :
- `centrecalcul` consomme : calcul×2, circuit×2, énergie×3
- `labquantique` consomme : circuit×1, énergie×2, alliage×1
- `circuiterie` consomme : alliage×1, énergie×1, outil×1
- `fonderie` consomme : métal×2, énergie×1 (construction nécessite machine×20 → Usine)
- `usine` consomme : métal×1, outil×1, énergie×1

**Total Axe Métal : 17 bâtiments, 21 objectifs (11 communs + 10 axe)**

---

### Axe Bio / Organisme

**Objectif final** : "Produire une conscience organique" (`win: true`) — **OBJ_AXIS.bio : 7 objectifs**

**Bâtiments spécifiques** : `usine → bioreacteur → labadn → incubateur → chambreevo → nexus`

Chaîne de consommation :
- `nexus` consomme : organisme×1, ADN×2, énergie×3
- `chambreevo` consomme : cellule×1, biomasse×1, énergie×2
- `incubateur` consomme : ADN×1, nourriture×2, énergie×1
- `labadn` consomme : biomasse×1, énergie×1
- `bioreacteur` consomme : nourriture×2, eau×1
- `usine` requise uniquement pour l'expansion 5×5 (machine×20)

**Total Axe Bio : 18 bâtiments, 18 objectifs (11 communs + 7 axe)**

---

### Axe Énergie / Fusion

**Objectif final** : "Construire un Réacteur stellaire" (`win: true`) — **OBJ_AXIS.energie : 7 objectifs**

**Bâtiments spécifiques** : `usine → fonderie → stabilisateur → reacteurplasma → cristalliseur → chambreantimatiere → reacteurstellaire`

Chaîne de consommation :
- `reacteurstellaire` consomme : antimatière×1, cristal×2, énergie stable×3
- `chambreantimatiere` consomme : cristal×1, énergie stable×1, plasma×1
- `cristalliseur` consomme : plasma×1, alliage×1 ← **nécessite Fonderie avancée**
- `fonderie` consomme : métal×2, énergie×1 (construction nécessite machine×20 → Usine)
- `reacteurplasma` consomme : énergie stable×1, charbon×1
- `stabilisateur` consomme : énergie×2, eau×1

**Total Axe Énergie : 19 bâtiments, 18 objectifs (11 communs + 7 axe)**

---

### Tableau récapitulatif

| Axe | Bâtiments total | Objectifs total | Bâtiments spécifiques |
|---|---|---|---|
| Métal | 17 | 21 | 5 (usine, fonderie, circuiterie, labquantique, centrecalcul) |
| Bio | 18 | 18 | 6 (usine, bioreacteur, labadn, incubateur, chambreevo, nexus) |
| Énergie | 19 | 18 | 7 (usine, fonderie, stabilisateur, reacteurplasma, cristalliseur, chambreantimatiere, reacteurstellaire) |

**Anomalie : L'axe Énergie requiert 19 bâtiments contre 17 pour l'axe Métal, pour un nombre d'objectifs axe inférieur (7 vs 10).** L'axe Énergie impose un détour par Fonderie + Usine à cause du cristalliseur qui consomme de l'alliage, ce qui n'est pas signalé dans sa description ("Axe Énergie — cristallise l'énergie").

---

## 3. Rendements décroissants

`EFF = [1.0, 0.92, 0.84, 0.76, 0.68]` — plateau permanent à partir du 5e exemplaire.

Rendement marginal par copie : Copie 1 = +1.0 / Copie 2 = +0.92 / Copie 3 = +0.84 / Copie 4 = +0.76 / **Copie 5+ = +0.68 (plateau)**.

### Ressources goulot (consommées par plusieurs chaînes)

**Énergie** (produite par le Générateur) : consommée par 10 bâtiments distincts — usine (1/s), fonderie (1/s), circuiterie (1/s), labquantique (2/s), centrecalcul (3/s), labadn (1/s), incubateur (1/s), chambreevo (2/s), nexus (3/s), stabilisateur (2/s). **Ressource la plus demandée du jeu.**

**Métal** (produit par la Forge) : consommé par atelier (1/s), usine (1/s), fonderie (2/s) → 4 métal/s de demande maximale.

**Charbon** (produit par le Fourneau) : consommé par forge (1/s), générateur (1/s), réacteur plasma (1/s) → 3 charbon/s de demande maximale.

### Seuil de rentabilité marginale

#### Générateur (produit énergie : 1/s, coût : métal×30 + pierre×20)

| Copie | Énergie/s marginale | Cumul |
|---|---|---|
| 1 | 1.00 | 1.00 |
| 2 | 0.92 | 1.92 |
| 3 | 0.84 | 2.76 |
| 4 | 0.76 | 3.52 |
| **5** | **0.68** | **4.20** |
| 6+ | 0.68 | +0.68/copie |

Pour alimenter un Centre de calcul / Nexus / Réacteur stellaire (3 énergie/s chacun), il faut dédier 4 Générateurs à ce seul bâtiment (cumul 3.52/s). **À partir de la 5e copie, le rendement marginal plafonne à 0.68 et ne s'améliore plus.**

#### Forge (produit métal : 1/s, coût : pierre×30 + charbon×20 + brique×10)

| Copie | Métal/s marginal | Cumul |
|---|---|---|
| 1 | 1.00 | 1.00 |
| 2 | 0.92 | 1.92 |
| 3 | 0.84 | 2.76 |
| **4** | **0.76** | **3.52** |
| 5+ | 0.68 | plateau |

La Fonderie consomme 2 métal/s : il faut 3 Forges (2.76/s) pour en alimenter une seule. **À partir de la 4e Forge, le rendement marginal tombe sous 0.80** — justifiable uniquement si la demande totale en métal dépasse 2.76/s (atelier + usine + fonderie = 4/s théoriques).

#### Fourneau (produit charbon : 1/s, coût : pierre×20 + bois×10)

| Copie | Charbon/s marginal | Cumul |
|---|---|---|
| 1 | 1.00 | 1.00 |
| 2 | 0.92 | 1.92 |
| 3 | 0.84 | 2.76 |
| 4 | 0.76 | 3.52 |
| **5** | **0.68** | **4.20** |
| 6+ | 0.68 | plateau |

Avec Forge + Générateur + Réacteur plasma simultanés = 3 charbon/s requis → 4 Fourneaux (3.52/s) couvrent exactement. **Le 5e Fourneau (0.68 charbon/s supplémentaire) est superflu** pour ces trois consommateurs ; il ne se justifie qu'avec la spec Énergie (+20% charbon) ou de nombreuses adjacences.

### Synthèse

| Bâtiment goulot | Copie critique | Raison |
|---|---|---|
| Générateur | **Copie 5** (plateau 0.68/s) | 4-5 générateurs nécessaires pour les fins de chaîne (3 énergie/s) |
| Forge | **Copie 4** (0.76/s) | 3 forges pour alimenter 1 fonderie ; 4e forge en-dessous de 0.80/s |
| Fourneau | **Copie 5** (plateau 0.68/s) | 4 fourneaux couvrent les 3 consommateurs ; 5e superflu |

---

## 4. Bonus d'adjacence maximum potentiel

Pour chaque bâtiment dans ADJACENCY, somme de tous les `pct` positifs (qu'ils s'appliquent à self ou nb).

### Classement des 5 meilleurs

| Rang | Bâtiment | Somme pct positifs | Détail |
|---|---|---|---|
| 1 | **Générateur** | **+75%** | +15% (puits/eau cons), +15% (fourneau/énergie self), +25% (usine/machine nb), +20% (réacteurplasma/plasma nb) |
| 2 | **Forge** | **+70%** | +25% (fourneau/métal self), +10% (carrière/métal self), +10% (générateur/métal self), +25% (atelier/outil nb) |
| 3 | **Puits** | **+60%** | +25% (ferme/nourriture nb), +10% (générateur/énergie nb), +15% (stabilisateur/énergie stable nb), +10% (centreville/eau self) |
| 4 | **Usine** | **+55%** | +25% (générateur/machine self), +10% (atelier/machine self), +20% (circuiterie/circuit nb) |
| 5 | **Ferme / Fourneau / Circuiterie / Labquantique** | **+50%** | (ex æquo) |

**Détail du groupe à +50%** :
- Ferme : +25% (puits→nourriture self) + 15% (cantine→ouvrier nb) + 10% (centreville→nourriture self)
- Fourneau : +15% (scierie→charbon self) + 25% (forge→métal nb) + 10% (centreville→charbon self)
- Circuiterie : +20% (usine→circuit self) + 10% (générateur→circuit self) + 20% (labquantique→calcul nb)
- Labquantique : +20% (circuiterie→calcul self) + 10% (générateur→calcul self) + 20% (centrecalcul→ordinateur nb)

### Anomalie

**Le Générateur (75%) est simultanément le bâtiment avec le plus grand bonus d'adjacence ET la ressource produite la plus demandée du jeu.** Son placement optimal (adjacent à Fourneau + Usine + Réacteur plasma) maximise à la fois sa propre production d'énergie et les productions de ses voisins. **Aucun autre bâtiment ne dépasse 60%.**

---

## 5. Comparaison des spécialisations (SPECS)

### Détail des modificateurs

| Spécialisation | Bonus 1 | Bonus 2 | Bonus 3 | Malus |
|---|---|---|---|---|
| Métal / Technologie | métal ×1.2 (+20%) | outil ×1.2 (+20%) | circuit ×1.15 (+15%) | nourriture ×0.9 (−10%) |
| Bio / Organisme | nourriture ×1.2 (+20%) | ouvrier ×1.2 (+20%) | biomasse ×1.15 (+15%) | métal ×0.9 (−10%) |
| Énergie / Fusion | énergie ×1.2 (+20%) | charbon ×1.2 (+20%) | plasma ×1.15 (+15%) | bois ×0.9 (−10%) |

### Score net brut

| Spécialisation | Somme bonus | Malus | Net |
|---|---|---|---|
| Métal | +55% | −10% | **+45%** |
| Bio | +55% | −10% | **+45%** |
| Énergie | +55% | −10% | **+45%** |

**Les trois specs sont parfaitement symétriques arithmétiquement.** L'avantage différentiel vient de l'impact pratique des malus :

**Spec Métal** (malus nourriture −10%) : Sur l'axe Métal, Bio-réacteur et Incubateur (seuls autres consommateurs de nourriture) ne sont jamais construits. Le malus ne touche que la Cantine. **Impact : faible.**

**Spec Bio** (malus métal −10%) : Le métal est consommé en continu par Atelier (1/s), Usine (1/s) et Fonderie (2/s), et requis pour construire forge, hub, générateur, atelier. Ce malus ralentit l'accès aux ressources T2 et T3 sur tous les axes. **Impact : fort — c'est le malus le plus pénalisant.**

**Spec Énergie** (malus bois −10%) : Le bois n'est consommé en continu que par l'Atelier (1/s), et ses usages de construction se concentrent sur l'ère pionnière. Dès T2, le bois devient quasi-inutile. **Impact : négligeable en milieu/fin de partie.** De plus, l'énergie boostée à +20% est la ressource la plus demandée du jeu.

### Verdict final

| Critère | Métal | Bio | Énergie |
|---|---|---|---|
| Score net brut | +45% | +45% | +45% |
| Impact réel du malus | Faible (nourriture, hors-axe) | **Fort (métal, transversal T2)** | Négligeable (bois, obsolète T3) |
| Ressource boostée la plus utile | circuit (T3 fin de chaîne) | biomasse (T3 intermédiaire) | **énergie (T2, 10 consommateurs)** |
| Avantage net pratique | Bon | Pénalisé | **Meilleur** |

**Anomalie : malgré un score brut identique (+45%), la spec Énergie offre l'avantage net pratique le plus favorable.** Elle booste l'énergie (+20%), ressource la plus consommée du jeu (10 bâtiments), et pénalise le bois qui devient quasi-inutile dès T2. **La spec Bio est structurellement désavantagée** : son malus sur le métal impacte une ressource transversale critique dès l'ère industrielle, y compris sur l'axe Bio lui-même.

---

## Résumé des anomalies détectées

| # | Anomalie | Section |
|---|---|---|
| 1 | **Centre de calcul, Nexus, Réacteur stellaire : ratio énergie = 0.33** (3/s consommée pour 1/s produite) — contrainte maximale partagée par les 3 fins de chaîne | §1 |
| 2 | **L'axe Énergie nécessite 19 bâtiments vs 17 pour Métal**, pour un nombre d'objectifs inférieur (7 vs 10) | §2 |
| 3 | **Le Cristalliseur (axe Énergie) consomme de l'alliage**, imposant un détour par Fonderie+Usine non mentionné dans sa description | §2 |
| 4 | **Le Générateur est le bâtiment le plus stratégiquement dense** : +75% de bonus d'adjacence ET goulot de la ressource la plus demandée (10 consommateurs) | §3 & §4 |
| 5 | **La spec Bio pénalise le métal** (−10%), ressource transversale T2 requise sur tous les axes dès l'ère industrielle — malus structurellement plus lourd que nourriture (Métal) ou bois (Énergie) | §5 |
| 6 | **5e Fourneau superflu** : 4 Fourneaux (cumul 3.52/s) couvrent les 3 consommateurs simultanés (3/s) ; le 5e à 0.68/s ne se justifie qu'avec spec Énergie ou fortes adjacences | §3 |
