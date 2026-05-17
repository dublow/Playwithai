"use strict";
/* =====================================================================
   GRID FOUNDRY — puzzle industriel stratégique compact
   Architecture data-driven : RESOURCES / BUILDINGS / SPECS / OBJECTIVES / TIERS.
   Aucune règle n'est codée en dur ailleurs.
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
    cost:{bois:10,pierre:5}, produce:{bois:3}},
  carriere:   {name:"Carrière",      icon:"terrain",               tier:1, tag:"t1",
    desc:"Extrait la pierre du gisement local.",
    cost:{bois:10,pierre:5}, produce:{pierre:3}},
  puits:      {name:"Puits",         icon:"water_drop",            tier:1, tag:"t1",
    desc:"Puise l'eau d'une source locale.",
    cost:{pierre:8}, produce:{eau:4}},
  ferme:      {name:"Ferme",         icon:"agriculture",           tier:1, tag:"t1",
    desc:"Cultive la nourriture. Adore la proximité de l'eau.",
    cost:{bois:15,eau:5}, produce:{nourriture:2}},
  fourneau:   {name:"Fourneau",      icon:"local_fire_department", tier:1, tag:"t1",
    desc:"Transforme le bois en charbon.",
    cost:{pierre:20,bois:10}, consume:{bois:1}, produce:{charbon:2}},
  briqueterie:{name:"Briqueterie",   icon:"grid_view",            tier:1, tag:"t1",
    desc:"Cuit la pierre et l'eau en briques.",
    cost:{pierre:20,bois:10}, consume:{pierre:1,eau:1}, produce:{brique:1}},
  cantine:    {name:"Cantine",       icon:"restaurant",           tier:1, tag:"t1",
    desc:"Nourrit et forme des ouvriers.",
    cost:{bois:15,pierre:10}, consume:{nourriture:2,eau:1}, produce:{ouvrier:1}},
  centreville:{name:"Centre-ville",  icon:"location_city",        tier:1, tag:"civic",
    desc:"Cœur de la colonie. Ouvre l'Ère Industrielle et l'expansion 4×4. +10% aux bâtiments des Ères Pionnière et Industrielle adjacents.",
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
    desc:"Ouvre l'Ère Avancée et l'expansion 5×5. +10% aux bâtiments industriels adjacents.",
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
    cost:{plasma:30,alliage:30,energie:40}, consume:{plasma:1,energieStable:1}, produce:{cristal:1}},
  chambreantimatiere:{name:"Chambre antimatière",icon:"scatter_plot",tier:3, tag:"t3",
    desc:"Axe Énergie — synthétise de l'antimatière.",
    cost:{cristal:30,energieStable:30,plasma:30}, consume:{cristal:1,energieStable:1,plasma:1}, produce:{antimatiere:1}},
  reacteurstellaire:{name:"Réacteur stellaire",icon:"auto_awesome",tier:3, tag:"t3",
    desc:"Axe Énergie — allume un réacteur stellaire. Objectif final Énergie.",
    cost:{antimatiere:25,cristal:40,energieStable:60}, consume:{antimatiere:1,cristal:2,energieStable:3}, produce:{reacteurStellaire:1}},
};

const BUILD_ORDER = [
  ["Ère Pionnière", ["scierie","carriere","puits","ferme","fourneau","briqueterie","cantine","centreville"]],
  ["Ère Industrielle", ["forge","generateur","atelier","hub"]],
  ["Ère Avancée", ["usine","fonderie","circuiterie"]],
  ["Axe Métal / Technologie", ["labquantique","centrecalcul"]],
  ["Axe Bio / Organisme", ["bioreacteur","labadn","incubateur","chambreevo","nexus"]],
  ["Axe Énergie / Fusion", ["stabilisateur","reacteurplasma","cristalliseur","chambreantimatiere","reacteurstellaire"]],
];

/* ---------------------- SPECIALISATIONS ---------------------- */
const SPECS = {
  metal:  {name:"Axe Métal / Technologie", icon:"memory",
    mods:{metal:1.20,outil:1.20,circuit:1.15,nourriture:0.90},
    txt:[["metal",20],["outil",20],["circuit",15],["nourriture",-10]]},
  bio:    {name:"Axe Bio / Organisme", icon:"biotech",
    mods:{nourriture:1.20,equipe:1.20,biomasse:1.15,metal:0.90},
    txt:[["nourriture",20],["equipe",20],["biomasse",15],["metal",-10]]},
  energie:{name:"Axe Énergie / Fusion", icon:"flare",
    mods:{energie:1.20,charbon:1.20,plasma:1.15,bois:0.90},
    txt:[["energie",20],["charbon",20],["plasma",15],["bois",-10]]},
};

