---
title: OTTD — Logement
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     EXDLOG — Volet Logement (Prix, Construction, Vacance)
     Date: 2026-02-10 | v2.0
     Layout: Sidebar duplex | KPIs | 2×2 cartes (national+commune) | Graphs | Tableaux
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
  PARIS_CODES, getDefaultZoomCode, ECHELONS_SIDEBAR,
  MIN_POP_DEFAULT, PAGE_SIZE_DEFAULT
} from "./helpers/constants.js";

// === selection.js ===
import { createSelectionManager, createMapClickHandler } from "./helpers/selection.js";

// === selectindic.js ===
import {
  getPeriodesForIndicateur, getDefaultPeriode, buildColKey,
  getIndicLabel, getPeriodeLabel
} from "./helpers/selectindic.js";

// === indicators-ddict-js.js ===
import { formatValue, getColLabel, getIndicOptionsByAggDash, INDICATEURS, THEMES } from "./helpers/indicators-ddict-js.js";

// === colors.js ===
import {
  computeIndicBins, countBins, createGradientScale, GRADIENT_PALETTES,
  computeEcartFrance, PAL_ECART_FRANCE, ECART_FRANCE_SYMBOLS
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
  registerParquet, queryCommunes, queryFrance, getParquetColumns
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
const COMMUNES_GEO_PARQUET = FileAttachment("data/agg_commARM.parquet");
const COMMUNES_LOG_PARQUET = FileAttachment("data/logement/agg_comm_qlog.parquet");

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

// DuckDB init — 2 parquets (geo=toutes communes+filtres, log=colonnes logement)
const { db, conn } = await initDuckDB();
await registerParquet(db, "communes_geo", await COMMUNES_GEO_PARQUET.url());
await registerParquet(db, "communes_log", await COMMUNES_LOG_PARQUET.url());

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

// Colonnes disponibles (EPCI JSON = cartes nationales, DuckDB = communes)
const AVAILABLE_COLUMNS = new Set(Object.keys(defaultData[0] || {}));
const _geoCols = await getParquetColumns({conn}, "communes_geo");
const _logCols = await getParquetColumns({conn}, "communes_log");
const COMM_COLUMNS = new Set([..._geoCols, ..._logCols]);

// VIEW communes_v : g.* (toutes colonnes geo, 34860 communes) + colonnes EXCLUSIVES log
// Fix : prendre log_* depuis geo (34860 rows) et non log (3696 rows)
const _logOnlyCols = [..._logCols].filter(c => !_geoCols.has(c));
try {
  const logSelect = _logOnlyCols.length > 0
    ? ", " + _logOnlyCols.map(c => 'l."' + c + '"').join(", ")
    : "";
  await conn.query(`CREATE OR REPLACE VIEW communes_v AS SELECT g.*${logSelect} FROM 'communes_geo.parquet' g LEFT JOIN 'communes_log.parquet' l ON g.code = l.code`);
  console.log("[EXDLOG] VIEW communes_v créée — g.* (" + _geoCols.size + " cols) + " + _logOnlyCols.length + " cols log-only");
} catch (err) {
  console.error("[EXDLOG] VIEW création échouée:", err.message);
  await conn.query(`CREATE OR REPLACE VIEW communes_v AS SELECT * FROM 'communes_geo.parquet'`);
  console.log("[EXDLOG] Fallback: VIEW = communes_geo only");
}

// Indicateurs logement : filtrés par thèmes log* + colonnes disponibles dans les données
const _logThemes = new Set(["log", "logd", "logv", "logsr", "logsn", "logl", "logs"]);
const _logEntries = [];
const _sortedLT = Object.entries(THEMES).filter(([k]) => _logThemes.has(k)).sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));
for (const [thKey, thInfo] of _sortedLT) {
  const thIndics = Object.entries(INDICATEURS)
    .filter(([key, info]) => info.theme === thKey && info.periodes?.some(p => AVAILABLE_COLUMNS.has(`${key}_${p}`)))
    .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));
  if (thIndics.length > 0) {
    _logEntries.push([`── ${thInfo.label} ──`, `__sep_${thKey}__`]);
    for (const [ik, ii] of thIndics) _logEntries.push([ii.medium || ii.short || ik, ik]);
  }
}
const logementIndicOptions = new Map(_logEntries);

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

<a href="#vue-communes-detail" style="display:block;font-size:11.5px;color:#0369a1;text-decoration:none;font-family:Inter,system-ui,sans-serif;font-weight:600;padding:0 0 4px 0;margin:0;">↓ Vue Tab. communes détail</a>

<section class="panel">
<div class="panel-title">INDICATEUR CARTE 1</div>

```js
const _logdashVals = new Set(logementIndicOptions.values());
const defaultIndic1 = _logdashVals.has("logd_px2_global") ? "logd_px2_global" : "logd_px2q2_mai";
const indic1 = view(Inputs.select(logementIndicOptions, { value: defaultIndic1, label: "" }));
```

```js
const perMap1 = getPeriodesForIndicateur(indic1);
const periode1 = view(Inputs.select(perMap1, { value: [...perMap1.values()][0], label: "Période" }));
```

