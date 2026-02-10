// ============================================================
// &s COLORS — Palettes et constantes couleurs
// ============================================================
// Extrait de exploration-dynamique.md
// Date: 2025-12-27

// ============================================================
// &s PALETTES — Définition palettes divergentes et séquentielles
// ============================================================

/**
 * Palette divergente TCAM : violet (déclin) → blanc → vert (croissance)
 * 8 couleurs pour 8 bins
 */
export const PAL_PURPLE_GREEN = [
  "#761548", "#af1f6b", "#e46aa7", "#eb99c2",  // Négatifs : violet foncé → rose
  "#bcdeb4", "#98cf90", "#408941", "#2c5c2d"   // Positifs : vert clair → vert foncé
];

/**
 * Palette divergente 6 couleurs pour indicateurs type "ind" (indice)
 * Couleurs moins extrêmes, bien espacées : violet moyen → vert moyen
 * 3 violet + 3 vert
 */
export const PAL_IND_DIVERGENT = [
  "#9e4a8c", "#d487c4", "#f0c9e8",  // Négatifs : violet moyen → rose clair
  "#c7e9c0", "#74c476", "#238b45"   // Positifs : vert clair → vert moyen
];

/**
 * Palette divergente alternative : jaune (déclin) → blanc → bleu (croissance)
 * 8 couleurs pour 8 bins
 */
export const PAL_BLUE_YELLOW = [
  "#b8860b", "#d4a017", "#f0c040", "#f5e6a0",  // Négatifs : jaune foncé → crème
  "#a8d4e8", "#5ba3d0", "#2171b5", "#084594"   // Positifs : bleu clair → bleu foncé
];

/**
 * Palette séquentielle bleue Urban Institute pour indicateurs stock (pct, vol, ind)
 * 6 couleurs : clair → foncé
 * Source: pal_urbn_seq_blue dans jcn-setup-jrr.R
 */
export const PAL_SEQ_BLUE = [
  "#cfe8f3", "#73bfe2", "#46abdb", "#1696d2", "#12719e", "#0a4c6a"
];

/**
 * Palette séquentielle orange pour indicateurs alternatifs
 * 5 couleurs : clair → foncé
 */
export const PAL_SEQ_ORANGE = [
  "#ffe4cc", "#fdbf11", "#ca5800", "#8c3d00", "#5c2800"
];

/**
 * Palette séquentielle bleue ColorBrewer pour mode gradient (plus contrastée)
 * 6 couleurs : blanc cassé → bleu marine très foncé
 * Source: ColorBrewer Blues - meilleur contraste que Urban Institute pour gradients
 */
export const PAL_GRADIENT_BLUE = [
  "#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08519c", "#08306b"
];

/**
 * Palettes gradient pour mode représentation continu
 * Divergent: centré sur 0, Séquentiel: min→max
 */
export const GRADIENT_PALETTES = {
  divergent: {
    "Violet-Vert": ["#761548", "#c44d8a", "#e8a0c0", "#f5f5f5", "#a8d4a0", "#5ba55b", "#2c5c2d"],
    "Bleu-Jaune": ["#b8860b", "#d4a017", "#f5e6a0", "#f8f8f8", "#a8d4e8", "#5ba3d0", "#084594"]
  },
  sequential: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08519c", "#08306b"]  // ColorBrewer Blues
};

// ============================================================
// &s DENSITÉ — Couleurs et labels par niveau de densité
// ============================================================

/**
 * Labels densité 3 niveaux (grille communale simplifiée)
 */
export const DENS3_LABELS = {
  1: "Urbain dense",
  2: "Urbain intermédiaire",
  3: "Rural"
};

/**
 * Couleurs densité 3 niveaux
 * Rouge urbain → Gris intermédiaire → Bleu rural
 */
export const DENS3_COLORS = {
  1: "#d62728",  // Rouge - urbain dense
  2: "#e8e8e8",  // Gris très clair - intermédiaire
  3: "#1f77b4"   // Bleu - rural
};

/**
 * Labels densité 7 niveaux (grille communale détaillée INSEE)
 */
export const DENS7_LABELS = {
  1: "Centres urbains denses",
  2: "Centres urbains intermédiaires",
  3: "Ceintures urbaines",
  4: "Petites villes",
  5: "Bourgs ruraux",
  6: "Rural dispersé",
  7: "Rural très dispersé"
};

