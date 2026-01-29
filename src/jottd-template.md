---
title: OTTD — Template
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     &s PAGE_TEMPLATE — Preview live du template multi-volets
     ============================================================
     Date: 2026-01-09

     Cette page sert de :
     1. Démonstration visuelle du template
     2. Référence pour les placeholders et sections
     3. Test des helpers avec données réelles

     Les annotations [TPL-xxx] indiquent les zones à adapter
     ============================================================ -->

<!-- ============================================================
     [TPL-BANNER] BANNIÈRE — Sticky 42px spacegray
     ============================================================ -->
<div class="banner">
  <div class="banner-inner">
    <div class="banner-titles">
      <h1>OTTD — Template</h1>
      <p>Preview structure multi-volets — <em style="color:#fcd34d">zones annotées [TPL-xxx]</em></p>
    </div>
    <nav class="nav-banner" id="nav-container"></nav>
    <span class="sources-btn" title="[TPL-SOURCES] Adapter les sources selon volet">? Sources</span>
  </div>
</div>

<!-- ============================================================
     [TPL-IMPORTS] SECTION IMPORTS
     ============================================================ -->

```js
// =======================================================
// &s IMPORTS — Helpers standards tous volets
// =======================================================
import * as topojson from "npm:topojson-client";

// Layout et navigation
import { createNav, OTTD_PAGES } from "./helpers/layout.js";

// Indicateurs
import {
  INDICATEURS,
  formatValue,
  getColLabel
} from "./helpers/indicators-ddict-js.js";

// Couleurs et légendes
import {
  PAL_PURPLE_GREEN,
  PAL_SEQ_BLUE,
  getColorByBins,
  makeSeqQuantileBins
} from "./helpers/colors.js";
import { createBinsLegend } from "./helpers/legend.js";

// Cartes
import { renderChoropleth, createStatsOverlay } from "./helpers/maps.js";

// Recherche fuzzy
import { createSearchBox } from "./helpers/search.js";
// &e IMPORTS
```

```js
// =======================================================
// &s NAV_SETUP — Navigation avec lien Template
// =======================================================
const PAGES_WITH_TEMPLATE = [
  { id: 'exd', label: 'EXD', href: './jottd-exd-explor-dyn' },
  { id: 'exdc', label: 'EXDC', href: './jottd-exdc-commune' },
  { id: 'template', label: 'Template', href: './jottd-template' }
];
const navElement = createNav(PAGES_WITH_TEMPLATE, 'template');
document.getElementById('nav-container').replaceWith(navElement);
// &e NAV_SETUP
```

<!-- ============================================================
     [TPL-DATA] SECTION CHARGEMENT DONNÉES
     ============================================================ -->

```js
// =======================================================
// &s DATA_LOAD — Exemple avec 2 échelons (ZE + DEP)
// =======================================================
// [TPL-DATA] Adapter selon volet : JSON, Parquet, DuckDB

// Données agrégées
const dataZE = await FileAttachment("data/agg_ze.json").json();
const dataDep = await FileAttachment("data/agg_dep.json").json();

// TopoJSON échelons
const topoZE = await FileAttachment("data/nodom_zones-emploi_2025.topojson").json();
const topoDep = await FileAttachment("data/nodom_departement_2025.topojson").json();

// Config échelons
const ECHELONS_DEMO = {
  "Zone d'emploi": {
    data: dataZE,
    topo: topoZE,
    geoKey: "ze2020",
    labelKey: "libze2020"
  },
  "Département": {
    data: dataDep,
    topo: topoDep,
    geoKey: "code_insee",
    labelKey: "nom_officiel"
  }
};
// &e DATA_LOAD
```

```js
// =======================================================
// &s DATA_PREP — Préparation données
// =======================================================
// [TPL-PREP] France référence toujours en première ligne
const frDataZE = dataZE.find(d => d.code === "00FR");
const dataNoFranceZE = dataZE.filter(d => d.code !== "00FR");

// Map code → label pour chips
const codeToLabel = new Map(dataNoFranceZE.map(d => [d.code, d.libelle]));
// &e DATA_PREP
```

