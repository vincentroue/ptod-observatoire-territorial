---
title: OTTD — Communes (bis)
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     &s PAGE_EXDC_BIS — Version template restructurée
     ============================================================
     Date: 2026-01-09 | v2: 2026-01-09
     Base: jottd-exdc-commune.md
     Objectif: Tester structure template + helpers v2
     Tests: search.js v2, calculate.js, tableterr-comp.js, table.js v2
     ============================================================ -->

<!-- =======================================================
     &s BANNER — Bannière sticky
     ======================================================= -->
<div class="banner">
  <div class="banner-inner">
    <div class="banner-titles">
      <h1>OTTD — Communes (bis)</h1>
      <p>Version template — 35k communes × indicateurs étendus</p>
    </div>
    <nav class="nav-banner" id="nav-container"></nav>
    <span class="sources-btn" title="INSEE RP 2011/2016/2022, DVF 2024, Filosofi 2021">? Sources</span>
  </div>
</div>
<!-- &e BANNER -->

<!-- =======================================================
     &s IMPORTS
     ======================================================= -->
```js
// === IMPORTS CORE ===
// TopJSON + rewind (pour conversion geo)
import * as topojson from "npm:topojson-client";
import rewind from "npm:@mapbox/geojson-rewind";

// Nouveaux helpers centralisés (préfixe 0)
import { DATA_CONFIG, ECHELONS_WITH_GEO, getEchelonMeta } from "./helpers/0loader.js";
import { getColumnOptionsByVolet, getIndicatorInfo, getPaletteType, formatValue, parseColKey } from "./helpers/0indicators.js";

// DuckDB
import { initDuckDB, registerParquet, queryCommunes } from "./helpers/duckdb.js";

// Navigation
import { createNav, OTTD_PAGES } from "./helpers/layout.js";

// Couleurs et légendes
import { PAL_PURPLE_GREEN, PAL_SEQ_BLUE, getColorByBins, makeSeqQuantileBins } from "./helpers/colors.js";
import { createBinsLegend } from "./helpers/legend.js";

// Cartes
import { renderChoropleth, createMapWrapper, addMapClickHandlers, createStatsOverlay, addZoomBehavior } from "./helpers/maps.js";

// Recherche v2
import { createSearchBox } from "./helpers/search.js";

// Table v2
import { exportTableCSV, createExportButton } from "./helpers/table.js";

// Calculs IS/percentile
import { calcIS, calcPercentile, transformValue, supportsIS, getISColor, formatIS } from "./helpers/calculate.js";

// Table comparaison territoires
import { renderTableTerrComp, exportTableTerrCSV, tableTerrCompStyles } from "./helpers/tableterr-comp.js";
```

```js
// === NAVIGATION ===
const navElement = createNav(OTTD_PAGES, 'comm-bis');
document.getElementById('nav-container').replaceWith(navElement);
```
<!-- &e IMPORTS -->

<!-- =======================================================
     &s DATA_LOAD — Chargement données (via 0loader.js)
     ======================================================= -->
