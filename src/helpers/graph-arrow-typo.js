// helpers/graph-arrow-typo.js — Flèches directionnelles T1→T2 par grille typologique
// Couleur selon polarité × direction du changement
// Date : 2026-02-20

import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

// &s LIB_FIX — Correction accents sat3col (mutualisé avec graph-bar-typo.js)
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
// &e

// &s ARROW_COLORS — Palette 4 cas direction × polarité
// polarity=1 : hausse=bien, baisse=mal
// polarity=-1 : hausse=mal, baisse=bien
// polarity=0 : neutre (gris)
const ARROW_CASES = {
  accelerate_good:  { color: "#2c5c2d", label: "Accélère ↑↑" },  // vert foncé
  decelerate_good:  { color: "#98cf90", label: "Décélère ↑↓" },  // vert clair
  reverse_good:     { color: "#1696d2", label: "Inverse →↑" },   // bleu Urban
  reverse_bad:      { color: "#e46aa7", label: "Inverse →↓" },   // rose
  decelerate_bad:   { color: "#af1f6b", label: "Décélère ↓↑" },  // violet
  accelerate_bad:   { color: "#761548", label: "Aggrave ↓↓" },   // bordeaux
  neutral:          { color: "#999999", label: "Stable" }
};
// &e

/**
 * Qualifier le cas directionnel T1→T2 selon polarité indicateur
 * @param {number} t1 - Valeur période ancienne
 * @param {number} t2 - Valeur période récente
 * @param {number} polarity - 1 (hausse=bien), -1 (hausse=mal), 0 (neutre)
 * @returns {string} clé dans ARROW_CASES
 */
function classifyArrow(t1, t2, polarity) {
  if (polarity === 0) return "neutral";
  const delta = t2 - t1;
  const threshold = Math.max(Math.abs(t1), Math.abs(t2)) * 0.02; // seuil 2% pour "stable"
  if (Math.abs(delta) < threshold && threshold > 0) return "neutral";

  // Polarité positive : hausse = bien
  if (polarity === 1) {
    if (t2 > t1) {
      // T2 > T1 = amélioration
      return t1 >= 0 ? "accelerate_good" : "reverse_good";
    } else {
      // T2 < T1 = dégradation
      return t2 >= 0 ? "decelerate_good" : "accelerate_bad";
    }
  }
  // Polarité négative : baisse = bien (ex: chômage, vacance)
  if (polarity === -1) {
    if (t2 < t1) {
      // T2 < T1 = amélioration (baisse)
      return t1 <= 0 ? "accelerate_good" : "reverse_good";
    } else {
      // T2 > T1 = dégradation (hausse)
      return t2 <= 0 ? "decelerate_good" : "accelerate_bad";
    }
  }
  return "neutral";
}

/**
 * Render arrow chart T1→T2 pour catégories typologiques
 * @param {Object} params
 * @param {Array} params.data - [{code, lib, lib_court, ...indicateurs}] catégories (sans France)
 * @param {string} params.colT1 - colonne indicateur T1 (période ancienne, ex: "dm_pop_vtcam_1116")
 * @param {string} params.colT2 - colonne indicateur T2 (période récente, ex: "dm_pop_vtcam_1622")
 * @param {number} params.polarity - 1 (hausse=bien), -1 (hausse=mal), 0 (neutre)
 * @param {number|null} params.franceT1 - valeur France T1
 * @param {number|null} params.franceT2 - valeur France T2
 * @param {Object} [params.options] - {width, title, unit}
 */
