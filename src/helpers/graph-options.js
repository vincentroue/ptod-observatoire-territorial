// ============================================================
// &s GRAPH_OPTIONS — Barre options + Export SVG
// ============================================================
// Date: 2026-01-12
// Générique : cartes choroplèthes, scatter plots, bar charts
//
// Exports:
// - createOptionsBar(config) → HTML barre options
// - exportSVG(svg, filename) → télécharge fichier SVG
// - exportMapWithLegend(container, filename) → export carte + légende
// ============================================================

import { html } from 'npm:htl';

// ============================================================
// &s OPTIONS_BAR — Barre d'options réactive
// ============================================================

/**
 * Crée une barre d'options pour graphique (carte ou scatter)
 *
 * @param {Object} config
 * @param {string} config.type - "map" | "scatter" | "bar"
 * @param {Object} config.options - État actuel des options
 * @param {Object} config.callbacks - Fonctions de toggle
 * @returns {Object} HTML element
 */
export function createOptionsBar(config) {
  const { type = 'map', options = {}, callbacks = {} } = config;

  const {
    showValues = false,
    showLabels = false,
    showBackground = true,
    colorMode = 'bins', // "bins" | "gradient"
  } = options;

  const {
    onToggleValues,
    onToggleLabels,
    onToggleBackground,
    onChangeColorMode,
    onExportSVG,
  } = callbacks;

  // Options communes - créer éléments manuellement pour éviter pb htl boolean attrs
  const chkValues = document.createElement('input');
  chkValues.type = 'checkbox';
  chkValues.checked = !!showValues;
  if (onToggleValues) chkValues.onchange = onToggleValues;

  const chkLabels = document.createElement('input');
  chkLabels.type = 'checkbox';
  chkLabels.checked = !!showLabels;
  if (onToggleLabels) chkLabels.onchange = onToggleLabels;

  const commonOpts = html`
    <label class="graph-opt">${chkValues}<span>Valeurs</span></label>
    <label class="graph-opt">${chkLabels}<span>Libellés</span></label>
  `;

  // Options spécifiques carte
  let mapOpts = '';
  if (type === 'map') {
    const chkBg = document.createElement('input');
    chkBg.type = 'checkbox';
    chkBg.checked = !!showBackground;
    if (onToggleBackground) chkBg.onchange = onToggleBackground;

    const sel = document.createElement('select');
    sel.className = 'graph-select';
    sel.innerHTML = `<option value="bins">Bins quantiles</option><option value="gradient">Gradient continu</option>`;
    sel.value = colorMode;
    if (onChangeColorMode)
      sel.onchange = (e) => onChangeColorMode(e.target.value);

    mapOpts = html`
      <label class="graph-opt">${chkBg}<span>Fond dép.</span></label>
      ${sel}
    `;
  }

  // Bouton export (toujours présent)
  const exportBtn = html`
    <button
      class="graph-btn-export"
      onclick=${onExportSVG}
      title="Exporter SVG"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
        />
      </svg>
      SVG
    </button>
  `;

  return html`<div class="graph-options-bar">
    ${commonOpts} ${mapOpts}
    <div class="graph-opt-spacer"></div>
    ${exportBtn}
  </div>`;
}

// ============================================================
// &s EXPORT_SVG — Export graphique en SVG
// ============================================================

/**
 * Exporte un élément SVG en fichier téléchargeable
 *
 * @param {SVGElement} svgElement - Élément SVG (Plot.plot() ou autre)
 * @param {string} [filename="chart.svg"] - Nom du fichier
 * @param {Object} [options={}] - Options d'export
 * @param {boolean} [options.includeStyles=true] - Inclure styles CSS inline
 */
export function exportSVG(svgElement, filename = 'chart.svg', options = {}) {
  const { includeStyles = true } = options;

  if (!svgElement) {
    console.warn('[graph-options] exportSVG: No SVG element provided');
    return;
  }

  // Cloner pour ne pas modifier l'original
  const clone = svgElement.cloneNode(true);

  // Injecter styles si demandé (pour que l'export soit autonome)
  if (includeStyles) {
    const styles = extractComputedStyles(svgElement);
    const styleElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'style'
    );
    styleElement.textContent = styles;
    clone.insertBefore(styleElement, clone.firstChild);
  }

  // Ajouter namespace XML si absent
  if (!clone.hasAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  // Sérialiser et télécharger
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();

  URL.revokeObjectURL(link.href);
}

/**
 * Extrait les styles CSS appliqués pour les injecter dans le SVG
 * @param {SVGElement} svg
 * @returns {string} CSS string
 */
function extractComputedStyles(svg) {
  // Styles minimaux pour autonomie du SVG exporté
  return `
    text { font-family: system-ui, -apple-system, sans-serif; }
    .legend-text-v { font-size: 10px; }
    .legend-count-v { font-size: 9px; fill: #666; }
  `;
}

// ============================================================
// &s EXPORT_MAP — Export carte avec légende
// ============================================================

/**
 * Wrapper pour export depuis un conteneur (carte avec légende)
 * Combine carte SVG + légende en un seul SVG
 *
 * @param {HTMLElement} container - Conteneur .map-wrapper
 * @param {string} filename - Nom fichier
 */
export function exportMapWithLegend(
  container,
  filename = 'carte.svg',
  options = {}
) {
  const { title = '', includeTitle = true, includeLegend = true } = options;

  const svg = container.querySelector('svg');
  const legendEl = container.querySelector('.legend-vertical, .legend-overlay');

  if (!svg) return;

  // Cloner SVG carte
  const clone = svg.cloneNode(true);
  const width = parseInt(svg.getAttribute('width')) || 540;
  const height = parseInt(svg.getAttribute('height')) || 560;

  // Agrandir canvas pour titre + légende
  const titleHeight = includeTitle && title ? 30 : 0;
  const legendWidth = includeLegend && legendEl ? 120 : 0;

  clone.setAttribute('width', width + legendWidth);
  clone.setAttribute('height', height + titleHeight);

  // Décaler contenu carte
  const content = clone.querySelector('g') || clone;
  content.setAttribute('transform', `translate(0, ${titleHeight})`);

  // Ajouter titre
  if (includeTitle && title) {
    const titleText = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'text'
    );
    titleText.setAttribute('x', (width + legendWidth) / 2);
    titleText.setAttribute('y', 20);
    titleText.setAttribute('text-anchor', 'middle');
    titleText.setAttribute('font-size', '14');
    titleText.setAttribute('font-weight', '600');
    titleText.textContent = title;
    clone.insertBefore(titleText, clone.firstChild);
  }

  // TODO: Convertir légende HTML → SVG (complexe)
  // Pour l'instant, ajouter note "Légende non incluse"

  exportSVG(clone, filename);
}

// &e
