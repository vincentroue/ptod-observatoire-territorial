bar;;;;;;;;;;;;;;;;;;;;
title: OTTD — Attractivité;;;;;;;;;;;;;;;;;;;;
toc: false;;;;;;;;;;;;;;;;;;;;
theme: dashboard;;;;;;;;;;;;;;;;;;;;
style: styles/dashboard-light.css;;;;;;;;;;;;;;;;;;;;
---;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
<!-- ============================================================;;;;;;;;;;;;;;;;;;;;
     Volet Attractivité résidentielle et productive — ZE;;;;;;;;;;;;;;;;;;;;
     Date: 2026-02-12 | v0.1 POC;;;;;;;;;;;;;;;;;;;;
     Layout: Sidebar | Flex[cartes+scatter(switch) | table ZE];;;;;;;;;;;;;;;;;;;;
     Indices: idxresid_dyn_ind, idxeco_soc_ind, idxgentri_ind, idxlogtens_ind;;;;;;;;;;;;;;;;;;;;
     3 scatter switchables : Niveau actuel / Trajectoire delta / Combiné;;;;;;;;;;;;;;;;;;;;
     ============================================================ -->;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
<!-- &s BANNER -->;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
"import { createBanner, createNav, OTTD_PAGES } from ""./helpers/layout.js""";;;;;;;;;;;;;;;;;;;;
display(createBanner({;;;;;;;;;;;;;;;;;;;;
"  title: ""OTTD — Attractivité résidentielle et productive"",";;;;;;;;;;;;;;;;;;;;
"  subtitle: ""Quelles trajectoires territoriales depuis 2011 ?"",";;;;;;;;;;;;;;;;;;;;
  navElement: createNav(OTTD_PAGES, 'exdattract'),;;;;;;;;;;;;;;;;;;;;
"  sourcesText: ""? Sources"",";;;;;;;;;;;;;;;;;;;;
"  sourcesTooltip: ""INSEE RP 2011/16/22/23, MIGCOM 2016/2022, URSSAF 2014-2024, DVF 2016-2024, SIDE 2017-2024""";;;;;;;;;;;;;;;;;;;;
}));;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
<!-- &e BANNER -->;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
<!-- &s IMPORTS -->;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
"import * as topojson from ""npm:topojson-client""";;;;;;;;;;;;;;;;;;;;
"import rewind from ""npm:@mapbox/geojson-rewind""";;;;;;;;;;;;;;;;;;;;
"import * as Plot from ""npm:@observablehq/plot""";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"import { getEchelonMeta, getLabelMap, setLabelMap, getFranceData, getDataNoFrance } from ""./helpers/0loader.js""";;;;;;;;;;;;;;;;;;;;
"import { getDefaultZoomCode, DENS_COLORS, DENS_LABELS } from ""./helpers/constants.js""";;;;;;;;;;;;;;;;;;;;
"import { getPeriodesForIndicateur, getDefaultPeriode, buildColKey, getIndicLabel, getPeriodeLabel } from ""./helpers/selectindic.js""";;;;;;;;;;;;;;;;;;;;
"import { formatValue, INDICATEURS, getIndicOptionsByAggDash } from ""./helpers/indicators-ddict-js.js""";;;;;;;;;;;;;;;;;;;;
"import { computeIndicBins, countBins, createGradientScale, GRADIENT_PALETTES, computeEcartFrance, PAL_ECART_FRANCE, ECART_FRANCE_SYMBOLS } from ""./helpers/colors.js""";;;;;;;;;;;;;;;;;;;;
"import { createBinsLegend, createGradientLegend, createEcartFranceLegend } from ""./helpers/legend.js""";;;;;;;;;;;;;;;;;;;;
"import { renderChoropleth, createMapWrapper, addZoomBehavior } from ""./helpers/maps.js""";;;;;;;;;;;;;;;;;;;;
"import { createSearchBox } from ""./helpers/search.js""";;;;;;;;;;;;;;;;;;;;
"import { sortTableData, computeBarStats, getIndicUnit, renderTable, exportCSV, openTableFullscreen } from ""./helpers/0table.js""";;;;;;;;;;;;;;;;;;;;
"import { exportSVG } from ""./helpers/graph-options.js""";;;;;;;;;;;;;;;;;;;;
"import { createScatterWithZoom } from ""./helpers/scatter.js""";;;;;;;;;;;;;;;;;;;;
"import { autoSizeScale, createSizeLegendVertical } from ""./helpers/size-scale.js""";;;;;;;;;;;;;;;;;;;;
"import { createSelectionManager } from ""./helpers/selection.js""";;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
<!-- &e IMPORTS -->;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
<!-- &s FILE_HANDLES -->;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
"const ZE_DATA = FileAttachment(""data/agg_ze.json"")";;;;;;;;;;;;;;;;;;;;
"const ZE_TOPO = FileAttachment(""data/nodom_zones-emploi_2025.topojson"")";;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
<!-- &e FILE_HANDLES -->;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
<!-- &s INIT -->;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
const zeData = await ZE_DATA.json();;;;;;;;;;;;;;;;;;;;
const zeTopo = await ZE_TOPO.json();;;;;;;;;;;;;;;;;;;;
const zeGeo = rewind(topojson.feature(zeTopo, zeTopo.objects.data), true);;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const zeLabelMap = new Map();;;;;;;;;;;;;;;;;;;;
zeData.forEach(d => d.code && d.libelle && zeLabelMap.set(String(d.code), d.libelle));;;;;;;;;;;;;;;;;;;;
"setLabelMap(""Zone d'emploi"", zeLabelMap)";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const frData = getFranceData(zeData);;;;;;;;;;;;;;;;;;;;
const dataNoFrance = getDataNoFrance(zeData);;;;;;;;;;;;;;;;;;;;
"const meta = getEchelonMeta(""Zone d'emploi"")";;;;;;;;;;;;;;;;;;;;
const AVAILABLE_COLUMNS = new Set(Object.keys(zeData[0] || {}));;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
// === INDICATEURS ATTRACTIVITÉ (hardcoded POC) ===;;;;;;;;;;;;;;;;;;;;
// Résidentiel T1/T2;;;;;;;;;;;;;;;;;;;;
"const COL_RESID_T1 = ""idxresid_dyn_ind_1116""";;;;;;;;;;;;;;;;;;;;
"const COL_RESID_T2 = ""idxresid_dyn_ind_1623""";;;;;;;;;;;;;;;;;;;;
// Productif T1/T2;;;;;;;;;;;;;;;;;;;;
"const COL_ECO_T1 = ""idxeco_soc_ind_1116""";;;;;;;;;;;;;;;;;;;;
"const COL_ECO_T2 = ""idxeco_soc_ind_1622""";;;;;;;;;;;;;;;;;;;;
// Complémentaires;;;;;;;;;;;;;;;;;;;;
"const COL_GENTRI_T2 = ""idxgentri_ind_1622""";;;;;;;;;;;;;;;;;;;;
"const COL_LOGTENS = ""idxlogtens_ind_22""";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
// Delta (trajectoire) : T2 - T1;;;;;;;;;;;;;;;;;;;;
const dataWithDelta = dataNoFrance.map(d => ({;;;;;;;;;;;;;;;;;;;;
  ...d,;;;;;;;;;;;;;;;;;;;;
  delta_resid: (d[COL_RESID_T2] != null && d[COL_RESID_T1] != null) ? d[COL_RESID_T2] - d[COL_RESID_T1] : null,;;;;;;;;;;;;;;;;;;;;
  delta_eco: (d[COL_ECO_T2] != null && d[COL_ECO_T1] != null) ? d[COL_ECO_T2] - d[COL_ECO_T1] : null;;;;;;;;;;;;;;;;;;;;
}));;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
// Delta moyen (pour scatter 3 : couleur = progression globale);;;;;;;;;;;;;;;;;;;;
const dataWithDeltaGlobal = dataWithDelta.map(d => ({;;;;;;;;;;;;;;;;;;;;
  ...d,;;;;;;;;;;;;;;;;;;;;
  delta_global: (d.delta_resid != null && d.delta_eco != null) ? (d.delta_resid + d.delta_eco) / 2 : null,;;;;;;;;;;;;;;;;;;;;
  delta_amplitude: (d.delta_resid != null && d.delta_eco != null) ? Math.sqrt(d.delta_resid ** 2 + d.delta_eco ** 2) : null;;;;;;;;;;;;;;;;;;;;
}));;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
// Colonnes KPI/table fixes;;;;;;;;;;;;;;;;;;;;
const defaultTableCols = [;;;;;;;;;;;;;;;;;;;;
  COL_RESID_T2, COL_ECO_T2, COL_RESID_T1, COL_ECO_T1,;;;;;;;;;;;;;;;;;;;;
  COL_GENTRI_T2, COL_LOGTENS;;;;;;;;;;;;;;;;;;;;
].filter(c => AVAILABLE_COLUMNS.has(c));;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
// Options indicateurs pour sidebar (tous ceux du dashboard principal);;;;;;;;;;;;;;;;;;;;
const attractIndicOptions = getIndicOptionsByAggDash();;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
<!-- &e INIT -->;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
<!-- &s STATE -->;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
"const mapSelectionState = Mutable(new Set([""5315"", ""1109""]))";;;;;;;;;;;;;;;;;;;;
"const zoomTargetState = Mutable(""5315"")";;;;;;;;;;;;;;;;;;;;
const sortState = Mutable({ col: COL_RESID_T2, asc: false });;;;;;;;;;;;;;;;;;;;
const pageState = Mutable(0);;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const selectionMgr = createSelectionManager(mapSelectionState, zoomTargetState, pageState);;;;;;;;;;;;;;;;;;;;
const { addToSelection, removeFromSelection, setZoomOnly, toggleMapSelection, clearMapSelection } = selectionMgr;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const setSort = (col) => {;;;;;;;;;;;;;;;;;;;;
  const curr = sortState.value.col;;;;;;;;;;;;;;;;;;;;
  const asc = sortState.value.asc;;;;;;;;;;;;;;;;;;;;
  sortState.value = curr === col ? { col, asc: !asc } : { col, asc: false };;;;;;;;;;;;;;;;;;;;
  pageState.value = 0;;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
<!-- &e STATE -->;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
<!-- &s SUB_BANNER_STYLES -->;;;;;;;;;;;;;;;;;;;;
<style>;;;;;;;;;;;;;;;;;;;;
.table-help-wrap { display: inline-block; position: relative; vertical-align: middle; margin-left: 6px; };;;;;;;;;;;;;;;;
.table-help-icon {;;;;;;;;;;;;;;;;;;;;
  display: inline-flex; align-items: center; justify-content: center;;;;;;;;;;;;;;;;;;
  width: 16px; height: 16px; border-radius: 50%;;;;;;;;;;;;;;;;;;
  background: #e5e7eb; color: #6b7280;;;;;;;;;;;;;;;;;;;
  font-size: 11px; font-weight: 700; cursor: help;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
.table-help-wrap .help-tooltip {;;;;;;;;;;;;;;;;;;;;
  display: none; position: absolute;;;;;;;;;;;;;;;;;;;
  top: 22px; left: -8px; z-index: 100;;;;;;;;;;;;;;;;;;
  background: white; border: 1px solid #d1d5db;;;;;;;;;;;;;;;;;;;
  border-radius: 6px; padding: 10px 14px;;;;;;;;;;;;;;;;;;;
  font-size: 12px; font-weight: 400;;;;;;;;;;;;;;;;;;;
  width: 310px; line-height: 1.6;;;;;;;;;;;;;;;;;;;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
.table-help-wrap:hover .help-tooltip { display: block; };;;;;;;;;;;;;;;;;;;
/* Scatter switch buttons */;;;;;;;;;;;;;;;;;;;;
.scatter-switch { display: flex; gap: 0; margin: 8px 0 4px 0; };;;;;;;;;;;;;;;;;
.scatter-switch button {;;;;;;;;;;;;;;;;;;;;
  padding: 5px 14px; font-size: 11px; font-weight: 500;;;;;;;;;;;;;;;;;;
  border: 1px solid #d1d5db; background: #f9fafb; color: #374151;;;;;;;;;;;;;;;;;;
  cursor: pointer; transition: all 0.15s;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
.scatter-switch button:first-child { border-radius: 4px 0 0 4px; };;;;;;;;;;;;;;;;;;;
.scatter-switch button:last-child { border-radius: 0 4px 4px 0; };;;;;;;;;;;;;;;;;;;
.scatter-switch button:not(:first-child) { border-left: none; };;;;;;;;;;;;;;;;;;;
.scatter-switch button.active {;;;;;;;;;;;;;;;;;;;;
  background: #1e40af; color: white; border-color: #1e40af;;;;;;;;;;;;;;;;;;
  font-weight: 600;;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
.scatter-switch button:hover:not(.active) { background: #e5e7eb; };;;;;;;;;;;;;;;;;;;
</style>;;;;;;;;;;;;;;;;;;;;
<!-- &e SUB_BANNER_STYLES -->;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
<!-- Styles sidebar -->;;;;;;;;;;;;;;;;;;;;
<style>;;;;;;;;;;;;;;;;;;;;
.sidebar {;;;;;;;;;;;;;;;;;;;;
  overflow-x: hidden !important;;;;;;;;;;;;;;;;;;;;
  overflow-y: auto !important;;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
.sidebar select {;;;;;;;;;;;;;;;;;;;;
  font-size: 12px !important;;;;;;;;;;;;;;;;;;;;
  background: #fff !important;;;;;;;;;;;;;;;;;;;;
  border: 1px solid #e2e8f0 !important;;;;;;;;;;;;;;;;;;;;
  width: 100% !important;;;;;;;;;;;;;;;;;;;;
  box-sizing: border-box !important;;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
.sidebar select[multiple] {;;;;;;;;;;;;;;;;;;;;
  height: 280px !important;;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
.sidebar form {;;;;;;;;;;;;;;;;;;;;
  width: 100% !important;;;;;;;;;;;;;;;;;;;;
  max-width: 260px !important;;;;;;;;;;;;;;;;;;;;
  box-sizing: border-box !important;;;;;;;;;;;;;;;;;;;;
  margin: 0 0 3px 0 !important;;;;;;;;;;;;;;;;;;;;
  padding: 0 !important;;;;;;;;;;;;;;;;;;;;
  align-items: center !important;;;;;;;;;;;;;;;;;;;;
  gap: 0 6px !important;;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
.sidebar form > label:first-child {;;;;;;;;;;;;;;;;;;;;
  max-width: 250px !important;;;;;;;;;;;;;;;;;;;;
  margin: 0 !important;;;;;;;;;;;;;;;;;;;;
  padding: 0 !important;;;;;;;;;;;;;;;;;;;;
  font-size: 12px !important;;;;;;;;;;;;;;;;;;;;
  line-height: 1.2 !important;;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
.sidebar form > div,;;;;;;;;;;;;;;;;;;;;
.sidebar form > select,;;;;;;;;;;;;;;;;;;;;
.sidebar form > input {;;;;;;;;;;;;;;;;;;;;
  margin-top: 0 !important;;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
".sidebar form > div[style*=""flex""] label {";;;;;;;;;;;;;;;;;;;;
  overflow: visible !important;;;;;;;;;;;;;;;;;;;;
  white-space: nowrap !important;;;;;;;;;;;;;;;;;;;;
  font-size: 11px !important;;;;;;;;;;;;;;;;;;;;
  margin: 0 !important;;;;;;;;;;;;;;;;;;;;
  padding: 0 !important;;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
.sidebar .panel { margin-bottom: 6px !important; };;;;;;;;;;;;;;;;;;;
.sidebar .panel-title { margin-bottom: 2px !important; };;;;;;;;;;;;;;;;;;;
</style>;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
<!-- &s SIDEBAR -->;;;;;;;;;;;;;;;;;;;;
"<aside class=""sidebar"">";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"<section class=""panel"">";;;;;;;;;;;;;;;;;;;;
"<div class=""panel-title"">ÉCHELON</div>";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
"const echelon = view(Inputs.radio([""Zone d'emploi""], { value: ""Zone d'emploi"", label: """" }))";;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
</section>;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"<section class=""panel"">";;;;;;;;;;;;;;;;;;;;
"<div class=""panel-title"">CARTE GAUCHE</div>";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
"const indic1 = view(Inputs.select(attractIndicOptions, { value: ""idxresid_dyn_ind"", label: ""Indicateur"" }))";;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
const perMap1 = getPeriodesForIndicateur(indic1);;;;;;;;;;;;;;;;;;;;
"const periode1 = view(Inputs.select(perMap1, { value: [...perMap1.values()][0], label: ""Période"" }))";;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
"const _cm1Input = Inputs.radio([""%"", ""±Fr."", ""Grad.""], { value: ""%"", label: ""Palette"" })";;;;;;;;;;;;;;;;;;;;
"{ const d = _cm1Input.querySelector("":scope > div"")";" if (d) { d.style.cssText = ""display:flex";gap:6px;"""; d.querySelectorAll(""label"").forEach(l => l.style.display = ""inline"")"; } };;;;;;;;;;;;;;;;
const colorMode1 = view(_cm1Input);;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
</section>;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"<section class=""panel"">";;;;;;;;;;;;;;;;;;;;
"<div class=""panel-title"">CARTE DROITE</div>";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
"const indic2 = view(Inputs.select(attractIndicOptions, { value: ""idxeco_soc_ind"", label: ""Indicateur"" }))";;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
const perMap2 = getPeriodesForIndicateur(indic2);;;;;;;;;;;;;;;;;;;;
"const periode2 = view(Inputs.select(perMap2, { value: [...perMap2.values()][0], label: ""Période"" }))";;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
"const _cm2Input = Inputs.radio([""%"", ""±Fr."", ""Grad.""], { value: ""±Fr."", label: ""Palette"" })";;;;;;;;;;;;;;;;;;;;
"{ const d = _cm2Input.querySelector("":scope > div"")";" if (d) { d.style.cssText = ""display:flex";gap:6px;"""; d.querySelectorAll(""label"").forEach(l => l.style.display = ""inline"")"; } };;;;;;;;;;;;;;;;
const colorMode2 = view(_cm2Input);;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
</section>;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"<section class=""panel"">";;;;;;;;;;;;;;;;;;;;
"<div class=""panel-title"">SÉLECTION ZE</div>";;;;;;;;;;;;;;;;;;;;
"<div id=""search-container-attract"" style=""margin-top:6px";min-height:100px;"""></div>
</section>

<section class=""panel"">";;;;;;;;;;;;;;;;;;
"<div class=""panel-title"">OPTIONS CARTES</div>";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
"const showValuesOnMap = view(Inputs.toggle({ label: ""Show labels"", value: true }))";;;;;;;;;;;;;;;;;;;;
const labelBy = view(Inputs.select(new Map([;;;;;;;;;;;;;;;;;;;;
"  [""Principaux terr."", ""population""],";;;;;;;;;;;;;;;;;;;;
"  [""Top 20 + Bot 20"", ""top5_bot5""],";;;;;;;;;;;;;;;;;;;;
"  [""Top 20 indic"", ""indicator_top""],";;;;;;;;;;;;;;;;;;;;
"  [""Bottom 20 indic"", ""indicator_bottom""]";;;;;;;;;;;;;;;;;;;;
"]), { value: ""population"", label: ""Labels"" }))";;;;;;;;;;;;;;;;;;;;
"const _lmInput = Inputs.radio([""both"", ""val."", ""noms""], { value: ""both"", label: ""Contenu"" })";;;;;;;;;;;;;;;;;;;;
"{ const d = _lmInput.querySelector("":scope > div"")";" if (d) { d.style.cssText = ""display:flex";gap:4px;"""; d.querySelectorAll(""label"").forEach(l => { l.style.display = ""inline""";" l.style.fontSize = ""11px"""; }); } };;;;;;;;;;;;;;
const labelMode = view(_lmInput);;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
</section>;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"<section class=""panel"">";;;;;;;;;;;;;;;;;;;;
"<div class=""panel-title"">INDICATEURS TABLEAU <span class=""table-help-wrap""><span class=""table-help-icon"">?</span><span class=""help-tooltip"">ctrl/shift click pour multi-sélection</span></span></div>";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
const extraIndics = view(Inputs.select(;;;;;;;;;;;;;;;;;;;;
  attractIndicOptions,;;;;;;;;;;;;;;;;;;;;
"  { label: """", multiple: true, value: [], width: 230 }";;;;;;;;;;;;;;;;;;;;
));;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
</section>;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
</aside>;;;;;;;;;;;;;;;;;;;;
<!-- &e SIDEBAR -->;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
<!-- &s LAYOUT_MAIN -->;;;;;;;;;;;;;;;;;;;;
"<div class=""layout-main"" style=""margin-top:0";""">

```js
// === SOUS-BANNIÈRE + KPI TABLE ===
const _sbBlock = document.createElement(""div"")";;;;;;;;;;;;;;;;;;;
"_sbBlock.style.cssText = ""margin:-6px -20px 0 -16px";padding:0;""";

const _sbBar = document.createElement(""div"")";;;;;;;;;;;;;;;;;;
"_sbBar.style.cssText = ""background:#e8eaed";padding:5px 16px;font-size:11px;color:#374151;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;gap:16px;""";
_sbBar.innerHTML = `<span style=""font-weight:600";""">Indices d'attractivité</span><span style=""color:#6b7280";""">France + ZE sélectionnées · Résidentiel (MIGCOM) + Productif (RP+URSSAF+SIDE) · 2011→2022/23</span>`;
_sbBlock.appendChild(_sbBar);

const kpiSelCodes = [...mapSelectionState].slice(0, 5);
const kpiSelData = kpiSelCodes.map(c => dataNoFrance.find(d => d.code === c)).filter(Boolean);
const kpiData = [frData, ...kpiSelData].filter(Boolean);

const kpiCols = [
  { key: ""libelle"", label: """", type: ""text"", width: 120 },";;;;;;;;;;
  ...defaultTableCols.map(col => {;;;;;;;;;;;;;;;;;;;;
"    const indicK = col.replace(/_\d+$/, """")";;;;;;;;;;;;;;;;;;;;
"    const per = col.match(/_(\d{2,4})$/)?.[1] || """"";;;;;;;;;;;;;;;;;;;;
"    return { key: col, label: getIndicLabel(indicK, ""medium""), unit: getIndicUnit(col), periode: per ? getPeriodeLabel(per, ""short"") : """" }";;;;;;;;;;;;;;;;;;;;
  });;;;;;;;;;;;;;;;;;;;
];;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const kpiStats = computeBarStats(dataNoFrance, defaultTableCols);;;;;;;;;;;;;;;;;;;;
const kpiTable = renderTable({;;;;;;;;;;;;;;;;;;;;
  data: kpiData, columns: kpiCols, stats: kpiStats,;;;;;;;;;;;;;;;;;;;;
  compact: true, maxHeight: 160, scrollX: true, stickyFirstCol: 1;;;;;;;;;;;;;;;;;;;;
});;;;;;;;;;;;;;;;;;;;
"const _kpiWrap = document.createElement(""div"")";;;;;;;;;;;;;;;;;;;;
"_kpiWrap.style.cssText = ""padding:0 16px";background:#fff;""";
kpiTable.style.cssText = (kpiTable.style.cssText || """") + ""background:#fff";width:100%;""";
_kpiWrap.appendChild(kpiTable);
_sbBlock.appendChild(_kpiWrap);
display(_sbBlock);
```

```js
// === DONNÉES + BINDINGS ===
const colKey1 = buildColKey(indic1, periode1);
const colKey2 = buildColKey(indic2, periode2);
const indicLabel = getIndicLabel(indic1, ""medium"")";;;;;;;;;;;;;;;;
"const indicLabel2 = getIndicLabel(indic2, ""medium"")";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
// Joindre données aux géométries;;;;;;;;;;;;;;;;;;;;
for (const f of zeGeo.features) {;;;;;;;;;;;;;;;;;;;;
  const row = dataNoFrance.find(d => d.code === f.properties[meta.geoKey]);;;;;;;;;;;;;;;;;;;;
  if (row) {;;;;;;;;;;;;;;;;;;;;
    f.properties[colKey1] = row[colKey1];;;;;;;;;;;;;;;;;;;;
    f.properties[colKey2] = row[colKey2];;;;;;;;;;;;;;;;;;;;
    f.properties.P23_POP = row.P23_POP;;;;;;;;;;;;;;;;;;;;
  };;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
// Bins et couleurs — CARTE 1;;;;;;;;;;;;;;;;;;;;
const indicBins = computeIndicBins(dataNoFrance, colKey1, indic1);;;;;;;;;;;;;;;;;;;;
const { bins, palette: PAL, isDiv, getColor: getColorBins } = indicBins;;;;;;;;;;;;;;;;;;;;
const gradient = createGradientScale(dataNoFrance, colKey1);;;;;;;;;;;;;;;;;;;;
"const isGradient = colorMode1 === ""Grad.""";;;;;;;;;;;;;;;;;;;;
"const isEcart = colorMode1 === ""±Fr.""";;;;;;;;;;;;;;;;;;;;
const ecart = computeEcartFrance(dataNoFrance, colKey1, frData?.[colKey1], { indicType: INDICATEURS[indic1]?.type });;;;;;;;;;;;;;;;;;;;
const getColor = isEcart ? ecart.getColor : isGradient ? gradient.getColor : getColorBins;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
// Bins et couleurs — CARTE 2;;;;;;;;;;;;;;;;;;;;
const indicBins2 = computeIndicBins(dataNoFrance, colKey2, indic2);;;;;;;;;;;;;;;;;;;;
const gradient2 = createGradientScale(dataNoFrance, colKey2);;;;;;;;;;;;;;;;;;;;
"const isGradient2 = colorMode2 === ""Grad.""";;;;;;;;;;;;;;;;;;;;
"const isEcart2 = colorMode2 === ""±Fr.""";;;;;;;;;;;;;;;;;;;;
const ecart2 = computeEcartFrance(dataNoFrance, colKey2, frData?.[colKey2], { indicType: INDICATEURS[indic2]?.type });;;;;;;;;;;;;;;;;;;;
const getColor2 = isEcart2 ? ecart2.getColor : isGradient2 ? gradient2.getColor : indicBins2.getColor;;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
// === SIDEBAR SEARCH ===;;;;;;;;;;;;;;;;;;;;
const searchData = dataNoFrance.map(d => ({ code: d.code, label: d.libelle || d.code, pop: d.P23_POP }));;;;;;;;;;;;;;;;;;;;
const searchBox = createSearchBox({;;;;;;;;;;;;;;;;;;;;
  data: searchData, selection: mapSelectionState, onToggle: toggleMapSelection, onClear: clearMapSelection,;;;;;;;;;;;;;;;;;;;;
"  placeholder: ""Rechercher ZE..."", maxResults: 8, maxChips: 4, maxWidth: 230, showClearAll: true, showCount: true";;;;;;;;;;;;;;;;;;;;
});;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
setTimeout(() => {;;;;;;;;;;;;;;;;;;;;
  const searchContainer = document.getElementById('search-container-attract');;;;;;;;;;;;;;;;;;;;
  if (searchContainer) { searchContainer.innerHTML = ''; searchContainer.appendChild(searchBox); };;;;;;;;;;;;;;;;;;
}, 100);;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
// === PRE-COMPUTE : Zoom ===;;;;;;;;;;;;;;;;;;;;
if (!window._zoomStatesAttract) window._zoomStatesAttract = {};;;;;;;;;;;;;;;;;;;;
const _zoomVal = zoomTargetState;;;;;;;;;;;;;;;;;;;;
"const zoomCode = (_zoomVal && zeLabelMap.has(_zoomVal)) ? _zoomVal : ""5315""";;;;;;;;;;;;;;;;;;;;
const zoomLabel = zeLabelMap.get(zoomCode) || zoomCode;;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
<!-- &s CARTES_ET_TABLEAU -->;;;;;;;;;;;;;;;;;;;;
"<div style=""display:flex";gap:6px;align-items:stretch;""">

<!-- COLONNE GAUCHE : cartes + scatter -->
<div style=""flex:0 0 auto";display:flex;flex-direction:column;gap:4px;padding-left:6px;""">

```js
display(html`<h3 style=""margin:0 0 4px 0";""">Attractivité — Zones d'emploi</h3>`);
```

<!-- Cartes nationales côte à côte -->
<div class=""cards-row"">";;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"<div class=""card"">";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
// === CARTE 1 (indic résidentiel par défaut) ===;;;;;;;;;;;;;;;;;;;;
const map = renderChoropleth({;;;;;;;;;;;;;;;;;;;;
  geoData: zeGeo, valueCol: colKey1,;;;;;;;;;;;;;;;;;;;;
  getColor: (v, f) => getColor(v),;;;;;;;;;;;;;;;;;;;;
  getCode: f => f.properties[meta.geoKey],;;;;;;;;;;;;;;;;;;;;
  getLabel: ({ code }) => zeLabelMap.get(code) || code,;;;;;;;;;;;;;;;;;;;;
  formatValue: (k, v) => formatValue(indic1, v),;;;;;;;;;;;;;;;;;;;;
  indicLabel, selectedCodes: [...mapSelectionState],;;;;;;;;;;;;;;;;;;;;
  showLabels: showValuesOnMap, labelMode, labelBy, topN: 0,;;;;;;;;;;;;;;;;;;;;
"  title: indicLabel, echelon: ""Zone d'emploi"", width: 395, height: 365, maxLabelsAuto: 600";;;;;;;;;;;;;;;;;;;;
});;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const counts = countBins(dataNoFrance, colKey1, bins.thresholds || []);;;;;;;;;;;;;;;;;;;;
const unit = getIndicUnit(colKey1);;;;;;;;;;;;;;;;;;;;
const ecartCounts = isEcart ? countBins(dataNoFrance, colKey1, ecart.thresholds || []) : [];;;;;;;;;;;;;;;;;;;;
const legend = isEcart;;;;;;;;;;;;;;;;;;;;
  ? createEcartFranceLegend({;;;;;;;;;;;;;;;;;;;;
      palette: ecart.palette, symbols: ECART_FRANCE_SYMBOLS,;;;;;;;;;;;;;;;;;;;;
      pctLabels: ecart.pctLabels, counts: ecartCounts,;;;;;;;;;;;;;;;;;;;;
"      title: `±Fr. (en ${ecart.isAbsoluteEcart ? ""pts"" : ""%""})`,";;;;;;;;;;;;;;;;;;;;
      interactive: true,;;;;;;;;;;;;;;;;;;;;
      onFilter: (activeIndices) => {;;;;;;;;;;;;;;;;;;;;
"        const zc = map.querySelector(""g.zoom-content"") || map.querySelector(""svg"")";;;;;;;;;;;;;;;;;;;;
        const groups = Array.from(zc.children).filter(c => c.tagName === 'g');;;;;;;;;;;;;;;;;;;;
        const fp = groups.length >= 2 ? Array.from(groups[1].children).filter(c => c.tagName === 'path') : null;;;;;;;;;;;;;;;;;;;;
        if (!fp || fp.length < zeGeo.features.length * 0.9) return;;;;;;;;;;;;;;;;;;;;
        fp.forEach((p, i) => {;;;;;;;;;;;;;;;;;;;;
          if (i >= zeGeo.features.length) return;;;;;;;;;;;;;;;;;;;;
          const v = zeGeo.features[i].properties[colKey1];;;;;;;;;;;;;;;;;;;;
          const bi = ecart.getBinIdx(v);;;;;;;;;;;;;;;;;;;;
          if (bi >= 0 && !activeIndices.has(bi)) {;;;;;;;;;;;;;;;;;;;;
"            p.setAttribute(""fill"", ""#f3f4f6"")";" p.setAttribute(""fill-opacity"", ""0.15"")";;;;;;;;;;;;;;;;;;;
          } else {;;;;;;;;;;;;;;;;;;;;
"            p.setAttribute(""fill"", getColor(v))";" p.setAttribute(""fill-opacity"", ""1"")";;;;;;;;;;;;;;;;;;;
          };;;;;;;;;;;;;;;;;;;;
        });;;;;;;;;;;;;;;;;;;;
      };;;;;;;;;;;;;;;;;;;;
    });;;;;;;;;;;;;;;;;;;;
  : isGradient;;;;;;;;;;;;;;;;;;;;
  ? createGradientLegend({;;;;;;;;;;;;;;;;;;;;
"      colors: gradient.divergent ? GRADIENT_PALETTES.divergent[""Violet-Vert""] : GRADIENT_PALETTES.sequential,";;;;;;;;;;;;;;;;;;;;
      min: gradient.min, max: gradient.max, showZero: gradient.divergent,;;;;;;;;;;;;;;;;;;;;
"      decimals: 2, title: unit || """",";;;;;;;;;;;;;;;;;;;;
      capped: true, rawMin: gradient.rawMin, rawMax: gradient.rawMax;;;;;;;;;;;;;;;;;;;;
    });;;;;;;;;;;;;;;;;;;;
  : createBinsLegend({;;;;;;;;;;;;;;;;;;;;
      colors: PAL, labels: bins.labels || [], counts,;;;;;;;;;;;;;;;;;;;;
"      vertical: true, unit, reverse: !isDiv,";;;;;;;;;;;;;;;;;;;;
      interactive: true,;;;;;;;;;;;;;;;;;;;;
      onFilter: (activeIndices) => {;;;;;;;;;;;;;;;;;;;;
"        const zc = map.querySelector(""g.zoom-content"") || map.querySelector(""svg"")";;;;;;;;;;;;;;;;;;;;
        const groups = Array.from(zc.children).filter(c => c.tagName === 'g');;;;;;;;;;;;;;;;;;;;
        const fp = groups.length >= 2 ? Array.from(groups[1].children).filter(c => c.tagName === 'path') : null;;;;;;;;;;;;;;;;;;;;
        if (!fp || fp.length < zeGeo.features.length * 0.9) return;;;;;;;;;;;;;;;;;;;;
        fp.forEach((p, i) => {;;;;;;;;;;;;;;;;;;;;
          if (i >= zeGeo.features.length) return;;;;;;;;;;;;;;;;;;;;
          const v = zeGeo.features[i].properties[colKey1];;;;;;;;;;;;;;;;;;;;
          const bi = indicBins.getBinIdx(v);;;;;;;;;;;;;;;;;;;;
          if (bi >= 0 && !activeIndices.has(bi)) {;;;;;;;;;;;;;;;;;;;;
"            p.setAttribute(""fill"", ""#f3f4f6"")";" p.setAttribute(""fill-opacity"", ""0.15"")";;;;;;;;;;;;;;;;;;;
          } else {;;;;;;;;;;;;;;;;;;;;
"            p.setAttribute(""fill"", getColor(v))";" p.setAttribute(""fill-opacity"", ""1"")";;;;;;;;;;;;;;;;;;;
          };;;;;;;;;;;;;;;;;;;;
        });;;;;;;;;;;;;;;;;;;;
      };;;;;;;;;;;;;;;;;;;;
    });;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"map.style.cursor = ""pointer""";;;;;;;;;;;;;;;;;;;;
"map.addEventListener(""click"", (e) => {";;;;;;;;;;;;;;;;;;;;
"  const path = e.target.closest(""path"")";;;;;;;;;;;;;;;;;;;;
  if (!path) return;;;;;;;;;;;;;;;;;;;;
"  const paths = Array.from(path.parentElement.querySelectorAll(""path""))";;;;;;;;;;;;;;;;;;;;
  const idx = paths.indexOf(path);;;;;;;;;;;;;;;;;;;;
  if (idx >= 0 && idx < zeGeo.features.length) {;;;;;;;;;;;;;;;;;;;;
    const code = zeGeo.features[idx].properties[meta.geoKey];;;;;;;;;;;;;;;;;;;;
    if (e.ctrlKey || e.metaKey) addToSelection(code);;;;;;;;;;;;;;;;;;;;
    else setZoomOnly(code);;;;;;;;;;;;;;;;;;;;
  };;;;;;;;;;;;;;;;;;;;
});;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
if (map._tipConfig) {;;;;;;;;;;;;;;;;;;;;
  map._tipConfig.frRef = frData?.[colKey1];;;;;;;;;;;;;;;;;;;;
  map._tipConfig.frGetEcartInfo = ecart.getEcartInfo;;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const wrapper = createMapWrapper(map, null, legend, addZoomBehavior(map, {;;;;;;;;;;;;;;;;;;;;
  initialTransform: window._zoomStatesAttract.map1,;;;;;;;;;;;;;;;;;;;;
  onZoom: t => { window._zoomStatesAttract.map1 = t; };;;;;;;;;;;;;;;;;;;
"}), { exportSVGFn: exportSVG, echelon: ""Zone d'emploi"", colKey: colKey1, title: indicLabel })";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const frVal = frData?.[colKey1];;;;;;;;;;;;;;;;;;;;
const zeZoomRow = dataNoFrance.find(d => d.code === zoomCode);;;;;;;;;;;;;;;;;;;;
const zeVal = zeZoomRow?.[colKey1];;;;;;;;;;;;;;;;;;;;
"const valuesDiv = document.createElement(""div"")";;;;;;;;;;;;;;;;;;;;
"valuesDiv.style.cssText = ""font-size:11px";color:#555;padding:1px 0 0 4px;line-height:1.5;""";
let valHtml = """";
if (frVal != null) valHtml += `France : <b style=""font-style:italic";""">${formatValue(indic1, frVal)}</b>`;
if (zeVal != null) valHtml += `${frVal != null ? "" · "" : """"}${zoomLabel} : <b style=""font-style:italic";color:#1e40af;""">${formatValue(indic1, zeVal)}</b>`;
if (valHtml) { valuesDiv.innerHTML = valHtml; wrapper.appendChild(valuesDiv); }
display(wrapper);
```

</div>

<div class=""card"">";;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
// === CARTE 2 (indic productif par défaut) ===;;;;;;;;;;;;;;;;;;;;
const map2 = renderChoropleth({;;;;;;;;;;;;;;;;;;;;
  geoData: zeGeo, valueCol: colKey2,;;;;;;;;;;;;;;;;;;;;
  getColor: (v, f) => getColor2(v),;;;;;;;;;;;;;;;;;;;;
  getCode: f => f.properties[meta.geoKey],;;;;;;;;;;;;;;;;;;;;
  getLabel: ({ code }) => zeLabelMap.get(code) || code,;;;;;;;;;;;;;;;;;;;;
  formatValue: (k, v) => formatValue(indic2, v),;;;;;;;;;;;;;;;;;;;;
  indicLabel: indicLabel2, selectedCodes: [...mapSelectionState],;;;;;;;;;;;;;;;;;;;;
  showLabels: showValuesOnMap, labelMode, labelBy, topN: 0,;;;;;;;;;;;;;;;;;;;;
"  title: indicLabel2, echelon: ""Zone d'emploi"", width: 395, height: 365, maxLabelsAuto: 600";;;;;;;;;;;;;;;;;;;;
});;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const counts2 = countBins(dataNoFrance, colKey2, indicBins2.bins.thresholds || []);;;;;;;;;;;;;;;;;;;;
const unit2 = getIndicUnit(colKey2);;;;;;;;;;;;;;;;;;;;
const ecartCounts2 = isEcart2 ? countBins(dataNoFrance, colKey2, ecart2.thresholds || []) : [];;;;;;;;;;;;;;;;;;;;
const legend2 = isEcart2;;;;;;;;;;;;;;;;;;;;
  ? createEcartFranceLegend({;;;;;;;;;;;;;;;;;;;;
      palette: ecart2.palette, symbols: ECART_FRANCE_SYMBOLS,;;;;;;;;;;;;;;;;;;;;
      pctLabels: ecart2.pctLabels, counts: ecartCounts2,;;;;;;;;;;;;;;;;;;;;
"      title: `±Fr. (en ${ecart2.isAbsoluteEcart ? ""pts"" : ""%""})`,";;;;;;;;;;;;;;;;;;;;
      interactive: true,;;;;;;;;;;;;;;;;;;;;
      onFilter: (activeIndices) => {;;;;;;;;;;;;;;;;;;;;
"        const zc2 = map2.querySelector(""g.zoom-content"") || map2.querySelector(""svg"")";;;;;;;;;;;;;;;;;;;;
        const groups2 = Array.from(zc2.children).filter(c => c.tagName === 'g');;;;;;;;;;;;;;;;;;;;
        const fp2 = groups2.length >= 2 ? Array.from(groups2[1].children).filter(c => c.tagName === 'path') : null;;;;;;;;;;;;;;;;;;;;
        if (!fp2 || fp2.length < zeGeo.features.length * 0.9) return;;;;;;;;;;;;;;;;;;;;
        fp2.forEach((p, i) => {;;;;;;;;;;;;;;;;;;;;
          if (i >= zeGeo.features.length) return;;;;;;;;;;;;;;;;;;;;
          const v = zeGeo.features[i].properties[colKey2];;;;;;;;;;;;;;;;;;;;
          const bi = ecart2.getBinIdx(v);;;;;;;;;;;;;;;;;;;;
          if (bi >= 0 && !activeIndices.has(bi)) {;;;;;;;;;;;;;;;;;;;;
"            p.setAttribute(""fill"", ""#f3f4f6"")";" p.setAttribute(""fill-opacity"", ""0.15"")";;;;;;;;;;;;;;;;;;;
          } else {;;;;;;;;;;;;;;;;;;;;
"            p.setAttribute(""fill"", getColor2(v))";" p.setAttribute(""fill-opacity"", ""1"")";;;;;;;;;;;;;;;;;;;
          };;;;;;;;;;;;;;;;;;;;
        });;;;;;;;;;;;;;;;;;;;
      };;;;;;;;;;;;;;;;;;;;
    });;;;;;;;;;;;;;;;;;;;
  : isGradient2;;;;;;;;;;;;;;;;;;;;
  ? createGradientLegend({;;;;;;;;;;;;;;;;;;;;
"      colors: gradient2.divergent ? GRADIENT_PALETTES.divergent[""Violet-Vert""] : GRADIENT_PALETTES.sequential,";;;;;;;;;;;;;;;;;;;;
      min: gradient2.min, max: gradient2.max, showZero: gradient2.divergent,;;;;;;;;;;;;;;;;;;;;
"      decimals: 2, title: unit2 || """",";;;;;;;;;;;;;;;;;;;;
      capped: true, rawMin: gradient2.rawMin, rawMax: gradient2.rawMax;;;;;;;;;;;;;;;;;;;;
    });;;;;;;;;;;;;;;;;;;;
  : createBinsLegend({;;;;;;;;;;;;;;;;;;;;
      colors: indicBins2.palette, labels: indicBins2.bins.labels || [], counts: counts2,;;;;;;;;;;;;;;;;;;;;
"      vertical: true, unit: unit2, reverse: !indicBins2.isDiv,";;;;;;;;;;;;;;;;;;;;
      interactive: true,;;;;;;;;;;;;;;;;;;;;
      onFilter: (activeIndices) => {;;;;;;;;;;;;;;;;;;;;
"        const zc2 = map2.querySelector(""g.zoom-content"") || map2.querySelector(""svg"")";;;;;;;;;;;;;;;;;;;;
        const groups2 = Array.from(zc2.children).filter(c => c.tagName === 'g');;;;;;;;;;;;;;;;;;;;
        const fp2 = groups2.length >= 2 ? Array.from(groups2[1].children).filter(c => c.tagName === 'path') : null;;;;;;;;;;;;;;;;;;;;
        if (!fp2 || fp2.length < zeGeo.features.length * 0.9) return;;;;;;;;;;;;;;;;;;;;
        fp2.forEach((p, i) => {;;;;;;;;;;;;;;;;;;;;
          if (i >= zeGeo.features.length) return;;;;;;;;;;;;;;;;;;;;
          const v = zeGeo.features[i].properties[colKey2];;;;;;;;;;;;;;;;;;;;
          const bi = indicBins2.getBinIdx(v);;;;;;;;;;;;;;;;;;;;
          if (bi >= 0 && !activeIndices.has(bi)) {;;;;;;;;;;;;;;;;;;;;
"            p.setAttribute(""fill"", ""#f3f4f6"")";" p.setAttribute(""fill-opacity"", ""0.15"")";;;;;;;;;;;;;;;;;;;
          } else {;;;;;;;;;;;;;;;;;;;;
"            p.setAttribute(""fill"", getColor2(v))";" p.setAttribute(""fill-opacity"", ""1"")";;;;;;;;;;;;;;;;;;;
          };;;;;;;;;;;;;;;;;;;;
        });;;;;;;;;;;;;;;;;;;;
      };;;;;;;;;;;;;;;;;;;;
    });;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"map2.style.cursor = ""pointer""";;;;;;;;;;;;;;;;;;;;
"map2.addEventListener(""click"", (e) => {";;;;;;;;;;;;;;;;;;;;
"  const path = e.target.closest(""path"")";;;;;;;;;;;;;;;;;;;;
  if (!path) return;;;;;;;;;;;;;;;;;;;;
"  const paths = Array.from(path.parentElement.querySelectorAll(""path""))";;;;;;;;;;;;;;;;;;;;
  const idx = paths.indexOf(path);;;;;;;;;;;;;;;;;;;;
  if (idx >= 0 && idx < zeGeo.features.length) {;;;;;;;;;;;;;;;;;;;;
    const code = zeGeo.features[idx].properties[meta.geoKey];;;;;;;;;;;;;;;;;;;;
    if (e.ctrlKey || e.metaKey) addToSelection(code);;;;;;;;;;;;;;;;;;;;
    else setZoomOnly(code);;;;;;;;;;;;;;;;;;;;
  };;;;;;;;;;;;;;;;;;;;
});;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
if (map2._tipConfig) {;;;;;;;;;;;;;;;;;;;;
  map2._tipConfig.frRef = frData?.[colKey2];;;;;;;;;;;;;;;;;;;;
  map2._tipConfig.frGetEcartInfo = ecart2.getEcartInfo;;;;;;;;;;;;;;;;;;;;
};;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const wrapper2 = createMapWrapper(map2, null, legend2, addZoomBehavior(map2, {;;;;;;;;;;;;;;;;;;;;
  initialTransform: window._zoomStatesAttract.map2,;;;;;;;;;;;;;;;;;;;;
  onZoom: t => { window._zoomStatesAttract.map2 = t; };;;;;;;;;;;;;;;;;;;
"}), { exportSVGFn: exportSVG, echelon: ""Zone d'emploi"", colKey: colKey2, title: indicLabel2 })";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const frVal2 = frData?.[colKey2];;;;;;;;;;;;;;;;;;;;
const zeVal2 = zeZoomRow?.[colKey2];;;;;;;;;;;;;;;;;;;;
"const valuesDiv2 = document.createElement(""div"")";;;;;;;;;;;;;;;;;;;;
"valuesDiv2.style.cssText = ""font-size:11px";color:#555;padding:1px 0 0 4px;line-height:1.5;""";
let valHtml2 = """";
if (frVal2 != null) valHtml2 += `France : <b style=""font-style:italic";""">${formatValue(indic2, frVal2)}</b>`;
if (zeVal2 != null) valHtml2 += `${frVal2 != null ? "" · "" : """"}${zoomLabel} : <b style=""font-style:italic";color:#1e40af;""">${formatValue(indic2, zeVal2)}</b>`;
if (valHtml2) { valuesDiv2.innerHTML = valHtml2; wrapper2.appendChild(valuesDiv2); }
display(wrapper2);
```

</div>

</div>
<!-- Fin cartes nationales -->

<!-- &s SCATTER_SWITCH — 3 scatter switchables -->

```js
// === SCATTER MODE SWITCH ===
const scatterModeState = Mutable(""niveau"")";;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"const switchContainer = document.createElement(""div"")";;;;;;;;;;;;;;;;;;;;
"switchContainer.className = ""scatter-switch""";;;;;;;;;;;;;;;;;;;;
const modes = [;;;;;;;;;;;;;;;;;;;;
"  { id: ""niveau"", label: ""1. Niveau actuel"" },";;;;;;;;;;;;;;;;;;;;
"  { id: ""trajectoire"", label: ""2. Trajectoire"" },";;;;;;;;;;;;;;;;;;;;
"  { id: ""combine"", label: ""3. Niveau + trajectoire"" }";;;;;;;;;;;;;;;;;;;;
];;;;;;;;;;;;;;;;;;;;
modes.forEach(m => {;;;;;;;;;;;;;;;;;;;;
"  const btn = document.createElement(""button"")";;;;;;;;;;;;;;;;;;;;
  btn.textContent = m.label;;;;;;;;;;;;;;;;;;;;
"  btn.className = scatterModeState === m.id ? ""active"" : """"";;;;;;;;;;;;;;;;;;;;
"  btn.addEventListener(""click"", () => {";;;;;;;;;;;;;;;;;;;;
    scatterModeState.value = m.id;;;;;;;;;;;;;;;;;;;;
"    switchContainer.querySelectorAll(""button"").forEach(b => b.classList.remove(""active""))";;;;;;;;;;;;;;;;;;;;
"    btn.classList.add(""active"")";;;;;;;;;;;;;;;;;;;;
  });;;;;;;;;;;;;;;;;;;;
"  if (scatterModeState === m.id) btn.classList.add(""active"")";;;;;;;;;;;;;;;;;;;;
  switchContainer.appendChild(btn);;;;;;;;;;;;;;;;;;;;
});;;;;;;;;;;;;;;;;;;;
// Set initial active;;;;;;;;;;;;;;;;;;;;
"switchContainer.children[0].classList.add(""active"")";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
display(switchContainer);;;;;;;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
// === SCATTER PLOT — Rendu selon mode ===;;;;;;;;;;;;;;;;;;;;
{;;;;;;;;;;;;;;;;;;;;
  const mode = scatterModeState;;;;;;;;;;;;;;;;;;;;
  const sCodes = [...mapSelectionState];;;;;;;;;;;;;;;;;;;;
  // DENS_COLORS et DENS_LABELS importés de constants.js;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
  // Population size scale;;;;;;;;;;;;;;;;;;;;
"  const sz = autoSizeScale(dataWithDeltaGlobal.map(d => d.P23_POP), { label: ""Population"", rRange: [3, 14] })";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
  let scatterElement = null;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"  if (mode === ""niveau"") {";;;;;;;;;;;;;;;;;;;;
    // === SCATTER 1 — Niveau actuel (T2) ===;;;;;;;;;;;;;;;;;;;;
    const xCol = COL_ECO_T2;;;;;;;;;;;;;;;;;;;;
    const yCol = COL_RESID_T2;;;;;;;;;;;;;;;;;;;;
"    const xLbl = ""Indice productif (éco soc)""";;;;;;;;;;;;;;;;;;;;
"    const yLbl = ""Indice résidentiel (dyn)""";;;;;;;;;;;;;;;;;;;;
    const mX = frData?.[xCol];;;;;;;;;;;;;;;;;;;;
    const mY = frData?.[yCol];;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
    const xV = dataNoFrance.map(d => d[xCol]).filter(v => v != null).sort((a, b) => a - b);;;;;;;;;;;;;;;;;;;;
    const yV = dataNoFrance.map(d => d[yCol]).filter(v => v != null).sort((a, b) => a - b);;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
    if (xV.length > 5 && yV.length > 5) {;;;;;;;;;;;;;;;;;;;;
      const xP01 = xV[Math.floor(xV.length * 0.01)];;;;;;;;;;;;;;;;;;;;
      const xP99 = xV[Math.min(Math.floor(xV.length * 0.99), xV.length - 1)];;;;;;;;;;;;;;;;;;;;
      const yP01 = yV[Math.floor(yV.length * 0.01)];;;;;;;;;;;;;;;;;;;;
      const yP99 = yV[Math.min(Math.floor(yV.length * 0.99), yV.length - 1)];;;;;;;;;;;;;;;;;;;;
      const xPad = (xP99 - xP01) * 0.08;;;;;;;;;;;;;;;;;;;;
      const yPad = (yP99 - yP01) * 0.08;;;;;;;;;;;;;;;;;;;;
      let xMin = xP01 - xPad, xMax = xP99 + xPad;;;;;;;;;;;;;;;;;;;;
      let yMin = yP01 - yPad, yMax = yP99 + yPad;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      const annotations = [];;;;;;;;;;;;;;;;;;;;
      if (mX != null && mY != null) {;;;;;;;;;;;;;;;;;;;;
        const midXR = (mX + xMax) / 2, midXL = (xMin + mX) / 2;;;;;;;;;;;;;;;;;;;;
        const midYT = (mY + yMax) / 2, midYB = (yMin + mY) / 2;;;;;;;;;;;;;;;;;;;;
        annotations.push(;;;;;;;;;;;;;;;;;;;;
"          { x: midXR, y: midYT, text: ""Attractif global"", color: ""rgba(80,80,80,0.35)"", fontSize: 11, fontWeight: 600 },";;;;;;;;;;;;;;;;;;;;
"          { x: midXL, y: midYT, text: ""Résidentiel seul"", color: ""rgba(80,80,80,0.35)"", fontSize: 11, fontWeight: 600 },";;;;;;;;;;;;;;;;;;;;
"          { x: midXR, y: midYB, text: ""Productif seul"", color: ""rgba(80,80,80,0.35)"", fontSize: 11, fontWeight: 600 },";;;;;;;;;;;;;;;;;;;;
"          { x: midXL, y: midYB, text: ""Faible attractivité"", color: ""rgba(80,80,80,0.35)"", fontSize: 11, fontWeight: 600 }";;;;;;;;;;;;;;;;;;;;
        );;;;;;;;;;;;;;;;;;;;
      };;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      const topPop = dataNoFrance;;;;;;;;;;;;;;;;;;;;
        .filter(d => d[xCol] != null && d[yCol] != null);;;;;;;;;;;;;;;;;;;;
        .sort((a, b) => (b.P23_POP || 0) - (a.P23_POP || 0));;;;;;;;;;;;;;;;;;;;
        .slice(0, 8).map(d => d.code);;;;;;;;;;;;;;;;;;;;
      const lCodes = [...new Set([...sCodes, ...topPop])];;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      scatterElement = createScatterWithZoom({;;;;;;;;;;;;;;;;;;;;
        data: dataNoFrance, xCol, yCol,;;;;;;;;;;;;;;;;;;;;
        xDomain: [xMin, xMax], yDomain: [yMin, yMax],;;;;;;;;;;;;;;;;;;;;
        xLabel: xLbl, yLabel: yLbl,;;;;;;;;;;;;;;;;;;;;
"        xUnit: ""indice"", yUnit: ""indice"",";;;;;;;;;;;;;;;;;;;;
        meanX: mX, meanY: mY,;;;;;;;;;;;;;;;;;;;;
        getRadius: d => sz.getRadius(d.P23_POP),;;;;;;;;;;;;;;;;;;;;
"        getColor: d => DENS_COLORS[d.dens3] || ""#999"",";;;;;;;;;;;;;;;;;;;;
        isSelected: d => sCodes.includes(d.code),;;;;;;;;;;;;;;;;;;;;
"        getTooltip: d => `${d.libelle || d.code} (${DENS_LABELS[d.dens3] || ""?""})\nPop : ${(d.P23_POP || 0).toLocaleString(""fr"")}\nProductif : ${formatValue(""idxeco_soc_ind"", d[xCol])}\nRésidentiel : ${formatValue(""idxresid_dyn_ind"", d[yCol])}`,";;;;;;;;;;;;;;;;;;;;
        width: 820, height: 370,;;;;;;;;;;;;;;;;;;;;
        labelCodes: lCodes, labelMode,;;;;;;;;;;;;;;;;;;;;
        _customTooltip: true, annotations,;;;;;;;;;;;;;;;;;;;;
        title: `Niveau actuel — Productif — Résidentiel (Zones d'emploi)`,;;;;;;;;;;;;;;;;;;;;
        subtitle: `${dataNoFrance.length} territoires`,;;;;;;;;;;;;;;;;;;;;
        legend: [;;;;;;;;;;;;;;;;;;;;
"          { label: `${DENS_LABELS[""1""]} (${dataNoFrance.filter(d => d.dens3 === ""1"").length})`, color: DENS_COLORS[""1""] },";;;;;;;;;;;;;;;;;;;;
"          { label: `${DENS_LABELS[""2""]} (${dataNoFrance.filter(d => d.dens3 === ""2"").length})`, color: DENS_COLORS[""2""] },";;;;;;;;;;;;;;;;;;;;
"          { label: `${DENS_LABELS[""3""]} (${dataNoFrance.filter(d => d.dens3 === ""3"").length})`, color: DENS_COLORS[""3""] }";;;;;;;;;;;;;;;;;;;;
        ],;;;;;;;;;;;;;;;;;;;;
"        sizeLabel: createSizeLegendVertical(sz.bins, ""Population""),";;;;;;;;;;;;;;;;;;;;
        fillOpacity: 0.65;;;;;;;;;;;;;;;;;;;;
      });;;;;;;;;;;;;;;;;;;;
    };;;;;;;;;;;;;;;;;;;;
  };;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"  else if (mode === ""trajectoire"") {";;;;;;;;;;;;;;;;;;;;
    // === SCATTER 2 — Trajectoire (delta relatif au national) ===;;;;;;;;;;;;;;;;;;;;
"    const xCol = ""delta_eco""";;;;;;;;;;;;;;;;;;;;
"    const yCol = ""delta_resid""";;;;;;;;;;;;;;;;;;;;
    const filtered = dataWithDeltaGlobal.filter(d => d[xCol] != null && d[yCol] != null);;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
    if (filtered.length > 5) {;;;;;;;;;;;;;;;;;;;;
      const xV = filtered.map(d => d[xCol]).sort((a, b) => a - b);;;;;;;;;;;;;;;;;;;;
      const yV = filtered.map(d => d[yCol]).sort((a, b) => a - b);;;;;;;;;;;;;;;;;;;;
      const xP01 = xV[Math.floor(xV.length * 0.01)];;;;;;;;;;;;;;;;;;;;
      const xP99 = xV[Math.min(Math.floor(xV.length * 0.99), xV.length - 1)];;;;;;;;;;;;;;;;;;;;
      const yP01 = yV[Math.floor(yV.length * 0.01)];;;;;;;;;;;;;;;;;;;;
      const yP99 = yV[Math.min(Math.floor(yV.length * 0.99), yV.length - 1)];;;;;;;;;;;;;;;;;;;;
      const xPad = (xP99 - xP01) * 0.12;;;;;;;;;;;;;;;;;;;;
      const yPad = (yP99 - yP01) * 0.12;;;;;;;;;;;;;;;;;;;;
      let xMin = Math.min(xP01 - xPad, -xPad);;;;;;;;;;;;;;;;;;;;
      let xMax = Math.max(xP99 + xPad, xPad);;;;;;;;;;;;;;;;;;;;
      let yMin = Math.min(yP01 - yPad, -yPad);;;;;;;;;;;;;;;;;;;;
      let yMax = Math.max(yP99 + yPad, yPad);;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      const annotations = [;;;;;;;;;;;;;;;;;;;;
"        { x: xMax * 0.55, y: yMax * 0.7, text: ""Progression globale"", color: ""rgba(34,139,34,0.4)"", fontSize: 12, fontWeight: 700 },";;;;;;;;;;;;;;;;;;;;
"        { x: xMin * 0.55, y: yMax * 0.7, text: ""Rebond résidentiel"", color: ""rgba(100,100,100,0.35)"", fontSize: 11, fontWeight: 600 },";;;;;;;;;;;;;;;;;;;;
"        { x: xMax * 0.55, y: yMin * 0.7, text: ""Rebond productif"", color: ""rgba(100,100,100,0.35)"", fontSize: 11, fontWeight: 600 },";;;;;;;;;;;;;;;;;;;;
"        { x: xMin * 0.55, y: yMin * 0.7, text: ""Déclin global"", color: ""rgba(180,50,50,0.4)"", fontSize: 12, fontWeight: 700 }";;;;;;;;;;;;;;;;;;;;
      ];;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      const topPop = filtered;;;;;;;;;;;;;;;;;;;;
        .sort((a, b) => (b.P23_POP || 0) - (a.P23_POP || 0));;;;;;;;;;;;;;;;;;;;
        .slice(0, 8).map(d => d.code);;;;;;;;;;;;;;;;;;;;
      const lCodes = [...new Set([...sCodes, ...topPop])];;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      scatterElement = createScatterWithZoom({;;;;;;;;;;;;;;;;;;;;
        data: filtered, xCol, yCol,;;;;;;;;;;;;;;;;;;;;
        xDomain: [xMin, xMax], yDomain: [yMin, yMax],;;;;;;;;;;;;;;;;;;;;
"        xLabel: ""△ Indice productif (T2 − T1)"", yLabel: ""△ Indice résidentiel (T2 − T1)"",";;;;;;;;;;;;;;;;;;;;
"        xUnit: ""pts"", yUnit: ""pts"",";;;;;;;;;;;;;;;;;;;;
        meanX: 0, meanY: 0,;;;;;;;;;;;;;;;;;;;;
        getRadius: d => sz.getRadius(d.P23_POP),;;;;;;;;;;;;;;;;;;;;
"        getColor: d => DENS_COLORS[d.dens3] || ""#999"",";;;;;;;;;;;;;;;;;;;;
        isSelected: d => sCodes.includes(d.code),;;;;;;;;;;;;;;;;;;;;
"        getTooltip: d => `${d.libelle || d.code} (${DENS_LABELS[d.dens3] || ""?""})\nPop : ${(d.P23_POP || 0).toLocaleString(""fr"")}\n△ Productif : ${d.delta_eco?.toFixed(1) ?? ""—""}\n△ Résidentiel : ${d.delta_resid?.toFixed(1) ?? ""—""}`,";;;;;;;;;;;;;;;;;;;;
        width: 820, height: 370,;;;;;;;;;;;;;;;;;;;;
        labelCodes: lCodes, labelMode,;;;;;;;;;;;;;;;;;;;;
        _customTooltip: true, annotations,;;;;;;;;;;;;;;;;;;;;
        title: `Trajectoire — △ Productif — △ Résidentiel (Zones d'emploi)`,;;;;;;;;;;;;;;;;;;;;
        subtitle: `${filtered.length} territoires · T2−T1`,;;;;;;;;;;;;;;;;;;;;
        legend: [;;;;;;;;;;;;;;;;;;;;
"          { label: `${DENS_LABELS[""1""]} (${filtered.filter(d => d.dens3 === ""1"").length})`, color: DENS_COLORS[""1""] },";;;;;;;;;;;;;;;;;;;;
"          { label: `${DENS_LABELS[""2""]} (${filtered.filter(d => d.dens3 === ""2"").length})`, color: DENS_COLORS[""2""] },";;;;;;;;;;;;;;;;;;;;
"          { label: `${DENS_LABELS[""3""]} (${filtered.filter(d => d.dens3 === ""3"").length})`, color: DENS_COLORS[""3""] }";;;;;;;;;;;;;;;;;;;;
        ],;;;;;;;;;;;;;;;;;;;;
"        sizeLabel: createSizeLegendVertical(sz.bins, ""Population""),";;;;;;;;;;;;;;;;;;;;
        fillOpacity: 0.65;;;;;;;;;;;;;;;;;;;;
      });;;;;;;;;;;;;;;;;;;;
    };;;;;;;;;;;;;;;;;;;;
  };;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"  else if (mode === ""combine"") {";;;;;;;;;;;;;;;;;;;;
    // === SCATTER 3 — Combiné : niveau actuel + couleur trajectoire ===;;;;;;;;;;;;;;;;;;;;
    const xCol = COL_ECO_T2;;;;;;;;;;;;;;;;;;;;
    const yCol = COL_RESID_T2;;;;;;;;;;;;;;;;;;;;
    const filtered = dataWithDeltaGlobal.filter(d => d[xCol] != null && d[yCol] != null && d.delta_global != null);;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
    if (filtered.length > 5) {;;;;;;;;;;;;;;;;;;;;
      const xV = filtered.map(d => d[xCol]).sort((a, b) => a - b);;;;;;;;;;;;;;;;;;;;
      const yV = filtered.map(d => d[yCol]).sort((a, b) => a - b);;;;;;;;;;;;;;;;;;;;
      const xP01 = xV[Math.floor(xV.length * 0.01)];;;;;;;;;;;;;;;;;;;;
      const xP99 = xV[Math.min(Math.floor(xV.length * 0.99), xV.length - 1)];;;;;;;;;;;;;;;;;;;;
      const yP01 = yV[Math.floor(yV.length * 0.01)];;;;;;;;;;;;;;;;;;;;
      const yP99 = yV[Math.min(Math.floor(yV.length * 0.99), yV.length - 1)];;;;;;;;;;;;;;;;;;;;
      const xPad = (xP99 - xP01) * 0.08;;;;;;;;;;;;;;;;;;;;
      const yPad = (yP99 - yP01) * 0.08;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      // Couleur par delta global : vert = progresse, rouge = recule;;;;;;;;;;;;;;;;;;;;
      const deltaVals = filtered.map(d => d.delta_global).sort((a, b) => a - b);;;;;;;;;;;;;;;;;;;;
      const dMin = deltaVals[Math.floor(deltaVals.length * 0.05)];;;;;;;;;;;;;;;;;;;;
      const dMax = deltaVals[Math.min(Math.floor(deltaVals.length * 0.95), deltaVals.length - 1)];;;;;;;;;;;;;;;;;;;;
      const deltaColorScale = d3.scaleLinear();;;;;;;;;;;;;;;;;;;;
        .domain([dMin, 0, dMax]);;;;;;;;;;;;;;;;;;;;
"        .range([""#d73027"", ""#ffffbf"", ""#1a9850""])";;;;;;;;;;;;;;;;;;;;
        .clamp(true);;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      // Rayon par amplitude du déplacement;;;;;;;;;;;;;;;;;;;;
      const ampVals = filtered.map(d => d.delta_amplitude).filter(v => v != null).sort((a, b) => a - b);;;;;;;;;;;;;;;;;;;;
      const ampP90 = ampVals[Math.min(Math.floor(ampVals.length * 0.90), ampVals.length - 1)] || 1;;;;;;;;;;;;;;;;;;;;
      const ampScale = d3.scalePow().exponent(0.7).domain([0, ampP90]).range([3, 16]).clamp(true);;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      const mX = frData?.[xCol];;;;;;;;;;;;;;;;;;;;
      const mY = frData?.[yCol];;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      const topPop = filtered;;;;;;;;;;;;;;;;;;;;
        .sort((a, b) => (b.P23_POP || 0) - (a.P23_POP || 0));;;;;;;;;;;;;;;;;;;;
        .slice(0, 8).map(d => d.code);;;;;;;;;;;;;;;;;;;;
      const lCodes = [...new Set([...sCodes, ...topPop])];;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      const annotations = [];;;;;;;;;;;;;;;;;;;;
      if (mX != null && mY != null) {;;;;;;;;;;;;;;;;;;;;
        annotations.push(;;;;;;;;;;;;;;;;;;;;
"          { x: (mX + xP99 + xPad) / 2, y: (mY + yP99 + yPad) / 2, text: ""Attractif global"", color: ""rgba(80,80,80,0.3)"", fontSize: 11, fontWeight: 600 },";;;;;;;;;;;;;;;;;;;;
"          { x: (xP01 - xPad + mX) / 2, y: (yP01 - yPad + mY) / 2, text: ""Faible attractivité"", color: ""rgba(80,80,80,0.3)"", fontSize: 11, fontWeight: 600 }";;;;;;;;;;;;;;;;;;;;
        );;;;;;;;;;;;;;;;;;;;
      };;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
      scatterElement = createScatterWithZoom({;;;;;;;;;;;;;;;;;;;;
        data: filtered, xCol, yCol,;;;;;;;;;;;;;;;;;;;;
        xDomain: [xP01 - xPad, xP99 + xPad],;;;;;;;;;;;;;;;;;;;;
        yDomain: [yP01 - yPad, yP99 + yPad],;;;;;;;;;;;;;;;;;;;;
"        xLabel: ""Indice productif (éco soc)"", yLabel: ""Indice résidentiel (dyn)"",";;;;;;;;;;;;;;;;;;;;
"        xUnit: ""indice"", yUnit: ""indice"",";;;;;;;;;;;;;;;;;;;;
        meanX: mX, meanY: mY,;;;;;;;;;;;;;;;;;;;;
        getRadius: d => ampScale(d.delta_amplitude || 0),;;;;;;;;;;;;;;;;;;;;
        getColor: d => deltaColorScale(d.delta_global),;;;;;;;;;;;;;;;;;;;;
        isSelected: d => sCodes.includes(d.code),;;;;;;;;;;;;;;;;;;;;
"        getTooltip: d => `${d.libelle || d.code}\nPop : ${(d.P23_POP || 0).toLocaleString(""fr"")}\nProductif : ${formatValue(""idxeco_soc_ind"", d[xCol])}\nRésidentiel : ${formatValue(""idxresid_dyn_ind"", d[yCol])}\n△ Global : ${d.delta_global?.toFixed(1) ?? ""—""} (${d.delta_global > 0 ? ""progresse"" : ""recule""})`,";;;;;;;;;;;;;;;;;;;;
        width: 820, height: 370,;;;;;;;;;;;;;;;;;;;;
        labelCodes: lCodes, labelMode,;;;;;;;;;;;;;;;;;;;;
        _customTooltip: true, annotations,;;;;;;;;;;;;;;;;;;;;
        title: `Niveau + Trajectoire — Couleur = △ global (Zones d'emploi)`,;;;;;;;;;;;;;;;;;;;;
        subtitle: `${filtered.length} territoires`,;;;;;;;;;;;;;;;;;;;;
        legend: [;;;;;;;;;;;;;;;;;;;;
"          { label: ""Forte progression"", color: ""#1a9850"" },";;;;;;;;;;;;;;;;;;;;
"          { label: ""Stable"", color: ""#ffffbf"" },";;;;;;;;;;;;;;;;;;;;
"          { label: ""Recul"", color: ""#d73027"" }";;;;;;;;;;;;;;;;;;;;
        ],;;;;;;;;;;;;;;;;;;;;
"        sizeLabel: html`<div style=""font-size:10px";color:#555;line-height:1.4;max-width:140px;""">
          <b>Taille</b> = amplitude du changement<br>(gros = fort déplacement T1→T2)
        </div>`,
        fillOpacity: 0.7
      });
    }
  }

  if (scatterElement) {
    display(scatterElement);
  } else {
    display(html`<div style=""padding:20px";text-align:center;color:#6b7280;font-size:11px;""">Données insuffisantes pour ce scatter</div>`);
  }
}
```
<!-- &e SCATTER_SWITCH -->

```js
// === Note lecture scatter ===
{
  const mode = scatterModeState;
  const noteText = mode === ""niveau""";;;;;;;;;;;;
"    ? ""Chaque point = 1 zone d'emploi. Position = indices d'attractivité résidentielle (Y) et productive (X) sur la période récente. Lignes pointillées = valeur France.""";;;;;;;;;;;;;;;;;;;;
"    : mode === ""trajectoire""";;;;;;;;;;;;;;;;;;;;
"    ? ""Chaque point = 1 zone d'emploi. Position = variation des indices entre période 1 (2011-16) et période 2 (2016-22/23). Centre (0,0) = stable. Cadran haut-droit = progression globale.""";;;;;;;;;;;;;;;;;;;;
"    : ""Chaque point = 1 zone d'emploi. Position = niveaux actuels. Couleur = trajectoire (vert = progresse, rouge = recule). Taille = amplitude du changement.""";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"  display(html`<p style=""font-size:10px";color:#6b7280;margin:2px 0 8px 0;font-style:italic;max-width:820px;""">${noteText}</p>`);
}
```

</div>
<!-- Fin COLONNE GAUCHE -->

<!-- COLONNE DROITE : table ZE -->
<div style=""flex:1";min-width:300px;display:flex;flex-direction:column;""">
<h3 style=""margin:0 0 4px 0";""">Tableau Zones d'emploi<span class=""table-help-wrap""><span class=""table-help-icon"">?</span><span class=""help-tooltip""><b>Couleurs</b> : intensit&eacute"; proportionnelle &agrave; l'&eacute;cart par rapport &agrave; la moyenne.<br>&bull;" <span style=""color:#98cf90"">&#9632";</span> Vert = au-dessus de la moyenne<br>&bull;" <span style=""color:#e46aa7"">&#9632";</span> Violet = en-dessous de la moyenne<br>Plus la couleur est fonc&eacute;e, plus la valeur est extr&ecirc;me.</span></span></h3>
"<div class=""card"" style=""flex:1";padding:6px;display:flex;flex-direction:column;min-height:0;""">

```js
const echSortState2 = Mutable({ col: COL_RESID_T2, asc: false });
const setEchSort2 = (col) => {
  const curr = echSortState2.value.col;
  const asc = echSortState2.value.asc;
  echSortState2.value = curr === col ? { col, asc: !asc } : { col, asc: false };
};
```

```js
const echSearchInput2 = view(Inputs.text({ placeholder: ""Rechercher ZE..."", width: 200 }))";;;;;;;;;;;;;;;
```;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
```js;;;;;;;;;;;;;;;;;;;;
// === DONNÉES TABLEAU ZE ===;;;;;;;;;;;;;;;;;;;;
const selectedExtraIndics = extraIndics || [];;;;;;;;;;;;;;;;;;;;
"const extraCols = selectedExtraIndics.filter(i => !i.startsWith(""__sep_"")).map(i => buildColKey(i, getDefaultPeriode(i)))";;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const allAttrCols = [;;;;;;;;;;;;;;;;;;;;
  colKey1, colKey2,;;;;;;;;;;;;;;;;;;;;
  ...extraCols,;;;;;;;;;;;;;;;;;;;;
  ...defaultTableCols;;;;;;;;;;;;;;;;;;;;
].filter(c => AVAILABLE_COLUMNS.has(c));;;;;;;;;;;;;;;;;;;;
const echAllIndicCols2 = [...new Set(allAttrCols)];;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const echTableData2 = frData ? [frData, ...dataNoFrance] : dataNoFrance;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"const echSearchVal2 = (echSearchInput2 || """").toLowerCase()";;;;;;;;;;;;;;;;;;;;
const echFiltered2 = echSearchVal2;;;;;;;;;;;;;;;;;;;;
"  ? echTableData2.filter(d => d.code === ""00FR"" || (d.libelle || """").toLowerCase().includes(echSearchVal2) || (d.code || """").includes(echSearchVal2))";;;;;;;;;;;;;;;;;;;;
  : echTableData2;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const echSortCol2 = echSortState2.col;;;;;;;;;;;;;;;;;;;;
const echSortAsc2 = echSortState2.asc;;;;;;;;;;;;;;;;;;;;
const echSorted2 = sortTableData(echFiltered2, echSortCol2, echSortAsc2);;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const echStats2 = computeBarStats(echFiltered2, echAllIndicCols2);;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
const echColumns2 = [;;;;;;;;;;;;;;;;;;;;
"  { key: ""libelle"", label: ""Zone d'emploi"", type: ""text"", width: 130 },";;;;;;;;;;;;;;;;;;;;
  ...echAllIndicCols2.map(col => {;;;;;;;;;;;;;;;;;;;;
"    const indicK = col.replace(/_\d+$/, """")";;;;;;;;;;;;;;;;;;;;
"    const per = col.match(/_(\d{2,4})$/)?.[1] || """"";;;;;;;;;;;;;;;;;;;;
    return {;;;;;;;;;;;;;;;;;;;;
      key: col,;;;;;;;;;;;;;;;;;;;;
"      label: getIndicLabel(indicK, ""medium""),";;;;;;;;;;;;;;;;;;;;
      unit: getIndicUnit(col),;;;;;;;;;;;;;;;;;;;;
"      periode: per ? getPeriodeLabel(per, ""short"") : """"";;;;;;;;;;;;;;;;;;;;
    };;;;;;;;;;;;;;;;;;;;
  });;;;;;;;;;;;;;;;;;;;
];;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"display(html`<div style=""display:flex";justify-content:space-between;align-items:center;margin-bottom:4px;""">
  <span style=""font-size:10px";color:#6b7280;""">${echFiltered2.length} ZE</span>
  <div style=""display:flex";gap:4px;""">
    <button style=""font-size:10px";padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;"""
      onclick=${() => exportCSV(echSorted2, echColumns2, ""attract_ze_"" + new Date().toISOString().slice(0,10) + "".csv"")}>";;;;;;
      CSV;;;;;;;;;;;;;;;;;;;;
    </button>;;;;;;;;;;;;;;;;;;;;
"    <button style=""font-size:12px";padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;""" title=""Plein écran""";;;;;;;;;;;;;;
"      onclick=${() => { const t = document.querySelector("".attract-table-fs-target"")"; if (t) openTableFullscreen(t); }}>;;;;;;;;;;;;;;;;;;
      &#x2922;;;;;;;;;;;;;;;;;;;;
    </button>;;;;;;;;;;;;;;;;;;;;
  </div>;;;;;;;;;;;;;;;;;;;;
</div>`);;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;
"const _attrTblWrap = document.createElement(""div"")";;;;;;;;;;;;;;;;;;;;
"_attrTblWrap.className = ""attract-table-fs-target""";;;;;;;;;;;;;;;;;;;;
"_attrTblWrap.style.cssText = ""flex:1";display:flex;flex-direction:column;min-height:0;""";
_attrTblWrap.appendChild(renderTable({
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
display(_attrTblWrap);
void 0;
```

</div><!-- card -->
</div>
<!-- Fin COLONNE DROITE -->

</div>
<!-- &e CARTES_ET_TABLEAU -->

</div>
<!-- &e LAYOUT_MAIN -->";;;;;;;;;;;;;;;;
