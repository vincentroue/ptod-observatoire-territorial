---
title: ObTer — Économie
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     Volet Économie ZE — Refactoré architecture exdlog
     Date: 2026-02-10 | v0.5: Flex left/right (cartes|table), sans KPI banner
     Layout: Sidebar duplex | Flex[cartes+butterfly | table ZE] | Analytique
     ============================================================ -->

<!-- &s TODO_VOLET_ECO
     Indicateurs spécialisation économique à implémenter
     Référence : @rgd-guide/npeco-gdmeth-krugman-iss-gini_260120.md

     INDICATEURS PRÉVUS :
     - [x] eco_krugman_a5    : Indice Krugman A5 (existant)
     - [ ] eco_krugman_a38   : Indice Krugman A38 (à calculer depuis FLORES)
     - [ ] eco_gini_a38      : Gini spécialisation sectorielle A38
     - [ ] eco_empGE250_pct  : Part emploi établissements 250+ salariés
     - [ ] eco_empGE250_ind  : Indice spécificité GE (zone/France)
     - [ ] eco_etab_vol      : Nombre établissements

     GRAPHIQUES À MODIFIER :
     - [ ] Remplacer butterfly FLORES A21 par A5 (cohérence avec URSSAF)
     - [ ] Aligner périodes : filtre commun 22-23 / 19-24 / 16-23
     - [ ] Ajouter établissements aux données

     SOURCES DONNÉES :
     - FLORES 2022-2023 : Emploi total + établissements + tranches taille
     - URSSAF 2019-2024 : Emploi privé secteurs A38
     - EAE205 1998-2023 : Série longue emploi A5

     SCRIPT À CRÉER :
     - sp02-calc-flores-taille.R : Calcul Krugman A38, Gini, Part GE
     ============================================================ -->
<!-- &e TODO_VOLET_ECO -->

<!-- &s BANNER -->
```js
import { createBanner, createNav, OTTD_PAGES } from "./helpers/layout.js";
const _voletCfg = OTTD_PAGES.find(p => p.id === 'exdeco');
display(createBanner({
  voletTitle: "Économie : emploi, secteurs et spécialisation",
  voletTooltip: "Quels moteurs économiques portent les territoires ? Quelles trajectoires depuis 2011 ? Emploi total (FLORES), emploi privé sectoriel (URSSAF A5/A21), spécialisation Krugman. Sources : URSSAF 2014-2024, FLORES 2022, INSEE RP 2011/16/22.",
  color: _voletCfg?.color || "#e67e22",
  navElement: createNav(OTTD_PAGES, 'exdeco')
}));
```
<!-- &e BANNER -->

<!-- &s IMPORTS -->
```js
import * as topojson from "npm:topojson-client";
import rewind from "npm:@mapbox/geojson-rewind";
import * as Plot from "npm:@observablehq/plot";

import { getEchelonMeta, getLabelMap, setLabelMap, getFranceData, getDataNoFrance } from "./helpers/0loader.js";
import { DEFAULT_ECO_TABLE_INDICS, getDefaultZoomCode, DENS_COLORS, DENS_LABELS } from "./helpers/constants.js";
import { getIndicOptionsByVolet, getPeriodesForIndicateur, getDefaultPeriode, buildColKey, getIndicLabel, getPeriodeLabel } from "./helpers/selectindic.js";
import { formatValue, INDICATEURS } from "./helpers/indicators-ddict-js.js";
import { computeIndicBins, countBins, createGradientScale, GRADIENT_PALETTES, computeEcartFrance, PAL_ECART_FRANCE, ECART_FRANCE_SYMBOLS } from "./helpers/colors.js";
import { createBinsLegend, createGradientLegend, createEcartFranceLegend } from "./helpers/legend.js";
import { renderChoropleth, createMapWrapper, addZoomBehavior } from "./helpers/maps.js";
import { createSearchBox } from "./helpers/search.js";
import { sortTableData, computeBarStats, getIndicUnit, renderTable, renderPagination, exportCSV, createTableToolbar, openTableFullscreen } from "./helpers/0table.js";
import { exportSVG } from "./helpers/graph-options.js";
import { renderButterflyMulti } from "./helpers/graph-butterfly.js";
import { renderSlopeChart, renderIndice100Chart, renderIndice100Multi, LABELS_A5 } from "./helpers/graph-slope-indice.js";
import { renderTreemapA5A21, renderTreemapSimple } from "./helpers/graph-treemap.js";
import { renderButterflyVertical } from "./helpers/graph-butterfly-vertical.js";
import { createScatterWithZoom } from "./helpers/scatter.js";
import { buildScatterTooltip } from "./helpers/tooltip.js";
import { autoSizeScale, createSizeLegendVertical } from "./helpers/size-scale.js";
import { createSelectionManager, createMapClickHandler } from "./helpers/selection.js";

// === duckdb.js — Queries Parquet communes ===
import {
  initDuckDB, initDuckDBBackground, waitForDuckDB,
  registerParquet, queryCommunes
} from "./helpers/duckdb.js";

// Démarrer DuckDB init en arrière-plan
initDuckDBBackground();
```
<!-- &e IMPORTS -->

<!-- &s FILE_HANDLES -->
```js
const ZE_DATA = FileAttachment("data/agg_ze.json");
const ZE_TOPO = FileAttachment("data/nodom_zones-emploi_2025.topojson");
const URSSAF_SERIE = FileAttachment("data/urssaf_serie_indice100.json");
// Pivots sectoriels Parquet
const FLORES_PIVOT_A21 = FileAttachment("data/exdeco_pivot_flores_a21.parquet");
const FLORES_PIVOT_A5 = FileAttachment("data/exdeco_pivot_flores_a5.parquet");
const FLORES_PIVOT_A38 = FileAttachment("data/exdeco_pivot_flores_a38.parquet");
const FLORES_FRANCE = FileAttachment("data/exdeco_pivot_flores_france.parquet");
const URSSAF_PIVOT_A21 = FileAttachment("data/exdeco_pivot_urssaf_a21.parquet");
const URSSAF_PIVOT_A5 = FileAttachment("data/exdeco_pivot_urssaf_a5.parquet");
const URSSAF_PIVOT_A38 = FileAttachment("data/exdeco_pivot_urssaf_a38.parquet");
const URSSAF_FRANCE = FileAttachment("data/exdeco_pivot_urssaf_france.parquet");
// INSEE EAE205 Estimations emploi (série longue 1998-2023)
const EAE205_FRANCE_SERIE = FileAttachment("data/EAE205_france_serie.json");
const EAE205_FRANCE_SLOPE = FileAttachment("data/EAE205_france_slope.json");
const EAE205_ZE_SERIE = FileAttachment("data/EAE205_ze_serie.json");
// Communes (géo + parquet pour DuckDB)
const COMMUNES_TOPO = FileAttachment("data/nodom_commune-ARM_MINI_2025.topojson");
const COMMUNES_PARQUET = FileAttachment("data/agg_commARM.parquet");
```
<!-- &e FILE_HANDLES -->

<!-- &s INIT -->
```js
const zeData = await ZE_DATA.json();
const zeTopo = await ZE_TOPO.json();
const zeGeo = rewind(topojson.feature(zeTopo, zeTopo.objects.data), true);
const urssafSerie = await URSSAF_SERIE.json();

// Pivots sectoriels (Parquet → Arrow → Array)
const floresA21 = await FLORES_PIVOT_A21.parquet();
const floresA5 = await FLORES_PIVOT_A5.parquet();
const floresA38 = await FLORES_PIVOT_A38.parquet();
const floresFr = await FLORES_FRANCE.parquet();
const urssafA21 = await URSSAF_PIVOT_A21.parquet();
const urssafA5 = await URSSAF_PIVOT_A5.parquet();
const urssafA38 = await URSSAF_PIVOT_A38.parquet();
const urssafFr = await URSSAF_FRANCE.parquet();

// INSEE Estimations emploi (série longue)
const eae205FranceSerie = await EAE205_FRANCE_SERIE.json();
const eae205FranceSlope = await EAE205_FRANCE_SLOPE.json();
const eae205ZeSerie = await EAE205_ZE_SERIE.json();

// Communes geo + DuckDB
const communesTopo = await COMMUNES_TOPO.json();
const communesGeo = rewind(topojson.feature(communesTopo, communesTopo.objects.data), true);
const { db: duckDb, conn } = await initDuckDB();
await registerParquet(duckDb, "communes", await COMMUNES_PARQUET.url());

// LabelMap ZE
const zeLabelMap = new Map();
zeData.forEach(d => d.code && d.libelle && zeLabelMap.set(String(d.code), d.libelle));
setLabelMap("Zone d'emploi", zeLabelMap);

const frData = getFranceData(zeData);
const dataNoFrance = getDataNoFrance(zeData);
const meta = getEchelonMeta("Zone d'emploi");

// Colonnes disponibles
const AVAILABLE_COLUMNS = new Set(Object.keys(zeData[0] || {}));

// Options indicateurs éco
const ecoIndicOptions = getIndicOptionsByVolet("ecodash");
const _ecoVals = new Set(ecoIndicOptions.values());

// Colonnes KPI/table fixes (métriques éco clés)
const defaultTableCols = [
  "eco_emp_vtcam_1622", "eco_emppriv_vtcam_1924", "eco_emppriv_vtcam_2224",
  "eco_txemp_1564_22", "eco_krugman_a5_22", "eco_krugman_a38_23",
  "eco_emp_pres_pct_23"
].filter(c => AVAILABLE_COLUMNS.has(c));
```
<!-- &e INIT -->

<!-- &s STATE -->
```js
// Pré-sélection : Rennes (5315) + Paris (1109)
const mapSelectionState = Mutable(new Set(["5315", "1109"]));
const zoomTargetState = Mutable("5315");
const sortState = Mutable({ col: "eco_krugman_a5_22", asc: false });
const pageState = Mutable(0);

// Selection manager (centralisé depuis selection.js)
const selectionMgr = createSelectionManager(mapSelectionState, zoomTargetState, pageState);
const { addToSelection, removeFromSelection, setZoomOnly, toggleMapSelection, clearMapSelection } = selectionMgr;

// Tri
const setSort = (col) => {
  const curr = sortState.value.col;
  const asc = sortState.value.asc;
  sortState.value = curr === col ? { col, asc: !asc } : { col, asc: false };
  pageState.value = 0;
};
```
<!-- &e STATE -->

<!-- &s SUB_BANNER -->
<style>
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
/* Sidebar disabled */
.panel-disabled {
  opacity: 0.4;
  pointer-events: none;
  filter: grayscale(0.3);
}
/* Tab radio styled */
.tab-radio > div { display: flex !important; gap: 0 !important; }
</style>
<!-- &e SUB_BANNER -->

