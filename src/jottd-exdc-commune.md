---
title: Exploration Communes
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
      <h1>OTTD — Exploration Communes</h1>
      <p>Analyse détaillée des 35 000 communes françaises — Vincent Roué</p>
    </div>
    <span class="sources-btn" title="Sources : INSEE RP 2011/2016/2022, DVF, Filosofi. Géométries : IGN Admin Express 2025.">? Sources</span>
    <nav class="nav-banner" id="nav-container"></nav>
  </div>
</div>

```js
// === IMPORTS ===
import * as topojson from "npm:topojson-client";
import rewind from "npm:@mapbox/geojson-rewind";

// DuckDB WASM
import { initDuckDB, registerParquet, queryCommunes, countCommunes } from "./helpers/duckdb.js";

// Helpers existants (réutilisés depuis EXD)
import {
  INDICATEURS,
  parseColKey,
  getColLabel,
  formatValue,
  getDropdownOptions
} from "./helpers/indicators-ddict-js.js";

// Helper sélecteurs indicateurs (dropdowns dissociés)
import {
  getIndicOptionsByVolet,
  getPeriodesForIndicateur,
  getDefaultPeriode,
  buildColKey,
  isSeparator,
  getIndicLabel,
  getPeriodeLabel,
  getFullLabel
} from "./helpers/selectindic.js";

import {
  renderChoropleth,
  createMapWrapper,
  addMapClickHandlers,
  createStatsOverlay,
  addZoomBehavior
} from "./helpers/maps.js";

import { createBinsLegend } from "./helpers/legend.js";

import {
  PAL_PURPLE_GREEN,
  PAL_SEQ_BLUE,
  getColorByBins,
  makeSeqQuantileBins
} from "./helpers/colors.js";

import {
  computeMaxByCol,
  sortData,
  makeBar as makeBarHelper,
  thSort as thSortHelper
} from "./helpers/table.js";

import { createSearchBox } from "./helpers/search.js";
import { createNav, OTTD_PAGES } from "./helpers/layout.js";
```

```js
// === NAVIGATION ===
const navElement = createNav(OTTD_PAGES, 'exdc');
document.getElementById('nav-container').replaceWith(navElement);
```

```js
// === CHARGEMENT DONNÉES ÉCHELONS (identique EXD) ===
// JSON agrégés pour carte 1
const dataZE = await FileAttachment("data/agg_ze.json").json();
const DATA_HANDLES = {
  "Zone d'emploi": null,
  "Département": FileAttachment("data/agg_dep.json"),
  "Région": FileAttachment("data/agg_reg.json"),
  "EPCI": FileAttachment("data/agg_epci.json")
};

const aggDataCache = new Map([["Zone d'emploi", dataZE]]);

async function getAggData(echelon) {
  if (!aggDataCache.has(echelon)) {
    const handle = DATA_HANDLES[echelon];
    if (handle) {
      aggDataCache.set(echelon, await handle.json());
    } else {
      aggDataCache.set(echelon, dataZE);
    }
  }
  return aggDataCache.get(echelon);
}

// TopoJSON échelons pour carte 1
const GEO_HANDLES = {
  "Zone d'emploi": FileAttachment("data/nodom_zones-emploi_2025.topojson"),
  "Département": FileAttachment("data/nodom_departement_2025.topojson"),
  "Région": FileAttachment("data/nodom_region_2025.topojson"),
  "EPCI": FileAttachment("data/nodom_epci_2025.topojson")
};

const ECHELON_META = {
  "Zone d'emploi": { key: "ze2020", geoKey: "ze2020", labelKey: "libze2020", filterKey: "ZE2020" },
  "Département": { key: "dep", geoKey: "code_insee", labelKey: "nom_officiel", filterKey: "DEP" },
  "Région": { key: "reg", geoKey: "code_insee", labelKey: "nom_officiel", filterKey: "REG" },
  "EPCI": { key: "epci", geoKey: "EPCI", labelKey: "EPCIlib", filterKey: "EPCI" }
};

const labelMaps = {
  "Zone d'emploi": new Map(),
  "Département": new Map(),
  "Région": new Map(),
  "EPCI": new Map()
};
```

