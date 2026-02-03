---
title: OTTD — Économie ZE
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     Volet Économie ZE — Carte + Courbe + Tableau indicateurs
     Date: 2026-01-20 | v0.3: Refonte indicateurs spécialisation
     Layout: Gauche (carte + courbe) | Droite (tableau secteurs)
     Dessous: Tableau indicateurs éco (style exdtc)
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
display(createBanner({
  title: "OTTD — Économie ZE",
  subtitle: "Emploi, spécialisation, dynamiques sectorielles",
  navElement: createNav(OTTD_PAGES, 'exdeco'),
  sourcesText: "? Sources",
  sourcesTooltip: "URSSAF 2014-2024, FLORES 2022, INSEE RP 2011/16/22"
}));
```
<!-- &e BANNER -->

<!-- &s IMPORTS -->
```js
import * as topojson from "npm:topojson-client";
import rewind from "npm:@mapbox/geojson-rewind";
import * as Plot from "npm:@observablehq/plot";

import { getEchelonMeta, getLabelMap, setLabelMap, getFranceData, getDataNoFrance } from "./helpers/0loader.js";
import { DEFAULT_ECO_TABLE_INDICS } from "./helpers/constants.js";
import { getIndicOptionsByVolet, getPeriodesForIndicateur, getDefaultPeriode, buildColKey, getIndicLabel, getPeriodeLabel } from "./helpers/selectindic.js";
import { formatValue } from "./helpers/indicators-ddict-js.js";
import { computeIndicBins, createGradientScale, GRADIENT_PALETTES } from "./helpers/colors.js";
import { createBinsLegend, createGradientLegend } from "./helpers/legend.js";
import { renderChoropleth, createMapWrapper, addZoomBehavior } from "./helpers/maps.js";
import { createSearchBox } from "./helpers/search.js";
import { sortTableData, computeBarStats, getIndicUnit, renderTable, renderPagination, exportCSV, createTableToolbar, openTableFullscreen } from "./helpers/0table.js";
import { exportSVG } from "./helpers/graph-options.js";
import { renderButterflyMulti } from "./helpers/graph-butterfly.js";
import { renderSlopeChart, renderIndice100Chart, renderIndice100Multi, LABELS_A5 } from "./helpers/graph-slope-indice.js";
import { renderTreemapA5A21, renderTreemapSimple } from "./helpers/graph-treemap.js";
import { renderButterflyVertical } from "./helpers/graph-butterfly-vertical.js";
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

// LabelMap ZE
const zeLabelMap = new Map();
zeData.forEach(d => d.code && d.libelle && zeLabelMap.set(String(d.code), d.libelle));
setLabelMap("Zone d'emploi", zeLabelMap);

const frData = getFranceData(zeData);
const dataNoFrance = getDataNoFrance(zeData);
const meta = getEchelonMeta("Zone d'emploi");

// Colonnes disponibles
const AVAILABLE_COLUMNS = new Set(Object.keys(zeData[0] || {}));
```
<!-- &e INIT -->

<!-- &s STATE -->
```js
// Présélection Rennes (5315) + Paris (1109) par défaut
const mapSelectionState = Mutable(new Set(["5315", "1109"]));
const sortState = Mutable({ col: "eco_krugman_a5_22", asc: false });

const addToSelection = (code) => {
  const s = new Set(mapSelectionState.value);
  s.add(code);
  mapSelectionState.value = s;
};

const removeFromSelection = (code) => {
  const s = new Set(mapSelectionState.value);
  s.delete(code);
  mapSelectionState.value = s;
};

const toggleMapSelection = (code) => {
  if (mapSelectionState.value.has(code)) {
    removeFromSelection(code);
  } else {
    addToSelection(code);
  }
};

const clearMapSelection = () => {
  mapSelectionState.value = new Set();
};

const setSort = (col) => {
  const curr = sortState.value.col;
  const asc = sortState.value.asc;
  sortState.value = curr === col ? { col, asc: !asc } : { col, asc: false };
};

