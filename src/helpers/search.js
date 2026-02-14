// ============================================================
// &s SEARCH — Composant recherche fuzzy avec Fuse.js (v2)
// ============================================================
// Date: 2026-01-09
// Recherche instantanée territoires avec dropdown et chips
// v2: Ajout bouton clear all, compteur sélection, persistance input
//
// Exports:
// - createSearchBox(options) → HTMLElement
// ============================================================

import Fuse from "npm:fuse.js";

/**
 * Crée un composant de recherche avec dropdown et chips
 * @param {Object} options
 * @param {Array} options.data - Données à rechercher [{code, label, pop?}]
 * @param {Set|Mutable} options.selection - Set ou Mutable<Set> des codes sélectionnés
 * @param {Function} options.onToggle - Callback toggle(code) appelé au clic
 * @param {Function} [options.onClear] - Callback appelé après clear all
 * @param {Object} [options.fuseOptions] - Options Fuse.js custom
 * @param {string} [options.placeholder] - Placeholder input
 * @param {number} [options.maxResults=8] - Nombre max résultats dropdown
 * @param {number} [options.maxChips=5] - Nombre max chips affichés
 * @param {number} [options.maxWidth=240] - Largeur max container (px)
 * @param {boolean} [options.showClearAll=true] - Afficher bouton effacer tout
 * @param {boolean} [options.showCount=true] - Afficher compteur sélection
 * @param {boolean} [options.persistInput=false] - Ne pas vider input après sélection
 * @returns {HTMLElement} Container avec input + dropdown + chips
 */