/**
 * Couleurs densité 7 niveaux
 * Rouge foncé (très urbain) → Orange → Gris → Bleu → Bleu foncé (très rural)
 */
export const DENS7_COLORS = {
  1: "#8b0000",  // Rouge foncé - grands centres urbains
  2: "#d62728",  // Rouge vif - centres urbains intermédiaires
  3: "#ff7f0e",  // Orange - ceintures urbaines
  4: "#f0f0f0",  // Gris très clair - petites villes
  5: "#aec7e8",  // Bleu très clair - bourgs ruraux
  6: "#1f77b4",  // Bleu - rural dispersé
  7: "#08306b"   // Bleu foncé - rural très dispersé
};

/**
 * Couleurs par type EPCI
 */
export const TYPE_EPCI_COLORS = {
  "CC": "#9467bd",   // Violet - Communauté de communes
  "CA": "#2ca02c",   // Vert - Communauté d'agglomération
  "CU": "#1f77b4",   // Bleu - Communauté urbaine
  "MET": "#d94801"   // Orange - Métropole
};

// ============================================================
// &s HELPERS — Fonctions helper couleurs
// ============================================================

/**
 * Couleur par bins avec seuils (pour toute taille de palette)
 * @param {number} v - Valeur
 * @param {number[]} thresholds - Seuils (n-1 valeurs → n bins)
 * @param {string[]} palette - Palette n couleurs
 * @returns {string} Couleur hex
 */
export function getColorByBins(v, thresholds, palette) {
  if (v == null) return "#e0e0e0";
  const idx = thresholds.findIndex(t => v < t);
  return palette[idx === -1 ? palette.length - 1 : idx];
}

/**
 * Couleur par bins séquentiels (pour palettes séquentielles 6 couleurs)
 * @param {number} v - Valeur
 * @param {number[]} thresholds - Seuils (5 valeurs → 6 bins)
 * @param {string[]} palette - Palette 6 couleurs (défaut: PAL_SEQ_BLUE)
 * @returns {string} Couleur hex
 */
export function getColorBySeqBins(v, thresholds, palette = PAL_SEQ_BLUE) {
  if (v == null) return "#e0e0e0";
  const idx = thresholds.findIndex(t => v < t);
  return palette[idx === -1 ? palette.length - 1 : idx];
}

/**
 * Génère des bins quantiles pour données séquentielles (positives uniquement)
 * @param {Object[]} data - Tableau d'objets
 * @param {string} col - Nom de la colonne
 * @param {number} nBins - Nombre de bins (défaut: 6)
 * @param {Object} options - Options { unit: string, decimals: number }
 * @returns {Object} { thresholds: number[], labels: string[], unit: string }
 */
export function makeSeqQuantileBins(data, col, nBins = 6, options = {}) {
  const { unit = "", decimals = 1 } = options;
  const values = data.map(d => d[col]).filter(v => v != null && !isNaN(v)).sort((a, b) => a - b);
  if (values.length === 0) return { thresholds: [], labels: [], unit };

  const thresholds = [];
  for (let i = 1; i < nBins; i++) {
    const idx = Math.floor(values.length * i / nBins);
    thresholds.push(values[idx]);
  }
  // Assurer que le dernier seuil soit < max (sinon bin supérieur vide)
  // On cherche la plus grande valeur strictement < max pour le dernier seuil
  const maxVal = values[values.length - 1];
  if (thresholds.length > 0 && thresholds[thresholds.length - 1] >= maxVal) {
    // Trouver l'index du dernier élément < maxVal
    let lastBelowMax = values.length - 2;
    while (lastBelowMax >= 0 && values[lastBelowMax] >= maxVal) {
      lastBelowMax--;
    }
    if (lastBelowMax >= 0) {
      thresholds[thresholds.length - 1] = values[lastBelowMax];
    } else {
      // Toutes les valeurs sont égales, utiliser maxVal - epsilon
      thresholds[thresholds.length - 1] = maxVal - 0.001;
    }
  }

  // Déterminer le nombre de décimales intelligemment
  // Si écart entre seuils < 1, utiliser 1 décimale ; sinon 0
  const needsDecimals = thresholds.some((t, i) =>
    i > 0 && Math.abs(t - thresholds[i - 1]) < 2
  );
  const dec = needsDecimals ? Math.max(decimals, 1) : decimals;

  // Formater une valeur
  const fmt = (v) => v.toFixed(dec).replace(/\.0+$/, "");

  // Labels pour légende (évite "6-6" en utilisant décimales appropriées)
  const labels = [];
  labels.push(`< ${fmt(thresholds[0])}${unit ? " " + unit : ""}`);
  for (let i = 0; i < thresholds.length - 1; i++) {
    labels.push(`${fmt(thresholds[i])} à ${fmt(thresholds[i + 1])}`);
  }
  labels.push(`> ${fmt(thresholds[thresholds.length - 1])}${unit ? " " + unit : ""}`);

  return { thresholds, labels, unit };
}