```js
const colorMode1 = view(Inputs.radio(["Répart.", "Écart Fr.", "Gradient"], { value: "Répart.", label: "" }));
```

</section>

<section class="panel">
<div class="panel-title">INDICATEUR CARTE 2</div>

```js
const defaultIndic2 = _logdashVals.has("logd_px2_global_vevol") ? "logd_px2_global_vevol" : "log_vac_pct";
const indic2 = view(Inputs.select(logementIndicOptions, { value: defaultIndic2, label: "" }));
```

```js
const perMap2 = getPeriodesForIndicateur(indic2);
const periode2 = view(Inputs.select(perMap2, { value: [...perMap2.values()][0], label: "Période" }));
```

```js
const colorMode2 = view(Inputs.radio(["Répart.", "Écart Fr.", "Gradient"], { value: "Écart Fr.", label: "" }));
```

</section>

<section class="panel">
<div class="panel-title">SÉLECTION TERRITOIRES</div>
<div id="search-container" style="margin-top:6px;min-height:100px;"></div>
</section>

<section class="panel">
<div class="panel-title">OPTIONS CARTES</div>

```js
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

// Aliases rétro-compat (colKey = carte 1 pour tableaux/bannière)
const indic = indic1;
const periode = periode1;
const colKey = buildColKey(indic1, periode1);
const colKey1 = colKey;
const colKey2 = buildColKey(indic2, periode2);
const indicLabel = getIndicLabel(indic1, "long");
const indicLabel2 = getIndicLabel(indic2, "long");

// Joindre données aux géométries (les 2 colKeys)
for (const f of currentGeo.features) {
  const row = dataNoFrance.find(d => d.code === f.properties[meta.geoKey]);
  if (row) {
    f.properties[colKey1] = row[colKey1];
    f.properties[colKey2] = row[colKey2];
    f.properties.P23_POP = row.P23_POP;
  }
}

// Bins et couleurs — CARTE 1
const _cm1 = colorMode1;
const indicBins = computeIndicBins(dataNoFrance, colKey1, indic1);
const { bins, palette: PAL, isDiv, getColor: getColorBins } = indicBins;
const gradient = createGradientScale(dataNoFrance, colKey1);
const isGradient = _cm1 === "Gradient";
const isEcart = _cm1 === "Écart Fr.";
const ecart = computeEcartFrance(dataNoFrance, colKey1, frData?.[colKey1], { indicType: INDICATEURS[indic1]?.type });
const getColor = isEcart ? ecart.getColor : isGradient ? gradient.getColor : getColorBins;

// Bins et couleurs — CARTE 2
const _cm2 = colorMode2;
const indicBins2 = computeIndicBins(dataNoFrance, colKey2, indic2);
const gradient2 = createGradientScale(dataNoFrance, colKey2);
const isGradient2 = _cm2 === "Gradient";
const isEcart2 = _cm2 === "Écart Fr.";
const ecart2 = computeEcartFrance(dataNoFrance, colKey2, frData?.[colKey2], { indicType: INDICATEURS[indic2]?.type });
const getColor2 = isEcart2 ? ecart2.getColor : isGradient2 ? gradient2.getColor : indicBins2.getColor;

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
  { key: "libelle", label: "", type: "text", width: 140 },
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

// Titre + tableau KPI — flush en haut (compense padding layout-main)
const bannerBlock = document.createElement("div");
bannerBlock.style.cssText = "margin:-8px -20px 0 -16px;padding:0;";
const bannerTitle = document.createElement("div");
bannerTitle.style.cssText = "background:#e8eaed;padding:5px 16px;font-size:12px;font-weight:600;color:#374151;font-family:Inter,system-ui,sans-serif;";
bannerTitle.textContent = "Métriques clés — France et territoires sélectionnés";
bannerBlock.appendChild(bannerTitle);
const bannerTableWrap = document.createElement("div");
bannerTableWrap.style.cssText = "padding:0 16px;background:#fff;";
bannerTable.style.cssText = (bannerTable.style.cssText || "") + "background:#fff;width:100%;";
bannerTableWrap.appendChild(bannerTable);
bannerBlock.appendChild(bannerTableWrap);
display(bannerBlock);
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

```js
// === PRE-COMPUTE : Zoom + Commune maps data ===
if (!window._zoomStatesLog) window._zoomStatesLog = {};
const _zoomVal = zoomTargetState;
const labelMap = getLabelMap(echelon);
const zoomCode = (_zoomVal && labelMap?.has(_zoomVal)) ? _zoomVal : getDefaultZoomCode(echelon);
const zoomLabel = labelMap?.get(zoomCode) || zoomCode;

// Commune maps : pre-fetch data pour les 2 cibles
const _fk = meta?.filterKey || "DEP";
const _isEPCI = echelon === "EPCI";
const _selCodes = [...mapSelectionState];
const _mc1 = zoomCode || RENNES_CODE;
const _mc2 = _selCodes.length > 0 && _selCodes[0] !== _mc1 ? _selCodes[0] : (_selCodes[1] || PARIS_CODE);

