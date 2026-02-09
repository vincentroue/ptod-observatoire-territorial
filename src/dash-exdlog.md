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
.sidebar select {
  font-size: 12px !important;
  background: #fff !important;
  border: 1px solid #e2e8f0 !important;
}
.sidebar select[multiple] {
  height: 280px !important;
}
</style>

<!-- &s SIDEBAR -->
<aside class="sidebar">

<section class="panel">
<div class="panel-title">ÉCHELON</div>

```js
const echelon = view(Inputs.radio(
  Object.keys(DATA_HANDLES),
  { value: "EPCI", label: "" }
));
```

</section>

<section class="panel">
<div class="panel-title">INDICATEUR CARTE</div>

```js
// Défaut: prix m² maison (fallback si ecfr pas dispo)
const defaultIndic = logementIndicOptions.has("logd_px2_mai_ecfr") ? "logd_px2_mai_ecfr" : "logd_px2q2_mai";
const indic = view(Inputs.select(logementIndicOptions, { value: defaultIndic, label: "" }));
```

```js
const perMap = getPeriodesForIndicateur(indic);
const periode = view(Inputs.select(perMap, { value: [...perMap.values()][0], label: "Période" }));
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

// Construire wrapper bannière avec fond
const bannerWrap = document.createElement("div");
bannerWrap.style.cssText = "background:#f8fafc;border:1px solid #e2e6ec;border-bottom:2px solid #d0d5dd;border-radius:6px 6px 0 0;padding:8px 10px 6px;";
const bannerTitle = document.createElement("div");
bannerTitle.style.cssText = "font-size:13px;font-weight:600;color:#374151;padding:0 0 4px 0;font-family:Inter,system-ui,sans-serif;";
bannerTitle.textContent = "Métriques clés des territoires sélectionnés";
bannerWrap.appendChild(bannerTitle);
bannerWrap.appendChild(bannerTable);
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

<!-- Espacement bannière / contenu -->
<div style="height:10px;"></div>

<!-- &s CARTE_ET_GRAPHIQUES -->
<div style="display:flex;gap:16px;align-items:flex-start;">

<!-- COLONNE 1 : Carte France échelon -->
<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:8px;padding-left:12px;">

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
  title: indicLabel, echelon, width: 500, height: 440, maxLabelsAuto: 600,
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
<div style="flex:1;min-width:440px;display:flex;flex-direction:column;gap:8px;">

<!-- Graphique 1 : France référence STATIQUE -->
<div class="card" style="padding:8px 12px;">
<h4 style="margin:0 0 8px 0;font-size:12px;color:#374151;font-family:Inter,system-ui,sans-serif;">France — Volumes et Prix (2010-2024)</h4>

```js
// === GRAPHIQUE 1 : FRANCE - Prix (courbes) + Volumes (barres) ===
// Axe gauche: Prix €/m² | Axe droit implicite: Volumes (transactions, construction)

const anneesFr = seriesFrance.map(d => d.annee).sort((a, b) => a - b);
const maxTrans = Math.max(...seriesFrance.map(d => d.nbtrans || 0));
const maxLogaut = Math.max(...seriesFrance.map(d => d.logaut || 0));
const maxVol = Math.max(maxTrans, maxLogaut);

// Normaliser volumes pour axe prix (factor pour échelle droite)
const volScale = 3500 / maxVol;  // Ajusté pour que barres soient visibles

