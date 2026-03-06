// helpers/graph-typo-common.js — Labels et utilitaires partagés bar/arrow typo
// Date : 2026-02-22

// &s LIB_TYPO — Dictionnaire correction labels sat3col → affichage
// Source unique pour graph-bar-typo.js et graph-arrow-typo.js
export const LIB_TYPO = {
  // typo8p
  "Pole de Paris": "Pôle de Paris",
  "Pole Paris": "Pôle de Paris",
  "Pôle Paris": "Pôle de Paris",
  "Autres poles denses": "Autres pôles denses",
  "Poles denses": "Pôles denses",
  "Poles intermediaires et petits": "Pôles interméd. et petits",
  "Poles int.": "Pôles interméd.",
  "Couronne de Paris": "Couronne de Paris",
  "Couronnes urbaines": "Couronnes urbaines",
  "Cour. urb.": "Couronnes urbaines",
  "Rural forte influence": "Rural forte influence",
  "Rural faible influence": "Rural faible influence",
  "Rural hors attraction": "Rural hors attraction",

  // typo5fs
  "Paris": "Paris",
  "Grandes aires >=200k": "Grandes aires ≥200k",
  "Aires moyennes 50-200k": "Aires moyennes 50-200k",
  "Petites aires <50k": "Petites aires <50k",
  "Hors AAV": "Hors AAV",

  // typo4p
  "Poles": "Pôles",
  "Pôles": "Pôles",
  "Rural periurbain": "Rural périurbain",
  "Rural périurbain": "Rural périurbain",
  "Rural autonome": "Rural autonome",

  // dens3
  "Dense": "Dense",
  "Densement peuple": "Densément peuplé",
  "Densément peuplé": "Densément peuplé",
  "Intermediaire": "Intermédiaire",
  "Densite intermediaire": "Densité intermédiaire",
  "Densité intermédiaire": "Densité intermédiaire",
  "Rural": "Rural",
  "Peu dense / tres peu dense": "Peu dense / très peu dense",
  "Peu dense / très peu dense": "Peu dense / très peu dense",

  // dens7
  "Grand centre urbain": "Grand centre urbain",
  "Grands centres urbains": "Grand centre urbain",
  "Centre urbain intermediaire": "Centre intermédiaire",
  "Centres intermediaires": "Centre intermédiaire",
  "Centres intermédiaires": "Centre intermédiaire",
  "Petit centre urbain": "Petite ville",
  "Petites villes": "Petite ville",
  "Ceinture urbaine": "Ceinture urbaine",
  "Ceintures urbaines": "Ceinture urbaine",
  "Bourg rural": "Bourg rural",
  "Bourgs ruraux": "Bourg rural",
  "Rural a habitat disperse": "Rural dispersé",
  "Rural dispersé": "Rural dispersé",
  "Rural a habitat tres disperse": "Rural très dispersé",
  "Rural très dispersé": "Rural très dispersé"
};

export const fixLib = (s) => LIB_TYPO[s] || s;
// &e

// &s FMT — Formatage FR partagé
export const fmtVal = (v) => {
  if (v == null || isNaN(v)) return "—";
  const dec = Math.abs(v) < 0.1 ? 3 : Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
  return v.toFixed(dec).replace(".", ",");
};

export const fmtDelta = (v) => {
  if (v == null || isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  const dec = Math.abs(v) < 0.1 ? 3 : Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
  return `${sign}${v.toFixed(dec).replace(".", ",")}`;
};

export const fmtPop = (v) => {
  if (!v) return "—";
  return Math.round(v).toLocaleString("fr-FR");
};
// &e