```js
// === CHARGEMENT TOPOJSON COMMUNES ===
console.time("[EXDC] TopoJSON load+parse");
const communesTopoRaw = await FileAttachment("data/nodom_commune-ARM_MINI_2025.topojson").json();
console.timeLog("[EXDC] TopoJSON load+parse", "fetch done");
const communesGeoRaw = topojson.feature(communesTopoRaw, communesTopoRaw.objects.data);
console.timeLog("[EXDC] TopoJSON load+parse", "topojson.feature done");
const communesGeo = rewind(communesGeoRaw, true);
console.timeEnd("[EXDC] TopoJSON load+parse");
console.log(`[EXDC] ${communesGeo.features.length} communes chargées`);
```

```js
// === DUCKDB INIT ===
console.time("[EXDC] DuckDB init");
const { db, conn } = await initDuckDB();
console.timeEnd("[EXDC] DuckDB init");

console.time("[EXDC] Parquet register");
const parquetUrl = await FileAttachment("data/agg_commARM.parquet").url();
await registerParquet(db, "agg_commARM", parquetUrl);
console.timeEnd("[EXDC] Parquet register");
console.log("[EXDC] Parquet communes enregistré");
```

```js
// === ÉTATS MUTABLES ===
const mapSelectionState = Mutable(new Set());
const sortState = Mutable({ col: "P22_POP", asc: false });
const pageState = Mutable(0);

// Setters
const setMapSelection = (codes) => { mapSelectionState.value = new Set(codes); };
const toggleMapSelection = (code) => {
  const current = new Set(mapSelectionState.value);
  current.has(code) ? current.delete(code) : current.add(code);
  mapSelectionState.value = current;
  pageState.value = 0;  // Reset pagination
};
const clearMapSelection = () => { mapSelectionState.value = new Set(); pageState.value = 0; };
const setSort = (col) => {
  const current = sortState.value;
  if (current.col === col) {
    sortState.value = { col, asc: !current.asc };
  } else {
    sortState.value = { col, asc: false };
  }
  pageState.value = 0;
};
const setPage = (p) => { pageState.value = p; };
```

<!-- ========== CONTRÔLES ========== -->
<div class="sub-banner">
<div class="sub-banner-inner">

<div class="sub-group">
<div class="sub-group-title">Échelon carte</div>

```js
const echelon = view(Inputs.select(
  ["Département", "Zone d'emploi", "EPCI", "Région"],
  { value: "Département", label: "" }
));
```

</div>

<div class="sub-group">
<div class="sub-group-title">Indicateur</div>

```js
// Options indicateurs filtrées par volet EXDC, groupées par thème
const indicOptions = getIndicOptionsByVolet("exdc");
const indicateur = view(Inputs.select(indicOptions, {
  value: "dm_pop_vtcam",
  label: "",
  format: (v) => isSeparator(v) ? "──────────" : v  // Séparateurs non sélectionnables rendus visibles
}));
```

</div>

<div class="sub-group">
<div class="sub-group-title">Période</div>

```js
// Périodes dynamiques selon indicateur sélectionné
const periodesMap = getPeriodesForIndicateur(indicateur);
const defaultPeriode = getDefaultPeriode(indicateur);
const periode = view(Inputs.select(periodesMap, {
  value: periodesMap.has(defaultPeriode) ? defaultPeriode : [...periodesMap.values()][0],
  label: ""
}));
```

</div>

<div class="sub-group">
<div class="sub-group-title">Sélection</div>

```js
const selCount = mapSelectionState.size;
const selInfo = selCount > 0
  ? html`<span style="color:#2563eb; font-weight:600">${selCount} territoire(s)</span> <button class="btn-small" onclick=${clearMapSelection}>✕</button>`
  : html`<span style="color:#6b7280">Aucune</span>`;
```

${selInfo}

</div>

</div>
</div>

<!-- RECHERCHE FUSE.JS -->
<div class="card" style="margin: 0.5rem 1rem; padding: 0.75rem;">
<div style="font-size: 13px; color: #374151; font-weight: 600; margin-bottom: 8px;">Recherche territoires</div>

