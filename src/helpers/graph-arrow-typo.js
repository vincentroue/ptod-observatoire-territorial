// helpers/graph-arrow-typo.js — Flèches directionnelles T1→T2 par grille typologique
// v2 : Labels lisibles, axe zéro visible, France ref, tri par T2, noms complets
// Date : 2026-02-22

import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

// &s LIB_FIX — Correction accents sat3col (mutualisé avec graph-bar-typo.js)
const LIB_FIX = {
  "Pole de Paris": "Pôle de Paris", "Pole Paris": "Pôle Paris",
  "Autres poles denses": "Autres pôles denses", "Poles denses": "Pôles denses",
  "Poles intermediaires et petits": "Pôles intermédiaires et petits", "Poles int.": "Pôles int.",
  "Couronnes urbaines": "Couronnes urbaines", "Cour. urb.": "Couronnes urb.",
  "Rural forte influence": "Rural forte influence", "Rural faible influence": "Rural faible influence",
  "Rural hors attraction": "Rural hors attraction",
  "Grandes aires >=200k": "Grandes aires ≥200k", "Aires moyennes 50-200k": "Aires moy. 50-200k",
  "Petites aires <50k": "Petites aires <50k",
  "Dense": "Dense", "Intermediaire": "Intermédiaire", "Rural": "Rural",
  "Densement peuple": "Densément peuplé", "Densite intermediaire": "Densité intermédiaire",
  "Peu dense / tres peu dense": "Peu dense / très peu dense",
  "Grand centre urbain": "Gd centre urbain", "Grands centres urbains": "Gd centre urbain",
  "Centre urbain intermediaire": "Centre intermédiaire", "Centres intermediaires": "Centre intermédiaire",
  "Centres intermédiaires": "Centre intermédiaire",
  "Petit centre urbain": "Petite ville", "Petites villes": "Petite ville",
  "Ceinture urbaine": "Ceinture", "Ceintures urbaines": "Ceinture",
  "Bourg rural": "Bourg", "Bourgs ruraux": "Bourg",
  "Rural a habitat disperse": "Rural dispersé", "Rural dispersé": "Rural disp.",
  "Rural a habitat tres disperse": "Rural très dispersé", "Rural très dispersé": "Très rural",
  "Couronne de Paris": "Couronne Paris",
  "Rural periurbain": "Rural périurbain", "Rural périurbain": "Rur. périurb.",
  "Rural autonome": "Rur. auton.",
  "Poles": "Pôles", "Pôles": "Pôles",
  "Hors AAV": "Hors AAV",
  "Paris": "Paris"
};
const fixLib = (s) => LIB_FIX[s] || s;
// &e

// &s SUPRA_CATEGORIES — Groupes Urb/Péri/Rur pour grilles détaillées
const SUPRA = {
  typo4p: {
    "Pôles": "Urbain",
    "Couronnes urbaines": "Périurbain",
    "Rural périurbain": "Périurbain",
    "Rural autonome": "Rural"
  },
  typo5fs: {
    "Paris": "Urbain",
    "Grandes aires ≥200k": "Urbain",
    "Aires moy. 50-200k": "Intermédiaire",
    "Petites aires <50k": "Intermédiaire",
    "Hors AAV": "Rural"
  },
  typo8p: {
    "Pôle de Paris": "Pôle",
    "Autres pôles denses": "Pôle",
    "Pôles intermédiaires et petits": "Pôle",
    "Couronne Paris": "Couronne",
    "Couronnes urbaines": "Couronne",
    "Couronnes urb.": "Couronne",
    "Rural forte influence": "Rural",
    "Rural faible influence": "Rural",
    "Rural hors attraction": "Rural"
  },
  dens3: null, // pas de supra pour 3 catégories
  dens7: {
    "Gd centre urbain": "Urbain",
    "Centre intermédiaire": "Urbain",
    "Petite ville": "Urbain",
    "Ceinture": "Périurbain",
    "Bourg": "Rural",
    "Rural disp.": "Rural",
    "Très rural": "Rural"
  }
};
// &e

// &s ARROW_COLORS — Palette 6 cas direction × polarité
const ARROW_CASES = {
  accelerate_good:  { color: "#2c5c2d", label: "Accélère ↑↑" },
  decelerate_good:  { color: "#98cf90", label: "Décélère ↑↓" },
  reverse_good:     { color: "#1696d2", label: "Inverse →↑" },
  reverse_bad:      { color: "#e46aa7", label: "Inverse →↓" },
  decelerate_bad:   { color: "#af1f6b", label: "Décélère ↓↑" },
  accelerate_bad:   { color: "#761548", label: "Aggrave ↓↓" },
  neutral:          { color: "#999999", label: "Stable" }
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
      return t2 >= 0 ? "decelerate_good" : "accelerate_bad";
    }
  }
  if (polarity === -1) {
    if (t2 < t1) {
      return t1 <= 0 ? "accelerate_good" : "reverse_good";
    } else {
      return t2 <= 0 ? "decelerate_good" : "accelerate_bad";
    }
  }
  return "neutral";
}
// &e

// &s RENDER_ARROW_TYPO — Graphique flèches T1→T2 v2
/**
 * Render arrow chart T1→T2 pour catégories typologiques
 * v2 : labels lisibles, axe zéro fort, France ref verticale, tri par T2
 */