const _fetchComm = async (tCode) => {
  const cols = ["code", "libelle", "P23_POP", colKey1, colKey2].filter((v,i,a) => a.indexOf(v) === i && COMM_COLUMNS.has(v));
  const colsSql = cols.map(c => `"${c}"`).join(", ");
  const where = _isEPCI
    ? `(CAST("EPCI_EPT" AS VARCHAR) = '${tCode}' OR CAST("EPCI" AS VARCHAR) = '${tCode}')`
    : `CAST("${_fk}" AS VARCHAR) = '${tCode}'`;
  try {
    const result = await conn.query(`SELECT ${colsSql} FROM communes_v WHERE ${where} LIMIT 2000`);
    return result.toArray().map(r => { const d = r.toJSON(); d.code = String(d.code); if (d.P23_POP != null) d.P23_POP = Number(d.P23_POP); return d; });
  } catch (err) { console.error("[EXDLOG] _fetchComm error:", err.message); return []; }
};
const [_cd1, _cd2] = await Promise.all([_fetchComm(_mc1), _fetchComm(_mc2)]);

// Helper : crée un élément carte commune (paramétrable carte 1 ou 2 via opts)
function buildCommMap(tCode, tData, w, h, opts = {}) {
  const _ck = opts.colKey || colKey1;
  const _ind = opts.indic || indic1;
  const _ib = opts.indicBins || indicBins;
  const _gr = opts.gradient || gradient;
  const _isE = opts.isEcart != null ? opts.isEcart : isEcart;
  const _ec = opts.ecart || ecart;
  const _isG = opts.isGradient != null ? opts.isGradient : isGradient;
  const _il = opts.indicLabel || indicLabel;

  const tLabel = getLabelMap(echelon)?.get(tCode) || tCode;
  const tMap = new Map(tData.map(d => [d.code, d]));
  const tFeats = communesGeo.features.filter(f => _isEPCI ? tMap.has(f.properties.CODGEO) : String(f.properties[_fk]) === String(tCode));
  const tGeo = { type: "FeatureCollection", features: tFeats.map(f => { const d = tMap.get(f.properties.CODGEO); return { ...f, properties: { ...f.properties, libelle: d?.libelle, P23_POP: d?.P23_POP, [_ck]: d?.[_ck] } }; }) };
  if (tGeo.features.length === 0) return null;
  const tBins = tData.length >= 10 ? computeIndicBins(tData, _ck, _ind) : _ib;
  const tGrad = tData.length >= 10 ? createGradientScale(tData, _ck) : _gr;
  const tEcart = _isE ? computeEcartFrance(tData, _ck, _ec.ref, { sigma: _ec.sigma, indicType: INDICATEURS[_ind]?.type }) : null;
  const tGetColor = _isE ? tEcart.getColor : _isG ? tGrad.getColor : tBins.getColor;
  const cMap = renderChoropleth({ geoData: tGeo, valueCol: _ck, getColor: tGetColor, getCode: f => f.properties.CODGEO, getLabel: ({ code }) => tMap.get(code)?.libelle || code, formatValue: (k, v) => formatValue(_ind, v), indicLabel: _il, showLabels: showValuesOnMap, labelMode, labelBy, topN: 200, title: tLabel, maxLabelsAuto: 80, echelon: "Commune", width: w, height: h });
  if (!cMap) return null;
  if (cMap._tipConfig) { cMap._tipConfig.frRef = frData?.[_ck]; cMap._tipConfig.frGetEcartInfo = _isE ? tEcart?.getEcartInfo : _ec.getEcartInfo; }
  const tEcartCounts = _isE ? countBins(tData, _ck, tEcart.thresholds || []) : [];
  const cLegend = _isE
    ? createEcartFranceLegend({ palette: tEcart.palette, symbols: ECART_FRANCE_SYMBOLS, pctLabels: tEcart.pctLabels, counts: tEcartCounts, title: "Écart France" })
    : _isG
    ? createGradientLegend({ colors: tGrad.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential, min: tGrad.min, max: tGrad.max, showZero: tGrad.divergent, decimals: 2, title: "Légende", capped: true, rawMin: tGrad.rawMin, rawMax: tGrad.rawMax })
    : createBinsLegend({ colors: tBins.palette, labels: tBins.bins.labels || [], counts: countBins(tData, _ck, tBins.bins.thresholds || []), vertical: true, title: "Légende", unit: getIndicUnit(_ck), reverse: !tBins.isDiv });
  const card = document.createElement("div");
  card.style.cssText = "padding:4px;";
  card.appendChild(createMapWrapper(cMap, null, cLegend, addZoomBehavior(cMap, {}), { exportSVGFn: exportSVG, echelon: tLabel, colKey: _ck, title: `${_il} — ${tLabel}` }));
  return card;
}
```

<!-- &s CARTES_GRAPHS_TABLE -->
<div style="display:flex;gap:6px;align-items:stretch;">

<!-- COLONNE GAUCHE : cartes + graphs -->
<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:4px;padding-left:6px;">

```js
display(html`<h3 style="margin:0 0 4px 0;">Vue France par ${echelon} // Focus communes : ${zoomLabel}</h3>`);
```

<!-- Cartes nationales côte à côte -->
<div class="cards-row">

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
  title: indicLabel, echelon, width: 395, height: 365, maxLabelsAuto: 600,
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

</div><!-- Fin carte nationale 1 -->

<div class="card">

```js
// === CARTE NATIONALE 2 (indic2) ===
const map2 = renderChoropleth({
  geoData: currentGeo, valueCol: colKey2,
  getColor: (v, f) => getColor2(v),
  getCode: f => f.properties[meta.geoKey],
  getLabel: ({ code }) => getLabelMap(echelon)?.get(code) || code,
  formatValue: (k, v) => formatValue(indic2, v),
  indicLabel: indicLabel2, selectedCodes: [...mapSelectionState],
  showLabels: showValuesOnMap, labelMode, labelBy, topN: 0,
  title: indicLabel2, echelon, width: 395, height: 365, maxLabelsAuto: 600,
  overlayGeo: showOverlay && echelon !== "Département" ? depGeo : null
});