export function renderArrowTypo({ data, colT1, colT2, polarity = 0, franceT1 = null, franceT2 = null, options = {} }) {
  const {
    width = 430,
    title = null,
    unit = ""
  } = options;

  // Filtrer données valides (les 2 périodes)
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

  // Trier par delta (T2-T1) décroissant = qui progresse le plus en haut
  const sorted = [...valid].sort((a, b) => (b[colT2] - b[colT1]) - (a[colT2] - a[colT1]));

  // Préparer données flèches
  const arrowData = sorted.map(d => {
    const t1 = d[colT1];
    const t2 = d[colT2];
    const caseKey = classifyArrow(t1, t2, polarity);
    return {
      label: fixLib(d.lib_court || d.lib || d.code),
      t1,
      t2,
      delta: t2 - t1,
      caseKey,
      color: ARROW_CASES[caseKey].color,
      caseLabel: ARROW_CASES[caseKey].label
    };
  });

  // Dimensions
  const rowHeight = 30;
  const calculatedHeight = arrowData.length * rowHeight + 70;

  // Catégories ordonnées
  const categoryOrder = arrowData.map(d => d.label);

  // Domaine X : englober toutes les valeurs T1+T2
  const allVals = arrowData.flatMap(d => [d.t1, d.t2]);
  if (franceT1 != null) allVals.push(franceT1);
  if (franceT2 != null) allVals.push(franceT2);
  const xMin = d3.min(allVals);
  const xMax = d3.max(allVals);
  const xPad = (xMax - xMin) * 0.15 || 0.5;

  // Formater valeurs
  const fmtVal = (v) => {
    if (v == null) return "—";
    const dec = Math.abs(v) < 0.1 ? 3 : Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
    return v.toFixed(dec);
  };
  const fmtDelta = (v) => {
    const sign = v >= 0 ? "+" : "";
    const dec = Math.abs(v) < 0.1 ? 3 : Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
    return `${sign}${v.toFixed(dec)}`;
  };

  const plot = Plot.plot({
    width,
    height: calculatedHeight,
    marginLeft: 110,
    marginRight: 85,
    marginTop: 20,
    marginBottom: 30,

    y: {
      domain: categoryOrder,
      label: null,
      padding: 0.2
    },
    x: {
      domain: [xMin - xPad, xMax + xPad],
      label: null,
      grid: true,
      tickFormat: v => fmtVal(v)
    },
    color: {
      type: "identity"
    },

    marks: [
      // Ligne zéro si pertinent
      ...(xMin < 0 && xMax > 0 ? [Plot.ruleX([0], {
        stroke: "#bbb",
        strokeWidth: 0.5,
        strokeDasharray: "2,2"
      })] : []),

      // Flèche France (si dispo)
      ...(franceT1 != null && franceT2 != null ? [
        Plot.arrow([{ x1: franceT1, x2: franceT2 }], {
          x1: "x1",
          x2: "x2",
          y: () => categoryOrder[categoryOrder.length - 1], // dernière ligne
          stroke: "#333",
          strokeWidth: 2,
          strokeDasharray: "4,2",
          headLength: 6,
          dy: 12 // décalé sous la dernière catégorie
        })
      ] : []),

      // Points T1 (cercle vide)
      Plot.dot(arrowData, {
        y: "label",
        x: "t1",
        r: 4,
        stroke: "color",
        strokeWidth: 1.5,
        fill: "white",
        title: d => `${d.label}\nT1: ${fmtVal(d.t1)}${unit}`
      }),

      // Flèches T1→T2
      Plot.arrow(arrowData, {
        y: "label",
        x1: "t1",
        x2: "t2",
        stroke: "color",
        strokeWidth: 2,
        headLength: 7,
        title: d => `${d.label}\nT1: ${fmtVal(d.t1)}${unit} → T2: ${fmtVal(d.t2)}${unit}\nΔ: ${fmtDelta(d.delta)}${unit}\n${d.caseLabel}`
      }),

      // Points T2 (cercle plein)
      Plot.dot(arrowData, {
        y: "label",
        x: "t2",
        r: 4.5,
        fill: "color",
        stroke: "white",
        strokeWidth: 1,
        title: d => `${d.label}\nT2: ${fmtVal(d.t2)}${unit}`
      }),

      // Labels delta à droite
      Plot.text(arrowData, {
        y: "label",
        x: d => Math.max(d.t1, d.t2),
        text: d => `${fmtDelta(d.delta)}${unit}`,
        textAnchor: "start",
        dx: 8,
        fontSize: 10,
        fill: "color",
        fontWeight: d => Math.abs(d.delta) > d3.quantile(arrowData.map(d => Math.abs(d.delta)), 0.75) ? "600" : "400"
      })
    ]
  });

  // Container avec titre + légende
  const container = document.createElement("div");

  if (title) {
    const titleDiv = document.createElement("div");
    titleDiv.style.cssText = "font-weight:600;font-size:13px;color:#666;margin-bottom:2px";
    titleDiv.textContent = title;
    container.appendChild(titleDiv);
  }

  // Mini légende compacte : ○ T1  ● T2  → direction
  const legendDiv = document.createElement("div");
  legendDiv.style.cssText = "font-size:10px;color:#888;margin-bottom:4px;display:flex;gap:10px;align-items:center";
  legendDiv.innerHTML = `<span>○ T1</span><span>● T2</span><span>→ direction</span>`;

  // Ajouter les cas utilisés
  const usedCases = [...new Set(arrowData.map(d => d.caseKey))];
  for (const caseKey of usedCases) {
    const c = ARROW_CASES[caseKey];
    const dot = document.createElement("span");
    dot.style.cssText = `color:${c.color};font-weight:600`;
    dot.textContent = `● ${c.label}`;
    legendDiv.appendChild(dot);
  }
  container.appendChild(legendDiv);
  container.appendChild(plot);
  return container;
}
