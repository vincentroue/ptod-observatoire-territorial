---
title: ObTer — Fiche Territoire
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     Volet Fiche Territoire — Portrait commune avec comparaisons multi-échelon
     Date: 2026-02-16 | v0.1
     Layout: Sidebar (région/EPCI/commune) | Fiche header + cartes + tableau transposé
     Data: fiche_communes.parquet via DuckDB + agg_epci/dep/reg.json
     ============================================================ -->

<!-- &s BANNER -->
```js
import { createBanner, createNav, OTTD_PAGES } from "./helpers/layout.js";
const _voletCfg = OTTD_PAGES.find(p => p.id === 'dterr');
display(createBanner({
  voletTitle: "Fiche Territoire : portrait commune multi-échelon",
  voletTooltip: "Portrait synthétique d'une commune avec comparaisons EPCI, département, région et France. Tableau transposé par thème, carte des communes dans l'EPCI, série emploi URSSAF.",
  color: _voletCfg?.color || "#0f766e",
  navElement: createNav(OTTD_PAGES, 'dterr')
}));
```
<!-- &e BANNER -->

<!-- &s IMPORTS -->
```js
import * as topojson from "npm:topojson-client";
import rewind from "npm:@mapbox/geojson-rewind";
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

import { INDICATEURS, THEMES, PERIODES, formatValue as fmtVal, parseColKey } from "./helpers/indicators-ddict-js.js";
import { buildColKey, getDefaultPeriode } from "./helpers/selectindic.js";
import { createColorFunction } from "./helpers/colors.js";
import { renderChoropleth } from "./helpers/maps.js";
import { FICHE_INDICS } from "./helpers/constants.js";
import { buildTerritoryTooltip } from "./helpers/tooltip.js";
import { createSearchBox } from "./helpers/search.js";
import {
  initDuckDB, initDuckDBBackground, registerParquet, queryCommunes
} from "./helpers/duckdb.js";
import {
  createOTTDMap, buildChoroplethSource, addChoroplethLayers,
  attachTooltip, createTooltipBridge, attachHighlight, attachClick,
  createResetControl, createMapLegend, addLabelsLayer,
  createMapWrapper, computeBounds
} from "./helpers/maplibre-helpers.js";

initDuckDBBackground();
```
<!-- &e IMPORTS -->

<!-- &s FILE_HANDLES -->
```js
const FICHE_PARQUET = FileAttachment("data/fiche_communes.parquet");
const EPCI_DATA = FileAttachment("data/agg_epci.json");
const DEP_DATA = FileAttachment("data/agg_dep.json");
const REG_DATA = FileAttachment("data/agg_reg.json");
const COMMUNES_TOPO = FileAttachment("data/nodom_commune-ARM_MINI_2025.topojson");
const URSSAF_SERIE_PQ = FileAttachment("data/urssaf_serie_indice100.parquet");
const DVF_SERIE_COMM = FileAttachment("data/logement/series_logement_communes.parquet");
const DVF_SERIE_DEP = FileAttachment("data/logement/series_logement_dep.parquet");
```
<!-- &e FILE_HANDLES -->

<!-- &s INIT -->
```js
// Chargement données de référence
const [epciAll, depAll, regAll, communesTopo] = await Promise.all([
  EPCI_DATA.json(),
  DEP_DATA.json(),
  REG_DATA.json(),
  COMMUNES_TOPO.json()
]);

// DuckDB init + register parquets (dont URSSAF série — 1.2 MB parquet au lieu de 34 MB JSON)
const { db: duckDb, conn } = await initDuckDB();
await Promise.all([
  registerParquet(duckDb, "fiche_communes", await FICHE_PARQUET.url()),
  registerParquet(duckDb, "dvf_communes", await DVF_SERIE_COMM.url()),
  registerParquet(duckDb, "dvf_dep", await DVF_SERIE_DEP.url()),
  registerParquet(duckDb, "urssaf_serie", await URSSAF_SERIE_PQ.url())
]);

// France row from DuckDB
const franceRows = await queryCommunes({ conn }, {
  tableName: "fiche_communes",
  filter: { code: ["00FR"] },
  columns: ["*"]
});
const france = franceRows[0] || null;

// Build region lookup (code + libelle)
const REGIONS = {};
for (const r of regAll) {
  REGIONS[String(r.code)] = r;
}
const regionOptions = regAll
  .filter(r => r.code && String(r.code) !== "00FR" && r.libelle)
  .sort((a, b) => (a.libelle || "").localeCompare(b.libelle || ""))
  .map(r => ({ code: String(r.code), label: r.libelle }));

// Build DEP lookup + extract REG from regdep ("BRE/22-CdA" → regPrefix="BRE", dep="22")
const DEP_MAP = {};
const DEP_TO_REGCODE = {};  // dep code → reg code
const REGPREFIX_TO_CODE = {}; // "BRE" → "53" etc.
for (const d of depAll) {
  const depCode = String(d.code).padStart(2, "0");
  DEP_MAP[depCode] = d;
  // Parse regdep to find reg prefix
  const regdep = d.regdep || "";
  if (regdep.includes("/")) {
    const regPrefix = regdep.split("/")[0]; // "BRE"
    d._regPrefix = regPrefix;
  }
}
// Build regPrefix→regCode mapping using TDC
// For now, build from DEP positions: regCode from fiche_communes
// Use a simpler approach: group DEPs by regPrefix, then match to regAll by counting communes
for (const d of depAll) {
  if (!d._regPrefix) continue;
  REGPREFIX_TO_CODE[d._regPrefix] = REGPREFIX_TO_CODE[d._regPrefix] || [];
  REGPREFIX_TO_CODE[d._regPrefix].push(String(d.code).padStart(2, "0"));
}

// Build EPCI lookup
const EPCI_MAP = {};
for (const e of epciAll) {
  EPCI_MAP[String(e.code)] = e;
  // Extract dep from regdep
  const regdep = e.regdep || "";
  if (regdep.includes("/")) {
    e._regPrefix = regdep.split("/")[0];
    e._depCode = regdep.split("/")[1]?.split("-")[0] || "";
  }
}

// TopoJSON features communes — rewind pour MapLibre (RFC 7946 right-hand rule)
const communesGeoAll = rewind(topojson.feature(communesTopo, communesTopo.objects.data), true);
```
<!-- &e INIT -->

<!-- &s STATE -->
```js
// Pattern Inputs.input : DOM element = même objet dans TOUTES les cellules
// Pas de problème Mutable (wrapper vs value) — .value accessible partout
const _communeInput = Inputs.input(new Set());

function _toggleCommune(code) {
  const cur = _communeInput.value;
  const s = cur instanceof Set ? new Set(cur) : new Set();
  if (s.has(code)) { s.delete(code); }
  else {
    if (s.size >= 2) { const first = [...s][0]; s.delete(first); }
    s.add(code);
  }
  _communeInput.value = s;
  _communeInput.dispatchEvent(new Event("input"));
}
function _initCommune(code) {
  const cur = _communeInput.value;
  if (!cur || (cur instanceof Set && cur.size === 0)) {
    _communeInput.value = new Set([code]);
    _communeInput.dispatchEvent(new Event("input"));
  }
}
function _clearCommunes() {
  _communeInput.value = new Set();
  _communeInput.dispatchEvent(new Event("input"));
}
```