const counts2 = countBins(dataNoFrance, colKey2, indicBins2.bins.thresholds || []);
const unit2log = getIndicUnit(colKey2);
const ecartCounts2 = isEcart2 ? countBins(dataNoFrance, colKey2, ecart2.thresholds || []) : [];
const legend2 = isEcart2
  ? createEcartFranceLegend({
      palette: ecart2.palette, symbols: ECART_FRANCE_SYMBOLS,
      pctLabels: ecart2.pctLabels,
      counts: ecartCounts2, title: `Écart Fr. (en ${ecart2.isAbsoluteEcart ? "pts" : "%"})`
    })
  : isGradient2
  ? createGradientLegend({
      colors: gradient2.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradient2.min, max: gradient2.max, showZero: gradient2.divergent,
      decimals: 2, title: `Légende${unit2log ? " (" + unit2log + ")" : ""}`,
      capped: true, rawMin: gradient2.rawMin, rawMax: gradient2.rawMax
    })
  : createBinsLegend({
      colors: indicBins2.palette, labels: indicBins2.bins.labels || [], counts: counts2,
      vertical: true, title: "Légende", unit: unit2log, reverse: !indicBins2.isDiv
    });

map2.style.cursor = "pointer";
map2.addEventListener("click", (e) => {
  const path = e.target.closest("path");
  if (!path) return;
  const paths = Array.from(path.parentElement.querySelectorAll("path"));
  const idx = paths.indexOf(path);
  if (idx >= 0 && idx < currentGeo.features.length) {
    const code = currentGeo.features[idx].properties[meta.geoKey];
    if (e.ctrlKey || e.metaKey) addToSelection(code);
    else setZoomOnly(code);
  }
});

if (map2._tipConfig) {
  map2._tipConfig.frRef = frData?.[colKey2];
  map2._tipConfig.frGetEcartInfo = ecart2.getEcartInfo;
}

const wrapper2log = createMapWrapper(map2, null, legend2, addZoomBehavior(map2, {
  initialTransform: window._zoomStatesLog.map2,
  onZoom: t => { window._zoomStatesLog.map2 = t; }
}), { exportSVGFn: exportSVG, echelon, colKey: colKey2, title: indicLabel2 });

const frVal2log = frData?.[colKey2];
if (frVal2log != null) {
  const frLbl2 = document.createElement("div");
  frLbl2.style.cssText = "font-size:11px;color:#555;padding:1px 0 0 4px;";
  frLbl2.innerHTML = `\u{1F1EB}\u{1F1F7} France : <b style="font-style:italic;">${formatValue(indic2, frVal2log)}</b>`;
  wrapper2log.appendChild(frLbl2);
}
display(wrapper2log);
```

</div>

</div>
<!-- Fin cartes nationales -->

<!-- Cartes communes zoom (même territoire, 2 indicateurs) -->
<div class="cards-row">

<div class="card">

```js
// Carte commune — indic1 (zoom target)
{
  const mc1 = buildCommMap(_mc1, _cd1, 385, 320);
  if (mc1) display(mc1);
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
}
```

</div>

</div>

<!-- Graphiques empilés sous les cartes -->

<!-- Graphique 1 : France référence (order:2 → affiché sous Graph 2) -->
<div class="card" style="padding:6px 10px;order:2;">
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
  width: 340,
  height: 160,
  marginLeft: 42,
  marginRight: 40,
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

<!-- Graphique 2 : Indice 100 prix global (order:1 → au-dessus du Graph 1) -->
<div class="card" style="padding:6px 10px;order:1;">
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
    width: 340,
    height: 185,
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
<!-- fin COLONNE GAUCHE (cartes + graphs) -->

<!-- COLONNE DROITE : Table communes >50K -->
<div style="flex:1;min-width:300px;display:flex;flex-direction:column;">

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
  "logd_nbtrans_mai_24", "logd_trans_vtcam_1924"
];
const commColsSql = commCols50k.map(c => `CAST("${c}" AS DOUBLE) AS "${c}"`).join(", ");

const commResult50k = await conn.query(`
  SELECT CAST(code AS VARCHAR) AS code, libelle, regdep,
    CAST("P23_POP" AS DOUBLE) AS P23_POP, ${commColsSql}
  FROM communes_v
  WHERE "P23_POP" >= 50000
    AND "logd_px2_global_24" IS NOT NULL
  ORDER BY "logd_px2_global_24" DESC
