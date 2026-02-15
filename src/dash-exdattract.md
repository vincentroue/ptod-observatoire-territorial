---
title: OTERT — Attractivité
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     Volet Attractivité résidentielle et productive — Multi-échelon
     Date: 2026-02-12 | v1.1
     Layout: Sidebar | Flex[cartes+scatter | table]
     Indices: idxresid_dyn_ind, idxeco_soc_ind, idxgentri_ind, idxlogtens_ind
     Tabs: Libre (défaut) / Niveau / Trajectoire
     Échelons: ZE, DEP, REG, EPCI, AAV, Commune
     Carte 1 (gauche) = axe X scatter | Carte 2 (droite) = axe Y scatter
     ============================================================ -->

<!-- &s BANNER -->
```js
import { createBanner, createNav, OTTD_PAGES } from "./helpers/layout.js"
const _voletCfg = OTTD_PAGES.find(p => p.id === 'exdattract')
display(createBanner({
  voletTitle: "Attractivité : indices résidentiels et productifs",
  voletTooltip: "Indices composites croisant dynamiques migratoires (SMA, rotation, profils CSP) et économiques (emploi total/privé, créations, cadres). Calcul en z-scores normalisés sur 2 périodes (2011-16 / 2016-22). Sources : INSEE RP 2011-2023, MIGCOM, URSSAF, DVF, SIDE.",
  color: _voletCfg?.color || "#2980b9",
  navElement: createNav(OTTD_PAGES, 'exdattract')
}))
```
<!-- &e BANNER -->

<!-- &s IMPORTS -->
```js
import * as topojson from "npm:topojson-client"
import rewind from "npm:@mapbox/geojson-rewind"
import * as Plot from "npm:@observablehq/plot"

import { getEchelonMeta, getLabelMap, setLabelMap, getFranceData, getDataNoFrance } from "./helpers/0loader.js"
import { getDefaultZoomCode, ECHELONS_ATTRACT, DENS_COLORS, DENS_LABELS } from "./helpers/constants.js"
import { getPeriodesForIndicateur, getDefaultPeriode, buildColKey, getIndicLabel, getPeriodeLabel } from "./helpers/selectindic.js"
import { formatValue, INDICATEURS, THEMES, getIndicOptionsByAggDash, getSource } from "./helpers/indicators-ddict-js.js"
import { computeIndicBins, countBins, createGradientScale, GRADIENT_PALETTES, computeEcartFrance, PAL_ECART_FRANCE, ECART_FRANCE_SYMBOLS } from "./helpers/colors.js"
import { createBinsLegend, createGradientLegend, createEcartFranceLegend } from "./helpers/legend.js"
import { renderChoropleth, createMapWrapper, addZoomBehavior } from "./helpers/maps.js"
import { createSearchBox } from "./helpers/search.js"
import { sortTableData, computeBarStats, getIndicUnit, renderTable, exportCSV, openTableFullscreen } from "./helpers/0table.js"
import { exportSVG } from "./helpers/graph-options.js"
import { buildScatterTooltip } from "./helpers/tooltip.js"
import { createScatterWithZoom } from "./helpers/scatter.js"
import { autoSizeScale, createSizeLegendVertical } from "./helpers/size-scale.js"
import { createSelectionManager } from "./helpers/selection.js"
import { initDuckDB, registerParquet, queryCommunes, queryFrance } from "./helpers/duckdb.js"
```
<!-- &e IMPORTS -->

<!-- &s ATTRACT_INDIC_OPTIONS -->
```js
// Dropdown custom attractivité : idx en tête avec composants groupés dessous
function getAttractIndicOptions() {
  const options = []
  const seenComponents = new Set() // éviter doublons composants partagés

  // 1. Indices synthétiques en tête (ordre ddict)
  const idxEntries = Object.entries(INDICATEURS)
    .filter(([k, v]) => v.theme === "idx" && v.agg_dash)
    .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99))

  if (idxEntries.length) {
    options.push(["── Indices synthétiques ──", "__sep_idx__"])
    for (const [key, info] of idxEntries) {
      options.push([`◆ ${info.medium.replace(/^◆\s*/, "")}`, key])
      // Composants srcVar groupés sous l'indice (dédupliqués)
      const srcVars = info.srcVar || []
      for (const sv of srcVars) {
        const baseKey = sv.replace(/_\d+$/, "")
        if (INDICATEURS[baseKey] && baseKey !== key && !seenComponents.has(baseKey)) {
          seenComponents.add(baseKey)
          options.push([`  ↳ ${INDICATEURS[baseKey].short || baseKey}`, baseKey])
        }
      }
    }
  }

  // 2. Autres thèmes standard (excl. idx, excl. composants déjà listés)
  const sortedThemes = Object.entries(THEMES)
    .filter(([k]) => k !== "idx")
    .sort((a, b) => a[1].ordre - b[1].ordre)
  for (const [themeKey, themeInfo] of sortedThemes) {
    const themeIndics = Object.entries(INDICATEURS)
      .filter(([k, v]) => v.theme === themeKey && v.agg_dash && !seenComponents.has(k))
      .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99))
    if (themeIndics.length) {
      options.push([`── ${themeInfo.label} ──`, `__sep_${themeKey}__`])
      for (const [key, info] of themeIndics) {
        options.push([info.medium, key])
      }
    }
  }
  return new Map(options)
}
```
<!-- &e ATTRACT_INDIC_OPTIONS -->

<!-- &s DEBOUNCE -->
```js
function debounceInput(input, delay = 300) {
  const container = document.createElement("div");
  container.appendChild(input);
  let timeout = null;
  let currentValue = input.value;
  Object.defineProperty(container, "value", {
    get: () => currentValue,
    set: (v) => { currentValue = v; input.value = v; }
  });
  input.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      currentValue = input.value;
      container.dispatchEvent(new Event("input", { bubbles: true }));
    }, delay);
  });
  return container;
}
```
<!-- &e DEBOUNCE -->

<!-- &s FILE_HANDLES -->
```js
const DATA_HANDLES = {
  "Zone d'emploi": FileAttachment("data/agg_ze.json"),
  "Département": FileAttachment("data/agg_dep.json"),
  "Région": FileAttachment("data/agg_reg.json"),
  "EPCI": FileAttachment("data/agg_epci.json"),
  "Aire d'attraction": FileAttachment("data/agg_aav.json")
};
const GEO_HANDLES = {
  "Zone d'emploi": FileAttachment("data/nodom_zones-emploi_2025.topojson"),
  "Département": FileAttachment("data/nodom_departement_2025.topojson"),
  "Région": FileAttachment("data/nodom_region_2025.topojson"),
  "EPCI": FileAttachment("data/nodom_epci_2025.topojson"),
  "Aire d'attraction": FileAttachment("data/nodom_aav_2025.topojson")
};
const COMMUNES_TOPO = FileAttachment("data/nodom_commune-ARM_MINI_2025.topojson")
const COMMUNES_PARQUET = FileAttachment("data/agg_commARM.parquet")
```
<!-- &e FILE_HANDLES -->

<!-- &s TAB_CONFIG -->
```js
const IDX = {
  RESID_T1: "idxresid_dyn_ind_1116", RESID_T2: "idxresid_dyn_ind_1623",
  ECO_T1: "idxeco_soc_ind_1116", ECO_T2: "idxeco_soc_ind_1622",
  ECO_TOT_T2: "idxeco_tot_ind_1622",
  GENTRI_T2: "idxgentri_ind_1622", LOGTENS: "idxlogtens_ind_22"
};

// Carte 1 (gauche) = axe X scatter, Carte 2 (droite) = axe Y scatter
const TAB_DEFS = {
  libre: {
    label: "Exploration libre",
    tableCols: [IDX.RESID_T2, IDX.ECO_T2, IDX.GENTRI_T2, IDX.LOGTENS]
  },
  t1: {
    label: "Indice T1",
    mapLeft: IDX.RESID_T1, mapRight: IDX.ECO_T1,
    mapLeftIndic: "idxresid_dyn_ind", mapRightIndic: "idxeco_soc_ind",
    tableCols: [IDX.RESID_T1, IDX.ECO_T1, IDX.GENTRI_T2, IDX.LOGTENS, IDX.ECO_TOT_T2]
  },
  niveau: {
    label: "Indice T2",
    mapLeft: IDX.RESID_T2, mapRight: IDX.ECO_T2,
    mapLeftIndic: "idxresid_dyn_ind", mapRightIndic: "idxeco_soc_ind",
    tableCols: [IDX.RESID_T2, IDX.ECO_T2, IDX.GENTRI_T2, IDX.LOGTENS, IDX.ECO_TOT_T2]
  },
  trajectoire: {
    label: "Trajectoire T2−T1",
    mapLeft: "delta_resid", mapRight: "delta_eco",
    mapLeftIndic: "_delta_resid", mapRightIndic: "_delta_eco",
    tableCols: [IDX.RESID_T1, IDX.RESID_T2, "delta_resid", IDX.ECO_T1, IDX.ECO_T2, "delta_eco"]
  }
};

// Scatter & maps color : bleu-bordeaux (PAL_ECART_FRANCE) centered on 50 (indices) or 0 (deltas)
```
<!-- &e TAB_CONFIG -->