/**
 * Couleur densité 3 niveaux
 * @param {number} dens - Code densité (1, 2, 3)
 * @returns {string} Couleur hex
 */
export function getDens3Color(dens) {
  return DENS3_COLORS[dens] || "#ccc";
}

/**
 * Couleur densité 7 niveaux
 * @param {number} dens - Code densité (1-7)
 * @returns {string} Couleur hex
 */
export function getDens7Color(dens) {
  return DENS7_COLORS[dens] || "#ccc";
}

/**
 * Couleur type EPCI
 * @param {string} type - Type EPCI (CC, CA, CU, MET)
 * @returns {string} Couleur hex
 */
export function getTypeEpciColor(type) {
  return TYPE_EPCI_COLORS[type] || "#ccc";
}

/**
 * Génère des bins divergentes centrées sur 0 pour données avec négatifs
 * 8 bins : 4 négatifs (violet) + 4 positifs (vert)
 * @param {Object[]} data - Tableau d'objets
 * @param {string} col - Nom de la colonne
 * @param {Object} options - Options { unit: string, decimals: number }
 * @returns {Object} { thresholds: number[], labels: string[], isDivergent: true }
 */
export function makeDivQuantileBins(data, col, options = {}) {
  const { unit = "", decimals = 2 } = options;
  const values = data.map(d => d[col]).filter(v => v != null && !isNaN(v));
  if (values.length === 0) return { thresholds: [], labels: [], isDivergent: true };

  const negVals = values.filter(v => v < 0).sort((a, b) => a - b);
  const posVals = values.filter(v => v >= 0).sort((a, b) => a - b);

  // Si pas de négatifs, fallback sur séquentiel
  if (negVals.length === 0) {
    return makeSeqQuantileBins(data, col, 6, options);
  }

  // Calcul des seuils : 4 bins négatifs (indices 0-3) + 4 bins positifs (indices 4-7)
  // 7 seuils pour 8 bins, avec 0 au milieu
  const thresholds = [];
  const fmt = (v) => v.toFixed(decimals).replace(/\.?0+$/, "");

  // 3 seuils négatifs (du plus négatif vers 0)
  if (negVals.length >= 3) {
    for (let i = 1; i <= 3; i++) {
      const idx = Math.floor(negVals.length * i / 4);
      thresholds.push(negVals[Math.min(idx, negVals.length - 1)]);
    }
  } else {
    // Peu de valeurs négatives : distribuer équitablement
    const minNeg = Math.min(...negVals);
    thresholds.push(minNeg * 0.75, minNeg * 0.5, minNeg * 0.25);
  }

  // Seuil central : 0
  thresholds.push(0);

  // 3 seuils positifs (de 0 vers le plus positif)
  if (posVals.length >= 3) {
    for (let i = 1; i <= 3; i++) {
      const idx = Math.floor(posVals.length * i / 4);
      thresholds.push(posVals[Math.min(idx, posVals.length - 1)]);
    }
  } else if (posVals.length > 0) {
    // Peu de valeurs positives : distribuer équitablement
    const maxPos = Math.max(...posVals);
    thresholds.push(maxPos * 0.25, maxPos * 0.5, maxPos * 0.75);
  } else {
    // Aucune valeur positive
    thresholds.push(0.25, 0.5, 0.75);
  }

  // Labels pour légende (8 bins)
  const labels = [
    `< ${fmt(thresholds[0])}`,
    `${fmt(thresholds[0])} à ${fmt(thresholds[1])}`,
    `${fmt(thresholds[1])} à ${fmt(thresholds[2])}`,
    `${fmt(thresholds[2])} à 0`,
    `0 à ${fmt(thresholds[4])}`,
    `${fmt(thresholds[4])} à ${fmt(thresholds[5])}`,
    `${fmt(thresholds[5])} à ${fmt(thresholds[6])}`,
    `> ${fmt(thresholds[6])}`
  ];

  return { thresholds, labels, unit, isDivergent: true };
}