<!-- Styles sidebar -->
<style>
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
/* Compacter + aligner tous les form Observable (grille label|control) */
.sidebar form {
  width: 100% !important;
  max-width: 280px !important;
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
/* Radios inline : compacts, lisibles */
.sidebar form > div[style*="flex"] label {
  overflow: visible !important;
  white-space: nowrap !important;
  font-size: 11px !important;
  margin: 0 !important;
  padding: 0 !important;
}
/* Sections panels */
.sidebar .panel { margin-bottom: 6px !important; }
.sidebar .panel-title { margin-bottom: 5px !important; }
</style>

<!-- &s SIDEBAR -->
<aside class="sidebar">

```js
const _tabEcoInput = Inputs.radio(
  new Map([["Exploration libre", "libre"], ["Emploi", "emploi"], ["Spécialisation", "specialisation"]]),
  { value: "libre", label: "" }
)
_tabEcoInput.classList.add("tab-radio")
{ const d = _tabEcoInput.querySelector(":scope > div"); if (d) { d.style.cssText = "display:flex;gap:0;flex-wrap:wrap;"; d.querySelectorAll("label").forEach(l => { l.style.cssText = "padding:3px 8px;font-size:10px;"; }); } }
const activeEcoTab = view(_tabEcoInput)
```

<section class="panel">
<div class="panel-title">ÉCHELON</div>

```js
const echelon = view(Inputs.radio(["Zone d'emploi"], { value: "Zone d'emploi", label: "" }));
```

</section>

<section class="panel" id="panel-eco-carte1">
<div class="panel-title">INDICATEUR CARTE 1 · AXE X</div>

```js
const defaultIndic1 = _ecoVals.has("eco_emp_vtcam") ? "eco_emp_vtcam" : "eco_emppriv_vtcam";
const indic1 = view(Inputs.select(ecoIndicOptions, { value: defaultIndic1, label: "Indic." }));
```

```js
const perMap1 = getPeriodesForIndicateur(indic1);
const periode1 = view(Inputs.select(perMap1, { value: [...perMap1.values()][0], label: "Période" }));
```

```js
const _cm1Input = Inputs.radio(["%", "±Fr.", "Grad."], { value: "%", label: "Palette" });
{ const d = _cm1Input.querySelector(":scope > div"); if (d) { d.style.cssText = "display:flex;gap:6px;justify-content:flex-end;"; d.querySelectorAll("label").forEach(l => l.style.display = "inline"); } }
const _cm1Lbl = Array.from(_cm1Input.querySelectorAll("label")).find(l => !l.querySelector("input"));
if (_cm1Lbl) { const t = document.createElement("span"); t.className = "panel-tooltip-wrap"; t.innerHTML = `<span class="panel-tooltip-icon">?</span><span class="panel-tooltip-text">% = quantiles (classes effectifs égaux)<br>±Fr. = écart à la valeur France (σ winsorisé)<br>Grad. = dégradé continu</span>`; _cm1Lbl.appendChild(t); }
const colorMode1 = view(_cm1Input);
```

</section>

<section class="panel" id="panel-eco-carte2">
<div class="panel-title">INDICATEUR CARTE 2 · AXE Y</div>

```js
const defaultIndic2 = _ecoVals.has("eco_emppriv_vtcam") ? "eco_emppriv_vtcam" : "eco_emp_vtcam";
const indic2 = view(Inputs.select(ecoIndicOptions, { value: defaultIndic2, label: "Indic." }));
```

```js
const perMap2 = getPeriodesForIndicateur(indic2);
const periode2 = view(Inputs.select(perMap2, { value: [...perMap2.values()][0], label: "Période" }));
```

```js
const _cm2Input = Inputs.radio(["%", "±Fr.", "Grad."], { value: "±Fr.", label: "Palette" });
{ const d = _cm2Input.querySelector(":scope > div"); if (d) { d.style.cssText = "display:flex;gap:6px;justify-content:flex-end;"; d.querySelectorAll("label").forEach(l => l.style.display = "inline"); } }
const _cm2Lbl = Array.from(_cm2Input.querySelectorAll("label")).find(l => !l.querySelector("input"));
if (_cm2Lbl) { const t = document.createElement("span"); t.className = "panel-tooltip-wrap"; t.innerHTML = `<span class="panel-tooltip-icon">?</span><span class="panel-tooltip-text">% = quantiles (classes effectifs égaux)<br>±Fr. = écart à la valeur France (σ winsorisé)<br>Grad. = dégradé continu</span>`; _cm2Lbl.appendChild(t); }
const colorMode2 = view(_cm2Input);
```

</section>

<section class="panel">
<div class="panel-title">SÉLECTION ZE</div>
<div id="search-container" style="margin-top:6px;min-height:100px;"></div>
</section>

<section class="panel">
<div class="panel-title">OPTIONS CARTES</div>

```js
const showValuesOnMap = view(Inputs.toggle({ label: "Show labels", value: true }));
const labelBy = view(Inputs.select(new Map([
  ["Principaux terr.", "population"],
  ["Top 20 + Bot 20", "top5_bot5"],
  ["Top 20 indic", "indicator_top"],
  ["Bottom 20 indic", "indicator_bottom"]
]), { value: "population", label: "Labels" }));
const _lmInput = Inputs.radio(["both", "val.", "noms"], { value: "both", label: "Contenu" });
{ const d = _lmInput.querySelector(":scope > div"); if (d) { d.style.cssText = "display:flex;gap:4px;justify-content:flex-end;"; d.querySelectorAll("label").forEach(l => { l.style.display = "inline"; l.style.fontSize = "11px"; }); } }
const labelMode = view(_lmInput);
```

</section>

<section class="panel">
<div class="panel-title">INDICATEURS TABLEAU <span class="panel-tooltip-wrap"><span class="panel-tooltip-icon">?</span><span class="panel-tooltip-text">ctrl/shift click pour multi-sélection</span></span></div>

```js
const extraIndics = view(Inputs.select(
  ecoIndicOptions,
  { label: "", multiple: true, value: [] }
));
```

</section>

</aside>
<!-- &e SIDEBAR -->

<!-- &s LAYOUT_MAIN -->
<div class="layout-main" style="margin-top:0;">

```js
// === SOUS-BANNIÈRE : Profil comparé (collapsible) ===
const _sbBlock = document.createElement("div");
_sbBlock.style.cssText = "margin:-6px -20px 0 -16px;padding:0;";

// Header bar : toggle gauche + breadcrumb droite
const _sbBar = document.createElement("div");
_sbBar.style.cssText = "background:#e8eaed;padding:5px 16px;font-size:11.5px;color:#374151;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;gap:12px;";

const _sbToggle = document.createElement("button");
_sbToggle.style.cssText = "background:#f8fafc;border:1px solid #cbd5e1;border-radius:20px;padding:4px 14px 4px 10px;font-size:11.5px;color:#475569;cursor:pointer;display:flex;align-items:center;gap:5px;font-family:inherit;transition:all 0.15s;white-space:nowrap;flex-shrink:0;font-weight:500;";
_sbToggle.innerHTML = `<span style="font-size:9px;transition:transform 0.2s;display:inline-block;${mapSelectionState.size > 0 ? "transform:rotate(90deg);" : ""}" id="_kpi-chevron-eco">▶</span> Profil comparé territoires sélectionnés`;
_sbToggle.onmouseenter = () => { _sbToggle.style.borderColor = "#94a3b8"; _sbToggle.style.background = "#f1f5f9"; };
_sbToggle.onmouseleave = () => { _sbToggle.style.borderColor = "#cbd5e1"; _sbToggle.style.background = "#f8fafc"; };

const _sbBreadcrumb = document.createElement("span");
_sbBreadcrumb.style.cssText = "color:#6b7280;font-size:11px;margin-left:auto;white-space:nowrap;";
_sbBreadcrumb.textContent = "Zone d'emploi · Sources : URSSAF 2014-2024, FLORES 2022-2023, INSEE RP 2011/16/22";

_sbBar.appendChild(_sbToggle);
_sbBar.appendChild(_sbBreadcrumb);
_sbBlock.appendChild(_sbBar);

// Contenu rétractable — auto-déplié si sélection active
const _hasSelection = mapSelectionState.size > 0;
const _kpiBody = document.createElement("div");
_kpiBody.style.cssText = `overflow:hidden;transition:max-height 0.3s ease, border-color 0.3s;max-height:${_hasSelection ? "600px" : "0px"};border-left:${_hasSelection ? "3px solid #e67e22" : "3px solid transparent"};`;

// Toggle
_sbToggle.onclick = () => {
  const collapsed = _kpiBody.style.maxHeight === "0px";
  _kpiBody.style.maxHeight = collapsed ? "600px" : "0px";
  _kpiBody.style.borderLeftColor = collapsed ? "#e67e22" : "transparent";
  const chevron = document.getElementById("_kpi-chevron-eco");
  if (chevron) chevron.style.transform = collapsed ? "rotate(90deg)" : "";
};

// KPI Table compact — France + ZE sélectionnées (max 5)
const kpiSelCodes = [...mapSelectionState].slice(0, 5);
const kpiSelData = kpiSelCodes.map(c => dataNoFrance.find(d => d.code === c)).filter(Boolean);
const kpiData = [frData, ...kpiSelData].filter(Boolean);

const kpiCols = [
  { key: "libelle", label: "", type: "text", width: 120 },
  ...defaultTableCols.map(col => {
    const indicK = col.replace(/_\d+$/, "");
    const per = col.match(/_(\d{2,4})$/)?.[1] || "";
    return { key: col, label: getIndicLabel(indicK, "medium"), unit: getIndicUnit(col), periode: per ? getPeriodeLabel(per, "short") : "" };
  })
];

const kpiStats = computeBarStats(dataNoFrance, defaultTableCols);
const kpiTable = renderTable({
  data: kpiData, columns: kpiCols, stats: kpiStats,
  compact: true, maxHeight: 160, scrollX: true, stickyFirstCol: 1
});
const _kpiWrap = document.createElement("div");
_kpiWrap.style.cssText = "padding:4px 16px 8px;background:#fff;";
kpiTable.style.cssText = (kpiTable.style.cssText || "") + "background:#fff;width:100%;";
_kpiWrap.appendChild(kpiTable);
_kpiBody.appendChild(_kpiWrap);

_sbBlock.appendChild(_kpiBody);

// Espacement sous le bloc
const _spacer = document.createElement("div");
_spacer.style.cssText = "height:4px;background:#f5f6f7;";
_sbBlock.appendChild(_spacer);

display(_sbBlock);
```

```js
// === DONNÉES + BINDINGS ===
// Tab presets eco
const ECO_TAB_DEFS = {
  libre: null,
  emploi: { indic1: "eco_emp_vtcam", per1: "1622", indic2: "eco_emppriv_vtcam", per2: "1924", label: "Dynamique de l'emploi" },
  specialisation: { indic1: "eco_krugman_a5", per1: "22", indic2: "eco_txemp_1564", per2: "22", label: "Spécialisation et taux d'emploi" }
};
const _tabOvr = ECO_TAB_DEFS[activeEcoTab];

// Disable sidebar panels carte 1/2 quand tab ≠ libre
setTimeout(() => {
  const p1 = document.getElementById("panel-eco-carte1");
  const p2 = document.getElementById("panel-eco-carte2");
  if (p1) p1.classList.toggle("panel-disabled", activeEcoTab !== "libre");
  if (p2) p2.classList.toggle("panel-disabled", activeEcoTab !== "libre");
}, 50);

// Effective indicators : tab override or sidebar
const _effIndic1 = _tabOvr ? _tabOvr.indic1 : indic1;
const _effIndic2 = _tabOvr ? _tabOvr.indic2 : indic2;
const _effPer1 = _tabOvr ? _tabOvr.per1 : periode1;
const _effPer2 = _tabOvr ? _tabOvr.per2 : periode2;

const indic = _effIndic1;
const indicCarte = _effIndic1;
const colKey1 = buildColKey(_effIndic1, _effPer1);
const colKey2 = buildColKey(_effIndic2, _effPer2);
const colKey = colKey1;
const colKeyCarte = colKey1;
const indicLabel = getIndicLabel(_effIndic1, "medium");
const indicLabel2 = getIndicLabel(_effIndic2, "medium");
// Labels avec période pour axes scatter
const indicLabelPer = _effPer1 ? `${indicLabel} (${getPeriodeLabel(_effPer1, "short")})` : indicLabel;
const indicLabelPer2 = _effPer2 ? `${indicLabel2} (${getPeriodeLabel(_effPer2, "short")})` : indicLabel2;
const labelCarte = indicLabel;

// Joindre données aux géométries (les 2 colKeys)
for (const f of zeGeo.features) {
  const row = dataNoFrance.find(d => d.code === f.properties[meta.geoKey]);
  if (row) {
    f.properties[colKey1] = row[colKey1];
    f.properties[colKey2] = row[colKey2];
    f.properties.P23_POP = row.P23_POP;
  }
}

// Bins et couleurs — CARTE 1
const _cm1 = colorMode1;
const indicBins = computeIndicBins(dataNoFrance, colKey1, _effIndic1);
const { bins, palette: PAL, isDiv, getColor: getColorBins } = indicBins;
const gradient = createGradientScale(dataNoFrance, colKey1);
const isGradient = _cm1 === "Grad.";
const isEcart = _cm1 === "±Fr.";
const ecart = computeEcartFrance(dataNoFrance, colKey1, frData?.[colKey1], { indicType: INDICATEURS[_effIndic1]?.type });
const getColor = isEcart ? ecart.getColor : isGradient ? gradient.getColor : getColorBins;

// Bins et couleurs — CARTE 2
const _cm2 = colorMode2;
const indicBins2 = computeIndicBins(dataNoFrance, colKey2, _effIndic2);
const gradient2 = createGradientScale(dataNoFrance, colKey2);
const isGradient2 = _cm2 === "Grad.";
const isEcart2 = _cm2 === "±Fr.";
const ecart2 = computeEcartFrance(dataNoFrance, colKey2, frData?.[colKey2], { indicType: INDICATEURS[_effIndic2]?.type });
const getColor2 = isEcart2 ? ecart2.getColor : isGradient2 ? gradient2.getColor : indicBins2.getColor;

```


```js
// === SIDEBAR SEARCH ===
const searchData = dataNoFrance.map(d => ({ code: d.code, label: d.libelle || d.code, pop: d.P23_POP }));
const searchBox = createSearchBox({
  data: searchData, selection: mapSelectionState, onToggle: toggleMapSelection, onClear: clearMapSelection,
  placeholder: "Rechercher ZE...", maxResults: 8, maxChips: 4, maxWidth: 230, showClearAll: true, showCount: true
});

setTimeout(() => {
  const searchContainer = document.getElementById('search-container');
  if (searchContainer) { searchContainer.innerHTML = ''; searchContainer.appendChild(searchBox); }
}, 100);
```

```js
// === PRE-COMPUTE : Zoom + Commune maps data ===
if (!window._zoomStatesEco) window._zoomStatesEco = {};
const _zoomVal = zoomTargetState;
const zoomCode = (_zoomVal && zeLabelMap.has(_zoomVal)) ? _zoomVal : "5315";
const zoomLabel = zeLabelMap.get(zoomCode) || zoomCode;

// Commune maps : pre-fetch data pour ZE zoomée
const _selCodes = [...mapSelectionState];
const _mc1 = zoomCode || "5315";

const _fetchComm = (tCode) => {
  return queryCommunes({ conn }, {
    tableName: "communes",
    filter: { ZE2020: [tCode] },
    columns: ["code", "libelle", "P23_POP", colKey1, colKey2].filter((v,i,a) => a.indexOf(v) === i),
    limit: 2000
  });
};
const _cd1 = await _fetchComm(_mc1);

// Helper : crée un élément carte commune (paramétrable carte 1 ou 2 via opts)
function buildCommMap(tCode, tData, w, h, opts = {}) {
  const _ck = opts.colKey || colKey1;
  const _ind = opts.indic || _effIndic1;
  const _ib = opts.indicBins || indicBins;
  const _gr = opts.gradient || gradient;
  const _isE = opts.isEcart != null ? opts.isEcart : isEcart;
  const _ec = opts.ecart || ecart;
  const _isG = opts.isGradient != null ? opts.isGradient : isGradient;
  const _il = opts.indicLabel || indicLabel;

  const tLabel = zeLabelMap.get(tCode) || tCode;
  const tMap = new Map(tData.map(d => [d.code, d]));
  const tFeats = communesGeo.features.filter(f => String(f.properties.ZE2020) === String(tCode));
  const tGeo = { type: "FeatureCollection", features: tFeats.map(f => { const d = tMap.get(f.properties.CODGEO); return { ...f, properties: { ...f.properties, libelle: d?.libelle, P23_POP: d?.P23_POP, [_ck]: d?.[_ck] } }; }) };
  if (tGeo.features.length === 0) return null;
  const tBins = tData.length >= 10 ? computeIndicBins(tData, _ck, _ind) : _ib;
  const tGrad = tData.length >= 10 ? createGradientScale(tData, _ck) : _gr;
  const tEcart = _isE ? computeEcartFrance(tData, _ck, _ec.ref, { sigma: _ec.sigma, indicType: INDICATEURS[_ind]?.type }) : null;
  const tGetColor = _isE ? tEcart.getColor : _isG ? tGrad.getColor : tBins.getColor;
  const cMap = renderChoropleth({ geoData: tGeo, valueCol: _ck, getColor: tGetColor, getCode: f => f.properties.CODGEO, getLabel: ({ code }) => tMap.get(code)?.libelle || code, formatValue: (k, v) => formatValue(_ind, v), indicLabel: _il, showLabels: showValuesOnMap, labelMode, labelBy, topN: 200, title: `${_il} — ${tLabel}`, maxLabelsAuto: 80, echelon: "Commune", width: w, height: h });
  if (!cMap) return null;
  if (cMap._tipConfig) { cMap._tipConfig.frRef = frData?.[_ck]; cMap._tipConfig.frGetEcartInfo = _isE ? tEcart?.getEcartInfo : _ec.getEcartInfo; }
  const tEcartCounts = _isE ? countBins(tData, _ck, tEcart.thresholds || []) : [];
  const cLegend = _isE
    ? createEcartFranceLegend({ palette: tEcart.palette, symbols: ECART_FRANCE_SYMBOLS, pctLabels: tEcart.pctLabels, counts: tEcartCounts, title: "±Fr." })
    : _isG
    ? createGradientLegend({ colors: tGrad.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential, min: tGrad.min, max: tGrad.max, showZero: tGrad.divergent, decimals: 2, capped: true, rawMin: tGrad.rawMin, rawMax: tGrad.rawMax })
    : createBinsLegend({ colors: tBins.palette, labels: tBins.bins.labels || [], counts: countBins(tData, _ck, tBins.bins.thresholds || []), vertical: true, unit: getIndicUnit(_ck), reverse: !tBins.isDiv });
  const card = document.createElement("div");
  card.style.cssText = "padding:4px;";
  card.appendChild(createMapWrapper(cMap, null, cLegend, addZoomBehavior(cMap, {}), { exportSVGFn: exportSVG, echelon: tLabel, colKey: _ck, title: `${_il} — ${tLabel}` }));
  return card;
}
```

<!-- &s CARTES_ET_TABLEAU -->
<div style="display:flex;gap:6px;align-items:stretch;">

<!-- COLONNE GAUCHE : cartes + butterfly -->
<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:4px;padding-left:6px;">

```js
// Mode bar avec tabset au-dessus des cartes
const _modeBarEco = document.createElement("div");
_modeBarEco.style.cssText = "display:flex;align-items:center;gap:8px;margin:0 0 6px 0;font-family:Inter,system-ui,sans-serif;";

const _vueLabelEco = document.createElement("span");
_vueLabelEco.style.cssText = "font-size:12px;font-weight:600;color:#1e3a5f;cursor:help;white-space:nowrap;";
_vueLabelEco.textContent = "Vue";
_vueLabelEco.title = "Sélectionnez un mode d'exploration : libre (choix indicateurs) ou un preset thématique";
_modeBarEco.appendChild(_vueLabelEco);

const _tabBtnWrapEco = document.createElement("div");
_tabBtnWrapEco.style.cssText = "display:flex;gap:0;border:1.5px solid #c2590a;border-radius:5px;overflow:hidden;";
const _tabDefsEco = [
  { key: "libre", label: "Exploration libre", tip: "Choix libre des indicateurs carte et scatter" },
  { key: "emploi", label: "Emploi", tip: "Emploi total TCAM 16-22 vs emploi privé TCAM 19-24" },
  { key: "specialisation", label: "Spécialisation", tip: "Krugman A5 vs taux d'emploi 15-64 ans" }
];
_tabDefsEco.forEach((td, i) => {
  const btn = document.createElement("button");
  const isActive = activeEcoTab === td.key;
  btn.style.cssText = `padding:5px 16px;font-size:11.5px;font-weight:${isActive ? "600" : "400"};border:none;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all 0.15s;${isActive ? "background:#c2590a;color:#fff;" : "background:#fef3e2;color:#7c2d12;"}${i > 0 ? "border-left:1px solid #e67e22;" : ""}`;
  btn.textContent = td.label;
  btn.title = td.tip;
  btn.onmouseenter = () => { if (!isActive) btn.style.background = "#fde68a"; };
  btn.onmouseleave = () => { if (!isActive) btn.style.background = "#fef3e2"; };
  btn.onclick = () => {
    _tabEcoInput.value = td.key;
    _tabEcoInput.dispatchEvent(new Event("input", { bubbles: true }));
  };
  _tabBtnWrapEco.appendChild(btn);
});
_modeBarEco.appendChild(_tabBtnWrapEco);

const _ecoTitle = document.createElement("span");
_ecoTitle.style.cssText = "font-size:13px;font-weight:600;color:#1e3a5f;margin-left:8px;";
_ecoTitle.textContent = _tabOvr ? _tabOvr.label : "Où se concentrent les dynamiques d'emploi ?";
_modeBarEco.appendChild(_ecoTitle);

display(_modeBarEco);
```

<!-- Cartes nationales côte à côte -->
<div class="cards-row">

<div class="card">

```js
// === CARTE NATIONALE 1 (indic1) ===
const map = renderChoropleth({
  geoData: zeGeo, valueCol: colKey1,
  getColor: (v, f) => getColor(v),
  getCode: f => f.properties[meta.geoKey],
  getLabel: ({ code }) => zeLabelMap.get(code) || code,
  formatValue: (k, v) => formatValue(_effIndic1, v),
  indicLabel, selectedCodes: [...mapSelectionState],
  showLabels: showValuesOnMap, labelMode, labelBy, topN: 0,
  title: indicLabel, echelon: "Zone d'emploi", width: 395, height: 365, maxLabelsAuto: 600
});

const counts = countBins(dataNoFrance, colKey1, bins.thresholds || []);
const unit = getIndicUnit(colKey1);
const ecartCounts = isEcart ? countBins(dataNoFrance, colKey1, ecart.thresholds || []) : [];
const legend = isEcart
  ? createEcartFranceLegend({
      palette: ecart.palette, symbols: ECART_FRANCE_SYMBOLS,
      pctLabels: ecart.pctLabels,
      counts: ecartCounts, title: `±Fr. (en ${ecart.isAbsoluteEcart ? "pts" : "%"})`,
      interactive: true,
      onFilter: (activeIndices) => {
        const zc = map.querySelector("g.zoom-content") || map.querySelector("svg");
        const groups = Array.from(zc.children).filter(c => c.tagName === 'g');
        const fp = groups.length >= 2 ? Array.from(groups[1].children).filter(c => c.tagName === 'path') : null;
        if (!fp || fp.length < zeGeo.features.length * 0.9) return;
        fp.forEach((p, i) => {
          if (i >= zeGeo.features.length) return;
          const v = zeGeo.features[i].properties[colKey1];
          const bi = ecart.getBinIdx(v);
          if (bi >= 0 && !activeIndices.has(bi)) {
            p.setAttribute("fill", "#f3f4f6"); p.setAttribute("fill-opacity", "0.15");
          } else {
            p.setAttribute("fill", getColor(v)); p.setAttribute("fill-opacity", "1");
          }
        });
      }
    })
  : isGradient
  ? createGradientLegend({
      colors: gradient.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradient.min, max: gradient.max, showZero: gradient.divergent,
      decimals: 2, title: unit || "",
      capped: true, rawMin: gradient.rawMin, rawMax: gradient.rawMax
    })
  : createBinsLegend({
      colors: PAL, labels: bins.labels || [], counts,
      vertical: true, unit, reverse: !isDiv,
      interactive: true,
      onFilter: (activeIndices) => {
        // Cibler le 2e groupe <g> (fill paths), PAS le 1er (contour fill="none")
        const zc = map.querySelector("g.zoom-content") || map.querySelector("svg");
        const groups = Array.from(zc.children).filter(c => c.tagName === 'g');
        const fp = groups.length >= 2
          ? Array.from(groups[1].children).filter(c => c.tagName === 'path')
          : null;
        if (!fp || fp.length < zeGeo.features.length * 0.9) return;
        fp.forEach((p, i) => {
          if (i >= zeGeo.features.length) return;
          const v = zeGeo.features[i].properties[colKey1];
          const bi = indicBins.getBinIdx(v);
          if (bi >= 0 && !activeIndices.has(bi)) {
            p.setAttribute("fill", "#f3f4f6");
            p.setAttribute("fill-opacity", "0.15");
          } else {
            p.setAttribute("fill", getColor(v));
            p.setAttribute("fill-opacity", "1");
          }
        });
      }
    });

// Click handler : clic normal = zoom, ctrl+clic = sélection
map.style.cursor = "pointer";
map.addEventListener("click", (e) => {
  const path = e.target.closest("path");
  if (!path) return;
  const paths = Array.from(path.parentElement.querySelectorAll("path"));
  const idx = paths.indexOf(path);
  if (idx >= 0 && idx < zeGeo.features.length) {
    const code = zeGeo.features[idx].properties[meta.geoKey];
    if (e.ctrlKey || e.metaKey) addToSelection(code);
    else setZoomOnly(code);
  }
});

if (map._tipConfig) {
  map._tipConfig.frRef = frData?.[colKey1];
  map._tipConfig.frGetEcartInfo = ecart.getEcartInfo;
}

const wrapper = createMapWrapper(map, null, legend, addZoomBehavior(map, {
  initialTransform: window._zoomStatesEco.map1,
  onZoom: t => { window._zoomStatesEco.map1 = t; }
}), { exportSVGFn: exportSVG, echelon: "Zone d'emploi", colKey: colKey1, title: indicLabel });

const frVal = frData?.[colKey1];
const zeZoomRow = dataNoFrance.find(d => d.code === zoomCode);
const zeVal = zeZoomRow?.[colKey1];
const valuesDiv = document.createElement("div");
valuesDiv.style.cssText = "font-size:11px;color:#555;padding:1px 0 0 4px;line-height:1.5;";
let valHtml = "";
if (frVal != null) valHtml += `France : <b style="font-style:italic;">${formatValue(_effIndic1, frVal)}</b>`;
if (zeVal != null) valHtml += `${frVal != null ? " · " : ""}${zoomLabel} : <b style="font-style:italic;color:#1e40af;">${formatValue(_effIndic1, zeVal)}</b>`;
if (valHtml) { valuesDiv.innerHTML = valHtml; wrapper.appendChild(valuesDiv); }
display(wrapper);
```

</div>

<div class="card">

```js
// === CARTE NATIONALE 2 (indic2) ===
const map2 = renderChoropleth({
  geoData: zeGeo, valueCol: colKey2,
  getColor: (v, f) => getColor2(v),
  getCode: f => f.properties[meta.geoKey],
  getLabel: ({ code }) => zeLabelMap.get(code) || code,
  formatValue: (k, v) => formatValue(_effIndic2, v),
  indicLabel: indicLabel2, selectedCodes: [...mapSelectionState],
  showLabels: showValuesOnMap, labelMode, labelBy, topN: 0,
  title: indicLabel2, echelon: "Zone d'emploi", width: 395, height: 365, maxLabelsAuto: 600
});

const counts2 = countBins(dataNoFrance, colKey2, indicBins2.bins.thresholds || []);
const unit2 = getIndicUnit(colKey2);
const ecartCounts2 = isEcart2 ? countBins(dataNoFrance, colKey2, ecart2.thresholds || []) : [];
const legend2 = isEcart2
  ? createEcartFranceLegend({
      palette: ecart2.palette, symbols: ECART_FRANCE_SYMBOLS,
      pctLabels: ecart2.pctLabels,
      counts: ecartCounts2, title: `±Fr. (en ${ecart2.isAbsoluteEcart ? "pts" : "%"})`,
      interactive: true,
      onFilter: (activeIndices) => {
        const zc2 = map2.querySelector("g.zoom-content") || map2.querySelector("svg");
        const groups2 = Array.from(zc2.children).filter(c => c.tagName === 'g');
        const fp2 = groups2.length >= 2 ? Array.from(groups2[1].children).filter(c => c.tagName === 'path') : null;
        if (!fp2 || fp2.length < zeGeo.features.length * 0.9) return;
        fp2.forEach((p, i) => {
          if (i >= zeGeo.features.length) return;
          const v = zeGeo.features[i].properties[colKey2];
          const bi = ecart2.getBinIdx(v);
          if (bi >= 0 && !activeIndices.has(bi)) {
            p.setAttribute("fill", "#f3f4f6"); p.setAttribute("fill-opacity", "0.15");
          } else {
            p.setAttribute("fill", getColor2(v)); p.setAttribute("fill-opacity", "1");
          }
        });
      }
    })
  : isGradient2
  ? createGradientLegend({
      colors: gradient2.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradient2.min, max: gradient2.max, showZero: gradient2.divergent,
      decimals: 2, title: unit2 || "",
      capped: true, rawMin: gradient2.rawMin, rawMax: gradient2.rawMax
    })
  : createBinsLegend({
      colors: indicBins2.palette, labels: indicBins2.bins.labels || [], counts: counts2,
      vertical: true, unit: unit2, reverse: !indicBins2.isDiv,
      interactive: true,
      onFilter: (activeIndices) => {
        const zc2 = map2.querySelector("g.zoom-content") || map2.querySelector("svg");
        const groups2 = Array.from(zc2.children).filter(c => c.tagName === 'g');
        const fp2 = groups2.length >= 2
          ? Array.from(groups2[1].children).filter(c => c.tagName === 'path')
          : null;
        if (!fp2 || fp2.length < zeGeo.features.length * 0.9) return;
        fp2.forEach((p, i) => {
          if (i >= zeGeo.features.length) return;
          const v = zeGeo.features[i].properties[colKey2];
          const bi = indicBins2.getBinIdx(v);
          if (bi >= 0 && !activeIndices.has(bi)) {
            p.setAttribute("fill", "#f3f4f6");
            p.setAttribute("fill-opacity", "0.15");
          } else {
            p.setAttribute("fill", getColor2(v));
            p.setAttribute("fill-opacity", "1");
          }
        });
      }
    });

map2.style.cursor = "pointer";
map2.addEventListener("click", (e) => {
  const path = e.target.closest("path");
  if (!path) return;
  const paths = Array.from(path.parentElement.querySelectorAll("path"));
  const idx = paths.indexOf(path);
  if (idx >= 0 && idx < zeGeo.features.length) {
    const code = zeGeo.features[idx].properties[meta.geoKey];
    if (e.ctrlKey || e.metaKey) addToSelection(code);
    else setZoomOnly(code);
  }
});

if (map2._tipConfig) {
  map2._tipConfig.frRef = frData?.[colKey2];
  map2._tipConfig.frGetEcartInfo = ecart2.getEcartInfo;
}

const wrapper2 = createMapWrapper(map2, null, legend2, addZoomBehavior(map2, {
  initialTransform: window._zoomStatesEco.map2,
  onZoom: t => { window._zoomStatesEco.map2 = t; }
}), { exportSVGFn: exportSVG, echelon: "Zone d'emploi", colKey: colKey2, title: indicLabel2 });

const frVal2 = frData?.[colKey2];
const zeVal2 = zeZoomRow?.[colKey2];
const valuesDiv2 = document.createElement("div");
valuesDiv2.style.cssText = "font-size:11px;color:#555;padding:1px 0 0 4px;line-height:1.5;";
let valHtml2 = "";
if (frVal2 != null) valHtml2 += `France : <b style="font-style:italic;">${formatValue(_effIndic2, frVal2)}</b>`;
if (zeVal2 != null) valHtml2 += `${frVal2 != null ? " · " : ""}${zoomLabel} : <b style="font-style:italic;color:#1e40af;">${formatValue(_effIndic2, zeVal2)}</b>`;
if (valHtml2) { valuesDiv2.innerHTML = valHtml2; wrapper2.appendChild(valuesDiv2); }
display(wrapper2);
```

</div>

</div>
<!-- Fin cartes nationales -->

<!-- Scatter croisement indic1 × indic2 -->

```js
// === SCATTER PLOT — Croisement indic1 × indic2 ===
{
  const xCol = colKey1;
  const yCol = colKey2;
  // Labels axes = nom indicateur sans période (période dans l'unité)
  const xLbl = indicLabel;
  const yLbl = indicLabel2;
  const mX = frData?.[xCol];
  const mY = frData?.[yCol];

  const xV = dataNoFrance.map(d => d[xCol]).filter(v => v != null).sort((a, b) => a - b);
  const yV = dataNoFrance.map(d => d[yCol]).filter(v => v != null).sort((a, b) => a - b);

  if (xV.length > 5 && yV.length > 5) {
    const xP01 = xV[Math.floor(xV.length * 0.01)];
    const xP99 = xV[Math.min(Math.floor(xV.length * 0.99), xV.length - 1)];
    const yP01 = yV[Math.floor(yV.length * 0.01)];
    const yP99 = yV[Math.min(Math.floor(yV.length * 0.99), yV.length - 1)];
    const xPad = (xP99 - xP01) * 0.08;
    const yPad = (yP99 - yP01) * 0.08;

    // Échelle taille adaptative avec détection outliers IQR
    const sz = autoSizeScale(dataNoFrance.map(d => d.P23_POP), { label: "Population", rRange: [3, 14] });

    // Couleur par densité (dens3: 1=Dense, 2=Intermédiaire, 3=Rural) — DENS_COLORS importé de constants.js
    const densColor = (d) => DENS_COLORS[d.dens3] || "#999";

    // Domaine : inclure 0 si proche du range (TCAM autour de 0)
    let xMin = xP01 - xPad, xMax = xP99 + xPad;
    let yMin = yP01 - yPad, yMax = yP99 + yPad;
    if (xMin > 0 && xMin < (xMax - xMin) * 0.5) xMin = Math.min(0, xMin);
    if (xMax < 0 && Math.abs(xMax) < (xMax - xMin) * 0.5) xMax = Math.max(0, xMax);
    if (yMin > 0 && yMin < (yMax - yMin) * 0.5) yMin = Math.min(0, yMin);
    if (yMax < 0 && Math.abs(yMax) < (yMax - yMin) * 0.5) yMax = Math.max(0, yMax);

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

    const sCodes = [...mapSelectionState];
    const topPop = dataNoFrance
      .filter(d => d[xCol] != null && d[yCol] != null)
      .sort((a, b) => (b.P23_POP || 0) - (a.P23_POP || 0))
      .slice(0, 8).map(d => d.code);
    const lCodes = [...new Set([...sCodes, ...topPop])];

    const sc = createScatterWithZoom({
      data: dataNoFrance, xCol, yCol,
      xDomain: [xMin, xMax],
      yDomain: [yMin, yMax],
      xLabel: xLbl, yLabel: yLbl,
      xUnit: `${getIndicUnit(colKey1)}${periode1 ? ", " + getPeriodeLabel(periode1, "short") : ""}`,
      yUnit: `${getIndicUnit(colKey2)}${periode2 ? ", " + getPeriodeLabel(periode2, "short") : ""}`,
      meanX: mX, meanY: mY,
      getRadius: d => sz.getRadius(d.P23_POP),
      getColor: densColor,
      isSelected: d => sCodes.includes(d.code),
      getTooltip: d => buildScatterTooltip(d, xCol, yCol, dataNoFrance, mX, mY),
      width: 820, height: 350,
      labelCodes: lCodes, labelMode,
      _customTooltip: true,
      annotations,
      title: `${indicLabel} — ${indicLabel2} (Zones d'emploi)`,
      subtitle: `${dataNoFrance.length} territoires`,
      legend: [
        { label: `${DENS_LABELS["1"]} (${dataNoFrance.filter(d => d.dens3 === "1").length})`, color: DENS_COLORS["1"] },
        { label: `${DENS_LABELS["2"]} (${dataNoFrance.filter(d => d.dens3 === "2").length})`, color: DENS_COLORS["2"] },
        { label: `${DENS_LABELS["3"]} (${dataNoFrance.filter(d => d.dens3 === "3").length})`, color: DENS_COLORS["3"] }
      ],
      sizeLabel: createSizeLegendVertical(sz.bins, "Population"),
      fillOpacity: 0.65
    });

    display(sc);
  } else {
    display(html`<div style="padding:20px;text-align:center;color:#6b7280;font-size:11px;">Données insuffisantes pour le scatter</div>`);
  }
}
```

<!-- Cartes communes zoom (même ZE, 2 indicateurs) -->
<div class="cards-row">

<div class="card">

```js
// Carte commune — indic1 (zoom target)
{
  const mc1 = buildCommMap(_mc1, _cd1, 385, 320);
  if (mc1) display(mc1);
  else display(html`<div style="padding:40px;text-align:center;color:#6b7280;font-size:11px;">Pas de données communes pour cette ZE</div>`);
}
```

</div>

<div class="card">

```js
// Carte commune — indic2 (zoom target)
{
  const mc2 = buildCommMap(_mc1, _cd1, 385, 320, {
    colKey: colKey2, indic: indic2, indicBins: indicBins2,
    gradient: gradient2, isEcart: isEcart2, ecart: ecart2,
    isGradient: isGradient2, indicLabel: indicLabel2
  });
  if (mc2) display(mc2);
  else display(html`<div style="padding:40px;text-align:center;color:#6b7280;font-size:11px;">Pas de données communes pour cette ZE</div>`);
}
```

</div>

</div>

<!-- Butterfly FLORES dans colonne gauche -->
<div style="margin-top:8px;">

```js
// === BUTTERFLY HORIZONTAL A21 FLORES ===
const vbCodes = [...mapSelectionState];