```js
// Valeur réactive — se met à jour quand _communeInput change
const selectedCommuneState = view(_communeInput);
```
<!-- &e STATE -->

<!-- &s SIDEBAR -->
<aside class="sidebar">

<section class="panel">
<div class="panel-title">RÉGION</div>

```js
const _regInput = Inputs.select(
  new Map(regionOptions.map(r => [r.label, r.code])),
  { value: "53", label: "" }
);
const selectedReg = view(_regInput);
```

</section>

<section class="panel">
<div class="panel-title">EPCI</div>

```js
// EPCI list filtered by region
const depsInRegResult = await conn.query(
  `SELECT DISTINCT CAST("DEP" AS VARCHAR) as dep FROM 'fiche_communes.parquet' WHERE CAST("REG" AS VARCHAR) = '${selectedReg}'`
);
const regDepSet = new Set(depsInRegResult.toArray().map(r => String(r.dep).padStart(2, "0")));

const epciFiltered = epciAll
  .filter(e => {
    if (!e._depCode) return false;
    return regDepSet.has(e._depCode.padStart(2, "0"));
  })
  .sort((a, b) => (b.P23_POP || b.P22_POP || 0) - (a.P23_POP || a.P22_POP || 0));

const epciOptions = epciFiltered.map(e => ({
  code: String(e.code),
  label: `${e.libelle || e.code} (${Math.round((e.P23_POP || e.P22_POP || 0)/1000)}k)`
}));
```

```js
const epciSearchText = view(Inputs.text({ placeholder: "Rechercher EPCI...", width: "100%" }));
```

```js
const _filteredEpcis = epciSearchText && epciSearchText.length >= 2
  ? epciOptions.filter(e => e.label.toLowerCase().includes(epciSearchText.toLowerCase()))
  : epciOptions;

const _epciInput = Inputs.select(
  new Map(_filteredEpcis.map(e => [e.label, e.code])),
  { value: _filteredEpcis[0]?.code || null, label: "" }
);
const selectedEpci = view(_epciInput);
```

</section>

<section class="panel">
<div class="panel-title">COMMUNES <span style="font-weight:400; color:#888;">(max 2)</span></div>

```js
// Query communes in selected EPCI via DuckDB
const communesInEpci = selectedEpci ? await queryCommunes({ conn }, {
  tableName: "fiche_communes",
  filter: { EPCI: [selectedEpci] },
  columns: ["code", "libelle", "P23_POP", "P22_POP", "DEP", "REG"],
  orderBy: "P23_POP",
  orderDir: "DESC"
}) : [];

const communeOptions = communesInEpci.map(c => ({
  code: String(c.code),
  label: `${c.libelle || c.code} (${(c.P23_POP || c.P22_POP || 0).toLocaleString("fr-FR")} hab.)`
}));
```

```js
// SearchBox multi-commune (max 2) avec chips
// selectedCommuneState = valeur du Mutable (null ou Set) dans cette cellule
// Les helpers _initCommune/_toggleCommune/_clearCommunes ont accès au wrapper Mutable (closure)
if (communeOptions.length > 0) {
  _initCommune(communeOptions[0].code);
}

const _commSearchData = communeOptions.map(c => ({
  code: c.code, label: c.label, pop: 0
}));

// Passer un Set valide (jamais null) à createSearchBox
const _safeSelection = selectedCommuneState instanceof Set ? selectedCommuneState : new Set();

const _commSearchBox = createSearchBox({
  data: _commSearchData,
  selection: _safeSelection,
  onToggle: (code) => _toggleCommune(code),
  onClear: () => _clearCommunes(),
  placeholder: "Rechercher commune...",
  maxResults: 8,
  maxChips: 2,
  maxWidth: 240,
  showClearAll: true,
  showCount: false
});
display(_commSearchBox);
```

```js
// Dériver commune 1 et commune 2 depuis le Set
const _commSet = selectedCommuneState instanceof Set
  ? selectedCommuneState
  : (selectedCommuneState ? new Set([selectedCommuneState]) : new Set());
const _commArr = [..._commSet];
const selectedCommune = _commArr[0] || communeOptions[0]?.code || null;
const selectedCommune2 = _commArr.length > 1 ? _commArr[1] : "__none__";
```

</section>

<section class="panel">
<div class="panel-title">INDICATEUR CARTE 1</div>

```js
// Indicateur pour colorer la carte
const mapIndicOptions = [];
for (const [theme, indics] of Object.entries(FICHE_INDICS)) {
  for (const ind of indics) {
    const meta = INDICATEURS[ind] || INDICATEURS[ind + "_1622"] || INDICATEURS[ind + "_22"];
    const label = meta?.medium || meta?.short || ind;
    mapIndicOptions.push({ value: ind, label: `${THEMES[theme]?.label || theme} · ${label}` });
  }
}
const _mapIndicInput = Inputs.select(
  new Map(mapIndicOptions.map(o => [o.label, o.value])),
  { value: "dm_pop_vtcam", label: "" }
);
const selectedMapIndic = view(_mapIndicInput);
```

</section>

<section class="panel">
<div class="panel-title">INDICATEUR CARTE 2</div>

```js
const _mapIndic2Input = Inputs.select(
  new Map(mapIndicOptions.map(o => [o.label, o.value])),
  { value: "eco_emp_vtcam", label: "" }
);
const selectedMapIndic2 = view(_mapIndic2Input);
```

</section>

</aside>
<!-- &e SIDEBAR -->

<!-- &s LAYOUT_MAIN -->
<div class="layout-main">

<!-- &s FICHE_HEADER -->
```js
// Load full commune data
const communeData = selectedCommune ? (await queryCommunes({ conn }, {
  tableName: "fiche_communes",
  filter: { code: [selectedCommune] },
  columns: ["*"]
}))[0] : null;

// Reference data
const epciData = selectedEpci ? EPCI_MAP[selectedEpci] : null;
const depCode = communeData ? String(communeData.DEP || "").padStart(2, "0") : null;
const depData = depCode ? DEP_MAP[depCode] : null;
const regCode = selectedReg;
const regData = REGIONS[regCode] || null;

// Header display
const pop = communeData?.P23_POP || communeData?.P22_POP || 0;
const commLabel = communeData?.libelle || selectedCommune || "—";
const epciLabel = epciData?.libelle || selectedEpci || "—";
const depLabel = depData?.libelle || depCode || "—";
const regLabel = regData?.libelle || regCode || "—";

// Commune 2 comparée (optionnelle)
const commune2Data = (selectedCommune2 && selectedCommune2 !== "__none__") ? (await queryCommunes({ conn }, {
  tableName: "fiche_communes",
  filter: { code: [selectedCommune2] },
  columns: ["*"]
}))[0] : null;
const comm2Label = commune2Data?.libelle || "";
```

