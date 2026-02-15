// ============================================================
// &s SCATTER_aaMAIN — Helper scatter plot paramétré
// ============================================================
// Date: 2026-01-22 | v2: 2026-02-02
// Scatter configurable avec axes 0, moyennes, régression, bissectrice
// v2: tooltip HTML custom, scroll domain zoom, fullscreen modal, labels progressifs
//
// Exports:
// - renderScatter(config) → Plot.plot() object
// - createScatterWithZoom(config) → container avec zoom/tooltip/fullscreen
// - addScatterClickHandlers(plot, data, onClick) → void

import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import { INDICATEURS, getSource } from "./indicators-ddict-js.js";
import { parseColKey } from "./indicators-ddict-ext.js";

// ============================================================
// &s RENDER — Génération scatter plot
// ============================================================

/**
 * Génère un scatter plot configurable
 *
 * @param {Object} config
 * @param {Array} config.data - Données
 * @param {string} config.xCol - Colonne X
 * @param {string} config.yCol - Colonne Y
 * @param {number[]} config.xDomain - Domaine X [min, max]
 * @param {number[]} config.yDomain - Domaine Y [min, max]
 * @param {string} config.xLabel - Label axe X
 * @param {string} config.yLabel - Label axe Y
 * @param {number} config.meanX - Moyenne X
 * @param {number} config.meanY - Moyenne Y
 * @param {Object} [config.regression] - { slope, r2 }
 * @param {boolean} [config.showRegression=false]
 * @param {Function} config.getRadius - (d) => radius
 * @param {Function} config.getColor - (d) => color
 * @param {Function} config.isSelected - (d) => boolean
 * @param {Function} config.getTooltip - (d) => string
 * @param {boolean} [config._customTooltip=false] - Supprimer title natif (tooltip custom)
 * @param {boolean} [config.showNegativeBands=false] - Bandes rouges zones négatives
 * @param {number} [config.maxTicks=12] - Cap ticks max par axe (évite surcharge au zoom)
 * @param {number} [config.fillOpacity=0.85]
 * @param {number} [config.width=540]
 * @param {number} [config.height=440]
 * @param {Array} [config.labelCodes=[]] - Codes à labelliser
 * @param {string} [config.labelMode="both"]
 * @param {number} [config.zoomFactor=1] - Facteur zoom pour collision
 * @returns {Object} Plot.plot() object (._tipData = validData filtré)
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
    meanX,
    meanY,
    regression = null,
    showRegression = false,
    getRadius,
    getColor,
    isSelected = () => false,
    getTooltip,
    _customTooltip = false,
    fillOpacity = 0.85,
    width = 540,
    height = 440,
    xTicks: customXTicks = null,
    yTicks: customYTicks = null,
    xUnit = "",
    yUnit = "",
    showNegativeBands = false,
    maxTicks = 12,
    labelCodes = [],
    labelMode = "both",
    zoomFactor = 1,
    annotations = [],
    quadrantRects = [],
    marginRight = 16
  } = config;

  const validData = data.filter(d => d[xCol] != null && d[yCol] != null);

  const marks = [
    // Quadrant background tints (subtle colored rectangles behind data)
    ...quadrantRects.map(r => Plot.rect([r], { x1: "x1", x2: "x2", y1: "y1", y2: "y2", fill: r.fill, stroke: "none" })),

    // Bandes rouges zones négatives (optionnel)
    showNegativeBands && xDomain[0] < 0 && xDomain[1] > 0 ? Plot.rectX([{ x1: xDomain[0], x2: 0, y1: yDomain[0], y2: yDomain[1] }], { x1: "x1", x2: "x2", y1: "y1", y2: "y2", fill: "#fef2f2", fillOpacity: 0.5 }) : null,
    showNegativeBands && yDomain[0] < 0 && yDomain[1] > 0 ? Plot.rectY([{ x1: xDomain[0], x2: xDomain[1], y1: yDomain[0], y2: 0 }], { x1: "x1", x2: "x2", y1: "y1", y2: "y2", fill: "#fef2f2", fillOpacity: 0.5 }) : null,

    // Axes 0 renforcés (visibles si le domaine traverse zéro)
    (xDomain[0] < 0 && xDomain[1] > 0) ? Plot.ruleX([0], { stroke: "#94a3b8", strokeWidth: 1 }) : null,
    (yDomain[0] < 0 && yDomain[1] > 0) ? Plot.ruleY([0], { stroke: "#94a3b8", strokeWidth: 1 }) : null,

    // Bissectrice y=x (fine, discrète)
    (!isNaN(xDomain[0]) && !isNaN(yDomain[0])) ? Plot.line([
      [Math.max(xDomain[0], yDomain[0]), Math.max(xDomain[0], yDomain[0])],
      [Math.min(xDomain[1], yDomain[1]), Math.min(xDomain[1], yDomain[1])]
    ], { stroke: "#e5e7eb", strokeWidth: 0.6, strokeDasharray: "3,3" }) : null,

    // Moyennes France — lignes de référence quadrants (bien visibles)
    !isNaN(meanX) ? Plot.ruleX([meanX], { stroke: "#374151", strokeWidth: 1, strokeDasharray: "8,4" }) : null,
    !isNaN(meanY) ? Plot.ruleY([meanY], { stroke: "#374151", strokeWidth: 1, strokeDasharray: "8,4" }) : null,

    // Régression par origine
    showRegression && regression && !isNaN(regression.slope) && isFinite(regression.slope) ? Plot.line([
      [xDomain[0], regression.slope * xDomain[0]],
      [xDomain[1], regression.slope * xDomain[1]]
    ], { stroke: "#c44", strokeWidth: 1, strokeDasharray: "5,3" }) : null,

    // R²
    showRegression && regression && !isNaN(regression.r2) ? Plot.text([[xDomain[1] * 0.85, yDomain[0] * 0.85]], {
      text: [`R²=${regression.r2.toFixed(2)}`],
      fontSize: 9, fill: "#999", fontStyle: "italic"
    }) : null,

    // Points (sans title natif si tooltip custom)
    Plot.dot(validData, {
      x: xCol,
      y: yCol,
      r: getRadius,
      fill: d => isSelected(d) ? "#ffee00" : getColor(d),
      fillOpacity,
      stroke: d => isSelected(d) ? "#ff0040" : "#555",
      strokeWidth: d => isSelected(d) ? 5 : 0.5,
      ...(!_customTooltip ? { title: getTooltip } : {})
    }),

    // Labels avec anti-collision
    ...(labelCodes.length > 0 ? (() => {
      const labelData = validData.filter(d => labelCodes.includes(d.code));
      const xScale = d3.scaleLinear().domain(xDomain).range([60, width - marginRight]);
      const yScale = d3.scaleLinear().domain(yDomain).range([height - 52, 20]);

      const positioned = labelData.map(d => ({
        ...d,
        _px: xScale(d[xCol]),
        _py: yScale(d[yCol]),
        _r: getRadius(d)
      })).filter(d => !isNaN(d._px) && !isNaN(d._py));

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
          const name = (d.libelle || d.code).substring(0, 12);
          const xVal = d[xCol]?.toFixed(1);
          const yVal = d[yCol]?.toFixed(1);
          if (labelMode === "names" || labelMode === "noms") return name;
          if (labelMode === "values" || labelMode === "val.") return `${xVal}/${yVal}`;
          return `${name}\n${xVal}/${yVal}`;
        },
        fontSize: 9,
        fontWeight: 500,
        fill: "#374151",
        stroke: "white",
        strokeWidth: 2.5,
        dy: d => -getRadius(d) - 4,
        textAnchor: "middle",
        lineHeight: 1.1
      })];
    })() : []),

    // Annotations quadrant (texte positionné dans chaque zone)
    ...(annotations.map(ann => Plot.text([[ann.x, ann.y]], {
      text: [ann.text],
      fontSize: ann.fontSize || 13,
      fill: ann.color || "#6b7280",
      fontWeight: ann.fontWeight || 600,
      fontStyle: ann.fontStyle || "italic",
      textAnchor: ann.textAnchor || "middle",
      pointerEvents: "none"
    })))
  ].filter(Boolean);

  // Ticks adaptatifs avec cap pixel-aware (évite surcharge au zoom)
  const autoTicks = (domain, axisPixels) => {
    const span = domain[1] - domain[0];
    if (span <= 0) return undefined;
    // Cap basé sur pixels disponibles (~60px min entre ticks)
    const pixelCap = axisPixels ? Math.max(3, Math.floor(axisPixels / 60)) : maxTicks;
    const cap = Math.min(maxTicks, pixelCap);
    let step = Math.pow(10, Math.floor(Math.log10(span))) * (span > 50 ? 2 : span > 10 ? 1 : span > 2 ? 0.5 : 0.2);
    // Si trop de ticks, doubler le step jusqu'au cap
    let ticks = d3.range(Math.ceil(domain[0] / step) * step, domain[1] + step * 0.01, step);
    while (ticks.length > cap && step < span) { step *= 2; ticks = d3.range(Math.ceil(domain[0] / step) * step, domain[1] + step * 0.01, step); }
    return ticks;
  };
  const xAxisPx = width - 60 - marginRight;   // width - marginLeft - marginRight
  const yAxisPx = height - 52 - 10;  // height - marginBottom - marginTop
  const xTicks = customXTicks || autoTicks(xDomain, xAxisPx);
  const yTicks = customYTicks || autoTicks(yDomain, yAxisPx);

  // Labels avec unité ddict
  const xLabelFull = xUnit ? `${xLabel} (${xUnit})` : xLabel;
  const yLabelFull = yUnit ? `${yLabel} (${yUnit})` : yLabel;

  const plot = Plot.plot({
    grid: true,
    r: { type: "identity" },
    style: { fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#333" },
    x: { label: xLabelFull, domain: xDomain, labelOffset: 42, labelAnchor: "right", line: true, ticks: xTicks, labelArrow: "none", fontSize: 12 },
    y: { label: yLabelFull, domain: yDomain, labelAnchor: "top", line: true, ticks: yTicks, labelArrow: "none", fontSize: 12 },
    marginBottom: 52,
    marginTop: 10,
    marginLeft: 60,
    marginRight,
    marks,
    width,
    height
  });

  // Stocker données filtrées pour tooltip custom et click handlers
  plot._tipData = validData;

  return plot;
}

// &e

// ============================================================
// &s CONTAINER — Conteneur scatter avec zoom/tooltip/fullscreen
// ============================================================

/**
 * Crée un conteneur scatter complet avec:
 * - Titre + légende
 * - Tooltip HTML custom (remplace title natif)
 * - Scroll wheel zoom (domain-based, recalcule grille/labels)
 * - Boutons zoom +/−/reset/fullscreen
 * - Popup modale plein écran (re-render dimensions adaptées)
 *
 * @param {Object} config - Config renderScatter + options wrapper
 * @param {string} config.title - Titre affiché en haut
 * @param {Array} config.legend - [{label, color}]
 * @param {string} [config.sizeLabel] - Label taille bulles
 * @returns {HTMLElement} Container complet
 */