// France A21 FLORES (trié par part décroissante)
const vbFranceData = floresFr.toArray()
  .filter(d => d.a21 && d.a21 !== "")
  .map(d => ({ secteur: d.lib, pct: d.pct_23, is: 1.0 }))
  .sort((a, b) => (b.pct || 0) - (a.pct || 0));

// Territoires sélectionnés
const vbTerritories = vbCodes.map(code => {
  const rows = floresA21.toArray().filter(d => d.code_ze === code);
  return {
    label: zeLabelMap.get(code) || code,
    data: rows.map(d => ({ secteur: d.lib, pct: d.pct_23, is: d.is_23 || 1.0 }))
  };
});

if (vbCodes.length > 0) {
  display(html`<div class="card" style="padding:8px;">`);
  display(renderButterflyVertical({
    franceData: vbFranceData,
    territories: vbTerritories,
    options: {
      width: 830,
      maxSectors: 12,
      barHeight: 18,
      title: "Répartition de l'emploi total par secteur d'activité (A21)"
    }
  }));
  display(html`<p style="font-size:8px;color:#6b7280;margin:2px 0 0 0;">
    FLORES A21 2023 — Part % + IS (violet > 1.15 = spécialisation, cyan < 0.85 = sous-représentation)
  </p></div>`);
} else {
  display(html`<div class="card" style="padding:20px;text-align:center;color:#6b7280;font-size:11px;">
    Sélectionnez une ZE pour voir la structure sectorielle
  </div>`);
}
```

</div>
</div>
<!-- Fin COLONNE GAUCHE (cartes + butterfly) -->

<!-- COLONNE DROITE : search + table ZE -->
<div style="flex:1;min-width:300px;display:flex;flex-direction:column;">
<h3 style="margin:0 0 4px 0;">Tableau Zones d'emploi<span class="table-help-wrap"><span class="table-help-icon">?</span><span class="help-tooltip"><b>Couleurs</b> : intensit&eacute; proportionnelle &agrave; l'&eacute;cart par rapport &agrave; la moyenne.<br>&bull; <span style="color:#98cf90">&#9632;</span> Vert = au-dessus de la moyenne<br>&bull; <span style="color:#e46aa7">&#9632;</span> Violet = en-dessous de la moyenne<br>Plus la couleur est fonc&eacute;e, plus la valeur est extr&ecirc;me.<br><b>Filtre</b> : tapez un nom ou un n&deg; de ZE.</span></span></h3>
<div class="card" style="flex:1;padding:6px;display:flex;flex-direction:column;min-height:0;">

```js
// === STATE TABLEAU ZE ===
const echSortState2 = Mutable({ col: colKeyCarte, asc: false });
const setEchSort2 = (col) => {
  const curr = echSortState2.value.col;
  const asc = echSortState2.value.asc;
  echSortState2.value = curr === col ? { col, asc: !asc } : { col, asc: false };
};
```

```js
// === SEARCHBAR TABLEAU ===
const echSearchInput2 = view(Inputs.text({ placeholder: "Rechercher ZE...", width: 200 }));
```

```js
// === DONNÉES TABLEAU ZE ===
const selectedExtraIndics = extraIndics || [];
const extraCols = selectedExtraIndics.filter(i => !i.startsWith("__sep_")).map(i => buildColKey(i, getDefaultPeriode(i)));

