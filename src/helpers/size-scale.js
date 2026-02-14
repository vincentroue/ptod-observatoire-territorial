// &s SIZE_SCALE_aaMAIN - Échelle taille adaptative avec détection outliers IQR

import * as d3 from "npm:d3";
import { html } from "npm:htl";

// &s AUTO_SIZE_SCALE - Calcul bins quantiles + IQR outliers

/**
 * Calcule une échelle de taille adaptative avec détection automatique des outliers.
 * Utilise quantiles + IQR (méthode Tukey) pour séparer valeurs normales et outliers.
 *
 * @param {number[]} values - Tableau de valeurs numériques (ex: populations)
 * @param {Object} [options]
 * @param {string} [options.label="Taille"] - Titre légende
 * @param {number} [options.binsCount=4] - Nombre de bins (normaux + outlier)
 * @param {number[]} [options.rRange=[3,18]] - Range rayons [min, max]
 * @param {number} [options.outlierMultiplier=1.5] - Seuil IQR (1.5 = Tukey standard)
 * @param {number} [options.maxOutlierPct=0.05] - Max 5% outliers
 * @returns {{ getRadius, getStroke, getStrokeWidth, bins, legendElement }}
 */
export function autoSizeScale(values, options = {}) {
  const {
    label = "Taille",
    binsCount: requestedBins = 4,
    rRange = [3, 18],
    outlierMultiplier = 1.5,
    maxOutlierPct = 0.05
  } = options;

  const clean = values.filter(v => v != null && isFinite(v)).sort((a, b) => a - b);
  const n = clean.length;
  if (n === 0) return _fallback(rRange);

  // Nombre de bins adaptatif selon N
  const autoBins = Math.min(requestedBins, Math.max(2, Math.ceil(Math.sqrt(n) / 3)));

  // IQR outlier detection
  const q1 = d3.quantile(clean, 0.25);
  const q3 = d3.quantile(clean, 0.75);
  const iqr = q3 - q1;
  let outlierThreshold = q3 + outlierMultiplier * iqr;

  // Garde-fou : max 5% outliers
  const maxOutlierCount = Math.max(3, Math.floor(n * maxOutlierPct));
  const normalValues = clean.filter(v => v <= outlierThreshold);
  const outlierValues = clean.filter(v => v > outlierThreshold);

  // Si trop d'outliers, remonter le seuil
  let finalOutliers = outlierValues;
  if (outlierValues.length > maxOutlierCount) {
    const cutIdx = n - maxOutlierCount;
    outlierThreshold = clean[cutIdx];
    finalOutliers = clean.slice(cutIdx);
  }

  const hasOutliers = finalOutliers.length > 0;
  const normalBins = hasOutliers ? autoBins - 1 : autoBins;
  const normalData = clean.filter(v => v <= outlierThreshold);

  // Quantiles pour bins normaux
  const thresholds = [];
  for (let i = 1; i < normalBins; i++) {
    thresholds.push(d3.quantile(normalData, i / normalBins));
  }
  if (hasOutliers) thresholds.push(outlierThreshold);

  // Construire les bins
  const bins = [];
  const allThresholds = [clean[0], ...thresholds, clean[n - 1]];
  const rStep = (rRange[1] - rRange[0]) / (autoBins - 1 || 1);

  for (let i = 0; i < autoBins; i++) {
    const lo = i === 0 ? allThresholds[0] : allThresholds[i];
    const hi = i < autoBins - 1 ? allThresholds[i + 1] : allThresholds[allThresholds.length - 1];
    const isOutlier = hasOutliers && i === autoBins - 1;
    // Progression power(1.5) pour que les différences visuelles soient marquées
    const t = autoBins <= 1 ? 1 : i / (autoBins - 1);
    const r = rRange[0] + (rRange[1] - rRange[0]) * Math.pow(t, 1.5);
    const count = clean.filter(v => {
      if (i === 0) return v <= (thresholds[0] ?? Infinity);
      if (i === autoBins - 1) return v > (thresholds[i - 1] ?? -Infinity);
      return v > thresholds[i - 1] && v <= thresholds[i];
    }).length;

    bins.push({
      min: lo, max: hi, r: Math.round(r),
      label: _formatBinLabel(lo, hi, isOutlier),
      count, isOutlier
    });
  }

  // Échelle rayon
  const scale = d3.scaleThreshold()
    .domain(thresholds)
    .range(bins.map(b => b.r));

  const getRadius = (v) => v == null ? rRange[0] : scale(v);
  const getStroke = (v) => {
    if (v == null) return "#ccc";
    return v > outlierThreshold && hasOutliers ? "#1f2937" : "#555";
  };
  const getStrokeWidth = (v) => {
    return v > outlierThreshold && hasOutliers ? 2 : 0.5;
  };

  return { getRadius, getStroke, getStrokeWidth, bins, legendElement: createSizeLegend(bins, label) };
}

