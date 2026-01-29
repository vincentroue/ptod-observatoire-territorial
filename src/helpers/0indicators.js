// =============================================================================
// helpers/0indicators.js — Gestion indicateurs + colonnes avec périodes
// =============================================================================
// NOUVEAU HELPER (préfixe 0)
// Résout le problème: dropdown retourne "dm_pop_vtcam" mais colonne = "dm_pop_vtcam_1622"
// Date: 2026-01-09
// =============================================================================

import { INDICATEURS, PERIODES, THEMES, formatValue, getColLabel } from "./indicators-ddict-js.js";
// parseColKey depuis fichier NON écrasé (ddict-js est auto-généré par R)
import { parseColKey } from "./indicators-ddict-ext.js";

// Re-export pour usage externe
export { INDICATEURS, PERIODES, THEMES, formatValue, getColLabel, parseColKey };

// === COLONNES DISPONIBLES PAR INDICATEUR ===
// Construit toutes les colonnes possibles (indicateur + période)
export function getIndicatorColumns(indicKey) {
  const indic = INDICATEURS[indicKey];
  if (!indic || !indic.periodes || indic.periodes.length === 0) {
    return [];
  }

  return indic.periodes.map(p => {
    // Convertir format ddict "11_16" → format colonne "1116"
    const periodKey = p.replace("_", "");
    const colName = `${indicKey}_${periodKey}`;
    const periodInfo = PERIODES[periodKey];
    return {
      col: colName,
      indicKey,
      periodKey,
      label: `${indic.medium} ${periodInfo?.short || periodKey}`,
      shortLabel: `${indic.short} ${periodInfo?.short || periodKey}`
    };
  });
}

// === DROPDOWN OPTIONS AVEC COLONNES COMPLÈTES ===
// Format: Map([["Évol. pop TCAM 16-22", "dm_pop_vtcam_1622"], ...])
// Groupé par thème, filtré par volet
export function getColumnOptionsByVolet(volet, defaultPeriod = "1622") {
  const options = [];
  const sortedThemes = Object.entries(THEMES).sort((a, b) => a[1].ordre - b[1].ordre);

  for (const [themeKey, themeInfo] of sortedThemes) {
    const themeIndics = Object.entries(INDICATEURS)
      .filter(([k, v]) => v.theme === themeKey && v.volets && v.volets.includes(volet))
      .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));

    if (themeIndics.length > 0) {
      // Séparateur thème
      options.push([`── ${themeInfo.label} ──`, `__sep_${themeKey}__`]);

      for (const [indicKey, indicInfo] of themeIndics) {
        // Générer une option par période disponible
        const periodes = indicInfo.periodes || [];

        if (periodes.length === 0) {
          // Pas de période → colonne simple (rare)
          options.push([indicInfo.medium, indicKey]);
        } else if (periodes.length === 1) {
          // Une seule période → afficher directement
          const periodKey = periodes[0].replace("_", "");
          const colName = `${indicKey}_${periodKey}`;
          const periodLabel = PERIODES[periodKey]?.short || periodKey;
          options.push([`${indicInfo.medium} ${periodLabel}`, colName]);
        } else {
          // Plusieurs périodes → utiliser la période par défaut si disponible, sinon première
          const targetPeriod = periodes.find(p => p.replace("_", "") === defaultPeriod)
                              || periodes[0];
          const periodKey = targetPeriod.replace("_", "");
          const colName = `${indicKey}_${periodKey}`;
          const periodLabel = PERIODES[periodKey]?.short || periodKey;
          options.push([`${indicInfo.medium} ${periodLabel}`, colName]);
        }
      }
    }
  }

  return new Map(options);
}

// === DROPDOWN MULTI-PÉRIODE PAR INDICATEUR ===
// Pour afficher TOUTES les périodes d'un indicateur
export function getColumnOptionsAllPeriods(volet) {
  const options = [];
  const sortedThemes = Object.entries(THEMES).sort((a, b) => a[1].ordre - b[1].ordre);

  for (const [themeKey, themeInfo] of sortedThemes) {
    const themeIndics = Object.entries(INDICATEURS)
      .filter(([k, v]) => v.theme === themeKey && v.volets && v.volets.includes(volet))
      .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));

    if (themeIndics.length > 0) {
      options.push([`── ${themeInfo.label} ──`, `__sep_${themeKey}__`]);

      for (const [indicKey, indicInfo] of themeIndics) {
        const periodes = indicInfo.periodes || [];

        for (const p of periodes) {
          const periodKey = p.replace("_", "");
          const colName = `${indicKey}_${periodKey}`;
          const periodLabel = PERIODES[periodKey]?.short || periodKey;
          options.push([`${indicInfo.medium} ${periodLabel}`, colName]);
        }
      }
    }
  }

  return new Map(options);
}