// Ordre: indicateurs cartes → extras sidebar → défauts éco fixes
const allEcoCols = [
  colKey1, colKey2,
  ...extraCols,
  ...defaultTableCols
].filter(c => AVAILABLE_COLUMNS.has(c));
const echAllIndicCols2 = [...new Set(allEcoCols)];

// Données avec France en 1ère ligne
const echTableData2 = frData ? [frData, ...dataNoFrance] : dataNoFrance;

// Filtre recherche
const echSearchVal2 = (echSearchInput2 || "").toLowerCase();
const echFiltered2 = echSearchVal2
  ? echTableData2.filter(d => d.code === "00FR" || (d.libelle || "").toLowerCase().includes(echSearchVal2) || (d.code || "").includes(echSearchVal2))
  : echTableData2;

// Tri
const echSortCol2 = echSortState2.col;
const echSortAsc2 = echSortState2.asc;
const echSorted2 = sortTableData(echFiltered2, echSortCol2, echSortAsc2);

// Stats pour barres
const echStats2 = computeBarStats(echFiltered2, echAllIndicCols2);

// Colonnes avec labels medium pour homogénéité
const echColumns2 = [
  { key: "libelle", label: "Zone d'emploi", type: "text", width: 130 },
  ...echAllIndicCols2.map(col => {
    const indicK = col.replace(/_\d+$/, "");
    const per = col.match(/_(\d{2,4})$/)?.[1] || "";
    return {
      key: col,
      label: getIndicLabel(indicK, "medium"),
      unit: getIndicUnit(col),
      periode: per ? getPeriodeLabel(per, "short") : ""
    };
  })
];

