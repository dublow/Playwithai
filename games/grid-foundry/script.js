"use strict";
/* =====================================================================
   GRID FOUNDRY — puzzle industriel stratégique compact
   Architecture data-driven : RESOURCES / BUILDINGS / ADJACENCY / CHAINS
   / SPECS / OBJECTIVES / TIERS. Aucune règle n'est codée en dur ailleurs.
   ===================================================================== */

/* ---------------------- RESOURCES ---------------------- */
const RESOURCES = {
  bois:        {name:"Bois",                 icon:"forest",                   cls:"",    base:true},
  pierre:      {name:"Pierre",               icon:"terrain",                  cls:"",    base:true},
  nourriture:  {name:"Nourriture",           icon:"agriculture",              cls:"",    base:true},
  eau:         {name:"Eau",                  icon:"water_drop",               cls:"",    base:true},

  charbon:     {name:"Charbon",              icon:"local_fire_department",    cls:"t1"},
  brique:      {name:"Brique",               icon:"grid_view",               cls:"t1"},
  ouvrier:     {name:"Ouvrier",              icon:"engineering",              cls:"t1"},

  metal:       {name:"Métal",                icon:"hardware",                cls:"t2"},
  energie:     {name:"Énergie",              icon:"bolt",                    cls:"t2"},
  outil:       {name:"Outil",                icon:"build",                   cls:"t2"},

  machine:     {name:"Machine",              icon:"precision_manufacturing", cls:"t3"},
  alliage:     {name:"Alliage",              icon:"layers",                  cls:"t3"},
  circuit:     {name:"Circuit",              icon:"memory",                  cls:"t3"},

  calcul:      {name:"Calcul quantique",     icon:"blur_on",                 cls:"fin"},
  ordinateur:  {name:"Ordinateur quantique", icon:"computer",                cls:"fin"},

  biomasse:    {name:"Biomasse",             icon:"compost",                 cls:"t3"},
  adn:         {name:"ADN",                  icon:"biotech",                 cls:"t3"},
  cellule:     {name:"Cellule avancée",      icon:"bubble_chart",            cls:"fin"},
  organisme:   {name:"Organisme synthétique",icon:"potted_plant",            cls:"fin"},
  conscience:  {name:"Conscience organique", icon:"psychology",              cls:"fin"},

  energieStable:{name:"Énergie stable",      icon:"battery_charging_full",   cls:"t3"},
  plasma:      {name:"Plasma",               icon:"flare",                   cls:"t3"},
  cristal:     {name:"Cristal énergétique",  icon:"diamond",                 cls:"fin"},
  antimatiere: {name:"Antimatière",          icon:"scatter_plot",            cls:"fin"},
  reacteurStellaire:{name:"Réacteur stellaire",icon:"auto_awesome",          cls:"fin"},
};

/* ---------------------- BUILDINGS ----------------------
   tier : palier requis pour construire (1,2,3)
   tag  : 't1' base industrielle | 't2' | 't3' | 'civic'
   cost / consume(/sec) / produce(/sec) — valeurs EXACTES du cahier
   unlock : palier débloqué une fois construit                          */
const BUILDINGS = {
  scierie:    {name:"Scierie",       icon:"forest",                tier:1, tag:"t1",
    desc:"Exploite la forêt locale et produit du bois en continu.",
    cost:{bois:10,pierre:5}, produce:{bois:1}},
  carriere:   {name:"Carrière",      icon:"terrain",               tier:1, tag:"t1",
    desc:"Extrait la pierre du gisement local.",
    cost:{bois:10,pierre:5}, produce:{pierre:1}},
  puits:      {name:"Puits",         icon:"water_drop",            tier:1, tag:"t1",
    desc:"Puise l'eau d'une source locale.",
    cost:{pierre:8}, produce:{eau:1}},
  ferme:      {name:"Ferme",         icon:"agriculture",           tier:1, tag:"t1",
    desc:"Cultive la nourriture. Adore la proximité de l'eau.",
    cost:{bois:15,eau:5}, produce:{nourriture:1}},
  fourneau:   {name:"Fourneau",      icon:"local_fire_department", tier:1, tag:"t1",
    desc:"Transforme le bois en charbon.",
    cost:{pierre:20,bois:10}, consume:{bois:2}, produce:{charbon:1}},
  briqueterie:{name:"Briqueterie",   icon:"grid_view",            tier:1, tag:"t1",
    desc:"Cuit la pierre et l'eau en briques.",
    cost:{pierre:20,bois:10}, consume:{pierre:2,eau:1}, produce:{brique:1}},
  cantine:    {name:"Cantine",       icon:"restaurant",           tier:1, tag:"t1",
    desc:"Nourrit et forme des ouvriers.",
    cost:{bois:15,pierre:10}, consume:{nourriture:2,eau:1}, produce:{ouvrier:1}},
  centreville:{name:"Centre-ville",  icon:"location_city",        tier:1, tag:"civic",
    desc:"Cœur de la colonie. Débloque le Tier 2 et l'expansion 4×4. +10% aux bâtiments Tier 1/2 adjacents.",
    cost:{bois:50,pierre:40,brique:20,ouvrier:10}, unlock:2},

  forge:      {name:"Forge",         icon:"hardware",             tier:2, tag:"t2",
    desc:"Fond la pierre et le charbon en métal.",
    cost:{pierre:30,charbon:20,brique:10}, consume:{pierre:1,charbon:1}, produce:{metal:1}},
  generateur: {name:"Générateur",    icon:"bolt",                 tier:2, tag:"t2",
    desc:"Brûle le charbon pour produire de l'énergie.",
    cost:{metal:30,pierre:20}, consume:{charbon:1,eau:1}, produce:{energie:1}},
  atelier:    {name:"Atelier",       icon:"build",                tier:2, tag:"t2",
    desc:"Façonne le métal en outils.",
    cost:{bois:25,metal:15}, consume:{metal:1,bois:1}, produce:{outil:1}},
  hub:        {name:"Hub industriel",icon:"hub",                  tier:2, tag:"civic",
    desc:"Débloque le Tier 3 et l'expansion 5×5. +10% aux bâtiments industriels adjacents.",
    cost:{metal:40,outil:25,energie:30,brique:20}, unlock:3},

  usine:      {name:"Usine",         icon:"factory",              tier:3, tag:"t3",
    desc:"Assemble des machines.",
    cost:{metal:50,outil:30,energie:30}, consume:{metal:1,outil:1,energie:1}, produce:{machine:1}},
  fonderie:   {name:"Fonderie avancée",icon:"layers",             tier:3, tag:"t3",
    desc:"Coule des alliages haute performance.",
    cost:{metal:40,energie:40,machine:20}, consume:{metal:2,energie:1}, produce:{alliage:1}},
  circuiterie:{name:"Fabrique de circuits",icon:"memory",         tier:3, tag:"t3",
    desc:"Grave des circuits intégrés.",
    cost:{alliage:30,energie:30,outil:20}, consume:{alliage:1,energie:1,outil:1}, produce:{circuit:1}},
  labquantique:{name:"Laboratoire quantique",icon:"science",      tier:3, tag:"t3",
    desc:"Axe Métal — calcule en superposition quantique.",
    cost:{circuit:40,energie:50,alliage:30}, consume:{circuit:1,energie:2,alliage:1}, produce:{calcul:1}},
  centrecalcul:{name:"Centre de calcul",icon:"computer",          tier:3, tag:"t3",
    desc:"Axe Métal — bâtit l'ordinateur quantique. Objectif final Métal.",
    cost:{calcul:30,circuit:50,energie:100,alliage:40}, consume:{calcul:2,circuit:2,energie:3}, produce:{ordinateur:1}},

  bioreacteur:{name:"Bio-réacteur",  icon:"compost",              tier:3, tag:"t3",
    desc:"Axe Bio — fermente la biomasse.",
    cost:{bois:30,eau:20,ouvrier:15}, consume:{nourriture:2,eau:1}, produce:{biomasse:1}},
  labadn:     {name:"Laboratoire ADN",icon:"biotech",             tier:3, tag:"t3",
    desc:"Axe Bio — séquence de l'ADN.",
    cost:{biomasse:30,energie:30,outil:20}, consume:{biomasse:1,energie:1}, produce:{adn:1}},
  incubateur: {name:"Incubateur",    icon:"bubble_chart",         tier:3, tag:"t3",
    desc:"Axe Bio — fait croître des cellules avancées.",
    cost:{adn:30,nourriture:30,energie:20}, consume:{adn:1,nourriture:2,energie:1}, produce:{cellule:1}},
  chambreevo: {name:"Chambre d'évolution",icon:"genetics",        tier:3, tag:"t3",
    desc:"Axe Bio — façonne des organismes synthétiques.",
    cost:{cellule:30,biomasse:30,energie:40}, consume:{cellule:1,biomasse:1,energie:2}, produce:{organisme:1}},
  nexus:      {name:"Nexus organique",icon:"psychology",          tier:3, tag:"t3",
    desc:"Axe Bio — éveille une conscience organique. Objectif final Bio.",
    cost:{organisme:25,adn:40,energie:80}, consume:{organisme:1,adn:2,energie:3}, produce:{conscience:1}},

  stabilisateur:{name:"Stabilisateur",icon:"battery_charging_full",tier:3, tag:"t3",
    desc:"Axe Énergie — stabilise l'énergie.",
    cost:{metal:40,energie:40,eau:20}, consume:{energie:2,eau:1}, produce:{energieStable:1}},
  reacteurplasma:{name:"Réacteur plasma",icon:"flare",            tier:3, tag:"t3",
    desc:"Axe Énergie — confine du plasma.",
    cost:{energieStable:30,metal:40,charbon:30}, consume:{energieStable:1,charbon:1}, produce:{plasma:1}},
  cristalliseur:{name:"Cristalliseur",icon:"diamond",             tier:3, tag:"t3",
    desc:"Axe Énergie — cristallise l'énergie.",
    cost:{plasma:30,alliage:30,energie:40}, consume:{plasma:1,alliage:1}, produce:{cristal:1}},
  chambreantimatiere:{name:"Chambre antimatière",icon:"scatter_plot",tier:3, tag:"t3",
    desc:"Axe Énergie — synthétise de l'antimatière.",
    cost:{cristal:30,energieStable:30,plasma:30}, consume:{cristal:1,energieStable:1,plasma:1}, produce:{antimatiere:1}},
  reacteurstellaire:{name:"Réacteur stellaire",icon:"auto_awesome",tier:3, tag:"t3",
    desc:"Axe Énergie — allume un réacteur stellaire. Objectif final Énergie.",
    cost:{antimatiere:25,cristal:40,energieStable:60}, consume:{antimatiere:1,cristal:2,energieStable:3}, produce:{reacteurStellaire:1}},
};