/* ---------------------- OBJECTIVES ---------------------- */
const OBJ_COMMON = [
  {ic:"forest",        t:"Produire du bois (Scierie)",  f:s=>s.total.bois>=10,            g:s=>`${fmt(s.total.bois||0)}/10`},
  {ic:"forest",        t:"Construire une Scierie",      f:s=>cnt("scierie")>=1},
  {ic:"terrain",       t:"Construire une Carrière",     f:s=>cnt("carriere")>=1},
  {ic:"water_drop",    t:"Construire un Puits",         f:s=>cnt("puits")>=1},
  {ic:"agriculture",   t:"Construire une Ferme",        f:s=>cnt("ferme")>=1},
  {ic:"local_fire_department",t:"Produire du charbon",  f:s=>s.total.charbon>=10,         g:s=>`${fmt(s.total.charbon||0)}/10`},
  {ic:"grid_view",     t:"Produire des briques",        f:s=>s.total.brique>=10,          g:s=>`${fmt(s.total.brique||0)}/10`},
  {ic:"construction",  t:"Former des bâtisseurs",        f:s=>(s.workers?.batisseurs||0)+(s.total?.batisseur||0)>=10,
    g:s=>`${fmt((s.workers?.batisseurs||0)+(s.total?.batisseur||0))}/10`},
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
const EFF = [1, 0.92, 0.84, 0.76, 0.68];
const effFactor = i => EFF[Math.min(i, EFF.length - 1)];

/* Univers : la colonie traverse des ÈRES (pas de "Tier X") */
const ERA   = {1:"Ère Pionnière", 2:"Ère Industrielle", 3:"Ère Avancée"};
const ROMAN = {1:"I", 2:"II", 3:"III"};
const eraName = t => ERA[t] || ("Ère "+t);

/* ---- Badges : 4 paliers, seuils mis à l'échelle selon la profondeur ---- */
const BADGE_TIERS = ["Bronze","Argent","Or","Platine"];
const BADGE_BASE  = [60, 300, 1500, 7500];                 // courbe Standard
const BADGE_DEPTH = {"":1, t1:0.5, t2:0.25, t3:0.12, fin:0.05};
const BUILD_THR   = [5, 15, 30, 50];                        // piste Bâtisseur
function resThreshold(k,i){
  return Math.max(1, Math.round(BADGE_BASE[i]*(BADGE_DEPTH[RESOURCES[k].cls]??1)));
}
function resBadgeLevel(k){
  const t=S.total[k]||0; let lvl=0;
  for(let i=0;i<4;i++) if(t>=resThreshold(k,i)) lvl=i+1;
  return lvl;
}
function metaBadges(){
  const colonie=(S.tierUnlocked>=2?1:0)+(S.tierUnlocked>=3?1:0)+(S.gridSize>=5?1:0)+(S.won?1:0);
  const built=Math.max(0,(S.nextOrder||1)-1);
  let bl=0; for(const t of BUILD_THR) if(built>=t) bl++;
  return [
    {id:"colonie",label:"Colonie",level:colonie,
     hint:["Atteindre l'Ère Industrielle","Atteindre l'Ère Avancée","Étendre en 5×5","Accomplir la Destinée"][Math.min(colonie,3)]},
    {id:"batisseur",label:"Bâtisseur",level:bl,
     hint: bl<4 ? `${built}/${BUILD_THR[bl]} bâtiments construits` : "50+ bâtiments — MAX"},
  ];
}
function checkBadges(silent){
  if(!S.badges) S.badges={};
  const award=(id,lvl,label)=>{
    if(lvl>(S.badges[id]||0)){
      S.badges[id]=lvl;
      if(!silent){ const t=BADGE_TIERS[lvl-1];
        toast(`Badge ${t} — ${label}`); log(`Badge ${t} : ${label}`,"good"); }
    }
  };
  knownResources().forEach(k=>award("res_"+k,resBadgeLevel(k),rname(k)));
  metaBadges().forEach(m=>award("meta_"+m.id,m.level,m.label));
}

const SAVE_KEY = "gridfoundry.v1";
const OFFLINE_CAP = 600;

/* ===================== STATE ===================== */
let S;
function freshState(){
  return {
    gridSize:3, tierUnlocked:1, spec:null,
    stock:{bois:60, pierre:40, eau:20}, total:{}, won:false,
    buildings:[], nextOrder:1,
    objIdx:0, axisIdx:0, badges:{},
    logs:[], lastSave:Date.now(), headerOpen:true,
  };
}

/* transient UI */
const UI = {sheet:null, selected:null, inspect:null, cell:null, specPrompted:false};
let NET = {};            // débit net /sec calculé chaque tick
let PROD = {};           // production brute /s (pour la page Stats)
let CONS = {};           // consommation brute /s (pour la page Stats)
let ACTIVE = {};         // id -> bool (bâtiment actif ce tick)
let _gridHTML = null;    // cache : évite de réécrire la grille sans changement
const STARVE_SHOW = 3;   // ticks de pénurie continue avant l'état "à l'arrêt"
/* Cadence type Age of Empires : accumulation lente et régulière.
   RATE met à l'échelle prod ET conso d'un même facteur -> tous les
   ratios de recettes/coûts restent intacts, seul le RYTHME ralentit.
   1.0 = recettes telles quelles ; 0.4 ≈ 1 item / 2,5 s par bâtiment.   */
const RATE = 0.4;

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

function specMult(res){
  if(!S.spec) return 1;
  return SPECS[S.spec].mods[res] || 1;
}

/* ===================== PRODUCTION TICK ===================== */
function tick(silent){
  // index par type (ordre de pose) pour rendements décroissants
  const order={};
  [...S.buildings].sort((a,b)=>a.order-b.order).forEach(b=>{
    order[b.type]=(order[b.type]||0); b._eff=effFactor(order[b.type]); order[b.type]++;
  });

  NET={}; PROD={}; CONS={}; ACTIVE={};
  // traitement par tier croissant : un bâtiment de tier bas alimente le tier au-dessus
  const seq=[...S.buildings].sort((a,b)=>
    (BUILDINGS[a.type].tier-BUILDINGS[b.type].tier)||(a.order-b.order));

  for(const b of seq){
    const def=BUILDINGS[b.type];
    if(b.paused){ ACTIVE[b.id]=false; continue; }

    // coût de fonctionnement effectif
    const cons={};
    if(def.consume) for(const k in def.consume) cons[k]=def.consume[k]*RATE;
    let ok=true;
    for(const k in cons) if((S.stock[k]||0) < cons[k]){ ok=false; break; }

    if(!ok){ ACTIVE[b.id]=false; continue; }
    ACTIVE[b.id]=true;
    for(const k in cons){
      S.stock[k]-=cons[k];
      NET[k]=(NET[k]||0)-cons[k];
      CONS[k]=(CONS[k]||0)+cons[k];
    }
    if(def.produce){
      for(const k in def.produce){
        const amt=def.produce[k]*specMult(k)*b._eff*RATE;
        S.stock[k]=Math.min(1e9,(S.stock[k]||0)+amt);
        S.total[k]=(S.total[k]||0)+amt;
        NET[k]=(NET[k]||0)+amt;
        PROD[k]=(PROD[k]||0)+amt;
      }
    }
  }
  // hystérésis d'affichage : on ne signale "à l'arrêt" qu'après une
  // pénurie SOUTENUE (évite le clignotement quand prod ≈ conso)
  for(const b of S.buildings){
    if(b.paused || !BUILDINGS[b.type].consume){ b._starve=0; continue; }
    b._starve = ACTIVE[b.id] ? 0 : (b._starve||0)+1;
  }

  // garde-fous : pas de stock négatif
  for(const k in S.stock) if(S.stock[k]<0) S.stock[k]=0;

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
  checkBadges(silent);
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
    log("Nouvelle ère : "+eraName(def.unlock)+" ("+def.name+")","info");
    toast(eraName(def.unlock)+" — votre colonie progresse !");
  }
  log("Construit : "+def.name);
  UI.selected=null; checkObjectives(false); render();
}
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
  log("Démoli : "+def.name+" (remboursement 50%)","warn");
  UI.inspect=null; checkObjectives(false); render();
}
function togglePause(b){
  b.paused=!b.paused;
  log((b.paused?"Pause":"Reprise")+" : "+BUILDINGS[b.type].name);
  render();
}
function tryExpand(){
  const tgt=S.gridSize+1; const e=EXPAND[tgt]; if(!e) return;
  if(!expandReady(tgt)){ toast("Conditions d'expansion non remplies",true); return; }
  if(!canAfford(e.cost)){
    const miss=Object.entries(e.cost)
      .filter(([k,v])=>(S.stock[k]||0)<v)
      .map(([k,v])=>Math.ceil(v-(S.stock[k]||0))+" "+rname(k)).join(", ");
    toast("Il manque : "+miss,true); return;
  }
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
  // n'afficher QUE les ressources réellement en jeu :
  // en stock, déjà produites, ou produites/consommées par un bâtiment posé
  const set=new Set();
  for(const k in S.stock) if(S.stock[k]>0) set.add(k);
  for(const k in S.total) if(S.total[k]>0) set.add(k);
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
    const R=RESOURCES[k];
    return `<div class="chip ${R.cls}">
      <span class="ms">${R.icon}</span>
      <b>${fmt(S.stock[k]||0)}</b>
    </div>`;
  }).join("");
}
function renderStats(){
  const res=knownResources();
  if(!res.length) return `<p class="empty-note">Aucune production pour l'instant.</p>`;
  let h=`<div class="stat-head"><span>Ressource</span><span>Prod.</span><span>Conso.</span><span>Net</span></div>`;
  res.forEach(k=>{
    const p=PROD[k]||0, c=CONS[k]||0, n=p-c;
    const ncls=n>0.0001?"pos":(n<-0.0001?"neg":"dim");
    h+=`<div class="stat-row">
      <span class="nm"><span class="ms">${RESOURCES[k].icon}</span>${rname(k)}</span>
      <span class="sp">${p>0.0001?"+"+p.toFixed(2):"—"}</span>
      <span class="sc">${c>0.0001?"-"+c.toFixed(2):"—"}</span>
      <span class="sn ${ncls}">${n>0.0001?"+":""}${n.toFixed(2)}/s</span>
    </div>`;
  });
  return h;
}
function renderResHeader(){
  const hdr=$("#resHeader"), fab=$("#hdrToggle");
  hdr.classList.toggle("open",!!S.headerOpen);
  fab.classList.toggle("on",!!S.headerOpen);
  fab.innerHTML=`<span class="ms">${S.headerOpen?"close":"tune"}</span>`;
  fab.title=S.headerOpen?"Fermer":"Ressources, objectif & réglages";
  // recadre la grille SOUS le header quand il est ouvert (sinon il la masque)
  requestAnimationFrame(()=>{
    const hh = S.headerOpen ? (hdr.offsetHeight||0) : 0;
    document.documentElement.style.setProperty("--hdrH", hh+"px");
    fitGrid();
  });

  // objectif courant + palier
  const {list,idx}=currentObjectives();
  const o=(list.length && idx<list.length)?list[idx]:null;
  $("#resObjective").innerHTML = o
    ? `<span class="ms">${o.ic}</span><div><span class="lbl">${eraName(S.tierUnlocked)} · Colonie ${S.gridSize}×${S.gridSize}${S.spec?" · "+SPECS[S.spec].name:""}</span><b>${o.t}</b></div><span class="prog">${o.g?o.g(S):""}</span>`
    : `<span class="ms">flag</span><div><span class="lbl">${eraName(S.tierUnlocked)} · Colonie ${S.gridSize}×${S.gridSize}</span><b>Colonie accomplie — bravo !</b></div>`;

  const tgt=S.gridSize+1, btn=$("#expandBtn"), e=EXPAND[tgt];
  if(e && expandReady(tgt) && !S.won){
    btn.classList.remove("hidden");
    btn.disabled=false;
    btn.classList.toggle("cant",!canAfford(e.cost));
    const costHtml=Object.entries(e.cost).map(([k,v])=>{
      const miss=(S.stock[k]||0)<v;
      return `<span class="${miss?'miss':''}">${v}&nbsp;${rname(k)}</span>`;
    }).join(" · ");
    btn.innerHTML=`<span class="ms">open_in_full</span>`+
      `<span class="ex-l"><b>${e.label}</b><small>${costHtml}</small></span>`;
  } else btn.classList.add("hidden");

  renderResources();
}
function renderGrid(){
  const g=$("#grid"); g.style.setProperty("--n",S.gridSize);
  let html="";
  for(let r=0;r<S.gridSize;r++) for(let c=0;c<S.gridSize;c++){
    const b=at(r,c), key=r+","+c;
    if(b){
      const d=BUILDINGS[b.type];
      // état "à l'arrêt" lissé par hystérésis (pas de clignotement)
      const idle=!!d.consume && !b.paused && (b._starve||0)>=STARVE_SHOW;
      const cls=["cell","filled"];
      if(b.paused) cls.push("paused");
      if(idle) cls.push("idle");
      if(UI.inspect===b.id) cls.push("sel");
      let stat="";
      if(b.paused) stat=`<span class="stat pause ms">pause</span>`;
      else if(idle) stat=`<span class="stat warn ms">warning</span>`;
      else if(d.produce) stat=`<span class="stat run ms">bolt</span>`;
      html+=`<div class="${cls.join(' ')}" data-c="${key}" title="${d.name}">
        ${stat}<span class="ms bicon">${d.icon}</span>
        <span class="bname">${d.name}</span></div>`;
    } else {
      html+=`<div class="cell empty" data-c="${key}"></div>`;
    }
  }
  if(html!==_gridHTML){ g.innerHTML=html; _gridHTML=html; }
}

