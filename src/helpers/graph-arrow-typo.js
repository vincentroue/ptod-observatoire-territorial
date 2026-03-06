// helpers/graph-arrow-typo.js — Flèches directionnelles T1→T2 par grille typologique
// v3 : Labels partagés, tooltip explicatif, étiquettes au bout des flèches
// Date : 2026-02-22

import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import { fixLib, fmtVal, fmtDelta } from "./graph-typo-common.js";

// &s ARROW_COLORS — Palette direction × polarité (termes clairs)
const ARROW_CASES = {
  accelerate_good:  { color: "#2c7c2d", symbol: "▲▲", label: "Accélère" },
  moderate_good:    { color: "#7cb87c", symbol: "▲▽", label: "Modère" },
  reverse_good:     { color: "#1696d2", symbol: "◇▲", label: "Retourne +" },
  reverse_bad:      { color: "#e46aa7", symbol: "◇▼", label: "Retourne −" },
  moderate_bad:     { color: "#af1f6b", symbol: "▼△", label: "Freine" },
  accelerate_bad:   { color: "#761548", symbol: "▼▼", label: "Aggrave" },
  neutral:          { color: "#999999", symbol: "—",  label: "Stable" }
};
// &e

// &s CLASSIFY_ARROW — Qualifier direction T1→T2 selon polarité
function classifyArrow(t1, t2, polarity) {
  if (polarity === 0) return "neutral";
  const delta = t2 - t1;
  const threshold = Math.max(Math.abs(t1), Math.abs(t2)) * 0.02;
  if (Math.abs(delta) < threshold && threshold > 0) return "neutral";

  if (polarity === 1) {
    if (t2 > t1) {
      return t1 >= 0 ? "accelerate_good" : "reverse_good";
    } else {
      return t2 >= 0 ? "moderate_good" : "accelerate_bad";
    }
  }
  if (polarity === -1) {
    if (t2 < t1) {
      return t1 <= 0 ? "accelerate_good" : "reverse_good";
    } else {
      return t2 <= 0 ? "moderate_good" : "accelerate_bad";
    }
  }
  return "neutral";
}
// &e

// &s EXPLAIN_ARROW — Phrase explicative pour tooltip
function explainArrow(d, unit) {
  const dir = d.t2 > d.t1 ? "hausse" : d.t2 < d.t1 ? "baisse" : "stable";
  const t1s = fmtVal(d.t1);
  const t2s = fmtVal(d.t2);
  const ds = fmtDelta(d.delta);

  const caseExplain = {
    accelerate_good: `Dynamique positive qui s'amplifie`,
    moderate_good:   `Dynamique positive qui ralentit`,
    reverse_good:    `Retournement : passe du négatif au positif`,
    reverse_bad:     `Retournement : passe du positif au négatif`,
    moderate_bad:    `Dynamique négative qui freine`,
    accelerate_bad:  `Dynamique négative qui s'aggrave`,
    neutral:         `Situation stable entre les deux périodes`
  };

  return `${d.label}\n` +
    `T1 : ${t1s} ${unit}  →  T2 : ${t2s} ${unit}\n` +
    `Variation : ${ds} ${unit}\n` +
    `${caseExplain[d.caseKey] || ""}`;
}
// &e

// &s RENDER_ARROW_TYPO — Graphique flèches T1→T2 v3
/**
 * @param {Object} params
 * @param {Array} params.data - [{code, lib, lib_court, ...}]
 * @param {string} params.colT1 - colonne T1 (période ancienne)
 * @param {string} params.colT2 - colonne T2 (période récente)
 * @param {number} params.polarity - 1 (hausse=bien), -1 (hausse=mal), 0 (neutre)
 * @param {number|null} params.franceT1 - valeur France T1
 * @param {number|null} params.franceT2 - valeur France T2
 * @param {Object} [params.options] - {width, unit, grilleKey, labelT1, labelT2}
 */
