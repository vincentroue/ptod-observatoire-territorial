---
title: Volet Démographie — Flux Migratoires
toc: false
theme: dashboard
style: styles/dashboard.css
---

<!-- BANNIÈRE PLEINE LARGEUR -->
<div class="banner-full" style="background: linear-gradient(135deg, #1e5631 0%, #2d7a46 100%);">
  <div class="banner-inner">
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" stroke="#fff" stroke-width="2" fill="#2d7a46"/>
      <path d="M15 25 L20 15 L25 25" fill="none" stroke="#fff" stroke-width="2"/>
      <path d="M15 15 L20 25 L25 15" fill="none" stroke="#fff" stroke-width="2" opacity="0.5"/>
    </svg>
    <div class="banner-titles">
      <h1 style="color: white;">OTTD — Volet Démographie & Flux Migratoires</h1>
      <p style="color: rgba(255,255,255,0.9);">Indicateurs MIGCOM (PE, PS, SM, TR) + Décomposition TCAM (SN, SMA) — Comparaison périodes</p>
    </div>
    <span class="sources-btn" title="Sources : INSEE MIGCOM 2016/2022, RP 2011/2016/2022. Typologie 6 classes SN×SMA.">? Sources</span>
  </div>
</div>

```js
// === IMPORTS PACKAGES ===
import * as d3 from "npm:d3";
import * as topojson from "npm:topojson-client";
import {default as rewind} from "npm:@mapbox/geojson-rewind";
```

```js
// === IMPORTS HELPERS ===
import { PAL_PURPLE_GREEN, PAL_BLUE_YELLOW, getColorByBins } from "./helpers/colors.js";
import { aggregate, linearRegression, tcam } from "./helpers/aggregate.js";
import { ECHELON_META, PROJECTION_FRANCE, ECHELON_TO_NIVEAU } from "./helpers/echelons.js";
import { TYPO_SN_SMA, calcTypoSNSMA, getTypoColor, getTypoLabel, TYPO_COLORS } from "./helpers/typologies.js";
import { INDICATEURS, formatValue, getColLabel } from "./helpers/indicators-ddict-js.js";
```

```js
// === HELPERS LOCAUX ===

// 7 seuils quantiles pour 8 bins (getColorByBins attend 7 seuils)
function makeThresholds(vals, n = 8) {
  if (!vals.length) return [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
  const sorted = [...vals].sort((a, b) => a - b);
  const thresholds = [];
  for (let i = 1; i < n; i++) {
    thresholds.push(sorted[Math.floor(i / n * (sorted.length - 1))]);
  }
  return thresholds;
}

// Formatage valeurs
function fmt(v, indic) {
  if (v == null) return "—";
  if (indic === "SM") return v.toLocaleString("fr-FR");
  return v.toFixed(2) + "%";
}

// Helper label : utilise INDICATEURS du helper centralisé
const getIndicLabel = (key) => INDICATEURS[key]?.medium || INDICATEURS[key]?.short || key;
```

```js
// === GEO HANDLES STATIQUES ===
// 5 échelons avec fichiers géo disponibles (EPCI topojson non disponible)
const GEO_HANDLES = {
  "Zone d'emploi": FileAttachment("data/nodom_zones-emploi_2025.topojson"),
  "Département": FileAttachment("data/nodom_departement_2025.topojson"),
  "Région": FileAttachment("data/nodom_region_2025.topojson"),
  "Aire d'attraction": FileAttachment("data/nodom_aires-attraction_2025.topojson"),
  "Bassin de vie": FileAttachment("data/nodom_bassins-vie_2025.topojson")
};

// Chargement géo (TopoJSON ou GeoJSON)
const loadGeo = async (echelon) => {
  const handle = GEO_HANDLES[echelon];
  if (!handle) throw new Error(`Échelon inconnu: ${echelon}`);
  const raw = await handle.json();
  let geo = raw.type === "Topology"
    ? topojson.feature(raw, raw.objects[Object.keys(raw.objects)[0]])
    : raw;
  if (ECHELON_META[echelon]?.needsRewind) {
    geo = rewind(geo, true);
  }
  return geo;
};
```

```js
// === DONNÉES MIGCOM ===
const migcomRaw = await FileAttachment("data/indics_migcom_combined.csv").csv({ typed: true });

// Normaliser codes
const migcom = migcomRaw.map(d => ({
  ...d,
  code: d.niveau === "DEP" || d.niveau === "REG"
    ? String(d.code).padStart(2, "0")
    : d.niveau === "ZE2020"
      ? String(d.code).padStart(4, "0")
      : String(d.code)
}));

// Séparer par période
const migcom2016 = migcom.filter(d => d.annee === "2015-2016");
const migcom2022 = migcom.filter(d => d.annee === "2021-2022");
```