```js
// === FILE HANDLES (Observable require static FileAttachment) ===
// GEO handles par échelon
const GEO_HANDLES = {
  "Département": FileAttachment("data/nodom_departement_2025.topojson"),
  "Zone d'emploi": FileAttachment("data/nodom_zones-emploi_2025.topojson"),
  "EPCI": FileAttachment("data/nodom_epci_2025.topojson"),
  "Région": FileAttachment("data/nodom_region_2025.topojson"),
  "Bassin de vie": FileAttachment("data/nodom_bv_2025.topojson"),
  "Aire d'attraction": FileAttachment("data/nodom_aav_2025.topojson"),
  "Commune": FileAttachment("data/nodom_commune-ARM_MINI_2025.topojson")
};

// DATA handles par échelon
const DATA_HANDLES = {
  "Département": FileAttachment("data/agg_dep.json"),
  "Zone d'emploi": FileAttachment("data/agg_ze.json"),
  "EPCI": FileAttachment("data/agg_epci.json"),
  "Région": FileAttachment("data/agg_reg.json"),
  "Bassin de vie": FileAttachment("data/agg_bv.json"),
  "Aire d'attraction": FileAttachment("data/agg_aav.json"),
  "Unité urbaine": FileAttachment("data/agg_uu.json")
};

// Caches
const dataCache = new Map();
const geoCache = new Map();

// Chargement données agrégées
async function getAggData(ech) {
  if (dataCache.has(ech)) return dataCache.get(ech);
  const handle = DATA_HANDLES[ech];
  if (!handle) return [];
  const data = await handle.json();
  dataCache.set(ech, data);
  return data;
}

// Chargement geo avec topojson
// TOUJOURS appliquer rewind pour éviter problème "camembert/tulipe" (winding order)
async function getGeoData(ech) {
  if (geoCache.has(ech)) return geoCache.get(ech);
  const handle = GEO_HANDLES[ech];
  if (!handle) return null;
  const topo = await handle.json();
  let geo = topojson.feature(topo, topo.objects.data);
  // rewind force winding order antihoraire (RFC 7946) - safe si déjà correct
  geo = rewind(geo, true);
  geoCache.set(ech, geo);
  return geo;
}

// Préchargement échelon par défaut (Département)
const defaultData = await getAggData("Département");
const defaultGeo = await getGeoData("Département");

// === LABEL MAPS (construit depuis données + geo) ===
const labelMaps = {};
async function buildLabelMap(ech) {
  if (labelMaps[ech]) return labelMaps[ech];
  const config = getEchelonMeta(ech);
  if (!config) return new Map();

  // 1. Essayer depuis données agrégées
  const data = await getAggData(ech);
  if (data.length > 0) {
    const lm = new Map();
    data.forEach(d => {
      if (d.code && d.libelle) lm.set(String(d.code), d.libelle);
    });
    labelMaps[ech] = lm;
    return lm;
  }

  // 2. Sinon depuis geo
  const geo = await getGeoData(ech);
  if (geo?.features) {
    const lm = new Map();
    geo.features.forEach(f => {
      const code = f.properties[config.geoKey];
      const label = f.properties[config.labelKey] || f.properties.LIBGEO;
      if (code && label) lm.set(String(code), label);
    });
    labelMaps[ech] = lm;
    return lm;
  }

  return new Map();
}

// Précharger labelMaps échelons principaux
await Promise.all([
  buildLabelMap("Département"),
  buildLabelMap("Zone d'emploi"),
  buildLabelMap("EPCI"),
  buildLabelMap("Région")
]);
```

```js
// === TOPOJSON COMMUNES ===
console.time("[EXDC-bis] TopoJSON Communes");
const communesGeo = await getGeoData("Commune");
console.timeEnd("[EXDC-bis] TopoJSON Communes");
```

```js
// === DUCKDB INIT ===
console.time("[EXDC-bis] DuckDB");
const { db, conn } = await initDuckDB();
const parquetUrl = await FileAttachment("data/agg_commARM.parquet").url();
await registerParquet(db, "agg_commARM", parquetUrl);
console.timeEnd("[EXDC-bis] DuckDB");
```
<!-- &e DATA_LOAD -->

<!-- =======================================================
     &s STATE — États Mutable
     ======================================================= -->
```js
// === ÉTATS RÉACTIFS ===
const mapSelectionState = Mutable(new Set());
const sortState = Mutable({ col: "P22_POP", asc: false });
const pageState = Mutable(0);
const displayMode = Mutable("value");  // 'value' | 'is' | 'percentile'

// Setters
const toggleMapSelection = (code) => {
  const current = new Set(mapSelectionState.value);
  current.has(code) ? current.delete(code) : current.add(code);
  mapSelectionState.value = current;
  pageState.value = 0;
};
const clearMapSelection = () => { mapSelectionState.value = new Set(); pageState.value = 0; };
const setSort = (col) => {
  const { col: curr, asc } = sortState.value;
  sortState.value = curr === col ? { col, asc: !asc } : { col, asc: false };
  pageState.value = 0;
};
const setPage = (p) => { pageState.value = p; };
```
<!-- &e STATE -->

<!-- =======================================================
     &s SUB_BANNER — Sous-bannière contrôles
     ======================================================= -->
<div class="sub-banner">
<div class="sub-banner-inner">

<div class="sub-group">
<div class="sub-group-title">Échelon</div>

```js
const echelon = view(Inputs.select(
  ["Département", "Zone d'emploi", "EPCI", "Région"],
  { value: "Département", label: "" }
));
```

</div>
<div class="sub-sep"></div>

<div class="sub-group">
<div class="sub-group-title">Indicateur</div>