```js
// === RECHERCHE TERRITOIRES AVEC HELPER ===
const rawDataSearch = await getAggData(echelon);
const searchData = (rawDataSearch || [])
  .filter(d => d.code !== "00FR")
  .map(d => ({
    code: d.code,
    label: d.libelle || d.code,
    pop: d.P22_POP
  }));

// Utiliser le helper createSearchBox
const searchBox = createSearchBox({
  data: searchData,
  selection: mapSelectionState,  // Set mutable
  onToggle: toggleMapSelection,
  placeholder: "🔍 Rechercher un territoire...",
  maxResults: 8,
  maxChips: 5
});

display(searchBox);
```

</div>

```js
// === CHARGEMENT GEO ÉCHELON (réactif) ===
const meta = ECHELON_META[echelon];
const geoRawJson = await GEO_HANDLES[echelon].json();
const geoConverted = geoRawJson.type === "Topology"
  ? topojson.feature(geoRawJson, geoRawJson.objects[Object.keys(geoRawJson.objects)[0]])
  : geoRawJson;
const currentGeo = rewind(geoConverted, true);

// Mettre à jour labelMap
labelMaps[echelon] = new Map(currentGeo.features.map(f => [
  f.properties[meta.geoKey],
  f.properties[meta.labelKey]
]));
```

```js
// === DONNÉES ÉCHELON POUR CARTE 1 ===
const rawTableData = await getAggData(echelon);
const frData = rawTableData.find(d => d.code === "00FR");
const dataNoFrance = rawTableData.filter(d => d.code !== "00FR");

// Colonne indicateur (via helper)
const colKey = buildColKey(indicateur, periode);

// Jointure données → géo
for (const f of currentGeo.features) {
  const code = f.properties[meta.geoKey];
  const row = dataNoFrance.find(d => d.code === code);
  if (row) {
    f.properties[colKey] = row[colKey];
    f.properties.P22_POP = row.P22_POP;
    f.properties.P16_POP = row.P16_POP;
  }
}

// Choix palette selon type indicateur
const isDivergent = indicateur.includes("sma") || indicateur.includes("vtcam");
const PAL_BINS = isDivergent ? PAL_PURPLE_GREEN : PAL_SEQ_BLUE;

// Bins pour couleurs (nombre adapté à la palette)
const nBins = PAL_BINS.length;  // 8 pour divergent, 6 pour séquentiel
const binsResult = makeSeqQuantileBins(dataNoFrance, colKey, nBins);
const BINS = binsResult.thresholds || [];
const getColor = (v) => getColorByBins(v, BINS, PAL_BINS);

// Label indicateur (via helper - format medium)
const indicLabel = getIndicLabel(indicateur, "medium");
```

<!-- ========== CARTES ========== -->
<div class="grid grid-cols-2" style="gap: 1rem; margin: 1rem 0;">

<div class="card" style="padding: 0.5rem;">

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
  getLabel: ({ code }) => labelMaps[echelon].get(code) || code,
  formatValue,
  indicLabel,
  selectedCodes: [...mapSelectionState],
  showLabels: echelon === "Région",
  echelon,
  width: 520,
  height: 480
});

// Overlay stats
const statsOverlay1 = createStatsOverlay({
  mean: frData?.[colKey] || 0,
  top3: "",
  bottom3: "",
  showTop3Bottom3: false
});

// Légende
const legend1 = createBinsLegend({
  colors: PAL_BINS,
  labels: binsResult.labels || [],
  vertical: true,
  title: indicLabel
});

// Zoom
const zoomControls1 = addZoomBehavior(map1);

// Wrapper
const mapWrapper1 = createMapWrapper(map1, statsOverlay1, legend1, zoomControls1);

// Gestionnaire clic
addMapClickHandlers(map1, currentGeo, f => f.properties[meta.geoKey], toggleMapSelection);

display(mapWrapper1);
```

<div style="text-align: center; font-size: 13px; color: #6b7280; margin-top: 4px;">
Carte 1 — ${echelon} — Cliquez pour filtrer
</div>

</div>

<div class="card" style="padding: 0.5rem;">

```js
// === CARTE 2 — ZOOM COMMUNES (affiche toujours le 1er territoire sélectionné)
const zoomTerritoryCode = mapSelectionState.size >= 1 ? [...mapSelectionState][0] : null;
console.log(`[EXDC Carte2] 🗺️ zoomTerritoryCode: ${zoomTerritoryCode}, échelon: ${echelon}, filterKey: ${meta.filterKey}`);

