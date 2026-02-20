---
title: ObTer — Communes
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
const _voletCfg = OTTD_PAGES.find(p => p.id === 'exdtc');
display(createBanner({
  voletTitle: "Communes : portrait, comparaison et zoom",
  voletTooltip: "35 000 communes — 2 indicateurs simultanés, cartes nationales et zoom communal, tableau multi-colonnes filtrable. Sources : INSEE RP 2011/2016/2022, DVF 2024, Filosofi 2021.",
  color: _voletCfg?.color || "#27ae60",
  navElement: createNav(OTTD_PAGES, 'exdtc')
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
  PAGE_SIZE_DEFAULT,      // Taille page (200)
  DENS_COLORS,            // Couleurs densité scatter
  DENS_LABELS             // Labels densité scatter
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
  INDICATEURS,                // Dictionnaire indicateurs {type, unit, label, ...}
  formatValue,                // (indic, val) → "1.23 %"
  getIndicOptionsByAggDash    // (filterVolet?) → options dropdown _agg_dash=x
} from "./helpers/indicators-ddict-js.js";

// === colors.js — Palettes et bins ===
import {
  computeIndicBins,      // (data, col) → {bins, palette, isDiv, getColor}
  countBins,             // (data, col, thresholds) → counts[]
  createGradientScale,   // (data, col, options) → {getColor, min, max, divergent, palette}
  GRADIENT_PALETTES,     // {divergent, sequential} pour mode gradient
  computeEcartFrance,    // (data, col, ref, options) → {getColor, getEcartInfo, thresholds, ...}
  PAL_ECART_FRANCE,      // 9 couleurs RdBu pour mode écart
  ECART_FRANCE_SYMBOLS   // 9 symboles courts (▼▼..▲▲)
} from "./helpers/colors.js";

// === legend.js — Légendes cartes ===
import { createBinsLegend, createGradientLegend, createEcartFranceLegend, createBinsLegendBar } from "./helpers/legend.js";

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
  exportCSV,            // (data, columns, filename) → télécharge CSV
  openTableFullscreen   // (tableEl) → modal plein écran
} from "./helpers/0table.js";

// === graph-options.js — Export SVG (simplifié) ===
import { exportSVG } from "./helpers/graph-options.js";

// === scatter.js — Scatter plots EPCI ===
import { renderScatter, createScatterWithZoom, addScatterClickHandlers } from "./helpers/scatter.js";

// === size-scale.js — Échelle taille adaptative (IQR outliers) ===
import { autoSizeScale, createSizeLegendVertical } from "./helpers/size-scale.js";

// === tooltip.js — Tooltip centralisé (scatter) ===
import { buildScatterTooltip } from "./helpers/tooltip.js";

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
// 3Ksup : 3714 features (communes >= 3000 hab + 1 FOND_RURAL fusionné) — 7.7 MB vs 8.5 MB MINI
const COMMUNES_TOPO = FileAttachment("data/nodom_commune-3Ksup_2025.topojson");
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
// Chargement parallèle : données + géo + DuckDB en même temps
const [defaultData, defaultGeo, communesTopo, depGeo, duckRes] = await Promise.all([
  getData("Zone d'emploi"),
  getGeo("Zone d'emploi"),
  COMMUNES_TOPO.json(),
  getGeo("Département"),
  (async () => {
    const { db, conn } = await initDuckDB();
    await registerParquet(db, "communes", await COMMUNES_PARQUET.url());
    return { db, conn };
  })()
]);
const communesGeo = rewind(topojson.feature(communesTopo, communesTopo.objects.data), true);
// communesGeo = 3Ksup (3713 communes >= 3000 + 1 FOND_RURAL fusionné)

const { db, conn } = duckRes;

// LabelMaps pour tous les échelons (chargement parallèle)
await Promise.all(ECHELONS_SIDEBAR.map(async (ech) => {
  const data = await getData(ech);
  const meta = getEchelonMeta(ech);
  if (data.length && meta) {
    const lm = new Map();
    data.forEach(d => d.code && d.libelle && lm.set(String(d.code), d.libelle));
    setLabelMap(ech, lm);
  }
}));

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

/* Sidebar compact (aligné sur exdattract) */
.sidebar {
  overflow-x: hidden !important;
  overflow-y: auto !important;
}
.sidebar select {
  font-size: 12px !important;
  background: #fff !important;
  border: 1px solid #e2e8f0 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}
.sidebar select[multiple] {
  height: 280px !important;
}
.sidebar form {
  width: 100% !important;
  max-width: 260px !important;
  box-sizing: border-box !important;
  margin: 0 0 3px 0 !important;
  padding: 0 !important;
  align-items: center !important;
  gap: 0 6px !important;
}
.sidebar form > label:first-child {
  max-width: 250px !important;
  margin: 0 !important;
  padding: 0 !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
}
.sidebar form > div,
.sidebar form > select,
.sidebar form > input {
  margin-top: 0 !important;
}
.sidebar form > div[style*="flex"] label {
  overflow: visible !important;
  white-space: nowrap !important;
  font-size: 11px !important;
  margin: 0 !important;
  padding: 0 !important;
}
.sidebar .panel { margin-bottom: 6px !important; }
.sidebar .panel-title { margin-bottom: 2px !important; }
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
<span class="version">ObTer v2.0</span>
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
  [...ECHELONS_SIDEBAR, "Commune"],
  { value: "EPCI", label: "" }
));
```

</section>

<section class="panel">
<div class="panel-title">SÉLECTION</div>
<div id="search-container" style="margin-top:6px;min-height:100px;"></div>
</section>

<section class="panel">
<div class="panel-title">OPTIONS CARTES</div>

```js
const _colorModeInput = Inputs.radio(["%", "±Fr.", "Grad."], { value: "%", label: "Palette" });
{ const d = _colorModeInput.querySelector(":scope > div"); if (d) { d.style.cssText = "display:flex;gap:6px;"; d.querySelectorAll("label").forEach(l => l.style.display = "inline"); } }
const _cmLbl = Array.from(_colorModeInput.querySelectorAll("label")).find(l => !l.querySelector("input"));
if (_cmLbl) { const t = document.createElement("span"); t.className = "panel-tooltip-wrap"; t.innerHTML = `<span class="panel-tooltip-icon">?</span><span class="panel-tooltip-text">% = quantiles (classes effectifs égaux)<br>±Fr. = écart à la valeur France (σ winsorisé)<br>Grad. = dégradé continu</span>`; _cmLbl.appendChild(t); }
const colorMode = view(_colorModeInput);
const showValuesOnMap = view(Inputs.toggle({ label: "Show labels", value: true }));
const labelBy = view(Inputs.select(new Map([
  ["Principaux terr.", "population"],
  ["Top 20 + Bot 20", "top5_bot5"],
  ["Top 20 indic", "indicator_top"],
  ["Bottom 20 indic", "indicator_bottom"]
]), { value: "population", label: "Labels" }));
const _lmInput = Inputs.radio(["both", "val.", "noms"], { value: "both", label: "Contenu" });
{ const d = _lmInput.querySelector(":scope > div"); if (d) { d.style.cssText = "display:flex;gap:4px;"; d.querySelectorAll("label").forEach(l => { l.style.display = "inline"; l.style.fontSize = "11px"; }); } }
const labelMode = view(_lmInput);
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
<div class="panel-title">INDICATEURS TABLEAU <span class="table-help-wrap"><span class="table-help-icon">?</span><span class="help-tooltip">ctrl/shift click pour multi-sélection</span></span></div>

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