<div class="fiche-header" style="background:#f8fafb; border:1px solid #e0e5ea; border-radius:8px; padding:12px 16px; margin-bottom:10px;">
  <div style="display:flex; align-items:baseline; gap:12px; flex-wrap:wrap;">
    <h2 style="margin:0; color:#1a5276; font-size:20px; line-height:1.2;">${commLabel}</h2>
    <span style="color:#555; font-size:13px; font-weight:500;">${pop.toLocaleString("fr-FR")} hab.</span>
    <span style="color:#888; font-size:12px;">en ${regLabel} (${depCode})</span>
  </div>
</div>
<!-- &e FICHE_HEADER -->

<!-- &s KPI_CARDS -->
```js
function buildKpiCards(comm, epci, fr) {
  if (!comm) return document.createElement("div");

  const fmtN = (v, d=0) => v != null && !isNaN(v) ? Number(v).toLocaleString("fr-FR", {minimumFractionDigits: d, maximumFractionDigits: d}) : "—";
  const fmtSign = (v, d=1) => {
    if (v == null || isNaN(v)) return "—";
    return (v > 0 ? "+" : "") + Number(v).toLocaleString("fr-FR", {minimumFractionDigits: d, maximumFractionDigits: d});
  };
  const evolArrow = (v) => {
    if (v == null || isNaN(v)) return "";
    const color = v > 0 ? "#27ae60" : v < 0 ? "#e74c3c" : "#888";
    const arrow = v > 0 ? "▲" : v < 0 ? "▼" : "—";
    return `<span style="color:${color}; font-weight:600;">${arrow}</span>`;
  };
  const vsLine = (label, commVal, refVal, unit, polarity=1) => {
    if (commVal == null || refVal == null || isNaN(commVal) || isNaN(refVal)) return `<span class="kpi-vs-label">${label}</span> <span class="kpi-vs-val">—</span>`;
    const diff = commVal - refVal;
    const good = polarity === 1 ? diff >= 0 : diff <= 0;
    const color = good ? "#27ae60" : "#e74c3c";
    const txt = unit === "€" ? `${diff > 0 ? "+" : ""}${Math.round(diff).toLocaleString("fr-FR")}` :
                unit === "pts" ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)}` :
                `${diff > 0 ? "+" : ""}${diff.toFixed(2)}`;
    return `<span class="kpi-vs-label">${label}</span> <span style="color:${color}; font-weight:600;">${txt}${unit ? " " + unit : ""}</span>`;
  };

  // Données
  const pop = comm.P23_POP || comm.P22_POP || 0;
  const popTcam = comm.dm_pop_vtcam_1623 ?? comm.dm_pop_vtcam_1622;
  const sma = comm.dmf_sma_vol_22 ?? comm.dmf_sma_vol;
  const px = comm.logd_px2q2_glo_24 ?? comm.logd_px2q2_mai_24;
  const logVac = comm.log_vac_pct_22;
  const txEmp = comm.eco_txemp_1564_22;
  const revMed = comm.rev_med_21;

  const tiles = [
    {
      theme: "demog", name: "Population",
      value: fmtN(pop), unit: "hab.",
      evol: popTcam != null ? `${evolArrow(popTcam)} ${fmtSign(popTcam, 2)}%/an` : "",
      vsEpci: vsLine("EPCI", popTcam, epci?.dm_pop_vtcam_1623 ?? epci?.dm_pop_vtcam_1622, "pts"),
      vsFr: vsLine("France", popTcam, fr?.dm_pop_vtcam_1623 ?? fr?.dm_pop_vtcam_1622, "pts")
    },
    {
      theme: "demog", name: "Solde migratoire",
      value: sma != null ? fmtSign(sma, 0) : "—", unit: "hab./an",
      evol: "",
      vsEpci: "", vsFr: ""
    },
    {
      theme: "immo", name: "Prix m² médian",
      value: px != null ? fmtN(px) : "—", unit: "€/m²",
      evol: "",
      vsEpci: vsLine("EPCI", px, epci?.logd_px2q2_glo_24 ?? epci?.logd_px2q2_mai_24, "€"),
      vsFr: vsLine("France", px, fr?.logd_px2q2_glo_24 ?? fr?.logd_px2q2_mai_24, "€", 0)
    },
    {
      theme: "log", name: "Vacance",
      value: logVac != null ? fmtN(logVac, 1) : "—", unit: "%",
      evol: "",
      vsEpci: vsLine("EPCI", logVac, epci?.log_vac_pct_22, "pts", -1),
      vsFr: vsLine("France", logVac, fr?.log_vac_pct_22, "pts", -1)
    },
    {
      theme: "emp", name: "Taux emploi 15-64",
      value: txEmp != null ? fmtN(txEmp, 1) : "—", unit: "%",
      evol: "",
      vsEpci: vsLine("EPCI", txEmp, epci?.eco_txemp_1564_22, "pts"),
      vsFr: vsLine("France", txEmp, fr?.eco_txemp_1564_22, "pts")
    },
    {
      theme: "rev", name: "Revenu médian",
      value: revMed != null ? fmtN(revMed) : "—", unit: "€/an",
      evol: "",
      vsEpci: vsLine("EPCI", revMed, epci?.rev_med_21, "€"),
      vsFr: vsLine("France", revMed, fr?.rev_med_21, "€")
    }
  ];

  const wrapper = document.createElement("div");
  wrapper.className = "kpi-grid";
  wrapper.innerHTML = tiles.map(t => `
    <div class="kpi-tile kpi-theme-${t.theme}">
      <div class="kpi-name">${t.name}</div>
      <div class="kpi-main">
        <span class="kpi-value">${t.value}<small>${t.unit}</small></span>
        ${t.evol ? `<span class="kpi-evol">${t.evol}</span>` : ""}
      </div>
      <div class="kpi-refs">
        ${t.vsEpci ? `<div class="kpi-ref">${t.vsEpci}</div>` : ""}
        ${t.vsFr ? `<div class="kpi-ref kpi-ref-fr">${t.vsFr}</div>` : ""}
      </div>
    </div>
  `).join("");
  return wrapper;
}
display(buildKpiCards(communeData, epciData, france));
```
<!-- &e KPI_CARDS -->

<!-- &s MAPS_DATA -->
```js
// &s EPCI_COMM_DATA - Données EPCI communes (re-run seulement quand selectedEpci change)
// Séparer de l'indicateur pour éviter re-création maps MapLibre
const epciCommFeatures = communesGeoAll.features.filter(f => {
  const fEpci = String(f.properties.EPCI_EPT || "");
  return fEpci === selectedEpci;
});
const epciGeo = { type: "FeatureCollection", features: epciCommFeatures };
const epciCommCodes = epciCommFeatures.map(f => f.properties.CODGEO);
const epciCommData = epciCommCodes.length > 0 ? await queryCommunes({ conn }, {
  tableName: "fiche_communes",
  filter: { code: epciCommCodes },
  columns: ["*"]
}) : [];
const commValueMap = new Map(epciCommData.map(d => [String(d.code), d]));
const commLabelMap = new Map(epciCommData.map(d => [String(d.code), d.libelle || d.code]));
// &e
```

```js
// &s MAP_INDIC_CONFIG - Config indicateur carte (re-run quand indicateur change, PAS ML_INIT)
const mapPeriode = getDefaultPeriode(selectedMapIndic);
const mapColKey = buildColKey(selectedMapIndic, mapPeriode);
const mapIndicMeta = INDICATEURS[mapColKey] || INDICATEURS[selectedMapIndic] || {};
const mapIndicLabel = mapIndicMeta.medium || mapIndicMeta.short || selectedMapIndic;
const colorResult = epciCommData.length > 2
  ? createColorFunction(epciCommData, mapColKey, "bins")
  : { getColor: () => "#ccc" };
