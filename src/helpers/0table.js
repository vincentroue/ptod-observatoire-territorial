// =============================================================================
// helpers/0table.js — Tableau communes centralisé (v2)
// =============================================================================
// Helper complet pour tableau triable avec pagination, barres, unités
// Remplace le code inline dans les .md
// Date: 2026-01-10
// =============================================================================

import { html } from "npm:htl";
import { INDICATEURS, formatValue } from "./indicators-ddict-js.js";
// parseColKey depuis fichier NON écrasé (ddict-js est auto-généré par R)
import { parseColKey } from "./indicators-ddict-ext.js";

// =============================================================================
// &s CONFIG — Configuration colonnes par défaut
// =============================================================================

export const DEFAULT_TABLE_COLS = [
  { key: "code", label: "Code", type: "text", width: "70px" },
  { key: "libelle", label: "Commune", type: "text", width: "180px" },
  // DEP viré - regdep affiché sous libelle
  { key: "P23_POP", label: "Pop 2023", type: "number", unit: "hab" }
];

// &e CONFIG

// =============================================================================
// &s SORT — Tri des données
// =============================================================================

/**
 * Trie les données selon colonne et direction
 * @param {Object} options - Options { fixFranceFirst: boolean }
 */
export function sortTableData(data, col, asc, options = {}) {
  const { fixFranceFirst = true } = options;
  const textCols = ["code", "libelle", "DEP", "libelle_dep", "libelle_reg"];

  // Séparer France (00FR) si demandé
  let franceRow = null;
  let restData = data;
  if (fixFranceFirst) {
    franceRow = data.find(d => d.code === "00FR");
    restData = franceRow ? data.filter(d => d.code !== "00FR") : data;
  }

  // Trier le reste
  const sorted = [...restData].sort((a, b) => {
    if (textCols.includes(col)) {
      const va = a[col] || "";
      const vb = b[col] || "";
      return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    const va = a[col] ?? -Infinity;
    const vb = b[col] ?? -Infinity;
    return asc ? va - vb : vb - va;
  });

  // France en premier si présent
  return franceRow ? [franceRow, ...sorted] : sorted;
}

// &e SORT

// =============================================================================
// &s STATS — Calcul max/min pour barres
// =============================================================================

/**
 * Calcule P98 d'un tableau trié (cap outliers max)
 * @param {number[]} arr - Tableau déjà trié ASC
 * @returns {number} P98 ou max si moins de 10 éléments
 */
function getP98(arr) {
  if (arr.length === 0) return 1;
  if (arr.length < 10) return arr[arr.length - 1];  // Pas assez de données pour cap
  const idx = Math.floor(arr.length * 0.98);
  return arr[Math.min(idx, arr.length - 1)] || 1;
}

/**
 * Calcule P02 d'un tableau trié (cap outliers min)
 * @param {number[]} arr - Tableau déjà trié ASC
 * @returns {number} P02 ou min si moins de 10 éléments
 */
function getP02(arr) {
  if (arr.length === 0) return 0;
  if (arr.length < 10) return arr[0];  // Pas assez de données pour cap
  const idx = Math.floor(arr.length * 0.02);
  return arr[idx] || 0;
}

/**
 * Calcule max positif/négatif séparés (pour TCAM où +2% et -2% = 100% largeur)
 * Utilise P98/P02 pour éviter que les outliers (ex: +10.94) écrasent toutes les barres
 * Ajoute mean/std pour calcul z-score (gradient indices)
 */
export function computeBarStats(data, cols) {
  const stats = {};
  for (const col of cols) {
    const vals = data.map(d => d[col]).filter(v => v != null && !isNaN(v));
    const posVals = vals.filter(v => v >= 0).sort((a, b) => a - b);
    const negVals = vals.filter(v => v < 0).map(v => Math.abs(v)).sort((a, b) => a - b);

    // Mean et std pour z-score (gradient indices)
    const mean = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const variance = vals.length > 1
      ? vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (vals.length - 1)
      : 0;
    const std = Math.sqrt(variance);

    stats[col] = {
      maxPos: getP98(posVals),
      maxNeg: getP98(negVals),
      min: vals.length > 0 ? getP02(vals.sort((a, b) => a - b)) : 0,
      max: vals.length > 0 ? getP98(vals.sort((a, b) => a - b)) : 1,
      mean,
      std
    };
  }
  return stats;
}

// &e STATS

// =============================================================================
// &s CELL_FORMAT — Formatage cellules avec unité et barre
// =============================================================================

/**
 * Détermine le type d'affichage depuis le ddict (type + unit)
 * Types retournés: pop (volumes/stocks/€), pct (%), tcam (évol), diff (diff pts), ind (indices/ratios), number (défaut)
 */
function getIndicType(colKey) {
  // Cas spéciaux population
  if (colKey === "P23_POP" || colKey === "P22_POP" || colKey === "P16_POP") return "pop";

  const { indic } = parseColKey(colKey);
  const info = INDICATEURS[indic];
  if (!info) return "number";

  const ddictType = info.type;  // stock, vol, pct, tx, vtcam, vevol, vdifp, ind, ratio
  const unit = info.unit || "";

  // Volumes, stocks, montants € → barre bleue + nombre formaté (séparateurs milliers)
  if (ddictType === "stock" || ddictType === "vol" || unit.includes("€")) return "pop";

  // Évolutions → barre rouge/verte
  if (ddictType === "vtcam" || ddictType === "vevol") return "tcam";

  // Différences en points → barre rouge/verte
  if (ddictType === "vdifp") return "diff";

  // Pourcentages et taux → barre bleue + X.X%
  if (ddictType === "pct" || ddictType === "tx" || unit === "%") return "pct";

  // Indices et ratios → formatage adapté (0-1 déc selon magnitude)
  if (ddictType === "ind" || ddictType === "ratio") return "ind";

  // Défaut
  return "number";
}

/**
 * Formate une valeur avec unité
 */
export function formatCellValue(value, colKey) {
  if (value == null) return "—";

  const type = getIndicType(colKey);
  switch (type) {
    case "pop":
      return Math.round(value).toLocaleString("fr-FR");
    case "tcam":
      const signT = value >= 0 ? "+" : "";
      return `${signT}${value.toFixed(2)}`;  // TCAM : 2 décimales
    case "diff":
      const signD = value >= 0 ? "+" : "";
      return `${signD}${value.toFixed(1)}`;  // vdifp : 1 décimale (pts %)
    case "pct":
      return `${value.toFixed(1)}%`;
    case "ind":
      // Indices/ratios : 0 déc si >=10, 1 déc si <10
      const decInd = Math.abs(value) >= 10 ? 0 : 1;
      return value.toFixed(decInd);
    default:
      return typeof value === "number" ? Math.round(value).toLocaleString("fr-FR") : value;
  }
}

/**
 * Génère une cellule avec barre de progression
 */
export function renderBarCell(value, colKey, stats) {
  if (value == null) return html`<span style="color:#999">—</span>`;

  const type = getIndicType(colKey);
  const colStats = stats[colKey] || { maxPos: 1, maxNeg: 1, max: 1 };
  const isNeg = value < 0;
  const isExtreme = value === colStats.min || value === colStats.max;
  const fontWeight = isExtreme ? "700" : "400";

  // === POP : barre bleue simple (Urban PAL_SEQ_BLUE légère) ===
  if (type === "pop") {
    const w = Math.min(value / colStats.max * 100, 100);
    return html`<div style="display:flex;align-items:center;gap:5px">
      <div style="width:55px;height:12px;background:#e5e7eb">
        <div style="width:${w}%;height:100%;background:#73bfe2"></div>
      </div>
      <span style="font-size:12px;font-weight:${fontWeight}">${Math.round(value).toLocaleString("fr-FR")}</span>
    </div>`;
  }

  // === PCT : barre bleue avec % (Urban PAL_SEQ_BLUE légère) ===
  if (type === "pct") {
    const w = Math.min(value / colStats.maxPos * 100, 100);
    return html`<div style="display:flex;align-items:center;gap:5px">
      <div style="width:55px;height:12px;background:#e5e7eb">
        <div style="width:${w}%;height:100%;background:#73bfe2"></div>
      </div>
      <span style="font-size:12px;font-weight:${fontWeight}">${value.toFixed(1)}%</span>
    </div>`;
  }

  // === IND : indices/ratios avec barre (même logique P02/P98 que TCAM, palette Urban) ===
  if (type === "ind") {
    const decInd = Math.abs(value) >= 10 ? 0 : 1;
    const mean = colStats.mean ?? value;
    const std = colStats.std ?? 0;
    const minVal = colStats.min ?? mean;
    const maxVal = colStats.max ?? mean;

    // Distance à la moyenne, normalisée sur P02/P98
    const distFromMean = value - mean;
    const isNegZ = distFromMean < 0;  // sous la moyenne

    // Largeur barre : même logique que TCAM (P02/P98 capé = barre pleine)
    // Normaliser sur la distance max du bon côté
    const maxDistNeg = mean - minVal;  // distance mean → P02
    const maxDistPos = maxVal - mean;  // distance mean → P98
    const maxDist = isNegZ ? maxDistNeg : maxDistPos;
    const w = maxDist > 0 ? Math.min(Math.abs(distFromMean) / maxDist * 100, 100) : 0;

    // Z-score pour intensité couleur
    const z = std > 0 ? distFromMean / std : 0;
    const absZ = Math.abs(z);

    // Palette Urban PAL_PURPLE_GREEN - 3 couleurs les moins fortes par côté
    // Intensité par paliers z-score : <1 base, 1-2 moyen, >2 fort
    let barColor, textColor;
    if (absZ < 1) {
      barColor = isNegZ ? "#eb99c2" : "#bcdeb4";  // rose pâle / vert très clair
      textColor = isNegZ ? "#af1f6b" : "#408941"; // violet / vert foncé
    } else if (absZ < 2) {
      barColor = isNegZ ? "#e46aa7" : "#98cf90";  // rose moyen / vert clair
      textColor = isNegZ ? "#af1f6b" : "#2c5c2d"; // violet / vert très foncé
    } else {
      barColor = isNegZ ? "#af1f6b" : "#408941";  // violet / vert moyen
      textColor = isNegZ ? "#761548" : "#2c5c2d"; // violet foncé / vert très foncé
    }

    const arrow = isNegZ ? "▼" : "▲";

    return html`<div style="display:flex;align-items:center;gap:4px">
      <span style="font-size:10px;color:${barColor}">${arrow}</span>
      <div style="width:50px;height:12px;background:#e5e7eb">
        <div style="width:${w}%;height:100%;background:${barColor}"></div>
      </div>
      <span style="font-size:12px;color:${textColor};font-weight:${fontWeight}">${value.toFixed(decInd)}</span>
    </div>`;
  }

  // === TCAM/DIFF : triangle + barre violet/vert (palette Urban légère) ===
  const max = isNeg ? colStats.maxNeg : colStats.maxPos;
  const w = Math.min(Math.abs(value) / max * 100, 100);
  // Palette Urban PAL_PURPLE_GREEN - variantes moyennes (pas les plus saturées)
  const barColor = isNeg ? "#e46aa7" : "#98cf90";  // rose moyen / vert pâle
  const textColor = isNeg ? "#af1f6b" : "#2c5c2d"; // violet foncé / vert TRÈS foncé
  const arrow = isNeg ? "▼" : "▲";
  const sign = value >= 0 ? "+" : "";
  const decimals = type === "diff" ? 1 : 2;  // vdifp: 1 déc, vtcam: 2 déc

  return html`<div style="display:flex;align-items:center;gap:4px">
    <span style="font-size:10px;color:${barColor}">${arrow}</span>
    <div style="width:50px;height:12px;background:#e5e7eb">
      <div style="width:${w}%;height:100%;background:${barColor}"></div>
    </div>
    <span style="font-size:12px;color:${textColor};font-weight:${fontWeight}">${sign}${value.toFixed(decimals)}</span>
  </div>`;
}

// &e CELL_FORMAT

// =============================================================================
// &s HEADER — En-tête triable avec unité
// =============================================================================

/**
 * Génère un <th> cliquable avec flèche de tri
 * Colonne active : fond bleu ciel + gras
 * @param {string} periode - Période optionnelle (ex: "16-22")
 */
export function renderSortHeader(col, label, sortCol, sortAsc, setSort, unit = "", periode = "") {
  const isActive = sortCol === col;
  const arrow = isActive ? (sortAsc ? " ↑" : " ↓") : "";
  // Colonne active : fond bleu clair + gras (contraste sur fond gris #e5e7eb)
  const activeStyle = isActive ? "background:#bfdbfe;font-weight:700;" : "";

  // Ligne 2 : unité + période en italique
  const line2Parts = [];
  if (unit) line2Parts.push(unit);
  if (periode) line2Parts.push(periode);
  const line2 = line2Parts.join(" · ");

  return html`<th
    style="cursor:pointer;user-select:none;white-space:nowrap;font-size:13px;padding:8px 6px;${activeStyle}"
    onclick=${() => setSort(col)}>
    ${label}${arrow}
    ${line2 ? html`<br><i style="font-weight:400;font-size:10px;color:#666">${line2}</i>` : ""}
  </th>`;
}

/**
 * Récupère l'unité d'un indicateur
 */
export function getIndicUnit(colKey) {
  if (colKey === "P23_POP" || colKey === "P22_POP" || colKey === "P16_POP") return "hab";
  const { indic } = parseColKey(colKey);
  return INDICATEURS[indic]?.unit || "";
}

// &e HEADER

// =============================================================================
// &s PAGINATION — Contrôles pagination
// =============================================================================

/**
 * Calcule les infos de pagination
 */
export function getPaginationInfo(totalItems, page, pageSize = 50) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  return {
    totalPages,
    currentPage: safePage,
    startIndex: safePage * pageSize,
    endIndex: Math.min((safePage + 1) * pageSize, totalItems),
    hasPrev: safePage > 0,
    hasNext: safePage < totalPages - 1
  };
}