<!-- ============================================================
     [TPL-SUB-BANNER] SOUS-BANNIÈRE (optionnelle)
     Décalée à droite du sidebar (margin-left: 260px)
     ============================================================ -->

<div class="sub-banner">
<div class="sub-banner-inner">

<div class="sub-group">
<div class="sub-group-title">[TPL-ECHELON]</div>

```js
const echelon = view(Inputs.select(
  ["Zone d'emploi", "Département"],
  { value: "Zone d'emploi", label: "" }
));
```

</div>

<div class="sub-sep"></div>

<div class="sub-group">
<div class="sub-group-title">[TPL-INDICATEUR]</div>

```js
const indicateur = view(Inputs.select(
  new Map([
    ["Évol. pop. TCAM", "dm_pop_vtcam"],
    ["Solde migratoire", "dm_sma_vtcam"],
    ["Part 60+ ans", "dmv_60p_pct"]
  ]),
  { value: "dm_pop_vtcam", label: "" }
));
```

</div>

<div class="sub-sep"></div>

<div class="sub-group">
<div class="sub-group-title">[TPL-PERIODE]</div>

```js
const periode = view(Inputs.select(
  new Map([["2016-22", "1622"], ["2011-16", "1116"]]),
  { value: "1622", label: "" }
));
```

</div>

</div>
</div>

<!-- ============================================================
     [TPL-STATE] ÉTATS MUTABLES
     ============================================================ -->

```js
// =======================================================
// &s STATE — États réactifs Mutable
// =======================================================
// [TPL-STATE] Adapter selon besoins volet
const selectedCodes = Mutable(new Set());
const sortState = Mutable({ col: "P22_POP", asc: false });
const pageState = Mutable(0);

// Toggle sélection
function toggleSelection(code) {
  const current = new Set(selectedCodes.value);
  current.has(code) ? current.delete(code) : current.add(code);
  selectedCodes.value = current;
  pageState.value = 0;
}

function clearSelection() {
  selectedCodes.value = new Set();
  pageState.value = 0;
}
// &e STATE
```

<!-- ============================================================
     [TPL-LAYOUT] LAYOUT PRINCIPAL
     Sidebar 260px fixed + contenu margin-left: 260px
     ============================================================ -->

<!-- SIDEBAR -->
<aside class="sidebar">

  <!-- [TPL-PANEL-SEARCH] Panel Recherche -->
  <section class="panel">
    <div class="panel-title">Recherche</div>
    <span class="panel-hint">Saisir 2+ caractères</span>
    <div id="search-container" style="margin-top: 6px;"></div>
  </section>

  <!-- [TPL-PANEL-SELECTION] Panel Sélection -->
  <section class="panel">
    <div class="panel-title">Sélection</div>
    <div id="selection-info"></div>
  </section>

  <!-- [TPL-PANEL-OPTIONS] Panel Options -->
  <section class="panel">
    <div class="panel-title">Options carte</div>
    <div id="options-container"></div>
  </section>

  <!-- [TPL-PANEL-LEGEND] Panel Légende -->
  <section class="panel">
    <div class="panel-title">Légende</div>
    <div id="legend-container"></div>
  </section>

</aside>

<!-- CONTENU PRINCIPAL -->
<div class="layout-main">

```js
// =======================================================
// &s SEARCH_INIT — Initialisation recherche
// =======================================================
// [TPL-SEARCH] Adapter données selon échelon actif
const config = ECHELONS_DEMO[echelon];
const currentData = config.data.filter(d => d.code !== "00FR");

const searchData = currentData.map(d => ({
  code: d.code,
  label: d.libelle || d.code,
  pop: d.P22_POP
}));

const searchBox = createSearchBox({
  data: searchData,
  selection: selectedCodes,
  onToggle: toggleSelection,
  placeholder: "Rechercher...",
  maxResults: 8,
  maxChips: 5,
  maxWidth: 240
});

const searchContainer = document.getElementById('search-container');
if (searchContainer) {
  searchContainer.innerHTML = '';
  searchContainer.appendChild(searchBox);
}
// &e SEARCH_INIT
```

