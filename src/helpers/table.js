// ============================================================
// &s TABLE — Helpers tableau triable avec barres colorées (v2)
// ============================================================
// Date: 2025-12-28 | v2: 2026-01-09
// Phase 1 refactoring: extraction depuis jottd-exd-explor-dyn.md
// v2: Ajout export CSV, header avec ligne unité optionnelle
//
// Exports:
// - computeMaxByCol(data, cols) → { col: { pos, neg } }
// - computeExtremes(data, cols) → { col: { minVal, maxVal } }
// - sortData(data, col, asc, textCols) → [...sorted]
// - makeBar(v, colKey, maxByCol, extremesCol) → html
// - thSort(col, label, sortCol, sortAsc, setSort, className) → html
// - renderTableHeader(columns, sortCol, sortAsc, setSort, showUnitRow) → html
// - exportTableCSV(data, columns, filename) → void (download)
// ============================================================

import { html } from "npm:htl";
import { getIndicatorType, INDICATEURS } from "./indicators-ddict-js.js";
// parseColKey depuis fichier NON écrasé (ddict-js est auto-généré par R)
import { parseColKey } from "./indicators-ddict-ext.js";

// ============================================================
// &s CALCULS — Max et extrêmes par colonne
// ============================================================

/**
 * Calcule max positif et négatif SÉPARÉS par colonne (pour TCAM/DIFF)
 * Capé au P98 pour éviter que les extrêmes polluent les barres
 * Permet que +2% et -2% soient tous deux à 100% de largeur
 * @param {Array} data - Données
 * @param {string[]} cols - Colonnes à calculer
 * @returns {Object} { colKey: { pos: number, neg: number } }
 */
export function computeMaxByCol(data, cols) {
  return Object.fromEntries(
    cols.map(col => {
      const vals = data.map(d => d[col]).filter(v => v != null && !isNaN(v));
      const posVals = vals.filter(v => v >= 0).sort((a, b) => a - b);
      const negVals = vals.filter(v => v < 0).map(v => Math.abs(v)).sort((a, b) => a - b);

      // P98 avec minimum 10 éléments avant cap, sinon max
      // Pour éviter que 1-2 outliers écrasent tout le reste
      const getP98 = (arr) => {
        if (arr.length < 10) return arr[arr.length - 1] || 2;  // Pas assez de données pour cap
        const idx = Math.floor(arr.length * 0.98);
        return arr[Math.min(idx, arr.length - 1)] || 2;
      };

      return [col, { pos: getP98(posVals), neg: getP98(negVals) }];
    })
  );
}

/**
 * Calcule min/max réels par colonne (pour mise en gras des extrêmes)
 * @param {Array} data - Données
 * @param {string[]} cols - Colonnes à calculer
 * @returns {Object} { colKey: { minVal: number, maxVal: number } }
 */
export function computeExtremes(data, cols) {
  return Object.fromEntries(
    cols.map(col => {
      const vals = data.map(d => d[col]).filter(v => v != null).sort((a, b) => a - b);
      const minVal = vals[0] ?? -Infinity;
      const maxVal = vals[vals.length - 1] ?? Infinity;
      return [col, { minVal, maxVal }];
    })
  );
}

// ============================================================
// &s TRI — Tri données avec support texte/numérique
// ============================================================

/**
 * Trie les données selon colonne et direction
 * @param {Array} data - Données à trier
 * @param {string} col - Colonne de tri
 * @param {boolean} asc - Tri ascendant si true
 * @param {string[]} textCols - Colonnes considérées comme texte
 * @returns {Array} Données triées (copie)
 */