/**
 * Génère les contrôles de pagination
 */
export function renderPagination(totalItems, page, setPage, pageSize = 50, filterInfo = "") {
  const { totalPages, currentPage, hasPrev, hasNext } = getPaginationInfo(totalItems, page, pageSize);

  return html`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
    <span style="font-size:13px;color:#6b7280;">${totalItems} communes${filterInfo}</span>
    <div style="display:flex;gap:4px;">
      <button
        style="padding:2px 8px;font-size:11px;cursor:${hasPrev ? 'pointer' : 'default'};opacity:${hasPrev ? 1 : 0.5};"
        onclick=${() => hasPrev && setPage(currentPage - 1)}
        disabled=${!hasPrev}>◀</button>
      <span style="font-size:11px;padding:2px 6px;">${currentPage + 1} / ${totalPages}</span>
      <button
        style="padding:2px 8px;font-size:11px;cursor:${hasNext ? 'pointer' : 'default'};opacity:${hasNext ? 1 : 0.5};"
        onclick=${() => hasNext && setPage(currentPage + 1)}
        disabled=${!hasNext}>▶</button>
    </div>
  </div>`;
}

// &e PAGINATION

// =============================================================================
// &s RENDER_TABLE — Rendu complet tableau
// =============================================================================

/**
 * Génère le tableau complet HTML
 * @param {Object} options
 * @param {Array} options.data - Données à afficher (déjà paginées)
 * @param {Array} options.columns - [{key, label, unit?, type?}]
 * @param {Object} options.stats - Stats pour barres (computeBarStats)
 * @param {string} options.sortCol - Colonne de tri actuelle
 * @param {boolean} options.sortAsc - Tri ascendant
 * @param {Function} options.setSort - Callback tri
 * @param {string} options.indicColKey - Clé colonne indicateur principal
 * @param {boolean} [options.compact=false] - Mode compact (réduit padding/font)
 * @param {number} [options.maxHeight] - Hauteur max avec scroll vertical
 * @param {boolean} [options.scrollX=false] - Scroll horizontal si dépasse
 * @param {boolean} [options.stickyFirstCol=true] - Première colonne sticky en scroll horizontal
 * @param {boolean} [options.scrollbarTop=false] - Scrollbar horizontal en haut
 */
