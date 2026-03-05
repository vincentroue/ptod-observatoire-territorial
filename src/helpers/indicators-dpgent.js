// &s DPGENT_INDICS_aaMAIN - Config indicateurs volet gentrification IRIS
// Fichier dédié dpgent — persiste hors pipeline R (pas auto-généré)

// &s WHITELIST - Indicateurs autorisés dropdown dpgent
// Liste curatée pour le volet gentrification IRIS (Paris+PC, Marseille)
// Modifier ici pour ajouter/retirer des indicateurs du dropdown
// Clés de base (sans suffixe période) — matchées via parseColKey().indic

export const PGENT_ALLOWED_INDICS = new Set([
  // Démographie
  "dm_pop_vtcam",
  "dm_pop_vol",
  // Flux migratoires
  "dmf_sma_vtcam",
  "dmf_tr_pct",
  // CSP / Diplômes
  "dsp_csp_cadres",
  "dsp_csp_ouvriers",
  "dsp_csp_emplo",
  "dsp_csp_pi",
  "dsp_dipl_sup",
  // Logement RP
  "log_emmenrec",
  "log_prop",
  "log_loc",
  "log_vac",
  "log_hlm",
  // DVF prix
  "logd_px2_glb",
  "logd_px2mm3_appt",
  "logd_nb_ventes",
  "logd_pxmoisrev",
  // Revenus
  "rev_med",
  "rev_txpauv",
  // Ménages
  "men_1pers",
  // SIRENE Économie locale (clés = parseColKey().indic, sans suffixe _26)
  "ecosi_etab_vol",
  "ecosi_etabrec_pct",
  "ecosi_einonemp_pct",
  "ecosi_renouv_horsmE_pct",
  "ecosi_shannon_ind",
  "ecosi_nbdiv_vol",
  "ecosi_equit_ind",
  "ecosi_nafdom_cat",
  "ecosi_nafdomql_ind",
  "ecosi_etab_denspop",
]);

// &e WHITELIST

// &e