// Query DuckDB pour obtenir les données des communes du territoire zoomé
let zoomCommunesData = [];
if (zoomTerritoryCode) {
  zoomCommunesData = await queryCommunes({ conn }, {
    tableName: "agg_commARM",
    filter: { [meta.filterKey]: [zoomTerritoryCode] },
    columns: ["code", "libelle", "P22_POP", colKey],
    limit: 2000
  });
  console.log(`[EXDC Carte2] 📊 DuckDB retourne ${zoomCommunesData.length} communes`);
}
const zoomDataMap = new Map(zoomCommunesData.map(d => [d.code, d]));

// Filtrer et enrichir features TopoJSON avec données DuckDB
// Filtrer TopoJSON par filterKey
const filteredFeatures = zoomTerritoryCode
  ? communesGeo.features.filter(f => {
      const propVal = f.properties[meta.filterKey];
      return String(propVal) === String(zoomTerritoryCode);
    })
  : [];
console.log(`[EXDC Carte2] 🔍 TopoJSON filtré: ${filteredFeatures.length} features (filterKey=${meta.filterKey}, cherche=${zoomTerritoryCode})`);
if (filteredFeatures.length === 0 && zoomTerritoryCode) {
  // Debug: afficher quelques valeurs de filterKey pour comprendre
  const sampleVals = communesGeo.features.slice(0, 3).map(f => f.properties[meta.filterKey]);
  console.log(`[EXDC Carte2] ⚠️ Exemples valeurs TopoJSON ${meta.filterKey}:`, sampleVals);
}

