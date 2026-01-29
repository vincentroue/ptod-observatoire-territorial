// =============================================================================
// helpers/graph-slope-indice.js — Slope chart + Indice 100 graphs
// =============================================================================
// Date: 2026-01-19
// =============================================================================

import * as Plot from "npm:@observablehq/plot";

// Palette secteurs A5
export const PALETTE_A5 = {
  "TAZ": "#22c55e",  // Agriculture - vert
  "TBE": "#3b82f6",  // Industrie - bleu
  "TFZ": "#f59e0b",  // Construction - orange
  "TGU": "#8b5cf6",  // Tertiaire marchand - violet
  "TOQ": "#ec4899",  // Tertiaire non marchand - rose
  "T": "#6b7280"     // Total - gris
};

// Labels explicites pour secteurs
export const LABELS_A5 = {
  "TAZ": { short: "Agri", long: "Agriculture" },
  "TBE": { short: "Indus", long: "Industrie" },
  "TFZ": { short: "Constr", long: "Construction" },
  "TGU": { short: "Tert. march.", long: "Tertiaire marchand" },
  "TOQ": { short: "Tert. non-m.", long: "Tertiaire non marchand" },
  "T": { short: "Total", long: "Total" }
};

// &s SLOPE_CHART
// Slope chart: évolution parts sectorielles entre 2 années
export function renderSlopeChart(data, { yearStart = 2000, yearEnd = 2023, width = 500, height = 300 } = {}) {
  // Filtrer années
  const filtered = data.filter(d => d.year === yearStart || d.year === yearEnd);

  // Pivotage pour lier les points
  const sectors = [...new Set(filtered.map(d => d.na5))];
  const slopeData = sectors.map(s => {
    const start = filtered.find(d => d.na5 === s && d.year === yearStart);
    const end = filtered.find(d => d.na5 === s && d.year === yearEnd);
    return {
      na5: s,
      lib: start?.lib || s,
      lib_short: start?.lib_short || s,
      pct_start: start?.pct || 0,
      pct_end: end?.pct || 0,
      delta: (end?.pct || 0) - (start?.pct || 0)
    };
  });

  // Format long pour Plot.line
  const lineData = slopeData.flatMap(d => [
    { na5: d.na5, year: yearStart, pct: d.pct_start },
    { na5: d.na5, year: yearEnd, pct: d.pct_end }
  ]);

  return Plot.plot({
    width,
    height,
    marginLeft: 50,
    marginRight: 100,
    marginTop: 20,
    marginBottom: 35,
    x: {
      domain: [yearStart, yearEnd],
      tickFormat: d => d,
      ticks: [yearStart, yearEnd],
      label: null
    },
    y: {
      domain: [0, Math.max(50, ...slopeData.map(d => Math.max(d.pct_start, d.pct_end))) + 3],
      grid: true,
      label: "Part (%)"
    },
    color: {
      domain: sectors,
      range: sectors.map(s => PALETTE_A5[s] || "#999")
    },
    marks: [
      // Lignes de pente
      Plot.line(lineData, {
        x: "year",
        y: "pct",
        z: "na5",
        stroke: "na5",
        strokeWidth: 2.5
      }),
      // Points début
      Plot.dot(slopeData, {
        x: yearStart,
        y: "pct_start",
        fill: "na5",
        r: 5,
        tip: true,
        title: d => `${d.lib}\n${yearStart}: ${d.pct_start.toFixed(1)}%`
      }),
      // Points fin
      Plot.dot(slopeData, {
        x: yearEnd,
        y: "pct_end",
        fill: "na5",
        r: 5,
        tip: true,
        title: d => `${d.lib}\n${yearEnd}: ${d.pct_end.toFixed(1)}%\nΔ: ${d.delta > 0 ? '+' : ''}${d.delta.toFixed(1)} pts`
      }),
      // Labels à droite
      Plot.text(slopeData, {
        x: yearEnd,
        y: "pct_end",
        text: d => `${d.lib_short} ${d.pct_end.toFixed(1)}%`,
        textAnchor: "start",
        dx: 8,
        fontSize: 10,
        fill: "na5"
      }),
      // Labels à gauche (valeur seulement)
      Plot.text(slopeData, {
        x: yearStart,
        y: "pct_start",
        text: d => d.pct_start.toFixed(1),
        textAnchor: "end",
        dx: -8,
        fontSize: 10,
        fill: "#666"
      })
    ]
  });
}
// &e

