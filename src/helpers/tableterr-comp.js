// ============================================================
// &s TABLETERR_COMP — Tableau comparaison territoires sélectionnés
// ============================================================
// Date: 2026-01-09
// Tableau transposé : indicateurs en lignes, territoires en colonnes
// Format comparatif avec France comme référence finale
//
// Exports:
// - renderTableTerrComp(config) → HTMLElement
// - tableTerrCompStyles → string CSS
// ============================================================

import { html } from "npm:htl";
import { calcIS, getISColor, formatIS, formatPercentile, supportsIS } from "./calculate.js";

// ============================================================
// &s FORMAT_VALUE — Formatage valeurs selon type indicateur
// ============================================================
/**
 * Formate une valeur selon son type d'indicateur
 * @param {number} value - Valeur brute
 * @param {string} colKey - Clé indicateur (pour détecter type)
 * @returns {string}
 */
function formatValue(value, colKey) {
  if (value == null || isNaN(value)) return '—';

  // TCAM : 2 décimales
  if (colKey.includes('_vtcam')) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  // vdifp (pts %) : 1 décimale
  if (colKey.includes('_vdifp')) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)} pts`;
  }

  // Parts/taux en pourcentage
  if (colKey.includes('_pct')) {
    return `${value.toFixed(1)}%`;
  }

  // Prix (DVF)
  if (colKey.includes('_px2')) {
    return `${Math.round(value).toLocaleString('fr-FR')} €`;
  }

  // Revenus (Filosofi)
  if (colKey.startsWith('rev_') && !colKey.includes('_pct')) {
    return `${Math.round(value).toLocaleString('fr-FR')} €`;
  }

  // Indices et ratios : 0 déc si >=10, 1 déc si <10
  if (colKey.includes('_ind') || colKey.includes('_ratio')) {
    const dec = Math.abs(value) >= 10 ? 0 : 1;
    return value.toFixed(dec);
  }

  // Volumes/stocks
  if (colKey.includes('_vol') || colKey.includes('_stock') || colKey.includes('_trans')) {
    return Math.round(value).toLocaleString('fr-FR');
  }

  // Défaut : 1 décimale
  return value.toFixed(1);
}
// &e FORMAT_VALUE

// ============================================================
// &s RENDER_TABLE — Fonction principale rendu tableau
// ============================================================
/**
 * Tableau comparaison N territoires + France
 * @param {Object} config
 * @param {Array<{key: string, label: string}>} config.indicators - Liste indicateurs
 * @param {Array<Object>} config.territories - Territoires sélectionnés [{code, label, ...data}]
 * @param {Object} config.france - Données France (référence)
 * @param {string} [config.displayMode='value'] - 'value' | 'is' | 'percentile'
 * @param {Array<number>} [config.allValues] - Distribution pour percentile (par indicateur)
 * @param {Function} [config.onExport] - Callback export CSV
 * @param {Function} [config.onRemove] - Callback suppression territoire
 * @param {number} [config.maxCols=6] - Nombre max territoires affichés
 * @returns {HTMLElement}
 */
export function renderTableTerrComp(config) {
  const {
    indicators = [],
    territories = [],
    france = {},
    displayMode = 'value',
    allValues = {},  // Map colKey → Array valeurs distribution
    onExport = null,
    onRemove = null,
    maxCols = 6
  } = config;

  // Limiter nombre de territoires
  const displayTerr = territories.slice(0, maxCols);
  const hiddenCount = territories.length - displayTerr.length;

  // -------------------------------------------------------
  // Fonction affichage cellule selon mode
  // -------------------------------------------------------
  const renderCell = (value, colKey, isRef = false) => {
    if (value == null) {
      return html`<td class="tbl-comp-cell tbl-comp-empty">—</td>`;
    }

    let displayValue, color;

    switch (displayMode) {
      case 'is':
        if (supportsIS(colKey) && france[colKey] != null) {
          const is = calcIS(value, france[colKey]);
          displayValue = formatIS(is);
          color = getISColor(is);
        } else {
          displayValue = formatValue(value, colKey);
          color = '#6b7280';  // Gris pour non-supporté
        }
        break;

      case 'percentile':
        const vals = allValues[colKey] || [];
        if (vals.length > 0) {
          const sorted = [...vals].filter(v => v != null).sort((a, b) => a - b);
          const rank = sorted.filter(v => v < value).length;
          const pct = Math.round((rank / sorted.length) * 100);
          displayValue = formatPercentile(pct);
          color = pct > 75 ? '#15803d' : pct < 25 ? '#a855f7' : '#374151';
        } else {
          displayValue = formatValue(value, colKey);
          color = '#374151';
        }
        break;

      default:  // 'value'
        displayValue = formatValue(value, colKey);
        color = '#374151';
    }

    const style = isRef
      ? `background: #fef9c3; color: ${color}; font-weight: 500;`
      : `color: ${color};`;

    return html`<td class="tbl-comp-cell" style="${style}">${displayValue}</td>`;
  };

  // -------------------------------------------------------
  // Construction tableau
  // -------------------------------------------------------
  return html`
    <div class="tbl-comp-wrapper">
      <!-- Header avec compteur et export -->
      <div class="tbl-comp-header">
        <span class="tbl-comp-count">
          ${territories.length} territoire${territories.length > 1 ? 's' : ''} sélectionné${territories.length > 1 ? 's' : ''}
          ${hiddenCount > 0 ? html`<span class="tbl-comp-hidden">(+${hiddenCount} masqués)</span>` : ''}
        </span>
        ${onExport ? html`
          <button class="tbl-comp-export" onclick=${onExport}>
            📥 Export CSV
          </button>
        ` : ''}
      </div>

      <!-- Tableau principal -->
      <table class="tbl-comp">
        <thead>
          <tr>
            <th class="tbl-comp-th-indic">Indicateur</th>
            ${displayTerr.map(t => html`
              <th class="tbl-comp-th-terr" title="${t.label}">
                <div class="tbl-comp-th-content">
                  <span class="tbl-comp-th-label">${truncate(t.label, 12)}</span>
                  ${onRemove ? html`
                    <button class="tbl-comp-remove" onclick=${() => onRemove(t.code)} title="Retirer">×</button>
                  ` : ''}
                </div>
              </th>
            `)}
            <th class="tbl-comp-th-france">France</th>
          </tr>
        </thead>
        <tbody>
          ${indicators.map(ind => html`
            <tr class="tbl-comp-row">
              <td class="tbl-comp-indic" title="${ind.label}">
                ${truncate(ind.label, 22)}
                ${displayMode === 'is' && !supportsIS(ind.key)
                  ? html`<span class="tbl-comp-no-is" title="IS non disponible">○</span>`
                  : ''}
              </td>
              ${displayTerr.map(t => renderCell(t[ind.key], ind.key, false))}
              ${renderCell(france[ind.key], ind.key, true)}
            </tr>
          `)}
        </tbody>
      </table>

      <!-- Mode actuel -->
      <div class="tbl-comp-footer">
        <span class="tbl-comp-mode">
          Mode : ${displayMode === 'is' ? 'Indice Spécificité' : displayMode === 'percentile' ? 'Percentile' : 'Valeur brute'}
        </span>
        ${displayMode === 'is' ? html`
          <span class="tbl-comp-legend">
            <span style="color: #22c55e;">■</span> &gt;1.2 surreprésentation
            <span style="color: #a855f7;">■</span> &lt;0.8 sous-représentation
          </span>
        ` : ''}
      </div>
    </div>
  `;
}
// &e RENDER_TABLE

