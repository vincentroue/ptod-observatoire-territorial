---
title: Exploration Multi-échelons
toc: false
theme: dashboard
style: styles/dashboard.css
---

<!-- BANNIÈRE PLEINE LARGEUR -->
<div class="banner-full">
  <div class="banner-inner">
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" stroke="#2563eb" stroke-width="2" fill="#e8f0fe"/>
      <path d="M12 28 L20 12 L28 28 Z" fill="#2563eb" opacity="0.8"/>
      <circle cx="20" cy="22" r="4" fill="#1e40af"/>
    </svg>
    <div class="banner-titles">
      <h1>OTTD — Observatoire des Trajectoires Territoriales de Développement</h1>
      <p>Structure des migrations et évolution socio-éco-démographique des territoires français 2011-2023 — Vincent Roué</p>
    </div>
    <span class="sources-btn" title="Sources : INSEE RP 2011/2016/2022, FLORES emploi. Calculs : TCAM, soldes naturel/migratoire apparents. Géométries : IGN Admin Express 2025.">? Sources</span>
    <div class="nav-banner">
      <a href="./jottd-exd-explor-dyn" class="nav-btn active">EXD</a>
      <a href="./dash-exdtc-template-commune" class="nav-btn">Communes</a>
      <a href="./jottd-exdc-comm-bis" class="nav-btn">Comm-bis</a>
      <a href="#" class="nav-btn disabled" style="opacity:0.4;pointer-events:none;">Flux</a>
      <a href="#" class="nav-btn disabled" style="opacity:0.4;pointer-events:none;">Logement</a>
      <a href="#" class="nav-btn disabled" style="opacity:0.4;pointer-events:none;">Économie</a>
    </div>
  </div>
</div>

```js
// === IMPORTS ===
import * as topojson from "npm:topojson-client";
import rewind from "npm:@mapbox/geojson-rewind";
import { createSearchBox } from "./helpers/search.js";

// Helpers modulaires (refactoring P1 + P2.1 dictionnaire enrichi)
// AUTO-GÉNÉRÉ depuis config/ddict_indicateurs_ottd.json

import {
  INDICATEURS,
  PERIODES,
  THEMES,
  parseColKey,
  getColLabel,
  getColLabelFull,
  getTitreMap,
  getSousTitreMap,
  getTooltip,
  getSource,
  formatValue,
  getIndicateurOptions,
  getDropdownOptions,
  getIndicOptions,
  getIndicatorType,
  makeQuantileBins
} from "./helpers/indicators-ddict-js.js";

import {
  tcam,
  linearRegression,
  linearRegressionOrigin,
  computeStats,
  computeAllStats
} from "./helpers/aggregate.js";

// Table helpers (Phase 2 refactoring)
import {
  computeMaxByCol,
  computeExtremes,
  sortData,
  makeBar as makeBarHelper,
  thSort as thSortHelper
} from "./helpers/table.js";

// Scatter helpers (Phase 5a refactoring)
import {
  renderScatter,
  addScatterClickHandlers
} from "./helpers/scatter.js";

// Maps helpers (Phase 5b refactoring)
import {
  renderChoropleth,
  createMapWrapper,
  addMapClickHandlers,
  createStatsOverlay,
  addZoomBehavior  // P4.3: zoom D3
} from "./helpers/maps.js";

// Legend helpers (Phase 5c refactoring)
import {
  createTypologieLegend,
  createGradientLegend,
  createBinsLegend,
  createEcartFranceLegend,
  getGradientColors
} from "./helpers/legend.js";

import {
  PAL_PURPLE_GREEN,
  PAL_BLUE_YELLOW,
  PAL_SEQ_BLUE,
  PAL_SEQ_ORANGE,
  GRADIENT_PALETTES,
  DENS3_LABELS,
  DENS3_COLORS,
  DENS7_LABELS,
  DENS7_COLORS,
  TYPE_EPCI_COLORS,
  getColorByBins,
  getColorBySeqBins,
  makeSeqQuantileBins,
  getDens3Color,
  getDens7Color,
  getTypeEpciColor,
  countBins,
  computeEcartFrance,
  PAL_ECART_FRANCE,
  ECART_FRANCE_SYMBOLS
} from "./helpers/colors.js";
```

```js
// === HELPERS PÉRIODES (fonctions pures, sans dépendance aux données) ===

// Extrait l'année de fin pour le tri : "1624" → 24, "22" → 22
function getEndYear(periodeKey) {
  return parseInt(periodeKey.slice(-2), 10);
}

// Formate le label lisible d'une période
function formatPeriodeLabel(periode) {
  if (periode.includes("_")) {
    // Période évolution : "11_16" → "2011-16"
    const [start, end] = periode.split("_");
    return `20${start}-${end}`;
  }
  // Période stock : "22" → "2022"
  return `20${periode}`;
}
```

```js
// === HELPER DEBOUNCE INPUT ===
// Retarde l'émission d'input pour éviter recalculs multiples sur changements rapides
function debounceInput(input, delay = 300) {
  const container = document.createElement("div");
  container.appendChild(input);
  let timeout = null;
  let currentValue = input.value;

  Object.defineProperty(container, "value", {
    get: () => currentValue,
    set: (v) => { currentValue = v; input.value = v; }
  });

  input.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      currentValue = input.value;
      container.dispatchEvent(new Event("input", { bubbles: true }));
    }, delay);
  });

  return container;
}
```

```js
// === CHARGEMENT DONNÉES (LAZY LOADING) ===
// P2.5: Charge ZE + EPCI au démarrage pour détection complète des indicateurs
// EPCI contient le plus de colonnes (logd_, dmf_) non présentes dans ZE

console.time("[EXD] Data load ZE+EPCI");
// ZE = échelon par défaut, EPCI = référence colonnes complète
const dataZE = await FileAttachment("data/agg_ze.json").json();
const dataEPCI = await FileAttachment("data/agg_epci.json").json();
console.timeEnd("[EXD] Data load ZE+EPCI");
console.log(`[EXD] ZE: ${dataZE.length} territoires, EPCI: ${dataEPCI.length} territoires`);

// Handles (références sans chargement immédiat pour les autres)
const DATA_HANDLES = {
  "Zone d'emploi": null,  // Déjà chargé ci-dessus
  "Département": FileAttachment("data/agg_dep.json"),
  "Région": FileAttachment("data/agg_reg.json"),
  "EPCI": null,  // Déjà chargé ci-dessus
  "Aire d'attraction": FileAttachment("data/agg_aav.json"),
  "Bassin de vie": FileAttachment("data/agg_bv.json"),
  "Unité urbaine": FileAttachment("data/agg_uu.json")
};

// Cache mémoire (évite rechargement si retour sur échelon déjà visité)
const aggDataCache = new Map([
  ["Zone d'emploi", dataZE],
  ["EPCI", dataEPCI]
]);

// Loader lazy avec cache
async function getAggData(echelon) {
  if (!aggDataCache.has(echelon)) {
    const handle = DATA_HANDLES[echelon];
    if (handle) {
      console.log(`[Lazy] Chargement ${echelon}...`);
      aggDataCache.set(echelon, await handle.json());
    } else {
      aggDataCache.set(echelon, dataZE);  // Fallback ZE
    }
  }
  return aggDataCache.get(echelon);
}

// === INDICATEURS DISPONIBLES (détectés depuis ZE + EPCI pour union complète) ===
// EPCI contient colonnes supplémentaires (logd_, dmf_) non présentes dans ZE
// Périodes supportées: stocks (11,16,21,22,23,24) + évolutions (1116,1622,1623,1122,1624,1924,2224,2122)
const AVAILABLE_INDICS = new Set();
const AVAILABLE_COLUMNS = new Set();  // Toutes les colonnes avec période (ex: dm_pop_vtcam_1622)

// Regex compilée UNE SEULE FOIS (perf: évite recompilation à chaque itération)
const COL_PERIOD_REGEX = /^(.+?)_(1116|1622|1623|1122|1624|1924|2224|2122|22|21|23|24|16|11)$/;

// Helper extraction colonnes depuis un sample
function extractIndicCols(sample) {
  for (const col of Object.keys(sample)) {
    const match = COL_PERIOD_REGEX.exec(col);
    if (match) {
      AVAILABLE_INDICS.add(match[1]);
      AVAILABLE_COLUMNS.add(col);
    }
  }
}

// Union colonnes ZE + EPCI (scanner TOUTES les lignes car colonnes variables selon territoires)
for (const row of dataZE) extractIndicCols(row);
for (const row of dataEPCI) extractIndicCols(row);
console.log(`[INDICS] ${AVAILABLE_INDICS.size} indicateurs, ${AVAILABLE_COLUMNS.size} colonnes disponibles (ZE+EPCI)`);

// === HELPER PÉRIODES DYNAMIQUES (dépend de AVAILABLE_COLUMNS) ===
// Retourne les périodes disponibles pour un indicateur sous forme de Map pour dropdown
// FILTRE : ne montre que les périodes avec données réellement présentes dans le JSON
function getPeriodesForIndicateur(indicKey) {
  const indicInfo = INDICATEURS[indicKey];
  if (!indicInfo || !indicInfo.periodes || indicInfo.periodes.length === 0) {
    // Défaut si pas de métadonnées
    return new Map([["2016-22", "1622"], ["2011-16", "1116"]]);
  }

  const options = [];
  for (const p of indicInfo.periodes) {
    // Convertir format ddict → format colonne
    // "11_16" → "1116", "22" → "22"
    const key = p.replace("_", "");
    const colName = `${indicKey}_${key}`;  // ex: dm_pop_vtcam_1622

    // FILTRE : n'ajouter que si la colonne existe dans le JSON
    if (AVAILABLE_COLUMNS.has(colName)) {
      const label = formatPeriodeLabel(p);
      const endYear = getEndYear(key);
      options.push({ label, key, endYear });
    }
  }

  // Si aucune période valide, retourner défaut
  if (options.length === 0) {
    console.warn(`[PERIODES] Aucune période disponible pour ${indicKey}`);
    return new Map([["—", ""]]);
  }

  // Trier par année de fin DÉCROISSANTE (plus récent en premier)
  options.sort((a, b) => b.endYear - a.endYear);

  return new Map(options.map(o => [o.label, o.key]));
}

// Dropdown filtré : ne montre que les indicateurs présents dans les données
function getFilteredDropdownOptions() {
  const allOptions = getDropdownOptions();
  const filtered = [];
  for (const [label, value] of allOptions) {
    // Garder séparateurs thèmes
    if (value.startsWith("__sep_")) {
      filtered.push([label, value]);
    } else if (AVAILABLE_INDICS.has(value)) {
      filtered.push([label, value]);
    }
  }
  // Supprimer séparateurs sans indicateurs après
  const cleaned = [];
  for (let i = 0; i < filtered.length; i++) {
    const [label, value] = filtered[i];
    if (value.startsWith("__sep_")) {
      // Vérifier si prochain élément est un indicateur (pas un autre séparateur)
      if (i + 1 < filtered.length && !filtered[i + 1][1].startsWith("__sep_")) {
        cleaned.push([label, value]);
      }
    } else {
      cleaned.push([label, value]);
    }
  }
  return new Map(cleaned);
}

// === LAZY LOADING TopoJSON ===
// 6 échelons avec fichiers géo disponibles
const GEO_HANDLES = {
  "Zone d'emploi": FileAttachment("data/nodom_zones-emploi_2025.topojson"),
  "Département": FileAttachment("data/nodom_departement_2025.topojson"),
  "Région": FileAttachment("data/nodom_region_2025.topojson"),
  "EPCI": FileAttachment("data/nodom_epci_2025.topojson"),
  "Aire d'attraction": FileAttachment("data/nodom_aav_2025.topojson"),
  "Bassin de vie": FileAttachment("data/nodom_bv_2025.topojson")
};

// Config metadata - needsRewind: true applique rewind() pour winding order D3.js
const ECHELON_META = {
  "Zone d'emploi": { key: "ze2020", geoKey: "ze2020", labelKey: "libze2020", needsRewind: true },
  "Département": { key: "dep", geoKey: "code_insee", labelKey: "nom_officiel", needsRewind: true },
  "Région": { key: "reg", geoKey: "code_insee", labelKey: "nom_officiel", needsRewind: true },
  "EPCI": { key: "epci", geoKey: "EPCI", labelKey: "EPCIlib", needsRewind: true },
  "Aire d'attraction": { key: "aav2020", geoKey: "aav2020", labelKey: "libaav2020", needsRewind: true },
  "Bassin de vie": { key: "bv2022", geoKey: "bv2022", labelKey: "libbv2022", needsRewind: true }
};

// Libellés maps - initialisés vides, remplis au premier chargement
const labelMaps = {
  "Zone d'emploi": new Map(),
  "Département": new Map(),
  "Région": new Map(),
  "EPCI": new Map(),
  "Aire d'attraction": new Map(),
  "Bassin de vie": new Map()
};

// Alias pour compatibilité (seront remplis après chargement)
let zeLabelMap = labelMaps["Zone d'emploi"];
let depLabelMap = labelMaps["Département"];
let regLabelMap = labelMaps["Région"];
let epciLabelMap = labelMaps["EPCI"];
let aavLabelMap = labelMaps["Aire d'attraction"];
let bvLabelMap = labelMaps["Bassin de vie"];

// === TDC EPCI (typologies) - CSV avec séparateur ;
const tdcEPCI_text = await FileAttachment("data/tdc_sat3col_epci.csv").text();
const tdcEPCI_raw = d3.dsvFormat(";").parse(tdcEPCI_text.replace(/^\ufeff/, ""));  // Remove BOM
const tdcEPCI = new Map(tdcEPCI_raw.map(d => [d.EPCI, {
  TYPE_EPCI: d.TYPE_EPCI,           // CC, CA, CU, MET
  TYPE_EPCIlib: d.TYPE_EPCIlib,     // Communauté de communes, etc.
  libLong: d.EPCIlibFull,
  libShort: d.EPCIlibShort,
  DENSEPCI: d.DENSEPCI,             // 1-4
  DENSEPCIlib: d.DENSEPCIlib        // Urbain dense, etc.
}]));

// === TDC REGION (codes courts) - CSV avec séparateur ;
const tdcREG_text = await FileAttachment("data/tdc_sat3col_reg.csv").text();
const tdcREG_raw = d3.dsvFormat(";").parse(tdcREG_text.replace(/^\ufeff/, ""));
const tdcREG = new Map(tdcREG_raw.map(d => [d.REG, { lib: d.REGlib, short: d.REGshort }]));

// === TDC DEPARTEMENT (codes courts) - CSV avec séparateur ;
const tdcDEP_text = await FileAttachment("data/tdc_sat3col_dep.csv").text();
const tdcDEP_raw = d3.dsvFormat(";").parse(tdcDEP_text.replace(/^\ufeff/, ""));
const tdcDEP = new Map(tdcDEP_raw.map(d => [d.DEP, { lib: d.DEPlib, short: d.DEPshort }]));

// === DENSITÉ & TYPOLOGIES : importés de ./helpers/colors.js ===
// DENS3_LABELS, DENS7_LABELS, DENS3_COLORS, DENS7_COLORS, TYPE_EPCI_COLORS
const TYPE_EPCI_LABELS = {
  "CC": "Communauté de Communes",
  "CA": "Communauté d'Agglomération",
  "CU": "Communauté Urbaine",
  "MET": "Métropole"
};
```

