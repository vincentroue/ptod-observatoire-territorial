// =============================================================================
// helpers/selectindic.js — Sélecteurs indicateurs avec période dissociée
// =============================================================================
// Helper (pas de DOM) - Logique menus déroulants indicateur/période
// Usage : Import dans .md pour créer les Inputs.select
// Date : 2026-01-10
// =============================================================================

import { INDICATEURS, PERIODES, THEMES } from "./indicators-ddict-js.js";

// =============================================================================
// &s OPTIONS_INDIC — Options indicateurs filtrées par volet
// =============================================================================

/**
 * Retourne Map d'options indicateurs filtrées par volet, groupées par thème
 * @param {string} volet - "exd", "exdc", "exdf", "exdl", "exde"
 * @param {Set|null} availableCols - Colonnes disponibles dans données (optionnel)
 * @returns {Map<string, string>} Map label → indicKey
 *
 * @example
 * const options = getIndicOptionsByVolet("exdc");
 * // Map { "── Démographie ──" => "__sep_dm__", "Évol. pop (TCAM)" => "dm_pop_vtcam", ... }
 */
export function getIndicOptionsByVolet(volet, availableCols = null) {
  const options = [];

  // Trier thèmes par ordre
  const sortedThemes = Object.entries(THEMES)
    .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));

  for (const [themeKey, themeInfo] of sortedThemes) {
    // Filtrer indicateurs du thème avec volet correspondant
    const themeIndics = Object.entries(INDICATEURS)
      .filter(([k, v]) => {
        if (v.theme !== themeKey) return false;
        // Cas spécial "ecodash" : regarder champ agg_ecodash au lieu de volets
        if (volet === "ecodash") {
          return v.agg_ecodash === true;
        }
        if (!v.volets?.includes(volet)) return false;
        return true;
      })
      .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));

    // Si indicateurs trouvés, ajouter séparateur thème + indicateurs
    if (themeIndics.length > 0) {
      // Séparateur thème (non sélectionnable)
      options.push([`── ${themeInfo.label} ──`, `__sep_${themeKey}__`]);

      for (const [indicKey, indicInfo] of themeIndics) {
        // Filtrer par colonnes disponibles si fourni
        if (availableCols) {
          const hasCol = indicInfo.periodes?.some(p => {
            const colKey = `${indicKey}_${p.replace("_", "")}`;
            return availableCols.has(colKey);
          });
          if (!hasCol) continue;
        }

        // Label medium (ex: "Évol. pop (TCAM)")
        options.push([indicInfo.medium || indicInfo.short || indicKey, indicKey]);
      }
    }
  }

  return new Map(options);
}

// &e

// =============================================================================
// &s OPTIONS_ALL — Options tous indicateurs (sans filtre volet)
// =============================================================================

/**
 * Retourne Map de TOUS les indicateurs, groupés par thème
 * @param {Set|null} availableCols - Colonnes disponibles (optionnel)
 * @returns {Map<string, string>}
 */
export function getIndicOptionsAll(availableCols = null) {
  const options = [];

  const sortedThemes = Object.entries(THEMES)
    .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));

  for (const [themeKey, themeInfo] of sortedThemes) {
    const themeIndics = Object.entries(INDICATEURS)
      .filter(([k, v]) => v.theme === themeKey)
      .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));

    if (themeIndics.length > 0) {
      options.push([`── ${themeInfo.label} ──`, `__sep_${themeKey}__`]);

      for (const [indicKey, indicInfo] of themeIndics) {
        if (availableCols) {
          const hasCol = indicInfo.periodes?.some(p => {
            const colKey = `${indicKey}_${p.replace("_", "")}`;
            return availableCols.has(colKey);
          });
          if (!hasCol) continue;
        }
        options.push([indicInfo.medium || indicInfo.short || indicKey, indicKey]);
      }
    }
  }

  return new Map(options);
}

// &e

// =============================================================================
// &s PERIODES — Périodes disponibles pour un indicateur
// =============================================================================

/**
 * Retourne Map des périodes disponibles pour un indicateur
 * @param {string} indicKey - Clé indicateur (ex: "dm_pop_vtcam")
 * @param {Set|null} availableCols - Colonnes disponibles (optionnel)
 * @returns {Map<string, string>} Map label → periodeKey
 *
 * @example
 * const periodes = getPeriodesForIndicateur("dm_pop_vtcam");
 * // Map { "11-16" => "1116", "16-22" => "1622", "11-22" => "1122" }
 */
