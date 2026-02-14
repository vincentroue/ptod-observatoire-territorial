// &s TOOLTIP_aaMAIN - Helper tooltip centralisé cartes + scatter + info

// Exports :
// - initTooltip() → singleton DOM
// - showTooltip(event, html, container?) → affiche
// - hideTooltip() → masque
// - buildTerritoryTooltip(d, colKey, data, frRef?) → HTML string
// - buildScatterTooltip(d, xCol, yCol, data, frRefX?, frRefY?) → HTML string
// - titleWithInfo(colKey) → HTML span avec ⓘ hover
// - calcPercentile(value, data, colKey) → {percentile, rank, total}
// - getPolarityPhrase(polarity, percentile, frValue) → HTML string

import { INDICATEURS, PERIODES, formatValue, getColLabel } from "./indicators-ddict-js.js";
import { parseColKey } from "./indicators-ddict-ext.js";

// &s POLARITY_CONFIG - Couleurs 5 niveaux (P5/P20/P80/P95) + phrases (legacy maps)

// Templates phrases (utilisé par buildTerritoryTooltip — sera retiré quand maps migré)
// polarity 0 = pas de phrase (neutre, pas de sens devant/derrière)
const POLARITY_TEMPLATES = {
  "-1": "{percentile}% des territoires font mieux",
  "1":  "Devant {percentile}% des territoires"
};

// 5 niveaux : top5%, top20%, milieu, bot20%, bot5%
// Couleurs : vert clair (bon), rouge clair (mauvais), gris (neutre)
// Différenciation fort/modéré via double dot ●● vs simple ●
const POLARITY_COLORS = {
  good:     "#4ade80",  // vert 400 — favorable (●● strong, ● mild)
  bad:      "#f87171",  // rouge 400 — défavorable (●● strong, ● mild)
  neutral:  "#d1d5db"   // gris 300 — rond outline neutre ○
};

// Seuils percentile → {color, level} pour dot rendering
// level: "strong" (●●), "mild" (●), "neutral" (○)
function getPolarityInfo(polarity, percentile) {
  if (percentile == null) return { color: POLARITY_COLORS.neutral, level: "neutral" };
  if (polarity === 0) return { color: POLARITY_COLORS.neutral, level: "neutral" };
  const effective = polarity === 1 ? percentile : (100 - percentile);
  if (effective >= 95) return { color: POLARITY_COLORS.good, level: "strong" };
  if (effective >= 80) return { color: POLARITY_COLORS.good, level: "mild" };
  if (effective <= 5)  return { color: POLARITY_COLORS.bad, level: "strong" };
  if (effective <= 20) return { color: POLARITY_COLORS.bad, level: "mild" };
  return { color: POLARITY_COLORS.neutral, level: "neutral" };
}

// Backward compat wrapper
function getPolarityColor(polarity, percentile) {
  return getPolarityInfo(polarity, percentile).color;
}

// Dot HTML : ●● strong, ● mild, ○ neutral
function makeDotHtml(color, level) {
  if (level === "strong") {
    return `<span style="color:${color};font-size:9px;margin-right:2px;vertical-align:middle;">●●</span>`;
  } else if (level === "mild") {
    return `<span style="color:${color};font-size:9px;margin-right:2px;vertical-align:middle;">●</span>`;
  }
  return `<span style="color:#94a3b8;font-size:9px;margin-right:2px;vertical-align:middle;">○</span>`;
}

// Phrase devant/derrière basée sur effective percentile
function makePositionPhrase(polarity, percentile) {
  if (percentile == null) return "";
  const pol = polarity || 0;
  if (pol === 0) return "";
  const effective = pol === 1 ? percentile : (100 - percentile);
  if (effective >= 50) {
    return `devant ${effective}% des terr.`;
  }
  return `derrière ${100 - effective}% des terr.`;
}

// Libellé période court depuis colKey : "16-22", "19-24"...
function getPeriodShort(colKey) {
  const { periode } = parseColKey(colKey);
  if (!periode) return "";
  const per = PERIODES[periode];
  if (per?.short) return per.short;
  // Fallback: "1622" → "16-22"
  if (periode.length === 4) return periode.slice(0, 2) + "-" + periode.slice(2);
  return periode;
}

// &e

// &s PERCENTILE - Calcul rang + percentile runtime

export function calcPercentile(value, data, colKey) {
  if (value == null || isNaN(value)) return { percentile: null, rank: null, total: 0 };
  const vals = data
    .map(d => d[colKey])
    .filter(v => v != null && !isNaN(v))
    .sort((a, b) => a - b);
  const total = vals.length;
  if (total === 0) return { percentile: null, rank: null, total: 0 };
  // Rang = combien de valeurs sont strictement inférieures
  const below = vals.filter(v => v < value).length;
  const percentile = Math.round((below / total) * 100);
  // Rang décroissant (1 = le plus élevé)
  const rank = total - below;
  return { percentile, rank, total };
}

// &e

// &s POLARITY_PHRASE - Phrase dynamique avec pastille couleur