display(Plot.plot({
  style: { fontFamily: "Inter, system-ui, sans-serif" },
  width: 520,
  height: 190,
  marginLeft: 50,
  marginRight: 60,
  marginBottom: 28,
  x: {
    label: null,
    tickFormat: d => String(Math.round(d)),
    ticks: anneesFr.filter(y => y % 2 === 0)
  },
  y: { label: "€/m²", grid: true, domain: [0, 2500] },
  marks: [
    // Barres transactions (gris clair, fond)
    Plot.barY(seriesFrance.filter(d => d.nbtrans), {
      x: "annee", y: d => d.nbtrans * volScale,
      fill: "#d1d5db", fillOpacity: 0.6,
      tip: true, title: d => `Transactions: ${(d.nbtrans/1000).toFixed(0)}k`
    }),
    // Barres construction (vert clair, décalé)
    Plot.barY(seriesFrance.filter(d => d.logaut), {
      x: d => d.annee + 0.3, y: d => d.logaut * volScale,
      fill: "#86efac", fillOpacity: 0.7,
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
<span style="display:flex;align-items:center;gap:3px;"><span style="width:10px;height:10px;background:#d1d5db;"></span> Transactions</span>
<span style="display:flex;align-items:center;gap:3px;"><span style="width:10px;height:10px;background:#86efac;"></span> Construction</span>
</div>

</div>

<!-- Graphique 2 : Indice 100 prix global — territoires sélectionnés -->
<div class="card" style="padding:8px;">
<h4 style="margin:0 0 8px 0;font-size:12px;color:#374151;font-family:Inter,system-ui,sans-serif;">Indice prix global (base 100 = 2010) — Territoires sélectionnés</h4>

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
  display(Plot.plot({
    style: { fontFamily: "Inter, system-ui, sans-serif" },
    width: 520,
    height: 220,
    marginLeft: 42,
    marginRight: 120,
    marginBottom: 28,
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
      Plot.text(indexSeries.filter(d => d.annee === maxYearIdx), {
        x: "annee", y: "value", text: d => `${d.terr} ${d.value?.toFixed(0)}`,
        dx: 8, textAnchor: "start", fontSize: 9, fill: "terr"
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

<!-- COLONNE 3 : Focus EPCI >50K -->
<div style="flex:1;min-width:300px;display:flex;flex-direction:column;">

```js
// === EPCI SORT STATE (bloc séparé pour réactivité Observable) ===
const epciSortState = Mutable({col: "logd_px2_global_24", asc: false});
const setEpciSort = (col) => {
  const cur = epciSortState.value;
  epciSortState.value = { col, asc: cur.col === col ? !cur.asc : false };
};
```

```js
// === TABLEAU EPCI >50K — Prix global + transactions ===
const epciData = dataNoFrance
  .filter(d => d.P23_POP >= 50000 && d.logd_px2_global_24 != null);

const epciCols = [
  "logd_px2_global_24",
  "logd_px2_global_vevol_1924",
  "logd_px2_global_vevol_2224",
  "logd_trans_24",
  "logd_trans_vevol_1924"
].filter(c => epciData.length > 0 && epciData[0][c] !== undefined);

const epciSorted = sortTableData(epciData, epciSortState.col, epciSortState.asc);
const epciStats = computeBarStats(epciData, epciCols);

const epciColumns = [
  { key: "libelle", label: "EPCI", type: "text", width: 130 },
  ...epciCols.map(col => {
    const label = (() => {
      if (col === "logd_px2_global_24") return "€/m²";
      if (col === "logd_px2_global_vevol_1924") return "Δ px 5a";
      if (col === "logd_px2_global_vevol_2224") return "Δ px 2a";
      if (col === "logd_trans_24") return "Trans.";
      if (col === "logd_trans_vevol_1924") return "Δ tr. 5a";
      return getColLabel(col)?.split(" ")[0] || col;
    })();
    return { key: col, label, unit: getIndicUnit(col) };
  })
];

// Header avec titre + compteur + export
const epciHeader = document.createElement("div");
epciHeader.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;";
epciHeader.innerHTML = `<span style="font-size:12px;font-weight:600;color:#374151;font-family:Inter,system-ui,sans-serif;">EPCI >50K hab. — Prix global</span><span style="font-size:10px;color:#9ca3af;font-family:Inter,system-ui,sans-serif;">${epciData.length} EPCI</span>`;
display(epciHeader);

display(renderTable({
  data: epciSorted,
  columns: epciColumns,
  stats: epciStats,
  sortCol: epciSortState.col,
  sortAsc: epciSortState.asc,
  setSort: setEpciSort,
  indicColKey: "logd_px2_global_24",
  compact: true,
  maxHeight: 440,
  scrollX: true,
  stickyFirstCol: 1,
  highlightFrance: false
}));
```

</div>
<!-- Fin colonne 3 EPCI >50K -->

</div>
<!-- Fin 3 colonnes -->

<!-- CARTES COMMUNES (max 3 côte à côte) -->
<div style="margin-top:12px;padding-left:12px;">

```js
// === CARTES COMMUNES MULTI (max 3 sélectionnés) ===
const filterKey = meta?.filterKey || "DEP";
const isEPCI = echelon === "EPCI";
const commCodes = [...(mapSelectionState.value || [])].slice(0, 3);
const commTargets = commCodes.length > 0 ? commCodes : [zoomCode];

// Pré-charger toutes les données communes en parallèle (await hors boucle)
const commQueries = commTargets.map(tCode => {
  const tFilter = isEPCI ? null : { [filterKey]: [tCode] };
  const tWhere = isEPCI
    ? `(CAST("EPCI_EPT" AS VARCHAR) = '${tCode}' OR CAST("EPCI" AS VARCHAR) = '${tCode}')`
    : null;
  return queryCommunes({ conn }, {
    tableName: "communes", filter: tFilter, customWhere: tWhere,
    columns: ["code", "libelle", "P23_POP", colKey], limit: 2000
  });
});
const commResults = await Promise.all(commQueries);

const commContainer = document.createElement("div");
commContainer.style.cssText = "display:flex;gap:12px;flex-wrap:wrap;";

for (let ci = 0; ci < commTargets.length; ci++) {
  const tCode = commTargets[ci];
  const tLabel = getLabelMap(echelon)?.get(tCode) || tCode;
  const tData = commResults[ci];
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

  const mapW = commTargets.length === 1 ? 500 : 340;
  const mapH = commTargets.length === 1 ? 400 : 300;

  const cMap = renderChoropleth({
    geoData: tGeo, valueCol: colKey,
    getColor: tGetColor,
    getCode: f => f.properties.CODGEO,
    getLabel: ({ code }) => tMap.get(code)?.libelle || code,
    formatValue: (k, v) => formatValue(indic, v),
    indicLabel, showLabels: showValuesOnMap,
    labelMode, labelBy, topN: 200,
    title: `${tLabel}`,
    maxLabelsAuto: 80, echelon: "Commune", width: mapW, height: mapH
  });

  // Tooltip : toujours passer frRef + frGetEcartInfo
  if (cMap._tipConfig) {
    cMap._tipConfig.frRef = frData?.[colKey];
    cMap._tipConfig.frGetEcartInfo = isEcart ? tEcart.getEcartInfo : ecart.getEcartInfo;
  }

  const tEcartCounts = isEcart ? countBins(tData, colKey, tEcart.thresholds || []) : [];
  const cLegend = isEcart
    ? createEcartFranceLegend({
        palette: tEcart.palette, symbols: ECART_FRANCE_SYMBOLS,
        pctLabels: tEcart.pctLabels,
        counts: tEcartCounts, title: `Écart France (en ${ecart.isAbsoluteEcart ? "pts" : "%"})`
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
  card.style.cssText = "padding:6px;flex:1;min-width:300px;";
  const cardTitle = document.createElement("div");
  cardTitle.style.cssText = "font-size:11px;font-weight:600;color:#374151;margin-bottom:4px;";
  cardTitle.textContent = `${indicLabel} — ${tLabel}`;
  card.appendChild(cardTitle);
  card.appendChild(createMapWrapper(cMap, null, cLegend, addZoomBehavior(cMap, {}), {
    exportSVGFn: exportSVG, echelon: tLabel, colKey, title: `${indicLabel} — ${tLabel}`
  }));
  commContainer.appendChild(card);
}

display(commContainer);
```

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