```js
// &s SIDEBAR_TOGGLE
{
  const toggle = document.createElement("div");
  toggle.className = "sidebar-toggle";
  toggle.title = "Options et choix indicateurs & échelons";
  toggle.innerHTML = `<span class="toggle-chevron">«</span><span class="toggle-label">Options indicateurs</span>`;
  document.body.appendChild(toggle);
  document.body.classList.add("sidebar-collapsed");
  toggle.querySelector(".toggle-chevron").textContent = "»";
  toggle.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    toggle.querySelector(".toggle-chevron").textContent = collapsed ? "»" : "«";
  });
}
// &e SIDEBAR_TOGGLE
```

<!-- &s LAYOUT_MAIN -->
<div class="layout-main">

```js
// === DONNÉES ===
const isCommune = echelon === "Commune";
const meta = isCommune ? { geoKey: "CODGEO", labelKey: "libelle", filterKey: "DEP" } : getEchelonMeta(echelon);
const colKey1 = buildColKey(indic1, periode1);
const colKey2 = buildColKey(indic2, periode2);
const label1 = getIndicLabel(indic1, "long");
const label2 = getIndicLabel(indic2, "long");

// Commune : DuckDB + 3Ksup geo | Autres : JSON + topojson échelon
const { currentGeo, rawData, frData, dataNoFrance } = await (async () => {
  if (isCommune) {
    const commData = await queryCommunes({ conn }, {
      tableName: "communes",
      columns: ["code", "libelle", "regdep", "P23_POP", colKey1, colKey2],
      minPop: 3000, limit: 5000
    });
    const frRow = await queryFrance({ conn }, "communes", [colKey1, colKey2]);
    const geo = {
      type: "FeatureCollection",
      features: communesGeo.features.map(f => {
        if (f.properties._merged) return { ...f }; // FOND_RURAL : pas de données
        const row = commData.find(d => d.code === f.properties.CODGEO);
        return {
          ...f,
          properties: {
            ...f.properties,
            libelle: row?.libelle,
            P23_POP: row?.P23_POP,
            [colKey1]: row?.[colKey1],
            [colKey2]: row?.[colKey2]
          }
        };
      })
    };
    return { currentGeo: geo, rawData: frRow ? [frRow, ...commData] : commData, frData: frRow || null, dataNoFrance: commData };
  } else {
    const geo = await getGeo(echelon);
    const raw = await getData(echelon);
    const fr = getFranceData(raw);
    const noFr = getDataNoFrance(raw);
    for (const f of geo.features) {
      const row = noFr.find(d => d.code === f.properties[meta.geoKey]);
      if (row) {
        f.properties[colKey1] = row[colKey1];
        f.properties[colKey2] = row[colKey2];
        f.properties.P23_POP = row.P23_POP;
      }
    }
    return { currentGeo: geo, rawData: raw, frData: fr, dataNoFrance: noFr };
  }
})();

// LabelMap pour Commune (nécessaire pour getLabel fallback et search)
if (isCommune) {
  const commLabelMap = new Map();
  dataNoFrance.forEach(d => d.code && d.libelle && commLabelMap.set(d.code, d.libelle));
  setLabelMap("Commune", commLabelMap);
}

// &jcn-colors computeIndicBins : auto-détection divergente + bins centrées 0
const indic1Bins = computeIndicBins(dataNoFrance, colKey1, indic1);
const indic2Bins = computeIndicBins(dataNoFrance, colKey2, indic2);
const { bins: bins1, palette: PAL1, isDiv: isDiv1, getColor: getColorBins1 } = indic1Bins;
const { bins: bins2, palette: PAL2, isDiv: isDiv2, getColor: getColorBins2 } = indic2Bins;

// Mode gradient : échelles continues
const gradient1 = createGradientScale(dataNoFrance, colKey1);
const gradient2 = createGradientScale(dataNoFrance, colKey2);
const isGradient = colorMode === "Grad.";
const isEcart = colorMode === "±Fr.";

// Mode écart France : bins basées sur σ winsorisé autour de la valeur 00FR
const ecart1 = computeEcartFrance(dataNoFrance, colKey1, frData?.[colKey1], { indicType: INDICATEURS[indic1]?.type });
const ecart2 = computeEcartFrance(dataNoFrance, colKey2, frData?.[colKey2], { indicType: INDICATEURS[indic2]?.type });

// getColor dynamique selon mode (3-way)
const getColor1 = isEcart ? ecart1.getColor : isGradient ? gradient1.getColor : getColorBins1;
const getColor2 = isEcart ? ecart2.getColor : isGradient ? gradient2.getColor : getColorBins2;
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
const _defaultZoom = isCommune ? "75056" : getDefaultZoomCode(echelon);
const zoomCode = (_zoomVal && labelMap?.has(_zoomVal)) ? _zoomVal : _defaultZoom;
const zoomLabel = isCommune
  ? (labelMap?.get(zoomCode) || zoomCode) + " (DEP)"
  : (labelMap?.get(zoomCode) || zoomCode);
```

