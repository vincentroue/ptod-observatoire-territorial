// ============================================================
// &s LAYOUT — Composants bannière, navigation et sidebar
// ============================================================
// Date: 2026-01-09
// Fonctions de création layout pour template multi-volets OTTD
//
// Exports:
// - createBanner(options) → HTMLElement
// - createNav(pages, activePage) → HTMLElement
// - createSidebarShell(sections) → HTMLElement
// ============================================================

/**
 * Crée la bannière principale OTTD
 * @param {Object} options
 * @param {string} options.title - Titre principal (ex: "OTTD")
 * @param {string} options.subtitle - Sous-titre (ex: "Observatoire Trajectoires")
 * @param {HTMLElement|null} [options.navElement] - Élément navigation (createNav)
 * @param {string} [options.sourcesText] - Texte bouton sources (null = pas de bouton)
 * @param {string} [options.sourcesTooltip] - Tooltip sources
 * @returns {HTMLElement}
 */
export function createBanner(options) {
  const {
    title = "OTTD",
    subtitle = "Observatoire Trajectoires Territoriales",
    navElement = null,
    sourcesText = null,
    sourcesTooltip = ""
  } = options;

  const banner = document.createElement('div');
  banner.className = 'banner';

  const inner = document.createElement('div');
  inner.className = 'banner-inner';

  // ------- Titres -------
  const titles = document.createElement('div');
  titles.className = 'banner-titles';

  const h1 = document.createElement('h1');
  h1.textContent = title;

  const p = document.createElement('p');
  p.textContent = subtitle;

  titles.appendChild(h1);
  titles.appendChild(p);
  inner.appendChild(titles);

  // ------- Navigation (si fournie) -------
  if (navElement) {
    inner.appendChild(navElement);
  }

  // ------- Bouton sources (optionnel) -------
  if (sourcesText) {
    const sourcesBtn = document.createElement('span');
    sourcesBtn.className = 'sources-btn';
    sourcesBtn.textContent = sourcesText;
    if (sourcesTooltip) {
      sourcesBtn.title = sourcesTooltip;
    }
    inner.appendChild(sourcesBtn);
  }

  banner.appendChild(inner);
  return banner;
}

/**
 * Crée la navigation entre pages
 * @param {Array<{id: string, label: string, href: string, disabled?: boolean}>} pages - Liste des pages
 * @param {string} activePage - ID de la page active
 * @returns {HTMLElement}
 */
export function createNav(pages, activePage) {
  const nav = document.createElement('nav');
  nav.className = 'nav-banner';

  pages.forEach(page => {
    const link = document.createElement('a');
    link.className = 'nav-btn';
    link.textContent = page.label;

    if (page.disabled) {
      // Page future - afficher mais désactivé
      link.classList.add('disabled');
      link.style.opacity = '0.4';
      link.style.pointerEvents = 'none';
      link.href = '#';
    } else {
      link.href = page.href;
    }

    if (page.id === activePage) {
      link.classList.add('active');
    }

    nav.appendChild(link);
  });

  return nav;
}

/**
 * Crée le shell sidebar avec sections vides
 * @param {Array<{id: string, title: string, hint?: string}>} sections - Définition sections
 * @returns {HTMLElement} Sidebar avec panels vides (à remplir ensuite)
 */
export function createSidebarShell(sections) {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';

  sections.forEach(section => {
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.id = `panel-${section.id}`;

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = section.title;
    panel.appendChild(title);

    if (section.hint) {
      const hint = document.createElement('span');
      hint.className = 'panel-hint';
      hint.textContent = section.hint;
      panel.appendChild(hint);
    }

    // Container pour contenu dynamique
    const content = document.createElement('div');
    content.className = 'panel-content';
    content.id = `panel-content-${section.id}`;
    panel.appendChild(content);

    sidebar.appendChild(panel);
  });

  return sidebar;
}