// Header : count + export + fullscreen
display(html`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
  <span style="font-size:10px;color:#6b7280;">${echFiltered2.length} ZE</span>
  <div style="display:flex;gap:4px;">
    <button style="font-size:10px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;"
      onclick=${() => exportCSV(echSorted2, echColumns2, "eco_ze_" + new Date().toISOString().slice(0,10) + ".csv")}>
      CSV
    </button>
    <button style="font-size:12px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;" title="Plein écran"
      onclick=${() => { const t = document.querySelector(".eco-table-fs-target"); if (t) openTableFullscreen(t); }}>
      &#x2922;
    </button>
  </div>
</div>`);

// Tableau flex-grow pour couvrir hauteur cartes + butterfly
const _ecoTblWrap = document.createElement("div");
_ecoTblWrap.className = "eco-table-fs-target";
_ecoTblWrap.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;";
_ecoTblWrap.appendChild(renderTable({
  data: echSorted2,
  columns: echColumns2,
  stats: echStats2,
  sortCol: echSortCol2,
  sortAsc: echSortAsc2,
  setSort: setEchSort2,
  compact: true,
  maxHeight: 1800,
  scrollX: true,
  scrollbarTop: true,
  stickyFirstCol: true
}));
display(_ecoTblWrap);
void 0;
```

</div><!-- card -->
</div>
<!-- Fin COLONNE DROITE (search + table ZE) -->

</div>
<!-- &e CARTES_ET_TABLEAU -->

<!-- &s INDICES_100_MULTI — Indice 100 France + territoires sélectionnés -->
<h3 style="margin-top:24px;font-size:16px;text-align:left;">Emploi salarié total — Évolution par secteur (indice base 100)</h3>

<div class="card" style="padding:12px;">

<div style="display:flex;gap:16px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">

```js
// Année base 100
const baseYearOptions = [2014, 2016, 2018, 2020];
const baseYear = view(Inputs.select(baseYearOptions, { value: 2016, label: "Base 100" }));
```

```js
// Filtre secteurs à afficher (défaut: tous sauf agriculture et total)
const sectorOptions = [
  { value: "noAZT", label: "Tous sauf Agri & Total" },
  { value: "noAZ", label: "Tous sauf Agriculture" },
  { value: "all", label: "Tous secteurs" },
  { value: "T", label: "Total seul" },
  { value: "TGU,TOQ", label: "Tertiaires (march. + non-m.)" },
  { value: "TBE,TFZ", label: "Industrie + Construction" },
  { value: "TAZ", label: "Agriculture seule" }
];
const indice100SectorFilter = view(Inputs.select(sectorOptions, { value: "noAZ", label: "Secteurs", format: d => d.label }));
```

```js
// Échelle Y fixe
const indice100FixedScale = view(Inputs.toggle({ label: "Échelle fixe 90-130", value: true }));
```

</div>

```js
// Graph indice 100 : France + territoires sélectionnés côte à côte
const indice100Codes = [...mapSelectionState];