const getColor = colorResult.getColor;
// &e
```
<!-- &e MAPS_DATA -->

<!-- &s CONTENT_GRID — Maps left | Table+Charts right -->
<div class="fiche-content-grid">

<!-- LEFT COLUMN: Maps -->
<div class="fiche-maps-col">

<!-- Carte D3 communes EPCI -->
<div class="fiche-card">
<div class="fiche-card-title">Communes de l'EPCI</div>

```js
// Geo features enrichies pour D3
const geoWithValues = {
  type: "FeatureCollection",
  features: epciCommFeatures.map(f => ({
    ...f,
    properties: {
      ...f.properties,
      [mapColKey]: commValueMap.get(f.properties.CODGEO)?.[mapColKey] ?? null
    }
  }))
};

// Render D3 map
const epciMap = renderChoropleth({
  geoData: geoWithValues,
  valueCol: mapColKey,
  getColor: (v) => getColor(v),
  getCode: f => f.properties.CODGEO,
  getLabel: ({ code }) => commLabelMap.get(code) || code,
  formatValue: (k, v) => fmtVal(mapColKey, v),
  indicLabel: mapIndicLabel,
  selectedCodes: selectedCommune ? [selectedCommune] : [],
  showLabels: true,
  labelMode: "names",
  topN: 30,
  labelBy: "population",
  echelon: "Commune",
  title: `${mapIndicLabel}`,
  width: 420,
  height: 380,
  maxLabelsAuto: 200
});

// Click handler: select commune on map click
if (epciMap) {
  const paths = epciMap.querySelectorAll("path[aria-label]");
  paths.forEach(path => {
    path.style.cursor = "pointer";
    path.addEventListener("click", (e) => {
      const code = path.getAttribute("aria-label");
      if (code && communeOptions.some(c => c.code === code)) {
        _toggleCommune(code);
      }
    });
  });
}

// Wrapper carte + légende
const d3MapWrapper = document.createElement("div");
d3MapWrapper.style.cssText = "position:relative;";
if (epciMap) {
  d3MapWrapper.appendChild(epciMap);
  // Légende D3 — même pattern que MapLibre
  if (colorResult.palette) {
    const pal = colorResult.palette, th = colorResult.bins?.thresholds || [];
    const lbls = colorResult.bins?.labels || pal.map((c, i) => {
      if (i === 0 && th.length) return `< ${th[0].toFixed(1)}`;
      if (i === pal.length - 1 && th.length) return `≥ ${th[th.length - 1].toFixed(1)}`;
      if (th[i-1] != null && th[i] != null) return `${th[i-1].toFixed(1)} – ${th[i].toFixed(1)}`;
      return "";
    });
    const { indic: _bi } = parseColKey(mapColKey);
    const _meta = INDICATEURS[_bi] || {};
    d3MapWrapper.appendChild(createMapLegend(pal, lbls, {
      title: _meta.unit || "", direction: "vertical", position: "bottom-left"
    }));
  }
} else {
  d3MapWrapper.innerHTML = `<div style="color:#999; padding:40px; text-align:center;">Aucune géométrie pour cet EPCI</div>`;
}
display(d3MapWrapper);
```

</div>
<!-- Slot fixe MapLibre — ML_INIT vide et remplit ce div -->
<div id="ml-maps-slot"></div>

</div>
<!-- /fiche-maps-col -->

<!-- RIGHT COLUMN: Table + Charts -->
<div class="fiche-content-col">

<!-- DVF Prix médian base 100 -->
<div class="fiche-card">
<div class="fiche-card-title" style="color:#0f766e;">Prix immobilier (indice 100 = 2014)</div>

```js
// DVF série prix médian — indice base 100 (pondéré transactions)
const _dvfLines = [];

function _dvfWeightedPx(row) {
  const pm = row.pxm2_mai != null ? +row.pxm2_mai : null;
  const pa = row.pxm2_apt != null ? +row.pxm2_apt : null;
  const nm = row.nbtrans_mai != null ? +row.nbtrans_mai : 0;
  const na = row.nbtrans_apt != null ? +row.nbtrans_apt : 0;
  if (pm != null && pa != null && (nm + na) > 0) return (pm * nm + pa * na) / (nm + na);
  if (pm != null && nm > 0) return pm;
  if (pa != null && na > 0) return pa;
  return pm ?? pa ?? null;
}

function _addDvfLine(rows, label, color, dash) {
  if (!rows || rows.length === 0) return;
  const base = rows.find(r => +r.annee === 2014);
  const baseVal = base ? _dvfWeightedPx(base) : null;
  if (!baseVal || baseVal <= 0) return;
  for (const r of rows) {
    const px = _dvfWeightedPx(r);
    if (px == null) continue;
    _dvfLines.push({ year: +r.annee, indice: (px / baseVal) * 100, label, color, dash: dash || false });
  }
}

// France (depuis DVF dep, code "00FR" ou agréger depuis les deps)
const _dvfFrRows = (await conn.query(
  `SELECT annee, SUM(pxm2_mai * nbtrans_mai) / NULLIF(SUM(nbtrans_mai), 0) as pxm2_mai,
          SUM(pxm2_apt * nbtrans_apt) / NULLIF(SUM(nbtrans_apt), 0) as pxm2_apt,
          SUM(nbtrans_mai) as nbtrans_mai, SUM(nbtrans_apt) as nbtrans_apt
   FROM 'dvf_dep.parquet' GROUP BY annee ORDER BY annee`
)).toArray();
_addDvfLine(_dvfFrRows, "France", "#9ca3af", true);

// Département
if (depCode) {
  const _dvfDepRows = (await conn.query(
    `SELECT annee, pxm2_mai, pxm2_apt, nbtrans_mai, nbtrans_apt FROM 'dvf_dep.parquet' WHERE CAST(code AS VARCHAR) = '${depCode}' ORDER BY annee`
  )).toArray();
  _addDvfLine(_dvfDepRows, depLabel, "#e67e22", false);
}