```
<!-- &e STATE -->

<!-- &s SUB_BANNER -->
<div class="sub-banner" style="margin-left:260px;width:calc(100% - 260px);">
<div class="sub-banner-inner">

<div class="sub-group">
<div class="sub-group-title">Indicateur carte</div>

```js
// Sélecteur indicateurs éco pour la carte — filtre "ecodash" (22 indicateurs éco)
const indicCarte = view(Inputs.select(getIndicOptionsByVolet("ecodash", null, true), { value: "eco_krugman_a38", label: "" }));
```

```js
const perCarteMap = getPeriodesForIndicateur(indicCarte);
const periodeCarte = view(Inputs.select(perCarteMap, { value: [...perCarteMap.values()][0], label: "" }));
```

</div>
<div class="sub-sep"></div>

<div class="sub-group">
<div class="sub-group-title">Sélection</div>

```js
display(mapSelectionState.size > 0
  ? html`<span style="color:#2563eb;font-weight:600">${mapSelectionState.size} ZE</span> <button style="padding:1px 4px;cursor:pointer;background:#fee2e2;border:1px solid #fca5a5;border-radius:3px;color:#991b1b;" onclick=${clearMapSelection}>✕</button>`
  : html`<span style="color:#6b7280;">Aucune</span>`);
```

</div>

</div>
</div>
<!-- &e SUB_BANNER -->

<!-- &s SIDEBAR -->
<aside class="sidebar">

<section class="panel">
<div class="panel-title">SÉLECTION ZE</div>
<div id="search-container" style="margin-top:6px;"></div>
</section>

<section class="panel">
<div class="panel-title">OPTIONS CARTE</div>

```js
const colorMode = view(Inputs.radio(["8 catégories", "Gradient"], { value: "8 catégories", label: "Mode" }));
const showValuesOnMap = view(Inputs.toggle({ label: "Labels", value: true }));
const labelBy = view(Inputs.select(new Map([
  ["Principaux terr.", "population"],
  ["Top 20 + Bot 20", "top5_bot5"],
  ["Top 20 indic", "indicator_top"],
  ["Bottom 20 indic", "indicator_bottom"]
]), { value: "population", label: "Labels" }));
const labelMode = view(Inputs.radio(["values", "names", "both"], { value: "both", label: "Contenu" }));
```

</section>

<section class="panel">
<div class="panel-title">Indicateurs tableau</div>
<span class="panel-hint"><i>ctrl/shift click pour multi-sélection</i></span>

```js
// Multi-select indicateurs supplémentaires (dans sidebar) — volet ecodash
const extraIndics = view(Inputs.select(
  getIndicOptionsByVolet("ecodash", null, true),
  { label: "", multiple: true, value: [], width: 230 }
));
```

</section>

</aside>
<!-- &e SIDEBAR -->

<!-- &s LAYOUT_MAIN -->
<div class="layout-main">

```js
// === SIDEBAR SEARCH ===
const searchData = dataNoFrance.map(d => ({ code: d.code, label: d.libelle || d.code, pop: d.P23_POP }));
const searchBox = createSearchBox({
  data: searchData, selection: mapSelectionState, onToggle: toggleMapSelection, onClear: clearMapSelection,
  placeholder: "Rechercher ZE...", maxResults: 8, maxChips: 4, maxWidth: 230, showClearAll: true, showCount: true
});
const searchContainer = document.getElementById('search-container');
if (searchContainer) { searchContainer.innerHTML = ''; searchContainer.appendChild(searchBox); }
```

```js
// === DONNÉES CARTE ===
const colKeyCarte = buildColKey(indicCarte, periodeCarte);
const labelCarte = getIndicLabel(indicCarte, "long");

// Bindage geo
for (const f of zeGeo.features) {
  const row = dataNoFrance.find(d => d.code === f.properties[meta.geoKey]);
  if (row) {
    f.properties[colKeyCarte] = row[colKeyCarte];
    f.properties.P23_POP = row.P23_POP;
  }
}

