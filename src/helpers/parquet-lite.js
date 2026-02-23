// ============================================================
// &s PARQUET_LITE_aaMAIN — Lecteur Parquet léger (remplace DuckDB-WASM)
// ============================================================
// hyparquet (~10 KB) au lieu de DuckDB-WASM (~40 MB)
// Pour requêtes simples : SELECT * WHERE col = val
// NE supporte PAS : JOIN, GROUP BY, agrégations
// ============================================================

import { parquetRead } from "npm:hyparquet";

// &s LOAD — Chargement Parquet en mémoire

/**
 * Charge un fichier Parquet complet via FileAttachment
 * @param {FileAttachment} fileAttachment - Observable FileAttachment
 * @param {Object} [options]
 * @param {string[]} [options.columns] - Colonnes à lire (null = toutes)
 * @returns {Promise<Object[]>} Array d'objets {col: val, ...}
 */
export async function loadParquet(fileAttachment, options = {}) {
  const buffer = await fileAttachment.arrayBuffer();
  const { columns } = options;

  return new Promise((resolve, reject) => {
    try {
      parquetRead({
        file: { byteLength: buffer.byteLength, slice: (start, end) => buffer.slice(start, end) },
        columns,
        rowFormat: "object",
        onComplete: resolve
      });
    } catch (err) {
      reject(err);
    }
  });
}

// &e

// &s QUERY — Filtre en mémoire (remplace queryCommunes)

/**
 * Filtre des données en mémoire — même logique que queryCommunes DuckDB
 * @param {Object[]} allData - Données complètes chargées par loadParquet
 * @param {Object} [options]
 * @param {Object} [options.filter] - Filtres {key: "val"} ou {key: ["v1","v2"]}
 * @param {number} [options.minPop=0] - Population minimum (P22_POP)
 * @param {Function} [options.customWhere] - Prédicat JS (d) => boolean
 * @param {number} [options.limit] - Limite résultats
 * @param {string[]} [options.columns] - Colonnes à retourner (["*"] = tout)
 * @returns {Object[]} Lignes filtrées
 */
export function queryData(allData, options = {}) {
  const { filter, minPop = 0, customWhere, limit, columns } = options;

  let result = allData;

  // Filtre population
  if (minPop > 0) {
    result = result.filter(d => (d.P22_POP || 0) >= minPop);
  }

  // Filtres clé/valeur (même sémantique que DuckDB CAST AS VARCHAR)
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (Array.isArray(value)) {
        const valSet = new Set(value.map(String));
        result = result.filter(d => valSet.has(String(d[key])));
      } else if (value != null) {
        result = result.filter(d => String(d[key]) === String(value));
      }
    }
  }

  // Prédicat custom (remplace customWhere SQL)
  if (customWhere && typeof customWhere === "function") {
    result = result.filter(customWhere);
  }

  // Limit
  if (limit) result = result.slice(0, limit);

  // Column pruning (optionnel)
  if (columns && columns[0] !== "*") {
    const colSet = new Set(columns);
    result = result.map(d => {
      const obj = {};
      for (const col of colSet) if (col in d) obj[col] = d[col];
      return obj;
    });
  }

  return result;
}

// &e

// &s FRANCE — Extraction ligne France

/**
 * Récupère la ligne France (code = '00FR') depuis les données en mémoire
 * @param {Object[]} allData - Données complètes
 * @returns {Object|null} Ligne France ou null
 */
export function getFranceRow(allData) {
  return allData.find(d => String(d.code) === "00FR") || null;
}

// &e

// &e (FIN-du module PARQUET_LITE_aaMAIN)