export function renderArrowTypo({ data, colT1, colT2, polarity = 0, franceT1 = null, franceT2 = null, options = {} }) {
  const {
    width = 480,
    unit = "",
    grilleKey = null,
    labelT1 = "T1",
    labelT2 = "T2"
  } = options;

  // Filtrer données valides
  const valid = data.filter(d =>
    d[colT1] != null && !isNaN(d[colT1]) &&
    d[colT2] != null && !isNaN(d[colT2])
  );
  if (valid.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "color:#999;font-style:italic;padding:12px;font-size:12px";
    empty.textContent = "Aucune donnée T1/T2 pour cet indicateur";
    return empty;
  }

  // Préparer données
  const arrowData = valid.map(d => {
    const t1 = d[colT1];
    const t2 = d[colT2];
    const label = fixLib(d.lib_court || d.lib || d.code);
    const caseKey = classifyArrow(t1, t2, polarity);
    return {
      label,
      t1,
      t2,
      delta: t2 - t1,
      caseKey,
      color: ARROW_CASES[caseKey].color,
      caseLabel: ARROW_CASES[caseKey].label
    };
  });

  // Tri par valeur T2 décroissante
  arrowData.sort((a, b) => b.t2 - a.t2);

  // Dimensions
  const rowHeight = 36;
  const calculatedHeight = arrowData.length * rowHeight + 65;
  const categoryOrder = arrowData.map(d => d.label);

  // Domaine X
  const allVals = arrowData.flatMap(d => [d.t1, d.t2]);
  if (franceT2 != null) allVals.push(franceT2);
  if (franceT1 != null) allVals.push(franceT1);
  const xMin = d3.min(allVals);
  const xMax = d3.max(allVals);
  const xRange = xMax - xMin || 1;

  const marks = [
    // Grille
    Plot.gridX({ stroke: "#eee", strokeWidth: 0.5 }),

    // Axe zéro — bien visible
    ...(xMin < 0 && xMax > 0 ? [Plot.ruleX([0], {
      stroke: "#777",
      strokeWidth: 1.5,
      strokeDasharray: "5,3"
    })] : []),

    // Ligne France T2 — référence verticale rouge
    ...(franceT2 != null ? [
      Plot.ruleX([franceT2], {
        stroke: "#c62828",
        strokeWidth: 1.5,
        strokeDasharray: "6,3"
      }),
      Plot.text([{ x: franceT2 }], {
        x: "x",
        text: d => `Fr. ${fmtVal(d.x)}`,
        frameAnchor: "top",
        dy: -8,
        fontSize: 9,
        fontWeight: "600",
        fill: "#c62828"
      })
    ] : []),

    // Connecteur T1→T2 (ligne fine)
    Plot.link(arrowData, {
      y1: "label",
      y2: "label",
      x1: "t1",
      x2: "t2",
      stroke: "color",
      strokeWidth: 2,
      markerEnd: "arrow",
      title: d => explainArrow(d, unit)
    }),

    // Point T1 (cercle vide — période ancienne)
    Plot.dot(arrowData, {
      y: "label",
      x: "t1",
      r: 4.5,
      stroke: "#999",
      strokeWidth: 1.5,
      fill: "white",
      title: d => `${d.label}\n${labelT1} : ${fmtVal(d.t1)} ${unit}`
    }),

    // Point T2 (cercle plein — période récente)
    Plot.dot(arrowData, {
      y: "label",
      x: "t2",
      r: 5.5,
      fill: "color",
      stroke: "white",
      strokeWidth: 1.5,
      title: d => `${d.label}\n${labelT2} : ${fmtVal(d.t2)} ${unit}`
    }),

    // Étiquette T2 valeur — AU BOUT de la flèche (après le point T2)
    Plot.text(arrowData, {
      y: "label",
      x: "t2",
      text: d => `${fmtVal(d.t2)}`,
      textAnchor: d => d.t2 >= d.t1 ? "start" : "end",
      dx: d => d.t2 >= d.t1 ? 12 : -12,
      fontSize: 11,
      fontWeight: "700",
      fill: "color"
    }),

    // Étiquette delta — sous la valeur T2
    Plot.text(arrowData, {
      y: "label",
      x: "t2",
      text: d => `${fmtDelta(d.delta)}`,
      textAnchor: d => d.t2 >= d.t1 ? "start" : "end",
      dx: d => d.t2 >= d.t1 ? 12 : -12,
      dy: 13,
      fontSize: 9,
      fill: "#888"
    })
  ];

  const plot = Plot.plot({
    width,
    height: calculatedHeight,
    marginLeft: 160,
    marginRight: 80,
    marginTop: 18,
    marginBottom: 30,

    y: {
      domain: categoryOrder,
      label: null,
      padding: 0.3
    },
    x: {
      domain: [xMin - xRange * 0.15, xMax + xRange * 0.3],
      label: null,
      tickFormat: v => fmtVal(v)
    },
    color: { type: "identity" },
    marks
  });

  // Container
  const container = document.createElement("div");

  // Légende compacte avec labels T1/T2 explicites
  const legendDiv = document.createElement("div");
  legendDiv.style.cssText = "font-size:10px;color:#777;margin-bottom:6px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;line-height:1.6";

  // T1/T2 labels
  legendDiv.innerHTML = `<span style="color:#999">○ ${labelT1}</span>` +
    `<span style="color:#555;font-weight:600">● ${labelT2}</span>` +
    `<span style="color:#aaa">→ évolution</span>`;

  // Cas de direction utilisés
  const usedCases = [...new Set(arrowData.map(d => d.caseKey))];
  for (const ck of usedCases) {
    const c = ARROW_CASES[ck];
    legendDiv.innerHTML += `<span style="color:${c.color};font-weight:600">${c.symbol} ${c.label}</span>`;
  }
  container.appendChild(legendDiv);
  container.appendChild(plot);
  return container;
}
// &e