export function renderTable({ data, columns, stats, sortCol, sortAsc, setSort, indicColKey, compact = false, maxHeight, scrollX = false, stickyFirstCol = true, scrollbarTop = false, highlightFrance = false }) {
  // Styles compact vs normal
  const thPad = compact ? "4px 3px" : "6px 5px";
  const thFont = compact ? "11px" : "13px";
  const tdFont = compact ? "11px" : "12px";
  const barWidth = compact ? "50px" : "70px";  // Barres plus larges
  const labelMaxW = compact ? "140px" : "200px";

  // Style sticky première colonne
  const stickyStyle = stickyFirstCol ? "position:sticky;left:0;z-index:2;background:#fff;" : "";
  const stickyHeaderStyle = stickyFirstCol ? "position:sticky;left:0;z-index:3;background:#e5e7eb;" : "";

  // Note: scrollbarTop handled in wrapper section at end

  const tableEl = html`<table class="styled-table" style="border-collapse:collapse;${compact ? "font-size:11px;" : ""}">
    <thead style="position:sticky;top:0;z-index:10;background:#e5e7eb;">
      <tr style="border-bottom:3px solid #9ca3af;background:#e5e7eb;">
        ${columns.map((c, i) => renderSortHeaderCompact(c.key, c.label, sortCol, sortAsc, setSort, c.unit || getIndicUnit(c.key), c.periode || "", compact, i === 0 ? stickyHeaderStyle : ""))}
      </tr>
    </thead>
    <tbody>
      ${data.map(d => {
        const isFranceRow = d.code === "00FR";
        const showYellowBg = highlightFrance && isFranceRow;
        const frBg = isFranceRow ? "#f0f9ff" : (showYellowBg ? "#fef9c3" : "#fff");
        // France row : sticky avec top adapté au mode compact
        const frStickyTop = compact ? "32px" : "46px";
        const frStyle = isFranceRow
          ? `position:sticky;top:${frStickyTop};z-index:9;background:${frBg};font-weight:600;box-shadow:0 2px 0 #93c5fd;`
          : "";
        return html`<tr style="${frStyle}">
          ${columns.map((c, i) => {
            const isFirstCol = i === 0;
            const cellStickyStyle = isFirstCol && stickyFirstCol ? `position:sticky;left:0;z-index:1;background:${frBg};` : "";
            if (c.type === "text" || c.key === "code" || c.key === "libelle" || c.key === "DEP") {
              const style = c.key === "code" ? `font-family:monospace;font-size:${compact ? "10px" : "11px"};${cellStickyStyle}` :
                            c.key === "libelle" ? `font-weight:500;font-size:${tdFont};max-width:${labelMaxW};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${cellStickyStyle}` :
                            c.key === "DEP" ? `font-size:${compact ? "10px" : "11px"};text-align:center;${cellStickyStyle}` : cellStickyStyle;
              // Libelle avec regdep en petit italique à côté si disponible
              if (c.key === "libelle" && d.regdep) {
                return html`<td style="${style}">${d[c.key] || "—"}<i style="font-size:9px;color:#888;font-weight:400;margin-left:8px;">${d.regdep}</i></td>`;
              }
              return html`<td style="${style}">${d[c.key] || "—"}</td>`;
            }
            return html`<td style="${cellStickyStyle}">${renderBarCellCompact(d[c.key], c.key, stats, compact)}</td>`;
          })}
        </tr>`;
      })}
    </tbody>
  </table>`;

  // Si scroll, wrapper div avec scrollbar en haut si demandé
  if (scrollX || maxHeight) {
    const mainWrapperStyle = [
      scrollX ? "overflow-x:auto;" : "",
      maxHeight ? `max-height:${maxHeight}px;overflow-y:auto;` : ""
    ].join("");

    if (scrollbarTop && scrollX) {
      // Dual scrollbar: top + bottom synced
      const topScrollId = `scroll-top-${Math.random().toString(36).slice(2,9)}`;
      const mainScrollId = `scroll-main-${Math.random().toString(36).slice(2,9)}`;

      // Create container with top scroll + main content
      const container = document.createElement("div");
      container.style.cssText = "display:flex;flex-direction:column;";

      // Top scrollbar (fake div that shows scrollbar)
      const topScroll = document.createElement("div");
      topScroll.id = topScrollId;
      topScroll.style.cssText = "overflow-x:auto;overflow-y:hidden;height:12px;";
      const topInner = document.createElement("div");
      topInner.style.cssText = "height:1px;"; // Will be resized to match table width
      topScroll.appendChild(topInner);

      // Main content scroll area
      const mainScroll = document.createElement("div");
      mainScroll.id = mainScrollId;
      mainScroll.style.cssText = mainWrapperStyle;
      mainScroll.appendChild(tableEl);

      container.appendChild(topScroll);
      container.appendChild(mainScroll);

      // Sync scrolls after render
      setTimeout(() => {
        const tableWidth = tableEl.scrollWidth || tableEl.offsetWidth || 1000;
        topInner.style.width = tableWidth + "px";

        topScroll.addEventListener("scroll", () => {
          mainScroll.scrollLeft = topScroll.scrollLeft;
        });
        mainScroll.addEventListener("scroll", () => {
          topScroll.scrollLeft = mainScroll.scrollLeft;
        });
      }, 100);

      return container;
    }
    return html`<div style="${mainWrapperStyle}">${tableEl}</div>`;
  }
  return tableEl;
}

/**
 * Header compact variant
 */
function renderSortHeaderCompact(col, label, sortCol, sortAsc, setSort, unit = "", periode = "", compact = false, extraStyle = "") {
  const isActive = sortCol === col;
  const arrow = isActive ? (sortAsc ? " ↑" : " ↓") : "";
  const activeStyle = isActive ? "background:#bfdbfe;font-weight:700;" : "";
  const pad = compact ? "4px 3px" : "6px 5px";
  const font = compact ? "11px" : "13px";

  const line2Parts = [];
  if (unit) line2Parts.push(unit);
  if (periode) line2Parts.push(periode);
  const line2 = line2Parts.join(" · ");

  return html`<th
    style="cursor:pointer;user-select:none;white-space:nowrap;font-size:${font};padding:${pad};${activeStyle}${extraStyle}"
    onclick=${() => setSort(col)}>
    ${label}${arrow}
    ${line2 ? html`<br><i style="font-weight:400;font-size:${compact ? "10px" : "11px"};color:#666">${line2}</i>` : ""}
  </th>`;
}

/**
 * Bar cell compact variant
 */
function renderBarCellCompact(value, colKey, stats, compact = false) {
  if (value == null) return html`<span style="color:#999">—</span>`;

  const type = getIndicType(colKey);
  const colStats = stats[colKey] || { maxPos: 1, maxNeg: 1, max: 1 };
  const isNeg = value < 0;
  // Barres plus larges
  const barW = compact ? "50px" : "70px";
  const barH = compact ? "10px" : "12px";
  const fontSize = compact ? "11px" : "12px";
  // Urban Institute blue (signature color from PAL_SEQ_BLUE)
  const urbanBlue = "#1696D2";

  // POP : barre bleue légère (Urban PAL_SEQ_BLUE)
  if (type === "pop") {
    const w = Math.min(value / colStats.max * 100, 100);
    return html`<div style="display:flex;align-items:center;gap:${compact ? "3px" : "5px"}">
      <div style="width:${barW};height:${barH};background:#e5e7eb;border-radius:2px;">
        <div style="width:${w}%;height:100%;background:#73bfe2;border-radius:2px;"></div>
      </div>
      <span style="font-size:${fontSize}">${Math.round(value).toLocaleString("fr-FR")}</span>
    </div>`;
  }

  // PCT : barre bleue légère (Urban PAL_SEQ_BLUE)
  if (type === "pct") {
    const w = Math.min(value / colStats.maxPos * 100, 100);
    return html`<div style="display:flex;align-items:center;gap:${compact ? "3px" : "5px"}">
      <div style="width:${barW};height:${barH};background:#e5e7eb;border-radius:2px;">
        <div style="width:${w}%;height:100%;background:#73bfe2;border-radius:2px;"></div>
      </div>
      <span style="font-size:${fontSize}">${value.toFixed(1)}%</span>
    </div>`;
  }

  // IND : indices/ratios avec barre (même logique P02/P98 que TCAM, palette Urban)
  if (type === "ind") {
    const decInd = Math.abs(value) >= 10 ? 0 : 1;
    const mean = colStats.mean ?? value;
    const std = colStats.std ?? 0;
    const minVal = colStats.min ?? mean;
    const maxVal = colStats.max ?? mean;

    // Distance à la moyenne, normalisée sur P02/P98
    const distFromMean = value - mean;
    const isNegZ = distFromMean < 0;

    // Largeur barre : P02/P98 capé = barre pleine
    const maxDistNeg = mean - minVal;
    const maxDistPos = maxVal - mean;
    const maxDist = isNegZ ? maxDistNeg : maxDistPos;
    const w = maxDist > 0 ? Math.min(Math.abs(distFromMean) / maxDist * 100, 100) : 0;

    // Z-score pour intensité couleur
    const z = std > 0 ? distFromMean / std : 0;
    const absZ = Math.abs(z);

    // Palette Urban PAL_PURPLE_GREEN - 3 couleurs les moins fortes
    let barColor, textColor;
    if (absZ < 1) {
      barColor = isNegZ ? "#eb99c2" : "#bcdeb4";
      textColor = isNegZ ? "#af1f6b" : "#408941";
    } else if (absZ < 2) {
      barColor = isNegZ ? "#e46aa7" : "#98cf90";
      textColor = isNegZ ? "#af1f6b" : "#2c5c2d";
    } else {
      barColor = isNegZ ? "#af1f6b" : "#408941";
      textColor = isNegZ ? "#761548" : "#2c5c2d";
    }

    const arrow = isNegZ ? "▼" : "▲";

    // Mêmes dimensions que TCAM compact
    return html`<div style="display:flex;align-items:center;gap:${compact ? "2px" : "4px"}">
      <span style="font-size:${compact ? "8px" : "10px"};color:${barColor}">${arrow}</span>
      <div style="width:${compact ? "45px" : "65px"};height:${barH};background:#e5e7eb;border-radius:2px;">
        <div style="width:${w}%;height:100%;background:${barColor};border-radius:2px;"></div>
      </div>
      <span style="font-size:${fontSize};color:${textColor}">${value.toFixed(decInd)}</span>
    </div>`;
  }

  // TCAM/DIFF - barres violet/vert légères (Urban PAL_PURPLE_GREEN)
  const max = isNeg ? colStats.maxNeg : colStats.maxPos;
  const w = Math.min(Math.abs(value) / max * 100, 100);
  const barColor = isNeg ? "#e46aa7" : "#98cf90";  // rose moyen / vert pâle
  const textColor = isNeg ? "#af1f6b" : "#2c5c2d"; // violet foncé / vert TRÈS foncé
  const arrow = isNeg ? "▼" : "▲";
  const sign = value >= 0 ? "+" : "";
  const decimals = type === "diff" ? 1 : 2;  // vdifp: 1 déc, vtcam: 2 déc

  return html`<div style="display:flex;align-items:center;gap:${compact ? "2px" : "4px"}">
    <span style="font-size:${compact ? "8px" : "10px"};color:${barColor}">${arrow}</span>
    <div style="width:${compact ? "45px" : "65px"};height:${barH};background:#e5e7eb;border-radius:2px;">
      <div style="width:${w}%;height:100%;background:${barColor};border-radius:2px;"></div>
    </div>
    <span style="font-size:${fontSize};color:${textColor}">${sign}${value.toFixed(decimals)}</span>
  </div>`;
}

// &e RENDER_TABLE

// =============================================================================
// &s EXPORT_CSV — Export CSV
// =============================================================================

/**
 * Export données en CSV avec téléchargement
 */
export function exportCSV(data, columns, filename = "export.csv") {
  const sep = ";";
  const headers = columns.map(c => c.label || c.key).join(sep);
  const rows = data.map(d =>
    columns.map(c => {
      const v = d[c.key];
      if (v == null) return "";
      if (typeof v === "number") return String(v).replace(".", ",");
      const str = String(v);
      return str.includes(sep) || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(sep)
  ).join("\n");

  const csv = "\ufeff" + headers + "\n" + rows;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// &e EXPORT_CSV

// =============================================================================
// &s TABLE_TOOLBAR — Barre outils tableau (search + export)
// =============================================================================

/**
 * Crée la toolbar tableau avec recherche et export CSV
 *
 * @param {Object} config
 * @param {Function} config.onSearch - Callback recherche (value) => void
 * @param {Function} config.onExportCSV - Callback export () => void
 * @param {string} [config.placeholder="Filtrer..."]
 * @param {string} [config.searchValue=""] - Valeur initiale recherche
 * @returns {HTMLElement}
 */
export function createTableToolbar(config) {
  const {
    onSearch,
    onExportCSV,
    placeholder = "Filtrer...",
    searchValue = ""
  } = config;

  const toolbar = document.createElement("div");
  toolbar.className = "table-toolbar";
  toolbar.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:8px;";

  // Input recherche
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = placeholder;
  searchInput.value = searchValue;
  searchInput.className = "table-search-input";
  searchInput.style.cssText = "padding:4px 8px;font-size:12px;border:1px solid #d1d5db;border-radius:4px;width:180px;";
  searchInput.addEventListener("input", (e) => onSearch?.(e.target.value));
  toolbar.appendChild(searchInput);

  // Spacer
  const spacer = document.createElement("div");
  spacer.style.flex = "1";
  toolbar.appendChild(spacer);

  // Bouton CSV
  const csvBtn = document.createElement("button");
  csvBtn.innerHTML = "📥 CSV";
  csvBtn.className = "table-btn-export";
  csvBtn.style.cssText = "font-size:11px;padding:4px 8px;cursor:pointer;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;";
  csvBtn.onclick = onExportCSV;
  toolbar.appendChild(csvBtn);

  return toolbar;
}

// &e TABLE_TOOLBAR

// =============================================================================
// &s BUILD_COLUMNS — Construction colonnes dynamiques
// =============================================================================

/**
 * Construit les colonnes tableau dynamiquement
 *
 * @param {string[]} indicCols - Colonnes indicateurs (ex: ["dm_pop_vtcam_1622", ...])
 * @param {Object} options
 * @param {boolean} [options.includeGeo=true] - Inclure code/libelle/DEP
 * @param {boolean} [options.includePop=true] - Inclure P22_POP
 * @param {Function} [options.getLabel] - (indic) => label
 * @param {Function} [options.getPeriodeLabel] - (periode) => label formaté
 * @returns {Object[]} Colonnes formatées pour renderTable
 */
export function buildTableColumns(indicCols, options = {}) {
  const {
    includeGeo = true,
    includePop = true,
    getLabel = (indic) => indic,
    getPeriodeLabel = (per) => per
  } = options;

  const baseCols = [];
  if (includeGeo) {
    baseCols.push(
      { key: "code", label: "Code", type: "text", width: "70px" },
      { key: "libelle", label: "Commune", type: "text", width: "180px" }
      // DEP viré - regdep affiché sous libelle
    );
  }
  if (includePop) {
    baseCols.push({ key: "P23_POP", label: "Pop 2023", unit: "hab" });
  }

  const extractPeriode = (colKey) => {
    const match = colKey.match(/_(\d{2,4})$/);
    return match ? match[1] : "";
  };

  const indicColsDef = indicCols.map(col => {
    const indic = col.replace(/_\d+$/, "");
    const per = extractPeriode(col);
    return {
      key: col,
      label: getLabel(indic),
      unit: getIndicUnit(col),
      periode: per ? getPeriodeLabel(per) : ""
    };
  });

  return [...baseCols, ...indicColsDef];
}

// &e BUILD_COLUMNS