```js
// Indicateurs filtrés par volet (exdc = communes) avec colonnes complètes
// Source: 0indicators.js → getColumnOptionsByVolet retourne "dm_pop_vtcam_1622" (pas "dm_pop_vtcam")
const indicOptions = getColumnOptionsByVolet("exdc", "1622");  // Période par défaut 16-22
const indicateur = view(Inputs.select(indicOptions, { value: "dm_pop_vtcam_1622", label: "" }));
```

</div>
<div class="sub-sep"></div>

<div class="sub-group">
<div class="sub-group-title">Affichage</div>

```js
const modeDisplay = view(Inputs.radio(
  new Map([["Valeur", "value"], ["IS", "is"], ["Percentile", "pct"]]),
  { value: "value", label: "" }
));
```

</div>
<div class="sub-sep"></div>

<div class="sub-group">
<div class="sub-group-title">Sélection</div>

```js
const selCount = mapSelectionState.size;
const selInfo = selCount > 0
  ? html`<span style="color:#2563eb; font-weight:600">${selCount} terr.</span> <button style="font-size:10px; padding:1px 4px; cursor:pointer; background:#fee2e2; border:1px solid #fca5a5; border-radius:3px; color:#991b1b;" onclick=${clearMapSelection}>✕</button>`
  : html`<span style="color:#6b7280; font-size:11px;">Aucune</span>`;
```

${selInfo}

</div>

</div>
</div>

<!-- &e SUB_BANNER -->

<!-- =======================================================
     &s SIDEBAR — Panel gauche
     ======================================================= -->

<aside class="sidebar">

<section class="panel">
<div class="panel-title">Recherche</div>
<span class="panel-hint">2+ caractères</span>
<div id="search-container" style="margin-top:6px;"></div>
</section>

<section class="panel">
<div class="panel-title">Territoires sélectionnés</div>
<div id="selection-list"></div>
</section>

<section class="panel">
<div class="panel-title">Comparaison</div>
<div class="panel-hint">Sélectionnez 2+ territoires</div>
<div id="comparison-container"></div>
</section>

<section class="panel">
<div class="panel-title">Légende</div>
<div id="legend-container"></div>
</section>

<section class="panel">
<div class="panel-title">Stats France</div>
<div id="stats-france"></div>
</section>

</aside>
<!-- &e  -->

<!-- =======================================================
     &s LAYOUT_MAIN — Contenu principal
     ======================================================= -->
<div class="layout-main">

```js
// === CHARGEMENT GEO + DONNÉES ÉCHELON ===
const meta = getEchelonMeta(echelon);
const currentGeo = await getGeoData(echelon);
const rawTableData = await getAggData(echelon);

// Construire labelMap pour cet échelon (si pas déjà fait)
await buildLabelMap(echelon);

const frData = rawTableData.find(d => d.code === "00FR");
const dataNoFrance = rawTableData.filter(d => d.code !== "00FR");

// Colonne indicateur (sans période si déjà incluse)
const colKey = indicateur;

// Jointure données → géo
for (const f of currentGeo.features) {
  const code = f.properties[meta.geoKey];
  const row = dataNoFrance.find(d => d.code === code);
  if (row) {
    f.properties[colKey] = row[colKey];
    f.properties.P22_POP = row.P22_POP;
  }
}

// Bins quantiles
const binsResult = makeSeqQuantileBins(dataNoFrance, colKey, 6);
const BINS = binsResult.thresholds || [];
// Palette automatique via getPaletteType (divergent pour vtcam/sma/sn, séquentiel sinon)
const PAL_BINS = getPaletteType(colKey) === "divergent" ? PAL_PURPLE_GREEN : PAL_SEQ_BLUE;
const getColor = (v) => getColorByBins(v, BINS, PAL_BINS);

// Label indicateur via getIndicatorInfo
const indicInfo = getIndicatorInfo(colKey);
const indicLabel = indicInfo?.fullLabel || colKey;
```

```js
// === RECHERCHE SIDEBAR ===
const searchData = dataNoFrance.map(d => ({
  code: d.code,
  label: d.libelle || d.code,
  pop: d.P22_POP
}));

const searchBox = createSearchBox({
  data: searchData,
  selection: mapSelectionState,
  onToggle: toggleMapSelection,
  onClear: clearMapSelection,
  placeholder: "Rechercher...",
  maxResults: 8,
  maxChips: 4,
  maxWidth: 230,
  showClearAll: true,
  showCount: true,
  persistInput: false
});

const searchContainer = document.getElementById('search-container');
if (searchContainer) {
  searchContainer.innerHTML = '';
  searchContainer.appendChild(searchBox);
}
```

