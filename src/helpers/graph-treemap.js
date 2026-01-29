// =============================================================================
// helpers/graph-treemap.js — Treemap sectoriel A5/A21
// =============================================================================
// Date: 2026-01-19
// =============================================================================

import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

// Palette A5 (cohérente avec autres graphs)
const PALETTE_A5 = {
  "AZ": "#22c55e",   // Agriculture - vert
  "BE": "#3b82f6",   // Industrie - bleu
  "FZ": "#f59e0b",   // Construction - orange
  "GU": "#8b5cf6",   // Tertiaire marchand - violet
  "OQ": "#ec4899"    // Tertiaire non marchand - rose
};

const LIB_A5 = {
  "AZ": "Agriculture",
  "BE": "Industrie",
  "FZ": "Construction",
  "GU": "Tertiaire marchand",
  "OQ": "Tertiaire non marchand"
};

// &s TREEMAP_A5_A21
// Treemap avec A5 en grands carrés et A21 en sous-carrés
export function renderTreemapA5A21(data, {
  width = 600,
  height = 400,
  title = "",
  valueField = "pct",
  showLabels = true
} = {}) {

  // Construire hiérarchie : root → A5 → A21
  const hierarchy = {
    name: "root",
    children: []
  };

  // Grouper par A5
  const byA5 = d3.group(data, d => d.a5);

  for (const [a5, items] of byA5) {
    const a5Node = {
      name: a5,
      lib: LIB_A5[a5] || a5,
      color: PALETTE_A5[a5] || "#6b7280",
      children: items.map(d => ({
        name: d.a21 || d.lib,
        lib: d.lib,
        a5: a5,
        value: d[valueField] || 0,
        evol: d.evol_2223 || d.evol_1924,
        is: d.is_23 || d.is_24
      }))
    };
    hierarchy.children.push(a5Node);
  }

  // Créer treemap layout
  const root = d3.hierarchy(hierarchy)
    .sum(d => d.value || 0)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([width, height])
    .padding(2)
    .paddingTop(18)  // Espace pour label A5
    .round(true)
    (root);

  // Container SVG
  const container = document.createElement('div');

  if (title) {
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'font-weight:600;font-size:13px;text-align:center;margin-bottom:6px;color:#1e40af;';
    titleDiv.textContent = title;
    container.appendChild(titleDiv);
  }

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "font: 10px sans-serif;");

  // Groupes A5 (level 1)
  const a5Groups = svg.selectAll("g.a5-group")
    .data(root.children)
    .join("g")
    .attr("class", "a5-group")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  // Fond A5
  a5Groups.append("rect")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => d.data.color)
    .attr("fill-opacity", 0.15)
    .attr("stroke", d => d.data.color)
    .attr("stroke-width", 2);

  // Label A5
  a5Groups.append("text")
    .attr("x", 4)
    .attr("y", 13)
    .attr("fill", d => d.data.color)
    .attr("font-weight", "600")
    .attr("font-size", "11px")
    .text(d => d.data.lib);

  // Feuilles A21 (level 2)
  const leaves = svg.selectAll("g.leaf")
    .data(root.leaves())
    .join("g")
    .attr("class", "leaf")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  // Rectangle A21
  leaves.append("rect")
    .attr("width", d => Math.max(0, d.x1 - d.x0 - 1))
    .attr("height", d => Math.max(0, d.y1 - d.y0 - 1))
    .attr("fill", d => PALETTE_A5[d.data.a5] || "#6b7280")
    .attr("fill-opacity", 0.6)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .append("title")
    .text(d => `${d.data.lib}\nPart: ${d.data.value?.toFixed(1)}%${d.data.evol ? `\nÉvol: ${d.data.evol > 0 ? '+' : ''}${d.data.evol?.toFixed(1)}%` : ''}${d.data.is ? `\nIS: ${d.data.is?.toFixed(2)}` : ''}`);

  // Labels A21 (si assez grand)
  if (showLabels) {
    leaves.filter(d => (d.x1 - d.x0) > 50 && (d.y1 - d.y0) > 25)
      .append("text")
      .attr("x", d => (d.x1 - d.x0) / 2)
      .attr("y", d => (d.y1 - d.y0) / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#fff")
      .attr("font-size", d => Math.min(10, (d.x1 - d.x0) / 8))
      .attr("font-weight", "500")
      .text(d => {
        const w = d.x1 - d.x0;
        const label = d.data.lib || d.data.name;
        return w < 80 ? label.slice(0, 8) + (label.length > 8 ? '…' : '') : label.slice(0, 15) + (label.length > 15 ? '…' : '');
      });

    // Valeur en dessous si assez haut
    leaves.filter(d => (d.x1 - d.x0) > 40 && (d.y1 - d.y0) > 40)
      .append("text")
      .attr("x", d => (d.x1 - d.x0) / 2)
      .attr("y", d => (d.y1 - d.y0) / 2 + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-size", "9px")
      .text(d => d.data.value?.toFixed(1) + '%');
  }

  container.appendChild(svg.node());
  return container;
}
// &e

// &s TREEMAP_SIMPLE
// Treemap simple niveau unique (A5 ou A21)
export function renderTreemapSimple(data, {
  width = 500,
  height = 300,
  title = "",
  valueField = "pct",
  colorField = "a5"
} = {}) {

  const hierarchy = {
    name: "root",
    children: data.map(d => ({
      name: d.lib || d.a21 || d.a5,
      value: d[valueField] || 0,
      color: PALETTE_A5[d[colorField]] || PALETTE_A5[d.a5] || "#6b7280",
      evol: d.evol_2223 || d.evol_1924,
      is: d.is_23 || d.is_24
    }))
  };

  const root = d3.hierarchy(hierarchy)
    .sum(d => d.value || 0)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([width, height])
    .padding(2)
    .round(true)
    (root);

  const container = document.createElement('div');

  if (title) {
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'font-weight:600;font-size:13px;text-align:center;margin-bottom:6px;color:#1e40af;';
    titleDiv.textContent = title;
    container.appendChild(titleDiv);
  }

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "font: 10px sans-serif;");

  const leaves = svg.selectAll("g")
    .data(root.leaves())
    .join("g")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  leaves.append("rect")
    .attr("width", d => Math.max(0, d.x1 - d.x0 - 1))
    .attr("height", d => Math.max(0, d.y1 - d.y0 - 1))
    .attr("fill", d => d.data.color)
    .attr("fill-opacity", 0.75)
    .attr("stroke", "#fff")
    .append("title")
    .text(d => `${d.data.name}\nPart: ${d.data.value?.toFixed(1)}%${d.data.evol ? `\nÉvol: ${d.data.evol > 0 ? '+' : ''}${d.data.evol?.toFixed(1)}%` : ''}`);

  leaves.filter(d => (d.x1 - d.x0) > 45 && (d.y1 - d.y0) > 20)
    .append("text")
    .attr("x", d => (d.x1 - d.x0) / 2)
    .attr("y", d => (d.y1 - d.y0) / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", "#fff")
    .attr("font-weight", "500")
    .text(d => d.data.name.slice(0, 12) + (d.data.name.length > 12 ? '…' : ''));

  container.appendChild(svg.node());
  return container;
}
// &e