```js
// === TCAM & FONCTIONS STATS : importés de ./helpers/aggregate.js ===
// tcam, linearRegression, linearRegressionOrigin
```

```js
// === CHARGEMENT LAZY GEO (réactif à echelon) ===
// Charge UNIQUEMENT l'échelon sélectionné (gain ×4-7 au démarrage)
console.time(`[EXD] Geo load ${echelon}`);
const meta = ECHELON_META[echelon] || ECHELON_META["Zone d'emploi"];
const geoRawJson = await GEO_HANDLES[echelon].json();

// Conversion TopoJSON → GeoJSON si nécessaire
const geoConverted = geoRawJson.type === "Topology"
  ? topojson.feature(geoRawJson, geoRawJson.objects[Object.keys(geoRawJson.objects)[0]])
  : geoRawJson;
console.timeEnd(`[EXD] Geo load ${echelon}`);

// Rewind pour EPCI (winding order D3)
const currentGeo = meta.needsRewind ? rewind(geoConverted, true) : geoConverted;

// Mettre à jour la map des libellés pour cet échelon
labelMaps[echelon] = new Map(currentGeo.features.map(f => [f.properties[meta.geoKey], f.properties[meta.labelKey]]));

// CONFIG dynamique avec geo chargé
const CONFIG_ECHELON = {
  [echelon]: { key: meta.key, geo: currentGeo, geoKey: meta.geoKey }
};

// === INDICATEURS : importés de ./helpers/indicators.js ===
// INDICATEURS, getColLabel, formatValue, makeQuantileBins, countBins

// === PALETTES : importées de ./helpers/colors.js ===
// PAL_SEQ_BLUE, PAL_PURPLE_GREEN, PAL_BLUE_YELLOW
```

<!-- ========== SOUS-BANNIÈRE UNIFIÉE ========== -->
<div class="sub-banner">
<div class="sub-banner-inner">

<div class="sub-group sub-group-indic">
<div class="sub-group-title" title="Ligne 1 : Indicateur colorant les cartes + axe X des scatter plots&#10;Ligne 2 : Axe Y des scatter plots&#10;GAUCHE = carte/scatter gauche | DROITE = carte/scatter droite">Indicateurs & Périodes <span style="cursor:help;color:#6b7280;">ⓘ</span></div>
<div class="indic-grid">
<div></div><div class="hdr hdr-g">GAUCHE</div><div></div><div class="hdr hdr-d">DROITE</div>
<div class="lbl">Cartes & axe X</div>
<div class="sel-ind">

```js
const indicX_L = view(Inputs.select(
  getFilteredDropdownOptions(),
  {value: "dm_pop_vtcam", label: ""}
));
```

</div>
<div class="sel-per">

```js
// Périodes dynamiques selon indicateur X gauche
const periodesMap_XL = getPeriodesForIndicateur(indicX_L);
const periode_XL = view(Inputs.select(
  periodesMap_XL,
  {value: [...periodesMap_XL.values()][0], label: ""}
));
```

</div>
<div class="sep">│</div>
<div class="sel-ind">

```js
const indicX_R_raw = view(Inputs.select(
  new Map([["= G", "__sync__"], ...getFilteredDropdownOptions()]),
  {value: "__sync__", label: ""}
));
```

</div>
<div class="sel-per">

```js
// Périodes dynamiques selon indicateur X droite (résolu depuis sync)
const indicX_R_resolved = indicX_R_raw === "__sync__" ? indicX_L : indicX_R_raw;
const periodesMap_XR = getPeriodesForIndicateur(indicX_R_resolved);

// Si =G (sync), choisir période antérieure par défaut pour comparer 2 époques
// Priorité: 1116 > plus ancienne disponible (différente de gauche)
const allPeriodesR = [...periodesMap_XR.values()];
const isSyncR = indicX_R_raw === "__sync__";
let defaultPeriodeXR = allPeriodesR[0];  // Par défaut: la plus récente

if (isSyncR && allPeriodesR.length > 1) {
  // Chercher 1116 d'abord
  if (allPeriodesR.includes("1116")) {
    defaultPeriodeXR = "1116";
  } else {
    // Sinon prendre la plus ancienne (dernière dans liste triée décroissante)
    // qui est différente de celle de gauche
    for (let i = allPeriodesR.length - 1; i >= 0; i--) {
      if (allPeriodesR[i] !== periode_XL) {
        defaultPeriodeXR = allPeriodesR[i];
        break;
      }
    }
  }
}

const periode_XR = view(Inputs.select(
  periodesMap_XR,
  {value: defaultPeriodeXR, label: ""}
));
```

</div>
<div class="lbl">Axe Y scatter</div>
<div class="sel-ind">

```js
const indicY_L = view(Inputs.select(
  getFilteredDropdownOptions(),
  {value: "dm_sma_vtcam", label: ""}
));
```

</div>
<div class="sel-per">

```js
// Périodes dynamiques selon indicateur Y gauche
const periodesMap_YL = getPeriodesForIndicateur(indicY_L);
const periode_YL = view(Inputs.select(
  periodesMap_YL,
  {value: [...periodesMap_YL.values()][0], label: ""}
));
```

</div>
<div class="sep">│</div>
<div class="sel-ind">

```js
const indicY_R_raw = view(Inputs.select(
  new Map([["= G", "__sync__"], ...getFilteredDropdownOptions()]),
  {value: "__sync__", label: ""}
));
```

</div>
<div class="sel-per">

```js
// Périodes dynamiques selon indicateur Y droite (résolu depuis sync)
const indicY_R_resolved = indicY_R_raw === "__sync__" ? indicY_L : indicY_R_raw;
const periodesMap_YR = getPeriodesForIndicateur(indicY_R_resolved);
const periode_YR = view(Inputs.select(
  periodesMap_YR,
  {value: [...periodesMap_YR.values()][0], label: ""}
));
```

</div>
</div>
</div>

</div>
</div>

```js
// Config typo et couleurs (colorBy = cartes, scatterColorBy = scatter)
const isTypoMode = colorBy !== "Indicateur";
const typoConfig = {
  "Rur/Urb 3": { labels: DENS3_LABELS, colors: DENS3_COLORS, key: "DENS" }
};
const currentTypo = typoConfig[colorBy] || null;
const densGrille = colorBy === "Rur/Urb 3" ? "3 niveaux" : "Aucun";
const densKey = densGrille === "3 niveaux" ? "DENS" : null;
const densFilter = null;

// Couleur carte (mode typo ou indicateur)
const getTypoColor = (d) => {
  if (!currentTypo) return "#ccc";
  return currentTypo.colors[d[currentTypo.key]] || "#e0e0e0";
};

// Couleur scatter (selon scatterColorBy)
const isScatterTypoMode = scatterColorBy === "Typo Rur/Urb";
const getScatterTypoColor = (d) => DENS3_COLORS[d.DENS] || "#e0e0e0";
```


<!-- ========== LAYOUT PRINCIPAL ========== -->
<div class="layout-main">

<!-- BLOC GAUCHE -->
<div class="left-panel">

<div class="panel-section">
<div class="panel-title">ÉCHELON</div>

```js
// Debounce 300ms pour éviter recalculs multiples lors changement rapide d'échelon
// 6 échelons avec fichiers géo disponibles
const echelon = view(debounceInput(Inputs.radio(
  ["Zone d'emploi", "Département", "Région", "EPCI", "Aire d'attraction", "Bassin de vie"],
  {value: "Zone d'emploi", label: ""}
), 300));
```

