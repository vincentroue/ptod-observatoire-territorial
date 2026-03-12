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
  const ottdLink = document.createElement('a');
  ottdLink.className = 'ottd-brand';
  ottdLink.href = './';
  ottdLink.title = 'Accueil';
  ottdLink.innerHTML = '<svg class="ottd-logo" width="18" height="20" viewBox="0 0 38 42" fill="none"><path d="M19 1 L35 11 L35 31 L19 41 L3 31 L3 11 Z" stroke="currentColor" stroke-width="3" fill="rgba(255,255,255,0.15)"/><circle cx="19" cy="21" r="4" fill="currentColor" opacity="0.7"/></svg>ObTer';
  line1.appendChild(ottdLink);
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

  // Ligne 2 supprimée (ancien titre long "Observatoire Territorial...")

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

  // Filter devOnly pages in production (runtime check)
  const visiblePages = isDevMode() ? pages : pages.filter(p => !p.devOnly);

  visiblePages.forEach(page => {
    const link = document.createElement('a');
    link.className = 'nav-btn';
    link.textContent = page.label;

    if (page.title) {
      link.setAttribute('data-tip', page.title);
    }

    if (page.disabled) {
      link.classList.add('disabled');
      link.style.opacity = '0.35';
      link.style.pointerEvents = 'none';
      link.href = '#';
    } else if (page.deprecated) {
      link.classList.add('deprecated');
      link.style.opacity = '0.45';
      link.href = page.href;
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
  { id: '__index__', label: '◉ Accueil', href: './',
    title: 'Page d\u2019accueil — Observatoire Territorial',
    color: '#1e3a5f' },
  { id: 'exdtc', label: '◎ Exploration libre', href: './dash-exdtc-template-commune',
    title: 'Exploration libre : portrait, comparaison et zoom territorial',
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
  { id: 'dterr', label: '📋 Focus territoire', href: './dash-dterr-fiche',
    title: 'Focus territoire : portrait commune avec comparaisons multi-échelon',
    color: '#0f766e', devOnly: true },
  { id: 'dterrb', label: '🔬 Fiche IRIS', href: './dash-dterrb',
    title: 'Fiche Territoire IRIS : zoom progressif DEP→EPCI→Commune→IRIS (MapLibre)',
    color: '#7c3aed', devOnly: true },
  { id: 'dpgent', label: '🔬 Gentrification', href: './dash-dpgent',
    title: 'Gentrification IRIS : revenus, CSP, logement sur Paris+PC & Marseille',
    color: '#dc2626', devOnly: true },
  { id: 'exd', label: '◇ Exploratoire', href: './jottd-exd-explor-dyn', deprecated: true,
    title: 'Explorateur legacy — tous indicateurs, 7 niveaux géographiques',
    color: '#8e44ad', devOnly: true },
  { id: 'exdf', label: '⇄ Flux', href: './dash-exdf-flux-migr', disabled: true,
    title: 'Flux migratoires : MIGCOM détaillé (à venir)',
    color: '#c0392b', devOnly: true }
];

/**
 * Détecte si on est en local (dev) ou en production (Netlify)
 * localhost / 127.0.0.1 = dev, sinon prod
 * IMPORTANT: Fonction (pas const) pour évaluation runtime dans le navigateur
 */
export function isDevMode() {
  return typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
}
// Compat — alias const (évalué à l'import dans le navigateur)
export const IS_DEV = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

/**
 * Pages filtrées selon environnement :
 * - En local : toutes les pages visibles
 * - En prod : masque les pages devOnly
 */
export function getVisiblePages() {
  return isDevMode() ? OTTD_PAGES : OTTD_PAGES.filter(p => !p.devOnly);
}

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