const filterValue = indice100SectorFilter.value;
const parsedSectorFilter = (filterValue === "all" || filterValue === "noAZ" || filterValue === "noAZT")
  ? null
  : filterValue.split(",");
const parsedExcludeSectors = filterValue === "noAZT" ? ["TAZ", "T"]
  : filterValue === "noAZ" ? ["TAZ"]
  : null;

const yDomain = indice100FixedScale ? [90, 130] : null;

const indice100Container = document.createElement('div');
indice100Container.style.cssText = 'display:flex;align-items:flex-start;gap:8px;overflow-x:auto;';

const computeIndice100 = (data, baseYr) => {
  const baseVals = {};
  data.filter(d => d.year === baseYr).forEach(d => {
    baseVals[d.na5] = d.eff;
  });
  return data
    .filter(d => d.year >= baseYr)
    .map(d => ({
      year: d.year, na5: d.na5, lib: d.lib, lib_short: d.lib_short, eff: d.eff,
      indice100: baseVals[d.na5] ? Math.round(d.eff / baseVals[d.na5] * 10000) / 100 : null
    }))
    .filter(d => d.indice100 != null);
};

// France
const franceIndiceData = computeIndice100(eae205FranceSerie, baseYear);
const franceIndiceChart = renderIndice100Chart(franceIndiceData, {
  baseYear, width: 320, height: 240, title: "France métro",
  showTotal: true, showSectors: true,
  sectorFilter: parsedSectorFilter, excludeSectors: parsedExcludeSectors,
  fixedYDomain: yDomain
});
indice100Container.appendChild(franceIndiceChart);

// Territoires sélectionnés (EAE205 ZE)
const buildZeIndice100EAE205 = (code) => {
  const zeD = eae205ZeSerie.filter(d =>
    d.code_ze === code || d.code_ze === code.padStart(4, '0')
  );
  if (!zeD.length) return null;
  return computeIndice100(zeD.map(d => ({
    year: d.year, na5: d.na5, lib: d.lib, lib_short: d.lib_short, eff: d.eff
  })), baseYear);
};

indice100Codes.forEach(code => {
  const zeIndiceData = buildZeIndice100EAE205(code);
  if (zeIndiceData && zeIndiceData.length > 0) {
    const zeChart = renderIndice100Chart(zeIndiceData, {
      baseYear, width: 320, height: 240,
      title: zeLabelMap.get(code) || code,
      showTotal: true, showSectors: true,
      sectorFilter: parsedSectorFilter, excludeSectors: parsedExcludeSectors,
      fixedYDomain: yDomain
    });
    zeChart.style.cssText = 'border-left:1px solid #e5e7eb;padding-left:8px;';
    indice100Container.appendChild(zeChart);
  }
});

if (indice100Codes.length === 0) {
  const hint = document.createElement('div');
  hint.style.cssText = 'padding:15px;background:#f0f9ff;border:1px dashed #93c5fd;border-radius:6px;min-width:200px;height:200px;display:flex;align-items:center;justify-content:center;text-align:center;color:#2563eb;font-size:11px;';
  hint.innerHTML = '<span><strong>Sélectionnez des ZE</strong><br>pour comparer</span>';
  indice100Container.appendChild(hint);
}

display(indice100Container);
```

<p style="font-size:9px;color:#6b7280;margin:6px 0 0 0;">
  Source INSEE EAE205 — Emploi salarié par secteur A5 (Agriculture, Industrie, Construction, Tertiaire marchand, Tertiaire non-marchand).
</p>
</div>
<!-- &e INDICES_100_MULTI -->

<!-- &s GRAPH_BUTTERFLY_POC — POC multi-territoires avec helper -->
<h3 style="margin-top:24px;font-size:16px;text-align:left;">Structure sectorielle — Part et évolution de l'emploi</h3>

<!-- EAE205 A5 + URSSAF — Contrôles dans le card -->
<div class="card" style="padding:12px;margin-bottom:12px;">

<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
<h4 style="margin:0;font-size:14px;color:#1e40af;">Emploi salarié total — 5 grands secteurs</h4>
<div style="display:flex;gap:16px;align-items:center;">

```js
// Niveau URSSAF (A21 ou A38)
const bfNiveauUrssaf = view(Inputs.radio(["A21", "A38"], { value: "A21", label: "URSSAF" }));
```

```js
// Période partagée : EAE205 s'arrête en 2023, URSSAF va jusqu'en 2024
const periodOptions = new Map([
  ["16-23", "16-23/24"],
  ["19-23", "19-23/24"],
  ["22-24", "22-24"]
]);
const bfPeriode = view(Inputs.radio([...periodOptions.keys()], {
  value: "19-23",
  label: "Période",
  format: d => periodOptions.get(d)
}));
```

</div>
</div>

```js
const eaePeriodeLabel = bfPeriode === "22-24" ? "22-23" : bfPeriode;
```

```js
// === EAE205 A5 (5 grands secteurs) ===
const eaeYearStart = bfPeriode === "16-23" ? 2016 : bfPeriode === "22-24" ? 2022 : 2019;
const eaeYearEnd = 2023;

const eaeFranceParts = (() => {
  const startData = eae205FranceSerie.filter(d => d.year === eaeYearStart && d.na5 !== "T");
  const endData = eae205FranceSerie.filter(d => d.year === eaeYearEnd && d.na5 !== "T");
  const endTotal = endData.reduce((s, d) => s + (d.eff || 0), 0);
  return endData.map(d => {
    const startEff = startData.find(s => s.na5 === d.na5)?.eff || d.eff;
    const evol = startEff > 0 ? ((d.eff - startEff) / startEff) * 100 : 0;
    return { secteur: d.lib_short || d.lib, pct: (d.eff / endTotal) * 100, evol, is: 1.0 };
  }).sort((a, b) => b.pct - a.pct);
})();

const eaeTerrParts = [...mapSelectionState].map(code => {
  const codePadded = code.padStart(4, '0');
  const zeStartData = eae205ZeSerie.filter(d =>
    (d.code_ze === code || d.code_ze === codePadded) && d.year === eaeYearStart && d.na5 !== "T"
  );
  const zeEndData = eae205ZeSerie.filter(d =>
    (d.code_ze === code || d.code_ze === codePadded) && d.year === eaeYearEnd && d.na5 !== "T"
  );
  const zeEndTotal = zeEndData.reduce((s, d) => s + (d.eff || 0), 0);
  const data = zeEndData.map(d => {
    const startEff = zeStartData.find(s => s.na5 === d.na5)?.eff || d.eff;
    const evol = startEff > 0 ? ((d.eff - startEff) / startEff) * 100 : 0;
    const localPct = zeEndTotal > 0 ? (d.eff / zeEndTotal) * 100 : 0;
    const frPct = eaeFranceParts.find(f => f.secteur === (d.lib_short || d.lib))?.pct || 1;
    return { secteur: d.lib_short || d.lib, pct: localPct, evol, is: frPct > 0 ? localPct / frPct : 1 };
  }).sort((a, b) => b.pct - a.pct);
  return { label: zeLabelMap.get(code) || code, data };
});

{
  const chart = renderButterflyMulti({
    franceData: eaeFranceParts,
    territories: eaeTerrParts,
    options: { barHeight: 18, widthPart: 105, widthEvol: 105, widthLabels: 110, evolLabel: `Évol. ${eaePeriodeLabel}`, capEvol: 30 }
  });
  if (eaeTerrParts.length === 0) {
    const hint = document.createElement('div');
    hint.style.cssText = 'margin-left:12px;padding:15px 20px;background:#f0f9ff;border:1px dashed #93c5fd;border-radius:6px;display:flex;align-items:center;justify-content:center;text-align:center;color:#2563eb;font-size:11px;min-height:80px;';
    hint.innerHTML = '<span><strong>Sélectionnez des ZE</strong><br>pour comparer</span>';
    chart.appendChild(hint);
  }
  display(chart);
}
```

<p style="font-size:9px;color:#6b7280;margin:6px 0 0 0;">
  Source INSEE EAE205 — Emploi salarié par grand secteur.
</p>
</div>

<!-- URSSAF A21/A38 avec période synchronisée -->
<div class="card" style="padding:12px;">

```js
const urssafPeriode = bfPeriode === "22-24" ? "22-24" : "19-24";
const urssafNote = bfPeriode === "16-23" ? " (URSSAF démarre en 2019)" : "";
display(html`<h4 style="margin:0 0 10px 0;font-size:14px;color:#1e40af;">Emploi privé URSSAF — ${bfNiveauUrssaf}${urssafNote}</h4>`);
```

```js
// === PRÉPARATION DONNÉES BUTTERFLY URSSAF ===
const bfUrssafData = bfNiveauUrssaf === "A21" ? urssafA21 : urssafA38;
const bfUrssafFrData = urssafFr;
const evolColUrssaf = urssafPeriode === "22-24" ? "evol_2224" : "evol_1924";

const bfFranceDataUrssaf = (() => {
  if (bfNiveauUrssaf === "A21") {
    return bfUrssafFrData.toArray()
      .filter(d => d.a21 && d.a21 !== "")
      .map(d => ({ secteur: d.lib, pct: d.pct_24, evol: d[evolColUrssaf], is: 1.0 }));
  } else {
    const a38Data = bfUrssafData.toArray();
    const secteurs = new Map();
    for (const d of a38Data) {
      if (!secteurs.has(d.a38)) {
        secteurs.set(d.a38, { lib: d.lib, fr_pct: d.fr_pct_24, eff_19: 0, eff_22: 0, eff_24: 0 });
      }
      const s = secteurs.get(d.a38);
      s.eff_19 += d.eff_19 || 0;
      s.eff_22 += d.eff_22 || 0;
      s.eff_24 += d.eff_24 || 0;
    }
    return [...secteurs.values()]
      .filter(d => d.fr_pct != null)
      .map(d => {
        const evol = evolColUrssaf === "evol_2224"
          ? (d.eff_22 > 0 ? Math.round(1000 * (d.eff_24 - d.eff_22) / d.eff_22) / 10 : null)
          : (d.eff_19 > 0 ? Math.round(1000 * (d.eff_24 - d.eff_19) / d.eff_19) / 10 : null);
        return { secteur: d.lib, pct: d.fr_pct, evol, is: 1.0 };
      })
      .sort((a, b) => b.pct - a.pct);
  }
})();