</div>

<div class="panel-section">
<div class="panel-title" style="display:flex;justify-content:space-between;align-items:center;">
  SÉLECTION TERRITOIRES
  <button id="btn-clear-sel" style="font-size:9px;padding:2px 6px;cursor:pointer;border:1px solid #ccc;border-radius:3px;background:#f5f5f5;">✕ Effacer</button>
</div>

```js
// === SÉLECTION TERRITOIRES (Fuse.js search helper) ===
// État mutable pour sélection (comme EXDC)
const selectionSet = Mutable(new Set());

// IMPORTANT: Stocker référence sur window pour éviter problème de closure
// quand Observable re-rend les blocs (le setTimeout perdrait la référence)
window._selectionSetRef = selectionSet;

// Flag et queue pour synchronisation DOM (le setTimeout de highlight est défini plus bas)
window._mapHighlightsReady = false;
window._pendingHighlightUpdate = false;

// Toggle handler (identique EXDC) + refresh highlights carte
const toggleSelection = (code) => {
  const current = new Set(selectionSet.value);
  current.has(code) ? current.delete(code) : current.add(code);
  selectionSet.value = current;
  console.log(`[toggleSelection] code=${code}, selectionSet.value.size=${current.size}, mapReady=${window._mapHighlightsReady}`);

  // Mettre à jour highlights carte
  if (window._mapHighlightsReady && window._updateMapHighlights) {
    console.log("[toggleSelection] Appel window._updateMapHighlights()");
    window._updateMapHighlights();
  } else {
    // Marquer qu'une mise à jour est en attente (sera traitée quand DOM prêt)
    console.log("[toggleSelection] DOM pas prêt, mise en attente");
    window._pendingHighlightUpdate = true;
  }
};

// Dériver Array depuis Set (compatibilité avec le reste du code)
const selectedTerritoires = [...selectionSet.value];

// Données formatées pour searchBox
const searchData = (territoiresWithLabels || []).map(d => ({
  code: d.code,
  label: d.nomBase || d.libelle || d.code,
  pop: d.P22_POP
}));

// Composant search avec chips (passer Mutable, pas .value)
const searchBox = createSearchBox({
  data: searchData,
  selection: selectionSet,  // Mutable direct (pas .value)
  onToggle: toggleSelection,
  placeholder: "🔍 2+ lettres...",
  maxWidth: 230
});

display(searchBox);

// Bouton effacer
document.getElementById("btn-clear-sel")?.addEventListener("click", () => {
  selectionSet.value = new Set();
  searchBox.refresh();
  if (window._mapHighlightsReady && window._updateMapHighlights) {
    window._updateMapHighlights();
  }
});
```

</div>

<div class="panel-section">
<div class="panel-title">OPTIONS CARTES</div>

```js
const _colorModeInput = Inputs.radio(["Répartition", "Écart France", "Gradient"], {value: "Répartition", label: "Mode représ."});
const _radioTips = {
  "Répartition": "Découpe en classes de taille égale (quantiles). Chaque couleur contient environ le même nombre de territoires.",
  "Écart France": "Compare chaque territoire à la valeur France. 9 niveaux symétriques autour de la référence nationale (écart-type winsorisé).",
  "Gradient": "Dégradé continu proportionnel à la valeur brute. Outliers atténués aux percentiles P02-P98."
};
_colorModeInput.querySelectorAll("label").forEach(lbl => {
  const input = lbl.querySelector("input");
  const txt = input?.value;
  if (_radioTips[txt]) {
    const tip = document.createElement("span");
    tip.className = "panel-tooltip-wrap";
    tip.style.marginLeft = "2px";
    tip.innerHTML = `<span class="panel-tooltip-icon">?</span><span class="panel-tooltip-text">${_radioTips[txt]}</span>`;
    lbl.appendChild(tip);
  }
});
const colorMode = view(_colorModeInput);
const paletteChoice = view(Inputs.radio(["Violet-Vert", "Bleu-Jaune"], {value: "Violet-Vert", label: "Palette"}));
const colorBy = view(Inputs.radio(["Indicateur", "Rur/Urb 3"], {value: "Indicateur", label: "Couleur par"}));
```

</div>

<div class="panel-section">
<div class="panel-title">OPTIONS SCATTER</div>

```js
const showTrendLine = view(Inputs.toggle({label: "Droite régression (R²)", value: false}));
const showLabelsOnMap = view(Inputs.toggle({label: "Étiquettes territoires", value: false}));
const scatterColorBy = view(Inputs.radio(["Valeur", "Typo Rur/Urb"], {value: "Valeur", label: "Couleurs bulles"}));
```

</div>

<div class="panel-section">
<div class="panel-title">COL. DATA TABLEAU</div>

```js
// Même options que Carte & axe X (via getDropdownOptions)
const tableIndicateurs = view(Inputs.select(
  getFilteredDropdownOptions(),
  {value: ["dm_pop_vtcam", "dm_sma_vtcam"], multiple: true, label: ""}
));
```

</div>

</div><!-- fin left-panel -->

<!-- CONTENU PRINCIPAL -->
<div class="content-main">