<!-- Titres + contenus dans même flex pour alignement naturel -->
<div style="display:flex;gap:12px;align-items:stretch;">

<!-- COLONNE GAUCHE : titre + 4 cartes (France + Zoom) -->
<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:4px;padding-left:6px;">
<h3 style="margin:0 0 0 0;">Vue France par ${echelon} // Focus communes : ${zoomLabel}</h3>

```js
// Zoom state persistant entre re-renders (survit aux changements labelBy/labelMode)
if (!window._zoomStates) window._zoomStates = {};
```

<!-- Cartes France -->
<div class="cards-row">

<div class="card">

```js
// Carte 1 : renderChoropleth + mini options
// Commune : fond gris pour FOND_RURAL, labels via labelMap
const _getColor1 = isCommune
  ? (v, f) => f?.properties?._merged ? "#e5e7eb" : getColor1(v)
  : (v, f) => getColor1(v);
const map1 = renderChoropleth({
  geoData: currentGeo, valueCol: colKey1,
  getColor: _getColor1,
  getCode: f => f.properties[meta.geoKey],
  getLabel: ({ code }) => getLabelMap(echelon)?.get(code) || code,
  formatValue: (k, v) => formatValue(indic1, v),
  indicLabel: label1, selectedCodes: [...mapSelectionState],
  showLabels: showValuesOnMap, labelMode, labelBy, topN: isCommune ? 300 : 0,
  title: label1,
  echelon, width: 385, height: 355, maxLabelsAuto: isCommune ? 100 : 600,
  overlayGeo: showOverlay && echelon !== "Département" ? depGeo : null
});
const counts1 = countBins(dataNoFrance, colKey1, bins1.thresholds || []);
const ecartCounts1 = isEcart ? countBins(dataNoFrance, colKey1, ecart1.thresholds || []) : [];
const unit1 = getIndicUnit(colKey1);
const _filterMap = (mapEl, geoRef, ck, getBi, getCol) => (activeIndices) => {
  const zc = mapEl.querySelector("g.zoom-content") || mapEl.querySelector("svg");
  const groups = Array.from(zc.children).filter(c => c.tagName === 'g');
  const fp = groups.length >= 2 ? Array.from(groups[1].children).filter(c => c.tagName === 'path') : null;
  if (!fp || fp.length < geoRef.features.length * 0.9) return;
  fp.forEach((p, i) => {
    if (i >= geoRef.features.length) return;
    const v = geoRef.features[i].properties[ck];
    const bi = getBi(v);
    if (bi >= 0 && !activeIndices.has(bi)) {
      p.setAttribute("fill", "#f3f4f6"); p.setAttribute("fill-opacity", "0.15");
    } else {
      p.setAttribute("fill", getCol(v)); p.setAttribute("fill-opacity", "1");
    }
  });
};
const legend1 = isEcart
  ? createEcartFranceLegend({
      palette: ecart1.palette, symbols: ECART_FRANCE_SYMBOLS,
      pctLabels: ecart1.pctLabels,
      counts: ecartCounts1, title: `±Fr. (en ${ecart1.isAbsoluteEcart ? "pts" : "%"})`,
      interactive: true, onFilter: _filterMap(map1, currentGeo, colKey1, ecart1.getBinIdx, getColor1)
    })
  : isGradient
  ? createGradientLegend({
      colors: gradient1.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradient1.min, max: gradient1.max, showZero: gradient1.divergent,
      decimals: 2, title: unit1 || "",
      capped: true, rawMin: gradient1.rawMin, rawMax: gradient1.rawMax
    })
  : createBinsLegend({
      colors: PAL1, labels: bins1.labels || [], counts: counts1,
      vertical: true, unit: unit1, reverse: !isDiv1,
      interactive: true, onFilter: _filterMap(map1, currentGeo, colKey1, indic1Bins.getBinIdx, getColor1)
    });
// Tooltip : toujours passer la ref France + getEcartInfo pour symbole au survol
if (map1._tipConfig) {
  map1._tipConfig.frRef = frData?.[colKey1];
  map1._tipConfig.frGetEcartInfo = ecart1.getEcartInfo;
}
// Click handler : click normal = zoom only, Ctrl+click = add to selection
map1.style.cursor = "pointer";
map1.addEventListener("click", (e) => {
  const path = e.target.closest("path");
  if (!path) return;
  const paths = Array.from(path.parentElement.querySelectorAll("path"));
  const idx = paths.indexOf(path);
  if (idx >= 0 && idx < currentGeo.features.length) {
    const feat = currentGeo.features[idx];
    if (feat.properties._merged) return; // Ignorer FOND_RURAL
    const code = feat.properties[meta.geoKey];
    if (e.ctrlKey || e.metaKey) {
      addToSelection(code);
    } else {
      setZoomOnly(code);
    }
  }
});
const wrapper1 = createMapWrapper(map1, null, legend1, addZoomBehavior(map1, {
  initialTransform: window._zoomStates.map1,
  onZoom: t => { window._zoomStates.map1 = t; }
}), {
  exportSVGFn: exportSVG, echelon, colKey: colKey1, title: label1
});
// Valeur France 00FR
const frVal1 = frData?.[colKey1];
if (frVal1 != null) {
  const frLbl1 = document.createElement("div");
  frLbl1.style.cssText = "font-size:11px;color:#555;padding:1px 0 0 4px;";
  frLbl1.innerHTML = `🇫🇷 France : <b style="font-style:italic;">${formatValue(indic1, frVal1)}</b>`;
  wrapper1.appendChild(frLbl1);
}
// Légende horizontale barre cliquable (mode bins uniquement)
if (!isEcart && !isGradient && bins1.thresholds?.length > 0) {
  const bar1 = createBinsLegendBar({
    colors: PAL1, labels: bins1.labels || [], counts: counts1,
    thresholds: bins1.thresholds, unit: unit1 || "",
    franceValue: frVal1, franceLabel: "Fr.",
    interactive: true,
    onFilter: _filterMap(map1, currentGeo, colKey1, indic1Bins.getBinIdx, getColor1)
  });
  bar1.style.marginTop = "4px";
  bar1.style.marginLeft = "4px";
  wrapper1.appendChild(bar1);
}
display(wrapper1);
```

