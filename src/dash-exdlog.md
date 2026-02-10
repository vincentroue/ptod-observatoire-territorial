---
title: OTTD — Logement
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     EXDLOG — Volet Logement (Prix, Construction, Vacance)
     Date: 2026-02-08 | v1.1
     Layout: Sidebar (échelon + indic/période) | Sub-banner KPIs | Carte + Tableau
     Sources: DVF, SITADEL, LOVAC, ANIL
     ============================================================ -->

<!-- &s BANNER -->
```js
import { createBanner, createNav, OTTD_PAGES } from "./helpers/layout.js";
display(createBanner({
  title: "Observatoire des trajectoires territoriales de développement",
  subtitle: "Dynamiques Logement — Prix, Construction, Vacance",
  navElement: createNav(OTTD_PAGES, 'exdlog'),
  sourcesText: "? Sources",
  sourcesTooltip: "DVF 2016-2024, SITADEL 2011-2024, LOVAC 2020-2024, ANIL 2022-2025"
}));
```
<!-- &e BANNER -->

<!-- &s IMPORTS -->
```js
// === NPM DEPENDENCIES ===
import * as topojson from "npm:topojson-client";
import rewind from "npm:@mapbox/geojson-rewind";
import * as Plot from "npm:@observablehq/plot";

// === 0loader.js ===
import {
  getEchelonMeta, getLabelMap, setLabelMap,
  getFranceData, getDataNoFrance
} from "./helpers/0loader.js";

// === constants.js ===
import {
  PARIS_CODES, getDefaultZoomCode, ECHELONS_SIDEBAR
} from "./helpers/constants.js";

// === selection.js ===
import { createSelectionManager, createMapClickHandler } from "./helpers/selection.js";

// === selectindic.js ===
import {
  getPeriodesForIndicateur, getDefaultPeriode, buildColKey,
  getIndicLabel, getPeriodeLabel
} from "./helpers/selectindic.js";

// === indicators-ddict-js.js ===
import { formatValue, getColLabel, getIndicOptionsByAggDash, getIndicOptionsByAggLogdash, INDICATEURS } from "./helpers/indicators-ddict-js.js";

// === colors.js ===
import {
  computeIndicBins, countBins, createGradientScale, GRADIENT_PALETTES,
  computeEcartFrance, PAL_ECART_FRANCE, ECART_FRANCE_SYMBOLS,
  PAL_IND_DIVERGENT
} from "./helpers/colors.js";

// === legend.js ===
import { createBinsLegend, createGradientLegend, createEcartFranceLegend } from "./helpers/legend.js";

// === maps.js ===
import { renderChoropleth, createMapWrapper, addZoomBehavior } from "./helpers/maps.js";

// === search.js ===
import { createSearchBox } from "./helpers/search.js";

// === 0table.js ===
import {
  sortTableData, computeBarStats, getIndicUnit,
  renderPagination, renderTable, exportCSV, openTableFullscreen
} from "./helpers/0table.js";

// === graph-options.js ===
import { exportSVG } from "./helpers/graph-options.js";

// === duckdb.js — Queries Parquet communes ===
import {
  initDuckDB, initDuckDBBackground, waitForDuckDB,
  registerParquet, queryCommunes, queryFrance
} from "./helpers/duckdb.js";

// Démarrer DuckDB init en arrière-plan
initDuckDBBackground();

// === perf-monitor.js ===
import { PerfMonitor } from "./helpers/perf-monitor.js";
const perf = new PerfMonitor("dash-exdlog");
perf.mark("page-start");
```
<!-- &e IMPORTS -->

<!-- &s FILE_HANDLES -->
```js
// Géométries par échelon (pas de UU car pas de topojson)
const GEO_HANDLES = {
  "Zone d'emploi": FileAttachment("data/nodom_zones-emploi_2025.topojson"),
  "Département": FileAttachment("data/nodom_departement_2025.topojson"),
  "Région": FileAttachment("data/nodom_region_2025.topojson"),
  "EPCI": FileAttachment("data/nodom_epci_2025.topojson"),
  "Aire d'attraction": FileAttachment("data/nodom_aav_2025.topojson"),
  "Bassin de vie": FileAttachment("data/nodom_bv_2025.topojson")
};

// Données agrégées logement (dossier logement/)
const DATA_HANDLES = {
  "Zone d'emploi": FileAttachment("data/logement/agg_exdlog_ze.json"),
  "Département": FileAttachment("data/logement/agg_exdlog_dep.json"),
  "Région": FileAttachment("data/logement/agg_exdlog_reg.json"),
  "EPCI": FileAttachment("data/logement/agg_exdlog_epci.json"),
  "Aire d'attraction": FileAttachment("data/logement/agg_exdlog_aav.json"),
  "Bassin de vie": FileAttachment("data/logement/agg_exdlog_bv.json")
};

// Communes (géo + parquet pour DuckDB)
const COMMUNES_TOPO = FileAttachment("data/nodom_commune-ARM_MINI_2025.topojson");
const COMMUNES_PARQUET = FileAttachment("data/agg_commARM.parquet");

// Séries temporelles logement (DVF + SITADEL + LOVAC)
const SERIES_HANDLES = {
  "EPCI": FileAttachment("data/logement/series_logement_epci.parquet"),
  "Zone d'emploi": FileAttachment("data/logement/series_logement_ze.parquet"),
  "Département": FileAttachment("data/logement/series_logement_dep.parquet"),
  "Région": FileAttachment("data/logement/series_logement_reg.parquet")
};

// Cache local
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
const defaultData = await getData("EPCI");
const defaultGeo = await getGeo("EPCI");
const depGeo = await getGeo("Département");

// Communes geo
const communesTopo = await COMMUNES_TOPO.json();
const communesGeo = rewind(topojson.feature(communesTopo, communesTopo.objects.data), true);

// DuckDB init
const { db, conn } = await initDuckDB();
await registerParquet(db, "communes", await COMMUNES_PARQUET.url());

// LabelMaps pour tous les échelons
for (const ech of Object.keys(DATA_HANDLES)) {
  const data = await getData(ech);
  const meta = getEchelonMeta(ech);
  if (data.length && meta) {
    const lm = new Map();
    data.forEach(d => d.code && d.libelle && lm.set(String(d.code), d.libelle));
    setLabelMap(ech, lm);
  }
}

// Colonnes disponibles
const AVAILABLE_COLUMNS = new Set(Object.keys(defaultData[0] || {}));

// Indicateurs logement : filtrés par _agg_logdash=x dans le ddict
const logementIndicOptions = getIndicOptionsByAggLogdash();

// === SÉRIES TEMPORELLES LOGEMENT VIA DUCKDB ===
// Enregistrer parquet séries EPCI
const seriesEpciUrl = await SERIES_HANDLES["EPCI"].url();
await registerParquet(db, "series_epci", seriesEpciUrl);

// Charger données séries EPCI
const seriesResult = await conn.query(`
  SELECT code, annee, pxm2_mai, pxm2_apt, nbtrans_mai, nbtrans_apt, logaut, logcom
  FROM 'series_epci.parquet'
