// =============================================================================
// helpers/graph-butterfly.js — Butterfly chart sectoriel
// =============================================================================
// Chart double : Part (%) à gauche, Évolution (%) à droite
// France toujours en référence à gauche, autres territoires à droite
// Date : 2026-01-20 v8 - Légende colonnes, labels colorés, moyenne pondérée
// =============================================================================

import * as Plot from "npm:@observablehq/plot";

// =============================================================================
// &s PALETTES
// =============================================================================

// Part : gris clair neutre (pas de coloration IS pour la lisibilité)
export const PAL_PART = "#d1d5db";  // Gris clair

export const PAL_EVOL_DIV = {
  negative: "#dc2626",  // Rouge
  neutral: "#9ca3af",   // Gris
  positive: "#86efac"   // Vert léger (était #059669)
};

export function getEvolColor(evol, threshold = 0.3) {
  if (evol == null) return PAL_EVOL_DIV.neutral;
  if (evol > threshold) return PAL_EVOL_DIV.positive;
  if (evol < -threshold) return PAL_EVOL_DIV.negative;
  return PAL_EVOL_DIV.neutral;
}

// Couleur texte pour labels évolution (plus sombre pour lisibilité)
export function getEvolLabelColor(evol, threshold = 0.3) {
  if (evol == null) return "#6b7280";  // Gris
  if (evol > threshold) return "#15803d";  // Vert foncé
  if (evol < -threshold) return "#b91c1c";  // Rouge foncé
  return "#6b7280";
}

// =============================================================================
// &s RENDER_BUTTERFLY_MULTI — Butterfly chart multi-territoires
// =============================================================================