/**
 * Crée une sous-bannière optionnelle
 * @param {Array<{id: string, title: string, content: HTMLElement}>} groups - Groupes de contrôles
 * @returns {HTMLElement}
 */
export function createSubBanner(groups) {
  const subBanner = document.createElement('div');
  subBanner.className = 'sub-banner';

  const inner = document.createElement('div');
  inner.className = 'sub-banner-inner';

  groups.forEach((group, index) => {
    // Séparateur entre groupes
    if (index > 0) {
      const sep = document.createElement('div');
      sep.className = 'sub-sep';
      inner.appendChild(sep);
    }

    const subGroup = document.createElement('div');
    subGroup.className = 'sub-group';
    subGroup.id = `sub-group-${group.id}`;

    if (group.title) {
      const title = document.createElement('div');
      title.className = 'sub-group-title';
      title.textContent = group.title;
      subGroup.appendChild(title);
    }

    if (group.content) {
      subGroup.appendChild(group.content);
    }

    inner.appendChild(subGroup);
  });

  subBanner.appendChild(inner);
  return subBanner;
}

// ============================================================
// &s PAGES_CONFIG — Configuration pages navigation OTTD
// ============================================================
/**
 * Configuration des pages OTTD pour createNav()
 * Usage: createNav(OTTD_PAGES, 'exdc')
 */
export const OTTD_PAGES = [
  { id: 'exd', label: 'EXD', href: './jottd-exd-explor-dyn' },
  { id: 'exdtc', label: 'Communes', href: './dash-exdtc-template-commune' },
  { id: 'comm-bis', label: 'Comm-bis', href: './jottd-exdc-comm-bis' },
  { id: 'exdeco', label: 'Éco ZE', href: './dash-exdeco-ze' },
  { id: 'exdf', label: 'Flux', href: './dash-exdf-flux-migr', disabled: true },
  { id: 'exdl', label: 'Logement', href: './dash-exdl-logement', disabled: true }
];

// &e PAGES_CONFIG

// ============================================================
// &s SIDEBAR_PRESETS — Presets sections sidebar par volet
// ============================================================
/**
 * Sections sidebar communes à tous volets
 */
export const SIDEBAR_SECTIONS_BASE = [
  { id: 'echelon', title: 'Échelon', hint: null },
  { id: 'search', title: 'Recherche', hint: 'Saisir 2+ caractères' },
  { id: 'options', title: 'Options', hint: null },
  { id: 'legend', title: 'Légende', hint: null }
];

/**
 * Sections sidebar pour EXDC (communes)
 */
export const SIDEBAR_SECTIONS_EXDC = [
  { id: 'echelon', title: 'Échelon parent', hint: null },
  { id: 'search', title: 'Recherche', hint: 'Saisir 2+ caractères' },
  { id: 'selection', title: 'Sélection', hint: null },
  { id: 'columns', title: 'Colonnes tableau', hint: null },
  { id: 'legend', title: 'Légende carte', hint: null }
];

/**
 * Sections sidebar pour EXDE (économie)
 */
export const SIDEBAR_SECTIONS_EXDE = [
  { id: 'echelon', title: 'Échelon', hint: null },
  { id: 'search', title: 'Recherche', hint: null },
  { id: 'naf', title: 'Secteur NAF', hint: 'Sélectionner niveau' },
  { id: 'period', title: 'Période', hint: null },
  { id: 'legend', title: 'Légende', hint: null }
];

/**
 * Sections sidebar pour EXDL (logement)
 */
export const SIDEBAR_SECTIONS_EXDL = [
  { id: 'echelon', title: 'Échelon', hint: null },
  { id: 'search', title: 'Recherche', hint: null },
  { id: 'indicateurs', title: 'Indicateurs', hint: null },
  { id: 'period', title: 'Période', hint: null },
  { id: 'legend', title: 'Légende', hint: null }
];
// &e SIDEBAR_PRESETS

// &e LAYOUT