```js
// =======================================================
// &s SELECTION_INFO — Affichage sélection
// =======================================================
const selCount = selectedCodes.size;
const selInfoHtml = selCount > 0
  ? html`<div style="font-size:11px;">
      <span style="color:#2563eb; font-weight:600">${selCount} sélectionné(s)</span>
      <button style="margin-left:8px; padding:2px 6px; font-size:10px; cursor:pointer; background:#fee2e2; border:1px solid #fca5a5; border-radius:3px; color:#991b1b;" onclick=${clearSelection}>Effacer</button>
    </div>`
  : html`<span style="font-size:11px; color:#6b7280; font-style:italic;">Aucune sélection</span>`;

const selContainer = document.getElementById('selection-info');
if (selContainer) {
  selContainer.innerHTML = '';
  selContainer.appendChild(selInfoHtml);
}
// &e SELECTION_INFO
```

```js
// =======================================================
// &s VIZ_PREP — Préparation visualisation
// =======================================================
// [TPL-VIZ] Colonne et couleurs
const colKey = `${indicateur}_${periode}`;
const indicLabel = INDICATEURS[indicateur]?.label || indicateur;

// Bins quantiles
const binsResult = makeSeqQuantileBins(currentData, colKey, 6);
const BINS = binsResult.thresholds || [];
const PAL = indicateur.includes("sma") || indicateur.includes("vtcam")
  ? PAL_PURPLE_GREEN
  : PAL_SEQ_BLUE;

const getColor = (v) => getColorByBins(v, BINS, PAL);

// Conversion TopoJSON → GeoJSON
const geoRaw = config.topo;
const geoConverted = geoRaw.type === "Topology"
  ? topojson.feature(geoRaw, geoRaw.objects[Object.keys(geoRaw.objects)[0]])
  : geoRaw;

// Jointure données → géo
for (const f of geoConverted.features) {
  const code = f.properties[config.geoKey];
  const row = currentData.find(d => d.code === code);
  if (row) {
    f.properties[colKey] = row[colKey];
    f.properties.P22_POP = row.P22_POP;
  }
}
// &e VIZ_PREP
```

<!-- [TPL-CARDS] Ligne de cartes 2 colonnes -->
<div class="cards-row">

<div class="card">
<h2>[TPL-CARTE] ${echelon} — ${indicLabel}</h2>

```js
// =======================================================
// &s MAP_RENDER — Rendu carte choroplèthe
// =======================================================
const map1 = renderChoropleth({
  geoData: geoConverted,
  valueCol: colKey,
  getColor: (v, f) => {
    const code = f.properties[config.geoKey];
    return selectedCodes.has(code) ? "#ffd500" : getColor(v);
  },
  getCode: f => f.properties[config.geoKey],
  getLabel: ({ code }) => {
    const feat = geoConverted.features.find(f => f.properties[config.geoKey] === code);
    return feat?.properties[config.labelKey] || code;
  },
  formatValue,
  indicLabel,
  selectedCodes: [...selectedCodes],
  width: 480,
  height: 420
});

display(map1);
// &e MAP_RENDER
```

</div>

<div class="card">
<h2>[TPL-STATS] Statistiques</h2>

