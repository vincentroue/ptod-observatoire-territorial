import { describe, it, expect } from "vitest";
import { calcIS, calcPercentile, supportsIS, getISColor, formatIS, calcRank } from "../src/helpers/calculate.js";

// &s TESTS_CALCIS — Indice de Spécificité
describe("calcIS", () => {
  it("calcule correctement le ratio valeur/référence", () => {
    expect(calcIS(100, 80)).toBeCloseTo(1.25);    // surreprésentation
    expect(calcIS(50, 100)).toBeCloseTo(0.5);      // sous-représentation
    expect(calcIS(100, 100)).toBeCloseTo(1.0);     // parité
  });

  it("retourne null si référence = 0 (division par zéro)", () => {
    expect(calcIS(100, 0)).toBeNull();
  });

  it("retourne null si value ou reference est null/undefined", () => {
    expect(calcIS(null, 100)).toBeNull();
    expect(calcIS(100, null)).toBeNull();
    expect(calcIS(null, null)).toBeNull();
    expect(calcIS(undefined, 100)).toBeNull();
  });
});
// &e

// &s TESTS_CALCPERCENTILE — Rang dans la distribution
describe("calcPercentile", () => {
  const dist = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  it("calcule le percentile sur une distribution simple", () => {
    expect(calcPercentile(50, dist)).toBe(40);   // 4 valeurs < 50 sur 10
    expect(calcPercentile(10, dist)).toBe(0);    // aucune valeur < 10
    expect(calcPercentile(100, dist)).toBe(90);  // 9 valeurs < 100
  });

  it("gère les valeurs extrêmes hors distribution", () => {
    expect(calcPercentile(0, dist)).toBe(0);     // en dessous de tout
    expect(calcPercentile(200, dist)).toBe(100); // au dessus de tout
  });

  it("retourne null si valeur ou tableau invalide", () => {
    expect(calcPercentile(null, dist)).toBeNull();
    expect(calcPercentile(50, null)).toBeNull();
    expect(calcPercentile(50, [])).toBeNull();
  });

  it("filtre les null dans la distribution", () => {
    const withNulls = [10, null, 30, null, 50];
    expect(calcPercentile(30, withNulls)).toBe(Math.round(1 / 3 * 100)); // 1 valeur < 30 sur 3
  });

  it("retourne null si distribution entièrement null", () => {
    expect(calcPercentile(50, [null, null, null])).toBeNull();
  });
});
// &e

// &s TESTS_SUPPORTSIS — Éligibilité mode IS
describe("supportsIS", () => {
  it("accepte les pourcentages (_pct)", () => {
    expect(supportsIS("dmf_pe_pct_22")).toBe(true);
    expect(supportsIS("eco_txact_pct_22")).toBe(true);
  });

  it("rejette les TCAM (_vtcam)", () => {
    expect(supportsIS("dm_pop_vtcam_1622")).toBe(false);
  });

  it("rejette les volumes bruts (_vol)", () => {
    expect(supportsIS("dm_pop_vol_22")).toBe(false);
  });

  it("rejette les indices composites (_ind)", () => {
    expect(supportsIS("idxresid_dyn_ind")).toBe(false);
  });

  it("rejette les stocks (_stock)", () => {
    expect(supportsIS("log_vac_stock_22")).toBe(false);
  });

  it("retourne false pour null/undefined/vide", () => {
    expect(supportsIS(null)).toBe(false);
    expect(supportsIS(undefined)).toBe(false);
    expect(supportsIS("")).toBe(false);
  });
});
// &e

// &s TESTS_GETISCOLOR — Couleurs seuils IS
describe("getISColor", () => {
  it("retourne vert foncé pour forte surreprésentation (>1.5)", () => {
    expect(getISColor(2.0)).toBe("#15803d");
  });

  it("retourne vert pour surreprésentation (1.2-1.5)", () => {
    expect(getISColor(1.3)).toBe("#22c55e");
  });

  it("retourne violet foncé pour forte sous-représentation (<0.5)", () => {
    expect(getISColor(0.3)).toBe("#6d28d9");
  });

  it("retourne violet pour sous-représentation (0.5-0.8)", () => {
    expect(getISColor(0.6)).toBe("#a855f7");
  });

  it("retourne gris foncé pour valeur neutre (0.8-1.2)", () => {
    expect(getISColor(1.0)).toBe("#374151");
  });

  it("retourne gris pour null", () => {
    expect(getISColor(null)).toBe("#9ca3af");
  });
});
// &e

// &s TESTS_CALCRANK — Classement territoire
describe("calcRank", () => {
  const data = [
    { code: "A", val: 30 },
    { code: "B", val: 10 },
    { code: "C", val: 50 },
    { code: "D", val: 40 },
  ];

  it("classe en ordre décroissant par défaut", () => {
    expect(calcRank("C", data, "val")).toBe(1);   // 50 = 1er
    expect(calcRank("D", data, "val")).toBe(2);   // 40 = 2ème
    expect(calcRank("A", data, "val")).toBe(3);   // 30 = 3ème
    expect(calcRank("B", data, "val")).toBe(4);   // 10 = 4ème
  });

  it("classe en ordre croissant si demandé", () => {
    expect(calcRank("B", data, "val", false)).toBe(1);  // 10 = 1er croissant
    expect(calcRank("C", data, "val", false)).toBe(4);  // 50 = dernier croissant
  });

  it("retourne null si code introuvable", () => {
    expect(calcRank("Z", data, "val")).toBeNull();
  });

  it("ignore les lignes avec valeur null", () => {
    const withNull = [...data, { code: "E", val: null }];
    expect(calcRank("A", withNull, "val")).toBe(3); // E ignoré
  });
});
// &e