// &s INDICE_100_CHART
// Graph indice 100 multi-séries
export function renderIndice100Chart(data, {
  baseYear = 2014,
  width = 500,
  height = 320,
  title = "",
  showTotal = true,
  showSectors = true,
  sectorFilter = null,  // Array de codes na5 à afficher (ex: ["T", "TGU", "TOQ"])
  excludeSectors = null, // Array de codes na5 à EXCLURE (ex: ["TAZ"])
  fixedYDomain = null   // [min, max] fixe pour comparaison (ex: [90, 130])
} = {}) {

  // Filtrer selon options
  let filtered = data;
  if (!showTotal) filtered = filtered.filter(d => d.na5 !== "T");
  if (!showSectors) filtered = filtered.filter(d => d.na5 === "T");
  if (sectorFilter && sectorFilter.length > 0) {
    filtered = filtered.filter(d => sectorFilter.includes(d.na5));
  }
  if (excludeSectors && excludeSectors.length > 0) {
    filtered = filtered.filter(d => !excludeSectors.includes(d.na5));
  }

  const sectors = [...new Set(filtered.map(d => d.na5))];
  const years = [...new Set(filtered.map(d => d.year))].sort((a, b) => a - b);

  // Min/max pour domaine Y
  let minY, maxY;
  if (fixedYDomain) {
    [minY, maxY] = fixedYDomain;
  } else {
    const values = filtered.map(d => d.indice100).filter(v => v != null);
    minY = Math.floor(Math.min(...values) / 5) * 5 - 5;
    maxY = Math.ceil(Math.max(...values) / 5) * 5 + 5;
  }

  const container = document.createElement('div');

  // Titre
  if (title) {
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'font-weight:600;font-size:12px;text-align:center;margin-bottom:4px;color:#1e40af;';
    titleDiv.textContent = title;
    container.appendChild(titleDiv);
  }

  // Fonction pour obtenir le label court explicite
  const getLabel = (d) => {
    const custom = LABELS_A5[d.na5];
    return custom ? custom.short : (d.lib_short || d.na5);
  };

  const plot = Plot.plot({
    width,
    height,
    marginLeft: 40,
    marginRight: 90,
    marginTop: 10,
    marginBottom: 30,
    x: {
      domain: [years[0], years[years.length - 1]],
      tickFormat: d => String(d),
      ticks: [years[0], years[years.length - 1]],  // Juste min et max
      tickSize: 6,  // Trait plein visible
      label: null
    },
    y: {
      domain: [minY, maxY],
      grid: false,
      ticks: [minY, 100, maxY],  // Juste min, base, max
      tickSize: 4,
      label: null
    },
    color: {
      domain: sectors,
      range: sectors.map(s => PALETTE_A5[s] || "#999")
    },
    marks: [
      // Ligne base 100
      Plot.ruleY([100], { stroke: "#bbb", strokeDasharray: "3,2" }),
      // Lignes séries
      Plot.line(filtered, {
        x: "year",
        y: "indice100",
        stroke: "na5",
        strokeWidth: d => d.na5 === "T" ? 2.5 : 1.5
      }),
      // Points dernière année
      Plot.dot(filtered.filter(d => d.year === years[years.length - 1]), {
        x: "year",
        y: "indice100",
        fill: "na5",
        r: 4,
        tip: true,
        title: d => `${LABELS_A5[d.na5]?.long || d.lib}\n${d.year}: ${d.indice100.toFixed(1)}`
      }),
      // Labels à droite (explicites)
      Plot.text(filtered.filter(d => d.year === years[years.length - 1]), {
        x: "year",
        y: "indice100",
        text: d => `${getLabel(d)} ${d.indice100.toFixed(0)}`,
        textAnchor: "start",
        dx: 6,
        fontSize: 10,
        fill: "na5"
      })
    ]
  });

  container.appendChild(plot);
  return container;
}
// &e

// &s INDICE_100_MULTI
// Multiple graphs indice 100 côte à côte (France + territoires)
export function renderIndice100Multi(franceData, territories = [], options = {}) {
  const {
    baseYear = 2014,
    width = 420,
    height = 300
  } = options;

  const container = document.createElement('div');
  container.style.cssText = 'display:flex;align-items:flex-start;gap:12px;overflow-x:auto;';

  // France
  const franceChart = renderIndice100Chart(franceData, {
    baseYear,
    width,
    height,
    title: "France métropolitaine"
  });
  container.appendChild(franceChart);

  // Territoires
  territories.forEach(terr => {
    const terrChart = renderIndice100Chart(terr.data, {
      baseYear,
      width,
      height,
      title: terr.label
    });
    terrChart.style.cssText = 'border-left:2px solid #e5e7eb;padding-left:8px;';
    container.appendChild(terrChart);
  });

  return container;
}
// &e

// &e