export function renderButterflyMulti({ franceData, territories = [], options = {} }) {
  const {
    barHeight = 22,
    widthPart = 100,       // Réduit (était 160)
    widthEvol = 120,       // Réduit (était 160)
    widthLabels = 110,     // Réduit (était 120)
    evolLabel = "Évol. 22→23 (%)"  // Configurable selon source
  } = options;

  // Ordre secteurs = ordre France (par part décroissante)
  const franceSorted = [...franceData].sort((a, b) => (b.pct || 0) - (a.pct || 0));
  const sectorOrder = franceSorted.map(d => d.secteur);
  const nbSectors = sectorOrder.length;

  // Hauteur zone barres
  const plotHeight = nbSectors * barHeight;

  // Domaines axes - SERRÉ pour barres plus visibles
  const allData = [franceData, ...territories.map(t => t.data)].flat();
  const maxPct = Math.ceil(Math.max(...allData.map(d => d.pct || 0)) / 5) * 5 + 2;  // Marge réduite
  const minEvol = Math.floor(Math.min(...allData.map(d => d.evol || 0))) - 2;
  const maxEvol = Math.ceil(Math.max(...allData.map(d => d.evol || 0))) + 2;

  // Aligner données sur ordre France
  const alignData = (data) => {
    const map = new Map(data.map(d => [d.secteur, d]));
    return sectorOrder.map(s => map.get(s) || { secteur: s, pct: null, evol: null, is: null });
  };

  const franceAligned = alignData(franceData);

  // Calculer évolution moyenne (pondérée par part si dispo)
  const computeAvgEvol = (data) => {
    const validData = data.filter(d => d.evol != null && d.pct != null);
    if (validData.length === 0) return null;
    const sumPct = validData.reduce((s, d) => s + d.pct, 0);
    const sumWeighted = validData.reduce((s, d) => s + d.evol * d.pct, 0);
    return sumPct > 0 ? sumWeighted / sumPct : null;
  };

  // Fonction pour créer un bloc territoire (France ou autre)
  const createTerritoryBlock = (data, label, isReference = false) => {
    const block = document.createElement('div');
    if (!isReference) {
      block.style.cssText = 'margin-left:12px;border-left:2px solid #e5e7eb;padding-left:8px;';
    }

    // Titre territoire
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = `text-align:center;font-weight:600;font-size:12px;margin-bottom:4px;color:${isReference ? '#1e40af' : '#7c3aed'};height:18px;`;
    titleDiv.textContent = label;
    block.appendChild(titleDiv);

    // Légende colonnes (Part | Évol) - sans "Secteur" au centre
    const legendDiv = document.createElement('div');
    legendDiv.style.cssText = 'display:flex;font-size:9px;color:#6b7280;margin-bottom:2px;';
    legendDiv.innerHTML = `
      <span style="width:${widthPart + 10}px;text-align:center;">Part (%)</span>
      <span style="width:${widthLabels}px;"></span>
      <span style="width:${widthEvol}px;text-align:center;">${evolLabel}</span>
    `;
    block.appendChild(legendDiv);

    // Row des charts
    const chartRow = document.createElement('div');
    chartRow.style.cssText = 'display:flex;align-items:flex-start;';

    // Part (barres vers gauche) - axe inversé, gris clair, labels via texte séparé
    const plotPart = Plot.plot({
      width: widthPart,
      height: plotHeight,
      marginLeft: 5,
      marginRight: 5,
      marginTop: 0,
      marginBottom: 0,
      x: { domain: [maxPct, 0], axis: null },
      y: { domain: sectorOrder, axis: null, padding: 0 },
      marks: [
        Plot.barX(data, {
          x: "pct",
          y: "secteur",
          fill: PAL_PART,
          insetTop: 2,
          insetBottom: 2,
          tip: true,
          title: d => `${d.secteur}\nPart: ${d.pct?.toFixed(1)}%${d.is ? `\nIS: ${d.is.toFixed(2)}` : ''}`
        }),
        // Étiquettes Part - DANS la barre (à l'intérieur, côté droit de la barre = côté gauche visuellement en domaine inversé)
        Plot.text(data.filter(d => d.pct != null && d.pct > 2), {
          x: d => d.pct,               // Position à la fin de la barre
          y: "secteur",
          text: d => d.pct?.toFixed(1),
          textAnchor: "end",           // Aligné à droite du texte
          dx: -3,                      // Légèrement à l'intérieur
          fontSize: 9,
          fill: "#555",
          fontWeight: "500"
        })
      ]
    });
    chartRow.appendChild(plotPart);

    // Labels secteurs centrés (colonne séparée)
    const plotLabels = Plot.plot({
      width: widthLabels,
      height: plotHeight,
      marginLeft: 0,
      marginRight: 0,
      marginTop: 0,
      marginBottom: 0,
      x: { domain: [0, 1], axis: null },
      y: { domain: sectorOrder, axis: null, padding: 0 },
      marks: [
        Plot.text(sectorOrder.map(s => ({ secteur: s })), {
          x: 0.5,
          y: "secteur",
          text: "secteur",
          textAnchor: "middle",
          fontSize: 10,
          fontWeight: "500",
          fill: "#374151"
        })
      ]
    });
    chartRow.appendChild(plotLabels);

    // Évolution moyenne
    const avgEvol = computeAvgEvol(data);

    // Évolution (barres depuis 0) avec moyenne
    const plotEvol = Plot.plot({
      width: widthEvol,
      height: plotHeight,
      marginLeft: 0,
      marginRight: 35,                 // Espace étiquettes évol à droite
      marginTop: 0,
      marginBottom: 0,
      x: { domain: [minEvol, maxEvol], axis: null },
      y: { domain: sectorOrder, axis: null, padding: 0 },
      marks: [
        // Barres secteurs
        Plot.barX(data, {
          x: "evol",
          y: "secteur",
          fill: d => getEvolColor(d.evol),
          insetTop: 2,
          insetBottom: 2,
          tip: true,
          title: d => `${d.secteur}\nÉvol: ${d.evol > 0 ? '+' : ''}${d.evol?.toFixed(1)}%`
        }),
        Plot.ruleX([0], { stroke: "#999", strokeWidth: 1 }),
        // Ligne moyenne (pointillé léger, sans fond)
        ...(avgEvol != null ? [
          Plot.ruleX([avgEvol], { stroke: "#93c5fd", strokeWidth: 1, strokeDasharray: "3,3" })
        ] : []),
        // Étiquettes Évol - alignées à droite, COLORÉES selon valeur
        Plot.text(data.filter(d => d.evol != null), {
          x: maxEvol,
          y: "secteur",
          text: d => (d.evol > 0 ? '+' : '') + d.evol?.toFixed(1),
          textAnchor: "end",
          dx: -4,
          fontSize: 10,
          fill: d => getEvolLabelColor(d.evol),
          fontWeight: "500"
        })
      ]
    });
    chartRow.appendChild(plotEvol);

    block.appendChild(chartRow);

    // Afficher moyenne en dessous
    if (avgEvol != null) {
      const avgDiv = document.createElement('div');
      avgDiv.style.cssText = 'font-size:9px;color:#1e40af;text-align:right;margin-top:2px;margin-right:35px;';
      avgDiv.textContent = `Moy. pondérée: ${avgEvol > 0 ? '+' : ''}${avgEvol.toFixed(1)}%`;
      block.appendChild(avgDiv);
    }

    return block;
  };

  // === CONTAINER PRINCIPAL ===
  const container = document.createElement('div');
  container.style.cssText = 'display:flex;align-items:flex-start;overflow-x:auto;gap:0;';

  // === FRANCE (référence) ===
  container.appendChild(createTerritoryBlock(franceAligned, 'France (référence)', true));

  // === TERRITOIRES COMPARÉS ===
  territories.forEach((terr) => {
    const terrAligned = alignData(terr.data);
    container.appendChild(createTerritoryBlock(terrAligned, terr.label, false));
  });

  return container;
}

// &e