const BUILD_ORDER = [
  ["Tier 1 — Base", ["scierie","carriere","puits","ferme","fourneau","briqueterie","cantine","centreville"]],
  ["Tier 2 — Industrie", ["forge","generateur","atelier","hub"]],
  ["Tier 3 — Avancé", ["usine","fonderie","circuiterie"]],
  ["Axe Métal / Technologie", ["labquantique","centrecalcul"]],
  ["Axe Bio / Organisme", ["bioreacteur","labadn","incubateur","chambreevo","nexus"]],
  ["Axe Énergie / Fusion", ["stabilisateur","reacteurplasma","cristalliseur","chambreantimatiere","reacteurstellaire"]],
];

/* ---------------------- ADJACENCY ----------------------
   { near, tgt:'self'|'nb', res, pct }  pct<0 = malus
   { near, tgt, res, cons:true, pct }   réduction de conso (pct%)        */
const ADJACENCY = {
  scierie:[
    {near:"centreville",tgt:"self",res:"bois",pct:10},
    {near:"fourneau",tgt:"nb",res:"charbon",pct:10},
    {near:"generateur",tgt:"self",res:"bois",pct:-10},
  ],
  carriere:[
    {near:"briqueterie",tgt:"nb",res:"brique",pct:15},
    {near:"forge",tgt:"nb",res:"metal",pct:10},
    {near:"centreville",tgt:"self",res:"pierre",pct:10},
  ],
  ferme:[
    {near:"puits",tgt:"self",res:"nourriture",pct:25},
    {near:"cantine",tgt:"nb",res:"ouvrier",pct:15},
    {near:"centreville",tgt:"self",res:"nourriture",pct:10},
    {near:"fourneau",tgt:"self",res:"nourriture",pct:-20},
    {near:"generateur",tgt:"self",res:"nourriture",pct:-15},
    {near:"usine",tgt:"self",res:"nourriture",pct:-20},
  ],
  puits:[
    {near:"ferme",tgt:"nb",res:"nourriture",pct:25},
    {near:"generateur",tgt:"nb",res:"energie",pct:10},
    {near:"stabilisateur",tgt:"nb",res:"energieStable",pct:15},
    {near:"centreville",tgt:"self",res:"eau",pct:10},
  ],
  fourneau:[
    {near:"scierie",tgt:"self",res:"charbon",pct:15},
    {near:"forge",tgt:"nb",res:"metal",pct:25},
    {near:"centreville",tgt:"self",res:"charbon",pct:10},
  ],
  briqueterie:[
    {near:"carriere",tgt:"self",res:"brique",pct:20},
    {near:"puits",tgt:"self",res:"eau",cons:true,pct:10},
    {near:"centreville",tgt:"self",res:"brique",pct:10},
  ],
  cantine:[
    {near:"ferme",tgt:"self",res:"ouvrier",pct:20},
    {near:"puits",tgt:"self",res:"ouvrier",pct:10},
    {near:"centreville",tgt:"self",res:"ouvrier",pct:10},
  ],
  forge:[
    {near:"fourneau",tgt:"self",res:"metal",pct:25},
    {near:"carriere",tgt:"self",res:"metal",pct:10},
    {near:"generateur",tgt:"self",res:"metal",pct:10},
    {near:"atelier",tgt:"nb",res:"outil",pct:25},
  ],
  generateur:[
    {near:"puits",tgt:"self",res:"eau",cons:true,pct:15},
    {near:"fourneau",tgt:"self",res:"energie",pct:15},
    {near:"usine",tgt:"nb",res:"machine",pct:25},
    {near:"reacteurplasma",tgt:"nb",res:"plasma",pct:20},
  ],
  atelier:[
    {near:"forge",tgt:"self",res:"outil",pct:25},
    {near:"usine",tgt:"nb",res:"machine",pct:10},
    {near:"scierie",tgt:"self",res:"bois",cons:true,pct:10},
  ],
  usine:[
    {near:"generateur",tgt:"self",res:"machine",pct:25},
    {near:"atelier",tgt:"self",res:"machine",pct:10},
    {near:"circuiterie",tgt:"nb",res:"circuit",pct:20},
  ],
  fonderie:[
    {near:"forge",tgt:"self",res:"alliage",pct:20},
    {near:"generateur",tgt:"self",res:"alliage",pct:10},
  ],
  circuiterie:[
    {near:"usine",tgt:"self",res:"circuit",pct:20},
    {near:"generateur",tgt:"self",res:"circuit",pct:10},
    {near:"labquantique",tgt:"nb",res:"calcul",pct:20},
  ],
  labquantique:[
    {near:"circuiterie",tgt:"self",res:"calcul",pct:20},
    {near:"generateur",tgt:"self",res:"calcul",pct:10},
    {near:"centrecalcul",tgt:"nb",res:"ordinateur",pct:20},
  ],
  centrecalcul:[
    {near:"labquantique",tgt:"self",res:"ordinateur",pct:20},
    {near:"circuiterie",tgt:"self",res:"ordinateur",pct:10},
    {near:"generateur",tgt:"self",res:"ordinateur",pct:10},
  ],
  bioreacteur:[
    {near:"ferme",tgt:"self",res:"biomasse",pct:20},
    {near:"puits",tgt:"self",res:"biomasse",pct:15},
    {near:"generateur",tgt:"self",res:"biomasse",pct:10},
    {near:"fourneau",tgt:"self",res:"biomasse",pct:-15},
  ],
  labadn:[
    {near:"bioreacteur",tgt:"self",res:"adn",pct:20},
    {near:"generateur",tgt:"self",res:"adn",pct:10},
    {near:"forge",tgt:"self",res:"adn",pct:-10},
  ],
  incubateur:[
    {near:"labadn",tgt:"self",res:"cellule",pct:20},
    {near:"ferme",tgt:"self",res:"cellule",pct:15},
    {near:"usine",tgt:"self",res:"cellule",pct:-15},
  ],
  chambreevo:[
    {near:"incubateur",tgt:"self",res:"organisme",pct:20},
    {near:"bioreacteur",tgt:"self",res:"organisme",pct:10},
  ],
  nexus:[
    {near:"chambreevo",tgt:"self",res:"conscience",pct:20},
    {near:"labadn",tgt:"self",res:"conscience",pct:10},
  ],
  stabilisateur:[
    {near:"generateur",tgt:"self",res:"energieStable",pct:20},
    {near:"puits",tgt:"self",res:"energieStable",pct:15},
  ],
  reacteurplasma:[
    {near:"generateur",tgt:"self",res:"plasma",pct:20},
    {near:"stabilisateur",tgt:"self",res:"plasma",pct:15},
  ],
  cristalliseur:[
    {near:"reacteurplasma",tgt:"self",res:"cristal",pct:20},
    {near:"fonderie",tgt:"self",res:"cristal",pct:15},
  ],
  chambreantimatiere:[
    {near:"cristalliseur",tgt:"self",res:"antimatiere",pct:20},
    {near:"stabilisateur",tgt:"self",res:"antimatiere",pct:15},
  ],
  reacteurstellaire:[
    {near:"chambreantimatiere",tgt:"self",res:"reacteurStellaire",pct:20},
    {near:"cristalliseur",tgt:"self",res:"reacteurStellaire",pct:10},
    {near:"stabilisateur",tgt:"self",res:"reacteurStellaire",pct:10},
  ],
};
/* Centre-ville / Hub : effet générique géré dans computeBonuses() */