```js
// === TDC LIBELLÉS ===
const parseTdc = (text) => d3.dsvFormat(";").parse(text.replace(/^\ufeff/, ""));
const tdcDep = parseTdc(await FileAttachment("data/tdc_departement.csv").text());
const tdcZe = parseTdc(await FileAttachment("data/tdc_ze2020.csv").text());
const tdcReg = parseTdc(await FileAttachment("data/tdc_region.csv").text());

const libDep = new Map(tdcDep.map(d => [String(d.DEP).padStart(2, "0"), d.DEPlib]));
const libZe = new Map(tdcZe.map(d => [String(d.ZE2020).padStart(4, "0"), d.ZE2020lib]));
const libReg = new Map(tdcReg.map(d => [String(d.REG).padStart(2, "0"), d.REGlib]));
```

```js
// === DONNÉES COMMUNES UNIFIED (pour TCAM SN/SMA via aggregate) ===
const communesRaw = await FileAttachment("data/communes_unified.csv").csv({ typed: true });

// Normaliser codes (padding)
const communes = communesRaw.map(d => ({
  ...d,
  dep: String(d.dep).padStart(2, '0'),
  reg: String(d.reg).padStart(2, '0'),
  ze2020: String(d.ze2020).padStart(4, '0'),
  epci: String(d.epci),
  DENS: d.DENS ?? 3,
  DENS7: d.DENS7 ?? 6
}));

console.log(`[COMMUNES] ${communes.length} communes chargées`);
```

<!-- SOUS-BANNIÈRE CONTRÔLES -->
<div class="sub-banner">
  <div class="sub-banner-inner">
    <div class="sub-group">
      <span class="sub-label">Échelon</span>

```js
const echelon = view(Inputs.radio(
  ["Zone d'emploi", "Département", "Région", "Aire d'attraction", "Bassin de vie"],
  { value: "Zone d'emploi", label: "" }
));
```

</div>
<div class="sub-group">
<span class="sub-label">Indicateur carte</span>

```js
// Liste indicateurs : MIGCOM + TCAM décomposition
const listeIndics = [
  // MIGCOM (fichier pré-agrégé)
  "PE_pct", "PS_pct", "SM", "TM", "TR_pct",
  // TCAM décomposition (aggregate communes_unified)
  "tcam_sn", "tcam_sma", "tcam_pop"
];

const indicCarte = view(Inputs.select(
  listeIndics,
  { value: "tcam_sma", label: "", format: x => getIndicLabel(x) }
));
```

</div>
<div class="sub-group">
<span class="sub-label">Coloration</span>

```js
const colorBy = view(Inputs.radio(
  ["Indicateur", "Typo SN×SMA"],
  { value: "Indicateur", label: "" }
));
```

</div>
</div>
</div>

```js
// === CONFIG ÉCHELON ===
const cfg = ECHELON_META[echelon];
const niveauMigcom = ECHELON_TO_NIVEAU[echelon];

// Charger géométrie
const geoRaw = await loadGeo(echelon);

// === AGRÉGATION COMMUNES → ÉCHELON (TCAM SN/SMA) ===
const { tableData: aggData } = aggregate(communes, cfg.key, geoRaw, cfg.geoKey);
const aggMap = new Map(aggData.map(d => [d.code, d]));
console.log(`[AGGREGATE] ${aggData.length} territoires agrégés depuis communes`);

// === DONNÉES MIGCOM PAR PÉRIODE ===
const data2022 = migcom2022.filter(d => d.niveau === niveauMigcom);
const data2016 = migcom2016.filter(d => d.niveau === niveauMigcom);

const dataMap2022 = new Map(data2022.map(d => [d.code, d]));
const dataMap2016 = new Map(data2016.map(d => [d.code, d]));
```

