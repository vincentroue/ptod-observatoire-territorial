// ============================================================
// &s TYPOLOGIES — Classifications territoriales dynamiques
// ============================================================
// Date: 2025-12-29
// Source: Observatoire des territoires (ANCT)
// Usage: Catégorisation des territoires selon soldes SN/SMA
// ============================================================

/**
 * Typologie 6 catégories Solde Naturel × Solde Migratoire Apparent
 * Basée sur les données Observatoire des territoires ANCT
 *
 * @type {Object.<number, {label: string, color: string, desc: string}>}
 */
export const TYPO_SN_SMA = {
  1: {
    label: "SN+ SMA+",
    labelLong: "Croissance globale",
    color: "#16a34a",  // Vert - Très favorable
    desc: "Solde naturel ET migratoire positifs : territoire attractif et jeune"
  },
  2: {
    label: "SN+ SMA~0",
    labelLong: "Croissance naturelle",
    color: "#84cc16",  // Vert clair
    desc: "Solde naturel positif, migratoire faible : dynamique démographique endogène"
  },
  3: {
    label: "SN+ SMA-",
    labelLong: "Émigration malgré natalité",
    color: "#eab308",  // Jaune
    desc: "Solde naturel positif mais départs importants : hémorragie migratoire"
  },
  4: {
    label: "SN- SMA+",
    labelLong: "Immigration compense",
    color: "#f97316",  // Orange
    desc: "Vieillissement compensé par attractivité migratoire : renouvellement externe"
  },
  5: {
    label: "SN- SMA~0",
    labelLong: "Déclin naturel",
    color: "#ef4444",  // Rouge clair
    desc: "Solde naturel négatif, peu de flux : vieillissement sans compensation"
  },
  6: {
    label: "SN- SMA-",
    labelLong: "Déclin global",
    color: "#991b1b",  // Rouge foncé - Très défavorable
    desc: "Soldes négatifs : territoire en déprise démographique globale"
  }
};

/**
 * Couleurs pour la palette catégorielle (dans l'ordre 1-6)
 */
export const TYPO_COLORS = Object.values(TYPO_SN_SMA).map(t => t.color);

/**
 * Labels courts pour légende
 */
export const TYPO_LABELS = Object.values(TYPO_SN_SMA).map(t => t.label);

/**
 * Calcule la typologie SN/SMA à partir des TCAM
 * @param {number} tcam_sn - TCAM Solde Naturel (%)
 * @param {number} tcam_sma - TCAM Solde Migratoire Apparent (%)
 * @param {number} seuil - Seuil pour considérer ~0 (défaut 0.1%)
 * @returns {number} Code typologie 1-6
 */
export function calcTypoSNSMA(tcam_sn, tcam_sma, seuil = 0.1) {
  if (tcam_sn == null || tcam_sma == null) return null;

  const snPos = tcam_sn > seuil;
  const snNeg = tcam_sn < -seuil;
  const smaPos = tcam_sma > seuil;
  const smaNeg = tcam_sma < -seuil;

  // SN positif
  if (snPos) {
    if (smaPos) return 1;      // SN+ SMA+
    if (smaNeg) return 3;      // SN+ SMA-
    return 2;                   // SN+ SMA~0
  }

  // SN négatif
  if (snNeg) {
    if (smaPos) return 4;      // SN- SMA+
    if (smaNeg) return 6;      // SN- SMA-
    return 5;                   // SN- SMA~0
  }

  // SN ~0 (rare, utiliser logique simplifiée)
  if (smaPos) return 4;
  if (smaNeg) return 6;
  return 5;
}

/**
 * Retourne la couleur pour une typologie donnée
 * @param {number} typo - Code typologie 1-6
 * @returns {string} Couleur hex
 */
export function getTypoColor(typo) {
  return TYPO_SN_SMA[typo]?.color || "#9ca3af";  // Gris si inconnu
}

/**
 * Retourne le label pour une typologie donnée
 * @param {number} typo - Code typologie 1-6
 * @param {boolean} long - Label long si true
 * @returns {string} Label
 */
export function getTypoLabel(typo, long = false) {
  const t = TYPO_SN_SMA[typo];
  if (!t) return "N/A";
  return long ? t.labelLong : t.label;
}

// ============================================================
// &s TYPO_TRAJECTOIRE — Évolution temporelle des soldes
// ============================================================

/**
 * Typologie trajectoire migratoire (comparaison 2 périodes)
 * @type {Object.<string, {label: string, color: string}>}
 */
export const TYPO_TRAJECTOIRE = {
  "attractif_renforce": {
    label: "Attractif renforcé",
    color: "#16a34a",
    desc: "SM positif qui s'améliore encore"
  },
  "attractif_tassement": {
    label: "Attractif en tassement",
    color: "#84cc16",
    desc: "SM positif mais qui diminue"
  },
  "retournement_positif": {
    label: "Retournement positif",
    color: "#eab308",
    desc: "Passage de SM négatif à positif"
  },
  "retournement_negatif": {
    label: "Retournement négatif",
    color: "#f97316",
    desc: "Passage de SM positif à négatif"
  },
  "declin_attenue": {
    label: "Déclin atténué",
    color: "#ef4444",
    desc: "SM négatif qui s'améliore"
  },
  "declin_accentue": {
    label: "Déclin accentué",
    color: "#991b1b",
    desc: "SM négatif qui s'aggrave"
  }
};

/**
 * Calcule la trajectoire migratoire entre deux périodes
 * @param {number} sm_t1 - Solde migratoire période 1
 * @param {number} sm_t2 - Solde migratoire période 2
 * @returns {string} Clé trajectoire
 */
export function calcTrajectoire(sm_t1, sm_t2) {
  if (sm_t1 == null || sm_t2 == null) return null;

  const diff = sm_t2 - sm_t1;

  if (sm_t1 > 0 && sm_t2 > 0) {
    return diff > 0 ? "attractif_renforce" : "attractif_tassement";
  }
  if (sm_t1 <= 0 && sm_t2 > 0) {
    return "retournement_positif";
  }
  if (sm_t1 > 0 && sm_t2 <= 0) {
    return "retournement_negatif";
  }
  // sm_t1 <= 0 && sm_t2 <= 0
  return diff > 0 ? "declin_attenue" : "declin_accentue";
}

// &e
