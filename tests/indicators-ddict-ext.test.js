import { describe, it, expect } from "vitest";
import { isValidPeriode, parseColKey, getDecimalsForType } from "../src/helpers/indicators-ddict-ext.js";

// &s TESTS_ISVALIDPERIODE — Validation codes périodes
describe("isValidPeriode", () => {
  // Snapshots annuels valides (2 chiffres, 2010-2030)
  it("accepte les snapshots annuels valides", () => {
    expect(isValidPeriode("11")).toBe(true);  // 2011
    expect(isValidPeriode("16")).toBe(true);  // 2016
    expect(isValidPeriode("22")).toBe(true);  // 2022
    expect(isValidPeriode("24")).toBe(true);  // 2024
    expect(isValidPeriode("30")).toBe(true);  // borne haute
    expect(isValidPeriode("10")).toBe(true);  // borne basse
  });

  // Évolutions inter-censitaires valides (4 chiffres, début < fin)
  it("accepte les évolutions valides", () => {
    expect(isValidPeriode("1116")).toBe(true);  // 2011-2016
    expect(isValidPeriode("1622")).toBe(true);  // 2016-2022
    expect(isValidPeriode("1924")).toBe(true);  // 2019-2024
    expect(isValidPeriode("1623")).toBe(true);  // 2016-2023
  });

  // Rejets attendus
  it("rejette les snapshots hors plage", () => {
    expect(isValidPeriode("09")).toBe(false);   // avant 2010
    expect(isValidPeriode("31")).toBe(false);   // après 2030
    expect(isValidPeriode("00")).toBe(false);
    expect(isValidPeriode("99")).toBe(false);
  });

  it("rejette les évolutions incohérentes (début >= fin)", () => {
    expect(isValidPeriode("2216")).toBe(false);  // fin < début
    expect(isValidPeriode("1616")).toBe(false);  // début = fin
  });

  it("rejette les entrées non-string et vides", () => {
    expect(isValidPeriode(null)).toBe(false);
    expect(isValidPeriode(undefined)).toBe(false);
    expect(isValidPeriode("")).toBe(false);
    expect(isValidPeriode(1622)).toBe(false);  // number, pas string
  });

  it("rejette les formats invalides", () => {
    expect(isValidPeriode("abc")).toBe(false);
    expect(isValidPeriode("162")).toBe(false);    // 3 chiffres
    expect(isValidPeriode("16222")).toBe(false);  // 5 chiffres
    expect(isValidPeriode("16_22")).toBe(false);  // underscore (format CSV, pas JS)
  });
});
// &e

// &s TESTS_PARSECOLKEY — Décomposition clé colonne
describe("parseColKey", () => {
  // Cas standards du pipeline ptod
  it("parse les indicateurs TCAM classiques", () => {
    expect(parseColKey("dm_pop_vtcam_1622")).toEqual({ indic: "dm_pop_vtcam", periode: "1622" });
    expect(parseColKey("dm_pop_vtcam_1116")).toEqual({ indic: "dm_pop_vtcam", periode: "1116" });
    expect(parseColKey("dm_sma_vtcam_1622")).toEqual({ indic: "dm_sma_vtcam", periode: "1622" });
  });

  it("parse les indicateurs snapshot", () => {
    expect(parseColKey("rev_med_21")).toEqual({ indic: "rev_med", periode: "21" });
    expect(parseColKey("logd_px2_global_24")).toEqual({ indic: "logd_px2_global", periode: "24" });
  });

  it("parse les indicateurs à 5+ segments (DVF)", () => {
    // Cas clé : logd_px2_global_vevol_1924 — le suffix "1924" est la période
    expect(parseColKey("logd_px2_global_vevol_1924")).toEqual({ indic: "logd_px2_global_vevol", periode: "1924" });
  });

  it("parse les pourcentages et différences", () => {
    expect(parseColKey("dmf_pe_pct_22")).toEqual({ indic: "dmf_pe_pct", periode: "22" });
    expect(parseColKey("eco_emp_vdifp_1622")).toEqual({ indic: "eco_emp_vdifp", periode: "1622" });
  });

  // Colonnes sans période (stocks INSEE, codes geo)
  it("retourne periode=null pour les colonnes sans période", () => {
    expect(parseColKey("P22_POP")).toEqual({ indic: "P22_POP", periode: null });
    expect(parseColKey("code")).toEqual({ indic: "code", periode: null });
    expect(parseColKey("libelle")).toEqual({ indic: "libelle", periode: null });
  });

  // Edge cases
  it("gère les entrées null/undefined/vides", () => {
    expect(parseColKey(null)).toEqual({ indic: null, periode: null });
    expect(parseColKey(undefined)).toEqual({ indic: undefined, periode: null });
    expect(parseColKey("")).toEqual({ indic: "", periode: null });
  });

  it("ne confond pas un suffixe numérique non-période avec une période", () => {
    // "dens3" → le "3" n'est pas un code période valide
    expect(parseColKey("dens3")).toEqual({ indic: "dens3", periode: null });
  });
});
// &e

// &s TESTS_GETDECIMALSFORTYPE — Décimales selon type indicateur
describe("getDecimalsForType", () => {
  it("retourne 2 décimales pour vtcam et vevol", () => {
    expect(getDecimalsForType("vtcam")).toBe(2);
    expect(getDecimalsForType("vevol")).toBe(2);
  });

  it("retourne 1 décimale pour pct, tx, vdifp", () => {
    expect(getDecimalsForType("pct")).toBe(1);
    expect(getDecimalsForType("tx")).toBe(1);
    expect(getDecimalsForType("vdifp")).toBe(1);
  });

  it("retourne 0 décimale pour ind/ratio >= 10", () => {
    expect(getDecimalsForType("ind", 150)).toBe(0);
    expect(getDecimalsForType("ratio", 10)).toBe(0);
  });

  it("retourne 1 décimale pour ind/ratio < 10", () => {
    expect(getDecimalsForType("ind", 3.5)).toBe(1);
    expect(getDecimalsForType("ratio", 0.8)).toBe(1);
  });

  it("retourne 1 par défaut pour ind/ratio sans valeur", () => {
    expect(getDecimalsForType("ind")).toBe(1);
    expect(getDecimalsForType("ratio")).toBe(1);
  });

  it("retourne 2 pour tout type inconnu", () => {
    expect(getDecimalsForType("vol")).toBe(2);
    expect(getDecimalsForType("unknown")).toBe(2);
  });
});
// &e
