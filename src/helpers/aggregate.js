// ============================================================
// &s AGGREGATE — Fonctions d'agrégation territoriale
// ============================================================
// Extrait de exploration-dynamique.md lignes 150-311 + 797-809
// Date: 2025-12-27

import * as d3 from 'npm:d3';

// ============================================================
// &s TCAM — Taux de croissance annuel moyen
// ============================================================

/**
 * Calcule le TCAM (Taux de Croissance Annuel Moyen)
 * @param {number} valFin - Valeur finale
 * @param {number} valDebut - Valeur initiale
 * @param {number} n - Nombre d'années
 * @returns {number|null} TCAM en % ou null si invalide
 */
export function tcam(valFin, valDebut, n) {
  if (valDebut <= 0 || valFin <= 0) return null;
  return (Math.pow(valFin / valDebut, 1 / n) - 1) * 100;
}

// &e

// ============================================================
// &s AGGREGATE — Agrégation communes → échelon territorial
// ============================================================

/**
 * Agrège les données communes vers un échelon territorial
 * @param {Array} data - Données communes
 * @param {string} groupKey - Clé de groupement (ze2020, dep, epci...)
 * @param {Object} geoData - FeatureCollection géo
 * @param {string} geoCodeKey - Propriété code dans geo features
 * @param {Object} options - Options supplémentaires
 * @param {Array} options.dvfDepData - Données DVF par département (optionnel)
 * @returns {{tableData: Array, geoData: Object}}
 */
