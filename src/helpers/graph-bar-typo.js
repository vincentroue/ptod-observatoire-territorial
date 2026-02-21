// helpers/graph-bar-typo.js — Barres horizontales par grille typologique
// Barre France en référence, couleur divergente par écart à la moyenne France
// Date : 2026-02-19

import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import { PAL_PURPLE_GREEN } from "./colors.js";

/**
 * Render horizontal bar chart for typology categories
 * @param {Object} params
 * @param {Array} params.data - [{code, lib, lib_court, ...indicateurs}] catégories (sans France)
 * @param {string} params.indicCol - colonne indicateur (ex: "dm_pop_vtcam_1622")
 * @param {number} params.franceValue - valeur France (repère)
 * @param {Object} [params.options] - {width, title}
 */
export function renderBarTypo({ data, indicCol, franceValue, options = {} }) {
  const {
    width = 400,
    title = null
  } = options;

  // Correction accents/labels manquants dans sat3col sources
  const LIB_FIX = {
    "Pole de Paris": "Pôle de Paris", "Pole Paris": "Pôle Paris",
    "Autres poles denses": "Autres pôles denses", "Poles denses": "Pôles denses",
    "Poles intermediaires et petits": "Pôles intermédiaires", "Poles int.": "Pôles int.",
    "Couronnes urbaines": "Autres couronnes urb.", "Cour. urb.": "Aut. cour. urb.",
    "Rural forte influence": "Rural forte influence", "Rural faible influence": "Rural faible influence",
    "Rural hors attraction": "Rural hors attraction",
    "Grandes aires >=200k": "Grandes aires ≥200k", "Aires moyennes 50-200k": "Aires moy. 50-200k",
    "Dense": "Dense", "Intermediaire": "Intermédiaire", "Rural": "Rural",
    "Grand centre urbain": "Grand centre urbain", "Centre urbain intermediaire": "Centre urbain interm.",
    "Ceinture urbaine": "Ceinture urbaine", "Petit centre urbain": "Petit centre urbain",
    "Bourg rural": "Bourg rural", "Rural a habitat disperse": "Rural habitat dispersé",
    "Rural a habitat tres disperse": "Rural très dispersé"
  };
  const fixLib = (s) => LIB_FIX[s] || s;

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

  // France value (fallback 0)
  const fr = franceValue ?? 0;

  // Échelle de couleur divergente basée sur l'écart à France
  const ecarts = sorted.map(d => d[indicCol] - fr);
  const maxAbsEcart = d3.max(ecarts.map(Math.abs)) || 1;

  // Interpolation continue : bordeaux (négatif) ↔ vert (positif) via PAL_PURPLE_GREEN
  const colorScale = d3.scaleLinear()
    .domain([-maxAbsEcart, -maxAbsEcart * 0.5, -maxAbsEcart * 0.1,
             maxAbsEcart * 0.1, maxAbsEcart * 0.5, maxAbsEcart])
    .range([PAL_PURPLE_GREEN[0], PAL_PURPLE_GREEN[1], PAL_PURPLE_GREEN[3],
            PAL_PURPLE_GREEN[4], PAL_PURPLE_GREEN[6], PAL_PURPLE_GREEN[7]])
    .interpolate(d3.interpolateRgb)
    .clamp(true);

  // Préparer données pour Plot
  const barData = sorted.map(d => ({
    label: fixLib(d.lib_court || d.lib || d.code),
    value: d[indicCol],
    ecart: d[indicCol] - fr,
    color: colorScale(d[indicCol] - fr),
    pop: d.P22_POP
  }));

  // Dimensions
  const barHeight = 28;
  const calculatedHeight = barData.length * barHeight + 60;

  // Catégories dans l'ordre trié (décroissant)
  const categoryOrder = barData.map(d => d.label);

  // Formater valeur écart
  const fmtEcart = (v) => {
    const sign = v >= 0 ? "+" : "";
    const dec = Math.abs(v) < 0.1 ? 3 : Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
    return `${sign}${v.toFixed(dec)}`;
  };

  // Formater valeur principale
  const fmtVal = (v) => {
    const dec = Math.abs(v) < 0.1 ? 3 : Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
    return v.toFixed(dec);
  };

  const plot = Plot.plot({
    width,
    height: calculatedHeight,
    marginLeft: 110,
    marginRight: 80,
    marginTop: 8,
    marginBottom: 30,

    y: {
      domain: categoryOrder,
      label: null,
      padding: 0.15
    },
    x: {
      label: null,
      grid: true
    },
    color: {
      type: "identity"
    },

    marks: [
      // Ligne France (référence verticale)
      Plot.ruleX([fr], {
        stroke: "#333",
        strokeWidth: 1.5,
        strokeDasharray: "4,3"
      }),

      // Barres horizontales
      Plot.barX(barData, {
        y: "label",
        x: "value",
        fill: "color",
        title: d => `${d.label}\nValeur: ${fmtVal(d.value)}\nÉcart France: ${fmtEcart(d.ecart)}\nPop: ${d.pop ? d3.format(",")(d.pop) : "—"}`
      }),

      // Labels valeur + écart à droite des barres
      Plot.text(barData, {
        y: "label",
        x: "value",
        text: d => `${fmtVal(d.value)} (${fmtEcart(d.ecart)})`,
        textAnchor: d => d.value >= fr ? "start" : "end",
        dx: d => d.value >= fr ? 4 : -4,
        fontSize: 10,
        fill: "#555",
        fontWeight: d => Math.abs(d.ecart) > maxAbsEcart * 0.5 ? "600" : "400"
      }),

      // Annotation "France" sur la règle
      Plot.text([{ x: fr, label: `Fr. ${fmtVal(fr)}` }], {
        x: "x",
        text: "label",
        dy: -8,
        fontSize: 9,
        fill: "#666",
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