/* ---------------------- CHAINS ----------------------
   mid adjacent à `a` ET à `c` -> +pct sur `res` du bâtiment `at`        */
const CHAINS = [
  {name:"Chaîne métal",    mid:"forge",        a:"fourneau",    c:"atelier",      res:"outil",      at:"atelier",      pct:10},
  {name:"Chaîne machines", mid:"usine",        a:"generateur",  c:"circuiterie",  res:"circuit",    at:"circuiterie",  pct:10},
  {name:"Chaîne quantique",mid:"labquantique", a:"circuiterie", c:"centrecalcul", res:"ordinateur", at:"centrecalcul", pct:10},
  {name:"Chaîne bio",      mid:"bioreacteur",  a:"ferme",       c:"labadn",       res:"adn",        at:"labadn",       pct:10},
  {name:"Chaîne énergie",  mid:"stabilisateur",a:"generateur",  c:"reacteurplasma",res:"plasma",    at:"reacteurplasma",pct:10},
];

/* ---------------------- SPECIALISATIONS ---------------------- */
const SPECS = {
  metal:  {name:"Axe Métal / Technologie", icon:"memory",
    mods:{metal:1.20,outil:1.20,circuit:1.15,nourriture:0.90},
    txt:[["metal",20],["outil",20],["circuit",15],["nourriture",-10]]},
  bio:    {name:"Axe Bio / Organisme", icon:"biotech",
    mods:{nourriture:1.20,ouvrier:1.20,biomasse:1.15,metal:0.90},
    txt:[["nourriture",20],["ouvrier",20],["biomasse",15],["metal",-10]]},
  energie:{name:"Axe Énergie / Fusion", icon:"flare",
    mods:{energie:1.20,charbon:1.20,plasma:1.15,bois:0.90},
    txt:[["energie",20],["charbon",20],["plasma",15],["bois",-10]]},
};

/* ---------------------- OBJECTIVES ---------------------- */
const OBJ_COMMON = [
  {ic:"forest",        t:"Récolter du bois",            f:s=>s.total.bois>=10,            g:s=>`${fmt(s.total.bois||0)}/10`},
  {ic:"forest",        t:"Construire une Scierie",      f:s=>cnt("scierie")>=1},
  {ic:"terrain",       t:"Construire une Carrière",     f:s=>cnt("carriere")>=1},
  {ic:"water_drop",    t:"Construire un Puits",         f:s=>cnt("puits")>=1},
  {ic:"agriculture",   t:"Construire une Ferme",        f:s=>cnt("ferme")>=1},
  {ic:"local_fire_department",t:"Produire du charbon",  f:s=>s.total.charbon>=10,         g:s=>`${fmt(s.total.charbon||0)}/10`},
  {ic:"grid_view",     t:"Produire des briques",        f:s=>s.total.brique>=10,          g:s=>`${fmt(s.total.brique||0)}/10`},
  {ic:"engineering",   t:"Produire des ouvriers",       f:s=>s.total.ouvrier>=10,         g:s=>`${fmt(s.total.ouvrier||0)}/10`},
  {ic:"location_city", t:"Construire le Centre-ville",  f:s=>cnt("centreville")>=1},
  {ic:"open_in_full",  t:"Étendre la colonie en 4×4",   f:s=>s.gridSize>=4},
  {ic:"hub",           t:"Choisir une spécialisation",  f:s=>!!s.spec},
];
const OBJ_AXIS = {
  metal:[
    {ic:"hardware",t:"Produire du métal",       f:s=>s.total.metal>=1},
    {ic:"bolt",    t:"Produire de l'énergie",   f:s=>s.total.energie>=1},
    {ic:"build",   t:"Produire des outils",     f:s=>s.total.outil>=1},
    {ic:"hub",     t:"Construire le Hub industriel",f:s=>cnt("hub")>=1},
    {ic:"open_in_full",t:"Étendre l'industrie en 5×5",f:s=>s.gridSize>=5},
    {ic:"precision_manufacturing",t:"Produire une machine",f:s=>s.total.machine>=1},
    {ic:"layers", t:"Produire de l'alliage",    f:s=>s.total.alliage>=1},
    {ic:"memory", t:"Produire un circuit",      f:s=>s.total.circuit>=1},
    {ic:"blur_on",t:"Produire du calcul quantique",f:s=>s.total.calcul>=1},
    {ic:"computer",t:"Construire un Ordinateur quantique",f:s=>s.total.ordinateur>=1,win:true},
  ],
  bio:[
    {ic:"compost",t:"Produire de la biomasse",  f:s=>s.total.biomasse>=1},
    {ic:"biotech",t:"Produire de l'ADN",        f:s=>s.total.adn>=1},
    {ic:"bubble_chart",t:"Produire une cellule avancée",f:s=>s.total.cellule>=1},
    {ic:"hub",    t:"Construire le Hub industriel",f:s=>cnt("hub")>=1},
    {ic:"open_in_full",t:"Étendre l'industrie en 5×5",f:s=>s.gridSize>=5},
    {ic:"genetics",t:"Produire un organisme synthétique",f:s=>s.total.organisme>=1},
    {ic:"psychology",t:"Produire une conscience organique",f:s=>s.total.conscience>=1,win:true},
  ],
  energie:[
    {ic:"battery_charging_full",t:"Produire de l'énergie stable",f:s=>s.total.energieStable>=1},
    {ic:"flare",  t:"Produire du plasma",       f:s=>s.total.plasma>=1},
    {ic:"diamond",t:"Produire un cristal énergétique",f:s=>s.total.cristal>=1},
    {ic:"hub",    t:"Construire le Hub industriel",f:s=>cnt("hub")>=1},
    {ic:"open_in_full",t:"Étendre l'industrie en 5×5",f:s=>s.gridSize>=5},
    {ic:"scatter_plot",t:"Produire de l'antimatière",f:s=>s.total.antimatiere>=1},
    {ic:"auto_awesome",t:"Construire un Réacteur stellaire",f:s=>s.total.reacteurStellaire>=1,win:true},
  ],
};

