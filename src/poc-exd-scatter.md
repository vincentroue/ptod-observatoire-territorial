---
title: POC Scatter - PTOD
toc: false
theme: dashboard
style: styles/dashboard.css
---

<!-- BANNIÈRE (copiée de exd) -->
<div class="banner-full">
  <div class="banner-inner">
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" stroke="#2563eb" stroke-width="2" fill="#e8f0fe"/>
      <path d="M12 28 L20 12 L28 28 Z" fill="#2563eb" opacity="0.8"/>
      <circle cx="20" cy="22" r="4" fill="#1e40af"/>
    </svg>
    <div class="banner-titles">
      <h1>PTOD — POC Scatter Dynamique</h1>
      <p>Test chargement JSON pré-agrégés + nouvelle convention indicateurs</p>
    </div>
    <span class="sources-btn" title="POC: JSON agg_*.json + TopoJSON">? Info</span>
  </div>
</div>

```js
// === IMPORTS ===
import * as d3 from "npm:d3";
import * as Plot from "npm:@observablehq/plot";
// === INDICATEURS (auto-généré depuis config/ddict_indicateurs_ottd.json) ===
import { INDICATEURS, PERIODES, THEMES, getIndicOptions, formatValue, parseColKey, getColLabel, getSource, getTooltip } from "./helpers/indicators-ddict-js.js";

// === INDICATEURS DISPONIBLES DANS LES JSON (33 indicateurs) ===
const INDICS_DISPONIBLES = new Set([
  // Démographie (dm)
  "dm_pop_vtcam", "dm_sn_vtcam", "dm_sma_vtcam",
  "dm_1519_pct", "dm_2024_pct", "dm_2539_pct", "dm_4054_pct",
  "dm_5564_pct", "dm_6579_pct", "dm_80p_pct",
  // Vieillissement (dmv)
  "dmv_60p_pct", "dmv_75p_pct", "dmv_75p_vdifp", "dmv_iv_ind", "dmv_80p_seul_pct",
  // Flux migratoires (dmf)
  "dmf_pe_pct", "dmf_ps_pct", "dmf_tr_pct", "dmf_sm_stock", "dmf_tm_pct",
  // Économie (eco)
  "eco_emp_vtcam", "eco_sal_pct", "eco_nsal_pct",
  // Ménages (men)
  "men_mono_pct", "men_coupaenf_pct", "men_coupsenf_pct",
  // Logement (log)
  "log_tot_vtcam", "log_vac_pct", "log_vac_vdifp",
  "log_ressec_pct", "log_ressec_vdifp", "log_prop_pct", "log_loc_pct"
]);

// Filtrer dropdown pour ne montrer que indicateurs existants
function getIndicOptionsFiltered() {
  const allOptions = getIndicOptions();
  const filtered = [];
  for (const [label, value] of allOptions) {
    // Garder séparateurs thèmes
    if (value.startsWith("__sep_")) {
      filtered.push([label, value]);
    } else if (INDICS_DISPONIBLES.has(value)) {
      filtered.push([label, value]);
    }
  }
  // Supprimer séparateurs sans indicateurs après
  const cleaned = [];
  for (let i = 0; i < filtered.length; i++) {
    const [label, value] = filtered[i];
    if (value.startsWith("__sep_")) {
      // Vérifier si prochain élément est un indicateur (pas un autre séparateur)
      if (i + 1 < filtered.length && !filtered[i + 1][1].startsWith("__sep_")) {
        cleaned.push([label, value]);
      }
    } else {
      cleaned.push([label, value]);
    }
  }
  return new Map(cleaned);
}

const indicOptions = getIndicOptionsFiltered();

// === CONFIG ÉCHELONS (8 niveaux) ===
const ECHELON_CONFIG = {
  "Zone d'emploi": { geoKey: "ze2020", count: 287, hasGeo: true },
  "Département": { geoKey: "code", count: 96, hasGeo: true },
  "Région": { geoKey: "code", count: 13, hasGeo: true },
  "EPCI": { geoKey: "EPCI", count: 1231, hasGeo: true },
  "Bassin de vie": { geoKey: "bv2022", count: 1681, hasGeo: true },
  "Aire d'attraction": { geoKey: "aav2020", count: 682, hasGeo: true },
  "Unité urbaine": { geoKey: "uu2020", count: 2414, hasGeo: true }
  // "Commune": { geoKey: "code", count: 34859, hasGeo: false }  // DISABLED → DuckDB page
};
```