```js
// === LISTE SÉLECTION SIDEBAR ===
const selectedTerrs = [...mapSelectionState].map(code => {
  const row = dataNoFrance.find(d => d.code === code);
  return { code, label: row?.libelle || labelMaps[echelon]?.get(code) || code };
});

const selListHtml = selectedTerrs.length > 0
  ? html`<div style="font-size:11px; display:flex; flex-direction:column; gap:4px;">
      ${selectedTerrs.map(t => html`
        <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 4px; background:#eff6ff; border-radius:3px;">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${t.label}</span>
          <span style="cursor:pointer; color:#dc2626; font-weight:bold;" onclick=${() => toggleMapSelection(t.code)}>×</span>
        </div>
      `)}
    </div>`
  : html`<span style="font-size:11px; color:#6b7280; font-style:italic;">Cliquez sur la carte</span>`;

const selListContainer = document.getElementById('selection-list');
if (selListContainer) {
  selListContainer.innerHTML = '';
  selListContainer.appendChild(selListHtml);
}
```

```js
// === TABLEAU COMPARAISON SIDEBAR ===
const compIndicators = [
  { key: "P22_POP", label: "Population 2022" },
  { key: colKey, label: indicLabel },
  { key: "dm_pop_vtcam_1622", label: "Évol. pop TCAM" },
  { key: "dmv_60p_pct_22", label: "Part 60+" },
  { key: "log_vac_pct_22", label: "Taux vacance" }
];

const selectedTerrData = [...mapSelectionState].map(code => {
  const row = dataNoFrance.find(d => d.code === code);
  return row ? { ...row, label: row.libelle || code } : { code, label: code };
}).filter(t => t.P22_POP);

const compContainer = document.getElementById('comparison-container');
if (compContainer) {
  compContainer.innerHTML = '';
  if (selectedTerrData.length >= 2) {
    // Mode affichage
    const currentMode = modeDisplay === "is" ? "is" : modeDisplay === "pct" ? "percentile" : "value";

    // Valeurs distribution pour percentile
    const allValuesMap = {};
    compIndicators.forEach(ind => {
      allValuesMap[ind.key] = dataNoFrance.map(d => d[ind.key]).filter(v => v != null);
    });

    const compTable = renderTableTerrComp({
      indicators: compIndicators,
      territories: selectedTerrData.slice(0, 4),
      france: frData || {},
      displayMode: currentMode,
      allValues: allValuesMap,
      onExport: () => exportTableTerrCSV(compIndicators, selectedTerrData, frData || {}, `comparaison-${echelon}.csv`),
      onRemove: toggleMapSelection,
      maxCols: 4
    });
    compContainer.appendChild(compTable);
  } else if (selectedTerrData.length === 1) {
    compContainer.innerHTML = '<span style="font-size:10px; color:#6b7280; font-style:italic;">+1 territoire pour comparer</span>';
  } else {
    compContainer.innerHTML = '<span style="font-size:10px; color:#6b7280; font-style:italic;">—</span>';
  }
}
```

```js
// === LÉGENDE SIDEBAR ===
const legendHtml = createBinsLegend({
  colors: PAL_BINS,
  labels: binsResult.labels || [],
  vertical: true,
  title: indicLabel
});
const legendContainer = document.getElementById('legend-container');
if (legendContainer) {
  legendContainer.innerHTML = '';
  legendContainer.appendChild(legendHtml);
}
```

```js
// === STATS FRANCE SIDEBAR ===
const frValue = frData?.[colKey];
const statsFrHtml = html`<div style="font-size:11px;">
  <div><strong>France :</strong> ${formatValue(indicateur, frValue)}</div>
  <div style="margin-top:6px; font-size:10px; color:#6b7280;">
    Min: ${formatValue(indicateur, Math.min(...dataNoFrance.map(d => d[colKey]).filter(v => v != null)))}<br>
    Max: ${formatValue(indicateur, Math.max(...dataNoFrance.map(d => d[colKey]).filter(v => v != null)))}
  </div>
</div>`;
const statsFrContainer = document.getElementById('stats-france');
if (statsFrContainer) {
  statsFrContainer.innerHTML = '';
  statsFrContainer.appendChild(statsFrHtml);
}
```

<!-- =======================================================
     &s CARDS — Cartes 2 colonnes
     ======================================================= -->