const indicBins = computeIndicBins(dataNoFrance, colKeyCarte, indicCarte);
const { bins, palette, isDiv, getColor: getColorBins } = indicBins;
const gradient = createGradientScale(dataNoFrance, colKeyCarte);
const isGradient = colorMode === "Gradient";
const getColor = isGradient ? gradient.getColor : getColorBins;
```

<!-- Titre aligné (~35% + ~65%) -->
<div style="display:flex;gap:12px;margin-bottom:8px;align-items:baseline;">
<h3 style="flex:1.3;min-width:500px;max-width:580px;margin:0;">Économie — Zones d'emploi</h3>
<h3 style="flex:2.5;margin:0;">Tableau ZE</h3>
</div>

<div style="display:flex;gap:12px;align-items:stretch;">

<!-- COLONNE GAUCHE : Carte + Courbe (~40%) -->
<div style="flex:1.3;min-width:500px;max-width:580px;display:flex;flex-direction:column;gap:12px;">

<div class="card">
<h2>${labelCarte}</h2>

```js
const mapZE = renderChoropleth({
  geoData: zeGeo, valueCol: colKeyCarte,
  getColor: (v, f) => getColor(v),
  getCode: f => f.properties[meta.geoKey],
  getLabel: ({ code }) => zeLabelMap.get(code) || code,
  formatValue: (k, v) => formatValue(indicCarte, v),
  indicLabel: labelCarte, selectedCodes: [...mapSelectionState],
  showLabels: showValuesOnMap, labelMode, labelBy, topN: 10,
  title: labelCarte, echelon: "Zone d'emploi", width: 500, height: 440
});

// Click = toggle sélection
mapZE.style.cursor = "pointer";
mapZE.addEventListener("click", (e) => {
  const path = e.target.closest("path");
  if (!path) return;
  const paths = Array.from(path.parentElement.querySelectorAll("path"));
  const idx = paths.indexOf(path);
  if (idx >= 0 && idx < zeGeo.features.length) {
    const code = zeGeo.features[idx].properties[meta.geoKey];
    toggleMapSelection(code);
  }
});

const unit = getIndicUnit(colKeyCarte);
const legend = isGradient
  ? createGradientLegend({
      colors: gradient.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradient.min, max: gradient.max, showZero: gradient.divergent,
      decimals: 2, title: `Légende${unit ? " (" + unit + ")" : ""}`
    })
  : createBinsLegend({
      colors: palette, labels: bins.labels || [], counts: [],
      vertical: true, title: "Légende", unit, reverse: !isDiv
    });

display(createMapWrapper(mapZE, null, legend, addZoomBehavior(mapZE)));
```

</div>

<!-- GRAPHIQUE FLORES A21 sous la carte - BARRES HORIZONTALES -->
<div class="card" style="margin-top:8px;padding:8px;">

```js
// === BUTTERFLY HORIZONTAL A21 FLORES ===
const vbCodes = [...mapSelectionState];  // Tous les territoires sélectionnés

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

// Rendu butterfly horizontal (barres vers la droite)
if (vbCodes.length > 0) {
  display(renderButterflyVertical({
    franceData: vbFranceData,
    territories: vbTerritories,
    options: {
      width: 540,
      maxSectors: 12,
      barHeight: 18,
      title: "Structure sectorielle FLORES A21 (2023)"
    }
  }));
} else {
  display(html`<div style="padding:20px;text-align:center;color:#6b7280;font-size:11px;">
    Sélectionnez une ZE pour voir la structure sectorielle
  </div>`);
}
```

<p style="font-size:8px;color:#6b7280;margin:2px 0 0 0;">
  FLORES A21 2023 — Part % + IS (violet > 1.15 = spécialisation, cyan < 0.85 = sous-représentation)
</p>
</div>

</div>
<!-- Fin colonne gauche -->

<!-- COLONNE DROITE : Tableau ZE (style exdtc) — 2/3 width, étendu -->
<div class="card" style="flex:2.5;min-width:500px;padding:6px;display:flex;flex-direction:column;">

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
// === SEARCHBAR TABLEAU (viewof pattern) ===
const echSearchInput2 = view(Inputs.text({ placeholder: "1ers caract. territoire ou n° dép...", width: 180 }));
```