const bfTerritoriesUrssaf = [...mapSelectionState].map(code => {
  const rows = bfUrssafData.toArray().filter(d => d.code_ze === code);
  return {
    label: zeLabelMap.get(code) || code,
    data: rows.map(d => ({
      secteur: d.lib, pct: d.pct_24, evol: d[evolColUrssaf],
      is: d.is_24 || (d.pct_24 / (bfFranceDataUrssaf.find(f => f.secteur === d.lib)?.pct || 1))
    }))
  };
});
```

```js
// === RENDU BUTTERFLY CHART URSSAF ===
const evolLabelMap = { "22-24": "Évol. 22-24 (%)", "19-24": "Évol. 19-24 (5 ans)" };
const bfOptionsUrssaf = {
  barHeight: bfNiveauUrssaf === "A21" ? 16 : 12,
  widthPart: 120, widthEvol: 120,
  widthLabels: bfNiveauUrssaf === "A21" ? 100 : 95,
  evolLabel: evolLabelMap[urssafPeriode],
  capEvol: 30
};

{
  const chart = renderButterflyMulti({
    franceData: bfFranceDataUrssaf,
    territories: bfTerritoriesUrssaf,
    options: bfOptionsUrssaf
  });
  if (bfTerritoriesUrssaf.length === 0) {
    const hint = document.createElement('div');
    hint.style.cssText = 'margin-left:12px;padding:15px 20px;background:#f0f9ff;border:1px dashed #93c5fd;border-radius:6px;display:flex;align-items:center;justify-content:center;text-align:center;color:#2563eb;font-size:11px;min-height:80px;';
    hint.innerHTML = '<span><strong>Sélectionnez des ZE</strong><br>pour comparer</span>';
    chart.appendChild(hint);
  }
  display(chart);
}
```

<p style="font-size:9px;color:#6b7280;margin:4px 0 0 0;">
  URSSAF ${bfNiveauUrssaf} — Période ${urssafPeriode}. Part colorée par IS.
</p>
</div>
<!-- &e GRAPH_BUTTERFLY_POC -->

<!-- &s SECTEURS_STRATEGIQUES — Secteurs sur/sous-représentés -->
<h4 style="margin-top:16px;">Secteurs stratégiques — Spécialisation/Sous-représentation</h4>

<div class="card" style="padding:12px;">

```js
// === IDENTIFICATION SECTEURS STRATÉGIQUES ===
const SEUIL_SUREP = 1.2;
const SEUIL_SOUSREP = 0.8;

const zeStrategique = [...mapSelectionState][0];
const zeStrategData = zeStrategique ? floresA21.toArray()
  .filter(d => d.code_ze === zeStrategique)
  .map(d => ({ secteur: d.lib, pct: d.pct_23, is: d.is_23, evol: d.evol_2223 }))
  .filter(d => d.is != null && d.pct > 0.5)
  : [];

const secteursSurRep = zeStrategData.filter(d => d.is >= SEUIL_SUREP).sort((a, b) => b.is - a.is);
const secteursSousRep = zeStrategData.filter(d => d.is <= SEUIL_SOUSREP).sort((a, b) => a.is - b.is);

const renderStratTable = (data, isColor) => {
  const tbl = document.createElement('table');
  tbl.style.cssText = 'width:100%;font-size:11px;border-collapse:collapse;';
  tbl.innerHTML = `<tr style="background:#f3f4f6;font-weight:600;">
    <td style="padding:4px;">Secteur</td>
    <td style="padding:4px;text-align:right;">Part %</td>
    <td style="padding:4px;text-align:right;">IS</td>
    <td style="padding:4px;text-align:right;">Evol.</td>
  </tr>` + data.slice(0, 6).map(d => {
    const evolCol = d.evol > 0 ? '#15803d' : d.evol < 0 ? '#b91c1c' : '#6b7280';
    return `<tr style="border-top:1px solid #e5e7eb;">
      <td style="padding:4px;">${d.secteur}</td>
      <td style="padding:4px;text-align:right;">${d.pct.toFixed(1)}</td>
      <td style="padding:4px;text-align:right;color:${isColor};font-weight:600;">${d.is.toFixed(2)}</td>
      <td style="padding:4px;text-align:right;color:${evolCol};">${d.evol > 0 ? '+' : ''}${d.evol.toFixed(1)}%</td>
    </tr>`;
  }).join('');
  return tbl;
};

const stratContainer = document.createElement('div');
stratContainer.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;';

const surDiv = document.createElement('div');
surDiv.style.cssText = 'flex:1;min-width:280px;';
surDiv.innerHTML = `<h5 style="margin:0 0 8px 0;color:#7c3aed;">Sur-repr. (IS >= ${SEUIL_SUREP})</h5>`;
surDiv.appendChild(renderStratTable(secteursSurRep, '#7c3aed'));

const sousDiv = document.createElement('div');
sousDiv.style.cssText = 'flex:1;min-width:280px;';
sousDiv.innerHTML = `<h5 style="margin:0 0 8px 0;color:#0891b2;">Sous-repr. (IS <= ${SEUIL_SOUSREP})</h5>`;
sousDiv.appendChild(renderStratTable(secteursSousRep, '#0891b2'));

stratContainer.appendChild(surDiv);
stratContainer.appendChild(sousDiv);
display(stratContainer);

const zeName = zeLabelMap.get(zeStrategique) || zeStrategique || "Selectionnez une ZE";
display(html`<p style="font-size:10px;color:#6b7280;margin-top:8px;">
  <strong>${zeName}</strong> — IS = Indice Specialisation (part locale / part France).
</p>`);
```

</div>
<!-- &e SECTEURS_STRATEGIQUES -->

<!-- &s TREEMAP_SECTEURS — Treemap structure sectorielle -->
<h4 style="margin-top:16px;">Structure sectorielle — Treemap A5/A21</h4>

<div style="display:flex;gap:16px;flex-wrap:wrap;">

<!-- Treemap France (FLORES) -->
<div class="card" style="flex:1;min-width:400px;padding:12px;">
<h5 style="margin:0 0 8px 0;">France — FLORES 2023</h5>

```js
const treemapFrData = floresFr.toArray()
  .filter(d => d.a21)
  .map(d => ({ a5: d.a5, a21: d.a21, lib: d.lib, pct: d.pct_23, evol_2223: d.evol_2223 }));

display(renderTreemapA5A21(treemapFrData, {
  width: 500, height: 350, title: "", valueField: "pct"
}));
```

</div>

<!-- Treemap ZE sélectionnée -->
<div class="card" style="flex:1;min-width:400px;padding:12px;">

```js
const treemapZeCode = [...mapSelectionState][0];

if (treemapZeCode) {
  const treemapZeDataRaw = floresA21.toArray().filter(d => d.code_ze === treemapZeCode);
  const treemapZeData = treemapZeDataRaw.map(d => ({
    a5: d.a5, a21: d.a21, lib: d.lib, pct: d.pct_23, evol_2223: d.evol_2223, is_23: d.is_23
  }));
  const treemapZeTitle = zeLabelMap.get(treemapZeCode) || treemapZeCode;
  display(html`<h5 style="margin:0 0 8px 0;">${treemapZeTitle} — FLORES 2023</h5>`);
  display(renderTreemapA5A21(treemapZeData, {
    width: 500, height: 350, title: "", valueField: "pct"
  }));
} else {
  display(html`<h5 style="margin:0 0 8px 0;">Territoire</h5>
    <div style="padding:40px;background:#f0f9ff;border:1px dashed #93c5fd;border-radius:8px;text-align:center;color:#2563eb;font-size:11px;height:280px;display:flex;align-items:center;justify-content:center;">
      <span>Selectionnez une ZE pour voir sa structure sectorielle</span>
    </div>`);
}
```

</div>

</div>

<p style="font-size:9px;color:#6b7280;margin:4px 0 0 0;">
  Treemap : taille des rectangles = part dans l'emploi total. Couleurs par grands secteurs A5. Survoler pour details.
</p>
<!-- &e TREEMAP_SECTEURS -->

</div>
<!-- &e LAYOUT_MAIN -->

<!-- &s SLOPE_CHART_BOTTOM — Structure sectorielle France 2000-2023 -->
<details style="margin-top:24px;">
<summary style="cursor:pointer;font-weight:600;color:#6b7280;">Structure emploi — Evolution sectorielle France</summary>

<div class="card" style="max-width:500px;padding:12px;margin-top:8px;">

```js
display(renderSlopeChart(eae205FranceSlope, {
  yearStart: 2000, yearEnd: 2023, width: 450, height: 250
}));
```

<p style="font-size:9px;color:#6b7280;margin:4px 0 0 0;">
  Source: INSEE Estimations d'emploi (salaries) — France metro. Evolution de la part de chaque grand secteur (A5) dans l'emploi total.
</p>

</div>
</details>
<!-- &e SLOPE_CHART_BOTTOM -->

<!-- &s RESERVE_URSSAF — Ancien graph indice URSSAF (réserve) -->
<details style="margin-top:24px;">
<summary style="cursor:pointer;font-weight:600;color:#6b7280;">Reserve — Emploi prive URSSAF (indice 2014)</summary>

<div class="card" style="margin-top:12px;padding:12px;">
<h4 style="margin:0 0 8px 0;">Emploi prive — Indice base 100 (2014) — URSSAF</h4>

```js
const selectedCodesUrssaf = [...mapSelectionState];

const franceSerie = urssafSerie
  .filter(d => d.echelon === "ze")
  .reduce((acc, d) => {
    if (!acc[d.year]) acc[d.year] = 0;
    acc[d.year] += d.eff_total;
    return acc;
  }, {});

const franceBase = franceSerie[2014] || 1;
const franceDataUrssaf = Object.entries(franceSerie).map(([year, eff]) => ({
  year: +year, value: 100 * eff / franceBase, code: "France", label: "France"
}));

const zeSerieDataUrssaf = selectedCodesUrssaf.flatMap(code => {
  const zeSerie = urssafSerie.filter(d => d.code === code);
  const base = zeSerie.find(d => d.year === 2014)?.eff_total || 1;
  return zeSerie.map(d => ({
    year: d.year, value: 100 * d.eff_total / base, code, label: zeLabelMap.get(code) || code
  }));
});

const allSerieDataUrssaf = [...franceDataUrssaf, ...zeSerieDataUrssaf];