/**
 * Détecte si les données contiennent des valeurs négatives significatives
 * @param {Object[]} data - Tableau d'objets
 * @param {string} col - Nom de la colonne
 * @returns {boolean} true si présence de négatifs (>5% des valeurs)
 */
export function hasSignificantNegatives(data, col) {
  const values = data.map(d => d[col]).filter(v => v != null && !isNaN(v));
  if (values.length === 0) return false;
  const negCount = values.filter(v => v < 0).length;
  return negCount / values.length > 0.05;  // >5% négatifs
}

/**
 * Compte le nombre d'éléments dans chaque bin
 * Dynamique : N seuils → N+1 bins (fonctionne pour 5 seuils/6 bins OU 7 seuils/8 bins)
 * @param {Object[]} data - Tableau d'objets
 * @param {string} field - Nom du champ à analyser
 * @param {number[]} thresholds - Seuils des bins
 * @returns {number[]} Comptages par bin
 */
export function countBins(data, field, thresholds) {
  const nBins = thresholds.length + 1;
  const counts = new Array(nBins).fill(0);
  data.forEach(d => {
    const v = d[field];
    if (v == null) return;
    const idx = thresholds.findIndex(t => v < t);
    counts[idx === -1 ? nBins - 1 : idx]++;
  });
  return counts;
}

/**
 * Calcule bins et palette pour un indicateur (auto-détection divergent)
 * @param {Object[]} data - Données
 * @param {string} colKey - Clé colonne (ex: "dm_pop_vtcam_1622")
 * @param {string} indicKey - Clé indicateur (ex: "dm_pop_vtcam")
 * @returns {Object} { bins, palette, isDiv, getColor }
 */
export function computeIndicBins(data, colKey, indicKey = null) {
  // Auto-extraire indicKey si non fourni
  const indic = indicKey || colKey.replace(/_\d+$/, "");

  // Détection type : "ind" = indice (6 bins divergent), autres = 8 bins
  const isTypeInd = indic.includes("_ind_");
  const isTypeDiv = indic.includes("sma") || indic.includes("vtcam") || indic.includes("vevol") || indic.includes("vdifp");
  const hasNegs = hasSignificantNegatives(data, colKey);
  const isDiv = isTypeDiv || hasNegs;

  // Sélection palette et nombre de bins
  let palette, nBins;
  if (isTypeInd && isDiv) {
    // Indice divergent : 6 couleurs violet/vert modérées
    palette = PAL_IND_DIVERGENT;
    nBins = 6;
  } else if (isDiv) {
    // TCAM/évolution divergent : 8 couleurs classiques
    palette = PAL_PURPLE_GREEN;
    nBins = 8;
  } else {
    // Séquentiel : 6 couleurs bleues
    palette = PAL_SEQ_BLUE;
    nBins = 6;
  }

  // Calcul des bins
  const bins = isDiv
    ? (nBins === 6 ? makeDivQuantileBins6(data, colKey) : makeDivQuantileBins(data, colKey))
    : makeSeqQuantileBins(data, colKey, 6);

  // Fonction getColor
  const getColor = (v) => getColorByBins(v, bins.thresholds || [], palette);

  return { bins, palette, isDiv, getColor };
}

/**
 * Génère 5 seuils divergents pour 6 bins (centré sur 0)
 * Utilisé pour indicateurs type "ind" (indices)
 */