<!-- &s INIT -->
```js
const initData = await DATA_HANDLES["Zone d'emploi"].json()
const initTopoRaw = await GEO_HANDLES["Zone d'emploi"].json()
const initGeo = rewind(topojson.feature(initTopoRaw, initTopoRaw.objects[Object.keys(initTopoRaw.objects)[0]]), true)

const aggDataCache = new Map([["Zone d'emploi", initData]])
const geoCache = new Map([["Zone d'emploi", initGeo]])

const labelMaps = {}
const initLabelMap = new Map()
initData.forEach(d => d.code && d.libelle && initLabelMap.set(String(d.code), d.libelle))
setLabelMap("Zone d'emploi", initLabelMap)
labelMaps["Zone d'emploi"] = initLabelMap

async function getAggData(ech) {
  if (!aggDataCache.has(ech)) {
    const handle = DATA_HANDLES[ech]
    if (handle) aggDataCache.set(ech, await handle.json())
  }
  return aggDataCache.get(ech)
}

async function getGeo(ech) {
  if (!geoCache.has(ech)) {
    const handle = GEO_HANDLES[ech]
    if (handle) {
      const raw = await handle.json()
      const converted = raw.type === "Topology"
        ? topojson.feature(raw, raw.objects[Object.keys(raw.objects)[0]])
        : raw
      geoCache.set(ech, rewind(converted, true))
    }
  }
  return geoCache.get(ech)
}

let _duckReady = null, _duckDB = null, _duckConn = null, _communesGeo = null
async function ensureDuckDB() {
  if (!_duckReady) {
    _duckReady = (async () => {
      try {
        console.log("[EXDATTRACT] DuckDB init start...")
        const { db, conn } = await initDuckDB()
        if (!conn) throw new Error("conn is null after initDuckDB")
        const pqUrl = await COMMUNES_PARQUET.url()
        console.log("[EXDATTRACT] Registering parquet:", pqUrl)
        await registerParquet(db, "communes", pqUrl)
        _duckDB = db; _duckConn = conn
        console.log("[EXDATTRACT] DuckDB ready, loading topo...")
        const topoRaw = await COMMUNES_TOPO.json()
        _communesGeo = rewind(topojson.feature(topoRaw, topoRaw.objects[Object.keys(topoRaw.objects)[0]]), true)
        console.log("[EXDATTRACT] Communes geo loaded:", _communesGeo.features.length, "features")
      } catch (err) {
        console.error("[EXDATTRACT] DuckDB init failed:", err.message, err)
        _duckReady = null // reset pour permettre retry
      }
    })()
  }
  return _duckReady
}
ensureDuckDB()

const attractIndicOptions = getAttractIndicOptions()
const AVAILABLE_COLUMNS = new Set(Object.keys(initData[0] || {}))
```
<!-- &e INIT -->

<!-- &s STATE -->
```js
const mapSelectionState = Mutable(new Set(["5315", "1109"]))
const zoomTargetState = Mutable("5315")
const sortState = Mutable({ col: IDX.RESID_T2, asc: false })
const pageState = Mutable(0)

const selectionMgr = createSelectionManager(mapSelectionState, zoomTargetState, pageState)
const { addToSelection, removeFromSelection, setZoomOnly, toggleMapSelection, clearMapSelection } = selectionMgr
```
<!-- &e STATE -->