function fmtRate(x){
  x=Math.round(x*100)/100;
  return (Number.isInteger(x)?x:x.toFixed(2))+"/s";
}
function ioLine(obj,kind){
  // kind "cost" = montant entier ; "prod"/"cons" = débit réel /s (× RATE)
  if(!obj||!Object.keys(obj).length) return "";
  const flow = kind!=="cost";
  return `<div class="io ${kind}">`+Object.entries(obj).map(([k,v])=>{
    let vc="v";
    if(kind==="cost"&&(S.stock[k]||0)<v) vc="v no";
    const disp = flow ? fmtRate(v*RATE) : v;
    return `<span class="grp"><span class="ms">${RESOURCES[k].icon}</span><span class="${vc}">${disp}</span> ${rname(k)}</span>`;
  }).join("")+`</div>`;
}
/* Découverte progressive : les 4 bâtiments de base sont toujours visibles ;
   un autre n'apparaît dans le menu qu'une fois que TOUTES les ressources de
   son coût ont été produites/récoltées au moins une fois (S.total est
   monotone -> la révélation est définitive, rien à persister en plus).      */
const BASE_BUILDINGS = ["scierie","carriere","puits","ferme"];
function isRevealed(k){
  if(BASE_BUILDINGS.includes(k)) return true;
  const cost=BUILDINGS[k].cost||{};
  for(const r in cost) if((S.total[r]||0) <= 0) return false;
  return true;
}
function renderBuildTab(){
  let h="";
  // choix de spécialisation
  if(S.tierUnlocked>=2 && !S.spec){
    h+=`<div class="sec-title">Spécialisation — Ère Industrielle</div>`;
    for(const k in SPECS){
      const sp=SPECS[k];
      h+=`<div class="spec-card" data-spec="${k}">
        <h4><span class="ms">${sp.icon}</span>${sp.name}</h4>
        <div class="mods">${sp.txt.map(([r,p])=>
          `<span class="${p>0?'up':'dn'}">${p>0?'+':''}${p}% ${rname(r)}</span>`).join(" · ")}</div>
      </div>`;
    }
  }
  let any=false;
  BUILD_ORDER.forEach(([title,keys])=>{
    const vis=keys.filter(isRevealed);
    if(!vis.length) return;
    any=true;
    h+=`<div class="sec-title">${title}</div><div class="bpalette">`;
    vis.forEach(k=>{
      const d=BUILDINGS[k];
      const locked=d.tier>S.tierUnlocked;
      const cant=!locked && !canAfford(d.cost);
      const cl=["btile"]; if(UI.selected===k)cl.push("sel");
      if(locked)cl.push("locked"); else if(cant)cl.push("cant");
      h+=`<button class="${cl.join(' ')}" data-build="${k}" ${locked?'data-locked="1"':''}
            title="${d.name}">
        <span class="pill">${ROMAN[d.tier]}</span>
        <span class="ms">${d.icon}</span>
        <small>${d.name}</small>
      </button>`;
    });
    h+=`</div>`;
  });
  if(!any) h+=`<p class="empty-note">Récoltez et produisez des ressources<br>pour débloquer de nouveaux bâtiments.</p>`;
  return h;
}
function renderBuildDetail(type){
  const d=BUILDINGS[type];
  const locked=d.tier>S.tierUnlocked;
  const cant=!locked && !canAfford(d.cost);
  let h=`<div class="dtl">
    <div class="sheet-h">
      <button class="back" data-act="cancel"><span class="ms">arrow_back</span></button>
      <h3><span class="ms">${d.icon}</span>${d.name}<span class="pill">${eraName(d.tier)}</span></h3>
    </div>
    <p class="desc">${d.desc}</p>`;
  if(locked){
    h+=`<div class="build-cta warn"><span class="ms">lock</span>
      <span>Verrouillé — atteignez l'<b>${eraName(d.tier)}</b> en construisant ${
      d.tier===2?"le <b>Centre-ville</b>":"le <b>Hub industriel</b>"}.</span></div>`;
  } else if(cant){
    h+=`<div class="build-cta warn"><span class="ms">error</span>
      <span>Ressources insuffisantes — il manque les ressources en <b>rouge</b>.</span></div>`;
  }
  h+=ioLine(d.cost,"cost")+ioLine(d.consume,"cons")+ioLine(d.produce,"prod");
  h+=`<div class="row-btn">
    <button class="btn" data-act="cancel"><span class="ms">close</span>Annuler</button>
    <button class="btn primary" data-act="build" ${(locked||cant)?"disabled":""}>
      <span class="ms">construction</span>Construire</button>
  </div>`;
  return h+`</div>`;
}
function renderInspect(b){
  const d=BUILDINGS[b.type];
  const eff=b._eff||1;
  const idle=!!d.consume && !b.paused && (b._starve||0)>=STARVE_SHOW;
  let h=`<div class="dtl">
    <div class="sheet-h">
      <h3><span class="ms">${d.icon}</span>${d.name}</h3>
      <button class="back" data-act="close"><span class="ms">close</span></button>
    </div>
    <p class="desc">${d.desc}</p>`;
  h+=ioLine(d.cost,"cost")+ioLine(d.consume,"cons")+ioLine(d.produce,"prod");
  h+=`<div class="kv"><span>État</span><b class="${idle?'neg':(b.paused?'':'pos')}">${
     b.paused?"En pause":(idle?"À l'arrêt (ressources)":"En activité")}</b></div>`;
  h+=`<div class="kv"><span>Rendement (exemplaire)</span><b>${Math.round(eff*100)}%</b></div>`;
  if(d.produce) for(const k in d.produce){
    h+=`<div class="kv"><span>Production ${rname(k)}</span>
      <b class="pos">${(d.produce[k]*(b._eff||1)*RATE).toFixed(2)}/s</b></div>`;
  }
  if(d.consume) for(const k in d.consume){
    h+=`<div class="kv"><span>Conso ${rname(k)}</span>
      <b class="neg">-${(d.consume[k]*(b._eff||1)*RATE).toFixed(2)}/s</b></div>`;
  }
  h+=`<div class="row-btn">
    <button class="btn" id="pauseBtn"><span class="ms">${b.paused?'play_arrow':'pause'}</span>${b.paused?'Reprendre':'Pause'}</button>
    <button class="btn danger" id="destroyBtn"><span class="ms">delete</span>Démolir</button>
  </div></div>`;
  return h;
}
function renderSheet(){
  const sh=$("#sheet"), body=$("#sheetBody");
  if(!UI.sheet){ sh.classList.add("hidden"); return; }
  if(UI.sheet==="palette"){
    body.innerHTML=`<div class="sheet-h">
      <h3><span class="ms">construction</span>Construire</h3>
      <button class="back" data-act="close"><span class="ms">close</span></button>
    </div>`+renderBuildTab();
  } else if(UI.sheet==="detail" && UI.selected){
    body.innerHTML=renderBuildDetail(UI.selected);
  } else if(UI.sheet==="inspect"){
    const b=S.buildings.find(x=>x.id===UI.inspect);
    body.innerHTML=b?renderInspect(b):"";
    if(!b){ UI.sheet=null; sh.classList.add("hidden"); return; }
  }
  sh.classList.remove("hidden");
}
function closeSheet(){
  UI.sheet=null; UI.selected=null; UI.inspect=null; UI.cell=null;
  $("#sheet").classList.add("hidden"); renderGrid();
}
function renderGoalsTab(includeCommon=true){
  let h="";
  if(includeCommon){
    h+=`<div class="sec-title">Progression de la colonie</div>`;
    OBJ_COMMON.forEach((o,i)=>{
      const st=i<S.objIdx?"done":(i===S.objIdx?"cur":"todo");
      const ic=st==="done"?"check_circle":(st==="cur"?o.ic:"radio_button_unchecked");
      h+=`<div class="goal ${st}"><span class="ms">${ic}</span><span>${o.t}</span>
        <span class="g-prog">${st==="cur"&&o.g?o.g(S):""}</span></div>`;
    });
  }
  if(S.spec){
    const ax=OBJ_AXIS[S.spec];
    h+=`<div class="sec-title">Destinée — ${SPECS[S.spec].name}</div>`;
    ax.forEach((o,i)=>{
      const done=S.objIdx>=OBJ_COMMON.length && i<S.axisIdx;
      const cur =S.objIdx>=OBJ_COMMON.length && i===S.axisIdx;
      const st=done?"done":(cur?"cur":"todo");
      const ic=done?"check_circle":(cur?o.ic:"radio_button_unchecked");
      h+=`<div class="goal ${st}"><span class="ms">${ic}</span><span>${o.t}</span></div>`;
    });
  } else {
    h+=`<div class="sec-title">Destinée</div>
    <p class="empty-note">Choisissez un axe à l'Ère Industrielle<br>pour révéler la suite de votre destinée.</p>`;
  }
  return h;
}
function renderBadges(){
  const res=knownResources();
  let h=`<div class="sec-title">Badges — Production</div>`;
  if(!res.length){
    h+=`<p class="empty-note">Produisez des ressources pour gagner vos premiers badges.</p>`;
  } else {
    h+=`<div class="badge-grid">`;
    res.forEach(k=>{
      const lvl=resBadgeLevel(k);
      const cur=Math.floor(S.total[k]||0);
      const tail = lvl<4 ? `${fmt(cur)}/${fmt(resThreshold(k,lvl))}` : "MAX";
      h+=`<div class="bdg b${lvl}" title="${rname(k)} — ${lvl?BADGE_TIERS[lvl-1]:"aucun badge"}">
        <span class="ms medal">workspace_premium</span>
        <span class="ms r">${RESOURCES[k].icon}</span>
        <small>${rname(k)}</small>
        <i>${lvl?BADGE_TIERS[lvl-1]:"—"} · ${tail}</i>
      </div>`;
    });
    h+=`</div>`;
  }
  h+=`<div class="sec-title">Badges — Jalons</div>`;
  metaBadges().forEach(m=>{
    h+=`<div class="bdg-row b${m.level}">
      <span class="ms medal">workspace_premium</span>
      <div><b>${m.label} — ${m.level?BADGE_TIERS[m.level-1]:"Aucun"}</b>
      <small>${m.level<4?("Prochain : "+m.hint):"Toutes les médailles obtenues"}</small></div>
      <span class="lvl">${m.level}/4</span>
    </div>`;
  });
  return h;
}
/* dimensionne la grille pour qu'elle TIENNE toujours dans son cadre */
function fitGrid(){
  const wrap=$("#gridWrap"), g=$("#grid"); if(!wrap||!g) return;
  const n=S.gridSize;
  const cs=getComputedStyle(g);
  const gap=parseFloat(cs.getPropertyValue("--gap"))||6;
  const pad=parseFloat(cs.getPropertyValue("--pad"))||10;
  // espace réellement dispo = boîte de contenu de #gridWrap
  // (on retire SON padding, qui inclut la hauteur du header quand il est ouvert)
  const ws=getComputedStyle(wrap);
  const w=wrap.clientWidth  - parseFloat(ws.paddingLeft) - parseFloat(ws.paddingRight);
  const h=wrap.clientHeight - parseFloat(ws.paddingTop)  - parseFloat(ws.paddingBottom);
  if(w<=0||h<=0) return;
  const avail=Math.min(w,h)-2*pad-gap*(n-1)-2; /* -2 : bordure */
  let cell=Math.floor(avail/n);
  cell=Math.max(30, Math.min(cell, 124));
  g.style.setProperty("--cell", cell+"px");
}
function render(){
  renderResHeader(); renderGrid(); renderSheet();
  maybePromptSpec();
  requestAnimationFrame(fitGrid);
}
function maybePromptSpec(){
  if(S.tierUnlocked>=2 && !S.spec && !UI.specPrompted){
    UI.specPrompted=true; showSpec();
  }
}