export function makeDivQuantileBins6(data, col, options = {}) {
  const { unit = "", decimals = 2 } = options;
  const values = data.map(d => d[col]).filter(v => v != null && !isNaN(v));
  if (values.length === 0) return { thresholds: [], labels: [], isDivergent: true };

  const negVals = values.filter(v => v < 0).sort((a, b) => a - b);
  const posVals = values.filter(v => v >= 0).sort((a, b) => a - b);

  // Si pas de négatifs, fallback sur séquentiel
  if (negVals.length === 0) {
    return makeSeqQuantileBins(data, col, 6, options);
  }

  // 5 seuils pour 6 bins : 2 négatifs + 0 + 2 positifs
  const thresholds = [];
  const fmt = (v) => v.toFixed(decimals).replace(/\.?0+$/, "");

  // 2 seuils négatifs
  if (negVals.length >= 2) {
    thresholds.push(negVals[Math.floor(negVals.length / 3)]);
    thresholds.push(negVals[Math.floor(negVals.length * 2 / 3)]);
  } else if (negVals.length > 0) {
    const minNeg = Math.min(...negVals);
    thresholds.push(minNeg * 0.66, minNeg * 0.33);
  } else {
    thresholds.push(-0.5, -0.2);
  }

  // Seuil central : 0
  thresholds.push(0);

  // 2 seuils positifs
  if (posVals.length >= 2) {
    thresholds.push(posVals[Math.floor(posVals.length / 3)]);
    thresholds.push(posVals[Math.floor(posVals.length * 2 / 3)]);
  } else if (posVals.length > 0) {
    const maxPos = Math.max(...posVals);
    thresholds.push(maxPos * 0.33, maxPos * 0.66);
  } else {
    thresholds.push(0.2, 0.5);
  }

  // Labels pour 6 bins
  const labels = [
    `< ${fmt(thresholds[0])}`,
    `${fmt(thresholds[0])} à ${fmt(thresholds[1])}`,
    `${fmt(thresholds[1])} à 0`,
    `0 à ${fmt(thresholds[3])}`,
    `${fmt(thresholds[3])} à ${fmt(thresholds[4])}`,
    `> ${fmt(thresholds[4])}`
  ];

  return { thresholds, labels, unit, isDivergent: true };
}

// ============================================================
// &s ECART_FRANCE — Mode écart à la valeur France
// ============================================================

import * as d3 from "npm:d3";

/**
 * Palette divergente 9 couleurs RdBu pour mode "Écart France"
 * Bleu foncé (très au-dessus) → blanc neutre → rouge foncé (très en-dessous)
 * Source: ColorBrewer RdBu 9-class
 */
export const PAL_ECART_FRANCE = [
  "#67001f", "#b2182b", "#d6604d", "#f4a582",  // En-dessous (rouge)
  "#f7f7f7",                                     // Neutre (autour de la ref)
  "#92c5de", "#4393c3", "#2166ac", "#053061"     // Au-dessus (bleu)
];

/**
 * Labels qualitatifs pour les 9 bins écart France (tooltip)
 */
export const ECART_FRANCE_LABELS = [
  "Très en-dessous", "Nettement en-dessous", "En-dessous", "Légèrement en-dessous",
  "Autour de la réf.",
  "Légèrement au-dessus", "Au-dessus", "Nettement au-dessus", "Très au-dessus"
];

/**
 * Symboles courts pour légende compacte (9 bins)
 */
export const ECART_FRANCE_SYMBOLS = [
  "▼▼", "▼", "↓", "↘", "≈", "↗", "↑", "▲", "▲▲"
];

/**
 * Calcule bins d'écart à la valeur France pour carte choroplèthe
 * 8 seuils → 9 bins symétriques autour de la référence, basés sur σ winsorisé P2/P98
 *
 * @param {Object[]} data - Données (sans France)
 * @param {string} colKey - Colonne indicateur
 * @param {number} refValue - Valeur France (00FR)
 * @param {Object} [options={}]
 * @param {number} [options.sigma] - Sigma externe (pour zoom maps, garder sigma national)
 * @param {string} [options.indicType] - Type indicateur ("pct", "vtcam", "vol"...) pour écart absolu vs relatif
 * @returns {Object} { thresholds, labels, qualLabels, pctLabels, ref, sigma, palette, isAbsoluteEcart, getColor, getEcartInfo }
 */