<!-- SÉLECTEURS -->
<div class="sub-banner" style="background:#f8fafc;padding:12px 20px;border-bottom:1px solid #e2e8f0;">
<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;">

<div>
<strong>Échelon :</strong>

```js
const echelon = view(Inputs.select(Object.keys(ECHELON_CONFIG), {value: "Zone d'emploi", label: ""}));
```

</div>

<div>
<strong>Indicateur X :</strong>

```js
const indicX = view(Inputs.select(indicOptions, {value: "dm_pop_vtcam", label: ""}));
```

</div>

<div>
<strong>Période X :</strong>

```js
const periodeX = view(Inputs.select(new Map([["2016-22", "1622"], ["2011-16", "1116"], ["2011-22", "1122"]]), {value: "1622", label: ""}));
```

</div>

<div>
<strong>Indicateur Y :</strong>

```js
const indicY = view(Inputs.select(indicOptions, {value: "dm_sma_vtcam", label: ""}));
```

</div>

<div>
<strong>Période Y :</strong>

```js
const periodeY = view(Inputs.select(new Map([["2016-22", "1622"], ["2011-16", "1116"], ["2011-22", "1122"]]), {value: "1622", label: ""}));
```

</div>

</div>
</div>

```js
// === CHARGEMENT DONNÉES (FileAttachment = chaînes littérales obligatoires) ===
// 8 échelons pré-chargés
const dataZE = await FileAttachment("data/agg_ze.json").json();
const dataDEP = await FileAttachment("data/agg_dep.json").json();
const dataREG = await FileAttachment("data/agg_reg.json").json();
const dataEPCI = await FileAttachment("data/agg_epci.json").json();
const dataBV = await FileAttachment("data/agg_bv.json").json();
const dataAAV = await FileAttachment("data/agg_aav.json").json();
const dataUU = await FileAttachment("data/agg_uu.json").json();
// DISABLED: Communes (35k lignes) → utiliser DuckDB page dédiée
// const dataCommune = await FileAttachment("data/agg_commune.json").json();

// Sélection selon échelon
const cfg = ECHELON_CONFIG[echelon];
const data = {
  "Zone d'emploi": dataZE,
  "Département": dataDEP,
  "Région": dataREG,
  "EPCI": dataEPCI,
  "Bassin de vie": dataBV,
  "Aire d'attraction": dataAAV,
  "Unité urbaine": dataUU
  // "Commune": dataCommune  // DISABLED
}[echelon];

// Colonnes complètes (indicateur + période)
const colX = `${indicX}_${periodeX}`;
const colY = `${indicY}_${periodeY}`;

// Vérification colonnes existent
const hasColX = data.length > 0 && data[0].hasOwnProperty(colX);
const hasColY = data.length > 0 && data[0].hasOwnProperty(colY);

// Filtrer données valides
const validData = data.filter(d => d[colX] != null && d[colY] != null && !isNaN(d[colX]) && !isNaN(d[colY]));

// Stats
const meanX = d3.mean(validData, d => d[colX]);
const meanY = d3.mean(validData, d => d[colY]);

// Échelles
const xExtent = d3.extent(validData, d => d[colX]);
const yExtent = d3.extent(validData, d => d[colY]);
const xDomain = [Math.min(xExtent[0] || 0, 0) - 0.5, Math.max(xExtent[1] || 0, 0) + 0.5];
const yDomain = [Math.min(yExtent[0] || 0, 0) - 0.5, Math.max(yExtent[1] || 0, 0) + 0.5];

// Échelle rayon basée sur population
const popExtent = d3.extent(validData, d => d.P22_POP || 0);
const radiusScale = d3.scaleSqrt()
  .domain([Math.max(1, popExtent[0] || 1), popExtent[1] || 100000])
  .range([3, 20]);

// Top/Bottom 5
const sortedByX = [...validData].sort((a, b) => b[colX] - a[colX]);
const top5 = sortedByX.slice(0, 5);
const bottom5 = sortedByX.slice(-5).reverse();

// === INFO DONNÉES ===
display(html`<div style="padding:12px 20px;background:#f0f9ff;border-bottom:1px solid #bae6fd;">
  <div style="display:flex;gap:24px;font-size:13px;">
    <span><strong>${cfg.count}</strong> ${echelon}</span>
    <span>X: <code>${colX}</code> ${hasColX ? "✅" : "❌ non trouvé"}</span>
    <span>Y: <code>${colY}</code> ${hasColY ? "✅" : "❌ non trouvé"}</span>
    <span><strong>Données valides :</strong> ${validData.length} / ${data.length}</span>
  </div>