export function getPolarityPhrase(polarity, percentile, frValue) {
  if (percentile == null) return "";
  const pol = polarity || 0;
  const template = POLARITY_TEMPLATES[String(pol)];
  // polarity 0 → pas de phrase (neutre)
  if (!template) return "";
  const phrase = template.replace("{percentile}", percentile);

  // Dot(s) avec niveau
  const { color, level } = getPolarityInfo(pol, percentile);
  const dot = makeDotHtml(color, level);

  // Ref France
  const frStr = frValue != null ? ` <span style="color:#94a3b8;">(Fr. ${frValue})</span>` : "";

  return `${dot}${phrase}${frStr}`;
}

// &e

// &s RATIO_FRANCE - Calcul ratio France unifié (% ou × selon seuil)

/**
 * Calcule le ratio par rapport à France avec format adaptatif :
 * - |diff| < 100% → "XX% sup. à Fr." / "XX% inf. à Fr."
 * - |diff| >= 100% → "X.X× sup. à Fr." / "X.X× inf. à Fr."
 */
function formatFranceRatio(value, frRef) {
  if (frRef == null || value == null || frRef === 0) return "";
  const rel = (value - frRef) / Math.abs(frRef);
  const direction = rel >= 0 ? "sup." : "inf.";
  if (Math.abs(rel) >= 1) {
    // >= 100% écart → format multiplicateur
    const mult = (Math.abs(rel)).toFixed(1);
    return ` · ${mult}× ${direction} à Fr.`;
  }
  const pct = Math.abs(Math.round(rel * 100));
  return ` · ${pct}% ${direction} à Fr.`;
}

// Couleur valeur selon polarity : vert si favorable, rouge si défavorable, blanc si neutre
function valueColor(value, polarity) {
  if (value == null || polarity === 0 || polarity == null) return "#e2e8f0"; // blanc cassé par défaut
  // polarity 1 = positif=bon, polarity -1 = positif=mauvais
  const isGood = (polarity === 1 && value > 0) || (polarity === -1 && value < 0);
  const isBad  = (polarity === 1 && value < 0) || (polarity === -1 && value > 0);
  if (isGood) return "#86efac"; // vert clair 300
  if (isBad)  return "#fca5a5"; // rouge clair 300
  return "#e2e8f0";
}

// &e

// &s BUILD_TERRITORY - HTML complet tooltip territoire (même format que scatter, 1 indicateur)

export function buildTerritoryTooltip(d, colKey, data, frRef) {
  const { indic } = parseColKey(colKey);
  const ind = INDICATEURS[indic] || INDICATEURS[colKey] || {};
  const value = d[colKey];
  const name = d.libelle || d.lib_long || d.code || "—";
  const pop = d.P23_POP || d.P22_POP;
  const dataArr = data || [];
  const total = dataArr.length;

  // Valeur formatée + couleur polarity
  const valStr = value != null ? formatValue(colKey, value) : "—";
  const pol = ind.polarity || 0;
  const valColor = valueColor(value, pol);
  const label = ind.short || ind.medium || getColLabel(colKey) || indic;
  const perStr = getPeriodShort(colKey);
  const labelWithPer = perStr ? `${label} ${perStr}` : label;

  // Assemblage HTML — même structure que buildScatterTooltip (1 axe)
  let html = `<b style="color:#fff;font-size:12.5px;">${name}</b>`;

  // Ligne 1 : label + période + valeur colorée + Fr. ref italic
  let frHtml = "";
  if (frRef != null) {
    const frVal = formatValue(colKey, frRef).replace(/\/an/g, "");
    frHtml = `  <span style="font-size:10px;color:#94a3b8;font-style:italic;">Fr. ${frVal}</span>`;
  }
  html += `<br><span class="map-tooltip-val">${labelWithPer} : <span style="color:${valColor};">${valStr}</span></span>${frHtml}`;

  // Ligne 2 : dot(s) + rang + ratio France + devant/derrière
  const { percentile, rank } = calcPercentile(value, dataArr, colKey);
  if (rank != null && total > 0) {
    const { color, level } = getPolarityInfo(pol, percentile);
    const dot = makeDotHtml(color, level);
    const ratioStr = formatFranceRatio(value, frRef);

    // Phrase devant/derrière
    const posPhrase = makePositionPhrase(pol, percentile);
    const posHtml = posPhrase ? ` · <span style="color:#cbd5e1;">${posPhrase}</span>` : "";

    html += `<br><span style="font-size:10.5px;padding-left:6px;">${dot}<span style="color:${color};">${rank}<sup>e</sup>/${total}</span><span style="color:#94a3b8;">${ratioStr}</span>${posHtml}</span>`;
  }

  if (pop) {
    html += `<br><span class="map-tooltip-pop" style="font-size:11px;color:#cbd5e1;">Pop. ${pop.toLocaleString("fr-FR")} hab.</span>`;
  }

  return html;
}

// &e

// &s BUILD_SCATTER - HTML tooltip scatter (2 axes X/Y)