<div class="cards-row">

<div class="card">
<h2>Carte ${echelon}</h2>

```js
// === CARTE 1 — ÉCHELON AGRÉGÉ ===
const map1 = renderChoropleth({
  geoData: currentGeo,
  valueCol: colKey,
  getColor: (v, f) => {
    const code = f.properties[meta.geoKey];
    return mapSelectionState.has(code) ? "#ffd500" : getColor(v);
  },
  getCode: f => f.properties[meta.geoKey],
  getLabel: ({ code }) => labelMaps[echelon]?.get(code) || code,
  formatValue,
  indicLabel,
  selectedCodes: [...mapSelectionState],
  showLabels: echelon === "Région",
  echelon,
  width: 480,
  height: 420
});

const statsOverlay1 = createStatsOverlay({
  mean: frData?.[colKey] || 0,
  showTop3Bottom3: false
});

const zoomControls1 = addZoomBehavior(map1);
const mapWrapper1 = createMapWrapper(map1, statsOverlay1, null, zoomControls1);
addMapClickHandlers(map1, currentGeo, f => f.properties[meta.geoKey], toggleMapSelection);

display(mapWrapper1);
```

</div>

<div class="card">
<h2>Zoom communes</h2>

```js
// === CARTE 2 — COMMUNES ZOOMÉES ===
const zoomTerritoryCode = mapSelectionState.size >= 1 ? [...mapSelectionState][0] : null;

let zoomCommunesData = [];
if (zoomTerritoryCode) {
  zoomCommunesData = await queryCommunes({ conn }, {
    tableName: "agg_commARM",
    filter: { [meta.filterKey]: [zoomTerritoryCode] },
    columns: ["code", "libelle", "P22_POP", colKey],
    limit: 2000
  });
}
const zoomDataMap = new Map(zoomCommunesData.map(d => [d.code, d]));

const filteredFeatures = zoomTerritoryCode
  ? communesGeo.features.filter(f => String(f.properties[meta.filterKey]) === String(zoomTerritoryCode))
  : [];

const communesZoomGeo = zoomTerritoryCode
  ? {
      type: "FeatureCollection",
      features: filteredFeatures.map(f => {
        const data = zoomDataMap.get(f.properties.CODGEO);
        return {
          ...f,
          properties: {
            ...f.properties,
            libelle: data?.libelle || f.properties.LIBGEO,
            P22_POP: data?.P22_POP,
            [colKey]: data?.[colKey]
          }
        };
      })
    }
  : null;

if (communesZoomGeo && communesZoomGeo.features.length > 0) {
  const binsResultC = zoomCommunesData.length >= 6
    ? makeSeqQuantileBins(zoomCommunesData, colKey, 5)
    : binsResult;
  const getColorC = (v) => getColorByBins(v, binsResultC.thresholds || BINS, PAL_BINS);

  const map2 = renderChoropleth({
    geoData: communesZoomGeo,
    valueCol: colKey,
    getColor: getColorC,
    getCode: f => f.properties.CODGEO,
    getLabel: ({ code }) => communesZoomGeo.features.find(f => f.properties.CODGEO === code)?.properties.libelle || code,
    formatValue,
    indicLabel,
    selectedCodes: [],
    showLabels: communesZoomGeo.features.length < 50,
    echelon: "Commune",
    width: 480,
    height: 420
  });

  const zoomControls2 = addZoomBehavior(map2);
  const mapWrapper2 = createMapWrapper(map2, null, null, zoomControls2);
  display(mapWrapper2);
  display(html`<div style="text-align:center; font-size:11px; color:#6b7280; margin-top:4px;">
    ${communesZoomGeo.features.length} communes de <strong>${labelMaps[echelon]?.get(zoomTerritoryCode) || zoomTerritoryCode}</strong>
  </div>`);
} else {
  display(html`<div style="text-align:center; padding:80px 20px; color:#6b7280;">
    <strong>Cliquez sur un territoire</strong><br>pour zoomer sur ses communes
  </div>`);
}
```

</div>

</div>
<!-- &e CARDS -->

<!-- =======================================================
     &s TABLE — Tableau communes
     ======================================================= -->
```js
// === INJECTION CSS tableterr-comp ===
if (!document.getElementById('tableterr-comp-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'tableterr-comp-styles';
  styleEl.textContent = tableTerrCompStyles;
  document.head.appendChild(styleEl);
}
```