```js
// =======================================================
// &s STATS_DISPLAY — Affichage stats
// =======================================================
const frData = config.data.find(d => d.code === "00FR");
const frValue = frData?.[colKey];

// Top 5 / Bottom 5
const sorted = [...currentData].sort((a, b) => (b[colKey] || 0) - (a[colKey] || 0));
const top5 = sorted.slice(0, 5);
const bottom5 = sorted.slice(-5).reverse();

const statsHtml = html`
<div style="font-size:11px;">
  <div style="margin-bottom:12px;">
    <strong>France :</strong> ${formatValue(frValue, indicateur)}
  </div>
  <div style="margin-bottom:8px;">
    <strong style="color:#059669;">Top 5 :</strong>
    <ol style="margin:4px 0 0 16px; padding:0;">
      ${top5.map(d => html`<li>${d.libelle}: ${formatValue(d[colKey], indicateur)}</li>`)}
    </ol>
  </div>
  <div>
    <strong style="color:#dc2626;">Bottom 5 :</strong>
    <ol style="margin:4px 0 0 16px; padding:0;">
      ${bottom5.map(d => html`<li>${d.libelle}: ${formatValue(d[colKey], indicateur)}</li>`)}
    </ol>
  </div>
</div>
`;

display(statsHtml);
// &e STATS_DISPLAY
```

</div>

</div>

```js
// =======================================================
// &s LEGEND_RENDER — Rendu légende
// =======================================================
const legendHtml = createBinsLegend(BINS, PAL, { label: indicLabel });
const legendContainer = document.getElementById('legend-container');
if (legendContainer) {
  legendContainer.innerHTML = '';
  legendContainer.appendChild(legendHtml);
}
// &e LEGEND_RENDER
```

<!-- [TPL-TABLE] Tableau pleine largeur -->
<div class="card-full">
<h2>[TPL-TABLEAU] Données ${echelon}</h2>

```js
// =======================================================
// &s TABLE_RENDER — Tableau simple
// =======================================================
const PAGE_SIZE = 20;
const currentPage = pageState;

// Tri
const { col: sortCol, asc: sortAsc } = sortState;
const sortedData = [...currentData].sort((a, b) => {
  const va = a[sortCol] ?? 0;
  const vb = b[sortCol] ?? 0;
  return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
});

// Pagination
const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
const pageData = sortedData.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

// Header tri
const thSort = (label, col) => html`<th class="num" style="cursor:pointer;" onclick=${() => {
  const current = sortState.value;
  sortState.value = current.col === col
    ? { col, asc: !current.asc }
    : { col, asc: false };
  pageState.value = 0;
}}>${label} ${sortCol === col ? (sortAsc ? '▲' : '▼') : ''}</th>`;

const tableHtml = html`
<div class="table-container" style="max-height:400px; overflow-y:auto;">
<table>
  <thead>
    <tr>
      <th>Territoire</th>
      ${thSort('Population', 'P22_POP')}
      ${thSort(indicLabel, colKey)}
    </tr>
  </thead>
  <tbody>
    ${pageData.map(d => html`
      <tr class="${selectedCodes.has(d.code) ? 'selected' : ''}"
          onclick=${() => toggleSelection(d.code)}
          style="cursor:pointer;">
        <td>${d.libelle}</td>
        <td class="num">${d.P22_POP?.toLocaleString('fr-FR') || '—'}</td>
        <td class="num">${formatValue(d[colKey], indicateur)}</td>
      </tr>
    `)}
  </tbody>
</table>
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; font-size:11px;">
  <span>${sortedData.length} territoires</span>
  <div style="display:flex; gap:4px;">
    <button style="padding:2px 8px; cursor:pointer;" disabled=${currentPage === 0} onclick=${() => setPage(currentPage - 1)}>←</button>
    <span>Page ${currentPage + 1}/${totalPages}</span>
    <button style="padding:2px 8px; cursor:pointer;" disabled=${currentPage >= totalPages - 1} onclick=${() => setPage(currentPage + 1)}>→</button>
  </div>
</div>
`;

display(tableHtml);

function setPage(p) {
  pageState.value = Math.max(0, Math.min(p, totalPages - 1));
}
// &e TABLE_RENDER
```

</div>

</div>

<!-- &e PAGE_TEMPLATE -->