```js
// === DONNÉES PRÉ-AGRÉGÉES (JSON lazy) + GEO (TopoJSON lazy) ===
// P2.5: Chargement lazy via getAggData (cache mémoire)
const rawTableData = await getAggData(echelon);

// === FRANCE LOOKUP (code 00FR en 1ère ligne de tous les JSON) ===
// Valeurs France pré-calculées pour stats overlay (pas de recalcul d3.mean)
const frData = rawTableData.find(d => d.code === "00FR");
// Données SANS France pour scatter/carte (France n'a pas de polygone)
const dataNoFrance = rawTableData.filter(d => d.code !== "00FR");

const cfg = { key: meta.key, geo: currentGeo, geoKey: meta.geoKey };
const hasGeo = currentGeo !== null;

// === JOINTURE GEO + DATA ===
// Créer lookup map depuis données tabulaires (code → row)
const dataByCode = new Map(rawTableData.map(d => [d.code, d]));

// Joindre données aux features geo (PERF: Object.assign au lieu de spread dans boucle)
const rawGeoData = currentGeo ? {
  type: currentGeo.type,
  features: currentGeo.features.map(f => {
    const geoCode = f.properties[cfg.geoKey];
    const dataRow = dataByCode.get(geoCode);
    // Mutation directe properties (évite copie complète feature)
    const props = Object.assign({}, f.properties, { code: geoCode }, dataRow || {});
    return { type: f.type, geometry: f.geometry, properties: props };
  })
} : null;

// Helper pour récupérer le code d'une feature geo selon l'échelon
const getCodeFromFeature = (f) => {
  if (!f?.properties) return null;
  return f.properties.code || f.properties[cfg.geoKey] || null;
};

// Filtrage par densité si activé
// IMPORTANT: tableData utilise dataNoFrance (exclut 00FR pour scatter/carte)
// France sera ajoutée séparément en 1ère ligne du tableau
let tableData = (densGrille !== "Aucun" && densFilter != null)
  ? dataNoFrance.filter(d => d[densKey] === densFilter)
  : dataNoFrance;
let geoData = (densGrille !== "Aucun" && densFilter != null && rawGeoData?.features)
  ? {...rawGeoData, features: rawGeoData.features.filter(f => f.properties[densKey] === densFilter)}
  : rawGeoData;

// Filtrage par sélection si activé (sera évalué après que filterOnSelection soit défini)
const applySelectionFilter = (data, geo, selection, doFilter) => {
  if (!doFilter || selection.length === 0) return { data, geo };
  const filteredData = data.filter(d => selection.includes(d.code));
  const filteredGeo = geo?.features
    ? {...geo, features: geo.features.filter(f => selection.includes(getCodeFromFeature(f)))}
    : geo;
  return { data: filteredData, geo: filteredGeo };
};

const getLabel = d => {
  if (!d || !d.code) return "—";
  // Utiliser labelMaps dynamique (rempli au chargement lazy)
  const labelMap = labelMaps[echelon];
  return labelMap?.get(d.code) || d.code || "—";
};

// Libellé densité
const getDensLabel = d => {
  if (densGrille === "3 niveaux") return DENS3_LABELS[d.DENS] || "—";
  if (densGrille === "7 niveaux") return DENS7_LABELS[d.DENS7] || "—";
  return "";
};

// === ÉCHELLE RAYON BULLES (meilleure discrimination) ===
// Min/max population pour l'échelon courant
const popExtent = d3.extent(tableData, d => d.P22_POP || 0);
const popMin = Math.max(1, popExtent[0] || 1);
const popMax = Math.max(popMin * 2, popExtent[1] || popMin * 2);  // Garantir écart min
// Rayon min/max selon échelon (plus gros pour moins d'entités)
// rMin réduit + rMax augmenté = meilleure discrimination gros/petit
const rMin = echelon === "Région" ? 10 : echelon === "Département" ? 6 : 3;
const rMax = echelon === "Région" ? 70 : echelon === "Département" ? 55 : 45;
// Échelle pow(0.28) très agressive pour discrimination maximale (Paris vs Creuse)
// sqrt = pow(0.5), pow(0.28) écrase les petits, amplifie les gros
const radiusScale = d3.scalePow().exponent(0.28).domain([popMin, popMax]).range([rMin, rMax]).clamp(true);

// === RÉSOLUTION GRILLE 2x2 ===
// Indicateurs (résoudre "= Gauche" → sync avec colonne gauche)
const indicX_R = indicX_R_raw === "__sync__" ? indicX_L : indicX_R_raw;
const indicY_R = indicY_R_raw === "__sync__" ? indicY_L : indicY_R_raw;

// Colonnes pour cartes et scatter (4 périodes indépendantes)
// Convention nouvelle : dm_pop_vtcam + "_" + "1622" = dm_pop_vtcam_1622
const colL_X = `${indicX_L}_${periode_XL}`;   // Carte gauche (X gauche)
const colR_X = `${indicX_R}_${periode_XR}`;   // Carte droite (X droite)
const colL_Y = `${indicY_L}_${periode_YL}`;   // Scatter Y gauche
const colR_Y = `${indicY_R}_${periode_YR}`;   // Scatter Y droite

// Labels (utilise medium pour titres, long pour tooltips)
const indicXLabel_L = INDICATEURS[indicX_L]?.medium || indicX_L;
const indicXLabel_R = INDICATEURS[indicX_R]?.medium || indicX_R;
const indicYLabel_L = INDICATEURS[indicY_L]?.medium || indicY_L;
const indicYLabel_R = INDICATEURS[indicY_R]?.medium || indicY_R;

// Sources et descriptions
const indicXSource_L = getSource(indicX_L);
const indicXSource_R = getSource(indicX_R);
const indicXUnit_L = INDICATEURS[indicX_L]?.unit || "%/an";
const indicXUnit_R = INDICATEURS[indicX_R]?.unit || "%/an";
const indicXTooltip_L = getTooltip(indicX_L);
const indicXTooltip_R = getTooltip(indicX_R);
const indicYTooltip_L = getTooltip(indicY_L);
const indicYTooltip_R = getTooltip(indicY_R);

// Périodes complètes depuis dictionnaire PERIODES
// Convertit "1622" → "16_22" pour lookup, "22" reste "22"
const getPeriodeLong = (p) => {
  if (!p) return "";
  // Si période évolution (4 chars): "1622" → "16_22"
  if (p.length === 4) {
    const periodeKey = p.slice(0, 2) + "_" + p.slice(2);
    return PERIODES[periodeKey]?.long || `20${p.slice(0,2)}-20${p.slice(2)}`;
  }
  // Sinon période stock (2 chars): "22" → lookup direct
  return PERIODES[p]?.long || `20${p}`;
};
const periodeLabel_XL = getPeriodeLong(periode_XL);  // "2016-2022"
const periodeLabel_XR = getPeriodeLong(periode_XR);  // "2011-2016"
const periodeLabel_YL = getPeriodeLong(periode_YL);
const periodeLabel_YR = getPeriodeLong(periode_YR);

const echelonPlural = echelon === "Zone d'emploi" ? "zones d'emploi" : echelon.toLowerCase() + "s";

// Alias pour compatibilité avec le reste du code
const indicateur = indicX_L;
const indicY = indicY_L;
const indicLabel = indicXLabel_L;      // Label carte gauche
const indicLabelR = indicXLabel_R;     // Label carte droite (P4.2)
const indicYLabel = indicYLabel_L;
const indicYLabelR = indicYLabel_R;    // Label Y droite (P4.2)
const col1622 = colL_X;   // Carte gauche
const col1116 = colR_X;   // Carte droite
const colY1622 = colL_Y;  // Scatter Y gauche
const colY1116 = colR_Y;  // Scatter Y droite

// === DÉTECTION TYPE INDICATEUR ===
// Types évolution (vtcam, vdifp, vevol) = divergent (valeurs +/-)
// Types stock (pct, vol, ind) = séquentiel (valeurs positives)
const indicType = INDICATEURS[indicateur]?.type || "vtcam";
const isDivergent = ["vtcam", "vdifp", "vevol"].includes(indicType);
console.log(`[COLOR] ${indicateur} type=${indicType} divergent=${isDivergent}`);

// === PALETTE SÉLECTIONNÉE ===
// Pour indicateurs stock (pct/vol/ind) : toujours palette bleue séquentielle
// Pour indicateurs évolution (vtcam/vdifp) : palette divergente selon choix utilisateur
const PAL_BINS = isDivergent
  ? (paletteChoice === "Bleu-Jaune" ? PAL_BLUE_YELLOW : PAL_PURPLE_GREEN)
  : PAL_SEQ_BLUE;

// P4.8: Palettes gradient centralisées (colors.js)
// Fallback si palette non trouvée (ex: paletteChoice invalide)
const gradientColors = isDivergent
  ? (GRADIENT_PALETTES.divergent[paletteChoice] || GRADIENT_PALETTES.divergent["Violet-Vert"])
  : (GRADIENT_PALETTES.sequential || ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08519c", "#08306b"]);

// === BINS QUANTILES ===
// Pour divergent: 8 bins centrés sur 0
// Pour séquentiel: 6 bins quantiles (données positives uniquement)
// Récupérer l'unité depuis le ddict pour affichage légende
const indicUnit = INDICATEURS[indicateur]?.unit || "";
let BINS, BINS_LABELS;
if (isDivergent) {
  const result = makeQuantileBins(tableData, indicateur);
  BINS = result.thresholds;
  BINS_LABELS = result.labels;
} else {
  // Bins séquentiels pour indicateurs stock - avec unité
  const result = makeSeqQuantileBins(tableData, col1622, 6, { unit: indicUnit, decimals: 1 });
  BINS = result.thresholds;
  BINS_LABELS = result.labels;
}

// === BINS CARTE DROITE (si indicateur différent) ===
const indicTypeR = INDICATEURS[indicX_R]?.type || "vtcam";
const isDivergentR = ["vtcam", "vdifp", "vevol"].includes(indicTypeR);
const sameIndicator = (indicX_R === indicX_L);

// Palette droite (même ou différente selon indicateur)
const PAL_BINS_R = sameIndicator ? PAL_BINS : (isDivergentR
  ? (paletteChoice === "Bleu-Jaune" ? PAL_BLUE_YELLOW : PAL_PURPLE_GREEN)
  : PAL_SEQ_BLUE);

// P4.8: Gradient colors droite (centralisé, avec fallback)
const gradientColorsR = sameIndicator ? gradientColors : (isDivergentR
  ? (GRADIENT_PALETTES.divergent[paletteChoice] || GRADIENT_PALETTES.divergent["Violet-Vert"])
  : (GRADIENT_PALETTES.sequential || ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08519c", "#08306b"]));

// Bins droite
const indicUnitR = INDICATEURS[indicX_R]?.unit || "";
let BINS_R, BINS_LABELS_R;
if (sameIndicator) {
  BINS_R = BINS;
  BINS_LABELS_R = BINS_LABELS;
} else if (isDivergentR) {
  const resultR = makeQuantileBins(tableData, indicX_R);
  BINS_R = resultR.thresholds;
  BINS_LABELS_R = resultR.labels;
} else {
  // Bins séquentiels droite - avec unité
  const resultR = makeSeqQuantileBins(tableData, col1116, 6, { unit: indicUnitR, decimals: 1 });
  BINS_R = resultR.thresholds;
  BINS_LABELS_R = resultR.labels;
}

// P4.8: Domains gradient séparés gauche/droite (avec gardes)
const valsL = tableData.map(d => d[col1622]).filter(v => v != null && !isNaN(v));
const valsR = tableData.map(d => d[col1116]).filter(v => v != null && !isNaN(v));
const gradientDomainL = valsL.length > 0 ? [d3.min(valsL), d3.max(valsL)] : [-1, 1];
const gradientDomainR = sameIndicator ? gradientDomainL : (valsR.length > 0 ? [d3.min(valsR), d3.max(valsR)] : [-1, 1]);

// Pré-créer les échelles gradient (évite recréation à chaque appel)
const gradientScaleL = isDivergent
  ? d3.scaleDiverging()
      .domain([gradientDomainL[0], 0, gradientDomainL[1]])
      .interpolator(d3.interpolateRgbBasis(gradientColors))
  : d3.scaleSequential()
      .domain(gradientDomainL)
      .interpolator(d3.interpolateRgbBasis(gradientColors));

// Fonctions coloration
function getColorBins(v) {
  if (v == null) return "#e0e0e0";
  const idx = BINS.findIndex(t => v < t);
  // Pour divergent: 8 bins, pour séquentiel: 6 bins
  const maxIdx = isDivergent ? 7 : PAL_BINS.length - 1;
  return PAL_BINS[idx === -1 ? maxIdx : Math.min(idx, maxIdx)];
}

// P4.8: Gradient gauche (utilise échelle pré-créée)
function getColorGradient(v) {
  if (v == null || isNaN(v)) return "#e0e0e0";
  try {
    const color = gradientScaleL(v);
    return color || "#e0e0e0";
  } catch (e) {
    console.warn("[EXD] Gradient error:", e, "value:", v);
    return "#e0e0e0";
  }
}

// Mode Écart France : bins sigma autour de la valeur 00FR
const isEcart = colorMode === "Écart France";
const ecartL = computeEcartFrance(tableData, col1622, frX_1622, { indicType: INDICATEURS[indicX_L]?.type });

// Coloration indicateur (écart / gradient / bins)
const getColorIndic = (v) => isEcart ? ecartL.getColor(v) : colorMode === "Gradient" ? getColorGradient(v) : getColorBins(v);

// Coloration finale : typo catégoriel OU indicateur
const getColor = (v, d = null) => {
  if (isTypoMode && d) {
    return getTypoColor(d);
  }
  return getColorIndic(v);
};

// === P4.2: COLORATION CARTE DROITE (bins/palette indépendants) ===
function getColorBinsR(v) {
  if (v == null) return "#e0e0e0";
  const idx = BINS_R.findIndex(t => v < t);
  const maxIdx = isDivergentR ? 7 : PAL_BINS_R.length - 1;
  return PAL_BINS_R[idx === -1 ? maxIdx : Math.min(idx, maxIdx)];
}

// Pré-créer échelle gradient droite
const gradientScaleR = isDivergentR
  ? d3.scaleDiverging()
      .domain([gradientDomainR[0], 0, gradientDomainR[1]])
      .interpolator(d3.interpolateRgbBasis(gradientColorsR))
  : d3.scaleSequential()
      .domain(gradientDomainR)
      .interpolator(d3.interpolateRgbBasis(gradientColorsR));

// P4.8: Gradient droite (utilise échelle pré-créée)
function getColorGradientR(v) {
  if (v == null || isNaN(v)) return "#e0e0e0";
  try {
    const color = gradientScaleR(v);
    return color || "#e0e0e0";
  } catch (e) {
    console.warn("[EXD] GradientR error:", e, "value:", v);
    return "#e0e0e0";
  }
}

// Mode Écart France carte droite
const ecartR = computeEcartFrance(tableData, col1116, frX_1116, { indicType: INDICATEURS[indicX_R]?.type });

const getColorIndicR = (v) => isEcart ? ecartR.getColor(v) : colorMode === "Gradient" ? getColorGradientR(v) : getColorBinsR(v);

const getColorR = (v, d = null) => {
  if (isTypoMode && d) {
    return getTypoColor(d);
  }
  return getColorIndicR(v);
};

// Couleurs scatter (séparées des cartes via scatterColorBy)
const getScatterColor = (v, d) => {
  if (isScatterTypoMode && d) {
    return getScatterTypoColor(d);
  }
  return getColor(v, d);
};
const getScatterColorR = (v, d) => {
  if (isScatterTypoMode && d) {
    return getScatterTypoColor(d);
  }
  return getColorR(v, d);
};

// linearRegressionOrigin : importé de ./helpers/aggregate.js

// Comptages bins
const counts1622 = countBins(tableData, col1622, BINS);

// === VALEURS FRANCE (lookup 00FR pré-calculé, remplace d3.mean) ===
// France est en 1ère ligne des JSON avec toutes les valeurs pré-agrégées
const frX_1116 = frData?.[col1116] ?? null;
const frX_1622 = frData?.[col1622] ?? null;
const frY_1116 = frData?.[colY1116] ?? null;
const frY_1622 = frData?.[colY1622] ?? null;
// Alias pour compatibilité (scatter, overlays, etc.)
const meanX_1116 = frX_1116;
const meanX_1622 = frX_1622;
const meanY_1116 = frY_1116;
const meanY_1622 = frY_1622;

// === ÉCHELLES SYNCHRONISÉES ===
const allXVals = [...tableData.map(d => d[col1116]), ...tableData.map(d => d[col1622])].filter(v => v != null);
const allYVals = [...tableData.map(d => d[colY1116]), ...tableData.map(d => d[colY1622])].filter(v => v != null);
const xDomain = [Math.min(d3.min(allXVals), -0.5), Math.max(d3.max(allXVals), 0.5)];
const yDomain = [Math.min(d3.min(allYVals), -0.5), Math.max(d3.max(allYVals), 0.5)];

// === RÉGRESSIONS (passant par origine) ===
const reg1622 = linearRegressionOrigin(tableData, col1622, colY1622);
const reg1116 = linearRegressionOrigin(tableData, col1116, colY1116);

// Liste territoires pour recherche avec libellé + densité + région/département
const territoiresWithLabels = tableData.map(d => {
  // Codes courts région/département (pour échelons infra-départementaux)
  const regInfo = tdcREG.get(d.regDom) || {};
  const depInfo = tdcDEP.get(d.depDom) || {};
  const nomBase = getLabel(d);
  const regShort = regInfo.short || "";
  const depShort = depInfo.short || "";
  // Libellé avec code en suffix pour affichage
  const libelle = `${nomBase} (${d.code})`;
  // Champ combiné pour recherche (uniquement texte, pas chiffres data)
  const searchText = `${nomBase} ${d.code} ${regShort} ${depShort}`.toLowerCase();
  return {
    ...d,
    libelle,
    nomBase,  // Nom sans code
    densLib: getDensLabel(d),
    regShort,
    depShort,
    searchText
  };
}).sort((a, b) => a.nomBase.localeCompare(b.nomBase));

// === MÉDIANES (supprimées - on utilise valeurs France seulement) ===
// Les médianes calculées ne sont plus pertinentes, on garde uniquement France
const medianX_1116 = frX_1116;  // Alias pour compatibilité statsOverlay
const medianX_1622 = frX_1622;
const medianY_1116 = frY_1116;
const medianY_1622 = frY_1622;

// === TOP 3 / BOTTOM 3 ===
// Toggle: true = afficher Top3/Bot3, false = désactiver (test perf)
const SHOW_TOP3_BOTTOM3 = true;

const sortedByX1622 = SHOW_TOP3_BOTTOM3 ? [...tableData].filter(d => d[col1622] != null).sort((a, b) => b[col1622] - a[col1622]) : [];
const sortedByX1116 = SHOW_TOP3_BOTTOM3 ? [...tableData].filter(d => d[col1116] != null).sort((a, b) => b[col1116] - a[col1116]) : [];
const top3_1622 = SHOW_TOP3_BOTTOM3 ? sortedByX1622.slice(0, 3).map(d => getLabel(d).slice(0, 8)).join(", ") : "";
const bottom3_1622 = SHOW_TOP3_BOTTOM3 ? sortedByX1622.slice(-3).reverse().map(d => getLabel(d).slice(0, 8)).join(", ") : "";
const top3_1116 = SHOW_TOP3_BOTTOM3 ? sortedByX1116.slice(0, 3).map(d => getLabel(d).slice(0, 8)).join(", ") : "";
const bottom3_1116 = SHOW_TOP3_BOTTOM3 ? sortedByX1116.slice(-3).reverse().map(d => getLabel(d).slice(0, 8)).join(", ") : "";
```