export function buildScatterTooltip(d, xCol, yCol, data, frRefX, frRefY) {
  const name = d.libelle || d.lib_long || d.code || "—";
  const pop = d.P23_POP || d.P22_POP;
  const dataArr = data || [];
  const total = dataArr.length;

  let html = `<b style="color:#fff;font-size:12.5px;">${name}</b>`;

  for (const [colKey, frRef] of [[xCol, frRefX], [yCol, frRefY]]) {
    const { indic } = parseColKey(colKey);
    const ind = INDICATEURS[indic] || INDICATEURS[colKey] || {};
    const value = d[colKey];
    const valStr = value != null ? formatValue(colKey, value) : "—";
    const pol = ind.polarity || 0;
    const valColor = valueColor(value, pol);
    const label = ind.short || ind.medium || getColLabel(colKey) || indic;
    const perStr = getPeriodShort(colKey);

    // Ligne 1 : label + période + valeur colorée + Fr. ref italic
    const labelWithPer = perStr ? `${label} ${perStr}` : label;
    let frHtml = "";
    if (frRef != null) {
      const frVal = formatValue(colKey, frRef).replace(/\/an/g, "");
      frHtml = `  <span style="font-size:10px;color:#94a3b8;font-style:italic;">Fr. ${frVal}</span>`;
    }
    html += `<br><span class="map-tooltip-val">${labelWithPer} : <span style="color:${valColor};">${valStr}</span></span>${frHtml}`;

    // Ligne 2 : dot(s) + rang + ratio France + devant/derrière
    const { percentile, rank } = calcPercentile(value, dataArr, colKey);
    if (rank != null && total > 0) {
      const { color, level } = getPolarityInfo(pol, percentile);
      const dot = makeDotHtml(color, level);
      const ratioStr = formatFranceRatio(value, frRef);

      // Phrase devant/derrière
      const posPhrase = makePositionPhrase(pol, percentile);
      const posHtml = posPhrase ? ` · <span style="color:#cbd5e1;">${posPhrase}</span>` : "";

      html += `<br><span style="font-size:10.5px;padding-left:6px;">${dot}<span style="color:${color};">${rank}<sup>e</sup>/${total}</span><span style="color:#94a3b8;">${ratioStr}</span>${posHtml}</span>`;
    }
  }

  if (pop) {
    html += `<br><span class="map-tooltip-pop" style="font-size:11px;color:#cbd5e1;">Pop. ${pop.toLocaleString("fr-FR")} hab.</span>`;
  }

  return html;
}

// &e

// &s TITLE_INFO - ⓘ hover sur titres indicateurs

export function titleWithInfo(colKey) {
  const { indic } = parseColKey(colKey);
  const ind = INDICATEURS[indic] || INDICATEURS[colKey];
  if (!ind) return colKey;
  const label = ind.medium || ind.short || colKey;
  if (!ind.definition) return label;

  const source = ind.source || "INSEE";
  // Return raw HTML string (caller wraps in html`` if needed)
  return `<span class="title-with-tip">${label} <span class="tip-icon">ⓘ<span class="tip-content"><b>${ind.long || ind.medium}</b><br>${ind.definition}<br><em>Source : ${source}</em></span></span></span>`;
}

// &e

// &s SINGLETON - Init / show / hide tooltip DOM

let tooltipEl = null;
let tooltipFrame = null;

export function initTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement("div");
  tooltipEl.className = "ottd-tooltip";
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

export function showTooltip(event, content, container) {
  if (tooltipFrame) cancelAnimationFrame(tooltipFrame);
  tooltipFrame = requestAnimationFrame(() => {
    const el = initTooltip();
    el.innerHTML = content;
    el.style.display = "block";
    el.style.opacity = "1";

    const tipRect = el.getBoundingClientRect();
    let refRect;
    if (container) {
      refRect = container.getBoundingClientRect();
    } else {
      refRect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }

    // Position relative au container ou au viewport
    let x, y;
    if (container) {
      x = event.clientX - refRect.left + 12;
      y = event.clientY - refRect.top - tipRect.height - 8;
      if (x + tipRect.width > refRect.width) x = event.clientX - refRect.left - tipRect.width - 12;
      if (y < 0) y = event.clientY - refRect.top + 16;
      el.style.position = "absolute";
    } else {
      x = Math.min(event.clientX + 14, window.innerWidth - tipRect.width - 10);
      y = Math.max(event.clientY - tipRect.height - 8, 10);
      el.style.position = "fixed";
    }
    el.style.left = x + "px";
    el.style.top = y + "px";
    tooltipFrame = null;
  });
}

export function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.style.display = "none";
    tooltipEl.style.opacity = "0";
  }
  if (tooltipFrame) {
    cancelAnimationFrame(tooltipFrame);
    tooltipFrame = null;
  }
}

// &e

// &s DATA_MAP - Lookup O(1) par code

export function createDataMap(data) {
  return new Map(data.map(d => [d.code, d]));
}

// &e

// &e
