// ============================================================
// &s LEGEND — Helper légendes paramétrées
// ============================================================
// Date: 2025-12-29
// Légendes réutilisables : typologie, gradient, bins
// Vertical ou horizontal, avec comptages optionnels
//
// Exports:
// - createTypologieLegend(config) → html element
// - createGradientLegend(config) → html element
// - createBinsLegend(config) → html element
// ============================================================

import { html } from 'npm:htl';

// ============================================================
// &s TYPOLOGIE — Légende catégorielle (DENS, TYPE_EPCI...)
// ============================================================

/**
 * Crée une légende pour mode typologie (catégories discrètes)
 *
 * @param {Object} config
 * @param {Object} config.labels - {key: "Label affiché", ...}
 * @param {Object} config.colors - {key: "#color", ...}
 * @param {Object} [config.counts={}] - {key: count, ...} optionnel
 * @param {boolean} [config.vertical=true] - Orientation
 * @returns {Object} HTML element
 */
export function createTypologieLegend(config) {
  const { labels, colors, counts = {}, vertical = true } = config;

  if (vertical) {
    return html`<div class="legend-vertical">
      ${Object.entries(labels).map(
        ([key, label]) => html`<div class="legend-row-v">
          <span class="legend-color-v" style="background:${colors[key]}"></span>
          <span class="legend-text-v">${label}</span>
          ${counts[key] !== undefined
            ? html`<span class="legend-count-v">${counts[key]}</span>`
            : ''}
        </div>`
      )}
    </div>`;
  } else {
    return html`<div class="legend-horizontal">
      ${Object.entries(labels).map(
        ([key, label]) => html`<div class="legend-item-h">
          <span class="legend-color-h" style="background:${colors[key]}"></span>
          <span class="legend-text-h">${label}</span>
          ${counts[key] !== undefined
            ? html`<span class="legend-count-h">(${counts[key]})</span>`
            : ''}
        </div>`
      )}
    </div>`;
  }
}

// ============================================================
// &s GRADIENT — Légende dégradé continu
// ============================================================

/**
 * Crée une légende gradient (titre + barre dégradée + min/0/max)
 * Styles inline pour autonomie (pas de dépendance CSS externe)
 *
 * @param {Object} config
 * @param {string[]} config.colors - Tableau couleurs pour linear-gradient
 * @param {number} config.min - Valeur min affichée (peut être P02 si cappé)
 * @param {number} config.max - Valeur max affichée (peut être P98 si cappé)
 * @param {boolean} [config.showZero=true] - Afficher le 0 au milieu (divergent)
 * @param {number} [config.decimals=1] - Décimales affichées
 * @param {string} [config.title=""] - Titre légende (ex: "Légende (%)")
 * @param {boolean} [config.capped=false] - Valeurs cappées P02/P98
 * @param {number} [config.rawMin] - Valeur min brute (avant cap)
 * @param {number} [config.rawMax] - Valeur max brute (avant cap)
 * @returns {Object} HTML element
 */
export function createGradientLegend(config) {
  const {
    colors, min, max, showZero = true, decimals = 1, title = "",
    capped = false, rawMin, rawMax
  } = config;

  // Fallback colors si undefined
  const safeColors = Array.isArray(colors) && colors.length > 0
    ? colors
    : ["#761548", "#c44d8a", "#e8a0c0", "#f5f5f5", "#a8d4a0", "#5ba55b", "#2c5c2d"];

  // Formatage avec indicateur cap si nécessaire
  const formatVal = (val, isMin) => {
    if (val == null) return '−';
    const formatted = val.toFixed(decimals);
    if (capped) {
      // Ajouter ≤ ou ≥ pour indiquer le clamp
      return isMin ? `≤${formatted}` : `≥${formatted}`;
    }
    return isMin ? formatted : (val >= 0 ? `+${formatted}` : formatted);
  };

  const gMin = formatVal(min, true);
  const gMax = formatVal(max, false);

  // Styles inline pour autonomie
  const wrapperStyle = "padding:6px 0;min-width:120px;";
  const titleStyle = "font-size:9px;font-weight:600;color:#374151;margin-bottom:4px;text-align:center;";
  const barStyle = `height:14px;border-radius:2px;border:1px solid #9ca3af;margin:2px 0;background:linear-gradient(to right, ${safeColors.join(', ')});`;
  const axisStyle = "display:flex;justify-content:space-between;font-size:9px;color:#4b5563;font-variant-numeric:tabular-nums;";
  // Couleurs distinctes: violet (min/négatif), gris (zéro), vert (max/positif)
  const minStyle = "color:#761548;font-weight:500;";
  const zeroStyle = "color:#6b7280;";
  const maxStyle = "color:#2c5c2d;font-weight:500;";

  return html`<div style="${wrapperStyle}">
    ${title ? html`<div style="${titleStyle}">${title}</div>` : ""}
    <div style="${barStyle}"></div>
    <div style="${axisStyle}">
      <span style="${minStyle}">${gMin}</span>
      ${showZero ? html`<span style="${zeroStyle}">0</span>` : ''}
      <span style="${maxStyle}">${gMax}</span>
    </div>
  </div>`;
}

// &e

// ============================================================
// &s ECART_FRANCE — Légende écart à la valeur France
// ============================================================

