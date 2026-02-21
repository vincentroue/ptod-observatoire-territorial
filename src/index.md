---
title: ObTer — Observatoire Territorial
toc: false
sidebar: false
pager: false
style: styles/dashboard-light.css
---

<style>
/* &s IDX_STYLES — Landing page v5 — bannière + 2 colonnes + double carte */

/* Fix gap du body padding-top (compensait le banner fixed, plus nécessaire ici) */
body { padding-top: 0 !important; }
.banner { display: none !important; }

/* MEGA BANNER */
.idx-mega-banner {
  background: linear-gradient(135deg, #0a1929 0%, #132f4c 60%, #1a3f5c 100%);
  color: #fff; padding: 14px 24px 12px; position: relative;
}

/* Row 1 : Brand gauche + Nav droite */
.idx-mb-row1 { display: flex; align-items: center; gap: 16px; }
.idx-mb-brand { flex: 1; }
.idx-mb-brand h1 { font-size: 22px; font-weight: 700; margin: 0; font-family: Inter, sans-serif; color: #fff; letter-spacing: -0.3px; }
.idx-mb-brand h1 span { color: #60a5fa; font-weight: 300; }

/* Nav buttons top-right */
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

/* KPIs contenu sous le titre */
.idx-mb-kpis { display: flex; gap: 20px; margin: 8px 0 0; flex-wrap: wrap; }
.idx-mb-kpi { display: flex; align-items: baseline; gap: 5px; }
.idx-mb-kpi-val { font-size: 16px; font-weight: 700; color: #60a5fa; }
.idx-mb-kpi-lab { font-size: 10.5px; color: #c8d8e8; }

/* Question */
.idx-mb-q { font-size: 12px; color: #b0c8e0; margin: 8px 0 0; line-height: 1.4; max-width: 700px; }

/* 2 COLONNES */
.idx-cols { display: flex; min-height: calc(100vh - 120px); }
.idx-col-left {
  flex: 0 0 34%; background: #1b2a3e; color: #e2e8f0; padding: 16px 16px 20px;
  overflow-y: auto;
}
.idx-col-right {
  flex: 1; background: #f0f4f8; padding: 14px 16px; overflow-y: auto;
}

/* Left — texte plus lisible sur fond sombre */
.idx-l-intro { font-size: 12.5px; color: #c0cdd8; line-height: 1.55; margin-bottom: 14px; }
.idx-l-intro strong { color: #fff; }
.idx-l-title { font-size: 10.5px; font-weight: 600; color: #8899aa; text-transform: uppercase; letter-spacing: 0.5px; margin: 14px 0 8px; }

/* Vignettes */
.idx-vignettes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.idx-vig {
  display: block; border-radius: 6px; overflow: hidden; text-decoration: none; color: inherit;
  transition: all .15s; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
}
.idx-vig:hover { background: rgba(255,255,255,0.12); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.idx-vig .v-img {
  width: 100%; height: 50px; display: flex; align-items: center; justify-content: center;
  font-size: 22px; color: rgba(255,255,255,0.35); border-bottom: 2px solid var(--vc, #2171b5);
}
.idx-vig .v-body { padding: 6px 8px; }
.idx-vig .v-title { font-weight: 600; font-size: 11px; color: #fff; margin-bottom: 2px; }
.idx-vig .v-desc { font-size: 9px; color: #94a3b8; line-height: 1.3; }

/* Right panel */
.idx-r-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
.idx-r-title { font-size: 14px; font-weight: 600; color: #374151; }
.idx-r-title span { color: #e11d48; }
.idx-r-header form { margin: 0; }
.idx-r-header label { font-size: 11px; color: #64748b; }

/* Illustration panels */
.idx-row { display: flex; gap: 8px; margin-bottom: 8px; }
.idx-row > div { flex: 1; min-width: 0; }
.idx-ill { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; overflow: hidden; }
.idx-ill .it { font-size: 10.5px; font-weight: 600; color: #374151; margin-bottom: 4px; }
.idx-ill .in { font-size: 8.5px; color: #94a3b8; font-style: italic; text-align: right; margin-top: 3px; }
.idx-ill svg, .idx-ill table { max-width: 100%; }

/* Map legend strip */
.idx-legend { display: flex; gap: 0; margin-top: 5px; border-radius: 2px; overflow: hidden; }
.idx-lg-item { flex: 1; text-align: center; }
.idx-lg-swatch { height: 8px; width: 100%; display: block; }
.idx-lg-label { font-size: 7px; color: #94a3b8; display: block; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* DENS legend */
.idx-dens { display: flex; gap: 10px; margin-top: 4px; }
.idx-dens span { font-size: 9px; color: #64748b; display: flex; align-items: center; gap: 3px; }
.idx-dens i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

/* Sources */
.idx-src { padding: 12px 16px; }
.idx-src table { width: 100%; font-size: 10px; border-collapse: collapse; }
.idx-src th { text-align: left; border-bottom: 2px solid #e2e8f0; padding: 3px 8px; color: #64748b; font-weight: 600; }
.idx-src td { padding: 3px 8px; border-bottom: 1px solid #f1f5f9; }
.idx-foot { text-align: center; font-size: 9px; color: #94a3b8; padding: 8px; border-top: 1px solid #e2e8f0; }

@media (max-width: 900px) {
  .idx-cols { flex-direction: column; }
  .idx-col-left { flex: none; }
  .idx-vignettes { grid-template-columns: 1fr 1fr 1fr; }
  .idx-row { flex-direction: column; }
  .idx-mb-row1 { flex-direction: column; }
}
/* &e */
</style>

```js
// &s IMPORTS
import * as topojson from "npm:topojson-client";
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import rewind from "npm:@mapbox/geojson-rewind";

import { OTTD_PAGES } from "./helpers/layout.js";
import { computeIndicBins } from "./helpers/colors.js";
import { INDICATEURS, formatValue, getColLabel, getSource } from "./helpers/indicators-ddict-js.js";
import { parseColKey } from "./helpers/indicators-ddict-ext.js";
import { renderScatter } from "./helpers/scatter.js";
import { renderTable, computeBarStats, sortTableData, buildTableColumns, formatCellValue } from "./helpers/0table.js";
import { DENS_COLORS, DENS_LABELS } from "./helpers/constants.js";
import { initTooltip, showTooltip, hideTooltip, buildScatterTooltip, buildTerritoryTooltip } from "./helpers/tooltip.js";
// &e
```

```js
// &s DATA_LOAD — fichiers légers (_idx = sample 10 indicateurs)
const zeData      = await FileAttachment("data/agg_ze_idx.json").json();
const zeTopo      = await FileAttachment("data/nodom_zones-emploi_2025.topojson").json();
const frSerieRaw  = await FileAttachment("data/idx_serie_emploi_france.json").json();
const zeSerieRaw  = await FileAttachment("data/idx_serie_emploi_ze.json").json();
initTooltip();
// &e
```

```js
// &s TERRITORY_SELECT — input créé sans view(), injecté dans le panneau droit
const TERR_PRESETS = [
  { code: "5315", label: "Rennes" },
  { code: "8423", label: "Montluçon" },
  { code: "5302", label: "Brest" }
];
const terrInput = Inputs.radio(
  TERR_PRESETS.map(d => d.code),
  { value: "5315", format: d => TERR_PRESETS.find(p => p.code === d)?.label || d, label: "Territoire" }
);
const selectedTerrCode = Generators.input(terrInput);
// &e
```

```js
// &s MEGA_BANNER — Brand + nav top-right, KPIs contenu sous titre
const _page = document.createElement("div");
_page.className = "idx-page";

const banner = document.createElement("div");
banner.className = "idx-mega-banner";

// ROW 1 : Brand (gauche) + Nav (droite)
const row1b = document.createElement("div");
row1b.className = "idx-mb-row1";

const brand = document.createElement("div");
brand.className = "idx-mb-brand";
brand.innerHTML = `<h1>ObTer <span>—</span> Observatoire Territorial France</h1>`;
row1b.appendChild(brand);

const nav = document.createElement("div");
nav.className = "idx-mb-nav";
OTTD_PAGES.forEach(p => {
  const a = document.createElement("a");
  a.href = p.disabled ? "#" : p.href;
  a.textContent = p.label;
  if (p.title) a.title = p.title;
  if (p.id === "__index__") a.classList.add("active");
  if (p.deprecated) a.classList.add("deprecated");
  if (p.disabled) a.classList.add("disabled");
  nav.appendChild(a);
});
row1b.appendChild(nav);
banner.appendChild(row1b);

// KPIs contenu — échelons, indicateurs, temporalités, bases
const kpis = document.createElement("div");
kpis.className = "idx-mb-kpis";
[
  { v: "8", l: "échelons géographiques" },
  { v: "60+", l: "indicateurs" },
  { v: "3", l: "temporalités" },
  { v: "8", l: "bases de données" }
].forEach(k => {
  const el = document.createElement("div");
  el.className = "idx-mb-kpi";
  el.innerHTML = `<span class="idx-mb-kpi-val">${k.v}</span><span class="idx-mb-kpi-lab">${k.l}</span>`;
  kpis.appendChild(el);
});
banner.appendChild(kpis);

// Question
const q = document.createElement("p");
q.className = "idx-mb-q";
q.textContent = "Flux migratoires, dynamiques économiques et marchés du logement : comment se recomposent les territoires français ?";
banner.appendChild(q);

_page.appendChild(banner);
display(_page);
// &e
```

```js
// &s MAIN_COLS — 2 colonnes : gauche sombre (vignettes) + droite clair (double carte + scatter + table)
const terrRow = zeData.find(d => d.code === selectedTerrCode);
const terrName = terrRow?.libelle || "Territoire";
const geo = rewind(topojson.feature(zeTopo, zeTopo.objects.data), true);
const lookup = new Map(zeData.map(d => [String(d.code), d]));
const getCode = f => String(f.properties?.ze2020 || "");
const dataNoFrance = zeData.filter(d => d.code !== "00FR");

// Bins pour les 2 cartes
const smaCol = "dm_sma_vtcam_1622";
const dvfCol = "logd_px2_global_vevol_1924";
const smaBins = computeIndicBins(dataNoFrance, smaCol);
const dvfBins = computeIndicBins(dataNoFrance, dvfCol);

// Helper : petite légende couleur sous carte
function makeMapLegend(bins, palette) {
  const leg = document.createElement("div");
  leg.className = "idx-legend";
  const labels = bins.bins?.labels || [];
  palette.forEach((c, i) => {
    const item = document.createElement("div");
    item.className = "idx-lg-item";
    item.innerHTML = `<span class="idx-lg-swatch" style="background:${c}"></span>` +
      (labels[i] ? `<span class="idx-lg-label">${labels[i]}</span>` : "");
    leg.appendChild(item);
  });
  return leg;
}

const cols = document.createElement("div");
cols.className = "idx-cols";

// COLONNE GAUCHE
{
  const left = document.createElement("div");
  left.className = "idx-col-left";

  const intro = document.createElement("div");
  intro.className = "idx-l-intro";
  intro.innerHTML = `
    <strong>60+ indicateurs</strong> croisés sur <strong>8 échelons</strong> géographiques
    (de la commune à la région, en passant par EPCI, zones d'emploi, bassins de vie, aires d'attraction).
    <br><br>
    <strong>3 temporalités</strong> : stock annuel, évolution courte (2-3 ans), trajectoire longue (6-8 ans).
    <strong>8 bases</strong> : INSEE RP, MIGCOM, DVF, Filosofi, URSSAF, FLORES, LOVAC, SITADEL.
    <br><br>
    Le panneau de droite illustre les composants sur <strong style="color:#60a5fa">${terrName}</strong>.
  `;
  left.appendChild(intro);

  const st = document.createElement("div");
  st.className = "idx-l-title";
  st.textContent = "Volets thématiques";
  left.appendChild(st);

  const vigGrid = document.createElement("div");
  vigGrid.className = "idx-vignettes";

  const vigDefs = [
    { id: "exdtc", icon: "◎", title: "Exploration libre",
      desc: "35 000 communes. Portrait, comparaison, zoom territorial." },
    { id: "exdeco", icon: "▤", title: "Économie & Spécialisation",
      desc: "FLORES, URSSAF, Krugman, Gini. Emploi 2014-2024." },
    { id: "exdattract", icon: "◆", title: "Attractivité territoriale",
      desc: "Indices résidentiel + productif. Trajectoires." },
    { id: "exdlog", icon: "⌂", title: "Logement & Marché",
      desc: "DVF, LOVAC, SITADEL. Tension multi-échelon." },
    { id: "dterr", icon: "▦", title: "Focus territoire",
      desc: "Portrait commune : KPIs, contexte, secteurs." },
    { id: "exd", icon: "◇", title: "Exploratoire (legacy)",
      desc: "60+ indicateurs × 7 échelons. Version initiale." }
  ];

  vigDefs.forEach(def => {
    const page = OTTD_PAGES.find(p => p.id === def.id);
    if (!page) return;
    const a = document.createElement("a");
    a.className = "idx-vig";
    a.href = page.href;
    if (page.deprecated) a.style.opacity = "0.5";
    a.innerHTML = `
      <div class="v-img" style="--vc:${page.color || '#2171b5'}">${def.icon}</div>
      <div class="v-body">
        <div class="v-title">${def.title}</div>
        <div class="v-desc">${def.desc}</div>
      </div>
    `;
    vigGrid.appendChild(a);
  });
  left.appendChild(vigGrid);
  cols.appendChild(left);
}

// COLONNE DROITE
{
  const right = document.createElement("div");
  right.className = "idx-col-right";

  // Header + sélecteur territoire
  const hdr = document.createElement("div");
  hdr.className = "idx-r-header";
  const htitle = document.createElement("div");
  htitle.className = "idx-r-title";
  htitle.innerHTML = `Extraits choisis de visualisations — <span>${terrName}</span>`;
  hdr.appendChild(htitle);
  hdr.appendChild(terrInput);
  right.appendChild(hdr);

  // Helper : wire custom tooltip sur carte Plot.geo
  function wireMapTooltip(mapEl, panel, colKey, geoFeatures) {
    const paths = mapEl.querySelectorAll("path");
    // Plot.geo rend 1 path par feature dans l'ordre
    const featurePaths = Array.from(paths).filter(p => p.getAttribute("fill") && p.getAttribute("fill") !== "none");
    featurePaths.forEach((path, i) => {
      if (i >= geoFeatures.length) return;
      const code = getCode(geoFeatures[i]);
      const row = lookup.get(code);
      if (!row) return;
      path.style.cursor = "pointer";
      path.addEventListener("mouseenter", e => {
        showTooltip(e, buildTerritoryTooltip(row, colKey, dataNoFrance), panel);
      });
      path.addEventListener("mousemove", e => {
        showTooltip(e, buildTerritoryTooltip(row, colKey, dataNoFrance), panel);
      });
      path.addEventListener("mouseleave", () => hideTooltip());
    });
  }

  // ROW 1 : Carte SMA + Carte DVF évolution
  const row1 = document.createElement("div");
  row1.className = "idx-row";

  // Carte 1 — SMA (solde migratoire apparent)
  {
    const panel = document.createElement("div");
    panel.className = "idx-ill";
    const t = document.createElement("div");
    t.className = "it";
    t.textContent = "Solde migratoire apparent — TCAM 2016-2022";
    panel.appendChild(t);

    const mapEl = Plot.plot({
      width: 270, height: 220,
      projection: { type: "mercator", domain: geo },
      style: { fontFamily: "Inter, sans-serif", fontSize: "9px" },
      marks: [
        Plot.geo(geo, {
          fill: d => { const r = lookup.get(getCode(d)); return r ? smaBins.getColor(r[smaCol]) : "#eee"; },
          stroke: "#b0bec5", strokeWidth: 0.2
        }),
        ...(selectedTerrCode ? [Plot.geo(geo.features.filter(f => getCode(f) === String(selectedTerrCode)), {
          stroke: "#e11d48", strokeWidth: 2.5, fill: "none"
        })] : [])
      ]
    });
    panel.appendChild(mapEl);
    wireMapTooltip(mapEl, panel, smaCol, geo.features);
    panel.appendChild(makeMapLegend(smaBins, smaBins.palette));
    const note = document.createElement("div");
    note.className = "in";
    note.textContent = "Source : INSEE RP";
    panel.appendChild(note);
    row1.appendChild(panel);
  }

  // Carte 2 — DVF évolution prix m² 2019-2024
  {
    const panel = document.createElement("div");
    panel.className = "idx-ill";
    const t = document.createElement("div");
    t.className = "it";
    t.textContent = "Prix immobilier — Évolution 2019-2024 (%)";
    panel.appendChild(t);

    const mapEl = Plot.plot({
      width: 270, height: 220,
      projection: { type: "mercator", domain: geo },
      style: { fontFamily: "Inter, sans-serif", fontSize: "9px" },
      marks: [
        Plot.geo(geo, {
          fill: d => { const r = lookup.get(getCode(d)); return r ? dvfBins.getColor(r[dvfCol]) : "#eee"; },
          stroke: "#b0bec5", strokeWidth: 0.2
        }),
        ...(selectedTerrCode ? [Plot.geo(geo.features.filter(f => getCode(f) === String(selectedTerrCode)), {
          stroke: "#e11d48", strokeWidth: 2.5, fill: "none"
        })] : [])
      ]
    });
    panel.appendChild(mapEl);
    wireMapTooltip(mapEl, panel, dvfCol, geo.features);
    panel.appendChild(makeMapLegend(dvfBins, dvfBins.palette));
    const note = document.createElement("div");
    note.className = "in";
    note.textContent = "Source : DVF / CEREMA";
    panel.appendChild(note);
    row1.appendChild(panel);
  }
  right.appendChild(row1);

  // ROW 2 : Scatter DENS + Tableau
  const row2 = document.createElement("div");
  row2.className = "idx-row";

  // Scatter TCAM pop vs SMA — couleurs densité
  {
    const panel = document.createElement("div");
    panel.className = "idx-ill";
    const t = document.createElement("div");
    t.className = "it";
    t.textContent = "TCAM pop. vs SMA — Densité urbaine";
    panel.appendChild(t);

    const xCol = "dm_pop_vtcam_1622";
    const yCol = "dm_sma_vtcam_1622";
    const valid = dataNoFrance.filter(d => d[xCol] != null && d[yCol] != null && d.P22_POP != null);
    const xVals = valid.map(d => d[xCol]);
    const yVals = valid.map(d => d[yCol]);
    const xPad = (d3.max(xVals) - d3.min(xVals)) * 0.08;
    const yPad = (d3.max(yVals) - d3.min(yVals)) * 0.08;

    const getDensColor = d => {
      const k = d.dens3 != null ? String(d.dens3) : null;
      return k && DENS_COLORS[k] ? DENS_COLORS[k] : "#999";
    };

    const scatterEl = renderScatter({
      data: valid, xCol, yCol,
      xDomain: [d3.min(xVals) - xPad, d3.max(xVals) + xPad],
      yDomain: [d3.min(yVals) - yPad, d3.max(yVals) + yPad],
      xLabel: getColLabel(xCol) || "TCAM pop.",
      yLabel: getColLabel(yCol) || "SMA",
      meanX: d3.median(valid, d => d[xCol]),
      meanY: d3.median(valid, d => d[yCol]),
      getRadius: d => Math.max(2.5, Math.sqrt(d.P22_POP / 8000)),
      getColor: getDensColor,
      isSelected: d => d.code === selectedTerrCode,
      getTooltip: d => buildScatterTooltip(d, xCol, yCol, valid),
      _customTooltip: true,
      labelCodes: [selectedTerrCode],
      labelMode: "both",
      fillOpacity: 0.7,
      width: 320, height: 220
    });

    // Tooltip Delaunay
    const tipData = scatterEl._tipData || valid;
    if (tipData.length > 0) {
      const xSI = scatterEl.scale("x"), ySI = scatterEl.scale("y");
      const xSF = d3.scaleLinear().domain(xSI.domain).range(xSI.range);
      const ySF = d3.scaleLinear().domain(ySI.domain).range(ySI.range);
      const pts = tipData.map(d => [xSF(d[xCol]), ySF(d[yCol])]);
      const delaunay = d3.Delaunay.from(pts);
      scatterEl.addEventListener("mousemove", e => {
        const [mx, my] = d3.pointer(e, scatterEl);
        const idx = delaunay.find(mx, my);
        if (idx < 0 || idx >= pts.length) { hideTooltip(); return; }
        const dist = Math.hypot(mx - pts[idx][0], my - pts[idx][1]);
        if (dist > 30) { hideTooltip(); return; }
        showTooltip(e, buildScatterTooltip(tipData[idx], xCol, yCol, valid), panel);
      });
      scatterEl.addEventListener("mouseleave", () => hideTooltip());
      scatterEl.querySelectorAll("text").forEach(el => { el.style.pointerEvents = "none"; });
    }

    panel.appendChild(scatterEl);

    const leg = document.createElement("div");
    leg.className = "idx-dens";
    ["1", "2", "3"].forEach(k => {
      const s = document.createElement("span");
      s.innerHTML = `<i style="background:${DENS_COLORS[k]}"></i>${DENS_LABELS[k]}`;
      leg.appendChild(s);
    });
    panel.appendChild(leg);
    row2.appendChild(panel);
  }

  // Tableau Top 12 SMA + prix DVF
  {
    const panel = document.createElement("div");
    panel.className = "idx-ill";
    const t = document.createElement("div");
    t.className = "it";
    t.textContent = "Top 12 SMA — Prix m² & démographie";
    panel.appendChild(t);

    const indicCols = [smaCol, "logd_px2_global_24", "dm_pop_vtcam_1622"];
    const columns = buildTableColumns(indicCols, { includeGeo: true, includePop: false });
    const stats = computeBarStats(dataNoFrance, indicCols);
    const sorted = sortTableData(dataNoFrance, smaCol, false, { fixFranceFirst: false })
      .filter(d => d[smaCol] != null).slice(0, 12);

    panel.appendChild(renderTable({
      data: sorted, columns, stats,
      sortCol: smaCol, sortAsc: false, setSort: () => {},
      indicColKey: smaCol, compact: true, maxHeight: 200, scrollX: true
    }));
    row2.appendChild(panel);
  }
  right.appendChild(row2);

  // ROW 3 : Indice 100 emploi total (France + ZE sélectionnée)
  {
    const panel = document.createElement("div");
    panel.className = "idx-ill";
    panel.style.marginBottom = "0";
    const t = document.createElement("div");
    t.className = "it";
    t.textContent = `Emploi total — Indice 100 (base 2008) — France vs ${terrName}`;
    panel.appendChild(t);

    const baseYear = 2008;
    const frSerie = frSerieRaw.filter(d => d.year >= 1998);
    const zeSerie = zeSerieRaw.filter(d => d.code_ze === selectedTerrCode && d.year >= 1998);
    const frBase = frSerie.find(d => d.year === baseYear)?.eff || 1;
    const zeBase = zeSerie.find(d => d.year === baseYear)?.eff || 1;

    const chartData = [
      ...frSerie.map(d => ({ year: d.year, indice: d.eff / frBase * 100, serie: "France" })),
      ...zeSerie.map(d => ({ year: d.year, indice: d.eff / zeBase * 100, serie: terrName }))
    ];
    const lastYear = d3.max(chartData, d => d.year);
    const endPts = chartData.filter(d => d.year === lastYear);
    const minY = Math.floor(d3.min(chartData, d => d.indice) / 5) * 5 - 3;
    const maxY = Math.ceil(d3.max(chartData, d => d.indice) / 5) * 5 + 3;

    panel.appendChild(Plot.plot({
      width: 580, height: 160,
      marginLeft: 36, marginRight: 90, marginBottom: 28, marginTop: 8,
      style: { fontFamily: "Inter, sans-serif", fontSize: "9px" },
      x: { label: null, tickFormat: d => String(d), ticks: [1998, 2008, 2023] },
      y: { domain: [minY, maxY], label: null, ticks: [minY, 100, maxY] },
      color: { domain: ["France", terrName], range: ["#64748b", "#e11d48"] },
      marks: [
        Plot.ruleY([100], { stroke: "#bbb", strokeDasharray: "3,2" }),
        Plot.line(chartData, { x: "year", y: "indice", stroke: "serie", strokeWidth: d => d.serie === "France" ? 1.5 : 2.5 }),
        Plot.dot(endPts, { x: "year", y: "indice", fill: "serie", r: 4, tip: true,
          title: d => `${d.serie}\n${d.year}: ${d.indice.toFixed(1)}` }),
        Plot.text(endPts, { x: "year", y: "indice", text: d => `${d.serie} ${d.indice.toFixed(0)}`,
          dx: 6, textAnchor: "start", fontSize: 9.5, fill: "serie" })
      ]
    }));
    const note = document.createElement("div");
    note.className = "in";
    note.textContent = "Source : INSEE EAE205 / FLORES";
    panel.appendChild(note);
    right.appendChild(panel);
  }

  cols.appendChild(right);
}

display(cols);
// &e
```

```js
// &s SOURCES
const _src = document.createElement("div");
_src.className = "idx-src";
_src.innerHTML = `
<table>
  <thead><tr><th>Donnée</th><th>Source</th><th>Millésime</th></tr></thead>
  <tbody>
    <tr><td>Population, Emploi, Logement</td><td>INSEE RP</td><td>2011–2023</td></tr>
    <tr><td>Flux migratoires</td><td>INSEE MIGCOM</td><td>2015-16, 2021-22</td></tr>
    <tr><td>Emploi privé sectoriel</td><td>URSSAF</td><td>2014–2024</td></tr>
    <tr><td>Emploi total</td><td>INSEE EAE205 / FLORES</td><td>1998–2023</td></tr>
    <tr><td>Prix immobilier</td><td>DVF / CEREMA</td><td>2016–2024</td></tr>
    <tr><td>Vacance logement</td><td>LOVAC / Fidéli</td><td>2022</td></tr>
    <tr><td>Fonds de carte</td><td>IGN Admin Express</td><td>2025</td></tr>
  </tbody>
</table>
<div class="idx-foot">Projet PTOD — ObTer, Observatoire Territorial Multiéchelon des Profils et Trajectoires</div>
`;
display(_src);
// &e
```
