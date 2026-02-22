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
    unit = "",
    capped = false, rawMin, rawMax
  } = config;

  // Fallback: BYRV warm gradient (synced with PAL_SEQ7_BYRV)
  const safeColors = Array.isArray(colors) && colors.length > 0
    ? colors
    : ["#f0ebe0", "#ffe68a", "#fecc5c", "#fd8d3c", "#fc4e2a", "#bd0026", "#5b1a8c"];

  // Formatage avec indicateur cap si nécessaire
  const formatVal = (val, isMin) => {
    if (val == null) return '−';
    const a = Math.abs(val);
    const dec = a >= 10 ? 0 : Math.max(decimals, 1);
    const formatted = dec === 0 ? Math.round(val).toLocaleString("fr-FR") : val.toFixed(dec);
    if (capped) {
      return isMin ? `≤${formatted}` : `≥${formatted}`;
    }
    return isMin ? formatted : (val >= 0 ? `+${formatted}` : formatted);
  };

  const gMin = formatVal(min, true);
  const gMax = formatVal(max, false);

  // Styles inline pour autonomie
  const wrapperStyle = "padding:6px 0;min-width:120px;";
  const titleStyle = "font-size:9px;font-weight:600;color:#374151;margin-bottom:4px;text-align:center;";
  const barStyle = `height:8px;border-radius:2px;border:0.5px solid rgba(0,0,0,0.2);margin:2px 0;background:linear-gradient(to right, ${safeColors.join(', ')});`;
  const axisStyle = "display:flex;align-items:center;font-size:8.5px;color:#4b5563;font-variant-numeric:tabular-nums;gap:2px;";
  const minStyle = "color:#5b1a8c;font-weight:500;";
  const zeroStyle = "color:#6b7280;";
  const maxStyle = "color:#5b1a8c;font-weight:500;";

  return html`<div style="${wrapperStyle}">
    ${title ? html`<div style="${titleStyle}">${title}</div>` : ""}
    <div style="display:flex;align-items:center;gap:3px;">
      ${unit ? html`<span style="font-size:8.5px;font-weight:600;color:#555;white-space:nowrap;">${unit}</span>` : ""}
      <div style="flex:1;${barStyle}"></div>
    </div>
    <div style="${axisStyle}${unit ? `margin-left:${unit.length * 6 + 6}px;` : ''}">
      <span style="${minStyle}">${gMin}</span>
      ${showZero ? html`<span style="${zeroStyle};flex:1;text-align:center;">0</span>` : html`<span style="flex:1;"></span>`}
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
    title = "",
    reverse = true,
    interactive = false,
    onFilter = null,
  } = config;

  const hasCounts = counts.length > 0;
  const items = palette.map((color, i) => ({
    color,
    symbol: symbols[i] || "",
    pctLabel: pctLabels[i] || "",
    count: counts[i] || 0,
    realIdx: i
  }));

  // Filtrer bins vides (count=0) quand les comptages sont fournis
  const filteredItems = hasCounts ? items.filter(item => item.count > 0) : items;

  const orderedItems = reverse ? [...filteredItems].reverse() : filteredItems;

  const wrapper = html`<div class="legend-vertical">
    ${title ? html`<div class="legend-title">${title}</div>` : ''}
  </div>`;

  const allRows = [];
  const allItemsRef = [];
  let selectedSet = null;

  orderedItems.forEach((item) => {
    const row = html`<div style="display:flex;align-items:center;gap:2px;line-height:1.1;${interactive ? 'cursor:pointer;user-select:none;' : ''}">
      <span class="legend-color-v" style="background:${item.color}"></span>
      <span style="font-size:10px;width:16px;text-align:center;font-weight:600;">${item.symbol}</span>
      <span class="legend-text-v" style="font-size:9px;color:#6b7280;">${item.pctLabel}</span>
      <span class="legend-count-v" style="font-size:8px;color:#888;margin-left:1px;">(${item.count})</span>
    </div>`;

    allRows.push(row);
    allItemsRef.push(item);

    if (interactive) {
      row.addEventListener('click', (e) => {
        const ri = item.realIdx;
        const allIndices = new Set(allItemsRef.map(it => it.realIdx));

        if (e.ctrlKey || e.metaKey) {
          if (selectedSet === null) {
            selectedSet = new Set(allIndices);
            selectedSet.delete(ri);
          } else if (selectedSet.has(ri)) {
            selectedSet.delete(ri);
            if (selectedSet.size === 0) selectedSet = null;
          } else {
            selectedSet.add(ri);
            if (selectedSet.size === allIndices.size) selectedSet = null;
          }
        } else {
          if (selectedSet !== null && selectedSet.size === 1 && selectedSet.has(ri)) {
            selectedSet = null;
          } else {
            selectedSet = new Set([ri]);
          }
        }

        const active = selectedSet === null ? allIndices : selectedSet;

        allRows.forEach((r, j) => {
          const it = allItemsRef[j];
          const isActive = active.has(it.realIdx);
          const sw = r.querySelector('.legend-color-v');
          const tx = r.querySelector('.legend-text-v');
          const ct = r.querySelector('.legend-count-v');
          if (sw) sw.style.background = isActive ? it.color : '#d1d5db';
          if (tx) tx.style.opacity = isActive ? '1' : '0.35';
          if (ct) ct.style.opacity = isActive ? '1' : '0.35';
          r.style.opacity = isActive ? '1' : '0.55';
        });

        if (onFilter) onFilter(active);
      });
    }
    wrapper.appendChild(row);
  });

  return wrapper;
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
    title = '',
    unit = '',
    interactive = false,
    onFilter = null,
  } = config;

  // Préparer les items dans l'ordre — masquer bins vides si counts fournis
  const hasCounts = counts.length > 0;
  const items = colors.map((color, i) => ({
    color,
    label: labels[i] || '',
    count: counts[i] || 0,
    realIdx: i,
  }));

  // Filtrer bins vides (count=0) quand les comptages sont fournis
  const filteredItems = hasCounts ? items.filter(item => item.count > 0) : items;

  // Inverser si demandé (pour avoir valeurs hautes en haut)
  const orderedItems = reverse ? [...filteredItems].reverse() : filteredItems;

  if (vertical) {
    const wrapper = html`<div class="legend-vertical">
      ${title ? html`<div class="legend-title">${title}</div>` : ''}
      ${unit ? html`<div class="legend-unit">${unit}</div>` : ''}
    </div>`;

    // Mode interactif : click = isoler, Ctrl+click = multi-select
    const allRows = [];
    const allItemsRef = [];
    let selectedSet = null; // null = tout actif, Set = indices actifs

    orderedItems.forEach((item) => {
      const row = html`<div class="legend-row-v" style="${interactive ? 'cursor:pointer;user-select:none;' : ''}">
        <span class="legend-color-v" style="background:${item.color}"></span>
        <span class="legend-text-v">${item.label}</span>
        ${item.count !== undefined
          ? html`<span class="legend-count-v">${item.count}</span>`
          : ''}
      </div>`;

      allRows.push(row);
      allItemsRef.push(item);

      if (interactive) {
        row.addEventListener('click', (e) => {
          const ri = item.realIdx;
          const allIndices = new Set(allItemsRef.map(it => it.realIdx));

          if (e.ctrlKey || e.metaKey) {
            // Ctrl+click : toggle individuel dans la sélection
            if (selectedSet === null) {
              // Premier Ctrl+click : partir de tout sauf cet item (= le retirer)
              selectedSet = new Set(allIndices);
              selectedSet.delete(ri);
            } else if (selectedSet.has(ri)) {
              selectedSet.delete(ri);
              if (selectedSet.size === 0) selectedSet = null; // Reset si plus rien
            } else {
              selectedSet.add(ri);
              // Si tout est re-sélectionné → reset
              if (selectedSet.size === allIndices.size) selectedSet = null;
            }
          } else {
            // Click normal : isoler ce bin (toggle)
            if (selectedSet !== null && selectedSet.size === 1 && selectedSet.has(ri)) {
              selectedSet = null; // Re-click sur l'isolé → reset
            } else {
              selectedSet = new Set([ri]);
            }
          }

          // Calculer set actif
          const active = selectedSet === null ? allIndices : selectedSet;

          // Mettre à jour les styles de TOUTES les lignes
          allRows.forEach((r, j) => {
            const it = allItemsRef[j];
            const isActive = active.has(it.realIdx);
            const sw = r.querySelector('.legend-color-v');
            const tx = r.querySelector('.legend-text-v');
            const ct = r.querySelector('.legend-count-v');
            if (sw) sw.style.background = isActive ? it.color : '#d1d5db';
            if (tx) tx.style.opacity = isActive ? '1' : '0.35';
            if (ct) ct.style.opacity = isActive ? '1' : '0.35';
            r.style.opacity = isActive ? '1' : '0.55';
          });

          if (onFilter) onFilter(active);
        });
      }
      wrapper.appendChild(row);
    });

    return wrapper;
  } else {
    // Horizontal - style demig (pas de mode interactif pour l'instant)
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
// &s BINS_BAR — Légende horizontale barre compacte cliquable
// ============================================================

/**
 * Crée une légende bins horizontale type "barre de couleur"
 * Layout vertical :
 *   Row 1: France ▼ (positionné proportionnellement)
 *   Row 2: Seuils (entre les boîtes, au-dessus)
 *   Row 3: [Unité] [□□□□□□□] (boxes aplaties avec gaps)
 *   Row 4: (n) comptages en dessous
 *
 * @param {Object} config
 * @param {string[]} config.colors - Palette N couleurs
 * @param {string[]} [config.labels=[]] - Labels seuils (N items)
 * @param {number[]} [config.counts=[]] - Comptages par bin
 * @param {number[]} [config.thresholds=[]] - Seuils (N-1 valeurs)
 * @param {string} [config.unit=""] - Unité à gauche (ex: "%/an", "€/m²")
 * @param {number|null} [config.franceValue=null] - Valeur France → marqueur ▼
 * @param {string} [config.franceLabel="France"] - Label du marqueur
 * @param {boolean} [config.interactive=false] - Click = isoler, Ctrl+click = toggle
 * @param {Function|null} [config.onFilter=null] - Callback(Set<binIdx>) pour filtrage carte
 * @returns {HTMLElement}
 */
export function createBinsLegendBar(config) {
  const {
    colors,
    labels = [],
    counts = [],
    thresholds = [],
    unit = "",
    franceValue = null,
    franceLabel = "France",
    echelonValue = null,
    echelonLabel = "",
    interactive = false,
    onFilter = null
  } = config;

  const n = colors.length;
  if (n === 0) return document.createElement("div");

  const boxW = 22;
  const boxH = 6;
  const gapN = 1;     // Gap normal entre bins
  const gapX = 3;     // Gap élargi autour des extrêmes (1er et dernier)
  const unitW = unit ? 36 : 0;

  // Pré-calcul positions boxes avec gaps variables
  const bp = [];  // {l, r, c} pour chaque box
  let cx = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) cx += (i === 1 || i === n - 1) ? gapX : gapN;
    bp.push({ l: cx, r: cx + boxW, c: cx + boxW / 2 });
    cx += boxW;
  }
  const barW = cx;

  // Formatage seuils : 0 dec si ≥10, 1 dec sinon (TCAM inclus)
  const fmt = (v) => {
    if (v == null) return "";
    const a = Math.abs(v);
    if (a >= 10) return Math.round(v).toLocaleString("fr-FR");
    return v.toFixed(1);
  };

  const wrapper = document.createElement("div");
  wrapper.className = "legend-bar-h";
  wrapper.style.cssText = "position:relative;font-family:Inter,system-ui,sans-serif;display:inline-block;";

  // ─── ROW 1: Marqueurs ▼ (France + échelon optionnel) ───
  // Helper : calcul position px d'une valeur dans les bins
  const _valToPx = (val) => {
    if (val == null || thresholds.length === 0) return null;
    let b = thresholds.findIndex(t => val < t);
    if (b === -1) b = n - 1;
    let px;
    if (b === 0) { px = bp[0].c; }
    else if (b >= n - 1) { px = bp[n - 1].c; }
    else {
      const tL = thresholds[b - 1], tH = thresholds[b];
      const r = (tH !== tL) ? (val - tL) / (tH - tL) : 0.5;
      px = bp[b].l + r * boxW;
    }
    return Math.max(8, Math.min(barW - 8, px));
  };

  const hasMarkers = (franceValue != null || echelonValue != null) && thresholds.length > 0;
  if (hasMarkers) {
    const row = document.createElement("div");
    row.style.cssText = `position:relative;height:16px;margin-left:${unitW}px;width:${barW}px;`;

    // Marqueur France
    if (franceValue != null) {
      const frPx = _valToPx(franceValue);
      const mk = document.createElement("div");
      mk.style.cssText = `position:absolute;left:${frPx}px;transform:translateX(-50%);bottom:0;text-align:center;line-height:1;background:rgba(255,255,255,0.85);border-radius:3px;padding:1px 3px 0;`;
      mk.innerHTML = `<span style="font-size:8.5px;color:#1696d2;font-weight:700;white-space:nowrap;">${franceLabel} ${fmt(franceValue)}</span><br><span style="font-size:8px;color:#1696d2;line-height:0.8;">▼</span>`;
      row.appendChild(mk);
    }

    // Marqueur échelon parent (si fourni)
    if (echelonValue != null && echelonLabel) {
      const ePx = _valToPx(echelonValue);
      const mk2 = document.createElement("div");
      mk2.style.cssText = `position:absolute;left:${ePx}px;transform:translateX(-50%);bottom:0;text-align:center;line-height:1;background:rgba(255,255,255,0.85);border-radius:3px;padding:1px 3px 0;`;
      mk2.innerHTML = `<span style="font-size:8.5px;color:#ca5800;font-weight:700;white-space:nowrap;">${echelonLabel} ${fmt(echelonValue)}</span><br><span style="font-size:8px;color:#ca5800;line-height:0.8;">▼</span>`;
      row.appendChild(mk2);
    }

    wrapper.appendChild(row);
  }

  // ─── ROW 2: Seuils au-dessus de la barre ───
  if (thresholds.length > 0) {
    const row = document.createElement("div");
    row.style.cssText = `position:relative;height:11px;margin-left:${unitW}px;width:${barW}px;`;
    thresholds.forEach((t, i) => {
      if (i >= n - 1) return;
      const px = (bp[i].r + bp[i + 1].l) / 2;
      const el = document.createElement("span");
      el.style.cssText = `position:absolute;left:${px}px;transform:translateX(-50%);font-size:8px;color:#6b7280;white-space:nowrap;`;
      el.textContent = fmt(t);
      row.appendChild(el);
    });
    wrapper.appendChild(row);
  }

  // ─── ROW 3: Unité + Boxes aplaties avec liseret ───
  const barRow = document.createElement("div");
  barRow.style.cssText = "display:flex;align-items:center;";

  if (unit) {
    const uEl = document.createElement("span");
    uEl.style.cssText = `font-size:8.5px;font-weight:600;color:#555;width:${unitW}px;text-align:right;padding-right:3px;white-space:nowrap;`;
    uEl.textContent = unit;
    barRow.appendChild(uEl);
  }

  const boxC = document.createElement("div");
  boxC.style.cssText = `position:relative;width:${barW}px;height:${boxH}px;`;

  const boxEls = [];
  colors.forEach((c, i) => {
    const box = document.createElement("div");
    box.style.cssText = `position:absolute;left:${bp[i].l}px;width:${boxW}px;height:${boxH}px;background:${c};border:0.5px solid rgba(0,0,0,0.2);box-sizing:border-box;transition:opacity 0.12s;${interactive ? 'cursor:pointer;' : ''}`;
    boxEls.push(box);
    boxC.appendChild(box);
  });
  barRow.appendChild(boxC);

  // Hint interaction à droite de la barre (même ligne) — tooltip hover CSS
  if (interactive) {
    const tip = document.createElement("span");
    tip.className = "tip-icon";
    tip.style.cssText = "margin-left:5px;font-size:9px;color:#9ca3af;cursor:help;position:relative;";
    tip.textContent = "ⓘ";
    tip.innerHTML = `ⓘ<span class="tip-content" style="width:140px;left:-60px;bottom:16px;">
      <b>Filtrer la carte</b><br>
      Click = isoler un bin<br>
      Ctrl+click = ajouter/retirer<br>
      <span style="font-style:italic;color:#9ca3af;">Extrêmes = P5 et P95</span>
    </span>`;
    barRow.appendChild(tip);
  }

  wrapper.appendChild(barRow);

  // ─── ROW 4: Comptages (n) en dessous ───
  const cntEls = [];
  if (counts.length > 0) {
    const row = document.createElement("div");
    row.style.cssText = `position:relative;height:11px;margin-left:${unitW}px;width:${barW}px;`;
    counts.forEach((c, i) => {
      const el = document.createElement("span");
      el.style.cssText = `position:absolute;left:${bp[i].c}px;transform:translateX(-50%);font-size:8px;color:#9ca3af;white-space:nowrap;transition:opacity 0.12s;`;
      el.textContent = c > 0 ? `(${c})` : "";
      cntEls.push(el);
      row.appendChild(el);
    });
    wrapper.appendChild(row);
  }

  // ─── INTERACTIVE: Click = isoler, Ctrl+click = toggle ───
  if (interactive && onFilter) {
    let selectedSet = null;
    const allIdx = new Set(colors.map((_, i) => i));

    const refresh = () => {
      const active = selectedSet || allIdx;
      boxEls.forEach((box, i) => {
        const on = active.has(i);
        box.style.background = on ? colors[i] : "#d1d5db";
        box.style.opacity = on ? "1" : "0.3";
      });
      cntEls.forEach((el, i) => {
        el.style.opacity = (!selectedSet || selectedSet.has(i)) ? "1" : "0.25";
      });
    };

    boxEls.forEach((box, i) => {
      box.addEventListener("click", (e) => {
        if (e.ctrlKey || e.metaKey) {
          if (!selectedSet) { selectedSet = new Set(allIdx); selectedSet.delete(i); }
          else if (selectedSet.has(i)) { selectedSet.delete(i); if (selectedSet.size === 0) selectedSet = null; }
          else { selectedSet.add(i); if (selectedSet.size === allIdx.size) selectedSet = null; }
        } else {
          if (selectedSet?.size === 1 && selectedSet.has(i)) selectedSet = null;
          else selectedSet = new Set([i]);
        }
        refresh();
        onFilter(selectedSet || allIdx);
      });
    });
  }

  return wrapper;
}

// &e BINS_BAR

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