/* ===================== MODALS ===================== */
function showWin(){
  const ax=SPECS[S.spec].name;
  $("#modalBody").innerHTML=`
    <h2><span class="ms">military_tech</span>Victoire !</h2>
    <p>Votre colonie a accompli sa destinée sur l'<b>${ax}</b>.
       Toute la chaîne de production tourne sur une colonie ${S.gridSize}×${S.gridSize}.</p>
    <p>Vous pouvez continuer à optimiser, ou repartir pour explorer une autre destinée.</p>
    <div class="row-btn">
      <button class="btn" onclick="closeModal()">Continuer</button>
      <button class="btn danger" onclick="resetGame()">Nouvelle partie</button>
    </div>`;
  $("#modal").classList.remove("hidden");
}
function openMenu(){
  let spec="";
  if(S.tierUnlocked>=2 && !S.spec){
    spec=`<button class="btn primary mfull" onclick="showSpec()">
      <span class="ms">hub</span>Choisir une spécialisation</button>`;
  }
  $("#modalBody").innerHTML=`
    <div class="sheet-h"><h2><span class="ms">settings</span>Réglages</h2>
      <button class="back" onclick="closeModal()"><span class="ms">close</span></button></div>
    <div class="menu-actions">
      ${spec}
      <button class="btn mfull" onclick="saveGame();toast('Partie sauvegardée');closeModal()">
        <span class="ms">save</span>Sauvegarder la partie</button>
      <button class="btn mfull" onclick="confirmReset()">
        <span class="ms">restart_alt</span>Recommencer la partie</button>
      <button class="btn mfull" onclick="goHome()">
        <span class="ms">home</span>Retour au menu des jeux</button>
    </div>
    <div class="sec-title">Statistiques — production /s</div>${renderStats()}
    ${renderGoalsTab(false)}
    ${renderBadges()}`;
  $("#modal").classList.remove("hidden");
}
function confirmReset(){
  $("#modalBody").innerHTML=`
    <h2><span class="ms">restart_alt</span>Recommencer ?</h2>
    <p>Toute la progression de cette partie sera <b>définitivement effacée</b>.</p>
    <div class="row-btn">
      <button class="btn" onclick="openMenu()"><span class="ms">arrow_back</span>Annuler</button>
      <button class="btn danger" onclick="resetGame()"><span class="ms">delete_forever</span>Oui, recommencer</button>
    </div>`;
}
function goHome(){
  try{ saveGame(); }catch(e){}
  window.location.href="../../index.html";
}
function showSpec(){
  let cards="";
  for(const k in SPECS){ const sp=SPECS[k];
    cards+=`<div class="spec-card" data-spec="${k}">
      <h4><span class="ms">${sp.icon}</span>${sp.name}</h4>
      <div class="mods">${sp.txt.map(([r,p])=>
        `<span class="${p>0?'up':'dn'}">${p>0?'+':''}${p}% ${rname(r)}</span>`).join(" · ")}</div>
    </div>`;
  }
  $("#modalBody").innerHTML=`
    <h2><span class="ms">hub</span>Choisissez votre axe</h2>
    <p>À l'Ère Industrielle, spécialisez votre colonie. Ce choix oriente votre destinée finale.</p>
    ${cards}`;
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
    S.stock=d.stock||{}; S.total=d.total||{};
    S.buildings=d.buildings||[]; S.logs=d.logs||[]; S.badges=d.badges||{};
    checkBadges(true);   // baseline silencieux (pas de toasts au chargement)
    // progression hors-ligne limitée
    const elapsed=Math.floor((Date.now()-(d.lastSave||Date.now()))/1000);
    const n=Math.min(Math.max(0,elapsed),OFFLINE_CAP);
    for(let i=0;i<n;i++) tick(true);
    if(n>5) log(`Progression hors-ligne : ${n}s simulées`,"info");
  }catch(e){ S=freshState(); }
}
function resetGame(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  S=freshState();
  UI.sheet=null; UI.selected=null; UI.inspect=null; UI.cell=null; UI.specPrompted=false;
  $("#sheet").classList.add("hidden");
  closeModal(); log("Nouvelle partie","info"); render();
}

