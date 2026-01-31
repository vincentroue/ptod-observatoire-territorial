// ============================================================
// &s SCATTER — Helper scatter plot paramétré
// ============================================================
// Date: 2026-01-22
// Scatter configurable avec axes 0, moyennes, régression, bissectrice
// Titre intégré, légende en haut, zoom/reset
//
// Exports:
// - renderScatter(config) → Plot.plot() object
// - createScatterWithZoom(config) → container avec zoom/reset
// ============================================================

import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

// ============================================================
// &s SCATTER — Génération scatter plot
// ============================================================

/**
 * Génère un scatter plot configurable avec:
 * - Titre intégré en haut
 * - Légende couleur en haut dans le graphique
 * - Axes à 0 (gris)
 * - Bissectrice y=x (pointillé discret)
 * - Moyennes France (pointillé + labels)
 * - Régression passant par origine (optionnel)
 * - R² (optionnel)
 * - Points avec taille variable et couleur
 * - Highlighting sélection
 * - Labels optionnels (Top 5 / Bottom 5)
 *
 * @param {Object} config
 * @param {Array} config.data - Données à afficher
 * @param {string} config.xCol - Colonne X
 * @param {string} config.yCol - Colonne Y
 * @param {number[]} config.xDomain - Domaine X [min, max]
 * @param {number[]} config.yDomain - Domaine Y [min, max]
 * @param {string} config.xLabel - Label axe X
 * @param {string} config.yLabel - Label axe Y
 * @param {string} [config.title] - Titre du graphique (affiché en haut)
 * @param {Array} [config.legend] - Légende [{label, color}] affichée en haut
 * @param {number} config.meanX - Moyenne X (pour ligne pointillée)
 * @param {number} config.meanY - Moyenne Y (pour ligne pointillée)
 * @param {Object} [config.regression] - { slope, r2 } si régression à afficher
 * @param {boolean} [config.showRegression=false] - Afficher la régression
 * @param {Function} config.getRadius - (d) => radius pour chaque point
 * @param {Function} config.getColor - (d) => color pour chaque point
 * @param {Function} config.isSelected - (d) => boolean si point sélectionné
 * @param {Function} config.getTooltip - (d) => string pour tooltip
 * @param {number} [config.fillOpacity=0.85] - Opacité remplissage bulles (0-1)
 * @param {number} [config.width=540] - Largeur du plot
 * @param {number} [config.height=440] - Hauteur du plot
 * @param {Array} [config.labelCodes=[]] - Codes des territoires à labelliser
 * @param {string} [config.labelMode="both"] - "names", "values", "both"
 * @returns {Object} Plot.plot() object
 */