`);
const commData50k = commResult50k.toArray().map(r => {
  const d = r.toJSON();
  const out = { code: String(d.code), libelle: d.libelle, regdep: d.regdep || "", P23_POP: Number(d.P23_POP) };
  for (const c of commCols50k) out[c] = d[c] != null ? Number(d[c]) : null;
  return out;
});

// Filtre recherche (commune + regdep)
const commSearchEl = document.createElement("input");
commSearchEl.type = "text";
commSearchEl.placeholder = "Recherche commune, dept (ex: hdf/59)...";
commSearchEl.style.cssText = "width:100%;padding:3px 6px;font-size:11px;border:1px solid #d1d5db;border-radius:3px;margin-bottom:4px;font-family:Inter,system-ui,sans-serif;";
let commSearchVal = "";
commSearchEl.addEventListener("input", () => {
  commSearchVal = commSearchEl.value.toLowerCase();
  renderCommTable();
});

// Stats par colonne : France ref + écart-type pour colorisation z-score
const commColStats = {};
for (const col of commCols50k) {
  const vals = commData50k.map(d => d[col]).filter(v => v != null);
  const n = vals.length;
  const mean = n > 0 ? vals.reduce((s, v) => s + v, 0) / n : 0;
  const std = n > 1 ? Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n) : 0;
  const frRef = frData?.[col];
  // Max pour barre proportionnelle (prix global)
  const max = n > 0 ? Math.max(...vals) : 1;
  commColStats[col] = { mean, std, max, frRef: frRef != null ? frRef : mean };
}

// Médiane pondérée pop communes >50K
const popWeightedMedian = (data, col) => {
  const valid = data.filter(d => d[col] != null && d.P23_POP > 0).sort((a, b) => a[col] - b[col]);
  if (!valid.length) return null;
  const totalPop = valid.reduce((s, d) => s + d.P23_POP, 0);
  let cum = 0;
  for (const d of valid) { cum += d.P23_POP; if (cum >= totalPop / 2) return d[col]; }
  return valid[valid.length - 1][col];
};
const commMedian = {};
for (const col of commCols50k) commMedian[col] = popWeightedMedian(commData50k, col);

// Palette pastel 4 classes z-score vs France (variations uniquement)
const PASTEL_GREEN_STRONG = "#b7e4c7";
const PASTEL_GREEN_LIGHT = "#e6f4ea";
const PASTEL_ROSE_LIGHT = "#fce8f3";
const PASTEL_ROSE_STRONG = "#f0c6e0";

// colorCell : fond pastel + bold pour ±2σ (variations seulement, pas prix brut ni transactions brutes)
const colorCell = (col, val) => {
  if (val == null || !commColStats[col]) return { bg: "", bold: false };
  // Pas de fond couleur sur prix brut et transactions brutes
  if (col === "logd_px2_global_24" || col === "logd_nbtrans_mai_24") return { bg: "", bold: false };
  const { std, frRef } = commColStats[col];
  if (std === 0) return { bg: "", bold: false };
  const z = (val - frRef) / std;
  if (z >= 2) return { bg: `background:${PASTEL_GREEN_STRONG};`, bold: true };
  if (z >= 1) return { bg: `background:${PASTEL_GREEN_LIGHT};`, bold: false };
  if (z <= -2) return { bg: `background:${PASTEL_ROSE_STRONG};`, bold: true };
  if (z <= -1) return { bg: `background:${PASTEL_ROSE_LIGHT};`, bold: false };
  return { bg: "", bold: false };
};

// Barre proportionnelle grise pour prix global (40px max width)
const barHtml = (val) => {
  if (val == null) return "";
  const maxVal = commColStats["logd_px2_global_24"]?.max || 1;
  const pct = Math.min(100, (val / maxVal) * 100);
  return `<div style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:#64748b;opacity:0.28;border-radius:1px;"></div>`;
};

// Abréviation Arrondissement → Arr.
const shortLib = (v) => v ? v.replace(/Arrondissement/gi, "Arr.").replace(/\s+/g, " ") : "—";
const fmtPrix = v => v != null ? Math.round(v).toLocaleString("fr") : "—";
const fmtPct = v => v != null ? (v > 0 ? "+" : "") + v.toFixed(1) + "%" : "—";
const fmtVol = v => v != null ? Math.round(v).toLocaleString("fr") : "—";