export function renderArrowTypo({ data, colT1, colT2, polarity = 0, franceT1 = null, franceT2 = null, options = {} }) {
  const {
    width = 460,
    title = null,
    unit = "",
    grilleKey = null
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
    const supraMap = grilleKey ? SUPRA[grilleKey] : null;
    return {
      label,
      t1,
      t2,
      delta: t2 - t1,
      caseKey,
      color: ARROW_CASES[caseKey].color,
      caseLabel: ARROW_CASES[caseKey].label,
      supra: supraMap ? (supraMap[label] || "") : ""
    };
  });

  // Tri par valeur T2 décroissante (qui est le plus haut maintenant)
  arrowData.sort((a, b) => b.t2 - a.t2);

  // Dimensions
  const rowHeight = 32;
  const calculatedHeight = arrowData.length * rowHeight + 65;
  const categoryOrder = arrowData.map(d => d.label);

  // Domaine X
  const allVals = arrowData.flatMap(d => [d.t1, d.t2]);
  if (franceT2 != null) allVals.push(franceT2);
  if (franceT1 != null) allVals.push(franceT1);
  const xMin = d3.min(allVals);
  const xMax = d3.max(allVals);
  const xPad = (xMax - xMin) * 0.25 || 0.5;

  // Formater
  const fmtVal = (v) => {
    if (v == null) return "—";
    const dec = Math.abs(v) < 0.1 ? 3 : Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
    return v.toFixed(dec).replace(".", ",");
  };
  const fmtDelta = (v) => {
    const sign = v > 0 ? "+" : "";
    const dec = Math.abs(v) < 0.1 ? 3 : Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
    return `${sign}${v.toFixed(dec).replace(".", ",")}`;
  };

  // France T2 comme référence principale
  const frRef = franceT2 != null ? franceT2 : null;

  const marks = [
    // Axe zéro — bien visible
    ...(xMin < 0 && xMax > 0 ? [Plot.ruleX([0], {
      stroke: "#888",
      strokeWidth: 1.5,
      strokeDasharray: "4,3"
    })] : []),

    // Ligne France T2 — référence verticale rouge
    ...(frRef != null ? [
      Plot.ruleX([frRef], {
        stroke: "#c62828",
        strokeWidth: 1.5,
        strokeDasharray: "6,3"
      }),
      // Annotation "Fr." en haut
      Plot.text([{ x: frRef }], {
        x: "x",
        text: d => `Fr. ${fmtVal(d.x)}`,
        frameAnchor: "top",
        dy: -8,
        fontSize: 9,
        fontWeight: "600",
        fill: "#c62828"
      })
    ] : []),

    // Flèches T1→T2
    Plot.arrow(arrowData, {
      y: "label",
      x1: "t1",
      x2: "t2",
      stroke: "color",
      strokeWidth: 2.5,
      headLength: 8,
      title: d => `${d.label}\nT1: ${fmtVal(d.t1)}${unit} → T2: ${fmtVal(d.t2)}${unit}\nΔ: ${fmtDelta(d.delta)}${unit}\n${d.caseLabel}`
    }),

    // Points T1 (cercle vide, petit)
    Plot.dot(arrowData, {
      y: "label",
      x: "t1",
      r: 4,
      stroke: "color",
      strokeWidth: 1.5,
      fill: "white",
      title: d => `T1: ${fmtVal(d.t1)}${unit}`
    }),

    // Points T2 (cercle plein, plus gros)
    Plot.dot(arrowData, {
      y: "label",
      x: "t2",
      r: 5,
      fill: "color",
      stroke: "white",
      strokeWidth: 1.5,
      title: d => `T2: ${fmtVal(d.t2)}${unit}`
    }),

    // Valeur T2 en gras à droite du point T2
    Plot.text(arrowData, {
      y: "label",
      x: "t2",
      text: d => `${fmtVal(d.t2)}`,
      textAnchor: "start",
      dx: 10,
      fontSize: 11,
      fontWeight: "700",
      fill: "color"
    }),

    // Delta entre parenthèses après la valeur T2
    Plot.text(arrowData, {
      y: "label",
      x: "t2",
      text: d => `(${fmtDelta(d.delta)})`,
      textAnchor: "start",
      dx: 10,
      dy: 12,
      fontSize: 9,
      fontWeight: "400",
      fill: "#888"
    })
  ];

  const plot = Plot.plot({
    width,
    height: calculatedHeight,
    marginLeft: 150,
    marginRight: 100,
    marginTop: 20,
    marginBottom: 30,

    y: {
      domain: categoryOrder,
      label: null,
      padding: 0.25
    },
    x: {
      domain: [xMin - xPad * 0.3, xMax + xPad],
      label: null,
      grid: true,
      tickFormat: v => fmtVal(v)
    },
    color: {
      type: "identity"
    },

    marks
  });

  // Container
  const container = document.createElement("div");

  if (title) {
    const titleDiv = document.createElement("div");
    titleDiv.style.cssText = "font-weight:600;font-size:13px;color:#666;margin-bottom:2px";
    titleDiv.textContent = title;
    container.appendChild(titleDiv);
  }

  // Légende compacte
  const legendDiv = document.createElement("div");
  legendDiv.style.cssText = "font-size:10px;color:#888;margin-bottom:4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap";
  legendDiv.innerHTML = `<span style="color:#aaa">○ T1</span><span style="color:#666">● T2</span><span style="color:#aaa">→ direction</span>`;

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
// &e
