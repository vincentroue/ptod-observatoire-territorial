export default {
  title: "OTTD - Observatoire Territorial",
  root: "src",
  head: '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
  pages: [
    {name: "Accueil", path: "/"},
    {name: "Exploration Dynamique", path: "/jottd-exd-explor-dyn"},
    {name: "Exploration Communes", path: "/jottd-exdc-commune"},
    {name: "POC Scatter", path: "/poc-exd-scatter"}
    // {name: "Démographie & Flux", path: "/jottd-demig-demog-flux"}  // DÉSACTIVÉ - nécessite communes_unified.csv
  ],
  theme: "light",
  toc: false,
  sidebar: false,
  pager: false,
  footer: "OTTD — Observatoire Territorial France"
};
