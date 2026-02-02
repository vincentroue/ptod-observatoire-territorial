---
title: OTTD — Communes
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     EXDTC — Volet Communes dual (2 indicateurs + multi-select)
     Date: 2026-01-13 | v2: Gradient mode support
     Layout: Sidebar | 2×2 cartes | Tableau multi-colonnes
     ============================================================ -->

<!-- &s BANNER -->
```js
import { createBanner, createNav, OTTD_PAGES } from "./helpers/layout.js";
display(createBanner({
  title: "Observatoire des trajectoires territoriales de développement",
  subtitle: "35 000 communes — comparaison multi-indicateurs",
  navElement: createNav(OTTD_PAGES, 'exdtc'),
  sourcesText: "? Sources",
  sourcesTooltip: "INSEE RP 2011/2016/2022, DVF 2024, Filosofi 2021"
}));
```
<!-- &e BANNER -->

<!-- &s IMPORTS — Helpers modulaires (un par ligne pour lisibilité) -->
```js
// === NPM DEPENDENCIES ===
import * as topojson from "npm:topojson-client";  // Parse TopoJSON → GeoJSON
import rewind from "npm:@mapbox/geojson-rewind";  // Fix winding order polygones

// === 0loader.js — Config échelons et helpers ===
import {
  getEchelonMeta,     // (echelon) → {geoKey, labelKey, filterKey}
  getLabelMap,        // (echelon) → Map(code → libellé)
  setLabelMap,        // (echelon, map) → void
  getFranceData,      // (data) → ligne France (code 00FR)
  getDataNoFrance     // (data) → données sans France
  // NOTE: loadAggData/loadGeo non utilisés - FileAttachment doit rester dans .md
} from "./helpers/0loader.js";

// === constants.js — Constantes partagées ===
import {
  PARIS_CODES,            // Codes Paris par échelon
  getDefaultZoomCode,     // (echelon) → code Paris
  DEFAULT_TABLE_INDICS,   // Indicateurs tableau par défaut
  ECHELONS_SIDEBAR,       // Liste échelons radio
  MIN_POP_DEFAULT,        // Seuil pop minimum (10000)
  PAGE_SIZE_DEFAULT       // Taille page (200)
} from "./helpers/constants.js";

// === selection.js — Gestion sélection multi-territoires ===
import {
  createSelectionManager,   // Factory gestionnaire sélection
  createMapClickHandler     // Factory click handler carte
} from "./helpers/selection.js";

// === selectindic.js — Sélecteurs indicateurs/périodes ===
import {
  getPeriodesForIndicateur,   // (indic) → Map périodes disponibles
  getDefaultPeriode,          // (indic) → période par défaut
  buildColKey,                // (indic, periode) → "dm_pop_vtcam_1622"
  getIndicLabel,              // (indic, format) → label lisible
  getPeriodeLabel             // (periodeKey, format) → "16-22"
} from "./helpers/selectindic.js";

// === indicators-ddict-js.js — Dictionnaire auto-généré ===
import {
  formatValue,                // (indic, val) → "1.23 %"
  getIndicOptionsByAggDash    // (filterVolet?) → options dropdown _agg_dash=x
} from "./helpers/indicators-ddict-js.js";

// === colors.js — Palettes et bins ===
import {
  computeIndicBins,      // (data, col) → {bins, palette, isDiv, getColor}
  countBins,             // (data, col, thresholds) → counts[]
  createGradientScale,   // (data, col, options) → {getColor, min, max, divergent, palette}
  GRADIENT_PALETTES      // {divergent, sequential} pour mode gradient
} from "./helpers/colors.js";

// === legend.js — Légendes cartes ===
import { createBinsLegend, createGradientLegend } from "./helpers/legend.js";

// === maps.js — Cartes choroplèthes ===
import {
  renderChoropleth,      // (config) → Plot SVG carte
  createMapWrapper,      // (map, stats, legend, zoom) → wrapper HTML
  addZoomBehavior        // (map) → {zoomIn, zoomOut, zoomReset}
} from "./helpers/maps.js";

// === search.js — Recherche fuzzy Fuse.js ===
import { createSearchBox } from "./helpers/search.js";  // ({data, selection, onToggle}) → searchbox

// === duckdb.js — Queries Parquet ===
import {
  initDuckDB,              // () → {db, conn}
  initDuckDBBackground,    // () → void (lance init en arrière-plan)
  waitForDuckDB,           // () → {db, conn} (attend fin init)
  registerParquet,         // (db, tableName, url) → void
  queryCommunes,           // ({conn}, options) → data[]
  queryFrance              // ({conn}, tableName, columns) → row France (agrégats)
} from "./helpers/duckdb.js";

// Démarrer DuckDB init en arrière-plan (non-bloquant)
initDuckDBBackground();

// === 0table.js — Tableau triable avec barres ===
import {
  sortTableData,        // (data, col, asc) → sorted data
  computeBarStats,      // (data, cols) → {maxPos, maxNeg} par col
  getIndicUnit,         // (colKey) → unité ("hab", "%/an")
  renderPagination,     // (total, page, setPage) → pagination HTML
  renderTable,          // ({data, columns, stats}) → table HTML
  createTableToolbar,   // ({onSearch, onExportCSV}) → toolbar HTML
  exportCSV             // (data, columns, filename) → télécharge CSV
} from "./helpers/0table.js";

// === graph-options.js — Export SVG (simplifié) ===
import { exportSVG } from "./helpers/graph-options.js";

// === scatter.js — Scatter plots EPCI ===
import { renderScatter, createScatterWithZoom, addScatterClickHandlers } from "./helpers/scatter.js";

// === tableterr-comp.js — Tableau comparaison territoires ===
import {
  renderTableTerrComp,       // ({indicators, territories, france}) → table HTML
  exportTableTerrCSV,        // (indicators, territories, france, filename) → download CSV
  tableTerrCompStyles        // CSS pour le tableau
} from "./helpers/tableterr-comp.js";

// === perf-monitor.js — Performance monitoring ===
import { PerfMonitor, perfPanel, getLoadStats } from "./helpers/perf-monitor.js";
const perf = new PerfMonitor("dash-exdtc");
perf.mark("page-start");
```
<!-- &e IMPORTS -->