`);
const seriesEpciAll = seriesResult.toArray().map(row => {
  const r = row.toJSON();
  return {
    code: String(r.code),
    annee: Number(r.annee),
    pxm2_mai: r.pxm2_mai != null ? Number(r.pxm2_mai) : null,
    pxm2_apt: r.pxm2_apt != null ? Number(r.pxm2_apt) : null,
    nbtrans_mai: r.nbtrans_mai != null ? Number(r.nbtrans_mai) : null,
    nbtrans_apt: r.nbtrans_apt != null ? Number(r.nbtrans_apt) : null,
    logaut: r.logaut != null ? Number(r.logaut) : null,
    logcom: r.logcom != null ? Number(r.logcom) : null
  };
});
console.log(`[EXDLOG] Séries EPCI chargées: ${seriesEpciAll.length} lignes`);

// Agréger France (moyenne prix, somme volumes)
const seriesByYear = new Map();
for (const row of seriesEpciAll) {
  if (!seriesByYear.has(row.annee)) {
    seriesByYear.set(row.annee, { annee: row.annee, pxSum: 0, pxCnt: 0, pxAptSum: 0, pxAptCnt: 0, nbtrans: 0, logaut: 0 });
  }
  const agg = seriesByYear.get(row.annee);
  if (row.pxm2_mai) { agg.pxSum += row.pxm2_mai; agg.pxCnt++; }
  if (row.pxm2_apt) { agg.pxAptSum += row.pxm2_apt; agg.pxAptCnt++; }
  agg.nbtrans += (row.nbtrans_mai || 0) + (row.nbtrans_apt || 0);
  agg.logaut += row.logaut || 0;
}
const seriesFrance = [...seriesByYear.values()]
  .map(a => ({
    annee: a.annee,
    pxm2_mai: a.pxCnt ? a.pxSum / a.pxCnt : null,
    pxm2_apt: a.pxAptCnt ? a.pxAptSum / a.pxAptCnt : null,
    nbtrans: a.nbtrans,
    logaut: a.logaut
  }))
  .sort((a, b) => a.annee - b.annee);
console.log(`[EXDLOG] Séries France agrégées: ${seriesFrance.length} années`);

// Codes territoires pré-sélectionnés
const RENNES_CODE = "243500139";
const PARIS_CODE = "200054781";
```
<!-- &e INIT -->

<!-- &s STATE -->
```js
// Pré-sélection : Rennes + Paris pour comparaison
const mapSelectionState = Mutable(new Set([RENNES_CODE, PARIS_CODE]));
const zoomTargetState = Mutable(RENNES_CODE);
const sortState = Mutable({ col: "P23_POP", asc: false });
const pageState = Mutable(0);

// Selection manager
const selectionMgr = createSelectionManager(mapSelectionState, zoomTargetState, pageState);
const { addToSelection, removeFromSelection, setZoomOnly, toggleMapSelection, clearMapSelection } = selectionMgr;

// Tri
const setSort = (col) => {
  const curr = sortState.value.col;
  const asc = sortState.value.asc;
  sortState.value = curr === col ? { col, asc: !asc } : { col, asc: false };
  pageState.value = 0;
};
const setPage = (p) => { pageState.value = p; };
```
<!-- &e STATE -->

<!-- Styles sidebar -->
<style>
.sidebar {
  overflow-x: hidden !important;
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
  max-width: 230px !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}
