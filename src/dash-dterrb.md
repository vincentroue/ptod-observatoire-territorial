---
title: ObTer — Fiche Territoire IRIS
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     Volet dterrb — Dashboard territorial IRIS (MapLibre)
     Date: 2026-02-22 | v0.2 Sprint 1
     Layout: Sidebar contrôles + 2 cartes MapLibre synchronisées + tableau
     Data: agg_iris_XX.parquet (par département) + topojson IRIS filtré
     ============================================================ -->

<!-- &s BANNER -->
```js
import { createBanner, createNav, OTTD_PAGES } from "./helpers/layout.js";
const _voletCfg = OTTD_PAGES.find(p => p.id === 'dterrb');
display(createBanner({
  voletTitle: "Fiche Territoire IRIS — Zoom progressif MapLibre",
  voletTooltip: "Dashboard territorial à l'IRIS : zoom progressif DEP→EPCI→Commune→IRIS avec MapLibre GL JS. Indicateurs croisés démographie, emploi, logement, revenus.",
  color: _voletCfg?.color || "#7c3aed",
  navElement: createNav(OTTD_PAGES, 'dterrb')
}));
```
<!-- &e BANNER -->

<!-- &s IMPORTS -->
```js
import * as topojson from "npm:topojson-client";
import * as d3 from "npm:d3";

import { INDICATEURS, THEMES, PERIODES, formatValue as fmtVal, parseColKey } from "./helpers/indicators-ddict-js.js";
import { PAL_SEQ7_BYRV, PAL_PURPLE_GREEN, createColorFunction } from "./helpers/colors.js";
import {
  createOTTDMap, buildChoroplethSource, addChoroplethLayers,
  attachTooltip, attachHighlight,
  createResetControl, createMapLegend, addLabelsLayer,
  createMapWrapper, computeBounds
} from "./helpers/maplibre.js";
import { initDuckDB, registerParquet } from "./helpers/duckdb.js";
```
<!-- &e IMPORTS -->

<!-- &s FILE_HANDLES - Parquets par département (POC 4 dép test) -->
```js
const IRIS_TOPO = FileAttachment("data/dterr/iris_dep_test.topojson");
const DEP_PQ = {
  "22": FileAttachment("data/dterr/agg_iris_22.parquet"),
  "29": FileAttachment("data/dterr/agg_iris_29.parquet"),
  "33": FileAttachment("data/dterr/agg_iris_33.parquet"),
  "64": FileAttachment("data/dterr/agg_iris_64.parquet")
};
```
<!-- &e FILE_HANDLES -->

<!-- &s DATA_LOAD - Topo + DuckDB init -->
```js
// Charger topojson IRIS (4 départements test : 22, 29, 33, 64)
const irisTopo = await IRIS_TOPO.json();
const irisObjKey = Object.keys(irisTopo.objects)[0];
const allIrisFeatures = topojson.feature(irisTopo, irisTopo.objects[irisObjKey]).features;

// DuckDB init (une seule fois)
const { db: duckDb, conn } = await initDuckDB();
```
<!-- &e DATA_LOAD -->

<!-- &s INDICATORS_LIST - Construire liste indicateurs depuis colonnes parquet -->
```js
// Charger le parquet du 1er département pour découvrir les colonnes
const initPqUrl = await DEP_PQ["29"].url();
await duckDb.registerFileURL("init_iris.parquet", initPqUrl, 4, false);
const colsResult = await conn.query("SELECT column_name FROM (DESCRIBE SELECT * FROM 'init_iris.parquet')");
const allCols = colsResult.toArray().map(r => r.column_name);

// Filtrer colonnes indicateurs
const indicCols = allCols.filter(c => {
  const parts = c.split("_");
  if (parts.length < 2) return false;
  const prefix = parts[0];
  return ["dm", "dmv", "soc", "eco", "dsp", "men", "log", "rev"].includes(prefix);
});

// Labels lisibles depuis INDICATEURS ddict
function makeIndicOptions(cols) {
  const options = [];
  for (const col of cols) {
    const parsed = parseColKey(col);
    if (!parsed) continue;
    const meta = INDICATEURS[parsed.indic];
    const label = meta ? `${meta.label} (${col})` : col;
    const theme = meta?.theme || "autre";
    options.push({ col, label, theme });
  }
  options.sort((a, b) => a.theme.localeCompare(b.theme) || a.label.localeCompare(b.label));
  return options;
}

const indicOptions = makeIndicOptions(indicCols);
const indic1Options = indicOptions.map(o => o.col);
const indic1Labels = new Map(indicOptions.map(o => [o.col, o.label]));
```
<!-- &e INDICATORS_LIST -->