/**
 * Crée une légende compacte pour mode "Écart France" (9 bins)
 * Format par ligne : [■] ▲▲  +23%  (12)
 * Symboles : ▼▼ ▼ ↘ ~- ≈ ~+ ↗ ▲ ▲▲
 * Pas de ligne ref France (affichée sous la carte)
 *
 * @param {Object} config
 * @param {string[]} config.palette - 9 couleurs écart
 * @param {string[]} config.symbols - 9 symboles courts (▼▼..▲▲)
 * @param {string[]} config.pctLabels - 9 labels % écart
 * @param {number[]} [config.counts=[]] - Comptages par bin
 * @param {string} [config.unit=""] - Unité indicateur
 * @param {string} [config.title="Écart France"] - Titre légende
 * @param {boolean} [config.reverse=true] - Inverser ordre (haut=au-dessus)
 * @returns {Object} HTML element
 */
export function createEcartFranceLegend(config) {
  const {
    palette,
    symbols = [],
    pctLabels,
    counts = [],
    title = "Écart France",
    reverse = true
  } = config;

  const items = palette.map((color, i) => ({
    color,
    symbol: symbols[i] || "",
    pctLabel: pctLabels[i] || "",
    count: counts[i] || 0
  }));

  const orderedItems = reverse ? [...items].reverse() : items;

  return html`<div class="legend-vertical">
    ${title ? html`<div class="legend-title">${title}</div>` : ''}
    ${orderedItems.map(item => html`<div style="display:flex;align-items:center;gap:2px;line-height:1.1;">
      <span class="legend-color-v" style="background:${item.color}"></span>
      <span style="font-size:10px;width:16px;text-align:center;font-weight:600;">${item.symbol}</span>
      <span style="font-size:9px;color:#6b7280;">${item.pctLabel}</span>
      <span style="font-size:8px;color:#888;margin-left:1px;">(${item.count})</span>
    </div>`)}
  </div>`;
}

// &e

// ============================================================
// &s BINS — Légende bins quantiles (8 catégories)
// ============================================================

/**
 * Crée une légende bins (couleurs discrètes avec labels et comptages)
 *
 * @param {Object} config
 * @param {string[]} config.colors - Palette 8 couleurs
 * @param {string[]} config.labels - Labels pour chaque bin
 * @param {number[]} [config.counts=[]] - Comptages par bin
 * @param {boolean} [config.vertical=true] - Orientation
 * @param {boolean} [config.reverse=true] - Inverser ordre (haut=max)
 * @param {string} [config.title="Légende"] - Titre en haut de la légende
 * @param {string} [config.unit=""] - Unité en italique sous le titre
 * @returns {Object} HTML element
 */
export function createBinsLegend(config) {
  const {
    colors,
    labels,
    counts = [],
    vertical = true,
    reverse = true,
    title = 'Légende',
    unit = '',
  } = config;

  // Préparer les items dans l'ordre
  const items = colors.map((color, i) => ({
    color,
    label: labels[i] || '',
    count: counts[i] || 0,
  }));

  // Inverser si demandé (pour avoir valeurs hautes en haut)
  const orderedItems = reverse ? [...items].reverse() : items;

  if (vertical) {
    return html`<div class="legend-vertical">
      ${title ? html`<div class="legend-title">${title}</div>` : ''}
      ${unit ? html`<div class="legend-unit">${unit}</div>` : ''}
      ${orderedItems.map(
        (item, i) => html`<div class="legend-row-v">
          <span class="legend-color-v" style="background:${item.color}"></span>
          <span class="legend-text-v">${item.label}</span>
          ${item.count !== undefined
            ? html`<span class="legend-count-v">${item.count}</span>`
            : ''}
        </div>`
      )}
    </div>`;
  } else {
    // Horizontal - style demig
    return html`<div
      class="legend-horizontal"
      style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;"
    >
      ${orderedItems.map(
        (item, i) => html`<div
          class="legend-item-h"
          style="display: flex; align-items: center; gap: 3px;"
        >
          <div
            style="width: 24px; height: 14px; background: ${item.color}; border: 1px solid #999;"
          ></div>
          <span style="font-size: 0.75rem; color: #555;">${item.label}</span>
        </div>`
      )}
    </div>`;
  }
}

// ============================================================
// &s UTILS — Helpers internes
// ============================================================

/**
 * Palettes gradient prédéfinies
 */
export const GRADIENT_COLORS = {
  'Bleu-Jaune': [
    '#b8860b',
    '#d4a017',
    '#f5e6a0',
    '#f8f8f8',
    '#a8d4e8',
    '#5ba3d0',
    '#084594',
  ],
  'Violet-Vert': [
    '#761548',
    '#c44d8a',
    '#e8a0c0',
    '#f5f5f5',
    '#a8d4a0',
    '#5ba55b',
    '#2c5c2d',
  ],
};

/**
 * Récupère les couleurs gradient par nom de palette
 * @param {string} paletteName - "Bleu-Jaune" ou "Violet-Vert"
 * @returns {string[]} Tableau de couleurs
 */
export function getGradientColors(paletteName) {
  return GRADIENT_COLORS[paletteName] || GRADIENT_COLORS['Violet-Vert'];
}

// &e
