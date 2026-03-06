---
title: Gentrification IRIS
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     Volet dpgent — Gentrification IRIS Paris+27 communes & Marseille
     Date: 2026-02-28 | v1.0 — idx_gentri intégré, tooltip z-scores, ranking, dropdown pinné
     ============================================================ -->

<!-- &s DARK_POPUP_CSS -->
<style>
.maplibregl-popup-content {
  background: rgba(15, 23, 42, 0.92) !important;
  color: #e2e8f0 !important;
  border-radius: 5px !important;
  padding: 8px 11px !important;
  font-size: 11.5px !important;
  line-height: 1.45 !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.35) !important;
  font-family: Inter, system-ui, sans-serif !important;
  max-width: 300px !important;
}
.maplibregl-popup-content b { color: #fff; font-weight: 600; font-size: 12px; }
.maplibregl-popup-tip { border-top-color: rgba(15, 23, 42, 0.92) !important; }
.maplibregl-popup-anchor-bottom .maplibregl-popup-tip { border-top-color: rgba(15, 23, 42, 0.92) !important; }
.maplibregl-popup-anchor-top .maplibregl-popup-tip { border-bottom-color: rgba(15, 23, 42, 0.92) !important; }
.maplibregl-popup-anchor-left .maplibregl-popup-tip { border-right-color: rgba(15, 23, 42, 0.92) !important; }
.maplibregl-popup-anchor-right .maplibregl-popup-tip { border-left-color: rgba(15, 23, 42, 0.92) !important; }
.maplibregl-popup-close-button { display: none !important; }
.maplibregl-popup { z-index: 10 !important; }
.maplibregl-canvas { cursor: default !important; }
.maplibregl-canvas:active { cursor: grabbing !important; }
.pgent-city-row { display: flex; gap: 8px; margin-bottom: 6px; margin-top: 1px; }
.pgent-maps-col { flex: 1 1 58%; min-width: 0; }
.pgent-table-col { flex: 0 0 40%; min-width: 340px; max-width: 520px; display: flex; flex-direction: column; }
.pgent-pair { display: flex; gap: 6px; margin-bottom: 3px; }
.pgent-pair > div { flex: 1; position: relative; }
.pgent-map-title { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.3px; }
.pgent-info { display:inline-block; color:#9ca3af; cursor:help; position:relative; font-size:11px; font-weight:400; text-transform:none; letter-spacing:0; margin-left:3px; }
.pgent-info-tip { display:none; position:absolute; bottom:120%; left:-80px; width:240px; padding:6px 10px; background:#1f2937; color:#e2e8f0; border-radius:5px; font-size:11px; line-height:1.35; z-index:100; box-shadow:0 4px 12px rgba(0,0,0,0.3); text-transform:none; letter-spacing:0; font-weight:400; }
.pgent-info:hover .pgent-info-tip { display:block; }
.pgent-section { font-size: 13px; font-weight: 600; color: #374151; margin: 4px 0 2px; border: none !important; text-decoration: none; outline: none; }
.pgent-section::after { display: none !important; }
.pgent-leg-wrap { position: absolute; bottom: 6px; left: 6px; right: auto; top: auto; z-index: 4; background: rgba(255,255,255,0.92); border: 1px solid #e0e5ea; border-radius: 4px; padding: 3px 6px; backdrop-filter: blur(2px); pointer-events: auto; }
.pgent-tab { padding:4px 12px; font-size:11px; font-weight:500; border:1px solid #d1d5db; background:#f9fafb; color:#6b7280; cursor:pointer; border-bottom:none; border-radius:4px 4px 0 0; margin-bottom:-1px; }
.pgent-tab-active { background:#fff; color:#dc2626; font-weight:600; border-bottom:1px solid #fff; z-index:1; position:relative; }
/* tableojs CSS auto-injecté par le helper — rien à dupliquer ici */
</style>
<!-- &e DARK_POPUP_CSS -->

<!-- &s BANNER -->
```js
import { createBanner, createNav, OTTD_PAGES } from "./helpers/layout.js";
const _vc = OTTD_PAGES.find(p => p.id === 'dpgent');
display(createBanner({
  voletTitle: "Gentrification IRIS — Paris + 27 communes & Marseille",
  voletTooltip: "Gentrification IRIS : revenus, CSP, logement, DVF, SIRENE sur Paris + 27 communes limitrophes et Marseille. Filtre : pop ≥300 ou étab ≥50.",
  color: _vc?.color || "#dc2626",
  navElement: createNav(OTTD_PAGES, 'dpgent')
}));
```
<!-- &e BANNER -->

<!-- &s IMPORTS -->
```js
import * as topojson from "npm:topojson-client";
import * as d3 from "npm:d3";
import { INDICATEURS, THEMES, PERIODES, formatValue, parseColKey, getColLabel } from "./helpers/indicators-ddict-js.js";
import { PGENT_ALLOWED_INDICS } from "./helpers/indicators-dpgent.js";
import { getIndicOptionsAll, getPeriodesForIndicateur, getDefaultPeriode, buildColKey, getFullLabel, isSeparator } from "./helpers/selectindic.js";
import { PAL_SEQ7_BYRV, PAL_ECART_FRANCE, PAL_PURPLE_GREEN, createGradientScale } from "./helpers/colors.js";
import { createBinsLegendBar, createGradientLegend } from "./helpers/legend.js";
import {
  createOTTDMap, buildChoroplethSource, addChoroplethLayers,
  attachTooltip, attachHighlight, createMapWrapper, computeBounds
} from "./helpers/maplibre.js";
import { initDuckDB } from "./helpers/duckdb.js";
import { renderScatter, createScatterWithZoom } from "./helpers/scatter.js";
import { buildDataTable } from "./helpers/tableojs.js";
```
<!-- &e IMPORTS -->

<!-- &s CONSTANTS — Périmètre Paris + 27 communes limitrophes + Marseille 16 arr. -->
```js
const PGENT_IDF = new Set([
  // Paris 20 arrondissements
  ...Array.from({length: 20}, (_, i) => `751${String(i + 1).padStart(2, "0")}`),
  // 11 communes 92 (Hauts-de-Seine limitrophes)
  "92024", "92044", "92051", "92062", "92026", "92012", "92040", "92075", "92046", "92049", "92020",
  // 9 communes 93 (Seine-Saint-Denis limitrophes)
  "93070", "93066", "93001", "93055", "93061", "93045", "93063", "93006", "93048",
  // 7 communes 94 (Val-de-Marne limitrophes)
  "94080", "94067", "94018", "94041", "94043", "94037", "94003"
]);
const POP_MIN = 300;
const ETAB_MIN = 50;
const GREY_INACTIVE = "#bfc5cc";  // IRIS non actif — gris bleuté distinct du beige
const GREY_NA = "#d0d5da";        // Donnée manquante — gris clair neutre

// Marseille 16 arrondissements (pas tout le département 13)
const PGENT_13 = new Set([
  "13201", "13202", "13203", "13204", "13205", "13206", "13207", "13208",
  "13209", "13210", "13211", "13212", "13213", "13214", "13215", "13216"
]);

// Filtre inclusion IRIS — stable, ne dépend PAS de paletteMode
// Actif si pop >= 300 OU nb étab >= 50
function isIrisActive(d) {
  return (d.P22_POP || 0) >= POP_MIN || (d.ecosi_etab_vol_26 || 0) >= ETAB_MIN;
}
```
<!-- &e CONSTANTS -->

<!-- &s FILE_HANDLES -->
```js
const TOPO_IDF = FileAttachment("dpgent/iris_pgent_idf.topojson");
const TOPO_13 = FileAttachment("dpgent/iris_pgent_13.topojson");
const DEP_PQ = {
  "75": FileAttachment("dpgent/agg_iris_75.parquet"),
  "92": FileAttachment("dpgent/agg_iris_92.parquet"),
  "93": FileAttachment("dpgent/agg_iris_93.parquet"),
  "94": FileAttachment("dpgent/agg_iris_94.parquet"),
  "13": FileAttachment("dpgent/agg_iris_13.parquet")
};
const COM_IDF_PQ = FileAttachment("dpgent/com_paris_couronne.parquet");
const COM_13_PQ = FileAttachment("dpgent/com_marseille.parquet");
```
<!-- &e FILE_HANDLES -->

<!-- &s DATA_LOAD — Chargement + filtrage communes -->
```js
const [topoIdf, topo13] = await Promise.all([TOPO_IDF.json(), TOPO_13.json()]);
const idfKey = Object.keys(topoIdf.objects)[0];
const m13Key = Object.keys(topo13.objects)[0];

// Filtrer features IDF aux 27 communes
const idfFeaturesRaw = topojson.feature(topoIdf, topoIdf.objects[idfKey]).features;
const idfFeatures = idfFeaturesRaw.filter(f => PGENT_IDF.has(f.properties.code_insee));
// Filtrer features Marseille aux 16 arrondissements
const m13FeaturesRaw = topojson.feature(topo13, topo13.objects[m13Key]).features;
const m13Features = m13FeaturesRaw.filter(f => PGENT_13.has(f.properties.code_insee));

// DuckDB load
const { db: duckDb, conn } = await initDuckDB();
const depCodes = ["75", "92", "93", "94", "13"];
const pqUrls = await Promise.all(depCodes.map(d => DEP_PQ[d].url()));
await Promise.all(depCodes.map((d, i) => duckDb.registerFileURL(`iris_${d}.parquet`, pqUrls[i], 4, false)));

async function loadDep(dep) {
  const raw = await conn.query(`SELECT * FROM 'iris_${dep}.parquet'`);
  return raw.toArray().map(r => {
    const obj = {};
    for (const field of raw.schema.fields) obj[field.name] = r[field.name];
    obj._dep = dep;
    obj._commune = String(obj.code).substring(0, 5);
    return obj;
  });
}
const allDepData = await Promise.all(depCodes.map(loadDep));

// Filtrer data aux périmètres
const idfData = [...allDepData[0], ...allDepData[1], ...allDepData[2], ...allDepData[3]]
  .filter(d => PGENT_IDF.has(d._commune));
const m13Data = allDepData[4].filter(d => PGENT_13.has(d._commune));
const allData = [...idfData, ...m13Data];

// DataMaps IRIS
const idfDataMap = new Map(idfData.map(d => [String(d.code), d]));
const m13DataMap = new Map(m13Data.map(d => [String(d.code), d]));

// Commune data via DuckDB
const [comIdfUrl, comM13Url] = await Promise.all([COM_IDF_PQ.url(), COM_13_PQ.url()]);
await duckDb.registerFileURL("com_idf.parquet", comIdfUrl, 4, false);
await duckDb.registerFileURL("com_13.parquet", comM13Url, 4, false);
async function loadComPq(table) {
  const raw = await conn.query(`SELECT * FROM '${table}'`);
  return raw.toArray().map(r => {
    const obj = {};
    for (const field of raw.schema.fields) obj[field.name] = r[field.name];
    return obj;
  });
}
const [comIdfData, comM13Data] = await Promise.all([loadComPq("com_idf.parquet"), loadComPq("com_13.parquet")]);
// Filtrer MOY_ZONE hors carte (garder pour ref tableau)
const comIdfDataMap = new Map(comIdfData.filter(d => d.code !== "MOY_ZONE").map(d => [String(d.code), d]));
const comM13DataMap = new Map(comM13Data.filter(d => d.code !== "MOY_ZONE").map(d => [String(d.code), d]));
const moyIdf = comIdfData.find(d => d.code === "MOY_ZONE");
const moyM13 = comM13Data.find(d => d.code === "MOY_ZONE");

// Commune features = dissolve IRIS by code_insee (commune)
function dissolveByCommune(topoObj, topoKey, communes) {
  const merged = [];
  for (const comCode of communes) {
    const geoms = topoObj.objects[topoKey].geometries.filter(g => g.properties.code_insee === comCode);
    if (geoms.length === 0) continue;
    const mergedGeom = topojson.merge(topoObj, geoms);
    merged.push({ type: "Feature", properties: { code_insee: comCode }, geometry: mergedGeom });
  }
  return merged;
}
const comIdfFeatures = dissolveByCommune(topoIdf, idfKey, [...PGENT_IDF]);
const comM13Features = dissolveByCommune(topo13, m13Key, [...PGENT_13]);

// Bounds serrés
const idfBounds = computeBounds(idfFeatures);
const m13Bounds = computeBounds(m13Features);
```
<!-- &e DATA_LOAD -->

<!-- &s IRIS_NAMES — Lookup noms IRIS depuis topoJSON -->
```js
// TopoJSON a nom_iris, le parquet non (libelle = TYP_IRIS numérique)
const irisNameLookup = new Map();
for (const f of [...idfFeaturesRaw, ...m13FeaturesRaw]) {
  const code = f.properties.code_iris;
  const name = f.properties.nom_iris;
  const commune = f.properties.nom_commune;
  if (code) irisNameLookup.set(code, { nom_iris: name || "", nom_commune: commune || "" });
}

// Enrichir libelle dans les données IRIS (fallback robuste)
function enrichIrisName(d) {
  const code = String(d.code || "");
  const lookup = irisNameLookup.get(code);
  if (lookup?.nom_iris) return lookup.nom_iris;
  // Fallback: commune + suffixe IRIS
  const comName = lookup?.nom_commune || d.nom_commune || "";
  const suffix = code.length >= 9 ? code.substring(5, 9) : "";
  return comName ? `${comName} ${suffix}` : code;
}

// divGauge pour tableojs : bleu (bas) → gris (neutre) → bordeaux (haut)
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

// DDICT pour tableojs (headers + formatting)
const _tblDdict = {};
_tblDdict["idxg_t2_ind"] = { short: "Idx", unit: "ind.", type: "ind" };
_tblDdict["P22_POP"] = { short: "Pop.", unit: "hab", type: "stock" };
_tblDdict["dm_pop_vtcam_1622"] = { short: "Évol.", unit: "TCAM 16-22", type: "dec1" };
_tblDdict["ecosi_etab_vol_26"] = { short: "Étab.", unit: "", type: "stock" };
_tblDdict["logd_pxmoisrev_21"] = { short: "Px/Rev", unit: "mois", type: "ratio" };
_tblDdict["ecosi_renouv_horsmE_pct_26"] = { short: "Renouv.", unit: "% hors mE", type: "pct" };
// SIRENE — pour Tab Commerce
_tblDdict["ecosi_shannon_ind_26"] = { short: "Shannon", unit: "ind.", type: "ind" };
_tblDdict["ecosi_equit_ind_26"] = { short: "Équitab.", unit: "ind.", type: "ind" };
_tblDdict["ecosi_nbdiv_vol_26"] = { short: "Nb sect.", unit: "", type: "stock" };
_tblDdict["ecosi_etabrec_pct_26"] = { short: "% récents", unit: "%", type: "pct" };
_tblDdict["ecosi_etab_denspop_26"] = { short: "Dens./1k", unit: "étab/1k", type: "ratio" };
_tblDdict["ecosi_einonemp_pct_26"] = { short: "% non-emp.", unit: "%", type: "pct" };
_tblDdict["ecosi_nafdom1_pct_26"] = { short: "% sect.dom.", unit: "%", type: "pct" };
// Commune gentri (Tab 1)
_tblDdict["idxg_t2_com_pct_top20"] = { short: "% top20%", unit: "%", type: "pct" };
// Extraire période depuis nom colonne (ex: "vdifp_1622" → "16-22")
function _extractPeriod(col) {
  const m = (col || "").match(/(\d{2})(\d{2})$/);
  return m ? m[1] + "-" + m[2] : "";
}
// Composantes CSP regroupées sous supra "Structure CSP" → besoin du label dans sub-header
const _CSP_KEYS = new Set(["cadres_evol", "ouvriers_evol"]);
for (const c of IDXG_COMPONENTS) {
  const inCSP = _CSP_KEYS.has(c.key);
  if (c.ref.t2) {
    // Sub-header: "% Cadres" pour CSP, juste "%" / "€" / "×" pour les autres (supra = label)
    const sh = inCSP ? c.refUnit + " " + c.label : c.refUnit;
    _tblDdict[c.ref.t2] = { short: sh, unit: "", type: "stock" };
  }
  if (c.evol.t2) {
    const per = _extractPeriod(c.evol.t2);
    // Sub-header: "±" avec unit "pts 16-22" ou "% 19-24" en 2ème ligne
    _tblDdict[c.evol.t2] = { short: "±", unit: c.evolUnit + (per ? " " + per : ""), type: "stock" };
  }
}
window.DDICT = _tblDdict;
```
<!-- &e IRIS_NAMES -->

<!-- &s INDICATORS_SELECT -->
```js
// Idxg pinned at top of dropdown (1 entry per concept, period via dropdown)
const IDXG_OPTIONS = [
  ["── ◆ Gentrification ──", "__sep_idxg__"],
  ["◆ Indice gentrification", "idxg_ind"],
  ["◆ Percentile gentrification", "idxg_pct"],
  ["◆ % IRIS top 20% gentri. [commune]", "idxg_com_pct_top20"],
];
// Period map for idxg (même pattern que les autres indicateurs)
const IDXG_PERIODES = new Map([["16-22", "t2"], ["11-16", "t1"]]);
// Build colKey: idxg_ind + t2 → idxg_t2_ind, idxg_ind + t1 → idxg_ind
function buildIdxgColKey(base, per) { return per === "t2" ? base.replace("idxg_", "idxg_t2_") : base; }
const availableCols = new Set(Object.keys(allDepData[0][0] || {}));
const stdOptions = [...getIndicOptionsAll(availableCols)];
// Filtrer dropdown avec whitelist curatée (indicators-dpgent.js)
// + supprimer séparateurs orphelins (sections sans indicateurs)
const filtered = [];
for (let i = 0; i < stdOptions.length; i++) {
  const [, k] = stdOptions[i];
  if (k.startsWith("__sep_")) {
    // Vérifier si au moins 1 indicateur suit dans cette section
    let hasIndic = false;
    for (let j = i + 1; j < stdOptions.length; j++) {
      const [, kj] = stdOptions[j];
      if (kj.startsWith("__sep_")) break;
      if (PGENT_ALLOWED_INDICS.has(parseColKey(kj).indic)) { hasIndic = true; break; }
    }
    if (hasIndic) filtered.push(stdOptions[i]);
  } else if (PGENT_ALLOWED_INDICS.has(parseColKey(k).indic)) {
    filtered.push(stdOptions[i]);
  }
}
const indicOptions = new Map([...IDXG_OPTIONS, ...filtered]);
```
<!-- &e INDICATORS_SELECT -->

<!-- &s SUB_BANNER -->
<style>
.pgent-sub { display:flex; flex-direction:column; gap:0; background:#eef0f4; box-shadow:0 1px 4px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06); border-bottom:1px solid #c8cdd4; font-size:11px; position:relative; z-index:2; }
.pgent-sub form { margin:0; flex:0 0 auto; width:auto !important; display:inline-flex !important; align-items:center; }
.pgent-sub select { font-size:10px; padding:0 2px; border:1px solid #c8cdd4; border-radius:3px; background:#fff; height:18px; }
.pgent-lbl { font-size:7px; font-weight:700; text-transform:uppercase; letter-spacing:0.3px; color:#8b95a3; }
.pgent-side-lbl { font-size:8px; font-weight:600; letter-spacing:0.2px; color:#4b5563; min-width:78px; margin-right:2px; white-space:nowrap; }
.pgent-grp { display:flex; align-items:center; gap:1px; flex:0 0 auto; }
.pgent-sep { width:1px; height:12px; background:#c8cdd4; margin:0 2px; flex:0 0 1px; }
.pgent-per { flex:0 0 auto; margin-left:-1px; }
.pgent-per select { max-width:70px; font-size:9.5px; padding:0 2px; background:#fff; }
.pgent-grp-indic select { max-width:195px; }
.pgent-ctrl-row { display:flex; align-items:center; gap:2px; padding:0 3px; height:24px; flex-wrap:nowrap; justify-content:flex-start !important; }
.pgent-ctrl-row > * { flex:0 0 auto !important; max-width:fit-content !important; }
/* Force Observable cell wrappers to display:contents so they don't break flex */
.pgent-grp > div:not([class*="pgent"]), .pgent-per > div:not([class*="pgent"]),
.pgent-label-chk > div:not([class*="pgent"]), .pgent-mode-sel > div:not([class*="pgent"]) { display:contents !important; }
.pgent-mode-sel select { max-width:80px; font-size:9.5px; }
.pgent-sub input[type="checkbox"] { margin:0; width:12px; height:12px; }
.pgent-sub label { font-size:9px; margin:0; white-space:nowrap; }
.pgent-row-idf { }
.pgent-row-m13 { }
/* Collapse button — below sub-banner, outside */
.pgent-collapse-btn { position:absolute; bottom:-16px; right:6px; font-size:8.5px; color:#6b7280; cursor:pointer; background:#e2e5ea; border:1px solid #c8cdd4; border-top:none; padding:1px 10px; border-radius:0 0 4px 4px; user-select:none; z-index:3; font-weight:600; letter-spacing:0.2px; }
.pgent-collapse-btn:hover { background:#c5cad3; color:#374151; }
.pgent-sub.pgent-collapsed .pgent-ctrl-row { display:none; }
.pgent-sub.pgent-collapsed { min-height:4px; }
.pgent-sub.pgent-collapsed .pgent-collapse-btn { bottom:-16px; background:#d0d5dd; }
/* Hide MapLibre zoom +/- buttons only (NavigationControl has .maplibregl-ctrl-zoom-in) */
.maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out, .maplibregl-ctrl-compass { display:none !important; }
.pgent-table-col .scatter-container button[title="Zoom avant"],
.pgent-table-col .scatter-container button[title="Zoom arrière"],
.pgent-table-col .scatter-container button[title="Reset zoom"] { display:none !important; }
.pgent-sub .pgent-label-chk { display:inline-flex; align-items:center; gap:1px; margin-left:1px; }
.pgent-sub .pgent-label-chk label { font-size:8.5px; color:#6b7280; }
.pgent-sub select:disabled { opacity:0.4; }
</style>

<div class="pgent-sub">

<div class="pgent-ctrl-row pgent-row-idf">
<span class="pgent-side-lbl">Vue gauche (X)</span>

<div class="pgent-grp pgent-grp-indic">

```js
const indic1 = view(Inputs.select(indicOptions, { value: "idxg_ind", label: "" }));
```

</div>
<div class="pgent-per">

```js
const per1Map = indic1.startsWith("idxg_") ? IDXG_PERIODES : getPeriodesForIndicateur(indic1, availableCols);
const per1Vals = [...per1Map.values()];
const periode1 = per1Vals.length > 0
  ? view(Inputs.select(per1Map, { value: per1Vals[0], label: "" }))
  : null;
```

</div>

<div class="pgent-sep"></div>

<span class="pgent-lbl">Maille</span>
<div class="pgent-grp">

```js
const _viewMode1 = view(Inputs.radio(new Map([["IRIS", "iris"], ["Commune ARM", "commune"]]), { value: "commune", label: "" }));
```

</div>

<div class="pgent-sep"></div>

<span class="pgent-lbl">Mode légende</span>
<div class="pgent-grp pgent-mode-sel">

```js
const paletteMode1 = view(Inputs.select(new Map([["Quintiles", "abs"], ["Écart moy.", "ecart"], ["Gradient", "gradient"]]), { value: "gradient", label: "" }));
```

</div>

<div class="pgent-sep"></div>

<div class="pgent-label-chk">

```js
const _labelShow1 = view(Inputs.toggle({ label: "Label", value: true }));
```

</div>
<div class="pgent-grp pgent-mode-sel">

```js
const _labelMode1 = view(Inputs.select(new Map([["Top 5", "top5"], ["Top 10", "top10"], ["Top 5+Bot 5", "top5bot5"], ["Bot 5", "bot5"], ["Pop.", "pop"]]), { value: "top5", label: "", disabled: !_labelShow1 }));
```

</div>
</div>

<div class="pgent-ctrl-row pgent-row-m13">
<span class="pgent-side-lbl">Vue droite (Y)</span>

<div class="pgent-grp pgent-grp-indic">

```js
const indic2 = view(Inputs.select(indicOptions, { value: "idxg_ind", label: "" }));
```

</div>
<div class="pgent-per">

```js
const per2Map = indic2.startsWith("idxg_") ? IDXG_PERIODES : getPeriodesForIndicateur(indic2, availableCols);
const per2Vals = [...per2Map.values()];
const periode2 = per2Vals.length > 0
  ? view(Inputs.select(per2Map, { value: per2Vals[0], label: "" }))
  : null;
```

</div>

<div class="pgent-sep"></div>

<span class="pgent-lbl">Maille</span>
<div class="pgent-grp">

```js
const _viewMode2 = view(Inputs.radio(new Map([["IRIS", "iris"], ["Commune ARM", "commune"]]), { value: "iris", label: "" }));
```

</div>

<div class="pgent-sep"></div>

<span class="pgent-lbl">Mode légende</span>
<div class="pgent-grp pgent-mode-sel">

```js
const paletteMode2 = view(Inputs.select(new Map([["Quintiles", "abs"], ["Écart moy.", "ecart"], ["Gradient", "gradient"]]), { value: "ecart", label: "" }));
```

</div>

<div class="pgent-sep"></div>

<div class="pgent-label-chk">

```js
const _labelShow2 = view(Inputs.toggle({ label: "Label", value: true }));
```

</div>
<div class="pgent-grp pgent-mode-sel">

```js
const _labelMode2 = view(Inputs.select(new Map([["Top 5", "top5"], ["Top 10", "top10"], ["Top 5+Bot 5", "top5bot5"], ["Bot 5", "bot5"], ["Pop.", "pop"]]), { value: "top5", label: "", disabled: !_labelShow2 }));
```

</div>
</div>

</div>

```js
// Collapse button — horizontal, bottom-right of sub-banner
{
  const sub = document.querySelector(".pgent-sub");
  if (sub && !sub.querySelector(".pgent-collapse-btn")) {
    const btn = document.createElement("button");
    btn.className = "pgent-collapse-btn";
    btn.textContent = "▲ Masquer";
    btn.onclick = () => {
      const collapsed = sub.classList.toggle("pgent-collapsed");
      btn.textContent = collapsed ? "▼ Options" : "▲ Masquer";
    };
    sub.appendChild(btn);
  }
}
```
<!-- &e SUB_BANNER -->

<!-- &s TAB_BAR — 3 onglets narratifs : Gentrification / Commerce / Croisement -->
```js
const TAB_QUESTIONS = {
  gentri: "Quelles communes et quartiers se gentrifient, à quel rythme, et avec quelle hétérogénéité intra-communale ?",
  commerce: "Quel est le tissu économique local à l'IRIS ?",
  explor: ""
};
```
```js
const _tabBarEl = (() => {
  const el = document.createElement("div");
  el.style.cssText = "display:flex;flex-direction:column;background:#f3f4f6;";
  el.value = "gentri";
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:2px;padding:2px 8px 0;";
  const qDiv = document.createElement("div");
  qDiv.className = "pgent-tab-question";
  qDiv.style.cssText = "padding:8px 12px 4px;font-size:12.5px;font-weight:500;color:#4b5563;min-height:20px;";
  qDiv.textContent = TAB_QUESTIONS["gentri"];
  for (const [label, key, icon] of [["Gentrification", "gentri", "◆"], ["Tissu économique", "commerce", "⛋"], ["Croisement libre", "explor", "⊞"]]) {
    const btn = document.createElement("button");
    btn.textContent = `${icon} ${label}`;
    btn.dataset.key = key;
    const isFirst = key === "gentri";
    btn.style.cssText = `padding:3px 12px;font-size:11.5px;font-weight:${isFirst ? 700 : 500};cursor:pointer;border:1px solid ${isFirst ? "#c5c9d0" : "#d1d5db"};border-radius:4px;background:${isFirst ? "#fff" : "#f9fafb"};color:${isFirst ? "#dc2626" : "#6b7280"};transition:all 0.15s;box-shadow:${isFirst ? "0 1px 3px rgba(0,0,0,0.06)" : "none"};`;
    btn.onmouseenter = () => { if (btn.dataset.key !== el.value) { btn.style.background = "#eef0f3"; btn.style.borderColor = "#b0b5bd"; } };
    btn.onmouseleave = () => { if (btn.dataset.key !== el.value) { btn.style.background = "#f9fafb"; btn.style.borderColor = "#d1d5db"; } };
    btn.onclick = () => {
      el.value = key;
      el.dispatchEvent(new Event("input"));
      qDiv.textContent = TAB_QUESTIONS[key] || "";
      for (const b of row.querySelectorAll("button")) {
        const active = b.dataset.key === key;
        b.style.fontWeight = active ? "700" : "500";
        b.style.border = active ? "1px solid #c5c9d0" : "1px solid #d1d5db";
        b.style.background = active ? "#fff" : "#f9fafb";
        b.style.color = active ? "#dc2626" : "#6b7280";
        b.style.boxShadow = active ? "0 1px 3px rgba(0,0,0,0.06)" : "none";
      }
    };
    row.appendChild(btn);
  }
  el.appendChild(row);
  el.appendChild(qDiv);
  return el;
})();
const activeTab = view(_tabBarEl);
```
<!-- &e TAB_BAR -->

<!-- &s TAB_PRESETS — Indicateurs par défaut selon onglet actif -->
```js
{
  const PRESETS = {
    gentri: ["idxg_ind", "idxg_ind"],
    commerce: ["ecosi_shannon_ind", "ecosi_renouv_horsmE_pct"],
  };
  const p = PRESETS[activeTab];
  if (p) {
    const f1 = document.querySelector(".pgent-row-idf .pgent-grp-indic form");
    const f2 = document.querySelector(".pgent-row-m13 .pgent-grp-indic form");
    if (f1 && f1.value !== p[0]) { f1.value = p[0]; f1.dispatchEvent(new Event("input", {bubbles: true})); }
    if (f2 && f2.value !== p[1]) { f2.value = p[1]; f2.dispatchEvent(new Event("input", {bubbles: true})); }
  }
}
```
<!-- &e TAB_PRESETS -->

<!-- &s KPI_REACTIVE — KPI strips réactifs selon tab actif -->
```js
{
  const kpiIdf = document.getElementById("kpi-idf");
  const kpiM13 = document.getElementById("kpi-m13");
  if (kpiIdf) {
    kpiIdf.innerHTML = "";
    kpiIdf.appendChild(activeTab === "commerce" ? buildCommerceKpiTable(idfData, "#7f1d1d") : buildIdxKpiTable(idfData, "#7f1d1d"));
  }
  if (kpiM13) {
    kpiM13.innerHTML = "";
    kpiM13.appendChild(activeTab === "commerce" ? buildCommerceKpiTable(m13Data, "#1e3a5f") : buildIdxKpiTable(m13Data, "#1e3a5f"));
  }
}
```
<!-- &e KPI_REACTIVE -->

<!-- &s COLKEYS — Toujours piloté par les dropdowns (pas d'override preset) -->
```js
const colKey1 = indic1.startsWith("idxg_") ? buildIdxgColKey(indic1, periode1) : buildColKey(indic1, periode1);
const colKey2 = indic2.startsWith("idxg_") ? buildIdxgColKey(indic2, periode2) : buildColKey(indic2, periode2);
const viewMode1 = _viewMode1;
const viewMode2 = _viewMode2;
const labelMode1 = _labelMode1;
const labelMode2 = _labelMode2;
```
<!-- &e COLKEYS -->

<!-- &s BINS_REACTIVE — Bins indépendants IDF / Marseille, per-side viewMode -->
```js
// Per-side viewMode: left (map1) and right (map2) can differ (Tab 1 = commune left / IRIS right)
const activeIdfData1 = viewMode1 === "commune" ? comIdfData : idfData;
const activeIdfData2 = viewMode2 === "commune" ? comIdfData : idfData;
const activeM13Data1 = viewMode1 === "commune" ? comM13Data : m13Data;
const activeM13Data2 = viewMode2 === "commune" ? comM13Data : m13Data;
const _checkActive1 = viewMode1 === "commune" ? (() => true) : isIrisActive;
const _checkActive2 = viewMode2 === "commune" ? (() => true) : isIrisActive;
const binsIdf1 = computeIrisBins(activeIdfData1, colKey1, paletteMode1, _checkActive1);
const binsIdf2 = computeIrisBins(activeIdfData2, colKey2, paletteMode2, _checkActive2);
const binsM1 = computeIrisBins(activeM13Data1, colKey1, paletteMode1, _checkActive1);
const binsM2 = computeIrisBins(activeM13Data2, colKey2, paletteMode2, _checkActive2);
const getColorIdf1 = makeGetColor(binsIdf1, _checkActive1);
const getColorIdf2 = makeGetColor(binsIdf2, _checkActive2);
const getColorM1 = makeGetColor(binsM1, _checkActive1);
const getColorM2 = makeGetColor(binsM2, _checkActive2);
```
<!-- &e BINS_REACTIVE -->

<!-- &s HELPERS — Fonctions pures (pas de dep réactive sur paletteMode) -->
```js
// &s IDXG_META — Métadonnées indices gentrification IRIS
const IDXG_LABELS = {
  "idxg_ind": "◆ Indice gentrification 11-16",
  "idxg_t2_ind": "◆ Indice gentrification 16-22",
  "idxg_pct": "◆ Percentile gentrification 11-16",
  "idxg_t2_pct": "◆ Percentile gentrification 16-22",
  "idxg_com_pct_top20": "% IRIS top 20% gentri. 11-16 [commune]",
  "idxg_t2_com_pct_top20": "% IRIS top 20% gentri. 16-22 [commune]",
};
const IDXG_ZSCORES = {
  t1: ["idxg_z_cadres_evol", "idxg_z_emmenrec_evol", "idxg_z_ouvriers_evol", "idxg_z_prop_evol", "idxg_z_px_evol", "idxg_z_ratio_px_rev", "idxg_z_revmed_evol"],
  t2: ["idxg_t2_z_cadres_evol", "idxg_t2_z_emmenrec_evol", "idxg_t2_z_ouvriers_evol", "idxg_t2_z_prop_evol", "idxg_t2_z_px_evol", "idxg_t2_z_ratio_px_rev", "idxg_t2_z_revmed_evol"],
};
// Mapping z-score → colonnes brutes (T2 complet, T1 partiel)
const IDXG_COMPONENTS = [
  { key: "cadres_evol", label: "Cadres", evol: { t2: "dsp_csp_cadres_vdifp_1622" }, ref: { t2: "dsp_csp_cadres_pct_22" }, evolUnit: "pts", refUnit: "%", refFmt: 1 },
  { key: "emmenrec_evol", label: "Emménag. réc.", evol: { t2: "log_emmenrec_vdifp_1622" }, ref: { t2: "log_emmenrec_pct_22" }, evolUnit: "pts", refUnit: "%", refFmt: 1 },
  { key: "ouvriers_evol", label: "Ouvriers", evol: { t2: "dsp_csp_ouvriers_vdifp_1622" }, ref: { t2: "dsp_csp_ouvriers_pct_22" }, evolUnit: "pts", refUnit: "%", refFmt: 1 },
  { key: "prop_evol", label: "Propriétaires", evol: { t2: "log_prop_vdifp_1622" }, ref: { t2: "log_prop_pct_22" }, evolUnit: "pts", refUnit: "%", refFmt: 1 },
  { key: "px_evol", label: "Prix m²/appt", evol: { t2: "logd_px2_glb_vevol_1624" }, ref: { t2: "logd_px2mm3_appt_24" }, evolUnit: "%", refUnit: "€", refFmt: 0 },
  { key: "revmed_evol", label: "Rev. médian", evol: { t2: "rev_med_vevol_1921" }, ref: { t2: "rev_med_21" }, evolUnit: "%", refUnit: "€", refFmt: 0 },
  { key: "ratio_px_rev", label: "Ratio prix/rev.", evol: {}, ref: { t2: "logd_pxmoisrev_21" }, evolUnit: "", refUnit: " mois", refFmt: 1 },
];
function getIdxgZscores(colKey) {
  if (!colKey.startsWith("idxg_")) return [];
  return colKey.includes("t2") ? IDXG_ZSCORES.t2 : IDXG_ZSCORES.t1;
}
// Colonnes brutes à inclure dans extraProps pour tooltip enrichi
function getIdxgRawCols(colKey) {
  if (!colKey.startsWith("idxg_")) return [];
  const period = colKey.includes("t2") ? "t2" : "t1";
  const cols = [];
  for (const c of IDXG_COMPONENTS) {
    if (c.evol[period]) cols.push(c.evol[period]);
    if (c.ref[period]) cols.push(c.ref[period]);
  }
  // Include idx value + commune aggregates for commune-level tooltip
  cols.push(period === "t2" ? "idxg_t2_ind" : "idxg_ind");
  cols.push(period === "t2" ? "idxg_t2_com_med" : "idxg_com_med");
  cols.push(period === "t2" ? "idxg_t2_com_sd" : "idxg_com_sd");
  return cols;
}
// &e IDXG_META

// &s EXPAND_OVERLAY — Modal overlay expand (maps, scatter, table)
function expandOverlay(el, opts = {}) {
  if (el._expanded) return;
  el._expanded = true;
  const origStyle = el.style.cssText;

  // Backdrop sombre
  const backdrop = document.createElement("div");
  backdrop.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0);z-index:9998;transition:background 0.2s;";
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => { backdrop.style.background = "rgba(0,0,0,0.6)"; });

  // Bouton Close ✕
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "Close &times;";
  closeBtn.style.cssText = "position:fixed;top:12px;right:20px;z-index:10001;font-size:14px;padding:6px 14px;cursor:pointer;background:#fff;border:1px solid #d1d5db;border-radius:4px;color:#374151;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.15);";
  document.body.appendChild(closeBtn);

  // Expand element in place (CSS fixed)
  el.style.cssText = "position:fixed;top:3vh;left:3vw;width:94vw;height:92vh;z-index:9999;background:#fff;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.3);overflow:hidden;";
  opts.onOpen?.();

  function close() {
    el.style.cssText = origStyle;
    el._expanded = false;
    backdrop.remove();
    closeBtn.remove();
    document.removeEventListener("keydown", onEsc);
    opts.onClose?.();
  }

  const onEsc = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onEsc);
  backdrop.onclick = close;
  closeBtn.onclick = close;
}
// &e EXPAND_OVERLAY

function computeIrisBins(data, colKey, mode, checkActive = isIrisActive) {
  const activeData = data.filter(d => checkActive(d));
  const vals = activeData.map(d => d[colKey]).filter(v => v != null && !isNaN(v));
  if (vals.length === 0) return { thresholds: [0], palette: ["#ccc"], counts: [0], mean: 0, mode, isGradient: false };
  vals.sort((a, b) => a - b);
  const mean = d3.mean(vals);
  const isVariation = colKey.includes("vtcam") || colKey.includes("vevol") || colKey.includes("vdifp");

  if (mode === "gradient") {
    const grad = createGradientScale(activeData, colKey, { divergent: isVariation || undefined });
    return { ...grad, mode, isGradient: true, mean, counts: [], palette: grad.palette };
  }

  let thresholds, palette;
  if (mode === "ecart") {
    const sd = d3.deviation(vals) || 1;
    thresholds = [-2*sd, -1.5*sd, -sd, -0.3*sd, 0.3*sd, sd, 1.5*sd, 2*sd].map(t => mean + t);
    palette = PAL_ECART_FRANCE;
  } else if (isVariation) {
    const p05 = d3.quantile(vals, 0.05), p95 = d3.quantile(vals, 0.95);
    const absMax = Math.max(Math.abs(p05), Math.abs(p95));
    const s = absMax / 3.5;
    thresholds = [-3*s, -2*s, -s, -s*0.15, s*0.15, s, 2*s];
    palette = PAL_PURPLE_GREEN;
  } else if (colKey.startsWith("idxg_") && !colKey.includes("_z_") && !colKey.includes("_com_")) {
    // Indices gentrification IRIS (0-100 centré 50) — PAL_ECART_FRANCE bleu→blanc→bordeaux
    // Exclut idxg_*_com_* (agrégats commune = % séquentiel, pas centré 50)
    const sd = d3.deviation(vals) || 8;
    thresholds = [50-2.5*sd, 50-1.5*sd, 50-sd, 50-0.3*sd, 50+0.3*sd, 50+sd, 50+1.5*sd, 50+2.5*sd];
    palette = PAL_ECART_FRANCE;
  } else {
    const q = (p) => vals[Math.min(Math.floor(p * vals.length), vals.length - 1)];
    thresholds = [q(0.05), q(0.20), q(0.40), q(0.60), q(0.80), q(0.95)];
    palette = PAL_SEQ7_BYRV;
  }

  // Compteurs IRIS par bin
  const counts = new Array(palette.length).fill(0);
  for (const v of vals) {
    let bi = palette.length - 1;
    for (let i = 0; i < thresholds.length; i++) { if (v < thresholds[i]) { bi = i; break; } }
    counts[bi]++;
  }
  return { thresholds, palette, counts, mean, mode, isGradient: false };
}

function makeGetColor(bins, checkActive = isIrisActive) {
  if (bins.isGradient) {
    return (val, row) => {
      if (row && !checkActive(row)) return GREY_INACTIVE;
      if (val == null || isNaN(val)) return GREY_NA;
      return bins.getColor(val);
    };
  }
  const { thresholds: t, palette: p } = bins;
  return (val, row) => {
    if (row && !checkActive(row)) return GREY_INACTIVE;
    if (val == null || isNaN(val)) return GREY_NA;
    if (val < t[0]) return p[0];
    for (let i = 0; i < t.length - 1; i++) { if (val < t[i + 1]) return p[i + 1]; }
    return p[p.length - 1];
  };
}

function getBinIdx(bins, val) {
  if (val == null || isNaN(val) || bins.isGradient) return -1;
  const { thresholds: t } = bins;
  if (val < t[0]) return 0;
  for (let i = 0; i < t.length - 1; i++) { if (val < t[i + 1]) return i + 1; }
  return bins.palette.length - 1;
}

function makeTooltipFn(mapEl) {
  return (props) => {
    const isCom = mapEl._viewMode === "commune";
    const name = isCom
      ? (props._libelle || props.code_insee || "?")
      : (props.nom_iris || props._label || props.code_iris || "?");
    const commune = isCom ? "" : (props.nom_commune || props._nom_commune || "");
    const val = props._val;
    const colKey = mapEl._colKey || "";
    const isIdx = colKey.startsWith("idxg_");
    const label = isIdx ? (IDXG_LABELS[colKey]?.replace(/^◆\s*/, "") || colKey) : getColLabel(colKey, null, "short");
    const valStr = val != null ? (isIdx ? Number(val).toFixed(1) : formatValue(colKey, val)) : "n.d.";
    const pop = props._P22_POP || 0;
    const etab = props._NB_ETAB || 0;
    const isGreyed = isCom ? false : !isIrisActive({ P22_POP: pop, ecosi_etab_vol_26: etab });
    const zm = mapEl._zoneMean;
    const zl = mapEl._zoneLabel;
    const unit = isCom ? "communes" : "IRIS";

    // Percentile + rank (compact)
    let pct = null, rank = null, total = 0;
    if (val != null && mapEl._sortedVals?.length > 0) {
      const sv = mapEl._sortedVals;
      total = sv.length;
      pct = Math.round(100 * d3.bisectLeft(sv, val) / total);
      rank = total - d3.bisectLeft(sv, val);
    }

    // L1 — Name + commune
    const lines = [`<b>${name}</b>${commune ? ` <span style="color:#94a3b8;font-size:10px;">${commune}</span>` : ""}`];
    if (isGreyed) {
      lines.push(`<span style="color:#f87171;font-size:10px;">Non classé</span>`);
    }

    // L2 — Value (compact, one line)
    lines.push(`<span style="color:#93c5fd;">${label}</span> : <b>${valStr}</b>`);

    // L3 — P{pct} · rank/total · moy.zone (one compact line)
    const metaParts = [];
    if (pct != null) metaParts.push(`P${pct} · ${rank}<sup style="font-size:6px;">e</sup>/${total} ${unit}`);
    if (zm != null && zl) {
      const zmStr = isIdx ? Number(zm).toFixed(1) : formatValue(colKey, zm);
      metaParts.push(`moy.${zl}: ${zmStr}`);
    }
    if (metaParts.length) {
      lines.push(`<span style="color:#94a3b8;font-size:10px;">${metaParts.join(" · ")}</span>`);
    }
    // Commune-level _com_ : show median idx + SD
    if (isIdx && colKey.includes("_com_") && isCom) {
      const period = colKey.includes("t2") ? "t2" : "t1";
      const medKey = `_${period === "t2" ? "idxg_t2_com_med" : "idxg_com_med"}`;
      const sdKey = `_${period === "t2" ? "idxg_t2_com_sd" : "idxg_com_sd"}`;
      const medVal = props[medKey], sdVal = props[sdKey];
      if (medVal != null) {
        let l = `<span style="color:#a78bfa;font-size:10.5px;">◆ Idx médian IRIS : <b>${Number(medVal).toFixed(1)}</b>`;
        if (sdVal != null) l += ` <span style="color:#94a3b8;font-size:9px;">(σ ${Number(sdVal).toFixed(1)})</span>`;
        l += `</span>`;
        lines.push(l);
      }
    }
    // Composantes idx gentrification (barres visuelles + valeur brute + évolution)
    if (isIdx && val != null) {
      const period = colKey.includes("t2") ? "t2" : "t1";
      const perLabel = period === "t2" ? "16-22" : "11-16";
      const refYear = period === "t2" ? "22" : "16";
      const zPrefix = period === "t2" ? "idxg_t2_z_" : "idxg_z_";
      const compLines = [];
      // Header colonnes
      compLines.push(
        `<span style="display:inline-flex;gap:3px;font-size:7.5px;color:#64748b;font-weight:600;letter-spacing:0.2px;margin-top:2px;">` +
        `<span style="width:64px;display:inline-block;"></span>` +
        `<span style="width:36px;"></span>` +
        ` <span style="width:50px;text-align:right;">niveau ${refYear}</span>` +
        ` <span>△ ${perLabel}</span>` +
        `</span>`
      );
      for (const c of IDXG_COMPONENTS) {
        const zKey = `_${zPrefix}${c.key}`;
        const zVal = props[zKey];
        if (zVal == null) continue;
        const rawRef = c.ref[period] ? props[`_${c.ref[period]}`] : null;
        const rawEvol = c.evol[period] ? props[`_${c.evol[period]}`] : null;
        const zNum = Number(zVal);
        const barW = Math.min(Math.abs(zNum), 3) * 12;
        const barCol = zNum > 0 ? "#f87171" : "#60a5fa";
        const barDir = zNum > 0 ? "right" : "left";
        let refStr = "";
        if (rawRef != null) {
          const rv = c.refFmt === 0 ? Math.round(Number(rawRef)).toLocaleString("fr-FR") : Number(rawRef).toFixed(c.refFmt);
          refStr = `<span style="color:#cbd5e1;width:50px;text-align:right;display:inline-block;">${rv}${c.refUnit}</span>`;
        }
        let evolStr = "";
        if (rawEvol != null) {
          const ev = Number(rawEvol);
          const evTxt = (ev > 0 ? "+" : "") + (c.evolUnit === "pts" ? ev.toFixed(1) + " pts" : ev.toFixed(1) + "%");
          const evCol = ev > 0 ? "#f87171" : ev < 0 ? "#60a5fa" : "#94a3b8";
          evolStr = `<span style="color:${evCol};font-weight:600;">${evTxt}</span>`;
        }
        compLines.push(
          `<span style="display:inline-flex;align-items:center;gap:3px;font-size:9.5px;">` +
          `<span style="color:#94a3b8;width:64px;display:inline-block;">${c.label}</span>` +
          `<span style="display:inline-block;width:36px;height:5px;background:#1e293b;border-radius:2px;position:relative;overflow:hidden;">` +
          `<span style="position:absolute;${barDir === "right" ? "left:50%" : `right:50%`};top:0;height:100%;width:${barW}px;background:${barCol};border-radius:2px;"></span></span>` +
          ` ${refStr}` +
          ` ${evolStr}` +
          `</span>`
        );
      }
      if (compLines.length > 1) {
        lines.push(compLines.join("<br>"));
      }
    }
    // Pop + Étab sur même ligne
    const popParts = [];
    if (pop) popParts.push(`Pop. ${Math.round(Number(pop)).toLocaleString("fr-FR")}`);
    if (etab && !isCom) popParts.push(`${Number(etab).toLocaleString("fr-FR")} étab.`);
    if (popParts.length) lines.push(`<span style="color:#64748b;font-size:10px;">${popParts.join(" · ")}</span>`);
    // Tooltip enrichi SIRENE — seulement pour indicateurs ecosi_*
    if (colKey.startsWith("ecosi_") && (props._ecosi_etab_vol_26 != null || props._ecosi_shannon_ind_26 != null)) {
      const m = mapEl._ecoMeans || {};
      const _hdr = (t) => `<span style="color:#475569;font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;display:block;border-top:1px solid #334155;padding-top:1px;margin-top:1px;">${t}</span>`;
      const _ecart = (v, avg, u, d) => {
        if (v == null || avg == null) return "";
        const diff = Number(v) - avg;
        const sign = diff > 0 ? "+" : "";
        const col = Math.abs(diff) < 0.5 ? "#94a3b8" : diff > 0 ? "#f87171" : "#60a5fa";
        const dStr = d === 0 ? Math.round(diff).toLocaleString("fr-FR") : diff.toFixed(d);
        return `<span style="color:${col};font-size:9px;"> (${sign}${dStr}${u})</span>`;
      };
      const _row = (label, val, ecart) => `<span style="font-size:9px;color:#cbd5e1;">${label} : <b style="color:#e2e8f0;font-size:9px;">${val}</b>${ecart}</span>`;
      const ecoLines = [];
      ecoLines.push(_hdr("Structure"));
      const etabV = props._ecosi_etab_vol_26;
      if (etabV != null) ecoLines.push(_row("Étab.", `${Math.round(Number(etabV)).toLocaleString("fr-FR")}`, _ecart(etabV, m.ecosi_etab_vol_26, "", 0)));
      const densV = props._ecosi_etab_denspop_26;
      if (densV != null) ecoLines.push(_row("Densité", `${Number(densV).toFixed(1)} / 1 000 hab`, _ecart(densV, m.ecosi_etab_denspop_26, "", 1)));
      const socV = props._ecosi_soc_pct_26;
      if (socV != null) ecoLines.push(_row("Sociétés", `${Number(socV).toFixed(0)}%`, _ecart(socV, m.ecosi_soc_pct_26, " pts", 1)));
      const empV = props._ecosi_emp_pct_26;
      if (empV != null) ecoLines.push(_row("Employeurs", `${Number(empV).toFixed(0)}%`, _ecart(empV, m.ecosi_emp_pct_26, " pts", 1)));
      const meV = props._ecosi_einonemp_pct_26;
      if (meV != null) ecoLines.push(_row("Micro-E", `${Number(meV).toFixed(0)}%`, _ecart(meV, m.ecosi_einonemp_pct_26, " pts", 1)));
      ecoLines.push(_hdr("Diversité sectorielle"));
      const shanV = props._ecosi_shannon_ind_26;
      if (shanV != null) ecoLines.push(_row("Shannon", `${Number(shanV).toFixed(2)} (max 3.64)`, _ecart(shanV, m.ecosi_shannon_ind_26, "", 2)));
      const nbdivV = props._ecosi_nbdiv_vol_26;
      if (nbdivV != null) ecoLines.push(_row("Secteurs", `${Math.round(Number(nbdivV))} / 38`, _ecart(nbdivV, m.ecosi_nbdiv_vol_26, "", 0)));
      ecoLines.push(_hdr("Renouvellement"));
      const recV = props._ecosi_etabrec_pct_26;
      if (recV != null) ecoLines.push(_row("Renouvellement", `${Number(recV).toFixed(0)}% (depuis 2020)`, _ecart(recV, m.ecosi_etabrec_pct_26, " pts", 1)));
      const renV = props._ecosi_renouv_horsmE_pct_26;
      if (renV != null) ecoLines.push(_row("Hors micro-E", `${Number(renV).toFixed(0)}%`, _ecart(renV, m.ecosi_renouv_horsmE_pct_26, " pts", 1)));
      if (recV != null && renV != null) {
        const ecartPts = (Number(recV) - Number(renV)).toFixed(1);
        const porteMsg = Number(ecartPts) > 0 ? "porté par micro-E" : "tiré par sociétés";
        ecoLines.push(`<span style="font-size:8.5px;color:#94a3b8;font-style:italic;">(écart ${ecartPts} pts = ${porteMsg})</span>`);
      }
      // Secteurs surreprésentés — String() pour Arrow types DuckDB-WASM
      let sd1 = props._ecosi_nafdom1_lib_26 != null ? String(props._ecosi_nafdom1_lib_26) : null;
      let sd1p = props._ecosi_nafdom1_pct_26, sd1q = props._ecosi_nafdom1ql_ind_26;
      let sd2 = props._ecosi_nafdom2_lib_26 != null ? String(props._ecosi_nafdom2_lib_26) : null;
      let sd2p = props._ecosi_nafdom2_pct_26, sd2q = props._ecosi_nafdom2ql_ind_26;
      if (!sd1 && isCom && props._code) {
        const nf = (mapEl._nafdomLookup || {})[props._code];
        if (nf) { sd1 = nf.lib1; sd2 = nf.lib2; }
      }
      if (sd1 || sd1p != null) {
        ecoLines.push(_hdr("Secteurs surreprésentés"));
        const ql1 = sd1q != null ? ` (QL ${Number(sd1q).toFixed(1)})` : "";
        ecoLines.push(`<span style="color:#a5b4fc;font-size:8.5px;">1. ${sd1 || "Sect. 1"} — ${sd1p != null ? Number(sd1p).toFixed(0) : "?"}%${ql1}</span>`);
        if (sd2 || sd2p != null) {
          const ql2 = sd2q != null ? ` (QL ${Number(sd2q).toFixed(1)})` : "";
          ecoLines.push(`<span style="color:#a5b4fc;font-size:8.5px;">2. ${sd2 || "Sect. 2"} — ${sd2p != null ? Number(sd2p).toFixed(0) : "?"}%${ql2}</span>`);
        }
      }
      lines.push(ecoLines.join("<br>"));
    }
    return lines.join("<br>");
  };
}

function makeLegend(bins, colKey, onFilter, zoneMean, naCount, zoneLabel) {
  const isIdx = colKey.startsWith("idxg_");
  const baseUnit = isIdx ? (colKey.includes("pct") ? "%" : "ind.") : (INDICATEURS[parseColKey(colKey).indic]?.unit || "");
  const wrap = document.createElement("div");

  if (bins.isGradient) {
    const el = createGradientLegend({
      colors: bins.palette, min: bins.min, max: bins.max,
      unit: baseUnit, showZero: bins.divergent, capped: true, rawMin: bins.rawMin, rawMax: bins.rawMax
    });
    wrap.appendChild(el);
  } else {
    const unit = bins.mode === "ecart" ? "±moy." : baseUnit;
    const bar = createBinsLegendBar({
      colors: bins.palette, thresholds: bins.thresholds, counts: bins.counts, unit,
      interactive: true, onFilter,
      echelonValue: zoneMean, echelonLabel: zoneLabel ? `Moy. ${zoneLabel}` : ""
    });
    // Compacter vertical — réduire toutes les rows internes
    for (const row of bar.children) {
      if (row.tagName !== 'DIV') continue;
      const h = parseInt(row.style.height);
      if (h >= 14) { row.style.height = '10px'; row.style.marginBottom = '-1px'; }
      else if (h >= 10) row.style.height = '7px';
    }
    wrap.appendChild(bar);
  }

  // N.R. inline à droite des bins (compact)
  if (naCount > 0) {
    const outer = document.createElement("div");
    outer.style.cssText = "display:flex;align-items:flex-end;gap:6px;";
    // Déplace le contenu bar dans outer
    while (wrap.firstChild) outer.appendChild(wrap.firstChild);
    const naEl = document.createElement("span");
    naEl.style.cssText = "display:flex;align-items:center;gap:3px;white-space:nowrap;padding-bottom:1px;";
    naEl.innerHTML = `<span style="display:inline-block;width:12px;height:6px;background:${GREY_NA};border:0.5px solid rgba(0,0,0,0.15);border-radius:1px;"></span>`
      + `<span style="font-size:7.5px;color:#9ca3af;">N.R. ${naCount}</span>`;
    outer.appendChild(naEl);
    wrap.appendChild(outer);
  }
  return wrap;
}

function buildGentSource(features, dataMap, colKey, getColorFn, opts) {
  const { codeProperty = "code_iris", extraProps = [], bins = null, checkActive = isIrisActive } = opts;
  return {
    type: "FeatureCollection",
    features: features.map(f => {
      const code = f.properties[codeProperty];
      const d = dataMap.get(code);
      const val = d?.[colKey] ?? null;
      const color = d ? getColorFn(val, d) : GREY_NA;
      const enriched = { _fill: color, _val: val, _code: code, _hoverCode: code };
      enriched._binIdx = (bins && !bins.isGradient && d && checkActive(d)) ? getBinIdx(bins, val) : -1;
      enriched._label = f.properties.nom_iris || d?.libelle || code;
      enriched._P22_POP = d?.P22_POP || 0;
      enriched._NB_ETAB = d?.ecosi_etab_vol_26 || 0;
      enriched._TYP_IRIS = d?.TYP_IRIS || f.properties.type_iris || "";
      for (const p of extraProps) {
        if (d?.[p] != null) enriched["_" + p] = d[p];
        else if (f.properties[p] != null) enriched["_" + p] = f.properties[p];
      }
      return { ...f, properties: { ...f.properties, ...enriched } };
    })
  };
}
```
<!-- &e HELPERS -->

<!-- &s LAYOUT — 2 city rows : maps (58%) + table panel (40%) -->

```js
const _idfN = idfData.filter(isIrisActive).length;
const _m13N = m13Data.filter(isIrisActive).length;

// Helper — KPI strip composantes idx + contexte pour une zone
function buildIdxKpiTable(zoneData, accent) {
  const all = zoneData.filter(d => d.code !== "MOY_ZONE");
  const active = all.filter(d => d.idxg_t2_ind != null);
  const med = (data, col) => { const v = data.map(d => d[col]).filter(v => v != null && !isNaN(v)); return v.length ? d3.median(v) : null; };
  const total = (data, col) => { const v = data.map(d => d[col]).filter(v => v != null && !isNaN(v)); return v.length ? d3.sum(v) : null; };
  const evolColor = (v) => v == null ? "#9ca3af" : v > 0 ? "#dc2626" : v < 0 ? "#2563eb" : "#6b7280";
  const fvk = (v) => v != null ? Math.round(v).toLocaleString("fr-FR") : "—";
  const fvEur = (v) => v != null ? Math.round(v).toLocaleString("fr-FR") + " €" : "—";
  const fvPct = (v, dec = 1) => v != null ? v.toFixed(dec) + "%" : "—";
  const fvEvol = (v, unit) => {
    if (v == null) return null;
    const s = v > 0 ? "+" : "";
    if (unit === "pts") return s + v.toFixed(1) + " pts";
    if (unit === "%") return s + v.toFixed(1) + "%";
    return s + v.toFixed(1);
  };
  function kpiItem(label, val, evolStr, evolVal, year) {
    let h = `<div style="display:flex;align-items:baseline;gap:4px;white-space:nowrap;">`;
    h += `<span style="color:#6b7280;font-size:9.5px;">${label}</span> `;
    h += `<b style="color:#64748b;font-size:11px;">${val}</b>`;
    if (evolStr) {
      h += ` <span style="color:${evolColor(evolVal)};font-size:11px;font-weight:600;">${evolStr}`;
      if (year) h += ` <span style="color:#b0b7be;font-size:7.5px;">${year}</span>`;
      h += `</span>`;
    }
    return h + `</div>`;
  }
  const grpStyle = `border-left:2px solid #e5e7eb;padding-left:8px;`;
  const grpLabel = (t) => `<div style="font-size:9px;font-weight:700;color:#7c8594;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">${t}</div>`;
  const wrap = document.createElement("div");
  let h = `<div style="display:flex;gap:32px;flex-wrap:wrap;align-items:flex-start;padding:5px 12px 6px 14px;font-family:Inter,system-ui,sans-serif;background:#fafbfc;border-radius:4px;border:1px solid #ebedf0;">`;
  // CONTEXTE (totaux zone)
  h += `<div style="border-left:2px solid ${accent};padding-left:8px;">${grpLabel("Contexte")}`;
  h += kpiItem("Pop.", fvk(total(all, "P22_POP")), fvEvol(med(all, "dm_pop_vtcam_1622"), "%"), med(all, "dm_pop_vtcam_1622"), "TCAM 16-22");
  h += kpiItem("Étab.", fvk(total(all, "ecosi_etab_vol_26")), null, null, null);
  h += `</div>`;
  // IDX GENTRIFICATION (after Contexte)
  if (active.length > 0) {
    const idxT2 = med(active, "idxg_t2_ind");
    const idxStr = idxT2 != null ? idxT2.toFixed(1) : "—";
    const idxTip = "Indice composite : CSP cadres, diplômés sup., prix immobilier, emménagés récents. Centré sur 50, >50 = signaux gentrification.";
    h += `<div style="border-left:2px solid ${accent};padding-left:8px;">`;
    h += `<div style="font-size:9px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">`;
    h += `Idx Gentri. <span style="cursor:help;color:#9ca3af;font-size:10px;" title="${idxTip}">ⓘ</span></div>`;
    h += `<b style="color:${accent};font-size:16px;">${idxStr}</b>`;
    h += `<div style="font-size:8px;color:#9ca3af;margin-top:1px;">${active.length} IRIS</div>`;
    h += `</div>`;
  }
  // CSP
  h += `<div style="${grpStyle}">${grpLabel("CSP")}`;
  h += kpiItem("Cadres", fvPct(med(all, "dsp_csp_cadres_pct_22")), fvEvol(med(all, "dsp_csp_cadres_vdifp_1622"), "pts"), med(all, "dsp_csp_cadres_vdifp_1622"), "16-22");
  h += kpiItem("Ouvriers", fvPct(med(all, "dsp_csp_ouvriers_pct_22")), fvEvol(med(all, "dsp_csp_ouvriers_vdifp_1622"), "pts"), med(all, "dsp_csp_ouvriers_vdifp_1622"), "16-22");
  h += `</div>`;
  // LOGEMENT
  h += `<div style="${grpStyle}">${grpLabel("Logement")}`;
  h += kpiItem("Emménag. &lt;5 ans", fvPct(med(all, "log_emmenrec_pct_22")), fvEvol(med(all, "log_emmenrec_vdifp_1622"), "pts"), med(all, "log_emmenrec_vdifp_1622"), "16-22");
  h += kpiItem("Propriétaires", fvPct(med(all, "log_prop_pct_22")), fvEvol(med(all, "log_prop_vdifp_1622"), "pts"), med(all, "log_prop_vdifp_1622"), "16-22");
  h += `</div>`;
  // REVENUS
  h += `<div style="${grpStyle}">${grpLabel("Revenus")}`;
  h += kpiItem("Rev. médian", fvEur(med(all, "rev_med_21")), null, null, null);
  h += kpiItem("Tx pauvreté", fvPct(med(all, "rev_txpauv_21")), null, null, null);
  h += `</div>`;
  // MARCHÉ IMMO
  h += `<div style="${grpStyle}">${grpLabel("Marché immo.")}`;
  h += kpiItem("Prix m²", fvEur(med(all, "logd_px2mm3_appt_24")), fvEvol(med(all, "logd_px2_glb_vevol_1624"), "%"), med(all, "logd_px2_glb_vevol_1624"), "16-24");
  const pxRev = med(all, "logd_pxmoisrev_21");
  h += kpiItem("Ratio px/rev", pxRev != null ? Math.round(pxRev) + " mois" : "—", null, null, null);
  h += `</div>`;
  h += `</div>`;
  wrap.innerHTML = h;
  return wrap;
}

// KPI strip Commerce / SIRENE
function buildCommerceKpiTable(zoneData, accent) {
  const all = zoneData.filter(d => d.code !== "MOY_ZONE");
  const med = (data, col) => { const v = data.map(d => d[col]).filter(v => v != null && !isNaN(v)); return v.length ? d3.median(v) : null; };
  const total = (data, col) => { const v = data.map(d => d[col]).filter(v => v != null && !isNaN(v)); return v.length ? d3.sum(v) : null; };
  const fvk = (v) => v != null ? Math.round(v).toLocaleString("fr-FR") : "—";
  const fvPct = (v, dec = 1) => v != null ? v.toFixed(dec) + "%" : "—";
  const fv1 = (v) => v != null ? v.toFixed(1) : "—";
  const fv2 = (v) => v != null ? v.toFixed(2) : "—";
  function kpiItem(label, val) {
    return `<div style="display:flex;align-items:baseline;gap:4px;white-space:nowrap;">` +
      `<span style="color:#6b7280;font-size:9.5px;">${label}</span> ` +
      `<b style="color:#64748b;font-size:11px;">${val}</b></div>`;
  }
  const grpStyle = `border-left:2px solid #e5e7eb;padding-left:8px;`;
  const grpLabel = (t) => `<div style="font-size:9px;font-weight:700;color:#7c8594;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">${t}</div>`;
  const wrap = document.createElement("div");
  let h = `<div style="display:flex;gap:32px;flex-wrap:wrap;align-items:flex-start;padding:5px 12px 6px 14px;font-family:Inter,system-ui,sans-serif;background:#fafbfc;border-radius:4px;border:1px solid #ebedf0;">`;
  // CONTEXTE
  h += `<div style="border-left:2px solid ${accent};padding-left:8px;">${grpLabel("Contexte")}`;
  h += kpiItem("Pop.", fvk(total(all, "P22_POP")));
  h += kpiItem("Étab. total", fvk(total(all, "ecosi_etab_vol_26")));
  h += kpiItem("Densité", fv1(med(all, "ecosi_etab_denspop_26")) + " /1k hab");
  h += `</div>`;
  // DIVERSITÉ
  h += `<div style="${grpStyle}">${grpLabel("Diversité")}`;
  h += kpiItem("Shannon méd.", fv2(med(all, "ecosi_shannon_ind_26")));
  h += kpiItem("Équitabilité", fv2(med(all, "ecosi_equit_ind_26")));
  h += kpiItem("Nb secteurs", fv1(med(all, "ecosi_nbdiv_vol_26")));
  h += `</div>`;
  // DYNAMIQUE
  h += `<div style="${grpStyle}">${grpLabel("Dynamique")}`;
  h += kpiItem("Renouv. hors mE", fvPct(med(all, "ecosi_renouv_horsmE_pct_26")));
  h += kpiItem("% récents", fvPct(med(all, "ecosi_etabrec_pct_26")));
  h += kpiItem("% non-emp.", fvPct(med(all, "ecosi_einonemp_pct_26")));
  h += `</div>`;
  h += `</div>`;
  wrap.innerHTML = h;
  return wrap;
}

display(html`<div style="background:#faf7f4;padding:5px 10px 0;margin:0 -10px;">
<div style="font-size:13px;font-weight:700;color:#7f1d1d;">Paris et 27 communes limitrophes <span style="font-weight:400;font-size:11px;color:#9ca3af;">— ${_idfN} IRIS actifs / ${idfData.length}</span></div>
</div>`);
```

<div id="kpi-idf" style="min-height:32px;padding:0 10px 5px;background:#faf7f4;margin:0 -10px;border-bottom:1px solid #f0ebe0;"></div>

<div class="pgent-city-row">
<div class="pgent-maps-col">
<div class="pgent-pair">
<div>
<div class="pgent-map-title" id="title-idf1"></div>
<div id="mc-idf1" style="height:460px; border-radius:6px; overflow:hidden;"></div>
</div>
<div>
<div class="pgent-map-title" id="title-idf2"></div>
<div id="mc-idf2" style="height:460px; border-radius:6px; overflow:hidden;"></div>
</div>
</div>
</div>
<div class="pgent-table-col">
<div id="pgent-tabs-idf" style="display:flex;gap:0;border-bottom:1px solid #d1d5db;margin-bottom:4px;"></div>
<div id="panel-scatter-idf" style="display:none;">
<div id="scatter-container-idf"></div>
<div id="scatter-legend-idf" style="padding:4px 0;"></div>
</div>
<div id="table-idf" style="flex:1;overflow:hidden;"></div>
</div>
</div>

```js
display(html`<div style="background:#f0f4fb;padding:5px 10px 0;margin:0 -10px;">
<div style="font-size:13px;font-weight:700;color:#1e3a5f;">Marseille — 16 arrondissements <span style="font-weight:400;font-size:11px;color:#9ca3af;">— ${_m13N} IRIS actifs / ${m13Data.length}</span></div>
</div>`);
```

<div id="kpi-m13" style="min-height:32px;padding:0 10px 5px;background:#f0f4fb;margin:0 -10px;border-bottom:1px solid #dde3f0;"></div>

<div class="pgent-city-row">
<div class="pgent-maps-col">
<div class="pgent-pair">
<div>
<div class="pgent-map-title" id="title-m1"></div>
<div id="mc-m1" style="height:420px; border-radius:6px; overflow:hidden;"></div>
</div>
<div>
<div class="pgent-map-title" id="title-m2"></div>
<div id="mc-m2" style="height:420px; border-radius:6px; overflow:hidden;"></div>
</div>
</div>
</div>
<div class="pgent-table-col">
<div id="pgent-tabs-m13" style="display:flex;gap:0;border-bottom:1px solid #d1d5db;margin-bottom:4px;"></div>
<div id="panel-scatter-m13" style="display:none;">
<div id="scatter-container-m13"></div>
<div id="scatter-legend-m13" style="padding:4px 0;"></div>
</div>
<div id="table-m13" style="flex:1;overflow:hidden;"></div>
</div>
</div>

<!-- &e LAYOUT -->

<!-- &s TAB_INIT — Onglets Scatter / Tableau par ville (défaut = Tableau) -->
```js
{
  function initCityTabs(tabsId, scatterId, tableId) {
    const container = document.getElementById(tabsId);
    if (!container || container._done) return;
    container._done = true;
    for (const [label, key] of [["Tableau", "tableau"], ["Scatter", "scatter"]]) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.className = "pgent-tab" + (key === "tableau" ? " pgent-tab-active" : "");
      btn.dataset.tab = key;
      btn.onclick = () => {
        container.querySelectorAll(".pgent-tab").forEach(b => b.classList.remove("pgent-tab-active"));
        btn.classList.add("pgent-tab-active");
        const sc = document.getElementById(scatterId);
        const tb = document.getElementById(tableId);
        if (sc) sc.style.display = key === "scatter" ? "" : "none";
        if (tb) tb.style.display = key === "scatter" ? "none" : "";
      };
      container.appendChild(btn);
    }
    // Expand button for scatter
    const expBtn = document.createElement("button");
    expBtn.innerHTML = "⛶";
    expBtn.title = "Agrandir scatter";
    expBtn.style.cssText = "margin-left:auto;font-size:13px;cursor:pointer;background:none;border:1px solid #d1d5db;border-radius:3px;padding:1px 5px;color:#6b7280;border-bottom:none;";
    expBtn.onclick = () => {
      const sc = document.getElementById(scatterId);
      if (sc) expandOverlay(sc);
    };
    container.appendChild(expBtn);
  }
  initCityTabs("pgent-tabs-idf", "panel-scatter-idf", "table-idf");
  initCityTabs("pgent-tabs-m13", "panel-scatter-m13", "table-m13");
}
```
<!-- &e TAB_INIT -->

<!-- &s MAP_INIT — Création des 4 cartes (une seule fois) -->
```js
const mapRefs = await (async () => {
  const refs = {};

  async function initMap(containerId, features, dataMap, bounds, sourceId, prefix, fitPad) {
    const container = document.getElementById(containerId);
    if (!container || container._mapReady) return null;
    const { map, Popup } = await createOTTDMap(container, { maxZoom: 16 });
    await new Promise(r => { if (map.loaded()) r(); else map.on("load", r); });

    map.addSource(sourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const fillId = `${prefix}-fill`;
    const lineId = `${prefix}-line`;
    const hoverId = `${prefix}-hover`;
    map.addLayer({ id: fillId, type: "fill", source: sourceId, paint: { "fill-color": ["get", "_fill"], "fill-opacity": 0.78 } });
    map.addLayer({ id: lineId, type: "line", source: sourceId, paint: { "line-color": "#d5dae0", "line-width": 0.15 } });
    map.addLayer({ id: hoverId, type: "fill", source: sourceId, paint: { "fill-color": "#ffd700", "fill-opacity": 0.3 }, filter: ["==", ["get", "_hoverCode"], ""] });

    container._tooltipFn = () => "";
    attachTooltip(map, fillId, (props, lngLat) => container._tooltipFn(props, lngLat), { Popup });

    map.on("mousemove", fillId, (e) => {
      if (e.features?.length) map.setFilter(hoverId, ["==", ["get", "_hoverCode"], e.features[0].properties._hoverCode || ""]);
    });
    map.on("mouseleave", fillId, () => map.setFilter(hoverId, ["==", ["get", "_hoverCode"], ""]));

    // Zoom — padding asymétrique par zone
    const pad = fitPad || { top: 0, bottom: 0, left: 0, right: 0 };
    map.fitBounds(bounds, { padding: pad, duration: 0 });
    // Bouton reset zoom (⌂) — recentrer sur la zone
    map.addControl({
      onAdd: () => {
        const div = document.createElement("div");
        div.className = "maplibregl-ctrl maplibregl-ctrl-group";
        const btn = document.createElement("button");
        btn.innerHTML = "⌂";
        btn.title = "Recentrer";
        btn.style.cssText = "font-size:15px;line-height:1;cursor:pointer;";
        btn.onclick = () => map.fitBounds(bounds, { padding: pad, duration: 400 });
        div.appendChild(btn);
        return div;
      },
      onRemove: function() { this._container?.remove(); }
    }, "top-left");
    // Bouton expand overlay (⛶)
    map.addControl({
      onAdd: () => {
        const div = document.createElement("div");
        div.className = "maplibregl-ctrl maplibregl-ctrl-group";
        const btn = document.createElement("button");
        btn.innerHTML = "⛶";
        btn.title = "Agrandir";
        btn.style.cssText = "font-size:14px;line-height:1;cursor:pointer;";
        btn.onclick = () => expandOverlay(container, {
          onOpen: () => map.resize(),
          onClose: () => map.resize()
        });
        div.appendChild(btn);
        return div;
      },
      onRemove: function() { this._container?.remove(); }
    }, "top-right");
    // Export SVG button (⤓) — reads stored GeoJSON + projects via map.project()
    map.addControl({
      onAdd: () => {
        const div = document.createElement("div");
        div.className = "maplibregl-ctrl maplibregl-ctrl-group";
        const btn = document.createElement("button");
        btn.innerHTML = "⤓";
        btn.title = "Export SVG";
        btn.style.cssText = "font-size:13px;line-height:1;cursor:pointer;";
        btn.onclick = () => {
          const geo = container._geoData;
          if (!geo?.features?.length) { console.warn("SVG export: no GeoJSON data stored"); return; }
          const canvas = map.getCanvas();
          const w = canvas.clientWidth, h = canvas.clientHeight;
          const proj = (coords) => { const p = map.project(coords); return [p.x, p.y]; };
          let paths = "";
          for (const f of geo.features) {
            const fill = f.properties?._fill || "#ccc";
            const geom = f.geometry;
            if (!geom) continue;
            const rings = geom.type === "MultiPolygon" ? geom.coordinates.flat() : (geom.type === "Polygon" ? geom.coordinates : []);
            for (const ring of rings) {
              const pts = ring.map(c => proj(c));
              const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("") + "Z";
              paths += `<path d="${d}" fill="${fill}" stroke="#9ca3af" stroke-width="0.3"/>`;
            }
          }
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${paths}</svg>`;
          const blob = new Blob([svg], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `carte_${container.id || "map"}.svg`; a.click();
          URL.revokeObjectURL(url);
        };
        div.appendChild(btn);
        return div;
      },
      onRemove: function() { this._container?.remove(); }
    }, "top-right");
    container._mapReady = true;
    return { map, container, sourceId, Popup };
  }

  // IDF : top 0 (couper le nord), bottom 12 (décaler vers le sud), left/right 0
  const idfPad = { top: 0, bottom: 12, left: 0, right: 0 };
  refs.idf1 = await initMap("mc-idf1", idfFeatures, idfDataMap, idfBounds.bounds, "src-idf1", "idf1", idfPad);
  refs.idf2 = await initMap("mc-idf2", idfFeatures, idfDataMap, idfBounds.bounds, "src-idf2", "idf2", idfPad);
  // Marseille : tout à 0 (serrer au max)
  const m13Pad = { top: 0, bottom: 0, left: 0, right: 0 };
  refs.m1 = await initMap("mc-m1", m13Features, m13DataMap, m13Bounds.bounds, "src-m1", "m1", m13Pad);
  refs.m2 = await initMap("mc-m2", m13Features, m13DataMap, m13Bounds.bounds, "src-m2", "m2", m13Pad);

  // Sync paires
  function syncMaps(a, b) {
    if (!a?.map || !b?.map) return;
    a.map.on("move", () => {
      if (a.map._syncing) return;
      b.map._syncing = true;
      b.map.setCenter(a.map.getCenter());
      b.map.setZoom(a.map.getZoom());
      b.map._syncing = false;
    });
    b.map.on("move", () => {
      if (b.map._syncing) return;
      a.map._syncing = true;
      a.map.setCenter(b.map.getCenter());
      a.map.setZoom(b.map.getZoom());
      a.map._syncing = false;
    });
  }
  syncMaps(refs.idf1, refs.idf2);
  syncMaps(refs.m1, refs.m2);

  // Labels communes/arrondissements — centroïdes + noms courts
  function buildCommuneLabels(comFeatures, comData) {
    const lookup = new Map(comData.filter(d => d.code !== "MOY_ZONE").map(d => [String(d.code), d.libelle || d.code]));
    return {
      type: "FeatureCollection",
      features: comFeatures.map(f => {
        const code = f.properties.code_insee;
        let name = lookup.get(code) || code;
        // Raccourcir : "Paris 1e Arrondissement" → "1e", "Marseille 10e Arrondissement" → "10e"
        if (name.startsWith("Paris ") || name.startsWith("Marseille ")) name = name.replace(/^(Paris|Marseille) /, "").replace(/ Arrondissement$/, "");
        else if (name.length > 12) name = name.substring(0, 10) + ".";
        const centroid = d3.geoCentroid(f);
        return { type: "Feature", geometry: { type: "Point", coordinates: centroid }, properties: { _comLabel: name } };
      })
    };
  }
  function addComLabels(ref, labelsGeo, srcId) {
    if (!ref?.map) return;
    ref.map.addSource(srcId, { type: "geojson", data: labelsGeo });
    ref.map.addLayer({
      id: srcId + "-lbl", type: "symbol", source: srcId,
      layout: {
        "text-field": ["get", "_comLabel"],
        "text-size": 9,
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "text-anchor": "center",
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-padding": 4
      },
      paint: {
        "text-color": "#374151",
        "text-halo-color": "rgba(255,255,255,0.85)",
        "text-halo-width": 1.5
      }
    });
  }
  const idfComLabels = buildCommuneLabels(comIdfFeatures, comIdfData);
  const m13ComLabels = buildCommuneLabels(comM13Features, comM13Data);
  addComLabels(refs.idf1, idfComLabels, "com-lbl-idf1");
  addComLabels(refs.idf2, idfComLabels, "com-lbl-idf2");
  addComLabels(refs.m1, m13ComLabels, "com-lbl-m1");
  addComLabels(refs.m2, m13ComLabels, "com-lbl-m2");

  return refs;
})();
```
<!-- &e MAP_INIT -->

<!-- &s MAP_UPDATE — Mise à jour réactive des données cartes (in-place) -->
```js
{
  // Per-side viewMode: left maps (1) and right maps (2) can differ
  const isCom1 = viewMode1 === "commune";
  const isCom2 = viewMode2 === "commune";
  const _idfFeat1 = isCom1 ? comIdfFeatures : idfFeatures;
  const _idfFeat2 = isCom2 ? comIdfFeatures : idfFeatures;
  const _m13Feat1 = isCom1 ? comM13Features : m13Features;
  const _m13Feat2 = isCom2 ? comM13Features : m13Features;
  const _idfDM1 = isCom1 ? comIdfDataMap : idfDataMap;
  const _idfDM2 = isCom2 ? comIdfDataMap : idfDataMap;
  const _m13DM1 = isCom1 ? comM13DataMap : m13DataMap;
  const _m13DM2 = isCom2 ? comM13DataMap : m13DataMap;
  const _codeProp1 = isCom1 ? "code_insee" : "code_iris";
  const _codeProp2 = isCom2 ? "code_insee" : "code_iris";
  const _isActive1 = isCom1 ? (() => true) : isIrisActive;
  const _isActive2 = isCom2 ? (() => true) : isIrisActive;

  // Sorted vals par zone pour percentile tooltip
  const svIdf1 = activeIdfData1.filter(d => _isActive1(d) && d[colKey1] != null).map(d => d[colKey1]).sort((a, b) => a - b);
  const svIdf2 = activeIdfData2.filter(d => _isActive2(d) && d[colKey2] != null).map(d => d[colKey2]).sort((a, b) => a - b);
  const svM1 = activeM13Data1.filter(d => _isActive1(d) && d[colKey1] != null).map(d => d[colKey1]).sort((a, b) => a - b);
  const svM2 = activeM13Data2.filter(d => _isActive2(d) && d[colKey2] != null).map(d => d[colKey2]).sort((a, b) => a - b);

  const title1 = (colKey1.startsWith("idxg_") ? (IDXG_LABELS[colKey1] || colKey1) : getFullLabel(indic1, periode1)) + (isCom1 ? " [commune]" : "");
  const title2 = (colKey2.startsWith("idxg_") ? (IDXG_LABELS[colKey2] || colKey2) : getFullLabel(indic2, periode2)) + (isCom2 ? " [commune]" : "");

  // Update titres avec ⓘ info tooltip
  function titleHtml(title, ck) {
    let def = "", note = "", src = "";
    if (ck.startsWith("idxg_") || ck.startsWith("ecosi_")) {
      const ind = INDICATEURS[ck] || INDICATEURS[ck.replace(/_\d+$/, "")];
      def = ind?.definition || (ck.startsWith("idxg_") ? "Indice composite de gentrification." : "Indicateur économie locale (SIRENE).");
      note = ind?.note || "";
      src = ind?.source || (ck.startsWith("idxg_") ? "INSEE RP, DVF, Filosofi" : "INSEE SIRENE");
    } else {
      const parsed = parseColKey(ck);
      const ind = parsed?.indic ? INDICATEURS[parsed.indic] : null;
      def = ind?.definition || "";
      note = ind?.note || "";
      src = ind?.source || "";
    }
    if (!def && !note && !src) return title;
    const parts = [];
    if (def) parts.push(`<b style="color:#e2e8f0;">Définition</b><br>${def}`);
    if (note) parts.push(`<b style="color:#e2e8f0;">Note de lecture</b><br>${note}`);
    if (src) parts.push(`<em style="color:#93c5fd;">Source : ${src}</em>`);
    const tip = parts.join("<br>");
    const hasInfo = def || note;
    const iconColor = hasInfo ? "#3b82f6" : "#9ca3af";
    const srcLine = src ? `<div style="font-size:8px;color:#9ca3af;font-style:italic;margin-top:-1px;">${src}</div>` : "";
    return `${title} <span class="pgent-info" style="color:${iconColor};">ⓘ<span class="pgent-info-tip">${tip}</span></span>${srcLine}`;
  }
  const t1 = document.getElementById("title-idf1"); if (t1) t1.innerHTML = titleHtml(title1, colKey1);
  const t2 = document.getElementById("title-idf2"); if (t2) t2.innerHTML = titleHtml(title2, colKey2);
  const t3 = document.getElementById("title-m1"); if (t3) t3.innerHTML = titleHtml(title1, colKey1);
  const t4 = document.getElementById("title-m2"); if (t4) t4.innerHTML = titleHtml(title2, colKey2);

  // GeoJSON sources — bins INDÉPENDANTS par zone + z-scores + brutes idxg en extraProps
  const extraBase = ["nom_commune", "ecosi_etab_vol_26", "libelle"];
  // Commerce tab : ajouter colonnes SIRENE pour tooltip enrichi
  const _ecoExtra = ["ecosi_nafdom1_lib_26", "ecosi_nafdom1_pct_26", "ecosi_nafdom1ql_ind_26",
       "ecosi_nafdom2_lib_26", "ecosi_nafdom2_pct_26", "ecosi_nafdom2ql_ind_26",
       "ecosi_shannon_ind_26", "ecosi_nbdiv_vol_26", "ecosi_equit_ind_26",
       "ecosi_etab_denspop_26", "ecosi_soc_pct_26", "ecosi_emp_pct_26",
       "ecosi_einonemp_pct_26", "ecosi_etabrec_pct_26", "ecosi_renouv_horsmE_pct_26"];
  const extra1 = [...extraBase, ..._ecoExtra, ...getIdxgZscores(colKey1), ...getIdxgRawCols(colKey1)];
  const extra2 = [...extraBase, ..._ecoExtra, ...getIdxgZscores(colKey2), ...getIdxgRawCols(colKey2)];
  const geoIdf1 = buildGentSource(_idfFeat1, _idfDM1, colKey1, getColorIdf1, { codeProperty: _codeProp1, extraProps: extra1, bins: binsIdf1, checkActive: _isActive1 });
  const geoIdf2 = buildGentSource(_idfFeat2, _idfDM2, colKey2, getColorIdf2, { codeProperty: _codeProp2, extraProps: extra2, bins: binsIdf2, checkActive: _isActive2 });
  const geoM1 = buildGentSource(_m13Feat1, _m13DM1, colKey1, getColorM1, { codeProperty: _codeProp1, extraProps: extra1, bins: binsM1, checkActive: _isActive1 });
  const geoM2 = buildGentSource(_m13Feat2, _m13DM2, colKey2, getColorM2, { codeProperty: _codeProp2, extraProps: extra2, bins: binsM2, checkActive: _isActive2 });

  // Filtrage légende → carte : setFilter sur MapLibre par _binIdx
  function makeFilterCb(ref) {
    return (activeSet) => {
      if (!ref?.map) return;
      const fillId = ref.sourceId.replace("src-", "") + "-fill";
      if (!activeSet) {
        ref.map.setFilter(fillId, null);
      } else {
        const idxArr = Array.from(activeSet);
        idxArr.push(-1); // Toujours montrer les grisés (inactifs/NA)
        ref.map.setFilter(fillId, ["in", ["get", "_binIdx"], ["literal", idxArr]]);
      }
    };
  }

  // Moyennes pondérées par pop (per-side isActive)
  function weightedMean(data, colKey, isActiveFn) {
    const isIdx = colKey.startsWith("idxg_");
    const valid = data.filter(d => isActiveFn(d) && d[colKey] != null && !isNaN(d[colKey]));
    if (valid.length === 0) return null;
    if (isIdx) return d3.mean(valid, d => d[colKey]);
    const totalPop = d3.sum(valid, d => d.P22_POP || 1);
    if (totalPop === 0) return d3.mean(valid, d => d[colKey]);
    return d3.sum(valid, d => d[colKey] * (d.P22_POP || 1)) / totalPop;
  }
  const meanIdf1 = weightedMean(activeIdfData1, colKey1, _isActive1), meanIdf2 = weightedMean(activeIdfData2, colKey2, _isActive2);
  const meanM1 = weightedMean(activeM13Data1, colKey1, _isActive1), meanM2 = weightedMean(activeM13Data2, colKey2, _isActive2);
  // NA counts par zone (per-side)
  const _isNA = (v) => v == null || isNaN(v);
  const naIdf1 = activeIdfData1.filter(d => _isActive1(d) && _isNA(d[colKey1])).length;
  const naIdf2 = activeIdfData2.filter(d => _isActive2(d) && _isNA(d[colKey2])).length;
  const naM1 = activeM13Data1.filter(d => _isActive1(d) && _isNA(d[colKey1])).length;
  const naM2 = activeM13Data2.filter(d => _isActive2(d) && _isNA(d[colKey2])).length;

  // setData + légendes + marqueur moyenne zone + bin NA + labels top5/bot5
  function updateMap(ref, geo, colKey, sortedVals, bins, filterCb, zoneMean, naCount, zoneLabel, vmSide, lbMode) {
    if (!ref?.map) return;
    const src = ref.map.getSource(ref.sourceId);
    if (src) src.setData(geo);
    ref.container._geoData = geo;  // store for SVG export
    ref.container._colKey = colKey;
    ref.container._sortedVals = sortedVals;
    ref.container._zoneMean = zoneMean;
    ref.container._zoneLabel = zoneLabel;
    ref.container._viewMode = vmSide;
    ref.container._activeTab = activeTab;
    ref.container._tooltipFn = makeTooltipFn(ref.container);
    const fillId = ref.sourceId.replace("src-", "") + "-fill";
    const lineId = ref.sourceId.replace("src-", "") + "-line";
    ref.map.setPaintProperty(lineId, "line-width", vmSide === "commune" ? 0 : 0.15);
    ref.map.setFilter(fillId, null);
    // Légende compacte bottom-left
    if (ref.container._leg) ref.container._leg.remove();
    const leg = makeLegend(bins, colKey, filterCb, zoneMean, naCount, zoneLabel);
    leg.style.cssText = "position:absolute;bottom:3px;left:3px;z-index:4;background:rgba(255,255,255,0.78);border:1px solid #e0e5ea;border-radius:3px;padding:0 3px 1px;backdrop-filter:blur(1.5px);line-height:1.1;";
    ref.container.style.position = "relative";
    ref.container.appendChild(leg);
    ref.container._leg = leg;

    // Labels dynamiques selon lbMode — toggled by LABEL_TOGGLE cell
    const labSrcId = ref.sourceId + "-labels";
    const labLayerId = ref.sourceId.replace("src-", "") + "-labels";
    const ranked = geo.features
      .filter(f => f.properties._val != null && !isNaN(f.properties._val) && f.properties._fill !== GREY_NA)
      .sort((a, b) => a.properties._val - b.properties._val);
    let labPairs;
    if (lbMode === "top5") {
      labPairs = ranked.slice(-5).reverse().map((f, i) => [f, "top", i + 1]);
    } else if (lbMode === "top10") {
      labPairs = ranked.slice(-10).reverse().map((f, i) => [f, "top", i + 1]);
    } else if (lbMode === "bot5") {
      labPairs = ranked.slice(0, 5).map((f, i) => [f, "bot", i + 1]);
    } else if (lbMode === "pop") {
      const byPop = [...ranked].sort((a, b) => (b.properties._P22_POP || 0) - (a.properties._P22_POP || 0));
      labPairs = byPop.slice(0, 12).map((f, i) => [f, "pop", i + 1]);
    } else {
      // top5bot5 (défaut)
      labPairs = [
        ...ranked.slice(-5).reverse().map((f, i) => [f, "top", i + 1]),
        ...ranked.slice(0, 5).map((f, i) => [f, "bot", i + 1])
      ];
    }
    const labFeatures = labPairs.map(([f, rank, n]) => {
      const centroid = d3.geoCentroid(f);
      const v = f.properties._val;
      const isIdx = colKey.startsWith("idxg_");
      const vStr = isIdx ? Number(v).toFixed(1) : formatValue(colKey, v);
      const name = (f.properties.nom_iris || f.properties._label || f.properties.code_insee || "").substring(0, 14);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: centroid },
        properties: { _labelText: `${name}\n${vStr}`, _rank: rank, _n: n }
      };
    });
    const labGeo = { type: "FeatureCollection", features: labFeatures };
    if (ref.map.getSource(labSrcId)) {
      ref.map.getSource(labSrcId).setData(labGeo);
    } else {
      ref.map.addSource(labSrcId, { type: "geojson", data: labGeo });
      ref.map.addLayer({
        id: labLayerId, type: "symbol", source: labSrcId,
        layout: {
          "text-field": ["get", "_labelText"],
          "text-size": 10,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-anchor": "center",
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "text-padding": 2
        },
        paint: {
          "text-color": ["case", ["==", ["get", "_rank"], "top"], "#b91c1c", "#1d4ed8"],
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.8
        }
      });
      // Hidden on first creation — toggled by LABEL_TOGGLE reactive cell
      ref.map.setLayoutProperty(labLayerId, "visibility", "none");
    }
  }

  updateMap(mapRefs.idf1, geoIdf1, colKey1, svIdf1, binsIdf1, makeFilterCb(mapRefs.idf1), meanIdf1, naIdf1, "IDF", viewMode1, labelMode1);
  updateMap(mapRefs.idf2, geoIdf2, colKey2, svIdf2, binsIdf2, makeFilterCb(mapRefs.idf2), meanIdf2, naIdf2, "IDF", viewMode2, labelMode2);
  updateMap(mapRefs.m1, geoM1, colKey1, svM1, binsM1, makeFilterCb(mapRefs.m1), meanM1, naM1, "Marseille", viewMode1, labelMode1);
  updateMap(mapRefs.m2, geoM2, colKey2, svM2, binsM2, makeFilterCb(mapRefs.m2), meanM2, naM2, "Marseille", viewMode2, labelMode2);

  // Moyennes SIRENE pour tooltip écart + lookup nafdom commune
  const ecoKeys = ["ecosi_etab_vol_26","ecosi_etab_denspop_26","ecosi_soc_pct_26","ecosi_emp_pct_26",
    "ecosi_einonemp_pct_26","ecosi_etabrec_pct_26","ecosi_renouv_horsmE_pct_26",
    "ecosi_shannon_ind_26","ecosi_nbdiv_vol_26","ecosi_equit_ind_26"];
  function calcEcoMeans(data, checkFn) {
    const means = {};
    for (const k of ecoKeys) {
      const vals = data.filter(d => checkFn(d) && d[k] != null).map(d => Number(d[k]));
      means[k] = vals.length ? d3.mean(vals) : null;
    }
    return means;
  }
  // Lookup nafdom par commune (mode dominant parmi IRIS, pondéré par nb étab)
  function buildNafdomLookup(data) {
    const byComm = {};
    for (const d of data) {
      const com = d._commune;
      const lib = d.ecosi_nafdom1_lib_26;
      if (!com || !lib) continue;
      if (!byComm[com]) byComm[com] = {};
      const w = Number(d.ecosi_etab_vol_26) || 1;
      byComm[com][lib] = (byComm[com][lib] || 0) + w;
    }
    const lookup = {};
    for (const [com, sectors] of Object.entries(byComm)) {
      const sorted = Object.entries(sectors).sort((a, b) => b[1] - a[1]);
      lookup[com] = { lib1: sorted[0]?.[0], lib2: sorted[1]?.[0] };
    }
    return lookup;
  }
  const ecoMeansIdf = calcEcoMeans(activeIdfData1, _isActive1);
  const ecoMeansM13 = calcEcoMeans(activeM13Data1, _isActive1);
  const nafdomIdf = buildNafdomLookup(idfData);
  const nafdomM13 = buildNafdomLookup(m13Data);
  for (const ref of [mapRefs.idf1, mapRefs.idf2]) if (ref?.container) { ref.container._ecoMeans = ecoMeansIdf; ref.container._nafdomLookup = nafdomIdf; }
  for (const ref of [mapRefs.m1, mapRefs.m2]) if (ref?.container) { ref.container._ecoMeans = ecoMeansM13; ref.container._nafdomLookup = nafdomM13; }
}
```
<!-- &e MAP_UPDATE -->

<!-- &s LABEL_TOGGLE — Per-side label toggle (G → idf1+m1, D → idf2+m2) -->
```js
{
  // Track labelMode changes so this cell re-fires when mode changes (features already updated by MAP_UPDATE)
  const _lm1 = labelMode1;
  const _lm2 = labelMode2;
  // Left maps (G) — _labelShow1
  for (const refKey of ["idf1", "m1"]) {
    const ref = mapRefs[refKey];
    if (!ref?.map) continue;
    const labLayerId = ref.sourceId.replace("src-", "") + "-labels";
    if (ref.map.getLayer(labLayerId))
      ref.map.setLayoutProperty(labLayerId, "visibility", _labelShow1 ? "visible" : "none");
  }
  // Right maps (D) — _labelShow2
  for (const refKey of ["idf2", "m2"]) {
    const ref = mapRefs[refKey];
    if (!ref?.map) continue;
    const labLayerId = ref.sourceId.replace("src-", "") + "-labels";
    if (ref.map.getLayer(labLayerId))
      ref.map.setLayoutProperty(labLayerId, "visibility", _labelShow2 ? "visible" : "none");
  }
}
```
<!-- &e LABEL_TOGGLE -->

<!-- &s SCATTER_UPDATE — Scatter réactif par ville -->
```js
{
  const DEP_COLORS = { "75": "#1696d2", "92": "#fdbf11", "93": "#ec008b", "94": "#55b748" };
  const DEP_LABELS = { "75": "Paris", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne" };
  const M13_COLORS = { "13": "#2563eb" };
  const M13_LABELS = { "13": "Marseille" };

  // Scatter always uses IRIS data. If left map is commune idx, substitute IRIS idx for scatter
  const scatterCK1 = (viewMode1 === "commune" && colKey1.includes("_com_")) ? colKey1.replace("_com_pct_top20", "_ind") : colKey1;
  const scatterCK2 = colKey2;
  const stitle1 = colKey1.startsWith("idxg_") ? (IDXG_LABELS[scatterCK1] || scatterCK1) : getFullLabel(indic1, periode1);
  const stitle2 = colKey2.startsWith("idxg_") ? (IDXG_LABELS[colKey2] || colKey2) : getFullLabel(indic2, periode2);

  function renderCityScatter(containerId, legendId, srcData, colorMap, labelMap, isCom) {
    const filterFn = isCom
      ? (d => d[scatterCK1] != null && d[scatterCK2] != null)
      : (d => isIrisActive(d) && (d.P22_POP || 0) >= 800 && d[scatterCK1] != null && d[scatterCK2] != null);
    const data = srcData.filter(filterFn).map(d => ({ ...d, libelle: isCom ? (d.libelle || d.nom_commune || d.code) : enrichIrisName(d) }));
    const xVals = data.map(d => d[scatterCK1]).sort(d3.ascending);
    const yVals = data.map(d => d[scatterCK2]).sort(d3.ascending);
    if (xVals.length < 3) return;
    const xMin = d3.quantile(xVals, 0.02), xMax = d3.quantile(xVals, 0.98);
    const yMin = d3.quantile(yVals, 0.02), yMax = d3.quantile(yVals, 0.98);
    const xPad = (xMax - xMin) * 0.08, yPad = (yMax - yMin) * 0.08;

    // Option 3 — Top 20 + Bottom 20 par colKey2 (indicateur Y) mis en évidence
    const sortedByY = data.slice().sort((a, b) => (a[scatterCK2] ?? 0) - (b[scatterCK2] ?? 0));
    const N_HIGHLIGHT = Math.min(20, Math.floor(data.length / 6));
    const bottomN = sortedByY.slice(0, N_HIGHLIGHT);
    const topN = sortedByY.slice(-N_HIGHLIGHT);
    const highlightSet = new Set([...topN, ...bottomN].map(d => d.code));

    // Labels : top 8 + bottom 8 par valeur Y parmi highlighted
    const labelTop = topN.slice(-8).map(d => d.code);
    const labelBot = bottomN.slice(0, 8).map(d => d.code);
    const labelCodes = [...new Set([...labelTop, ...labelBot])];

    const sc = document.getElementById(containerId);
    if (!sc) return;
    sc.innerHTML = "";

    const depSummary = Object.entries(labelMap).map(([k, v]) => v).join(", ");

    const scatterEl = createScatterWithZoom({
      title: `${stitle1} × ${stitle2}`,
      subtitle: `${data.length} ${isCom ? "communes" : "IRIS"}`,
      legend: [],
      sizeLabel: null,
      data, xCol: scatterCK1, yCol: scatterCK2,
      xDomain: [xMin - xPad, xMax + xPad],
      yDomain: [yMin - yPad, yMax + yPad],
      xLabel: stitle1, yLabel: stitle2,
      meanX: d3.mean(xVals), meanY: d3.mean(yVals),
      getRadius: isCom
        ? (d => Math.max(4, Math.min(12, Math.sqrt((d.P22_POP || 5000) / 2000))))
        : (d => highlightSet.has(d.code) ? Math.max(3, Math.min(7, Math.sqrt((d.P22_POP || 500) / 150))) : 1.5),
      getColor: d => colorMap[d._dep || d.dep] || "#999",
      fillOpacity: d => highlightSet.has(d.code) ? 0.88 : 0.06,
      getTooltip: d => {
        const name = d.libelle || d.code;
        const v1 = scatterCK1.startsWith("idxg_") ? d[scatterCK1]?.toFixed(1) : formatValue(scatterCK1, d[scatterCK1]);
        const v2 = scatterCK2.startsWith("idxg_") ? d[scatterCK2]?.toFixed(1) : formatValue(scatterCK2, d[scatterCK2]);
        const dep = d._dep || String(d.code || "").substring(0, 2);
        const depLabel = labelMap[dep] || dep;
        // Percentiles (consistent with map tooltip)
        const pX = d[scatterCK1] != null ? Math.round(100 * d3.bisectLeft(xVals, d[scatterCK1]) / xVals.length) : null;
        const pY = d[scatterCK2] != null ? Math.round(100 * d3.bisectLeft(yVals, d[scatterCK2]) / yVals.length) : null;
        return `<b>${name}</b> <span style="color:#9ca3af;font-size:10px;">${depLabel}</span><br>`
          + `<span style="color:#93c5fd;">${stitle1}</span> : <b>${v1 ?? "n.d."}</b>${pX != null ? ` <span style="color:#94a3b8;font-size:10px;">P${pX}</span>` : ""}<br>`
          + `<span style="color:#93c5fd;">${stitle2}</span> : <b>${v2 ?? "n.d."}</b>${pY != null ? ` <span style="color:#94a3b8;font-size:10px;">P${pY}</span>` : ""}<br>`
          + `<span style="color:#94a3b8;font-size:10px;">Pop. ${(d.P22_POP || 0).toLocaleString("fr-FR")}</span>`;
      },
      width: 420, height: 420,
      fontSize: "10px",
      labelCodes,
      labelMode: "noms"
    });
    // Override container width to fit in table panel (40%)
    scatterEl.style.width = "100%";
    scatterEl.style.maxWidth = "100%";
    scatterEl.style.padding = "4px 0";
    scatterEl.style.margin = "0";
    sc.appendChild(scatterEl);

    // Clear separate legend div (légende intégrée dans createScatterWithZoom)
    const sl = document.getElementById(legendId);
    if (sl) sl.innerHTML = "";
  }

  // Scatter uses left-side viewMode1 for data source
  const scatterIsCom = viewMode1 === "commune";
  const _noMoy = d => d.code !== "MOY_ZONE";
  renderCityScatter("scatter-container-idf", "scatter-legend-idf", scatterIsCom ? comIdfData.filter(_noMoy) : idfData, DEP_COLORS, DEP_LABELS, scatterIsCom);
  renderCityScatter("scatter-container-m13", "scatter-legend-m13", scatterIsCom ? comM13Data.filter(_noMoy) : m13Data, M13_COLORS, M13_LABELS, scatterIsCom);
}
```
<!-- &e SCATTER_UPDATE -->

<!-- &s TABLE_UPDATE — Tableau classement par ville via buildDataTable -->
```js
{
  // Table uses left-side viewMode1 for data source
  const tblIsCom = viewMode1 === "commune";
  const labelCol = tblIsCom ? "libelle" : "_irisLabel";

  // Config table selon tab actif
  let tableKeys, tableGroups, tableEvolCols, defaultSort;

  if (activeTab === "commerce") {
    // --- Tab Commerce : colonnes SIRENE ---
    tableKeys = [
      "P22_POP", "ecosi_etab_vol_26", "ecosi_etab_denspop_26",
      "ecosi_shannon_ind_26", "ecosi_equit_ind_26", "ecosi_nbdiv_vol_26",
      "ecosi_renouv_horsmE_pct_26", "ecosi_etabrec_pct_26", "ecosi_einonemp_pct_26",
      "ecosi_nafdom1_pct_26"
    ];
    tableGroups = [
      { label: "Contexte", cols: ["P22_POP", "ecosi_etab_vol_26", "ecosi_etab_denspop_26"] },
      { label: "Diversité", cols: ["ecosi_shannon_ind_26", "ecosi_equit_ind_26", "ecosi_nbdiv_vol_26"] },
      { label: "Dynamique", cols: ["ecosi_renouv_horsmE_pct_26", "ecosi_etabrec_pct_26", "ecosi_einonemp_pct_26"] },
      { label: "Sect. dom.", cols: ["ecosi_nafdom1_pct_26"] }
    ];
    tableEvolCols = [];
    defaultSort = "ecosi_renouv_horsmE_pct_26";
  } else {
    // --- Tab Gentri / Explor : colonnes gentrification + marché ---
    tableKeys = ["P22_POP", "dm_pop_vtcam_1622", "ecosi_etab_vol_26", "idxg_t2_ind"];
    tableGroups = [
      { label: "Contexte", cols: ["P22_POP", "dm_pop_vtcam_1622", "ecosi_etab_vol_26"] },
      { label: "Indice Gentri.", cols: ["idxg_t2_ind"] }
    ];
    tableEvolCols = ["dm_pop_vtcam_1622"];

    // CSP cadres + ouvriers groupés
    const CSP_KEYS = new Set(["cadres_evol", "ouvriers_evol"]);
    const cspCols = [];
    for (const c of IDXG_COMPONENTS) {
      if (CSP_KEYS.has(c.key)) {
        const cols = [c.ref.t2, c.evol.t2].filter(Boolean);
        tableKeys.push(...cols);
        cspCols.push(...cols);
        if (c.evol.t2) tableEvolCols.push(c.evol.t2);
      }
    }
    if (cspCols.length) tableGroups.push({ label: "Structure CSP", cols: cspCols });

    // Autres composantes (hors CSP, hors ratio_px_rev vide)
    const SKIP_KEYS = new Set(["ratio_px_rev"]);
    for (const c of IDXG_COMPONENTS) {
      if (CSP_KEYS.has(c.key) || SKIP_KEYS.has(c.key)) continue;
      const cols = [c.ref.t2, c.evol.t2].filter(Boolean);
      tableKeys.push(...cols);
      // Rename "Prix m²/appt" → "Dyn. immob." and add px/rev mois
      if (c.key === "px_evol") {
        cols.push("logd_pxmoisrev_21");
        tableKeys.push("logd_pxmoisrev_21");
        tableGroups.push({ label: "Dyn. immob.", cols });
      } else {
        tableGroups.push({ label: c.label, cols });
      }
      if (c.evol.t2) tableEvolCols.push(c.evol.t2);
    }

    // Colonnes fin : Marché (renouv. seulement)
    tableKeys.push("ecosi_renouv_horsmE_pct_26");
    tableGroups.push({ label: "Marché", cols: ["ecosi_renouv_horsmE_pct_26"] });
    defaultSort = "idxg_t2_ind";
  }

  // Couleurs pastilles par département
  const depColorMap = { "75": "#1696d2", "92": "#fdbf11", "93": "#ec008b", "94": "#55b748", "13": "#2563eb" };

  // Filtre IRIS minimum (pop > 300, étab > 100) sauf mode commune
  const minFilter = tblIsCom
    ? (() => true)
    : (d => (+d["P22_POP"] || 0) > 300 && (+d["ecosi_etab_vol_26"] || 0) > 100);

  function buildCityTable(containerId, rawData, refRow, maxH, cityLabel) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";

    const data = rawData
      .filter(minFilter)
      .map(d => {
        const dep = d._dep || String(d.code || "").substring(0, 2);
        if (tblIsCom) return { ...d, _dep: dep };
        const code = String(d.code || "");
        const lookup = irisNameLookup.get(code);
        const comShort = (lookup?.nom_commune || "").substring(0, 9);
        return { ...d, _dep: dep, [labelCol]: enrichIrisName(d), country_code: `${dep}·${comShort}` };
      });

    const refRows = [];
    if (refRow) {
      refRows.push({ label: `Moy. ${cityLabel}`, data: refRow, bgColor: "#f0f7ff" });
    }

    buildDataTable(el, data, {
      keys: tableKeys,
      labelCol: labelCol,
      labelFallback: "code",
      labelHeader: tblIsCom ? "Commune" : "IRIS",
      colorCol: "_dep",
      colorMap: depColorMap,
      defaultSort,
      defaultAsc: false,
      refRows,
      maxHeight: maxH,
      groups: tableGroups,
      pageSize: 200,
      labelMaxWidth: 130,
      evolCols: tableEvolCols
    });
  }

  // IDF table — suit viewMode1 (maille gauche)
  const idfRawData = tblIsCom
    ? comIdfData.filter(d => d.code !== "MOY_ZONE")
    : idfData.filter(d => isIrisActive(d));
  buildCityTable("table-idf", idfRawData, moyIdf, 450, "Paris+PC");

  // Marseille table
  const m13RawData = tblIsCom
    ? comM13Data.filter(d => d.code !== "MOY_ZONE")
    : m13Data.filter(d => isIrisActive(d));
  buildCityTable("table-m13", m13RawData, moyM13, 410, "Marseille");
}
```
<!-- &e TABLE_UPDATE -->