</div>

<div class="card">

```js
// Carte 2 : même pattern + fond gris FOND_RURAL si commune
const _getColor2 = isCommune
  ? (v, f) => f?.properties?._merged ? "#e5e7eb" : getColor2(v)
  : (v, f) => getColor2(v);
const map2 = renderChoropleth({
  geoData: currentGeo, valueCol: colKey2,
  getColor: _getColor2,
  getCode: f => f.properties[meta.geoKey],
  getLabel: ({ code }) => getLabelMap(echelon)?.get(code) || code,
  formatValue: (k, v) => formatValue(indic2, v),
  indicLabel: label2, selectedCodes: [...mapSelectionState],
  showLabels: showValuesOnMap, labelMode, labelBy, topN: isCommune ? 300 : 0,
  title: label2,
  echelon, width: 385, height: 355, maxLabelsAuto: isCommune ? 100 : 600,
  overlayGeo: showOverlay && echelon !== "Département" ? depGeo : null
});
const counts2 = countBins(dataNoFrance, colKey2, bins2.thresholds || []);
const ecartCounts2 = isEcart ? countBins(dataNoFrance, colKey2, ecart2.thresholds || []) : [];
const unit2 = getIndicUnit(colKey2);
const legend2 = isEcart
  ? createEcartFranceLegend({
      palette: ecart2.palette, symbols: ECART_FRANCE_SYMBOLS,
      pctLabels: ecart2.pctLabels,
      counts: ecartCounts2, title: `±Fr. (en ${ecart2.isAbsoluteEcart ? "pts" : "%"})`,
      interactive: true, onFilter: _filterMap(map2, currentGeo, colKey2, ecart2.getBinIdx, getColor2)
    })
  : isGradient
  ? createGradientLegend({
      colors: gradient2.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradient2.min, max: gradient2.max, showZero: gradient2.divergent,
      decimals: 2, title: unit2 || "",
      capped: true, rawMin: gradient2.rawMin, rawMax: gradient2.rawMax
    })
  : createBinsLegend({
      colors: PAL2, labels: bins2.labels || [], counts: counts2,
      vertical: true, unit: unit2, reverse: !isDiv2,
      interactive: true, onFilter: _filterMap(map2, currentGeo, colKey2, indic2Bins.getBinIdx, getColor2)
    });
// Tooltip : toujours passer la ref France + getEcartInfo pour symbole au survol
if (map2._tipConfig) {
  map2._tipConfig.frRef = frData?.[colKey2];
  map2._tipConfig.frGetEcartInfo = ecart2.getEcartInfo;
}
// Click handler : click normal = zoom only, Ctrl+click = add to selection
map2.style.cursor = "pointer";
map2.addEventListener("click", (e) => {
  const path = e.target.closest("path");
  if (!path) return;
  const paths = Array.from(path.parentElement.querySelectorAll("path"));
  const idx = paths.indexOf(path);
  if (idx >= 0 && idx < currentGeo.features.length) {
    const feat = currentGeo.features[idx];
    if (feat.properties._merged) return; // Ignorer FOND_RURAL
    const code = feat.properties[meta.geoKey];
    if (e.ctrlKey || e.metaKey) {
      addToSelection(code);
    } else {
      setZoomOnly(code);
    }
  }
});
const wrapper2 = createMapWrapper(map2, null, legend2, addZoomBehavior(map2, {
  initialTransform: window._zoomStates.map2,
  onZoom: t => { window._zoomStates.map2 = t; }
}), {
  exportSVGFn: exportSVG, echelon, colKey: colKey2, title: label2
});
// Valeur France 00FR
const frVal2 = frData?.[colKey2];
if (frVal2 != null) {
  const frLbl2 = document.createElement("div");
  frLbl2.style.cssText = "font-size:11px;color:#555;padding:1px 0 0 4px;";
  frLbl2.innerHTML = `🇫🇷 France : <b style="font-style:italic;">${formatValue(indic2, frVal2)}</b>`;
  wrapper2.appendChild(frLbl2);
}
// Légende horizontale barre cliquable (mode bins uniquement)
if (!isEcart && !isGradient && bins2.thresholds?.length > 0) {
  const bar2 = createBinsLegendBar({
    colors: PAL2, labels: bins2.labels || [], counts: counts2,
    thresholds: bins2.thresholds, unit: unit2 || "",
    franceValue: frVal2, franceLabel: "Fr.",
    interactive: true,
    onFilter: _filterMap(map2, currentGeo, colKey2, indic2Bins.getBinIdx, getColor2)
  });
  bar2.style.marginTop = "4px";
  bar2.style.marginLeft = "4px";
  wrapper2.appendChild(bar2);
}
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

// Commune : extraire DEP de la commune cliquée pour zoomer sur tout le département
const zoomDep = isCommune
  ? (communesGeo.features.find(f => f.properties.CODGEO === zoomCode)?.properties?.DEP
     || (zoomCode.startsWith("97") ? zoomCode.substring(0, 3) : zoomCode.substring(0, 2)))
  : null;

// EPCI spécial : OR logic pour MGP (EPCI_EPT=code pour Paris arrond., EPCI=code pour 150 communes MGP)
const zoomFilter = isEPCI ? null : isCommune ? { DEP: [zoomDep] } : { [filterKey]: [zoomCode] };
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
  if (f.properties._merged) return false; // Exclure FOND_RURAL des zooms
  if (isEPCI) return zoomDataMap.has(f.properties.CODGEO);
  if (isCommune) return String(f.properties.DEP) === String(zoomDep);
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

// Écart zoom : ref + sigma nationaux (pas locaux) pour comparabilité
const ecartC1 = isEcart ? computeEcartFrance(zoomData, colKey1, ecart1.ref, { sigma: ecart1.sigma, indicType: INDICATEURS[indic1]?.type }) : null;
const ecartC2 = isEcart ? computeEcartFrance(zoomData, colKey2, ecart2.ref, { sigma: ecart2.sigma, indicType: INDICATEURS[indic2]?.type }) : null;

const getColorC1 = isEcart ? ecartC1.getColor : isGradient ? gradientC1.getColor : zoomBins1.getColor;
const getColorC2 = isEcart ? ecartC2.getColor : isGradient ? gradientC2.getColor : zoomBins2.getColor;
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
const ecartCountsC1 = isEcart ? countBins(zoomData, colKey1, ecartC1.thresholds || []) : [];
const legendC1 = isEcart
  ? createEcartFranceLegend({
      palette: ecartC1.palette, symbols: ECART_FRANCE_SYMBOLS,
      pctLabels: ecartC1.pctLabels,
      counts: ecartCountsC1, title: `±Fr. (en ${ecart1.isAbsoluteEcart ? "pts" : "%"})`,
      interactive: true, onFilter: _filterMap(mapC1, zoomGeo, colKey1, ecartC1.getBinIdx, getColorC1)
    })
  : isGradient
  ? createGradientLegend({
      colors: gradientC1.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradientC1.min, max: gradientC1.max, showZero: gradientC1.divergent,
      decimals: 2, title: unit1 || "",
      capped: true, rawMin: gradientC1.rawMin, rawMax: gradientC1.rawMax
    })
  : createBinsLegend({
      colors: zoomBins1.palette, labels: binsC1.labels || [], counts: countsC1,
      vertical: true, unit: unit1, reverse: !zoomBins1.isDiv,
      interactive: true, onFilter: _filterMap(mapC1, zoomGeo, colKey1, zoomBins1.getBinIdx, getColorC1)
    });
// Tooltip : ref France + getEcartInfo pour symbole au survol (zoom communes)
if (mapC1?._tipConfig) {
  mapC1._tipConfig.frRef = frData?.[colKey1];
  mapC1._tipConfig.frGetEcartInfo = ecart1.getEcartInfo;
}
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
const ecartCountsC2 = isEcart ? countBins(zoomData, colKey2, ecartC2.thresholds || []) : [];
const legendC2 = isEcart
  ? createEcartFranceLegend({
      palette: ecartC2.palette, symbols: ECART_FRANCE_SYMBOLS,
      pctLabels: ecartC2.pctLabels,
      counts: ecartCountsC2, title: `±Fr. (en ${ecart2.isAbsoluteEcart ? "pts" : "%"})`,
      interactive: true, onFilter: _filterMap(mapC2, zoomGeo, colKey2, ecartC2.getBinIdx, getColorC2)
    })
  : isGradient
  ? createGradientLegend({
      colors: gradientC2.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradientC2.min, max: gradientC2.max, showZero: gradientC2.divergent,
      decimals: 2, title: unit2 || "",
      capped: true, rawMin: gradientC2.rawMin, rawMax: gradientC2.rawMax
    })
  : createBinsLegend({
      colors: zoomBins2.palette, labels: binsC2.labels || [], counts: countsC2,
      vertical: true, unit: unit2, reverse: !zoomBins2.isDiv,
      interactive: true, onFilter: _filterMap(mapC2, zoomGeo, colKey2, zoomBins2.getBinIdx, getColorC2)
    });
// Tooltip : ref France + getEcartInfo pour symbole au survol (zoom communes)
if (mapC2?._tipConfig) {
  mapC2._tipConfig.frRef = frData?.[colKey2];
  mapC2._tipConfig.frGetEcartInfo = ecart2.getEcartInfo;
}
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

<!-- &s SCATTER_DYN — Scatter dynamique indic1 × indic2 (suit sidebar) -->

```js
// === SCATTER DYNAMIQUE — Croisement indic1 × indic2 ===
{
  const xCol = colKey1;
  const yCol = colKey2;
  // Labels axes = nom indicateur sans période (période dans l'unité)
  const xLbl = getIndicLabel(indic1, "medium");
  const yLbl = getIndicLabel(indic2, "medium");
  const mX = frData?.[xCol];
  const mY = frData?.[yCol];

  // Mapping densité (INSEE: 1=Urbain dense, 2=Intermédiaire, 3=Rural)
  const dens3Map = { "Rural": "3", "Intermédiaire": "2", "Urbain": "1" };
  const densiteLabel = densiteFilter !== "Tous" ? ` — ${densiteFilter}` : "";

  // Filtrer données selon échelon + densité
  let filtered = dataNoFrance.filter(d => d.P23_POP != null && d[xCol] != null && d[yCol] != null);
  if (echelon === "EPCI") {
    filtered = filtered.filter(d => {
      const t = d.type_epci || "";
      return t === "CA" || t === "CU" || t === "MET" || t === "EPT";
    });
  }
  if (densiteFilter !== "Tous" && filtered.some(d => d.dens3 != null)) {
    filtered = filtered.filter(d => d.dens3 === dens3Map[densiteFilter]);
  }
  filtered = filtered.sort((a, b) => b.P23_POP - a.P23_POP);

  if (filtered.length > 5) {
    // Domaines P01-P99 avec padding
    const xV = filtered.map(d => d[xCol]).sort((a, b) => a - b);
    const yV = filtered.map(d => d[yCol]).sort((a, b) => a - b);
    const xP01 = xV[Math.floor(xV.length * 0.01)];
    const xP99 = xV[Math.min(Math.floor(xV.length * 0.99), xV.length - 1)];
    const yP01 = yV[Math.floor(yV.length * 0.01)];
    const yP99 = yV[Math.min(Math.floor(yV.length * 0.99), yV.length - 1)];
    const xPad = (xP99 - xP01) * 0.08;
    const yPad = (yP99 - yP01) * 0.08;

    // Inclure 0 si proche du range (TCAM autour de 0)
    let xMin = xP01 - xPad, xMax = xP99 + xPad;
    let yMin = yP01 - yPad, yMax = yP99 + yPad;
    if (xMin > 0 && xMin < (xMax - xMin) * 0.5) xMin = Math.min(0, xMin);
    if (xMax < 0 && Math.abs(xMax) < (xMax - xMin) * 0.5) xMax = Math.max(0, xMax);
    if (yMin > 0 && yMin < (yMax - yMin) * 0.5) yMin = Math.min(0, yMin);
    if (yMax < 0 && Math.abs(yMax) < (yMax - yMin) * 0.5) yMax = Math.max(0, yMax);

    // Échelle taille adaptative IQR
    const sz = autoSizeScale(filtered.map(d => d.P23_POP), { label: "Population", rRange: [3, 14] });

    // Couleur par densité (dens3: 1=Dense, 2=Intermédiaire, 3=Rural) — DENS_COLORS importé de constants.js
    const densColor = (d) => DENS_COLORS[d.dens3] || "#999";

    // Annotations quadrants (basées sur moyennes France)
    const annotations = [];
    if (mX != null && mY != null) {
      const midXR = (mX + xMax) / 2, midXL = (xMin + mX) / 2;
      const midYT = (mY + yMax) / 2, midYB = (yMin + mY) / 2;
      const isXEvol = indic1.includes("vtcam") || indic1.includes("vevol") || indic1.includes("vdifp");
      const isYEvol = indic2.includes("vtcam") || indic2.includes("vevol") || indic2.includes("vdifp");
      const qL = isXEvol && isYEvol
        ? { tr: "Hausse continue", tl: "Rebond", br: "Déclin récent", bl: "Déclin continu" }
        : { tr: "↑↑ Les 2", tl: `↑ ${yLbl.substring(0, 15)}`, br: `↑ ${xLbl.substring(0, 15)}`, bl: "↓↓ Les 2" };
      annotations.push(
        { x: midXR, y: midYT, text: qL.tr, color: "rgba(80,80,80,0.35)", fontSize: 11, fontWeight: 600 },
        { x: midXL, y: midYT, text: qL.tl, color: "rgba(80,80,80,0.35)", fontSize: 11, fontWeight: 600 },
        { x: midXR, y: midYB, text: qL.br, color: "rgba(80,80,80,0.35)", fontSize: 11, fontWeight: 600 },
        { x: midXL, y: midYB, text: qL.bl, color: "rgba(80,80,80,0.35)", fontSize: 11, fontWeight: 600 }
      );
    }

    // Labels scatter : sélection + top pop
    const sCodes = [...mapSelectionState];
    const topPop = filtered.slice(0, 8).map(d => d.code);
    const lCodes = [...new Set([...sCodes, ...topPop])];

    const sc = createScatterWithZoom({
      data: filtered, xCol, yCol,
      xDomain: [xMin, xMax],
      yDomain: [yMin, yMax],
      xLabel: xLbl, yLabel: yLbl,
      xUnit: `${getIndicUnit(colKey1)}, ${getPeriodeLabel(periode1, "short")}`,
      yUnit: `${getIndicUnit(colKey2)}, ${getPeriodeLabel(periode2, "short")}`,
      meanX: mX, meanY: mY,
      getRadius: d => sz.getRadius(d.P23_POP),
      getColor: densColor,
      isSelected: d => sCodes.includes(d.code),
      getTooltip: d => buildScatterTooltip(d, xCol, yCol, filtered, mX, mY),
      _customTooltip: true,
      width: 820, height: 400,
      labelCodes: lCodes, labelMode,
      annotations,
      title: `${getIndicLabel(indic1, "medium")} — ${getIndicLabel(indic2, "medium")} (${echelon})`,
      subtitle: `${filtered.length} territoires${densiteLabel}`,
      legend: [
        { label: `${DENS_LABELS["1"]} (${filtered.filter(d => d.dens3 === "1").length})`, color: DENS_COLORS["1"] },
        { label: `${DENS_LABELS["2"]} (${filtered.filter(d => d.dens3 === "2").length})`, color: DENS_COLORS["2"] },
        { label: `${DENS_LABELS["3"]} (${filtered.filter(d => d.dens3 === "3").length})`, color: DENS_COLORS["3"] }
      ],
      sizeLabel: createSizeLegendVertical(sz.bins, "Population"),
      fillOpacity: 0.65
    });
    display(sc);
  } else {
    display(html`<div style="padding:20px;text-align:center;color:#6b7280;font-size:11px;">Données insuffisantes pour le scatter (${filtered.length} obs.)</div>`);
  }
}
```

<!-- &e SCATTER_DYN -->

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
const echSearchInput = view(Inputs.text({ placeholder: "1ers caract. territoire ou n° dép...", width: 200 }));
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

// Header : count + export + fullscreen (searchbar déjà affichée par viewof)
display(html`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
  <span style="font-size:10px;color:#6b7280;">${echFiltered2.length} terr.</span>
  <div style="display:flex;gap:4px;">
    <button style="font-size:10px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;"
      onclick=${() => exportCSV(echSorted2, echColumns2, echelon.replace(/[^a-zA-Z]/g, "") + "_" + new Date().toISOString().slice(0,10) + ".csv")}>
      📥
    </button>
    <button style="font-size:12px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;" title="Plein écran"
      onclick=${() => { const t = document.querySelector(".ech-table-fs-target"); if (t) openTableFullscreen(t); }}>
      ⤢
    </button>
  </div>