```js
// Stats des territoires sélectionnés
const selectedData = tableData.filter(d => (selectedTerritoires || []).includes(d.code));
const selMeanX_1622 = selectedData.length > 0 ? d3.mean(selectedData, d => d[col1622]) : null;
const selMeanX_1116 = selectedData.length > 0 ? d3.mean(selectedData, d => d[col1116]) : null;
const selMeanY_1622 = selectedData.length > 0 ? d3.mean(selectedData, d => d[colY1622]) : null;
const selMeanY_1116 = selectedData.length > 0 ? d3.mean(selectedData, d => d[colY1116]) : null;
const selTotalPop = selectedData.length > 0 ? d3.sum(selectedData, d => d.P22_POP) : 0;
```

<!-- CONTENU PRINCIPAL -->
<div class="main">

### Cartes par ${echelonPlural}

<!-- CARTES - 16-22 à GAUCHE, 11-16 à DROITE -->
<div class="cards-row">
<div class="card">

## ${indicXLabel_L} ${periodeLabel_XL}
<div class="card-subtitle">${indicXUnit_L} — par ${echelonPlural}</div>

```js
// === CARTE 16-22 via helper (Phase 5b) ===
const statsOverlay1622 = createStatsOverlay({
  mean: meanX_1622,
  median: medianX_1622,
  top3: top3_1622,
  bottom3: bottom3_1622,
  selCount: (selectedTerritoires || []).length,
  selMean: selMeanX_1622,
  showTop3Bottom3: SHOW_TOP3_BOTTOM3
});

const map1622 = hasGeo ? renderChoropleth({
  geoData,
  valueCol: col1622,
  getColor: (val, feat) => getColor(val, {code: getCodeFromFeature(feat), DENS: feat.properties.DENS, DENS7: feat.properties.DENS7}),
  getCode: getCodeFromFeature,
  getLabel,
  formatValue,
  indicLabel,
  selectedCodes: selectedTerritoires || [],
  showLabels: showLabelsOnMap,
  echelon,
  width: 540,
  height: 560
}) : null;

if (map1622) {
  // P4.7: Ajouter zoom AVANT wrapper pour récupérer les contrôles
  const zoomControls1622 = addZoomBehavior(map1622, { minScale: 1, maxScale: 8 });

  // P4.8: Légende intégrée carte gauche - écart / gradient / bins selon mode
  const binCountsL = countBins(tableData, col1622, BINS);
  const legendTitleL = indicUnit ? `Légende (${indicUnit})` : "Légende";
  const isGradientMode = colorMode === "Gradient";
  let mapLegend1622 = null;
  if (!isTypoMode) {
    if (isEcart) {
      const ecartCountsL = countBins(tableData, col1622, ecartL.thresholds || []);
      mapLegend1622 = createEcartFranceLegend({
        palette: ecartL.palette, symbols: ECART_FRANCE_SYMBOLS,
        pctLabels: ecartL.pctLabels,
        counts: ecartCountsL, title: `Écart France (en ${ecartL.isAbsoluteEcart ? "pts" : "%"})`
      });
    } else if (isGradientMode) {
      mapLegend1622 = createGradientLegend({
        colors: gradientColors,
        min: gradientDomainL[0],
        max: gradientDomainL[1],
        showZero: isDivergent,
        decimals: 1,
        title: legendTitleL
      });
    } else {
      mapLegend1622 = createBinsLegend({
        colors: PAL_BINS,
        labels: BINS_LABELS,
        counts: binCountsL,
        vertical: true,
        reverse: !isDivergent,
        title: legendTitleL
      });
    }
  }
  // P4.7: Passer zoomControls au wrapper pour boutons +/-/reset
  // Tooltip : toujours passer frRef + frGetEcartInfo
  if (map1622._tipConfig) {
    map1622._tipConfig.frRef = frX_1622;
    map1622._tipConfig.frGetEcartInfo = ecartL.getEcartInfo;
  }
  const wrapper = createMapWrapper(map1622, statsOverlay1622, mapLegend1622, zoomControls1622);
  addMapClickHandlers(map1622, geoData, getCodeFromFeature, (code) => {
    // toggleSelection(code); // Désactivé
  });
  display(wrapper);
  display(html`<div class="source-info" title="${indicXTooltip_L}">📊 Source : ${indicXSource_L} <span class="info-icon">ⓘ</span></div>`);
} else {
  display(html`<div class="no-geo">Pas de carte pour cet échelon</div>`);
}

/* === ANCIEN CODE CARTE 16-22 (Phase 5b - gardé pour rollback) ===
const statsOverlay1622 = html`<div class="map-stats-overlay">
  <div class="stat-line">Moy. ${meanX_1622 >= 0 ? "+" : ""}${meanX_1622?.toFixed(2)}</div>
  <div class="stat-line">Méd. ${medianX_1622 >= 0 ? "+" : ""}${medianX_1622?.toFixed(2)}</div>
  ${SHOW_TOP3_BOTTOM3 ? html`<div class="stat-line top">Top3: ${top3_1622}</div>` : ""}
  ${SHOW_TOP3_BOTTOM3 ? html`<div class="stat-line bottom">Bot3: ${bottom3_1622}</div>` : ""}
  ${(selectedTerritoires || []).length > 0 ? html`<div class="stat-line sel">Sél.(${(selectedTerritoires || []).length}) ${selMeanX_1622 >= 0 ? "+" : ""}${selMeanX_1622?.toFixed(2)}</div>` : ""}
</div>`;
const map1622 = hasGeo ? Plot.plot({
  projection: {type: "conic-conformal", rotate: [-3, -46.5], parallels: [44, 49], domain: geoData},
  marks: [
    Plot.geo(geoData, {fill: "none", stroke: "#222", strokeWidth: 2.5}),
    Plot.geo(geoData, {
      fill: d => getColor(d.properties[col1622], {code: getCodeFromFeature(d), DENS: d.properties.DENS, DENS7: d.properties.DENS7}),
      stroke: d => (selectedTerritoires || []).includes(getCodeFromFeature(d)) ? "#000" : "#fff",
      strokeWidth: d => (selectedTerritoires || []).includes(getCodeFromFeature(d)) ? 3 : 0.5,
      title: d => {
        const code = getCodeFromFeature(d);
        const lbl = getLabel({code}) || code;
        const v = d.properties[col1622];
        const p22 = d.properties.P22_POP;
        const p16 = d.properties.P16_POP;
        return lbl + "\n" + indicLabel + ": " + formatValue(col1622, v) + "\nPop 2022: " + (p22 ? p22.toLocaleString("fr-FR") : "—") + "\nPop 2016: " + (p16 ? p16.toLocaleString("fr-FR") : "—");
      }
    }),
    showLabelsOnMap ? Plot.text(geoData.features.filter(f => f.properties[col1622] != null), {
      x: d => d.properties._centroid?.[0] ?? d3.geoCentroid(d)[0],
      y: d => d.properties._centroid?.[1] ?? d3.geoCentroid(d)[1],
      text: d => (d.properties[col1622] >= 0 ? "+" : "") + d.properties[col1622].toFixed(1),
      fontSize: echelon === "Région" ? 12 : echelon === "Département" ? 9 : 7,
      fontWeight: 600,
      fill: "#000",
      stroke: "#fff",
      strokeWidth: 3
    }) : null,
    (selectedTerritoires || []).length > 0 ? Plot.geo(
      geoData.features.filter(f => (selectedTerritoires || []).includes(getCodeFromFeature(f))),
      {fill: "rgba(255,215,0,0.4)", stroke: "#ffd500", strokeWidth: 5}
    ) : null
  ].filter(Boolean),
  width: 540, height: 560
}) : null;
if (map1622) {
  const wrapper = html`<div class="map-wrapper"></div>`;
  wrapper.appendChild(map1622);
  wrapper.appendChild(statsOverlay1622);
  map1622.style.cursor = "pointer";
  map1622.addEventListener("click", (e) => {
    const path = e.target.closest("path");
    if (!path) return;
    const parent = path.parentElement;
    const paths = Array.from(parent.querySelectorAll("path"));
    const idx = paths.indexOf(path);
    if (idx >= 0 && idx < geoData.features.length) {
      const feature = geoData.features[idx];
      if (feature) { const code = getCodeFromFeature(feature); }
    }
  });
  display(wrapper);
  display(html`<div class="source-info" title="${indicXTooltip_L}">📊 Source : ${indicXSource_L} <span class="info-icon">ⓘ</span></div>`);
} else {
  display(html`<div class="no-geo">Pas de carte pour cet échelon</div>`);
}
=== FIN ANCIEN CODE CARTE 16-22 === */
```

</div>
<div class="card">

## ${indicXLabel_R} ${periodeLabel_XR}
<div class="card-subtitle">${indicXUnit_R} — par ${echelonPlural}</div>