export function computeEcartFrance(data, colKey, refValue, options = {}) {
  const values = data.map(d => d[colKey]).filter(v => v != null && !isNaN(v));

  // Référence : valeur France ou fallback moyenne
  const ref = (refValue != null && !isNaN(refValue)) ? refValue : d3.mean(values);

  // Détection type → écart absolu (pts) vs relatif (%)
  const indicKey = colKey.replace(/_\d+$/, "");
  const isEvolution = indicKey.includes("vtcam") || indicKey.includes("vevol") || indicKey.includes("vdifp");
  const isPct = (options.indicType === "pct") || false;
  // Écart absolu pour évolutions ET indicateurs en % (sinon % relatif = confus pour pct)
  const isAbsoluteEcart = isEvolution || isPct;

  if (values.length === 0 || ref == null) {
    return {
      thresholds: [], labels: [], qualLabels: ECART_FRANCE_LABELS,
      pctLabels: [], ref: 0, sigma: 0, palette: PAL_ECART_FRANCE,
      isAbsoluteEcart,
      getColor: () => "#e0e0e0",
      getEcartInfo: () => ({ label: "—", pct: "—", binIdx: 4, symbol: "≈", color: "#b0b0b0" })
    };
  }

  // Sigma winsorisé P2/P98 (ou sigma externe pour zoom)
  let sigma = options.sigma;
  if (sigma == null) {
    const sorted = [...values].sort((a, b) => a - b);
    const p02 = sorted[Math.floor(sorted.length * 0.02)] ?? sorted[0];
    const p98 = sorted[Math.min(Math.floor(sorted.length * 0.98), sorted.length - 1)] ?? sorted[sorted.length - 1];
    const winsorised = values.map(v => Math.max(p02, Math.min(p98, v)));
    sigma = d3.deviation(winsorised) || 0;
  }

  if (sigma === 0) {
    return {
      thresholds: [], labels: [], qualLabels: ECART_FRANCE_LABELS,
      pctLabels: [], ref, sigma: 0, palette: PAL_ECART_FRANCE,
      isAbsoluteEcart,
      getColor: () => "#e0e0e0",
      getEcartInfo: (v) => ({ label: "Autour de la réf.", pct: "0", binIdx: 4, symbol: "≈", color: "#b0b0b0" })
    };
  }

  // 8 seuils : ref ± [0.5, 1, 1.5, 2] × σ → 9 bins
  const multipliers = [2, 1.5, 1, 0.5, 0.5, 1, 1.5, 2];
  const signs       = [-1, -1, -1, -1, 1, 1, 1, 1];
  const thresholds = multipliers.map((m, i) => ref + signs[i] * m * sigma);

  // Formatage valeurs
  const fmt = (v) => {
    const dec = Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
    return v.toFixed(dec).replace(/\.?0+$/, "");
  };
  const labels = [];
  labels.push(`< ${fmt(thresholds[0])}`);
  for (let i = 0; i < thresholds.length - 1; i++) {
    labels.push(`${fmt(thresholds[i])} à ${fmt(thresholds[i + 1])}`);
  }
  labels.push(`> ${fmt(thresholds[thresholds.length - 1])}`);

  // Écart labels par bin (milieu de chaque bin vs ref) — sans unité (unité dans le titre légende)
  const pctLabels = PAL_ECART_FRANCE.map((_, i) => {
    if (ref === 0) return "";
    let mid;
    if (i === 0) mid = thresholds[0] - 0.5 * sigma;
    else if (i === thresholds.length) mid = thresholds[thresholds.length - 1] + 0.5 * sigma;
    else mid = (thresholds[i - 1] + thresholds[i]) / 2;
    if (isAbsoluteEcart) {
      // Points absolus pour évolutions ET pourcentages
      const diff = mid - ref;
      return `${diff >= 0 ? "+" : ""}${fmt(diff)}`;
    }
    const pct = ((mid - ref) / Math.abs(ref)) * 100;
    return `${pct >= 0 ? "+" : ""}${Math.round(pct)}`;
  });

  // getColor : même logique que getColorByBins
  const getColor = (v) => {
    if (v == null || isNaN(v)) return "#e0e0e0";
    const idx = thresholds.findIndex(t => v < t);
    return PAL_ECART_FRANCE[idx === -1 ? PAL_ECART_FRANCE.length - 1 : idx];
  };

  // getEcartInfo : pour tooltip (symbol coloré + écart formaté)
  const getEcartInfo = (v) => {
    if (v == null || isNaN(v)) return { label: "—", pct: "—", binIdx: 4, symbol: "≈", color: "#b0b0b0" };
    const idx = thresholds.findIndex(t => v < t);
    const binIdx = idx === -1 ? PAL_ECART_FRANCE.length - 1 : idx;
    const label = ECART_FRANCE_LABELS[binIdx];
    const symbol = ECART_FRANCE_SYMBOLS[binIdx];
    // Couleur tooltip-safe (lisible sur fond sombre)
    const color = binIdx < 4 ? "#f4a582" : binIdx === 4 ? "#b0b0b0" : "#92c5de";
    let pct;
    if (isAbsoluteEcart) {
      const diff = v - ref;
      pct = `${diff >= 0 ? "+" : ""}${fmt(diff)} pts`;
    } else if (ref === 0) {
      pct = "—";
    } else {
      const p = ((v - ref) / Math.abs(ref)) * 100;
      pct = `${p >= 0 ? "+" : ""}${Math.round(p)}%`;
    }
    return { label, pct, binIdx, symbol, color };
  };

  return {
    thresholds, labels, qualLabels: ECART_FRANCE_LABELS,
    pctLabels, ref, sigma, palette: PAL_ECART_FRANCE,
    isEvolution, isAbsoluteEcart, getColor, getEcartInfo
  };
}