// Commune
const _dvfCommRows = (await conn.query(
  `SELECT annee, pxm2_mai, pxm2_apt, nbtrans_mai, nbtrans_apt FROM 'dvf_communes.parquet' WHERE CAST(code AS VARCHAR) = '${selectedCommune}' ORDER BY annee`
)).toArray();
_addDvfLine(_dvfCommRows, commLabel, "#0f766e", false);

if (_dvfLines.length > 0) {
  display(Plot.plot({
    width: 440,
    height: 340,
    marginLeft: 45,
    marginRight: 60,
    marginBottom: 30,
    marginTop: 10,
    y: { label: "↑ Indice 100 = 2014", grid: true },
    x: { label: null, tickFormat: "d" },
    color: { type: "identity" },
    marks: [
      Plot.ruleY([100], { stroke: "#e5e7eb", strokeDasharray: "4,3" }),
      Plot.line(_dvfLines.filter(d => !d.dash), {
        x: "year", y: "indice", stroke: "color", strokeWidth: 2, z: "label"
      }),
      Plot.line(_dvfLines.filter(d => d.dash), {
        x: "year", y: "indice", stroke: "color", strokeWidth: 1.5, strokeDasharray: "5,3", z: "label"
      }),
      Plot.text(
        _dvfLines.filter((d, i, arr) => d === arr.filter(a => a.label === d.label).pop()),
        { x: "year", y: "indice", text: "label", dx: 5, textAnchor: "start", fontSize: 10, fill: "color", fontWeight: 600 }
      ),
      Plot.text(
        _dvfLines.filter((d, i, arr) => d === arr.filter(a => a.label === d.label).pop()),
        { x: "year", y: "indice", text: d => d.indice.toFixed(1), dx: 5, dy: 12, textAnchor: "start", fontSize: 9, fill: "color" }
      ),
      Plot.ruleX(_dvfLines, Plot.pointerX({ x: "year", stroke: "#cbd5e1", strokeWidth: 0.5 })),
      Plot.dot(_dvfLines, Plot.pointerX({ x: "year", y: "indice", fill: "color", z: "label", r: 4 })),
      Plot.tip(_dvfLines, Plot.pointerX({
        x: "year", y: "indice", z: "label",
        title: d => `${d.label}\n${d.year} : ${d.indice.toFixed(1)}`
      }))
    ]
  }));
} else {
  display(html`<div style="color:#999; padding:20px; text-align:center; font-size:12px; font-style:italic;">
    Données DVF non disponibles pour cette commune.
  </div>`);
}
```

</div>

<!-- URSSAF Série indice 100 -->
<div class="fiche-card">
<div class="fiche-card-title" style="color:#2980b9;">Emploi privé URSSAF (indice 100 = 2014)</div>

```js
// URSSAF série via DuckDB — query ciblée (~44 rows au lieu de 407K)
const _urssafCodes = ["00FR"];
if (depCode) _urssafCodes.push(depCode);
if (selectedEpci) _urssafCodes.push(selectedEpci);
_urssafCodes.push(selectedCommune);

const _urssafData = await queryCommunes({ conn }, {
  tableName: "urssaf_serie",
  columns: ["*"],
  filter: { code: _urssafCodes }
});

const _urssafLookup = new Map();
for (const d of _urssafData) {
  const key = `${String(d.code || "")}_${String(d.echelon || "")}`;
  if (!_urssafLookup.has(key)) _urssafLookup.set(key, []);
  _urssafLookup.get(key).push(d);
}

const _urssafLines = [];
const _addUrssafLine = (code, echelon, label, color, dash) => {
  const serie = _urssafLookup.get(`${code}_${echelon}`);
  if (!serie || serie.length === 0) return;
  const base = serie.find(d => +d.year === 2014);
  const baseVal = base ? +base.eff_total : null;
  if (!baseVal || baseVal <= 0) return;
  for (const d of serie) {
    _urssafLines.push({
      year: +d.year,
      indice: (+d.eff_total / baseVal) * 100,
      label, color, dash: dash || false
    });
  }
};

// France (dashed)
_addUrssafLine("00FR", "france", "France", "#9ca3af", true);

// Département
if (depCode) _addUrssafLine(depCode, "dep", depLabel, "#e67e22", false);

// EPCI
if (selectedEpci) _addUrssafLine(selectedEpci, "epci", epciLabel.split(" (")[0], "#6366f1", false);

// Commune
_addUrssafLine(selectedCommune, "communes", commLabel, "#0f766e", false);

if (_urssafLines.length > 0) {
  display(Plot.plot({
    width: 440,
    height: 340,
    marginLeft: 45,
    marginRight: 60,
    marginBottom: 30,
    marginTop: 10,
    y: { label: "↑ Indice 100 = 2014", grid: true },
    x: { label: null, tickFormat: "d" },
    color: { type: "identity" },
    marks: [
      Plot.ruleY([100], { stroke: "#e5e7eb", strokeDasharray: "4,3" }),
      Plot.line(_urssafLines.filter(d => !d.dash), {
        x: "year", y: "indice", stroke: "color", strokeWidth: 2, z: "label"
      }),
      Plot.line(_urssafLines.filter(d => d.dash), {
        x: "year", y: "indice", stroke: "color", strokeWidth: 1.5, strokeDasharray: "5,3", z: "label"
      }),
      Plot.text(
        _urssafLines.filter((d, i, arr) => d === arr.filter(a => a.label === d.label).pop()),
        { x: "year", y: "indice", text: "label", dx: 5, textAnchor: "start", fontSize: 10, fill: "color", fontWeight: 600 }
      ),
      Plot.text(
        _urssafLines.filter((d, i, arr) => d === arr.filter(a => a.label === d.label).pop()),
        { x: "year", y: "indice", text: d => d.indice.toFixed(1), dx: 5, dy: 12, textAnchor: "start", fontSize: 9, fill: "color" }
      ),
      Plot.ruleX(_urssafLines, Plot.pointerX({ x: "year", stroke: "#cbd5e1", strokeWidth: 0.5 })),
      Plot.dot(_urssafLines, Plot.pointerX({ x: "year", y: "indice", fill: "color", z: "label", r: 4 })),
      Plot.tip(_urssafLines, Plot.pointerX({
        x: "year", y: "indice", z: "label",
        title: d => `${d.label}\n${d.year} : ${d.indice.toFixed(1)}`
      }))
    ]
  }));
} else {
  display(html`<div style="color:#999; padding:40px; text-align:center; font-size:12px; font-style:italic;">
    Données URSSAF non disponibles pour cette commune.
  </div>`);
}
```

</div>
<!-- /bloc URSSAF -->

<!-- FICHE_TABLE inséré ici via JS (table dépend de données communes) -->
<div class="fiche-card" id="fiche-table-slot"></div>

</div>
<!-- /fiche-content-col -->

</div>
<!-- &e CONTENT_GRID -->

<!-- &s MAPLIBRE — Cartes MapLibre insérées dynamiquement dans la colonne gauche du grid -->

```js
// &s ML_HELPERS - Fonctions utilitaires partagées MapLibre
function _fmtMapVal(val, colKey) {
  if (val == null || isNaN(val)) return "";
  if (colKey.includes("_vtcam") || colKey.includes("_vdifp") || colKey.includes("_vevol"))
    return `${val > 0 ? "+" : ""}${val.toFixed(2)}`;
  if (colKey.includes("_px2") || colKey.includes("rev_"))
    return Math.round(val).toLocaleString("fr-FR");
  if (colKey.includes("_pct"))
    return `${val.toFixed(1)}%`;
  if (colKey.includes("_ind"))
    return val.toFixed(1);
  return String(Math.round(val * 100) / 100);
}