const colDefs = [
  { key: "libelle", label: "Commune", sub: "", w: 115, align: "left", fmt: shortLib, type: "text" },
  { key: "logd_px2_global_24", label: "Prix glob.", sub: "€/m² 2024", w: 65, align: "right", fmt: fmtPrix, type: "bar" },
  { key: "logd_px2_global_vevol_1924", label: "Δ Prix", sub: "% 19-24", w: 50, align: "right", fmt: fmtPct, type: "zscore" },
  { key: "logd_px2_global_vevol_2224", label: "Δ Prix", sub: "% 22-24", w: 50, align: "right", fmt: fmtPct, type: "zscore" },
  { key: "logd_nbtrans_mai_24", label: "Trans.", sub: "nb 2024", w: 52, align: "right", fmt: fmtVol, type: "plain" },
  { key: "logd_trans_vtcam_1924", label: "Δ Trans.", sub: "TCAM 19-24", w: 50, align: "right", fmt: fmtPct, type: "zscore" }
];

// Header
const commHeader = document.createElement("div");
commHeader.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;";
commHeader.innerHTML = `<span style="font-size:12px;font-weight:600;color:#1e293b;font-family:Inter,system-ui,sans-serif;">Communes >50K hab. <span class="panel-tooltip-wrap" style="margin-left:2px;"><span class="panel-tooltip-icon">?</span><span class="panel-tooltip-text" style="width:220px;left:0;transform:none;">Prix DVF global pondéré (maisons+apparts). Barre grise = niveau prix. Fond vert/rose = écart vs France (variations). Gras = extrêmes (±2σ).</span></span></span><span style="font-size:10px;color:#9ca3af;font-family:Inter,system-ui,sans-serif;">${commData50k.length} villes</span>`;

// Container table
const commTableWrap = document.createElement("div");
commTableWrap.style.cssText = "max-height:calc(100vh - 240px);overflow-y:auto;overflow-x:auto;font-family:Inter,system-ui,sans-serif;position:relative;";

function renderCommTable() {
  let filtered = commData50k;
  if (commSearchVal) {
    filtered = commData50k.filter(d =>
      (d.libelle || "").toLowerCase().includes(commSearchVal) ||
      (d.regdep || "").toLowerCase().includes(commSearchVal)
    );
  }
  const sc = commSortState.col, sa = commSortState.asc;
  filtered = [...filtered].sort((a, b) => {
    const va = a[sc], vb = b[sc];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "string") return sa ? va.localeCompare(vb) : vb.localeCompare(va);
    return sa ? va - vb : vb - va;
  });

  const thStyle = "padding:4px 3px;font-size:11px;font-weight:600;color:#374151;border-bottom:2px solid #d1d5db;cursor:pointer;white-space:nowrap;position:sticky;top:0;background:#e5e7eb;z-index:3;";
  const tdStyle = "padding:3px 3px;font-size:11.5px;color:#1e293b;border-bottom:1px solid #e5e7eb;white-space:nowrap;background:#fff;";

  let h = `<table style="width:100%;border-collapse:collapse;"><thead><tr>`;
  for (const cd of colDefs) {
    const arrow = sc === cd.key ? (sa ? " ↑" : " ↓") : "";
    const subLine = cd.sub ? `<br><span style="font-weight:400;font-size:9px;color:#4b5563;">${cd.sub}</span>` : "";
    h += `<th data-col="${cd.key}" style="${thStyle}text-align:${cd.align};min-width:${cd.w}px;">${cd.label}${arrow}${subLine}</th>`;
  }
  h += `</tr></thead><tbody>`;

  // Ligne France (sticky — top ajusté dynamiquement après render)
  h += `<tr class="sticky-fr" style="background:#f1f5f9;font-weight:600;position:sticky;top:0;z-index:2;box-shadow:0 1px 0 #94a3b8;">`;
  for (const cd of colDefs) {
    const frVal = cd.key === "libelle" ? "🇫🇷 France" : cd.type === "plain" ? "—" : (commColStats[cd.key]?.frRef != null ? cd.fmt(commColStats[cd.key].frRef) : "—");
    h += `<td style="padding:2px 4px;font-size:10px;color:#1e293b;background:#f1f5f9;border-bottom:1px solid #94a3b8;white-space:nowrap;text-align:${cd.align};">${frVal}</td>`;
  }
  h += `</tr>`;

  // Ligne médiane pondérée >50K (sticky sous France)
  h += `<tr class="sticky-med" style="background:#f5f5f5;font-style:italic;position:sticky;top:0;z-index:1;">`;
  for (const cd of colDefs) {
    const medVal = cd.key === "libelle" ? "<span style='font-size:10px;'>Méd. >50K</span>" : cd.type === "plain" ? "—" : (commMedian[cd.key] != null ? cd.fmt(commMedian[cd.key]) : "—");
    h += `<td style="padding:2px 4px;font-size:10px;color:#6b7280;background:#f5f5f5;border-bottom:1px solid #d1d5db;white-space:nowrap;text-align:${cd.align};">${medVal}</td>`;
  }
  h += `</tr>`;

  for (const d of filtered) {
    h += `<tr style="cursor:default;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background=''">`;
    for (const cd of colDefs) {
      if (cd.key === "libelle") {
        // Commune + regdep inline en italique
        const regdepShort = d.regdep || "";
        h += `<td style="${tdStyle}text-align:left;background:#fff;"><span>${shortLib(d.libelle)}</span>${regdepShort ? ` <span style="font-size:8.5px;color:#9ca3af;font-style:italic;">${regdepShort}</span>` : ""}</td>`;
      } else if (cd.type === "bar") {
        // Prix global : barre grise proportionnelle
        h += `<td style="${tdStyle}text-align:right;position:relative;background:#fff;">${barHtml(d[cd.key])}<span style="position:relative;z-index:1;">${cd.fmt(d[cd.key])}</span></td>`;
      } else if (cd.type === "zscore") {
        const { bg, bold } = colorCell(cd.key, d[cd.key]);
        h += `<td style="${tdStyle}text-align:right;${bg}${bold ? "font-weight:700;" : ""}">${cd.fmt(d[cd.key])}</td>`;
      } else {
        // plain
        h += `<td style="${tdStyle}text-align:right;background:#fff;">${cd.fmt(d[cd.key])}</td>`;
      }
    }
    h += `</tr>`;
  }
  h += `</tbody></table>`;
  commTableWrap.innerHTML = h;

  // Ajuster sticky top dynamiquement selon hauteur réelle du header
  requestAnimationFrame(() => {
    const thead = commTableWrap.querySelector("thead");
    const frRow = commTableWrap.querySelector(".sticky-fr");
    const medRow = commTableWrap.querySelector(".sticky-med");
    if (thead && frRow) {
      const hH = thead.getBoundingClientRect().height;
      frRow.style.top = hH + "px";
      if (medRow) medRow.style.top = (hH + frRow.getBoundingClientRect().height) + "px";
    }
  });

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
<!-- fin COLONNE DROITE table -->