```js
// === CARTE 11-16 via helper (Phase 5b) ===
const statsOverlay1116 = createStatsOverlay({
  mean: meanX_1116,
  median: medianX_1116,
  top3: top3_1116,
  bottom3: bottom3_1116,
  selCount: (selectedTerritoires || []).length,
  selMean: selMeanX_1116,
  showTop3Bottom3: SHOW_TOP3_BOTTOM3
});

const map1116 = hasGeo ? renderChoropleth({
  geoData,
  valueCol: col1116,
  getColor: (val, feat) => getColorR(val, {code: getCodeFromFeature(feat), DENS: feat.properties.DENS, DENS7: feat.properties.DENS7}),  // P4.2: getColorR
  getCode: getCodeFromFeature,
  getLabel,
  formatValue,
  indicLabel: indicLabelR,  // P4.2: label carte droite
  selectedCodes: selectedTerritoires || [],
  showLabels: showLabelsOnMap,
  echelon,
  width: 540,
  height: 560
}) : null;

if (map1116) {
  // P4.7: Ajouter zoom AVANT wrapper pour récupérer les contrôles
  const zoomControls1116 = addZoomBehavior(map1116, { minScale: 1, maxScale: 8 });

  // P4.8: Légende intégrée carte droite - écart / gradient / bins selon mode
  const binCountsR = countBins(tableData, col1116, BINS_R);
  const legendTitleR = indicUnitR ? `Légende (${indicUnitR})` : "Légende";
  const isGradientModeR = colorMode === "Gradient";
  let mapLegend1116 = null;
  if (!isTypoMode) {
    if (isEcart) {
      const ecartCountsR = countBins(tableData, col1116, ecartR.thresholds || []);
      mapLegend1116 = createEcartFranceLegend({
        palette: ecartR.palette, symbols: ECART_FRANCE_SYMBOLS,
        pctLabels: ecartR.pctLabels,
        counts: ecartCountsR, title: `Écart France (en ${ecartR.isAbsoluteEcart ? "pts" : "%"})`
      });
    } else if (isGradientModeR) {
      mapLegend1116 = createGradientLegend({
        colors: gradientColorsR,
        min: gradientDomainR[0],
        max: gradientDomainR[1],
        showZero: isDivergentR,
        decimals: 1,
        title: legendTitleR
      });
    } else {
      mapLegend1116 = createBinsLegend({
        colors: PAL_BINS_R,
        labels: BINS_LABELS_R,
        counts: binCountsR,
        vertical: true,
        reverse: !isDivergentR,
        title: legendTitleR
      });
    }
  }
  // Tooltip : toujours passer frRef + frGetEcartInfo
  if (map1116._tipConfig) {
    map1116._tipConfig.frRef = frX_1116;
    map1116._tipConfig.frGetEcartInfo = ecartR.getEcartInfo;
  }
  // P4.7: Passer zoomControls au wrapper pour boutons +/-/reset
  const wrapper = createMapWrapper(map1116, statsOverlay1116, mapLegend1116, zoomControls1116);
  addMapClickHandlers(map1116, geoData, getCodeFromFeature, (code) => {
    // toggleSelection(code); // Désactivé
  });
  display(wrapper);
  display(html`<div class="source-info" title="${indicXTooltip_R}">📊 Source : ${indicXSource_R} <span class="info-icon">ⓘ</span></div>`);
} else {
  display(html`<div class="no-geo">Pas de carte pour cet échelon</div>`);
}

/* === ANCIEN CODE CARTE 11-16 (Phase 5b - gardé pour rollback) ===
const statsOverlay1116 = html`<div class="map-stats-overlay">
  <div class="stat-line">Moy. ${meanX_1116 >= 0 ? "+" : ""}${meanX_1116?.toFixed(2)}</div>
  <div class="stat-line">Méd. ${medianX_1116 >= 0 ? "+" : ""}${medianX_1116?.toFixed(2)}</div>
  ${SHOW_TOP3_BOTTOM3 ? html`<div class="stat-line top">Top3: ${top3_1116}</div>` : ""}
  ${SHOW_TOP3_BOTTOM3 ? html`<div class="stat-line bottom">Bot3: ${bottom3_1116}</div>` : ""}
  ${(selectedTerritoires || []).length > 0 ? html`<div class="stat-line sel">Sél.(${(selectedTerritoires || []).length}) ${selMeanX_1116 >= 0 ? "+" : ""}${selMeanX_1116?.toFixed(2)}</div>` : ""}
</div>`;
const map1116 = hasGeo ? Plot.plot({
  projection: {type: "conic-conformal", rotate: [-3, -46.5], parallels: [44, 49], domain: geoData},
  marks: [
    Plot.geo(geoData, {fill: "none", stroke: "#222", strokeWidth: 2.5}),
    Plot.geo(geoData, {
      fill: d => getColorR(d.properties[col1116], {code: getCodeFromFeature(d), DENS: d.properties.DENS, DENS7: d.properties.DENS7}),  // P4.2: getColorR
      stroke: d => (selectedTerritoires || []).includes(getCodeFromFeature(d)) ? "#000" : "#fff",
      strokeWidth: d => (selectedTerritoires || []).includes(getCodeFromFeature(d)) ? 3 : 0.5,
      title: d => {
        const code = getCodeFromFeature(d);
        const nom = getLabel({code}) || code;
        const val = d.properties[col1116];
        const pop16 = d.properties.P16_POP;
        const pop11 = d.properties.P11_POP;
        return nom + "\n" + indicLabelR + ": " + formatValue(col1116, val) + "\nPop 2016: " + (pop16 ? pop16.toLocaleString("fr-FR") : "—") + "\nPop 2011: " + (pop11 ? pop11.toLocaleString("fr-FR") : "—");  // P4.2: indicLabelR
      }
    }),
    showLabelsOnMap ? Plot.text(geoData.features.filter(f => f.properties[col1116] != null), {
      x: d => d.properties._centroid?.[0] ?? d3.geoCentroid(d)[0],
      y: d => d.properties._centroid?.[1] ?? d3.geoCentroid(d)[1],
      text: d => (d.properties[col1116] >= 0 ? "+" : "") + d.properties[col1116].toFixed(1),
      fontSize: echelon === "Région" ? 12 : echelon === "Département" ? 9 : 7,
      fontWeight: 600,
      fill: "#000",
      stroke: "#fff",
      strokeWidth: 3
    }) : null,
    (selectedTerritoires || []).length > 0 ? Plot.geo(
      geoData.features.filter(f => (selectedTerritoires || []).includes(getCodeFromFeature(f))),
      {fill: "rgba(255,215,0,0.4)", stroke: "#ffd500", strokeWidth: 5}
    ) : null
  ].filter(Boolean),
  width: 540, height: 560
}) : null;
if (map1116) {
  const wrapper = html`<div class="map-wrapper"></div>`;
  wrapper.appendChild(map1116);
  wrapper.appendChild(statsOverlay1116);
  map1116.style.cursor = "pointer";
  map1116.addEventListener("click", (e) => {
    const path = e.target.closest("path");
    if (!path) return;
    const parent = path.parentElement;
    const paths = Array.from(parent.querySelectorAll("path"));
    const idx = paths.indexOf(path);
    if (idx >= 0 && idx < geoData.features.length) {
      const feature = geoData.features[idx];
      if (feature) { const code = getCodeFromFeature(feature); }
    }
  });
  display(wrapper);
  display(html`<div class="source-info" title="${indicXTooltip_R}">📊 Source : ${indicXSource_R} <span class="info-icon">ⓘ</span></div>`);
} else {
  display(html`<div class="no-geo">Pas de carte pour cet échelon</div>`);
}
=== FIN ANCIEN CODE CARTE 11-16 === */
```

</div>
</div>

### Graphiques par ${echelonPlural}

<!-- SCATTER - 16-22 à GAUCHE, 11-16 à DROITE -->
<div class="cards-row">
<div class="card">

## ${indicXLabel_L} ${periodeLabel_XL} (X) // ${indicYLabel_L} ${periodeLabel_YL} (Y)
<div class="card-subtitle">${indicXUnit_L} — par ${echelonPlural}</div>

```js
// === SCATTER 16-22 via helper (Phase 5a) ===
const scatter1622 = renderScatter({
  data: tableData,
  xCol: col1622,
  yCol: colY1622,
  xDomain,
  yDomain,
  xLabel: `→ ${indicLabel} (%/an)`,
  yLabel: `↑ ${indicYLabel} (%/an)`,
  meanX: meanX_1622,
  meanY: meanY_1622,
  regression: reg1622,
  showRegression: showTrendLine,
  getRadius: d => radiusScale(d.P22_POP || 0),
  getColor: d => getScatterColor(d[col1622], d),
  isSelected: d => (selectedTerritoires || []).includes(d.code),
  getTooltip: d => getLabel(d) + "\n" + indicLabel + ": " + formatValue(col1622, d[col1622]) + "\n" + indicYLabel + ": " + formatValue(colY1622, d[colY1622]) + "\nPop: " + (d.P22_POP || 0).toLocaleString("fr-FR"),
  width: 540,
  height: 440
});

// Click handlers via helper
const filteredData1622 = tableData.filter(d => d[col1622] != null && d[colY1622] != null);
addScatterClickHandlers(scatter1622, filteredData1622, (code) => {
  // toggleSelection(code); // Désactivé
});
display(scatter1622);

/* === ANCIEN CODE SCATTER 16-22 (Phase 5a - gardé pour rollback) ===
const scatter1622 = Plot.plot({
  grid: true,
  style: {fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#444"},
  x: {label: `→ ${indicLabel} (%/an)`, domain: xDomain, labelOffset: 40, labelFontSize: 14, labelFontWeight: 600},
  y: {label: `↑ ${indicYLabel} (%/an)`, domain: yDomain, labelFontSize: 14, labelFontWeight: 600},
  marginBottom: 50,
  marks: [
    Plot.ruleX([0], {stroke: "#555", strokeWidth: 1}),
    Plot.ruleY([0], {stroke: "#555", strokeWidth: 1}),
    Plot.line([[Math.max(xDomain[0], yDomain[0]), Math.max(xDomain[0], yDomain[0])], [Math.min(xDomain[1], yDomain[1]), Math.min(xDomain[1], yDomain[1])]], {stroke: "#aaa", strokeWidth: 0.8, strokeDasharray: "4,4"}),
    Plot.ruleX([meanX_1622], {stroke: "#888", strokeWidth: 1, strokeDasharray: "4,3"}),
    Plot.ruleY([meanY_1622], {stroke: "#888", strokeWidth: 1, strokeDasharray: "4,3"}),
    Plot.text([[meanX_1622, yDomain[1] * 0.95]], {text: [`Moy ${meanX_1622?.toFixed(2)}`], fontSize: 10, fill: "#555", textAnchor: "start", dx: 3}),
    Plot.text([[xDomain[1] * 0.95, meanY_1622]], {text: [`Moy ${meanY_1622?.toFixed(2)}`], fontSize: 10, fill: "#555", textAnchor: "end", dy: -5}),
    showTrendLine ? Plot.line([[xDomain[0], reg1622.slope * xDomain[0]], [xDomain[1], reg1622.slope * xDomain[1]]], {stroke: "#c44", strokeWidth: 1, strokeDasharray: "5,3"}) : null,
    showTrendLine ? Plot.text([[xDomain[1] * 0.85, yDomain[0] * 0.85]], {text: [`R²=${reg1622.r2.toFixed(2)}`], fontSize: 9, fill: "#999", fontStyle: "italic"}) : null,
    Plot.dot(tableData.filter(d => d[col1622] != null && d[colY1622] != null), {
      x: col1622, y: colY1622,
      r: d => radiusScale(d.P22_POP || 0),
      fill: d => (selectedTerritoires || []).includes(d.code) ? "#ffee00" : getScatterColor(d[col1622], d),
      fillOpacity: 0.85,
      stroke: d => (selectedTerritoires || []).includes(d.code) ? "#ff0040" : "#555",
      strokeWidth: d => (selectedTerritoires || []).includes(d.code) ? 5 : 0.5,
      title: d => getLabel(d) + "\n" + indicLabel + ": " + formatValue(col1622, d[col1622]) + "\n" + indicYLabel + ": " + formatValue(colY1622, d[colY1622]) + "\nPop: " + (d.P22_POP || 0).toLocaleString("fr-FR")
    })
  ].filter(Boolean),
  width: 540, height: 440
});
scatter1622.querySelectorAll("circle").forEach((circle, i) => {
  if (i < filteredData1622.length) {
    circle.style.cursor = "pointer";
    circle.addEventListener("click", () => {});
  }
});
display(scatter1622);
=== FIN ANCIEN CODE SCATTER 16-22 === */
display(html`<div class="source-info" title="${indicXTooltip_L} / ${indicYTooltip_L}">📊 Source : ${indicXSource_L} <span class="info-icon">ⓘ</span></div>`);
```