</div>`);

// Tableau compact avec scroll vertical pour couvrir hauteur 4 cartes + scatter
// Wrapper flex-grow pour que le tableau remplisse tout l'espace disponible
const tableWrapper = document.createElement("div");
tableWrapper.className = "ech-table-fs-target";
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
void 0;
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
  placeholder: "1ers caract. territoire ou n° dép...",
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
// Commune : filtrer par code direct (CODGEO), autres échelons : par filterKey (DEP, ZE2020, etc.)
const tableFilterKey = isCommune ? "code" : filterKey;
const tableFilter = hasSelection ? { [tableFilterKey]: filterCodes } : null;

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
// Bouton export CSV + fullscreen (l'input search est déjà affiché par le view() ci-dessus)
display(html`<div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:8px;">
  <button style="font-size:11px;padding:4px 10px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;"
    onclick=${() => exportCSV(sorted, columns, "communes_" + echelon + "_" + new Date().toISOString().slice(0,10) + ".csv")}>
    📥
  </button>
  <button style="font-size:14px;padding:4px 10px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;" title="Plein écran"
    onclick=${() => { const t = document.querySelector(".comm-table-fs-target"); if (t) openTableFullscreen(t); }}>
    ⤢
  </button>
</div>`);
```

```js
// Pagination (PAGE_SIZE_DEFAULT lignes par page)
display(renderPagination(sorted.length, currentPage, setPage, PAGE_SIZE_DEFAULT,
  ` | ${filterCodes.length > 0 ? filterCodes.length + " terr. sélect." : "pop > 10k"}${searchLower ? ` | "${searchLower}"` : ""}`));
```

```js
const _commTblWrap = document.createElement("div");
_commTblWrap.className = "comm-table-fs-target";
_commTblWrap.appendChild(renderTable({
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
display(_commTblWrap);
void 0;
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
