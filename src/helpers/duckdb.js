// ============================================================
// &s DUCKDB — Helper DuckDB WASM pour requêtes Parquet
// ============================================================
// Date: 2026-01-08
// Initialisation et requêtes DuckDB WASM pour page EXDC
//
// Exports:
// - initDuckDB() → Promise<{db, conn}>
// - getParquetColumns({conn}, tableName) → Promise<Set<string>>
// - queryCommunes({conn}, options) → Promise<Row[]>
// - queryFrance({conn}, columns) → Promise<Row> - filtre auto colonnes non disponibles
// ============================================================

import * as duckdb from "npm:@duckdb/duckdb-wasm";

// Singleton pour éviter ré-initialisation
let dbInstance = null;
let connInstance = null;

// Cache pour queryFrance - évite recalcul à chaque changement d'indicateur
// Clé: `${tableName}:${columns.sort().join(",")}` → Valeur: résultat
const franceCache = new Map();

// Cache pour schéma parquet (colonnes disponibles)
const schemaCache = new Map();

// ============================================================
// &s INIT — Initialisation DuckDB WASM
// ============================================================

// Promise d'initialisation en cours (pour éviter doubles init)
let initPromise = null;

/**
 * Initialise DuckDB WASM (singleton)
 * Charge les bundles depuis CDN et crée connexion
 * @returns {Promise<{db: AsyncDuckDB, conn: AsyncDuckDBConnection}>}
 */
export async function initDuckDB() {
  if (dbInstance && connInstance) {
    return { db: dbInstance, conn: connInstance };
  }

  // Si init déjà en cours, retourner la même promise
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    console.log("[DuckDB] Initialisation...");

    // Récupérer les bundles optimisés
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    // Créer le worker
    const worker_url = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" })
    );
    const worker = new Worker(worker_url);

    // Initialiser la base
    const logger = new duckdb.ConsoleLogger();
    dbInstance = new duckdb.AsyncDuckDB(logger, worker);
    await dbInstance.instantiate(bundle.mainModule, bundle.pthreadWorker);

    // Créer connexion
    connInstance = await dbInstance.connect();

    console.log("[DuckDB] Prêt");
    return { db: dbInstance, conn: connInstance };
  })();

  return initPromise;
}

/**
 * Démarre l'init DuckDB en arrière-plan (non-bloquant)
 * Appeler tôt dans le chargement de la page
 * @returns {void} - Ne retourne pas de Promise pour éviter await
 */
export function initDuckDBBackground() {
  if (!dbInstance && !initPromise) {
    console.log("[DuckDB] Démarrage init en arrière-plan...");
    initDuckDB().catch(err => {
      console.error("[DuckDB] Erreur init background:", err);
    });
  }
}

/**
 * Attend que DuckDB soit prêt (à appeler quand on a besoin des données)
 * @returns {Promise<{db: AsyncDuckDB, conn: AsyncDuckDBConnection}>}
 */
export async function waitForDuckDB() {
  return initDuckDB();
}

// ============================================================
// &s REGISTER — Enregistrement fichiers Parquet
// ============================================================

/**
 * Enregistre un fichier Parquet distant
 * @param {AsyncDuckDB} db - Instance DuckDB
 * @param {string} name - Nom de la table (sans extension)
 * @param {string} url - URL du fichier Parquet
 */
export async function registerParquet(db, name, url) {
  console.log(`[DuckDB] Enregistrement ${name} depuis ${url}`);
  await db.registerFileURL(name + ".parquet", url, duckdb.DuckDBDataProtocol.HTTP, false);
}

// ============================================================
// &s SCHEMA — Récupération colonnes disponibles
// ============================================================

/**
 * Récupère la liste des colonnes disponibles dans un fichier Parquet
 * @param {Object} ctx - {conn} connexion DuckDB
 * @param {string} tableName - Nom fichier Parquet (sans .parquet)
 * @returns {Promise<Set<string>>} Set des noms de colonnes
 */
export async function getParquetColumns({ conn }, tableName) {
  // Check cache first
  if (schemaCache.has(tableName)) {
    return schemaCache.get(tableName);
  }

  try {
    // Note: DuckDB-WASM parquet_schema() retourne "name" (pas "column_name")
    const sql = `SELECT name FROM parquet_schema('${tableName}.parquet')`;
    const result = await conn.query(sql);
    const cols = new Set(result.toArray().map(row => row.name));
    schemaCache.set(tableName, cols);
    console.log(`[DuckDB] Schema ${tableName}: ${cols.size} colonnes`);
    return cols;
  } catch (err) {
    console.error("[DuckDB] Erreur schema:", err.message);
    return new Set();
  }
}