```js
// === DONNÉES TABLEAU ZE ===
// Colonnes : indicateur carte + défauts ECO + sélection sidebar
const selectedExtraIndics = extraIndics || [];

// Indicateurs par défaut ECO (depuis constants.js) + sélection manuelle
const defaultEcoCols = DEFAULT_ECO_TABLE_INDICS.map(i => buildColKey(i, getDefaultPeriode(i)));
const extraCols = selectedExtraIndics.map(i => buildColKey(i, getDefaultPeriode(i)));

// Construire clés colonnes avec période par défaut
// Ordre: indicateur carte PUIS sélection sidebar PUIS défauts ECO
const allEcoCols = [
  colKeyCarte,  // Indicateur carte en premier
  ...extraCols,  // Sélection sidebar en 2ème position
  ...defaultEcoCols  // Indicateurs ECO par défaut ensuite
].filter(c => AVAILABLE_COLUMNS.has(c));
const echAllIndicCols2 = [...new Set(allEcoCols)];

// Données avec France en 1ère ligne
const echTableData2 = frData ? [frData, ...dataNoFrance] : dataNoFrance;

// Filtre recherche (viewof réactif)
const echSearchVal2 = (echSearchInput2 || "").toLowerCase();
const echFiltered2 = echSearchVal2
  ? echTableData2.filter(d => (d.libelle || "").toLowerCase().includes(echSearchVal2) || (d.code || "").includes(echSearchVal2))
  : echTableData2;

// Tri
const echSortCol2 = echSortState2.col;
const echSortAsc2 = echSortState2.asc;
const echSorted2 = sortTableData(echFiltered2, echSortCol2, echSortAsc2);

// Stats pour barres
const echStats2 = computeBarStats(echFiltered2, echAllIndicCols2);

// Colonnes compactes : Territoire + indicateurs
const echColumns2 = [
  { key: "libelle", label: "Zone d'emploi", type: "text", width: 130 },
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

// Header : count + export + fullscreen
display(html`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
  <span style="font-size:10px;color:#6b7280;">${echFiltered2.length} ZE</span>
  <div style="display:flex;gap:4px;">
    <button style="font-size:10px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;"
      onclick=${() => exportCSV(echSorted2, echColumns2, "eco_ze_" + new Date().toISOString().slice(0,10) + ".csv")}>
      📥
    </button>
    <button style="font-size:12px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;" title="Plein écran"
      onclick=${() => { const t = document.querySelector(".eco-table-fs-target"); if (t) openTableFullscreen(t); }}>
      ⤢
    </button>
  </div>
</div>`);

// Tableau compact avec scroll vertical (hauteur carte + courbe)
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
  indicColKey: colKeyCarte,
  compact: true,
  maxHeight: 1200,
  scrollX: true,
  scrollbarTop: true,
  stickyFirstCol: true
}));
display(_ecoTblWrap);
void 0;
```

</div>
<!-- Fin COLONNE DROITE (tableau) -->

</div>

<!-- &s INDICES_100_MULTI — Indice 100 France + territoires sélectionnés -->
<h3 style="margin-top:24px;font-size:16px;">Évolution emploi par secteur (indice base 100)</h3>

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
const indice100Codes = [...mapSelectionState];  // Tous les territoires sélectionnés

// Parser le filtre secteurs
// "noAZT" = tous sauf agriculture ET total via excludeSectors
// "noAZ" = tous sauf agriculture via excludeSectors
// "all" = tout
// autres = sectorFilter explicite
const filterValue = indice100SectorFilter.value;
const parsedSectorFilter = (filterValue === "all" || filterValue === "noAZ" || filterValue === "noAZT")
  ? null
  : filterValue.split(",");
const parsedExcludeSectors = filterValue === "noAZT" ? ["TAZ", "T"]
  : filterValue === "noAZ" ? ["TAZ"]
  : null;

// Échelle fixe ou auto
const yDomain = indice100FixedScale ? [90, 130] : null;

// Container flex - resserré pour meilleur alignement
const indice100Container = document.createElement('div');
indice100Container.style.cssText = 'display:flex;align-items:flex-start;gap:8px;overflow-x:auto;';

// Fonction calcul indice100 depuis effectifs bruts
const computeIndice100 = (data, baseYr) => {
  const baseVals = {};
  data.filter(d => d.year === baseYr).forEach(d => {
    baseVals[d.na5] = d.eff;
  });
  return data
    .filter(d => d.year >= baseYr)
    .map(d => ({
      year: d.year,
      na5: d.na5,
      lib: d.lib,
      lib_short: d.lib_short,
      eff: d.eff,
      indice100: baseVals[d.na5] ? Math.round(d.eff / baseVals[d.na5] * 10000) / 100 : null
    }))
    .filter(d => d.indice100 != null);
};

// France (EAE205 - avec détail secteurs)
const franceIndiceData = computeIndice100(eae205FranceSerie, baseYear);