// &e

// &s FORMAT_LABEL - Formatage auto des bornes de bins

function _formatBinLabel(lo, hi, isOutlier) {
  const fmt = (v) => {
    if (v == null) return "?";
    const abs = Math.abs(v);
    if (abs >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (abs >= 1e4) return Math.round(v / 1e3) + "k";
    if (abs >= 100) return Math.round(v).toLocaleString("fr");
    return v.toFixed(1);
  };
  if (isOutlier) return `> ${fmt(lo)} ★`;
  return `${fmt(lo)} – ${fmt(hi)}`;
}

function _fallback(rRange) {
  return {
    getRadius: () => rRange[0] + 3,
    getStroke: () => "#555",
    getStrokeWidth: () => 0.5,
    bins: [],
    legendElement: html`<span></span>`
  };
}

// &e

// &s SIZE_LEGEND - Légende SVG cercles alignés

/**
 * Crée une légende taille avec cercles proportionnels
 * @param {Array} bins - Bins issus de autoSizeScale
 * @param {string} label - Titre
 * @returns {HTMLElement}
 */
export function createSizeLegend(bins, label = "Taille") {
  if (!bins || bins.length === 0) return html`<span></span>`;

  const maxR = Math.max(...bins.map(b => b.r));
  const svgH = maxR * 2 + 4;

  return html`<div style="display:flex;align-items:center;gap:8px;font-size:10px;color:#6b7280;flex-wrap:wrap;">
    <span style="font-weight:600;color:#374151;">${label}</span>
    ${bins.map(b => html`<span style="display:inline-flex;align-items:center;gap:3px;">
      <svg width="${b.r * 2 + 4}" height="${svgH}" style="vertical-align:middle;">
        <circle cx="${b.r + 2}" cy="${svgH / 2}" r="${b.r}"
          fill="${b.isOutlier ? '#e5e7eb' : '#d1d5db'}"
          stroke="${b.isOutlier ? '#1f2937' : '#888'}"
          stroke-width="${b.isOutlier ? 2 : 0.8}" />
      </svg>
      <span>${b.label} <span style="color:#9ca3af;">(${b.count})</span></span>
    </span>`)}
  </div>`;
}

/**
 * Crée une légende taille VERTICALE (pour positionnement à droite du scatter)
 * Cercles alignés à gauche (colonne fixe = max diamètre), labels + counts à droite
 */
export function createSizeLegendVertical(bins, label = "Taille") {
  if (!bins || bins.length === 0) return html`<span></span>`;

  const maxR = Math.max(...bins.map(b => b.r));
  const colW = maxR * 2 + 4;

  return html`<div style="display:flex;flex-direction:column;gap:2px;font-size:9px;color:#6b7280;">
    <span style="font-weight:600;color:#374151;font-size:10px;margin-bottom:2px;">${label}</span>
    ${bins.map(b => html`<div style="display:flex;align-items:center;gap:4px;height:${Math.max(b.r * 2 + 2, 14)}px;">
      <svg width="${colW}" height="${b.r * 2 + 2}" style="flex-shrink:0;">
        <circle cx="${colW / 2}" cy="${b.r + 1}" r="${b.r}"
          fill="${b.isOutlier ? '#e5e7eb' : '#d1d5db'}"
          stroke="${b.isOutlier ? '#1f2937' : '#888'}"
          stroke-width="${b.isOutlier ? 1.5 : 0.6}" />
      </svg>
      <span style="white-space:nowrap;">${b.label} <span style="color:#9ca3af;">(${b.count})</span></span>
    </div>`)}
  </div>`;
}

// &e

// &e