// &e

// ============================================================
// &s GRADIENT_SCALE — Échelle continue pour mode gradient
// ============================================================

/**
 * Calcule P02 et P98 pour capper les outliers
 */
function getPercentileBounds(values) {
  if (values.length === 0) return { p02: 0, p98: 1 };
  const sorted = [...values].sort((a, b) => a - b);
  const p02Idx = Math.floor(sorted.length * 0.02);
  const p98Idx = Math.floor(sorted.length * 0.98);
  return {
    p02: sorted[p02Idx] || sorted[0],
    p98: sorted[Math.min(p98Idx, sorted.length - 1)] || sorted[sorted.length - 1],
    rawMin: sorted[0],
    rawMax: sorted[sorted.length - 1]
  };
}

/**
 * Crée une échelle de couleur continue (gradient)
 * Utilise P02/P98 pour capper outliers (évite compression par valeurs extrêmes)
 * @param {Object[]} data - Données
 * @param {string} col - Colonne valeur
 * @param {Object} options
 * @param {boolean} options.divergent - Forcer centrage sur 0
 * @param {string[]} options.palette - Couleurs gradient
 * @param {boolean} options.capOutliers - Utiliser P02/P98 (défaut: true)
 * @returns {Object} { scale, domain, min, max, getColor }
 */
export function createGradientScale(data, col, options = {}) {
  const values = data.map(d => d[col]).filter(v => v != null && !isNaN(v));
  const { p02, p98, rawMin, rawMax } = getPercentileBounds(values);

  const {
    capOutliers = true,
    divergent = rawMin < 0 && rawMax > 0,
    palette = divergent ? GRADIENT_PALETTES.divergent["Violet-Vert"] : GRADIENT_PALETTES.sequential
  } = options;

  // Utiliser bornes cappées ou brutes
  const min = capOutliers ? p02 : rawMin;
  const max = capOutliers ? p98 : rawMax;

  let domain, scale;

  if (divergent) {
    // Échelle symétrique centrée sur 0
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    domain = d3.range(palette.length).map(i => -absMax + (2 * absMax * i / (palette.length - 1)));
    scale = d3.scaleLinear().domain(domain).range(palette).interpolate(d3.interpolateRgb).clamp(true);
  } else {
    // Échelle linéaire min → max
    domain = d3.range(palette.length).map(i => min + (max - min) * i / (palette.length - 1));
    scale = d3.scaleLinear().domain(domain).range(palette).interpolate(d3.interpolateRgb).clamp(true);
  }

  return {
    scale,
    domain,
    min,
    max,
    rawMin,
    rawMax,
    divergent,
    palette,
    getColor: (v) => v == null ? "#e0e0e0" : scale(v)
  };
}

/**
 * Factory unifié : retourne getColor selon mode (bins ou gradient)
 * @param {Object[]} data - Données
 * @param {string} colKey - Clé colonne (ex: "dm_pop_vtcam_1622")
 * @param {string} mode - "bins" | "gradient"
 * @returns {Object} { getColor, mode, palette, ... }
 */
export function createColorFunction(data, colKey, mode = "bins") {
  const indicKey = colKey.replace(/_\d+$/, "");

  if (mode === "gradient") {
    const gradientResult = createGradientScale(data, colKey);
    return {
      getColor: gradientResult.getColor,
      mode: "gradient",
      min: gradientResult.min,
      max: gradientResult.max,
      divergent: gradientResult.divergent,
      palette: gradientResult.divergent
        ? GRADIENT_PALETTES.divergent["Violet-Vert"]
        : GRADIENT_PALETTES.sequential
    };
  } else {
    // Mode bins (défaut)
    const result = computeIndicBins(data, colKey, indicKey);
    return {
      getColor: result.getColor,
      mode: "bins",
      bins: result.bins,
      palette: result.palette,
      isDiv: result.isDiv
    };
  }
}

// &e