<!-- &s SIDEBAR - Contrôles utilisateur -->

<div class="grid grid-cols-4" style="gap: 16px;">
<div class="card" style="grid-column: 1; padding: 12px;">

**Département**
```js
const depChoices = ["22", "29", "33", "64"];
const selectedDep = view(Inputs.select(depChoices, {
  label: "Département",
  format: d => ({
    "22": "22 — Côtes-d'Armor",
    "29": "29 — Finistère",
    "33": "33 — Gironde",
    "64": "64 — Pyrénées-Atlantiques"
  })[d] || d,
  value: "29"
}));
```

**Indicateur carte 1**
```js
const selectedIndic1 = view(Inputs.select(indic1Options, {
  label: "Indicateur 1",
  format: c => indic1Labels.get(c) || c,
  value: indicCols.includes("dm_pop_vtcam_1622") ? "dm_pop_vtcam_1622" : indicCols[0]
}));
```

**Indicateur carte 2**
```js
const selectedIndic2 = view(Inputs.select(indic1Options, {
  label: "Indicateur 2",
  format: c => indic1Labels.get(c) || c,
  value: indicCols.includes("rev_med_21") ? "rev_med_21" : (indicCols[1] || indicCols[0])
}));
```

</div>

<!-- &s MAP_PANEL - Cartes MapLibre côte à côte -->
<div class="card" style="grid-column: 2 / 5; padding: 12px;">

```js
// Charger données du département sélectionné
const depPqFile = DEP_PQ[selectedDep];
const depPqUrl = await depPqFile.url();
const depTableName = `iris_${selectedDep}`;
await duckDb.registerFileURL(`${depTableName}.parquet`, depPqUrl, 4, false);

const irisDataRaw = await conn.query(`SELECT * FROM '${depTableName}.parquet'`);
const irisData = irisDataRaw.toArray().map(r => {
  const obj = {};
  for (const col of allCols) obj[col] = r[col];
  return obj;
});

// Filtrer features topo par département
const depIrisFeatures = allIrisFeatures.filter(f => {
  const code = f.properties.code_iris || f.properties.CODE_IRIS || "";
  return code.startsWith(selectedDep);
});

// Map code IRIS → données
const irisDataMap = new Map(irisData.map(d => [String(d.code), d]));
```

```js
// Bornes et palette
function computeIrisBins(data, colKey) {
  const vals = data.map(d => d[colKey]).filter(v => v != null && !isNaN(v));
  if (vals.length === 0) return { thresholds: [0], palette: ["#ccc", "#ccc"] };
  vals.sort((a, b) => a - b);
  const q = (p) => vals[Math.min(Math.floor(p * vals.length), vals.length - 1)];
  return {
    thresholds: [q(0.05), q(0.20), q(0.40), q(0.60), q(0.80), q(0.95)],
    palette: PAL_SEQ7_BYRV
  };
}

const bins1 = computeIrisBins(irisData, selectedIndic1);
const bins2 = computeIrisBins(irisData, selectedIndic2);

function makeGetColor(bins) {
  const { thresholds: t, palette: p } = bins;
  return (v) => {
    if (v == null || isNaN(v)) return "#f0f0f0";
    if (v < t[0]) return p[0];
    for (let i = 0; i < t.length - 1; i++) {
      if (v < t[i + 1]) return p[i + 1];
    }
    return p[p.length - 1];
  };
}

const getColor1 = makeGetColor(bins1);
const getColor2 = makeGetColor(bins2);
const { bounds: depBounds } = computeBounds(depIrisFeatures);
```