function _countBins(geoJSON, palette, thresholds) {
  const counts = new Array(palette.length).fill(0);
  for (const f of geoJSON.features) {
    const v = f.properties._val;
    if (v == null) continue;
    let idx = thresholds.findIndex(t => v < t);
    if (idx === -1) idx = palette.length - 1;
    counts[idx]++;
  }
  return counts;
}

function _buildLegendHtml(colorRes, colKey) {
  if (!colorRes.palette) return null;
  const pal = colorRes.palette, th = colorRes.bins?.thresholds || [];
  const lbls = colorRes.bins?.labels || pal.map((c, i) => {
    if (i === 0 && th.length) return `< ${th[0].toFixed(1)}`;
    if (i === pal.length - 1 && th.length) return `≥ ${th[th.length - 1].toFixed(1)}`;
    if (th[i-1] != null && th[i] != null) return `${th[i-1].toFixed(1)} – ${th[i].toFixed(1)}`;
    return "";
  });
  const { indic: _baseIndic } = parseColKey(colKey);
  const meta = INDICATEURS[_baseIndic] || INDICATEURS[colKey] || {};
  return { pal, lbls, unit: meta.unit || "", th };
}
// &e
```

```js
// &s ML_INIT - Création UNE SEULE FOIS des instances MapLibre (dépend EPCI seulement)
// IMPORTANT : cette cellule NE référence PAS mapColKey/getColor/colorResult
// pour éviter la re-création des maps quand l'indicateur change.
// Seul ML_UPDATE (cellule suivante) met à jour les données via source.setData().

const { bounds: mlBounds, center: mlCenter } = computeBounds(epciCommFeatures);
const mlMaxBounds = mlBounds ? [
  [mlBounds[0][0] - 0.5, mlBounds[0][1] - 0.3],
  [mlBounds[1][0] + 0.5, mlBounds[1][1] + 0.3]
] : undefined;

// Containers DOM persistants — vertical stack (maps left column)
const mlGrid = document.createElement("div");
mlGrid.style.cssText = "display:flex; flex-direction:column; gap:10px;";

const _mlTitle1 = document.createElement("div");
_mlTitle1.style.cssText = "font-size:12px; font-weight:600; color:#1a5276; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.3px;";
const _mlTitle2 = document.createElement("div");
_mlTitle2.style.cssText = "font-size:12px; font-weight:600; color:#1a5276; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.3px;";

const { outer: o1, wrapper: w1, mapContainer: mc1 } = createMapWrapper({ height: 320 });
const { outer: o2, wrapper: w2, mapContainer: mc2 } = createMapWrapper({ height: 320 });
o1.prepend(_mlTitle1);
o2.prepend(_mlTitle2);
mlGrid.appendChild(o1);
mlGrid.appendChild(o2);

// Zones légendes persistantes (vidées et recréées à chaque update)
const _legendSlot1 = document.createElement("div");
const _legendSlot2 = document.createElement("div");
_legendSlot1.style.cssText = "position:absolute; bottom:0; left:0; z-index:4;";
_legendSlot2.style.cssText = "position:absolute; bottom:0; left:0; z-index:4;";
w1.appendChild(_legendSlot1);
w2.appendChild(_legendSlot2);

// Insérer les cartes MapLibre dans le slot fixe (nettoyé à chaque re-run)
const _mlSlot = document.getElementById("ml-maps-slot");
if (_mlSlot) {
  _mlSlot.innerHTML = "";  // Vide l'ancien contenu avant d'ajouter
  _mlSlot.appendChild(mlGrid);
} else {
  display(mlGrid); // fallback
}

// Tooltip bridges mutables — ML_UPDATE met à jour le .fn, le listener lit dynamiquement
const _ttBridge1 = { fn: null };
const _ttBridge2 = { fn: null };

// Init MapLibre instances — UNE SEULE FOIS par changement EPCI
let _mlMap1 = null, _mlMap2 = null;
let _mlReady1 = false, _mlReady2 = false;

// GeoJSON initial GRIS (pas de coloration indicateur — ML_UPDATE s'en charge)
const _initGeoJSON = buildChoroplethSource(epciCommFeatures, commValueMap, "__init__", () => "#e5e7eb", {});

async function _bootMap(container, wrapper, prefix, geoJSON, bridgeRef) {
  await new Promise(r => setTimeout(r, 80));
  const { map, Popup } = await createOTTDMap(container, {
    center: mlCenter, zoom: 8, maxBounds: mlMaxBounds
  });
  wrapper.appendChild(createResetControl(map, mlBounds));

  return new Promise((resolve) => {
    map.on("load", () => {
      if (mlBounds) map.fitBounds(mlBounds, { padding: 30, maxZoom: 12 });
      addChoroplethLayers(map, `${prefix}-src`, geoJSON, {
        prefix, selectedCode: ""
      });
      addLabelsLayer(map, `${prefix}-src`, { prefix, minZoom: 8.5, fontSize: 11, showValue: true });

      // Tooltip via bridge mutable — ML_UPDATE met à jour bridgeRef.fn
      attachTooltip(map, `${prefix}-fill`,
        (props, lngLat) => bridgeRef.fn ? bridgeRef.fn(props, lngLat) : "",
        { Popup }
      );
      attachHighlight(map, `${prefix}-fill`, `${prefix}-hover`);
      attachClick(map, `${prefix}-fill`, (code) => {
        if (communeOptions.some(c => c.code === code)) _toggleCommune(code);
      });
      resolve({ map, Popup });
    });
  });
}

try {
  const [r1, r2] = await Promise.all([
    _bootMap(mc1, w1, "ml1", _initGeoJSON, _ttBridge1),
    _bootMap(mc2, w2, "ml2", _initGeoJSON, _ttBridge2)
  ]);
  _mlMap1 = r1.map; _mlReady1 = true;
  _mlMap2 = r2.map; _mlReady2 = true;
} catch (err) {
  mc1.innerHTML = mc2.innerHTML = `<div style="padding:30px; text-align:center; color:#999; font-size:12px;">MapLibre non disponible (WebGL requis)</div>`;
}