/* ---------------------- EXPANSION ---------------------- */
const EXPAND = {
  4:{label:"Étendre la colonie",
     need:{produced:{bois:100,pierre:50,brique:20,ouvrier:10}, build:"centreville"},
     cost:{brique:30,ouvrier:20,metal:10}},
  5:{label:"Étendre l'industrie",
     need:{produced:{metal:1,energie:1,outil:1}, build:"hub"},
     cost:{brique:50,ouvrier:30,energie:30,machine:20}},
};

/* rendements décroissants par exemplaire d'un même type */
const EFF = [1, 0.85, 0.70, 0.55, 0.40];
const effFactor = i => EFF[Math.min(i, EFF.length - 1)];

/* caps voisinage */
const CAP_SINGLE = 25, CAP_POS = 50, CAP_NEG = 40, CAP_CONS = 40;

const RESERVE_MAX = {bois:400, pierre:320, nourriture:260, eau:480};
const CLICK_BASE  = {bois:3,   pierre:3,   nourriture:2,   eau:3};
const SOS_GIVE    = {bois:30,  pierre:30,  nourriture:20,  eau:25};
const SOS_CD = 90;
const SAVE_KEY = "gridfoundry.v1";
const OFFLINE_CAP = 600;

/* ===================== STATE ===================== */
let S;
function freshState(){
  return {
    gridSize:3, tierUnlocked:1, spec:null,
    stock:{bois:25, pierre:15}, total:{}, won:false,
    reserve:{bois:RESERVE_MAX.bois, pierre:RESERVE_MAX.pierre,
             nourriture:RESERVE_MAX.nourriture, eau:RESERVE_MAX.eau},
    buildings:[], nextOrder:1,
    objIdx:0, axisIdx:0,
    sosCD:0, logs:[], lastSave:Date.now(),
  };
}

/* transient UI */
const UI = {tab:"build", selected:null, inspect:null, hover:null};
let NET = {};            // débit net /sec calculé chaque tick
let ACTIVE = {};         // id -> bool (bâtiment actif ce tick)
let MULT = {};           // id -> multiplicateur de production effectif (affichage)

/* ===================== HELPERS ===================== */
const $  = s => document.querySelector(s);
function fmt(n){
  n = Math.floor(n);
  if(n>=1e6) return (n/1e6).toFixed(1)+"M";
  if(n>=1e4) return (n/1e3).toFixed(1)+"k";
  return ""+n;
}
function rname(k){return RESOURCES[k]?RESOURCES[k].name:k;}
function cnt(type){return S.buildings.filter(b=>b.type===type).length;}
function at(r,c){return S.buildings.find(b=>b.r===r&&b.c===c);}
function neigh(r,c){
  return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
    .map(([a,b])=>at(a,b)).filter(Boolean);
}
function canAfford(cost){
  for(const k in cost) if((S.stock[k]||0) < cost[k]) return false;
  return true;
}
function pay(cost){ for(const k in cost) S.stock[k]=(S.stock[k]||0)-cost[k]; }

function log(msg,kind=""){
  S.logs.unshift({t:new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),
    m:msg, k:kind});
  if(S.logs.length>50) S.logs.pop();
}
let toastT;
function toast(msg,bad=false){
  const el=$("#toast"); el.textContent=msg;
  el.className="toast"+(bad?" bad":""); clearTimeout(toastT);
  toastT=setTimeout(()=>el.classList.add("hidden"),2200);
}