<!-- &s FILE_HANDLES — FileAttachment doit rester dans le .md (contexte Observable) -->
```js
// IMPORTANT: FileAttachment ne peut PAS être passé à un helper externe
// Les chemins sont résolus par rapport au contexte du fichier .md
const GEO_HANDLES = {
  "Zone d'emploi": FileAttachment("data/nodom_zones-emploi_2025.topojson"),
  "Département": FileAttachment("data/nodom_departement_2025.topojson"),
  "Région": FileAttachment("data/nodom_region_2025.topojson"),
  "EPCI": FileAttachment("data/nodom_epci_2025.topojson"),
  "Aire d'attraction": FileAttachment("data/nodom_aav_2025.topojson")
};
const DATA_HANDLES = {
  "Zone d'emploi": FileAttachment("data/agg_ze.json"),
  "Département": FileAttachment("data/agg_dep.json"),
  "Région": FileAttachment("data/agg_reg.json"),
  "EPCI": FileAttachment("data/agg_epci.json"),
  "Aire d'attraction": FileAttachment("data/agg_aav.json")
};
const COMMUNES_TOPO = FileAttachment("data/nodom_commune-ARM_MINI_2025.topojson");
const COMMUNES_PARQUET = FileAttachment("data/agg_commARM.parquet");

// Cache local (0loader.js ne peut pas être utilisé avec FileAttachment passé en param)
const dataCache = new Map();
const geoCache = new Map();
async function getData(ech) {
  if (!dataCache.has(ech)) dataCache.set(ech, await DATA_HANDLES[ech]?.json() || []);
  return dataCache.get(ech);
}
async function getGeo(ech) {
  if (!geoCache.has(ech)) {
    const topo = await GEO_HANDLES[ech]?.json();
    geoCache.set(ech, topo ? rewind(topojson.feature(topo, topo.objects.data), true) : null);
  }
  return geoCache.get(ech);
}
```
<!-- &e FILE_HANDLES -->

<!-- &s INIT -->
```js
const defaultData = await getData("Zone d'emploi");
const defaultGeo = await getGeo("Zone d'emploi");
const communesTopo = await COMMUNES_TOPO.json();
const communesGeo = rewind(topojson.feature(communesTopo, communesTopo.objects.data), true);

// Geo départements pour overlay sur autres échelons
const depGeo = await getGeo("Département");

const { db, conn } = await initDuckDB();
await registerParquet(db, "communes", await COMMUNES_PARQUET.url());

// LabelMaps pour tous les échelons (chargement au démarrage)
for (const ech of ECHELONS_SIDEBAR) {
  const data = await getData(ech);
  const meta = getEchelonMeta(ech);
  if (data.length && meta) {
    const lm = new Map();
    data.forEach(d => d.code && d.libelle && lm.set(String(d.code), d.libelle));
    setLabelMap(ech, lm);
  }
}

const AVAILABLE_COLUMNS = new Set(Object.keys(defaultData[0] || {}));

// PARIS_CODES, getDefaultZoomCode et DEFAULT_TABLE_INDICS importés de constants.js

// Injection CSS tableau comparaison
const styleEl = document.createElement('style');
styleEl.textContent = tableTerrCompStyles;
document.head.appendChild(styleEl);
```
<!-- &e INIT -->

<!-- &s STATE — Utilise selection.js pour gestion centralisée -->
```js
const mapSelectionState = Mutable(new Set());  // Multi-select pour highlight
const zoomTargetState = Mutable(null);         // Code territoire affiché en zoom
const sortState = Mutable({ col: "P23_POP", asc: false });
const pageState = Mutable(0);
const tableSearchState = Mutable("");
const extraIndicatorsState = Mutable([]);

// Selection manager centralisé (depuis selection.js)
const selectionMgr = createSelectionManager(mapSelectionState, zoomTargetState, pageState);

// Alias directs pour compatibilité avec code existant
const { addToSelection, removeFromSelection, setZoomOnly, toggleMapSelection, clearMapSelection } = selectionMgr;

// Fonctions tri/pagination
const setSort = (col) => {
  const curr = sortState.value.col;
  const asc = sortState.value.asc;
  sortState.value = curr === col ? { col, asc: !asc } : { col, asc: false };
  pageState.value = 0;
};
const setPage = (p) => { pageState.value = p; };
const setTableSearch = (v) => { tableSearchState.value = v; pageState.value = 0; };
```
<!-- &e STATE -->

<!-- &s SUB_BANNER -->
<style>
/* Sub-banner indicateurs - dropdowns blanc SANS bordure noire */
.sub-banner select {
  font-size: 12px !important;
  background: #fff !important;
  border: 1px solid #e2e8f0 !important;  /* bordure très légère gris clair */
}
.sub-banner .sub-group { border: none !important; padding: 0 !important; }

