// =============================================================================
// helpers/0loader.js — Centralisation chargement données + géo
// =============================================================================
// NOUVEAU HELPER (préfixe 0) - Source vérité unique pour tous les volets
// Remplace: DATA_HANDLES, GEO_HANDLES, ECHELON_META hardcodés dans chaque .md
// Date: 2026-01-09
// =============================================================================

import * as topojson from "npm:topojson-client";
import rewind from "npm:@mapbox/geojson-rewind";

// === CONFIGURATION 8 ÉCHELONS ===
export const DATA_CONFIG = {
  "Zone d'emploi": {
    dataFile: "data/agg_ze.json",
    geoFile: "data/nodom_zones-emploi_2025.topojson",
    key: "ze2020",
    geoKey: "ze2020",
    labelKey: "libze2020",
    filterKey: "ZE2020",
    needsRewind: false
  },
  "Département": {
    dataFile: "data/agg_dep.json",
    geoFile: "data/nodom_departement_2025.topojson",
    key: "dep",
    geoKey: "code_insee",
    labelKey: "nom_officiel",
    filterKey: "DEP",
    needsRewind: false
  },
  "Région": {
    dataFile: "data/agg_reg.json",
    geoFile: "data/nodom_region_2025.topojson",
    key: "reg",
    geoKey: "code_insee",
    labelKey: "nom_officiel",
    filterKey: "REG",
    needsRewind: false
  },
  "EPCI": {
    dataFile: "data/agg_epci.json",
    geoFile: "data/nodom_epci_2025.topojson",
    key: "epci",
    geoKey: "EPCI",
    labelKey: "EPCIlib",
    filterKey: "EPCI_EPT",  // Distingue Paris + 11 EPT de la MGP (TopoJSON + parquet)
    needsRewind: false
  },
  "Bassin de vie": {
    dataFile: "data/agg_bv.json",
    geoFile: "data/nodom_bv_2025.topojson",
    key: "bv2022",
    geoKey: "bv2022",
    labelKey: "libbv2022",
    filterKey: "BV2022",
    needsRewind: false
  },
  "Aire d'attraction": {
    dataFile: "data/agg_aav.json",
    geoFile: "data/nodom_aav_2025.topojson",
    key: "aav2020",
    geoKey: "aav2020",
    labelKey: "libaav2020",
    filterKey: "AAV2020",
    needsRewind: false
  },
  "Unité urbaine": {
    dataFile: "data/agg_uu.json",
    geoFile: null,  // Pas de TopoJSON disponible
    key: "uu2020",
    geoKey: "uu2020",
    labelKey: "libuu2020",
    filterKey: "UU2020",
    needsRewind: false
  },
  "Commune": {
    dataFile: null,  // Parquet via DuckDB
    geoFile: "data/nodom_commune-ARM_MINI_2025.topojson",
    geoFileLight: "data/nodom_commune-ARM_LIGHT_2025.topojson",
    geoFileUltraLight: "data/nodom_commune-ARM_ULTRALIGHT_2025.topojson",
    parquetFile: "data/agg_commARM.parquet",
    key: "code",
    geoKey: "code_insee",
    labelKey: "nom_officiel",
    filterKey: "COMM",
    needsRewind: true
  }
};

// === LISTE ÉCHELONS POUR DROPDOWNS ===
export const ECHELONS_LIST = [
  "Département",
  "Zone d'emploi",
  "EPCI",
  "Région",
  "Bassin de vie",
  "Aire d'attraction",
  "Unité urbaine"
];

export const ECHELONS_WITH_GEO = [
  "Département",
  "Zone d'emploi",
  "EPCI",
  "Région",
  "Bassin de vie",
  "Aire d'attraction"
];

// === CACHES ===
const dataCache = new Map();
const geoCache = new Map();
const labelMaps = new Map();

// === CHARGEMENT DONNÉES AGRÉGÉES (JSON) ===
export async function loadAggData(echelon, FileAttachment) {
  if (dataCache.has(echelon)) {
    return dataCache.get(echelon);
  }

  const config = DATA_CONFIG[echelon];
  if (!config || !config.dataFile) {
    console.warn(`[0loader] Pas de dataFile pour échelon: ${echelon}`);
    return [];
  }

  try {
    const data = await FileAttachment(config.dataFile).json();
    dataCache.set(echelon, data);

    // Construire labelMap si possible
    if (config.key && config.labelKey) {
      const lm = new Map();
      data.forEach(d => {
        if (d[config.key] && d[config.labelKey]) {
          lm.set(String(d[config.key]), d[config.labelKey]);
        }
      });
      labelMaps.set(echelon, lm);
    }

    return data;
  } catch (e) {
    console.error(`[0loader] Erreur chargement ${echelon}:`, e);
    return [];
  }
}

// === CHARGEMENT GÉOGRAPHIE (TopoJSON → GeoJSON) ===
export async function loadGeo(echelon, FileAttachment) {
  if (geoCache.has(echelon)) {
    return geoCache.get(echelon);
  }

  const config = DATA_CONFIG[echelon];
  if (!config || !config.geoFile) {
    console.warn(`[0loader] Pas de geoFile pour échelon: ${echelon}`);
    return null;
  }

  try {
    const topo = await FileAttachment(config.geoFile).json();
    let geo = topojson.feature(topo, topo.objects.data);

    if (config.needsRewind) {
      geo = rewind(geo, true);
    }

    geoCache.set(echelon, geo);

    // Construire labelMap depuis geo si pas déjà fait
    if (!labelMaps.has(echelon) && config.geoKey && config.labelKey) {
      const lm = new Map();
      geo.features.forEach(f => {
        const code = f.properties[config.geoKey];
        const label = f.properties[config.labelKey];
        if (code && label) lm.set(String(code), label);
      });
      labelMaps.set(echelon, lm);
    }

    return geo;
  } catch (e) {
    console.error(`[0loader] Erreur chargement geo ${echelon}:`, e);
    return null;
  }
}

// === LABEL MAPS ===
export function getLabelMap(echelon) {
  return labelMaps.get(echelon) || new Map();
}

export function setLabelMap(echelon, map) {
  labelMaps.set(echelon, map);
}

// === HELPERS ÉCHELON ===
export function getEchelonMeta(echelon) {
  return DATA_CONFIG[echelon] || null;
}

export function getEchelonKey(echelon) {
  return DATA_CONFIG[echelon]?.key || "code";
}

export function getEchelonGeoKey(echelon) {
  return DATA_CONFIG[echelon]?.geoKey || "code";
}

export function getEchelonLabelKey(echelon) {
  return DATA_CONFIG[echelon]?.labelKey || "libelle";
}

// === DONNÉES FRANCE (1ère ligne avec code 00FR) ===
export function getFranceData(data) {
  return data.find(d => d.code === "00FR") || null;
}

export function getDataNoFrance(data) {
  return data.filter(d => d.code !== "00FR");
}

// === CACHE MANAGEMENT ===
export function clearCache() {
  dataCache.clear();
  geoCache.clear();
  labelMaps.clear();
}

export function getCacheStats() {
  return {
    dataEntries: dataCache.size,
    geoEntries: geoCache.size,
    labelEntries: labelMaps.size
  };
}