// === DROPDOWN TOUS INDICATEURS (sans filtre volet) ===
export function getColumnOptionsAll(defaultPeriod = "1622") {
  const options = [];
  const sortedThemes = Object.entries(THEMES).sort((a, b) => a[1].ordre - b[1].ordre);

  for (const [themeKey, themeInfo] of sortedThemes) {
    const themeIndics = Object.entries(INDICATEURS)
      .filter(([k, v]) => v.theme === themeKey)
      .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));

    if (themeIndics.length > 0) {
      options.push([`── ${themeInfo.label} ──`, `__sep_${themeKey}__`]);

      for (const [indicKey, indicInfo] of themeIndics) {
        const periodes = indicInfo.periodes || [];

        if (periodes.length === 0) {
          options.push([indicInfo.medium, indicKey]);
        } else {
          const targetPeriod = periodes.find(p => p.replace("_", "") === defaultPeriod)
                              || periodes[0];
          const periodKey = targetPeriod.replace("_", "");
          const colName = `${indicKey}_${periodKey}`;
          const periodLabel = PERIODES[periodKey]?.short || periodKey;
          options.push([`${indicInfo.medium} ${periodLabel}`, colName]);
        }
      }
    }
  }

  return new Map(options);
}

// === OBTENIR INFO INDICATEUR DEPUIS COLONNE ===
export function getIndicatorInfo(colKey) {
  const { indic, periode } = parseColKey(colKey);
  const indicInfo = INDICATEURS[indic];
  const periodeInfo = PERIODES[periode];

  if (!indicInfo) return null;

  return {
    indicKey: indic,
    periodeKey: periode,
    colKey,
    label: indicInfo.medium,
    shortLabel: indicInfo.short,
    longLabel: indicInfo.long || indicInfo.medium,
    type: indicInfo.type,
    unit: indicInfo.unit,
    theme: indicInfo.theme,
    source: indicInfo.source,
    periodeLabel: periodeInfo?.short || periode,
    periodeLong: periodeInfo?.long || periode,
    fullLabel: `${indicInfo.medium} ${periodeInfo?.short || periode}`
  };
}

// === DÉTERMINER TYPE PALETTE ===
// TCAM/diff → divergent (PAL_PURPLE_GREEN), pct/vol → séquentiel (PAL_SEQ_BLUE)
export function getPaletteType(colKey) {
  const { indic } = parseColKey(colKey);
  const indicInfo = INDICATEURS[indic];
  const type = indicInfo?.type || "vtcam";

  // Types divergents (centrés sur 0)
  if (["vtcam", "vdifp", "diff", "vevol"].includes(type)) {
    return "divergent";
  }

  // Types séquentiels (0 → max)
  return "sequential";
}

// === LISTE COLONNES POUR REQUÊTE DUCKDB ===
// Génère la liste des colonnes à sélectionner
export function getQueryColumns(volet, baseCols = ["code", "libelle", "DEP", "P22_POP"]) {
  const indicCols = [];

  for (const [indicKey, indicInfo] of Object.entries(INDICATEURS)) {
    if (!indicInfo.volets || !indicInfo.volets.includes(volet)) continue;

    const periodes = indicInfo.periodes || [];
    for (const p of periodes) {
      const periodKey = p.replace("_", "");
      indicCols.push(`${indicKey}_${periodKey}`);
    }
  }

  return [...baseCols, ...indicCols];
}

// === VALEUR PAR DÉFAUT DROPDOWN ===
export function getDefaultColumn(volet, fallback = "dm_pop_vtcam_1622") {
  const options = getColumnOptionsByVolet(volet);

  // Chercher première option non-séparateur
  for (const [label, value] of options) {
    if (!value.startsWith("__sep_")) {
      return value;
    }
  }

  return fallback;
}