/* ===================== ADJACENCY ENGINE ===================== */
function computeBonuses(list){
  /* Le cahier décrit chaque interaction des DEUX côtés (Ferme↔Puits…).
     On regroupe donc par (cible, ressource, voisin source) et on plafonne
     ce groupe au bonus principal (CAP_SINGLE). Les bonus de chaîne et de
     centre sont comptés à part (bucket "extra"). Résultat : map id ->
     {pos:{res:%}, neg:{res:%}, cons:{res:%}} déjà plafonné.            */
  const cellOf={}; list.forEach(b=>cellOf[b.r+","+b.c]=b);
  const nb = b => [[b.r-1,b.c],[b.r+1,b.c],[b.r,b.c-1],[b.r,b.c+1]]
                  .map(([r,c])=>cellOf[r+","+c]).filter(Boolean);

  const adjPos={}, adjNeg={}, extra={}, consAcc={};
  const grp=(o,id,res,src,v)=>{
    (o[id]=o[id]||{}); (o[id][res]=o[id][res]||{});
    o[id][res][src]=(o[id][res][src]||0)+v;
  };
  const addExtra=(id,res,v)=>{ (extra[id]=extra[id]||{});
    extra[id][res]=(extra[id][res]||0)+v; };
  const addCons=(id,res,v)=>{ (consAcc[id]=consAcc[id]||{});
    consAcc[id][res]=(consAcc[id][res]||0)+v; };

  // règles d'adjacence explicites
  list.forEach(b=>{
    const rules=ADJACENCY[b.type]; if(!rules) return;
    const ns=nb(b);
    rules.forEach(rl=>ns.forEach(n=>{
      if(n.type!==rl.near) return;
      if(rl.cons){ addCons(b.id, rl.res, rl.pct); return; }
      // source = le bâtiment "autre" que la cible (dédoublonne les réciproques)
      if(rl.tgt==="nb"){
        (rl.pct>=0?grp(adjPos,n.id,rl.res,b.id,rl.pct)
                  :grp(adjNeg,n.id,rl.res,b.id,-rl.pct));
      } else {
        (rl.pct>=0?grp(adjPos,b.id,rl.res,n.id,rl.pct)
                  :grp(adjNeg,b.id,rl.res,n.id,-rl.pct));
      }
    }));
  });

  // Centre-ville : +10% Tier1/2 adjacents | Hub : +10% industriels adjacents
  list.forEach(b=>{
    if(b.type!=="centreville" && b.type!=="hub") return;
    nb(b).forEach(n=>{
      const def=BUILDINGS[n.type]; if(!def||!def.produce) return;
      if(b.type==="centreville"){
        if(def.tier>2) return;
        const nr=ADJACENCY[n.type];           // évite le double comptage
        if(nr && nr.some(r=>r.near==="centreville")) return;
      } else if(def.tier<2) return;
      for(const res in def.produce) addExtra(n.id,res,10);
    });
  });

  // chaînes : mid adjacent à `a` ET `c`
  CHAINS.forEach(ch=>{
    list.filter(b=>b.type===ch.mid).forEach(m=>{
      const ns=nb(m);
      const A=ns.find(n=>n.type===ch.a);
      const C=ns.find(n=>n.type===ch.c);
      if(A&&C){ const recv = ch.at===ch.a ? A : C;
        addExtra(recv.id, ch.res, ch.pct); }
    });
  });

  const B={};
  list.forEach(b=>{
    const o={pos:{},neg:{},cons:{}};
    const ap=adjPos[b.id]||{}, an=adjNeg[b.id]||{}, ex=extra[b.id]||{}, cn=consAcc[b.id]||{};
    const all=new Set([...Object.keys(ap),...Object.keys(an),...Object.keys(ex)]);
    all.forEach(res=>{
      let pos=0;
      if(ap[res]) for(const s in ap[res]) pos+=Math.min(CAP_SINGLE,ap[res][s]);
      if(ex[res]) pos+=ex[res];
      let neg=0;
      if(an[res]) for(const s in an[res]) neg+=Math.min(CAP_SINGLE,an[res][s]);
      o.pos[res]=Math.min(CAP_POS,pos);
      o.neg[res]=Math.min(CAP_NEG,neg);
    });
    for(const res in cn) o.cons[res]=Math.min(CAP_CONS,cn[res]);
    B[b.id]=o;
  });
  return B;
}
function prodMult(bonus,res){
  if(!bonus) return 1;
  const p=Math.min(CAP_POS, bonus.pos[res]||0);
  const n=Math.min(CAP_NEG, bonus.neg[res]||0);
  return Math.max(0.1, 1 + p/100 - n/100);
}
function consMult(bonus,res){
  if(!bonus) return 1;
  return Math.max(1-CAP_CONS/100, 1 - (bonus.cons[res]||0)/100);
}
function specMult(res){
  if(!S.spec) return 1;
  return SPECS[S.spec].mods[res] || 1;
}

/* ===================== PRODUCTION TICK ===================== */
function tick(silent){
  const list=S.buildings.map(b=>({id:b.id,type:b.type,r:b.r,c:b.c}));
  const bonus=computeBonuses(list);

  // index par type (ordre de pose) pour rendements décroissants
  const order={};
  [...S.buildings].sort((a,b)=>a.order-b.order).forEach(b=>{
    order[b.type]=(order[b.type]||0); b._eff=effFactor(order[b.type]); order[b.type]++;
  });

  NET={}; ACTIVE={}; MULT={};
  // traitement par tier croissant : un bâtiment de tier bas alimente le tier au-dessus
  const seq=[...S.buildings].sort((a,b)=>
    (BUILDINGS[a.type].tier-BUILDINGS[b.type].tier)||(a.order-b.order));

  for(const b of seq){
    const def=BUILDINGS[b.type];
    if(b.paused){ ACTIVE[b.id]=false; continue; }
    const bo=bonus[b.id];

    // coût de fonctionnement effectif
    const cons={};
    if(def.consume) for(const k in def.consume) cons[k]=def.consume[k]*consMult(bo,k);
    let ok=true;
    for(const k in cons) if((S.stock[k]||0) < cons[k]){ ok=false; break; }

    if(!ok){ ACTIVE[b.id]=false; continue; }
    ACTIVE[b.id]=true;
    for(const k in cons){
      S.stock[k]-=cons[k];
      NET[k]=(NET[k]||0)-cons[k];
    }
    if(def.produce){
      let shown=1, ns=0;
      for(const k in def.produce){
        const m=prodMult(bo,k)*specMult(k);
        const amt=def.produce[k]*m*b._eff;
        S.stock[k]=Math.min(1e9,(S.stock[k]||0)+amt);
        S.total[k]=(S.total[k]||0)+amt;
        NET[k]=(NET[k]||0)+amt;
        shown=m*b._eff; ns++;
      }
      MULT[b.id]=shown;
    }
  }
  // garde-fous : pas de stock négatif
  for(const k in S.stock) if(S.stock[k]<0) S.stock[k]=0;

  // réserves naturelles : régénération lente
  for(const k in S.reserve)
    S.reserve[k]=Math.min(RESERVE_MAX[k], S.reserve[k] + RESERVE_MAX[k]*0.0015);

  if(S.sosCD>0) S.sosCD--;

  checkObjectives(silent);
  if(!silent){ render(); }
}

/* ===================== OBJECTIVES / WIN ===================== */
function currentObjectives(){
  if(S.objIdx < OBJ_COMMON.length) return {list:OBJ_COMMON, idx:S.objIdx, axis:false};
  const ax = S.spec ? OBJ_AXIS[S.spec] : null;
  return {list:ax||[], idx:S.axisIdx, axis:true};
}
function checkObjectives(silent){
  // commun
  while(S.objIdx < OBJ_COMMON.length && OBJ_COMMON[S.objIdx].f(S)){
    if(!silent){ log("Objectif atteint : "+OBJ_COMMON[S.objIdx].t,"good");
      toast("Objectif : "+OBJ_COMMON[S.objIdx].t); }
    S.objIdx++;
  }
  if(S.objIdx>=OBJ_COMMON.length && S.spec){
    const ax=OBJ_AXIS[S.spec];
    while(S.axisIdx<ax.length && ax[S.axisIdx].f(S)){
      const o=ax[S.axisIdx];
      if(!silent){ log("Objectif atteint : "+o.t,"good"); toast("Objectif : "+o.t); }
      S.axisIdx++;
      if(o.win && !S.won){ S.won=true; if(!silent) showWin(); }
    }
  }
}

