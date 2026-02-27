---
title: ObTer — Gentrification IRIS
toc: false
theme: dashboard
style: styles/dashboard-light.css
---

<!-- ============================================================
     Volet dpgent — Gentrification IRIS Paris+27 communes & Marseille
     Date: 2026-02-27 | v0.7 — bins indépendants, légende→carte, seuils 300/50
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
.pgent-layout { display: flex; gap: 10px; }
.pgent-maps { flex: 1 1 54%; min-width: 0; }
.pgent-aside { flex: 0 0 44%; min-width: 360px; max-width: 560px; }
.pgent-pair { display: flex; gap: 6px; margin-bottom: 6px; }
.pgent-pair > div { flex: 1; position: relative; }
.pgent-map-title { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.3px; }
.pgent-section { font-size: 13px; font-weight: 600; color: #374151; margin: 10px 0 4px; }
.pgent-leg-wrap { position: absolute; bottom: 6px; left: 6px; right: auto; top: auto; z-index: 4; background: rgba(255,255,255,0.92); border: 1px solid #e0e5ea; border-radius: 4px; padding: 3px 6px; backdrop-filter: blur(2px); pointer-events: auto; }
</style>
<!-- &e DARK_POPUP_CSS -->

<!-- &s BANNER -->
```js
import { createBanner, createNav, OTTD_PAGES } from "./helpers/layout.js";
const _vc = OTTD_PAGES.find(p => p.id === 'dpgent');
display(createBanner({
  voletTitle: "Gentrification IRIS — Paris + 27 communes & Marseille",
  voletTooltip: "Gentrification IRIS : revenus, CSP, logement, DVF, SIRENE sur Paris + 27 communes limitrophes et Marseille. Filtre : IRIS ≥200 hab ou ≥10 étab.",
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
import { getIndicOptionsAll, getPeriodesForIndicateur, getDefaultPeriode, buildColKey, getFullLabel, isSeparator } from "./helpers/selectindic.js";
import { PAL_SEQ7_BYRV, PAL_ECART_FRANCE } from "./helpers/colors.js";
import { createBinsLegendBar } from "./helpers/legend.js";
import {
  createOTTDMap, buildChoroplethSource, addChoroplethLayers,
  attachTooltip, attachHighlight, createResetControl, createMapWrapper, computeBounds
} from "./helpers/maplibre.js";
import { initDuckDB } from "./helpers/duckdb.js";
import { renderScatter } from "./helpers/scatter.js";
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

// DataMaps
const idfDataMap = new Map(idfData.map(d => [String(d.code), d]));
const m13DataMap = new Map(m13Data.map(d => [String(d.code), d]));

// Bounds serrés
const idfBounds = computeBounds(idfFeatures);
const m13Bounds = computeBounds(m13Features);
```
<!-- &e DATA_LOAD -->

<!-- &s INDICATORS_SELECT -->
```js
const availableCols = new Set(Object.keys(allDepData[0][0] || {}));
const indicOptions = getIndicOptionsAll(availableCols);
```
<!-- &e INDICATORS_SELECT -->

<!-- &s SUB_BANNER -->
<div style="display:flex; align-items:flex-start; gap:16px; padding:8px 16px; background:#fafafa; border-bottom:1px solid #e5e7eb; flex-wrap:wrap;">

<div style="display:flex; flex-direction:column; gap:2px;">
<span style="font-size:10px;font-weight:600;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;">Gauche</span>
<div style="display:flex; gap:6px; align-items:center;">

```js
const indic1 = view(Inputs.select(indicOptions, { value: "log_emmenrec_pct", label: "" }));
```

```js
const per1Map = getPeriodesForIndicateur(indic1, availableCols);
const per1Vals = [...per1Map.values()];
const periode1 = per1Vals.length > 0
  ? view(Inputs.select(per1Map, { value: per1Vals[0], label: "" }))
  : null;
```

</div>
</div>

<div style="display:flex; flex-direction:column; gap:2px;">
<span style="font-size:10px;font-weight:600;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;">Droite</span>
<div style="display:flex; gap:6px; align-items:center;">

```js
const indic2 = view(Inputs.select(indicOptions, { value: "rev_med", label: "" }));
```

```js
const per2Map = getPeriodesForIndicateur(indic2, availableCols);
const per2Vals = [...per2Map.values()];
const periode2 = per2Vals.length > 0
  ? view(Inputs.select(per2Map, { value: per2Vals[0], label: "" }))
  : null;
```

</div>
</div>

<div style="display:flex; flex-direction:column; gap:2px;">
<span style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Palette</span>

```js
const paletteMode = view(Inputs.radio(new Map([["Valeurs", "abs"], ["± moyenne", "ecart"]]), { value: "abs", label: "" }));
```

</div>

```js
const kpiPop = d3.sum(idfData.filter(isIrisActive), d => d.P22_POP || 0);
const kpiActive = idfData.filter(isIrisActive).length;
display(html`<div style="display:flex; gap:14px; font-size:11px; color:#374151; margin-left:auto; align-self:center;">
  <span><b style="color:#dc2626;">${kpiActive}</b>/${idfData.length} IRIS IDF</span>
  <span><b style="color:#dc2626;">${m13Data.filter(isIrisActive).length}</b>/${m13Data.length} IRIS Marseille</span>
  <span>Pop. <b>${Math.round(kpiPop).toLocaleString("fr-FR")}</b></span>
</div>`);
```

</div>
<!-- &e SUB_BANNER -->

<!-- &s COLKEYS -->
```js
const colKey1 = buildColKey(indic1, periode1);
const colKey2 = buildColKey(indic2, periode2);
```
<!-- &e COLKEYS -->

<!-- &s BINS_REACTIVE — Bins indépendants IDF / Marseille -->
```js
const binsIdf1 = computeIrisBins(idfData, colKey1, paletteMode);
const binsIdf2 = computeIrisBins(idfData, colKey2, paletteMode);
const binsM1 = computeIrisBins(m13Data, colKey1, paletteMode);
const binsM2 = computeIrisBins(m13Data, colKey2, paletteMode);
const getColorIdf1 = makeGetColor(binsIdf1);
const getColorIdf2 = makeGetColor(binsIdf2);
const getColorM1 = makeGetColor(binsM1);
const getColorM2 = makeGetColor(binsM2);
```
<!-- &e BINS_REACTIVE -->

<!-- &s HELPERS — Fonctions pures (pas de dep réactive sur paletteMode) -->
```js
function computeIrisBins(data, colKey, mode) {
  const vals = data
    .filter(d => isIrisActive(d))
    .map(d => d[colKey])
    .filter(v => v != null && !isNaN(v));
  if (vals.length === 0) return { thresholds: [0], palette: ["#ccc", "#ccc"], counts: [0], mean: 0, mode };
  vals.sort((a, b) => a - b);
  const mean = d3.mean(vals);

  if (mode === "ecart") {
    const sd = d3.deviation(vals) || 1;
    const thresholds = [-2*sd, -1.5*sd, -1*sd, -0.3*sd, 0.3*sd, 1*sd, 1.5*sd, 2*sd].map(t => mean + t);
    const palette = PAL_ECART_FRANCE;
    const counts = new Array(palette.length).fill(0);
    for (const v of vals) { let b = thresholds.findIndex(t => v < t); if (b === -1) b = palette.length - 1; counts[b]++; }
    return { thresholds, palette, counts, mean, mode };
  }
  const q = (p) => vals[Math.min(Math.floor(p * vals.length), vals.length - 1)];
  const thresholds = [q(0.05), q(0.20), q(0.40), q(0.60), q(0.80), q(0.95)];
  const palette = PAL_SEQ7_BYRV;
  const counts = new Array(palette.length).fill(0);
  for (const v of vals) { let b = thresholds.findIndex(t => v < t); if (b === -1) b = palette.length - 1; counts[b]++; }
  return { thresholds, palette, counts, mean, mode };
}

function makeGetColor(bins) {
  const { thresholds: t, palette: p } = bins;
  return (val, row) => {
    if (row && !isIrisActive(row)) return GREY_INACTIVE;
    if (val == null || isNaN(val)) return GREY_NA;
    if (val < t[0]) return p[0];
    for (let i = 0; i < t.length - 1; i++) { if (val < t[i + 1]) return p[i + 1]; }
    return p[p.length - 1];
  };
}

// Retourne l'index de bin pour une valeur (pour filtrage légende → carte)
function getBinIdx(bins, val) {
  if (val == null || isNaN(val)) return -1;
  const { thresholds: t } = bins;
  if (val < t[0]) return 0;
  for (let i = 0; i < t.length - 1; i++) { if (val < t[i + 1]) return i + 1; }
  return bins.palette.length - 1;
}

function makeTooltipFn(mapEl) {
  return (props) => {
    const irisName = props.nom_iris || props._label || props.code_iris || "?";
    const commune = props.nom_commune || "";
    const val = props._val;
    const colKey = mapEl._colKey || "";
    const label = getColLabel(colKey, null, "short");
    const valStr = val != null ? formatValue(colKey, val) : "n.d.";
    const pop = props._P22_POP || props._pop || 0;
    const etab = props._ecosi_etab_vol_26 || props._NB_ETAB || 0;
    const typ = props.type_iris || props._TYP_IRIS || "";
    const isGreyed = !isIrisActive({ P22_POP: pop, ecosi_etab_vol_26: etab });

    // Percentile parmi IRIS actifs
    let pctTxt = "";
    if (val != null && mapEl._sortedVals?.length > 0) {
      const sv = mapEl._sortedVals;
      const rank = d3.bisectLeft(sv, val);
      const pct = Math.round(100 * rank / sv.length);
      pctTxt = `<br><span style="color:#a5b4fc;font-size:10px;">Rang : devant ${pct}% des IRIS</span>`;
    }

    return `<b>${irisName}</b> · <span style="color:#cbd5e1;font-size:10.5px;">${commune}</span>
      ${isGreyed ? `<br><span style="color:#f87171;font-size:10px;">IRIS ${typ === "A" ? "activité" : typ === "D" ? "divers" : "faible pop."} — non classé</span>` : ""}
      <br><span style="color:#93c5fd;font-size:12px;font-weight:500;">${label} : ${valStr}</span>${pctTxt}
      ${pop ? `<br><span style="color:#94a3b8;font-size:10px;">Pop. ${Math.round(Number(pop)).toLocaleString("fr-FR")} hab.</span>` : ""}
      ${etab ? `<br><span style="color:#94a3b8;font-size:10px;">Étab. ${Number(etab).toLocaleString("fr-FR")}</span>` : ""}`;
  };
}

function makeLegend(bins, colKey, onFilter) {
  const { indic } = parseColKey(colKey);
  const meta = INDICATEURS[indic];
  const unit = bins.mode === "ecart" ? "±moy." : (meta?.unit || "");
  return createBinsLegendBar({
    colors: bins.palette, thresholds: bins.thresholds, counts: bins.counts, unit,
    interactive: true, onFilter
  });
}

// Custom buildSource qui gère le grisé TYP_IRIS
function buildGentSource(features, dataMap, colKey, getColorFn, opts) {
  const { codeProperty = "code_iris", extraProps = [], bins = null } = opts;
  return {
    type: "FeatureCollection",
    features: features.map(f => {
      const code = f.properties[codeProperty];
      const d = dataMap.get(code);
      const val = d?.[colKey] ?? null;
      const color = d ? getColorFn(val, d) : GREY_NA;
      const enriched = { _fill: color, _val: val, _code: code };
      // Index bin pour filtrage légende → carte (MapLibre setFilter)
      enriched._binIdx = (bins && d && isIrisActive(d)) ? getBinIdx(bins, val) : -1;
      enriched._label = f.properties.nom_iris || d?.libelle || code;
      enriched._pop = d?.P22_POP || 0;
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

<!-- &s LAYOUT — Structure DOM persistante (maps + scatter) -->

<div class="pgent-section" title="Paris (20 arr.) + Clichy, Levallois-Perret, Neuilly-sur-Seine, Puteaux, Courbevoie, Boulogne-Billancourt, Issy-les-Moulineaux, Vanves, Malakoff, Montrouge, Châtillon, Saint-Ouen, Saint-Denis, Aubervilliers, Pantin, Le Pré-Saint-Gervais, Les Lilas, Romainville, Bagnolet, Montreuil, Vincennes, Saint-Mandé, Charenton-le-Pont, Ivry-sur-Seine, Le Kremlin-Bicêtre, Gentilly, Arcueil">Paris et 27 communes limitrophes</div>

<div class="pgent-layout">
<div class="pgent-maps">

<div class="pgent-pair">
<div>
<div class="pgent-map-title" id="title-idf1"></div>
<div id="mc-idf1" style="height:400px; border-radius:6px; overflow:hidden;"></div>
</div>
<div>
<div class="pgent-map-title" id="title-idf2"></div>
<div id="mc-idf2" style="height:400px; border-radius:6px; overflow:hidden;"></div>
</div>
</div>

<div class="pgent-section">Marseille (16 arrondissements)</div>

<div class="pgent-pair">
<div>
<div class="pgent-map-title" id="title-m1"></div>
<div id="mc-m1" style="height:370px; border-radius:6px; overflow:hidden;"></div>
</div>
<div>
<div class="pgent-map-title" id="title-m2"></div>
<div id="mc-m2" style="height:370px; border-radius:6px; overflow:hidden;"></div>
</div>
</div>

</div>

<div class="pgent-aside">
<div class="pgent-section" id="scatter-title"></div>
<div id="scatter-container"></div>
<div id="scatter-legend" style="padding:8px;"></div>
</div>

</div>
<!-- &e LAYOUT -->

<!-- &s MAP_INIT — Création des 4 cartes (une seule fois) -->
```js
const mapRefs = await (async () => {
  const refs = {};

  async function initMap(containerId, features, dataMap, bounds, sourceId, prefix) {
    const container = document.getElementById(containerId);
    if (!container || container._mapReady) return null;
    const { map, Popup } = await createOTTDMap(container, { maxZoom: 16 });
    await new Promise(r => { if (map.loaded()) r(); else map.on("load", r); });

    // Source initiale vide (sera remplie dans l'update cell)
    map.addSource(sourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const fillId = `${prefix}-fill`;
    const lineId = `${prefix}-line`;
    const hoverId = `${prefix}-hover`;
    map.addLayer({ id: fillId, type: "fill", source: sourceId, paint: { "fill-color": ["get", "_fill"], "fill-opacity": 0.78 } });
    map.addLayer({ id: lineId, type: "line", source: sourceId, paint: { "line-color": "#9ca3af", "line-width": 0.3 } });
    map.addLayer({ id: hoverId, type: "fill", source: sourceId, paint: { "fill-color": "#ffd700", "fill-opacity": 0.3 }, filter: ["==", ["get", "code_iris"], ""] });

    // Tooltip proxy — dummy initial, MAP_UPDATE sets the real function
    container._tooltipFn = () => "";
    attachTooltip(map, fillId, (props, lngLat) => container._tooltipFn(props, lngLat), { Popup });

    // Hover highlight
    map.on("mousemove", fillId, (e) => {
      if (e.features?.length) map.setFilter(hoverId, ["==", ["get", "code_iris"], e.features[0].properties.code_iris || ""]);
    });
    map.on("mouseleave", fillId, () => map.setFilter(hoverId, ["==", ["get", "code_iris"], ""]));

    // Zoom serré — padding faible pour coller aux features
    map.fitBounds(bounds, { padding: 15, duration: 0 });
    container._mapReady = true;
    return { map, container, sourceId, Popup };
  }

  refs.idf1 = await initMap("mc-idf1", idfFeatures, idfDataMap, idfBounds.bounds, "src-idf1", "idf1");
  refs.idf2 = await initMap("mc-idf2", idfFeatures, idfDataMap, idfBounds.bounds, "src-idf2", "idf2");
  refs.m1 = await initMap("mc-m1", m13Features, m13DataMap, m13Bounds.bounds, "src-m1", "m1");
  refs.m2 = await initMap("mc-m2", m13Features, m13DataMap, m13Bounds.bounds, "src-m2", "m2");

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

  return refs;
})();
```
<!-- &e MAP_INIT -->

<!-- &s MAP_UPDATE — Mise à jour réactive des données cartes (in-place) -->
```js
{
  // Sorted vals par zone pour percentile tooltip
  const svIdf1 = idfData.filter(d => isIrisActive(d) && d[colKey1] != null).map(d => d[colKey1]).sort((a, b) => a - b);
  const svIdf2 = idfData.filter(d => isIrisActive(d) && d[colKey2] != null).map(d => d[colKey2]).sort((a, b) => a - b);
  const svM1 = m13Data.filter(d => isIrisActive(d) && d[colKey1] != null).map(d => d[colKey1]).sort((a, b) => a - b);
  const svM2 = m13Data.filter(d => isIrisActive(d) && d[colKey2] != null).map(d => d[colKey2]).sort((a, b) => a - b);

  const title1 = getFullLabel(indic1, periode1);
  const title2 = getFullLabel(indic2, periode2);

  // Update titres
  const t1 = document.getElementById("title-idf1"); if (t1) t1.textContent = title1;
  const t2 = document.getElementById("title-idf2"); if (t2) t2.textContent = title2;
  const t3 = document.getElementById("title-m1"); if (t3) t3.textContent = title1;
  const t4 = document.getElementById("title-m2"); if (t4) t4.textContent = title2;

  // GeoJSON sources — bins INDÉPENDANTS par zone
  const geoIdf1 = buildGentSource(idfFeatures, idfDataMap, colKey1, getColorIdf1, { extraProps: ["nom_commune", "ecosi_etab_vol_26"], bins: binsIdf1 });
  const geoIdf2 = buildGentSource(idfFeatures, idfDataMap, colKey2, getColorIdf2, { extraProps: ["nom_commune", "ecosi_etab_vol_26"], bins: binsIdf2 });
  const geoM1 = buildGentSource(m13Features, m13DataMap, colKey1, getColorM1, { extraProps: ["nom_commune", "ecosi_etab_vol_26"], bins: binsM1 });
  const geoM2 = buildGentSource(m13Features, m13DataMap, colKey2, getColorM2, { extraProps: ["nom_commune", "ecosi_etab_vol_26"], bins: binsM2 });

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

  // setData + légendes interactives (1 légende par carte, bins indépendants)
  function updateMap(ref, geo, colKey, sortedVals, bins, filterCb) {
    if (!ref?.map) return;
    const src = ref.map.getSource(ref.sourceId);
    if (src) src.setData(geo);
    ref.container._colKey = colKey;
    ref.container._sortedVals = sortedVals;
    ref.container._tooltipFn = makeTooltipFn(ref.container);
    // Reset filtre à chaque changement d'indicateur
    const fillId = ref.sourceId.replace("src-", "") + "-fill";
    ref.map.setFilter(fillId, null);
    // Légende interactive bottom-left
    if (ref.container._leg) ref.container._leg.remove();
    const leg = makeLegend(bins, colKey, filterCb);
    leg.style.position = "absolute";
    leg.style.bottom = "6px";
    leg.style.left = "6px";
    leg.style.right = "auto";
    leg.style.top = "auto";
    leg.style.zIndex = "4";
    leg.style.background = "rgba(255,255,255,0.92)";
    leg.style.border = "1px solid #e0e5ea";
    leg.style.borderRadius = "4px";
    leg.style.padding = "3px 6px";
    leg.style.backdropFilter = "blur(2px)";
    ref.container.style.position = "relative";
    ref.container.appendChild(leg);
    ref.container._leg = leg;
  }

  // Chaque carte a sa propre légende avec son propre filtre
  updateMap(mapRefs.idf1, geoIdf1, colKey1, svIdf1, binsIdf1, makeFilterCb(mapRefs.idf1));
  updateMap(mapRefs.idf2, geoIdf2, colKey2, svIdf2, binsIdf2, makeFilterCb(mapRefs.idf2));
  updateMap(mapRefs.m1, geoM1, colKey1, svM1, binsM1, makeFilterCb(mapRefs.m1));
  updateMap(mapRefs.m2, geoM2, colKey2, svM2, binsM2, makeFilterCb(mapRefs.m2));
}
```
<!-- &e MAP_UPDATE -->

<!-- &s SCATTER_UPDATE — Scatter réactif dans le panel de droite -->
```js
{
  // Urban Institute palette — couleurs très distinctes pour diagnostic visuel
  const DEP_COLORS = { "75": "#1696d2", "92": "#fdbf11", "93": "#ec008b", "94": "#55b748" };
  const DEP_LABELS = { "75": "Paris", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne" };

  const scatterData = idfData.filter(d =>
    isIrisActive(d) && (d.P22_POP || 0) >= 1500 && d[colKey1] != null && d[colKey2] != null
  );
  const xVals = scatterData.map(d => d[colKey1]).sort(d3.ascending);
  const yVals = scatterData.map(d => d[colKey2]).sort(d3.ascending);
  const xMin = d3.quantile(xVals, 0.02), xMax = d3.quantile(xVals, 0.98);
  const yMin = d3.quantile(yVals, 0.02), yMax = d3.quantile(yVals, 0.98);
  const xPad = (xMax - xMin) * 0.08, yPad = (yMax - yMin) * 0.08;

  const title1 = getFullLabel(indic1, periode1);
  const title2 = getFullLabel(indic2, periode2);
  const stEl = document.getElementById("scatter-title");
  if (stEl) stEl.textContent = `${title1} × ${title2}`;

  const sc = document.getElementById("scatter-container");
  if (sc) {
    sc.innerHTML = "";
    const plot = renderScatter({
      data: scatterData,
      xCol: colKey1, yCol: colKey2,
      xDomain: [xMin - xPad, xMax + xPad],
      yDomain: [yMin - yPad, yMax + yPad],
      xLabel: title1, yLabel: title2,
      meanX: d3.mean(xVals), meanY: d3.mean(yVals),
      getRadius: d => Math.max(2, Math.min(7, Math.sqrt((d.P22_POP || 500) / 250))),
      getColor: d => DEP_COLORS[d._dep] || "#999",
      getTooltip: d => `${d.libelle || d.code}\n${title1}: ${formatValue(colKey1, d[colKey1])}\n${title2}: ${formatValue(colKey2, d[colKey2])}`,
      fillOpacity: 0.65,
      width: 480, height: 420
    });
    sc.appendChild(plot);
  }

  // Légende scatter (DOM)
  const sl = document.getElementById("scatter-legend");
  if (sl) {
    sl.innerHTML = "";
    for (const [dep, color] of Object.entries(DEP_COLORS)) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:3px;";
      const dot = document.createElement("span");
      dot.style.cssText = `display:inline-block;width:9px;height:9px;border-radius:50%;background:${color};`;
      const txt = document.createElement("span");
      txt.style.cssText = "font-size:10.5px;color:#374151;";
      txt.textContent = `${DEP_LABELS[dep]} (${dep})`;
      row.appendChild(dot);
      row.appendChild(txt);
      sl.appendChild(row);
    }
    const info = document.createElement("div");
    info.style.cssText = "font-size:10px;color:#9ca3af;margin-top:6px;";
    info.textContent = `${scatterData.length.toLocaleString("fr-FR")} IRIS actifs · Rayon = population`;
    sl.appendChild(info);
  }
}
```
<!-- &e SCATTER_UPDATE -->
