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
 * Crée la bannière OTTD v4
 * Ligne 1 : OTTD — ◆ voletTitle + ⓘ tooltip
 * Ligne 2 : Observatoire des trajectoires territoriales
 * @param {Object} options
 * @param {string} options.voletTitle - Titre du volet (ex: "Attractivité résidentielle × productive")
 * @param {string} [options.voletTooltip] - Texte tooltip ⓘ à côté du titre
 * @param {string} [options.color] - Couleur volet pour bouton actif nav
 * @param {HTMLElement|null} [options.navElement] - Navigation (createNav)
 * @param {string} [options.sourcesText] - Texte bouton sources
 * @param {string} [options.sourcesTooltip] - Tooltip sources
 * @returns {HTMLElement}
 */
export function createBanner(options) {
  const {
    voletTitle = "",
    voletTooltip = "",
    color = "#2563eb",
    navElement = null,
    sourcesText = null,
    sourcesTooltip = ""
  } = options;

  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.style.setProperty('--volet-color', color);

  const inner = document.createElement('div');
  inner.className = 'banner-inner';

  // Bloc titres (2 lignes)
  const titles = document.createElement('div');
  titles.className = 'banner-titles';

  // Ligne 1 : OTTD — Titre volet + (i)
  const line1 = document.createElement('div');
  line1.className = 'banner-line1';
  const ottdSpan = document.createElement('span');
  ottdSpan.className = 'ottd-brand';
  ottdSpan.textContent = 'OTERT';
  line1.appendChild(ottdSpan);
  const dashSpan = document.createElement('span');
  dashSpan.className = 'ottd-dash';
  dashSpan.textContent = ' — ';
  line1.appendChild(dashSpan);
  const voletSpan = document.createElement('span');
  voletSpan.className = 'ottd-volet';
  voletSpan.textContent = voletTitle;
  line1.appendChild(voletSpan);
  if (voletTooltip) {
    const info = document.createElement('span');
    info.className = 'banner-info';
    info.textContent = 'i';

    // Tooltip JS (position: fixed) — fiable, pas clippé par overflow
    const tip = document.createElement('div');
    tip.className = 'banner-tooltip';
    tip.textContent = voletTooltip;
    document.body.appendChild(tip);

    info.addEventListener('mouseenter', () => {
      const r = info.getBoundingClientRect();
      tip.style.top = (r.bottom + 8) + 'px';
      tip.style.left = Math.max(8, r.left - 40) + 'px';
      tip.classList.add('visible');
    });
    info.addEventListener('mouseleave', () => {
      tip.classList.remove('visible');
    });

    line1.appendChild(info);
  }
  titles.appendChild(line1);

  // Ligne 2 : Observatoire des trajectoires territoriales
  const line2 = document.createElement('div');
  line2.className = 'banner-line2';
  line2.textContent = 'Observatoire Territorial des Évolutions, Recompositions et Trajectoires';
  titles.appendChild(line2);

  inner.appendChild(titles);

  // Navigation
  if (navElement) inner.appendChild(navElement);

  // Sources
  if (sourcesText) {
    const btn = document.createElement('span');
    btn.className = 'sources-btn';
    btn.textContent = sourcesText;
    if (sourcesTooltip) btn.title = sourcesTooltip;
    inner.appendChild(btn);
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

    if (page.title) {
      link.setAttribute('data-tip', page.title);
    }

    if (page.disabled) {
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

    if (section.title) {
      const title = document.createElement('div');
      title.className = 'panel-title';
      title.textContent = section.title;
      panel.appendChild(title);
    }

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
  { id: 'exd', label: '◇ Exploratoire', href: './jottd-exd-explor-dyn',
    title: 'Exploration libre — tous indicateurs, 7 niveaux géographiques',
    color: '#8e44ad' },
  { id: 'exdtc', label: '◎ Communes', href: './dash-exdtc-template-commune',
    title: 'Communes : portrait, comparaison et zoom territorial',
    color: '#27ae60' },
  { id: 'exdeco', label: '▤ Économie', href: './dash-exdeco-ze',
    title: 'Économie : emploi, secteurs et spécialisation',
    color: '#e67e22' },
  { id: 'exdlog', label: '⌂ Logement', href: './dash-exdlog',
    title: 'Logement : prix, construction et vacance',
    color: '#16a085' },
  { id: 'exdattract', label: '◆ Attractivité', href: './dash-exdattract',
    title: 'Attractivité : indices résidentiels et productifs',
    color: '#2563eb' },
  { id: 'exdf', label: '⇄ Flux', href: './dash-exdf-flux-migr', disabled: true,
    title: 'Flux migratoires : MIGCOM détaillé (à venir)',
    color: '#c0392b' }
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
  { id: 'legend', title: '', hint: null }
];

/**
 * Sections sidebar pour EXDC (communes)
 */
export const SIDEBAR_SECTIONS_EXDC = [
  { id: 'echelon', title: 'Échelon parent', hint: null },
  { id: 'search', title: 'Recherche', hint: 'Saisir 2+ caractères' },
  { id: 'selection', title: 'Sélection', hint: null },
  { id: 'columns', title: 'Colonnes tableau', hint: null },
  { id: 'legend', title: '', hint: null }
];

/**
 * Sections sidebar pour EXDE (économie)
 */
export const SIDEBAR_SECTIONS_EXDE = [
  { id: 'echelon', title: 'Échelon', hint: null },
  { id: 'search', title: 'Recherche', hint: null },
  { id: 'naf', title: 'Secteur NAF', hint: 'Sélectionner niveau' },
  { id: 'period', title: 'Période', hint: null },
  { id: 'legend', title: '', hint: null }
];

/**
 * Sections sidebar pour EXDL (logement)
 */
export const SIDEBAR_SECTIONS_EXDL = [
  { id: 'echelon', title: 'Échelon', hint: null },
  { id: 'search', title: 'Recherche', hint: null },
  { id: 'indicateurs', title: 'Indicateurs', hint: null },
  { id: 'period', title: 'Période', hint: null },
  { id: 'legend', title: '', hint: null }
];
// &e SIDEBAR_PRESETS

// &e LAYOUT
