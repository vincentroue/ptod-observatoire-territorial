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
  const textCols = ["code", "libelle", "DEP", "libelle_dep", "libelle_reg", "regshort"];

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
export function computeBarStats(data, cols, franceRow = null) {
  // Si franceRow non fourni, tenter de le trouver dans data
  const fr = franceRow || data.find(d => d.code === "00FR") || null;
  const stats = {};
  for (const col of cols) {
    const vals = data.map(d => d[col]).filter(v => v != null && !isNaN(v));
    const posVals = vals.filter(v => v >= 0).sort((a, b) => a - b);
    const negVals = vals.filter(v => v < 0).map(v => Math.abs(v)).sort((a, b) => a - b);

    // Mean et std pour z-score
    const mean = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const variance = vals.length > 1
      ? vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (vals.length - 1)
      : 0;
    const std = Math.sqrt(variance);

    // Référence France (fallback = mean si absent)
    const franceRef = (fr && fr[col] != null && !isNaN(fr[col])) ? fr[col] : null;

    stats[col] = {
      maxPos: getP98(posVals),
      maxNeg: getP98(negVals),
      min: vals.length > 0 ? getP02(vals.sort((a, b) => a - b)) : 0,
      max: vals.length > 0 ? getP98(vals.sort((a, b) => a - b)) : 1,
      mean,
      std,
      franceRef
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

  // Évolutions → barre rouge/verte (vtcam 2 déc, vevol 1 déc)
  if (ddictType === "vtcam") return "tcam";
  if (ddictType === "vevol") return "vevol";

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
 * Polarity : +1 si valeur haute = favorable, -1 si valeur haute = défavorable
 * Utilisé pour colorer violet/vert les pct/ind par rapport à France
 */
function getPolarity(colKey) {
  const { indic } = parseColKey(colKey);
  // Indicateurs négatifs : au-dessus de France = défavorable (violet)
  const NEGATIVE_INDICS = [
    "rev_txpauv", "soc_txchom", "soc_txchom_1564",
    "dmv_iv", "dmv_iv_alt",
    "log_txvac", "log_rplocaux_pct",
    "logd_txeffort",
    "men_monop_pct"
  ];
  if (NEGATIVE_INDICS.includes(indic)) return -1;
  // Certains patterns négatifs
  if (indic.includes("txpauv") || indic.includes("txchom") || indic.includes("vieill")) return -1;
  return 1;
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
    case "vevol":
      const signV = value >= 0 ? "+" : "";
      return `${signV}${value.toFixed(1)}`;  // vevol : 1 décimale
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
  // Délègue à la version compact=false
  return renderBarCellCompact(value, colKey, stats, false);
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
 * @param {boolean|number} [options.stickyFirstCol=true] - Colonnes sticky: true=1 col, 2=2 cols, false=0
 * @param {boolean} [options.scrollbarTop=false] - Scrollbar horizontal en haut
 */
export function renderTable({ data, columns, stats, sortCol, sortAsc, setSort, indicColKey, compact = false, maxHeight, scrollX = false, stickyFirstCol = true, scrollbarTop = false, highlightFrance = false }) {
  // Styles compact vs normal
  const thPad = compact ? "4px 3px" : "6px 5px";
  const thFont = compact ? "11px" : "13px";
  const tdFont = compact ? "11px" : "12px";
  const barWidth = compact ? "50px" : "70px";  // Barres plus larges
  const labelMaxW = compact ? "140px" : "200px";

  // Sticky columns: boolean (1 col) ou number (N cols freeze)
  const nSticky = typeof stickyFirstCol === 'number' ? stickyFirstCol : (stickyFirstCol ? 1 : 0);
  const stickyLeftPx = [];
  let _cumLeft = 0;
  for (let si = 0; si < nSticky && si < columns.length; si++) {
    stickyLeftPx.push(_cumLeft);
    const cw = columns[si];
    const w = typeof cw.width === 'number' ? cw.width :
              typeof cw.width === 'string' ? parseInt(cw.width) :
              (cw.key === 'regshort' ? 50 : cw.key === 'code' ? 70 : 150);
    _cumLeft += w + (compact ? 8 : 12);
  }
  const getCellSticky = (idx, bg) => idx < nSticky
    ? `position:sticky;left:${stickyLeftPx[idx]}px;z-index:${nSticky - idx + 1};background:${bg};min-width:${columns[idx].width || 50}px;`
    : "";
  const getHeaderSticky = (idx) => idx < nSticky
    ? `position:sticky;left:${stickyLeftPx[idx]}px;z-index:${nSticky - idx + 10};background:#e5e7eb;min-width:${columns[idx].width || 50}px;`
    : "";

  // Note: scrollbarTop handled in wrapper section at end

  const tableEl = html`<table class="styled-table" style="border-collapse:collapse;${compact ? "font-size:11px;" : ""}">
    <thead style="position:sticky;top:0;z-index:10;background:#e5e7eb;">
      <tr style="border-bottom:3px solid #9ca3af;background:#e5e7eb;">
        ${columns.map((c, i) => renderSortHeaderCompact(c.key, c.label, sortCol, sortAsc, setSort, c.unit || getIndicUnit(c.key), c.periode || "", compact, getHeaderSticky(i)))}
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
            const cellStickyStyle = getCellSticky(i, frBg);
            if (c.type === "text" || c.key === "code" || c.key === "libelle" || c.key === "DEP" || c.key === "regshort") {
              const style = c.key === "code" ? `font-family:monospace;font-size:${compact ? "10px" : "11px"};${cellStickyStyle}` :
                            c.key === "libelle" ? `font-weight:500;font-size:${tdFont};max-width:${labelMaxW};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${cellStickyStyle}` :
                            c.key === "DEP" ? `font-size:${compact ? "10px" : "11px"};text-align:center;${cellStickyStyle}` :
                            c.key === "regshort" ? `font-size:${compact ? "10px" : "11px"};text-align:center;color:#6b7280;${cellStickyStyle}` : cellStickyStyle;
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
      container.style.cssText = "display:flex;flex-direction:column;flex:1;min-height:0;";

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
      mainScroll.style.cssText = mainWrapperStyle + "flex:1;min-height:0;";
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
  const barW = compact ? "50px" : "70px";
  const barH = compact ? "10px" : "12px";
  const fontSize = compact ? "11px" : "12px";

  // Référence France (fallback = mean)
  const ref = colStats.franceRef ?? colStats.mean ?? 0;
  const std = colStats.std ?? 0;

  // Palette violet/vert avec polarité (3 bins z-score)
  // polarity: +1 = au-dessus de ref = favorable (vert), -1 = au-dessus = défavorable (violet)
  const polarity = getPolarity(colKey);
  const getVioletGreen = (zScore, aboveRef) => {
    const absZ = Math.abs(zScore);
    // favorable = vert, défavorable = violet
    const isFavorable = polarity > 0 ? aboveRef : !aboveRef;
    let barColor, textColor;
    if (absZ < 1) {
      barColor = isFavorable ? "#bcdeb4" : "#eb99c2";
      textColor = isFavorable ? "#408941" : "#af1f6b";
    } else if (absZ < 2.5) {
      barColor = isFavorable ? "#98cf90" : "#e46aa7";
      textColor = isFavorable ? "#2c5c2d" : "#af1f6b";
    } else {
      barColor = isFavorable ? "#5aaa5a" : "#af1f6b";
      textColor = isFavorable ? "#2c5c2d" : "#761548";
    }
    return { barColor, textColor };
  };

  // POP/STOCK : barre bleue, z-score vs France
  if (type === "pop") {
    const w = Math.min(value / colStats.max * 100, 100);
    const popZ = std > 0 ? Math.abs(value - ref) / std : 0;
    const popBarColor = popZ < 1 ? "#A2D4EC" : popZ < 2.5 ? "#73BFE2" : "#1696D2";
    return html`<div style="display:flex;align-items:center;gap:${compact ? "3px" : "5px"}">
      <div style="width:${barW};height:${barH};background:#e5e7eb;border-radius:2px;">
        <div style="width:${w}%;height:100%;background:${popBarColor};border-radius:2px;"></div>
      </div>
      <span style="font-size:${fontSize}">${Math.round(value).toLocaleString("fr-FR")}</span>
    </div>`;
  }

  // PCT : barre proportionnelle valeur, violet/vert vs France + polarité
  if (type === "pct") {
    const w = Math.min(value / colStats.maxPos * 100, 100);
    const aboveRef = value >= ref;
    const pctZ = std > 0 ? (value - ref) / std : 0;
    const { barColor, textColor } = getVioletGreen(pctZ, aboveRef);
    return html`<div style="display:flex;align-items:center;gap:${compact ? "3px" : "5px"}">
      <div style="width:${barW};height:${barH};background:#e5e7eb;border-radius:2px;">
        <div style="width:${w}%;height:100%;background:${barColor};border-radius:2px;"></div>
      </div>
      <span style="font-size:${fontSize};color:${textColor}">${value.toFixed(1)}%</span>
    </div>`;
  }

  // IND : barre proportionnelle écart à France, violet/vert + polarité
  if (type === "ind") {
    const decInd = Math.abs(value) >= 10 ? 0 : 1;
    const minVal = colStats.min ?? ref;
    const maxVal = colStats.max ?? ref;

    const distFromRef = value - ref;
    const aboveRef = distFromRef >= 0;

    // Largeur barre : normalisée P02/P98 autour de la ref France
    const maxDistNeg = ref - minVal;
    const maxDistPos = maxVal - ref;
    const maxDist = aboveRef ? maxDistPos : maxDistNeg;
    const w = maxDist > 0 ? Math.min(Math.abs(distFromRef) / maxDist * 100, 100) : 0;

    const z = std > 0 ? distFromRef / std : 0;
    const { barColor, textColor } = getVioletGreen(z, aboveRef);
    const arrow = aboveRef ? "▲" : "▼";

    return html`<div style="display:flex;align-items:center;gap:${compact ? "2px" : "4px"}">
      <span style="font-size:${compact ? "8px" : "10px"};color:${barColor}">${arrow}</span>
      <div style="width:${compact ? "45px" : "65px"};height:${barH};background:#e5e7eb;border-radius:2px;">
        <div style="width:${w}%;height:100%;background:${barColor};border-radius:2px;"></div>
      </div>
      <span style="font-size:${fontSize};color:${textColor}">${value.toFixed(decInd)}</span>
    </div>`;
  }

  // TCAM/DIFF : inchangé — signe détermine la couleur
  const max = isNeg ? colStats.maxNeg : colStats.maxPos;
  const w = Math.min(Math.abs(value) / max * 100, 100);
  const tcamZ = std > 0 ? Math.abs(value - (colStats.mean ?? 0)) / std : 0;

  let barColor, textColor;
  if (tcamZ < 1) {
    barColor = isNeg ? "#eb99c2" : "#bcdeb4";
    textColor = isNeg ? "#af1f6b" : "#408941";
  } else if (tcamZ < 2.5) {
    barColor = isNeg ? "#e46aa7" : "#98cf90";
    textColor = isNeg ? "#af1f6b" : "#2c5c2d";
  } else {
    barColor = isNeg ? "#af1f6b" : "#5aaa5a";
    textColor = isNeg ? "#761548" : "#2c5c2d";
  }

  const arrow = isNeg ? "▼" : "▲";
  const sign = value >= 0 ? "+" : "";
  const decimals = (type === "diff" || type === "vevol") ? 1 : 2;

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

  // Bouton plein écran (si callback fourni)
  if (config.onFullscreen) {
    const fsBtn = document.createElement("button");
    fsBtn.textContent = "⤢";
    fsBtn.title = "Plein écran";
    fsBtn.className = "table-btn-fullscreen";
    fsBtn.style.cssText = "font-size:14px;padding:4px 8px;cursor:pointer;background:#f3f4f6;border:1px solid #d1d5db;border-radius:3px;";
    fsBtn.onclick = config.onFullscreen;
    toolbar.appendChild(fsBtn);
  }

  return toolbar;
}

// &e TABLE_TOOLBAR

// =============================================================================
// &s TABLE_FULLSCREEN — Plein écran CSS-in-place (pas de MOVE DOM)
// =============================================================================

/**
 * Ouvre un tableau en plein écran via CSS position:fixed IN PLACE.
 * L'élément reste dans le DOM Observable → tri/filtre/re-render fonctionnent.
 * Un MutationObserver ré-applique le style fullscreen si Observable recrée l'élément.
 *
 * @param {HTMLElement} tableSourceEl - Élément contenant le tableau
 */
export function openTableFullscreen(tableSourceEl) {
  const targetClass = tableSourceEl.className.split(" ")[0];
  const parentEl = tableSourceEl.parentNode;
  let currentEl = tableSourceEl;
  let origStyle = tableSourceEl.style.cssText;

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0);z-index:9998;transition:background 0.2s;";
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => { backdrop.style.background = "rgba(0,0,0,0.65)"; });

  function applyFullscreen(el) {
    origStyle = el.style.cssText;
    // Unlock inner scroll constraints
    el.querySelectorAll("div").forEach(d => {
      if (d.style.maxHeight && d.style.maxHeight !== "none") {
        d.dataset.origmh = d.style.maxHeight;
        d.style.maxHeight = "none";
      }
    });
    // Fullscreen via CSS in place (element stays in Observable DOM)
    el.style.cssText = "position:fixed;top:4vh;left:4vw;width:92vw;height:88vh;max-width:1600px;"
      + "z-index:9999;padding:16px;background:white;border-radius:8px;"
      + "box-shadow:0 8px 32px rgba(0,0,0,0.3);overflow:auto;";
    // Close button
    if (!el.querySelector(".tbl-fs-close")) {
      const btn = document.createElement("button");
      btn.innerHTML = "&times;";
      btn.className = "tbl-fs-close";
      btn.style.cssText = "position:sticky;top:0;float:right;font-size:26px;background:white;"
        + "border:none;cursor:pointer;color:#666;z-index:10;line-height:1;padding:0 4px;";
      btn.onclick = close;
      el.insertBefore(btn, el.firstChild);
    }
    currentEl = el;
  }

  applyFullscreen(tableSourceEl);

  // Observer : quand Observable re-render (tri/filtre), ré-appliquer fullscreen au nouvel élément
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1 && node.classList?.contains(targetClass)) {
          applyFullscreen(node);
        }
      }
    }
  });
  observer.observe(parentEl, { childList: true });

  function close() {
    observer.disconnect();
    // Restaurer styles
    currentEl.style.cssText = origStyle;
    currentEl.querySelectorAll("[data-origmh]").forEach(d => {
      d.style.maxHeight = d.dataset.origmh;
      delete d.dataset.origmh;
    });
    const btn = currentEl.querySelector(".tbl-fs-close");
    if (btn) btn.remove();
    backdrop.remove();
    document.removeEventListener("keydown", onEsc);
  }

  const onEsc = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onEsc);
  backdrop.onclick = close;
}

// &e TABLE_FULLSCREEN

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