export function renderScatter(config) {
  const {
    data,
    xCol,
    yCol,
    xDomain,
    yDomain,
    xLabel,
    yLabel,
    title = null,
    legend = null,
    meanX,
    meanY,
    regression = null,
    showRegression = false,
    getRadius,
    getColor,
    isSelected = () => false,
    getTooltip,
    fillOpacity = 0.85,
    width = 540,
    height = 440,
    xTicks: customXTicks = null,
    yTicks: customYTicks = null,
    labelCodes = [],        // Codes à labelliser (Top5/Bot5)
    labelMode = "both",     // "names", "values", "both"
    zoomFactor = 1          // Facteur zoom pour adapter collision (1 = pas de zoom)
  } = config;

  // Filtrer données valides
  const validData = data.filter(d => d[xCol] != null && d[yCol] != null);

  // Construire marks
  const marks = [
    // Axes 0 en GRIS (plus fin)
    Plot.ruleX([0], { stroke: "#555", strokeWidth: 1 }),
    Plot.ruleY([0], { stroke: "#555", strokeWidth: 1 }),

    // Bissectrice y=x fine et discrète (pointillé léger, protection NaN)
    (!isNaN(xDomain[0]) && !isNaN(xDomain[1]) && !isNaN(yDomain[0]) && !isNaN(yDomain[1])) ? Plot.line([
      [Math.max(xDomain[0], yDomain[0]), Math.max(xDomain[0], yDomain[0])],
      [Math.min(xDomain[1], yDomain[1]), Math.min(xDomain[1], yDomain[1])]
    ], { stroke: "#aaa", strokeWidth: 0.8, strokeDasharray: "4,4" }) : null,

    // Moyennes France en GRIS pointillé avec labels (protection NaN)
    !isNaN(meanX) ? Plot.ruleX([meanX], { stroke: "#888", strokeWidth: 1, strokeDasharray: "4,3" }) : null,
    !isNaN(meanY) ? Plot.ruleY([meanY], { stroke: "#888", strokeWidth: 1, strokeDasharray: "4,3" }) : null,
    !isNaN(meanX) && !isNaN(yDomain[1]) ? Plot.text([[meanX, yDomain[1] * 0.95]], {
      text: [`Moy ${meanX?.toFixed(2)}`],
      fontSize: 10,
      fill: "#555",
      textAnchor: "start",
      dx: 3
    }) : null,
    !isNaN(meanY) && !isNaN(xDomain[1]) ? Plot.text([[xDomain[1] * 0.95, meanY]], {
      text: [`Moy ${meanY?.toFixed(2)}`],
      fontSize: 10,
      fill: "#555",
      textAnchor: "end",
      dy: -5
    }) : null,

    // Régression par origine - rouge discret (optionnel, avec protection NaN)
    showRegression && regression && !isNaN(regression.slope) && isFinite(regression.slope) ? Plot.line([
      [xDomain[0], regression.slope * xDomain[0]],
      [xDomain[1], regression.slope * xDomain[1]]
    ], { stroke: "#c44", strokeWidth: 1, strokeDasharray: "5,3" }) : null,

    // R² très léger (optionnel, avec protection NaN)
    showRegression && regression && !isNaN(regression.r2) ? Plot.text([[xDomain[1] * 0.85, yDomain[0] * 0.85]], {
      text: [`R²=${regression.r2.toFixed(2)}`],
      fontSize: 9,
      fill: "#999",
      fontStyle: "italic"
    }) : null,

    // Points
    Plot.dot(validData, {
      x: xCol,
      y: yCol,
      r: getRadius,
      fill: d => isSelected(d) ? "#ffee00" : getColor(d),
      fillOpacity,
      stroke: d => isSelected(d) ? "#ff0040" : "#555",
      strokeWidth: d => isSelected(d) ? 5 : 0.5,
      title: getTooltip
    }),

    // Labels pour Top5/Bottom5 avec anti-collision
    ...(labelCodes.length > 0 ? (() => {
      const labelData = validData.filter(d => labelCodes.includes(d.code));

      // Calcul positions et filtrage anti-collision
      const xScale = d3.scaleLinear().domain(xDomain).range([60, width - 20]);
      const yScale = d3.scaleLinear().domain(yDomain).range([height - 50, 20]);

      const positioned = labelData.map(d => ({
        ...d,
        _px: xScale(d[xCol]),
        _py: yScale(d[yCol]),
        _r: getRadius(d)
      })).filter(d => !isNaN(d._px) && !isNaN(d._py));

      // Greedy anti-collision : garder labels qui ne chevauchent pas
      // La bounding box se réduit quand on zoome → plus de labels visibles
      const filtered = [];
      const BBOX_W = 70 / zoomFactor, BBOX_H = 28 / zoomFactor;

      for (const item of positioned) {
        const overlaps = filtered.some(existing => {
          const dx = Math.abs(item._px - existing._px);
          const dy = Math.abs(item._py - existing._py);
          return dx < BBOX_W && dy < BBOX_H;
        });
        if (!overlaps) filtered.push(item);
      }

      return [Plot.text(filtered, {
        x: xCol,
        y: yCol,
        text: d => {
          const name = (d.libelle || d.code).substring(0, 10);
          const xVal = d[xCol]?.toFixed(1);
          const yVal = d[yCol]?.toFixed(1);
          if (labelMode === "names") return name;
          if (labelMode === "values") return `${xVal}/${yVal}`;
          return `${name}\n${xVal}/${yVal}`;
        },
        fontSize: 8,
        fontWeight: 500,
        fill: "#374151",
        stroke: "white",
        strokeWidth: 2.5,
        dy: d => -getRadius(d) - 4,
        textAnchor: "middle",
        lineHeight: 1.1
      })];
    })() : [])
  ].filter(Boolean);

  // Ticks: utiliser custom si fourni, sinon calculer entiers tous les 1
  const xTicks = customXTicks || d3.range(Math.ceil(xDomain[0]), Math.floor(xDomain[1]) + 1, 1);
  const yTicks = customYTicks || d3.range(Math.ceil(yDomain[0]), Math.floor(yDomain[1]) + 1, 1);

  return Plot.plot({
    grid: true,
    style: { fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#444" },
    x: { label: xLabel, domain: xDomain, labelOffset: 40, labelFontSize: 13, labelFontWeight: 600, ticks: xTicks },
    y: { label: yLabel, domain: yDomain, labelFontSize: 13, labelFontWeight: 600, ticks: yTicks },
    marginBottom: 50,
    marginTop: 10,
    marks,
    width,
    height
  });
}

/**
 * Crée un conteneur scatter avec titre, légende en dessous, scroll zoom et boutons
 *
 * @param {Object} config - Config pour renderScatter + options supplémentaires
 * @param {string} config.title - Titre affiché en haut
 * @param {Array} config.legend - [{label, color}] pour légende (sous le titre)
 * @param {string} [config.sizeLabel] - Label pour taille bulles (ex: "Population")
 * @returns {HTMLElement} Container avec titre, légende, scatter, scroll zoom et boutons
 */
export function createScatterWithZoom(config) {
  const {
    title = "Scatter Plot",
    legend = [],
    sizeLabel = "Taille = valeur",
    ...scatterConfig
  } = config;

  // Stocker domaines originaux pour reset
  const originalXDomain = [...scatterConfig.xDomain];
  const originalYDomain = [...scatterConfig.yDomain];
  let currentXDomain = [...originalXDomain];
  let currentYDomain = [...originalYDomain];

  // Container principal aligné sur cards-row (820px, margin-left 16px)
  const container = document.createElement("div");
  container.style.cssText = "position:relative;background:white;border:1px solid #e5e7eb;border-radius:4px;padding:12px;margin:8px 0;max-width:820px;margin-left:16px;margin-right:auto;";

  // Header row: titre à gauche, boutons à droite
  const headerRow = document.createElement("div");
  headerRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;";

  // Titre
  const titleEl = document.createElement("h3");
  titleEl.style.cssText = "margin:0;font-size:14px;font-weight:600;color:#1f2937;";
  titleEl.textContent = title;
  headerRow.appendChild(titleEl);

  // Boutons zoom (à droite du titre)
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "display:flex;gap:4px;";

  const zoomInBtn = document.createElement("button");
  zoomInBtn.textContent = "🔍+";
  zoomInBtn.style.cssText = "padding:2px 6px;font-size:11px;border:1px solid #d1d5db;border-radius:4px;background:#f9fafb;cursor:pointer;";
  zoomInBtn.title = "Zoom avant";

  const zoomOutBtn = document.createElement("button");
  zoomOutBtn.textContent = "🔍−";
  zoomOutBtn.style.cssText = "padding:2px 6px;font-size:11px;border:1px solid #d1d5db;border-radius:4px;background:#f9fafb;cursor:pointer;";
  zoomOutBtn.title = "Zoom arrière";

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "↺";
  resetBtn.style.cssText = "padding:2px 6px;font-size:11px;border:1px solid #d1d5db;border-radius:4px;background:#f9fafb;cursor:pointer;";
  resetBtn.title = "Reset zoom";

  btnContainer.appendChild(zoomInBtn);
  btnContainer.appendChild(zoomOutBtn);
  btnContainer.appendChild(resetBtn);
  headerRow.appendChild(btnContainer);

  container.appendChild(headerRow);

  // Légende en dessous du titre (nouvelle ligne)
  if (legend.length > 0) {
    const legendEl = document.createElement("div");
    legendEl.style.cssText = "display:flex;gap:12px;font-size:11px;color:#6b7280;align-items:center;margin-bottom:8px;flex-wrap:wrap;";
    legend.forEach(item => {
      const span = document.createElement("span");
      span.style.cssText = "display:flex;align-items:center;gap:3px;";
      span.innerHTML = `<span style="display:inline-block;width:10px;height:10px;background:${item.color};border-radius:50%;"></span>${item.label}`;
      legendEl.appendChild(span);
    });
    // Taille bulles
    const sizeSpan = document.createElement("span");
    sizeSpan.style.cssText = "color:#9ca3af;margin-left:8px;";
    sizeSpan.textContent = sizeLabel;
    legendEl.appendChild(sizeSpan);
    container.appendChild(legendEl);
  }

  // Container pour le plot (pour scroll zoom)
  const plotContainer = document.createElement("div");
  plotContainer.style.cssText = "position:relative;";
  container.appendChild(plotContainer);

  // Fonction pour redessiner le scatter
  const redraw = () => {
    plotContainer.innerHTML = "";
    // Zoom factor = ratio domaine original / domaine courant (moyenne X et Y)
    const xZoom = (originalXDomain[1] - originalXDomain[0]) / (currentXDomain[1] - currentXDomain[0]);
    const yZoom = (originalYDomain[1] - originalYDomain[0]) / (currentYDomain[1] - currentYDomain[0]);
    const zoomFactor = Math.max(1, (xZoom + yZoom) / 2);  // minimum 1 (pas de réduction)

    const scatter = renderScatter({
      ...scatterConfig,
      xDomain: currentXDomain,
      yDomain: currentYDomain,
      zoomFactor
    });
    plotContainer.appendChild(scatter);

    // Ajouter scroll zoom D3 sur le SVG
    addScrollZoom(scatter);
  };

  // Scroll zoom D3 (comme les cartes)
  const addScrollZoom = (svg) => {
    if (!svg) return;

    const d3svg = d3.select(svg);

    // Créer un groupe pour contenir tout le contenu si pas déjà fait
    let contentGroup = d3svg.select("g.scatter-zoom-content");
    if (contentGroup.empty()) {
      contentGroup = d3svg.append("g").attr("class", "scatter-zoom-content");
      const children = svg.childNodes;
      const toMove = [];
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child !== contentGroup.node() && child.nodeType === 1) {
          toMove.push(child);
        }
      }
      toMove.forEach(child => contentGroup.node().appendChild(child));
    }

    // Zoom D3 avec wheel
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        contentGroup.attr("transform", event.transform);
      });

    d3svg.call(zoom);

    // Stocker ref pour reset
    svg._zoomBehavior = zoom;
    svg._d3svg = d3svg;
  };

  // Zoom in (bouton)
  zoomInBtn.addEventListener("click", () => {
    const xRange = currentXDomain[1] - currentXDomain[0];
    const yRange = currentYDomain[1] - currentYDomain[0];
    const xCenter = (currentXDomain[0] + currentXDomain[1]) / 2;
    const yCenter = (currentYDomain[0] + currentYDomain[1]) / 2;
    currentXDomain = [xCenter - xRange * 0.35, xCenter + xRange * 0.35];
    currentYDomain = [yCenter - yRange * 0.35, yCenter + yRange * 0.35];
    redraw();
  });

  // Zoom out (bouton)
  zoomOutBtn.addEventListener("click", () => {
    const xRange = currentXDomain[1] - currentXDomain[0];
    const yRange = currentYDomain[1] - currentYDomain[0];
    const xCenter = (currentXDomain[0] + currentXDomain[1]) / 2;
    const yCenter = (currentYDomain[0] + currentYDomain[1]) / 2;
    currentXDomain = [xCenter - xRange * 0.7, xCenter + xRange * 0.7];
    currentYDomain = [yCenter - yRange * 0.7, yCenter + yRange * 0.7];
    redraw();
  });

  // Reset
  resetBtn.addEventListener("click", () => {
    currentXDomain = [...originalXDomain];
    currentYDomain = [...originalYDomain];
    redraw();
  });

  // Dessin initial
  redraw();

  return container;
}

/**
 * Ajoute des click handlers aux cercles d'un scatter plot
 * (à appeler après avoir display() le plot)
 *
 * @param {Object} scatterPlot - L'objet Plot retourné par renderScatter
 * @param {Array} filteredData - Les données filtrées (même ordre que les cercles)
 * @param {Function} onClick - Callback (code) => void quand un point est cliqué
 */
export function addScatterClickHandlers(scatterPlot, filteredData, onClick) {
  scatterPlot.querySelectorAll("circle").forEach((circle, i) => {
    if (i < filteredData.length) {
      circle.style.cursor = "pointer";
      circle.addEventListener("click", () => {
        onClick(filteredData[i].code);
      });
    }
  });
}

// &e