export function aggregate(data, groupKey, geoData, geoCodeKey, options = {}) {
  const { dvfDepData } = options;

  // Préparer index DVF par département si fourni
  const dvfByDep = dvfDepData ? d3.group(dvfDepData, (d) => d.code) : null;
  // Filtrer les codes invalides/manquants pour chaque échelon
  // - NA, null, undefined, '' = pas de code
  // - AAV '000' = hors aire d'attraction
  // - UU codes finissant par '000' = communes rurales hors UU
  const isValidCode = (code) =>
    code && code !== 'NA' && code !== 'null' && code !== '';

  let filteredData = data.filter((d) => isValidCode(d[groupKey]));

  if (groupKey === 'aav2020') {
    filteredData = filteredData.filter((d) => d.aav2020 !== '000');
  } else if (groupKey === 'uu2020') {
    filteredData = filteredData.filter((d) => !d.uu2020.endsWith('000'));
  }

  const grouped = d3.rollup(
    filteredData,
    (v) => {
      // Calcul densité dominante pondérée par population
      const densPop3 = d3.rollup(
        v,
        (vd) => d3.sum(vd, (d) => d.P22_POP || 0),
        (d) => d.DENS
      );
      const densPop7 = d3.rollup(
        v,
        (vd) => d3.sum(vd, (d) => d.P22_POP || 0),
        (d) => d.DENS7
      );
      const dominantDENS =
        [...densPop3.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 3;
      const dominantDENS7 =
        [...densPop7.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 6;

      // Département et région dominants (pour EPCI, BV, AAV, UU)
      const depPop = d3.rollup(
        v,
        (vd) => d3.sum(vd, (d) => d.P22_POP || 0),
        (d) => d.dep
      );
      const regPop = d3.rollup(
        v,
        (vd) => d3.sum(vd, (d) => d.P22_POP || 0),
        (d) => d.reg
      );
      const depDominant =
        [...depPop.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const regDominant =
        [...regPop.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      return {
        P11_POP: d3.sum(v, (d) => d.P11_POP || 0),
        P16_POP: d3.sum(v, (d) => d.P16_POP || 0),
        P22_POP: d3.sum(v, (d) => d.P22_POP || 0),
        P23_POP: d3.sum(v, (d) => d.P23_POP || 0),
        P11_EMPLT: d3.sum(v, (d) => d.P11_EMPLT || 0),
        P16_EMPLT: d3.sum(v, (d) => d.P16_EMPLT || 0),
        P22_EMPLT: d3.sum(v, (d) => d.P22_EMPLT || 0),
        P11_LOG: d3.sum(v, (d) => d.P11_LOG || 0),
        P16_LOG: d3.sum(v, (d) => d.P16_LOG || 0),
        P22_LOG: d3.sum(v, (d) => d.P22_LOG || 0),
        NAIS1115: d3.sum(v, (d) => d.NAIS1115 || 0),
        DECE1115: d3.sum(v, (d) => d.DECE1115 || 0),
        NAIS1621: d3.sum(v, (d) => d.NAIS1621 || 0),
        DECE1621: d3.sum(v, (d) => d.DECE1621 || 0),
        NAISD22: d3.sum(v, (d) => d.NAISD22 || 0),
        DECESD22: d3.sum(v, (d) => d.DECESD22 || 0),
        // Pour indicateurs %
        P22_POP6074: d3.sum(v, (d) => d.P22_POP6074 || 0),
        P22_POP7589: d3.sum(v, (d) => d.P22_POP7589 || 0),
        P22_POP90P: d3.sum(v, (d) => d.P22_POP90P || 0),
        P22_RSECOCC: d3.sum(v, (d) => d.P22_RSECOCC || 0),
        P22_LOGVAC: d3.sum(v, (d) => d.P22_LOGVAC || 0),
        P16_POP6074: d3.sum(v, (d) => d.P16_POP6074 || 0),
        P16_POP7589: d3.sum(v, (d) => d.P16_POP7589 || 0),
        P16_POP90P: d3.sum(v, (d) => d.P16_POP90P || 0),
        P16_RSECOCC: d3.sum(v, (d) => d.P16_RSECOCC || 0),
        P16_LOGVAC: d3.sum(v, (d) => d.P16_LOGVAC || 0),
        // Ajout données 2011 pour calcul variations
        P11_POP6074: d3.sum(v, (d) => d.P11_POP6074 || 0),
        P11_POP7589: d3.sum(v, (d) => d.P11_POP7589 || 0),
        P11_POP90P: d3.sum(v, (d) => d.P11_POP90P || 0),
        // Population jeune (0-14 ans) pour Indice de Vieillissement
        P22_POP0014: d3.sum(v, (d) => d.P22_POP0014 || 0),
        P16_POP0014: d3.sum(v, (d) => d.P16_POP0014 || 0),
        P11_POP0014: d3.sum(v, (d) => d.P11_POP0014 || 0),
        DENS: dominantDENS,
        DENS7: dominantDENS7,
        // Département et région dominants
        depDom: depDominant,
        regDom: regDominant,
      };
    },
    (d) => d[groupKey]
  );

  const result = [];
  for (const [code, agg] of grouped) {
    // TCAM périodes courtes
    const tcam_pop_11_16 = tcam(agg.P16_POP, agg.P11_POP, 5);
    const tcam_pop_16_22 = tcam(agg.P22_POP, agg.P16_POP, 6);
    const tcam_pop_16_23 = tcam(agg.P23_POP, agg.P16_POP, 7); // 7 ans: 2016-2023
    const tcam_emp_11_16 = tcam(agg.P16_EMPLT, agg.P11_EMPLT, 5);
    const tcam_emp_16_22 = tcam(agg.P22_EMPLT, agg.P16_EMPLT, 6);
    const tcam_log_11_16 = tcam(agg.P16_LOG, agg.P11_LOG, 5);
    const tcam_log_16_22 = tcam(agg.P22_LOG, agg.P16_LOG, 6);

    // TCAM période longue 2011-2022 (11 ans)
    const tcam_pop_11_22 = tcam(agg.P22_POP, agg.P11_POP, 11);
    const tcam_emp_11_22 = tcam(agg.P22_EMPLT, agg.P11_EMPLT, 11);
    const tcam_log_11_22 = tcam(agg.P22_LOG, agg.P11_LOG, 11);

    const evol_11_16 = agg.P16_POP - agg.P11_POP;
    const sn_11_16 = agg.NAIS1115 - agg.DECE1115;
    const tcam_sn_11_16 =
      evol_11_16 !== 0 ? (sn_11_16 * tcam_pop_11_16) / evol_11_16 : 0;
    const tcam_sma_11_16 = tcam_pop_11_16 - tcam_sn_11_16;

    const evol_16_22 = agg.P22_POP - agg.P16_POP;
    const sn_16_22 = agg.NAIS1621 + agg.NAISD22 - (agg.DECE1621 + agg.DECESD22);
    const tcam_sn_16_22 =
      evol_16_22 !== 0 ? (sn_16_22 * tcam_pop_16_22) / evol_16_22 : 0;
    const tcam_sma_16_22 = tcam_pop_16_22 - tcam_sn_16_22;

    // Décomposition 2016-2023 (7 ans) - même naissances/décès que 16-22
    const evol_16_23 = agg.P23_POP - agg.P16_POP;
    const sn_16_23 = agg.NAIS1621 + agg.NAISD22 - (agg.DECE1621 + agg.DECESD22);
    const tcam_sn_16_23 =
      evol_16_23 !== 0 ? (sn_16_23 * tcam_pop_16_23) / evol_16_23 : 0;
    const tcam_sma_16_23 = tcam_pop_16_23 - tcam_sn_16_23;

    // Soldes période longue 2011-2022
    const evol_11_22 = agg.P22_POP - agg.P11_POP;
    const sn_11_22 =
      agg.NAIS1115 +
      agg.NAIS1621 +
      agg.NAISD22 -
      (agg.DECE1115 + agg.DECE1621 + agg.DECESD22);
    const tcam_sn_11_22 =
      evol_11_22 !== 0 ? (sn_11_22 * tcam_pop_11_22) / evol_11_22 : 0;
    const tcam_sma_11_22 = tcam_pop_11_22 - tcam_sn_11_22;

    // Indicateurs % vieillissement (part 60+ dans population)
    // Stock = valeur fin de période, diff = variation entre début et fin
    const pct60_2022 =
      agg.P22_POP > 0
        ? ((agg.P22_POP6074 + agg.P22_POP7589 + agg.P22_POP90P) / agg.P22_POP) *
          100
        : null;
    const pct60_2016 =
      agg.P16_POP > 0
        ? ((agg.P16_POP6074 + agg.P16_POP7589 + agg.P16_POP90P) / agg.P16_POP) *
          100
        : null;
    const pct60_2011 =
      agg.P11_POP > 0
        ? ((agg.P11_POP6074 + agg.P11_POP7589 + agg.P11_POP90P) / agg.P11_POP) *
          100
        : null;

    // pct_60plus = stock fin de période (pour cartes choroplèthes)
    const pct_60plus_16_22 = pct60_2022;
    const pct_60plus_11_16 = pct60_2016;
    const pct_60plus_11_22 = pct60_2022;

    // var_60plus = variation en points (fin - début de période)
    const var_60plus_16_22 =
      pct60_2022 != null && pct60_2016 != null ? pct60_2022 - pct60_2016 : null;
    const var_60plus_11_16 =
      pct60_2016 != null && pct60_2011 != null ? pct60_2016 - pct60_2011 : null;
    const var_60plus_11_22 =
      pct60_2022 != null && pct60_2011 != null ? pct60_2022 - pct60_2011 : null;

    // Part 75+ (vieillissement avancé)
    const pct75_2022 =
      agg.P22_POP > 0
        ? ((agg.P22_POP7589 + agg.P22_POP90P) / agg.P22_POP) * 100
        : null;
    const pct75_2016 =
      agg.P16_POP > 0
        ? ((agg.P16_POP7589 + agg.P16_POP90P) / agg.P16_POP) * 100
        : null;
    const pct75_2011 =
      agg.P11_POP > 0
        ? ((agg.P11_POP7589 + agg.P11_POP90P) / agg.P11_POP) * 100
        : null;

    const pct_75plus_16_22 = pct75_2022;
    const pct_75plus_11_16 = pct75_2016;
    const pct_75plus_11_22 = pct75_2022;

    const var_75plus_16_22 =
      pct75_2022 != null && pct75_2016 != null ? pct75_2022 - pct75_2016 : null;
    const var_75plus_11_16 =
      pct75_2016 != null && pct75_2011 != null ? pct75_2016 - pct75_2011 : null;
    const var_75plus_11_22 =
      pct75_2022 != null && pct75_2011 != null ? pct75_2022 - pct75_2011 : null;

    // Indice de Vieillissement (IV) = Pop 60+ / Pop 0-14 × 100
    // Mesure le nombre de personnes âgées pour 100 jeunes
    const pop60plus_2022 = agg.P22_POP6074 + agg.P22_POP7589 + agg.P22_POP90P;
    const pop60plus_2016 = agg.P16_POP6074 + agg.P16_POP7589 + agg.P16_POP90P;
    const pop60plus_2011 = agg.P11_POP6074 + agg.P11_POP7589 + agg.P11_POP90P;

    const iv_2022 =
      agg.P22_POP0014 > 0 ? (pop60plus_2022 / agg.P22_POP0014) * 100 : null;
    const iv_2016 =
      agg.P16_POP0014 > 0 ? (pop60plus_2016 / agg.P16_POP0014) * 100 : null;
    const iv_2011 =
      agg.P11_POP0014 > 0 ? (pop60plus_2011 / agg.P11_POP0014) * 100 : null;

    const iv_16_22 = iv_2022;
    const iv_11_16 = iv_2016;
    const iv_11_22 = iv_2022;

    // Δ IV = variation de l'indice de vieillissement (en points)
    const var_iv_16_22 =
      iv_2022 != null && iv_2016 != null ? iv_2022 - iv_2016 : null;
    const var_iv_11_16 =
      iv_2016 != null && iv_2011 != null ? iv_2016 - iv_2011 : null;
    const var_iv_11_22 =
      iv_2022 != null && iv_2011 != null ? iv_2022 - iv_2011 : null;

    const pct_rsecocc_16_22 =
      agg.P22_LOG > 0 ? (agg.P22_RSECOCC / agg.P22_LOG) * 100 : null;
    const pct_rsecocc_11_16 =
      agg.P16_LOG > 0 ? (agg.P16_RSECOCC / agg.P16_LOG) * 100 : null;
    const pct_rsecocc_11_22 = pct_rsecocc_16_22;
    const pct_logvac_16_22 =
      agg.P22_LOG > 0 ? (agg.P22_LOGVAC / agg.P22_LOG) * 100 : null;
    const pct_logvac_11_16 =
      agg.P16_LOG > 0 ? (agg.P16_LOGVAC / agg.P16_LOG) * 100 : null;
    const pct_logvac_11_22 = pct_logvac_16_22;

    // Variation en points : diff entre % 2022 et % 2016 (ou 2011)
    const var_rsecocc_16_22 =
      pct_rsecocc_16_22 != null && pct_rsecocc_11_16 != null
        ? pct_rsecocc_16_22 - pct_rsecocc_11_16
        : null;
    const var_rsecocc_11_16 = var_rsecocc_16_22; // Même calcul (pas de données 2011 pour rsecocc)
    const var_rsecocc_11_22 = var_rsecocc_16_22;
    const var_logvac_16_22 =
      pct_logvac_16_22 != null && pct_logvac_11_16 != null
        ? pct_logvac_16_22 - pct_logvac_11_16
        : null;
    const var_logvac_11_16 = var_logvac_16_22;
    const var_logvac_11_22 = var_logvac_16_22;

    // ────────────────────────────────────────────────────────────
    // DVF Prix immobiliers (uniquement si données disponibles)
    // ────────────────────────────────────────────────────────────
    let tcam_pxm2_mai_11_16 = null,
      tcam_pxm2_mai_16_22 = null,
      tcam_pxm2_mai_11_22 = null;
    let tcam_pxm2_mai_19_24 = null,
      tcam_pxm2_mai_22_24 = null;
    let tcam_pxm2_apt_11_16 = null,
      tcam_pxm2_apt_16_22 = null,
      tcam_pxm2_apt_11_22 = null;
    let tcam_pxm2_apt_19_24 = null,
      tcam_pxm2_apt_22_24 = null;

    if (dvfByDep) {
      // Pour Département: lookup direct par code
      // Pour autres échelons: utiliser département dominant (agg.depDom)
      const dvfCode = groupKey === 'dep' ? code : agg.depDom;
      const dvfRows = dvfCode ? dvfByDep.get(dvfCode.padStart(2, '0')) : null;

      if (dvfRows) {
        const dvf2011 = dvfRows.find((d) => d.annee === 2011);
        const dvf2016 = dvfRows.find((d) => d.annee === 2016);
        const dvf2019 = dvfRows.find((d) => d.annee === 2019);
        const dvf2022 = dvfRows.find((d) => d.annee === 2022);
        const dvf2024 = dvfRows.find((d) => d.annee === 2024);

        // TCAM prix maisons - périodes classiques
        if (dvf2011?.pxm2_mai && dvf2016?.pxm2_mai) {
          tcam_pxm2_mai_11_16 = tcam(dvf2016.pxm2_mai, dvf2011.pxm2_mai, 5);
        }
        if (dvf2016?.pxm2_mai && dvf2022?.pxm2_mai) {
          tcam_pxm2_mai_16_22 = tcam(dvf2022.pxm2_mai, dvf2016.pxm2_mai, 6);
        }
        if (dvf2011?.pxm2_mai && dvf2022?.pxm2_mai) {
          tcam_pxm2_mai_11_22 = tcam(dvf2022.pxm2_mai, dvf2011.pxm2_mai, 11);
        }
        // TCAM prix maisons - périodes récentes (post-COVID)
        if (dvf2019?.pxm2_mai && dvf2024?.pxm2_mai) {
          tcam_pxm2_mai_19_24 = tcam(dvf2024.pxm2_mai, dvf2019.pxm2_mai, 5);
        }
        if (dvf2022?.pxm2_mai && dvf2024?.pxm2_mai) {
          tcam_pxm2_mai_22_24 = tcam(dvf2024.pxm2_mai, dvf2022.pxm2_mai, 2);
        }

        // TCAM prix appartements - périodes classiques
        if (dvf2011?.pxm2_apt && dvf2016?.pxm2_apt) {
          tcam_pxm2_apt_11_16 = tcam(dvf2016.pxm2_apt, dvf2011.pxm2_apt, 5);
        }
        if (dvf2016?.pxm2_apt && dvf2022?.pxm2_apt) {
          tcam_pxm2_apt_16_22 = tcam(dvf2022.pxm2_apt, dvf2016.pxm2_apt, 6);
        }
        if (dvf2011?.pxm2_apt && dvf2022?.pxm2_apt) {
          tcam_pxm2_apt_11_22 = tcam(dvf2022.pxm2_apt, dvf2011.pxm2_apt, 11);
        }
        // TCAM prix appartements - périodes récentes (post-COVID)
        if (dvf2019?.pxm2_apt && dvf2024?.pxm2_apt) {
          tcam_pxm2_apt_19_24 = tcam(dvf2024.pxm2_apt, dvf2019.pxm2_apt, 5);
        }
        if (dvf2022?.pxm2_apt && dvf2024?.pxm2_apt) {
          tcam_pxm2_apt_22_24 = tcam(dvf2024.pxm2_apt, dvf2022.pxm2_apt, 2);
        }
      }
    }

    result.push({
      code,
      ...agg,
      tcam_pop_11_16,
      tcam_pop_16_22,
      tcam_pop_16_23,
      tcam_pop_11_22,
      tcam_emp_11_16,
      tcam_emp_16_22,
      tcam_emp_11_22,
      tcam_log_11_16,
      tcam_log_16_22,
      tcam_log_11_22,
      tcam_sn_11_16,
      tcam_sma_11_16,
      tcam_sn_16_22,
      tcam_sma_16_22,
      tcam_sn_16_23,
      tcam_sma_16_23,
      tcam_sn_11_22,
      tcam_sma_11_22,
      // Vieillissement
      pct_60plus_11_16,
      pct_60plus_16_22,
      pct_60plus_11_22,
      var_60plus_11_16,
      var_60plus_16_22,
      var_60plus_11_22,
      pct_75plus_11_16,
      pct_75plus_16_22,
      pct_75plus_11_22,
      var_75plus_11_16,
      var_75plus_16_22,
      var_75plus_11_22,
      // Indice de Vieillissement
      iv_11_16,
      iv_16_22,
      iv_11_22,
      var_iv_11_16,
      var_iv_16_22,
      var_iv_11_22,
      // Logement
      pct_rsecocc_11_16,
      pct_rsecocc_16_22,
      pct_rsecocc_11_22,
      pct_logvac_11_16,
      pct_logvac_16_22,
      pct_logvac_11_22,
      var_rsecocc_11_16,
      var_rsecocc_16_22,
      var_rsecocc_11_22,
      var_logvac_11_16,
      var_logvac_16_22,
      var_logvac_11_22,
      // DVF Prix immobiliers
      tcam_pxm2_mai_11_16,
      tcam_pxm2_mai_16_22,
      tcam_pxm2_mai_11_22,
      tcam_pxm2_mai_19_24,
      tcam_pxm2_mai_22_24,
      tcam_pxm2_apt_11_16,
      tcam_pxm2_apt_16_22,
      tcam_pxm2_apt_11_22,
      tcam_pxm2_apt_19_24,
      tcam_pxm2_apt_22_24,
    });
  }

  if (!geoData)
    return {
      tableData: result.filter((d) => d.tcam_pop_16_22 != null),
      geoData: { type: 'FeatureCollection', features: [] },
    };

  const dataMap = new Map(result.map((d) => [d.code, d]));

  const geoJoined = {
    type: 'FeatureCollection',
    features: geoData.features
      .map((f) => {
        const code = f.properties[geoCodeKey];
        const data = dataMap.get(code);
        // Pré-calcul centroïde (évite recalcul à chaque render carte)
        const centroid = d3.geoCentroid(f);
        return {
          ...f,
          properties: { ...f.properties, ...data, _centroid: centroid },
        };
      })
      .filter((f) => f.properties.P22_POP),
  };

  return {
    tableData: result.filter((d) => d.tcam_pop_16_22 != null),
    geoData: geoJoined,
  };
}

// &e

// ============================================================
// &s JOIN_PRE_AGGREGATED — Jointure données pré-agrégées + geo
// ============================================================

/**
 * Joint des données pré-agrégées (JSON) avec un GeoJSON
 * Remplace aggregate() quand les données sont déjà agrégées côté serveur (R)
 *
 * @param {Array} preAggData - Données JSON pré-agrégées (depuis agg_*.json)
 * @param {Object} geoData - GeoJSON/FeatureCollection
 * @param {string} geoCodeKey - Clé du code dans geo (ex: "ze2020", "EPCI")
 * @param {Object} options - Options supplémentaires
 * @param {Array} options.dvfDepData - Données DVF par département (optionnel)
 * @param {string} options.groupKey - Clé d'échelon (pour déterminer si DEP direct ou dominant)
 * @returns {{tableData: Array, geoData: Object}}
 */
export function joinPreAggregated(
  preAggData,
  geoData,
  geoCodeKey,
  options = {}
) {
  const { dvfDepData, groupKey } = options;

  // Préparer index DVF par département si fourni
  const dvfByDep = dvfDepData ? d3.group(dvfDepData, (d) => d.code) : null;

  // S'assurer que les codes sont strings + enrichir avec DVF
  const tableData = preAggData.map((d) => {
    const row = { ...d, code: String(d.code) };

    // Ajout DVF si disponible
    if (dvfByDep) {
      // Pour Département: code direct, sinon utiliser département dominant (depDom)
      const dvfCode = groupKey === 'dep' ? row.code : (row.depDom || row.DEP);
      const dvfRows = dvfCode
        ? dvfByDep.get(String(dvfCode).padStart(2, '0'))
        : null;

      if (dvfRows) {
        const dvf2011 = dvfRows.find((r) => r.annee === 2011);
        const dvf2016 = dvfRows.find((r) => r.annee === 2016);
        const dvf2019 = dvfRows.find((r) => r.annee === 2019);
        const dvf2022 = dvfRows.find((r) => r.annee === 2022);
        const dvf2024 = dvfRows.find((r) => r.annee === 2024);

        // TCAM prix maisons
        if (dvf2011?.pxm2_mai && dvf2016?.pxm2_mai) {
          row.tcam_pxm2_mai_11_16 = tcam(dvf2016.pxm2_mai, dvf2011.pxm2_mai, 5);
        }
        if (dvf2016?.pxm2_mai && dvf2022?.pxm2_mai) {
          row.tcam_pxm2_mai_16_22 = tcam(dvf2022.pxm2_mai, dvf2016.pxm2_mai, 6);
        }
        if (dvf2011?.pxm2_mai && dvf2022?.pxm2_mai) {
          row.tcam_pxm2_mai_11_22 = tcam(
            dvf2022.pxm2_mai,
            dvf2011.pxm2_mai,
            11
          );
        }
        if (dvf2019?.pxm2_mai && dvf2024?.pxm2_mai) {
          row.tcam_pxm2_mai_19_24 = tcam(dvf2024.pxm2_mai, dvf2019.pxm2_mai, 5);
        }
        if (dvf2022?.pxm2_mai && dvf2024?.pxm2_mai) {
          row.tcam_pxm2_mai_22_24 = tcam(dvf2024.pxm2_mai, dvf2022.pxm2_mai, 2);
        }

        // TCAM prix appartements
        if (dvf2011?.pxm2_apt && dvf2016?.pxm2_apt) {
          row.tcam_pxm2_apt_11_16 = tcam(dvf2016.pxm2_apt, dvf2011.pxm2_apt, 5);
        }
        if (dvf2016?.pxm2_apt && dvf2022?.pxm2_apt) {
          row.tcam_pxm2_apt_16_22 = tcam(dvf2022.pxm2_apt, dvf2016.pxm2_apt, 6);
        }
        if (dvf2011?.pxm2_apt && dvf2022?.pxm2_apt) {
          row.tcam_pxm2_apt_11_22 = tcam(
            dvf2022.pxm2_apt,
            dvf2011.pxm2_apt,
            11
          );
        }
        if (dvf2019?.pxm2_apt && dvf2024?.pxm2_apt) {
          row.tcam_pxm2_apt_19_24 = tcam(dvf2024.pxm2_apt, dvf2019.pxm2_apt, 5);
        }
        if (dvf2022?.pxm2_apt && dvf2024?.pxm2_apt) {
          row.tcam_pxm2_apt_22_24 = tcam(dvf2024.pxm2_apt, dvf2022.pxm2_apt, 2);
        }
      }
    }

    return row;
  });

  if (!geoData || !geoData.features) {
    return {
      tableData: tableData.filter((d) => d.tcam_pop_16_22 != null),
      geoData: { type: 'FeatureCollection', features: [] },
    };
  }

  const dataMap = new Map(tableData.map((d) => [d.code, d]));

  const geoJoined = {
    type: 'FeatureCollection',
    features: geoData.features
      .map((f) => {
        const code = String(f.properties[geoCodeKey]);
        const data = dataMap.get(code);
        // Pré-calcul centroïde (évite recalcul à chaque render carte)
        const centroid = d3.geoCentroid(f);
        return {
          ...f,
          properties: { ...f.properties, ...data, code, _centroid: centroid },
        };
      })
      .filter((f) => f.properties.P22_POP),
  };

  return {
    tableData: tableData.filter((d) => d.tcam_pop_16_22 != null),
    geoData: geoJoined,
  };
}

// &e

// ============================================================
// &s REGRESSION — Régression linéaire
// ============================================================

/**
 * Régression linéaire simple y = slope * x + intercept
 * @param {Array} data - Données
 * @param {string} xKey - Clé variable X
 * @param {string} yKey - Clé variable Y
 * @returns {{slope: number, intercept: number, r2: number}}
 */
export function linearRegression(data, xKey, yKey) {
  const pts = data.filter((d) => d[xKey] != null && d[yKey] != null);
  const n = pts.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const sumX = d3.sum(pts, (d) => d[xKey]);
  const sumY = d3.sum(pts, (d) => d[yKey]);
  const sumXY = d3.sum(pts, (d) => d[xKey] * d[yKey]);
  const sumX2 = d3.sum(pts, (d) => d[xKey] * d[xKey]);
  const sumY2 = d3.sum(pts, (d) => d[yKey] * d[yKey]);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const ssTot = sumY2 - (sumY * sumY) / n;
  const ssRes = d3.sum(pts, (d) =>
    Math.pow(d[yKey] - (slope * d[xKey] + intercept), 2)
  );
  const r2 = 1 - ssRes / ssTot;

  return { slope, intercept, r2: Math.max(0, r2) };
}

/**
 * Régression linéaire passant par l'origine: y = slope * x
 * @param {Array} data - Données
 * @param {string} xKey - Clé variable X
 * @param {string} yKey - Clé variable Y
 * @returns {{slope: number, r2: number}}
 */
export function linearRegressionOrigin(data, xKey, yKey) {
  const pts = data.filter((d) => d[xKey] != null && d[yKey] != null);
  if (pts.length < 2) return { slope: 0, r2: 0 };
  const sumXY = d3.sum(pts, (d) => d[xKey] * d[yKey]);
  const sumX2 = d3.sum(pts, (d) => d[xKey] * d[xKey]);
  const slope = sumXY / sumX2;
  // R² pour régression sans intercept
  const ssTot = d3.sum(pts, (d) => d[yKey] * d[yKey]);
  const ssRes = d3.sum(pts, (d) => Math.pow(d[yKey] - slope * d[xKey], 2));
  const r2 = 1 - ssRes / ssTot;
  return { slope, r2: Math.max(0, r2) };
}

// &e

// ============================================================
// &s STATS — Calcul moyennes France et sélection
// ============================================================

/**
 * Calcule les statistiques (moyenne, médiane) pour un dataset
 * @param {Array} data - Données
 * @param {string[]} cols - Colonnes à calculer
 * @returns {Object} { mean: {col: value}, median: {col: value} }
 */
export function computeStats(data, cols) {
  const mean = {};
  const median = {};

  cols.forEach((col) => {
    const vals = data.map((d) => d[col]).filter((v) => v != null);
    mean[col] = vals.length > 0 ? d3.mean(vals) : null;
    median[col] = vals.length > 0 ? d3.median(vals) : null;
  });

  return { mean, median };
}

/**
 * Calcule les stats France + stats sélection
 * @param {Array} tableData - Données complètes
 * @param {Array} selectedCodes - Codes sélectionnés
 * @param {string[]} cols - Colonnes à calculer
 * @returns {{france: Object, selection: Object}}
 */
export function computeAllStats(tableData, selectedCodes, cols) {
  const france = computeStats(tableData, cols);

  const selData = tableData.filter((d) =>
    (selectedCodes || []).includes(d.code)
  );
  const selection =
    selData.length > 0 ? computeStats(selData, cols) : { mean: {}, median: {} };

  // Ajouter total population
  france.totalPop = d3.sum(tableData, (d) => d.P22_POP || 0);
  selection.totalPop = d3.sum(selData, (d) => d.P22_POP || 0);
  selection.count = selData.length;

  return { france, selection };
}

// &e