```js
// === JOINTURE GEO + DONNÉES ===

// Helper libellé
const getLib = (code, niveau) => {
  if (niveau === "DEP") return libDep.get(code);
  if (niveau === "ZE2020") return libZe.get(code);
  if (niveau === "REG") return libReg.get(code);
  return null;
};

// Jointure 2021-2022 : MIGCOM + TCAM (aggregate) + Typologie
const geoData2022 = {
  type: "FeatureCollection",
  features: geoRaw.features.map(f => {
    const code = String(f.properties[cfg.geoKey]);
    const migc = dataMap2022.get(code);  // MIGCOM 2022
    const agg = aggMap.get(code);         // Aggregate communes
    const libelle = getLib(code, niveauMigcom) || migc?.libelle || agg?.libelle || f.properties[cfg.labelKey] || code;

    // TCAM SN/SMA période 16-22 depuis aggregate
    const tcam_sn = agg?.tcam_sn_16_22 ?? null;
    const tcam_sma = agg?.tcam_sma_16_22 ?? null;
    const tcam_pop = agg?.tcam_pop_16_22 ?? null;

    // Typologie 6 catégories SN×SMA
    const typo = calcTypoSNSMA(tcam_sn, tcam_sma);

    return {
      ...f,
      properties: {
        ...f.properties,
        code,
        libelle,
        // MIGCOM
        PE_pct: migc?.PE_pct ?? null,
        PS_pct: migc?.PS_pct ?? null,
        SM: migc?.SM ?? null,
        TM: migc?.TM ?? null,
        TR_pct: migc?.TR_pct ?? null,
        // TCAM décomposition (aggregate)
        tcam_sn,
        tcam_sma,
        tcam_pop,
        // Typologie
        typo,
        typoLabel: getTypoLabel(typo),
        typoColor: getTypoColor(typo),
        // Méta
        hasMigcom: !!migc,
        hasAgg: !!agg
      }
    };
  })
};

// Jointure 2015-2016 : MIGCOM + TCAM (aggregate) + Typologie
const geoData2016 = {
  type: "FeatureCollection",
  features: geoRaw.features.map(f => {
    const code = String(f.properties[cfg.geoKey]);
    const migc = dataMap2016.get(code);  // MIGCOM 2016
    const agg = aggMap.get(code);         // Aggregate communes
    const libelle = getLib(code, niveauMigcom) || migc?.libelle || agg?.libelle || f.properties[cfg.labelKey] || code;

    // TCAM SN/SMA période 11-16 depuis aggregate
    const tcam_sn = agg?.tcam_sn_11_16 ?? null;
    const tcam_sma = agg?.tcam_sma_11_16 ?? null;
    const tcam_pop = agg?.tcam_pop_11_16 ?? null;

    // Typologie 6 catégories SN×SMA
    const typo = calcTypoSNSMA(tcam_sn, tcam_sma);

    return {
      ...f,
      properties: {
        ...f.properties,
        code,
        libelle,
        // MIGCOM
        PE_pct: migc?.PE_pct ?? null,
        PS_pct: migc?.PS_pct ?? null,
        SM: migc?.SM ?? null,
        TM: migc?.TM ?? null,
        TR_pct: migc?.TR_pct ?? null,
        // TCAM décomposition (aggregate)
        tcam_sn,
        tcam_sma,
        tcam_pop,
        // Typologie
        typo,
        typoLabel: getTypoLabel(typo),
        typoColor: getTypoColor(typo),
        // Méta
        hasMigcom: !!migc,
        hasAgg: !!agg
      }
    };
  })
};

// Debug jointure
const withMigcom2022 = geoData2022.features.filter(f => f.properties.hasMigcom).length;
const withMigcom2016 = geoData2016.features.filter(f => f.properties.hasMigcom).length;
const withAgg = geoData2022.features.filter(f => f.properties.hasAgg).length;
console.log(`[JOINTURE] Geo=${geoRaw.features.length}, MIGCOM2022=${withMigcom2022}, MIGCOM2016=${withMigcom2016}, Aggregate=${withAgg}`);
```

```js
// === BINS ET COULEURS (synchronisés les 2 périodes) ===
const allValues = [
  ...geoData2022.features.map(f => f.properties[indicCarte]),
  ...geoData2016.features.map(f => f.properties[indicCarte])
].filter(v => v != null && !isNaN(v));

const thresholds = makeThresholds(allValues, 8);
const palette = indicCarte === "SM" ? PAL_PURPLE_GREEN : PAL_BLUE_YELLOW;

// Fonction couleur adaptée au mode colorBy
const getColor = (props) => {
  if (colorBy === "Typo SN×SMA") {
    // Coloration par typologie 6 catégories
    return props.typoColor || "#ccc";
  } else {
    // Coloration par valeur indicateur
    const v = props[indicCarte];
    if (v == null) return "#ccc";
    return getColorByBins(v, thresholds, palette);
  }
};
```