/* ===================== ACTIONS ===================== */
function placeBuilding(type,r,c){
  const def=BUILDINGS[type];
  if(def.tier>S.tierUnlocked){ toast("Palier verrouillé",true); return; }
  if(at(r,c)){ toast("Case occupée",true); return; }
  if(!canAfford(def.cost)){ toast("Ressources insuffisantes",true); return; }
  pay(def.cost);
  S.buildings.push({id:"b"+(S.nextOrder),type,r,c,paused:false,order:S.nextOrder});
  S.nextOrder++;
  if(def.unlock && S.tierUnlocked<def.unlock){
    S.tierUnlocked=def.unlock;
    log("Palier débloqué : Tier "+def.unlock+" ("+def.name+")","info");
    toast("Tier "+def.unlock+" débloqué !");
  }
  log("Construit : "+def.name);
  UI.selected=null; checkObjectives(false); render();
}
function destroyBuilding(b){
  const def=BUILDINGS[b.type];
  const refund={};
  for(const k in def.cost){ refund[k]=Math.floor(def.cost[k]*0.5);
    S.stock[k]=(S.stock[k]||0)+refund[k]; }
  S.buildings=S.buildings.filter(x=>x.id!==b.id);
  log("Démoli : "+def.name+" (remboursement 50%)","warn");
  UI.inspect=null; checkObjectives(false); render();
}
function togglePause(b){
  b.paused=!b.paused;
  log((b.paused?"Pause":"Reprise")+" : "+BUILDINGS[b.type].name);
  render();
}
function harvest(res){
  const mx=RESERVE_MAX[res], cur=S.reserve[res];
  const yld=Math.max(0.4, CLICK_BASE[res]*(0.2+0.8*cur/mx));
  S.reserve[res]=Math.max(0,cur-CLICK_BASE[res]);
  S.stock[res]=(S.stock[res]||0)+yld;
  S.total[res]=(S.total[res]||0)+yld;
  checkObjectives(false); render();
}
function sos(){
  if(S.sosCD>0){ toast("Secours en recharge ("+S.sosCD+"s)",true); return; }
  for(const k in SOS_GIVE){
    S.stock[k]=(S.stock[k]||0)+SOS_GIVE[k];
    S.total[k]=(S.total[k]||0)+SOS_GIVE[k];
    S.reserve[k]=Math.min(RESERVE_MAX[k],S.reserve[k]+RESERVE_MAX[k]*0.5);
  }
  S.sosCD=SOS_CD;
  log("Largage de secours utilisé","info");
  toast("Secours : ressources de base livrées");
  render();
}
function tryExpand(){
  const tgt=S.gridSize+1; const e=EXPAND[tgt]; if(!e) return;
  if(!expandReady(tgt)){ toast("Conditions d'expansion non remplies",true); return; }
  if(!canAfford(e.cost)){ toast("Coût d'expansion non couvert",true); return; }
  pay(e.cost); S.gridSize=tgt;
  log("Colonie étendue en "+tgt+"×"+tgt+" !","info");
  toast("Grille étendue en "+tgt+"×"+tgt);
  checkObjectives(false); render();
}
function expandReady(tgt){
  const e=EXPAND[tgt]; if(!e) return false;
  if(e.need.build && cnt(e.need.build)<1) return false;
  for(const k in e.need.produced) if((S.total[k]||0) < e.need.produced[k]) return false;
  return true;
}
function chooseSpec(k){
  if(S.spec) return;
  S.spec=k; log("Spécialisation choisie : "+SPECS[k].name,"info");
  toast(SPECS[k].name);
  closeModal(); checkObjectives(false); render();
}

/* ===================== RENDER ===================== */
function knownResources(){
  const set=new Set(Object.keys(RESOURCES).filter(k=>RESOURCES[k].base));
  for(const k in S.total) if(S.total[k]>0) set.add(k);
  for(const k in S.stock) if(S.stock[k]>0) set.add(k);
  S.buildings.forEach(b=>{
    const d=BUILDINGS[b.type];
    if(d.produce) Object.keys(d.produce).forEach(r=>set.add(r));
    if(d.consume) Object.keys(d.consume).forEach(r=>set.add(r));
  });
  return Object.keys(RESOURCES).filter(k=>set.has(k));
}
function renderResources(){
  const bar=$("#resourceBar");
  bar.innerHTML=knownResources().map(k=>{
    const R=RESOURCES[k], amt=S.stock[k]||0, n=NET[k]||0;
    const cls=n>0.0001?"pos":(n<-0.0001?"neg":"zero");
    const sign=n>0.0001?"+":"";
    return `<div class="chip ${R.cls}">
      <span class="ms">${R.icon}</span>
      <b>${fmt(amt)}</b>
      <span class="rate ${cls}">${sign}${(n).toFixed(1)}</span>
    </div>`;
  }).join("");
}
function renderHeader(){
  $("#tierLabel").textContent=
    `Tier ${S.tierUnlocked} · Grille ${S.gridSize}×${S.gridSize}`+
    (S.spec?` · ${SPECS[S.spec].name}`:"");
  const tgt=S.gridSize+1, btn=$("#expandBtn"), e=EXPAND[tgt];
  if(e && expandReady(tgt) && !S.won){
    btn.classList.remove("hidden");
    const okCost=canAfford(e.cost);
    btn.disabled=!okCost;
    btn.innerHTML=`<span class="ms">open_in_full</span>${e.label}`;
    btn.title=e.label+" — "+Object.entries(e.cost).map(([k,v])=>v+" "+rname(k)).join(", ");
  } else btn.classList.add("hidden");
}
function renderObjStrip(){
  const {list,idx}=currentObjectives();
  const el=$("#objStrip");
  if(!list.length || idx>=list.length){
    el.innerHTML=`<span class="ms">flag</span><div><span class="lbl">Objectif</span><b>Tous les objectifs atteints — bravo !</b></div>`;
    return;
  }
  const o=list[idx];
  el.innerHTML=`<span class="ms">${o.ic}</span>
    <div><span class="lbl">Objectif en cours</span><b>${o.t}</b></div>
    <span class="prog">${o.g?o.g(S):""}</span>`;
}
function renderGrid(){
  const g=$("#grid"); g.style.setProperty("--n",S.gridSize);
  const selDef=UI.selected?BUILDINGS[UI.selected]:null;
  // preview bonus si on survole une case vide avec un bâtiment sélectionné
  let prevMap=null;
  if(selDef && UI.hover){
    const [hr,hc]=UI.hover.split(",").map(Number);
    if(!at(hr,hc)){
      const tmp=S.buildings.map(b=>({id:b.id,type:b.type,r:b.r,c:b.c}));
      tmp.push({id:"_p",type:UI.selected,r:hr,c:hc});
      prevMap=computeBonuses(tmp);
    }
  }
  let html="";
  for(let r=0;r<S.gridSize;r++) for(let c=0;c<S.gridSize;c++){
    const b=at(r,c), key=r+","+c;
    if(b){
      const d=BUILDINGS[b.type];
      const idle=!ACTIVE[b.id]&&!b.paused&&d.consume;
      const m=MULT[b.id]||1;
      const cls=["cell","filled"];
      if(b.paused) cls.push("paused");
      if(idle) cls.push("idle");
      if(UI.inspect===b.id) cls.push("sel");
      let stat="";
      if(b.paused) stat=`<span class="stat pause ms">pause</span>`;
      else if(idle) stat=`<span class="stat warn ms">warning</span>`;
      else if(d.produce) stat=`<span class="stat run ms">bolt</span>`;
      let mtag="";
      if(d.produce && !b.paused){
        const pct=Math.round((m-1)*100);
        if(pct!==0) mtag=`<span class="mult ${pct<0?'dn':''}">${pct>0?'+':''}${pct}%</span>`;
      }
      html+=`<div class="${cls.join(' ')}" data-c="${key}" title="${d.name}">
        ${stat}<span class="ms bicon">${d.icon}</span>
        <span class="bname">${d.name}</span>${mtag}</div>`;
    } else {
      const cls=["cell","empty"];
      let extra="";
      if(selDef){
        const tierOk=selDef.tier<=S.tierUnlocked;
        if(tierOk && canAfford(selDef.cost)) cls.push("ok");
        else cls.push("bad");
        if(prevMap && UI.hover===key){
          const pb=prevMap["_p"];
          let pos=false,neg=false;
          for(const rk in (selDef.produce||{})){
            const mm=prodMult(pb,rk); if(mm>1.001)pos=true; if(mm<0.999)neg=true;
          }
          extra=` ${pos?'syn':''} ${neg?'conf':''}`;
        }
      }
      html+=`<div class="${cls.join(' ')}${extra}" data-c="${key}"></div>`;
    }
  }
  g.innerHTML=html;
}

