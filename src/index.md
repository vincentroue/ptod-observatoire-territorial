---
title: ObTer — Observatoire Territorial
toc: false
sidebar: false
pager: false
style: styles/dashboard-light.css
---

<style>
/* &s IDX_STYLES — Landing page medley v9 */
body { padding-top: 0 !important; }
.banner { display: none !important; }

.idx-mega-banner {
  background: linear-gradient(135deg, #0a1929 0%, #132f4c 60%, #1a3f5c 100%);
  color: #fff; padding: 14px 24px 12px; position: relative;
}
.idx-mb-row1 { display: flex; align-items: center; gap: 16px; }
.idx-mb-brand { flex: 1; }
.idx-mb-brand h1 { font-size: 22px; font-weight: 700; margin: 0; font-family: Inter, sans-serif; color: #fff; letter-spacing: -0.3px; }
.idx-mb-brand h1 span { color: #60a5fa; font-weight: 300; }
.idx-mb-nav { display: flex; gap: 5px; flex-wrap: wrap; flex-shrink: 0; }
.idx-mb-nav a {
  display: inline-block; padding: 4px 11px; border-radius: 4px; font-size: 11px; font-weight: 500;
  text-decoration: none; color: #e2e8f0; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
  transition: all .15s; white-space: nowrap;
}
.idx-mb-nav a:hover { background: rgba(255,255,255,0.18); color: #fff; }
.idx-mb-nav a.active { background: rgba(96,165,250,0.25); border-color: rgba(96,165,250,0.5); color: #60a5fa; }
.idx-mb-nav a.deprecated { opacity: 0.4; }
.idx-mb-nav a.disabled { opacity: 0.3; pointer-events: none; }
.idx-mb-q { font-size: 12.5px; color: #c0d4e8; margin: 8px 0 0; line-height: 1.5; max-width: 800px; }
.idx-mb-q b { color: #60a5fa; font-weight: 600; }
/* KPI moved to sidebar */

.idx-cols { display: flex; min-height: calc(100vh - 100px); }
.idx-col-left {
  flex: 0 0 200px; background: #1b2a3e; color: #e2e8f0; padding: 12px 12px 20px;
  overflow-y: auto; font-family: Inter, sans-serif;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.idx-col-right { flex: 1; background: #f0f4f8; padding: 8px 10px; overflow-y: auto; transition: margin 0.3s ease; }

/* Sidebar toggle button */
.idx-sb-toggle {
  position: fixed; top: 52px; left: 200px; width: 22px; z-index: 96;
  background: #c5cad3; border: 1px solid #b0b6c0; border-left: none;
  border-radius: 0 6px 6px 0; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 8px 2px;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease;
  box-shadow: 1px 0 4px rgba(0,0,0,0.08);
}
.idx-sb-toggle:hover { background: #a8afba; }
.idx-sb-toggle .tg-chev { font-size: 11px; font-weight: 700; color: #556; line-height: 1; }
.idx-sb-toggle .tg-lbl {
  writing-mode: vertical-rl; text-orientation: mixed;
  font-size: 9px; font-weight: 600; color: #556; letter-spacing: 0.5px;
}

/* Sidebar collapsed state */
.idx-cols.idx-collapsed .idx-col-left { transform: translateX(-200px); margin-left: -200px; }
.idx-cols.idx-collapsed + .idx-sb-toggle,
.idx-collapsed ~ .idx-sb-toggle { left: 0; width: 24px; border-left: 1px solid #b0b6c0; background: #d0d5dd; }
body.idx-sb-off .idx-sb-toggle { left: 0; width: 24px; border-left: 1px solid #b0b6c0; background: #d0d5dd; }
body.idx-sb-off .idx-col-left { transform: translateX(-200px); margin-left: -200px; }

.idx-l-title { font-size: 10px; font-weight: 600; color: #8899aa; text-transform: uppercase; letter-spacing: 0.5px; margin: 10px 0 6px; }
.idx-volet {
  display: flex; align-items: center; gap: 6px; padding: 5px 6px; margin-bottom: 3px;
  border-radius: 4px; text-decoration: none; color: inherit;
  transition: background .12s; border-left: 3px solid var(--vc, #2171b5);
}
.idx-volet:hover { background: rgba(255,255,255,0.1); }
.idx-volet .v-icon { font-size: 15px; flex-shrink: 0; width: 20px; text-align: center; color: rgba(255,255,255,0.4); }
.idx-volet .v-body { min-width: 0; }
.idx-volet .v-title { font-weight: 600; font-size: 12px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.idx-volet .v-desc { font-size: 9px; color: #94a3b8; line-height: 1.3; }
.idx-l-kpi { font-size: 10px; color: #c0d4e8; line-height: 1.6; }
.idx-l-kpi b { color: #60a5fa; font-weight: 700; }
.idx-l-src { font-size: 9px; color: #94a3b8; line-height: 1.5; margin-top: 4px; }
.idx-l-src b { color: #c0d4e8; font-weight: 600; }

/* Section label — sample warning */
.idx-section-label {
  font-size: 12.5px; font-weight: 700; color: #7c1d47; font-style: italic;
  margin-bottom: 3px; padding: 4px 8px; font-family: Inter, sans-serif;
  background: #fdf2f8; border: 1px solid #f9a8d4; border-radius: 4px;
  line-height: 1.4;
}
.idx-section-label .idx-sl-sub { font-size: 10px; font-weight: 500; color: #9f1239; display: block; margin-top: 1px; }

/* Search selector in sidebar */
.idx-search-sidebar { margin: 4px 0; }
.idx-search-sidebar input[type="text"] { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #e2e8f0; border-radius: 3px; font-size: 10px; padding: 3px 6px; width: 100%; }
.idx-search-sidebar input[type="text"]::placeholder { color: #8899aa; }
.idx-search-sidebar .search-chip { font-size: 9px; }

/* Controls bar — 2 compact rows, packed left */
.idx-ctrl-bar {
  display: flex; flex-direction: column; gap: 0px;
  padding: 2px 3px; margin-bottom: 3px; background: #fff;
  border: 1px solid #e2e8f0; border-radius: 4px; font-family: Inter, sans-serif;
  width: fit-content; max-width: 100%;
}
.idx-ctrl-row { display: flex; align-items: center; gap: 2px; flex-wrap: nowrap; }
.idx-ctrl-grp {
  display: inline-flex; align-items: center; gap: 2px;
  background: #f8f9fb; border: 1px solid #e5e7eb; border-radius: 3px; padding: 1px 3px;
  flex-shrink: 0;
}
.idx-ctrl-bar select, .idx-ctrl-grp select { font-size: 9px !important; padding: 0 2px !important; border: 1px solid #d1d5db; border-radius: 3px; height: 18px; width: auto !important; min-width: 0 !important; max-width: 130px !important; margin: 0 !important; }
.idx-ctrl-bar form, .idx-ctrl-grp form { display: inline-flex !important; gap: 0; font-size: 8px; margin: 0 !important; width: auto !important; }
.idx-ctrl-bar form label, .idx-ctrl-grp form label { font-size: 8px; padding: 0 2px; }
.idx-ctrl-bar input[type="radio"], .idx-ctrl-grp input[type="radio"] { width: 9px; height: 9px; margin: 0 0 0 1px; }
.cb-label { font-size: 8px; font-weight: 700; color: #374151; white-space: nowrap; margin-right: 2px; }
.cb-sublabel { font-size: 7px; color: #9ca3af; white-space: nowrap; }
.cb-period { font-size: 7.5px; color: #9ca3af; font-style: italic; white-space: nowrap; margin: 0 1px; }
.cb-sep { color: #d1d5db; font-size: 9px; margin: 0; }
.idx-per-slot { flex-shrink: 0; }
.idx-per-slot form { display: inline-flex !important; margin: 0 !important; width: auto !important; }
.idx-per-slot select { font-size: 8px !important; padding: 0 2px !important; border: 1px solid #d1d5db; border-radius: 3px; max-width: 55px !important; height: 18px; width: auto !important; margin: 0 !important; }

.idx-row { display: flex; gap: 5px; margin-bottom: 5px; align-items: stretch; }
.idx-row > div { min-width: 0; }
.idx-row .idx-ill { height: 100%; box-sizing: border-box; }

.idx-ill { background: #fff; border: 1px solid #e2e8f0; border-radius: 5px; padding: 4px 6px; overflow: hidden; position: relative; }
.idx-ill .it { font-size: 9.5px; font-weight: 600; color: #374151; margin-bottom: 2px; }
.idx-ill .ist { font-size: 8px; color: #9ca3af; margin-bottom: 2px; }
.idx-ill .in { font-size: 7.5px; color: #94a3b8; font-style: italic; text-align: right; margin-top: 1px; }
.idx-ill .link-more { font-size: 8px; color: #2563eb; text-decoration: none; display: inline-block; margin-top: 1px; }
.idx-ill .link-more:hover { text-decoration: underline; }

.idx-leg-wrap { margin-top: 1px; }
.idx-maplibre-wrap { width: 100%; height: 270px; border-radius: 4px; overflow: hidden; }

.idx-tbl-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 5px; padding: 5px 7px; }
.idx-tbl-wrap .it { font-size: 9.5px; font-weight: 600; color: #374151; margin-bottom: 3px; }

.idx-scatter-wrap { overflow: hidden; }
.idx-scatter-wrap .scatter-container { width: 100% !important; margin: 0 !important; padding: 0 !important; }
.idx-scatter-wrap .map-title { font-size: 9.5px !important; font-weight: 600; color: #374151; margin: 0; }
.idx-scatter-wrap .map-subtitle { font-size: 8px !important; color: #9ca3af; margin: 0; }
/* Reduce scatter internal whitespace */
.idx-scatter-wrap svg { max-width: 100%; }

/* MapLibre tooltip */
.idx-maplibre-wrap .maplibregl-popup-content {
  background: rgba(15, 23, 42, 0.92) !important;
  color: #e2e8f0 !important; border-radius: 5px !important;
  padding: 8px 11px !important; font-size: 11.5px !important; line-height: 1.45 !important; max-width: 300px !important;
}

.idx-foot { text-align: center; font-size: 8px; color: #94a3b8; padding: 6px; border-top: 1px solid #e2e8f0; }

/* Fullscreen overlay */
.idx-expand-btn {
  position: absolute; top: 3px; right: 3px; z-index: 5;
  font-size: 12px; cursor: pointer; background: rgba(255,255,255,0.9);
  border: 1px solid #d1d5db; border-radius: 3px; padding: 1px 5px; color: #6b7280;
  line-height: 1.4; opacity: 0.4; transition: opacity .15s;
}
.idx-expand-btn:hover { opacity: 1; background: #fff; }
.idx-fs-overlay {
  position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
}
.idx-fs-box {
  background: #fff; border-radius: 8px; padding: 20px; width: 90vw; height: 85vh;
  overflow: auto; position: relative; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.idx-fs-close {
  position: absolute; top: 8px; right: 12px; font-size: 22px; cursor: pointer;
  background: none; border: none; color: #374151; font-weight: 500;
}

@media (max-width: 1000px) {
  .idx-cols { flex-direction: column; }
  .idx-col-left { flex: none; }
  .idx-row { flex-direction: column; }
  .idx-mb-row1 { flex-direction: column; }
  .idx-ctrl-bar { flex-wrap: wrap; }
}
/* &e IDX_STYLES */
</style>

```js
// &s IMPORTS
import * as topojson from "npm:topojson-client";
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import rewind from "npm:@mapbox/geojson-rewind";

import { OTTD_PAGES, IS_DEV } from "./helpers/layout.js";
import { computeIndicBins, PAL_SEQ7_BYRV, PAL_ECART_FRANCE, PAL_PURPLE_GREEN, computeEcartFrance, ECART_FRANCE_SYMBOLS, countBins } from "./helpers/colors.js";
import { renderChoropleth, addZoomBehavior, PROJECTION_FRANCE } from "./helpers/maps.js";
import { INDICATEURS, PERIODES, THEMES, formatValue, getColLabel, getSource } from "./helpers/indicators-ddict-js.js";
import { parseColKey } from "./helpers/indicators-ddict-ext.js";
import { getPeriodesForIndicateur, getDefaultPeriode, buildColKey } from "./helpers/selectindic.js";
import { createScatterWithZoom } from "./helpers/scatter.js";
import { autoSizeScale, createSizeLegendVertical } from "./helpers/size-scale.js";
import { DENS_COLORS, DENS_LABELS } from "./helpers/constants.js";
import { initTooltip, showTooltip, hideTooltip, buildScatterTooltip, buildTerritoryTooltip } from "./helpers/tooltip.js";
import { renderButterflyMulti } from "./helpers/graph-butterfly.js";
import { renderTreemapA5A21 } from "./helpers/graph-treemap.js";
import { createBinsLegendBar, createGradientLegend, createEcartFranceLegend } from "./helpers/legend.js";
import { buildDataTable } from "./helpers/tableojs.js";
import { createOTTDMap, buildChoroplethSource, computeBounds } from "./helpers/maplibre.js";
import { createSearchBox } from "./helpers/search.js";
// &e
```

```js
// &s DATA_LOAD
const depData    = await FileAttachment("data/idx/agg_dep_idx.json").json();
const depTopo    = await FileAttachment("data/nodom_departement_2025.topojson").json();
const zeData     = await FileAttachment("data/idx/agg_ze_idx.json").json();
const zeTopo     = await FileAttachment("data/nodom_zones-emploi_2025.topojson").json();
const irisTopo   = await FileAttachment("dpgent/iris_pgent_idf.topojson").json();
const irisData   = await FileAttachment("data/idx/iris_idf.json").json();
const frSerieRaw = await FileAttachment("data/idx_serie_emploi_france.json").json();
const zeSerieRaw = await FileAttachment("data/idx/serie_emploi_5ze.json").json();
const frSecteurs = await FileAttachment("data/urssaf_secteurs_a21_france.json").json();
const zeSecteurs = await FileAttachment("data/urssaf_secteurs_a21_ze.json").json();
initTooltip();

const depGeo  = rewind(topojson.feature(depTopo, depTopo.objects.data), true);
const zeGeo   = rewind(topojson.feature(zeTopo, zeTopo.objects.data), true);

// IRIS: filter to dpgent scope (Paris 20 arr. + 27 communes limitrophes)
const PGENT_IDF = new Set([
  ...Array.from({length: 20}, (_, i) => `751${String(i + 1).padStart(2, "0")}`),
  "92024","92044","92051","92062","92026","92012","92040","92075","92046","92049","92020",
  "93070","93066","93001","93055","93061","93045","93063","93006","93048",
  "94080","94067","94018","94041","94043","94037","94003"
]);
const irisAllFeatures = topojson.feature(irisTopo, irisTopo.objects.data).features;
const irisFeatures = irisAllFeatures.filter(f => PGENT_IDF.has(f.properties.code_insee));
const irisGeoFiltered = rewind({ type: "FeatureCollection", features: irisFeatures }, true);
// Commune-level merged geometries
const communeCodes = [...PGENT_IDF];
const communeFeatures = communeCodes.map(code => {
  const geoms = irisTopo.objects.data.geometries.filter(g => g.properties.code_insee === code);
  if (!geoms.length) return null;
  const merged = topojson.merge(irisTopo, geoms);
  return { type: "Feature", properties: { code_insee: code }, geometry: merged };
}).filter(Boolean);
const communeGeo = rewind({ type: "FeatureCollection", features: communeFeatures }, true);
// IRIS data filtered
const irisDataFiltered = irisData.filter(d => {
  const commune = String(d.code).slice(0, 5);
  return PGENT_IDF.has(commune);
});
// Commune aggregation from IRIS
const communeAgg = {};
irisDataFiltered.forEach(d => {
  const com = String(d.code).slice(0, 5);
  if (!communeAgg[com]) communeAgg[com] = { code: com, libelle: d.libelle_com || com, P22_POP: 0, _count: 0 };
  communeAgg[com].P22_POP += d.P22_POP || 0;
  communeAgg[com]._count++;
});
const communeData = Object.values(communeAgg);

const depLookup  = new Map(depData.map(d => [String(d.code), d]));
const zeLookup   = new Map(zeData.map(d => [String(d.code), d]));

const depNoFr = depData.filter(d => d.code !== "00FR");
const zeNoFr  = zeData.filter(d => d.code !== "00FR");
const frRowDep = depData.find(d => d.code === "00FR");
const frRowZe  = zeData.find(d => d.code === "00FR");

// divGauge pour tableojs
window.divGauge = function(val, mean, std) {
  if (std === 0 || isNaN(val) || isNaN(mean)) return { bar: "#b8c2cc", text: "#555", op: 0.45 };
  const z = (val - mean) / std;
  if (z > 2)   return { bar: "#7c1d47", text: "#7c1d47", op: 0.88 };
  if (z > 1)   return { bar: "#a83271", text: "#a83271", op: 0.7 };
  if (z > 0.3) return { bar: "#d4739d", text: "#c44d80", op: 0.55 };
  if (z < -2)  return { bar: "#154360", text: "#154360", op: 0.88 };
  if (z < -1)  return { bar: "#1a6fa0", text: "#1a6fa0", op: 0.7 };
  if (z < -0.3) return { bar: "#5dade2", text: "#2e86c1", op: 0.55 };
  return { bar: "#b8c2cc", text: "#666", op: 0.4 };
};

// DDICT for tableojs headers
window.DDICT = {};
const ALL_DATA_KEYS = [...new Set([...Object.keys(depData[0] || {}), ...Object.keys(zeData[0] || {})])];
for (const fullKey of ALL_DATA_KEYS) {
  if (["code", "libelle", "dens3", "P22_POP", "P23_POP"].includes(fullKey)) continue;
  const parsed = parseColKey(fullKey);
  if (parsed && INDICATEURS[parsed.indic]) {
    const ind = INDICATEURS[parsed.indic];
    window.DDICT[fullKey] = {
      short: ind.short || ind.label || fullKey,
      unit: ind.unit || "",
      desc: ind.definition || "",
      type: (ind.symbol === "\u25b3" || fullKey.includes("vevol") || fullKey.includes("vtcam")) ? "evol" : "stock"
    };
  } else {
    window.DDICT[fullKey] = { short: fullKey.replace(/_/g, " "), unit: "", desc: "", type: "stock" };
  }
}

const IRIS_COLS = irisDataFiltered.length > 0
  ? Object.keys(irisDataFiltered[0]).filter(k => !["code","libelle","libelle_com","TYP_IRIS","P22_POP","_row"].includes(k))
  : [];
// &e
```

```js
// &s CONTROLS — ddict-based indicator + period selectors
const availCols = new Set([...Object.keys(depData[0] || {}), ...Object.keys(zeData[0] || {})]);

// Build indicator list sorted by theme/ordre, filtered by available data
const indicKeys = Object.entries(INDICATEURS)
  .filter(([k, v]) => v.periodes?.some(p => availCols.has(`${k}_${p.replace("_","")}`)))
  .sort((a, b) => {
    const ta = THEMES[a[1].theme]?.ordre || 99, tb = THEMES[b[1].theme]?.ordre || 99;
    if (ta !== tb) return ta - tb;
    return (a[1].ordre || 99) - (b[1].ordre || 99);
  })
  .map(([k]) => k);
const fmtIndic = k => INDICATEURS[k]?.short || INDICATEURS[k]?.medium || k;

const MODES = ["Bins", "Ecart moy.", "Gradient"];

// Carte 1 — indicator key (sans periode)
const indicInputA = Inputs.select(indicKeys, { value: "dm_sma_vtcam", format: fmtIndic });
const indicKeyA = Generators.input(indicInputA);
const modeInputA = Inputs.select(MODES, { value: "Bins" });
const modeA = Generators.input(modeInputA);

// Carte 2 — indicator key
const indicInputB = Inputs.select(indicKeys, { value: "logd_px2q2_appt", format: fmtIndic });
const indicKeyB = Generators.input(indicInputB);
const modeInputB = Inputs.select(MODES, { value: "Bins" });
const modeB = Generators.input(modeInputB);

// Echelon — per carte
const echInputA = Inputs.radio(new Map([["Dep.", "DEP"], ["Zone emploi", "ZE"]]), { value: "DEP" });
const echA = Generators.input(echInputA);
const echInputB = Inputs.radio(new Map([["Dep.", "DEP"], ["Zone emploi", "ZE"]]), { value: "DEP" });
const echB = Generators.input(echInputB);

const searchSel = Mutable(new Set());

function getPeriodLabel(colKey) {
  const p = parseColKey(colKey);
  if (!p?.periode) return "";
  return PERIODES[p.periode]?.short || p.periode;
}
// &e
```

```js
// &s BANNER
const _banner = document.createElement("div");
_banner.className = "idx-mega-banner";
const row1b = document.createElement("div"); row1b.className = "idx-mb-row1";
const brand = document.createElement("div"); brand.className = "idx-mb-brand";
brand.innerHTML = `<h1>ObTer <span>\u2014</span> Observatoire Territorial</h1>`;
row1b.appendChild(brand);
const nav = document.createElement("div"); nav.className = "idx-mb-nav";
const _visiblePages = IS_DEV ? OTTD_PAGES : OTTD_PAGES.filter(p => !p.devOnly);
_visiblePages.forEach(p => {
  const a = document.createElement("a");
  a.href = p.disabled ? "#" : p.href; a.textContent = p.label;
  if (p.title) a.title = p.title;
  if (p.id === "__index__") a.classList.add("active");
  if (p.deprecated) a.classList.add("deprecated");
  if (p.disabled) a.classList.add("disabled");
  nav.appendChild(a);
});
row1b.appendChild(nav); _banner.appendChild(row1b);
const q = document.createElement("p"); q.className = "idx-mb-q";
q.innerHTML = `Dynamiques territoriales : demographie, emploi, logement, attractivite, revenus \u2014 35 000 communes, 306 ZE, 8 echelons.`;
_banner.appendChild(q);
// KPI strip moved to sidebar
display(_banner);
// &e
```

```js
// &s LAYOUT_SKELETON
const cols = document.createElement("div"); cols.className = "idx-cols";

// LEFT SIDEBAR
const leftCol = document.createElement("div"); leftCol.className = "idx-col-left";
const stV = document.createElement("div"); stV.className = "idx-l-title"; stV.textContent = "Volets";
leftCol.appendChild(stV);
const voletDefs = [
  { id: "exdtc", icon: "\u25ce", title: "Exploration libre", desc: "35 000 communes", color: "#2171b5" },
  { id: "exdeco", icon: "\u25a4", title: "Economie ZE", desc: "FLORES, URSSAF, Krugman", color: "#e67e22" },
  { id: "exdattract", icon: "\u25c6", title: "Attractivite", desc: "Indices resid. + productif", color: "#059669" },
  { id: "exdlog", icon: "\u2302", title: "Logement", desc: "DVF, LOVAC, SITADEL", color: "#dc2626" },
  { id: "dterr", icon: "\u25a6", title: "Focus territoire", desc: "Portrait commune", color: "#7c3aed" },
  { id: "dpgent", icon: "\ud83d\udd2c", title: "Gentrification", desc: "IRIS Paris & proche couronne", color: "#e11d48" }
];
voletDefs.forEach(def => {
  const page = OTTD_PAGES.find(p => p.id === def.id);
  if (!page) return;
  if (page.devOnly && !IS_DEV) return;
  const a = document.createElement("a"); a.className = "idx-volet"; a.href = page.href;
  a.style.setProperty("--vc", def.color);
  a.innerHTML = `<span class="v-icon">${def.icon}</span><div class="v-body"><div class="v-title">${def.title}</div><div class="v-desc">${def.desc}</div></div>`;
  leftCol.appendChild(a);
});
// Search selector in sidebar
const searchTitle = document.createElement("div"); searchTitle.className = "idx-l-title"; searchTitle.style.marginTop = "12px"; searchTitle.textContent = "Selection";
leftCol.appendChild(searchTitle);
const searchSlot = document.createElement("div"); searchSlot.id = "idx-search-slot"; searchSlot.className = "idx-search-sidebar";
leftCol.appendChild(searchSlot);

// KPI strip
const kpiTitle = document.createElement("div"); kpiTitle.className = "idx-l-title"; kpiTitle.style.marginTop = "10px"; kpiTitle.textContent = "Donnees";
leftCol.appendChild(kpiTitle);
const kpiBlock = document.createElement("div"); kpiBlock.className = "idx-l-kpi";
kpiBlock.innerHTML = `<b>110+</b> indicateurs<br><b>8</b> echelons<br><b>35 000</b> communes<br><b>306</b> zones d'emploi`;
leftCol.appendChild(kpiBlock);

// Sources
const srcT = document.createElement("div"); srcT.className = "idx-l-title"; srcT.style.marginTop = "8px"; srcT.textContent = "Sources";
leftCol.appendChild(srcT);
const srcL = document.createElement("div"); srcL.className = "idx-l-src";
srcL.innerHTML = `<b>INSEE</b> RP 2011-2023<br><b>MIGCOM</b> 2016/2022<br><b>DVF</b> 2016-2024<br><b>Filosofi</b> 2019-2021<br><b>URSSAF</b> 2014-2024<br><b>FLORES</b> 1998-2023<br><b>LOVAC</b> \u00b7 <b>SITADEL</b><br><b>IGN</b> 2025`;
leftCol.appendChild(srcL);
cols.appendChild(leftCol);

// RIGHT
const rightCol = document.createElement("div"); rightCol.className = "idx-col-right";

// --- Mention ABOVE controls ---
const secLabel = document.createElement("div"); secLabel.className = "idx-section-label";
secLabel.innerHTML = `Echantillons d'indicateurs et decoupage territorial<span class="idx-sl-sub">Apercu — Voir volets pour dashboards complets</span>`;
rightCol.appendChild(secLabel);

// --- Controls bar — 2 explicit rows ---
const ctrlBar = document.createElement("div"); ctrlBar.className = "idx-ctrl-bar";
// Row 1: Carte 1
const ctrlRow1 = document.createElement("div"); ctrlRow1.className = "idx-ctrl-row";
const grpA = document.createElement("div"); grpA.className = "idx-ctrl-grp";
grpA.appendChild(Object.assign(document.createElement("span"), { className: "cb-label", textContent: "C1 (axe X)" }));
grpA.appendChild(indicInputA);
const perSlotA = document.createElement("span"); perSlotA.id = "idx-per-a-slot"; perSlotA.className = "idx-per-slot";
grpA.appendChild(perSlotA);
grpA.appendChild(modeInputA);
grpA.appendChild(echInputA);
ctrlRow1.appendChild(grpA);
ctrlBar.appendChild(ctrlRow1);
// Row 2: Carte 2
const ctrlRow2 = document.createElement("div"); ctrlRow2.className = "idx-ctrl-row";
const grpB = document.createElement("div"); grpB.className = "idx-ctrl-grp";
grpB.appendChild(Object.assign(document.createElement("span"), { className: "cb-label", textContent: "C2 (axe Y)" }));
grpB.appendChild(indicInputB);
const perSlotB = document.createElement("span"); perSlotB.id = "idx-per-b-slot"; perSlotB.className = "idx-per-slot";
grpB.appendChild(perSlotB);
grpB.appendChild(modeInputB);
grpB.appendChild(echInputB);
ctrlRow2.appendChild(grpB);
ctrlBar.appendChild(ctrlRow2);
rightCol.appendChild(ctrlBar);

// --- Row 1: France1 + France2 + IRIS + Curves ---
const mapRow1 = document.createElement("div"); mapRow1.className = "idx-row";
const mapFr1Slot = document.createElement("div"); mapFr1Slot.style.flex = "0.7";
const mapFr2Slot = document.createElement("div"); mapFr2Slot.style.flex = "0.7";
const mapIdfSlot = document.createElement("div"); mapIdfSlot.style.flex = "1";
const curvesSlot = document.createElement("div"); curvesSlot.style.flex = "0.8";
mapRow1.appendChild(mapFr1Slot); mapRow1.appendChild(mapFr2Slot);
mapRow1.appendChild(mapIdfSlot); mapRow1.appendChild(curvesSlot);
rightCol.appendChild(mapRow1);

// --- Row 2: Scatter + Table ---
const row2 = document.createElement("div"); row2.className = "idx-row";
const scatterSlot = document.createElement("div"); scatterSlot.style.flex = "1";
const tableSlot = document.createElement("div"); tableSlot.style.flex = "1.2";
row2.appendChild(scatterSlot); row2.appendChild(tableSlot);
rightCol.appendChild(row2);

// --- Row 3: Treemap France + Butterfly ZE comparaison ---
const row3 = document.createElement("div"); row3.className = "idx-row";
const bflySlot = document.createElement("div"); bflySlot.style.flex = "0.8";
const bflyZeSlot = document.createElement("div"); bflyZeSlot.style.flex = "1.2";
row3.appendChild(bflySlot); row3.appendChild(bflyZeSlot);
rightCol.appendChild(row3);

cols.appendChild(rightCol);
display(cols);

// Sidebar toggle button
const sbToggle = document.createElement("div");
sbToggle.className = "idx-sb-toggle";
sbToggle.title = "Replier/déplier le menu";
sbToggle.innerHTML = `<span class="tg-chev">\u00ab</span><span class="tg-lbl">Menu</span>`;
document.body.appendChild(sbToggle);
sbToggle.addEventListener("click", () => {
  const isCollapsed = cols.classList.toggle("idx-collapsed");
  sbToggle.querySelector(".tg-chev").textContent = isCollapsed ? "\u00bb" : "\u00ab";
  sbToggle.style.left = isCollapsed ? "0px" : "200px";
});

const _domReady = true;
// &e
```

```js
// &s UTILS — color + legend + tooltip + fullscreen helpers
function ecartColor(val, frVal, allVals, palette) {
  if (val == null || frVal == null) return "#eee";
  const ecart = val - frVal;
  const validVals = allVals.filter(v => v != null);
  if (validVals.length === 0) return palette[Math.floor(palette.length / 2)]; // neutre
  // Avoid Math.max spread overflow on large arrays
  let maxAbs = 0;
  for (const v of validVals) { const a = Math.abs(v - frVal); if (a > maxAbs) maxAbs = a; }
  if (maxAbs === 0) return palette[Math.floor(palette.length / 2)]; // tous identiques
  const t = ecart / maxAbs; // -1 to +1
  const idx = Math.round((t + 1) / 2 * (palette.length - 1));
  return palette[Math.max(0, Math.min(palette.length - 1, idx))];
}

function gradColor(val, allVals) {
  if (val == null) return "#eee";
  const validVals = allVals.filter(v => v != null);
  const [lo, hi] = d3.extent(validVals);
  if (lo === hi) return PAL_SEQ7_BYRV[3];
  const t = (val - lo) / (hi - lo); // 0 to 1
  // Interpolate through all 7 BYRV colors
  const idx = t * (PAL_SEQ7_BYRV.length - 1);
  const i0 = Math.floor(idx), i1 = Math.min(i0 + 1, PAL_SEQ7_BYRV.length - 1);
  return d3.interpolateRgb(PAL_SEQ7_BYRV[i0], PAL_SEQ7_BYRV[i1])(idx - i0);
}

function makeGetColor(bins, mode, data, col, frVal, ecartObj) {
  const vals = data.map(d => d[col]);
  return val => {
    if (val == null) return "#eee";
    if (mode === "Bins") return bins.getColor(val);
    if (mode === "Ecart moy." && ecartObj) return ecartObj.getColor(val);
    if (mode === "Ecart moy.") return ecartColor(val, frVal, vals, PAL_ECART_FRANCE);
    return gradColor(val, vals);
  };
}

function buildLegend(bins, mode, frVal, colKey, data, col, ecartObj) {
  const parsed = parseColKey(colKey);
  const unit = INDICATEURS[parsed?.indic]?.unit || "";
  if (mode === "Bins") {
    return createBinsLegendBar({
      colors: bins.palette, thresholds: bins.bins?.thresholds || [], labels: bins.bins?.labels || [],
      unit, franceValue: frVal, franceLabel: "Fr.", interactive: false
    });
  }
  if (mode === "Ecart moy." && ecartObj) {
    return createBinsLegendBar({
      colors: ecartObj.palette, thresholds: ecartObj.thresholds || [],
      labels: ecartObj.pctLabels || [],
      unit: ecartObj.isAbsoluteEcart ? "pts" : "%",
      franceValue: frVal, franceLabel: "Fr.", interactive: false
    });
  }
  if (mode === "Ecart moy.") {
    return createBinsLegendBar({
      colors: PAL_ECART_FRANCE, thresholds: [], labels: [],
      unit: "", franceValue: frVal, franceLabel: "Fr.", interactive: false
    });
  }
  // Gradient: actual min/max from data
  const vals = (data || []).map(d => d[col]).filter(v => v != null);
  const [dMin, dMax] = vals.length ? d3.extent(vals) : [0, 100];
  return createGradientLegend({
    colors: PAL_SEQ7_BYRV, min: dMin, max: dMax,
    title: parsed?.indic ? (INDICATEURS[parsed.indic]?.short || colKey) : colKey, unit, decimals: 1
  });
}

function wireGeoTooltip(mapEl, features, lookupMap, codeFn, colKey, allData) {
  const paths = Array.from(mapEl.querySelectorAll("path")).filter(p => {
    const f = p.getAttribute("fill"); return f && f !== "none" && f !== "#eee";
  });
  paths.forEach((path, i) => {
    if (i >= features.length) return;
    const code = codeFn(features[i]);
    const row = lookupMap.get(code);
    if (!row) return;
    path.style.cursor = "pointer";
    const handler = e => showTooltip(e, buildTerritoryTooltip(row, colKey, allData), null);
    path.addEventListener("mouseenter", handler);
    path.addEventListener("mousemove", handler);
    path.addEventListener("mouseleave", () => hideTooltip());
  });
}

// Fullscreen: opens overlay with re-rendered map at large size
function addExpandBtn(panel, renderFn) {
  const btn = document.createElement("button");
  btn.className = "idx-expand-btn"; btn.innerHTML = "\u26f6"; btn.title = "Plein ecran";
  btn.onclick = () => {
    const overlay = document.createElement("div"); overlay.className = "idx-fs-overlay";
    const box = document.createElement("div"); box.className = "idx-fs-box";
    const close = document.createElement("button"); close.className = "idx-fs-close";
    close.textContent = "\u00d7"; close.onclick = () => overlay.remove();
    box.appendChild(close);
    if (renderFn) {
      renderFn(box);
    } else {
      const clone = panel.cloneNode(true);
      clone.style.border = "none";
      clone.querySelectorAll(".idx-expand-btn").forEach(b => b.remove());
      box.appendChild(clone);
    }
    overlay.appendChild(box);
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  };
  panel.appendChild(btn);
}

// Build France map panel — uses renderChoropleth + addZoomBehavior for progressive labels
function buildFranceMap(slot, indic, mode, echel, mapIndex) {
  slot.innerHTML = "";
  const panel = document.createElement("div"); panel.className = "idx-ill";

  const isDep = echel === "DEP";
  const data = isDep ? depNoFr : zeNoFr;
  const geo = isDep ? depGeo : zeGeo;
  const lookup = isDep ? depLookup : zeLookup;
  const frRow = isDep ? frRowDep : frRowZe;
  const codeFn = isDep ? (f => String(f.properties?.code_insee)) : (f => String(f.properties?.ze2020));
  const labelKey = isDep ? "nom_officiel" : "libze2020";

  const parsed = parseColKey(indic);
  const indMeta = parsed && INDICATEURS[parsed.indic];
  const title = `Carte ${mapIndex} \u2014 ${indMeta?.short || indic}`;
  const periodStr = parsed?.periode ? (PERIODES[parsed.periode]?.short || parsed.periode) : "";
  panel.appendChild(Object.assign(document.createElement("div"), {
    className: "it",
    innerHTML: `${title} <span style="font-weight:400;color:#9ca3af;font-size:8px">${periodStr} \u00b7 ${isDep ? "DEP" : "ZE"} \u00b7 ${mode}</span>`
  }));

  const bins = computeIndicBins(data, indic);
  const ecartObj = mode === "Ecart moy." ? computeEcartFrance(data, indic, frRow?.[indic], { indicType: indMeta?.type }) : null;
  const getColorFn = makeGetColor(bins, mode, data, indic, frRow?.[indic], ecartObj);

  // Merge data into geo features for renderChoropleth
  const mergedGeo = { type: "FeatureCollection", features: geo.features.map(f => {
    const code = codeFn(f);
    const row = lookup.get(code);
    const props = { ...f.properties };
    if (row) { for (const k of Object.keys(row)) props[k] = row[k]; }
    return { ...f, properties: props };
  })};

  function makeMap(w, h, withZoom) {
    const mapEl = renderChoropleth({
      geoData: mergedGeo, valueCol: indic,
      getColor: (v) => getColorFn(v),
      getCode: f => codeFn(f),
      getLabel: ({ code }) => lookup.get(code)?.libelle || code,
      formatValue: (k, v) => v != null ? String(Math.round(v * 10) / 10) : "\u2014",
      indicLabel: indMeta?.short || indic,
      showLabels: true, labelMode: "both", labelBy: "population",
      topN: 5, maxLabelsAuto: 5,
      echelon: isDep ? "DEP" : "ZE",
      width: w, height: h, marginLeft: 2, marginTop: 2, marginRight: 2, marginBottom: 2
    });
    if (mapEl && withZoom) addZoomBehavior(mapEl, { minScale: 1, maxScale: 6 });
    return mapEl;
  }

  const mapEl = makeMap(250, 290, true);
  if (mapEl) {
    panel.appendChild(mapEl);
    wireGeoTooltip(mapEl, mergedGeo.features, lookup, codeFn, indic, data);
  }

  const legWrap = document.createElement("div"); legWrap.className = "idx-leg-wrap";
  legWrap.appendChild(buildLegend(bins, mode, frRow?.[indic], indic, data, indic, ecartObj));
  panel.appendChild(legWrap);
  panel.appendChild(Object.assign(document.createElement("div"), { className: "in", textContent: `Source : ${getSource(indic) || "INSEE"}` }));

  // Fullscreen renders a larger map with zoom
  addExpandBtn(panel, (box) => {
    const fsPanel = document.createElement("div"); fsPanel.style.padding = "10px";
    fsPanel.appendChild(Object.assign(document.createElement("div"), {
      style: "font-size:14px;font-weight:600;color:#374151;margin-bottom:6px",
      textContent: `${title} (${periodStr} \u00b7 ${isDep ? "DEP" : "ZE"} \u00b7 ${mode})`
    }));
    const bigMap = makeMap(700, 550, true);
    if (bigMap) {
      fsPanel.appendChild(bigMap);
      wireGeoTooltip(bigMap, mergedGeo.features, lookup, codeFn, indic, data);
    }
    const bigLeg = document.createElement("div"); bigLeg.style.marginTop = "8px";
    bigLeg.appendChild(buildLegend(bins, mode, frRow?.[indic], indic, data, indic, ecartObj));
    fsPanel.appendChild(bigLeg);
    box.appendChild(fsPanel);
  });

  slot.appendChild(panel);
}
// &e
```

```js
// &s SEARCH_BOX — reactive to echA (DEP/ZE switch)
{
  void _domReady;
  const slot = document.getElementById("idx-search-slot");
  if (slot) {
    slot.innerHTML = "";
    const isDep = echA === "DEP";
    const sData = (isDep ? depNoFr : zeNoFr).map(d => ({ code: d.code, label: d.libelle || d.code, pop: d.P22_POP }));
    searchSel.value = new Set(); // reset selection on echelon change
    const box = createSearchBox({
      data: sData, selection: searchSel,
      onToggle: (code) => { const s = new Set(searchSel.value); if (s.has(code)) s.delete(code); else s.add(code); searchSel.value = s; },
      onClear: () => { searchSel.value = new Set(); },
      placeholder: isDep ? "Dep..." : "ZE...", maxResults: 6, maxWidth: 140, maxChips: 2, showClearAll: true, showCount: false
    });
    slot.appendChild(box);
  }
}
// &e
```

```js
// &s PERIOD_A — reactive period selector for Carte 1
void _domReady; // ensure DOM slots exist
const _perMapA = getPeriodesForIndicateur(indicKeyA, availCols);
const _defPerA = getDefaultPeriode(indicKeyA, availCols);
const _perOptsA = _perMapA.size > 0 ? _perMapA : new Map([["—", _defPerA || ""]]);
const _perInputA = Inputs.select(_perOptsA, { value: _defPerA || [..._perOptsA.values()][0] });
const _slotA = document.getElementById("idx-per-a-slot");
if (_slotA) { _slotA.innerHTML = ""; _slotA.appendChild(_perInputA); }
const periodeA = Generators.input(_perInputA);
// &e
```

```js
// &s PERIOD_B — reactive period selector for Carte 2
void _domReady;
const _perMapB = getPeriodesForIndicateur(indicKeyB, availCols);
const _defPerB = getDefaultPeriode(indicKeyB, availCols);
const _perOptsB = _perMapB.size > 0 ? _perMapB : new Map([["—", _defPerB || ""]]);
const _perInputB = Inputs.select(_perOptsB, { value: _defPerB || [..._perOptsB.values()][0] });
const _slotB = document.getElementById("idx-per-b-slot");
if (_slotB) { _slotB.innerHTML = ""; _slotB.appendChild(_perInputB); }
const periodeB = Generators.input(_perInputB);
// &e
```

```js
// &s COLKEYS — computed colKeys from indicKey + periode
const indicA = buildColKey(indicKeyA, periodeA);
const indicB = buildColKey(indicKeyB, periodeB);
// &e
```

```js
// &s MAP_FRANCE_1
{
  buildFranceMap(mapFr1Slot, indicA, modeA, echA, 1);
}
// &e
```

```js
// &s MAP_FRANCE_2
{
  buildFranceMap(mapFr2Slot, indicB, modeB, echB, 2);
}
// &e
```

```js
// &s MAP_IDF_INIT — create MapLibre once (stable cell, no reactive deps on indicA)
const _idfMapRef = await (async () => {
  const panel = document.createElement("div"); panel.className = "idx-ill";
  const titleEl = document.createElement("div"); titleEl.className = "it"; titleEl.id = "idx-idf-title";
  panel.appendChild(titleEl);
  const mc = document.createElement("div"); mc.className = "idx-maplibre-wrap";
  panel.appendChild(mc);
  const legWrap = document.createElement("div"); legWrap.className = "idx-leg-wrap"; legWrap.id = "idx-idf-leg";
  panel.appendChild(legWrap);
  const link = document.createElement("a"); link.className = "link-more";
  link.href = "./dash-dpgent"; link.textContent = "\u2192 Gentrification IRIS";
  panel.appendChild(link);
  const noteEl = document.createElement("div"); noteEl.className = "in"; noteEl.id = "idx-idf-note";
  panel.appendChild(noteEl);

  const parisBounds = [[2.22, 48.80], [2.48, 48.92]];
  const comLabelsGeo = {
    type: "FeatureCollection",
    features: communeFeatures.map(f => {
      if (!f) return null;
      const code = f.properties.code_insee;
      const agg = communeAgg[code];
      let name = agg?.libelle || code;
      if (name.startsWith("Paris ")) name = name.replace(/^Paris /, "").replace(/ Arrondissement$/, "");
      const centroid = d3.geoCentroid(f);
      return { type: "Feature", geometry: { type: "Point", coordinates: centroid }, properties: { _comLabel: name } };
    }).filter(Boolean)
  };

  // Initial empty geo
  const emptyGeo = { type: "FeatureCollection", features: [] };
  let mapInstance = null;
  try {
    const { map, Popup } = await createOTTDMap(mc, { maxZoom: 15 });
    await new Promise(r => { if (map.loaded()) r(); else map.on("load", r); });
    map.fitBounds(parisBounds, { padding: 0, duration: 0 });

    const sourceId = "src-idf-idx";
    map.addSource(sourceId, { type: "geojson", data: emptyGeo });
    map.addLayer({ id: "idf-fill", type: "fill", source: sourceId, paint: { "fill-color": ["get", "_fill"], "fill-opacity": 0.78 } });
    map.addLayer({ id: "idf-line", type: "line", source: sourceId, paint: { "line-color": "#8899aa", "line-width": 0.3 } });
    map.addLayer({ id: "idf-hover", type: "fill", source: sourceId, paint: { "fill-color": "#ffd700", "fill-opacity": 0.3 }, filter: ["==", ["get", "_code"], ""] });

    map.addSource("com-labels-idx", { type: "geojson", data: comLabelsGeo });
    map.addLayer({
      id: "com-labels-idx-lbl", type: "symbol", source: "com-labels-idx",
      layout: { "text-field": ["get", "_comLabel"], "text-size": 9, "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"], "text-anchor": "center", "text-allow-overlap": false, "text-optional": true, "text-padding": 2 },
      paint: { "text-color": "#374151", "text-halo-color": "rgba(255,255,255,0.85)", "text-halo-width": 1.2 }
    });

    map.on("mousemove", "idf-fill", e => {
      if (!e.features?.length) return;
      map.getCanvas().style.cursor = "pointer";
      map.setFilter("idf-hover", ["==", ["get", "_code"], e.features[0].properties._code || ""]);
    });
    map.on("mouseleave", "idf-fill", () => { map.getCanvas().style.cursor = ""; map.setFilter("idf-hover", ["==", ["get", "_code"], ""]); });

    const popup = new Popup({ closeButton: false, maxWidth: "280px" });
    map.on("mousemove", "idf-fill", e => {
      if (!e.features?.length) return;
      const props = e.features[0].properties;
      const v = props._val, vFmt = props._valFmt || (v != null ? String(Math.round(v * 10) / 10) : "\u2014");
      const html = `<div style="font-family:Inter,sans-serif"><b style="font-size:12px">${props._libelle_com || ""}</b><span style="color:#94a3b8;font-size:9px"> \u00b7 ${props._libelle || props._code}</span><br><span style="font-size:11px"><b>${props._indicLabel || ""}</b> : ${vFmt} ${props._unit || ""}</span><br><span style="font-size:10px;color:#94a3b8">Pop : ${props._P22_POP ? Number(props._P22_POP).toLocaleString("fr-FR") : "\u2014"}</span></div>`;
      popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    });
    map.on("mouseleave", "idf-fill", () => popup.remove());
    mapInstance = map;
  } catch (err) {
    mc.innerHTML = `<div style="padding:20px;color:#dc2626;font-size:11px">MapLibre: ${err.message}</div>`;
  }

  addExpandBtn(panel, async (box) => {
    const fsPanel = document.createElement("div"); fsPanel.style.padding = "10px";
    fsPanel.appendChild(Object.assign(document.createElement("div"), { style: "font-size:14px;font-weight:600;color:#374151;margin-bottom:6px", textContent: "Paris & proche couronne (47 communes)" }));
    const fsMc = document.createElement("div"); fsMc.style.cssText = "width:100%;height:70vh;border-radius:6px;overflow:hidden";
    fsPanel.appendChild(fsMc); box.appendChild(fsPanel);
    try {
      const { map: fsMap, Popup: FsPopup } = await createOTTDMap(fsMc, { maxZoom: 17 });
      await new Promise(r => { if (fsMap.loaded()) r(); else fsMap.on("load", r); });
      fsMap.fitBounds(parisBounds, { padding: 20, duration: 0 });
      const curSrc = mapInstance?.getSource("src-idf-idx");
      const curData = curSrc ? curSrc._data || emptyGeo : emptyGeo;
      fsMap.addSource("src-fs", { type: "geojson", data: curData });
      fsMap.addLayer({ id: "fs-fill", type: "fill", source: "src-fs", paint: { "fill-color": ["get", "_fill"], "fill-opacity": 0.78 } });
      fsMap.addLayer({ id: "fs-line", type: "line", source: "src-fs", paint: { "line-color": "#8899aa", "line-width": 0.4 } });
      fsMap.addSource("fs-labels", { type: "geojson", data: comLabelsGeo });
      fsMap.addLayer({ id: "fs-lbl", type: "symbol", source: "fs-labels", layout: { "text-field": ["get", "_comLabel"], "text-size": 11, "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"], "text-anchor": "center", "text-allow-overlap": false, "text-padding": 4 }, paint: { "text-color": "#374151", "text-halo-color": "rgba(255,255,255,0.9)", "text-halo-width": 1.5 } });
      const fsPopup = new FsPopup({ closeButton: false, maxWidth: "320px" });
      fsMap.on("mousemove", "fs-fill", e => { if (!e.features?.length) return; fsMap.getCanvas().style.cursor = "pointer"; const p = e.features[0].properties; const vFmt = p._valFmt || (p._val != null ? String(Math.round(p._val * 10) / 10) : "\u2014"); fsPopup.setLngLat(e.lngLat).setHTML(`<div style="font-family:Inter,sans-serif"><b>${p._libelle_com||""}</b><br>${p._indicLabel||""}: ${vFmt} ${p._unit||""}</div>`).addTo(fsMap); });
      fsMap.on("mouseleave", "fs-fill", () => { fsMap.getCanvas().style.cursor = ""; fsPopup.remove(); });
    } catch (err) { fsMc.innerHTML = `<div style="padding:20px;color:#dc2626">${err.message}</div>`; }
  });

  mapIdfSlot.appendChild(panel);
  return { map: mapInstance, sourceId: "src-idf-idx", panel, parisBounds, comLabelsGeo };
})();
// &e
```

```js
// &s MAP_IDF_UPDATE — reactive: update colors when indicA changes (no map reload)
{
  const irisCol = IRIS_COLS.includes(indicA) ? indicA : "logd_px2q2_appt_24";
  const irisSynced = IRIS_COLS.includes(indicA);
  const parsed = parseColKey(irisCol);
  const indMeta = parsed && INDICATEURS[parsed.indic];
  const titleStr = indMeta ? (indMeta.short || indMeta.label) : irisCol;
  const syncNote = irisSynced ? "" : " (defaut)";
  const unit = indMeta?.unit || "";

  // Update title
  const titleEl = document.getElementById("idx-idf-title");
  if (titleEl) titleEl.innerHTML = `Paris & proche couronne \u2014 ${titleStr}${syncNote} <span style="font-weight:400;color:#9ca3af;font-size:7.5px">47 communes</span>`;

  // Recompute colors and update source
  const irisValid = irisDataFiltered.filter(d => d[irisCol] != null);
  const irisBins = computeIndicBins(irisValid, irisCol);
  const getIrisColor = v => v == null ? "#e8e8e8" : irisBins.getColor(v);
  const irisDataMap = new Map(irisDataFiltered.map(d => [String(d.code), d]));
  const enrichedGeo = buildChoroplethSource(irisGeoFiltered.features, irisDataMap, irisCol, getIrisColor, {
    codeProperty: "code_iris",
    extraProps: ["libelle", "libelle_com", "P22_POP", "logd_px2q2_appt_24", "rev_med_21", "dsp_csp_cadres_pct_22", "soc_txchom_1564_22"],
    defaultFill: "#e8e8e8"
  });
  // Inject static tooltip props into each feature (buildChoroplethSource doesn't support extraStaticProps)
  for (const f of enrichedGeo.features) {
    f.properties._indicLabel = titleStr;
    f.properties._unit = unit;
  }

  // setData — no map reload!
  if (_idfMapRef?.map) {
    const src = _idfMapRef.map.getSource(_idfMapRef.sourceId);
    if (src) src.setData(enrichedGeo);
  }

  // Update legend
  const legEl = document.getElementById("idx-idf-leg");
  if (legEl) {
    legEl.innerHTML = "";
    legEl.appendChild(createBinsLegendBar({
      colors: irisBins.palette, thresholds: irisBins.bins?.thresholds || [], labels: irisBins.bins?.labels || [],
      unit, interactive: false
    }));
  }

  // Update note
  const noteEl = document.getElementById("idx-idf-note");
  if (noteEl) noteEl.textContent = `${irisValid.length} IRIS \u00b7 Paris + 27 communes`;
}
// &e
```

```js
// &s CURVES — Emploi indice 100
{
  curvesSlot.innerHTML = "";
  const panel = document.createElement("div"); panel.className = "idx-ill";
  panel.appendChild(Object.assign(document.createElement("div"), { className: "it", textContent: "Emploi \u2014 Indice 100 (2008)" }));
  panel.appendChild(Object.assign(document.createElement("div"), { className: "ist", textContent: "France + 5 ZE" }));

  const baseYear = 2008;
  const frSerie = frSerieRaw.filter(d => d.year >= 1998);
  const frBase = frSerie.find(d => d.year === baseYear)?.eff || 1;
  const zeLabels = [...new Set(zeSerieRaw.map(d => d.label))];
  const colors = { "France": "#64748b", "Paris": "#e11d48", "Rennes": "#2563eb", "Bordeaux": "#e67e22", "Toulouse": "#059669", "Montlu\u00e7on": "#7c3aed" };

  const chartData = [...frSerie.map(d => ({ year: d.year, indice: d.eff / frBase * 100, serie: "France" }))];
  zeLabels.forEach(lab => {
    const zs = zeSerieRaw.filter(d => d.label === lab && d.year >= 1998);
    const zb = zs.find(d => d.year === baseYear)?.eff || 1;
    zs.forEach(d => chartData.push({ year: d.year, indice: d.eff / zb * 100, serie: lab }));
  });

  const lastY = d3.max(chartData, d => d.year);
  const endPts = chartData.filter(d => d.year === lastY);
  const minY = Math.floor(d3.min(chartData, d => d.indice) / 5) * 5 - 3;
  const maxY = Math.ceil(d3.max(chartData, d => d.indice) / 5) * 5 + 3;
  const allS = ["France", ...zeLabels];

  function renderCurves(w, h, fs) {
    return Plot.plot({
      width: w, height: h,
      marginLeft: 28, marginRight: fs ? 80 : 58, marginBottom: 20, marginTop: 8,
      style: { fontFamily: "Inter, sans-serif", fontSize: fs ? "10px" : "8px" },
      x: { label: null, tickFormat: d => String(d), ticks: [2000, 2008, lastY] },
      y: { domain: [minY, maxY], label: null, ticks: [minY, 100, maxY] },
      color: { domain: allS, range: allS.map(s => colors[s] || "#999") },
      marks: [
        Plot.ruleY([100], { stroke: "#ccc", strokeDasharray: "3,2" }),
        Plot.line(chartData, { x: "year", y: "indice", stroke: "serie",
          strokeWidth: d => d.serie === "France" ? 2.5 : 1.5,
          strokeOpacity: d => d.serie === "France" ? 1 : 0.75, curve: "natural" }),
        Plot.dot(endPts, { x: "year", y: "indice", fill: "serie", r: fs ? 3.5 : 2 }),
        Plot.text(endPts, { x: "year", y: "indice", text: d => `${d.serie} ${d.indice.toFixed(0)}`,
          dx: 3, textAnchor: "start", fontSize: fs ? 10 : 7.5, fill: "serie" })
      ]
    });
  }

  panel.appendChild(renderCurves(260, 310, false));
  panel.appendChild(Object.assign(document.createElement("div"), { className: "in", textContent: "Source : EAE205 / FLORES" }));
  addExpandBtn(panel, (box) => {
    const fsP = document.createElement("div"); fsP.style.padding = "10px";
    fsP.appendChild(Object.assign(document.createElement("div"), { style: "font-size:14px;font-weight:600;color:#374151;margin-bottom:8px", textContent: "Emploi \u2014 Indice 100 (base 2008) \u2014 France + 5 ZE" }));
    fsP.appendChild(renderCurves(800, 500, true));
    box.appendChild(fsP);
  });
  curvesSlot.appendChild(panel);
}
// &e
```

```js
// &s SCATTER — exdtc-inspired with autoSizeScale + annotations
{
  scatterSlot.innerHTML = "";
  const panel = document.createElement("div"); panel.className = "idx-ill idx-scatter-wrap";

  const xCol = indicA, yCol = indicB;
  const parsedX = parseColKey(xCol), parsedY = parseColKey(yCol);
  const indX = parsedX && INDICATEURS[parsedX.indic];
  const indY = parsedY && INDICATEURS[parsedY.indic];
  const xLab = indX ? (indX.short || indX.label) : xCol;
  const yLab = indY ? (indY.short || indY.label) : yCol;
  const isDep = echA === "DEP";
  const scatterData = isDep ? depNoFr : zeNoFr;
  const frRowScatter = isDep ? frRowDep : frRowZe;
  const valid = scatterData.filter(d => d[xCol] != null && d[yCol] != null && d.P22_POP != null);
  const sel = searchSel;

  if (valid.length > 5) {
    const xV = valid.map(d => d[xCol]).sort((a, b) => a - b);
    const yV = valid.map(d => d[yCol]).sort((a, b) => a - b);
    const xP01 = xV[Math.floor(xV.length * 0.01)], xP99 = xV[Math.min(Math.floor(xV.length * 0.99), xV.length - 1)];
    const yP01 = yV[Math.floor(yV.length * 0.01)], yP99 = yV[Math.min(Math.floor(yV.length * 0.99), yV.length - 1)];
    const xPad = (xP99 - xP01) * 0.08, yPad = (yP99 - yP01) * 0.08;
    let xMin = xP01 - xPad, xMax = xP99 + xPad;
    let yMin = yP01 - yPad, yMax = yP99 + yPad;
    if (xMin > 0 && xMin < (xMax - xMin) * 0.5) xMin = Math.min(0, xMin);
    if (xMax < 0 && Math.abs(xMax) < (xMax - xMin) * 0.5) xMax = Math.max(0, xMax);
    if (yMin > 0 && yMin < (yMax - yMin) * 0.5) yMin = Math.min(0, yMin);
    if (yMax < 0 && Math.abs(yMax) < (yMax - yMin) * 0.5) yMax = Math.max(0, yMax);

    const frX = frRowScatter?.[xCol], frY = frRowScatter?.[yCol];
    const sz = autoSizeScale(valid.map(d => d.P22_POP), { label: "Population", rRange: [3, 12] });

    const annotations = [];
    if (frX != null && frY != null) {
      const midXR = (frX + xMax) / 2, midXL = (xMin + frX) / 2;
      const midYT = (frY + yMax) / 2, midYB = (yMin + frY) / 2;
      const isXEvol = xCol.includes("vtcam") || xCol.includes("vevol") || xCol.includes("vdifp");
      const isYEvol = yCol.includes("vtcam") || yCol.includes("vevol") || yCol.includes("vdifp");
      const qL = isXEvol && isYEvol
        ? { tr: "Hausse continue", tl: "Rebond", br: "Declin recent", bl: "Declin continu" }
        : { tr: "\u2191\u2191 Les 2", tl: `\u2191 ${yLab.substring(0, 12)}`, br: `\u2191 ${xLab.substring(0, 12)}`, bl: "\u2193\u2193 Les 2" };
      annotations.push(
        { x: midXR, y: midYT, text: qL.tr, color: "rgba(80,80,80,0.3)", fontSize: 10, fontWeight: 600 },
        { x: midXL, y: midYT, text: qL.tl, color: "rgba(80,80,80,0.3)", fontSize: 10, fontWeight: 600 },
        { x: midXR, y: midYB, text: qL.br, color: "rgba(80,80,80,0.3)", fontSize: 10, fontWeight: 600 },
        { x: midXL, y: midYB, text: qL.bl, color: "rgba(80,80,80,0.3)", fontSize: 10, fontWeight: 600 }
      );
    }

    const sCodes = [...sel];
    const topPop = [...valid].sort((a, b) => (b.P22_POP || 0) - (a.P22_POP || 0)).slice(0, 8).map(d => d.code);
    const lCodes = [...new Set([...sCodes, ...topPop])];

    const scatterEl = createScatterWithZoom({
      title: `${xLab} vs ${yLab}`,
      subtitle: `${valid.length} ${isDep ? "departements" : "zones d'emploi"}`,
      legend: [
        { label: `${DENS_LABELS["1"]} (${valid.filter(d => d.dens3 === "1").length})`, color: DENS_COLORS["1"] },
        { label: `${DENS_LABELS["2"]} (${valid.filter(d => d.dens3 === "2").length})`, color: DENS_COLORS["2"] },
        { label: `${DENS_LABELS["3"]} (${valid.filter(d => d.dens3 === "3").length})`, color: DENS_COLORS["3"] }
      ],
      sizeLabel: createSizeLegendVertical(sz.bins, "Population"),
      data: valid, xCol, yCol,
      xDomain: [xMin, xMax],
      yDomain: [yMin, yMax],
      xLabel: xLab, yLabel: yLab,
      xUnit: `${indX?.unit || ""}, ${getPeriodLabel(xCol)}`,
      yUnit: `${indY?.unit || ""}, ${getPeriodLabel(yCol)}`,
      meanX: frX != null ? frX : d3.median(valid, d => d[xCol]),
      meanY: frY != null ? frY : d3.median(valid, d => d[yCol]),
      getRadius: d => sz.getRadius(d.P22_POP),
      getColor: d => DENS_COLORS[String(d.dens3)] || "#999",
      isSelected: d => sel.has(d.code),
      getTooltip: d => buildScatterTooltip(d, xCol, yCol, scatterData, frX, frY),
      _customTooltip: true,
      labelCodes: lCodes,
      labelMode: "both",
      annotations,
      fillOpacity: 0.65,
      width: 640, height: 380,
      fontSize: "9px",
      sourceText: isDep ? "INSEE \u00b7 96 departements" : "INSEE \u00b7 288 zones d'emploi"
    });
    panel.appendChild(scatterEl);
  } else {
    panel.appendChild(Object.assign(document.createElement("div"), {
      style: "padding:30px;color:#94a3b8;font-size:11px;text-align:center",
      textContent: "Pas assez de donnees pour ce croisement"
    }));
  }
  scatterSlot.appendChild(panel);
}
// &e
```

```js
// &s TABLE — ddict-driven, reactive to echA
{
  tableSlot.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "idx-tbl-wrap";

  const isDep = echA === "DEP";
  const tblData = isDep ? depNoFr : zeNoFr;
  const frRow = isDep ? frRowDep : frRowZe;
  const echLabel = isDep ? "Departement" : "Zone d'emploi";
  wrap.appendChild(Object.assign(document.createElement("div"), { className: "it", textContent: `${isDep ? "Departements" : "Zones d'emploi"} \u2014 indicateurs cles` }));

  const TABLE_INDICS = [
    "logd_px2q2_appt", "dm_pop_vtcam", "dm_sma_vtcam",
    "eco_emp_vtcam", "rev_med", "log_vac_pct",
    "rev_txpauv", "soc_txchom_1564", "dsp_csp_cadres_pct"
  ];
  const dataKeys = Object.keys(tblData[0] || {});
  const TBL_KEYS = TABLE_INDICS.map(base => dataKeys.find(k => k.startsWith(base))).filter(Boolean);

  const tblContainer = document.createElement("div");
  const sorted = [...tblData].sort((a, b) => (b.P22_POP || 0) - (a.P22_POP || 0));

  buildDataTable(tblContainer, sorted, {
    keys: TBL_KEYS,
    labelCol: "libelle",
    labelFallback: "code",
    labelHeader: echLabel,
    colorCol: null,
    defaultSort: TBL_KEYS[0],
    maxHeight: 320,
    pageSize: 100,
    evolCols: [],
    expandable: true,
    refRow: { label: "France", data: frRow || {}, bgColor: "#f0f7ff" }
  });
  wrap.appendChild(tblContainer);
  wrap.appendChild(Object.assign(document.createElement("div"), {
    className: "in",
    textContent: "Source : INSEE, DVF, Filosofi"
  }));
  tableSlot.appendChild(wrap);
}
// &e
```

```js
// &s TREEMAP_BUTTERFLY — Treemap France + Butterfly comparaison 3 ZE
{
  const libA21Map = new Map(frSecteurs.map(d => [d.a21, d.lib_a21]));

  // --- Left: Treemap France A5/A21 ---
  bflySlot.innerHTML = "";
  const panel = document.createElement("div"); panel.className = "idx-ill";
  panel.appendChild(Object.assign(document.createElement("div"), { className: "it", textContent: "France \u2014 Emploi par secteur A5/A21 (URSSAF 2024)" }));

  const treemapData = frSecteurs
    .filter(d => d.pct_24 != null && d.pct_24 > 0)
    .map(d => ({ a5: d.lib_a5, a21: d.a21, lib: d.lib_a21, pct: d.pct_24, evol_1924: d.evol_1924 }));

  panel.appendChild(renderTreemapA5A21(treemapData, { width: 360, height: 280, valueField: "pct" }));
  panel.appendChild(Object.assign(document.createElement("div"), { className: "in", style: "margin-top:4px", textContent: "Treemap : taille = part emploi total. Couleurs par grands secteurs A5." }));
  panel.appendChild(Object.assign(document.createElement("a"), { className: "link-more", href: "./dash-exdeco-ze", textContent: "\u2192 Economie ZE" }));
  bflySlot.appendChild(panel);

  // --- Right: Butterfly comparaison 3 ZE vs France ---
  bflyZeSlot.innerHTML = "";
  const panelZe = document.createElement("div"); panelZe.className = "idx-ill";
  panelZe.appendChild(Object.assign(document.createElement("div"), { className: "it", textContent: "Paris, Lyon, Toulouse vs France \u2014 Part et evolution 19-24" }));

  const frBfly = frSecteurs
    .filter(d => d.pct_24 != null && d.pct_24 > 0.5)
    .map(d => ({ secteur: d.lib_a21, pct: d.pct_24, evol: d.evol_1924, is: null }));

  const makeZeBfly = (zeCode) => {
    const rows = zeSecteurs.filter(d => String(d.code) === zeCode);
    return rows
      .filter(d => d.pct_24 != null && d.pct_24 > 0.5)
      .map(d => ({ secteur: libA21Map.get(d.a21) || d.a21, pct: d.pct_24, evol: d.evol_1924, is: null }));
  };

  const compareZe = [
    { code: "1109", label: "Paris" },
    { code: "8421", label: "Lyon" },
    { code: "7625", label: "Toulouse" }
  ];
  const terrData = compareZe.map(z => ({ label: z.label, data: makeZeBfly(z.code) }));

  panelZe.appendChild(renderButterflyMulti({
    franceData: frBfly, territories: terrData,
    options: { barHeight: 16, widthPart: 70, widthEvol: 80, widthLabels: 105, evolLabel: "Evol. 19-24 (%)", capEvol: 25, referenceLabel: "France (ref.)" }
  }));
  panelZe.appendChild(Object.assign(document.createElement("a"), { className: "link-more", href: "./dash-exdeco-ze", textContent: "\u2192 Economie ZE" }));
  panelZe.appendChild(Object.assign(document.createElement("div"), { className: "in", textContent: "Source : URSSAF 2024" }));
  bflyZeSlot.appendChild(panelZe);
}
// &e
```

```js
// &s FOOTER
display(Object.assign(document.createElement("div"), {
  className: "idx-foot",
  innerHTML: 'ObTer — © 2026 Vincent Roue | <a href="https://github.com/vincentroue" style="color:#64748b">GitHub</a> | <a href="https://vincentroue-portfolio.netlify.app" style="color:#64748b">Portfolio</a>'
}));
// &e
```