```js
// === STATS ===
const mean2022 = d3.mean(geoData2022.features, f => f.properties[indicCarte]);
const mean2016 = d3.mean(geoData2016.features, f => f.properties[indicCarte]);
const median2022 = d3.median(geoData2022.features, f => f.properties[indicCarte]);
const median2016 = d3.median(geoData2016.features, f => f.properties[indicCarte]);

// Top 3 / Bottom 3
const sorted2022 = [...geoData2022.features].filter(f => f.properties[indicCarte] != null).sort((a, b) => b.properties[indicCarte] - a.properties[indicCarte]);
const sorted2016 = [...geoData2016.features].filter(f => f.properties[indicCarte] != null).sort((a, b) => b.properties[indicCarte] - a.properties[indicCarte]);
const top3_2022 = sorted2022.slice(0, 3).map(f => f.properties.libelle?.slice(0, 10)).join(", ");
const bot3_2022 = sorted2022.slice(-3).reverse().map(f => f.properties.libelle?.slice(0, 10)).join(", ");
const top3_2016 = sorted2016.slice(0, 3).map(f => f.properties.libelle?.slice(0, 10)).join(", ");
const bot3_2016 = sorted2016.slice(-3).reverse().map(f => f.properties.libelle?.slice(0, 10)).join(", ");
```

<!-- LÉGENDE -->
<div style="padding: 0.75rem 1rem; background: #fff; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 1rem;">

```js
// Légende adaptée au mode colorBy
if (colorBy === "Typo SN×SMA") {
  // Légende typologique 6 catégories
  display(html`<div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
    <strong style="margin-right: 0.5rem;">Typologie SN×SMA :</strong>
    ${Object.entries(TYPO_SN_SMA).map(([code, t]) => html`
      <div style="display: flex; align-items: center; gap: 4px;">
        <div style="width: 18px; height: 14px; background: ${t.color}; border: 1px solid #666; border-radius: 2px;"></div>
        <span style="font-size: 0.8rem; color: #333;">${t.label}</span>
      </div>
    `)}
  </div>`);
} else {
  // Légende indicateur quantiles
  const minVal = allValues.length ? Math.min(...allValues) : 0;
  const maxVal = allValues.length ? Math.max(...allValues) : 1;
  const legendBounds = [minVal, ...thresholds, maxVal];

  display(html`<div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
    <strong style="margin-right: 0.5rem;">${getIndicLabel(indicCarte)} :</strong>
    ${palette.map((color, i) => html`
      <div style="display: flex; align-items: center; gap: 3px;">
        <div style="width: 24px; height: 14px; background: ${color}; border: 1px solid #999;"></div>
        <span style="font-size: 0.75rem; color: #555;">${legendBounds[i]?.toFixed(1)} - ${legendBounds[i + 1]?.toFixed(1)}</span>
      </div>
    `)}
  </div>`);
}
```

</div>

### Cartes ${getIndicLabel(indicCarte)} par ${echelon}

<!-- CARTES - 2021-22 à GAUCHE, 2015-16 à DROITE -->
<div class="cards-row">
<div class="card">

## 2021-2022

```js
// Stats overlay 2022
const statsOverlay2022 = html`<div class="map-stats-overlay">
  <div class="stat-line">Moy. ${mean2022 >= 0 ? "+" : ""}${mean2022?.toFixed(2)}</div>
  <div class="stat-line">Méd. ${median2022 >= 0 ? "+" : ""}${median2022?.toFixed(2)}</div>
  <div class="stat-line top">Top3: ${top3_2022}</div>
  <div class="stat-line bottom">Bot3: ${bot3_2022}</div>
</div>`;

const map2022 = Plot.plot({
  projection: { ...PROJECTION_FRANCE, domain: geoData2022 },
  width: 520,
  height: 500,
  marks: [
    Plot.geo(geoData2022, { fill: "none", stroke: "#333", strokeWidth: 2 }),
    Plot.geo(geoData2022, {
      fill: d => getColor(d.properties),
      stroke: "#fff",
      strokeWidth: 0.4,
      title: d => `${d.properties.libelle}\n${getIndicLabel(indicCarte)}: ${fmt(d.properties[indicCarte], indicCarte)}\nTypo: ${d.properties.typoLabel || "—"}\nSN: ${fmt(d.properties.tcam_sn, "tcam_sn")} | SMA: ${fmt(d.properties.tcam_sma, "tcam_sma")}`
    })
  ]
});

const wrapper2022 = html`<div class="map-wrapper"></div>`;
wrapper2022.appendChild(map2022);
wrapper2022.appendChild(statsOverlay2022);
display(wrapper2022);
```

