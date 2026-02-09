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
    labelCodes = [],
    labelMode = "both",
    zoomFactor = 1
  } = config;

  const validData = data.filter(d => d[xCol] != null && d[yCol] != null);

  const marks = [
    // Axes 0 en GRIS
    Plot.ruleX([0], { stroke: "#555", strokeWidth: 1 }),
    Plot.ruleY([0], { stroke: "#555", strokeWidth: 1 }),

    // Bissectrice y=x fine et discrète
    (!isNaN(xDomain[0]) && !isNaN(xDomain[1]) && !isNaN(yDomain[0]) && !isNaN(yDomain[1])) ? Plot.line([
      [Math.max(xDomain[0], yDomain[0]), Math.max(xDomain[0], yDomain[0])],
      [Math.min(xDomain[1], yDomain[1]), Math.min(xDomain[1], yDomain[1])]
    ], { stroke: "#aaa", strokeWidth: 0.8, strokeDasharray: "4,4" }) : null,

    // Moyennes France en GRIS pointillé
    !isNaN(meanX) ? Plot.ruleX([meanX], { stroke: "#888", strokeWidth: 1, strokeDasharray: "4,3" }) : null,
    !isNaN(meanY) ? Plot.ruleY([meanY], { stroke: "#888", strokeWidth: 1, strokeDasharray: "4,3" }) : null,
    !isNaN(meanX) && !isNaN(yDomain[1]) ? Plot.text([[meanX, yDomain[1] * 0.95]], {
      text: [`Moy ${meanX?.toFixed(2)}`],
      fontSize: 10, fill: "#555", textAnchor: "start", dx: 3
    }) : null,
    !isNaN(meanY) && !isNaN(xDomain[1]) ? Plot.text([[xDomain[1] * 0.95, meanY]], {
      text: [`Moy ${meanY?.toFixed(2)}`],
      fontSize: 10, fill: "#555", textAnchor: "end", dy: -5
    }) : null,

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
      const xScale = d3.scaleLinear().domain(xDomain).range([60, width - 20]);
      const yScale = d3.scaleLinear().domain(yDomain).range([height - 50, 20]);

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

  const xTicks = customXTicks || d3.range(Math.ceil(xDomain[0]), Math.floor(xDomain[1]) + 1, 1);
  const yTicks = customYTicks || d3.range(Math.ceil(yDomain[0]), Math.floor(yDomain[1]) + 1, 1);

  const plot = Plot.plot({
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
    legend = [],
    sizeLabel = "Taille = valeur",
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
  container.style.cssText = "position:relative;background:white;border:none;border-radius:0;padding:8px 0 8px 0;margin:8px 0 8px 0;width:830px;";
  const origStyle = container.style.cssText;

  // --- Header : titre + boutons ---
  const headerRow = document.createElement("div");
  headerRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;";

  const titleEl = document.createElement("h3");
  titleEl.style.cssText = "margin:0;font-size:14px;font-weight:600;color:#1f2937;";
  titleEl.textContent = title;
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

  // --- Légende ---
  if (legend.length > 0) {
    const legendEl = document.createElement("div");
    legendEl.style.cssText = "display:flex;gap:12px;font-size:11px;color:#6b7280;align-items:center;margin-bottom:8px;flex-wrap:wrap;padding-left:8px;";
    legend.forEach(item => {
      const span = document.createElement("span");
      span.style.cssText = "display:flex;align-items:center;gap:3px;";
      span.innerHTML = `<span style="display:inline-block;width:10px;height:10px;background:${item.color};border-radius:50%;"></span>${item.label}`;
      legendEl.appendChild(span);
    });
    const sizeSpan = document.createElement("span");
    sizeSpan.style.cssText = "color:#9ca3af;margin-left:8px;";
    sizeSpan.textContent = sizeLabel;
    legendEl.appendChild(sizeSpan);
    container.appendChild(legendEl);
  }

  // --- Plot container + tooltip ---
  const plotContainer = document.createElement("div");
  plotContainer.style.cssText = "position:relative;";
  container.appendChild(plotContainer);

  const tooltip = document.createElement("div");
  tooltip.style.cssText = "display:none;position:absolute;background:rgba(255,255,255,0.97);border:1px solid #d1d5db;border-radius:4px;padding:6px 10px;font-size:12px;color:#1f2937;pointer-events:none;z-index:20;box-shadow:0 2px 8px rgba(0,0,0,0.12);white-space:pre-line;line-height:1.4;max-width:240px;";
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

    // --- Tooltip event delegation sur circles ---
    const validData = scatter._tipData;
    if (validData && scatterConfig.getTooltip) {
      scatter.style.cursor = "grab";
      scatter.addEventListener("mousemove", (e) => {
        if (isDragging) { tooltip.style.display = "none"; return; }
        const circle = e.target.closest("circle");
        if (!circle) { tooltip.style.display = "none"; return; }
        const circles = Array.from(scatter.querySelectorAll("circle"));
        const idx = circles.indexOf(circle);
        if (idx < 0 || idx >= validData.length) { tooltip.style.display = "none"; return; }
        const d = validData[idx];
        circle.style.cursor = "pointer";
        tooltip.innerHTML = scatterConfig.getTooltip(d).replace(/\n/g, "<br>");
        tooltip.style.display = "block";
        const rect = plotContainer.getBoundingClientRect();
        let x = e.clientX - rect.left + 14;
        let y = e.clientY - rect.top - 30;
        if (x + 220 > rect.width) x = e.clientX - rect.left - 230;
        if (y < 0) y = e.clientY - rect.top + 14;
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
    // Marges approximatives Plot (marginLeft ~55, marginTop 10, marginRight ~20, marginBottom 50)
    const ml = 55, mt = 10, mr = 20, mb = 50;
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
      const ml = 55, mt = 10, mr = 20, mb = 50;
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
 * Ajoute des click handlers aux cercles d'un scatter plot
 *
 * @param {Object} scatterPlot - L'objet Plot retourné par renderScatter
 * @param {Array} filteredData - Les données filtrées (même ordre que les cercles)
 * @param {Function} onClick - Callback (code) => void
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