</div>
<!-- &e CARTES_GRAPHS_TABLE -->

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
  // Prix global pondéré
  "logd_px2_global_24", "logd_px2_global_vevol_1924",
  // Prix maison + appart
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

<!-- &s TABLEAU_COMMUNES -->
<div id="vue-communes-detail" style="margin-top:16px;padding-left:12px;">
<h3 style="margin:0 0 8px 0;">Vue commune — Logement (>10K hab.)</h3>

<div class="card" style="padding:8px;">

```js
// === STATE TABLEAU COMMUNES ===
const commDetailSortState = Mutable({ col: null, asc: false });
const setCommDetailSort = (col) => {
  const cur = commDetailSortState.value;
  commDetailSortState.value = cur.col === col ? { col, asc: !cur.asc } : { col, asc: false };
  commDetailPageState.value = 0;
};
const commDetailPageState = Mutable(0);
const setCommDetailPage = (p) => { commDetailPageState.value = p; };
```

```js
const commDetailSearch = view(Inputs.text({
  placeholder: "Recherche commune, dept (ex: hdf/59)...",
  width: 240
}));
```

```js
// === DONNÉES COMMUNES >10K — DuckDB parquet ===
const filterCodesComm = [...mapSelectionState];
const hasCommSelection = filterCodesComm.length > 0;
const commDetailFilter = hasCommSelection ? { [meta?.filterKey || "DEP"]: filterCodesComm } : null;
const commDetailWhere = (hasCommSelection && echelon === "EPCI")
  ? `(${filterCodesComm.map(c => `CAST("EPCI_EPT" AS VARCHAR) = '${c}' OR CAST("EPCI" AS VARCHAR) = '${c}'`).join(" OR ")})`
  : null;

// Colonnes logement pour communes
const commDetailBaseCols = [
  colKey,
  "logd_px2q2_mai_24", "logd_px2_mai_vevol_1924", "logd_px2_mai_vevol_2224",
  "logd_px2q2_appt_24", "logd_px2_appt_vevol_1924",
  "logd_nbtrans_mai_24", "logd_trans_vtcam_1924",
  "log_vac_pct_22", "logv_vac2ans_pct_24"
];
const commDetailExtraCols = (extraIndics || []).filter(i => !i.startsWith("__sep_")).map(i => buildColKey(i, getDefaultPeriode(i)));
const commDetailAllCols = [...new Set([...commDetailExtraCols, ...commDetailBaseCols])].filter(c => COMM_COLUMNS.has(c));

// Requête commune detail via VIEW (inclut filtres géo + colonnes logement)
const _cdReqCols = ["code", "libelle", "regdep", "P23_POP", ...commDetailAllCols].filter((v,i,a) => a.indexOf(v) === i && COMM_COLUMNS.has(v));
const _cdColsSql = _cdReqCols.map(c => `"${c}"`).join(", ");
const _cdWhereParts = [];
if (!hasCommSelection) _cdWhereParts.push(`"P23_POP" >= ${MIN_POP_DEFAULT}`);
if (echelon === "EPCI" && hasCommSelection) {
  _cdWhereParts.push(commDetailWhere);
} else if (commDetailFilter) {
  const fk = Object.keys(commDetailFilter)[0];
  const fv = commDetailFilter[fk];
  if (Array.isArray(fv)) _cdWhereParts.push(`CAST("${fk}" AS VARCHAR) IN (${fv.map(v => "'" + v + "'").join(", ")})`);
}
const _cdWhereSql = _cdWhereParts.length ? `WHERE ${_cdWhereParts.join(" AND ")}` : "";
const _cdLimitSql = hasCommSelection ? "LIMIT 500" : "";
let communesDetailMapped = [];
try {
  const _cdResult = await conn.query(`SELECT ${_cdColsSql} FROM communes_v ${_cdWhereSql} ${_cdLimitSql}`);
  communesDetailMapped = _cdResult.toArray().map(r => { const d = r.toJSON(); d.code = String(d.code); if (d.P23_POP != null) d.P23_POP = Number(d.P23_POP); return d; });
} catch (err) { console.error("[EXDLOG] communesDetail error:", err.message); }

// Filtrer communes avec au moins 1 valeur logement non-null
const communesDetailClean = communesDetailMapped.filter(d =>
  commDetailAllCols.some(c => d[c] != null)
);

// France reference row (depuis EPCI JSON, déjà chargé)
const frRowComm = frData;
const commDetailTableData = (frRowComm ? [frRowComm, ...communesDetailClean] : communesDetailClean).map(d => ({
  ...d, regshort: d.regdep ? d.regdep.split("/")[0] : ""
}));

// Filtre texte
const commDetailSearchVal = (commDetailSearch || "").toLowerCase();
const commDetailFiltered = commDetailSearchVal
  ? commDetailTableData.filter(d => d.code === "00FR" || (d.regshort || "").toLowerCase().includes(commDetailSearchVal) || (d.libelle || "").toLowerCase().includes(commDetailSearchVal) || (d.regdep || "").toLowerCase().includes(commDetailSearchVal))
  : commDetailTableData;

// Tri : France toujours premier
const _cdSortCol = commDetailSortState.col;
const _cdSortAsc = commDetailSortState.asc;
const _cdFrRow = commDetailFiltered.find(d => d.code === "00FR");
const _cdOthers = commDetailFiltered.filter(d => d.code !== "00FR");
const _cdSorted = _cdFrRow ? [_cdFrRow, ...sortTableData(_cdOthers, _cdSortCol, _cdSortAsc)] : sortTableData(_cdOthers, _cdSortCol, _cdSortAsc);

// Pagination
const _cdPage = Math.min(commDetailPageState, Math.max(0, Math.ceil(_cdSorted.length / PAGE_SIZE_DEFAULT) - 1));
const _cdPaged = _cdSorted.slice(_cdPage * PAGE_SIZE_DEFAULT, (_cdPage + 1) * PAGE_SIZE_DEFAULT);
const _cdStats = computeBarStats(commDetailFiltered, ["P23_POP", ...commDetailAllCols]);

// Colonnes
const _cdColumns = [
  { key: "regshort", label: "Rég", type: "text", width: 45 },
  { key: "libelle", label: "Commune", type: "text", width: 170 },
  { key: "P23_POP", label: "Pop 2023", unit: "hab" },
  ...commDetailAllCols.map(col => {
    const indicK = col.replace(/_\d+$/, "");
    const per = col.match(/_(\d{2,4})$/)?.[1] || "";
    return {
      key: col,
      label: getIndicLabel(indicK, "short"),
      unit: getIndicUnit(col),
      periode: per ? getPeriodeLabel(per, "short") : ""
    };
  })
];

// Header export + fullscreen
display(html`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
  <span style="font-size:10px;color:#6b7280;">${commDetailFiltered.length} communes${hasCommSelection ? " (sélection)" : " (>10k hab)"}</span>
  <div style="display:flex;gap:4px;">
    <button style="font-size:10px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;"
      onclick=${() => exportCSV(_cdSorted, _cdColumns, "communes_logement_" + new Date().toISOString().slice(0,10) + ".csv")}>
      📥
    </button>
    <button style="font-size:12px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;" title="Plein écran"
      onclick=${() => { const t = document.querySelector(".commlog-table-fs-target"); if (t) openTableFullscreen(t); }}>
      ⤢
    </button>
  </div>
</div>`);

// Pagination
display(renderPagination(_cdSorted.length, _cdPage, setCommDetailPage, PAGE_SIZE_DEFAULT,
  ` | ${hasCommSelection ? filterCodesComm.length + " terr. sélect." : "pop > 10k"}${commDetailSearchVal ? ` | "${commDetailSearchVal}"` : ""}`));

// Tableau
const _cdTableWrap = document.createElement("div");
_cdTableWrap.className = "commlog-table-fs-target";
_cdTableWrap.appendChild(renderTable({
  data: _cdPaged,
  columns: _cdColumns,
  stats: _cdStats,
  sortCol: _cdSortCol,
  sortAsc: _cdSortAsc,
  setSort: setCommDetailSort,
  indicColKey: colKey,
  stickyFirstCol: 2,
  scrollX: true,
  scrollbarTop: true,
  maxHeight: 800
}));
// Override max-height pour pleine page
const _cdScrollDiv = _cdTableWrap.querySelector("[style*='max-height']");
if (_cdScrollDiv) _cdScrollDiv.style.maxHeight = "calc(100vh - 180px)";
display(_cdTableWrap);
```

</div>
</div>
<!-- &e TABLEAU_COMMUNES -->

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