/* Tooltip aide lecture tableaux */
.table-help-wrap { display: inline-block; position: relative; vertical-align: middle; margin-left: 6px; }
.table-help-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  background: #e5e7eb; color: #6b7280;
  font-size: 11px; font-weight: 700; cursor: help;
}
.table-help-wrap .help-tooltip {
  display: none; position: absolute;
  top: 22px; left: -8px; z-index: 100;
  background: white; border: 1px solid #d1d5db;
  border-radius: 6px; padding: 10px 14px;
  font-size: 12px; font-weight: 400;
  width: 310px; line-height: 1.6;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.table-help-wrap:hover .help-tooltip { display: block; }
</style>
<div class="sub-banner">
<div style="display:flex;flex-wrap:nowrap;padding:6px 16px;gap:0;align-items:flex-start;">

<!-- Colonne labels à gauche -->
<div style="display:flex;flex-direction:column;min-width:75px;margin-top:18px;gap:10px;">
<span style="font-size:11px;font-weight:500;color:#64748b;">Indicateur</span>
<span style="font-size:11px;font-weight:500;color:#64748b;">Période</span>
</div>

<!-- Colonne GAUCHE -->
<div style="display:flex;flex-direction:column;width:320px;">
<div style="font-size:10px;font-weight:600;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;text-align:center;margin-bottom:2px;">Gauche</div>

```js
const indic1 = view(Inputs.select(getIndicOptionsByAggDash(), { value: "dm_pop_vtcam", label: "" }));
```

```js
const per1Map = getPeriodesForIndicateur(indic1);
const periode1 = view(Inputs.select(per1Map, { value: [...per1Map.values()][0], label: "" }));
```

</div>

<!-- Colonne DROITE (décalée pour aligner sur cartes droite ~430px) -->
<div style="display:flex;flex-direction:column;width:320px;margin-left:40px;">
<div style="font-size:10px;font-weight:600;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;text-align:center;margin-bottom:2px;">Droite</div>

```js
const indic2 = view(Inputs.select(getIndicOptionsByAggDash(), { value: "dm_sma_vtcam", label: "" }));
```

```js
const per2Map = getPeriodesForIndicateur(indic2);
const periode2 = view(Inputs.select(per2Map, { value: [...per2Map.values()][0], label: "" }));
```

</div>

<!-- Bloc instructions EXDTC aligné droite -->
<div class="sub-banner-instructions">
<span>Comparez 2 indicateurs sur cartes choroplèthes. <b>Clic</b> = zoom, <b>Ctrl+clic</b> = multi-sélection.</span>
<span>Le tableau liste les communes ; <b>clic header</b> = tri, la sélection carte filtre les lignes.</span>
<span class="version">OTTD v2.0</span>
</div>

</div>
</div>
<!-- &e SUB_BANNER -->

<!-- &s SIDEBAR -->
<aside class="sidebar">

<section class="panel">
<div class="panel-title">ÉCHELON</div>

```js
const echelon = view(Inputs.radio(
  ECHELONS_SIDEBAR,  // Importé de constants.js
  { value: "EPCI", label: "" }
));
```

</section>

<section class="panel">
<div class="panel-title">SÉLECTION TERRITOIRES</div>
<div id="search-container" style="margin-top:6px;"></div>
</section>

<section class="panel">
<div class="panel-title">OPTIONS CARTES</div>

```js
const colorMode = view(Inputs.radio(["8 catégories", "Gradient"], { value: "8 catégories", label: "Mode représ." }));
const showValuesOnMap = view(Inputs.toggle({ label: "Afficher labels", value: true }));
const labelBy = view(Inputs.select(new Map([
  ["Principaux terr.", "population"],
  ["Top 20 + Bot 20", "top5_bot5"],
  ["Top 20 indic", "indicator_top"],
  ["Bottom 20 indic", "indicator_bottom"]
]), { value: "population", label: "Labels" }));
const labelMode = view(Inputs.radio(["values", "names", "both"], { value: "both", label: "Contenu" }));
const showOverlay = view(Inputs.toggle({ label: "Contours départ.", value: false }));
```

</section>

<section class="panel">
<div class="panel-title">FILTRE DENSITÉ</div>

```js
// Filtre densité (appliqué au scatter EPCI uniquement pour l'instant)
const densiteFilter = view(Inputs.radio(
  ["Tous", "Rural", "Intermédiaire", "Urbain"],
  { value: "Tous", label: "" }
));
```

</section>

<section class="panel">
<div class="panel-title">Colonnes tableau <span class="panel-tooltip-wrap"><span class="panel-tooltip-icon">?</span><span class="panel-tooltip-text">Sélectionner des indicateurs supplémentaires à ajouter au tableau.<br><b>Ctrl+clic</b> : ajouter/retirer un indicateur.<br><b>Shift+clic</b> : sélection continue.</span></span></div>

```js
// Multi-select indicateurs supplémentaires (dans sidebar)
const extraIndics = view(Inputs.select(
  getIndicOptionsByAggDash(),
  { label: "", multiple: true, value: [], width: 230 }
));
```

</section>

</aside>
<!-- &e SIDEBAR -->

<!-- &s LAYOUT_MAIN -->
<div class="layout-main">

```js
// === DONNÉES ===
const meta = getEchelonMeta(echelon);
const currentGeo = await getGeo(echelon);
const rawData = await getData(echelon);
const frData = getFranceData(rawData);
const dataNoFrance = getDataNoFrance(rawData);

const colKey1 = buildColKey(indic1, periode1);
const colKey2 = buildColKey(indic2, periode2);
const label1 = getIndicLabel(indic1, "long");
const label2 = getIndicLabel(indic2, "long");

for (const f of currentGeo.features) {
  const row = dataNoFrance.find(d => d.code === f.properties[meta.geoKey]);
  if (row) {
    f.properties[colKey1] = row[colKey1];
    f.properties[colKey2] = row[colKey2];
    f.properties.P23_POP = row.P23_POP;
  }
}

// &jcn-colors computeIndicBins : auto-détection divergente + bins centrées 0
const indic1Bins = computeIndicBins(dataNoFrance, colKey1, indic1);
const indic2Bins = computeIndicBins(dataNoFrance, colKey2, indic2);
const { bins: bins1, palette: PAL1, isDiv: isDiv1, getColor: getColorBins1 } = indic1Bins;
const { bins: bins2, palette: PAL2, isDiv: isDiv2, getColor: getColorBins2 } = indic2Bins;

// Mode gradient : échelles continues
const gradient1 = createGradientScale(dataNoFrance, colKey1);
const gradient2 = createGradientScale(dataNoFrance, colKey2);
const isGradient = colorMode === "Gradient";

// getColor dynamique selon mode
const getColor1 = isGradient ? gradient1.getColor : getColorBins1;
const getColor2 = isGradient ? gradient2.getColor : getColorBins2;
```

```js
// === SIDEBAR SEARCH (inclut regdep pour recherche ex: "hdf/59") ===
const searchData = dataNoFrance.map(d => ({ code: d.code, label: d.libelle || d.code, pop: d.P23_POP, regdep: d.regdep || "" }));
const searchBox = createSearchBox({
  data: searchData, selection: mapSelectionState, onToggle: toggleMapSelection, onClear: clearMapSelection,
  placeholder: "Recherche (ex: hdf/59)...", maxResults: 8, maxChips: 4, maxWidth: 230, showClearAll: true, showCount: true
});
const searchContainer = document.getElementById('search-container');
if (searchContainer) { searchContainer.innerHTML = ''; searchContainer.appendChild(searchBox); }
```


<!-- &s CARTES_ET_TABLEAU — Layout principal : 4 cartes gauche + tableau droite -->

```js
// Calcul zoomLabel pour header (avant rendu)
// Si le code zoom actuel n'existe pas dans l'échelon, on revient au Paris par défaut
const _zoomVal = zoomTargetState;
const labelMap = getLabelMap(echelon);
const zoomCode = (_zoomVal && labelMap?.has(_zoomVal)) ? _zoomVal : getDefaultZoomCode(echelon);
const zoomLabel = labelMap?.get(zoomCode) || zoomCode;
```

<!-- Titres + contenus dans même flex pour alignement naturel -->
<div style="display:flex;gap:12px;align-items:stretch;">

<!-- COLONNE GAUCHE : titre + 4 cartes (France + Zoom) -->
<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:4px;">
<h3 style="margin:0 0 0 8px;">Vue France par ${echelon} // Focus communes : ${zoomLabel}</h3>

```js
// Zoom state persistant entre re-renders (survit aux changements labelBy/labelMode)
if (!window._zoomStates) window._zoomStates = {};
```

<!-- Cartes France -->
<div class="cards-row">

<div class="card">

```js
// Carte 1 : renderChoropleth + mini options
const map1 = renderChoropleth({
  geoData: currentGeo, valueCol: colKey1,
  getColor: (v, f) => getColor1(v),
  getCode: f => f.properties[meta.geoKey],
  getLabel: ({ code }) => getLabelMap(echelon)?.get(code) || code,
  formatValue: (k, v) => formatValue(indic1, v),
  indicLabel: label1, selectedCodes: [...mapSelectionState],
  showLabels: showValuesOnMap, labelMode, labelBy, topN: 0,
  title: label1,  // Titre SVG pour export
  echelon, width: 385, height: 355, maxLabelsAuto: 600,
  overlayGeo: showOverlay && echelon !== "Département" ? depGeo : null
});
const counts1 = countBins(dataNoFrance, colKey1, bins1.thresholds || []);
const unit1 = getIndicUnit(colKey1);
const legend1 = isGradient
  ? createGradientLegend({
      colors: gradient1.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradient1.min, max: gradient1.max, showZero: gradient1.divergent,
      decimals: 2, title: `Légende${unit1 ? " (" + unit1 + ")" : ""}`,
      capped: true, rawMin: gradient1.rawMin, rawMax: gradient1.rawMax
    })
  : createBinsLegend({
      colors: PAL1, labels: bins1.labels || [], counts: counts1,
      vertical: true, title: "Légende", unit: unit1, reverse: !isDiv1
    });
// Click handler : click normal = zoom only, Ctrl+click = add to selection
map1.style.cursor = "pointer";
map1.addEventListener("click", (e) => {
  const path = e.target.closest("path");
  if (!path) return;
  const paths = Array.from(path.parentElement.querySelectorAll("path"));
  const idx = paths.indexOf(path);
  if (idx >= 0 && idx < currentGeo.features.length) {
    const code = currentGeo.features[idx].properties[meta.geoKey];
    if (e.ctrlKey || e.metaKey) {
      addToSelection(code);   // Ctrl+click = ajoute + zoom
    } else {
      setZoomOnly(code);      // Click normal = zoom seulement
    }
  }
});
const wrapper1 = createMapWrapper(map1, null, legend1, addZoomBehavior(map1, {
  initialTransform: window._zoomStates.map1,
  onZoom: t => { window._zoomStates.map1 = t; }
}), {
  exportSVGFn: exportSVG, echelon, colKey: colKey1, title: label1
});
display(wrapper1);
```

</div>

<div class="card">

```js
// Carte 2 : même pattern + mini options
const map2 = renderChoropleth({
  geoData: currentGeo, valueCol: colKey2,
  getColor: (v, f) => getColor2(v),
  getCode: f => f.properties[meta.geoKey],
  getLabel: ({ code }) => getLabelMap(echelon)?.get(code) || code,
  formatValue: (k, v) => formatValue(indic2, v),
  indicLabel: label2, selectedCodes: [...mapSelectionState],
  showLabels: showValuesOnMap, labelMode, labelBy, topN: 0,
  title: label2,  // Titre SVG pour export
  echelon, width: 385, height: 355, maxLabelsAuto: 600,
  overlayGeo: showOverlay && echelon !== "Département" ? depGeo : null
});
const counts2 = countBins(dataNoFrance, colKey2, bins2.thresholds || []);
const unit2 = getIndicUnit(colKey2);
const legend2 = isGradient
  ? createGradientLegend({
      colors: gradient2.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradient2.min, max: gradient2.max, showZero: gradient2.divergent,
      decimals: 2, title: `Légende${unit2 ? " (" + unit2 + ")" : ""}`,
      capped: true, rawMin: gradient2.rawMin, rawMax: gradient2.rawMax
    })
  : createBinsLegend({
      colors: PAL2, labels: bins2.labels || [], counts: counts2,
      vertical: true, title: "Légende", unit: unit2, reverse: !isDiv2
    });
// Click handler : click normal = zoom only, Ctrl+click = add to selection
map2.style.cursor = "pointer";
map2.addEventListener("click", (e) => {
  const path = e.target.closest("path");
  if (!path) return;
  const paths = Array.from(path.parentElement.querySelectorAll("path"));
  const idx = paths.indexOf(path);
  if (idx >= 0 && idx < currentGeo.features.length) {
    const code = currentGeo.features[idx].properties[meta.geoKey];
    if (e.ctrlKey || e.metaKey) {
      addToSelection(code);   // Ctrl+click = ajoute + zoom
    } else {
      setZoomOnly(code);      // Click normal = zoom seulement
    }
  }
});
const wrapper2 = createMapWrapper(map2, null, legend2, addZoomBehavior(map2, {
  initialTransform: window._zoomStates.map2,
  onZoom: t => { window._zoomStates.map2 = t; }
}), {
  exportSVGFn: exportSVG, echelon, colKey: colKey2, title: label2
});
display(wrapper2);
```

</div>

</div>
<!-- Fin cards-row France -->

<!-- &s CARTES_ZOOM — Intégré dans colonne gauche -->

```js
// Zoom : query données communes pour le territoire sélectionné
const filterKey = meta?.filterKey || "DEP";
const isEPCI = echelon === "EPCI";
// EPCI spécial : OR logic pour MGP (EPCI_EPT=code pour Paris arrond., EPCI=code pour 150 communes MGP)
const zoomFilter = isEPCI ? null : { [filterKey]: [zoomCode] };
const zoomCustomWhere = isEPCI
  ? `(CAST("EPCI_EPT" AS VARCHAR) = '${zoomCode}' OR CAST("EPCI" AS VARCHAR) = '${zoomCode}')`
  : null;
const zoomData = await queryCommunes({ conn }, {
  tableName: "communes", filter: zoomFilter, customWhere: zoomCustomWhere,
  columns: ["code", "libelle", "P23_POP", colKey1, colKey2], limit: 2000
});
const zoomDataMap = new Map(zoomData.map(d => [d.code, d]));

// EPCI : le topojson n'a pas de colonne EPCI (seulement EPCI_EPT = EPT code)
// → filtrer par CODGEO matching les résultats DuckDB (qui eux ont la bonne colonne EPCI)
const filteredFeatures = communesGeo.features.filter(f => {
  if (isEPCI) return zoomDataMap.has(f.properties.CODGEO);
  return String(f.properties[filterKey]) === String(zoomCode);
});
const zoomGeo = {
  type: "FeatureCollection",
  features: filteredFeatures.map(f => {
    const d = zoomDataMap.get(f.properties.CODGEO);
    return { ...f, properties: { ...f.properties, libelle: d?.libelle, P23_POP: d?.P23_POP, [colKey1]: d?.[colKey1], [colKey2]: d?.[colKey2] } };
  })
};

// Bins zoom : recalcule si assez de données, sinon reprend bins France
const zoomBins1 = zoomData.length >= 10 ? computeIndicBins(zoomData, colKey1, indic1) : indic1Bins;
const zoomBins2 = zoomData.length >= 10 ? computeIndicBins(zoomData, colKey2, indic2) : indic2Bins;
const binsC1 = zoomBins1.bins;
const binsC2 = zoomBins2.bins;

// Gradient zoom : recalcule localement si assez de données
const gradientC1 = zoomData.length >= 10 ? createGradientScale(zoomData, colKey1) : gradient1;
const gradientC2 = zoomData.length >= 10 ? createGradientScale(zoomData, colKey2) : gradient2;
const getColorC1 = isGradient ? gradientC1.getColor : zoomBins1.getColor;
const getColorC2 = isGradient ? gradientC2.getColor : zoomBins2.getColor;
```

<div class="cards-row">

<div class="card">

```js
const mapC1 = renderChoropleth({
  geoData: zoomGeo, valueCol: colKey1,
  getColor: getColorC1,
  getCode: f => f.properties.CODGEO,
  getLabel: ({ code }) => zoomDataMap.get(code)?.libelle || code,
  formatValue: (k, v) => formatValue(indic1, v),
  indicLabel: label1, showLabels: showValuesOnMap,
  labelMode, labelBy, topN: 300,
  title: `${label1} — ${zoomLabel}`,  // Titre avec territoire
  maxLabelsAuto: 100, echelon: "Commune", width: 385, height: 355
});
const countsC1 = countBins(zoomData, colKey1, binsC1.thresholds || []);
const legendC1 = isGradient
  ? createGradientLegend({
      colors: gradientC1.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradientC1.min, max: gradientC1.max, showZero: gradientC1.divergent,
      decimals: 2, title: `Légende${unit1 ? " (" + unit1 + ")" : ""}`,
      capped: true, rawMin: gradientC1.rawMin, rawMax: gradientC1.rawMax
    })
  : createBinsLegend({
      colors: zoomBins1.palette, labels: binsC1.labels || [], counts: countsC1,
      vertical: true, title: "Légende", unit: unit1, reverse: !zoomBins1.isDiv
    });
display(createMapWrapper(mapC1, null, legendC1, addZoomBehavior(mapC1, {
  initialTransform: window._zoomStates.mapC1,
  onZoom: t => { window._zoomStates.mapC1 = t; }
}), {
  exportSVGFn: exportSVG, echelon: zoomLabel, colKey: colKey1, title: `${label1} — ${zoomLabel}`
}));
```

</div>

<div class="card">

```js
const mapC2 = renderChoropleth({
  geoData: zoomGeo, valueCol: colKey2,
  getColor: getColorC2,
  getCode: f => f.properties.CODGEO,
  getLabel: ({ code }) => zoomDataMap.get(code)?.libelle || code,
  formatValue: (k, v) => formatValue(indic2, v),
  indicLabel: label2, showLabels: showValuesOnMap,
  labelMode, labelBy, topN: 300,
  title: `${label2} — ${zoomLabel}`,  // Titre avec territoire
  maxLabelsAuto: 100, echelon: "Commune", width: 385, height: 355
});
const countsC2 = countBins(zoomData, colKey2, binsC2.thresholds || []);
const legendC2 = isGradient
  ? createGradientLegend({
      colors: gradientC2.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradientC2.min, max: gradientC2.max, showZero: gradientC2.divergent,
      decimals: 2, title: `Légende${unit2 ? " (" + unit2 + ")" : ""}`,
      capped: true, rawMin: gradientC2.rawMin, rawMax: gradientC2.rawMax
    })
  : createBinsLegend({
      colors: zoomBins2.palette, labels: binsC2.labels || [], counts: countsC2,
      vertical: true, title: "Légende", unit: unit2, reverse: !zoomBins2.isDiv
    });
display(createMapWrapper(mapC2, null, legendC2, addZoomBehavior(mapC2, {
  initialTransform: window._zoomStates.mapC2,
  onZoom: t => { window._zoomStates.mapC2 = t; }
}), {
  exportSVGFn: exportSVG, echelon: zoomLabel, colKey: colKey2, title: `${label2} — ${zoomLabel}`
}));
```

</div>

</div>
<!-- Fin cards-row Zoom -->

<!-- &s SCATTER_EMP — Scatter plot Emploi vs SMA (échelon courant) avec zoom -->

```js
// === SCATTER EMPLOI — Suit l'échelon sélectionné ===
// Filtre CA/CU/Métro uniquement si échelon = EPCI

// Mapping densité (INSEE: 1=Urbain dense, 2=Intermédiaire, 3=Rural)
const dens3Map = { "Rural": "3", "Intermédiaire": "2", "Urbain": "1" };
// Label densité pour titre
const densiteLabel = densiteFilter !== "Tous" ? ` — ${densiteFilter}` : "";

// Filtrer données selon échelon
const scatterEmpData = (() => {
  let filtered = dataNoFrance.filter(d => d.P23_POP != null);

  // Si EPCI, filtrer CA/CU/Métropoles/EPT via type_epci (exclut CC)
  if (echelon === "EPCI") {
    filtered = filtered.filter(d => {
      const t = d.type_epci || "";
      return t === "CA" || t === "CU" || t === "MET" || t === "EPT";
    });
  }

  // Appliquer filtre densité (seulement si colonne dens3 existe: DEP, EPCI, BV)
  if (densiteFilter !== "Tous" && filtered.some(d => d.dens3 != null)) {
    filtered = filtered.filter(d => d.dens3 === dens3Map[densiteFilter]);
  }

  return filtered.sort((a, b) => b.P23_POP - a.P23_POP);
})();

// Scale pow(0.65) pour taille bulles — plus de contraste que sqrt (0.5)
const popExtentEmp = d3.extent(scatterEmpData, d => d.P23_POP);
const minRadiusEmp = scatterEmpData.length < 20 ? 8 : scatterEmpData.length < 50 ? 4 : 1.5;
const radiusScaleEmp = d3.scalePow().exponent(0.65).domain(popExtentEmp).range([minRadiusEmp, 60]);

// Couleur par densité
const getDensColorEmp = (d) => {
  if (d.dens3 === "1") return "#dc2626";  // Urbain = rouge
  if (d.dens3 === "2") return "#f59e0b";  // Intermédiaire = orange
  return "#22c55e";  // Rural = vert
};

// Domaines avec padding
const validEmp = scatterEmpData.filter(d => d.eco_emp_vtcam_1622 != null && d.dm_sma_vtcam_1622 != null);
const xExtEmp = d3.extent(validEmp, d => d.eco_emp_vtcam_1622);
const yExtEmp = d3.extent(validEmp, d => d.dm_sma_vtcam_1622);
const xPadEmp = (xExtEmp[1] - xExtEmp[0]) * 0.12 || 0.5;
const yPadEmp = (yExtEmp[1] - yExtEmp[0]) * 0.12 || 0.5;

// Calcul Top5/Bot5 pour labels scatter (lié au labelBy sidebar)
const scatterEmpLabelCodes = (() => {
  if (labelBy === "population") {
    // Top 10 par population (déjà triés)
    return validEmp.slice(0, 10).map(d => d.code);
  } else if (labelBy === "top5_bot5") {
    // Top 5 + Bottom 5 par indicateur X (emploi)
    const sorted = [...validEmp].sort((a, b) => b.eco_emp_vtcam_1622 - a.eco_emp_vtcam_1622);
    return [...sorted.slice(0, 5), ...sorted.slice(-5)].map(d => d.code);
  } else if (labelBy === "indicator_top") {
    return [...validEmp].sort((a, b) => b.eco_emp_vtcam_1622 - a.eco_emp_vtcam_1622).slice(0, 10).map(d => d.code);
  } else if (labelBy === "indicator_bottom") {
    return [...validEmp].sort((a, b) => a.eco_emp_vtcam_1622 - b.eco_emp_vtcam_1622).slice(0, 10).map(d => d.code);
  }
  return [];
})();

// Scatter emploi vs SMA
const scatterEmpContainer = createScatterWithZoom({
  title: `Dynamiques ${echelon} (${scatterEmpData.length}${densiteLabel}) — Emploi vs Solde Migratoire 2016-2022`,
  legend: [
    { label: "Urbain", color: "#dc2626" },
    { label: "Intermédiaire", color: "#f59e0b" },
    { label: "Rural", color: "#22c55e" }
  ],
  sizeLabel: "Taille = Population 2023",
  data: scatterEmpData,
  xCol: "eco_emp_vtcam_1622",
  yCol: "dm_sma_vtcam_1622",
  xDomain: [xExtEmp[0] - xPadEmp, xExtEmp[1] + xPadEmp],
  yDomain: [yExtEmp[0] - yPadEmp, yExtEmp[1] + yPadEmp],
  xLabel: "Croissance Emploi (TCAM %/an) →",
  yLabel: "↑ Solde Migratoire Apparent (TCAM %/an)",
  meanX: frData?.eco_emp_vtcam_1622,
  meanY: frData?.dm_sma_vtcam_1622,
  getRadius: d => radiusScaleEmp(d.P23_POP || 50000),
  getColor: getDensColorEmp,
  isSelected: d => mapSelectionState.has(d.code),
  getTooltip: d => `${d.libelle || d.code}\nEmploi: ${d.eco_emp_vtcam_1622?.toFixed(2)}%/an\nSMA: ${d.dm_sma_vtcam_1622?.toFixed(2)}%/an\nPop 2023: ${d.P23_POP?.toLocaleString("fr-FR")}\nDensité: ${d.dens3 === "1" ? "Urbain" : d.dens3 === "2" ? "Intermédiaire" : "Rural"}`,
  fillOpacity: 0.6,
  width: 790,
  height: 400,
  labelCodes: scatterEmpLabelCodes,
  labelMode: labelMode
});
display(scatterEmpContainer);
```

<!-- &e SCATTER_EMP -->

<!-- &s SCATTER_IDX — Scatter plot Attractivité Résidentielle vs Économique (échelon courant, centré 50) -->

```js
// === SCATTER IDX — Suit l'échelon sélectionné ===
// X = idxresid_dyn_ind_1622, Y = idxeco_tot_ind_1724

// Filtrer données selon échelon (même logique que scatter emploi)
const scatterIdxData = (() => {
  let filtered = dataNoFrance.filter(d => d.P23_POP != null);

  // Si EPCI, filtrer CA/CU/Métropoles/EPT via type_epci (exclut CC)
  if (echelon === "EPCI") {
    filtered = filtered.filter(d => {
      const t = d.type_epci || "";
      return t === "CA" || t === "CU" || t === "MET" || t === "EPT";
    });
  }

  // Filtrer indices disponibles + densité
  filtered = filtered
    .filter(d => d.idxresid_dyn_ind_1622 != null && d.idxeco_tot_ind_1724 != null)
    .filter(d => densiteFilter === "Tous" || d.dens3 === dens3Map[densiteFilter]);

  return filtered.sort((a, b) => b.P23_POP - a.P23_POP);
})();

// Scale pow(0.65) pour taille bulles — plus de contraste que sqrt (0.5)
const popExtentIdx = d3.extent(scatterIdxData, d => d.P23_POP);
const minRadiusIdx = scatterIdxData.length < 20 ? 8 : scatterIdxData.length < 50 ? 4 : 1.5;
const radiusScaleIdx = d3.scalePow().exponent(0.65).domain(popExtentIdx).range([minRadiusIdx, 60]);

// Couleur par densité
const getDensColorIdx = (d) => {
  if (d.dens3 === "1") return "#dc2626";  // Urbain = rouge
  if (d.dens3 === "2") return "#f59e0b";  // Intermédiaire = orange
  return "#22c55e";  // Rural = vert
};

// Calcul Top5/Bot5 pour labels scatter idx (lié au labelBy sidebar)
const scatterIdxLabelCodes = (() => {
  if (labelBy === "population") {
    return scatterIdxData.slice(0, 10).map(d => d.code);
  } else if (labelBy === "top5_bot5") {
    // Top 5 + Bottom 5 par indicateur X (idx résidentiel)
    const sorted = [...scatterIdxData].sort((a, b) => b.idxresid_dyn_ind_1622 - a.idxresid_dyn_ind_1622);
    return [...sorted.slice(0, 5), ...sorted.slice(-5)].map(d => d.code);
  } else if (labelBy === "indicator_top") {
    return [...scatterIdxData].sort((a, b) => b.idxresid_dyn_ind_1622 - a.idxresid_dyn_ind_1622).slice(0, 10).map(d => d.code);
  } else if (labelBy === "indicator_bottom") {
    return [...scatterIdxData].sort((a, b) => a.idxresid_dyn_ind_1622 - b.idxresid_dyn_ind_1622).slice(0, 10).map(d => d.code);
  }
  return [];
})();

// Scatter indices attractivité (centré 50, grille tous les 10)
const scatterIdxContainer = createScatterWithZoom({
  title: `Attractivité ${echelon} (${scatterIdxData.length}${densiteLabel}) — Résidentielle vs Économique`,
  legend: [
    { label: "Urbain", color: "#dc2626" },
    { label: "Intermédiaire", color: "#f59e0b" },
    { label: "Rural", color: "#22c55e" }
  ],
  sizeLabel: "Taille = Population 2023",
  data: scatterIdxData,
  xCol: "idxresid_dyn_ind_1622",
  yCol: "idxeco_tot_ind_1724",
  xDomain: [0, 100],
  yDomain: [0, 100],
  xLabel: "Idx Résidentiel (16-22) →",
  yLabel: "↑ Idx Économique (17-24)",
  meanX: 50,
  meanY: 50,
  xTicks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  yTicks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  getRadius: d => radiusScaleIdx(d.P23_POP || 50000),
  getColor: getDensColorIdx,
  isSelected: d => mapSelectionState.has(d.code),
  getTooltip: d => `${d.libelle || d.code}\nRésid: ${d.idxresid_dyn_ind_1622?.toFixed(1)}\nÉco: ${d.idxeco_tot_ind_1724?.toFixed(1)}\nPop 2023: ${d.P23_POP?.toLocaleString("fr-FR")}\nDensité: ${d.dens3 === "1" ? "Urbain" : d.dens3 === "2" ? "Intermédiaire" : "Rural"}`,
  fillOpacity: 0.6,
  width: 790,
  height: 400,
  labelCodes: scatterIdxLabelCodes,
  labelMode: labelMode
});
display(scatterIdxContainer);
```

<!-- &e SCATTER_IDX -->

</div>
<!-- Fin COLONNE GAUCHE (4 cartes + scatter) -->

<!-- COLONNE DROITE : Titre + Tableau échelon -->
<div style="flex:1;min-width:300px;display:flex;flex-direction:column;">
<h3 style="margin:0 0 4px 0;">Tableau ${echelon}<span class="table-help-wrap"><span class="table-help-icon">?</span><span class="help-tooltip"><b>Couleurs</b> : intensit&eacute; proportionnelle &agrave; l'&eacute;cart par rapport &agrave; la moyenne.<br>&bull; <span style="color:#98cf90">&#9632;</span> Vert = au-dessus de la moyenne<br>&bull; <span style="color:#e46aa7">&#9632;</span> Violet = en-dessous de la moyenne<br>&bull; <span style="color:#73BFE2">&#9632;</span> Bleu = d&eacute;grad&eacute; d'intensit&eacute; (%, stocks)<br>Plus la couleur est fonc&eacute;e, plus la valeur est extr&ecirc;me (~top 1%).<br><b>Filtre</b> : tapez un nom de r&eacute;gion (ex: BRE), un n&deg; de d&eacute;partement (ex: 35) ou un nom de territoire.</span></span></h3>
<div class="card" style="flex:1;padding:6px;display:flex;flex-direction:column;min-height:0;">

```js
// === STATE TABLEAU ÉCHELON ===
const echSortState2 = Mutable({ col: null, asc: false });  // Pas de tri par défaut (ordre données)

const setEchSort2 = (col) => {
  const curr = echSortState2.value.col;
  const asc = echSortState2.value.asc;
  echSortState2.value = curr === col ? { col, asc: !asc } : { col, asc: false };
};
```

```js
// === SEARCHBAR TABLEAU ÉCHELON (viewof pattern) ===
const echSearchInput = view(Inputs.text({ placeholder: "Taper pour filtrer territoires...", width: 200 }));
```

```js
// === DONNÉES TABLEAU ÉCHELON ===
const echBaseCols2 = [colKey1, colKey2];
const echExtraCols2 = (extraIndics || []).filter(i => !i.startsWith("__sep_")).map(i => buildColKey(i, getDefaultPeriode(i)));
// Extras EN PREMIER (position 1), puis colonnes cartes
const echAllIndicCols2 = [...new Set([...echExtraCols2, ...echBaseCols2])];

// Filtrer CA/CU/Métropoles/EPT si EPCI via type_epci (exclut CC)
const epciTypeFilter = (d) => {
  const t = d.type_epci || "";
  return t === "CA" || t === "CU" || t === "MET" || t === "EPT";
};
const dataFiltered = echelon === "EPCI" ? dataNoFrance.filter(epciTypeFilter) : dataNoFrance;

// Données avec France en 1ère ligne + regshort dérivé de regdep
const echTableData2 = (frData ? [frData, ...dataFiltered] : dataFiltered).map(d => ({
  ...d, regshort: d.regdep ? d.regdep.split("/")[0] : ""
}));

// Filtre recherche : regshort + libelle + regdep (colonnes visibles uniquement)
const echSearchVal = (echSearchInput || "").toLowerCase();
const echFiltered2 = echSearchVal
  ? echTableData2.filter(d => d.code === "00FR" || (d.regshort || "").toLowerCase().includes(echSearchVal) || (d.libelle || "").toLowerCase().includes(echSearchVal) || (d.regdep || "").toLowerCase().includes(echSearchVal))
  : echTableData2;

// Tri
const echSortCol2 = echSortState2.col;
const echSortAsc2 = echSortState2.asc;
const echSorted2 = sortTableData(echFiltered2, echSortCol2, echSortAsc2);

// Stats pour barres
const echStats2 = computeBarStats(echFiltered2, echAllIndicCols2);

// Colonnes compactes : Rég + Territoire + indicateurs (sans Pop 2023, comme tableau communes)
const echColumns2 = [
  { key: "regshort", label: "Rég", type: "text", width: 45 },
  { key: "libelle", label: "Territoire", type: "text", width: 130 },
  ...echAllIndicCols2.map(col => {
    const indic = col.replace(/_\d+$/, "");
    const per = col.match(/_(\d{2,4})$/)?.[1] || "";
    return {
      key: col,
      label: getIndicLabel(indic, "short"),
      unit: getIndicUnit(col),
      periode: per ? getPeriodeLabel(per, "short") : ""
    };
  })
];

// Header : count + export (searchbar déjà affichée par viewof)
display(html`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
  <span style="font-size:10px;color:#6b7280;">${echFiltered2.length} terr.</span>
  <button style="font-size:10px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;"
    onclick=${() => exportCSV(echSorted2, echColumns2, echelon.replace(/[^a-zA-Z]/g, "") + "_" + new Date().toISOString().slice(0,10) + ".csv")}>
    📥
  </button>
</div>`);

// Tableau compact avec scroll vertical pour couvrir hauteur 4 cartes + scatter
// Wrapper flex-grow pour que le tableau remplisse tout l'espace disponible
const tableWrapper = document.createElement("div");
tableWrapper.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;";

const tableEl = renderTable({
  data: echSorted2,
  columns: echColumns2,
  stats: echStats2,
  sortCol: echSortCol2,
  sortAsc: echSortAsc2,
  setSort: setEchSort2,
  indicColKey: colKey1,
  compact: true,
  maxHeight: 1800,  // Plus grand pour couvrir cartes + scatter plots
  scrollX: true,
  scrollbarTop: true,
  stickyFirstCol: 2  // Freeze Rég + Territoire
});
tableWrapper.appendChild(tableEl);
display(tableWrapper);
```

</div><!-- card -->
</div>
<!-- Fin COLONNE DROITE (titre + tableau) -->

</div>
<!-- &e CARTES_ET_TABLEAU -->

<!-- &s TABLEAU -->
<h3 style="margin-left:4px;">Tableau communes<span class="table-help-wrap"><span class="table-help-icon">?</span><span class="help-tooltip"><b>Couleurs</b> : intensit&eacute; proportionnelle &agrave; l'&eacute;cart par rapport &agrave; la moyenne.<br>&bull; <span style="color:#98cf90">&#9632;</span> Vert = au-dessus de la moyenne<br>&bull; <span style="color:#e46aa7">&#9632;</span> Violet = en-dessous de la moyenne<br>&bull; <span style="color:#73BFE2">&#9632;</span> Bleu = d&eacute;grad&eacute; d'intensit&eacute; (%, stocks)<br>Plus la couleur est fonc&eacute;e, plus la valeur est extr&ecirc;me (~top 1%).<br><b>Filtre</b> : tapez un nom de r&eacute;gion (ex: BRE), un n&deg; de d&eacute;partement (ex: 35) ou un nom de commune.</span></span></h3>

<div class="card" style="padding:8px;margin-left:4px;">

```js
// === INPUT RECHERCHE TABLEAU (viewof pattern Observable) ===
const tableSearchInput = view(Inputs.text({
  placeholder: "Taper pour filtrer territoires...",
  width: 240
}));
```

<style>
/* Style input filtre tableau */
.card input[type="text"] {
  font-size: 13px;
  padding: 6px 10px;
}
</style>

```js
// === DONNÉES TABLEAU ===
// &jcn-duckdb queryCommunes : Si sélection filtre codes, sinon pop > 3000 hab
const filterCodes = [...mapSelectionState];
const hasSelection = filterCodes.length > 0;
const tableFilter = hasSelection ? { [filterKey]: filterCodes } : null;

// Colonnes de base : cartes + indicateurs clés par défaut + extras
const defaultIndicCols = DEFAULT_TABLE_INDICS.map(i => buildColKey(i, getDefaultPeriode(i)));
const extraCols = (extraIndics || []).filter(i => !i.startsWith("__sep_")).map(i => {
  return buildColKey(i, getDefaultPeriode(i));
});
// Ordre : extras ajoutés en PREMIER (après pop), puis cartes, puis défauts
const allIndicCols = [...new Set([...extraCols, colKey1, colKey2, ...defaultIndicCols])];

// Si sélection: limite 500. Sinon: communes > MIN_POP_DEFAULT hab (~950 communes)
// MIN_POP_DEFAULT importé de constants.js (10000)
const communesData = await queryCommunes({ conn }, {
  tableName: "communes",
  filter: tableFilter,
  columns: ["code", "libelle", "regdep", "P23_POP", ...allIndicCols],
  limit: hasSelection ? 500 : undefined,
  minPop: hasSelection ? 0 : MIN_POP_DEFAULT
});

// Ligne France (lue depuis 00FR ou calculée) — toujours en 1ère ligne + regshort dérivé
const frRow = await queryFrance({ conn }, "communes", allIndicCols);
const tableData = (frRow ? [frRow, ...communesData] : communesData).map(d => ({
  ...d, regshort: d.regdep ? d.regdep.split("/")[0] : ""
}));

// Filtre texte : regshort + libelle + regdep (colonnes visibles uniquement)
const searchLower = (tableSearchInput || "").toLowerCase();
const filteredData = searchLower
  ? tableData.filter(d => d.code === "00FR" || (d.regshort || "").toLowerCase().includes(searchLower) || (d.libelle || "").toLowerCase().includes(searchLower) || (d.regdep || "").toLowerCase().includes(searchLower))
  : tableData;

const sortCol = sortState.col;
const sortAsc = sortState.asc;
// Séparer France pour la garder en premier (pas triée)
const franceRow = filteredData.find(d => d.code === "00FR");
const otherRows = filteredData.filter(d => d.code !== "00FR");
const sortedOthers = sortTableData(otherRows, sortCol, sortAsc);
const sorted = franceRow ? [franceRow, ...sortedOthers] : sortedOthers;
// PAGE_SIZE_DEFAULT importé de constants.js (200)
const currentPage = Math.min(pageState, Math.max(0, Math.ceil(sorted.length / PAGE_SIZE_DEFAULT) - 1));
const paged = sorted.slice(currentPage * PAGE_SIZE_DEFAULT, (currentPage + 1) * PAGE_SIZE_DEFAULT);
const stats = computeBarStats(filteredData, ["P23_POP", ...allIndicCols]);

// Colonnes dynamiques : label sans période, période séparée pour header
const extractPeriode = (colKey) => {
  const match = colKey.match(/_(\d{2,4})$/);
  return match ? match[1] : "";
};
const columns = [
  { key: "regshort", label: "Rég", type: "text", width: 45 },
  { key: "libelle", label: "Commune", type: "text", width: 180 },
  { key: "P23_POP", label: "Pop 2023", unit: "hab" },
  ...allIndicCols.map(col => {
    const indic = col.replace(/_\d+$/, "");
    const per = extractPeriode(col);
    return {
      key: col,
      label: getIndicLabel(indic, "short"),
      unit: getIndicUnit(col),
      periode: per ? getPeriodeLabel(per, "short") : ""
    };
  })
];
```

```js
// Bouton export CSV (l'input search est déjà affiché par le view() ci-dessus)
display(html`<div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
  <button style="font-size:11px;padding:4px 10px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;"
    onclick=${() => exportCSV(sorted, columns, "communes_" + echelon + "_" + new Date().toISOString().slice(0,10) + ".csv")}>
    📥 Export CSV
  </button>
</div>`);
```

```js
// Pagination (PAGE_SIZE_DEFAULT lignes par page)
display(renderPagination(sorted.length, currentPage, setPage, PAGE_SIZE_DEFAULT,
  ` | ${filterCodes.length > 0 ? filterCodes.length + " terr. sélect." : "pop > 10k"}${searchLower ? ` | "${searchLower}"` : ""}`));
```

```js
display(renderTable({
  data: paged,
  columns,
  stats,
  sortCol,
  sortAsc,
  setSort,
  indicColKey: colKey1,
  stickyFirstCol: 2,  // Freeze Rég + Commune
  scrollX: true,
  scrollbarTop: true,
  maxHeight: 600
}));
```

</div>
<!-- &e TABLEAU -->

<!-- &s PERF_PANEL -->
```js
// Performance monitoring - wait for resources then display
perf.mark("page-end");
perf.measure("total-render", "page-start", "page-end");

// Attendre que les ressources principales soient chargées (min 3 fichiers, max 5s)
await perf.waitForResources(3, 5000);
perf.log(); // Save to localStorage

// Display fixed panel (bottom-right)
display(perfPanel(perf, { collapsed: true, position: "bottom-right" }));

// Log to console for F12 analysis
perf.print();
```
<!-- &e PERF_PANEL -->

</div>
<!-- &e LAYOUT_MAIN -->
