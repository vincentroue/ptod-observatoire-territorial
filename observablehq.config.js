export default {
  title: "OTTD - Observatoire Territorial",
  root: "src",
  head: '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="icon" type="image/svg+xml" href="/favicon.svg">',
  pages: [
    {name: "Accueil", path: "/"},
    {name: "Exploration Dynamique", path: "/jottd-exd-explor-dyn"},
    {name: "Exploration Communes", path: "/jottd-exdc-commune"},
    {name: "POC Scatter", path: "/poc-exd-scatter"},
    {name: "Fiche Territoire", path: "/dash-dterr-fiche"},
    {name: "Fiche IRIS", path: "/dash-dterrb"}
    // {name: "Démographie & Flux", path: "/jottd-demig-demog-flux"}  // DÉSACTIVÉ - nécessite communes_unified.csv
  ],
  theme: "light",
  toc: false,
  sidebar: false,
  pager: false,
  footer: "OTTD — Observatoire Territorial France"
};