.sidebar label {
  max-width: 220px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
</style>

<!-- &s SIDEBAR -->
<aside class="sidebar">

<section class="panel">
<div class="panel-title">ÉCHELON</div>

```js
const echelon = view(Inputs.radio(
  ECHELONS_SIDEBAR,
  { value: "EPCI", label: "" }
));
```

</section>

<section class="panel">
<div class="panel-title">INDICATEUR CARTE</div>

```js
// Défaut: prix m² maison (fallback si ecfr pas dispo)
const defaultIndic = logementIndicOptions.has("logd_px2_global") ? "logd_px2_global" : "logd_px2q2_mai";
const indic = view(Inputs.select(logementIndicOptions, { value: defaultIndic, label: "" }));
```

<div class="panel-title" style="margin-top:8px;">Période</div>

```js
const perMap = getPeriodesForIndicateur(indic);
const periode = view(Inputs.select(perMap, { value: [...perMap.values()][0], label: "" }));
```

</section>

<section class="panel">
<div class="panel-title">SÉLECTION TERRITOIRES</div>
<div id="search-container" style="margin-top:6px;min-height:100px;"></div>
</section>

<section class="panel">
<div class="panel-title">OPTIONS CARTE</div>

```js
const _colorModeInput = Inputs.radio(["Répartition", "Écart France", "Gradient"], { value: "Répartition", label: "Mode représ." });
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
<div class="panel-title">FILTRE TYPE EPCI</div>

```js
const typeEpciFilter = view(Inputs.radio(
  ["Tous", "CA/CU/MET", "CC"],
  { value: "Tous", label: "" }
));
```

</section>

<section class="panel">
<div class="panel-title">INDICATEURS TABLEAU <span class="panel-tooltip-wrap"><span class="panel-tooltip-icon">?</span><span class="panel-tooltip-text">ctrl/shift click pour multi-sélection</span></span></div>

```js
// Multi-select indicateurs supplémentaires pour tableau
// Utilise logementIndicOptions (filtré sur log* et rev_*)
const extraIndics = view(Inputs.select(
  logementIndicOptions,
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

const colKey = buildColKey(indic, periode);
const indicLabel = getIndicLabel(indic, "long");

// Joindre données aux géométries
for (const f of currentGeo.features) {
  const row = dataNoFrance.find(d => d.code === f.properties[meta.geoKey]);
  if (row) {
    f.properties[colKey] = row[colKey];
    f.properties.P23_POP = row.P23_POP;
  }
}

// Bins et couleurs
const indicBins = computeIndicBins(dataNoFrance, colKey, indic);
const { bins, palette: PAL, isDiv, getColor: getColorBins } = indicBins;
const gradient = createGradientScale(dataNoFrance, colKey);
const isGradient = colorMode === "Gradient";
const isEcart = colorMode === "Écart France";
const ecart = computeEcartFrance(dataNoFrance, colKey, frData?.[colKey], { indicType: INDICATEURS[indic]?.type });
const getColor = isEcart ? ecart.getColor : isGradient ? gradient.getColor : getColorBins;

// === COLONNES BANNIERE (simplifié : prix global + transactions) ===
const bannerCols = [
  "logd_px2_global_24", "logd_px2_global_vevol_1924", "logd_px2_global_vevol_2224",
  "logd_trans_24", "logd_trans_vevol_1924",
  "logs_logaut_vol_24", "logs_logaut_vtcam_1924",
  "logl_app_m2_25", "log_vac_pct_22", "logv_vac2ans_pct_24"
].filter(c => AVAILABLE_COLUMNS.has(c));
```

```js
// === BANNIÈRE KPI : fond coloré + titre + table ===
const selSetB = mapSelectionState;
const selCodesB = [...(selSetB || [])];
const selDataB = selCodesB.length > 0 ? dataNoFrance.filter(d => selCodesB.includes(d.code)) : [];
const bannerData = [frData, ...selDataB.slice(0, 5)].filter(Boolean).map(d => ({
  ...d, regshort: d.regdep ? d.regdep.split("/")[0] : ""
}));

const bannerColumns = [
  { key: "libelle", label: "Territoire", type: "text", width: 140 },
  ...bannerCols.map(col => {
    const indicKey = col.replace(/_\d+$/, "");
    const per = col.match(/_(\d{2,4})$/)?.[1] || "";
    return { key: col, label: getIndicLabel(indicKey, "short"), unit: getIndicUnit(col), periode: per ? getPeriodeLabel(per, "short") : "" };
  })
];

const bannerStats = computeBarStats(bannerData, bannerCols);
const bannerTable = renderTable({
  data: bannerData, columns: bannerColumns, stats: bannerStats,
  compact: true, maxHeight: 220, scrollX: true, stickyFirstCol: 1
});

// Construire sub-banner pleine largeur (comme exdeco)
const bannerWrap = document.createElement("div");
bannerWrap.className = "sub-banner";
bannerWrap.style.cssText = "position:relative;top:auto;margin-left:0;width:100%;padding:4px 0 2px;";
const bannerInner = document.createElement("div");
bannerInner.style.cssText = "padding:0 8px;";
const bannerTitle = document.createElement("div");
bannerTitle.style.cssText = "font-size:13px;font-weight:600;color:#374151;padding:2px 0 3px 4px;font-family:Inter,system-ui,sans-serif;";
bannerTitle.textContent = "Métriques clés";
bannerInner.appendChild(bannerTitle);
// Fond blanc cellules KPI
bannerTable.style.cssText = (bannerTable.style.cssText || "") + "background:#fff;border-radius:2px;";
bannerInner.appendChild(bannerTable);
bannerWrap.appendChild(bannerInner);
display(bannerWrap);
```

```js
// === SIDEBAR SEARCH ===
const searchData = dataNoFrance.map(d => ({ code: d.code, label: d.libelle || d.code, pop: d.P23_POP, regdep: d.regdep || "" }));
console.log(`[EXDLOG] searchData: ${searchData.length} territoires`);

const searchBox = createSearchBox({
  data: searchData, selection: mapSelectionState, onToggle: toggleMapSelection, onClear: clearMapSelection,
  placeholder: "Recherche (ex: hdf/59)...", maxResults: 8, maxChips: 4, maxWidth: 230, showClearAll: true, showCount: true
});
console.log("[EXDLOG] searchBox créé:", searchBox ? "OK" : "FAIL");

// Attendre que le DOM soit prêt
setTimeout(() => {
  const searchContainer = document.getElementById('search-container');
  console.log("[EXDLOG] searchContainer trouvé:", searchContainer ? "OK" : "NOT FOUND");
  if (searchContainer) {
    searchContainer.innerHTML = '';
    searchContainer.appendChild(searchBox);
    console.log("[EXDLOG] searchBox inséré");
  }
}, 100);
```

<!-- Séparateur bannière / contenu -->
<div style="border-top:1px solid #d1d5db;margin:6px 0 8px 0;"></div>

<!-- &s CARTE_ET_GRAPHIQUES -->
<div style="display:flex;gap:10px;align-items:flex-start;">

<!-- LEFT BLOCK : carte + graphiques + cartes communes -->
<div style="flex:1;display:flex;flex-direction:column;gap:8px;min-width:0;">

<!-- Row carte + graphiques -->
<div style="display:flex;gap:10px;align-items:flex-start;">

<!-- COLONNE 1 : Carte France échelon -->
<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:8px;padding-left:8px;align-self:flex-start;">

```js
// Zoom state persistant et calcul zoomLabel
if (!window._zoomStatesLog) window._zoomStatesLog = {};
const _zoomVal = zoomTargetState;
const labelMap = getLabelMap(echelon);
const zoomCode = (_zoomVal && labelMap?.has(_zoomVal)) ? _zoomVal : getDefaultZoomCode(echelon);
const zoomLabel = labelMap?.get(zoomCode) || zoomCode;
```

<div class="card">

```js
// Carte échelon France
const map = renderChoropleth({
  geoData: currentGeo, valueCol: colKey,
  getColor: (v, f) => getColor(v),
  getCode: f => f.properties[meta.geoKey],
  getLabel: ({ code }) => getLabelMap(echelon)?.get(code) || code,
  formatValue: (k, v) => formatValue(indic, v),
  indicLabel, selectedCodes: [...mapSelectionState],
  showLabels: showValuesOnMap, labelMode, labelBy, topN: 0,
  title: indicLabel, echelon, width: 450, height: 400, maxLabelsAuto: 600,
  overlayGeo: showOverlay && echelon !== "Département" ? depGeo : null
});

const counts = countBins(dataNoFrance, colKey, bins.thresholds || []);
const unit = getIndicUnit(colKey);
const ecartCounts = isEcart ? countBins(dataNoFrance, colKey, ecart.thresholds || []) : [];
const legend = isEcart
  ? createEcartFranceLegend({
      palette: ecart.palette, symbols: ECART_FRANCE_SYMBOLS,
      pctLabels: ecart.pctLabels,
      counts: ecartCounts, title: `Écart France (en ${ecart.isAbsoluteEcart ? "pts" : "%"})`
    })
  : isGradient
  ? createGradientLegend({
      colors: gradient.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradient.min, max: gradient.max, showZero: gradient.divergent,
      decimals: 2, title: `Légende${unit ? " (" + unit + ")" : ""}`,
      capped: true, rawMin: gradient.rawMin, rawMax: gradient.rawMax
    })
  : createBinsLegend({
      colors: PAL, labels: bins.labels || [], counts,
      vertical: true, title: "Légende", unit, reverse: !isDiv
    });

// Click handler
map.style.cursor = "pointer";
map.addEventListener("click", (e) => {
  const path = e.target.closest("path");
  if (!path) return;
  const paths = Array.from(path.parentElement.querySelectorAll("path"));
  const idx = paths.indexOf(path);
  if (idx >= 0 && idx < currentGeo.features.length) {
    const code = currentGeo.features[idx].properties[meta.geoKey];
    if (e.ctrlKey || e.metaKey) {
      addToSelection(code);
    } else {
      setZoomOnly(code);
    }
  }
});

// Tooltip : toujours passer la ref France + getEcartInfo pour symbole au survol
if (map._tipConfig) {
  map._tipConfig.frRef = frData?.[colKey];
  map._tipConfig.frGetEcartInfo = ecart.getEcartInfo;
}

const wrapper = createMapWrapper(map, null, legend, addZoomBehavior(map, {
  initialTransform: window._zoomStatesLog.map1,
  onZoom: t => { window._zoomStatesLog.map1 = t; }
}), {
  exportSVGFn: exportSVG, echelon, colKey, title: indicLabel
});

// Moyenne France
const frVal = frData?.[colKey];
if (frVal != null) {
  const frLbl = document.createElement("div");
  frLbl.style.cssText = "font-size:11px;color:#555;padding:1px 0 0 4px;";
  frLbl.innerHTML = `\u{1F1EB}\u{1F1F7} France : <b style="font-style:italic;">${formatValue(indic, frVal)}</b>`;
  wrapper.appendChild(frLbl);
}
display(wrapper);
```

</div>

</div>
<!-- Fin colonne 1 -->

<!-- COLONNE 2 : Graphiques séries -->
<div style="flex:1 1 400px;min-width:340px;max-width:460px;display:flex;flex-direction:column;gap:4px;align-self:flex-start;">

<!-- Graphique 1 : France référence STATIQUE -->
<div class="card" style="padding:6px 10px;">
<h4 style="margin:0 0 6px 0;font-size:11px;color:#374151;font-family:Inter,system-ui,sans-serif;">France — Volumes et Prix (2010-2024)</h4>

```js
// === GRAPHIQUE 1 : FRANCE - Prix (courbes) + Volumes (barres) ===
// Axe gauche: Prix €/m² | Axe droit implicite: Volumes (transactions, construction)

const anneesFr = seriesFrance.map(d => d.annee).sort((a, b) => a - b);
const maxTrans = Math.max(...seriesFrance.map(d => d.nbtrans || 0));
const maxLogaut = Math.max(...seriesFrance.map(d => d.logaut || 0));
const maxVol = Math.max(maxTrans, maxLogaut);

// Normaliser volumes pour axe prix (factor pour échelle droite)
const volScale = 3000 / maxVol;  // Ajusté pour que barres soient visibles

display(Plot.plot({
  style: { fontFamily: "Inter, system-ui, sans-serif" },
  width: 420,
  height: 200,
  marginLeft: 42,
  marginRight: 50,
  marginBottom: 22,
  x: {
    label: null,
    tickFormat: d => String(Math.round(d)),
    ticks: anneesFr.filter(y => y % 2 === 0)
  },
  y: { label: "€/m²", grid: true, domain: [0, 2500] },
  marks: [
    // Barres transactions (gris clair)
    Plot.barY(seriesFrance.filter(d => d.nbtrans), {
      x: "annee", y: d => d.nbtrans * volScale,
      fill: "#c4c9d0", fillOpacity: 0.7,
      tip: true, title: d => `Transactions: ${(d.nbtrans/1000).toFixed(0)}k`
    }),
    // Barres construction (gris foncé, décalé)
    Plot.barY(seriesFrance.filter(d => d.logaut), {
      x: d => d.annee + 0.3, y: d => d.logaut * volScale,
      fill: "#6b7280", fillOpacity: 0.7,
      tip: true, title: d => `Construction: ${(d.logaut/1000).toFixed(0)}k logements`
    }),
    // Courbe prix maison (trait plein fin)
    Plot.line(seriesFrance.filter(d => d.pxm2_mai), {
      x: "annee", y: "pxm2_mai", stroke: "#0369a1", strokeWidth: 1.8, curve: "natural"
    }),
    // Courbe prix appart (pointillé fin)
    Plot.line(seriesFrance.filter(d => d.pxm2_apt), {
      x: "annee", y: "pxm2_apt", stroke: "#0ea5e9", strokeWidth: 1.5, strokeDasharray: "2,2", curve: "natural"
    }),
    // Points prix
    Plot.dot(seriesFrance, {
      x: "annee", y: "pxm2_mai", fill: "#0369a1", r: 3,
      tip: true, title: d => `Maison ${d.annee}: ${d.pxm2_mai?.toFixed(0)}€/m²`
    }),
    Plot.dot(seriesFrance.filter(d => d.pxm2_apt), {
      x: "annee", y: "pxm2_apt", fill: "#0ea5e9", r: 3,
      tip: true, title: d => `Appart ${d.annee}: ${d.pxm2_apt?.toFixed(0)}€/m²`
    })
  ]
}));
```

<div style="font-size:9px;color:#64748b;display:flex;gap:12px;flex-wrap:wrap;margin-top:2px;">
<span style="display:flex;align-items:center;gap:3px;"><span style="width:14px;height:2px;background:#0369a1;"></span> Maison €/m²</span>
<span style="display:flex;align-items:center;gap:3px;"><span style="width:14px;height:2px;background:#0ea5e9;border-bottom:1px dotted #0ea5e9;"></span> Appart €/m²</span>
<span style="display:flex;align-items:center;gap:3px;"><span style="width:10px;height:10px;background:#c4c9d0;"></span> Transactions</span>
<span style="display:flex;align-items:center;gap:3px;"><span style="width:10px;height:10px;background:#6b7280;"></span> Construction</span>
</div>

</div>

<!-- Graphique 2 : Indice 100 prix global — territoires sélectionnés -->
<div class="card" style="padding:6px 10px;">
<h4 style="margin:0 0 6px 0;font-size:11px;color:#374151;font-family:Inter,system-ui,sans-serif;">Indice prix global (base 100 = 2010) — Territoires sélectionnés</h4>

```js
// === GRAPHIQUE 2 : INDICE 100 PRIX GLOBAL PAR TERRITOIRE ===
const TERR_COLORS = ["#0369a1", "#dc2626", "#059669", "#7c3aed", "#ea580c"];
const selectedCodes = [...mapSelectionState];
const indexSeries = [];
const epciLabelMap = getLabelMap("EPCI");

// Calculer prix global pondéré pour chaque territoire et convertir en indice 100
for (let i = 0; i < selectedCodes.length; i++) {
  const code = selectedCodes[i];
  const terrData = seriesEpciAll.filter(d => d.code === code).sort((a, b) => a.annee - b.annee);
  const label = epciLabelMap?.get(code) || code;

  // Calcul prix global par année : (px_mai × nb_mai + px_apt × nb_apt) / (nb_mai + nb_apt)
  const yearlyGlobal = terrData.map(row => {
    const nm = row.nbtrans_mai || 0, na = row.nbtrans_apt || 0;
    const pm = row.pxm2_mai, pa = row.pxm2_apt;
    let pg = null;
    if (pm && pa && nm + na > 0) pg = (pm * nm + pa * na) / (nm + na);
    else if (pm && !pa) pg = pm;
    else if (!pm && pa) pg = pa;
    return { annee: row.annee, value: pg };
  }).filter(d => d.value != null);

  // Base 100 = première année disponible (idéalement 2010)
  const base = yearlyGlobal.find(d => d.annee === 2010) || yearlyGlobal[0];
  if (base) {
    for (const d of yearlyGlobal) {
      indexSeries.push({ annee: d.annee, terr: label, value: (d.value / base.value) * 100, raw: d.value });
    }
  }
}

// Ajouter France en référence
const frYearlyGlobal = seriesFrance.map(row => {
  const nm = row.nbtrans || 0;
  return { annee: row.annee, value: row.pxm2_mai };  // Approx: prix maison France comme proxy
}).filter(d => d.value != null);
const frBase = frYearlyGlobal.find(d => d.annee === 2010) || frYearlyGlobal[0];
if (frBase && selectedCodes.length > 0) {
  for (const d of frYearlyGlobal) {
    indexSeries.push({ annee: d.annee, terr: "France", value: (d.value / frBase.value) * 100, raw: d.value });
  }
}

const maxYearIdx = indexSeries.length > 0 ? Math.max(...indexSeries.map(d => d.annee)) : 2024;
const anneesIdx = [...new Set(indexSeries.map(d => d.annee))].sort((a, b) => a - b);

if (indexSeries.length > 0) {
  // Anti-collision labels : décaler dy si trop proches
  const endLabels = indexSeries.filter(d => d.annee === maxYearIdx).sort((a, b) => b.value - a.value);
  const labelPositions = [];
  for (const lbl of endLabels) {
    let dy = 0;
    for (const prev of labelPositions) {
      if (Math.abs(lbl.value - prev.value - prev.dy) < 6) dy = prev.dy + (lbl.value < prev.value ? 8 : -8);
    }
    labelPositions.push({ ...lbl, dy });
  }

  // Labels positionnés sur les courbes (dernière année)
  const lastLabels = indexSeries.filter(d => d.annee === maxYearIdx);

  display(Plot.plot({
    style: { fontFamily: "Inter, system-ui, sans-serif" },
    width: 420,
    height: 200,
    marginLeft: 38,
    marginRight: 50,
    marginBottom: 22,
    x: { label: null, tickFormat: d => String(Math.round(d)), ticks: anneesIdx.filter(y => y % 2 === 0) },
    y: { label: "Indice", grid: true },
    color: { domain: [...new Set(indexSeries.map(d => d.terr))], range: [...TERR_COLORS.slice(0, selectedCodes.length), "#94a3b8"] },
    marks: [
      Plot.ruleY([100], { stroke: "#9ca3af", strokeDasharray: "3,3", strokeWidth: 0.8 }),
      Plot.line(indexSeries.filter(d => d.terr === "France"), {
        x: "annee", y: "value", stroke: "#94a3b8", strokeWidth: 1.2, strokeDasharray: "4,3"
      }),
      Plot.line(indexSeries.filter(d => d.terr !== "France"), {
        x: "annee", y: "value", stroke: "terr", strokeWidth: 2
      }),
      Plot.dot(indexSeries, {
        x: "annee", y: "value", fill: "terr", r: 2.5,
        tip: true, title: d => `${d.terr}\n${Math.round(d.annee)}: indice ${d.value?.toFixed(1)} (${d.raw?.toFixed(0)}€/m²)`
      }),
      // Labels sur la courbe (à la dernière année, décalés vers le haut)
      Plot.text(labelPositions, {
        x: "annee", y: d => d.value + d.dy, text: d => `${d.terr.length > 18 ? d.terr.slice(0, 16) + "…" : d.terr} ${d.value?.toFixed(0)}`,
        dx: 4, dy: -8, textAnchor: "end", fontSize: 9, fill: "terr", fontWeight: 600
      })
    ]
  }));
} else {
  display(html`<div style="padding:40px;text-align:center;color:#6b7280;font-size:12px;">
    Ctrl+clic sur la carte pour sélectionner des territoires
  </div>`);
}
```

<div style="font-size:9px;color:#6b7280;margin-top:2px;">
Prix global pondéré (mai+apt) | Base 100 = 2010 | — France ref | Ctrl+clic carte
</div>

</div>
</div>
<!-- Fin colonne 2 graphiques -->

</div>
<!-- Fin row carte + graphiques -->

<!-- Cartes communes (2 côte à côte) -->
<div style="font-size:11px;font-weight:600;color:#374151;margin:6px 0 4px 8px;font-family:Inter,system-ui,sans-serif;">Vue commune — Territoires sélectionnés</div>

```js
// === CARTES COMMUNES (2 côte à côte, sous carte+graphs) ===
const filterKey = meta?.filterKey || "DEP";
const isEPCI = echelon === "EPCI";
const selCodes = [...mapSelectionState];

// 2 codes : zoomCode (clic simple), 1er sélectionné (search/ctrl+clic)
const mapCode1 = zoomCode || RENNES_CODE;
const mapCode2 = selCodes.length > 0 && selCodes[0] !== mapCode1 ? selCodes[0] : (selCodes[1] || PARIS_CODE);
const commTargetsMaps = mapCode1 !== mapCode2 ? [mapCode1, mapCode2] : [mapCode1];

const commQueriesMaps = commTargetsMaps.map(tCode => {
  const tFilter = isEPCI ? null : { [filterKey]: [tCode] };
  const tWhere = isEPCI
    ? `(CAST("EPCI_EPT" AS VARCHAR) = '${tCode}' OR CAST("EPCI" AS VARCHAR) = '${tCode}')`
    : null;
  return queryCommunes({ conn }, {
    tableName: "communes", filter: tFilter, customWhere: tWhere,
    columns: ["code", "libelle", "P23_POP", colKey], limit: 2000
  });
});
const commResultsMaps = await Promise.all(commQueriesMaps);

const commContainerMaps = document.createElement("div");
commContainerMaps.className = "cards-row";
commContainerMaps.style.cssText = "width:auto;max-width:700px;margin:0 0 0 8px;gap:8px;";

for (let ci = 0; ci < commTargetsMaps.length; ci++) {
  const tCode = commTargetsMaps[ci];
  const tLabel = getLabelMap(echelon)?.get(tCode) || tCode;
  const tData = commResultsMaps[ci];
  const tMap = new Map(tData.map(d => [d.code, d]));

  const tFeats = communesGeo.features.filter(f => {
    if (isEPCI) return tMap.has(f.properties.CODGEO);
    return String(f.properties[filterKey]) === String(tCode);
  });
  const tGeo = {
    type: "FeatureCollection",
    features: tFeats.map(f => {
      const d = tMap.get(f.properties.CODGEO);
      return { ...f, properties: { ...f.properties, libelle: d?.libelle, P23_POP: d?.P23_POP, [colKey]: d?.[colKey] } };
    })
  };

  const tBins = tData.length >= 10 ? computeIndicBins(tData, colKey, indic) : indicBins;
  const tGrad = tData.length >= 10 ? createGradientScale(tData, colKey) : gradient;
  const tEcart = isEcart ? computeEcartFrance(tData, colKey, ecart.ref, { sigma: ecart.sigma, indicType: INDICATEURS[indic]?.type }) : null;
  const tGetColor = isEcart ? tEcart.getColor : isGradient ? tGrad.getColor : tBins.getColor;

  // Skip si pas de features (échelon non compatible communes)
  if (tGeo.features.length === 0) continue;

  const cMap = renderChoropleth({
    geoData: tGeo, valueCol: colKey,
    getColor: tGetColor,
    getCode: f => f.properties.CODGEO,
    getLabel: ({ code }) => tMap.get(code)?.libelle || code,
    formatValue: (k, v) => formatValue(indic, v),
    indicLabel, showLabels: showValuesOnMap,
    labelMode, labelBy, topN: 200,
    title: `${tLabel}`,
    maxLabelsAuto: 80, echelon: "Commune", width: 320, height: 260
  });

  if (!cMap) continue;  // Protection si renderChoropleth retourne null

  if (cMap._tipConfig) {
    cMap._tipConfig.frRef = frData?.[colKey];
    cMap._tipConfig.frGetEcartInfo = isEcart ? tEcart.getEcartInfo : ecart.getEcartInfo;
  }

  const tEcartCounts = isEcart ? countBins(tData, colKey, tEcart.thresholds || []) : [];
  const cLegend = isEcart
    ? createEcartFranceLegend({
        palette: tEcart.palette, symbols: ECART_FRANCE_SYMBOLS,
        pctLabels: tEcart.pctLabels,
        counts: tEcartCounts, title: `Écart France`
      })
    : isGradient
    ? createGradientLegend({
        colors: tGrad.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
        min: tGrad.min, max: tGrad.max, showZero: tGrad.divergent,
        decimals: 2, title: "Légende", capped: true, rawMin: tGrad.rawMin, rawMax: tGrad.rawMax
      })
    : createBinsLegend({
        colors: tBins.palette, labels: tBins.bins.labels || [],
        counts: countBins(tData, colKey, tBins.bins.thresholds || []),
        vertical: true, title: "Légende", unit: getIndicUnit(colKey), reverse: !tBins.isDiv
      });

  const card = document.createElement("div");
  card.className = "card";
  card.style.cssText = "padding:6px;display:flex;flex-direction:column;min-height:0;";
  card.appendChild(createMapWrapper(cMap, null, cLegend, addZoomBehavior(cMap, {}), {
    exportSVGFn: exportSVG, echelon: tLabel, colKey, title: `${indicLabel} — ${tLabel}`
  }));
  commContainerMaps.appendChild(card);
}

display(commContainerMaps);
```

</div>
<!-- Fin LEFT BLOCK -->

<!-- COLONNE DROITE : Communes >50K habitants -->
<div style="flex:0 0 auto;min-width:300px;display:flex;flex-direction:column;align-self:stretch;overflow-y:auto;overflow-x:hidden;">

```js
// === SORT STATE COMMUNES (bloc séparé pour réactivité) ===
const commSortState = Mutable({col: "logd_px2_global_24", asc: false});
const setCommSort = (col) => {
  const cur = commSortState.value;
  commSortState.value = { col, asc: cur.col === col ? !cur.asc : false };
};
```

```js
// === COMMUNES >50K — Requête DuckDB parquet ===
const commCols50k = [
  "logd_px2_global_24", "logd_px2_global_vevol_1924", "logd_px2_global_vevol_2224",
  "logd_trans_24", "logd_trans_vevol_1924"
];
const commColsSql = commCols50k.map(c => `CAST("${c}" AS DOUBLE) AS "${c}"`).join(", ");

const commResult50k = await conn.query(`
  SELECT CAST(code AS VARCHAR) AS code, libelle,
    CAST("P23_POP" AS DOUBLE) AS P23_POP, ${commColsSql}
  FROM 'communes.parquet'
  WHERE CAST("P23_POP" AS DOUBLE) >= 50000
    AND CAST("logd_px2_global_24" AS DOUBLE) IS NOT NULL
  ORDER BY CAST("logd_px2_global_24" AS DOUBLE) DESC
`);
const commData50k = commResult50k.toArray().map(r => {
  const d = r.toJSON();
  const out = { code: String(d.code), libelle: d.libelle, P23_POP: Number(d.P23_POP) };
  for (const c of commCols50k) out[c] = d[c] != null ? Number(d[c]) : null;
  return out;
});

// Filtre recherche
const commSearchEl = document.createElement("input");
commSearchEl.type = "text";
commSearchEl.placeholder = "Recherche commune...";
commSearchEl.style.cssText = "width:100%;padding:3px 6px;font-size:11px;border:1px solid #d1d5db;border-radius:3px;margin-bottom:4px;font-family:Inter,system-ui,sans-serif;";
let commSearchVal = "";
commSearchEl.addEventListener("input", () => {
  commSearchVal = commSearchEl.value.toLowerCase();
  renderCommTable();
});

// Tri
const sortCol = commSortState.col;
const sortAsc = commSortState.asc;

// Stats par colonne : France ref + écart-type pour colorisation
const commColStats = {};
for (const col of commCols50k) {
  const vals = commData50k.map(d => d[col]).filter(v => v != null);
  const n = vals.length;
  const mean = n > 0 ? vals.reduce((s, v) => s + v, 0) / n : 0;
  const std = n > 1 ? Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n) : 0;
  // France ref via frData
  const frRef = frData?.[col];
  commColStats[col] = { mean, std, frRef: frRef != null ? frRef : mean };
}

// Colorisation 4 classes écart France (palette PAL_IND_DIVERGENT) + rouge pour négatifs
// PAL_IND_DIVERGENT = [violet foncé, violet moyen, rose clair, vert clair, vert moyen, vert foncé]
const colorCell = (col, val) => {
  if (val == null || !commColStats[col]) return "";
  if (col.includes("trans") && !col.includes("vevol")) return "";
  const { std, frRef } = commColStats[col];
  if (std === 0) return "";
  const z = (val - frRef) / std;
  let bg = "";
  if (z >= 2) bg = `background:${PAL_IND_DIVERGENT[4]};`;       // vert moyen
  else if (z >= 1) bg = `background:${PAL_IND_DIVERGENT[3]};`;  // vert clair
  else if (z <= -2) bg = `background:${PAL_IND_DIVERGENT[1]};`; // violet moyen
  else if (z <= -1) bg = `background:${PAL_IND_DIVERGENT[2]};`; // rose clair
  return bg;
};
// Police rouge pour valeurs négatives
const fmtColor = (val) => val != null && val < 0 ? "color:#dc2626;" : "";

// Header avec tooltip note de lecture
const commHeader = document.createElement("div");
commHeader.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;";
commHeader.innerHTML = `<span style="font-size:12px;font-weight:600;color:#1e293b;font-family:Inter,system-ui,sans-serif;">Communes >50K hab. <span class="panel-tooltip-wrap" style="margin-left:2px;"><span class="panel-tooltip-icon">?</span><span class="panel-tooltip-text" style="width:220px;left:0;transform:none;">Communes >50 000 hab. Prix DVF pondéré (maisons+appart). Fond vert = supérieur à la réf. France, fond violet = inférieur. Zone neutre ±1σ autour de la réf.</span></span></span><span style="font-size:10px;color:#9ca3af;font-family:Inter,system-ui,sans-serif;">${commData50k.length} villes</span>`;

// Container table
const commTableWrap = document.createElement("div");
commTableWrap.style.cssText = "max-height:calc(100vh - 240px);overflow-y:auto;overflow-x:auto;font-family:Inter,system-ui,sans-serif;";

// Abréviation Arrondissement → Arr.
const shortLib = (v) => v ? v.replace(/Arrondissement/gi, "Arr.").replace(/\s+/g, " ") : "—";

const colDefs = [
  { key: "libelle", label: "Commune", sub: "", w: 115, align: "left", fmt: shortLib, noFrRef: false },
  { key: "logd_px2_global_24", label: "Prix global", sub: "€/m² — 2024", w: 58, align: "right", fmt: v => v != null ? Math.round(v).toLocaleString("fr") : "—" },
  { key: "logd_px2_global_vevol_1924", label: "Δ Prix", sub: "% — 19-24", w: 50, align: "right", fmt: v => v != null ? (v > 0 ? "+" : "") + v.toFixed(1) + "%" : "—" },
  { key: "logd_px2_global_vevol_2224", label: "Δ Prix", sub: "% — 22-24", w: 50, align: "right", fmt: v => v != null ? (v > 0 ? "+" : "") + v.toFixed(1) + "%" : "—" },
  { key: "logd_trans_24", label: "Transactions", sub: "nb — 2024", w: 62, align: "right", fmt: v => v != null ? Math.round(v).toLocaleString("fr") : "—", noFrRef: true },
  { key: "logd_trans_vevol_1924", label: "Δ Trans.", sub: "% — 19-24", w: 52, align: "right", fmt: v => v != null ? (v > 0 ? "+" : "") + v.toFixed(1) + "%" : "—" }
];

function renderCommTable() {
  let filtered = commData50k;
  if (commSearchVal) {
    filtered = commData50k.filter(d => (d.libelle || "").toLowerCase().includes(commSearchVal));
  }
  // Tri
  const sc = commSortState.col, sa = commSortState.asc;
  filtered = [...filtered].sort((a, b) => {
    const va = a[sc], vb = b[sc];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "string") return sa ? va.localeCompare(vb) : vb.localeCompare(va);
    return sa ? va - vb : vb - va;
  });

  const thStyle = "padding:3px 4px;font-size:10.5px;font-weight:600;color:#374151;border-bottom:2px solid #d1d5db;cursor:pointer;white-space:nowrap;position:sticky;top:0;background:#f8fafc;z-index:2;";
  const tdStyle = "padding:2px 4px;font-size:11px;color:#1e293b;border-bottom:1px solid #e5e7eb;white-space:nowrap;background:#fff;";

  let html = `<table style="width:100%;border-collapse:collapse;"><thead><tr>`;
  for (const cd of colDefs) {
    const arrow = sc === cd.key ? (sa ? " ↑" : " ↓") : "";
    const subLine = cd.sub ? `<br><span style="font-weight:400;font-size:9px;color:#6b7280;">${cd.sub}</span>` : "";
    html += `<th data-col="${cd.key}" style="${thStyle}text-align:${cd.align};min-width:${cd.w}px;">${cd.label}${arrow}${subLine}</th>`;
  }
  html += `</tr></thead><tbody>`;
  // Ligne référence France (sticky sous header)
  html += `<tr style="background:#f1f5f9;font-weight:600;position:sticky;top:36px;z-index:1;">`;
  for (const cd of colDefs) {
    const frVal = cd.key === "libelle" ? "🇫🇷 France" : cd.noFrRef ? "—" : (commColStats[cd.key]?.frRef != null ? cd.fmt(commColStats[cd.key].frRef) : "—");
    html += `<td style="padding:2px 4px;font-size:10px;color:#1e293b;border-bottom:2px solid #94a3b8;white-space:nowrap;text-align:${cd.align};">${frVal}</td>`;
  }
  html += `</tr>`;
  for (const d of filtered) {
    html += `<tr style="cursor:default;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background=''">`;
    for (const cd of colDefs) {
      const bgStyle = cd.key !== "libelle" ? colorCell(cd.key, d[cd.key]) : "";
      const txtColor = cd.key !== "libelle" ? fmtColor(d[cd.key]) : "";
      html += `<td style="${tdStyle}text-align:${cd.align};${bgStyle}${txtColor}">${cd.fmt(d[cd.key])}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  commTableWrap.innerHTML = html;

  // Bind sort handlers
  commTableWrap.querySelectorAll("th[data-col]").forEach(th => {
    th.addEventListener("click", () => setCommSort(th.dataset.col));
  });
}

renderCommTable();
display(commHeader);
display(commSearchEl);
display(commTableWrap);
```

</div>
<!-- Fin colonne 3 Communes >50K -->

</div>
<!-- &e CARTE_ET_GRAPHIQUES -->

<!-- &s TABLEAU -->
<div style="margin-top:16px;padding-left:12px;">
<h3 style="margin:0 0 8px 0;">Tableau ${echelon}</h3>

<div class="card" style="padding:8px;">

```js
// State tableau
const echSortState = Mutable({ col: null, asc: false });
const setEchSort = (col) => {
  const curr = echSortState.value.col;
  const asc = echSortState.value.asc;
  echSortState.value = curr === col ? { col, asc: !asc } : { col, asc: false };
};
```

```js
const echSearchInput = view(Inputs.text({ placeholder: "Recherche territoire...", width: 200 }));
```

```js
// Colonnes indicateurs logement clés + extras du multi-select
const extraCols = (extraIndics || []).filter(i => !i.startsWith("__sep_")).map(i => buildColKey(i, getDefaultPeriode(i)));
const baseCols = [
  colKey,
  // Prix
  "logd_px2q2_mai_24", "logd_px2_mai_vevol_1924",
  "logd_px2q2_appt_24", "logd_px2_appt_vevol_1924",
  // Transactions
  "logd_trans_24", "logd_trans_vevol_1924",
  // Construction
  "logs_logaut_vol_24", "logs_logaut_vtcam_1924",
  // Loyers
  "logl_app_m2_25", "logl_mai_m2_25",
  // Vacance
  "log_vac_pct_22", "logv_vac2ans_pct_24"
];
const logementCols = [...new Set([...extraCols, ...baseCols])].filter(c => AVAILABLE_COLUMNS.has(c));

// Filtrer données si EPCI : type + pop > 20k
let tableDataBase = dataNoFrance;
if (echelon === "EPCI") {
  tableDataBase = dataNoFrance.filter(d => {
    // Filtre population > 20k
    if ((d.P23_POP || 0) < 20000) return false;
    // Filtre type EPCI
    if (typeEpciFilter !== "Tous") {
      const t = d.type_epci || "";
      if (typeEpciFilter === "CA/CU/MET") return t === "CA" || t === "CU" || t === "MET" || t === "EPT";
      if (typeEpciFilter === "CC") return t === "CC";
    }
    return true;
  });
}

// Données avec France + regshort
const echTableData = (frData ? [frData, ...tableDataBase] : tableDataBase).map(d => ({
  ...d, regshort: d.regdep ? d.regdep.split("/")[0] : ""
}));

// Filtre recherche
const echSearchVal = (echSearchInput || "").toLowerCase();
const echFiltered = echSearchVal
  ? echTableData.filter(d => d.code === "00FR" || (d.regshort || "").toLowerCase().includes(echSearchVal) || (d.libelle || "").toLowerCase().includes(echSearchVal))
  : echTableData;

// Tri
const echSortCol = echSortState.col;
const echSortAsc = echSortState.asc;
const echSorted = sortTableData(echFiltered, echSortCol, echSortAsc);

// Stats barres
const echStats = computeBarStats(echFiltered, logementCols);

// Colonnes
const echColumns = [
  { key: "regshort", label: "Rég", type: "text", width: 45 },
  { key: "libelle", label: "Territoire", type: "text", width: 150 },
  { key: "P23_POP", label: "Pop 2023", unit: "hab" },
  ...logementCols.map(col => {
    const indicKey = col.replace(/_\d+$/, "");
    const per = col.match(/_(\d{2,4})$/)?.[1] || "";
    return {
      key: col,
      label: getIndicLabel(indicKey, "short"),
      unit: getIndicUnit(col),
      periode: per ? getPeriodeLabel(per, "short") : ""
    };
  })
];

// Header
display(html`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
  <span style="font-size:10px;color:#6b7280;">${echFiltered.length} terr.${echelon === "EPCI" ? " (>20k hab)" : ""}</span>
  <div style="display:flex;gap:4px;">
    <button style="font-size:10px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;"
      onclick=${() => exportCSV(echSorted, echColumns, "logement_" + echelon.replace(/[^a-zA-Z]/g, "") + "_" + new Date().toISOString().slice(0,10) + ".csv")}>
      📥
    </button>
    <button style="font-size:12px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;" title="Plein écran"
      onclick=${() => { const t = document.querySelector(".log-table-fs-target"); if (t) openTableFullscreen(t); }}>
      ⤢
    </button>
  </div>
</div>`);

// Tableau
const tableWrapper = document.createElement("div");
tableWrapper.className = "log-table-fs-target";
tableWrapper.style.cssText = "display:flex;flex-direction:column;";

const tableEl = renderTable({
  data: echSorted,
  columns: echColumns,
  stats: echStats,
  sortCol: echSortCol,
  sortAsc: echSortAsc,
  setSort: setEchSort,
  indicColKey: colKey,
  compact: true,
  maxHeight: 500,
  scrollX: true,
  scrollbarTop: true,
  stickyFirstCol: 2
});
tableWrapper.appendChild(tableEl);
display(tableWrapper);
```

</div>
</div>
<!-- &e TABLEAU -->

<!-- &s PERF_PANEL -->
```js
perf.mark("page-end");
perf.measure("total-render", "page-start", "page-end");
perf.log();
perf.print();
```
<!-- &e PERF_PANEL -->

</div>
<!-- &e LAYOUT_MAIN -->