// ============================================================
// &s UTILS — Fonctions utilitaires
// ============================================================
/**
 * Tronque un texte avec ellipse
 */
function truncate(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

/**
 * Export données en CSV
 * @param {Array} indicators - Liste indicateurs
 * @param {Array} territories - Territoires
 * @param {Object} france - Données France
 * @param {string} filename - Nom fichier
 */
export function exportTableTerrCSV(indicators, territories, france, filename = 'comparaison-territoires.csv') {
  const sep = ';';

  // Header
  const headers = ['Indicateur', ...territories.map(t => t.label), 'France'];

  // Lignes
  const rows = indicators.map(ind => {
    const vals = territories.map(t => {
      const v = t[ind.key];
      return v != null ? String(v).replace('.', ',') : '';
    });
    const frVal = france[ind.key];
    return [ind.label, ...vals, frVal != null ? String(frVal).replace('.', ',') : ''];
  });

  // Assemblage CSV avec BOM UTF-8
  const csv = '\ufeff' + [headers.join(sep), ...rows.map(r => r.join(sep))].join('\n');

  // Téléchargement
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
// &e UTILS

// ============================================================
// &s STYLES — CSS pour le tableau comparaison
// ============================================================
export const tableTerrCompStyles = `
/* ======================================================= */
/* &s TBL_COMP — Tableau comparaison territoires           */
/* ======================================================= */

.tbl-comp-wrapper {
  font-family: Inter, system-ui, sans-serif;
  font-size: 11px;
}

.tbl-comp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px;
}

.tbl-comp-count {
  font-size: 11px;
  color: #6b7280;
}

.tbl-comp-hidden {
  font-style: italic;
  margin-left: 4px;
}

.tbl-comp-export {
  font-size: 10px;
  padding: 3px 8px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
}

.tbl-comp-export:hover {
  background: #e5e7eb;
}

/* ------------------------------------------------------- */
/* Tableau principal                                       */
/* ------------------------------------------------------- */
.tbl-comp {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.tbl-comp th {
  background: #f3f4f6;
  padding: 6px 8px;
  text-align: center;
  border-bottom: 2px solid #d1d5db;
  font-size: 10px;
  font-weight: 600;
}

.tbl-comp-th-indic {
  text-align: left !important;
  width: 160px;
}

.tbl-comp-th-terr {
  max-width: 100px;
}

.tbl-comp-th-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tbl-comp-th-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tbl-comp-remove {
  font-size: 12px;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 50%;
  cursor: pointer;
  line-height: 1;
}

.tbl-comp-remove:hover {
  background: #fecaca;
}

.tbl-comp-th-france {
  background: #fef3c7 !important;
  min-width: 70px;
}

/* ------------------------------------------------------- */
/* Cellules                                                */
/* ------------------------------------------------------- */
.tbl-comp td {
  padding: 5px 8px;
  border-bottom: 1px solid #e5e7eb;
}

.tbl-comp-indic {
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tbl-comp-no-is {
  font-size: 8px;
  color: #9ca3af;
  margin-left: 4px;
}

.tbl-comp-cell {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.tbl-comp-empty {
  color: #9ca3af;
  text-align: center;
}

.tbl-comp-row:hover {
  background: #f9fafb;
}

/* ------------------------------------------------------- */
/* Footer                                                  */
/* ------------------------------------------------------- */
.tbl-comp-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 4px 4px 0;
  border-top: 1px solid #e5e7eb;
  font-size: 10px;
  color: #6b7280;
}

.tbl-comp-mode {
  font-style: italic;
}

.tbl-comp-legend {
  display: flex;
  gap: 12px;
}

/* &e TBL_COMP */
`;
// &e STYLES

// &e TABLETERR_COMP
