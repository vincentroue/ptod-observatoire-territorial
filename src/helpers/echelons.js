// =============================================================================
// helpers/echelons.js — Configuration échelons géographiques partagée
// =============================================================================
// Utilisé par exploration-dynamique.md ET jottd-demig-demog-flux.md
// Évite duplication config échelons, chemins topojson, fonction loadGeo
// Updated: 2025-01-06 - Corrigé geoKey/labelKey pour DEP/REG, ajouté AAV/BV

// === MÉTADONNÉES PAR ÉCHELON ===
export const ECHELON_META = {
  "Zone d'emploi": {
    key: "ze2020",
    geoKey: "ze2020",
    labelKey: "libze2020",
    needsRewind: false
  },
  "Département": {
    key: "dep",
    geoKey: "code_insee",
    labelKey: "nom_officiel",
    needsRewind: false
  },
  "Région": {
    key: "reg",
    geoKey: "code_insee",
    labelKey: "nom_officiel",
    needsRewind: false
  },
  "Aire d'attraction": {
    key: "aav2020",
    geoKey: "aav2020",
    labelKey: "libaav2020",
    needsRewind: false
  },
  "Bassin de vie": {
    key: "bv2022",
    geoKey: "bv2022",
    labelKey: "libbv2022",
    needsRewind: false
  }
};

// === CHEMINS FICHIERS TOPOJSON ===
export const GEO_FILES = {
  "Zone d'emploi": "data/nodom_zones-emploi_2025.topojson",
  "Département": "data/nodom_departement_2025.topojson",
  "Région": "data/nodom_region_2025.topojson",
  "Aire d'attraction": "data/nodom_aav_2025.topojson",
  "Bassin de vie": "data/nodom_bv_2025.topojson"
};

// === PROJECTION FRANCE (conic conformal) ===
export const PROJECTION_FRANCE = {
  type: "conic-conformal",
  rotate: [-3, -46.5],
  parallels: [44, 49]
};

// === MAPPING NIVEAU MIGCOM → ÉCHELON ===
// Les données MIGCOM utilisent des niveaux différents
export const NIVEAU_TO_ECHELON = {
  "ZE2020": "Zone d'emploi",
  "DEP": "Département",
  "REG": "Région",
  "AAV2020": "Aire d'attraction",
  "BV2022": "Bassin de vie"
};

export const ECHELON_TO_NIVEAU = {
  "Zone d'emploi": "ZE2020",
  "Département": "DEP",
  "Région": "REG",
  "Aire d'attraction": "AAV2020",
  "Bassin de vie": "BV2022"
};