const franceIndiceChart = renderIndice100Chart(franceIndiceData, {
  baseYear: baseYear,
  width: 320,
  height: 240,
  title: "France métro",
  showTotal: true,
  showSectors: true,
  sectorFilter: parsedSectorFilter,
  excludeSectors: parsedExcludeSectors,
  fixedYDomain: yDomain
});
indice100Container.appendChild(franceIndiceChart);

// Territoires sélectionnés : EAE205 ZE (AVEC SECTEURS !)
// Fonction pour construire données indice 100 pour une ZE depuis EAE205
const buildZeIndice100EAE205 = (code) => {
  // Chercher le code avec et sans padding (0051 vs 51)
  const zeData = eae205ZeSerie.filter(d =>
    d.code_ze === code || d.code_ze === code.padStart(4, '0')
  );
  if (!zeData.length) return null;
  return computeIndice100(zeData.map(d => ({
    year: d.year, na5: d.na5, lib: d.lib, lib_short: d.lib_short, eff: d.eff
  })), baseYear);
};

// Afficher graphiques territoires avec SECTEURS (EAE205)
indice100Codes.forEach(code => {
  const zeIndiceData = buildZeIndice100EAE205(code);
  if (zeIndiceData && zeIndiceData.length > 0) {
    const zeChart = renderIndice100Chart(zeIndiceData, {
      baseYear: baseYear,
      width: 320,
      height: 240,
      title: zeLabelMap.get(code) || code,
      showTotal: true,
      showSectors: true,  // Maintenant AVEC secteurs !
      sectorFilter: parsedSectorFilter,
      excludeSectors: parsedExcludeSectors,
      fixedYDomain: yDomain
    });
    zeChart.style.cssText = 'border-left:1px solid #e5e7eb;padding-left:8px;';
    indice100Container.appendChild(zeChart);
  }
});

// Message si aucune sélection
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
<h3 style="margin-top:24px;font-size:16px;">Structure sectorielle — Part emploi et évolution</h3>

<!-- Contrôles partagés : Niveau URSSAF + Période (synchronisée entre les 2 graphiques) -->
<div style="display:flex;gap:24px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">

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

<!-- EAE205 A5 (5 secteurs) - Emploi salarié -->
<div class="card" style="padding:12px;margin-bottom:12px;">

```js
// Pour 22-24, EAE205 utilise 22-23 (arrêt en 2023)
const eaePeriodeLabel = bfPeriode === "22-24" ? "22-23" : bfPeriode;
const eaeNote = bfPeriode === "22-24" ? " (EAE s'arrête en 2023)" : "";
display(html`<h4 style="margin:0 0 10px 0;font-size:14px;color:#1e40af;">EAE205 — Emploi salarié, 5 grands secteurs (${eaePeriodeLabel})${eaeNote}</h4>`);
```

```js
// === EAE205 A5 (5 grands secteurs) ===
// Années selon période sélectionnée
const eaeYearStart = bfPeriode === "16-23" ? 2016
  : bfPeriode === "22-24" ? 2022
  : 2019;
const eaeYearEnd = 2023;

// Calculer parts et évolutions depuis EAE205 France (sans Total)
const eaeFranceParts = (() => {
  // Exclure le Total (na5 = "T")
  const startData = eae205FranceSerie.filter(d => d.year === eaeYearStart && d.na5 !== "T");
  const endData = eae205FranceSerie.filter(d => d.year === eaeYearEnd && d.na5 !== "T");

  const endTotal = endData.reduce((s, d) => s + (d.eff || 0), 0);

  return endData.map(d => {
    const startEff = startData.find(s => s.na5 === d.na5)?.eff || d.eff;
    const evol = startEff > 0 ? ((d.eff - startEff) / startEff) * 100 : 0;
    return {
      secteur: d.lib_short || d.lib,
      pct: (d.eff / endTotal) * 100,
      evol: evol,
      is: 1.0
    };
  }).sort((a, b) => b.pct - a.pct);
})();

// Territoires EAE205 A5 (sans Total)
const eaeTerrParts = [...mapSelectionState].map(code => {
  const codePadded = code.padStart(4, '0');
  // Exclure le Total (na5 = "T")
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
    return {
      secteur: d.lib_short || d.lib,
      pct: localPct,
      evol: evol,
      is: frPct > 0 ? localPct / frPct : 1
    };
  }).sort((a, b) => b.pct - a.pct);

  return { label: zeLabelMap.get(code) || code, data };
});

{
  const chart = renderButterflyMulti({
    franceData: eaeFranceParts,
    territories: eaeTerrParts,
    options: { barHeight: 18, widthPart: 105, widthEvol: 105, widthLabels: 110, evolLabel: `Évol. ${eaePeriodeLabel}` }
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
// Mapper période vers URSSAF : 16-23/19-23 → évol 5 ans (19-24), 22-24 → évol 2 ans (22-24)
const urssafPeriode = bfPeriode === "22-24" ? "22-24" : "19-24";
const urssafNote = bfPeriode === "16-23" ? " (URSSAF démarre en 2019)" : "";
display(html`<h4 style="margin:0 0 10px 0;font-size:14px;color:#1e40af;">URSSAF — Emploi privé ${bfNiveauUrssaf} (${urssafPeriode})${urssafNote}</h4>`);
```