invalidation.then(() => {
  if (_mlMap1) _mlMap1.remove();
  if (_mlMap2) _mlMap2.remove();
  // Nettoyer le DOM du slot aussi
  const slot = document.getElementById("ml-maps-slot");
  if (slot) slot.innerHTML = "";
});
// &e
```

```js
// &s ML_UPDATE - Mise à jour RÉACTIVE des données MapLibre (indicateur/commune change → setData)
// Cette cellule ne recrée PAS les maps, seulement les sources GeoJSON + légendes + tooltips
if (_mlMap1 && _mlMap2) {
  // Carte 1 — indicateur gauche
  const colKey1 = mapColKey;
  const cRes1 = colorResult;
  const geoJSON1 = buildChoroplethSource(epciCommFeatures, commValueMap, colKey1, cRes1.getColor, {
    formatVal: _fmtMapVal
  });
  const src1 = _mlMap1.getSource("ml1-src");
  if (src1) src1.setData(geoJSON1);
  _mlTitle1.textContent = mapIndicLabel;

  // Tooltip bridge 1 — mise à jour dynamique
  _ttBridge1.fn = createTooltipBridge(colKey1, epciCommData, france?.[colKey1], buildTerritoryTooltip);

  // Sélection commune — highlight outline
  _mlMap1.setFilter("ml1-selected", ["==", ["get", "CODGEO"], selectedCommune || ""]);
  _mlMap2.setFilter("ml2-selected", ["==", ["get", "CODGEO"], selectedCommune || ""]);

  // Légende 1
  _legendSlot1.innerHTML = "";
  const leg1 = _buildLegendHtml(cRes1, colKey1);
  if (leg1) {
    const counts1 = _countBins(geoJSON1, leg1.pal, leg1.th);
    _legendSlot1.appendChild(createMapLegend(leg1.pal, leg1.lbls, {
      title: leg1.unit, direction: "vertical", position: "bottom-left", counts: counts1
    }));
  }

  // Carte 2 — indicateur droite
  const mapPeriode2 = getDefaultPeriode(selectedMapIndic2);
  const colKey2 = buildColKey(selectedMapIndic2, mapPeriode2);
  const cRes2 = epciCommData.length > 2
    ? createColorFunction(epciCommData, colKey2, "bins")
    : { getColor: () => "#ccc" };
  const geoJSON2 = buildChoroplethSource(epciCommFeatures, commValueMap, colKey2, cRes2.getColor, {
    formatVal: _fmtMapVal
  });
  const src2 = _mlMap2.getSource("ml2-src");
  if (src2) src2.setData(geoJSON2);

  const meta2 = INDICATEURS[colKey2] || INDICATEURS[selectedMapIndic2] || {};
  _mlTitle2.textContent = meta2.medium || meta2.short || selectedMapIndic2;

  // Tooltip bridge 2
  _ttBridge2.fn = createTooltipBridge(colKey2, epciCommData, france?.[colKey2], buildTerritoryTooltip);

  // Légende 2
  _legendSlot2.innerHTML = "";
  const leg2 = _buildLegendHtml(cRes2, colKey2);
  if (leg2) {
    const counts2 = _countBins(geoJSON2, leg2.pal, leg2.th);
    _legendSlot2.appendChild(createMapLegend(leg2.pal, leg2.lbls, {
      title: leg2.unit, direction: "vertical", position: "bottom-left", counts: counts2
    }));
  }
}
// &e
```

<!-- &e MAPLIBRE -->

<!-- &s FICHE_TABLE -->
```js
// Tableau comparé multi-commune — header unique sticky + details scrollable
function buildFicheTable(communes, epciRow, depRow, regRow, franceRow) {
  // communes = [{data, label}] — 1 ou 2 communes à comparer
  if (!communes.length || !communes[0].data) {
    const empty = document.createElement("div");
    empty.style.cssText = "color:#999; padding:20px;";
    empty.textContent = "Sélectionnez une commune";
    return empty;
  }

  const multi = communes.length > 1;
  const themeLabels = {
    dm: "Démographie", dmv: "Vieillissement", dmf: "Flux migratoires",
    eco: "Économie / Emploi", soc: "Social / Diplômes", men: "Ménages",
    log: "Logement (stock)", logd: "Immobilier (DVF)", rev: "Revenus"
  };

  function ecartStyle(ecart, polarity) {
    if (ecart == null || isNaN(ecart)) return "color:#999;";
    if (polarity === 0) return "color:#666;";
    const good = polarity === 1 ? ecart > 0 : ecart < 0;
    const bad = polarity === 1 ? ecart < 0 : ecart > 0;
    if (good) return "color:#27ae60; font-weight:500;";
    if (bad) return "color:#e74c3c; font-weight:500;";
    return "color:#666;";
  }

  function formatEcart(ecart, colKey) {
    if (ecart == null || isNaN(ecart)) return "—";
    const sign = ecart > 0 ? "+" : "";
    if (colKey.includes("_vtcam") || colKey.includes("_pct") || colKey.includes("_vdifp") || colKey.includes("_vevol"))
      return `${sign}${ecart.toFixed(2)}`;
    if (colKey.includes("_px2") || colKey.includes("rev_"))
      return `${sign}${Math.round(ecart).toLocaleString("fr-FR")}`;
    if (colKey.includes("_ind"))
      return `${sign}${ecart.toFixed(1)}`;
    return `${sign}${ecart.toFixed(2)}`;
  }

  // Build header — columns for each commune
  const colW = multi ? "70px" : "75px";
  const commW = multi ? "80px" : "90px";
  let colgroup = `<col style="width:auto;">`;
  let headerRow = `<th style="text-align:left; padding:4px 8px;">Indicateur</th>`;

  for (let ci = 0; ci < communes.length; ci++) {
    const cLabel = communes[ci].label;
    const shortLabel = cLabel.length > 12 ? cLabel.slice(0, 11) + "…" : cLabel;
    const borderLeft = ci > 0 ? "border-left:2px solid #cbd5e1;" : "";
    colgroup += `<col style="width:${commW};">`;
    headerRow += `<th style="text-align:right; padding:4px 6px; ${borderLeft} color:#1a5276;" title="${cLabel}">${shortLabel}</th>`;
    // vs EPCI, vs DEP, vs REG, vs France
    for (const ref of ["EPCI", "DEP", "REG", "France"]) {
      colgroup += `<col style="width:${colW};">`;
      headerRow += `<th style="text-align:right; padding:4px 6px; font-weight:500; color:#888;">vs ${ref}</th>`;
    }
  }

  // Build body — theme sections with separator rows
  let bodyRows = "";
  for (const [theme, indics] of Object.entries(FICHE_INDICS)) {
    const totalCols = 1 + communes.length * 5;
    bodyRows += `<tr class="fiche-theme-row"><td colspan="${totalCols}" style="font-weight:600; font-size:12px; color:#1a5276; padding:8px 8px 4px; border-top:1px solid #e0e5ea;">${themeLabels[theme] || theme}</td></tr>`;

    for (const indic of indics) {
      const periode = getDefaultPeriode(indic);
      const colKey = buildColKey(indic, periode);
      const meta = INDICATEURS[colKey] || INDICATEURS[indic] || {};
      const label = meta.medium || meta.short || indic;
      const unit = meta.unit || "";
      const polarity = meta.polarity ?? 0;

      let cells = `<td style="font-weight:500; white-space:nowrap; padding:3px 8px;">${label} <span style="color:#aaa; font-size:10px;">${unit}</span></td>`;

      for (let ci = 0; ci < communes.length; ci++) {
        const row = communes[ci].data;
        const commVal = row[colKey];
        const borderLeft = ci > 0 ? "border-left:2px solid #e8ecf0;" : "";

        const ecartEpci = (commVal != null && epciRow?.[colKey] != null) ? commVal - epciRow[colKey] : null;
        const ecartDep = (commVal != null && depRow?.[colKey] != null) ? commVal - depRow[colKey] : null;
        const ecartReg = (commVal != null && regRow?.[colKey] != null) ? commVal - regRow[colKey] : null;
        const ecartFr = (commVal != null && franceRow?.[colKey] != null) ? commVal - franceRow[colKey] : null;

        cells += `<td style="text-align:right; font-weight:600; padding:3px 6px; ${borderLeft}">${commVal != null ? fmtVal(colKey, commVal) : "—"}</td>`;
        cells += `<td style="text-align:right; padding:3px 6px; ${ecartStyle(ecartEpci, polarity)}">${formatEcart(ecartEpci, colKey)}</td>`;
        cells += `<td style="text-align:right; padding:3px 6px; ${ecartStyle(ecartDep, polarity)}">${formatEcart(ecartDep, colKey)}</td>`;
        cells += `<td style="text-align:right; padding:3px 6px; ${ecartStyle(ecartReg, polarity)}">${formatEcart(ecartReg, colKey)}</td>`;
        cells += `<td style="text-align:right; padding:3px 6px; ${ecartStyle(ecartFr, polarity)}">${formatEcart(ecartFr, colKey)}</td>`;
      }

      bodyRows += `<tr>${cells}</tr>`;
    }
  }

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "border:1px solid #e0e5ea; border-radius:6px; background:#fff; overflow:hidden;";
  wrapper.innerHTML = `
    <div style="max-height:500px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(156,163,175,0.4) transparent;">
      <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:12px;">
        <colgroup>${colgroup}</colgroup>
        <thead style="position:sticky; top:0; z-index:2; background:#f8fafc; border-bottom:2px solid #d1d5db;">
          <tr>${headerRow}</tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
  return wrapper;
}

// Build commune list for comparison
const ficheCommunes = [{ data: communeData, label: commLabel }];
if (commune2Data) {
  ficheCommunes.push({ data: commune2Data, label: comm2Label });
}
const ficheTable = buildFicheTable(ficheCommunes, epciData, depData, regData, france);
// Insérer dans le slot de la colonne droite
const _tableSlot = document.getElementById("fiche-table-slot");
if (_tableSlot) {
  _tableSlot.innerHTML = "";
  _tableSlot.appendChild(ficheTable);
} else {
  display(ficheTable);
}
```
<!-- &e FICHE_TABLE -->

<!-- URSSAF_CHART déplacé dans MAPS_GRID (à droite de la carte EPCI) -->

</div>
<!-- &e LAYOUT_MAIN -->

<!-- &s STYLES -->
<style>
/* Observable main — pleine largeur */
#observablehq-main {
  max-width: 100% !important;
  padding: 0 !important;
}

