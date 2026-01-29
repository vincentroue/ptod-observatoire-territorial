// ============================================================
// &s TOOLTIP — Helper tooltip optimisé pour cartes
// ============================================================
// Date: 2026-01-12
// Tooltip avec throttle requestAnimationFrame, lookup O(1)
//
// Exports:
// - initTooltip() → element tooltip singleton
// - showTooltip(event, content) → affiche tooltip
// - hideTooltip() → masque tooltip
// - territoryTooltipHTML(d, indicators, formatValue) → HTML formaté
// ============================================================

let tooltipEl = null;
let tooltipFrame = null;

// ============================================================
// &s INIT — Création singleton
// ============================================================

/**
 * Initialise ou retourne le tooltip singleton
 * @returns {HTMLElement} Element tooltip
 */
export function initTooltip() {
  if (tooltipEl) return tooltipEl;

  tooltipEl = document.createElement('div');
  tooltipEl.className = 'ottd-tooltip';
  tooltipEl.style.cssText = `
    position: fixed;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.88);
    color: white;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.12s ease-out;
    max-width: 280px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    line-height: 1.4;
  `;
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

// ============================================================
// &s SHOW/HIDE — Affichage avec throttle
// ============================================================

/**
 * Affiche tooltip avec throttle requestAnimationFrame
 * @param {Event} event - Mouse event pour position
 * @param {string} content - HTML content
 */
export function showTooltip(event, content) {
  if (tooltipFrame) return;  // Déjà en attente

  tooltipFrame = requestAnimationFrame(() => {
    const el = initTooltip();
    el.innerHTML = content;
    el.style.opacity = '1';

    // Position avec décalage et contrainte viewport
    const x = Math.min(event.clientX + 14, window.innerWidth - 300);
    const y = Math.max(event.clientY - 12, 10);
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    tooltipFrame = null;
  });
}

/**
 * Masque le tooltip
 */
export function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.style.opacity = '0';
  }
  if (tooltipFrame) {
    cancelAnimationFrame(tooltipFrame);
    tooltipFrame = null;
  }
}

// ============================================================
// &s TEMPLATE — HTML pour territoires
// ============================================================

/**
 * Génère le HTML tooltip pour un territoire
 * @param {Object} d - Données territoire {code, libelle, P22_POP, ...}
 * @param {Array} indicators - [{key, label}] indicateurs à afficher
 * @param {Function} formatValue - (key, value) → string formaté
 * @returns {string} HTML tooltip
 */
export function territoryTooltipHTML(d, indicators, formatValue) {
  const pop = d.P22_POP ? d.P22_POP.toLocaleString('fr-FR') : '—';

  const indicRows = indicators.map(ind => {
    const val = d[ind.key];
    const formatted = val != null ? formatValue(ind.key, val) : '—';
    return `
      <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;">
        <span style="color:#9ca3af;">${ind.label}</span>
        <span style="font-weight:500;">${formatted}</span>
      </div>
    `;
  }).join('');

  return `
    <div style="font-weight:600;font-size:13px;margin-bottom:2px;">${d.libelle || d.code}</div>
    <div style="font-size:10px;color:#9ca3af;margin-bottom:6px;">${d.code}</div>
    <div style="display:flex;justify-content:space-between;gap:16px;padding-bottom:6px;border-bottom:1px solid #444;margin-bottom:6px;">
      <span style="color:#9ca3af;">Pop 2022</span>
      <span style="font-weight:500;">${pop}</span>
    </div>
    ${indicRows}
  `;
}

/**
 * Crée un Map pour lookup O(1) par code
 * @param {Array} data - Données [{code, ...}, ...]
 * @returns {Map} code → row
 */
export function createDataMap(data) {
  return new Map(data.map(d => [d.code, d]));
}

// &e