<!-- &s STYLES -->
<style>
.table-help-wrap { display: inline-block; position: relative; vertical-align: middle; margin-left: 6px; }
.table-help-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  background: #e5e7eb; color: #6b7280;
  font-size: 11px; font-weight: 700; cursor: help;
}
.table-help-wrap .help-tooltip {
  display: none; position: absolute;
  top: 22px; left: -8px; z-index: 100;
  background: white; border: 1px solid #d1d5db;
  border-radius: 6px; padding: 10px 14px;
  font-size: 12px; font-weight: 400;
  width: 310px; line-height: 1.6;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.table-help-wrap:hover .help-tooltip { display: block; }
/* Sidebar disabled */
.panel-disabled {
  opacity: 0.4;
  pointer-events: none;
  filter: grayscale(0.3);
}
/* Tab radio styled */
.tab-radio > div { display: flex !important; gap: 0 !important; }
.tab-radio > div label {
  padding: 5px 12px !important; font-size: 11px !important; font-weight: 500 !important;
  border: 1px solid #d1d5db !important; background: #f9fafb !important; color: #374151 !important;
  cursor: pointer !important; margin: 0 !important;
}
.tab-radio > div label:first-child { border-radius: 4px 0 0 4px !important; }
.tab-radio > div label:last-child { border-radius: 0 4px 4px 0 !important; }
.tab-radio > div label:not(:first-child) { border-left: none !important; }
.tab-radio > div label:has(input:checked) {
  background: #1e40af !important; color: white !important; border-color: #1e40af !important;
  font-weight: 600 !important;
}
.tab-radio > div label input { display: none !important; }
</style>
<!-- &e STYLES -->

<style>
.sidebar {
  overflow-x: hidden !important;
  overflow-y: auto !important;
}
.sidebar select {
  font-size: 11px !important;
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
  max-width: 260px !important;
  box-sizing: border-box !important;
  margin: 0 0 3px 0 !important;
  padding: 0 !important;
  align-items: center !important;
  gap: 0 6px !important;
}
.sidebar form > label:first-child {
  max-width: 250px !important;
  margin: 0 !important;
  padding: 0 !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
}
.sidebar form > div,
.sidebar form > select,
.sidebar form > input {
  margin-top: 0 !important;
}
.sidebar form > div[style*="flex"] label {
  overflow: visible !important;
  white-space: nowrap !important;
  font-size: 11px !important;
  margin: 0 !important;
  padding: 0 !important;
}
.sidebar .panel { margin-bottom: 6px !important; }
.sidebar .panel-title { margin-bottom: 2px !important; }
</style>

<!-- &s SIDEBAR -->
<aside class="sidebar">

```js
const _tabInput = Inputs.radio(
  new Map([["Exploration libre", "libre"], ["Indice T1", "t1"], ["Indice T2", "niveau"], ["Trajectoire T2−T1", "trajectoire"]]),
  { value: "libre", label: "" }
)
_tabInput.classList.add("tab-radio")
// Compact pour sidebar
{ const d = _tabInput.querySelector(":scope > div"); if (d) { d.style.cssText = "display:flex;gap:0;flex-wrap:wrap;"; d.querySelectorAll("label").forEach(l => { l.style.cssText = "padding:3px 8px;font-size:10px;"; }); } }
const activeTab = view(_tabInput)
```

<section class="panel">
<div class="panel-title">ÉCHELON</div>

```js
const echelon = view(debounceInput(Inputs.radio(
  ECHELONS_ATTRACT,
  { value: "Zone d'emploi", label: "" }
), 300))
```

</section>

<section class="panel" id="panel-carte-gauche">
<div class="panel-title">CARTE GAUCHE · AXE X</div>

```js
const indic1 = view(Inputs.select(attractIndicOptions, { value: "dm_sma_vtcam", label: "Indic." }))
```

```js
const perMap1 = getPeriodesForIndicateur(indic1)
const periode1 = view(Inputs.select(perMap1, { value: [...perMap1.values()][0], label: "Période" }))
```

```js
const _cm1Input = Inputs.radio(["%", "±Fr.", "Grad."], { value: "%", label: "Palette" })
{ const d = _cm1Input.querySelector(":scope > div"); if (d) { d.style.cssText = "display:flex;gap:6px;"; d.querySelectorAll("label").forEach(l => l.style.display = "inline"); } }
const _cm1Lbl = Array.from(_cm1Input.querySelectorAll("label")).find(l => !l.querySelector("input"))
if (_cm1Lbl) { const t = document.createElement("span"); t.className = "panel-tooltip-wrap"; t.innerHTML = `<span class="panel-tooltip-icon">?</span><span class="panel-tooltip-text">% = quantiles (classes effectifs égaux)<br>±Fr. = écart à la valeur France (σ winsorisé)<br>Grad. = dégradé continu</span>`; _cm1Lbl.appendChild(t); }
const colorMode1 = view(_cm1Input)
```

</section>

<section class="panel" id="panel-carte-droite">
<div class="panel-title">CARTE DROITE · AXE Y</div>

```js
const indic2 = view(Inputs.select(attractIndicOptions, { value: "eco_emppriv_vtcam", label: "Indic." }))
```

```js
const perMap2 = getPeriodesForIndicateur(indic2)
const periode2 = view(Inputs.select(perMap2, { value: [...perMap2.values()][0], label: "Période" }))
```

```js
const _cm2Input = Inputs.radio(["%", "±Fr.", "Grad."], { value: "±Fr.", label: "Palette" })
{ const d = _cm2Input.querySelector(":scope > div"); if (d) { d.style.cssText = "display:flex;gap:6px;"; d.querySelectorAll("label").forEach(l => l.style.display = "inline"); } }
const _cm2Lbl = Array.from(_cm2Input.querySelectorAll("label")).find(l => !l.querySelector("input"))
if (_cm2Lbl) { const t = document.createElement("span"); t.className = "panel-tooltip-wrap"; t.innerHTML = `<span class="panel-tooltip-icon">?</span><span class="panel-tooltip-text">% = quantiles (classes effectifs égaux)<br>±Fr. = écart à la valeur France (σ winsorisé)<br>Grad. = dégradé continu</span>`; _cm2Lbl.appendChild(t); }
const colorMode2 = view(_cm2Input)
```

</section>

<section class="panel">
<div class="panel-title">SÉLECTION</div>
<div id="search-container-attract" style="margin-top:6px;min-height:100px;"></div>
</section>

<section class="panel">
<div class="panel-title">OPTIONS CARTES</div>

```js
const showValuesOnMap = view(Inputs.toggle({ label: "Show labels", value: true }))
const labelBy = view(Inputs.select(new Map([
  ["Principaux terr.", "population"],
  ["Top 20 + Bot 20", "top5_bot5"],
  ["Top 20 indic", "indicator_top"],
  ["Bottom 20 indic", "indicator_bottom"]
]), { value: "population", label: "Labels" }))
const _lmInput = Inputs.radio(["both", "val.", "noms"], { value: "both", label: "Contenu" })
{ const d = _lmInput.querySelector(":scope > div"); if (d) { d.style.cssText = "display:flex;gap:4px;"; d.querySelectorAll("label").forEach(l => { l.style.display = "inline"; l.style.fontSize = "11px"; }); } }
const labelMode = view(_lmInput)
```

</section>

<section class="panel">
<div class="panel-title">INDICATEURS TABLEAU <span class="table-help-wrap"><span class="table-help-icon">?</span><span class="help-tooltip">ctrl/shift click pour multi-sélection</span></span></div>

```js
const extraIndics = view(Inputs.select(
  attractIndicOptions,
  { label: "", multiple: true, value: [], width: 230 }
))
```

</section>

</aside>
<!-- &e SIDEBAR -->

<!-- Sidebar panels always active — user switches indicators freely in all modes -->

<!-- &s LAYOUT_MAIN -->
<div class="layout-main" style="margin-top:0;">

<!-- &s REACTIVE_DATA -->
```js
// === REACTIVE DATA — triggered by echelon + activeTab ===
const isCommune = echelon === "Commune"

const _loadResult = await (async () => {
  if (isCommune) {
    // Commune: EPCI geo+data for maps, commune data for scatter/table
    await ensureDuckDB()
    if (!_duckConn) {
      console.error("[EXDATTRACT] DuckDB conn still null — commune mode unavailable")
      return { data: [], geo: null, geoKey: "code", labelKey: "libelle", frData: null, mapData: [], mapGeo: null, mapGeoKey: "code", mapLabelKey: "libelle", communeRows: [] }
    }
    // GENTRI et LOGTENS ne sont PAS calculés au niveau commune
    const idxCols = [IDX.RESID_T1, IDX.RESID_T2, IDX.ECO_T1, IDX.ECO_T2, IDX.ECO_TOT_T2]
    // Commune data for scatter + table — SELECT * to support libre mode any indicator
    const communeRows = await queryCommunes({ conn: _duckConn }, {
      tableName: "communes",
      columns: ["*"],
      minPop: 5000
    })
    const frRow = await queryFrance({ conn: _duckConn }, "communes", idxCols)
    // EPCI geo+data for maps (lazy load)
    const epciData = await getAggData("EPCI")
    const epciGeo = await getGeo("EPCI")
    const epciMeta = getEchelonMeta("EPCI")
    if (!labelMaps["EPCI"]) {
      const lm = new Map()
      if (epciGeo) epciGeo.features.forEach(f => { const c = f.properties[epciMeta.geoKey], lb = f.properties[epciMeta.labelKey]; if (c && lb) lm.set(String(c), lb) })
      epciData.forEach(d => { if (d.code && d.libelle && !lm.has(String(d.code))) lm.set(String(d.code), d.libelle) })
      labelMaps["EPCI"] = lm; setLabelMap("EPCI", lm)
    }
    return {
      frData: frRow,
      dataNoFrance: communeRows.filter(d => d.code !== "00FR"),
      currentGeo: epciGeo,
      currentMeta: epciMeta,
      currentLabelMap: new Map(communeRows.filter(d => d.code !== "00FR").map(d => [String(d.code), d.libelle || d.code])),
      // Extra: EPCI-specific data for maps
      _mapData: epciData.filter(d => d.code !== "00FR"),
      _mapFrData: epciData.find(d => d.code === "00FR") || frRow,
      _mapLabelMap: labelMaps["EPCI"]
    }
  } else {
    const data = await getAggData(echelon)
    const geo = await getGeo(echelon)
    const meta = getEchelonMeta(echelon)
    if (!labelMaps[echelon]) {
      const lm = new Map()
      if (geo) geo.features.forEach(f => {
        const c = f.properties[meta.geoKey], lb = f.properties[meta.labelKey]
        if (c && lb) lm.set(String(c), lb)
      })
      data.forEach(d => { if (d.code && d.libelle && !lm.has(String(d.code))) lm.set(String(d.code), d.libelle) })
      labelMaps[echelon] = lm
      setLabelMap(echelon, lm)
    }
    return {
      frData: getFranceData(data),
      dataNoFrance: getDataNoFrance(data),
      currentGeo: geo,
      currentMeta: meta,
      currentLabelMap: labelMaps[echelon]
    }
  }
})()

const { frData, currentGeo, currentMeta, currentLabelMap } = _loadResult
const _rawDataNoFrance = _loadResult.dataNoFrance

// Filtrage échelon : EPCI hors CC (si type_epci dispo), commune déjà ≥5K côté DuckDB
const isEPCI = echelon === "EPCI"
const _hasTypeEPCI = _rawDataNoFrance.length > 0 && "type_epci" in (_rawDataNoFrance[0] || {})
const dataNoFrance = isEPCI && _hasTypeEPCI
  ? _rawDataNoFrance.filter(d => d.type_epci && d.type_epci !== "CC")
  : _rawDataNoFrance

// Commune sous-ensembles : scatter ≥30K, table scatter ≥30K, table globale = toutes ≥5K
const dataCommScatter = isCommune ? dataNoFrance.filter(d => (d.P23_POP || d.P22_POP || 0) >= 30000) : null
const dataCommTable = dataCommScatter  // même filtre pour table à côté du scatter

// For commune: maps use EPCI data (hors CC), scatter/table use commune data
const _mapDataAll = _loadResult._mapData || dataNoFrance
const _mapDataRaw = isCommune && _hasTypeEPCI ? _mapDataAll.filter(d => d.type_epci && d.type_epci !== "CC") : _mapDataAll
const _mapFrData = _loadResult._mapFrData || frData
const _mapLabelMap = _loadResult._mapLabelMap || currentLabelMap

// Delta (trajectoire)
const _addDelta = d => ({
  ...d,
  delta_resid: (d[IDX.RESID_T2] != null && d[IDX.RESID_T1] != null) ? d[IDX.RESID_T2] - d[IDX.RESID_T1] : null,
  delta_eco: (d[IDX.ECO_T2] != null && d[IDX.ECO_T1] != null) ? d[IDX.ECO_T2] - d[IDX.ECO_T1] : null
})
const dataWithDelta = dataNoFrance.map(_addDelta)
const dataWithDeltaGlobal = dataWithDelta.map(d => ({
  ...d,
  delta_global: (d.delta_resid != null && d.delta_eco != null) ? (d.delta_resid + d.delta_eco) / 2 : null,
  delta_amplitude: (d.delta_resid != null && d.delta_eco != null) ? Math.sqrt(d.delta_resid ** 2 + d.delta_eco ** 2) : null
}))
// Commune scatter with delta
const dataCommScatterDelta = isCommune ? (dataCommScatter || []).map(_addDelta).map(d => ({
  ...d,
  delta_global: (d.delta_resid != null && d.delta_eco != null) ? (d.delta_resid + d.delta_eco) / 2 : null,
  delta_amplitude: (d.delta_resid != null && d.delta_eco != null) ? Math.sqrt(d.delta_resid ** 2 + d.delta_eco ** 2) : null
})) : null

// colKey1 = carte gauche = X, colKey2 = carte droite = Y
const colKey1 = activeTab === "libre" ? buildColKey(indic1, periode1) : TAB_DEFS[activeTab].mapLeft
const colKey2 = activeTab === "libre" ? buildColKey(indic2, periode2) : TAB_DEFS[activeTab].mapRight

const indicLabel = activeTab === "libre" ? getIndicLabel(indic1, "medium")
  : activeTab === "trajectoire" ? "△ Résidentiel"
  : activeTab === "t1" ? "Indice résidentiel T1" : "Indice résidentiel T2"
const indicLabel2 = activeTab === "libre" ? getIndicLabel(indic2, "medium")
  : activeTab === "trajectoire" ? "△ Productif"
  : activeTab === "t1" ? "Indice productif T1" : "Indice productif T2"

// Labels avec période pour axes scatter (pas pour trajectoire = delta sans période)
const indicLabelPer = activeTab === "libre"
  ? (periode1 ? `${indicLabel} (${getPeriodeLabel(periode1, "short")})` : indicLabel)
  : activeTab === "t1"
  ? `${indicLabel} (${getPeriodeLabel(IDX.RESID_T1.match(/_(\d+)$/)?.[1] || "", "short")})`
  : activeTab === "niveau"
  ? `${indicLabel} (${getPeriodeLabel(IDX.RESID_T2.match(/_(\d+)$/)?.[1] || "", "short")})`
  : indicLabel
const indicLabelPer2 = activeTab === "libre"
  ? (periode2 ? `${indicLabel2} (${getPeriodeLabel(periode2, "short")})` : indicLabel2)
  : activeTab === "t1"
  ? `${indicLabel2} (${getPeriodeLabel(IDX.ECO_T1.match(/_(\d+)$/)?.[1] || "", "short")})`
  : activeTab === "niveau"
  ? `${indicLabel2} (${getPeriodeLabel(IDX.ECO_T2.match(/_(\d+)$/)?.[1] || "", "short")})`
  : indicLabel2

const echLabel = isCommune ? "Commune >5K" : isEPCI ? "EPCI hors CC" : echelon

const _tabLabel = TAB_DEFS[activeTab]?.label || "Exploration libre"
```
<!-- &e REACTIVE_DATA -->

<!-- &s SUB_BANNER -->
```js
const _sbBlock = document.createElement("div")
_sbBlock.style.cssText = "margin:-8px -20px 0 -16px;padding:0;"

// Header bar : toggle gauche + breadcrumb droite
const _sbBar = document.createElement("div")
_sbBar.style.cssText = "background:#e8eaed;padding:5px 16px;font-size:11.5px;color:#374151;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;gap:12px;"

const _sbToggle = document.createElement("button")
_sbToggle.style.cssText = "background:#f8fafc;border:1px solid #cbd5e1;border-radius:20px;padding:4px 14px 4px 10px;font-size:11.5px;color:#475569;cursor:pointer;display:flex;align-items:center;gap:5px;font-family:inherit;transition:all 0.15s;white-space:nowrap;flex-shrink:0;font-weight:500;"
_sbToggle.innerHTML = `<span style="font-size:9px;transition:transform 0.2s;display:inline-block;${mapSelectionState.size > 0 ? "transform:rotate(90deg);" : ""}" id="_kpi-chevron">▶</span> Profil comparé territoires sélectionnés`
_sbToggle.onmouseenter = () => { _sbToggle.style.borderColor = "#94a3b8"; _sbToggle.style.background = "#f1f5f9"; }
_sbToggle.onmouseleave = () => { _sbToggle.style.borderColor = "#cbd5e1"; _sbToggle.style.background = "#f8fafc"; }

const _sbBreadcrumb = document.createElement("span")
_sbBreadcrumb.style.cssText = "color:#6b7280;font-size:11px;margin-left:auto;white-space:nowrap;"
_sbBreadcrumb.textContent = `${echLabel} · ${_tabLabel} · 2011→2022/23`

_sbBar.appendChild(_sbToggle)
_sbBar.appendChild(_sbBreadcrumb)
_sbBlock.appendChild(_sbBar)

// Contenu rétractable — auto-déplié si sélection active, sinon replié
const _hasSelection = mapSelectionState.size > 0
const _kpiBody = document.createElement("div")
_kpiBody.style.cssText = `overflow:hidden;transition:max-height 0.3s ease, border-color 0.3s;max-height:${_hasSelection ? "600px" : "0px"};border-left:${_hasSelection ? "3px solid #2563eb" : "3px solid transparent"};`

// Toggle
_sbToggle.onclick = () => {
  const collapsed = _kpiBody.style.maxHeight === "0px"
  _kpiBody.style.maxHeight = collapsed ? "600px" : "0px"
  _kpiBody.style.borderLeftColor = collapsed ? "#2563eb" : "transparent"
  const chevron = document.getElementById("_kpi-chevron")
  if (chevron) chevron.style.transform = collapsed ? "rotate(90deg)" : ""
}

const kpiSelCodes = [...mapSelectionState].slice(0, 5)
const kpiSelData = kpiSelCodes.map(c => dataNoFrance.find(d => d.code === c)).filter(Boolean)
const kpiData = [frData, ...kpiSelData].filter(Boolean)

// Tous les idx disponibles + colonnes du tab
const ALL_IDX_COLS = [IDX.RESID_T2, IDX.ECO_T2, IDX.ECO_TOT_T2, IDX.GENTRI_T2, IDX.LOGTENS].filter(Boolean)
const tabSpecific = activeTab === "libre"
  ? [colKey1, colKey2].filter(c => c && !ALL_IDX_COLS.includes(c))
  : TAB_DEFS[activeTab].tableCols.filter(c => !c.startsWith("delta_") && !ALL_IDX_COLS.includes(c))
const kpiTableCols = [...ALL_IDX_COLS, ...tabSpecific]

const availColsKpi = new Set(Object.keys(kpiData[0] || {}))
const kpiTableColsFiltered = kpiTableCols.filter(c => availColsKpi.has(c))

const kpiCols = [
  { key: "libelle", label: "", type: "text", width: 120 },
  ...kpiTableColsFiltered.map(col => {
    const indicK = col.replace(/_\d+$/, "")
    const per = col.match(/_(\d{2,4})$/)?.[1] || ""
    return { key: col, label: getIndicLabel(indicK, "short"), unit: getIndicUnit(col), periode: per ? getPeriodeLabel(per, "short") : "" }
  })
]

const kpiStats = computeBarStats(dataNoFrance, kpiTableColsFiltered)
const kpiTable = renderTable({
  data: kpiData, columns: kpiCols, stats: kpiStats,
  compact: true, maxHeight: 160, scrollX: true, stickyFirstCol: 1
})
const _kpiWrap = document.createElement("div")
_kpiWrap.style.cssText = "padding:4px 16px 8px;background:#fff;"
kpiTable.style.cssText = (kpiTable.style.cssText || "") + "background:#fff;width:100%;"
_kpiWrap.appendChild(kpiTable)
_kpiBody.appendChild(_kpiWrap)

// Décomposition composants idx — visible en mode niveau/trajectoire quand sélection
if (activeTab !== "libre" && kpiSelData.length > 0) {
  const decompBlock = document.createElement("div")
  decompBlock.style.cssText = "padding:4px 16px 8px 16px;background:#fafbfc;border-top:1px solid #e5e7eb;"

  // Idx à décomposer : resid + eco (les 2 cartes)
  const idxPairs = [
    { key: "idxresid_dyn_ind", label: "Résidentiel", idxCol: IDX.RESID_T2 },
    { key: "idxeco_soc_ind", label: "Éco. (social)", idxCol: IDX.ECO_T2 }
  ]

  const availCols = new Set(Object.keys(kpiData[0] || {}))

  for (const { key: idxKey, label: idxLabel, idxCol } of idxPairs) {
    const info = INDICATEURS[idxKey]
    const srcVars = (info?.srcVar || []).filter(sv => availCols.has(sv))
    if (!srcVars.length) continue

    const decompCols = [
      { key: "libelle", label: "", type: "text", width: 100 },
      { key: idxCol, label: `◆ ${idxLabel}`, unit: "ind", isIdx: true },
      ...srcVars.map(sv => {
        const indicK = sv.replace(/_\d+$/, "")
        const per = sv.match(/_(\d{2,4})$/)?.[1] || ""
        return { key: sv, label: getIndicLabel(indicK, "short"), unit: getIndicUnit(sv), periode: per ? getPeriodeLabel(per, "short") : "" }
      })
    ]

    const decompStats = computeBarStats(dataNoFrance, [idxCol, ...srcVars])
    const decompTable = renderTable({
      data: kpiData, columns: decompCols, stats: decompStats,
      compact: true, maxHeight: 120, scrollX: true, stickyFirstCol: 1
    })
    decompTable.style.cssText = (decompTable.style.cssText || "") + "background:#fafbfc;width:100%;font-size:10.5px;"
    decompBlock.appendChild(decompTable)
  }

  const decompLabel = document.createElement("div")
  decompLabel.style.cssText = "font-size:9.5px;color:#9ca3af;font-style:italic;margin-top:2px;"
  decompLabel.textContent = "↑ Décomposition des indices : valeur de chaque composante pour les territoires sélectionnés"
  decompBlock.appendChild(decompLabel)
  _kpiBody.appendChild(decompBlock)
}

_sbBlock.appendChild(_kpiBody)

// Espacement sous le bloc KPI
const _spacer = document.createElement("div")
_spacer.style.cssText = "height:4px;background:#f5f6f7;"
_sbBlock.appendChild(_spacer)

display(_sbBlock)
```
<!-- &e SUB_BANNER -->

<!-- &s MAP_DATA_PREP -->
```js
// Map data: EPCI when commune echelon, otherwise same as scatter data
const _mapDataForDelta = isCommune ? _mapDataRaw.map(d => ({
  ...d,
  delta_resid: (d[IDX.RESID_T2] != null && d[IDX.RESID_T1] != null) ? d[IDX.RESID_T2] - d[IDX.RESID_T1] : null,
  delta_eco: (d[IDX.ECO_T2] != null && d[IDX.ECO_T1] != null) ? d[IDX.ECO_T2] - d[IDX.ECO_T1] : null
})) : dataWithDelta
const mapSourceData = activeTab === "trajectoire" ? _mapDataForDelta : _mapDataRaw

// Join data to geo
if (currentGeo) {
  const geoKey = currentMeta.geoKey
  for (const f of currentGeo.features) {
    const code = f.properties[geoKey] || f.properties.code_insee || f.properties.code
    const row = mapSourceData.find(d => String(d.code) === String(code))
    if (row) {
      f.properties[colKey1] = row[colKey1]
      f.properties[colKey2] = row[colKey2]
      f.properties.P23_POP = row.P23_POP
    }
  }
}

// idx composites (0-100 centered 50) → bleu-bordeaux for niveau/trajectoire tabs
const _isIdx = (k) => k && k.startsWith("idx")

// Bins + colors — CARTE 1
let indicBins, getColor, gradient, ecart, isGradient, isEcart

if (activeTab === "trajectoire") {
  // Trajectoire: écart bleu-bordeaux centré sur 0
  ecart = computeEcartFrance(mapSourceData, colKey1, 0, { indicType: "pct" })
  getColor = ecart.getColor
  indicBins = { bins: { thresholds: ecart.thresholds, labels: ecart.labels }, palette: ecart.palette, isDiv: true, getColor, getBinIdx: ecart.getBinIdx }
  isGradient = false; isEcart = true; gradient = null
} else if (activeTab === "niveau" || activeTab === "t1") {
  // Niveau/T1: indices → écart bleu-bordeaux centré sur 50
  ecart = computeEcartFrance(mapSourceData, colKey1, 50, { indicType: "pct" })
  getColor = ecart.getColor
  indicBins = { bins: { thresholds: ecart.thresholds, labels: ecart.labels }, palette: ecart.palette, isDiv: true, getColor, getBinIdx: ecart.getBinIdx }
  isGradient = false; isEcart = true; gradient = null
} else {
  // Libre: palette sidebar (bins % / ±Fr. / Gradient)
  const indicKey1 = indic1
  indicBins = computeIndicBins(mapSourceData, colKey1, indicKey1)
  gradient = createGradientScale(mapSourceData, colKey1)
  isGradient = colorMode1 === "Grad."
  isEcart = colorMode1 === "±Fr."
  ecart = computeEcartFrance(mapSourceData, colKey1, _mapFrData?.[colKey1], { indicType: INDICATEURS[indicKey1]?.type })
  getColor = isEcart ? ecart.getColor : isGradient ? gradient.getColor : indicBins.getColor
}

// Bins + colors — CARTE 2
let indicBins2, getColor2, gradient2, ecart2, isGradient2, isEcart2

if (activeTab === "trajectoire") {
  ecart2 = computeEcartFrance(mapSourceData, colKey2, 0, { indicType: "pct" })
  getColor2 = ecart2.getColor
  indicBins2 = { bins: { thresholds: ecart2.thresholds, labels: ecart2.labels }, palette: ecart2.palette, isDiv: true, getColor: getColor2, getBinIdx: ecart2.getBinIdx }
  isGradient2 = false; isEcart2 = true; gradient2 = null
} else if (activeTab === "niveau" || activeTab === "t1") {
  ecart2 = computeEcartFrance(mapSourceData, colKey2, 50, { indicType: "pct" })
  getColor2 = ecart2.getColor
  indicBins2 = { bins: { thresholds: ecart2.thresholds, labels: ecart2.labels }, palette: ecart2.palette, isDiv: true, getColor: getColor2, getBinIdx: ecart2.getBinIdx }
  isGradient2 = false; isEcart2 = true; gradient2 = null
} else {
  const indicKey2 = indic2
  indicBins2 = computeIndicBins(mapSourceData, colKey2, indicKey2)
  gradient2 = createGradientScale(mapSourceData, colKey2)
  isGradient2 = colorMode2 === "Grad."
  isEcart2 = colorMode2 === "±Fr."
  ecart2 = computeEcartFrance(mapSourceData, colKey2, _mapFrData?.[colKey2], { indicType: INDICATEURS[indicKey2]?.type })
  getColor2 = isEcart2 ? ecart2.getColor : isGradient2 ? gradient2.getColor : indicBins2.getColor
}
```
<!-- &e MAP_DATA_PREP -->

```js
const searchData = dataNoFrance.map(d => ({ code: d.code, label: d.libelle || d.code, pop: d.P23_POP }))
const searchBox = createSearchBox({
  data: searchData, selection: mapSelectionState, onToggle: toggleMapSelection, onClear: clearMapSelection,
  placeholder: `Rechercher ${echLabel}...`, maxResults: 8, maxChips: 4, maxWidth: 230, showClearAll: true, showCount: true
})
setTimeout(() => {
  const sc = document.getElementById('search-container-attract')
  if (sc) { sc.innerHTML = ''; sc.appendChild(searchBox); }
}, 100)
```

```js
if (!window._zoomStatesAttract) window._zoomStatesAttract = {}
const _zoomVal = zoomTargetState
const defaultZoom = getDefaultZoomCode(isCommune ? "EPCI" : echelon)
const _zoomCheckMap = isCommune ? _mapLabelMap : currentLabelMap
const zoomCode = (_zoomVal && _zoomCheckMap.has(_zoomVal)) ? _zoomVal : defaultZoom
const zoomLabel = _zoomCheckMap.get(zoomCode) || zoomCode
```

<!-- &s CARTES_ET_TABLEAU -->
<div style="display:flex;gap:6px;align-items:stretch;">

<!-- COLONNE GAUCHE : cartes + scatter -->
<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:4px;padding-left:6px;">

```js
// Barre mode visualisation inline avec tabset
const _modeBar = document.createElement("div")
_modeBar.style.cssText = "display:flex;align-items:center;gap:8px;margin:0 0 6px 0;font-family:Inter,system-ui,sans-serif;"

// Tab buttons inline — sync avec le radio sidebar
const _tabBtnWrap = document.createElement("div")
_tabBtnWrap.style.cssText = "display:flex;gap:0;border:1.5px solid #1e40af;border-radius:5px;overflow:hidden;"
const _tabDefs = [
  { key: "libre", label: "Exploration libre", tip: "Choix libre des indicateurs carte et scatter" },
  { key: "t1", label: "Indice T1", tip: "Indices composites période ancienne (2011-16)" },
  { key: "niveau", label: "Indice T2", tip: "Indices composites période récente (2016-22/23)" },
  { key: "trajectoire", label: "Trajectoire T2−T1", tip: "Évolution des indices entre T1 (2011-16) et T2 (2016-22)" }
]
_tabDefs.forEach((td, i) => {
  const btn = document.createElement("button")
  const isActive = activeTab === td.key
  btn.style.cssText = `padding:5px 16px;font-size:11.5px;font-weight:${isActive ? "600" : "400"};border:none;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all 0.15s;${isActive ? "background:#1e40af;color:#fff;" : "background:#eef2ff;color:#1e3a5f;"}${i > 0 ? "border-left:1px solid #6b8cce;" : ""}`
  btn.textContent = td.label
  btn.title = td.tip
  btn.onmouseenter = () => { if (!isActive) btn.style.background = "#dbeafe"; }
  btn.onmouseleave = () => { if (!isActive) btn.style.background = "#eef2ff"; }
  btn.onclick = () => {
    _tabInput.value = td.key
    _tabInput.dispatchEvent(new Event("input", { bubbles: true }))
  }
  _tabBtnWrap.appendChild(btn)
})

const _vueLabel = document.createElement("span")
_vueLabel.style.cssText = "font-size:12px;font-weight:600;color:#1e3a5f;cursor:help;white-space:nowrap;"
_vueLabel.textContent = "Vue"
_vueLabel.title = "Sélectionnez un mode d'exploration : libre (choix indicateurs), indices T1/T2, ou trajectoire (évolution entre périodes)"
_modeBar.appendChild(_vueLabel)
_modeBar.appendChild(_tabBtnWrap)
display(_modeBar)
```

<div class="cards-row">

<div class="card">

```js
// === CARTE 1 (gauche = axe X) ===
const fmtV1 = activeTab === "trajectoire"
  ? v => v != null ? (v > 0 ? "+" : "") + v.toFixed(1) : "—"
  : v => formatValue(colKey1.replace(/_\d+$/, ""), v)

const map = renderChoropleth({
  geoData: currentGeo, valueCol: colKey1,
  getColor: (v, f) => getColor(v),
  getCode: f => f.properties[currentMeta.geoKey],
  getLabel: ({ code }) => _mapLabelMap.get(code) || code,
  formatValue: (k, v) => fmtV1(v),
  indicLabel, selectedCodes: [...mapSelectionState],
  showLabels: showValuesOnMap, labelMode, labelBy, topN: 0,
  title: indicLabel, echelon: isCommune ? "EPCI" : echelon, width: 395, height: 365, maxLabelsAuto: 600
})

const counts = countBins(mapSourceData, colKey1, indicBins.bins.thresholds || [])
const unit = activeTab === "trajectoire" ? "pts" : getIndicUnit(colKey1)
const ecartCounts = (!isEcart || !ecart) ? [] : countBins(mapSourceData, colKey1, ecart.thresholds || [])

// Helper filter for interactive legend (null-safe)
function filterMapPaths(mapEl, geoRef, colK, binFn, colorFn) {
  return (activeIndices) => {
    if (!mapEl || !geoRef?.features) return
    const zc = mapEl.querySelector("g.zoom-content") || mapEl.querySelector("svg")
    if (!zc) return
    const groups = Array.from(zc.children).filter(c => c.tagName === 'g')
    const fp = groups.length >= 2 ? Array.from(groups[1].children).filter(c => c.tagName === 'path') : null
    if (!fp || fp.length < geoRef.features.length * 0.5) return
    fp.forEach((p, i) => {
      if (i >= geoRef.features.length) return
      const v = geoRef.features[i].properties[colK]
      const bi = binFn(v)
      if (bi >= 0 && !activeIndices.has(bi)) {
        p.setAttribute("fill", "#f3f4f6"); p.setAttribute("fill-opacity", "0.15")
      } else {
        p.setAttribute("fill", colorFn(v)); p.setAttribute("fill-opacity", "1")
      }
    })
  }
}

const _legendTitle1 = activeTab === "trajectoire" ? "△ Résid. (pts)"
  : (activeTab === "niveau" || activeTab === "t1") ? "±50 (pts indice)"
  : isEcart && ecart ? `±Fr. (${ecart.isAbsoluteEcart ? "pts" : "%"})`
  : unit || ""

const legend = isEcart && ecart
  ? createEcartFranceLegend({
      palette: ecart.palette, symbols: ECART_FRANCE_SYMBOLS,
      pctLabels: ecart.pctLabels, counts: ecartCounts,
      title: _legendTitle1,
      interactive: true, onFilter: filterMapPaths(map, currentGeo, colKey1, ecart.getBinIdx, getColor)
    })
  : isGradient
  ? createGradientLegend({
      colors: gradient.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradient.min, max: gradient.max, showZero: gradient.divergent,
      decimals: 2, title: unit || "",
      capped: true, rawMin: gradient.rawMin, rawMax: gradient.rawMax
    })
  : createBinsLegend({
      colors: indicBins.palette, labels: indicBins.bins.labels || [], counts,
      vertical: true, unit, reverse: !indicBins.isDiv,
      interactive: true, onFilter: filterMapPaths(map, currentGeo, colKey1, indicBins.getBinIdx, getColor)
    })

if (map) {
  map.style.cursor = "pointer"
  map.addEventListener("click", (e) => {
    const path = e.target.closest("path")
    if (!path) return
    const paths = Array.from(path.parentElement.querySelectorAll("path"))
    const idx = paths.indexOf(path)
    if (idx >= 0 && idx < currentGeo.features.length) {
      const code = currentGeo.features[idx].properties[currentMeta.geoKey]
      if (e.ctrlKey || e.metaKey) addToSelection(code)
      else setZoomOnly(code)
    }
  })
  if (map._tipConfig) {
    map._tipConfig.frRef = _mapFrData?.[colKey1]
    if (ecart) map._tipConfig.frGetEcartInfo = ecart.getEcartInfo
  }
  const wrapper = createMapWrapper(map, null, legend, addZoomBehavior(map, {
    initialTransform: window._zoomStatesAttract.map1,
    onZoom: t => { window._zoomStatesAttract.map1 = t; }
  }), { exportSVGFn: exportSVG, echelon: isCommune ? "EPCI" : echelon, colKey: colKey1, title: indicLabel })
  const frVal = _mapFrData?.[colKey1]
  const zoomRow = _mapDataRaw.find(d => d.code === zoomCode) || _mapDataForDelta.find(d => d.code === zoomCode)
  const zeVal = zoomRow?.[colKey1]
  const valuesDiv = document.createElement("div")
  valuesDiv.style.cssText = "font-size:11px;color:#555;padding:1px 0 0 4px;line-height:1.5;"
  let valHtml = ""
  const _mapZoomLbl = _mapLabelMap.get(zoomCode) || zoomLabel
  if (frVal != null) valHtml += `France : <b style="font-style:italic;">${fmtV1(frVal)}</b>`
  if (zeVal != null) valHtml += `${frVal != null ? " · " : ""}${_mapZoomLbl} : <b style="font-style:italic;color:#1e40af;">${fmtV1(zeVal)}</b>`
  if (valHtml) { valuesDiv.innerHTML = valHtml; wrapper.appendChild(valuesDiv); }
  display(wrapper)
} else {
  display(html`<div style="padding:40px;text-align:center;color:#9ca3af;font-size:12px;">Carte indisponible pour cet échelon/indicateur</div>`)
}
```

</div>

<div class="card">

```js
// === CARTE 2 (droite = axe Y) ===
const fmtV2 = activeTab === "trajectoire"
  ? v => v != null ? (v > 0 ? "+" : "") + v.toFixed(1) : "—"
  : v => formatValue(colKey2.replace(/_\d+$/, ""), v)

const map2 = renderChoropleth({
  geoData: currentGeo, valueCol: colKey2,
  getColor: (v, f) => getColor2(v),
  getCode: f => f.properties[currentMeta.geoKey],
  getLabel: ({ code }) => _mapLabelMap.get(code) || code,
  formatValue: (k, v) => fmtV2(v),
  indicLabel: indicLabel2, selectedCodes: [...mapSelectionState],
  showLabels: showValuesOnMap, labelMode, labelBy, topN: 0,
  title: indicLabel2, echelon: isCommune ? "EPCI" : echelon, width: 395, height: 365, maxLabelsAuto: 600
})

const counts2 = countBins(mapSourceData, colKey2, indicBins2.bins.thresholds || [])
const unit2 = activeTab === "trajectoire" ? "pts" : getIndicUnit(colKey2)
const ecartCounts2 = (!isEcart2 || !ecart2) ? [] : countBins(mapSourceData, colKey2, ecart2.thresholds || [])

const _legendTitle2 = activeTab === "trajectoire" ? "△ Éco. (pts)"
  : (activeTab === "niveau" || activeTab === "t1") ? "±50 (pts indice)"
  : isEcart2 && ecart2 ? `±Fr. (${ecart2.isAbsoluteEcart ? "pts" : "%"})`
  : unit2 || ""

const legend2 = isEcart2 && ecart2
  ? createEcartFranceLegend({
      palette: ecart2.palette, symbols: ECART_FRANCE_SYMBOLS,
      pctLabels: ecart2.pctLabels, counts: ecartCounts2,
      title: _legendTitle2,
      interactive: true, onFilter: filterMapPaths(map2, currentGeo, colKey2, ecart2.getBinIdx, getColor2)
    })
  : isGradient2
  ? createGradientLegend({
      colors: gradient2.divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential,
      min: gradient2.min, max: gradient2.max, showZero: gradient2.divergent,
      decimals: 2, title: unit2 || "",
      capped: true, rawMin: gradient2.rawMin, rawMax: gradient2.rawMax
    })
  : createBinsLegend({
      colors: indicBins2.palette, labels: indicBins2.bins.labels || [], counts: counts2,
      vertical: true, unit: unit2, reverse: !indicBins2.isDiv,
      interactive: true, onFilter: filterMapPaths(map2, currentGeo, colKey2, indicBins2.getBinIdx, getColor2)
    })

if (map2) {
  map2.style.cursor = "pointer"
  map2.addEventListener("click", (e) => {
    const path = e.target.closest("path")
    if (!path) return
    const paths = Array.from(path.parentElement.querySelectorAll("path"))
    const idx = paths.indexOf(path)
    if (idx >= 0 && idx < currentGeo.features.length) {
      const code = currentGeo.features[idx].properties[currentMeta.geoKey]
      if (e.ctrlKey || e.metaKey) addToSelection(code)
      else setZoomOnly(code)
    }
  })
  if (map2._tipConfig) {
    map2._tipConfig.frRef = _mapFrData?.[colKey2]
    if (ecart2) map2._tipConfig.frGetEcartInfo = ecart2.getEcartInfo
  }
  const wrapper2 = createMapWrapper(map2, null, legend2, addZoomBehavior(map2, {
    initialTransform: window._zoomStatesAttract.map2,
    onZoom: t => { window._zoomStatesAttract.map2 = t; }
  }), { exportSVGFn: exportSVG, echelon: isCommune ? "EPCI" : echelon, colKey: colKey2, title: indicLabel2 })
  const frVal2 = _mapFrData?.[colKey2]
  const zeVal2 = (_mapDataRaw.find(d => d.code === zoomCode) || _mapDataForDelta.find(d => d.code === zoomCode))?.[colKey2]
  const valuesDiv2 = document.createElement("div")
  valuesDiv2.style.cssText = "font-size:11px;color:#555;padding:1px 0 0 4px;line-height:1.5;"
  let valHtml2 = ""
  if (frVal2 != null) valHtml2 += `France : <b style="font-style:italic;">${fmtV2(frVal2)}</b>`
  if (zeVal2 != null) valHtml2 += `${frVal2 != null ? " · " : ""}${_mapLabelMap.get(zoomCode) || zoomCode} : <b style="font-style:italic;color:#1e40af;">${fmtV2(zeVal2)}</b>`
  if (valHtml2) { valuesDiv2.innerHTML = valHtml2; wrapper2.appendChild(valuesDiv2); }
  display(wrapper2)
} else {
  display(html`<div style="padding:40px;text-align:center;color:#9ca3af;font-size:12px;">Carte indisponible pour cet échelon/indicateur</div>`)
}
```

</div>

</div>
<!-- Fin cartes -->

<!-- &s SCATTER -->

```js
// === SCATTER PLOT — piloté par activeTab ===
{
  const sCodes = [...mapSelectionState]

  // Commune scatter: ≥30K hab ; sinon toutes données
  const _scBase = isCommune ? (dataCommScatter || []) : dataNoFrance
  const _scBaseDelta = isCommune ? (dataCommScatterDelta || []) : dataWithDeltaGlobal
  const sz = autoSizeScale(_scBaseDelta.map(d => d.P23_POP), { label: "Population", rRange: [3, 14] })

  // Data source per mode
  const scatterData = activeTab === "trajectoire" ? _scBaseDelta : _scBase
  const xCol = activeTab === "trajectoire" ? "delta_resid" : colKey1
  const yCol = activeTab === "trajectoire" ? "delta_eco" : colKey2
  const filtered = scatterData.filter(d => d[xCol] != null && d[yCol] != null)

  let scatterElement = null

  if (filtered.length > 5) {
    const xV = filtered.map(d => d[xCol]).filter(v => v != null).sort((a, b) => a - b)
    const yV = filtered.map(d => d[yCol]).filter(v => v != null).sort((a, b) => a - b)
    const xP01 = xV[Math.floor(xV.length * 0.01)]
    const xP99 = xV[Math.min(Math.floor(xV.length * 0.99), xV.length - 1)]
    const yP01 = yV[Math.floor(yV.length * 0.01)]
    const yP99 = yV[Math.min(Math.floor(yV.length * 0.99), yV.length - 1)]
    const xPad = (xP99 - xP01) * 0.08
    const yPad = (yP99 - yP01) * 0.08

    // Domaine : inclure 0 si proche du range (TCAM autour de 0)
    let xMin = xP01 - xPad, xMax = xP99 + xPad
    let yMin = yP01 - yPad, yMax = yP99 + yPad
    if (activeTab === "trajectoire") {
      xMin = Math.min(xMin, -xPad); xMax = Math.max(xMax, xPad)
      yMin = Math.min(yMin, -yPad); yMax = Math.max(yMax, yPad)
    } else {
      if (xMin > 0 && xMin < (xMax - xMin) * 0.5) xMin = Math.min(0, xMin)
      if (xMax < 0 && Math.abs(xMax) < (xMax - xMin) * 0.5) xMax = Math.max(0, xMax)
      if (yMin > 0 && yMin < (yMax - yMin) * 0.5) yMin = Math.min(0, yMin)
      if (yMax < 0 && Math.abs(yMax) < (yMax - yMin) * 0.5) yMax = Math.max(0, yMax)
    }

    const mX = activeTab === "trajectoire" ? 0 : frData?.[xCol]
    const mY = activeTab === "trajectoire" ? 0 : frData?.[yCol]

    // Annotations + quadrant fills per mode
    const annotations = []
    // Quadrant background rectangles (very subtle tints)
    const quadrantRects = []
    if ((activeTab === "niveau" || activeTab === "t1") && mX != null && mY != null) {
      const midXR = (mX + xMax) / 2, midXL = (xMin + mX) / 2
      const midYT = (mY + yMax) / 2, midYB = (yMin + mY) / 2
      quadrantRects.push(
        { x1: mX, x2: xMax, y1: mY, y2: yMax, fill: "rgba(5,48,97,0.04)" },   // top-right: attractif (bleu)
        { x1: xMin, x2: mX, y1: mY, y2: yMax, fill: "rgba(100,100,100,0.03)" }, // top-left
        { x1: mX, x2: xMax, y1: yMin, y2: mY, fill: "rgba(100,100,100,0.03)" }, // bottom-right
        { x1: xMin, x2: mX, y1: yMin, y2: mY, fill: "rgba(103,0,31,0.04)" }     // bottom-left: faible (bordeaux)
      )
      annotations.push(
        { x: midXR, y: midYT, text: "Attractif global", color: "rgba(5,48,97,0.45)", fontSize: 11, fontWeight: 600 },
        { x: midXL, y: midYT, text: "Productif seul", color: "rgba(80,80,80,0.35)", fontSize: 11, fontWeight: 600 },
        { x: midXR, y: midYB, text: "Résidentiel seul", color: "rgba(80,80,80,0.35)", fontSize: 11, fontWeight: 600 },
        { x: midXL, y: midYB, text: "Faible attractivité", color: "rgba(103,0,31,0.45)", fontSize: 11, fontWeight: 600 }
      )
    } else if (activeTab === "trajectoire") {
      quadrantRects.push(
        { x1: 0, x2: xMax, y1: 0, y2: yMax, fill: "rgba(26,152,80,0.05)" },   // top-right: progression (vert)
        { x1: xMin, x2: 0, y1: 0, y2: yMax, fill: "rgba(100,100,100,0.025)" },
        { x1: 0, x2: xMax, y1: yMin, y2: 0, fill: "rgba(100,100,100,0.025)" },
        { x1: xMin, x2: 0, y1: yMin, y2: 0, fill: "rgba(215,48,39,0.05)" }     // bottom-left: déclin (rouge)
      )
      annotations.push(
        { x: xMax * 0.55, y: yMax * 0.7, text: "Progression globale", color: "rgba(34,139,34,0.4)", fontSize: 12, fontWeight: 700 },
        { x: xMin * 0.55, y: yMax * 0.7, text: "Rebond productif", color: "rgba(100,100,100,0.35)", fontSize: 11, fontWeight: 600 },
        { x: xMax * 0.55, y: yMin * 0.7, text: "Rebond résidentiel", color: "rgba(100,100,100,0.35)", fontSize: 11, fontWeight: 600 },
        { x: xMin * 0.55, y: yMin * 0.7, text: "Déclin global", color: "rgba(180,50,50,0.4)", fontSize: 12, fontWeight: 700 }
      )
    }

    const topPop = filtered.sort((a, b) => (b.P23_POP || 0) - (a.P23_POP || 0)).slice(0, 8).map(d => d.code)
    const lCodes = [...new Set([...sCodes, ...topPop])]

    // Labels axes = nom indicateur SANS période (période dans l'unité)
    const xLbl = indicLabel
    const yLbl = indicLabel2

    // Units dynamiques : unit ddict + période — format "unité, période"
    const _xPer = activeTab === "trajectoire" ? "11→22"
      : activeTab === "t1" ? getPeriodeLabel(IDX.RESID_T1.match(/_(\d+)$/)?.[1] || "", "short")
      : activeTab === "niveau" ? getPeriodeLabel(IDX.RESID_T2.match(/_(\d+)$/)?.[1] || "", "short")
      : getPeriodeLabel(periode1, "short")
    const _yPer = activeTab === "trajectoire" ? "11→22"
      : activeTab === "t1" ? getPeriodeLabel(IDX.ECO_T1.match(/_(\d+)$/)?.[1] || "", "short")
      : activeTab === "niveau" ? getPeriodeLabel(IDX.ECO_T2.match(/_(\d+)$/)?.[1] || "", "short")
      : getPeriodeLabel(periode2, "short")
    const _xBaseUnit = activeTab === "libre" ? getIndicUnit(colKey1) : (activeTab === "trajectoire" ? "pts" : "indice")
    const _yBaseUnit = activeTab === "libre" ? getIndicUnit(colKey2) : (activeTab === "trajectoire" ? "pts" : "indice")
    const xUn = _xPer ? `${_xBaseUnit}, ${_xPer}` : _xBaseUnit
    const yUn = _yPer ? `${_yBaseUnit}, ${_yPer}` : _yBaseUnit
    const _scEchLabel = isCommune ? "Commune >30K" : echLabel
    const scTitle = (activeTab === "niveau" || activeTab === "t1") ? `${TAB_DEFS[activeTab].label} — Résidentiel × Productif (${_scEchLabel})`
      : activeTab === "trajectoire" ? `Trajectoire — △ Résidentiel × △ Productif (${_scEchLabel})`
      : `${indicLabel} — ${indicLabel2} (${_scEchLabel})`
    const scSubtitle = `${filtered.length} territoires`

    // Couleur par densité (dens3: "1"=Dense, "2"=Intermédiaire, "3"=Rural)
    const densColor = d => DENS_COLORS[d.dens3] || "#999"

    scatterElement = createScatterWithZoom({
      data: filtered, xCol, yCol,
      xDomain: [xMin, xMax], yDomain: [yMin, yMax],
      xLabel: xLbl, yLabel: yLbl,
      xUnit: xUn, yUnit: yUn,
      meanX: mX, meanY: mY,
      sourceText: activeTab === "trajectoire" ? "INSEE RP, MIGCOM, URSSAF" : null,
      getRadius: d => sz.getRadius(d.P23_POP),
      getColor: densColor,
      isSelected: d => sCodes.includes(d.code),
      getTooltip: d => buildScatterTooltip(d, xCol, yCol, filtered, mX, mY),
      width: 820, height: 350,
      labelCodes: lCodes, labelMode,
      _customTooltip: true, annotations, quadrantRects,
      title: scTitle, subtitle: scSubtitle,
      legend: [
        { label: `${DENS_LABELS["1"]} (${filtered.filter(d => d.dens3 === "1").length})`, color: DENS_COLORS["1"] },
        { label: `${DENS_LABELS["2"]} (${filtered.filter(d => d.dens3 === "2").length})`, color: DENS_COLORS["2"] },
        { label: `${DENS_LABELS["3"]} (${filtered.filter(d => d.dens3 === "3").length})`, color: DENS_COLORS["3"] }
      ],
      sizeLabel: createSizeLegendVertical(sz.bins, "Population"),
      fillOpacity: 0.65
    })
  }

  if (scatterElement) {
    display(scatterElement)
  } else {
    display(html`<div style="padding:20px;text-align:center;color:#6b7280;font-size:11px;">Données insuffisantes pour ce scatter</div>`)
  }
}
```
<!-- &e SCATTER -->

```js
{
  const noteText = (activeTab === "niveau" || activeTab === "t1")
    ? `Chaque point = 1 ${echLabel.toLowerCase()}. X = indice résidentiel, Y = productif (${activeTab === "t1" ? "T1" : "T2"}). Lignes pointillées = valeur France.`
    : activeTab === "trajectoire"
    ? `Chaque point = 1 ${echLabel.toLowerCase()}. X = △ résidentiel, Y = △ productif (T1→T2). Centre (0,0) = stable. Cadran haut-droit = progression globale.`
    : `Chaque point = 1 ${echLabel.toLowerCase()}. Carte gauche = axe X, Carte droite = axe Y.`
  display(html`<p style="font-size:10px;color:#6b7280;margin:2px 0 8px 0;font-style:italic;max-width:820px;">${noteText}</p>`)
}
```

</div>
<!-- Fin COLONNE GAUCHE -->

<!-- COLONNE DROITE : table -->
<div style="flex:1;min-width:300px;display:flex;flex-direction:column;">

```js
const _tblLabel = isCommune ? "Commune >30K" : echLabel
display(html`<h3 style="margin:0 0 4px 0;">Tableau ${_tblLabel}<span class="table-help-wrap"><span class="table-help-icon">?</span><span class="help-tooltip"><b>Couleurs</b> : intensit&eacute; proportionnelle &agrave; l'&eacute;cart par rapport &agrave; la moyenne.<br>&bull; <span style="color:#98cf90">&#9632;</span> Vert = au-dessus<br>&bull; <span style="color:#e46aa7">&#9632;</span> Violet = en-dessous</span></span></h3>`)
```

<div class="card" style="flex:1;padding:6px;display:flex;flex-direction:column;min-height:0;">

```js
const echSortState2 = Mutable({ col: IDX.RESID_T2, asc: false })
const setEchSort2 = (col) => {
  const curr = echSortState2.value.col
  const asc = echSortState2.value.asc
  echSortState2.value = curr === col ? { col, asc: !asc } : { col, asc: false }
}
```

```js
const echSearchInput2 = view(Inputs.text({ placeholder: `Rechercher ${echLabel}...`, width: 200 }))
```

```js
const selectedExtraIndics = extraIndics || []
const extraCols = selectedExtraIndics.filter(i => !i.startsWith("__sep_")).map(i => buildColKey(i, getDefaultPeriode(i)))

const tabTableCols = activeTab === "libre"
  ? [colKey1, colKey2, ...TAB_DEFS.libre.tableCols]
  : TAB_DEFS[activeTab].tableCols

const availCols = new Set(Object.keys((dataNoFrance[0] || {})))
const filteredTabCols = tabTableCols.filter(c => c.startsWith("delta_") || availCols.has(c))
const allAttrCols = [...new Set([...filteredTabCols, ...extraCols])]

// Commune: tableau light ≥30K à côté du scatter ; sinon toutes données
const _tblData = isCommune ? (dataCommTable || []) : dataNoFrance
const _tblDataDelta = isCommune ? (dataCommScatterDelta || []) : dataWithDelta
const echTableData = activeTab === "trajectoire"
  ? (frData ? [{ ...frData, delta_resid: null, delta_eco: null }, ..._tblDataDelta] : _tblDataDelta)
  : (frData ? [frData, ..._tblData] : _tblData)

const echSearchVal2 = (echSearchInput2 || "").toLowerCase()
const echFiltered2 = echSearchVal2
  ? echTableData.filter(d => d.code === "00FR" || (d.libelle || "").toLowerCase().includes(echSearchVal2) || (d.code || "").includes(echSearchVal2))
  : echTableData

const echSortCol2 = echSortState2.col
const echSortAsc2 = echSortState2.asc
const echSorted2 = sortTableData(echFiltered2, echSortCol2, echSortAsc2)
const echStats2 = computeBarStats(echFiltered2, allAttrCols)

const echColumns2 = [
  { key: "libelle", label: echLabel, type: "text", width: 130 },
  ...allAttrCols.map(col => {
    if (col === "delta_resid") return { key: col, label: "△ Résid.", unit: "pts", periode: "T2−T1" }
    if (col === "delta_eco") return { key: col, label: "△ Éco.", unit: "pts", periode: "T2−T1" }
    const indicK = col.replace(/_\d+$/, "")
    const per = col.match(/_(\d{2,4})$/)?.[1] || ""
    return {
      key: col,
      label: getIndicLabel(indicK, "short"),
      unit: getIndicUnit(col),
      periode: per ? getPeriodeLabel(per, "short") : ""
    }
  })
]

display(html`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
  <span style="font-size:10px;color:#6b7280;">${echFiltered2.length} ${echLabel}</span>
  <div style="display:flex;gap:4px;">
    <button style="font-size:10px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;"
      onclick=${() => exportCSV(echSorted2, echColumns2, "attract_" + echelon.replace(/[^a-zA-Z]/g, "") + "_" + new Date().toISOString().slice(0,10) + ".csv")}>
      CSV
    </button>
    <button style="font-size:12px;padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;cursor:pointer;" title="Plein écran"
      onclick=${() => { const t = document.querySelector(".attract-table-fs-target"); if (t) openTableFullscreen(t); }}>
      &#x2922
    </button>
  </div>
</div>`)

const _attrTblWrap = document.createElement("div")
_attrTblWrap.className = "attract-table-fs-target"
_attrTblWrap.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;"
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
}))
display(_attrTblWrap)
void 0
```

</div>
</div>
<!-- Fin COLONNE DROITE -->

</div>
<!-- &e CARTES_ET_TABLEAU -->

</div>
<!-- &e LAYOUT_MAIN -->