```js
// === PRÉPARATION DONNÉES BUTTERFLY URSSAF ===
const bfUrssafData = bfNiveauUrssaf === "A21" ? urssafA21 : urssafA38;
const bfUrssafFrData = urssafFr;

// Colonne évolution selon période synchronisée (urssafPeriode)
const evolColUrssaf = urssafPeriode === "22-24" ? "evol_2224" : "evol_1924";

// France référence - A21 depuis parquet, A38 calculé depuis ZE
const bfFranceDataUrssaf = (() => {
  if (bfNiveauUrssaf === "A21") {
    // A21 disponible dans urssaf_france
    return bfUrssafFrData.toArray()
      .filter(d => d.a21 && d.a21 !== "")
      .map(d => ({ secteur: d.lib, pct: d.pct_24, evol: d[evolColUrssaf], is: 1.0 }));
  } else {
    // A38 : agréger effectifs ZE pour calculer France evol
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

// Territoires URSSAF (inline pour éviter problème closure)
const bfTerritoriesUrssaf = [...mapSelectionState].map(code => {
  const rows = bfUrssafData.toArray().filter(d => d.code_ze === code);
  return {
    label: zeLabelMap.get(code) || code,
    data: rows.map(d => ({
      secteur: d.lib,
      pct: d.pct_24,
      evol: d[evolColUrssaf],
      is: d.is_24 || (d.pct_24 / (bfFranceDataUrssaf.find(f => f.secteur === d.lib)?.pct || 1))
    }))
  };
});
```

```js
// === RENDU BUTTERFLY CHART URSSAF ===
const evolLabelMap = { "22-24": "Évol. 22→24 (%)", "19-24": "Évol. 19→24 (5 ans)" };
const bfOptionsUrssaf = {
  barHeight: bfNiveauUrssaf === "A21" ? 16 : 12,  // Tassé pour A21/A38
  widthPart: 120,
  widthEvol: 120,
  widthLabels: bfNiveauUrssaf === "A21" ? 100 : 95,  // Labels élargis
  evolLabel: evolLabelMap[urssafPeriode]
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

// Utilise mapSelectionState directement
const zeStrategique = [...mapSelectionState][0];
const zeStrategData = zeStrategique ? floresA21.toArray()
  .filter(d => d.code_ze === zeStrategique)
  .map(d => ({ secteur: d.lib, pct: d.pct_23, is: d.is_23, evol: d.evol_2223 }))
  .filter(d => d.is != null && d.pct > 0.5)
  : [];

const secteursSurRep = zeStrategData.filter(d => d.is >= SEUIL_SUREP).sort((a, b) => b.is - a.is);
const secteursSousRep = zeStrategData.filter(d => d.is <= SEUIL_SOUSREP).sort((a, b) => a.is - b.is);

// Fonction rendu tableau simple
const renderStratTable = (data, isColor) => {
  const tbl = document.createElement('table');
  tbl.style.cssText = 'width:100%;font-size:11px;border-collapse:collapse;';
  tbl.innerHTML = `<tr style="background:#f3f4f6;font-weight:600;">
    <td style="padding:4px;">Secteur</td>
    <td style="padding:4px;text-align:right;">Part %</td>
    <td style="padding:4px;text-align:right;">IS</td>
    <td style="padding:4px;text-align:right;">Évol.</td>
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