const communesZoomGeo = zoomTerritoryCode
  ? {
      type: "FeatureCollection",
      features: filteredFeatures
        .map(f => {
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
  // Bins pour communes (utilise données DuckDB) - nombre adapté à la palette
  const binsResultC = zoomCommunesData.length >= nBins
    ? makeSeqQuantileBins(zoomCommunesData, colKey, nBins)
    : binsResult;
  const BINS_C = binsResultC.thresholds || BINS;
  const getColorC = (v) => getColorByBins(v, BINS_C, PAL_BINS);

  const map2 = renderChoropleth({
    geoData: communesZoomGeo,
    valueCol: colKey,
    getColor: getColorC,
    getCode: f => f.properties.CODGEO,
    getLabel: ({ code }) => {
      const feat = communesZoomGeo.features.find(f => f.properties.CODGEO === code);
      return feat?.properties.libelle || code;
    },
    formatValue,
    indicLabel,
    selectedCodes: [],
    showLabels: communesZoomGeo.features.length < 50,
    echelon: "Commune",
    width: 520,
    height: 480
  });

  const legend2 = createBinsLegend({
    colors: PAL_BINS,
    labels: binsResultC.labels || [],
    vertical: true,
    title: indicLabel
  });
  const zoomControls2 = addZoomBehavior(map2);
  const mapWrapper2 = createMapWrapper(map2, null, legend2, zoomControls2);
  display(mapWrapper2);
  const multiInfo = mapSelectionState.size > 1
    ? html`<span style="color:#6b7280"> (${mapSelectionState.size} territoires dans tableau)</span>`
    : "";
  display(html`<div style="text-align: center; font-size: 13px; color: #6b7280; margin-top: 4px;">
    Carte 2 — ${communesZoomGeo.features.length} communes de <strong>${labelMaps[echelon].get(zoomTerritoryCode) || zoomTerritoryCode}</strong>${multiInfo}
  </div>`);
} else {
  display(html`<div class="info-box" style="text-align: center; padding: 80px 20px;">
    <strong>Cliquez sur un territoire</strong><br>
    sur la carte de gauche<br>
    pour zoomer sur ses communes.
  </div>`);
}
```

</div>

</div>

<!-- ========== TABLEAU COMMUNES ========== -->

```js
// === QUERY DUCKDB COMMUNES FILTRÉES ===
const filterCodes = [...mapSelectionState];
const filterKey = meta.filterKey;  // DEP, REG, EPCI, ZE2020

// Construire filtre DuckDB
const filter = filterCodes.length > 0 ? { [filterKey]: filterCodes } : {};

// Colonnes à récupérer
const tableCols = ["code", "libelle", "DEP", "P22_POP", colKey];

// Query
const communesTableData = await queryCommunes({ conn }, {
  tableName: "agg_commARM",
  filter,
  columns: tableCols,
  orderBy: sortState.col,
  orderDir: sortState.asc ? "ASC" : "DESC",
  limit: 5000  // Limite pour perf
});

console.log(`[EXDC] ${communesTableData.length} communes récupérées`);
```

```js
// === PAGINATION ===
const PAGE_SIZE = 50;
const totalPages = Math.ceil(communesTableData.length / PAGE_SIZE);
const currentPage = Math.min(pageState, totalPages - 1);
const paginatedData = communesTableData.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

// Max pour barres
const maxByCol = {};
for (const col of [colKey, "P22_POP"]) {
  const vals = communesTableData.map(d => d[col]).filter(v => v != null);
  maxByCol[col] = { max: Math.max(...vals), min: Math.min(...vals) };
}

// Helper barres
const makeBar = (col, value) => {
  if (value == null || !maxByCol[col]) return "";
  const { max, min } = maxByCol[col];
  const range = Math.max(Math.abs(max), Math.abs(min));
  const pct = Math.abs(value) / range * 100;
  const color = value >= 0 ? "#22c55e" : "#ef4444";
  return html`<div style="display:flex; align-items:center; gap:4px;">
    <span style="width:50px; text-align:right">${formatValue(col, value)}</span>
    <div style="width:60px; height:12px; background:#f3f4f6; border-radius:2px; overflow:hidden;">
      <div style="width:${pct}%; height:100%; background:${color}"></div>
    </div>
  </div>`;
};

// Helper tri header
const thSort = (col, label) => {
  const isSorted = sortState.col === col;
  const arrow = isSorted ? (sortState.asc ? " ↑" : " ↓") : "";
  return html`<th style="cursor:pointer; user-select:none;" onclick=${() => setSort(col)}>${label}${arrow}</th>`;
};
```

<div class="card" style="margin: 1rem 0; padding: 1rem;">

<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
<h4 style="margin: 0;">Communes ${filterCodes.length > 0 ? `(filtrées par ${echelon})` : "(toutes)"}</h4>
<div style="font-size: 13px; color: #6b7280;">${communesTableData.length.toLocaleString('fr-FR')} communes</div>
</div>

```js
// === TABLEAU ===
display(html`<table class="tbl">
  <thead>
    <tr>
      ${thSort("libelle", "Commune")}
      ${thSort("DEP", "Dép")}
      ${thSort("P22_POP", "Pop 2022")}
      ${thSort(colKey, indicLabel)}
    </tr>
  </thead>
  <tbody>
    ${paginatedData.map(d => html`<tr>
      <td style="font-weight:500">${d.libelle || d.code}</td>
      <td>${d.DEP}</td>
      <td style="text-align:right">${d.P22_POP?.toLocaleString('fr-FR') || "—"}</td>
      <td>${makeBar(colKey, d[colKey])}</td>
    </tr>`)}
  </tbody>
</table>`);
```

```js
// === CONTRÔLES PAGINATION ===
if (totalPages > 1) {
  display(html`<div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 1rem;">
    <button class="btn-small" onclick=${() => setPage(0)} disabled=${currentPage === 0}>⏮</button>
    <button class="btn-small" onclick=${() => setPage(currentPage - 1)} disabled=${currentPage === 0}>◀ Préc</button>
    <span style="padding: 0 12px;">Page ${currentPage + 1} / ${totalPages}</span>
    <button class="btn-small" onclick=${() => setPage(currentPage + 1)} disabled=${currentPage >= totalPages - 1}>Suiv ▶</button>
    <button class="btn-small" onclick=${() => setPage(totalPages - 1)} disabled=${currentPage >= totalPages - 1}>⏭</button>
  </div>`);
}
```

</div>