export function createScatterWithZoom(config) {
  const {
    title = "Scatter Plot",
    subtitle = null,
    legend = [],
    sizeLabel = "Taille = valeur",
    sourceText = null,
    ...scatterConfig
  } = config;

  const originalXDomain = [...scatterConfig.xDomain];
  const originalYDomain = [...scatterConfig.yDomain];
  let currentXDomain = [...originalXDomain];
  let currentYDomain = [...originalYDomain];
  let isModal = false;
  let modalCleanup = null;
  let isDragging = false;

  // --- Container principal ---
  const container = document.createElement("div");
  container.className = "scatter-container";
  container.style.cssText = "position:relative;background:white;border:none;border-radius:0;padding:8px 0 8px 8px;margin:8px 0 8px 0;width:830px;";
  const origStyle = container.style.cssText;

  // --- Header : titre + boutons ---
  const headerRow = document.createElement("div");
  headerRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;";

  const titleEl = document.createElement("div");
  titleEl.style.cssText = "margin:0;";

  // Titre principal (div, pas h3 — évite overrides CSS Observable)
  const titleH3 = document.createElement("div");
  titleH3.className = "map-title";
  titleH3.textContent = title;
  titleEl.appendChild(titleH3);

  // Sous-titre : count + source (même format que carte)
  let _srcText = sourceText;
  if (!_srcText) {
    const _xIndic = scatterConfig.xCol ? parseColKey(scatterConfig.xCol).indic : null;
    const _yIndic = scatterConfig.yCol ? parseColKey(scatterConfig.yCol).indic : null;
    const _sources = [...new Set([_xIndic, _yIndic].filter(Boolean).map(k => getSource(k)).filter(Boolean))];
    if (_sources.length > 0) _srcText = _sources.join(", ");
  }
  const subParts = [subtitle, _srcText ? `<span class="map-source-line">· ${_srcText}</span>` : ""].filter(Boolean);
  if (subParts.length > 0) {
    const srcEl = document.createElement("div");
    srcEl.className = "map-subtitle";
    srcEl.innerHTML = subParts.join(" ");
    titleEl.appendChild(srcEl);
  }

  headerRow.appendChild(titleEl);

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:4px;align-items:center;";

  const mkBtn = (text, tip, extra = "") => {
    const b = document.createElement("button");
    b.textContent = text;
    b.title = tip;
    b.style.cssText = "padding:2px 7px;font-size:12px;border:1px solid #d1d5db;border-radius:4px;background:#f9fafb;cursor:pointer;line-height:1.2;" + extra;
    return b;
  };

  const zoomInBtn = mkBtn("+", "Zoom avant");
  const zoomOutBtn = mkBtn("−", "Zoom arrière");
  const resetBtn = mkBtn("⌂", "Reset zoom");
  const expandBtn = mkBtn("⤢", "Plein écran", "font-size:15px;");

  [zoomInBtn, zoomOutBtn, resetBtn, expandBtn].forEach(b => btnRow.appendChild(b));
  headerRow.appendChild(btnRow);
  container.appendChild(headerRow);

  // --- Réserver espace à droite pour la légende (dans la marge SVG) ---
  const _hasLegend = legend.length > 0 || sizeLabel instanceof HTMLElement || sizeLabel instanceof DocumentFragment;
  if (_hasLegend) {
    scatterConfig.marginRight = 150;
  }

  // --- Content row : plot + légende overlay ---
  const contentRow = document.createElement("div");
  contentRow.style.cssText = "position:relative;";

  // --- Plot container + tooltip ---
  const plotContainer = document.createElement("div");
  plotContainer.style.cssText = "position:relative;";
  contentRow.appendChild(plotContainer);

  // --- Légende dans la marge droite du SVG (pas sur le quadrillage) ---
  if (_hasLegend) {
    const legendWrap = document.createElement("div");
    legendWrap.className = "scatter-legend-wrap";
    legendWrap.style.cssText = "position:absolute;top:6px;right:4px;padding:2px 4px;font-size:10px;color:#4b5563;line-height:1.5;background:none;border:none;border-radius:3px;z-index:5;";
    // Couleurs
    if (legend.length > 0) {
      legend.forEach(item => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:5px;white-space:nowrap;";
        row.innerHTML = `<span style="display:inline-block;width:10px;height:10px;background:${item.color};border-radius:50%;flex-shrink:0;border:0.5px solid rgba(0,0,0,0.15);"></span>${item.label}`;
        legendWrap.appendChild(row);
      });
    }
    // Séparateur + taille
    if (sizeLabel instanceof HTMLElement || sizeLabel instanceof DocumentFragment) {
      if (legend.length > 0) {
        const sep = document.createElement("div");
        sep.style.cssText = "border-top:1px solid #e5e7eb;margin:6px 0 4px;";
        legendWrap.appendChild(sep);
      }
      legendWrap.appendChild(sizeLabel);
    }
    contentRow.appendChild(legendWrap);
  }
  container.appendChild(contentRow);

  const tooltip = document.createElement("div");
  tooltip.style.cssText = "display:none;position:fixed;background:rgba(15,23,42,0.92);border:1px solid #374151;border-radius:5px;padding:8px 11px;font-size:11.5px;color:#e2e8f0;pointer-events:none;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.3);white-space:normal;line-height:1.5;max-width:300px;";
  plotContainer.appendChild(tooltip);

  // --- Dimensions selon mode ---
  const getDims = () => {
    if (isModal) {
      const w = Math.min(window.innerWidth * 0.88 - 48, 1400);
      const h = Math.max(window.innerHeight * 0.78 - 80, 300);
      return { width: Math.round(w), height: Math.round(h) };
    }
    return { width: scatterConfig.width || 790, height: scatterConfig.height || 400 };
  };

  // --- Redraw : re-render scatter complet ---
  let currentPlot = null;
  const redraw = () => {
    // Conserver tooltip, vider le reste
    const children = Array.from(plotContainer.children);
    children.forEach(c => { if (c !== tooltip) c.remove(); });

    const dims = getDims();
    const xZoom = (originalXDomain[1] - originalXDomain[0]) / (currentXDomain[1] - currentXDomain[0]);
    const yZoom = (originalYDomain[1] - originalYDomain[0]) / (currentYDomain[1] - currentYDomain[0]);
    const zoomFactor = Math.max(1, (xZoom + yZoom) / 2);

    // Progressive labels: expand candidates based on zoom level (like maps)
    const baseLabelCodes = scatterConfig.labelCodes || [];
    const MAX_BASE = Math.max(baseLabelCodes.length, 8);
    const maxLabels = Math.round(MAX_BASE + 15 * Math.log2(Math.max(1, zoomFactor)));
    const allByPop = scatterConfig.data
      .filter(d => d[scatterConfig.xCol] != null && d[scatterConfig.yCol] != null)
      .sort((a, b) => (b.P23_POP || 0) - (a.P23_POP || 0));
    const dynamicLabels = [...baseLabelCodes];
    for (const d of allByPop) {
      if (dynamicLabels.length >= maxLabels) break;
      if (!dynamicLabels.includes(d.code)) dynamicLabels.push(d.code);
    }

    // Bulles grossissent avec le zoom (facteur amorti logarithmique)
    const radiusBoost = 1 + 0.4 * Math.log2(Math.max(1, zoomFactor));
    const boostedGetRadius = scatterConfig.getRadius
      ? (d) => scatterConfig.getRadius(d) * radiusBoost
      : undefined;

    const scatter = renderScatter({
      ...scatterConfig,
      xDomain: currentXDomain,
      yDomain: currentYDomain,
      width: dims.width,
      height: dims.height,
      zoomFactor,
      labelCodes: dynamicLabels,
      _customTooltip: true,
      ...(boostedGetRadius ? { getRadius: boostedGetRadius } : {})
    });
    plotContainer.insertBefore(scatter, tooltip);
    currentPlot = scatter;

    // --- Tooltip via Delaunay spatial lookup (pas d'index SVG — Plot regroupe circles par fill) ---
    const validData = scatter._tipData;
    if (validData && scatterConfig.getTooltip) {
      scatter.style.cursor = "grab";
      const xSI = scatter.scale("x"), ySI = scatter.scale("y");
      const xSF = d3.scaleLinear().domain(xSI.domain).range(xSI.range);
      const ySF = d3.scaleLinear().domain(ySI.domain).range(ySI.range);
      const pts = validData.map(d => [
        xSF(d[scatterConfig.xCol]),
        ySF(d[scatterConfig.yCol])
      ]);
      const delaunay = d3.Delaunay.from(pts);

      scatter.addEventListener("mousemove", (e) => {
        if (isDragging) { tooltip.style.display = "none"; return; }
        const [mx, my] = d3.pointer(e, scatter);
        const idx = delaunay.find(mx, my);
        if (idx < 0 || idx >= pts.length) { tooltip.style.display = "none"; return; }
        const dist = Math.hypot(mx - pts[idx][0], my - pts[idx][1]);
        if (dist > 30) { tooltip.style.display = "none"; return; }
        const d = validData[idx];
        tooltip.innerHTML = scatterConfig.getTooltip(d).replace(/\n/g, "<br>");
        tooltip.style.display = "block";
        const tipRect = tooltip.getBoundingClientRect();
        let x = e.clientX + 14;
        let y = e.clientY - tipRect.height - 8;
        if (x + tipRect.width > window.innerWidth - 8) x = e.clientX - tipRect.width - 14;
        if (y < 0) y = e.clientY + 14;
        tooltip.style.left = x + "px";
        tooltip.style.top = y + "px";
      });
      scatter.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });
    }

    // --- Labels text pointer-events none (ne bloquent pas hover circles) ---
    scatter.querySelectorAll("text").forEach(t => { t.style.pointerEvents = "none"; });
  };

  // --- Scroll zoom : domain-based (recalcule grille/labels à chaque step) ---
  let wheelRAF = null;
  plotContainer.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = plotContainer.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const dims = getDims();
    const ml = 60, mt = 10, mr = 16, mb = 52;
    const pw = dims.width - ml - mr;
    const ph = dims.height - mt - mb;

    // Position curseur en fraction de l'axe (0=left/top, 1=right/bottom)
    const xFrac = Math.max(0, Math.min(1, (mx - ml) / pw));
    const yFrac = Math.max(0, Math.min(1, (my - mt) / ph));

    // Zoom centré sur position curseur
    const zDir = e.deltaY < 0 ? 0.85 : 1.18;
    const xRange = (currentXDomain[1] - currentXDomain[0]) * zDir;
    const yRange = (currentYDomain[1] - currentYDomain[0]) * zDir;

    const xData = currentXDomain[0] + xFrac * (currentXDomain[1] - currentXDomain[0]);
    const yData = currentYDomain[1] - yFrac * (currentYDomain[1] - currentYDomain[0]);

    currentXDomain = [xData - xFrac * xRange, xData + (1 - xFrac) * xRange];
    currentYDomain = [yData - (1 - yFrac) * yRange, yData + yFrac * yRange];

    // Clamp : pas plus de 1.5x le domaine original
    const maxXRange = (originalXDomain[1] - originalXDomain[0]) * 1.5;
    const maxYRange = (originalYDomain[1] - originalYDomain[0]) * 1.5;
    if (currentXDomain[1] - currentXDomain[0] > maxXRange || currentYDomain[1] - currentYDomain[0] > maxYRange) {
      currentXDomain = [...originalXDomain];
      currentYDomain = [...originalYDomain];
    }

    if (wheelRAF) cancelAnimationFrame(wheelRAF);
    wheelRAF = requestAnimationFrame(redraw);
  }, { passive: false });

  // --- Click+drag pan : shift domain with mouse (like maps) ---
  plotContainer.style.cursor = "grab";
  plotContainer.addEventListener("mousedown", (e) => {
    if (e.target.closest("circle")) return;
    if (e.button !== 0) return;
    isDragging = true;
    const startPos = { x: e.clientX, y: e.clientY };
    const startDomain = { x: [...currentXDomain], y: [...currentYDomain] };
    plotContainer.style.cursor = "grabbing";

    const onMove = (ev) => {
      if (!isDragging) return;
      const dims = getDims();
      const ml = 60, mt = 10, mr = 16, mb = 52;
      const pw = dims.width - ml - mr;
      const ph = dims.height - mt - mb;
      const dx = ev.clientX - startPos.x;
      const dy = ev.clientY - startPos.y;
      const xRange = startDomain.x[1] - startDomain.x[0];
      const yRange = startDomain.y[1] - startDomain.y[0];
      currentXDomain = [startDomain.x[0] - (dx / pw) * xRange, startDomain.x[1] - (dx / pw) * xRange];
      currentYDomain = [startDomain.y[0] + (dy / ph) * yRange, startDomain.y[1] + (dy / ph) * yRange];
      if (wheelRAF) cancelAnimationFrame(wheelRAF);
      wheelRAF = requestAnimationFrame(redraw);
    };

    const onUp = () => {
      isDragging = false;
      plotContainer.style.cursor = "grab";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    e.preventDefault();
  });

  // --- Boutons zoom ---
  zoomInBtn.addEventListener("click", () => {
    const xR = currentXDomain[1] - currentXDomain[0];
    const yR = currentYDomain[1] - currentYDomain[0];
    const xC = (currentXDomain[0] + currentXDomain[1]) / 2;
    const yC = (currentYDomain[0] + currentYDomain[1]) / 2;
    currentXDomain = [xC - xR * 0.35, xC + xR * 0.35];
    currentYDomain = [yC - yR * 0.35, yC + yR * 0.35];
    redraw();
  });

  zoomOutBtn.addEventListener("click", () => {
    const xR = currentXDomain[1] - currentXDomain[0];
    const yR = currentYDomain[1] - currentYDomain[0];
    const xC = (currentXDomain[0] + currentXDomain[1]) / 2;
    const yC = (currentYDomain[0] + currentYDomain[1]) / 2;
    currentXDomain = [xC - xR * 0.7, xC + xR * 0.7];
    currentYDomain = [yC - yR * 0.7, yC + yR * 0.7];
    redraw();
  });

  resetBtn.addEventListener("click", () => {
    currentXDomain = [...originalXDomain];
    currentYDomain = [...originalYDomain];
    redraw();
  });

  // --- Fullscreen modal ---
  expandBtn.addEventListener("click", () => {
    if (isModal) {
      if (modalCleanup) modalCleanup();
      return;
    }
    openModal();
  });

  function openModal() {
    isModal = true;

    // Backdrop
    const backdrop = document.createElement("div");
    backdrop.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0);z-index:9998;transition:background 0.2s;";
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => { backdrop.style.background = "rgba(0,0,0,0.65)"; });

    // Positionner container en modal
    container.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);"
      + "width:90vw;height:84vh;max-width:1500px;z-index:9999;padding:16px;"
      + "background:white;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.3);"
      + "display:flex;flex-direction:column;margin:0;";
    plotContainer.style.cssText = "position:relative;flex:1;min-height:0;";

    // Bouton fermer
    const closeBtn = document.createElement("button");
    closeBtn.className = "scatter-modal-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = "position:absolute;top:8px;right:14px;font-size:26px;background:none;border:none;cursor:pointer;color:#666;z-index:10;line-height:1;";
    container.appendChild(closeBtn);

    expandBtn.textContent = "⤡";
    expandBtn.title = "Réduire";

    redraw();

    const onEsc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onEsc);

    function close() {
      isModal = false;
      modalCleanup = null;
      expandBtn.textContent = "⤢";
      expandBtn.title = "Plein écran";
      closeBtn.remove();
      backdrop.remove();
      document.removeEventListener("keydown", onEsc);
      container.style.cssText = origStyle;
      plotContainer.style.cssText = "position:relative;";
      redraw();
    }

    modalCleanup = close;
    closeBtn.onclick = close;
    backdrop.onclick = close;
  }

  // --- Dessin initial ---
  redraw();

  return container;
}