function ioLine(obj,kind){
  if(!obj||!Object.keys(obj).length) return "";
  return `<div class="io ${kind}">`+Object.entries(obj).map(([k,v])=>{
    let vc="v";
    if(kind==="cost"&&(S.stock[k]||0)<v) vc="v no";
    return `<span class="grp"><span class="ms">${RESOURCES[k].icon}</span><span class="${vc}">${v}</span> ${rname(k)}</span>`;
  }).join("")+`</div>`;
}
function renderBuildTab(){
  let h="";
  // choix de spécialisation
  if(S.tierUnlocked>=2 && !S.spec){
    h+=`<div class="sec-title">Spécialisation (Tier 2)</div>`;
    for(const k in SPECS){
      const sp=SPECS[k];
      h+=`<div class="spec-card" data-spec="${k}">
        <h4><span class="ms">${sp.icon}</span>${sp.name}</h4>
        <div class="mods">${sp.txt.map(([r,p])=>
          `<span class="${p>0?'up':'dn'}">${p>0?'+':''}${p}% ${rname(r)}</span>`).join(" · ")}</div>
      </div>`;
    }
  }
  BUILD_ORDER.forEach(([title,keys])=>{
    h+=`<div class="sec-title">${title}</div>`;
    keys.forEach(k=>{
      const d=BUILDINGS[k];
      const locked=d.tier>S.tierUnlocked;
      const cant=!locked && !canAfford(d.cost);
      const cl=["bcard"]; if(UI.selected===k)cl.push("sel");
      if(locked)cl.push("locked"); else if(cant)cl.push("cant");
      h+=`<button class="${cl.join(' ')}" data-build="${k}" ${locked?'disabled':''}>
        <div class="bcard-h"><span class="ms">${d.icon}</span><b>${d.name}</b>
          <span class="pill">${locked?'Tier '+d.tier:'T'+d.tier}</span></div>
        ${ioLine(d.cost,"cost")}
        ${ioLine(d.consume,"cons")}
        ${ioLine(d.produce,"prod")}
      </button>`;
    });
  });
  return h;
}
function renderInfoTab(){
  if(UI.inspect){
    const b=S.buildings.find(x=>x.id===UI.inspect);
    if(b) return renderInspect(b);
  }
  if(UI.selected){
    const d=BUILDINGS[UI.selected];
    return `<div class="dtl"><h3><span class="ms">${d.icon}</span>${d.name}</h3>
      <p class="desc">${d.desc}</p>
      ${ioLine(d.cost,"cost")}${ioLine(d.consume,"cons")}${ioLine(d.produce,"prod")}
      <p class="empty-note">Cliquez une case <b>en surbrillance</b> pour construire.<br>
      Survolez une case pour prévisualiser les bonus de voisinage.</p></div>`;
  }
  return `<p class="empty-note"><span class="ms" style="font-size:34px;color:var(--dim)">touch_app</span><br>
    Sélectionnez un bâtiment à construire,<br>ou cliquez un bâtiment posé pour l'inspecter.</p>`;
}
function renderInspect(b){
  const d=BUILDINGS[b.type];
  const bonus=computeBonuses(S.buildings.map(x=>({id:x.id,type:x.type,r:x.r,c:x.c})));
  const bo=bonus[b.id];
  const idle=!ACTIVE[b.id]&&!b.paused&&d.consume;
  let h=`<div class="dtl"><h3><span class="ms">${d.icon}</span>${d.name}</h3>
    <p class="desc">${d.desc}</p>`;
  h+=`<div class="kv"><span>État</span><b class="${idle?'neg':(b.paused?'':'pos')}">${
     b.paused?"En pause":(idle?"À l'arrêt (ressources)":"En activité")}</b></div>`;
  h+=`<div class="kv"><span>Rendement (exemplaire)</span><b>${Math.round(b._eff*100)}%</b></div>`;
  if(d.produce) for(const k in d.produce){
    const m=prodMult(bo,k)*specMult(k)*b._eff;
    h+=`<div class="kv"><span>Production ${rname(k)}</span>
      <b class="${m>=1?'pos':'neg'}">${(d.produce[k]*m).toFixed(2)}/s (${m>=1?'+':''}${Math.round((m-1)*100)}%)</b></div>`;
  }
  if(d.consume) for(const k in d.consume){
    const cm=consMult(bo,k);
    h+=`<div class="kv"><span>Conso ${rname(k)}</span>
      <b class="neg">-${(d.consume[k]*cm).toFixed(2)}/s${cm<1?` (${Math.round((cm-1)*100)}%)`:""}</b></div>`;
  }
  // voisinage actif
  const rules=ADJACENCY[b.type]||[];
  if(rules.length){
    const ns=neigh(b.r,b.c).map(n=>n.type);
    h+=`<div class="sec-title">Voisinage</div><div class="adj-list">`;
    rules.forEach(rl=>{
      const active=ns.includes(rl.near);
      const who=rl.tgt==="nb"?"→ voisin":"";
      const txt=rl.cons?`-${rl.pct}% conso ${rname(rl.res)}`
        :`${rl.pct>0?'+':''}${rl.pct}% ${rname(rl.res)} ${who}`;
      h+=`<div class="${active?'on':'off'}">${active?'●':'○'} proche ${BUILDINGS[rl.near].name} : ${txt}</div>`;
    });
    h+=`</div>`;
  }
  h+=`<div class="row-btn">
    <button class="btn" id="pauseBtn"><span class="ms">${b.paused?'play_arrow':'pause'}</span>${b.paused?'Reprendre':'Pause'}</button>
    <button class="btn danger" id="destroyBtn"><span class="ms">delete</span>Démolir 50%</button>
  </div></div>`;
  return h;
}
function renderGoalsTab(){
  let h=`<div class="sec-title">Parcours commun</div>`;
  OBJ_COMMON.forEach((o,i)=>{
    const st=i<S.objIdx?"done":(i===S.objIdx?"cur":"todo");
    const ic=st==="done"?"check_circle":(st==="cur"?o.ic:"radio_button_unchecked");
    h+=`<div class="goal ${st}"><span class="ms">${ic}</span><span>${o.t}</span>
      <span class="g-prog">${st==="cur"&&o.g?o.g(S):""}</span></div>`;
  });
  if(S.spec){
    const ax=OBJ_AXIS[S.spec];
    h+=`<div class="sec-title">${SPECS[S.spec].name}</div>`;
    ax.forEach((o,i)=>{
      const done=S.objIdx>=OBJ_COMMON.length && i<S.axisIdx;
      const cur =S.objIdx>=OBJ_COMMON.length && i===S.axisIdx;
      const st=done?"done":(cur?"cur":"todo");
      const ic=done?"check_circle":(cur?o.ic:"radio_button_unchecked");
      h+=`<div class="goal ${st}"><span class="ms">${ic}</span><span>${o.t}</span></div>`;
    });
  } else {
    h+=`<div class="sec-title">Spécialisation</div>
    <p class="empty-note">Choisissez un axe au Tier 2 pour révéler<br>la suite des objectifs.</p>`;
  }
  return h;
}
function renderLogTab(){
  if(!S.logs.length) return `<p class="empty-note">Aucune activité pour l'instant.</p>`;
  return S.logs.map(l=>`<div class="logline ${l.k}"><span class="t">${l.t}</span> ${l.m}</div>`).join("");
}
function renderHarvest(){
  const el=$("#harvest");
  let h=["bois","pierre","nourriture","eau"].map(k=>{
    const R=RESOURCES[k], pct=Math.round(100*S.reserve[k]/RESERVE_MAX[k]);
    return `<button data-h="${k}"><span class="ms">${R.icon}</span>
      <small>${R.name}</small><span class="rsv">réserve ${pct}%</span></button>`;
  }).join("");
  h+=`<button class="sos" data-sos="1" ${S.sosCD>0?'disabled':''}>
      <span class="ms">sos</span><small>Secours</small>
      <span class="rsv">${S.sosCD>0?S.sosCD+'s':'prêt'}</span></button>`;
  el.innerHTML=h;
}
function renderPanel(){
  const body=$("#panelBody");
  document.querySelectorAll(".tab").forEach(t=>
    t.classList.toggle("active",t.dataset.tab===UI.tab));
  if(UI.tab==="build") body.innerHTML=renderBuildTab();
  else if(UI.tab==="info") body.innerHTML=renderInfoTab();
  else if(UI.tab==="goals") body.innerHTML=renderGoalsTab();
  else body.innerHTML=renderLogTab();
}
/* dimensionne la grille pour qu'elle TIENNE toujours dans son cadre
   (sinon elle déborde sur l'objectif et la récolte sur petit écran)   */