<!-- &s KPI_BAR - Statistiques département -->
```js
const depStats = {
  nb_iris: irisData.length,
  pop_tot: d3.sum(irisData, d => d.P22_POP || 0),
  rev_med: d3.median(irisData.filter(d => d.rev_med_21 != null), d => d.rev_med_21),
  tx_chom: d3.mean(irisData.filter(d => d.soc_txchom_1564_22 != null), d => d.soc_txchom_1564_22)
};

display(html`<div style="display:flex; gap:24px; padding:8px 4px; font-size:12px; color:#374151; flex-wrap:wrap; border-bottom:1px solid #e5e7eb; margin-bottom:12px;">
  <div><b style="color:#7c3aed;">Dép. ${selectedDep}</b></div>
  <div><b>${depStats.nb_iris.toLocaleString("fr-FR")}</b> IRIS</div>
  <div>Pop. <b>${Math.round(depStats.pop_tot).toLocaleString("fr-FR")}</b> hab.</div>
  <div>Rev. médian <b>${depStats.rev_med != null ? Math.round(depStats.rev_med).toLocaleString("fr-FR") + " \u20ac" : "n.d."}</b></div>
  <div>Tx chômage <b>${depStats.tx_chom != null ? depStats.tx_chom.toFixed(1) + " %" : "n.d."}</b></div>
</div>`);
```
<!-- &e KPI_BAR -->

<div class="grid grid-cols-2" style="gap: 12px;">

```js
// CARTE 1
const { outer: outer1, wrapper: wrapper1, mapContainer: mc1 } = createMapWrapper({
  height: 480,
  title: indic1Labels.get(selectedIndic1) || selectedIndic1
});

const geo1 = buildChoroplethSource(depIrisFeatures, irisDataMap, selectedIndic1, getColor1, {
  codeProperty: "code_iris",
  extraProps: ["nom_iris", "nom_commune", "code_insee"],
  defaultFill: "#f0f0f0"
});

const { map: map1, Popup: Popup1 } = await createOTTDMap(mc1, {
  bounds: depBounds,
  fitBoundsOptions: { padding: 20 },
  maxZoom: 15
});

map1.on("load", () => {
  const layers1 = addChoroplethLayers(map1, "iris1", geo1, {
    prefix: "iris1",
    codeProperty: "code_iris",
    lineColor: "#9ca3af",
    lineWidth: 0.5,
    fillOpacity: 0.7
  });

  addLabelsLayer(map1, "iris1", {
    prefix: "iris1",
    labelProperty: "_label",
    minZoom: 11,
    fontSize: 10
  });

  attachTooltip(map1, layers1.fillLayerId, (props) => {
    const label = props._label || props.code_iris || "?";
    const commune = props._nom_commune || props.nom_commune || "";
    const val = props._val;
    const valFmt = val != null ? fmtVal(val, selectedIndic1) : "n.d.";
    return `<div style="font-size:12px;color:#fff;">
      <b>${label}</b><br>
      <span style="color:#cbd5e1;">${commune}</span><br>
      <span style="color:#93c5fd;">${valFmt}</span>
    </div>`;
  }, { Popup: Popup1 });

  attachHighlight(map1, layers1.fillLayerId, layers1.hoverLayerId, { codeProperty: "code_iris" });

  wrapper1.appendChild(createResetControl(map1, depBounds, { label: "\u27f2 Recentrer" }));

  const legendLabels = bins1.thresholds.map((t, i) => {
    const next = bins1.thresholds[i + 1];
    return next != null ? `${fmtVal(t, selectedIndic1)} \u2013 ${fmtVal(next, selectedIndic1)}` : `> ${fmtVal(t, selectedIndic1)}`;
  });
  legendLabels.unshift(`< ${fmtVal(bins1.thresholds[0], selectedIndic1)}`);
  wrapper1.appendChild(createMapLegend(bins1.palette, legendLabels, {
    direction: "vertical", position: "bottom-left", swatchSize: 12
  }));
});

display(outer1);
```