</div>
<div class="card">

## ${indicXLabel_R} ${periodeLabel_XR} (X) // ${indicYLabel_R} ${periodeLabel_YR} (Y)
<div class="card-subtitle">${indicXUnit_R} — par ${echelonPlural}</div>

```js
// === SCATTER 11-16 via helper (Phase 5a) ===
const scatter1116 = renderScatter({
  data: tableData,
  xCol: col1116,
  yCol: colY1116,
  xDomain,
  yDomain,
  xLabel: `→ ${indicLabelR} (%/an)`,  // P4.2: indicLabelR
  yLabel: `↑ ${indicYLabelR} (%/an)`, // P4.2: indicYLabelR
  meanX: meanX_1116,
  meanY: meanY_1116,
  regression: reg1116,
  showRegression: showTrendLine,
  getRadius: d => radiusScale(d.P22_POP || 0),
  getColor: d => getScatterColorR(d[col1116], d),
  isSelected: d => (selectedTerritoires || []).includes(d.code),
  getTooltip: d => getLabel(d) + "\n" + indicLabelR + ": " + formatValue(col1116, d[col1116]) + "\n" + indicYLabelR + ": " + formatValue(colY1116, d[colY1116]) + "\nPop: " + (d.P22_POP || 0).toLocaleString("fr-FR"),
  width: 540,
  height: 440
});

// Click handlers via helper
const filteredData1116 = tableData.filter(d => d[col1116] != null && d[colY1116] != null);
addScatterClickHandlers(scatter1116, filteredData1116, (code) => {
  // toggleSelection(code); // Désactivé
});
display(scatter1116);

/* === ANCIEN CODE SCATTER 11-16 (Phase 5a - gardé pour rollback) ===
const scatter1116 = Plot.plot({
  grid: true,
  style: {fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#444"},
  x: {label: `→ ${indicLabel} (%/an)`, domain: xDomain, labelOffset: 40, labelFontSize: 14, labelFontWeight: 600},
  y: {label: `↑ ${indicYLabel} (%/an)`, domain: yDomain, labelFontSize: 14, labelFontWeight: 600},
  marginBottom: 50,
  marks: [
    Plot.ruleX([0], {stroke: "#555", strokeWidth: 1}),
    Plot.ruleY([0], {stroke: "#555", strokeWidth: 1}),
    Plot.line([[Math.max(xDomain[0], yDomain[0]), Math.max(xDomain[0], yDomain[0])], [Math.min(xDomain[1], yDomain[1]), Math.min(xDomain[1], yDomain[1])]], {stroke: "#aaa", strokeWidth: 0.8, strokeDasharray: "4,4"}),
    Plot.ruleX([meanX_1116], {stroke: "#888", strokeWidth: 1, strokeDasharray: "4,3"}),
    Plot.ruleY([meanY_1116], {stroke: "#888", strokeWidth: 1, strokeDasharray: "4,3"}),
    Plot.text([[meanX_1116, yDomain[1] * 0.95]], {text: [`Moy ${meanX_1116?.toFixed(2)}`], fontSize: 10, fill: "#555", textAnchor: "start", dx: 3}),
    Plot.text([[xDomain[1] * 0.95, meanY_1116]], {text: [`Moy ${meanY_1116?.toFixed(2)}`], fontSize: 10, fill: "#555", textAnchor: "end", dy: -5}),
    showTrendLine ? Plot.line([[xDomain[0], reg1116.slope * xDomain[0]], [xDomain[1], reg1116.slope * xDomain[1]]], {stroke: "#c44", strokeWidth: 1, strokeDasharray: "5,3"}) : null,
    showTrendLine ? Plot.text([[xDomain[1] * 0.85, yDomain[0] * 0.85]], {text: [`R²=${reg1116.r2.toFixed(2)}`], fontSize: 9, fill: "#999", fontStyle: "italic"}) : null,
    Plot.dot(tableData.filter(d => d[col1116] != null && d[colY1116] != null), {
      x: col1116, y: colY1116,
      r: d => radiusScale(d.P22_POP || 0),
      fill: d => (selectedTerritoires || []).includes(d.code) ? "#ffee00" : getScatterColorR(d[col1116], d),
      fillOpacity: 0.85,
      stroke: d => (selectedTerritoires || []).includes(d.code) ? "#ff0040" : "#555",
      strokeWidth: d => (selectedTerritoires || []).includes(d.code) ? 5 : 0.5,
      title: d => getLabel(d) + "\n" + indicLabel + ": " + formatValue(col1116, d[col1116]) + "\n" + indicYLabel + ": " + formatValue(colY1116, d[colY1116]) + "\nPop: " + (d.P22_POP || 0).toLocaleString("fr-FR")
    })
  ].filter(Boolean),
  width: 540, height: 440
});
scatter1116.querySelectorAll("circle").forEach((circle, i) => {
  if (i < filteredData1116.length) {
    circle.style.cursor = "pointer";
    circle.addEventListener("click", () => {});
  }
});
display(scatter1116);
=== FIN ANCIEN CODE SCATTER 11-16 === */
display(html`<div class="source-info" title="${indicXTooltip_R} / ${indicYTooltip_R}">📊 Source : ${indicXSource_R} <span class="info-icon">ⓘ</span></div>`);
```

</div>
</div>

```js
// === MUTABLE SÉLECTION CARTE — SUPPRIMÉ (unifié avec selectionSet) ===
// mapSelectionState est maintenant remplacé par selectionSet (Set)
// Voir bloc SÉLECTION TERRITOIRES pour la source de vérité unique
```

```js
// === CLICK-TO-SELECT : Manipulation DOM directe (Ctrl+Click multi-sélection) ===
// Ce bloc s'exécute APRÈS les displays → accès aux éléments rendus

// Attendre que le DOM soit prêt (setTimeout 0 pour différer après render Observable)
setTimeout(() => {
  // Récupérer tous les SVG de la section cartes + scatter
  const mapWrappers = document.querySelectorAll(".map-wrapper svg");
  const scatterSvgs = document.querySelectorAll(".cards-row svg:not(.map-wrapper svg)");

  // Fallback : tous les paths et circles dans .cards-row
  const allPaths = document.querySelectorAll(".cards-row svg path");
  const allCircles = document.querySelectorAll(".cards-row svg circle");

  // Stats overlays pour mise à jour dynamique
  const statsOverlays = document.querySelectorAll(".map-stats-overlay");

  console.log(`[Click-Select] Found: ${allPaths.length} paths, ${allCircles.length} circles, ${statsOverlays.length} overlays`);

  if (allPaths.length === 0 && allCircles.length === 0) {
    console.warn("[Click-Select] Aucun élément trouvé. Vérifiez les sélecteurs CSS.");
    return;
  }

  // SOURCE UNIQUE: window._selectionSetRef.value (partagé avec searchBox)
  // Utilise window._selectionSetRef pour éviter problème de closure quand Observable re-rend
  const getCurrentSelection = () => {
    const ref = window._selectionSetRef;
    return (ref && ref.value) ? ref.value : new Set();
  };

  // Mapping code → indices dans geoData
  const codeToGeoIndices = new Map();
  geoData.features.forEach((f, i) => {
    const code = getCodeFromFeature(f);
    if (!codeToGeoIndices.has(code)) codeToGeoIndices.set(code, []);
    codeToGeoIndices.get(code).push(i);
  });

  // Données filtrées scatter
  const filtered1622 = tableData.filter(d => d[col1622] != null && d[colY1622] != null);
  const filtered1116 = tableData.filter(d => d[col1116] != null && d[colY1116] != null);

  // Nombre de features par carte (2 cartes avec même nombre)
  const numFeatures = geoData.features.length;

  // Fonction pour mettre à jour les stats overlays avec la sélection
  function updateStatsOverlays() {
    const selection = getCurrentSelection();
    if (selection.size === 0) {
      // Supprimer les lignes "sél." ajoutées par click
      statsOverlays.forEach(overlay => {
        const clickSelLine = overlay.querySelector(".stat-line.click-sel");
        if (clickSelLine) clickSelLine.remove();
      });
      return;
    }

    // Calculer moyenne pour les codes sélectionnés
    const selectedData = tableData.filter(d => selection.has(d.code));
    const mean1622 = selectedData.length > 0 ? d3.mean(selectedData, d => d[col1622]) : null;
    const mean1116 = selectedData.length > 0 ? d3.mean(selectedData, d => d[col1116]) : null;
    const count = selection.size;

    // Mettre à jour chaque overlay
    statsOverlays.forEach((overlay, idx) => {
      // idx 0 = carte gauche (1622), idx 1 = carte droite (1116)
      const mean = idx === 0 ? mean1622 : mean1116;

      // Supprimer ancienne ligne click-sel si existe
      let clickSelLine = overlay.querySelector(".stat-line.click-sel");

      if (mean != null) {
        const sign = mean >= 0 ? "+" : "";
        const html = `Sél.(${count}) ${sign}${mean.toFixed(2)}`;

        if (clickSelLine) {
          clickSelLine.innerHTML = html;
        } else {
          // Créer nouvelle ligne
          clickSelLine = document.createElement("div");
          clickSelLine.className = "stat-line sel click-sel";
          clickSelLine.innerHTML = html;
          overlay.appendChild(clickSelLine);
        }
      } else if (clickSelLine) {
        clickSelLine.remove();
      }
    });
  }

  function updateClickHighlights() {
    const selection = getCurrentSelection();
    console.log(`[updateClickHighlights] selection.size=${selection.size}, codes=[${[...selection].join(',')}]`);

    // Reset + highlight paths
    allPaths.forEach((path, idx) => {
      const featureIdx = idx % numFeatures;
      const feature = geoData.features[featureIdx];
      if (!feature) return;

      const code = getCodeFromFeature(feature);
      const isSelected = selection.has(code);

      // Style sélectionné : contour jaune vif épais
      path.style.stroke = isSelected ? "#ffd500" : "";
      path.style.strokeWidth = isSelected ? "4" : "";
    });

    // Reset + highlight circles
    allCircles.forEach((circle, idx) => {
      const isFirst = idx < filtered1622.length;
      const dataIdx = isFirst ? idx : idx - filtered1622.length;
      const data = isFirst ? filtered1622 : filtered1116;

      if (dataIdx >= 0 && dataIdx < data.length) {
        const code = data[dataIdx].code;
        const isSelected = selection.has(code);

        // Style sélectionné : jaune fluo + contour ROUGE FLUO ÉPAIS
        circle.style.fill = isSelected ? "#ffee00" : "";
        circle.style.stroke = isSelected ? "#ff0040" : "";
        circle.style.strokeWidth = isSelected ? "6" : "";
      }
    });

    // Mettre à jour stats overlays
    updateStatsOverlays();

    // Mettre à jour les chips du searchBox
    if (typeof searchBox !== 'undefined' && searchBox.refresh) {
      searchBox.refresh();
    }

    // Log pour debug
    if (selection.size > 0) {
      console.log(`[Click-Select] Sélection: ${[...selection].join(", ")}`);
    }
  }

  // === EVENT DELEGATION (PERF: 1 listener au lieu de N) ===
  // Convertir NodeLists en Arrays pour indexOf
  const pathsArray = [...allPaths];
  const circlesArray = [...allCircles];

  // Helper: extraire code depuis path cliqué
  const getCodeFromPath = (path) => {
    const idx = pathsArray.indexOf(path);
    if (idx === -1) return null;
    const featureIdx = idx % numFeatures;
    const feature = geoData.features[featureIdx];
    return feature ? getCodeFromFeature(feature) : null;
  };

  // Helper: extraire code depuis circle cliqué
  const getCodeFromCircle = (circle) => {
    const idx = circlesArray.indexOf(circle);
    if (idx === -1) return null;
    const isFirst = idx < filtered1622.length;
    const dataIdx = isFirst ? idx : idx - filtered1622.length;
    const data = isFirst ? filtered1622 : filtered1116;
    return (dataIdx >= 0 && dataIdx < data.length) ? data[dataIdx].code : null;
  };

  // Handler commun pour click - modifie selectionSet.value (source unique)
  const handleClick = (code, e) => {
    if (!code) return;
    e.stopPropagation();

    // Créer nouveau Set pour déclencher réactivité Observable
    const current = new Set(getCurrentSelection());

    if (e.ctrlKey || e.metaKey) {
      // Toggle: ajouter ou supprimer
      current.has(code) ? current.delete(code) : current.add(code);
    } else {
      // Sélection simple: remplacer tout
      current.clear();
      current.add(code);
    }

    // Assigner au Mutable (déclenche réactivité)
    selectionSet.value = current;
    updateClickHighlights();
  };

  // Un seul listener sur le container .cards-row (event delegation)
  const cardsRow = document.querySelector(".cards-row");
  if (cardsRow) {
    cardsRow.addEventListener("click", (e) => {
      const path = e.target.closest("path");
      if (path) {
        handleClick(getCodeFromPath(path), e);
        return;
      }
      const circle = e.target.closest("circle");
      if (circle) {
        handleClick(getCodeFromCircle(circle), e);
      }
    });
  }

  // Exposer updateClickHighlights pour accès depuis toggleSelection/bouton effacer
  window._updateMapHighlights = updateClickHighlights;
  window._mapHighlightsReady = true;

  // Traiter mise à jour en attente (si searchBox utilisé avant DOM prêt)
  if (window._pendingHighlightUpdate) {
    window._pendingHighlightUpdate = false;
    updateClickHighlights();
  }

  console.log("[Click-Select] Event delegation installée ✓");
}, 100);  // Délai 100ms pour s'assurer que le DOM est rendu
```