export function sortData(data, col, asc, textCols = ["libelle", "code", "nomBase", "regShort", "depShort", "densLib"]) {
  return [...data].sort((a, b) => {
    if (textCols.includes(col)) {
      const valA = a[col] || "";
      const valB = b[col] || "";
      return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    const valA = a[col] ?? -Infinity;
    const valB = b[col] ?? -Infinity;
    return asc ? valA - valB : valB - valA;
  });
}

// ============================================================
// &s BARRE — Rendu barre colorée avec triangle et valeur
// ============================================================

/**
 * Génère une barre HTML colorée pour une valeur d'indicateur
 * - PCT: barre bleue simple
 * - TCAM/DIFF: triangle + barre rouge/vert + valeur signée
 * - Extrêmes en gras
 *
 * @param {number|null} v - Valeur
 * @param {string} colKey - Clé colonne (ex: "tcam_pop_16_22")
 * @param {Object} maxByCol - Max { pos, neg } par colonne
 * @param {Object} extremesCol - { minVal, maxVal } par colonne
 * @returns {html} Template HTML
 */
export function makeBar(v, colKey, maxByCol, extremesCol) {
  if (v == null) return html`<span style="color:#999">—</span>`;

  const type = getIndicatorType(colKey);
  const isNeg = v < 0;
  const { minVal, maxVal } = extremesCol[colKey] || {};
  // En gras : exactement le min ou le max de la colonne
  const isExtreme = v === minVal || v === maxVal;
  const fontWeight = isExtreme ? "700" : "400";

  // === PCT : barre simple bleue (carrée, sans border-radius) ===
  if (type === "pct") {
    const { pos: maxPos } = maxByCol[colKey] || { pos: 30 };
    const w = Math.min(v / maxPos * 100, 100);
    return html`<div style="display:flex;align-items:center;gap:5px">
      <div style="width:55px;height:12px;background:#e5e7eb">
        <div style="width:${w}%;height:100%;background:#3b82f6"></div>
      </div>
      <span style="font-size:12px;font-weight:${fontWeight}">${v.toFixed(1)}%</span>
    </div>`;
  }

  // === TCAM / DIFF : triangle + barre carrée + valeur ===
  // Max SÉPARÉ : positifs normalisés sur maxPos, négatifs sur maxNeg
  const { pos: maxPos, neg: maxNeg } = maxByCol[colKey] || { pos: 2, neg: 2 };
  const max = isNeg ? maxNeg : maxPos;
  const w = Math.min(Math.abs(v) / max * 100, 100);
  const barColor = isNeg ? "#dc2626" : "#16a34a";
  const textColor = isNeg ? "#dc2626" : "#333";
  const arrow = isNeg ? "▼" : "▲";
  const sign = v >= 0 ? "+" : "";
  const decimals = type === "vdifp" ? 1 : 2;  // vdifp: 1 déc, vtcam/vevol: 2 déc

  return html`<div style="display:flex;align-items:center;gap:4px">
    <span style="font-size:10px;color:${barColor}">${arrow}</span>
    <div style="width:50px;height:12px;background:#e5e7eb">
      <div style="width:${w}%;height:100%;background:${barColor}"></div>
    </div>
    <span style="font-size:12px;color:${textColor};font-weight:${fontWeight}">${sign}${v.toFixed(decimals)}</span>
  </div>`;
}

// ============================================================
// &s HEADER — En-tête de colonne cliquable avec tri
// ============================================================

/**
 * Génère un header <th> cliquable pour tri avec flèche et unité
 * @param {string} col - Nom colonne
 * @param {string} label - Label affiché
 * @param {string} sortCol - Colonne actuellement triée
 * @param {boolean} sortAsc - Tri ascendant actif
 * @param {Function} setSort - Callback(col) pour changer le tri
 * @param {string} className - Classes CSS additionnelles
 * @returns {html} Template <th>
 */
export function thSort(col, label, sortCol, sortAsc, setSort, className = "") {
  const isActive = sortCol === col;
  const arrow = isActive ? (sortAsc ? " ↑" : " ↓") : "";

  // Récupérer unité complète depuis INDICATEURS
  const { indic } = parseColKey(col);
  const unit = INDICATEURS[indic]?.unit || "";

  return html`<th class="${className} th-sort ${isActive ? 'th-active' : ''}"
    onclick=${() => setSort(col)}>
    ${label}${arrow}
    ${unit ? html`<br><i style="font-weight:400;font-size:11px;color:#666">${unit}</i>` : ""}
  </th>`;
}

// ============================================================
// &s HEADER_V2 — Header complet avec ligne unité optionnelle
// ============================================================

/**
 * Génère le header complet <thead> avec ligne unité optionnelle
 * @param {Array<{key: string, label: string, indic?: string, className?: string}>} columns - Colonnes
 * @param {string} sortCol - Colonne actuellement triée
 * @param {boolean} sortAsc - Tri ascendant actif
 * @param {Function} setSort - Callback(col) pour changer le tri
 * @param {boolean} showUnitRow - Afficher ligne unités (défaut: true)
 * @returns {html} Template <thead>
 */
export function renderTableHeader(columns, sortCol, sortAsc, setSort, showUnitRow = true) {
  return html`
    <thead>
      <tr>
        ${columns.map(c => {
          const isActive = sortCol === c.key;
          const arrow = isActive ? (sortAsc ? " ↑" : " ↓") : "";
          return html`<th class="${c.className || ''} th-sort ${isActive ? 'th-active' : ''}"
            onclick=${() => setSort(c.key)}
            style="cursor: pointer;">
            ${c.label}${arrow}
          </th>`;
        })}
      </tr>
      ${showUnitRow ? html`
        <tr class="unit-row">
          ${columns.map(c => {
            const indicKey = c.indic || c.key;
            const { indic } = parseColKey(indicKey);
            const unit = INDICATEURS[indic]?.unit || '';
            return html`<th style="font-weight: 400; font-size: 9px; color: #666; padding: 2px 4px;">
              ${unit}
            </th>`;
          })}
        </tr>
      ` : ''}
    </thead>
  `;
}
// &e HEADER_V2

// ============================================================
// &s EXPORT_CSV — Export données tableau en CSV
// ============================================================

/**
 * Formate une valeur pour export CSV
 * @param {any} value - Valeur à formater
 * @param {string} colKey - Clé colonne
 * @returns {string}
 */
function formatCSVValue(value, colKey) {
  if (value == null) return '';
  if (typeof value === 'number') {
    // Remplacer point par virgule pour Excel FR
    return String(value).replace('.', ',');
  }
  // Échapper guillemets et encadrer si contient séparateur
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export données tableau en CSV avec téléchargement
 * @param {Array} data - Données à exporter
 * @param {Array<{key: string, label: string}>} columns - Colonnes avec labels
 * @param {string} filename - Nom du fichier (défaut: 'export.csv')
 */
export function exportTableCSV(data, columns, filename = 'export.csv') {
  const sep = ';';

  // Header avec labels
  const headers = columns.map(c => c.label || c.key).join(sep);

  // Lignes de données
  const rows = data.map(d =>
    columns.map(c => formatCSVValue(d[c.key], c.key)).join(sep)
  ).join('\n');

  // Assemblage CSV avec BOM UTF-8 pour Excel
  const csv = '\ufeff' + headers + '\n' + rows;

  // Téléchargement
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Crée un bouton export CSV stylé
 * @param {Function} onClick - Callback au clic
 * @param {string} label - Label bouton (défaut: '📥 Export CSV')
 * @returns {HTMLElement}
 */
export function createExportButton(onClick, label = '📥 Export CSV') {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = `
    font-size: 10px;
    padding: 4px 10px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
  `;
  btn.onmouseenter = () => btn.style.background = '#e5e7eb';
  btn.onmouseleave = () => btn.style.background = '#f3f4f6';
  btn.onclick = onClick;
  return btn;
}
// &e EXPORT_CSV

// &e TABLE