export function getPeriodesForIndicateur(indicKey, availableCols = null) {
  const indic = INDICATEURS[indicKey];
  if (!indic?.periodes || indic.periodes.length === 0) {
    return new Map();
  }

  const options = [];

  for (const periodeCode of indic.periodes) {
    // Normaliser code période (enlever underscore si présent)
    const key = periodeCode.replace("_", "");

    // Vérifier colonne disponible si filtre fourni
    if (availableCols) {
      const colKey = `${indicKey}_${key}`;
      if (!availableCols.has(colKey)) continue;
    }

    // Récupérer label depuis PERIODES
    const periodeInfo = PERIODES[key];
    const label = periodeInfo?.short || periodeCode;

    // Extraire année de fin pour tri (ex: "1622" → 22, "22" → 22)
    const endYear = parseInt(key.slice(-2), 10) || 0;

    options.push({ label, key, endYear });
  }

  // Trier par année de fin DÉCROISSANTE (plus récent en premier)
  options.sort((a, b) => b.endYear - a.endYear);

  return new Map(options.map(o => [o.label, o.key]));
}

// &e

// =============================================================================
// &s DEFAULT_PERIODE — Période par défaut pour un indicateur
// =============================================================================

/**
 * Retourne la période par défaut pour un indicateur
 * Retourne la période la plus récente disponible (année de fin max)
 * @param {string} indicKey - Clé indicateur
 * @param {Set|null} availableCols - Colonnes disponibles (optionnel)
 * @returns {string} Code période (ex: "1622")
 */
export function getDefaultPeriode(indicKey, availableCols = null) {
  const indic = INDICATEURS[indicKey];
  if (!indic?.periodes?.length) return "1622";

  // Filtrer et trier par année de fin
  const validPeriods = indic.periodes
    .map(p => p.replace("_", ""))
    .filter(key => {
      if (!availableCols) return true;
      return availableCols.has(`${indicKey}_${key}`);
    })
    .map(key => ({ key, endYear: parseInt(key.slice(-2), 10) || 0 }))
    .sort((a, b) => b.endYear - a.endYear);

  // Retourner la plus récente disponible
  return validPeriods[0]?.key || "1622";
}

// &e

// =============================================================================
// &s BUILD_COLKEY — Construire clé colonne
// =============================================================================

/**
 * Construit la clé colonne complète
 * @param {string} indicKey - Clé indicateur (ex: "dm_pop_vtcam")
 * @param {string} periodeKey - Clé période (ex: "1622")
 * @returns {string} Clé colonne (ex: "dm_pop_vtcam_1622")
 */
export function buildColKey(indicKey, periodeKey) {
  // Fallback robuste si période null/undefined
  if (!periodeKey) {
    const indic = INDICATEURS[indicKey];
    const periods = indic?.periodes || [];
    // Prendre la plus récente (dernière dans la liste triée)
    periodeKey = periods.length > 0
      ? periods[periods.length - 1].replace("_", "")
      : "1622";
  }
  return `${indicKey}_${periodeKey}`;
}

// &e

// =============================================================================
// &s IS_SEPARATOR — Vérifier si option est un séparateur
// =============================================================================

/**
 * Vérifie si une valeur d'option est un séparateur de thème
 * @param {string} value - Valeur de l'option
 * @returns {boolean}
 */
export function isSeparator(value) {
  return value?.startsWith("__sep_");
}

// &e

// =============================================================================
// &s GET_INDIC_LABEL — Récupérer label indicateur
// =============================================================================

/**
 * Récupère le label d'un indicateur selon format demandé
 * @param {string} indicKey - Clé indicateur
 * @param {string} format - "short", "medium", "long"
 * @returns {string}
 */
export function getIndicLabel(indicKey, format = "medium") {
  const indic = INDICATEURS[indicKey];
  if (!indic) return indicKey;

  switch (format) {
    case "short": return indic.short || indicKey;
    case "long": return indic.long || indic.medium || indicKey;
    case "medium":
    default: return indic.medium || indic.short || indicKey;
  }
}

// &e

// =============================================================================
// &s GET_PERIODE_LABEL — Récupérer label période
// =============================================================================

/**
 * Récupère le label d'une période
 * @param {string} periodeKey - Code période (ex: "1622")
 * @param {string} format - "short", "medium", "long"
 * @returns {string}
 */
export function getPeriodeLabel(periodeKey, format = "short") {
  const periode = PERIODES[periodeKey];
  if (!periode) return periodeKey;

  switch (format) {
    case "long": return periode.long || periode.medium || periodeKey;
    case "medium": return periode.medium || periode.short || periodeKey;
    case "short":
    default: return periode.short || periodeKey;
  }
}

// &e

// =============================================================================
// &s GET_FULL_LABEL — Label complet indicateur + période
// =============================================================================

/**
 * Construit le label complet "Évol. pop (TCAM) 16-22"
 * @param {string} indicKey - Clé indicateur
 * @param {string} periodeKey - Code période
 * @returns {string}
 */
export function getFullLabel(indicKey, periodeKey) {
  const indicLabel = getIndicLabel(indicKey, "medium");
  const periodeLabel = getPeriodeLabel(periodeKey, "short");
  return `${indicLabel} ${periodeLabel}`;
}

// &e