export function createSearchBox(options) {
  const {
    data = [],
    selection: selectionInput = new Set(),
    onToggle = () => {},
    onClear = () => {},
    fuseOptions = {},
    placeholder = "🔍 2+ lettres...",
    maxResults = 8,
    maxChips = 5,
    maxWidth = 240,
    showClearAll = true,
    showCount = true,
    persistInput = false
  } = options;

  // Support Mutable<Set> ou Set direct
  // IMPORTANT: appeler à chaque usage pour avoir valeur courante
  const getSelection = () => {
    if (selectionInput && typeof selectionInput.value !== 'undefined') {
      return selectionInput.value;  // C'est un Mutable
    }
    return selectionInput;  // C'est un Set direct
  };

  // Config Fuse.js — recherche sur label, code et regdep (ex: "hdf/59")
  const fuse = new Fuse(data, {
    keys: ['label', 'code', 'regdep'],
    threshold: 0.3,
    ignoreLocation: true,
    ...fuseOptions
  });

  // Map code → label pour chips
  const codeToLabel = new Map(data.map(d => [d.code, d.label]));

  // Container principal
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex; flex-direction: column; gap: 6px;
    max-width: ${maxWidth}px; font-size: 12px;
  `;

  // Header row (compteur + bouton clear)
  const headerRow = document.createElement('div');
  headerRow.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    min-height: 20px; padding: 0 2px;
  `;

  // Compteur sélection
  const countSpan = document.createElement('span');
  countSpan.style.cssText = 'font-size: 10px; color: #6b7280;';

  // Bouton effacer tout (plus visible)
  const clearBtn = document.createElement('button');
  clearBtn.textContent = '✕ Effacer tout';
  clearBtn.style.cssText = `
    font-size: 11px; padding: 3px 8px;
    background: #f87171; color: white;
    border: none; border-radius: 4px;
    cursor: pointer; display: none;
    font-weight: 500;
  `;
  clearBtn.onmouseenter = () => clearBtn.style.background = '#ef4444';
  clearBtn.onmouseleave = () => clearBtn.style.background = '#f87171';
  clearBtn.onclick = () => {
    const selection = getSelection();
    selection.clear();
    onClear();
    updateChips();
    updateHeader();
  };

  if (showCount) headerRow.appendChild(countSpan);
  if (showClearAll) headerRow.appendChild(clearBtn);

  // Fonction mise à jour header
  function updateHeader() {
    const selection = getSelection();
    const count = selection.size;
    if (showCount) {
      countSpan.textContent = count > 0 ? `${count} sélectionné${count > 1 ? 's' : ''}` : '';
    }
    if (showClearAll) {
      clearBtn.style.display = count > 0 ? 'block' : 'none';
    }
  }

  // Zone chips
  const chipsZone = document.createElement('div');
  chipsZone.style.cssText = 'display: flex; flex-wrap: wrap; gap: 3px; min-height: 20px;';

  // Input
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.style.cssText = `
    width: 100%; padding: 6px 10px;
    border: 1px solid #d1d5db; border-radius: 4px;
    font-size: 11px; box-sizing: border-box;
    color: #374151;
  `;
  // Placeholder plus gris
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .search-box-input::placeholder { color: #9ca3af; font-style: italic; }
  `;
  document.head.appendChild(styleEl);
  input.classList.add('search-box-input');

  // Dropdown
  const dropdown = document.createElement('div');
  dropdown.style.cssText = `
    position: absolute; top: 100%; left: 0; right: 0;
    background: white; border: 1px solid #d1d5db; border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 100;
    margin-top: 2px; display: none; max-height: 250px; overflow-y: auto;
    font-size: 11px;
  `;

  // Wrapper input (position relative pour dropdown)
  const inputWrapper = document.createElement('div');
  inputWrapper.style.position = 'relative';
  inputWrapper.appendChild(input);
  inputWrapper.appendChild(dropdown);

  // Ordre: header → input → chips (chips en dessous de l'input)
  container.appendChild(headerRow);
  container.appendChild(inputWrapper);
  container.appendChild(chipsZone);

  // === Fonction mise à jour chips ===
  function updateChips() {
    const selection = getSelection();
    chipsZone.innerHTML = '';
    const codes = [...selection].slice(0, maxChips);
    codes.forEach(code => {
      const label = codeToLabel.get(code) || code;
      const chip = document.createElement('span');
      chip.style.cssText = `
        background: #2563eb; color: white; padding: 1px 5px; border-radius: 8px;
        font-size: 9px; display: inline-flex; align-items: center; gap: 2px;
        max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      `;
      const labelText = document.createElement('span');
      labelText.textContent = label.length > 15 ? label.slice(0, 15) + '…' : label;
      labelText.style.cssText = 'overflow: hidden; text-overflow: ellipsis;';

      const closeBtn = document.createElement('span');
      closeBtn.textContent = '×';
      closeBtn.style.cssText = 'cursor: pointer; font-weight: bold; margin-left: 2px;';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        onToggle(code);
        updateChips();
        updateHeader();
      };

      chip.appendChild(labelText);
      chip.appendChild(closeBtn);
      chipsZone.appendChild(chip);
    });
    if (selection.size > maxChips) {
      const more = document.createElement('span');
      more.style.cssText = 'font-size: 10px; color: #6b7280;';
      more.textContent = `+${selection.size - maxChips}`;
      chipsZone.appendChild(more);
    }
  }

  // === Fonction mise à jour dropdown ===
  function updateDropdown(results) {
    const selection = getSelection();
    dropdown.innerHTML = '';
    if (results.length === 0) {
      dropdown.style.display = 'none';
      return;
    }
    dropdown.style.display = 'block';
    results.forEach(item => {
      const isSelected = selection.has(item.code);
      const row = document.createElement('div');
      row.style.cssText = `
        padding: 6px 10px; cursor: pointer;
        display: flex; justify-content: space-between; align-items: center;
        background: ${isSelected ? '#eff6ff' : 'white'};
        border-bottom: 1px solid #f3f4f6;
      `;
      const labelSpan = document.createElement('span');
      labelSpan.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;';
      labelSpan.textContent = `${isSelected ? '✓ ' : ''}${item.label}`;

      const popSpan = document.createElement('span');
      popSpan.style.cssText = 'color: #9ca3af; font-size: 10px; margin-left: 4px; flex-shrink: 0;';
      popSpan.textContent = item.pop ? `${(item.pop / 1000).toFixed(0)}k` : '';

      row.appendChild(labelSpan);
      row.appendChild(popSpan);
      row.onmouseenter = () => row.style.background = '#f3f4f6';
      row.onmouseleave = () => row.style.background = isSelected ? '#eff6ff' : 'white';
      row.onclick = () => {
        onToggle(item.code);
        if (!persistInput) {
          input.value = '';
          dropdown.style.display = 'none';
        }
        updateChips();
        updateHeader();
      };
      dropdown.appendChild(row);
    });
  }

  // === Event listener input ===
  input.oninput = (e) => {
    const query = e.target.value;
    if (query.length < 2) {
      updateDropdown([]);
      return;
    }
    const results = fuse.search(query).slice(0, maxResults).map(r => r.item);
    updateDropdown(results);
  };

  // Fermer dropdown au clic extérieur
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Init
  updateChips();
  updateHeader();

  // Exposer méthodes pour mise à jour externe
  container.refresh = () => {
    updateChips();
    updateHeader();
  };
  container.clear = () => {
    const selection = getSelection();
    selection.clear();
    onClear();
    updateChips();
    updateHeader();
  };

  return container;
}

// &e SEARCH
