// ============================================================
// &s INDICATORS_EXT — Fonctions utilitaires indicateurs (NON ÉCRASÉ)
// ============================================================
// Date: 2026-01-19
// Ce fichier N'EST PAS auto-généré et persiste après régénération
// du ddict. Contient les fonctions utilitaires qui dépendent des
// périodes/indicateurs mais ne doivent pas être écrasées.
//
// NOTE: indicators-ddict-js.js EST auto-généré par R (_run-aggregate-merge.R)
//       → NE PAS y ajouter de code custom, il sera perdu !
//
// Exports:
// - parseColKey(colKey) → {indic, periode}
// - isValidPeriode(str) → boolean
// ============================================================

/**
 * Vérifie si une chaîne est un code période valide
 * Formats acceptés:
 * - 2 chiffres: année snapshot (21, 22, 23, 24, 16, 11)
 * - 4 chiffres: évolution entre 2 années (1622, 1116, 1924, etc.)
 * @param {string} str - Chaîne à tester
 * @returns {boolean}
 */
export function isValidPeriode(str) {
  if (!str || typeof str !== "string") return false;
  // 2 chiffres: année entre 10 et 30 (2010-2030)
  if (/^\d{2}$/.test(str)) {
    const year = parseInt(str, 10);
    return year >= 10 && year <= 30;
  }
  // 4 chiffres: AABB où AA < BB (début < fin)
  if (/^\d{4}$/.test(str)) {
    const start = parseInt(str.slice(0, 2), 10);
    const end = parseInt(str.slice(2, 4), 10);
    return start >= 10 && end <= 30 && start < end;
  }
  return false;
}

/**
 * Parse une clé colonne en indicateur + période
 * Utilise une logique dynamique au lieu d'une regex fixe
 *
 * @param {string} colKey - Clé colonne (ex: "dm_pop_vtcam_1622", "rev_med_21")
 * @returns {{indic: string, periode: string|null}}
 *
 * @example
 * parseColKey("dm_pop_vtcam_1622") → { indic: "dm_pop_vtcam", periode: "1622" }
 * parseColKey("rev_med_21") → { indic: "rev_med", periode: "21" }
 * parseColKey("P22_POP") → { indic: "P22_POP", periode: null }
 */
export function parseColKey(colKey) {
  if (!colKey || typeof colKey !== "string") {
    return { indic: colKey, periode: null };
  }

  // Trouver le dernier underscore
  const lastUnderscore = colKey.lastIndexOf("_");
  if (lastUnderscore === -1) {
    return { indic: colKey, periode: null };
  }

  // Extraire la partie après le dernier underscore
  const potentialPeriode = colKey.slice(lastUnderscore + 1);
  const potentialIndic = colKey.slice(0, lastUnderscore);

  // Vérifier si c'est une période valide
  if (isValidPeriode(potentialPeriode)) {
    return { indic: potentialIndic, periode: potentialPeriode };
  }

  // Pas une période valide, retourner colKey complet comme indic
  return { indic: colKey, periode: null };
}

// ============================================================
// &s DECIMALS — Décimales selon type indicateur
// ============================================================

/**
 * Retourne le nombre de décimales selon le type d'indicateur
 * - vtcam, vevol : 2 décimales (taux de croissance annuel)
 * - vdifp : 1 décimale (évolution en points de %)
 * - pct, tx : 1 décimale (pourcentages)
 * - ind, ratio : dynamique (0 si >=10, 1 si <10)
 * - autres : 2 par défaut
 *
 * @param {string} type - Type indicateur (vtcam, vdifp, pct, ind, etc.)
 * @param {number} [value] - Valeur optionnelle (pour ind/ratio dynamique)
 * @returns {number} Nombre de décimales
 */
export function getDecimalsForType(type, value = null) {
  if (type === "vdifp") return 1;  // Évolutions en points → 1 décimale
  if (type === "pct" || type === "tx") return 1;  // Pourcentages → 1 décimale
  if (type === "ind" || type === "ratio") {
    // Indices : 0 déc si >=10, 1 déc si <10
    if (value !== null) return Math.abs(value) >= 10 ? 0 : 1;
    return 1;  // Défaut si pas de valeur
  }
  return 2;  // vtcam, vevol, autres → 2 décimales
}

// &e