const courbeUrssaf = Plot.plot({
  width: 500, height: 220,
  marginLeft: 50, marginBottom: 30,
  x: { label: null, tickFormat: d => d },
  y: { label: "Indice", domain: [Math.min(95, ...allSerieDataUrssaf.map(d => d.value)), Math.max(115, ...allSerieDataUrssaf.map(d => d.value))] },
  color: { legend: true },
  marks: [
    Plot.ruleY([100], { stroke: "#999", strokeDasharray: "4,2" }),
    Plot.line(allSerieDataUrssaf, { x: "year", y: "value", stroke: "label", strokeWidth: d => d.code === "France" ? 2.5 : 1.5 }),
    Plot.dot(allSerieDataUrssaf.filter(d => d.year === 2024), { x: "year", y: "value", fill: "label", r: 4 }),
    Plot.text(allSerieDataUrssaf.filter(d => d.year === 2024), { x: "year", y: "value", text: d => d.value.toFixed(1), dx: 20, fontSize: 10 })
  ]
});
display(courbeUrssaf);
```

<p style="font-size:9px;color:#6b7280;margin:4px 0 0 0;">
  Source: URSSAF 2014-2024 — Emploi prive
</p>
</div>

</details>
<!-- &e RESERVE_URSSAF -->

<!-- &s PIVOTS_SECTEURS — FLORES + URSSAF cote a cote -->
<details style="margin-top:24px;">
<summary style="cursor:pointer;font-weight:600;color:#6b7280;">Structure sectorielle — Emploi total (FLORES) vs Emploi prive (URSSAF)</summary>

<div style="margin-top:12px;margin-bottom:12px;">

```js
const groupingLevel = view(Inputs.radio(["A5", "A21"], { value: "A21", label: "Niveau" }));
```

</div>

<div style="display:flex;gap:16px;flex-wrap:wrap;">

<!-- FLORES (Emploi total) -->
<div class="card" style="flex:1;min-width:420px;padding:8px;">
<h4 style="margin:0 0 8px 0;">FLORES — Emploi total (2022-2023)</h4>

```js
const isA5Pivot = groupingLevel === "A5";
const floresDataPivot = isA5Pivot ? floresA5 : floresA21;
const floresFrDataPivot = floresFr;

const floresCodesPivot = [...mapSelectionState];
const hasFloresSelectionPivot = floresCodesPivot.length > 0;

const frSectorsPivot = floresFrDataPivot.toArray().map(d => ({
  a5: d.a5, a21: d.a21, lib: d.lib, ord: d.ord_a21 || d.ord_a5,
  fr_pct: d.pct_23, fr_evol: d.evol_2223
}));

const floresPivotData = (() => {
  const sectors = new Map();
  for (const s of frSectorsPivot) {
    const key = isA5Pivot ? s.a5 : s.a21;
    sectors.set(key, {
      code: key, lib: s.lib, ord: s.ord,
      fr_pct: s.fr_pct, fr_evol: s.fr_evol,
      territories: {}
    });
  }
  if (hasFloresSelectionPivot) {
    const zeRows = floresDataPivot.toArray().filter(d => floresCodesPivot.includes(d.code_ze));
    for (const r of zeRows) {
      const key = isA5Pivot ? r.a5 : r.a21;
      if (sectors.has(key)) {
        sectors.get(key).territories[r.code_ze] = { pct: r.pct_23, evol: r.evol_2223, is: r.is_23 };
      }
    }
  }
  return [...sectors.values()].sort((a, b) => (a.ord || 0) - (b.ord || 0));
})();

const floresHeadersPivot = ['Secteur', 'FR %', 'Evol.'];
if (hasFloresSelectionPivot) floresCodesPivot.forEach(c => {
  floresHeadersPivot.push(zeLabelMap.get(c)?.slice(0, 12) || c);
  floresHeadersPivot.push('IS');
});

const floresRowsPivot = floresPivotData.map((row, i) => {
  const cells = [
    `<td style="padding:4px 6px;font-weight:500;">${row.lib}</td>`,
    `<td style="text-align:right;padding:4px 6px;">${row.fr_pct?.toFixed(1) ?? '-'}</td>`,
    `<td style="text-align:right;padding:4px 6px;color:${row.fr_evol > 0 ? '#059669' : row.fr_evol < 0 ? '#dc2626' : '#6b7280'};">${row.fr_evol > 0 ? '+' : ''}${row.fr_evol?.toFixed(1) ?? '-'}</td>`
  ];
  if (hasFloresSelectionPivot) {
    floresCodesPivot.forEach(c => {
      const t = row.territories[c];
      const is = t?.is ?? null;
      const barW = is ? Math.min(Math.abs(is - 1) * 50, 40) : 0;
      const barCol = is > 1 ? '#8b5cf6' : '#10b981';
      cells.push(`<td style="text-align:right;padding:4px 6px;border-left:1px solid #e2e8f0;">${t?.pct?.toFixed(1) ?? '-'}</td>`);
      cells.push(`<td style="text-align:right;padding:4px 2px;position:relative;"><span style="position:relative;z-index:1;">${is?.toFixed(2) ?? '-'}</span>${is ? `<div style="position:absolute;top:2px;bottom:2px;${is > 1 ? 'right' : 'left'}:50%;width:${barW}px;background:${barCol};opacity:0.3;"></div>` : ''}</td>`);
    });
  }
  return `<tr style="border-bottom:1px solid #f1f5f9;${i % 2 ? 'background:#fafafa;' : ''}">${cells.join('')}</tr>`;
});

const floresTableHtmlPivot = `
<table style="width:100%;border-collapse:collapse;font-size:11px;">
  <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
    ${floresHeadersPivot.map((h, i) => `<th style="text-align:${i === 0 ? 'left' : 'right'};padding:4px 6px;${i > 2 && i % 2 === 1 ? 'border-left:1px solid #e2e8f0;' : ''}">${h}</th>`).join('')}
  </tr></thead>
  <tbody>${floresRowsPivot.join('')}</tbody>
</table>`;

const floresDivPivot = document.createElement('div');
floresDivPivot.style.cssText = 'max-height:350px;overflow:auto;';
floresDivPivot.innerHTML = floresTableHtmlPivot;
display(floresDivPivot);
```

</div>

<!-- URSSAF (Emploi prive) -->
<div class="card" style="flex:1;min-width:420px;padding:8px;">
<h4 style="margin:0 0 8px 0;">URSSAF — Emploi prive (2019-2024)</h4>

```js
const isA5Upivot = groupingLevel === "A5";
const pivotCodesUpivot = [...mapSelectionState];
const hasSelectionUpivot = pivotCodesUpivot.length > 0;
const urssafDataUpivot = isA5Upivot ? urssafA5 : urssafA21;
const urssafFrDataPivot = urssafFr;

const frSectorsUpivot = urssafFrDataPivot.toArray().map(d => ({
  a5: d.a5, a21: d.a21, lib: d.lib, ord: d.ord_a21 || d.ord_a5,
  fr_pct: d.pct_24, fr_evol_1924: d.evol_1924, fr_evol_2224: d.evol_2224
}));

const urssafPivotData = (() => {
  const sectors = new Map();
  for (const s of frSectorsUpivot) {
    const key = isA5Upivot ? s.a5 : s.a21;
    sectors.set(key, {
      code: key, lib: s.lib, ord: s.ord,
      fr_pct: s.fr_pct, fr_evol_1924: s.fr_evol_1924, fr_evol_2224: s.fr_evol_2224,
      territories: {}
    });
  }
  if (hasSelectionUpivot) {
    const zeRows = urssafDataUpivot.toArray().filter(d => pivotCodesUpivot.includes(d.code_ze));
    for (const r of zeRows) {
      const key = isA5Upivot ? r.a5 : r.a21;
      if (sectors.has(key)) {
        sectors.get(key).territories[r.code_ze] = {
          pct: r.pct_24, evol_1924: r.evol_1924, evol_2224: r.evol_2224, is: r.is_24
        };
      }
    }
  }
  return [...sectors.values()].sort((a, b) => (a.ord || 0) - (b.ord || 0));
})();

const urssafHeadersPivot = ['Secteur', 'FR %', '19-24', '22-24'];
if (hasSelectionUpivot) pivotCodesUpivot.forEach(c => {
  urssafHeadersPivot.push(zeLabelMap.get(c)?.slice(0, 12) || c);
  urssafHeadersPivot.push('IS');
});

const urssafRowsPivot = urssafPivotData.map((row, i) => {
  const evol1924Col = row.fr_evol_1924 > 0 ? '#059669' : row.fr_evol_1924 < 0 ? '#dc2626' : '#6b7280';
  const evol2224Col = row.fr_evol_2224 > 0 ? '#059669' : row.fr_evol_2224 < 0 ? '#dc2626' : '#6b7280';
  const cells = [
    `<td style="padding:4px 6px;font-weight:500;">${row.lib}</td>`,
    `<td style="text-align:right;padding:4px 6px;">${row.fr_pct?.toFixed(1) ?? '-'}</td>`,
    `<td style="text-align:right;padding:4px 6px;color:${evol1924Col};">${row.fr_evol_1924 > 0 ? '+' : ''}${row.fr_evol_1924?.toFixed(1) ?? '-'}</td>`,
    `<td style="text-align:right;padding:4px 6px;color:${evol2224Col};">${row.fr_evol_2224 > 0 ? '+' : ''}${row.fr_evol_2224?.toFixed(1) ?? '-'}</td>`
  ];
  if (hasSelectionUpivot) {
    pivotCodesUpivot.forEach(c => {
      const t = row.territories[c];
      const is = t?.is ?? null;
      const barW = is ? Math.min(Math.abs(is - 1) * 50, 40) : 0;
      const barCol = is > 1 ? '#8b5cf6' : '#10b981';
      cells.push(`<td style="text-align:right;padding:4px 6px;border-left:1px solid #e2e8f0;">${t?.pct?.toFixed(1) ?? '-'}</td>`);
      cells.push(`<td style="text-align:right;padding:4px 2px;position:relative;"><span style="position:relative;z-index:1;">${is?.toFixed(2) ?? '-'}</span>${is ? `<div style="position:absolute;top:2px;bottom:2px;${is > 1 ? 'right' : 'left'}:50%;width:${barW}px;background:${barCol};opacity:0.3;"></div>` : ''}</td>`);
    });
  }
  return `<tr style="border-bottom:1px solid #f1f5f9;${i % 2 ? 'background:#fafafa;' : ''}">${cells.join('')}</tr>`;
});

const urssafTableHtmlPivot = `
<table style="width:100%;border-collapse:collapse;font-size:11px;">
  <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
    ${urssafHeadersPivot.map((h, i) => `<th style="text-align:${i === 0 ? 'left' : 'right'};padding:4px 6px;${i > 3 && i % 2 === 0 ? 'border-left:1px solid #e2e8f0;' : ''}" title="${i === 2 ? 'Evolution 2019-2024' : i === 3 ? 'Evolution 2022-2024' : ''}">${h}</th>`).join('')}
  </tr></thead>
  <tbody>${urssafRowsPivot.join('')}</tbody>
</table>`;

const urssafDivPivot = document.createElement('div');
urssafDivPivot.style.cssText = 'max-height:350px;overflow:auto;';
urssafDivPivot.innerHTML = urssafTableHtmlPivot;
display(urssafDivPivot);
```

</div>

</div>

<p style="font-size:10px;color:#6b7280;margin-top:8px;">
  <strong>IS</strong> = Indice de Specialisation (part ZE / part France). IS > 1 = surrepresentation (violet), IS < 1 = sous-representation (vert).
</p>

</details>
<!-- &e PIVOTS_SECTEURS -->