// Conteneur flex
const stratContainer = document.createElement('div');
stratContainer.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;';

const surDiv = document.createElement('div');
surDiv.style.cssText = 'flex:1;min-width:280px;';
surDiv.innerHTML = `<h5 style="margin:0 0 8px 0;color:#7c3aed;">🔺 Sur-représentés (IS ≥ ${SEUIL_SUREP})</h5>`;
surDiv.appendChild(renderStratTable(secteursSurRep, '#7c3aed'));

const sousDiv = document.createElement('div');
sousDiv.style.cssText = 'flex:1;min-width:280px;';
sousDiv.innerHTML = `<h5 style="margin:0 0 8px 0;color:#0891b2;">🔻 Sous-représentés (IS ≤ ${SEUIL_SOUSREP})</h5>`;
sousDiv.appendChild(renderStratTable(secteursSousRep, '#0891b2'));

stratContainer.appendChild(surDiv);
stratContainer.appendChild(sousDiv);
display(stratContainer);

// Footer
const zeName = zeLabelMap.get(zeStrategique) || zeStrategique || "Sélectionnez une ZE";
display(html`<p style="font-size:10px;color:#6b7280;margin-top:8px;">
  <strong>${zeName}</strong> — IS = Indice Spécialisation (part locale / part France).
  🔺 Secteurs moteurs locaux | 🔻 Potentiel de développement.
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
// Préparer données treemap France
const treemapFrData = floresFr.toArray()
  .filter(d => d.a21)  // Uniquement A21 (qui ont aussi a5)
  .map(d => ({
    a5: d.a5,
    a21: d.a21,
    lib: d.lib,
    pct: d.pct_23,
    evol_2223: d.evol_2223
  }));

display(renderTreemapA5A21(treemapFrData, {
  width: 500,
  height: 350,
  title: "",
  valueField: "pct"
}));
```

</div>

<!-- Treemap ZE sélectionnée (si sélection) -->
<div class="card" style="flex:1;min-width:400px;padding:12px;">

```js
// Treemap territoire sélectionné (utilise mapSelectionState directement)
const treemapZeCode = [...mapSelectionState][0];

if (treemapZeCode) {
  const treemapZeDataRaw = floresA21.toArray().filter(d => d.code_ze === treemapZeCode);
  const treemapZeData = treemapZeDataRaw.map(d => ({
    a5: d.a5,
    a21: d.a21,
    lib: d.lib,
    pct: d.pct_23,
    evol_2223: d.evol_2223,
    is_23: d.is_23
  }));

  const treemapZeTitle = zeLabelMap.get(treemapZeCode) || treemapZeCode;

  display(html`<h5 style="margin:0 0 8px 0;">${treemapZeTitle} — FLORES 2023</h5>`);
  display(renderTreemapA5A21(treemapZeData, {
    width: 500,
    height: 350,
    title: "",
    valueField: "pct"
  }));
} else {
  display(html`<h5 style="margin:0 0 8px 0;">Territoire</h5>
    <div style="padding:40px;background:#f0f9ff;border:1px dashed #93c5fd;border-radius:8px;text-align:center;color:#2563eb;font-size:11px;height:280px;display:flex;align-items:center;justify-content:center;">
      <span>Sélectionnez une ZE pour voir sa structure sectorielle</span>
    </div>`);
}
```

</div>

</div>

<p style="font-size:9px;color:#6b7280;margin:4px 0 0 0;">
  Treemap : taille des rectangles = part dans l'emploi total. Couleurs par grands secteurs A5. Survoler pour détails.
</p>
<!-- &e TREEMAP_SECTEURS -->

</div>
<!-- &e LAYOUT_MAIN -->

<!-- &s SLOPE_CHART_BOTTOM — Structure sectorielle France 2000-2023 -->
<h3 style="margin-top:24px;">Structure emploi — Évolution sectorielle France</h3>

<div class="card" style="max-width:500px;padding:12px;">

```js
// Slope chart: parts sectorielles France métro (EAE205)
display(renderSlopeChart(eae205FranceSlope, {
  yearStart: 2000,
  yearEnd: 2023,
  width: 450,
  height: 250
}));
```

<p style="font-size:9px;color:#6b7280;margin:4px 0 0 0;">
  Source: INSEE Estimations d'emploi (salariés) — France métro. Montre l'évolution de la part de chaque grand secteur (A5) dans l'emploi total.
</p>

</div>
<!-- &e SLOPE_CHART_BOTTOM -->

<!-- &s RESERVE_URSSAF — Ancien graph indice URSSAF (réserve) -->
<details style="margin-top:24px;">
<summary style="cursor:pointer;font-weight:600;color:#6b7280;">▼ Réserve — Emploi privé URSSAF (indice 2014)</summary>

<div class="card" style="margin-top:12px;padding:12px;">
<h4 style="margin:0 0 8px 0;">Emploi privé — Indice base 100 (2014) — URSSAF</h4>

```js
// Préparer données série URSSAF
const selectedCodesUrssaf = [...mapSelectionState];

// France
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

// ZE sélectionnées
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
  Source: URSSAF 2014-2024 — Emploi privé
</p>
</div>

</details>
<!-- &e RESERVE_URSSAF -->

<!-- &s PIVOTS_SECTEURS — FLORES + URSSAF côte à côte (déplacé en bas) -->
<h3 style="margin-top:24px;">Structure sectorielle — Emploi total (FLORES) vs Emploi privé (URSSAF)</h3>

<div style="margin-bottom:12px;">

```js
const groupingLevel = view(Inputs.radio(["A5", "A21"], { value: "A21", label: "Niveau" }));
```

</div>

<div style="display:flex;gap:16px;flex-wrap:wrap;">

<!-- FLORES (Emploi total) -->
<div class="card" style="flex:1;min-width:420px;padding:8px;">
<h4 style="margin:0 0 8px 0;">FLORES — Emploi total (2022-2023)</h4>

```js
// Données FLORES selon niveau
const isA5Pivot = groupingLevel === "A5";
const floresDataPivot = isA5Pivot ? floresA5 : floresA21;
const floresFrDataPivot = floresFr;

// ZE sélectionnées pour FLORES
const floresCodesPivot = [...mapSelectionState];
const hasFloresSelectionPivot = floresCodesPivot.length > 0;

// France comme référence
const frSectorsPivot = floresFrDataPivot.toArray().map(d => ({
  a5: d.a5, a21: d.a21, lib: d.lib, ord: d.ord_a21 || d.ord_a5,
  fr_pct: d.pct_23, fr_evol: d.evol_2223
}));

// Construire tableau pivot
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

// Rendu tableau FLORES
const floresHeadersPivot = ['Secteur', 'FR %', 'Évol.'];
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

<!-- URSSAF (Emploi privé) -->
<div class="card" style="flex:1;min-width:420px;padding:8px;">
<h4 style="margin:0 0 8px 0;">URSSAF — Emploi privé (2019-2024)</h4>

```js
// Données URSSAF selon niveau
const isA5Upivot = groupingLevel === "A5";
const pivotCodesUpivot = [...mapSelectionState];
const hasSelectionUpivot = pivotCodesUpivot.length > 0;
const urssafDataUpivot = isA5Upivot ? urssafA5 : urssafA21;
const urssafFrDataPivot = urssafFr;

// France référence
const frSectorsUpivot = urssafFrDataPivot.toArray().map(d => ({
  a5: d.a5, a21: d.a21, lib: d.lib, ord: d.ord_a21 || d.ord_a5,
  fr_pct: d.pct_24, fr_evol_1924: d.evol_1924, fr_evol_2224: d.evol_2224
}));

// Construire tableau pivot
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

// Rendu tableau URSSAF
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
    ${urssafHeadersPivot.map((h, i) => `<th style="text-align:${i === 0 ? 'left' : 'right'};padding:4px 6px;${i > 3 && i % 2 === 0 ? 'border-left:1px solid #e2e8f0;' : ''}" title="${i === 2 ? 'Évolution 2019-2024' : i === 3 ? 'Évolution 2022-2024' : ''}">${h}</th>`).join('')}
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
  <strong>IS</strong> = Indice de Spécialisation (part ZE / part France). IS > 1 = surreprésentation (violet), IS < 1 = sous-représentation (vert).
</p>
<!-- &e PIVOTS_SECTEURS -->