<!-- TABLEAU -->
<div class="card card-full">

## Tableau des ${echelonPlural}

```js
// === BLOC A : États Mutables (AUCUNE dépendance externe) ===
// Ces blocs ne doivent avoir AUCUNE variable externe pour éviter re-création

// État tri
const sortState = Mutable({ col: "P22_POP", asc: false });
const setSort = (col) => {
  const s = sortState.value;
  sortState.value = s.col === col
    ? { col, asc: !s.asc }
    : { col, asc: false };
  // Reset page à 0 quand on change le tri
  pageState.value = 0;
};

// État pagination (50 items/page)
const PAGE_SIZE = 50;
const pageState = Mutable(0);
const setPage = (p) => { pageState.value = Math.max(0, p); };
```

<div class="table-controls" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 12px;">

```js
const searchTerm = view(Inputs.search(territoiresWithLabels, {
  placeholder: "Rechercher...",
  width: 160,
  columns: ["searchText"]
}));
```

```js
// Compteur sélection (source unique: selectionSet)
const totalSel = selectedTerritoires.length;
display(totalSel > 0
  ? html`<span style="font-size:10px;color:#2563eb;">📍 ${totalSel} sél.</span>`
  : "");
```

</div>

```js
// === BLOC B : Rendu tableau (utilise sortState directement = valeur courante) ===

// Colonnes héritées des 4 indicateurs sélectionnés en haut + extras optionnels
const baseTableCols = [...new Set([col1622, colY1622, col1116, colY1116])];
// FIX: utiliser getPeriodesForIndicateur pour obtenir le bon suffixe période (ex: _22 vs _1622)
const tableCols = [...baseTableCols, ...tableIndicateurs
  .filter(i => !baseTableCols.some(c => c.startsWith(i)))
  .map(i => {
    const periodesMap = getPeriodesForIndicateur(i);
    const defaultPeriode = [...periodesMap.values()][0] || "1622";
    return `${i}_${defaultPeriode}`;
  })
];

// Dans un autre bloc que le Mutable, sortState EST la valeur (pas .value)
const { col: sortColumn, asc: sortAsc } = sortState;

// Filtrer AUTO par sélection (source unique: selectionSet)
const selCodes = new Set(selectedTerritoires || []);
// Auto-filter : si sélection active, filtre auto (plus de toggle)
const filtered = selCodes.size > 0
  ? [...searchTerm].filter(d => selCodes.has(d.code))
  : [...searchTerm];

// Données triées (colonnes texte = tri alphabétique, colonnes numériques = tri numérique)
const textCols = ["libelle", "code", "nomBase", "regShort", "depShort", "densLib"];
const sorted = filtered.sort((a, b) => {
  if (textCols.includes(sortColumn)) {
    const valA = a[sortColumn] || "";
    const valB = b[sortColumn] || "";
    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  }
  const valA = a[sortColumn] ?? -Infinity;
  const valB = b[sortColumn] ?? -Infinity;
  return sortAsc ? valA - valB : valB - valA;
});

// === PAGINATION (50 items/page) ===
const currentPage = pageState;  // Valeur directe (pas .value dans bloc externe)
const totalItems = sorted.length;
const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
// Clamp page si données réduites (ex: recherche/sélection)
const safePage = Math.min(currentPage, totalPages - 1);
const paginatedData = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

// ═══ HELPERS table.js (Phase 2 refactoring) ═══
const maxByCol = computeMaxByCol(sorted, tableCols);
const extremesCol = computeExtremes(sorted, tableCols);


// === FRANCE (ligne fixe en haut du tableau, lookup 00FR) ===
// Utilise frData directement (pré-calculé), plus besoin de computeStats
const franceMean = frData || {};  // Alias pour compatibilité template
const franceTotalPop = frData?.P22_POP || 0;

// ═══ makeBar wrapper (Phase 2) - appelle helper avec maxByCol/extremesCol ═══
const makeBar = (v, colKey) => makeBarHelper(v, colKey, maxByCol, extremesCol);


// ═══ thSort wrapper (Phase 2) - appelle helper avec sortColumn/sortAsc/setSort ═══
const thSort = (col, label, className = "") => thSortHelper(col, label, sortColumn, sortAsc, setSort, className);

// Afficher colonnes Rég/Dép pour échelons infra-départementaux
const showRegDep = ["Bassin de vie", "Aire d'attraction"].includes(echelon);

display(html`<div class="table-scroll">
<table class="tbl">
<thead><tr>
  ${thSort("libelle", "Territoire", "th-territory")}
  ${showRegDep ? html`${thSort("regShort", "Rég", "th-reg")}${thSort("depShort", "Dép", "th-dep")}` : ""}
  ${densGrille !== "Aucun" ? html`<th class="th-dens">Dens.</th>` : ""}
  ${thSort("P22_POP", "Pop 22", "th-pop")}
  ${tableCols.map(col => thSort(col, getColLabelFull(col), "th-indic"))}
</tr></thead>
<tbody>
<tr class="row-france" style="background:#f0f9ff;font-weight:600;border-bottom:2px solid #2563eb;">
  <td class="td-territory" style="color:#2563eb">🇫🇷 France</td>
  ${showRegDep ? html`<td style="color:#2563eb">—</td><td style="color:#2563eb">—</td>` : ""}
  ${densGrille !== "Aucun" ? html`<td class="td-dens">—</td>` : ""}
  <td class="td-pop" style="color:#2563eb">${Math.round(franceMean.P22_POP || 0).toLocaleString("fr-FR")}</td>
  ${tableCols.map(col => html`<td class="td-bar">${makeBar(franceMean[col], col)}</td>`)}
</tr>
${paginatedData.map(d => html`<tr class="${selCodes.has(d.code) ? 'row-highlight' : ''}">
  <td class="td-territory">${d.nomBase} <span class="code">${d.code}</span></td>
  ${showRegDep ? html`<td class="td-reg">${d.regShort || ""}</td><td class="td-dep">${d.depShort || ""}</td>` : ""}
  ${densGrille !== "Aucun" ? html`<td class="td-dens"><span class="dens-tag" style="background:${densGrille === "3 niveaux" ? DENS3_COLORS[d.DENS] : DENS7_COLORS[d.DENS7]}88">${d.densLib}</span></td>` : ""}
  <td class="td-pop">${Math.round(d.P22_POP || 0).toLocaleString("fr-FR")}</td>
  ${tableCols.map(col => html`<td class="td-bar">${makeBar(d[col], col)}</td>`)}
</tr>`)}
</tbody>
</table>
</div>`)

// === CONTRÔLES PAGINATION ===
display(html`<div class="pagination-controls" style="display:flex;gap:8px;align-items:center;justify-content:center;margin:12px 0;font-size:12px;">
  <button onclick=${() => setPage(0)} disabled=${safePage === 0} style="padding:4px 8px;cursor:${safePage === 0 ? 'not-allowed' : 'pointer'}">⏮</button>
  <button onclick=${() => setPage(safePage - 1)} disabled=${safePage === 0} style="padding:4px 8px;cursor:${safePage === 0 ? 'not-allowed' : 'pointer'}">◀ Préc</button>
  <span style="color:#555;">Page <strong>${safePage + 1}</strong> / ${totalPages} <span style="color:#888;">(${totalItems} territoires)</span></span>
  <button onclick=${() => setPage(safePage + 1)} disabled=${safePage >= totalPages - 1} style="padding:4px 8px;cursor:${safePage >= totalPages - 1 ? 'not-allowed' : 'pointer'}">Suiv ▶</button>
  <button onclick=${() => setPage(totalPages - 1)} disabled=${safePage >= totalPages - 1} style="padding:4px 8px;cursor:${safePage >= totalPages - 1 ? 'not-allowed' : 'pointer'}">⏭</button>
</div>`)
```

</div>

<!-- SECTIONS DVF/URSSAF DÉSACTIVÉES (fichiers non disponibles) -->
<!-- TODO: Réactiver quand urssaf_ze_emploi.json et dvf_*.json seront générés -->

</div><!-- fin main -->
</div><!-- fin content-main -->
</div><!-- fin layout-main -->