/* ===================== EVENTS ===================== */
function bind(){
  const grid=$("#grid");

  grid.addEventListener("click",e=>{
    const cell=e.target.closest(".cell"); if(!cell) return;
    const [r,c]=cell.dataset.c.split(",").map(Number);
    const b=at(r,c);
    if(b){ UI.inspect=b.id; UI.selected=null; UI.cell=null; UI.sheet="inspect"; }
    else { UI.cell={r,c}; UI.selected=null; UI.inspect=null; UI.sheet="palette"; }
    renderGrid(); renderSheet();
  });

  // contenu du bottom-sheet (palette / détail / inspection)
  $("#sheet").addEventListener("click",e=>{
    if(e.target.id==="sheet"){ closeSheet(); return; }   // tap hors carte
    if(e.target.closest('[data-act="close"]')){ closeSheet(); return; }
    if(e.target.closest('[data-act="cancel"]')){
      UI.selected=null; UI.sheet="palette"; renderSheet(); return;
    }
    if(e.target.closest('[data-act="build"]')){
      const t=UI.selected, pc=UI.cell;
      if(t && pc){ placeBuilding(t,pc.r,pc.c); if(at(pc.r,pc.c)) closeSheet(); }
      return;
    }
    const bc=e.target.closest("[data-build]");
    if(bc){
      if(bc.dataset.locked){
        const d=BUILDINGS[bc.dataset.build];
        toast(`Verrouillé — construisez ${d.tier===2?"le Centre-ville":"le Hub industriel"}`,true);
        return;
      }
      UI.selected=bc.dataset.build; UI.sheet="detail"; renderSheet(); return;
    }
    const sp=e.target.closest("[data-spec]");
    if(sp){ chooseSpec(sp.dataset.spec); return; }
    if(e.target.closest("#pauseBtn")){
      const b=S.buildings.find(x=>x.id===UI.inspect); if(b){ togglePause(b); renderSheet(); } return;
    }
    if(e.target.closest("#destroyBtn")){
      const b=S.buildings.find(x=>x.id===UI.inspect); if(b){ destroyBuilding(b); closeSheet(); } return;
    }
  });

  $("#hdrToggle").addEventListener("click",()=>{
    S.headerOpen=!S.headerOpen; renderResHeader();
  });
  $("#hdrClose").addEventListener("click",()=>{
    S.headerOpen=false; renderResHeader();
  });

  $("#expandBtn").addEventListener("click",tryExpand);
  $("#menuBtn").addEventListener("click",openMenu);
  $("#modal").addEventListener("click",e=>{
    const sp=e.target.closest("[data-spec]");
    if(sp){ chooseSpec(sp.dataset.spec); return; }
    if(e.target.id==="modal" && S.spec) closeModal();
  });

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){ closeSheet(); if(S.spec) closeModal(); }
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
window.confirmReset=confirmReset;
window.goHome=goHome;
window.openMenu=openMenu;
window.saveGame=saveGame;
window.showSpec=showSpec;
window.toast=toast;

/* ===================== BOOT ===================== */
loadGame();
bind();
render();
setInterval(()=>tick(false),1000);
setInterval(saveGame,5000);