<div class="card-full">
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
<h2 style="margin:0;">Communes ${mapSelectionState.size > 0 ? `(filtrées: ${echelon})` : "(toutes)"}</h2>
<div id="export-btn-container"></div>
</div>

```js
// === QUERY DUCKDB ===
const filterCodes = [...mapSelectionState];
const filter = filterCodes.length > 0 ? { [meta.filterKey]: filterCodes } : {};
const tableCols = ["code", "libelle", "DEP", "P22_POP", colKey];

const communesTableData = await queryCommunes({ conn }, {
  tableName: "agg_commARM",
  filter,
  columns: tableCols,
  orderBy: sortState.col,
  orderDir: sortState.asc ? "ASC" : "DESC",
  limit: 5000
});
```

```js
// === PAGINATION ===
const PAGE_SIZE = 50;
const totalPages = Math.ceil(communesTableData.length / PAGE_SIZE);
const currentPage = Math.min(pageState, totalPages - 1);
const paginatedData = communesTableData.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

// Max pour barres
const vals = communesTableData.map(d => d[colKey]).filter(v => v != null);
const maxAbs = Math.max(Math.abs(Math.max(...vals)), Math.abs(Math.min(...vals)));

const makeBar = (value) => {
  if (value == null) return html`<span style="color:#999">—</span>`;
  const pct = Math.abs(value) / maxAbs * 100;
  const color = value >= 0 ? "#22c55e" : "#ef4444";
  return html`<div style="display:flex; align-items:center; gap:4px;">
    <span style="width:50px; text-align:right; font-size:11px;">${formatValue(indicateur, value)}</span>
    <div style="width:60px; height:10px; background:#f3f4f6; border-radius:2px; overflow:hidden;">
      <div style="width:${pct}%; height:100%; background:${color};"></div>
    </div>
  </div>`;
};

const thSort = (col, label) => {
  const isSorted = sortState.col === col;
  const arrow = isSorted ? (sortState.asc ? " ▲" : " ▼") : "";
  return html`<th class="num" style="cursor:pointer;" onclick=${() => setSort(col)}>${label}${arrow}</th>`;
};

display(html`
<div class="table-container" style="max-height:500px;">
<table>
  <thead>
    <tr>
      <th>Commune</th>
      ${thSort("DEP", "Dép")}
      ${thSort("P22_POP", "Pop 2022")}
      ${thSort(colKey, indicLabel)}
    </tr>
  </thead>
  <tbody>
    ${paginatedData.map(d => html`<tr>
      <td style="font-weight:500; max-width:200px; overflow:hidden; text-overflow:ellipsis;">${d.libelle || d.code}</td>
      <td class="num">${d.DEP}</td>
      <td class="num">${d.P22_POP?.toLocaleString('fr-FR') || '—'}</td>
      <td>${makeBar(d[colKey])}</td>
    </tr>`)}
  </tbody>
</table>
</div>
`);

// Bouton export
const exportBtnContainer = document.getElementById('export-btn-container');
if (exportBtnContainer) {
  exportBtnContainer.innerHTML = '';
  const exportBtn = createExportButton(() => {
    const exportCols = [
      { key: "code", label: "Code" },
      { key: "libelle", label: "Commune" },
      { key: "DEP", label: "Département" },
      { key: "P22_POP", label: "Population 2022" },
      { key: colKey, label: indicLabel }
    ];
    exportTableCSV(communesTableData, exportCols, `communes-${echelon}-${indicateur}.csv`);
  });
  exportBtnContainer.appendChild(exportBtn);
}

// Pagination
if (totalPages > 1) {
  display(html`<div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; font-size:11px;">
    <span>${communesTableData.length.toLocaleString('fr-FR')} communes</span>
    <div style="display:flex; gap:4px; align-items:center;">
      <button style="padding:2px 6px; cursor:pointer;" disabled=${currentPage === 0} onclick=${() => setPage(currentPage - 1)}>◀</button>
      <span>Page ${currentPage + 1}/${totalPages}</span>
      <button style="padding:2px 6px; cursor:pointer;" disabled=${currentPage >= totalPages - 1} onclick=${() => setPage(currentPage + 1)}>▶</button>
    </div>
  </div>`);
}
```

</div>
<!-- &e TABLE -->

</div>
<!-- &e LAYOUT_MAIN -->

<!-- &e PAGE_EXDC_BIS -->
