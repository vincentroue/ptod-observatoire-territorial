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
  "dm_pop_vevol",
  // Démographie — Immigration
  "dm_imm_pct",
  "dm_imm_pct_vdifp",
  "dm_etr_pct",
  // Flux migratoires
  "dmf_sma_vtcam",
  "dmf_tr_pct",
  // CSP / Diplômes (composantes idx gentri + marqueurs sociaux)
  "dsp_csp_cadres",
  "dsp_csp_cadres_pct",
  "dsp_csp_cadres_vdifp",
  "dsp_csp_ouvriers",
  "dsp_csp_ouvriers_pct",
  "dsp_csp_emplo",
  "dsp_csp_pi",
  "dsp_dipl_sup",
  "dsp_dipl_sup_pct",
  // Logement RP (composantes idx gentri + tensions)
  "log_emmenrec",
  "log_emmenrec_pct",
  "log_prop",
  "log_prop_pct",
  "log_loc",
  "log_loc_pct",
  "log_vac",
  "log_hlm",
  "log_surocc",
  "log_surocc_pct",
  // DVF prix (composantes idx gentri)
  "logd_px2_glb",
  "logd_px2_glb_vevol",
  "logd_px2mm3_appt",
  "logd_nb_ventes",
  "logd_pxmoisrev",
  // Revenus / Pauvreté (composantes idx gentri + inégalités)
  "rev_med",
  "rev_med_vevol",
  "rev_txpauv",
  "rev_d1",
  "rev_d9",
  "rev_ird9d1",
  "rev_prestasoc",
  // Chômage
  "soc_txchom_1564",
  "soc_txchom_1524",
  // Ménages
  "men_1pers",
  "men_mono_pct",
  // SIRENE Économie locale (clés = parseColKey().indic, sans suffixe _26)
  "ecosi_etab_vol",
  "ecosi_etabrec_pct",
  "ecosi_einonemp_pct",
  "ecosi_renouv_horsmE_pct",
  "ecosi_shannon_ind",
  "ecosi_nafdom_cat",
  "ecosi_nafdomql_ind",
  "ecosi_etab_denspop",
]);

// &e WHITELIST

// &e