```js
// CARTE 2
const { outer: outer2, wrapper: wrapper2, mapContainer: mc2 } = createMapWrapper({
  height: 480,
  title: indic1Labels.get(selectedIndic2) || selectedIndic2
});

const geo2 = buildChoroplethSource(depIrisFeatures, irisDataMap, selectedIndic2, getColor2, {
  codeProperty: "code_iris",
  extraProps: ["nom_iris", "nom_commune", "code_insee"],
  defaultFill: "#f0f0f0"
});

const { map: map2, Popup: Popup2 } = await createOTTDMap(mc2, {
  bounds: depBounds,
  fitBoundsOptions: { padding: 20 },
  maxZoom: 15
});

map2.on("load", () => {
  const layers2 = addChoroplethLayers(map2, "iris2", geo2, {
    prefix: "iris2",
    codeProperty: "code_iris",
    lineColor: "#9ca3af",
    lineWidth: 0.5,
    fillOpacity: 0.7
  });

  addLabelsLayer(map2, "iris2", {
    prefix: "iris2",
    labelProperty: "_label",
    minZoom: 11,
    fontSize: 10
  });

  attachTooltip(map2, layers2.fillLayerId, (props) => {
    const label = props._label || props.code_iris || "?";
    const commune = props._nom_commune || props.nom_commune || "";
    const val = props._val;
    const valFmt = val != null ? fmtVal(val, selectedIndic2) : "n.d.";
    return `<div style="font-size:12px;color:#fff;">
      <b>${label}</b><br>
      <span style="color:#cbd5e1;">${commune}</span><br>
      <span style="color:#93c5fd;">${valFmt}</span>
    </div>`;
  }, { Popup: Popup2 });

  attachHighlight(map2, layers2.fillLayerId, layers2.hoverLayerId, { codeProperty: "code_iris" });

  wrapper2.appendChild(createResetControl(map2, depBounds, { label: "\u27f2 Recentrer" }));

  const legendLabels2 = bins2.thresholds.map((t, i) => {
    const next = bins2.thresholds[i + 1];
    return next != null ? `${fmtVal(t, selectedIndic2)} \u2013 ${fmtVal(next, selectedIndic2)}` : `> ${fmtVal(t, selectedIndic2)}`;
  });
  legendLabels2.unshift(`< ${fmtVal(bins2.thresholds[0], selectedIndic2)}`);
  wrapper2.appendChild(createMapLegend(bins2.palette, legendLabels2, {
    direction: "vertical", position: "bottom-left", swatchSize: 12
  }));
});

// Synchroniser les 2 cartes
map1.on("move", () => {
  if (map1._syncing) return;
  map2._syncing = true;
  map2.setCenter(map1.getCenter());
  map2.setZoom(map1.getZoom());
  map2._syncing = false;
});
map2.on("move", () => {
  if (map2._syncing) return;
  map1._syncing = true;
  map1.setCenter(map2.getCenter());
  map1.setZoom(map2.getZoom());
  map1._syncing = false;
});

display(outer2);
```

</div>

</div>
<!-- &e MAP_PANEL -->

</div>
<!-- &e SIDEBAR -->

<!-- &s TABLE_IRIS - Tableau données IRIS top/bottom -->
<div class="card" style="padding: 12px; margin-top: 16px;">

**Top 15 / Bottom 15 IRIS — ${indic1Labels.get(selectedIndic1) || selectedIndic1}**

```js
const sorted = irisData
  .filter(d => d[selectedIndic1] != null && !isNaN(d[selectedIndic1]))
  .sort((a, b) => b[selectedIndic1] - a[selectedIndic1]);

const top15 = sorted.slice(0, 15);
const bot15 = sorted.slice(-15).reverse();
const displayRows = [...top15, ...bot15];

const tableData = displayRows.map((d, i) => ({
  rang: i < 15 ? i + 1 : sorted.length - (14 - (i - 15)),
  code: d.code,
  label: d.libelle || d.code || "",
  commune: d.COM || "",
  pop: d.P22_POP || 0,
  val1: d[selectedIndic1],
  val2: d[selectedIndic2]
}));

display(Inputs.table(tableData, {
  columns: ["rang", "code", "label", "commune", "pop", "val1", "val2"],
  header: {
    rang: "#",
    code: "IRIS",
    label: "Nom IRIS",
    commune: "Commune",
    pop: "Pop. 2022",
    val1: indic1Labels.get(selectedIndic1)?.split(" (")[0] || "Indic. 1",
    val2: indic1Labels.get(selectedIndic2)?.split(" (")[0] || "Indic. 2"
  },
  format: {
    pop: d => d != null ? Math.round(d).toLocaleString("fr-FR") : "",
    val1: d => d != null ? fmtVal(d, selectedIndic1) : "n.d.",
    val2: d => d != null ? fmtVal(d, selectedIndic2) : "n.d."
  },
  width: { rang: 40, code: 100, label: 200, commune: 160, pop: 80, val1: 100, val2: 100 },
  rows: 30,
  maxWidth: 1200
}));
```

</div>
<!-- &e TABLE_IRIS -->
