// =======================================================================
// indicators-ddict-js.js
// AUTO-GÉNÉRÉ depuis config/ddict_indicateurs_ottd.json + CSV volets (v_*)
// NE PAS MODIFIER - Relancer: Rscript scripts/util-gen-indicators-js.R
// Volets: source CSV ddict-validation-light_ottd.csv (colonnes v_*)
// Généré: 2026-02-13 10:55:59.083745
// =======================================================================

import * as d3 from "npm:d3";

// === DONNÉES DDICT (source de vérité) ===
const DDICT = {
  "&comment": "=== DICTIONNAIRE INDICATEURS OTTD v3.0.0 ===",
  "_description": "Source de vérité unique pour Observable + R + Documentation",
  "_workflow_sync": "Editer labels: config/sp-ddict-sync.R (JSON→CSV→édition→CSV→JSON)",
  "version": "3.7.0",
  "updated": "2026-01-21",
  "periodes": {
    "11": {
      "short": "2011",
      "long": "2011",
      "type": "stock"
    },
    "16": {
      "short": "2016",
      "long": "2016",
      "type": "stock"
    },
    "19": {
      "short": "2019",
      "long": "2019",
      "type": "stock",
      "source": "Filosofi"
    },
    "21": {
      "short": "2021",
      "long": "2021",
      "type": "stock",
      "source": "Filosofi"
    },
    "22": {
      "short": "2022",
      "long": "2022",
      "type": "stock"
    },
    "23": {
      "short": "2023",
      "long": "2023",
      "type": "stock"
    },
    "24": {
      "short": "2024",
      "long": "2024",
      "type": "stock",
      "source": "DVF"
    },
    "&comment": "Périodes inter-censitaires, DVF, Filosofi",
    "11_16": {
      "short": "11-16",
      "long": "2011-2016",
      "duree": 5
    },
    "11_17": {
      "short": "11-17",
      "long": "2011-2017",
      "duree": 6,
      "source": "URSSAF/SIDE"
    },
    "17_24": {
      "short": "17-24",
      "long": "2017-2024",
      "duree": 7,
      "source": "URSSAF/SIDE"
    },
    "16_22": {
      "short": "16-22",
      "long": "2016-2022",
      "duree": 6
    },
    "16_23": {
      "short": "16-23",
      "long": "2016-2023",
      "duree": 7
    },
    "11_22": {
      "short": "11-22",
      "long": "2011-2022",
      "duree": 11
    },
    "21_22": {
      "short": "21-22",
      "long": "2021-2022",
      "duree": 1,
      "source": "MIGCOM"
    },
    "16_24": {
      "short": "16-24",
      "long": "2016-2024",
      "duree": 8,
      "source": "DVF"
    },
    "19_24": {
      "short": "19-24",
      "long": "2019-2024",
      "duree": 5,
      "source": "DVF"
    },
    "22_24": {
      "short": "22-24",
      "long": "2022-2024",
      "duree": 2,
      "source": "DVF"
    },
    "22_23": {
      "short": "22-23",
      "long": "2022-2023",
      "duree": 1
    },
    "19_21": {
      "short": "19-21",
      "long": "2019-2021",
      "duree": 2,
      "source": "Filosofi"
    },
    "20": {
      "short": "2020",
      "long": "2020",
      "type": "stock",
      "source": "LOVAC"
    },
    "20_23": {
      "short": "20-23",
      "long": "2020-2023",
      "duree": 3,
      "source": "LOVAC"
    },
    "25": {
      "short": "2025",
      "long": "2025",
      "type": "stock",
      "source": "ANIL"
    },
    "22_25": {
      "short": "22-25",
      "long": "2022-2025",
      "duree": 3,
      "source": "ANIL"
    },
    "20_24": {
      "short": "20-24",
      "long": "2020-2024",
      "duree": 4,
      "source": "LOVAC"
    }
  },
  "themes": {
    "idx": {
      "label": "Indices synthétiques",
      "ordre": 0
    },
    "dm": {
      "label": "Démographie",
      "ordre": 1
    },
    "dmv": {
      "label": "Vieillissement",
      "ordre": 2
    },
    "dmf": {
      "label": "Flux migratoires",
      "ordre": 3
    },
    "eco": {
      "label": "Économie/Emploi",
      "ordre": 4
    },
    "soc": {
      "label": "Social",
      "ordre": 5
    },
    "dsp": {
      "label": "Diplômes/CSP",
      "ordre": 6
    },
    "men": {
      "label": "Ménages",
      "ordre": 7
    },
    "log": {
      "label": "Logement",
      "ordre": 8
    },
    "bpe": {
      "label": "Équipements",
      "ordre": 9
    },
    "logd": {
      "label": "DVF Immobilier",
      "ordre": 10
    },
    "rev": {
      "label": "Revenus/Pauvreté",
      "ordre": 11,
      "source": "Filosofi"
    },
    "logv": {
      "label": "Vacance parc privé",
      "ordre": 12,
      "source": "LOVAC/SDES"
    },
    "logsr": {
      "label": "Construction résidentielle",
      "ordre": 13,
      "source": "SITADEL/SDES"
    },
    "logsn": {
      "label": "Construction non-résidentielle",
      "ordre": 14,
      "source": "SITADEL/SDES"
    },
    "logl": {
      "label": "Loyers prédits",
      "color": "#8b5cf6",
      "icon": "home",
      "ordre": 15
    },
    "logs": {
      "label": "Construction SITADEL",
      "color": "#f59e0b",
      "icon": "building",
      "ordre": 16
    }
  },
  "indicateurs": {
    "&comment_idx": "══════════ INDICES SYNTHÉTIQUES (idx) ══════════",
    "idxresid_dyn_ind": {
      "rawObsvACT": "idx_resid",
      "short": "◆ Attract. résid.",
      "medium": "Indice d'attractivité résidentielle",
      "long": "Indice attractivité résidentielle (SMA, TMI cadres, TMI 65+)",
      "type": "ind",
      "unit": "ind",
      "theme": "idx",
      "ordre": 1,
      "source": "Calcul PTOD",
      "formula": "50 + mean(z_composantes) × 15, borné [0-100]",
      "note": "Synthèse de 4 composantes migratoires (solde migratoire, rotation, taux migratoire cadres et 65+). Score 50 = moyenne nationale. Supérieur = territoire plus attractif.",
      "periodes": [
        "11_16",
        "16_22"
      ],
      "srcVar": [
        "dm_sma_vtcam_1622",
        "dmf_tmi_cscadre_22",
        "dmf_tmi_a65p_22"
      ],
      "volets": [],
      "eda": true,
      "priority": 1,
      "polarity": 1,
      "symbol": "",
      "definition": "Indice composite d’attractivité résidentielle : solde migratoire, rotation, profils cadres et 65+. Normalisé en z-score.",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "idxeco_soc_ind": {
      "short": "◆ Attract. éco.(s)",
      "medium": "◆ Indice d'attractivité économique (social)",
      "long": "Indice synthétique d'attractivité économique avec créations de sociétés",
      "type": "ind",
      "unit": "indice",
      "theme": "idx",
      "ordre": 2,
      "periodes": [
        "1117",
        "1724"
      ],
      "source": "Calcul PTOD",
      "formula": "50 + mean(z_composantes) × 15, borné [0-100]",
      "srcVar": [
        "eco_emp_vtcam_1622",
        "eco_emppriv_vtcam_2224",
        "eco_etabpriv_vevol_1924",
        "eco_entrcrea_soc_vevol_1724",
        "dsp_csp_cadres_vdifp_1622"
      ],
      "priority": 1,
      "polarity": 1,
      "symbol": "◆",
      "definition": "Indice composite d'attractivité économique (variante sociale) : emploi RP, emploi privé, établissements, créations, cadres.",
      "note": "Synthèse de 5 composantes économiques (emploi total, emploi privé URSSAF, établissements, créations de sociétés, cadres). Normalisé en z-score. Valeur supérieure à {percentile}% des territoires.",
      "volets": [],
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "idxeco_tot_ind": {
      "short": "◆ Attract. éco.(t)",
      "medium": "◆ Indice d'attractivité économique (total)",
      "long": "Indice synthétique d'attractivité économique avec créations totales",
      "type": "ind",
      "unit": "indice",
      "theme": "idx",
      "ordre": 3,
      "periodes": [
        "1117",
        "1724"
      ],
      "source": "Calcul PTOD",
      "formula": "50 + mean(z_composantes) × 15, borné [0-100]",
      "srcVar": [
        "eco_emp_vtcam_1622",
        "eco_emppriv_vtcam_2224",
        "eco_etabpriv_vevol_1924",
        "eco_entrcrea_tot_vevol_1724",
        "dsp_csp_cadres_vdifp_1622"
      ],
      "priority": 2,
      "polarity": 1,
      "symbol": "◆",
      "definition": "Indice composite d'attractivité économique (variante totale) incluant l'emploi total.",
      "note": "Mêmes composantes que la variante sociale mais avec l'emploi total en remplacement. Normalisé en z-score. Valeur 0 = moyenne nationale. Valeur supérieure à {percentile}% des territoires.",
      "volets": [],
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "idxgentri_ind": {
      "rawObsvACT": "idx_gentri",
      "short": "◆ Gentrification",
      "medium": "Indice de gentrification",
      "long": "Indice gentrification (transformation sociale en cours)",
      "type": "ind",
      "unit": "ind",
      "theme": "idx",
      "ordre": 4,
      "source": "Calcul PTOD",
      "formula": "50 + mean(z_cappé±3) × 15, borné [0-100]",
      "note": "Croise l’évolution des prix, l’arrivée de cadres et le départ de populations modestes. Valeur 0 = moyenne nationale. Valeur élevée = dynamique de gentrification marquée. Valeur supérieure à {percentile}% des territoires.",
      "periodes": [
        "11_22"
      ],
      "srcVar": [
        "dsp_csp_cadres_pct_22",
        "dsp_csp_cadres_vdifp_1122",
        "dmf_tmi_cscadre_22",
        "dmf_tmi_csouvrier_22",
        "rev_med_21",
        "rev_med_vevol_1921",
        "dmf_tr_pct_22"
      ],
      "srcVarOpt": [
        "logd_px2_mai_vevol_1924",
        "logd_px2_appt_vevol_1924"
      ],
      "volets": [],
      "eda": true,
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Indice composite de gentrification : évolution prix immobiliers, profils socio-économiques et flux migratoires.",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "idxlogtens_ind": {
      "rawObsvACT": "idx_logtens",
      "short": "◆ Tension logt",
      "medium": "Indice de tension du logement",
      "long": "Indice tension marché logement",
      "type": "ind",
      "unit": "ind",
      "theme": "idx",
      "ordre": 5,
      "source": "Calcul PTOD",
      "formula": "50 + mean(z_composantes) × 15, borné [0-100]",
      "note": "Synthèse des prix immobiliers, du taux de vacance, de la construction neuve et des loyers. Valeur 0 = moyenne nationale. Positif = marché tendu. Valeur supérieure à {percentile}% des territoires.",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "log_vac_pct_22",
        "rev_med_21",
        "rev_txpauv_21",
        "log_ressec_pct_22"
      ],
      "volets": [],
      "eda": true,
      "priority": 2,
      "polarity": -1,
      "symbol": "",
      "definition": "Indice composite de tension du logement : prix, vacance, construction et loyers.",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_dm": "══════════ DÉMOGRAPHIE GÉNÉRALE (dm) ══════════",
    "dm_pop_vtcam": {
      "rawObsvACT": "tcam_pop",
      "short": "△ Pop",
      "medium": "△ Évolution de la population",
      "long": "Taux de croissance annuel moyen de la population totale",
      "type": "vtcam",
      "unit": "%/an",
      "theme": "dm",
      "ordre": 1,
      "source": "INSEE RP",
      "formula": "((P_fin / P_debut)^(1/n) - 1) × 100",
      "periodes": [
        "11_16",
        "16_22",
        "16_23",
        "11_22"
      ],
      "srcVar": [
        "P11_POP",
        "P16_POP",
        "P22_POP",
        "P23_POP"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 1,
      "polarity": 1,
      "symbol": "△",
      "definition": "Taux de croissance annuel moyen de la population sur la période, lissant les variations annuelles.",
      "note": "Vitesse d’évolution de la population lissée sur la période. Un TCAM de +1%/an signifie qu’en moyenne la population augmente de 1% chaque année. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}/an).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_sn_vtcam": {
      "rawObsvACT": "tcam_sn",
      "short": "△ Solde naturel",
      "medium": "△ Contribution du solde naturel",
      "long": "Contribution du solde naturel à l'évolution démographique",
      "type": "vtcam",
      "unit": "%/an",
      "theme": "dm",
      "ordre": 2,
      "source": "INSEE RP",
      "formula": "tcam_sn = (SN / evol_pop) × tcam_pop",
      "periodes": [
        "11_16",
        "16_22",
        "16_23",
        "11_22"
      ],
      "srcVar": [
        "NAIS1115",
        "NAIS1621",
        "NAISD22",
        "DECE1115",
        "DECE1621",
        "DECESD22"
      ],
      "volets": ["exd", "exdc"],
      "priority": 1,
      "polarity": 1,
      "symbol": "△",
      "definition": "Contribution du solde naturel (naissances moins décès) à l’évolution démographique, en taux annuel moyen.",
      "note": "Part de la croissance due au solde naturel (naissances moins décès). Négatif = plus de décès que de naissances. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}/an).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_pop_vevol": {
      "rawObsvACT": {},
      "short": "△ Pop 22-23",
      "medium": "△ Variation population récente",
      "long": "Variation population entre 2022 et 2023 en pourcentage",
      "type": "vevol",
      "unit": "%",
      "theme": "dm",
      "ordre": 1.5,
      "source": "INSEE RP",
      "formula": "((P23 - P22) / P22) × 100",
      "periodes": [
        "22_23"
      ],
      "srcVar": [
        "P22_POP",
        "P23_POP"
      ],
      "volets": "exdc",
      "priority": 2,
      "polarity": 1,
      "symbol": "△",
      "definition": "Variation annuelle récente de la population (dernière année disponible).",
      "note": "Variation la plus récente, complément du TCAM long terme. Permet de détecter les inflexions de tendance. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_sma_vtcam": {
      "rawObsvACT": "tcam_sma",
      "short": "△ Solde migr.",
      "medium": "△ Contribution du solde migratoire",
      "long": "Contribution du solde migratoire apparent (résidu)",
      "type": "vtcam",
      "unit": "%/an",
      "theme": "dm",
      "ordre": 3,
      "source": "INSEE RP",
      "formula": "tcam_sma = tcam_pop - tcam_sn",
      "periodes": [
        "11_16",
        "16_22",
        "16_23",
        "11_22"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 1,
      "polarity": 1,
      "symbol": "△",
      "definition": "Contribution du solde migratoire apparent à l’évolution démographique. Résidu : croissance totale moins solde naturel.",
      "note": "Part de la croissance due aux migrations (entrées moins sorties). Positif = le territoire attire plus d’habitants qu’il n’en perd. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}/an).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_dmv": "══════════ VIEILLISSEMENT (dmv) ══════════",
    "dmv_60p_pct": {
      "rawObsvACT": "pct_60plus",
      "short": "% 60 ans+",
      "medium": "Part des 60 ans et plus",
      "long": "Part de la population de 60ans+ dans la population totale",
      "type": "pct",
      "unit": "%",
      "theme": "dmv",
      "ordre": 1,
      "source": "INSEE RP",
      "formula": "(POP6074 + POP7589 + POP90P) / POP × 100",
      "periodes": [
        "11",
        "16",
        "22"
      ],
      "srcVar": [
        "P22_POP6074",
        "P22_POP7589",
        "P22_POP90P"
      ],
      "volets": ["exd", "exdc"],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part de la population âgée de 60 ans et plus dans la population totale.",
      "note": "Marqueur du vieillissement démographique. Une part élevée peut impliquer des besoins accrus en services de santé et d'autonomie. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmv_60p_vdifp": {
      "rawObsvACT": "var_60plus",
      "short": "▲ 60 ans+",
      "medium": "▲ Variation de la part des 60 ans+",
      "long": "Variation de la part des 60ans+ en points",
      "type": "vdifp",
      "unit": "pts",
      "theme": "dmv",
      "ordre": 2,
      "source": "INSEE RP",
      "formula": "pct_60p_fin - pct_60p_debut",
      "periodes": [
        "11_16",
        "16_22",
        "11_22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "▲",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmv_75p_pct": {
      "rawObsvACT": "pct_75plus",
      "short": "% 75 ans+",
      "medium": "Part des 75 ans et plus",
      "long": "Part de la population de 75ans+ (vieillissement avancé)",
      "type": "pct",
      "unit": "%",
      "theme": "dmv",
      "ordre": 3,
      "source": "INSEE RP",
      "formula": "(POP7589 + POP90P) / POP × 100",
      "periodes": [
        "11",
        "16",
        "22"
      ],
      "srcVar": [
        "P22_POP7589",
        "P22_POP90P"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part de la population âgée de 75 ans et plus dans la population totale.",
      "note": "Indicateur de grand âge. Part élevée = enjeux de dépendance, d'isolement et de services de proximité. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmv_75p_vdifp": {
      "rawObsvACT": "var_75plus",
      "short": "▲ 75 ans+",
      "medium": "▲ Variation de la part des 75 ans+",
      "long": "Variation de la part des 75ans+ en points",
      "type": "vdifp",
      "unit": "pts",
      "theme": "dmv",
      "ordre": 4,
      "source": "INSEE RP",
      "formula": "pct_75p_fin - pct_75p_debut",
      "periodes": [
        "11_16",
        "16_22",
        "11_22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "▲",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmv_iv_ind": {
      "rawObsvACT": "iv",
      "short": "Ind. vieillissement",
      "medium": "Indice de vieillissement (60+/0-14)",
      "long": "Indice de vieillissement (pop 65ans+ / pop <20 ans)",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmv",
      "ordre": 5,
      "source": "INSEE RP",
      "formula": "(POP6579 + POP80P) / (POP0014 + POP1519) × 100",
      "periodes": [
        "11",
        "16",
        "22"
      ],
      "srcVar": [
        "P22_POP6579",
        "P22_POP80P",
        "P22_POP0014",
        "P22_POP1519"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 2,
      "polarity": -1,
      "symbol": "",
      "definition": "Rapport entre la population de 60 ans+ et celle de moins de 15 ans. Mesure le vieillissement relatif.",
      "note": "Nombre de personnes de 60+ pour 100 de moins de 15 ans. Valeur 100 = autant de seniors que de jeunes. Au-dessus = population vieillissante. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmv_iv_vdifp": {
      "rawObsvACT": "var_iv",
      "short": "▲ Vieillissement",
      "medium": "▲ Variation de l’indice de vieillissement",
      "long": "Variation de l'indice de vieillissement en points",
      "type": "vdifp",
      "unit": "pts",
      "theme": "dmv",
      "ordre": 6,
      "source": "INSEE RP",
      "formula": "iv_fin - iv_debut",
      "periodes": [
        "11_16",
        "16_22",
        "11_22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": -1,
      "symbol": "▲",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_dm_tranches": "--- Tranches d'âge détaillées (structure pop, pas vieillissement) ---",
    "dm_1519_pct": {
      "rawObsvACT": "pct_1519",
      "short": "% 15-19 ans",
      "medium": "Part des 15-19 ans",
      "long": "Part de la population de 15-19 ans",
      "type": "pct",
      "unit": "%",
      "theme": "dm",
      "ordre": 10,
      "source": "INSEE RP",
      "formula": "P22_POP1519 / P22_POP × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_POP1519"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_2024_pct": {
      "rawObsvACT": "pct_2024",
      "short": "% 20-24 ans",
      "medium": "Part des 20-24 ans",
      "long": "Part de la population de 20-24 ans",
      "type": "pct",
      "unit": "%",
      "theme": "dm",
      "ordre": 11,
      "source": "INSEE RP",
      "formula": "P22_POP2024 / P22_POP × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_POP2024"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_2539_pct": {
      "rawObsvACT": "pct_2539",
      "short": "% 25-39 ans",
      "medium": "Part des 25-39 ans",
      "long": "Part de la population de 25-39 ans",
      "type": "pct",
      "unit": "%",
      "theme": "dm",
      "ordre": 12,
      "source": "INSEE RP",
      "formula": "P22_POP2539 / P22_POP × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_POP2539"
      ],
      "volets": [],
      "eda": true,
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_4054_pct": {
      "rawObsvACT": "pct_4054",
      "short": "% 40-54 ans",
      "medium": "Part des 40-54 ans",
      "long": "Part de la population de 40-54 ans",
      "type": "pct",
      "unit": "%",
      "theme": "dm",
      "ordre": 13,
      "source": "INSEE RP",
      "formula": "P22_POP4054 / P22_POP × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_POP4054"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_5564_pct": {
      "rawObsvACT": "pct_5564",
      "short": "% 55-64 ans",
      "medium": "Part des 55-64 ans",
      "long": "Part de la population de 55-64 ans",
      "type": "pct",
      "unit": "%",
      "theme": "dm",
      "ordre": 14,
      "source": "INSEE RP",
      "formula": "P22_POP5564 / P22_POP × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_POP5564"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_6579_pct": {
      "rawObsvACT": "pct_6579",
      "short": "% 65-79 ans",
      "medium": "Part des 65-79 ans",
      "long": "Part de la population de 65-79 ans",
      "type": "pct",
      "unit": "%",
      "theme": "dm",
      "ordre": 15,
      "source": "INSEE RP",
      "formula": "P22_POP6579 / P22_POP × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_POP6579"
      ],
      "volets": [],
      "eda": true,
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_80p_pct": {
      "rawObsvACT": "pct_80p",
      "short": "% 80 ans+",
      "medium": "Part des 80 ans et plus",
      "long": "Part de la population de 80 ans et plus",
      "type": "pct",
      "unit": "%",
      "theme": "dm",
      "ordre": 16,
      "source": "INSEE RP",
      "formula": "P22_POP80P / P22_POP × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_POP80P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_dmv_seul": "--- Personnes vivant seules par tranche ---",
    "dmv_6579_seul_pct": {
      "rawObsvACT": "pct_6579_seul",
      "short": "% 65-79 seuls",
      "medium": "Part des 65-79 ans vivant seuls",
      "long": "Part des 65-79 ans vivant seuls dans leur tranche",
      "type": "pct",
      "unit": "%",
      "theme": "dmv",
      "ordre": 20,
      "source": "INSEE RP",
      "formula": "P22_POP6579_PSEUL / P22_POP6579 × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "P22_POP6579_PSEUL",
        "P22_POP6579"
      ],
      "volets": [],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmv_80p_seul_pct": {
      "rawObsvACT": "pct_80p_seul",
      "short": "% 80+ seuls",
      "medium": "Part des 80+ vivant seuls",
      "long": "Part des 80 ans et plus vivant seuls",
      "type": "pct",
      "unit": "%",
      "theme": "dmv",
      "ordre": 21,
      "source": "INSEE RP",
      "formula": "P22_POP80P_PSEUL / P22_POP80P × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "P22_POP80P_PSEUL",
        "P22_POP80P"
      ],
      "volets": [],
      "eda": true,
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_dmf": "══════════ FLUX MIGRATOIRES (dmf) - MIGCOM ══════════",
    "dmf_pe_pct": {
      "rawObsvACT": "PE_pct",
      "short": "% entrants",
      "medium": "Part des entrants dans la population",
      "long": "Part des individus entrés dans le territoire",
      "type": "pct",
      "unit": "%",
      "theme": "dmf",
      "ordre": 1,
      "source": "INSEE MIGCOM",
      "formula": "nb_ind_ENTR / nb_ind_PRES × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des entrants (personnes arrivées) dans la population totale du territoire.",
      "note": "Proportion de nouveaux arrivants. Un taux élevé signale un territoire ouvert aux flux. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_ps_pct": {
      "rawObsvACT": "PS_pct",
      "short": "% sortants",
      "medium": "Part des sortants dans la population",
      "long": "Part des individus sortis du territoire",
      "type": "pct",
      "unit": "%",
      "theme": "dmf",
      "ordre": 2,
      "source": "INSEE MIGCOM",
      "formula": "nb_ind_SORT / nb_ind_AUTO × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des sortants (personnes parties) dans la population totale du territoire.",
      "note": "Proportion de départs. Un taux élevé traduit une forte mobilité sortante. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_sm_stock": {
      "rawObsvACT": "SM",
      "short": "Solde migratoire",
      "medium": "Solde migratoire apparent",
      "long": "Différence entrants - sortants en nombre",
      "type": "stock",
      "unit": "hab",
      "theme": "dmf",
      "ordre": 3,
      "source": "INSEE MIGCOM",
      "formula": "nb_ind_ENTR - nb_ind_SORT",
      "periodes": [
        "16",
        "22"
      ],
      "volets": ["exd", "exdc"],
      "priority": 1,
      "polarity": 1,
      "symbol": "",
      "definition": "Différence entre le nombre d’entrants et de sortants sur la période intercensitaire (source MIGCOM).",
      "note": "Solde migratoire apparent : personnes installées moins celles parties. Source MIGCOM (fichiers détail du recensement). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_tm_vtcam": {
      "rawObsvACT": "TM",
      "short": "△ Tx migr. total",
      "medium": "△ Évolution du taux migratoire total",
      "long": "Solde migratoire rapporté à la population moyenne",
      "type": "vtcam",
      "unit": "%/an",
      "theme": "dmf",
      "ordre": 4,
      "source": "INSEE MIGCOM",
      "formula": "(ENTR - SORT) / ((AUTO + PRES) / 2) × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 2,
      "polarity": 0,
      "symbol": "△",
      "definition": "Taux de croissance annuel moyen du taux migratoire total sur la période.",
      "note": "Évolution du solde migratoire rapporté à la population. Positif = l'attractivité migratoire s'améliore. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_tr_pct": {
      "rawObsvACT": "TR_pct",
      "short": "Tx rotation",
      "medium": "Taux de rotation migratoire",
      "long": "Intensité des flux (entrants + sortants) rapportée à la population",
      "type": "pct",
      "unit": "%",
      "theme": "dmf",
      "ordre": 5,
      "source": "INSEE MIGCOM",
      "formula": "(ENTR + SORT) / ((AUTO + PRES) / 2) × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 1,
      "polarity": 0,
      "symbol": "",
      "definition": "Somme des entrants et sortants rapportée à la population. Mesure l’intensité des échanges migratoires.",
      "note": "Taux de rotation : intensité des flux (entrées + sorties / population). Un taux élevé = beaucoup de mouvements, même si le solde est proche de zéro. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_eco": "══════════ ÉCONOMIE / EMPLOI (eco) ══════════",
    "eco_emp_vtcam": {
      "rawObsvACT": "tcam_emp",
      "short": "△ Emploi",
      "medium": "△ Évolution de l’emploi total",
      "long": "Taux de croissance annuel moyen de l'emploi total",
      "type": "vtcam",
      "unit": "%/an",
      "theme": "eco",
      "ordre": 1,
      "source": "INSEE RP",
      "formula": "((EMPLT_fin / EMPLT_debut)^(1/n) - 1) × 100",
      "periodes": [
        "11_16",
        "16_22",
        "11_22"
      ],
      "srcVar": [
        "P11_EMPLT",
        "P16_EMPLT",
        "P22_EMPLT"
      ],
      "volets": ["exd", "exde"],
      "eda": true,
      "priority": 1,
      "polarity": 1,
      "symbol": "△",
      "definition": "Taux de croissance annuel moyen de l’emploi total au lieu de travail sur la période.",
      "note": "Évolution de l’emploi au lieu de travail. Positif = création nette d’emplois. Négatif = destruction nette. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}/an).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "&comment_eco_actifs": "--- Actifs et Actifs Occupés ---",
    "eco_act1564_stock": {
      "rawObsvACT": "act1564",
      "short": "Actifs 15-64",
      "medium": "Population active 15-64 ans",
      "long": "Population active de 15 à 64 ans",
      "type": "stock",
      "unit": "hab",
      "theme": "eco",
      "ordre": 5,
      "source": "INSEE RP",
      "formula": "C22_ACT1564",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_ACT1564"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "eco_actocc1564_stock": {
      "rawObsvACT": "actocc1564",
      "short": "ActOcc 15-64",
      "medium": "Actifs occupés 15-64 ans",
      "long": "Population active occupée de 15 à 64 ans",
      "type": "stock",
      "unit": "hab",
      "theme": "eco",
      "ordre": 6,
      "source": "INSEE RP",
      "formula": "C22_ACTOCC1564",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_ACTOCC1564"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_eco_csp_actocc": "--- CSP Actifs Occupés 15-64 ---",
    "eco_actocc_artcom_pct": {
      "rawObsvACT": "pct_actocc_artcom",
      "short": "% Artisans act.",
      "medium": "Part des artisans dans les actifs",
      "long": "Part des artisans, commerçants parmi les actifs occupés 15-64",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 10,
      "source": "INSEE RP",
      "formula": "C22_ACTOCC1564_STAT_GSEC12 / C22_ACTOCC1564 × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_ACTOCC1564_STAT_GSEC12",
        "C22_ACTOCC1564"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "eco_actocc_cadres_pct": {
      "rawObsvACT": "pct_actocc_cadres",
      "short": "% Cadres actifs",
      "medium": "Part des cadres dans les actifs",
      "long": "Part des cadres parmi les actifs occupés 15-64",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 11,
      "source": "INSEE RP",
      "formula": "C22_ACTOCC1564_STAT_GSEC13 / C22_ACTOCC1564 × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_ACTOCC1564_STAT_GSEC13",
        "C22_ACTOCC1564"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "eco_actocc_profint_pct": {
      "rawObsvACT": "pct_actocc_profint",
      "short": "% Prof.int. act.",
      "medium": "Part des prof. intermédiaires actifs",
      "long": "Part des professions intermédiaires parmi les actifs occupés 15-64",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 12,
      "source": "INSEE RP",
      "formula": "C22_ACTOCC1564_STAT_GSEC14 / C22_ACTOCC1564 × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_ACTOCC1564_STAT_GSEC14",
        "C22_ACTOCC1564"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "eco_actocc_employes_pct": {
      "rawObsvACT": "pct_actocc_employes",
      "short": "% Employés act.",
      "medium": "Part des employés dans les actifs",
      "long": "Part des employés parmi les actifs occupés 15-64",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 13,
      "source": "INSEE RP",
      "formula": "C22_ACTOCC1564_STAT_GSEC15 / C22_ACTOCC1564 × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_ACTOCC1564_STAT_GSEC15",
        "C22_ACTOCC1564"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "eco_actocc_ouvriers_pct": {
      "rawObsvACT": "pct_actocc_ouvriers",
      "short": "% Ouvriers act.",
      "medium": "Part des ouvriers dans les actifs",
      "long": "Part des ouvriers parmi les actifs occupés 15-64",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 14,
      "source": "INSEE RP",
      "formula": "C22_ACTOCC1564_STAT_GSEC16 / C22_ACTOCC1564 × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_ACTOCC1564_STAT_GSEC16",
        "C22_ACTOCC1564"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_eco_salnsal": "--- Salariés / Non-salariés ---",
    "eco_sal_pct": {
      "rawObsvACT": "pct_sal",
      "short": "% salariés",
      "medium": "Part des salariés dans l’emploi",
      "long": "Part des salariés dans la population active occupée 15ans+",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 20,
      "source": "INSEE RP",
      "formula": "P22_SAL15P / P22_ACTOCC15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_SAL15P",
        "P22_ACTOCC15P"
      ],
      "volets": ["exd", "exdc", "exde"],
      "eda": true,
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des salariés dans l'emploi total.",
      "note": "Complémentaire des non-salariés. Part très élevée = économie structurée autour d'entreprises établies. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_nsal_pct": {
      "rawObsvACT": "pct_nsal",
      "short": "% non-salariés",
      "medium": "Part des non-salariés dans l’emploi",
      "long": "Part des non-salariés dans la population active occupée 15ans+",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 21,
      "source": "INSEE RP",
      "formula": "P22_NSAL15P / P22_ACTOCC15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_NSAL15P",
        "P22_ACTOCC15P"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des non-salariés (indépendants, professions libérales, auto-entrepreneurs) dans l'emploi total.",
      "note": "Indépendants et professions libérales. Part élevée = tissu de petites entreprises, zones rurales ou touristiques. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "&comment_eco_txemp": "--- Taux d'emploi par âge ---",
    "eco_txemp_1564": {
      "rawObsvACT": "txemp_1564",
      "short": "Tx emploi 15-64",
      "medium": "Taux d’emploi des 15-64 ans",
      "long": "Taux d'emploi des 15-64 ans (actifs occupés / pop)",
      "type": "tx",
      "unit": "%",
      "theme": "eco",
      "ordre": 25,
      "source": "INSEE RP",
      "formula": "(Cxx_ACT1564 - Pxx_CHOM1564) / Pxx_POP1564 × 100",
      "periodes": [
        "16",
        "22"
      ],
      "srcVar": [
        "C16_ACT1564",
        "P16_CHOM1564",
        "P16_POP1564",
        "C22_ACT1564",
        "P22_CHOM1564",
        "P22_POP1564"
      ],
      "volets": ["exd", "exde"],
      "priority": 1,
      "polarity": 1,
      "symbol": "",
      "definition": "Rapport entre le nombre d’actifs occupés de 15-64 ans et la population totale de 15-64 ans.",
      "note": "Taux d’emploi : proportion de la population en âge de travailler qui occupe effectivement un emploi. Complémentaire du taux de chômage (inclut aussi les inactifs). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_txemp_1564_vdifp": {
      "rawObsvACT": "txemp_1564_evol",
      "short": "▲ Var. tx emploi",
      "medium": "▲ Variation du taux d’emploi 15-64",
      "long": "Évolution du taux d'emploi 15-64 ans en points de %",
      "type": "vdifp",
      "unit": "pts %",
      "theme": "eco",
      "ordre": 25.5,
      "source": "INSEE RP",
      "formula": "eco_txemp_1564_22 - eco_txemp_1564_16",
      "periodes": [
        "16_22"
      ],
      "srcVar": [
        "eco_txemp_1564_16",
        "eco_txemp_1564_22"
      ],
      "volets": [],
      "eda": true,
      "priority": 3,
      "polarity": 1,
      "symbol": "▲",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "eco_txemp_1524": {
      "rawObsvACT": "txemp_1524",
      "short": "Tx emploi 15-24",
      "medium": "Taux d’emploi des 15-24 ans",
      "long": "Taux d'emploi des 15-24 ans (jeunes)",
      "type": "tx",
      "unit": "%",
      "theme": "eco",
      "ordre": 26,
      "source": "INSEE RP",
      "formula": "(P22_ACT1524 - P22_CHOM1524) / (P22_POP1519 + P22_POP2024) × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "P22_ACT1524",
        "P22_CHOM1524",
        "P22_POP1519",
        "P22_POP2024"
      ],
      "volets": [],
      "priority": 2,
      "polarity": 1,
      "symbol": "",
      "definition": "Rapport entre le nombre d'actifs occupés de 15-24 ans et la population totale de 15-24 ans.",
      "note": "Taux d'emploi des jeunes. Faible = difficultés d'insertion (études longues, chômage jeunes). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "eco_txemp_2554": {
      "rawObsvACT": "txemp_2554",
      "short": "Tx emploi 25-54",
      "medium": "Taux d’emploi des 25-54 ans",
      "long": "Taux d'emploi des 25-54 ans (âge actif)",
      "type": "tx",
      "unit": "%",
      "theme": "eco",
      "ordre": 27,
      "source": "INSEE RP",
      "formula": "(P22_ACT2554 - P22_CHOM2554) / (P22_POP2539 + P22_POP4054) × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "P22_ACT2554",
        "P22_CHOM2554",
        "P22_POP2539",
        "P22_POP4054"
      ],
      "volets": [],
      "priority": 2,
      "polarity": 1,
      "symbol": "",
      "definition": "Rapport entre le nombre d'actifs occupés de 25-54 ans et la population totale de 25-54 ans.",
      "note": "Taux d'emploi du cœur d'activité. Tranche la plus homogène, reflète la santé du marché du travail local. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "eco_txemp_5564": {
      "rawObsvACT": "txemp_5564",
      "short": "Tx emploi 55-64",
      "medium": "Taux d’emploi des 55-64 ans",
      "long": "Taux d'emploi des 55-64 ans (seniors)",
      "type": "tx",
      "unit": "%",
      "theme": "eco",
      "ordre": 28,
      "source": "INSEE RP",
      "formula": "(P22_ACT5564 - P22_CHOM5564) / P22_POP5564 × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "P22_ACT5564",
        "P22_CHOM5564",
        "P22_POP5564"
      ],
      "volets": [],
      "priority": 2,
      "polarity": 1,
      "symbol": "",
      "definition": "Rapport entre le nombre d'actifs occupés de 55-64 ans et la population totale de 55-64 ans.",
      "note": "Taux d'emploi des seniors. Enjeu majeur du maintien dans l'emploi en fin de carrière. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_eco_concentration": "--- Concentration emploi (attractivité) ---",
    "eco_ratio_emplt_actoc": {
      "rawObsvACT": "ice",
      "short": "Conc. emploi",
      "medium": "Indice de concentration de l’emploi",
      "long": "Indice de concentration de l'emploi (emplois/actifs occupés résidents ×100)",
      "type": "ind",
      "unit": "ind",
      "theme": "eco",
      "ordre": 29,
      "source": "INSEE RP",
      "formula": "P22_EMPLT / C22_ACTOCC1564 × 100",
      "note": "Indice de concentration de l’emploi : emplois / actifs résidents. Valeur > 1 = pôle d’emploi (attire des travailleurs extérieurs). Valeur < 1 = territoire résidentiel (résidents travaillent ailleurs). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_EMPLT",
        "C22_ACTOCC1564"
      ],
      "volets": ["exd", "exdc", "exde"],
      "eda": true,
      "priority": 2,
      "polarity": 1,
      "symbol": "",
      "definition": "Rapport entre nombre d’emplois sur le territoire et nombre d’actifs occupés résidents.",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "&comment_idx_synth": "--- 4 Indices Synthétiques v2 (z-score cappé ±3) ---",
    "idxresid_dyn_pct": {
      "rawObsvACT": "idx_resid_pct",
      "short": "◆ Attract. résid.%",
      "medium": "Attractivité résidentielle (percentile)",
      "long": "Indice attractivité résidentielle - méthode percentile",
      "type": "ind",
      "unit": "ind",
      "theme": "dmf",
      "ordre": 29.82,
      "source": "Calcul PTOD",
      "formula": "mean(pct_rank(composantes)) × 100",
      "periodes": [
        "11_16",
        "16_22"
      ],
      "srcVar": [
        "dm_sma_vtcam_1622",
        "dmf_tmi_cscadre_22",
        "dmf_tmi_a65p_22"
      ],
      "volets": [],
      "eda": false,
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "idxeco_dyn_ind": {
      "rawObsvACT": "idx_eco",
      "short": "◆ Attract. éco.",
      "medium": "Indice d’attractivité économique",
      "long": "Indice attractivité économique v2 (4 composantes dynamiques)",
      "type": "ind",
      "unit": "ind",
      "theme": "eco",
      "ordre": 29.83,
      "source": "Calcul PTOD",
      "formula": "50 + mean(z_cappé±3) × 15, borné [0-100]",
      "note": "4 composantes dynamiques : évol tx emploi 16-22, évol emploi privé URSSAF 19-24, évol établissements MM 19-24, évol part cadres 11-22. Score 50=moyenne.",
      "periodes": [
        "19_24"
      ],
      "srcVar": [
        "eco_txemp_1564_vdifp_1622",
        "eco_emppriv_vtcam_1924",
        "eco_etabpriv_vevol_1924",
        "dsp_csp_cadres_vdifp_1122"
      ],
      "volets": [],
      "eda": true,
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "idxeco_dyn_pct": {
      "rawObsvACT": "idx_eco_pct",
      "short": "◆ Attract. éco.%",
      "medium": "Attractivité économique (percentile)",
      "long": "Indice attractivité économique v2 - méthode percentile",
      "type": "ind",
      "unit": "ind",
      "theme": "eco",
      "ordre": 29.84,
      "source": "Calcul PTOD",
      "formula": "mean(pct_rank(composantes)) × 100",
      "periodes": [
        "19_24"
      ],
      "srcVar": [
        "eco_txemp_1564_vdifp_1622",
        "eco_emppriv_vtcam_1924",
        "eco_etabpriv_vevol_1924",
        "dsp_csp_cadres_vdifp_1122"
      ],
      "volets": [],
      "eda": false,
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "idxgentri_pct": {
      "rawObsvACT": "idx_gentri_pct",
      "short": "◆ Gentrific. %",
      "medium": "Gentrification (percentile)",
      "long": "Indice gentrification - méthode percentile",
      "type": "ind",
      "unit": "ind",
      "theme": "dsp",
      "ordre": 29.86,
      "source": "Calcul PTOD",
      "formula": "mean(pct_rank(composantes)) × 100",
      "periodes": [
        "11_22"
      ],
      "srcVar": [
        "dsp_csp_cadres_pct_22",
        "dsp_csp_cadres_vdifp_1122",
        "dmf_tmi_cscadre_22",
        "dmf_tmi_csouvrier_22",
        "rev_med_21",
        "rev_med_vevol_1921",
        "dmf_tr_pct_22"
      ],
      "srcVarOpt": [
        "logd_px2_mai_vevol_1924",
        "logd_px2_appt_vevol_1924"
      ],
      "volets": [],
      "eda": false,
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "idxlogtens_pct": {
      "rawObsvACT": "idx_logtens_pct",
      "short": "◆ Tension logt %",
      "medium": "Tension du logement (percentile)",
      "long": "Indice tension logement - méthode percentile",
      "type": "ind",
      "unit": "ind",
      "theme": "log",
      "ordre": 29.88,
      "source": "Calcul PTOD",
      "formula": "mean(pct_rank(composantes)) × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "log_vac_pct_22",
        "rev_med_21",
        "rev_txpauv_21",
        "log_ressec_pct_22"
      ],
      "volets": [],
      "eda": false,
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_eco_flores": "--- Entreprises et Établissements (FLORES) ---",
    "eco_emp_pres_pct": {
      "rawObsvACT": "pct_emp_pres",
      "short": "% Emploi présent.",
      "medium": "Part de l’emploi présentiel",
      "long": "Part des emplois de la sphère présentielle",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 30,
      "source": "INSEE FLORES",
      "formula": "ETPPRES23 / ETPTOT23 × 100",
      "periodes": [
        "23"
      ],
      "srcVar": [
        "ETPPRES23",
        "ETPTOT23"
      ],
      "volets": ["exd", "exdc", "exde"],
      "priority": 2,
      "polarity": 1,
      "symbol": "",
      "definition": "Part de l'emploi dans la sphère présentielle (services à la population locale : commerce, santé, éducation, services à la personne).",
      "note": "Sphère présentielle = emplois liés à la population résidente. Part élevée = économie tournée vers les besoins locaux. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_emp_npres_pct": {
      "rawObsvACT": "pct_emp_npres",
      "short": "% Emploi non-prés.",
      "medium": "Part de l’emploi non-présentiel",
      "long": "Part des emplois de la sphère productive (non-présentielle)",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 31,
      "source": "INSEE FLORES",
      "formula": "ETPNPRES23 / ETPTOT23 × 100",
      "periodes": [
        "23"
      ],
      "srcVar": [
        "ETPNPRES23",
        "ETPTOT23"
      ],
      "volets": [],
      "priority": 2,
      "polarity": 1,
      "symbol": "",
      "definition": "Part de l'emploi dans la sphère non-présentielle (industrie, services aux entreprises, activités exportatrices).",
      "note": "Sphère productive = emplois qui exportent hors du territoire. Part élevée = économie orientée production/export. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "eco_eff_petites_pct": {
      "rawObsvACT": "pct_eff_petites",
      "short": "% Petites entrep.",
      "medium": "Part des petites entreprises",
      "long": "Part des effectifs dans établissements de moins de 10 salariés",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 32,
      "source": "INSEE FLORES",
      "formula": "ETPTEF123 / ETPTOT23 × 100",
      "periodes": [
        "23"
      ],
      "srcVar": [
        "ETPTEF123",
        "ETPTOT23"
      ],
      "volets": "exde",
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part de l'emploi dans les petites entreprises (moins de 50 salariés).",
      "note": "Poids des petites entreprises. Part élevée = tissu économique granulaire, artisanat, commerce de proximité. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_eff_grandes_pct": {
      "rawObsvACT": "pct_eff_grandes",
      "short": "% Grandes entrep.",
      "medium": "Part des grandes entreprises",
      "long": "Part des effectifs dans établissements de 100ans+ salariés",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 33,
      "source": "INSEE FLORES",
      "formula": "ETPTEFCP23 / ETPTOT23 × 100",
      "periodes": [
        "23"
      ],
      "srcVar": [
        "ETPTEFCP23",
        "ETPTOT23"
      ],
      "volets": "exde",
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part de l'emploi dans les grandes entreprises (250 salariés et plus).",
      "note": "Poids des grandes entreprises. Part élevée = territoire structuré par de gros employeurs. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "&comment_eco_krugman": "--- Indice de spécialisation Krugman ---",
    "eco_krugman_a38": {
      "rawObsvACT": "krugman_a38",
      "short": "Krugman A38",
      "medium": "Indice de Krugman sectoriel (A38)",
      "long": "Indice de spécialisation de Krugman calculé sur 38 secteurs NAF. 0=structure identique à la France, 100=totalement spécialisé",
      "type": "ind",
      "unit": "indice 0-100",
      "theme": "eco",
      "ordre": 35,
      "source": "INSEE FLORES",
      "formula": "Σ|part_secteur_local - part_secteur_national| / 2 × 100",
      "periodes": [
        "23"
      ],
      "srcVar": [
        "EFF_SAL par secteur A38"
      ],
      "volets": ["exd", "exde"],
      "range": [
        12,
        75
      ],
      "interpretation": "12=très diversifié, 75=très spécialisé",
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "definition": "Somme des écarts absolus entre structure sectorielle locale (A38) et nationale. Mesure la dissimilarité économique.",
      "note": "Mesure à quel point la structure économique locale diffère du profil national. Valeur 0 = profil identique à la France. Plus la valeur est élevée, plus le territoire est spécialisé différemment. Calculé sur 38 secteurs. Valeur supérieure à {percentile}% des territoires (🇫🇷 0 par construction).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_krugman_a21": {
      "rawObsvACT": "krugman_a21",
      "short": "Krugman A21",
      "medium": "Indice de Krugman sectoriel (A21)",
      "long": "Indice de spécialisation de Krugman calculé sur 21 secteurs NAF agrégés",
      "type": "ind",
      "unit": "indice 0-100",
      "theme": "eco",
      "ordre": 36,
      "source": "INSEE FLORES",
      "formula": "Σ|part_secteur_local - part_secteur_national| / 2 × 100",
      "periodes": [
        "23"
      ],
      "srcVar": [
        "EFF_SAL par secteur A21"
      ],
      "volets": ["exd", "exde"],
      "range": [
        8,
        60
      ],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "definition": "Somme des écarts absolus entre structure sectorielle locale (A21) et nationale.",
      "note": "Dissimilarité de structure économique par rapport à la France. Valeur 0 = profil identique. Calculé sur 21 secteurs (plus agrégé que A38). Valeur supérieure à {percentile}% des territoires (🇫🇷 0 par construction).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "&comment_eco_gini": "--- Indice de concentration Gini ---",
    "eco_gini_a38": {
      "rawObsvACT": "gini_a38",
      "short": "Gini A38",
      "medium": "Indice de Gini sectoriel (A38)",
      "long": "Indice de concentration de Gini calculé sur 38 secteurs NAF. 0=emplois répartis uniformément, 1=emplois concentrés dans un seul secteur",
      "type": "ind",
      "unit": "indice 0-1",
      "theme": "eco",
      "ordre": 38,
      "source": "INSEE FLORES",
      "formula": "Gini sur parts sectorielles",
      "periodes": [
        "23"
      ],
      "srcVar": [
        "EFF_SAL par secteur A38"
      ],
      "volets": ["exd", "exde"],
      "range": [
        0.5,
        0.85
      ],
      "interpretation": "0.5=diversifié, 0.85=très concentré",
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "definition": "Indice de Gini de concentration sectorielle de l’emploi (A38). 0 = répartition égale, 1 = concentration totale.",
      "note": "Mesure la concentration de l’emploi entre 38 secteurs. Valeur 0 = emploi également réparti. Proche de 1 = emploi concentré dans très peu de secteurs. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_gini_a21": {
      "rawObsvACT": "gini_a21",
      "short": "Gini A21",
      "medium": "Indice de Gini sectoriel (A21)",
      "long": "Indice de concentration de Gini calculé sur 21 secteurs NAF agrégés",
      "type": "ind",
      "unit": "indice 0-1",
      "theme": "eco",
      "ordre": 39,
      "source": "INSEE FLORES",
      "formula": "Gini sur parts sectorielles",
      "periodes": [
        "23"
      ],
      "srcVar": [
        "EFF_SAL par secteur A21"
      ],
      "volets": "exde",
      "range": [
        0.4,
        0.75
      ],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "definition": "Indice de Gini de concentration sectorielle de l’emploi (A21). Version agrégée.",
      "note": "Concentration de l’emploi sur 21 secteurs. 0 = répartition égale, 1 = concentration totale. Complémentaire du Krugman (Gini = concentration absolue, Krugman = écart à la France). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_krugman_a5": {
      "rawObsvACT": "krugman_a5",
      "short": "Krugman A5",
      "medium": "Indice de Krugman sectoriel (A5)",
      "long": "Indice de spécialisation de Krugman calculé sur 5 secteurs RP (AGRI, INDUS, CONST, CTS, APESAS). Même formule que A38/A21.",
      "type": "ind",
      "unit": "indice 0-200",
      "theme": "eco",
      "ordre": 37,
      "source": "INSEE RP",
      "formula": "Σ|%sect_local - %sect_FR| (cohérent A38/A21)",
      "periodes": [
        "11",
        "16",
        "22"
      ],
      "srcVar": [
        "C22_EMPLT_AGRI",
        "C22_EMPLT_INDUS",
        "C22_EMPLT_CONST",
        "C22_EMPLT_CTS",
        "C22_EMPLT_APESAS",
        "C22_EMPLT"
      ],
      "volets": ["exd", "exdc", "exde"],
      "range": [
        5,
        60
      ],
      "interpretation": "0=identique France, plus élevé=plus spécialisé. A5 moins granulaire que A38/A21.",
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "definition": "Somme des écarts absolus entre structure sectorielle locale (A5) et nationale. Version très agrégée.",
      "note": "Dissimilarité sur 5 grands secteurs (agriculture, industrie, construction, commerce/services, administration). Valeur 0 = même répartition que la France. Exemple : 0.15 = 15 points d’écart cumulés. Valeur supérieure à {percentile}% des territoires (🇫🇷 0 par construction).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "eco_krugman_a5_vevol": {
      "rawObsvACT": "krugman_a5_vevol",
      "short": "△ Krugman A5",
      "medium": "△ Évolution de l’indice de Krugman (A5)",
      "long": "Évolution de l'indice Krugman A5 entre 2011 et 2022 en points",
      "type": "vevol",
      "unit": "pts",
      "theme": "eco",
      "ordre": 38,
      "source": "INSEE RP",
      "formula": "eco_krugman_a5_22 - eco_krugman_a5_11",
      "periodes": [
        "11_22"
      ],
      "srcVar": [
        "eco_krugman_a5_11",
        "eco_krugman_a5_22"
      ],
      "volets": ["exd", "exde"],
      "interpretation": ">0 = spécialisation accrue, <0 = diversification",
      "priority": 3,
      "polarity": 0,
      "symbol": "△",
      "definition": "Évolution de l’indice de Krugman A5 entre deux dates.",
      "note": "Variation du Krugman A5. Positif = le territoire se différencie davantage du profil national. Négatif = convergence vers la moyenne. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_eco_urssaf": "--- Emploi privé URSSAF (TCAM 2014-2024) ---",
    "eco_emppriv_vtcam": {
      "rawObsvACT": "emppriv_vtcam",
      "short": "△ Emploi privé",
      "medium": "△ Évolution de l’emploi salarié privé",
      "long": "Taux de croissance annuel moyen de l'emploi salarié privé (source URSSAF-ACOSS)",
      "type": "vtcam",
      "unit": "%/an",
      "theme": "eco",
      "ordre": 39,
      "source": "URSSAF-ACOSS",
      "formula": "((eff_fin / eff_debut)^(1/n) - 1) × 100",
      "periodes": [
        "11_17",
        "17_24",
        "19_24",
        "22_24"
      ],
      "srcVar": [
        "URSSAF EFF_SAL"
      ],
      "volets": [],
      "interpretation": ">0 = création emploi, <0 = destruction emploi",
      "priority": 2,
      "polarity": 1,
      "symbol": "△",
      "definition": "Taux de croissance annuel moyen de l'emploi salarié privé (source URSSAF, données trimestrielles).",
      "note": "Dynamique de l'emploi privé, plus réactif que l'emploi total (RP). Source URSSAF, fréquence trimestrielle. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_etabpriv_vevol": {
      "rawObsvACT": "etabpriv_vevol",
      "short": "△ Étab. privés",
      "medium": "△ Évolution des établissements privés",
      "long": "Évolution du nombre d'établissements privés entre 2019-2024 (moyenne mobile 3 ans)",
      "type": "vevol",
      "unit": "%",
      "theme": "eco",
      "ordre": 39.5,
      "source": "URSSAF-ACOSS",
      "formula": "((MM(2022-2024) - MM(2018-2020)) / MM(2018-2020)) × 100",
      "periodes": [
        "19_24"
      ],
      "srcVar": [
        "URSSAF NB_ETAB"
      ],
      "volets": [],
      "interpretation": ">0 = création établissements, <0 = fermetures nettes",
      "priority": 2,
      "polarity": 1,
      "symbol": "△",
      "definition": "Évolution du nombre d'établissements privés sur la période (source URSSAF).",
      "note": "Dynamique du tissu d'entreprises. Positif = créations nettes d'établissements. Indicateur complémentaire de l'emploi. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "eco_entrcrea_tot_vevol": {
      "rawObsvACT": "entrcrea_tot_vevol",
      "short": "△ Créations tot.",
      "medium": "△ Évolution des créations d’entreprises",
      "long": "Évolution des créations d'entreprises toutes formes juridiques (moyenne mobile 2018-2020 vs 2022-2024)",
      "type": "vevol",
      "unit": "%",
      "theme": "eco",
      "ordre": 39.6,
      "source": "INSEE SIDE",
      "formula": "((MM(2022-2024) - MM(2018-2020)) / MM(2018-2020)) × 100",
      "periodes": [
        "19_24"
      ],
      "srcVar": [
        "SIDE créations entreprises"
      ],
      "volets": [],
      "interpretation": ">0 = dynamique entrepreneuriale, inclut EI et auto-entrepreneurs",
      "priority": 2,
      "polarity": 1,
      "symbol": "△",
      "definition": "Évolution du nombre total de créations d'entreprises (y compris micro-entreprises).",
      "note": "Dynamique entrepreneuriale globale. Inclut les micro-entreprises qui représentent la majorité des créations. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_entrcrea_soc_vevol": {
      "rawObsvACT": "entrcrea_soc_vevol",
      "short": "△ Créations soc.",
      "medium": "△ Évolution des créations de sociétés",
      "long": "Évolution des créations de sociétés hors EI/auto-entrepreneurs (moyenne mobile 2018-2020 vs 2022-2024)",
      "type": "vevol",
      "unit": "%",
      "theme": "eco",
      "ordre": 39.7,
      "source": "INSEE SIDE",
      "formula": "((MM(2022-2024) - MM(2018-2020)) / MM(2018-2020)) × 100",
      "periodes": [
        "19_24"
      ],
      "srcVar": [
        "SIDE créations sociétés (SARL, SAS, autres)"
      ],
      "volets": [],
      "interpretation": ">0 = création structures solides, hors micro/auto-entreprises",
      "priority": 2,
      "polarity": 1,
      "symbol": "△",
      "definition": "Évolution du nombre de créations de sociétés (hors micro-entreprises).",
      "note": "Créations de sociétés uniquement (SA, SAS, SARL). Indicateur plus robuste que les créations totales car exclut les micro-entreprises. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "&comment_eco_secteurs": "--- Part emplois par secteur (RP 11/16/22) ---",
    "eco_sectagri_pct": {
      "rawObsvACT": "pct_sect_agri",
      "short": "% Agriculture",
      "medium": "Part de l’agriculture dans l’emploi",
      "long": "Part des emplois au lieu de travail dans l'agriculture",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 40,
      "source": "INSEE RP",
      "formula": "C22_EMPLT_AGRI / C22_EMPLT × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_EMPLT_AGRI",
        "C22_EMPLT"
      ],
      "volets": "exde",
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part de l'agriculture dans l'emploi total au lieu de travail.",
      "note": "Poids de l'agriculture. Part élevée en zones rurales et viticoles. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_sectindus_pct": {
      "rawObsvACT": "pct_sect_indus",
      "short": "% Industrie",
      "medium": "Part de l’industrie dans l’emploi",
      "long": "Part des emplois au lieu de travail dans l'industrie",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 41,
      "source": "INSEE RP",
      "formula": "C22_EMPLT_INDUS / C22_EMPLT × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_EMPLT_INDUS",
        "C22_EMPLT"
      ],
      "volets": ["exd", "exde"],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part de l'industrie dans l'emploi total au lieu de travail.",
      "note": "Poids industriel. Territoires à tradition manufacturière. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_sectconst_pct": {
      "rawObsvACT": "pct_sect_const",
      "short": "% Construction",
      "medium": "Part de la construction dans l’emploi",
      "long": "Part des emplois au lieu de travail dans la construction",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 42,
      "source": "INSEE RP",
      "formula": "C22_EMPLT_CONST / C22_EMPLT × 100",
      "periodes": [
        "11",
        "16",
        "22"
      ],
      "srcVar": [
        "C22_EMPLT_CONST",
        "C22_EMPLT"
      ],
      "volets": "exde",
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part de la construction (BTP) dans l'emploi total au lieu de travail.",
      "note": "Poids du BTP. Part élevée en zones de croissance démographique ou touristiques. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_sectservi_pct": {
      "rawObsvACT": "pct_sect_servi",
      "short": "% Commerce/Serv.",
      "medium": "Part du commerce et services",
      "long": "Part des emplois au lieu de travail dans le commerce, transports et services divers",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 43,
      "source": "INSEE RP",
      "formula": "C22_EMPLT_CTS / C22_EMPLT × 100",
      "periodes": [
        "11",
        "16",
        "22"
      ],
      "srcVar": [
        "C22_EMPLT_CTS",
        "C22_EMPLT"
      ],
      "volets": ["exd", "exde"],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part du commerce et des services marchands dans l'emploi total au lieu de travail.",
      "note": "Poids du tertiaire marchand. Dominant en zone urbaine et touristique. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_sectadmin_pct": {
      "rawObsvACT": "pct_sect_admin",
      "short": "% Admin/Santé",
      "medium": "Part de l’administration et santé",
      "long": "Part des emplois au lieu de travail dans l'administration, enseignement, santé et action sociale",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 44,
      "source": "INSEE RP",
      "formula": "C22_EMPLT_APESAS / C22_EMPLT × 100",
      "periodes": [
        "11",
        "16",
        "22"
      ],
      "srcVar": [
        "C22_EMPLT_APESAS",
        "C22_EMPLT"
      ],
      "volets": ["exd", "exde"],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part de l'administration publique, enseignement, santé et action sociale dans l'emploi total.",
      "note": "Poids du secteur public et parapublic. Part élevée dans les préfectures, CHU, villes universitaires. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "&comment_eco_tp": "--- Temps partiel salariés (RP 11/16/22) ---",
    "eco_emptpspart_pct": {
      "rawObsvACT": "pct_tpspart",
      "short": "% Temps partiel",
      "medium": "Part du temps partiel dans l’emploi",
      "long": "Part des salariés au lieu de travail à temps partiel",
      "type": "pct",
      "unit": "%",
      "theme": "eco",
      "ordre": 50,
      "source": "INSEE RP",
      "formula": "P{y}_EMPLT_SALTP / P{y}_EMPLT_SAL × 100",
      "periodes": [
        "11",
        "16",
        "22"
      ],
      "srcVar": [
        "P{y}_EMPLT_SALTP",
        "P{y}_EMPLT_SAL"
      ],
      "volets": [],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des emplois à temps partiel dans l'emploi total.",
      "note": "Temps partiel souvent subi. Part élevée peut signaler une précarité de l'emploi ou un tissu tertiaire (commerce, services). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "eco_emptpspart_vdifp": {
      "rawObsvACT": "vdifp_tpspart",
      "short": "▲ Temps partiel",
      "medium": "▲ Variation de la part du temps partiel",
      "long": "Évolution de la part des salariés à temps partiel en points de %",
      "type": "vdifp",
      "unit": "pts",
      "theme": "eco",
      "ordre": 51,
      "source": "INSEE RP",
      "formula": "eco_emptpspart_pct_22 - eco_emptpspart_pct_11",
      "periodes": [
        "11_22"
      ],
      "srcVar": [
        "eco_emptpspart_pct_22",
        "eco_emptpspart_pct_11"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "▲",
      "agg_dash": false,
      "agg_ecodash": true,
      "agg_logdash": false
    },
    "&comment_soc": "══════════ SOCIAL (soc) ══════════",
    "&comment_soc_chom": "--- Chômage par âge ---",
    "soc_txchom_1564": {
      "rawObsvACT": "txchom_1564",
      "short": "Tx chômage 15-64",
      "medium": "Taux de chômage des 15-64 ans",
      "long": "Taux de chômage des 15-64 ans",
      "type": "tx",
      "unit": "%",
      "theme": "soc",
      "ordre": 1,
      "source": "INSEE RP",
      "formula": "P22_CHOM1564 / C22_ACT1564 × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_CHOM1564",
        "C22_ACT1564"
      ],
      "volets": ["exd", "exde"],
      "priority": 1,
      "polarity": -1,
      "symbol": "",
      "definition": "Part des actifs de 15-64 ans sans emploi et en recherche active d’emploi (définition déclarative, recensement).",
      "note": "Taux de chômage au sens du recensement. Définition légèrement différente du BIT (déclaratif). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "soc_txchom_1524": {
      "rawObsvACT": "txchom_1524",
      "short": "Tx chôm. 15-24",
      "medium": "Taux de chômage des 15-24 ans",
      "long": "Taux de chômage des jeunes (15-24 ans)",
      "type": "tx",
      "unit": "%",
      "theme": "soc",
      "ordre": 2,
      "source": "INSEE RP",
      "formula": "P22_CHOM1524 / P22_ACT1524 × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "P22_CHOM1524",
        "P22_ACT1524"
      ],
      "volets": [],
      "priority": 2,
      "polarity": -1,
      "symbol": "",
      "definition": "Part des actifs de 15-24 ans sans emploi et en recherche active d'emploi.",
      "note": "Chômage des jeunes, structurellement plus élevé que la moyenne. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "soc_txchom_2554": {
      "rawObsvACT": "txchom_2554",
      "short": "Tx chôm. 25-54",
      "medium": "Taux de chômage des 25-54 ans",
      "long": "Taux de chômage des 25-54 ans (âge actif)",
      "type": "tx",
      "unit": "%",
      "theme": "soc",
      "ordre": 3,
      "source": "INSEE RP",
      "formula": "P22_CHOM2554 / P22_ACT2554 × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "P22_CHOM2554",
        "P22_ACT2554"
      ],
      "volets": [],
      "priority": 2,
      "polarity": -1,
      "symbol": "",
      "definition": "Part des actifs de 25-54 ans sans emploi et en recherche active d'emploi.",
      "note": "Chômage du cœur d'activité. Indicateur le plus représentatif de la santé du marché du travail. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "soc_txchom_5564": {
      "rawObsvACT": "txchom_5564",
      "short": "Tx chôm. 55-64",
      "medium": "Taux de chômage des 55-64 ans",
      "long": "Taux de chômage des seniors (55-64 ans)",
      "type": "tx",
      "unit": "%",
      "theme": "soc",
      "ordre": 4,
      "source": "INSEE RP",
      "formula": "P22_CHOM5564 / P22_ACT5564 × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "P22_CHOM5564",
        "P22_ACT5564"
      ],
      "volets": [],
      "priority": 2,
      "polarity": -1,
      "symbol": "",
      "definition": "Part des actifs de 55-64 ans sans emploi et en recherche active d'emploi.",
      "note": "Chômage des seniors, souvent de longue durée. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_soc_pauv": "--- Pauvreté (Filosofi) ---",
    "soc_txpauv_3039": {
      "rawObsvACT": "txpauv_3039",
      "short": "Tx pauv. 30-39",
      "medium": "Taux de pauvreté des 30-39 ans",
      "long": "Taux de pauvreté des 30-39 ans (seuil 60%)",
      "type": "tx",
      "unit": "%",
      "theme": "soc",
      "ordre": 10,
      "source": "INSEE Filosofi",
      "formula": "TP60AGE221",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "TP60AGE221"
      ],
      "volets": [],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "soc_txpauv_loc": {
      "rawObsvACT": "txpauv_loc",
      "short": "Tx pauv. locataires",
      "medium": "Taux de pauvreté des locataires",
      "long": "Taux de pauvreté des locataires (seuil 60%)",
      "type": "tx",
      "unit": "%",
      "theme": "soc",
      "ordre": 11,
      "source": "INSEE Filosofi",
      "formula": "TP60TOL221",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "TP60TOL221"
      ],
      "volets": [],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_dsp": "══════════ DIPLÔMES / CSP (dsp) ══════════",
    "&comment_dsp_csp": "--- CSP Population 15+ ---",
    "dsp_csp_agri_pct": {
      "rawObsvACT": "pct_csp_agri",
      "short": "% Agriculteurs",
      "medium": "Part des agriculteurs exploitants",
      "long": "Part des agriculteurs exploitants dans la population 15ans+",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 1,
      "source": "INSEE RP",
      "formula": "C22_POP15P_STAT_GSEC11_21 / C22_POP15P × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "C22_POP15P_STAT_GSEC11_21",
        "C22_POP15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_csp_artcom_pct": {
      "rawObsvACT": "pct_csp_artcom",
      "short": "% Artisans-comm.",
      "medium": "Part des artisans-commerçants",
      "long": "Part des artisans, commerçants, chefs d'entreprise dans la population 15ans+",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 2,
      "source": "INSEE RP",
      "formula": "C22_POP15P_STAT_GSEC12_22 / C22_POP15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_POP15P_STAT_GSEC12_22",
        "C22_POP15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_csp_cadres_pct": {
      "rawObsvACT": "pct_csp_cadres",
      "short": "% Cadres",
      "medium": "Part des cadres et prof. intellectuelles",
      "long": "Part des cadres et professions intellectuelles sup. dans la population 15ans+",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 3,
      "source": "INSEE RP",
      "formula": "C22_POP15P_STAT_GSEC13_23 / C22_POP15P × 100 (GSEC 22, CS 11/16)",
      "periodes": [
        "11",
        "16",
        "22"
      ],
      "srcVar": [
        "C22_POP15P_STAT_GSEC13_23",
        "C16_POP15P_CS3",
        "C11_POP15P_CS3",
        "C22_POP15P",
        "C16_POP15P",
        "C11_POP15P"
      ],
      "volets": [],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des cadres et professions intellectuelles supérieures dans la population de 15 ans et plus.",
      "note": "Marqueur de capital humain. Part élevée = territoire à profil métropolitain ou tertiaire supérieur. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_csp_cadres_vdifp": {
      "rawObsvACT": "evol_csp_cadres",
      "short": "▲ Cadres",
      "medium": "▲ Variation de la part des cadres",
      "long": "Évolution de la part des cadres en points de % (positif = progression)",
      "type": "vdifp",
      "unit": "pts",
      "theme": "dsp",
      "ordre": 3.1,
      "source": "INSEE RP",
      "formula": "dsp_csp_cadres_pct_22 - dsp_csp_cadres_pct_11",
      "periodes": [
        "1122"
      ],
      "srcVar": [
        "dsp_csp_cadres_pct_22",
        "dsp_csp_cadres_pct_11"
      ],
      "volets": "exd",
      "priority": 3,
      "polarity": 0,
      "symbol": "▲",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_csp_profint_pct": {
      "rawObsvACT": "pct_csp_profint",
      "short": "% Prof. interm.",
      "medium": "Part des professions intermédiaires",
      "long": "Part des professions intermédiaires dans la population 15ans+",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 4,
      "source": "INSEE RP",
      "formula": "C22_POP15P_STAT_GSEC14_24 / C22_POP15P × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "C22_POP15P_STAT_GSEC14_24",
        "C22_POP15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_csp_employes_pct": {
      "rawObsvACT": "pct_csp_employes",
      "short": "% Employés",
      "medium": "Part des employés",
      "long": "Part des employés dans la population 15ans+",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 5,
      "source": "INSEE RP",
      "formula": "C22_POP15P_STAT_GSEC15_25 / C22_POP15P × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "C22_POP15P_STAT_GSEC15_25",
        "C22_POP15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_csp_ouvriers_pct": {
      "rawObsvACT": "pct_csp_ouvriers",
      "short": "% Ouvriers",
      "medium": "Part des ouvriers",
      "long": "Part des ouvriers dans la population 15ans+",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 6,
      "source": "INSEE RP",
      "formula": "C22_POP15P_STAT_GSEC16_26 / C22_POP15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_POP15P_STAT_GSEC16_26",
        "C22_POP15P"
      ],
      "volets": [],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des ouvriers dans la population de 15 ans et plus.",
      "note": "Marqueur de tissu industriel ou productif. Part élevée = économie à dominante industrielle ou BTP. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_csp_retraites_pct": {
      "rawObsvACT": "pct_csp_retraites",
      "short": "% Retraités",
      "medium": "Part des retraités",
      "long": "Part des retraités dans la population 15ans+",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 7,
      "source": "INSEE RP",
      "formula": "C22_POP15P_STAT_GSEC32 / C22_POP15P × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "C22_POP15P_STAT_GSEC32",
        "C22_POP15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_csp_inactifs_pct": {
      "rawObsvACT": "pct_csp_inactifs",
      "short": "% Inactifs",
      "medium": "Part des autres inactifs",
      "long": "Part des autres sans activité professionnelle dans la population 15ans+",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 8,
      "source": "INSEE RP",
      "formula": "C22_POP15P_STAT_GSEC40 / C22_POP15P × 100",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "C22_POP15P_STAT_GSEC40",
        "C22_POP15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_dsp_dipl": "--- Diplômes 15+ non scolarisés ---",
    "dsp_dipl_aucun_pct": {
      "rawObsvACT": "pct_dipl_aucun",
      "short": "% Sans diplôme",
      "medium": "Part sans diplôme",
      "long": "Part des 15ans+ non scolarisés sans diplôme ou CEP",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 10,
      "source": "INSEE RP",
      "formula": "P22_NSCOL15P_DIPLMIN / P22_NSCOL15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_NSCOL15P_DIPLMIN",
        "P22_NSCOL15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_dipl_bepc_pct": {
      "rawObsvACT": "pct_dipl_bepc",
      "short": "% BEPC/Brevet",
      "medium": "Part BEPC-Brevet",
      "long": "Part des 15ans+ non scolarisés avec BEPC, brevet, DNB",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 11,
      "source": "INSEE RP",
      "formula": "P22_NSCOL15P_BEPC / P22_NSCOL15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_NSCOL15P_BEPC",
        "P22_NSCOL15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_dipl_capbep_pct": {
      "rawObsvACT": "pct_dipl_capbep",
      "short": "% CAP/BEP",
      "medium": "Part CAP-BEP",
      "long": "Part des 15ans+ non scolarisés avec CAP, BEP ou équivalent",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 12,
      "source": "INSEE RP",
      "formula": "P22_NSCOL15P_CAPBEP / P22_NSCOL15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_NSCOL15P_CAPBEP",
        "P22_NSCOL15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_dipl_bac_pct": {
      "rawObsvACT": "pct_dipl_bac",
      "short": "% Bac",
      "medium": "Part Baccalauréat",
      "long": "Part des 15ans+ non scolarisés avec baccalauréat général ou techno",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 13,
      "source": "INSEE RP",
      "formula": "P22_NSCOL15P_BAC / P22_NSCOL15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_NSCOL15P_BAC",
        "P22_NSCOL15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_dipl_bac2_pct": {
      "rawObsvACT": "pct_dipl_bac2",
      "short": "% Bac+2",
      "medium": "Part Bac+2",
      "long": "Part des 15ans+ non scolarisés avec diplôme bac+2 (BTS, DUT, DEUG)",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 14,
      "source": "INSEE RP",
      "formula": "P22_NSCOL15P_SUP2 / P22_NSCOL15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_NSCOL15P_SUP2",
        "P22_NSCOL15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_dipl_bac34_pct": {
      "rawObsvACT": "pct_dipl_bac34",
      "short": "% Bac+3/4",
      "medium": "Part Bac+3/4",
      "long": "Part des 15ans+ non scolarisés avec licence ou maîtrise",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 15,
      "source": "INSEE RP",
      "formula": "P22_NSCOL15P_SUP34 / P22_NSCOL15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_NSCOL15P_SUP34",
        "P22_NSCOL15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_dipl_bac5p_pct": {
      "rawObsvACT": "pct_dipl_bac5p",
      "short": "% Bac+5+",
      "medium": "Part Bac+5 et plus",
      "long": "Part des 15ans+ non scolarisés avec master, doctorat, grande école",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 16,
      "source": "INSEE RP",
      "formula": "P22_NSCOL15P_SUP5 / P22_NSCOL15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_NSCOL15P_SUP5",
        "P22_NSCOL15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_dsp_dipl_grp": "--- Diplômes groupés ---",
    "dsp_dipl_infbac_pct": {
      "rawObsvACT": "pct_dipl_infbac",
      "short": "% Inférieur bac",
      "medium": "Part des non-diplômés (inférieur bac)",
      "long": "Part des 15ans+ non scolarisés avec niveau inférieur au bac",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 20,
      "source": "INSEE RP",
      "formula": "(DIPLMIN + BEPC + CAPBEP) / NSCOL15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_NSCOL15P_DIPLMIN",
        "P22_NSCOL15P_BEPC",
        "P22_NSCOL15P_CAPBEP",
        "P22_NSCOL15P"
      ],
      "volets": [],
      "priority": 2,
      "polarity": -1,
      "symbol": "",
      "definition": "Part de la population de 15 ans et plus non diplômée ou avec un diplôme inférieur au baccalauréat.",
      "note": "Part des personnes sans diplôme ou avec un niveau inférieur au bac. Part élevée = fragilité en termes d'insertion professionnelle. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_dipl_bacbac2_pct": {
      "rawObsvACT": "pct_dipl_bacbac2",
      "short": "% Bac à bac+2",
      "medium": "Part Bac à bac+2",
      "long": "Part des 15ans+ non scolarisés avec bac, bac+1 ou bac+2",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 21,
      "source": "INSEE RP",
      "formula": "(BAC + SUP2) / NSCOL15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_NSCOL15P_BAC",
        "P22_NSCOL15P_SUP2",
        "P22_NSCOL15P"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_dipl_supbac2_pct": {
      "rawObsvACT": "pct_dipl_supbac2",
      "short": "% Diplômés sup",
      "medium": "Part des diplômés du supérieur",
      "long": "Part des 15ans+ non scolarisés avec diplôme supérieur à bac+2",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 22,
      "source": "INSEE RP",
      "formula": "(SUP34 + SUP5) / NSCOL15P × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_NSCOL15P_SUP34",
        "P22_NSCOL15P_SUP5",
        "P22_NSCOL15P"
      ],
      "volets": [],
      "priority": 2,
      "polarity": 1,
      "symbol": "",
      "definition": "Part de la population de 15 ans et plus diplômée du supérieur (bac+2 et au-delà).",
      "note": "Indicateur de capital humain territorial. Part élevée = territoire attractif pour les emplois qualifiés. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_men": "══════════ MÉNAGES (men) ══════════",
    "men_tot_stock": {
      "rawObsvACT": "menages",
      "short": "Nb ménages",
      "medium": "Nombre de ménages",
      "long": "Nombre total de ménages",
      "type": "stock",
      "unit": "ménages",
      "theme": "men",
      "ordre": 1,
      "source": "INSEE RP",
      "formula": "C22_MEN",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "srcVar": [
        "C22_MEN"
      ],
      "volets": [],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Nombre total de ménages (unités de vie) sur le territoire.",
      "note": "Stock de ménages. Croît plus vite que la population (décohabitation, vieillissement). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "men_seul_pct": {
      "rawObsvACT": "pct_men_seul",
      "short": "% Pers. seules",
      "medium": "Part des personnes seules",
      "long": "Part des ménages d'une personne seule",
      "type": "pct",
      "unit": "%",
      "theme": "men",
      "ordre": 2,
      "source": "INSEE RP",
      "formula": "C22_MENPSEUL / C22_MEN × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_MENPSEUL",
        "C22_MEN"
      ],
      "volets": [],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "men_fam_pct": {
      "rawObsvACT": "pct_men_fam",
      "short": "% Familles",
      "medium": "Part des ménages familles",
      "long": "Part des ménages composés de familles",
      "type": "pct",
      "unit": "%",
      "theme": "men",
      "ordre": 3,
      "source": "INSEE RP",
      "formula": "C22_MENFAM / C22_MEN × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_MENFAM",
        "C22_MEN"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "men_coupsenf_pct": {
      "rawObsvACT": "pct_men_coupsenf",
      "short": "% Couples s/enf.",
      "medium": "Part des couples sans enfant",
      "long": "Part des ménages couple sans enfant",
      "type": "pct",
      "unit": "%",
      "theme": "men",
      "ordre": 4,
      "source": "INSEE RP",
      "formula": "C22_MENCOUPSENF / C22_MEN × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_MENCOUPSENF",
        "C22_MEN"
      ],
      "volets": ["exd", "exdc"],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "men_coupaenf_pct": {
      "rawObsvACT": "pct_men_coupaenf",
      "short": "% Couples av/enf.",
      "medium": "Part des couples avec enfants",
      "long": "Part des ménages couple avec enfant(s)",
      "type": "pct",
      "unit": "%",
      "theme": "men",
      "ordre": 5,
      "source": "INSEE RP",
      "formula": "C22_MENCOUPAENF / C22_MEN × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_MENCOUPAENF",
        "C22_MEN"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "men_mono_pct": {
      "rawObsvACT": "pct_men_mono",
      "short": "% Fam. monop.",
      "medium": "Part des familles monoparentales",
      "long": "Part des ménages familles monoparentales",
      "type": "pct",
      "unit": "%",
      "theme": "men",
      "ordre": 6,
      "source": "INSEE RP",
      "formula": "C22_MENFAMMONO / C22_MEN × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "C22_MENFAMMONO",
        "C22_MEN"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_log": "══════════ LOGEMENT (log) ══════════",
    "log_tot_vtcam": {
      "rawObsvACT": "tcam_log",
      "short": "△ Logements",
      "medium": "△ Évolution du parc de logements",
      "long": "Taux de croissance annuel moyen du parc de logements",
      "type": "vtcam",
      "unit": "%/an",
      "theme": "log",
      "ordre": 1,
      "source": "INSEE RP",
      "formula": "((LOG_fin / LOG_debut)^(1/n) - 1) × 100",
      "periodes": [
        "11_16",
        "16_22",
        "11_22"
      ],
      "srcVar": [
        "P11_LOG",
        "P16_LOG",
        "P22_LOG"
      ],
      "volets": ["exd", "exdc"],
      "priority": 2,
      "polarity": 1,
      "symbol": "△",
      "definition": "Taux de croissance annuel moyen du parc total de logements sur la période.",
      "note": "Dynamique de construction. Positif = le parc s'agrandit. Négatif extrêmement rare. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "log_vac_pct": {
      "rawObsvACT": "pct_logvac",
      "short": "Tx vacance",
      "medium": "Taux de vacance des logements",
      "long": "Part des logements vacants dans le parc total",
      "type": "pct",
      "unit": "%",
      "theme": "log",
      "ordre": 2,
      "source": "INSEE RP",
      "formula": "LOGVAC / LOG × 100",
      "periodes": [
        "11",
        "16",
        "22"
      ],
      "srcVar": [
        "P22_LOGVAC",
        "P22_LOG"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 1,
      "polarity": -1,
      "symbol": "",
      "definition": "Part des logements vacants (ni occupés, ni résidences secondaires) dans le parc total de logements.",
      "note": "Taux de vacance : proportion de logements inoccupés. Un taux élevé peut signaler un marché détendu ou un parc dégradé. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "log_vac_vdifp": {
      "rawObsvACT": "var_logvac",
      "short": "▲ Vacance",
      "medium": "▲ Variation du taux de vacance",
      "long": "Variation de la part de logements vacants",
      "type": "vdifp",
      "unit": "pts",
      "theme": "log",
      "ordre": 3,
      "source": "INSEE RP",
      "formula": "pct_vac_fin - pct_vac_debut",
      "periodes": [
        "11_16",
        "16_22",
        "11_22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": -1,
      "symbol": "▲",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "log_ressec_pct": {
      "rawObsvACT": "pct_rsecocc",
      "short": "% Rés. second.",
      "medium": "Part des résidences secondaires",
      "long": "Part des résidences secondaires et logements occasionnels",
      "type": "pct",
      "unit": "%",
      "theme": "log",
      "ordre": 4,
      "source": "INSEE RP",
      "formula": "RSECOCC / LOG × 100",
      "periodes": [
        "11",
        "16",
        "22"
      ],
      "srcVar": [
        "P22_RSECOCC",
        "P22_LOG"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des résidences secondaires dans le parc de logements total.",
      "note": "Part élevée = territoire touristique ou de villégiature (littoral, montagne). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "log_ressec_vdifp": {
      "rawObsvACT": "var_rsecocc",
      "short": "▲ Rés. second.",
      "medium": "▲ Variation des résidences secondaires",
      "long": "Variation de la part de résidences secondaires",
      "type": "vdifp",
      "unit": "pts",
      "theme": "log",
      "ordre": 5,
      "source": "INSEE RP",
      "formula": "pct_ressec_fin - pct_ressec_debut",
      "periodes": [
        "11_16",
        "16_22",
        "11_22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "▲",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_log_type": "--- Type de logement ---",
    "log_appart_pct": {
      "rawObsvACT": "pct_appart",
      "short": "% Appartements",
      "medium": "Part des appartements",
      "long": "Part des logements de type appartement",
      "type": "pct",
      "unit": "%",
      "theme": "log",
      "ordre": 10,
      "source": "INSEE RP",
      "formula": "P22_APPART / P22_LOG × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_APPART",
        "P22_LOG"
      ],
      "volets": [],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des appartements dans le parc de logements.",
      "note": "Dominante appartements = densité urbaine. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "log_maison_pct": {
      "rawObsvACT": "pct_maison",
      "short": "% Maisons",
      "medium": "Part des maisons",
      "long": "Part des logements de type maison",
      "type": "pct",
      "unit": "%",
      "theme": "log",
      "ordre": 11,
      "source": "INSEE RP",
      "formula": "P22_MAISON / P22_LOG × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_MAISON",
        "P22_LOG"
      ],
      "volets": [],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des maisons individuelles dans le parc de logements.",
      "note": "Dominante maisons = tissu résidentiel diffus (périurbain, rural). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_log_occ": "--- Occupation des RP ---",
    "log_prop_pct": {
      "rawObsvACT": "pct_prop",
      "short": "% Propriétaires",
      "medium": "Part des propriétaires",
      "long": "Part des résidences principales occupées par propriétaires",
      "type": "pct",
      "unit": "%",
      "theme": "log",
      "ordre": 15,
      "source": "INSEE RP",
      "formula": "P22_RP_PROP / P22_RP × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_RP_PROP",
        "P22_RP"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des ménages propriétaires de leur résidence principale.",
      "note": "Taux de propriété. Plus élevé en zone rurale et périurbaine, plus faible dans les grandes villes. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "log_loc_pct": {
      "rawObsvACT": "pct_loc",
      "short": "% Locataires",
      "medium": "Part des locataires",
      "long": "Part des résidences principales en location",
      "type": "pct",
      "unit": "%",
      "theme": "log",
      "ordre": 16,
      "source": "INSEE RP",
      "formula": "P22_RP_LOC / P22_RP × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "P22_RP_LOC",
        "P22_RP"
      ],
      "volets": ["exd", "exdc"],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des ménages locataires de leur résidence principale.",
      "note": "Complémentaire de la propriété. Part élevée en zone urbaine dense (parc locatif social et privé). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_bpe": "══════════ ÉQUIPEMENTS BPE (bpe) ══════════",
    "bpe_pharma_dens": {
      "rawObsvACT": "dens_pharma",
      "short": "Pharmacies",
      "medium": "Densité pharmacies",
      "long": "Nombre de pharmacies pour 10 000 habitants",
      "type": "ratio",
      "unit": "/10k hab",
      "theme": "bpe",
      "ordre": 1,
      "source": "INSEE BPE",
      "formula": "BPE_2024_D307 / POP × 10000",
      "periodes": [
        "24"
      ],
      "srcVar": [
        "BPE_2024_D307"
      ],
      "volets": [],
      "priority": 4,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "bpe_medgen_dens": {
      "rawObsvACT": "dens_medgen",
      "short": "Médecins gén.",
      "medium": "Densité médecins généralistes",
      "long": "Nombre de médecins généralistes pour 10 000 habitants",
      "type": "ratio",
      "unit": "/10k hab",
      "theme": "bpe",
      "ordre": 2,
      "source": "INSEE BPE",
      "formula": "BPE_2024_D201 / POP × 10000",
      "periodes": [
        "24"
      ],
      "srcVar": [
        "BPE_2024_D201"
      ],
      "volets": [],
      "priority": 4,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "bpe_infirm_dens": {
      "rawObsvACT": "dens_infirm",
      "short": "Infirmiers",
      "medium": "Densité infirmiers",
      "long": "Nombre d'infirmiers pour 10 000 habitants",
      "type": "ratio",
      "unit": "/10k hab",
      "theme": "bpe",
      "ordre": 3,
      "source": "INSEE BPE",
      "formula": "BPE_2024_D281 / POP × 10000",
      "periodes": [
        "24"
      ],
      "srcVar": [
        "BPE_2024_D281"
      ],
      "volets": [],
      "priority": 4,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "bpe_boulang_dens": {
      "rawObsvACT": "dens_boulang",
      "short": "Boulangeries",
      "medium": "Densité boulangeries",
      "long": "Nombre de boulangeries pour 10 000 habitants",
      "type": "ratio",
      "unit": "/10k hab",
      "theme": "bpe",
      "ordre": 10,
      "source": "INSEE BPE",
      "formula": "BPE_2024_B207 / POP × 10000",
      "periodes": [
        "24"
      ],
      "srcVar": [
        "BPE_2024_B207"
      ],
      "volets": [],
      "priority": 4,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "bpe_superette_dens": {
      "rawObsvACT": "dens_superette",
      "short": "Supérettes",
      "medium": "Densité supérettes",
      "long": "Nombre de supérettes pour 10 000 habitants",
      "type": "ratio",
      "unit": "/10k hab",
      "theme": "bpe",
      "ordre": 11,
      "source": "INSEE BPE",
      "formula": "BPE_2024_B201 / POP × 10000",
      "periodes": [
        "24"
      ],
      "srcVar": [
        "BPE_2024_B201"
      ],
      "volets": [],
      "priority": 4,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "bpe_supermarche_dens": {
      "rawObsvACT": "dens_supermarche",
      "short": "Supermarchés",
      "medium": "Densité supermarchés",
      "long": "Nombre de supermarchés pour 10 000 habitants",
      "type": "ratio",
      "unit": "/10k hab",
      "theme": "bpe",
      "ordre": 12,
      "source": "INSEE BPE",
      "formula": "BPE_2024_B105 / POP × 10000",
      "periodes": [
        "24"
      ],
      "srcVar": [
        "BPE_2024_B105"
      ],
      "volets": [],
      "priority": 4,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "bpe_biblio_dens": {
      "rawObsvACT": "dens_biblio",
      "short": "Bibliothèques",
      "medium": "Densité bibliothèques",
      "long": "Nombre de bibliothèques pour 10 000 habitants",
      "type": "ratio",
      "unit": "/10k hab",
      "theme": "bpe",
      "ordre": 20,
      "source": "INSEE BPE",
      "formula": "BPE_2024_F307 / POP × 10000",
      "periodes": [
        "24"
      ],
      "srcVar": [
        "BPE_2024_F307"
      ],
      "volets": [],
      "priority": 4,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "bpe_coiffeur_dens": {
      "rawObsvACT": "dens_coiffeur",
      "short": "Coiffeurs",
      "medium": "Densité coiffeurs",
      "long": "Nombre de coiffeurs pour 10 000 habitants",
      "type": "ratio",
      "unit": "/10k hab",
      "theme": "bpe",
      "ordre": 21,
      "source": "INSEE BPE",
      "formula": "BPE_2024_A501 / POP × 10000",
      "periodes": [
        "24"
      ],
      "srcVar": [
        "BPE_2024_A501"
      ],
      "volets": [],
      "priority": 4,
      "polarity": 1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_logd": "══════════ DVF IMMOBILIER (logd) ══════════",
    "logd_px2q2_mai": {
      "short": "Prix m² maisons",
      "medium": "Prix médian au m² des maisons",
      "long": "Prix au m² médian des maisons (DVF)",
      "type": "vol",
      "unit": "€/m²",
      "theme": "logd",
      "ordre": 1,
      "source": "DVF",
      "periodes": [
        "24"
      ],
      "volets": "exdc",
      "eda": true,
      "priority": 1,
      "polarity": 0,
      "symbol": "",
      "definition": "Prix médian au m² des maisons vendues sur la période (source DVF, données de mutations).",
      "note": "Prix médian au m² des maisons (DVF). La médiane est moins sensible aux biens atypiques que la moyenne. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logd_px2q2_appt": {
      "short": "Prix m² apparts",
      "medium": "Prix médian au m² des appartements",
      "long": "Prix au m² médian des appartements (DVF)",
      "type": "vol",
      "unit": "€/m²",
      "theme": "logd",
      "ordre": 2,
      "source": "DVF",
      "periodes": [
        "24"
      ],
      "volets": "exdc",
      "eda": true,
      "priority": 1,
      "polarity": 0,
      "symbol": "",
      "definition": "Prix médian au m² des appartements vendus sur la période (source DVF, données de mutations).",
      "note": "Prix médian au m² des appartements (DVF). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logd_px2q1_mai": {
      "short": "Prix m² Q1 mais.",
      "medium": "Prix m² Q1 des maisons (25e pct)",
      "long": "Premier quartile prix au m² maisons (DVF)",
      "type": "vol",
      "unit": "€/m²",
      "theme": "logd",
      "ordre": 3,
      "source": "DVF",
      "periodes": [
        "24"
      ],
      "volets": "exdc",
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logd_px2q3_mai": {
      "short": "Prix m² Q3 mais.",
      "medium": "Prix m² Q3 des maisons (75e pct)",
      "long": "Troisième quartile prix au m² maisons (DVF)",
      "type": "vol",
      "unit": "€/m²",
      "theme": "logd",
      "ordre": 4,
      "source": "DVF",
      "periodes": [
        "24"
      ],
      "volets": "exdc",
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logd_px2q1_appt": {
      "short": "Prix m² Q1 appt",
      "medium": "Prix m² Q1 des appartements",
      "long": "Premier quartile prix au m² appartements (DVF)",
      "type": "vol",
      "unit": "€/m²",
      "theme": "logd",
      "ordre": 5,
      "source": "DVF",
      "periodes": [
        "24"
      ],
      "volets": "exdc",
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logd_px2q3_appt": {
      "short": "Prix m² Q3 appt",
      "medium": "Prix m² Q3 des appartements",
      "long": "Troisième quartile prix au m² appartements (DVF)",
      "type": "vol",
      "unit": "€/m²",
      "theme": "logd",
      "ordre": 6,
      "source": "DVF",
      "periodes": [
        "24"
      ],
      "volets": "exdc",
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logd_trans": {
      "short": "Nb transactions",
      "medium": "Nombre de transactions immobilières",
      "long": "Nombre total de transactions immobilières (DVF)",
      "type": "vol",
      "unit": "",
      "theme": "logd",
      "ordre": 7,
      "source": "DVF",
      "periodes": [
        "24"
      ],
      "volets": "exdc",
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Nombre total de transactions immobilières enregistrées sur la période (source DVF).",
      "note": "Volume de transactions. Reflète la profondeur du marché immobilier local. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logd_trans_mai": {
      "short": "Trans. maisons",
      "medium": "Transactions de maisons",
      "long": "Nombre de transactions maisons (DVF)",
      "type": "vol",
      "unit": "",
      "theme": "logd",
      "ordre": 8,
      "source": "DVF",
      "periodes": [
        "24"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logd_trans_appt": {
      "short": "Trans. apparts",
      "medium": "Transactions d’appartements",
      "long": "Nombre de transactions appartements (DVF)",
      "type": "vol",
      "unit": "",
      "theme": "logd",
      "ordre": 9,
      "source": "DVF",
      "periodes": [
        "24"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logd_appt_trans_pct": {
      "short": "% Apparts (trans)",
      "medium": "Part des appartements dans les ventes",
      "long": "Part des appartements dans les transactions (DVF)",
      "type": "pct",
      "unit": "%",
      "theme": "logd",
      "ordre": 10,
      "source": "DVF",
      "periodes": [
        "24"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logd_trans_vevol": {
      "short": "△ Transactions",
      "medium": "△ Évolution des transactions",
      "long": "Évolution des transactions immobilières (DVF)",
      "type": "vevol",
      "unit": "△%",
      "theme": "logd",
      "ordre": 11,
      "source": "DVF",
      "formula": "((trans_fin - trans_debut) / trans_debut) × 100",
      "periodes": [
        "16_24",
        "19_24",
        "22_24"
      ],
      "volets": [
        "exd",
        "exdc"
      ],
      "priority": 3,
      "polarity": 0,
      "symbol": "△"
    },
    "logd_px2_mai_vevol": {
      "short": "△ Prix maisons",
      "medium": "△ Évolution du prix des maisons",
      "long": "Évolution prix m² maisons (DVF)",
      "type": "vevol",
      "unit": "△%",
      "theme": "logd",
      "ordre": 12,
      "source": "DVF",
      "formula": "((px_fin - px_debut) / px_debut) × 100",
      "periodes": [
        "16_24",
        "19_24",
        "22_24"
      ],
      "volets": [
        "exd",
        "exdc"
      ],
      "priority": 2,
      "polarity": 0,
      "symbol": "△",
      "definition": "Évolution du prix médian au m² des maisons entre deux périodes (source DVF).",
      "note": "Dynamique des prix des maisons. Positif = marché en hausse. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value})."
    },
    "logd_px2_appt_vevol": {
      "short": "△ Prix apparts",
      "medium": "△ Évolution du prix des appartements",
      "long": "Évolution prix m² appartements (DVF)",
      "type": "vevol",
      "unit": "△%",
      "theme": "logd",
      "ordre": 13,
      "source": "DVF",
      "formula": "((px_fin - px_debut) / px_debut) × 100",
      "periodes": [
        "16_24",
        "19_24",
        "22_24"
      ],
      "volets": [
        "exd",
        "exdc"
      ],
      "priority": 2,
      "polarity": 0,
      "symbol": "△",
      "definition": "Évolution du prix médian au m² des appartements entre deux périodes (source DVF).",
      "note": "Dynamique des prix des appartements. Positif = marché en hausse. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value})."
    },
    "logd_px2_mai_ecfr": {
      "short": "▲ Prix maisons FR",
      "medium": "Écart au prix national des maisons",
      "long": "Écart en % du prix m² maisons par rapport à la médiane France (DVF)",
      "type": "ind",
      "unit": "%",
      "theme": "logd",
      "ordre": 14,
      "source": "DVF",
      "formula": "(prix_local - prix_France) / prix_France × 100",
      "note": "Valeur positive = plus cher que France, négative = moins cher. Palette violet-vert divergente.",
      "periodes": [
        "24"
      ],
      "volets": [
        "exd",
        "exdc",
        "exdlog"
      ],
      "priority": 3,
      "polarity": 0,
      "symbol": ""
    },
    "logd_px2_appt_ecfr": {
      "short": "▲ Prix apparts FR",
      "medium": "Écart au prix national des appartements",
      "long": "Écart en % du prix m² appartements par rapport à la médiane France (DVF)",
      "type": "ind",
      "unit": "%",
      "theme": "logd",
      "ordre": 15,
      "source": "DVF",
      "formula": "(prix_local - prix_France) / prix_France × 100",
      "note": "Valeur positive = plus cher que France, négative = moins cher. Palette violet-vert divergente.",
      "periodes": [
        "24"
      ],
      "volets": [
        "exd",
        "exdc",
        "exdlog"
      ],
      "priority": 3,
      "polarity": 0,
      "symbol": ""
    },
    "&comment_rev": "══════════ REVENUS / PAUVRETÉ - Filosofi (rev) ══════════",
    "rev_med": {
      "short": "Rev. médian",
      "medium": "Revenu médian disponible",
      "long": "Niveau de vie médian en euros par an (Filosofi)",
      "type": "vol",
      "unit": "€/an",
      "theme": "rev",
      "ordre": 1,
      "source": "Filosofi",
      "formula": "MED_SL directement",
      "periodes": [
        "19",
        "21"
      ],
      "srcVar": [
        "MED_SL"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 1,
      "polarity": 0,
      "symbol": "",
      "definition": "Médiane du revenu disponible par unité de consommation (échelle OCDE modifiée). La moitié gagne plus, l’autre moins.",
      "note": "Revenu médian : la moitié de la population a un niveau de vie supérieur, l’autre moitié inférieur. Exprimé par unité de consommation (taille du ménage). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "rev_d1": {
      "short": "Décile D1",
      "medium": "Premier décile de revenu (D1)",
      "long": "1er décile du niveau de vie en euros (10% les plus modestes)",
      "type": "vol",
      "unit": "€/an",
      "theme": "rev",
      "ordre": 2,
      "source": "Filosofi",
      "formula": "D1_SL directement",
      "periodes": [
        "19",
        "21"
      ],
      "srcVar": [
        "D1_SL"
      ],
      "volets": "exdc",
      "priority": 2,
      "polarity": 1,
      "symbol": "",
      "definition": "Premier décile de revenu disponible par unité de consommation : plafond des 10% les plus modestes.",
      "note": "Niveau de vie des plus modestes. D1 bas = pauvreté intense. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "rev_d9": {
      "short": "Décile D9",
      "medium": "Neuvième décile de revenu (D9)",
      "long": "9e décile du niveau de vie en euros (10% les plus aisés)",
      "type": "vol",
      "unit": "€/an",
      "theme": "rev",
      "ordre": 3,
      "source": "Filosofi",
      "formula": "D9_SL directement",
      "periodes": [
        "19",
        "21"
      ],
      "srcVar": [
        "D9_SL"
      ],
      "volets": ["exd", "exdc"],
      "priority": 2,
      "polarity": 1,
      "symbol": "",
      "definition": "Neuvième décile de revenu disponible par unité de consommation : plancher des 10% les plus aisés.",
      "note": "Niveau de vie des plus aisés. D9 élevé = présence de hauts revenus. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "rev_ird9d1": {
      "short": "Ratio D9/D1",
      "medium": "Rapport interdécile D9/D1",
      "long": "Rapport entre le 9e et le 1er décile (inégalités)",
      "type": "ind",
      "unit": "ratio",
      "theme": "rev",
      "ordre": 4,
      "source": "Filosofi",
      "formula": "D9_SL / D1_SL",
      "periodes": [
        "21"
      ],
      "srcVar": [
        "IR_D9_D1_SL"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Rapport entre le 9e décile (plancher des 10% les plus aisés) et le 1er décile (plafond des 10% les plus modestes).",
      "note": "Mesure l’écart entre hauts et bas revenus. Valeur 3 = les 10% les plus aisés gagnent au moins 3 fois plus que les 10% les plus modestes. Plus la valeur est élevée, plus les inégalités sont fortes. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "rev_txpauv": {
      "short": "Tx pauvreté",
      "medium": "Taux de pauvreté",
      "long": "Part population sous 60% du niveau de vie médian national",
      "type": "pct",
      "unit": "%",
      "theme": "rev",
      "ordre": 5,
      "source": "Filosofi",
      "formula": "PR_MD60 directement",
      "periodes": [
        "19",
        "21"
      ],
      "srcVar": [
        "PR_MD60"
      ],
      "volets": ["exd", "exdc"],
      "eda": true,
      "priority": 1,
      "polarity": -1,
      "symbol": "",
      "definition": "Part de la population dont le niveau de vie est inférieur à 60% du revenu médian national.",
      "note": "Proportion vivant sous le seuil de pauvreté (60% du revenu médian national, environ 1 128€/mois en 2021 pour une personne seule). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "rev_menimi": {
      "short": "% Imposés",
      "medium": "Part des ménages imposés",
      "long": "Part des ménages fiscaux imposés à l'impôt sur le revenu",
      "type": "pct",
      "unit": "%",
      "theme": "rev",
      "ordre": 6,
      "source": "Filosofi",
      "formula": "S_HH_TAX directement",
      "periodes": [
        "19",
        "21"
      ],
      "srcVar": [
        "S_HH_TAX"
      ],
      "volets": "exdc",
      "priority": 2,
      "polarity": 1,
      "symbol": "",
      "definition": "Part des ménages fiscaux imposés dans l'ensemble des ménages fiscaux.",
      "note": "Part des ménages imposés. Reflète le niveau de revenus global du territoire. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "rev_prestasoc": {
      "short": "% Presta. soc.",
      "medium": "Part des prestations sociales",
      "long": "Part des prestations sociales dans le revenu disponible",
      "type": "pct",
      "unit": "%",
      "theme": "rev",
      "ordre": 7,
      "source": "Filosofi",
      "formula": "S_SOC_BEN_DI directement",
      "periodes": [
        "19",
        "21"
      ],
      "srcVar": [
        "S_SOC_BEN_DI"
      ],
      "volets": ["exd", "exdc"],
      "priority": 2,
      "polarity": 0,
      "symbol": "",
      "definition": "Part des prestations sociales (minima sociaux, allocations) dans le revenu disponible des ménages.",
      "note": "Poids des transferts sociaux. Part élevée = dépendance aux aides, fragilité économique. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_rev_evol": "══════════ Évolutions revenus 2019-2021 ══════════",
    "rev_med_vevol": {
      "short": "△ Rev. médian",
      "medium": "△ Évolution du revenu médian",
      "long": "Évolution du niveau de vie médian entre 2019 et 2021 (%)",
      "type": "vevol",
      "unit": "%",
      "theme": "rev",
      "ordre": 10,
      "source": "Filosofi",
      "formula": "(rev_med_21 - rev_med_19) / rev_med_19 × 100",
      "periodes": [
        "19_21"
      ],
      "volets": [],
      "eda": true,
      "priority": 3,
      "polarity": 1,
      "symbol": "△",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "rev_txpauv_vevol": {
      "short": "△ Tx pauvreté",
      "medium": "△ Évolution du taux de pauvreté",
      "long": "Évolution du taux de pauvreté entre 2019 et 2021 (%)",
      "type": "vevol",
      "unit": "%",
      "theme": "rev",
      "ordre": 11,
      "source": "Filosofi",
      "formula": "(rev_txpauv_21 - rev_txpauv_19) / rev_txpauv_19 × 100",
      "periodes": [
        "19_21"
      ],
      "volets": [],
      "eda": true,
      "priority": 3,
      "polarity": -1,
      "symbol": "△",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "rev_d1_vevol": {
      "short": "△ Décile D1",
      "medium": "△ Évolution du premier décile",
      "long": "Évolution du 1er décile (10% les plus modestes) entre 2019 et 2021 (%)",
      "type": "vevol",
      "unit": "%",
      "theme": "rev",
      "ordre": 12,
      "source": "Filosofi",
      "formula": "(rev_d1_21 - rev_d1_19) / rev_d1_19 × 100",
      "periodes": [
        "19_21"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "△",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "rev_d9_vevol": {
      "short": "△ Décile D9",
      "medium": "△ Évolution du neuvième décile",
      "long": "Évolution du 9e décile (10% les plus aisés) entre 2019 et 2021 (%)",
      "type": "vevol",
      "unit": "%",
      "theme": "rev",
      "ordre": 13,
      "source": "Filosofi",
      "formula": "(rev_d9_21 - rev_d9_19) / rev_d9_19 × 100",
      "periodes": [
        "19_21"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "△",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "rev_menimi_vevol": {
      "short": "△ % Imposés",
      "medium": "△ Évolution de la part des imposés",
      "long": "Évolution de la part des ménages imposés entre 2019 et 2021 (%)",
      "type": "vevol",
      "unit": "%",
      "theme": "rev",
      "ordre": 14,
      "source": "Filosofi",
      "formula": "(rev_menimi_21 - rev_menimi_19) / rev_menimi_19 × 100",
      "periodes": [
        "19_21"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 1,
      "symbol": "△",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "rev_prestasoc_vevol": {
      "short": "△ % Presta. soc.",
      "medium": "△ Évolution des prestations sociales",
      "long": "Évolution de la part des prestations sociales dans le revenu entre 2019 et 2021 (%)",
      "type": "vevol",
      "unit": "%",
      "theme": "rev",
      "ordre": 15,
      "source": "Filosofi",
      "formula": "(rev_prestasoc_21 - rev_prestasoc_19) / rev_prestasoc_19 × 100",
      "periodes": [
        "19_21"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "△",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_dmf_tmi": "══════════ TMI - Taux Migration Interne par catégorie ══════════",
    "dmf_tmi_cscadre": {
      "short": "TMI Cadres",
      "medium": "△ Taux migratoire interne des cadres",
      "long": "Taux de migration interne des cadres = (Entrants - Sortants) / Population × 100",
      "type": "vtcam",
      "unit": "%",
      "theme": "dmf",
      "ordre": 20,
      "source": "INSEE MIGCOM",
      "formula": "(E_cadre - S_cadre) / Pop_cadre × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "eda": true,
      "priority": 3,
      "polarity": 0,
      "symbol": "△",
      "definition": "Taux migratoire interne net des cadres : solde entrées-sorties de cadres rapporté à la population.",
      "note": "Solde net des cadres (entrées moins sorties) rapporté à la population. Positif = le territoire attire plus de cadres qu’il n’en perd. Négatif = fuite de cadres. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_tmi_csouvrier": {
      "short": "TMI Ouvriers",
      "medium": "△ Taux migratoire interne des ouvriers",
      "long": "Taux de migration interne des ouvriers = (Entrants - Sortants) / Population × 100",
      "type": "vtcam",
      "unit": "%",
      "theme": "dmf",
      "ordre": 21,
      "source": "INSEE MIGCOM",
      "formula": "(E_ouvrier - S_ouvrier) / Pop_ouvrier × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "eda": true,
      "priority": 3,
      "polarity": 0,
      "symbol": "△",
      "definition": "Taux migratoire interne net des ouvriers : solde entrées-sorties d’ouvriers rapporté à la population.",
      "note": "Solde net des ouvriers rapporté à la population. Positif = le territoire attire des ouvriers. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_tmi_a1524": {
      "short": "TMI 15-24",
      "medium": "△ Taux migratoire interne des 15-24 ans",
      "long": "Taux de migration interne des 15-24 ans = (Entrants - Sortants) / Population × 100",
      "type": "vtcam",
      "unit": "%",
      "theme": "dmf",
      "ordre": 22,
      "source": "INSEE MIGCOM",
      "formula": "(E_1524 - S_1524) / Pop_1524 × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "eda": true,
      "priority": 3,
      "polarity": 0,
      "symbol": "△",
      "definition": "Taux migratoire interne net des 15-24 ans : solde entrées-sorties de jeunes rapporté à la population.",
      "note": "Solde net des jeunes 15-24 ans. Souvent négatif en zone rurale (départ pour études/emploi). Positif dans les villes universitaires. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_tmi_a2529": {
      "short": "TMI 25-29",
      "medium": "△ Taux migratoire interne des 25-29 ans",
      "long": "Taux de migration interne des 25-29 ans = (Entrants - Sortants) / Population × 100",
      "type": "vtcam",
      "unit": "%",
      "theme": "dmf",
      "ordre": 23,
      "source": "INSEE MIGCOM",
      "formula": "(E_2529 - S_2529) / Pop_2529 × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "△",
      "definition": "Taux migratoire interne net des 25-29 ans rapporté à la population.",
      "note": "Tranche charnière entre études et installation professionnelle. Révèle l’attractivité économique pour les jeunes actifs. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_tmi_a3039": {
      "short": "TMI 30-39",
      "medium": "△ Taux migratoire interne des 30-39 ans",
      "long": "Taux de migration interne des 30-39 ans = (Entrants - Sortants) / Population × 100",
      "type": "vtcam",
      "unit": "%",
      "theme": "dmf",
      "ordre": 24,
      "source": "INSEE MIGCOM",
      "formula": "(E_3039 - S_3039) / Pop_3039 × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "eda": true,
      "priority": 3,
      "polarity": 0,
      "symbol": "△",
      "definition": "Taux migratoire interne net des 30-39 ans rapporté à la population.",
      "note": "Tranche des choix résidentiels familiaux (installation, accès propriété, qualité de vie). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_tmi_a65p": {
      "short": "TMI 65+",
      "medium": "△ Taux migratoire interne des 65 ans+",
      "long": "Taux de migration interne des 65+ ans = (Entrants - Sortants) / Population × 100",
      "type": "vtcam",
      "unit": "%",
      "theme": "dmf",
      "ordre": 25,
      "source": "INSEE MIGCOM",
      "formula": "(E_65p - S_65p) / Pop_65p × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "△",
      "definition": "Taux migratoire interne net des 65 ans+ rapporté à la population.",
      "note": "Révèle l’attractivité résidentielle pour les retraités (cadre de vie, littoral, montagne). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_cscadre_es_ratio": {
      "short": "Ent/Sort Cadres",
      "medium": "Ratio entrants/sortants des cadres",
      "long": "Ratio Entrants/Sortants cadres (>1 = territoire attractif pour cadres)",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 30,
      "source": "INSEE MIGCOM",
      "formula": "E_cadre / S_cadre",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "definition": "Rapport entre cadres entrants et cadres sortants du territoire.",
      "note": "Nombre de cadres qui s’installent divisé par ceux qui partent. Valeur > 1 = attraction nette de cadres. Valeur < 1 = perte nette. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_csouvrier_es_ratio": {
      "short": "Ent/Sort Ouvriers",
      "medium": "Ratio entrants/sortants des ouvriers",
      "long": "Ratio Entrants/Sortants ouvriers (>1 = territoire attractif pour ouvriers)",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 31,
      "source": "INSEE MIGCOM",
      "formula": "E_ouvrier / S_ouvrier",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "definition": "Rapport entre ouvriers entrants et ouvriers sortants du territoire.",
      "note": "Nombre d’ouvriers qui arrivent divisé par ceux qui partent. Valeur > 1 = attraction nette. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_a1524_es_ratio": {
      "short": "Ent/Sort 15-24",
      "medium": "Ratio entrants/sortants des 15-24 ans",
      "long": "Ratio Entrants/Sortants 15-24 ans (>1 = territoire attractif pour jeunes)",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 32,
      "source": "INSEE MIGCOM",
      "formula": "E_1524 / S_1524",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "definition": "Rapport entre 15-24 ans entrants et sortants du territoire.",
      "note": "Rarement > 1 hors villes universitaires (départ massif des jeunes pour études/emploi). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_a2529_es_ratio": {
      "short": "Ent/Sort 25-29",
      "medium": "Ratio entrants/sortants des 25-29 ans",
      "long": "Ratio Entrants/Sortants 25-29 ans",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 33,
      "source": "INSEE MIGCOM",
      "formula": "E_2529 / S_2529",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "definition": "Rapport entre 25-29 ans entrants et sortants du territoire.",
      "note": "Valeur > 1 = le territoire attire des jeunes actifs en début de carrière. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_a3039_es_ratio": {
      "short": "Ent/Sort 30-39",
      "medium": "Ratio entrants/sortants des 30-39 ans",
      "long": "Ratio Entrants/Sortants 30-39 ans (>1 = attire jeunes actifs)",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 34,
      "source": "INSEE MIGCOM",
      "formula": "E_3039 / S_3039",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "definition": "Rapport entre 30-39 ans entrants et sortants du territoire.",
      "note": "Tranche des choix résidentiels familiaux. Valeur > 1 = attraction de familles. Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmf_a65p_es_ratio": {
      "short": "Ent/Sort 65+",
      "medium": "Ratio entrants/sortants des 65 ans+",
      "long": "Ratio Entrants/Sortants 65+ ans (>1 = attire retraités)",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 35,
      "source": "INSEE MIGCOM",
      "formula": "E_65p / S_65p",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "definition": "Rapport entre 65+ entrants et sortants du territoire.",
      "note": "Valeur > 1 = le territoire attire des retraités (cadre de vie, climat). Valeur supérieure à {percentile}% des territoires (🇫🇷 {france_value}).",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_dmf_icm_old": "══════════ OLD ICM (deprecated) - Garder pour trace ══════════",
    "&_old_dmf_cadre_epop_ratio": {
      "short": "Ind. E/Pop Cadres",
      "medium": "Indice Entrants/Pop Cadres",
      "long": "Ratio part cadres entrants / part cadres population (>1 = surattraction)",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 11,
      "source": "INSEE MIGCOM",
      "formula": "(Entr_cadre/Entr_total) / (Pop_cadre/Pop_total)",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "cadre"
    },
    "&_old_dmf_cadre_icm": {
      "short": "ICM Cadres",
      "medium": "ICM Cadres (pts)",
      "long": "Impact migrations sur part cadres (>0 = augmentation part cadres)",
      "type": "vdifp",
      "unit": "pts",
      "theme": "dmf",
      "ordre": 12,
      "source": "INSEE MIGCOM",
      "formula": "((SM_cadre/N_cadre) - (SM_autres/N_autres)) × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "cadre"
    },
    "&_old_dmf_j3039_es_ratio": {
      "short": "Ind. ES 30-39",
      "medium": "Indice E/S Jeunes 30-39",
      "long": "Ratio part 30-39ans entrants / sortants (>1 = attire jeunes actifs)",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 13,
      "source": "INSEE MIGCOM",
      "formula": "(Entr_j3039/Entr_total) / (Sort_j3039/Sort_total)",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "j3039"
    },
    "&_old_dmf_j3039_epop_ratio": {
      "short": "Ind. E/Pop 30-39",
      "medium": "Indice Entrants/Pop 30-39",
      "long": "Ratio part 30-39ans entrants / population (>1 = surattraction jeunes)",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 14,
      "source": "INSEE MIGCOM",
      "formula": "(Entr_j3039/Entr_total) / (Pop_j3039/Pop_total)",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "j3039"
    },
    "&_old_dmf_j3039_icm": {
      "short": "ICM 30-39",
      "medium": "ICM 30-39ans (pts)",
      "long": "Impact migrations sur part 30-39ans (>0 = rajeunissement)",
      "type": "vdifp",
      "unit": "pts",
      "theme": "dmf",
      "ordre": 15,
      "source": "INSEE MIGCOM",
      "formula": "((SM_j3039/N_j3039) - (SM_autres/N_autres)) × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "j3039"
    },
    "&_old_dmf_retrait_es_ratio": {
      "short": "Ind. ES Retraités",
      "medium": "Indice E/S Retraités (65+)",
      "long": "Ratio part retraités (TACT=22) entrants / sortants",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 19,
      "source": "INSEE MIGCOM",
      "formula": "(Entr_retrait/Entr_total) / (Sort_retrait/Sort_total)",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "retrait"
    },
    "&_old_dmf_retrait_epop_ratio": {
      "short": "Ind. E/Pop Retraités",
      "medium": "Indice Entrants/Pop Retraités",
      "long": "Ratio part retraités (TACT=22) entrants / population",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 20,
      "source": "INSEE MIGCOM",
      "formula": "(Entr_retrait/Entr_total) / (Pop_retrait/Pop_total)",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "retrait"
    },
    "&_old_dmf_retrait_icm": {
      "short": "ICM Retraités",
      "medium": "ICM Retraités (pts)",
      "long": "Impact migrations sur part retraités (TACT=22)",
      "type": "vdifp",
      "unit": "pts",
      "theme": "dmf",
      "ordre": 21,
      "source": "INSEE MIGCOM",
      "formula": "((SM_retrait/N_retrait) - (SM_autres/N_autres)) × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "retrait"
    },
    "&_old_dmf_j1524_es_ratio": {
      "short": "Ind. ES 15-24",
      "medium": "Indice E/S Jeunes 15-24",
      "long": "Ratio part 15-24 ans entrants / sortants (>1 = attire jeunes)",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 22,
      "source": "INSEE MIGCOM",
      "formula": "(Entr_j1524/Entr_total) / (Sort_j1524/Sort_total)",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "j1524"
    },
    "&_old_dmf_j1524_epop_ratio": {
      "short": "Ind. E/Pop 15-24",
      "medium": "Indice Entrants/Pop 15-24",
      "long": "Ratio part 15-24 ans entrants / population",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 23,
      "source": "INSEE MIGCOM",
      "formula": "(Entr_j1524/Entr_total) / (Pop_j1524/Pop_total)",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "j1524"
    },
    "&_old_dmf_j1524_icm": {
      "short": "ICM 15-24",
      "medium": "ICM 15-24 ans (pts)",
      "long": "Impact migrations sur part 15-24 ans (>0 = rajeunissement)",
      "type": "vdifp",
      "unit": "pts",
      "theme": "dmf",
      "ordre": 24,
      "source": "INSEE MIGCOM",
      "formula": "((SM_j1524/N_j1524) - (SM_autres/N_autres)) × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "j1524"
    },
    "&_old_dmf_j3039_cadr_es_ratio": {
      "short": "Ind. ES 30-39 cadr",
      "medium": "Indice E/S 30-39 cadres",
      "long": "Ratio part 30-39 ans cadres entrants / sortants",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 25,
      "source": "INSEE MIGCOM",
      "formula": "(Entr_j3039cadr/Entr_total) / (Sort_j3039cadr/Sort_total)",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "j3039_cadr"
    },
    "&_old_dmf_j3039_cadr_epop_ratio": {
      "short": "Ind. E/Pop 30-39 cadr",
      "medium": "Indice Entrants/Pop 30-39 cadres",
      "long": "Ratio part 30-39 ans cadres entrants / population",
      "type": "ind",
      "unit": "ratio",
      "theme": "dmf",
      "ordre": 26,
      "source": "INSEE MIGCOM",
      "formula": "(Entr_j3039cadr/Entr_total) / (Pop_j3039cadr/Pop_total)",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "j3039_cadr"
    },
    "&_old_dmf_j3039_cadr_icm": {
      "short": "ICM 30-39 cadr",
      "medium": "ICM 30-39 cadres (pts)",
      "long": "Impact migrations sur part 30-39 ans cadres (>0 = attire jeunes cadres)",
      "type": "vdifp",
      "unit": "pts",
      "theme": "dmf",
      "ordre": 27,
      "source": "INSEE MIGCOM",
      "formula": "((SM_j3039cadr/N_j3039cadr) - (SM_autres/N_autres)) × 100",
      "periodes": [
        "16",
        "22"
      ],
      "volets": [
        "exdf"
      ],
      "catICM": "j3039_cadr"
    },
    "&comment_geo": "══════════ GÉOGRAPHIE / ZONAGES (geo) ══════════",
    "geo_littoral_pct": {
      "short": "% Pop littoral",
      "medium": "Part de la population en zone littorale",
      "long": "Part de la population vivant dans une commune classée loi littoral",
      "type": "pct",
      "unit": "%",
      "theme": "geo",
      "ordre": 1,
      "source": "ANCT / Loi Littoral",
      "formula": "sum(pop × littoral) / sum(pop) × 100",
      "periodes": [
        "22"
      ],
      "srcVar": [
        "pop_littoral",
        "P22_POP"
      ],
      "volets": [],
      "eda": true,
      "priority": 5,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dmv_5564_seul_pct": {
      "short": "% 55-64 seuls",
      "medium": "Part des 55-64 ans vivant seuls",
      "long": "Part des 55-64 ans vivant seuls",
      "type": "pct",
      "unit": "%",
      "theme": "dmv",
      "ordre": 15,
      "source": "INSEE RP",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "volets": [],
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dsp_csp_artis_pct": {
      "short": "% Artisans (CSP)",
      "medium": "Part artisans comm.",
      "long": "Part des artisans, commercants, chefs entreprise",
      "type": "pct",
      "unit": "%",
      "theme": "dsp",
      "ordre": 12,
      "source": "INSEE RP",
      "periodes": [
        "22",
        "16",
        "11"
      ],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "volets": [],
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "men_tot_stock_vtcam": {
      "short": "▲ Ménages",
      "medium": "Évolution du nombre de ménages",
      "long": "Taux croissance annuel moyen nombre menages",
      "type": "tcam",
      "unit": "%/an",
      "theme": "men",
      "ordre": 2,
      "source": "INSEE RP",
      "periodes": [
        "11_16",
        "16_22",
        "11_22"
      ],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "volets": [],
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_1519_seul_pct": {
      "theme": "dm",
      "type": "pct",
      "short": "% 15-19 seuls",
      "medium": "Part des 15-19 ans vivant seuls",
      "long": "Part des 15-19 ans vivant seuls",
      "unit": "%",
      "source": "INSEE RP",
      "periodes": [
        "22",
        "16"
      ],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "volets": [],
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_2024_seul_pct": {
      "theme": "dm",
      "type": "pct",
      "short": "% 20-24 seuls",
      "medium": "Part des 20-24 ans vivant seuls",
      "long": "Part des 20-24 ans vivant seuls",
      "unit": "%",
      "source": "INSEE RP",
      "periodes": [
        "22",
        "16"
      ],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "volets": [],
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_2539_seul_pct": {
      "theme": "dm",
      "type": "pct",
      "short": "% 25-39 seuls",
      "medium": "Part des 25-39 ans vivant seuls",
      "long": "Part des 25-39 ans vivant seuls",
      "unit": "%",
      "source": "INSEE RP",
      "periodes": [
        "22",
        "16"
      ],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "volets": [],
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "dm_4054_seul_pct": {
      "theme": "dm",
      "type": "pct",
      "short": "% 40-54 seuls",
      "medium": "Part des 40-54 ans vivant seuls",
      "long": "Part des 40-54 ans vivant seuls",
      "unit": "%",
      "source": "INSEE RP",
      "periodes": [
        "22",
        "16"
      ],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "volets": [],
      "agg_dash": true,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "log_sousocc_pct": {
      "theme": "log",
      "type": "pct",
      "short": "Sous-occup.",
      "medium": "Part des logements sous-occupés",
      "long": "Part des résidences principales sous-occupées (toutes intensités)",
      "unit": "%",
      "source": "INSEE RP",
      "periodes": [
        "22",
        "16"
      ],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "volets": [],
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "log_surocc_pct": {
      "theme": "log",
      "type": "pct",
      "short": "Sur-occup.",
      "medium": "Part des logements sur-occupés",
      "long": "Part des résidences principales sur-occupées (toutes intensités)",
      "unit": "%",
      "source": "INSEE RP",
      "periodes": [
        "22",
        "16"
      ],
      "priority": 3,
      "polarity": -1,
      "symbol": "",
      "volets": [],
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "log_emmenrec_pct": {
      "theme": "log",
      "type": "pct",
      "short": "% Emménagés réc.",
      "medium": "Part des emménagés récents",
      "long": "Part des ménages ayant emménagé depuis moins de 4 ans",
      "unit": "%",
      "source": "INSEE RP",
      "periodes": [
        "22"
      ],
      "priority": 3,
      "polarity": 0,
      "symbol": "",
      "volets": [],
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_logv": "══════════ VACANCE PARC PRIVÉ (logv) — LOVAC/SDES ══════════",
    "&comment_logv_note": "logv_vac_pct/vdifp NON ajoutés : doublon conceptuel de log_vac_pct (INSEE RP). Seul >2 ans est nouveau.",
    "logv_vac2ans_pct": {
      "short": "Tx vac. >2 ans",
      "medium": "Taux de vacance longue >2 ans",
      "long": "Part logements vacants >2 ans dans le parc privé (LOVAC)",
      "type": "pct",
      "unit": "%",
      "theme": "logv",
      "ordre": 1,
      "source": "LOVAC",
      "formula": "pp_vacant_plus_2ans / pp_total × 100",
      "periodes": [
        "20",
        "24"
      ],
      "volets": [],
      "eda": false,
      "priority": 4,
      "polarity": -1,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logv_vac2ans_vdifp": {
      "short": "▲ Vac. >2 ans",
      "medium": "▲ Variation de la vacance >2 ans",
      "long": "Evolution taux vacance >2 ans 2020-2024 (LOVAC, pts %)",
      "type": "vdifp",
      "unit": "pts %",
      "theme": "logv",
      "ordre": 2,
      "source": "LOVAC",
      "formula": "logv_vac2ans_pct_23 - logv_vac2ans_pct_20",
      "periodes": [
        "20_24"
      ],
      "volets": [],
      "eda": false,
      "priority": 4,
      "polarity": -1,
      "symbol": "▲",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_logsr": "══════════ CONSTRUCTION RÉSIDENTIELLE (logsr) — SITADEL/SDES ══════════",
    "logsr_resbatcom_vol": {
      "short": "Logements commencés",
      "medium": "Logements résidentiels commencés (nb)",
      "long": "Nombre total de logements résidentiels commencés (moy. mobile 3 ans : 2023-2024-2025)",
      "type": "vol",
      "unit": "nb",
      "theme": "logsr",
      "ordre": 1,
      "source": "SITADEL/SDES",
      "formula": "moyenne(LOG_COM 2023, 2024, 2025)",
      "periodes": [
        "24"
      ],
      "volets": [],
      "eda": false,
      "priority": 4,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logsr_resbatcom_vevol": {
      "short": "Évol. logements commencés",
      "medium": "△ Évolution logements résid. commencés (TCAM moy. mobile)",
      "long": "TCAM des logements résidentiels commencés basé sur moyennes mobiles 3 ans",
      "type": "vevol",
      "unit": "%",
      "theme": "logsr",
      "ordre": 2,
      "source": "SITADEL/SDES",
      "formula": "TCAM(moy3ans_début, moy3ans_fin, n_centres)",
      "periodes": [
        "16_24",
        "19_24",
        "22_24"
      ],
      "volets": [],
      "eda": false,
      "&note": "n = distance entre centres des moy. mobiles. 16_24: moy(15,16,17)→moy(23,24,25), n=8. 19_24: moy(17,18,19)→moy(23,24,25), n=6. 22_24: moy(21,22,23)→moy(23,24,25), n=2.",
      "priority": 4,
      "polarity": 0,
      "symbol": "△",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logsr_resm2com_vol": {
      "short": "Surface résid. commencée",
      "medium": "Surface résidentielle commencée (m²)",
      "long": "Surface de plancher des logements résidentiels commencés (moy. mobile 3 ans : 2023-2024-2025)",
      "type": "vol",
      "unit": "m²",
      "theme": "logsr",
      "ordre": 3,
      "source": "SITADEL/SDES",
      "formula": "moyenne(SDP_COM résidentiel 2023, 2024, 2025)",
      "periodes": [
        "24"
      ],
      "volets": [],
      "eda": false,
      "priority": 4,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logsr_resm2com_vevol": {
      "short": "Évol. surface résid.",
      "medium": "△ Évolution surface résidentielle commencée (TCAM moy. mobile)",
      "long": "TCAM de la surface résidentielle commencée basé sur moyennes mobiles 3 ans",
      "type": "vevol",
      "unit": "%",
      "theme": "logsr",
      "ordre": 4,
      "source": "SITADEL/SDES",
      "formula": "TCAM(moy3ans_début, moy3ans_fin, n_centres)",
      "periodes": [
        "16_24",
        "19_24",
        "22_24"
      ],
      "volets": [],
      "eda": false,
      "&note": "n = distance entre centres des moy. mobiles. Mêmes bornes que resbatcom_vevol.",
      "priority": 4,
      "polarity": 0,
      "symbol": "△",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "&comment_logsn": "══════════ CONSTRUCTION NON-RÉSIDENTIELLE (logsn) — SITADEL/SDES ══════════",
    "&comment_logsn_note": "Pas de nresbatcom (nb locaux) : SITADEL non-résidentiel ne fournit que SDP_COM (surface), pas de comptage unitaire.",
    "logsn_nresm2com_vol": {
      "short": "Surface locaux commencés",
      "medium": "Surface non résidentielle commencée (m²)",
      "long": "Surface de plancher totale des locaux non résidentiels commencés (moy. mobile 3 ans : 2023-2024-2025)",
      "type": "vol",
      "unit": "m²",
      "theme": "logsn",
      "ordre": 1,
      "source": "SITADEL/SDES",
      "formula": "moyenne(SDP_COM 2023, 2024, 2025)",
      "periodes": [
        "24"
      ],
      "volets": [],
      "eda": false,
      "priority": 4,
      "polarity": 0,
      "symbol": "",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logsn_nresm2com_vevol": {
      "short": "Évol. surface locaux",
      "medium": "△ Évolution surface non résid. commencée (TCAM moy. mobile)",
      "long": "TCAM de la surface des locaux non résidentiels commencés basé sur moyennes mobiles 3 ans",
      "type": "vevol",
      "unit": "%",
      "theme": "logsn",
      "ordre": 2,
      "source": "SITADEL/SDES",
      "formula": "TCAM(moy3ans_début, moy3ans_fin, n_centres)",
      "periodes": [
        "16_24",
        "19_24",
        "22_24"
      ],
      "volets": [],
      "eda": false,
      "&note": "n = distance entre centres des moy. mobiles. 16_24: moy(15,16,17)→moy(23,24,25), n=8. 19_24: moy(17,18,19)→moy(23,24,25), n=6. 22_24: moy(21,22,23)→moy(23,24,25), n=2.",
      "priority": 4,
      "polarity": 0,
      "symbol": "△",
      "agg_dash": false,
      "agg_ecodash": false,
      "agg_logdash": false
    },
    "logl_app_m2": {
      "label": "Loyer appart €/m²",
      "theme": "logl",
      "vartype": "prix",
      "unit": "€/m²",
      "source": "ANIL",
      "description": "Loyer prédit €/m² appartements (tous types)",
      "type": "vol",
      "periodes": [
        "22",
        "25"
      ],
      "short": "Loyer appt",
      "medium": "Loyer moyen appartement",
      "long": "Loyer moyen au m² appartement (ANIL)",
      "srcVarOpt": "loyer_app_m2",
      "priority": 5,
      "polarity": 0,
      "symbol": ""
    },
    "logl_app12_m2": {
      "label": "Loyer T1-T2 €/m²",
      "theme": "logl",
      "vartype": "prix",
      "unit": "€/m²",
      "source": "ANIL",
      "description": "Loyer prédit €/m² appartements T1-T2",
      "type": "vol",
      "periodes": [
        "22",
        "25"
      ],
      "short": "Loyer 1-2p",
      "medium": "Loyer moyen appart 1-2 pièces",
      "long": "Loyer moyen au m² appartement 1-2 pièces (ANIL)",
      "srcVarOpt": "loyer_app12_m2",
      "priority": 5,
      "polarity": 0,
      "symbol": ""
    },
    "logl_app3_m2": {
      "label": "Loyer T3+ €/m²",
      "theme": "logl",
      "vartype": "prix",
      "unit": "€/m²",
      "source": "ANIL",
      "description": "Loyer prédit €/m² appartements T3 et plus",
      "type": "vol",
      "periodes": [
        "22",
        "25"
      ],
      "short": "Loyer 3p+",
      "medium": "Loyer moyen appart 3 pièces et plus",
      "long": "Loyer moyen au m² appartement 3+ pièces (ANIL)",
      "srcVarOpt": "loyer_app3_m2",
      "priority": 5,
      "polarity": 0,
      "symbol": ""
    },
    "logl_mai_m2": {
      "label": "Loyer maison €/m²",
      "theme": "logl",
      "vartype": "prix",
      "unit": "€/m²",
      "source": "ANIL",
      "description": "Loyer prédit €/m² maisons",
      "type": "vol",
      "periodes": [
        "22",
        "25"
      ],
      "short": "Loyer maison",
      "medium": "Loyer moyen maison",
      "long": "Loyer moyen au m² maison (ANIL)",
      "srcVarOpt": "loyer_mai_m2",
      "priority": 5,
      "polarity": 0,
      "symbol": ""
    },
    "logl_app_evol": {
      "label": "Évol loyer appart",
      "theme": "logl",
      "vartype": "vevol",
      "unit": "△%",
      "source": "ANIL",
      "description": "Évolution loyer appart 2022-2025",
      "type": "vevol",
      "periodes": [
        "22_25"
      ],
      "short": "△ Loyer appt",
      "medium": "△ evol. loyer appartement 22-25",
      "long": "Evolution loyer moyen appartement 2022-2025 (ANIL)",
      "priority": 5,
      "polarity": 0,
      "symbol": "△"
    },
    "logl_app12_evol": {
      "label": "Évol loyer T1-T2",
      "theme": "logl",
      "vartype": "vevol",
      "unit": "△%",
      "source": "ANIL",
      "description": "Évolution loyer T1-T2 2022-2025",
      "type": "vevol",
      "periodes": [
        "22_25"
      ],
      "short": "△ Loyer 1-2p",
      "medium": "△ evol. loyer appart 1-2p 22-25",
      "long": "Evolution loyer appart 1-2 pièces 2022-2025 (ANIL)",
      "priority": 5,
      "polarity": 0,
      "symbol": "△"
    },
    "logl_app3_evol": {
      "label": "Évol loyer T3+",
      "theme": "logl",
      "vartype": "vevol",
      "unit": "△%",
      "source": "ANIL",
      "description": "Évolution loyer T3+ 2022-2025",
      "type": "vevol",
      "periodes": [
        "22_25"
      ],
      "short": "△ Loyer 3p+",
      "medium": "△ evol. loyer appart 3p+ 22-25",
      "long": "Evolution loyer appart 3+ pièces 2022-2025 (ANIL)",
      "priority": 5,
      "polarity": 0,
      "symbol": "△"
    },
    "logl_mai_evol": {
      "label": "Évol loyer maison",
      "theme": "logl",
      "vartype": "vevol",
      "unit": "△%",
      "source": "ANIL",
      "description": "Évolution loyer maison 2022-2025",
      "type": "vevol",
      "periodes": [
        "22_25"
      ],
      "short": "△ Loyer maison",
      "medium": "△ evol. loyer maison 22-25",
      "long": "Evolution loyer moyen maison 2022-2025 (ANIL)",
      "priority": 5,
      "polarity": 0,
      "symbol": "△"
    },
    "logl_app_ecart_fr": {
      "label": "Écart loyer/France",
      "theme": "logl",
      "vartype": "ecart",
      "unit": "%",
      "source": "ANIL",
      "description": "Écart loyer appart vs moyenne France",
      "priority": 5,
      "polarity": 0,
      "symbol": "",
      "short": "",
      "medium": ""
    },
    "logl_app12_ecart_fr": {
      "label": "Écart loyer T1-T2/France",
      "theme": "logl",
      "vartype": "ecart",
      "unit": "%",
      "source": "ANIL",
      "description": "Écart loyer T1-T2 vs moyenne France",
      "priority": 5,
      "polarity": 0,
      "symbol": "",
      "short": "",
      "medium": ""
    },
    "logl_app3_ecart_fr": {
      "label": "Écart loyer T3+/France",
      "theme": "logl",
      "vartype": "ecart",
      "unit": "%",
      "source": "ANIL",
      "description": "Écart loyer T3+ vs moyenne France",
      "priority": 5,
      "polarity": 0,
      "symbol": "",
      "short": "",
      "medium": ""
    },
    "logl_mai_ecart_fr": {
      "label": "Écart loyer maison/France",
      "theme": "logl",
      "vartype": "ecart",
      "unit": "%",
      "source": "ANIL",
      "description": "Écart loyer maison vs moyenne France",
      "priority": 5,
      "polarity": 0,
      "symbol": "",
      "short": "",
      "medium": ""
    },
    "logl_nb_communes": {
      "label": "Nb communes loyer",
      "theme": "logl",
      "vartype": "vol",
      "unit": "nb",
      "source": "ANIL",
      "description": "Nombre communes avec loyer prédit (EPCI)",
      "priority": 5,
      "polarity": 0,
      "symbol": "",
      "short": "",
      "medium": ""
    },
    "logs_logaut_vol": {
      "label": "Logements autorisés",
      "theme": "logs",
      "vartype": "vol",
      "unit": "nb",
      "source": "SITADEL",
      "description": "Nombre logements autorisés",
      "type": "vol",
      "periodes": [
        "24",
        "22_24"
      ],
      "short": "Logts autorisés",
      "medium": "Logements autorisés",
      "long": "Nombre de logements autorisés (SITADEL)",
      "srcVarOpt": "nb_logaut",
      "priority": 5,
      "polarity": 0,
      "symbol": ""
    },
    "logs_logcom_vol": {
      "label": "Logements commencés",
      "theme": "logs",
      "vartype": "vol",
      "unit": "nb",
      "source": "SITADEL",
      "description": "Nombre logements commencés",
      "type": "vol",
      "periodes": [
        "24",
        "22_24"
      ],
      "short": "Logts commencés",
      "medium": "Logements commencés",
      "long": "Nombre de logements commencés (SITADEL)",
      "srcVarOpt": "nb_logcom",
      "priority": 5,
      "polarity": 0,
      "symbol": ""
    },
    "logs_sdpaut_vol": {
      "label": "Surface autorisée",
      "theme": "logs",
      "vartype": "vol",
      "unit": "m²",
      "source": "SITADEL",
      "description": "Surface de plancher autorisée",
      "type": "vol",
      "periodes": [
        "24",
        "22_24"
      ],
      "short": "Surf autorisée",
      "medium": "Surface autorisée (m²)",
      "long": "Surface de plancher autorisée (SITADEL)",
      "priority": 5,
      "polarity": 0,
      "symbol": ""
    },
    "logs_sdpcom_vol": {
      "label": "Surface commencée",
      "theme": "logs",
      "vartype": "vol",
      "unit": "m²",
      "source": "SITADEL",
      "description": "Surface de plancher commencée",
      "type": "vol",
      "periodes": [
        "24",
        "22_24"
      ],
      "short": "Surf commencée",
      "medium": "Surface commencée (m²)",
      "long": "Surface de plancher commencée (SITADEL)",
      "priority": 5,
      "polarity": 0,
      "symbol": ""
    },
    "logs_logaut_tx1000": {
      "label": "Taux construction autorisée",
      "theme": "logs",
      "vartype": "tx",
      "unit": "‰",
      "source": "SITADEL",
      "description": "Logements autorisés pour 1000 hab",
      "type": "pct",
      "periodes": [
        "22_24"
      ],
      "short": "Tx autorisés ‰",
      "medium": "Taux logements autorisés pour 1000 hab",
      "long": "Logements autorisés pour 1000 habitants (SITADEL)",
      "priority": 5,
      "polarity": 0,
      "symbol": ""
    },
    "logs_logcom_tx1000": {
      "label": "Taux construction commencée",
      "theme": "logs",
      "vartype": "tx",
      "unit": "‰",
      "source": "SITADEL",
      "description": "Logements commencés pour 1000 hab",
      "type": "pct",
      "periodes": [
        "22_24"
      ],
      "short": "Tx commencés ‰",
      "medium": "Taux logements commencés pour 1000 hab",
      "long": "Logements commencés pour 1000 habitants (SITADEL)",
      "priority": 5,
      "polarity": 0,
      "symbol": ""
    },
    "logv_parc_vol": {
      "label": "Parc logements",
      "theme": "logv",
      "vartype": "vol",
      "unit": "nb",
      "source": "LOVAC",
      "description": "Parc total de logements (privés)",
      "type": "vol",
      "periodes": [
        "24"
      ],
      "short": "Parc privé",
      "medium": "Parc de logements privés (LOVAC)",
      "long": "Nombre de logements du parc privé (LOVAC)",
      "priority": 4,
      "polarity": 0,
      "symbol": ""
    },
    "logv_vacant_vol": {
      "label": "Logements vacants",
      "theme": "logv",
      "vartype": "vol",
      "unit": "nb",
      "source": "LOVAC",
      "description": "Nombre logements vacants",
      "type": "vol",
      "periodes": [
        "24"
      ],
      "short": "Vacants",
      "medium": "Logements vacants (LOVAC)",
      "long": "Nombre de logements vacants du parc privé (LOVAC)",
      "priority": 4,
      "polarity": -1,
      "symbol": ""
    },
    "logv_vac2ans_vol": {
      "label": "Vacance >2 ans",
      "theme": "logv",
      "vartype": "vol",
      "unit": "nb",
      "source": "LOVAC",
      "description": "Logements vacants depuis plus de 2 ans",
      "type": "vol",
      "periodes": [
        "24"
      ],
      "short": "Vacants >2 ans",
      "medium": "Logements vacants >2 ans (LOVAC)",
      "long": "Logements vacants depuis plus de 2 ans (LOVAC)",
      "priority": 4,
      "polarity": -1,
      "symbol": ""
    },
    "logv_vac2ans_vevol": {
      "label": "Évol vacance >2 ans",
      "theme": "logv",
      "vartype": "vevol",
      "unit": "△%",
      "source": "LOVAC",
      "description": "Évolution volume vacance >2 ans",
      "type": "vevol",
      "periodes": [
        "20_24"
      ],
      "short": "△ Vac. >2 ans %",
      "medium": "△ Évolution de la vacance longue",
      "long": "Evolution volume vacance >2 ans 2020-2024 (LOVAC)",
      "priority": 4,
      "polarity": -1,
      "symbol": "△"
    },
    "logs_logaut_vtcam": {
      "rawObsvACT": "logaut_vtcam",
      "label": "TCAM logements autorisés",
      "short": "△ Logts autorisés",
      "medium": "△ TCAM logements autorisés",
      "long": "TCAM logements autorisés (SITADEL)",
      "type": "vtcam",
      "unit": "%/an",
      "theme": "logs",
      "periodes": [
        "19_24",
        "22_24"
      ],
      "source": "SITADEL",
      "priority": 5,
      "polarity": 0,
      "symbol": "△"
    },
    "logs_logcom_vtcam": {
      "rawObsvACT": "logcom_vtcam",
      "label": "TCAM logements commencés",
      "short": "△ Logts commencés",
      "medium": "△ TCAM logements commencés",
      "long": "TCAM logements commencés (SITADEL)",
      "type": "vtcam",
      "unit": "%/an",
      "theme": "logs",
      "periodes": [
        "19_24",
        "22_24"
      ],
      "source": "SITADEL",
      "priority": 5,
      "polarity": 0,
      "symbol": "△"
    },
    "logd_px2_global": {
      "type": "vol",
      "unit": "€/m²",
      "periodes": [
        "24"
      ],
      "short": "Prix m² global",
      "medium": "Prix médian au m² tous biens",
      "long": "Prix moyen au m² pondéré maisons+apparts par volume transactions (DVF)",
      "source": "DVF",
      "theme": "logd",
      "priority": 3,
      "polarity": 0,
      "symbol": ""
    },
    "logd_px2_global_vevol": {
      "type": "vevol",
      "unit": "△%",
      "periodes": [
        "16_24",
        "19_24",
        "22_24"
      ],
      "short": "△ Prix global",
      "medium": "△ Évolution du prix global au m²",
      "long": "Evolution prix moyen pondéré maisons+apparts (DVF)",
      "source": "DVF",
      "theme": "logd",
      "priority": 3,
      "polarity": 0,
      "symbol": "△"
    },
    "logd_px2_global_ecfr": {
      "type": "ecfr",
      "unit": "% écart",
      "periodes": [
        "24"
      ],
      "short": "▲ Prix global FR",
      "medium": "Écart au prix national global",
      "long": "Écart au prix moyen national pondéré (DVF)",
      "source": "DVF",
      "theme": "logd",
      "priority": 3,
      "polarity": 0,
      "symbol": ""
    }
  },
  "mapping_observable_to_new": {
    "&comment": "Lookup rapide rawObsvACT → code indicateur",
    "tcam_pop": "dm_pop_vtcam",
    "tcam_sn": "dm_sn_vtcam",
    "tcam_sma": "dm_sma_vtcam",
    "pct_60plus": "dmv_60p_pct",
    "var_60plus": "dmv_60p_vdifp",
    "pct_75plus": "dmv_75p_pct",
    "var_75plus": "dmv_75p_vdifp",
    "iv": "dmv_iv_ind",
    "var_iv": "dmv_iv_vdifp",
    "pct_1519": "dm_1519_pct",
    "pct_2024": "dm_2024_pct",
    "pct_2539": "dm_2539_pct",
    "pct_4054": "dm_4054_pct",
    "pct_5564": "dm_5564_pct",
    "pct_6579": "dm_6579_pct",
    "pct_80p": "dm_80p_pct",
    "pct_6579_seul": "dmv_6579_seul_pct",
    "pct_80p_seul": "dmv_80p_seul_pct",
    "PE_pct": "dmf_pe_pct",
    "PS_pct": "dmf_ps_pct",
    "SM": "dmf_sm_stock",
    "TM": "dmf_tm_pct",
    "TR_pct": "dmf_tr_pct",
    "tcam_emp": "eco_emp_vtcam",
    "act1564": "eco_act1564_stock",
    "actocc1564": "eco_actocc1564_stock",
    "pct_actocc_artcom": "eco_actocc_artcom_pct",
    "pct_actocc_cadres": "eco_actocc_cadres_pct",
    "pct_actocc_profint": "eco_actocc_profint_pct",
    "pct_actocc_employes": "eco_actocc_employes_pct",
    "pct_actocc_ouvriers": "eco_actocc_ouvriers_pct",
    "pct_sal": "eco_sal_pct",
    "pct_nsal": "eco_nsal_pct",
    "txemp_1564": "eco_txemp_1564",
    "txemp_1524": "eco_txemp_1524",
    "txemp_2554": "eco_txemp_2554",
    "txemp_5564": "eco_txemp_5564",
    "pct_emp_pres": "eco_emp_pres_pct",
    "pct_emp_npres": "eco_emp_npres_pct",
    "pct_eff_petites": "eco_eff_petites_pct",
    "pct_eff_grandes": "eco_eff_grandes_pct",
    "pct_sect_agri": "eco_sectagri_pct",
    "pct_sect_indus": "eco_sectindus_pct",
    "pct_sect_const": "eco_sectconst_pct",
    "pct_sect_servi": "eco_sectservi_pct",
    "pct_sect_admin": "eco_sectadmin_pct",
    "krugman_a38": "eco_krugman_a38",
    "krugman_a21": "eco_krugman_a21",
    "krugman_a5": "eco_krugman_a5",
    "krugman_a5_vevol": "eco_krugman_a5_vevol",
    "pct_tpspart": "eco_emptpspart_pct",
    "vdifp_tpspart": "eco_emptpspart_vdifp",
    "txchom_1564": "soc_txchom_1564",
    "txchom_1524": "soc_txchom_1524",
    "txchom_2554": "soc_txchom_2554",
    "txchom_5564": "soc_txchom_5564",
    "txpauv_3039": "soc_txpauv_3039",
    "txpauv_loc": "soc_txpauv_loc",
    "pct_csp_agri": "dsp_csp_agri_pct",
    "pct_csp_artcom": "dsp_csp_artcom_pct",
    "pct_csp_cadres": "dsp_csp_cadres_pct",
    "pct_csp_profint": "dsp_csp_profint_pct",
    "pct_csp_employes": "dsp_csp_employes_pct",
    "pct_csp_ouvriers": "dsp_csp_ouvriers_pct",
    "pct_csp_retraites": "dsp_csp_retraites_pct",
    "pct_csp_inactifs": "dsp_csp_inactifs_pct",
    "pct_dipl_aucun": "dsp_dipl_aucun_pct",
    "pct_dipl_bepc": "dsp_dipl_bepc_pct",
    "pct_dipl_capbep": "dsp_dipl_capbep_pct",
    "pct_dipl_bac": "dsp_dipl_bac_pct",
    "pct_dipl_bac2": "dsp_dipl_bac2_pct",
    "pct_dipl_bac34": "dsp_dipl_bac34_pct",
    "pct_dipl_bac5p": "dsp_dipl_bac5p_pct",
    "pct_dipl_infbac": "dsp_dipl_infbac_pct",
    "pct_dipl_bacbac2": "dsp_dipl_bacbac2_pct",
    "pct_dipl_supbac2": "dsp_dipl_supbac2_pct",
    "menages": "men_tot_stock",
    "pct_men_seul": "men_seul_pct",
    "pct_men_fam": "men_fam_pct",
    "pct_men_coupsenf": "men_coupsenf_pct",
    "pct_men_coupaenf": "men_coupaenf_pct",
    "pct_men_mono": "men_mono_pct",
    "tcam_log": "log_tot_vtcam",
    "pct_logvac": "log_vac_pct",
    "var_logvac": "log_vac_vdifp",
    "pct_rsecocc": "log_ressec_pct",
    "var_rsecocc": "log_ressec_vdifp",
    "pct_appart": "log_appart_pct",
    "pct_maison": "log_maison_pct",
    "pct_prop": "log_prop_pct",
    "pct_loc": "log_loc_pct",
    "tcam_pxm2_mai": "log_pxmai_vtcam",
    "tcam_pxm2_apt": "log_pxapt_vtcam",
    "dens_pharma": "bpe_pharma_dens",
    "dens_medgen": "bpe_medgen_dens",
    "dens_infirm": "bpe_infirm_dens",
    "dens_boulang": "bpe_boulang_dens",
    "dens_superette": "bpe_superette_dens",
    "dens_supermarche": "bpe_supermarche_dens",
    "dens_biblio": "bpe_biblio_dens",
    "dens_coiffeur": "bpe_coiffeur_dens"
  },
  "formules_reference": {
    "&comment": "Formules de calcul extraites des scripts R",
    "tcam": "TCAM = ((V_fin / V_debut)^(1/n) - 1) × 100",
    "decomposition_sn_sma": {
      "principe": "tcam_pop = tcam_sn + tcam_sma",
      "tcam_sn": "(SN / evol_pop) × tcam_pop, où evol_pop = P_fin - P_debut",
      "tcam_sma": "tcam_pop - tcam_sn"
    },
    "taux_emploi": "(ACT - CHOM) / POP × 100",
    "taux_chomage": "CHOM / ACT × 100",
    "migcom": {
      "nb_ind_PRES": "ISO + ENTR (population présente)",
      "nb_ind_AUTO": "ISO + SORT (population autochtone)",
      "PE_pct": "ENTR / PRES × 100",
      "PS_pct": "SORT / AUTO × 100",
      "SM": "ENTR - SORT",
      "TM": "(ENTR - SORT) / ((AUTO + PRES) / 2) × 100",
      "TR_pct": "(ENTR + SORT) / ((AUTO + PRES) / 2) × 100"
    },
    "densite_bpe": "NB_EQUIPEMENT / POP × 10000"
  }
};

// === PERIODES (converties: 11_16 → 1116) ===
export const PERIODES = {};
for (const [key, val] of Object.entries(DDICT.periodes || {})) {
  if (key.startsWith("&")) continue;
  const jsonKey = key.replace("_", "");
  PERIODES[jsonKey] = {
    short: val.short,
    long: val.long,
    duree: val.duree || 0,
    type: val.type || "evolution"
  };
}

// === THEMES ===
export const THEMES = {};
for (const [key, val] of Object.entries(DDICT.themes || {})) {
  THEMES[key] = { label: val.label, ordre: val.ordre };
}

// === INDICATEURS ===
export const INDICATEURS = {};
for (const [key, val] of Object.entries(DDICT.indicateurs || {})) {
  if (key.startsWith("&")) continue;
  INDICATEURS[key] = {
    short: val.short,
    medium: val.medium,
    long: val.long || val.medium,
    type: val.type,
    unit: val.unit,
    theme: val.theme,
    ordre: val.ordre,
    priority: val.priority || 5,
    polarity: val.polarity || 0,
    symbol: val.symbol || "",
    definition: val.definition || "",
    note: val.note || "",
    source: val.source,
    formula: val.formula,
    periodes: val.periodes || [],
    volets: val.volets || [],
    agg_dash: val.agg_dash || false,
    agg_ecodash: val.agg_ecodash || false,
    agg_logdash: val.agg_logdash || false
  };
}

// === DROPDOWN OPTIONS (groupées par thème) ===
export function getIndicOptions() {
  const options = [];
  const sortedThemes = Object.entries(THEMES).sort((a, b) => a[1].ordre - b[1].ordre);
  for (const [themeKey, themeInfo] of sortedThemes) {
    options.push([`── ${themeInfo.label} ──`, `__sep_${themeKey}__`]);
    const themeIndics = Object.entries(INDICATEURS)
      .filter(([k, v]) => v.theme === themeKey)
      .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));
    for (const [indicKey, indicInfo] of themeIndics) {
      options.push([indicInfo.medium, indicKey]);
    }
  }
  return new Map(options);
}

// Alias pour compatibilité ancien code
export const getDropdownOptions = getIndicOptions;
export function getIndicateurOptions() {
  return new Map(Object.entries(INDICATEURS).map(([k, v]) => [v.medium, k]));
}

// === DROPDOWN OPTIONS BY AGG FLAGS ===
// aggFlag: "dash" (défaut), "ecodash" ou "logdash"
// filterVolet: null = tous, "exdc" = agg_dash ET v_exdc (pour filtrage futur)
export function getIndicOptionsByAggDash(filterVolet = null, noSeparators = false, aggFlag = "dash") {
  const options = [];
  const sortedThemes = Object.entries(THEMES).sort((a, b) => a[1].ordre - b[1].ordre);
  for (const [themeKey, themeInfo] of sortedThemes) {
    const themeIndics = Object.entries(INDICATEURS)
      .filter(([k, v]) => {
        if (v.theme !== themeKey) return false;
        // Check agg flag (agg_dash, agg_ecodash ou agg_logdash)
        let aggProp;
        if (aggFlag === "ecodash") {
          aggProp = v.agg_ecodash;
        } else if (aggFlag === "logdash") {
          aggProp = v.agg_logdash;
        } else {
          aggProp = v.agg_dash;
        }
        if (!aggProp) return false;
        // Filtrage volet optionnel (pour usage futur)
        if (filterVolet) {
          const volets = Array.isArray(v.volets) ? v.volets : (v.volets ? [v.volets] : []);
          if (!volets.includes(filterVolet)) return false;
        }
        return true;
      })
      .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));
    if (themeIndics.length > 0) {
      if (!noSeparators) {
        options.push([`── ${themeInfo.label} ──`, `__sep_${themeKey}__`]);
      }
      for (const [indicKey, indicInfo] of themeIndics) {
        options.push([indicInfo.medium, indicKey]);
      }
    }
  }
  return new Map(options);
}

// Alias pour dashboard éco
export function getIndicOptionsByAggEcodash(filterVolet = null, noSeparators = false) {
  return getIndicOptionsByAggDash(filterVolet, noSeparators, "ecodash");
}

// Alias pour dashboard logement
export function getIndicOptionsByAggLogdash(filterVolet = null, noSeparators = false) {
  return getIndicOptionsByAggDash(filterVolet, noSeparators, "logdash");
}

// === DROPDOWN OPTIONS BY VOLET (filtré par page) ===
// volet: "exd", "exdc", "exdf", "exdl", "exde", "ecodash"
// noSeparators: true pour désactiver les séparateurs de thèmes
// STRICT: seuls les indicateurs avec volet explicite sont affichés (volets vide = pas affiché)
export function getIndicOptionsByVolet(volet, availableCols = null, noSeparators = false) {
  const options = [];
  const sortedThemes = Object.entries(THEMES).sort((a, b) => a[1].ordre - b[1].ordre);
  for (const [themeKey, themeInfo] of sortedThemes) {
    const themeIndics = Object.entries(INDICATEURS)
      .filter(([k, v]) => {
        // Vérifier volet (support array ou string)
        const volets = Array.isArray(v.volets) ? v.volets : (v.volets ? [v.volets] : []);
        return v.theme === themeKey && volets.includes(volet);
      })
      .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));
    if (themeIndics.length > 0) {
      if (!noSeparators) {
        options.push([`── ${themeInfo.label} ──`, `__sep_${themeKey}__`]);
      }
      for (const [indicKey, indicInfo] of themeIndics) {
        options.push([indicInfo.medium, indicKey]);
      }
    }
  }
  return new Map(options);
}

// === DROPDOWN OPTIONS ALL (ancien mode: tous indicateurs) ===
export function getIndicOptionsAll() {
  const options = [];
  const sortedThemes = Object.entries(THEMES).sort((a, b) => a[1].ordre - b[1].ordre);
  for (const [themeKey, themeInfo] of sortedThemes) {
    const themeIndics = Object.entries(INDICATEURS)
      .filter(([k, v]) => v.theme === themeKey)
      .sort((a, b) => (a[1].ordre || 99) - (b[1].ordre || 99));
    if (themeIndics.length > 0) {
      options.push([`── ${themeInfo.label} ──`, `__sep_${themeKey}__`]);
      for (const [indicKey, indicInfo] of themeIndics) {
        options.push([indicInfo.medium, indicKey]);
      }
    }
  }
  return new Map(options);
}

// === FORMAT VALUE ===
export function formatValue(indicKey, value) {
  if (value == null || isNaN(value)) return "—";
  // Parser si colKey complet (dm_pop_vtcam_1622)
  const { indic } = parseColKey(indicKey);
  const indicator = INDICATEURS[indic] || INDICATEURS[indicKey];
  if (!indicator) return String(value);
  const type = indicator.type;
  const unit = indicator.unit || "";
  if (type === "vtcam" || type === "vdifp" || type === "diff") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}${unit}`;
  }
  if (type === "pct" || type === "tx") return `${value.toFixed(1)}${unit}`;
  if (type === "vol" || type === "stock") return value.toLocaleString("fr-FR");
  if (type === "ratio" || type === "ind") return value.toFixed(1);
  return value.toFixed(2);
}

// === PARSE COL KEY ===
// dm_pop_vtcam_1622 → { indic: "dm_pop_vtcam", periode: "1622" }
// Utilise lookup PERIODES (dynamique, pas de regex figée)
export function parseColKey(colKey) {
  if (!colKey || typeof colKey !== "string") return { indic: colKey, periode: null };
  const lastUnderscore = colKey.lastIndexOf("_");
  if (lastUnderscore === -1) return { indic: colKey, periode: null };
  const suffix = colKey.slice(lastUnderscore + 1);
  if (PERIODES[suffix]) return { indic: colKey.slice(0, lastUnderscore), periode: suffix };
  return { indic: colKey, periode: null };
}

// === GET COL LABEL ===
export function getColLabel(colKeyOrIndic, periodeKey = null, format = "medium") {
  // Support nouveau format (colKey complet)
  if (!periodeKey || typeof periodeKey === "string" && periodeKey.length > 6) {
    const { indic, periode } = parseColKey(colKeyOrIndic);
    const indicInfo = INDICATEURS[indic];
    const periodeInfo = PERIODES[periode];
    const indicLabel = indicInfo?.[format] || indicInfo?.medium || indic;
    const periodeLabel = periodeInfo?.short || periode || "";
    return periodeLabel ? `${indicLabel} ${periodeLabel}` : indicLabel;
  }
  // Support ancien format (indicKey, periodeKey séparés)
  const indicInfo = INDICATEURS[colKeyOrIndic];
  const periodeInfo = PERIODES[periodeKey];
  const indicLabel = indicInfo?.short || colKeyOrIndic;
  const periodeLabel = periodeInfo?.short || periodeKey || "";
  return periodeLabel ? `${indicLabel} ${periodeLabel}` : indicLabel;
}

// === GET COL LABEL FULL (wrapper) ===
export function getColLabelFull(colKey) {
  const { indic, periode } = parseColKey(colKey);
  return getColLabel(indic, periode);
}

// === TITRE CARTE ===
export function getTitreMap(indicKey, periodeKey) {
  const indic = INDICATEURS[indicKey];
  const per = PERIODES[periodeKey];
  if (!indic) return indicKey;
  const perLabel = per?.long || periodeKey || "";
  return perLabel ? `${indic.medium} ${perLabel}` : indic.medium;
}

// === SOUS-TITRE CARTE ===
export function getSousTitreMap(indicKey, echelon) {
  const indic = INDICATEURS[indicKey];
  if (!indic) return "";
  return `${indic.unit || ""} · par ${echelon.toLowerCase()}`;
}

// === GET SOURCE ===
export function getSource(indicKey) {
  return INDICATEURS[indicKey]?.source || "INSEE";
}

// === GET TOOLTIP ===
export function getTooltip(indicKey) {
  const indic = INDICATEURS[indicKey];
  if (!indic) return "";
  if (indic.definition) {
    return `${indic.definition}${indic.note ? "\n" + indic.note : ""}`;
  }
  return `${indic.long || indic.medium}\nSource: ${indic.source || "INSEE"}`;
}

// === GET DEFINITION ===
export function getDefinition(indicKey) {
  return INDICATEURS[indicKey]?.definition || "";
}

// === GET NOTE ===
export function getNote(indicKey) {
  return INDICATEURS[indicKey]?.note || "";
}

// === GET INDICATOR TYPE ===
export function getIndicatorType(colKey) {
  const { indic } = parseColKey(colKey);
  return INDICATEURS[indic]?.type || INDICATEURS[colKey]?.type || "vtcam";
}

// === MAKE QUANTILE BINS ===
export function makeQuantileBins(data, indicateur) {
  // Colonnes possibles (nouvelle convention: 1622, pas 16_22)
  const possibleCols = [
    `${indicateur}_1116`,
    `${indicateur}_1622`,
    `${indicateur}_1623`,
    `${indicateur}_1122`,
    `${indicateur}_22`,
    `${indicateur}_16`,
    `${indicateur}_11`
  ];

  // Ne garder que les colonnes existantes avec données
  const existingCols = possibleCols.filter(col =>
    data.some(d => d[col] != null && !isNaN(d[col]))
  );

  // Combiner toutes les valeurs
  const allValues = existingCols
    .flatMap(col => data.map(d => d[col]))
    .filter(v => v != null && !isNaN(v))
    .sort((a, b) => a - b);

  if (allValues.length === 0) {
    return {
      thresholds: [-1.5, -1, -0.5, 0, 0.5, 1, 1.5],
      labels: ["< -1.5", "-1.5 à -1.0", "-1.0 à -0.5", "-0.5 à 0", "0 à 0.5", "0.5 à 1.0", "1.0 à 1.5", "> 1.5"]
    };
  }

  // Détecter si séquentiel ou divergent
  const indicType = getIndicatorType(indicateur);
  const hasNegatives = allValues.some(v => v < 0);
  const hasPositives = allValues.some(v => v > 0);
  const isSequential = indicType === "pct" || indicType === "tx" || !hasNegatives || !hasPositives;

  const indic = INDICATEURS[indicateur];
  const unit = indic?.unit || "%/an";

  if (isSequential) {
    const quantiles = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
    const thresholds = quantiles.map(q => d3.quantile(allValues, q));
    const labels = [
      `< ${thresholds[0].toFixed(1)}${unit}`,
      `${thresholds[0].toFixed(1)} à ${thresholds[1].toFixed(1)}`,
      `${thresholds[1].toFixed(1)} à ${thresholds[2].toFixed(1)}`,
      `${thresholds[2].toFixed(1)} à ${thresholds[3].toFixed(1)}`,
      `${thresholds[3].toFixed(1)} à ${thresholds[4].toFixed(1)}`,
      `${thresholds[4].toFixed(1)} à ${thresholds[5].toFixed(1)}`,
      `${thresholds[5].toFixed(1)} à ${thresholds[6].toFixed(1)}`,
      `> ${thresholds[6].toFixed(1)}${unit}`
    ];
    return { thresholds, labels };
  }

  // Mode divergent : split autour de 0
  const negValues = allValues.filter(v => v < 0);
  const posValues = allValues.filter(v => v >= 0);

  const negQuantiles = negValues.length > 0
    ? [d3.quantile(negValues, 0.25), d3.quantile(negValues, 0.5), d3.quantile(negValues, 0.75)]
    : [-0.75, -0.5, -0.25];

  const posQuantiles = posValues.length > 0
    ? [d3.quantile(posValues, 0.25), d3.quantile(posValues, 0.5), d3.quantile(posValues, 0.75)]
    : [0.25, 0.5, 0.75];

  const thresholds = [...negQuantiles, 0, ...posQuantiles];
  const labels = [
    `< ${thresholds[0].toFixed(2)}${unit}`,
    `${thresholds[0].toFixed(2)} à ${thresholds[1].toFixed(2)}`,
    `${thresholds[1].toFixed(2)} à ${thresholds[2].toFixed(2)}`,
    `${thresholds[2].toFixed(2)} à 0`,
    `0 à ${thresholds[4].toFixed(2)}`,
    `${thresholds[4].toFixed(2)} à ${thresholds[5].toFixed(2)}`,
    `${thresholds[5].toFixed(2)} à ${thresholds[6].toFixed(2)}`,
    `> ${thresholds[6].toFixed(2)}${unit}`
  ];

  return { thresholds, labels };
}

// === COUNT BINS ===
export function countBins(data, field, thresholds) {
  const counts = new Array(8).fill(0);
  data.forEach(d => {
    const v = d[field];
    if (v == null) return;
    const idx = thresholds.findIndex(t => v < t);
    counts[idx === -1 ? 7 : idx]++;
  });
  return counts;
}