/* Layout — sidebar et layout-main positionnés par dashboard-light.css (260px) */
/* Overrides visuelles sidebar uniquement */
.sidebar {
  background: #fafbfc;
  border-right: 1px solid #e0e5ea;
}

.sidebar select {
  width: 100% !important;
  font-size: 12px !important;
}

.sidebar input[type="text"] {
  width: 100% !important;
  font-size: 12px !important;
  padding: 5px 8px !important;
  border: 1px solid #d1d5db !important;
  border-radius: 4px !important;
  box-sizing: border-box !important;
}

.sidebar input[type="text"]:focus {
  border-color: #0f766e !important;
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(15,118,110,0.1) !important;
}

.sidebar label {
  display: none;
}

.sidebar form {
  margin: 0 !important;
}

/* Content grid — maps left, table+charts right */
.fiche-content-grid {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 14px;
  margin-bottom: 12px;
}

.fiche-maps-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fiche-content-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fiche-card {
  background: #fff;
  border: 1px solid #e0e5ea;
  border-radius: 6px;
  padding: 12px 14px;
}

.fiche-card-title {
  font-size: 12px;
  font-weight: 600;
  color: #1a5276;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Fiche table — header sticky + scroll + theme separators */
.fiche-theme-row td {
  background: #f8fafc;
}

/* KPI cross-table — tiles thématiques centrées */
.kpi-grid {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.kpi-tile {
  flex: 1 1 140px;
  min-width: 135px;
  max-width: 190px;
  border-radius: 6px;
  padding: 10px 12px 8px;
  color: #fff;
}

.kpi-tile:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}

/* Thèmes KPI — fond subtil, police blanche */
.kpi-theme-demog { background: #3a7bbf; }
.kpi-theme-immo  { background: #c0712b; }
.kpi-theme-log   { background: #8855a0; }
.kpi-theme-emp   { background: #2878a8; }
.kpi-theme-rev   { background: #4a9944; }

.kpi-name {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  opacity: 0.85;
  margin-bottom: 4px;
}

.kpi-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 6px;
}

.kpi-value {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.1;
}

.kpi-value small {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.7;
  margin-left: 2px;
}

.kpi-evol {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.9;
}

.kpi-refs {
  border-top: 1px solid rgba(255,255,255,0.25);
  padding-top: 4px;
}

.kpi-ref {
  font-size: 10px;
  opacity: 0.85;
  line-height: 1.4;
}

.kpi-ref-fr {
  font-size: 9px;
  opacity: 0.7;
}

.kpi-vs-label {
  font-weight: 400;
  margin-right: 4px;
}

.kpi-vs-val {
  font-weight: 600;
}

/* MapLibre popup — dark theme pour bridge avec buildTerritoryTooltip */
.maplibregl-popup-content {
  background: #1e293b !important;
  color: #e2e8f0 !important;
  font-size: 12px !important;
  padding: 8px 12px !important;
  border-radius: 6px !important;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3) !important;
}

.maplibregl-popup-anchor-bottom .maplibregl-popup-tip { border-top-color: #1e293b !important; }
.maplibregl-popup-anchor-top .maplibregl-popup-tip { border-bottom-color: #1e293b !important; }
.maplibregl-popup-anchor-left .maplibregl-popup-tip { border-right-color: #1e293b !important; }
.maplibregl-popup-anchor-right .maplibregl-popup-tip { border-left-color: #1e293b !important; }
</style>
<!-- &e STYLES -->