</div>`);

// === SCATTER PLOT ===
display(html`<div style="padding:20px;">${
  hasColX && hasColY && validData.length > 0 ? Plot.plot({
    width: 900,
    height: 600,
    marginLeft: 60,
    marginBottom: 50,
    x: {
      domain: xDomain,
      label: `${INDICATEURS[indicX]?.medium || indicX} ${PERIODES[periodeX]?.long || periodeX}`,
      grid: true
    },
    y: {
      domain: yDomain,
      label: `${INDICATEURS[indicY]?.medium || indicY} ${PERIODES[periodeY]?.long || periodeY}`,
      grid: true
    },
    marks: [
      // Axes à 0
      Plot.ruleX([0], {stroke: "#999", strokeWidth: 1}),
      Plot.ruleY([0], {stroke: "#999", strokeWidth: 1}),
      // Moyennes
      Plot.ruleX([meanX], {stroke: "#2563eb", strokeWidth: 1, strokeDasharray: "4,4"}),
      Plot.ruleY([meanY], {stroke: "#2563eb", strokeWidth: 1, strokeDasharray: "4,4"}),
      // Points
      Plot.dot(validData, {
        x: colX,
        y: colY,
        r: d => radiusScale(d.P22_POP || 1000),
        fill: d => {
          // Couleur par quadrant
          const xVal = d[colX];
          const yVal = d[colY];
          if (xVal >= 0 && yVal >= 0) return "#22c55e";  // ++ vert
          if (xVal < 0 && yVal < 0) return "#ef4444";   // -- rouge
          if (xVal >= 0 && yVal < 0) return "#f59e0b";  // +- orange
          return "#3b82f6";  // -+ bleu
        },
        fillOpacity: 0.6,
        stroke: "#333",
        strokeWidth: 0.5,
        title: d => `${d.code}\nPop: ${(d.P22_POP || 0).toLocaleString("fr-FR")}\nX: ${formatValue(indicX, d[colX])}\nY: ${formatValue(indicY, d[colY])}`
      })
    ]
  }) : html`<div style="padding:40px;text-align:center;color:#dc2626;">
    <strong>Colonnes non trouvées ou données vides</strong><br>
    Vérifiez que <code>${colX}</code> et <code>${colY}</code> existent dans les données JSON.
  </div>`
}</div>`);

// === STATS RÉSUMÉ ===
display(html`<div style="padding:12px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;">
  <div style="display:flex;gap:32px;font-size:13px;">
    <div><strong>Moyenne X :</strong> ${formatValue(indicX, meanX)}</div>
    <div><strong>Moyenne Y :</strong> ${formatValue(indicY, meanY)}</div>
    <div><strong>Pop. totale :</strong> ${d3.sum(validData, d => d.P22_POP || 0).toLocaleString("fr-FR")}</div>
  </div>
</div>`);

// === TOP 5 / BOTTOM 5 ===
display(html`<div style="padding:20px;">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <div>
      <h3 style="margin:0 0 8px;font-size:14px;">Top 5 — ${INDICATEURS[indicX]?.short || indicX}</h3>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <tr style="background:#f0f9ff;"><th style="padding:4px;text-align:left;">Code</th><th style="text-align:right;">X</th><th style="text-align:right;">Y</th><th style="text-align:right;">Pop.</th></tr>
        ${top5.map(d => html`<tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:4px;">${d.code}</td>
          <td style="text-align:right;">${formatValue(indicX, d[colX])}</td>
          <td style="text-align:right;">${formatValue(indicY, d[colY])}</td>
          <td style="text-align:right;">${(d.P22_POP || 0).toLocaleString("fr-FR")}</td>
        </tr>`)}
      </table>
    </div>
    <div>
      <h3 style="margin:0 0 8px;font-size:14px;">Bottom 5 — ${INDICATEURS[indicX]?.short || indicX}</h3>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <tr style="background:#fef2f2;"><th style="padding:4px;text-align:left;">Code</th><th style="text-align:right;">X</th><th style="text-align:right;">Y</th><th style="text-align:right;">Pop.</th></tr>
        ${bottom5.map(d => html`<tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:4px;">${d.code}</td>
          <td style="text-align:right;">${formatValue(indicX, d[colX])}</td>
          <td style="text-align:right;">${formatValue(indicY, d[colY])}</td>
          <td style="text-align:right;">${(d.P22_POP || 0).toLocaleString("fr-FR")}</td>
        </tr>`)}
      </table>
    </div>
  </div>
</div>`);
```