</div>
<div class="card">

## 2015-2016

```js
// Stats overlay 2016
const statsOverlay2016 = html`<div class="map-stats-overlay">
  <div class="stat-line">Moy. ${mean2016 >= 0 ? "+" : ""}${mean2016?.toFixed(2)}</div>
  <div class="stat-line">Méd. ${median2016 >= 0 ? "+" : ""}${median2016?.toFixed(2)}</div>
  <div class="stat-line top">Top3: ${top3_2016}</div>
  <div class="stat-line bottom">Bot3: ${bot3_2016}</div>
</div>`;

const map2016 = Plot.plot({
  projection: { ...PROJECTION_FRANCE, domain: geoData2016 },
  width: 520,
  height: 500,
  marks: [
    Plot.geo(geoData2016, { fill: "none", stroke: "#333", strokeWidth: 2 }),
    Plot.geo(geoData2016, {
      fill: d => getColor(d.properties),
      stroke: "#fff",
      strokeWidth: 0.4,
      title: d => `${d.properties.libelle}\n${getIndicLabel(indicCarte)}: ${fmt(d.properties[indicCarte], indicCarte)}\nTypo: ${d.properties.typoLabel || "—"}\nSN: ${fmt(d.properties.tcam_sn, "tcam_sn")} | SMA: ${fmt(d.properties.tcam_sma, "tcam_sma")}`
    })
  ]
});

const wrapper2016 = html`<div class="map-wrapper"></div>`;
wrapper2016.appendChild(map2016);
wrapper2016.appendChild(statsOverlay2016);
display(wrapper2016);
```

</div>
</div>

### Scatter PE × PS par ${echelon}

<!-- SCATTER - 2021-22 à GAUCHE, 2015-16 à DROITE -->
<div class="cards-row">
<div class="card">

## PE × PS — 2021-2022

```js
const scatterData2022 = geoData2022.features.map(f => f.properties).filter(d => d.PE_pct != null && d.PS_pct != null);
const reg2022 = linearRegression(scatterData2022, "PE_pct", "PS_pct");

// Domaines synchronisés
const allPE = [...scatterData2022.map(d => d.PE_pct), ...geoData2016.features.map(f => f.properties.PE_pct)].filter(v => v != null);
const allPS = [...scatterData2022.map(d => d.PS_pct), ...geoData2016.features.map(f => f.properties.PS_pct)].filter(v => v != null);
const xDomain = [0, d3.max(allPE) * 1.1];
const yDomain = [0, d3.max(allPS) * 1.1];

// Moyennes
const meanPE2022 = d3.mean(scatterData2022, d => d.PE_pct);
const meanPS2022 = d3.mean(scatterData2022, d => d.PS_pct);

Plot.plot({
  width: 520,
  height: 440,
  grid: true,
  style: { fontFamily: "Inter, sans-serif", fontSize: "12px" },
  x: { label: "→ Part Entrants (%)", domain: xDomain },
  y: { label: "↑ Part Sortants (%)", domain: yDomain },
  color: { scheme: "PuOr", legend: true, label: "Solde Migratoire" },
  marks: [
    // Bissectrice y=x (équilibre PE=PS)
    Plot.line([[0, 0], [20, 20]], { stroke: "#999", strokeDasharray: "4,4", strokeWidth: 1 }),
    // Moyennes France
    Plot.ruleX([meanPE2022], { stroke: "#888", strokeWidth: 1, strokeDasharray: "3,3" }),
    Plot.ruleY([meanPS2022], { stroke: "#888", strokeWidth: 1, strokeDasharray: "3,3" }),
    Plot.text([[meanPE2022, yDomain[1] * 0.95]], { text: [`Moy ${meanPE2022?.toFixed(1)}`], fontSize: 9, fill: "#666" }),
    // Régression
    reg2022 ? Plot.line([[0, reg2022.intercept], [20, reg2022.intercept + 20 * reg2022.slope]], {
      stroke: "#e41a1c", strokeWidth: 1.5, strokeOpacity: 0.7
    }) : null,
    // Points colorés par SM
    Plot.dot(scatterData2022, {
      x: "PE_pct",
      y: "PS_pct",
      fill: "SM",
      r: 5,
      stroke: "#333",
      strokeWidth: 0.3,
      title: d => `${d.libelle}\nPE: ${d.PE_pct?.toFixed(1)}% | PS: ${d.PS_pct?.toFixed(1)}%\nSM: ${d.SM?.toLocaleString()}`
    })
  ].filter(Boolean)
})
```

