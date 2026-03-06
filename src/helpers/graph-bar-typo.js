// helpers/graph-bar-typo.js — Barres horizontales par grille typologique
// v3 : Labels homogènes, tooltip HTML riche, étiquettes bien positionnées
// Date : 2026-02-22

import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import { PAL_PURPLE_GREEN } from "./colors.js";
import { LIB_TYPO, fixLib } from "./graph-typo-common.js";

// &s RENDER_BAR_TYPO — Barres horizontales par catégorie typologique
/**
 * @param {Object} params
 * @param {Array} params.data - [{code, lib, lib_court, ...indicateurs}]
 * @param {string} params.indicCol - colonne indicateur (ex: "dm_sma_vtcam_1622")
 * @param {number} params.franceValue - valeur France (repère)
 * @param {Object} [params.options] - {width, title, unit, periodeLabel}
 */
export function renderBarTypo({ data, indicCol, franceValue, options = {} }) {
  const {
    width = 420,
    title = null,
    unit = "",
    periodeLabel = ""
  } = options;

  // Filtrer données valides
  const valid = data.filter(d => d[indicCol] != null && !isNaN(d[indicCol]));
  if (valid.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "color:#999;font-style:italic;padding:12px;font-size:12px";
    empty.textContent = "Aucune donnée pour cet indicateur";
    return empty;
  }

  // Trier par valeur décroissante
  const sorted = [...valid].sort((a, b) => (b[indicCol] ?? 0) - (a[indicCol] ?? 0));

  // France ref
  const fr = franceValue ?? 0;

  // Échelle couleur divergente par écart à France
  const ecarts = sorted.map(d => d[indicCol] - fr);
  const maxAbsEcart = d3.max(ecarts.map(Math.abs)) || 1;

  const colorScale = d3.scaleLinear()
    .domain([-maxAbsEcart, -maxAbsEcart * 0.5, -maxAbsEcart * 0.1,
             maxAbsEcart * 0.1, maxAbsEcart * 0.5, maxAbsEcart])
    .range([PAL_PURPLE_GREEN[0], PAL_PURPLE_GREEN[1], PAL_PURPLE_GREEN[3],
            PAL_PURPLE_GREEN[4], PAL_PURPLE_GREEN[6], PAL_PURPLE_GREEN[7]])
    .interpolate(d3.interpolateRgb)
    .clamp(true);

  // Préparer données
  const barData = sorted.map(d => ({
    label: fixLib(d.lib_court || d.lib || d.code),
    value: d[indicCol],
    ecart: d[indicCol] - fr,
    color: colorScale(d[indicCol] - fr),
    pop: d.P22_POP
  }));

  // Dimensions
  const barHeight = 30;
  const calculatedHeight = barData.length * barHeight + 60;
  const categoryOrder = barData.map(d => d.label);

  // Format FR
  const fmtVal = (v) => {
    if (v == null) return "—";
    const dec = Math.abs(v) < 0.1 ? 3 : Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
    return v.toFixed(dec).replace(".", ",");
  };
  const fmtEcart = (v) => {
    const sign = v > 0 ? "+" : "";
    const dec = Math.abs(v) < 0.1 ? 3 : Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
    return `${sign}${v.toFixed(dec).replace(".", ",")}`;
  };
  const fmtPop = (v) => v ? d3.format(",")(Math.round(v)).replace(/,/g, " ") : "—";

  const plot = Plot.plot({
    width,
    height: calculatedHeight,
    marginLeft: 140,
    marginRight: 90,
    marginTop: 12,
    marginBottom: 30,

    y: {
      domain: categoryOrder,
      label: null,
      padding: 0.18
    },
    x: {
      label: null,
      grid: true,
      tickFormat: v => fmtVal(v)
    },
    color: { type: "identity" },

    marks: [
      // Ligne France
      Plot.ruleX([fr], {
        stroke: "#c62828",
        strokeWidth: 1.5,
        strokeDasharray: "5,3"
      }),

      // Barres
      Plot.barX(barData, {
        y: "label",
        x: "value",
        fill: "color",
        title: d => `${d.label}\n${fmtVal(d.value)} ${unit}\nÉcart France : ${fmtEcart(d.ecart)} ${unit}\nPop : ${fmtPop(d.pop)}`
      }),

      // Étiquette valeur — toujours à droite de la barre
      Plot.text(barData, {
        y: "label",
        x: "value",
        text: d => `${fmtVal(d.value)}`,
        textAnchor: d => d.value >= 0 ? "start" : "end",
        dx: d => d.value >= 0 ? 5 : -5,
        fontSize: 11,
        fontWeight: "600",
        fill: "#444"
      }),

      // Étiquette écart — sous la valeur, gris
      Plot.text(barData, {
        y: "label",
        x: "value",
        text: d => `(${fmtEcart(d.ecart)})`,
        textAnchor: d => d.value >= 0 ? "start" : "end",
        dx: d => d.value >= 0 ? 5 : -5,
        dy: 12,
        fontSize: 9,
        fill: "#999"
      }),

      // Annotation France
      Plot.text([{ x: fr }], {
        x: "x",
        text: d => `Fr. ${fmtVal(d.x)}`,
        dy: -8,
        fontSize: 9,
        fill: "#c62828",
        fontWeight: "600",
        frameAnchor: "top"
      })
    ]
  });

  // Container
  const container = document.createElement("div");
  if (title) {
    const titleDiv = document.createElement("div");
    titleDiv.style.cssText = "font-weight:600;font-size:13px;color:#666;margin-bottom:4px";
    titleDiv.textContent = title;
    container.appendChild(titleDiv);
  }
  container.appendChild(plot);
  return container;
}
// &e
