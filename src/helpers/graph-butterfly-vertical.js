// =============================================================================
// helpers/graph-butterfly-vertical.js — Barres horizontales Part + IS
// =============================================================================
// Barres horizontales par secteur, étiquettes avec Part % et IS
// Date : 2026-01-22 v5 - Horizontal bars, Part + IS in labels
// =============================================================================

import * as Plot from "npm:@observablehq/plot";

// Palette Urban Institute (jcn-setup.R)
const URBAN_PALETTE = ["#1696d2", "#fdbf11", "#5c5859", "#55b748", "#ec008b", "#ca5800", "#0a4c6a"];

/**
 * Render horizontal bar chart with Part % and IS labels
 * @param {Object} params
 * @param {Array} params.franceData - [{secteur, pct, is}]
 * @param {Array} params.territories - [{label, data: [{secteur, pct, is}]}]
 * @param {Object} params.options - {width, height, maxSectors, title}
 */
export function renderButterflyVertical({ franceData, territories = [], options = {} }) {
  const {
    width = 520,
    height = null,  // Auto-calculated based on sectors
    maxSectors = 10,
    title = null,
    barHeight = 20
  } = options;

  // Sort France by descending share, take top N
  const franceSorted = [...franceData]
    .sort((a, b) => (b.pct || 0) - (a.pct || 0))
    .slice(0, maxSectors);

  const sectorOrder = franceSorted.map(d => d.secteur);
  const numSectors = sectorOrder.length;
  const sources = ["France", ...territories.map(t => t.label)];
  const numSources = sources.length;

  // Calculate height - more compact (reduced from barHeight*numSources*numSectors)
  const calculatedHeight = height || (numSectors * (numSources * barHeight * 0.7) + 60);

  // Build bar data
  const barData = [];

  // France
  franceSorted.forEach(d => {
    barData.push({ secteur: d.secteur, source: "France", pct: d.pct, is: 1.0 });
  });

  // Territories
  territories.forEach(terr => {
    const terrMap = new Map(terr.data.map(d => [d.secteur, d]));
    sectorOrder.forEach(s => {
      const d = terrMap.get(s);
      if (d) {
        barData.push({ secteur: s, source: terr.label, pct: d.pct, is: d.is || 1.0 });
      }
    });
  });

  // Max for domain
  const maxPct = Math.ceil(Math.max(...barData.map(d => d.pct || 0)) / 5) * 5 + 2;

  // Container with title
  const container = document.createElement('div');

  if (title) {
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'font-weight:600;font-size:12px;margin-bottom:6px;color:#1e40af;';
    titleDiv.textContent = title;
    container.appendChild(titleDiv);
  }

  // Plot - horizontal bars
  const plot = Plot.plot({
    width,
    height: calculatedHeight,
    marginLeft: 130,
    marginRight: 90,
    marginTop: 30,
    marginBottom: 20,
    fy: { label: null, padding: 0.08 },
    y: { axis: null, padding: 0.05 },
    x: { label: "Part %", domain: [0, maxPct], grid: true, ticks: 5 },
    color: {
      domain: sources,
      range: URBAN_PALETTE.slice(0, sources.length),
      legend: true
    },
    marks: [
      // Horizontal bars
      Plot.barX(barData, {
        fy: "secteur",
        y: "source",
        x: "pct",
        fill: "source",
        title: d => `${d.secteur}\n${d.source}: ${d.pct?.toFixed(1)}%\nIS: ${d.is?.toFixed(2)}`
      }),
      // Labels at end of bars: Part % (IS)
      Plot.text(barData, {
        fy: "secteur",
        y: "source",
        x: "pct",
        text: d => d.source === "France"
          ? `${d.pct?.toFixed(1)}%`
          : `${d.pct?.toFixed(1)}% (${d.is?.toFixed(2)})`,
        textAnchor: "start",
        dx: 4,
        fontSize: 10,
        fill: d => d.source === "France" ? "#374151"
          : d.is > 1.15 ? "#7c3aed"
          : d.is < 0.85 ? "#0891b2"
          : "#6b7280",
        fontWeight: d => (d.is > 1.15 || d.is < 0.85) ? "600" : "400"
      }),
      Plot.ruleX([0])
    ]
  });

  container.appendChild(plot);
  return container;
}