// &e

// ============================================================
// &s CLICK — Handlers click sur cercles scatter
// ============================================================

/**
 * Ajoute des click handlers aux cercles d'un scatter plot via Delaunay
 *
 * @param {Object} scatterPlot - L'objet Plot retourné par renderScatter
 * @param {Array} filteredData - Les données filtrées
 * @param {Function} onClick - Callback (code) => void
 * @param {string} xCol - Colonne X
 * @param {string} yCol - Colonne Y
 */
export function addScatterClickHandlers(scatterPlot, filteredData, onClick, xCol, yCol) {
  if (!filteredData.length || !xCol || !yCol) return;
  const xSI = scatterPlot.scale("x"), ySI = scatterPlot.scale("y");
  if (!xSI || !ySI) return;
  const xSF = d3.scaleLinear().domain(xSI.domain).range(xSI.range);
  const ySF = d3.scaleLinear().domain(ySI.domain).range(ySI.range);
  const pts = filteredData.map(d => [xSF(d[xCol]), ySF(d[yCol])]);
  const delaunay = d3.Delaunay.from(pts);

  scatterPlot.style.cursor = "pointer";
  scatterPlot.addEventListener("click", (e) => {
    const [mx, my] = d3.pointer(e, scatterPlot);
    const idx = delaunay.find(mx, my);
    if (idx < 0 || idx >= pts.length) return;
    const dist = Math.hypot(mx - pts[idx][0], my - pts[idx][1]);
    if (dist > 30) return;
    onClick(filteredData[idx].code);
  });
}

// &e
