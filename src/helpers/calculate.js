// ============================================================
// &s CALCULATE — Fonctions calcul IS, percentiles, transformations
// ============================================================
// Date: 2026-01-09
// Calculs pour comparaison territoires vs France
//
// Exports:
// - calcIS(value, reference) → number|null
// - calcPercentile(value, allValues) → number|null
// - transformValue(value, colKey, france, allValues, mode) → number
// - supportsIS(colKey) → boolean
// - getISColor(is) → string
// - formatIS(is) → string
// ============================================================

/**
 * Calcule l'Indice de Spécificité (IS)
 * IS > 1 = surreprésentation vs référence
 * IS < 1 = sous-représentation vs référence
 * @param {number} value - Valeur du territoire
 * @param {number} reference - Valeur référence (France)
 * @returns {number|null}
 */
export function calcIS(value, reference) {
  if (value == null || reference == null || reference === 0) return null;
  return value / reference;
}

/**
 * Calcule le percentile exact (rang dans la distribution)
 * @param {number} value - Valeur à positionner
 * @param {Array<number>} allValues - Toutes les valeurs de la distribution
 * @returns {number|null} Percentile 0-100
 */
export function calcPercentile(value, allValues) {
  if (value == null || !allValues?.length) return null;
  const valid = allValues.filter(v => v != null);
  if (valid.length === 0) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const rank = sorted.filter(v => v < value).length;
  return Math.round((rank / sorted.length) * 100);
}

/**
 * Vérifie si un indicateur supporte le mode IS
 * Exclut : effectifs bruts (_vol), TCAM (_vtcam), indices composites (_ind)
 * @param {string} colKey - Clé indicateur
 * @returns {boolean}
 */
export function supportsIS(colKey) {
  if (!colKey) return false;
  // Seulement les parts/pourcentages
  if (colKey.includes('_pct')) return true;
  // Exclure explicitement les non-supportés
  if (colKey.includes('_vtcam')) return false;
  if (colKey.includes('_vol')) return false;
  if (colKey.includes('_ind')) return false;
  if (colKey.includes('_stock')) return false;
  return false;
}

/**
 * Transforme une valeur selon le mode d'affichage
 * @param {number} value - Valeur brute
 * @param {string} colKey - Clé indicateur
 * @param {Object} france - Données France (pour IS)
 * @param {Array<number>} allValues - Distribution complète (pour percentile)
 * @param {string} mode - 'value' | 'is' | 'percentile'
 * @returns {number|null}
 */
export function transformValue(value, colKey, france, allValues, mode) {
  if (value == null) return null;

  switch (mode) {
    case 'value':
      return value;

    case 'is':
      if (supportsIS(colKey) && france) {
        return calcIS(value, france[colKey]);
      }
      return value;  // Fallback si IS non supporté

    case 'percentile':
      return calcPercentile(value, allValues);

    default:
      return value;
  }
}

/**
 * Couleur pour affichage IS
 * Vert = surreprésentation (>1.2)
 * Violet = sous-représentation (<0.8)
 * Neutre = proche de 1
 * @param {number} is - Valeur IS
 * @returns {string} Code couleur hex
 */
export function getISColor(is) {
  if (is == null) return '#9ca3af';  // Gris
  if (is > 1.5) return '#15803d';    // Vert foncé (forte surreprésentation)
  if (is > 1.2) return '#22c55e';    // Vert (surreprésentation)
  if (is < 0.5) return '#6d28d9';    // Violet foncé (forte sous-représentation)
  if (is < 0.8) return '#a855f7';    // Violet (sous-représentation)
  return '#374151';                   // Gris foncé (neutre)
}

/**
 * Formate l'IS pour affichage
 * @param {number} is - Valeur IS
 * @param {number} decimals - Nombre de décimales
 * @returns {string}
 */
export function formatIS(is, decimals = 2) {
  if (is == null) return '—';
  return is.toFixed(decimals);
}

/**
 * Formate le percentile pour affichage
 * @param {number} pct - Percentile 0-100
 * @returns {string}
 */
export function formatPercentile(pct) {
  if (pct == null) return '—';
  return `P${pct}`;
}

/**
 * Calcule le rang ordinal d'un territoire sur un indicateur
 * @param {string} code - Code territoire
 * @param {Array} data - Données triées
 * @param {string} colKey - Clé indicateur
 * @param {boolean} descending - Tri décroissant (défaut: true)
 * @returns {number|null} Rang 1-based
 */
export function calcRank(code, data, colKey, descending = true) {
  const sorted = [...data]
    .filter(d => d[colKey] != null)
    .sort((a, b) => descending
      ? (b[colKey] - a[colKey])
      : (a[colKey] - b[colKey])
    );
  const index = sorted.findIndex(d => d.code === code);
  return index >= 0 ? index + 1 : null;
}

// &e CALCULATE