// ============================================================
// &s QUERY — Requêtes sur table communes
// ============================================================

/**
 * Requête sur table communes avec filtres
 * @param {Object} ctx - {conn} connexion DuckDB
 * @param {Object} options
 * @param {string} options.tableName - Nom fichier Parquet (sans .parquet)
 * @param {Object} [options.filter={}] - Filtres {dep: "35"} ou {dep: ["35", "22"]}
 * @param {string[]} [options.columns=["*"]] - Colonnes à retourner
 * @param {string} [options.orderBy] - Colonne tri
 * @param {string} [options.orderDir="DESC"] - Direction tri
 * @param {number} [options.limit] - Limite résultats
 * @returns {Promise<Object[]>} Tableau de lignes
 */
export async function queryCommunes({ conn }, options = {}) {
  const {
    tableName = "agg_commARM",
    filter,  // Peut être null ou undefined
    columns = ["*"],
    orderBy,
    orderDir = "DESC",
    limit,
    minPop = 0,  // Filtre population minimale (ex: 2000 pour alléger chargement)
    customWhere  // Clause WHERE brute optionnelle (ex: OR logic EPCI)
  } = options;

  // Construire clauses WHERE
  // Note: Pour les colonnes numériques (ZE2020, REG, etc.), on cast en string côté SQL
  // car les codes peuvent être string ou int selon la source
  const whereClauses = [];

  // &jcn-duckdb minPop : Filtre population minimale pour alléger requête
  if (minPop > 0) {
    whereClauses.push(`"P22_POP" >= ${minPop}`);
  }

  // &jcn-duckdb filter : Gérer filter null/undefined → pas de filtrage
  const safeFilter = filter || {};
  for (const [key, value] of Object.entries(safeFilter)) {
    if (Array.isArray(value)) {
      // IN clause - cast column to VARCHAR pour matcher string ou int
      const escaped = value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(", ");
      whereClauses.push(`CAST("${key}" AS VARCHAR) IN (${escaped})`);
    } else if (value !== null && value !== undefined) {
      // Égalité - cast column to VARCHAR
      const escaped = String(value).replace(/'/g, "''");
      whereClauses.push(`CAST("${key}" AS VARCHAR) = '${escaped}'`);
    }
  }

  // Clause WHERE brute optionnelle (ex: OR logic pour EPCI)
  if (customWhere) {
    whereClauses.push(customWhere);
  }

  // Construire SQL
  const selectSQL = columns.join(", ");
  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const orderSQL = orderBy ? `ORDER BY "${orderBy}" ${orderDir}` : "";
  const limitSQL = limit ? `LIMIT ${limit}` : "";

  const sql = `
    SELECT ${selectSQL}
    FROM '${tableName}.parquet'
    ${whereSQL}
    ${orderSQL}
    ${limitSQL}
  `.trim();

  console.log("[DuckDB] Query:", sql.replace(/\s+/g, " "));

  try {
    const result = await conn.query(sql);
    // Convertir ArrowTable en array d'objets
    return result.toArray().map(row => row.toJSON());
  } catch (err) {
    console.error("[DuckDB] Erreur:", err.message);
    return [];
  }
}

// ============================================================
// &s FRANCE — Agrégation niveau France
// ============================================================

/**
 * Calcule agrégats France (moyennes pondérées) avec cache
 * @param {Object} ctx - {conn} connexion DuckDB
 * @param {string} tableName - Nom fichier Parquet
 * @param {string[]} columns - Colonnes à agréger
 * @param {string} [weightCol="P22_POP"] - Colonne poids
 * @returns {Promise<Object>} Ligne France avec agrégats
 */
export async function queryFrance({ conn }, tableName, columns, weightCol = "P22_POP") {
  // Filtrer colonnes pour ne garder que celles disponibles dans le parquet
  const availableCols = await getParquetColumns({ conn }, tableName);
  const validColumns = columns.filter(col => availableCols.has(col));

  if (validColumns.length < columns.length) {
    const missing = columns.filter(c => !availableCols.has(c));
    console.log(`[DuckDB] France: ${missing.length} colonnes ignorées (non disponibles): ${missing.slice(0, 3).join(", ")}...`);
  }

  if (validColumns.length === 0) {
    console.log("[DuckDB] France: aucune colonne valide demandée");
    return { code: "00FR", libelle: "France" };
  }

  // Cache key: table + colonnes triées (filtrées)
  const cacheKey = `${tableName}:${[...validColumns].sort().join(",")}`;
  if (franceCache.has(cacheKey)) {
    console.log("[DuckDB] France cache hit:", cacheKey.slice(0, 50) + "...");
    return franceCache.get(cacheKey);
  }

  // D'abord essayer de lire la ligne 00FR directement (données pré-calculées)
  const colsList = ["code", "libelle", ...validColumns].map(c => `"${c}"`).join(", ");
  const sqlDirect = `SELECT ${colsList} FROM '${tableName}.parquet' WHERE code = '00FR' LIMIT 1`;

  try {
    const directResult = await conn.query(sqlDirect);
    const directRows = directResult.toArray();
    if (directRows.length > 0) {
      const franceRow = directRows[0].toJSON();
      franceRow.libelle = "France";  // Normaliser le libellé
      console.log("[DuckDB] France row from data (00FR)");
      franceCache.set(cacheKey, franceRow);
      return franceRow;
    }
  } catch (e) {
    console.log("[DuckDB] No 00FR in parquet, trying registered table...");
  }

  // Fallback : calcul agrégé depuis la table enregistrée
  const aggCols = validColumns.map(col => {
    if (col.includes("_pct") || col.includes("_vtcam") || col.includes("_ind") || col.includes("_vdifp")) {
      return `ROUND(SUM("${col}" * "${weightCol}") / NULLIF(SUM("${weightCol}"), 0), 2) AS "${col}"`;
    } else if (col.includes("_vol") || col === "P22_POP" || col === "P16_POP" || col === "P11_POP" || col === "P23_POP") {
      return `SUM("${col}") AS "${col}"`;
    } else {
      return `ROUND(AVG("${col}"), 0) AS "${col}"`;
    }
  }).join(", ");

  const sql = `SELECT '00FR' AS code, 'France' AS libelle, ${aggCols} FROM '${tableName}.parquet'`;
  console.log("[DuckDB] France calc:", sql.slice(0, 80) + "...");

  try {
    const result = await conn.query(sql);
    const rows = result.toArray();
    const franceRow = rows.length > 0 ? rows[0].toJSON() : null;
    if (franceRow) franceCache.set(cacheKey, franceRow);
    return franceRow;
  } catch (err) {
    console.error("[DuckDB] Erreur France:", err.message);
    return null;
  }
}

// ============================================================
// &s COUNT — Comptage avec filtres
// ============================================================

/**
 * Compte le nombre de communes selon filtres
 * @param {Object} ctx - {conn} connexion DuckDB
 * @param {string} tableName - Nom fichier Parquet
 * @param {Object} [filter={}] - Filtres
 * @returns {Promise<number>} Nombre de lignes
 */
export async function countCommunes({ conn }, tableName, filter = {}) {
  // Construire clauses WHERE (cast VARCHAR pour compatibilité string/int)
  const whereClauses = [];
  for (const [key, value] of Object.entries(filter)) {
    if (Array.isArray(value)) {
      const escaped = value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(", ");
      whereClauses.push(`CAST("${key}" AS VARCHAR) IN (${escaped})`);
    } else if (value !== null && value !== undefined) {
      const escaped = String(value).replace(/'/g, "''");
      whereClauses.push(`CAST("${key}" AS VARCHAR) = '${escaped}'`);
    }
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const sql = `SELECT COUNT(*) AS cnt FROM '${tableName}.parquet' ${whereSQL}`;

  try {
    const result = await conn.query(sql);
    const rows = result.toArray();
    return rows.length > 0 ? Number(rows[0].cnt) : 0;
  } catch (err) {
    console.error("[DuckDB] Erreur count:", err.message);
    return 0;
  }
}

// ============================================================
// &s CACHE_UTILS — Gestion cache France
// ============================================================

/**
 * Vide le cache France (force recalcul)
 */
export function clearFranceCache() {
  franceCache.clear();
  console.log("[DuckDB] France cache cleared");
}

/**
 * Stats cache France
 * @returns {{ size: number, keys: string[] }}
 */
export function getFranceCacheStats() {
  return {
    size: franceCache.size,
    keys: [...franceCache.keys()]
  };
}

// &e