function fitGrid(){
  const wrap=$("#gridWrap"), g=$("#grid"); if(!wrap||!g) return;
  const n=S.gridSize;
  const cs=getComputedStyle(g);
  const gap=parseFloat(cs.getPropertyValue("--gap"))||6;
  const pad=parseFloat(cs.getPropertyValue("--pad"))||10;
  const w=wrap.clientWidth, h=wrap.clientHeight;
  if(w<=0||h<=0) return;
  const avail=Math.min(w,h)-2*pad-gap*(n-1)-2; /* -2 : bordure */
  let cell=Math.floor(avail/n);
  cell=Math.max(28, Math.min(cell, 108));
  g.style.setProperty("--cell", cell+"px");
}
function render(){
  renderHeader(); renderResources(); renderObjStrip();
  renderGrid(); renderHarvest(); renderPanel();
  requestAnimationFrame(fitGrid);
}

/* ===================== MODALS ===================== */
function showWin(){
  const ax=SPECS[S.spec].name;
  $("#modalBody").innerHTML=`
    <h2><span class="ms">military_tech</span>Victoire !</h2>
    <p>Votre civilisation industrielle a atteint sa technologie finale sur l'<b>${ax}</b>.
       La chaîne de production complète tourne sur votre grille ${S.gridSize}×${S.gridSize}.</p>
    <p>Vous pouvez continuer à optimiser, ou réinitialiser pour explorer un autre axe.</p>
    <div class="row-btn">
      <button class="btn" onclick="closeModal()">Continuer</button>
      <button class="btn danger" onclick="resetGame()">Nouvelle partie</button>
    </div>`;
  $("#modal").classList.remove("hidden");
}
function openMenu(){
  $("#modalBody").innerHTML=`
    <h2><span class="ms">settings</span>Menu</h2>
    <p>Sauvegarde automatique active (localStorage). La progression hors-ligne
       est simulée, limitée à ${OFFLINE_CAP}s.</p>
    <div class="row-btn">
      <button class="btn primary" onclick="saveGame();toast('Partie sauvegardée');closeModal()">
        <span class="ms">save</span>Sauvegarder</button>
      <button class="btn" onclick="closeModal()">Fermer</button>
    </div>
    <div class="row-btn">
      <button class="btn danger" onclick="resetGame()">
        <span class="ms">restart_alt</span>Réinitialiser la partie</button>
    </div>`;
  $("#modal").classList.remove("hidden");
}
function closeModal(){ $("#modal").classList.add("hidden"); }

/* ===================== SAVE / LOAD ===================== */
function saveGame(){
  S.lastSave=Date.now();
  try{ localStorage.setItem(SAVE_KEY,JSON.stringify(S)); }catch(e){}
}
function loadGame(){
  let raw; try{ raw=localStorage.getItem(SAVE_KEY); }catch(e){}
  if(!raw){ S=freshState(); return; }
  try{
    const d=JSON.parse(raw); S=Object.assign(freshState(),d);
    S.stock=d.stock||{}; S.total=d.total||{}; S.reserve=d.reserve||freshState().reserve;
    S.buildings=d.buildings||[]; S.logs=d.logs||[];
    // progression hors-ligne limitée
    const elapsed=Math.floor((Date.now()-(d.lastSave||Date.now()))/1000);
    const n=Math.min(Math.max(0,elapsed),OFFLINE_CAP);
    for(let i=0;i<n;i++) tick(true);
    if(n>5) log(`Progression hors-ligne : ${n}s simulées`,"info");
  }catch(e){ S=freshState(); }
}
function resetGame(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  S=freshState(); UI.selected=null; UI.inspect=null;
  closeModal(); log("Nouvelle partie","info"); render();
}

/* ===================== EVENTS ===================== */
function bind(){
  $("#grid").addEventListener("click",e=>{
    const cell=e.target.closest(".cell"); if(!cell) return;
    const [r,c]=cell.dataset.c.split(",").map(Number);
    const b=at(r,c);
    if(b){ UI.inspect=b.id; UI.tab="info"; render(); }
    else if(UI.selected){ placeBuilding(UI.selected,r,c); }
  });
  $("#grid").addEventListener("mousemove",e=>{
    const cell=e.target.closest(".cell"); const k=cell?cell.dataset.c:null;
    if(k!==UI.hover){ UI.hover=k; if(UI.selected) renderGrid(); }
  });
  $("#grid").addEventListener("mouseleave",()=>{
    if(UI.hover){ UI.hover=null; if(UI.selected) renderGrid(); }
  });

  $("#panelBody").addEventListener("click",e=>{
    const bc=e.target.closest("[data-build]");
    if(bc && !bc.disabled){
      UI.selected = UI.selected===bc.dataset.build ? null : bc.dataset.build;
      UI.inspect=null; render(); return;
    }
    const sp=e.target.closest("[data-spec]");
    if(sp){ chooseSpec(sp.dataset.spec); return; }
    if(e.target.closest("#pauseBtn")){
      const b=S.buildings.find(x=>x.id===UI.inspect); if(b) togglePause(b); return;
    }
    if(e.target.closest("#destroyBtn")){
      const b=S.buildings.find(x=>x.id===UI.inspect); if(b) destroyBuilding(b); return;
    }
  });

  $("#tabs").addEventListener("click",e=>{
    const t=e.target.closest(".tab"); if(!t) return;
    UI.tab=t.dataset.tab; renderPanel();
  });

  $("#harvest").addEventListener("click",e=>{
    const h=e.target.closest("[data-h]"); if(h){ harvest(h.dataset.h); return; }
    if(e.target.closest("[data-sos]")) sos();
  });

  $("#expandBtn").addEventListener("click",tryExpand);
  $("#menuBtn").addEventListener("click",openMenu);
  $("#modal").addEventListener("click",e=>{ if(e.target.id==="modal") closeModal(); });

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){ UI.selected=null; UI.inspect=null; closeModal(); render(); }
  });

  window.addEventListener("beforeunload",saveGame);
  document.addEventListener("visibilitychange",()=>{ if(document.hidden) saveGame(); });

  let rt;
  const refit=()=>{ clearTimeout(rt); rt=setTimeout(fitGrid,80); };
  window.addEventListener("resize",refit);
  window.addEventListener("orientationchange",refit);
}

/* expose pour les onclick des modales */
window.closeModal=closeModal;
window.resetGame=resetGame;
window.saveGame=saveGame;
window.toast=toast;

/* ===================== BOOT ===================== */
loadGame();
bind();
render();
setInterval(()=>tick(false),1000);
setInterval(saveGame,5000);