</div>
<div class="card">

## PE × PS — 2015-2016

```js
const scatterData2016 = geoData2016.features.map(f => f.properties).filter(d => d.PE_pct != null && d.PS_pct != null);
const reg2016 = linearRegression(scatterData2016, "PE_pct", "PS_pct");

// Moyennes
const meanPE2016 = d3.mean(scatterData2016, d => d.PE_pct);
const meanPS2016 = d3.mean(scatterData2016, d => d.PS_pct);

Plot.plot({
  width: 520,
  height: 440,
  grid: true,
  style: { fontFamily: "Inter, sans-serif", fontSize: "12px" },
  x: { label: "→ Part Entrants (%)", domain: xDomain },
  y: { label: "↑ Part Sortants (%)", domain: yDomain },
  color: { scheme: "PuOr", legend: true, label: "Solde Migratoire" },
  marks: [
    // Bissectrice y=x
    Plot.line([[0, 0], [20, 20]], { stroke: "#999", strokeDasharray: "4,4", strokeWidth: 1 }),
    // Moyennes France
    Plot.ruleX([meanPE2016], { stroke: "#888", strokeWidth: 1, strokeDasharray: "3,3" }),
    Plot.ruleY([meanPS2016], { stroke: "#888", strokeWidth: 1, strokeDasharray: "3,3" }),
    Plot.text([[meanPE2016, yDomain[1] * 0.95]], { text: [`Moy ${meanPE2016?.toFixed(1)}`], fontSize: 9, fill: "#666" }),
    // Régression
    reg2016 ? Plot.line([[0, reg2016.intercept], [20, reg2016.intercept + 20 * reg2016.slope]], {
      stroke: "#e41a1c", strokeWidth: 1.5, strokeOpacity: 0.7
    }) : null,
    // Points colorés par SM
    Plot.dot(scatterData2016, {
      x: "PE_pct",
      y: "PS_pct",
      fill: "SM",
      r: 5,
      stroke: "#333",
      strokeWidth: 0.3,
      title: d => `${d.libelle}\nPE: ${d.PE_pct?.toFixed(1)}% | PS: ${d.PS_pct?.toFixed(1)}%\nSM: ${d.SM?.toLocaleString()}`
    })
  ].filter(Boolean)
})
```

</div>
</div>

### Données ${echelon} — Comparaison périodes

```js
// Fusion données 2 périodes pour tableau comparatif
const tableData = geoData2022.features.map(f => {
  const d22 = f.properties;
  const d16 = dataMap2016.get(d22.code);
  return {
    code: d22.code,
    libelle: d22.libelle,
    PE_2022: d22.PE_pct,
    PS_2022: d22.PS_pct,
    SM_2022: d22.SM,
    TM_2022: d22.TM,
    TR_2022: d22.TR_pct,
    PE_2016: d16?.PE_pct,
    PS_2016: d16?.PS_pct,
    SM_2016: d16?.SM,
    TM_2016: d16?.TM,
    TR_2016: d16?.TR_pct,
    SM_diff: d22.SM && d16?.SM ? d22.SM - d16.SM : null
  };
}).sort((a, b) => (b.SM_2022 || 0) - (a.SM_2022 || 0));

Inputs.table(tableData, {
  columns: ["libelle", "SM_2022", "SM_2016", "SM_diff", "PE_2022", "PS_2022", "TR_2022"],
  header: {
    libelle: "Territoire",
    SM_2022: "SM 21-22",
    SM_2016: "SM 15-16",
    SM_diff: "Δ SM",
    PE_2022: "PE % 22",
    PS_2022: "PS % 22",
    TR_2022: "TR % 22"
  },
  format: {
    SM_2022: x => x?.toLocaleString(),
    SM_2016: x => x?.toLocaleString(),
    SM_diff: x => x != null ? (x >= 0 ? "+" : "") + x.toLocaleString() : "—",
    PE_2022: x => x?.toFixed(2),
    PS_2022: x => x?.toFixed(2),
    TR_2022: x => x?.toFixed(2)
  },
  width: { libelle: 180 },
  rows: 25
})
```

---

*Source : INSEE MIGCOM — ${echelon} (2022: ${geoData2022.features.length}, 2016: ${geoData2016.features.length} territoires)*
