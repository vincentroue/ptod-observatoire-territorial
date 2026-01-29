// ============================================================
// &s SELECTION — Gestion sélection multi-territoires
// ============================================================
// Date: 2026-01-19
// Fonctions de sélection pour cartes et tableaux
// Utilisé avec Observable Mutable() pour état réactif
//
// Exports:
// - createSelectionManager(selectionState, zoomState, pageState)
// - Selection actions: add, remove, toggle, clear, setZoomOnly
// ============================================================

/**
 * Crée un gestionnaire de sélection pour cartes/tableaux
 * Encapsule la logique de sélection multi-territoires
 *
 * @param {Mutable<Set>} selectionState - État sélection (Set de codes)
 * @param {Mutable<string|null>} zoomState - État zoom (code territoire)
 * @param {Mutable<number>} pageState - État pagination (reset à 0 sur changement)
 * @returns {Object} Gestionnaire avec actions
 */
export function createSelectionManager(selectionState, zoomState, pageState) {

  /**
   * Ajoute un code à la sélection ET change le zoom
   * @param {string} code - Code territoire
   */
  const addToSelection = (code) => {
    const s = new Set(selectionState.value);
    s.add(code);
    selectionState.value = s;
    zoomState.value = code;
    pageState.value = 0;
  };

  /**
   * Retire un code de la sélection, fallback zoom si nécessaire
   * @param {string} code - Code territoire
   */
  const removeFromSelection = (code) => {
    const s = new Set(selectionState.value);
    s.delete(code);
    selectionState.value = s;
    if (zoomState.value === code) {
      zoomState.value = s.size > 0 ? [...s][s.size - 1] : null;
    }
    pageState.value = 0;
  };

  /**
   * Toggle sélection : ajoute si absent, retire si présent
   * @param {string} code - Code territoire
   */
  const toggleSelection = (code) => {
    if (selectionState.value.has(code)) {
      removeFromSelection(code);
    } else {
      addToSelection(code);
    }
  };

  /**
   * Change le zoom SANS modifier la sélection (click normal carte)
   * @param {string} code - Code territoire
   */
  const setZoomOnly = (code) => {
    zoomState.value = code;
  };

  /**
   * Vide complètement la sélection et le zoom
   */
  const clearSelection = () => {
    selectionState.value = new Set();
    zoomState.value = null;
    pageState.value = 0;
  };

  /**
   * Retourne les codes sélectionnés comme Array
   * @returns {string[]} Codes sélectionnés
   */
  const getSelectedCodes = () => [...selectionState.value];

  /**
   * Vérifie si un code est sélectionné
   * @param {string} code - Code territoire
   * @returns {boolean}
   */
  const isSelected = (code) => selectionState.value.has(code);

  /**
   * Nombre de territoires sélectionnés
   * @returns {number}
   */
  const selectionCount = () => selectionState.value.size;

  return {
    addToSelection,
    removeFromSelection,
    toggleSelection,
    setZoomOnly,
    clearSelection,
    getSelectedCodes,
    isSelected,
    selectionCount,
    // Alias pour compatibilité
    toggleMapSelection: toggleSelection,
    clearMapSelection: clearSelection
  };
}

/**
 * Crée un handler de click pour carte avec support Ctrl+click
 * @param {Object} config
 * @param {Object} config.geoData - FeatureCollection
 * @param {Function} config.getCode - (feature) => code
 * @param {Function} config.onCtrlClick - (code) => void (Ctrl+click = sélection)
 * @param {Function} config.onClick - (code) => void (click normal = zoom only)
 * @returns {Function} Event handler pour addEventListener
 */
export function createMapClickHandler({ geoData, getCode, onCtrlClick, onClick }) {
  return (event) => {
    const path = event.target.closest("path");
    if (!path) return;

    const parent = path.parentElement;
    const paths = Array.from(parent.querySelectorAll("path"));
    const idx = paths.indexOf(path);

    if (idx >= 0 && idx < geoData.features.length) {
      const feature = geoData.features[idx];
      if (feature) {
        const code = getCode(feature);
        if (event.ctrlKey || event.metaKey) {
          onCtrlClick(code);
        } else {
          onClick(code);
        }
      }
    }
  };
}

// &e
