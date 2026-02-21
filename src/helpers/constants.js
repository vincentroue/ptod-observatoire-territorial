// ============================================================
// &s CONSTANTS — Constantes partagées entre volets
// ============================================================
// Date: 2026-01-19
// Centralise les constantes utilisées dans plusieurs fichiers
//
// Exports:
// - PARIS_CODES : codes Paris par échelon (zoom défaut)
// - DEFAULT_TABLE_INDICS : indicateurs tableau par défaut
// - ECHELONS_SIDEBAR : liste échelons pour radio buttons
// ============================================================

// Codes Paris par échelon pour zoom par défaut cohérent
export const PARIS_CODES = {
  "Zone d'emploi": '1109', // ZE Paris
  Département: '75', // DEP Paris
  Région: '11', // Île-de-France
  EPCI: '200054781', // Métropole Grand Paris
  "Aire d'attraction": '001', // AAV Paris
  'Bassin de vie': '75056', // BV Paris
  'Unité urbaine': '00851', // UU Paris
};

/**
 * Retourne le code Paris pour un échelon (fallback "75")
 * @param {string} echelon - Nom échelon
 * @returns {string} Code Paris pour cet échelon
 */
export function getDefaultZoomCode(echelon) {
  return PARIS_CODES[echelon] || '75';
}

// Indicateurs clés affichés par défaut dans tableau (allégé)
// Format: nom indicateur sans période (la période par défaut sera ajoutée)
export const DEFAULT_TABLE_INDICS = [
  'dm_pop_vtcam', // Évol population
  'eco_emp_vtcam', // Évol emploi
  'dm_sma_vtcam', // Solde migratoire apparent
  'dmv_iv_ind', // Indice vieillissement
  'dsp_csp_cadres_vdifp', // Hausse part cadres sup
  'rev_med', // Revenu médian
  'log_ressec_pct', // Part résidence secondaire
  'logd_px2q2_mai', // Prix maison médian
];

// Indicateurs par défaut pour volet ECO (ZE)
// Format: nom indicateur sans période (la période par défaut sera ajoutée)
export const DEFAULT_ECO_TABLE_INDICS = [
  'eco_emp_vtcam',      // TCAM emploi total (RP)
  'eco_emppriv_vtcam',  // TCAM emploi privé (URSSAF)
  'eco_txemp_1564',     // Taux d'emploi 15-64 ans
  'eco_krugman_a5',     // Indice Krugman (spécialisation)
  'eco_emp_pres_pct',   // Part emploi présentiel (FLORES)
];

// Liste échelons pour sidebar radio buttons
// Ordre : Département par défaut, puis les autres
export const ECHELONS_SIDEBAR = [
  'Département',
  "Zone d'emploi",
  'Région',
  'EPCI',
  "Aire d'attraction",
  // "Bassin de vie" retiré (peu utilisé)
];

// Échelons avec géographie disponible (TopoJSON)
export const ECHELONS_WITH_GEO = [
  "Zone d'emploi",
  'Département',
  'Région',
  'EPCI',
  "Aire d'attraction",
  // "Bassin de vie" - disabled pour perf
];

// Échelons pour volet Attractivité
export const ECHELONS_ATTRACT = [
  "Zone d'emploi",
  'Département',
  'Région',
  'EPCI',
  "Aire d'attraction",
  'Commune'
];

// Indicateurs par défaut pour volet Attractivité (tab Libre)
export const DEFAULT_ATTRACT_TABLE_INDICS = [
  'idxresid_dyn_ind',
  'idxeco_soc_ind',
  'idxgentri_ind',
  'idxlogtens_ind',
  'idxeco_tot_ind',
];

// Seuil population minimum par défaut pour tableau communes
export const MIN_POP_DEFAULT = 10000;

// Taille page tableau par défaut
export const PAGE_SIZE_DEFAULT = 200;

// Couleurs densité territoriale pour scatter plots (palette classique orange-jaune-vert)
// 1=Urbain dense (orange), 2=Urbain intermédiaire (jaune doré), 3=Rural (vert)
export const DENS_COLORS = { "1": "#e67e22", "2": "#f4c542", "3": "#27ae60" };
export const DENS_LABELS = { "1": "Urbain dense", "2": "Urbain interméd.", "3": "Rural" };

// Sections sidebar pour volet Fiche Territoire
export const SIDEBAR_SECTIONS_DTERR = [
  { id: 'region', title: 'Région', hint: 'Sélectionnez une région' },
  { id: 'epci', title: 'EPCI', hint: 'Puis un EPCI' },
  { id: 'commune', title: 'Commune', hint: null },
  { id: 'options', title: 'Options', hint: null }
];

// Indicateurs pour le tableau fiche territoire, groupés par thème
export const FICHE_INDICS = {
  dm: ['dm_pop_vtcam', 'dm_sn_vtcam', 'dm_sma_vtcam'],
  dmv: ['dmv_iv_ind', 'dmv_60p_pct', 'dmv_75p_pct'],
  dmf: ['dmf_pe_pct', 'dmf_ps_pct', 'dmf_tr_pct'],
  eco: ['eco_emp_vtcam', 'eco_txemp_1564', 'eco_emppriv_vtcam'],
  soc: ['soc_txchom_1564', 'dsp_csp_cadres_pct', 'dsp_dipl_supbac2_pct'],
  men: ['men_coupsenf_pct', 'men_mono_pct'],
  log: ['log_prop_pct', 'log_vac_pct', 'log_ressec_pct'],
  logd: ['logd_px2q2_mai', 'logd_px2_global_vevol_1924'],
  rev: ['rev_med', 'rev_txpauv']
};

// &e
