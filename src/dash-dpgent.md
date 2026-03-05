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
.pgent-city-row { display: flex; gap: 8px; margin-bottom: 36px; margin-top: 4px; }
.pgent-maps-col { flex: 1 1 58%; min-width: 0; }
.pgent-table-col { flex: 0 0 40%; min-width: 340px; max-width: 520px; display: flex; flex-direction: column; }
.pgent-pair { display: flex; gap: 6px; margin-bottom: 3px; }
.pgent-pair > div { flex: 1; position: relative; }
.pgent-map-title { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.3px; }
.pgent-section { font-size: 13px; font-weight: 600; color: #374151; margin: 6px 0 2px; border: none !important; text-decoration: none; outline: none; }
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
_tblDdict["idxg_t2_ind"] = { short: "Idx T2", unit: "ind.", type: "ind" };
_tblDdict["P22_POP"] = { short: "Pop.", unit: "hab", type: "stock" };
_tblDdict["dm_pop_vtcam_1622"] = { short: "Évol.", unit: "% TCAM 16-22", type: "pct" };
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
// Idxg pinned at top of dropdown
const IDXG_OPTIONS = [
  ["── ◆ Gentrification ──", "__sep_idxg__"],
  ["◆ Indice gentri. T2 (16-22)", "idxg_t2_ind"],
  ["◆ Indice gentri. T1 (11-16)", "idxg_ind"],
  ["◆ Percentile gentri. T2", "idxg_t2_pct"],
  ["◆ Percentile gentri. T1", "idxg_pct"],
];
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
.pgent-sub { display:flex; align-items:center; gap:6px; padding:5px 10px; background:#fff; border-bottom:1px solid #e5e7eb; flex-wrap:wrap; font-size:11px; }
.pgent-sub form { margin:0; }
.pgent-sub select { font-size:11px; padding:2px 4px; border:1px solid #d1d5db; border-radius:3px; background:#fff; }
.pgent-lbl { font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; }
.pgent-grp { display:flex; align-items:center; gap:4px; }
.pgent-sep { width:1px; height:22px; background:#d1d5db; margin:0 2px; }
.pgent-per select { max-width:72px; font-size:10px; padding:1px 3px; background:#fff; }
</style>
<div class="pgent-sub">

<div class="pgent-grp pgent-grp-indic">
<span class="pgent-lbl" style="color:#dc2626;">Gauche</span>

```js
const indic1 = view(Inputs.select(indicOptions, { value: "idxg_t2_ind", label: "" }));
```

<div class="pgent-per">

```js
const per1Map = getPeriodesForIndicateur(indic1, availableCols);
const per1Vals = [...per1Map.values()];
const periode1 = per1Vals.length > 0
  ? view(Inputs.select(per1Map, { value: per1Vals[0], label: "" }))
  : null;
```

</div>
</div>

<div class="pgent-sep pgent-grp-indic"></div>

<div class="pgent-grp pgent-grp-indic">
<span class="pgent-lbl" style="color:#2563eb;">Droite</span>

```js
const indic2 = view(Inputs.select(indicOptions, { value: "rev_med", label: "" }));
```

<div class="pgent-per">

```js
const per2Map = getPeriodesForIndicateur(indic2, availableCols);
const per2Vals = [...per2Map.values()];
const periode2 = per2Vals.length > 0
  ? view(Inputs.select(per2Map, { value: per2Vals[0], label: "" }))
  : null;
```

</div>
</div>

<div class="pgent-sep"></div>

<div class="pgent-grp">
<span class="pgent-lbl" style="color:#6b7280;">Mode</span>

```js
const paletteMode = view(Inputs.radio(new Map([["Valeurs", "abs"], ["± Moy.", "ecart"], ["Gradient", "gradient"]]), { value: "abs", label: "" }));
```

</div>

<div class="pgent-sep pgent-grp-maille"></div>

<div class="pgent-grp pgent-grp-maille">
<span class="pgent-lbl" style="color:#7c3aed;">Maille</span>

```js
const viewMode = view(Inputs.radio(new Map([["IRIS", "iris"], ["Commune", "commune"]]), { value: "iris", label: "" }));
```

</div>

<span id="pgent-preset-label" style="display:none;font-size:10px;color:#4b5563;flex:1;"></span>

```js
display(html`<div style="display:flex; gap:10px; font-size:10px; color:#6b7280; margin-left:auto; white-space:nowrap;">
  <span><b style="color:#dc2626;">${idfData.filter(isIrisActive).length}</b>/${idfData.length} IDF</span>
  <span><b style="color:#dc2626;">${m13Data.filter(isIrisActive).length}</b>/${m13Data.length} Mars.</span>
  <span>idx: <b style="color:#7c3aed;">${allData.filter(d => d.idxg_t2_ind != null).length}</b></span>
</div>`);
```

</div>
<!-- &e SUB_BANNER -->

<!-- &s TAB_BAR — 3 onglets narratifs : Gentrification / Commerce / Croisement -->
```js
const TAB_PRESETS = {
  gentri: { colKey1: "idxg_t2_com_pct_top20", colKey2: "idxg_t2_ind", vm1: "commune", vm2: "iris", label1: "% IRIS top 20% gentri. T2 [commune]", label2: "◆ Indice gentrification T2 (16-22)" },
  commerce: { colKey1: "ecosi_renouv_horsmE_pct_26", colKey2: "ecosi_shannon_ind_26", vm1: "iris", vm2: "iris", label1: "Renouvellement éco. hors mE (%)", label2: "Diversité Shannon (indice)" },
};
```
```js
const _tabBarEl = (() => {
  const el = document.createElement("div");
  el.style.cssText = "display:flex;gap:0;border-bottom:2px solid #e5e7eb;padding:0 10px;background:#fafafa;";
  el.value = "gentri";
  for (const [label, key, icon] of [["Gentrification", "gentri", "◆"], ["Tissu économique", "commerce", "⛋"], ["Croisement libre", "explor", "⊞"]]) {
    const btn = document.createElement("button");
    btn.textContent = `${icon} ${label}`;
    btn.dataset.key = key;
    const isFirst = key === "gentri";
    btn.style.cssText = `padding:6px 16px;font-size:11.5px;font-weight:${isFirst ? 700 : 500};cursor:pointer;border:none;border-bottom:2px solid ${isFirst ? "#dc2626" : "transparent"};margin-bottom:-2px;background:none;color:${isFirst ? "#dc2626" : "#6b7280"};transition:all 0.15s;`;
    btn.onclick = () => {
      el.value = key;
      el.dispatchEvent(new Event("input"));
      for (const b of el.querySelectorAll("button")) {
        const active = b.dataset.key === key;
        b.style.fontWeight = active ? "700" : "500";
        b.style.borderBottomColor = active ? "#dc2626" : "transparent";
        b.style.color = active ? "#dc2626" : "#6b7280";
      }
    };
    el.appendChild(btn);
  }
  return el;
})();
const activeTab = view(_tabBarEl);
```
<!-- &e TAB_BAR -->

<!-- &s SUB_BANNER_TOGGLE — Cacher dropdowns indicateurs sur onglets preset -->
```js
{
  const isPreset = activeTab !== "explor";
  document.querySelectorAll(".pgent-grp-indic").forEach(el => { el.style.display = isPreset ? "none" : ""; });
  document.querySelectorAll(".pgent-grp-maille").forEach(el => { el.style.display = isPreset ? "none" : ""; });
  // Afficher label preset quand pas en mode libre
  const pl = document.getElementById("pgent-preset-label");
  if (pl) {
    const p = TAB_PRESETS[activeTab];
    pl.style.display = isPreset ? "" : "none";
    if (p) pl.innerHTML = `<span style="color:#dc2626;">G:</span> ${p.label1} <span style="color:#9ca3af;">·</span> <span style="color:#2563eb;">D:</span> ${p.label2}`;
  }
}
```
<!-- &e SUB_BANNER_TOGGLE -->

<!-- &s KPI_REACTIVE — KPI strips réactifs selon tab actif -->
```js
{
  const kpiIdf = document.getElementById("kpi-idf");
  const kpiM13 = document.getElementById("kpi-m13");
  if (kpiIdf) {
    kpiIdf.innerHTML = "";
    kpiIdf.appendChild(activeTab === "commerce" ? buildCommerceKpiTable(idfData, "#dc2626") : buildIdxKpiTable(idfData, "#dc2626"));
  }
  if (kpiM13) {
    kpiM13.innerHTML = "";
    kpiM13.appendChild(activeTab === "commerce" ? buildCommerceKpiTable(m13Data, "#2563eb") : buildIdxKpiTable(m13Data, "#2563eb"));
  }
}
```
<!-- &e KPI_REACTIVE -->

<!-- &s COLKEYS -->
```js
const _rawCK1 = indic1.startsWith("idxg_") ? indic1 : buildColKey(indic1, periode1);
const _rawCK2 = indic2.startsWith("idxg_") ? indic2 : buildColKey(indic2, periode2);
const _preset = TAB_PRESETS[activeTab];
const colKey1 = _preset ? _preset.colKey1 : _rawCK1;
const colKey2 = _preset ? _preset.colKey2 : _rawCK2;
const viewMode1 = _preset ? _preset.vm1 : viewMode;
const viewMode2 = _preset ? _preset.vm2 : viewMode;
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
const binsIdf1 = computeIrisBins(activeIdfData1, colKey1, paletteMode, _checkActive1);
const binsIdf2 = computeIrisBins(activeIdfData2, colKey2, paletteMode, _checkActive2);
const binsM1 = computeIrisBins(activeM13Data1, colKey1, paletteMode, _checkActive1);
const binsM2 = computeIrisBins(activeM13Data2, colKey2, paletteMode, _checkActive2);
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
  "idxg_ind": "◆ Indice gentrification T1 (11-16)",
  "idxg_t2_ind": "◆ Indice gentrification T2 (16-22)",
  "idxg_pct": "◆ Gentri. pctl. T1",
  "idxg_t2_pct": "◆ Gentri. pctl. T2",
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
  { key: "ratio_px_rev", label: "Ratio prix/rev.", evol: {}, ref: { t2: "rev_ratio_px_rev_21" }, evolUnit: "", refUnit: "×", refFmt: 0 },
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
  } else if (colKey.startsWith("idxg_") && !colKey.includes("_z_")) {
    // Indices gentrification (0-100 centré 50) — PAL_ECART_FRANCE bleu→blanc→bordeaux
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
    const label = isIdx ? (IDXG_LABELS[colKey] || colKey) : getColLabel(colKey, null, "short");
    const valStr = val != null ? (isIdx ? Number(val).toFixed(1) : formatValue(colKey, val)) : "n.d.";
    const pop = props._P22_POP || 0;
    const etab = props._NB_ETAB || 0;
    const isGreyed = isCom ? false : !isIrisActive({ P22_POP: pop, ecosi_etab_vol_26: etab });
    const zm = mapEl._zoneMean;
    const zl = mapEl._zoneLabel;
    // Percentile
    let pctTxt = "", pct = null;
    if (val != null && mapEl._sortedVals?.length > 0) {
      const sv = mapEl._sortedVals;
      pct = Math.round(100 * d3.bisectLeft(sv, val) / sv.length);
      pctTxt = ` · <span style="color:#a5b4fc;">P${pct}</span>`;
    }
    // Polarity lookup (non-IDXG only)
    const _indicKey = parseColKey(colKey).indic;
    const _indMeta = INDICATEURS[_indicKey] || {};
    const _pol = isIdx ? 0 : (_indMeta.polarity || 0);

    // Rank + polarity dots + devant/derrière (EXDTC-style)
    let rankHtml = "";
    if (pct != null && mapEl._sortedVals?.length > 0) {
      const sv = mapEl._sortedVals;
      const rank = sv.length - d3.bisectLeft(sv, val);
      if (isIdx) {
        // IDXG: triangle arrows based on percentile
        if (pct >= 80) rankHtml = ` · <span style="color:#ff3333;font-weight:700;">▲ ${rank}/${sv.length}</span>`;
        else if (pct >= 60) rankHtml = ` · <span style="color:#fb923c;">▲ ${rank}/${sv.length}</span>`;
        else if (pct <= 20) rankHtml = ` · <span style="color:#2563eb;font-weight:700;">▼ ${rank}/${sv.length}</span>`;
        else if (pct <= 40) rankHtml = ` · <span style="color:#60a5fa;">▼ ${rank}/${sv.length}</span>`;
        else rankHtml = ` · <span style="color:#94a3b8;">${rank}/${sv.length}</span>`;
      } else {
        // Non-IDXG: polarity dots ●●/●/○ + devant/derrière phrase
        const eff = _pol === 1 ? pct : _pol === -1 ? (100 - pct) : pct;
        let dotColor = "#94a3b8", dotSym = "○";
        if (_pol !== 0) {
          if (eff >= 95) { dotColor = "#4ade80"; dotSym = "●●"; }
          else if (eff >= 80) { dotColor = "#4ade80"; dotSym = "●"; }
          else if (eff <= 5) { dotColor = "#f87171"; dotSym = "●●"; }
          else if (eff <= 20) { dotColor = "#f87171"; dotSym = "●"; }
        }
        const dot = `<span style="color:${dotColor};font-size:9px;margin-right:2px;">${dotSym}</span>`;
        let posPhrase = "";
        if (_pol !== 0) {
          posPhrase = eff >= 50
            ? ` · <span style="color:#cbd5e1;font-size:10px;">devant ${eff}% des IRIS</span>`
            : ` · <span style="color:#cbd5e1;font-size:10px;">derrière ${100 - eff}% des IRIS</span>`;
        }
        rankHtml = `<br><span style="font-size:10.5px;padding-left:6px;">${dot}<span style="color:#a5b4fc;">${rank}<sup style="font-size:7px;">e</sup>/${sv.length}</span>${posPhrase}</span>`;
      }
    }
    // Zone mean inline
    let zmInline = "";
    if (zm != null && zl) {
      const zmStr = isIdx ? Number(zm).toFixed(1) : formatValue(colKey, zm);
      zmInline = ` · <span style="color:#94a3b8;font-size:10px;">moy.${zl}: ${zmStr}</span>`;
    }
    // Value color: polarity-aware for non-IDXG
    let valColor = "#93c5fd";
    if (!isIdx && _pol !== 0 && pct != null) {
      const eff = _pol === 1 ? pct : (100 - pct);
      if (eff >= 80) valColor = "#86efac";
      else if (eff <= 20) valColor = "#fca5a5";
    }
    // L1 — Nom + commune (isolé, bold)
    const lines = [`<b style="font-size:12px;">${name}</b>${commune ? ` <span style="color:#94a3b8;font-size:10px;">${commune}</span>` : ""}`];
    if (isGreyed) lines.push(`<span style="color:#f87171;font-size:10.5px;">Non classé (pop. &lt; ${POP_MIN} et étab. &lt; ${ETAB_MIN})</span>`);
    // L2 — Valeur indicateur (isolé, gros)
    lines.push(`<span style="color:${valColor};font-size:12.5px;font-weight:600;">${label} : ${valStr}</span>`);
    // L3 — Percentile + moy zone + classement (tout grisé, compact)
    if (isIdx && val != null && pct != null && mapEl._sortedVals?.length > 0) {
      const sv = mapEl._sortedVals;
      const rank = sv.length - d3.bisectLeft(sv, val);
      const zmStr = zm != null ? (isIdx ? Number(zm).toFixed(1) : formatValue(colKey, zm)) : null;
      let l3 = `<span style="color:#94a3b8;font-size:10px;">P${pct}`;
      if (zmStr && zl) l3 += ` · moy.${zl}: ${zmStr}`;
      l3 += ` · <span style="font-size:9px;">(${rank}<sup style="font-size:6px;">e</sup>/${sv.length})</span>`;
      l3 += `</span>`;
      lines.push(l3);
    } else if (!isIdx) {
      // Non-IDXG : garder format EXDTC (percentile + moy + polarity dots)
      let l2extra = pctTxt + zmInline + rankHtml;
      if (l2extra) lines[lines.length - 1] += l2extra;
    }
    if (pop) lines.push(`<span style="color:#64748b;font-size:10px;">Pop. ${Math.round(Number(pop)).toLocaleString("fr-FR")} hab.</span>`);
    if (etab && !isCom) lines.push(`<span style="color:#64748b;font-size:10px;">Étab. ${Number(etab).toLocaleString("fr-FR")}</span>`);
    // Commerce tab : bloc SIRENE enrichi (secteurs dominants, Shannon, densité)
    if (mapEl._activeTab === "commerce") {
      const sd1 = props._ecosi_nafdom1_lib_26, sd1p = props._ecosi_nafdom1_pct_26;
      const sd2 = props._ecosi_nafdom2_lib_26, sd2p = props._ecosi_nafdom2_pct_26;
      const shan = props._ecosi_shannon_ind_26;
      const dens = props._ecosi_etab_denspop_26;
      const _sep = `<span style="color:#374151;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-top:2px;display:block;">Tissu éco.</span>`;
      let ecoLines = [_sep];
      if (sd1) ecoLines.push(`<span style="color:#a5b4fc;font-size:10px;">1. ${sd1}${sd1p != null ? ` (${Number(sd1p).toFixed(0)}%)` : ""}</span>`);
      if (sd2) ecoLines.push(`<span style="color:#a5b4fc;font-size:10px;">2. ${sd2}${sd2p != null ? ` (${Number(sd2p).toFixed(0)}%)` : ""}</span>`);
      const ecoMeta = [];
      if (shan != null) ecoMeta.push(`Shannon ${Number(shan).toFixed(2)}`);
      if (dens != null) ecoMeta.push(`${Number(dens).toFixed(0)} étab/1k hab`);
      if (ecoMeta.length) ecoLines.push(`<span style="color:#94a3b8;font-size:9.5px;">${ecoMeta.join(" · ")}</span>`);
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
    let h = `<div style="display:flex;align-items:baseline;gap:3px;white-space:nowrap;">`;
    h += `<span style="color:#6b7280;font-size:9px;">${label}</span> `;
    h += `<b style="color:#1f2937;font-size:11px;">${val}</b>`;
    if (evolStr) {
      h += ` <span style="color:${evolColor(evolVal)};font-size:9px;">${evolStr}`;
      if (year) h += ` <span style="color:#b0b7be;font-size:7.5px;">${year}</span>`;
      h += `</span>`;
    }
    return h + `</div>`;
  }
  const grpStyle = `border-left:2px solid #e5e7eb;padding-left:6px;`;
  const grpLabel = (t) => `<div style="font-size:7.5px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">${t}</div>`;
  const wrap = document.createElement("div");
  let h = `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start;padding:3px 0 5px 12px;font-family:Inter,system-ui,sans-serif;background:#fafbfc;border-radius:4px;border:1px solid #ebedf0;">`;
  // CONTEXTE
  h += `<div style="border-left:2px solid ${accent};padding-left:6px;">${grpLabel("Contexte")}`;
  h += kpiItem("Pop.", fvk(total(all, "P22_POP")), fvEvol(med(all, "dm_pop_vtcam_1622"), "%"), med(all, "dm_pop_vtcam_1622"), "TCAM 16-22");
  h += `</div>`;
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
  // MARCHÉ
  h += `<div style="${grpStyle}">${grpLabel("Marché immo.")}`;
  h += kpiItem("Prix m²", fvEur(med(all, "logd_px2mm3_appt_24")), fvEvol(med(all, "logd_px2_glb_vevol_1624"), "%"), med(all, "logd_px2_glb_vevol_1624"), "16-24");
  h += kpiItem("Rev. médian", fvEur(med(all, "rev_med_21")), fvEvol(med(all, "rev_med_vevol_1921"), "%"), med(all, "rev_med_vevol_1921"), "19-21");
  const pxRev = med(all, "logd_pxmoisrev_21");
  h += kpiItem("Ratio px/rev", pxRev != null ? Math.round(pxRev) + " mois" : "—", null, null, null);
  h += `</div>`;
  // IDX GENTRIFICATION
  if (active.length > 0) {
    const idxT2 = med(active, "idxg_t2_ind"), idxT1 = med(active, "idxg_ind");
    const idxEvol = (idxT2 != null && idxT1 != null) ? idxT2 - idxT1 : null;
    const idxStr = idxT2 != null ? idxT2.toFixed(1) : "—";
    const idxEvolStr = idxEvol != null ? ((idxEvol > 0 ? "+" : "") + idxEvol.toFixed(1)) : null;
    h += `<div style="border-left:2px solid ${accent};padding-left:6px;">${grpLabel(`<span style="color:${accent};">Idx Gentri.</span>`)}`;
    h += `<div style="display:flex;align-items:baseline;gap:4px;">`;
    h += `<b style="color:${accent};font-size:14px;">${idxStr}</b>`;
    if (idxEvolStr) h += ` <span style="color:${evolColor(idxEvol)};font-size:10px;">${idxEvolStr} <span style="color:#b0b7be;font-size:7.5px;">T1→T2</span></span>`;
    h += `</div>`;
    h += `<div style="font-size:8px;color:#9ca3af;">${active.length} IRIS avec idx</div>`;
    h += `</div>`;
  }
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
    return `<div style="display:flex;align-items:baseline;gap:3px;white-space:nowrap;">` +
      `<span style="color:#6b7280;font-size:9px;">${label}</span> ` +
      `<b style="color:#1f2937;font-size:11px;">${val}</b></div>`;
  }
  const grpStyle = `border-left:2px solid #e5e7eb;padding-left:6px;`;
  const grpLabel = (t) => `<div style="font-size:7.5px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">${t}</div>`;
  const wrap = document.createElement("div");
  let h = `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start;padding:3px 0 5px 12px;font-family:Inter,system-ui,sans-serif;background:#fafbfc;border-radius:4px;border:1px solid #ebedf0;">`;
  // VOLUME
  h += `<div style="border-left:2px solid ${accent};padding-left:6px;">${grpLabel("Volume")}`;
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
  // CONTEXTE
  h += `<div style="${grpStyle}">${grpLabel("Contexte")}`;
  h += kpiItem("Pop.", fvk(total(all, "P22_POP")));
  h += `</div>`;
  h += `</div>`;
  wrap.innerHTML = h;
  return wrap;
}

display(html`<div class="pgent-section" style="border-left:3px solid #dc2626;padding-left:8px;" title="Paris (20 arr.) + 27 communes limitrophes"><span style="color:#dc2626;">Paris et 27 communes limitrophes</span> <span style="font-weight:400;font-size:11px;color:#9ca3af;">— ${_idfN} IRIS actifs / ${idfData.length}</span></div>`);
```

<div id="kpi-idf" style="min-height:32px;"></div>

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
display(html`<div class="pgent-section" style="border-left:3px solid #2563eb;padding-left:8px;"><span style="color:#2563eb;">Marseille — 16 arrondissements</span> <span style="font-weight:400;font-size:11px;color:#9ca3af;">— ${_m13N} IRIS actifs / ${m13Data.length}</span></div>`);
```

<div id="kpi-m13" style="min-height:32px;"></div>

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
    map.addLayer({ id: lineId, type: "line", source: sourceId, paint: { "line-color": "#9ca3af", "line-width": 0.3 } });
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
    // Bouton reset zoom (⌂)
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

  const _p = TAB_PRESETS[activeTab];
  const title1 = _p ? _p.label1 : ((indic1.startsWith("idxg_") ? (IDXG_LABELS[indic1] || indic1) : getFullLabel(indic1, periode1)) + (isCom1 ? " [commune]" : ""));
  const title2 = _p ? _p.label2 : ((indic2.startsWith("idxg_") ? (IDXG_LABELS[indic2] || indic2) : getFullLabel(indic2, periode2)) + (isCom2 ? " [commune]" : ""));

  // Update titres
  const t1 = document.getElementById("title-idf1"); if (t1) t1.textContent = title1;
  const t2 = document.getElementById("title-idf2"); if (t2) t2.textContent = title2;
  const t3 = document.getElementById("title-m1"); if (t3) t3.textContent = title1;
  const t4 = document.getElementById("title-m2"); if (t4) t4.textContent = title2;

  // GeoJSON sources — bins INDÉPENDANTS par zone + z-scores + brutes idxg en extraProps
  const extraBase = ["nom_commune", "ecosi_etab_vol_26", "libelle"];
  // Commerce tab : ajouter colonnes SIRENE pour tooltip enrichi
  const _ecoExtra = activeTab === "commerce"
    ? ["ecosi_nafdom1_lib_26", "ecosi_nafdom1_pct_26", "ecosi_nafdom2_lib_26", "ecosi_nafdom2_pct_26", "ecosi_shannon_ind_26", "ecosi_etab_denspop_26"]
    : [];
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
  function updateMap(ref, geo, colKey, sortedVals, bins, filterCb, zoneMean, naCount, zoneLabel, vmSide) {
    if (!ref?.map) return;
    const src = ref.map.getSource(ref.sourceId);
    if (src) src.setData(geo);
    ref.container._colKey = colKey;
    ref.container._sortedVals = sortedVals;
    ref.container._zoneMean = zoneMean;
    ref.container._zoneLabel = zoneLabel;
    ref.container._viewMode = vmSide;
    ref.container._activeTab = activeTab;
    ref.container._tooltipFn = makeTooltipFn(ref.container);
    const fillId = ref.sourceId.replace("src-", "") + "-fill";
    ref.map.setFilter(fillId, null);
    // Légende compacte bottom-left
    if (ref.container._leg) ref.container._leg.remove();
    const leg = makeLegend(bins, colKey, filterCb, zoneMean, naCount, zoneLabel);
    leg.style.cssText = "position:absolute;bottom:3px;left:3px;z-index:4;background:rgba(255,255,255,0.78);border:1px solid #e0e5ea;border-radius:3px;padding:0 3px 1px;backdrop-filter:blur(1.5px);line-height:1.1;";
    ref.container.style.position = "relative";
    ref.container.appendChild(leg);
    ref.container._leg = leg;

    // Labels top 5 / bottom 5 — symbole layer sur centroïdes
    const labSrcId = ref.sourceId + "-labels";
    const labLayerId = ref.sourceId.replace("src-", "") + "-labels";
    const ranked = geo.features
      .filter(f => f.properties._val != null && !isNaN(f.properties._val) && f.properties._fill !== GREY_NA)
      .sort((a, b) => a.properties._val - b.properties._val);
    const bot5 = ranked.slice(0, 5);
    const top5 = ranked.slice(-5);
    const labFeatures = [...top5.map(f => [f, "top"]), ...bot5.map(f => [f, "bot"])].map(([f, rank]) => {
      const centroid = d3.geoCentroid(f);
      const v = f.properties._val;
      const isIdx = colKey.startsWith("idxg_");
      const vStr = isIdx ? Number(v).toFixed(1) : formatValue(colKey, v);
      const name = (f.properties.nom_iris || f.properties._label || f.properties.code_insee || "").substring(0, 14);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: centroid },
        properties: { _labelText: `${name}\n${vStr}`, _rank: rank }
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
          "text-padding": 3
        },
        paint: {
          "text-color": ["case", ["==", ["get", "_rank"], "top"], "#b91c1c", "#1d4ed8"],
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.8
        }
      });
    }
  }

  updateMap(mapRefs.idf1, geoIdf1, colKey1, svIdf1, binsIdf1, makeFilterCb(mapRefs.idf1), meanIdf1, naIdf1, "IDF", viewMode1);
  updateMap(mapRefs.idf2, geoIdf2, colKey2, svIdf2, binsIdf2, makeFilterCb(mapRefs.idf2), meanIdf2, naIdf2, "IDF", viewMode2);
  updateMap(mapRefs.m1, geoM1, colKey1, svM1, binsM1, makeFilterCb(mapRefs.m1), meanM1, naM1, "Marseille", viewMode1);
  updateMap(mapRefs.m2, geoM2, colKey2, svM2, binsM2, makeFilterCb(mapRefs.m2), meanM2, naM2, "Marseille", viewMode2);
}
```
<!-- &e MAP_UPDATE -->

<!-- &s SCATTER_UPDATE — Scatter réactif par ville -->
```js
{
  const DEP_COLORS = { "75": "#1696d2", "92": "#fdbf11", "93": "#ec008b", "94": "#55b748" };
  const DEP_LABELS = { "75": "Paris", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne" };
  const M13_COLORS = { "13": "#2563eb" };
  const M13_LABELS = { "13": "Marseille" };

  // Scatter always uses IRIS data (even if one map is commune). Override colKey1 for Tab 1 (commune→IRIS substitute)
  const scatterCK1 = (activeTab === "gentri") ? "idxg_t2_ind" : colKey1;
  const scatterCK2 = colKey2;
  const _pLabel = TAB_PRESETS[activeTab];
  const stitle1 = _pLabel ? (_pLabel.label1.includes("commune") ? "◆ Indice gentrification T2 (16-22)" : _pLabel.label1) : (indic1.startsWith("idxg_") ? (IDXG_LABELS[indic1] || indic1) : getFullLabel(indic1, periode1));
  const stitle2 = _pLabel ? _pLabel.label2 : (indic2.startsWith("idxg_") ? (IDXG_LABELS[indic2] || indic2) : getFullLabel(indic2, periode2));

  function renderCityScatter(containerId, legendId, srcData, colorMap, labelMap, isCom) {
    const filterFn = isCom
      ? (d => d[scatterCK1] != null && d[scatterCK2] != null)
      : (d => isIrisActive(d) && (d.P22_POP || 0) >= 800 && d[scatterCK1] != null && d[scatterCK2] != null);
    const data = srcData.filter(filterFn).map(d => ({ ...d, libelle: enrichIrisName(d) }));
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
      subtitle: `${data.length} ${isCom ? "communes" : "IRIS"} · top/bottom ${N_HIGHLIGHT} en évidence · ${depSummary}`,
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
        return `<b>${name}</b> <span style="color:#9ca3af;font-size:10px;">${depLabel}</span><br>`
          + `<span style="color:#93c5fd;">${stitle1}:</span> ${v1 ?? "n.d."}<br>`
          + `<span style="color:#93c5fd;">${stitle2}:</span> ${v2 ?? "n.d."}<br>`
          + `<span style="color:#9ca3af;font-size:10px;">Pop: ${(d.P22_POP || 0).toLocaleString("fr-FR")}</span>`;
      },
      width: 420, height: 340,
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

  // Scatter always uses IRIS data for preset tabs, viewMode for free tab
  const scatterIsCom = activeTab === "explor" && viewMode === "commune";
  const _noMoy = d => d.code !== "MOY_ZONE";
  renderCityScatter("scatter-container-idf", "scatter-legend-idf", scatterIsCom ? comIdfData.filter(_noMoy) : idfData, DEP_COLORS, DEP_LABELS, scatterIsCom);
  renderCityScatter("scatter-container-m13", "scatter-legend-m13", scatterIsCom ? comM13Data.filter(_noMoy) : m13Data, M13_COLORS, M13_LABELS, scatterIsCom);
}
```
<!-- &e SCATTER_UPDATE -->

<!-- &s TABLE_UPDATE — Tableau classement par ville via buildDataTable -->
```js
{
  // Table viewMode : preset tabs → toujours IRIS, free tab → suit viewMode radio
  const tblIsCom = activeTab === "explor" && viewMode === "commune";
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

    // Autres composantes (hors CSP)
    for (const c of IDXG_COMPONENTS) {
      if (CSP_KEYS.has(c.key)) continue;
      const cols = [c.ref.t2, c.evol.t2].filter(Boolean);
      tableKeys.push(...cols);
      tableGroups.push({ label: c.label, cols });
      if (c.evol.t2) tableEvolCols.push(c.evol.t2);
    }

    // Colonnes fin : Marché
    tableKeys.push("logd_pxmoisrev_21", "ecosi_renouv_horsmE_pct_26");
    tableGroups.push({ label: "Marché", cols: ["logd_pxmoisrev_21", "ecosi_renouv_horsmE_pct_26"] });
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

  // IDF table — preset tabs toujours IRIS, free tab suit viewMode
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
