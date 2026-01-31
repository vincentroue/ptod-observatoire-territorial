// ============================================================
// &s MAPS — Helper cartes choroplèthes paramétrées
// ============================================================
// Date: 2025-12-29 | v2: 2026-01-13 (halo élargi, zoom sans counter-scale)
// Cartes France avec projection conic-conformal, sélection, labels
// Optimisé : 1 seule passe Plot.geo (vs 3-4 avant)
//
// Exports:
// - renderChoropleth(config) → Plot.plot() object
// - createMapWrapper(map, statsOverlay) → html wrapper
// - addMapClickHandlers(map, geoData, getCodeFn, onClick) → void
// ============================================================

import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import { html } from "npm:htl";
import { INDICATEURS } from "./indicators-ddict-js.js";
import { parseColKey } from "./indicators-ddict-ext.js";

// ============================================================
// &s PROJECTION — Config projection France
// ============================================================

export const PROJECTION_FRANCE = {
  type: "conic-conformal",
  rotate: [-3, -46.5],
  parallels: [44, 49]
};

// ============================================================
// &s CHOROPLETH — Génération carte choroplèthe
// ============================================================

/**
 * Génère une carte choroplèthe France avec:
 * - Projection conic-conformal
 * - Remplissage coloré par valeur
 * - Contour et sélection highlight
 * - Labels intelligents (auto-disable, topN, modes)
 *
 * @param {Object} config
 * @param {Object} config.geoData - FeatureCollection GeoJSON
 * @param {string} config.valueCol - Colonne valeur pour couleur
 * @param {Function} config.getColor - (value, feature) => color string
 * @param {Function} config.getCode - (feature) => code string
 * @param {Function} config.getLabel - ({code}) => label string
 * @param {Function} config.formatValue - (colKey, value) => formatted string
 * @param {string} config.indicLabel - Label indicateur pour tooltip
 * @param {Array} [config.selectedCodes=[]] - Codes sélectionnés (highlight jaune)
 * @param {boolean} [config.showLabels=false] - Afficher labels sur carte
 * @param {string} [config.labelMode="values"] - Mode labels: "none"|"values"|"names"|"both"
 * @param {number} [config.topN=0] - TopN labels (0=tous si showLabels)
 * @param {string} [config.labelBy="population"] - Tri labels: "population"|"indicator_top"|"indicator_bottom"
 * @param {number} [config.maxLabelsAuto=50] - Auto-disable labels si > N features
 * @param {string} [config.echelon=""] - Échelon pour taille labels
 * @param {Object} [config.overlayGeo=null] - GeoJSON overlay (contours dept)
 * @param {number} [config.width=540] - Largeur
 * @param {number} [config.height=560] - Hauteur
 * @returns {Object|null} Plot.plot() object ou null si pas de geo
 */
export function renderChoropleth(config) {
  const {
    geoData,
    valueCol,
    getColor,
    getCode,
    getLabel,
    formatValue,
    indicLabel,
    selectedCodes = [],
    showLabels = false,
    labelMode = "values",   // "none" | "values" | "names" | "both"
    topN = 0,               // 0 = tous, >0 = top N
    labelBy = "population", // "population" | "indicator_top" | "indicator_bottom"
    maxLabelsAuto = 50,     // Auto-disable labels si > N features
    echelon = "",
    overlayGeo = null,      // GeoJSON contours à superposer (ex: départements)
    title = null,           // Titre SVG (s'exporte avec la carte)
    width = 540,
    height = 560,
    marginLeft = 50,        // Espace blanc gauche (légende peut chevaucher)
    marginTop = 30,         // Espace pour titre si présent
    marginRight = 10,
    marginBottom = 10
  } = config;

  if (!geoData || !geoData.features || geoData.features.length === 0) {
    return null;
  }

  const selectedSet = new Set(selectedCodes || []);

  // Construire marks optimisés
  const marks = [
    // 0. Titre SVG (s'exporte avec la carte)
    title ? Plot.text([title], {
      x: width / 2,
      y: 16,
      text: d => d,
      fontSize: 14,
      fontWeight: 700,
      fill: "#1f2937",
      textAnchor: "middle",
      frameAnchor: "top"
    }) : null,

    // 1. Contour France en fond : stroke gris foncé (bordure extérieure)
    Plot.geo(geoData, { fill: "none", stroke: "#333", strokeWidth: 1.5 }),

    // 2. Fill + stroke intérieur blanc fin (couvre stroke sauf bordure France)
    Plot.geo(geoData, {
      fill: d => getColor(d.properties[valueCol], d),
      stroke: d => selectedSet.has(getCode(d)) ? "#000" : "#fff",
      strokeWidth: d => selectedSet.has(getCode(d)) ? 2.5 : 0.3,
      title: d => {
        const code = getCode(d);
        const lbl = getLabel({ code }) || code;
        const v = d.properties[valueCol];
        const p23 = d.properties.P23_POP;
        // Récupérer le medium de l'indicateur depuis INDICATEURS
        const { indic } = parseColKey(valueCol);
        const indicMedium = INDICATEURS[indic]?.medium || indicLabel || indic;
        return lbl + "\n" + indicMedium + ": " + formatValue(valueCol, v) +
          "\nPop 2023: " + (p23 ? p23.toLocaleString("fr-FR") : "—");
      }
    }),

    // Overlay contours (départements sur ZE/EPCI/etc.)
    overlayGeo ? Plot.geo(overlayGeo, {
      fill: "none",
      stroke: "#666",
      strokeWidth: 1,
      strokeOpacity: 0.6
    }) : null,

    // Labels intelligents en 3 tiers (progressive reveal au zoom)
    // IMPORTANT: Un seul mark avec tous labels triés par |valeur|
    // addZoomBehavior masque/révèle par index : 0-9 (tier1), 10-29 (tier2), 30+ (tier3)
    (() => {
      if (!showLabels || labelMode === "none") return null;

      // Auto-disable si trop de features (sauf si topN explicite)
      const shouldShow = topN > 0 || geoData.features.length <= maxLabelsAuto;
      if (!shouldShow) return null;

      // Filtrer features avec valeurs valides
      let sorted = geoData.features.filter(f => f.properties[valueCol] != null);

      // Trier selon labelBy
      // Flag spécial top5_bot5 : besoin de séparer top et bottom
      let isTop5Bot5 = labelBy === "top5_bot5";
      let top5Features = null;
      let bot5Features = null;

      if (labelBy === "population") {
        // Par population décroissante (P22_POP ou P23_POP)
        sorted.sort((a, b) => (b.properties.P22_POP || b.properties.P23_POP || 0)
                            - (a.properties.P22_POP || a.properties.P23_POP || 0));
      } else if (labelBy === "indicator_top") {
        // Top écarts positifs (valeurs les plus hautes)
        sorted.sort((a, b) => b.properties[valueCol] - a.properties[valueCol]);
      } else if (labelBy === "indicator_bottom") {
        // Bottom écarts négatifs (valeurs les plus basses)
        sorted.sort((a, b) => a.properties[valueCol] - b.properties[valueCol]);
      } else if (isTop5Bot5) {
        // Top 5 + Bottom 5 : séparer les deux groupes
        const sortedByValue = [...sorted].sort((a, b) => b.properties[valueCol] - a.properties[valueCol]);
        top5Features = sortedByValue.slice(0, 5);
        bot5Features = sortedByValue.slice(-5).reverse();  // 5 plus bas, inversé pour avoir le pire en premier
        // Continuer avec top5 pour le tri principal
        sorted = [...top5Features, ...bot5Features];
      } else {
        // Fallback: par |valeur| absolue
        sorted.sort((a, b) => Math.abs(b.properties[valueCol]) - Math.abs(a.properties[valueCol]));
      }

      if (sorted.length === 0) return null;

      // Si topN explicite, limiter
      if (topN > 0) sorted = sorted.slice(0, topN);

      // Fonction texte selon labelMode - Cherche libellé dans TopoJSON puis lookup Map
      const getText = (d) => {
        const code = getCode(d);
        const val = d.properties[valueCol];
        const valStr = (val >= 0 ? "+" : "") + val.toFixed(1);
        // 1. Chercher dans TopoJSON (noms varient selon échelon)
        const topoName = d.properties.nom_officiel      // DEP, REG
                      || d.properties.libze2020         // ZE
                      || d.properties.libaav2020        // AAV
                      || d.properties.libbv2022         // BV
                      || d.properties.libelle           // Générique
                      || d.properties.LIBGEO;           // Communes
        // 2. Sinon lookup via getLabel (Map code → libellé)
        const rawName = topoName || getLabel({ code }) || code;
        const name = rawName.length > 12 ? rawName.substring(0, 11) + "…" : rawName;
        if (labelMode === "values") return valStr;
        if (labelMode === "names") return name;
        if (labelMode === "both") return `${name}\n${valStr}`;
        return valStr;
      };

      // Labels : 12px (< 30 features) ou 10px (> 30) — augmenté +1px
      const baseFontSize = geoData.features.length < 30 ? 12 : 10;

      // ============================================================
      // Anti-collision v2 : projection écran + bbox rectangulaire
      // ============================================================
      // Créer projection pour convertir géo → pixels
      const projection = d3.geoConicConformal()
        .rotate([-3, -46.5])
        .parallels([44, 49])
        .fitSize([width - marginLeft - marginRight, height - marginTop - marginBottom], geoData);

      // Préparer données avec centroid projeté et bbox estimée
      const withBbox = sorted.map(d => {
        const centroid = d.properties._centroid || d3.geoCentroid(d);
        const projected = projection(centroid);
        if (!projected) return null;

        const text = getText(d);
        const lines = text.split("\n");
        const maxLineLen = Math.max(...lines.map(l => l.length));
        // Estimation bbox : largeur ≈ chars × fontSize × 0.55, hauteur ≈ lines × fontSize × 1.2
        const estWidth = maxLineLen * baseFontSize * 0.55;
        const estHeight = lines.length * baseFontSize * 1.2;

        return {
          feature: d,
          x: projected[0],
          y: projected[1],
          width: estWidth,
          height: estHeight
        };
      }).filter(Boolean);

      // Collision rectangulaire avec padding
      const padding = 4;  // px entre labels
      const filtered = [];
      for (const item of withBbox) {
        const overlaps = filtered.some(kept => {
          // Collision AABB (Axis-Aligned Bounding Box)
          const ax1 = item.x - item.width / 2 - padding;
          const ax2 = item.x + item.width / 2 + padding;
          const ay1 = item.y - item.height / 2 - padding;
          const ay2 = item.y + item.height / 2 + padding;
          const bx1 = kept.x - kept.width / 2;
          const bx2 = kept.x + kept.width / 2;
          const by1 = kept.y - kept.height / 2;
          const by2 = kept.y + kept.height / 2;
          return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
        });
        if (!overlaps) filtered.push(item);
      }

      // Mode top5_bot5 : 2 marks séparés (top=blanc, bot=rouge)
      if (isTop5Bot5 && bot5Features) {
        const bot5Set = new Set(bot5Features.map(f => getCode(f)));
        const topFiltered = filtered.filter(f => !bot5Set.has(getCode(f.feature)));
        const botFiltered = filtered.filter(f => bot5Set.has(getCode(f.feature)));

        return [
          // Top 5 avec stroke blanc
          topFiltered.length > 0 ? Plot.text(topFiltered.map(f => f.feature), {
            x: d => d.properties._centroid?.[0] ?? d3.geoCentroid(d)[0],
            y: d => d.properties._centroid?.[1] ?? d3.geoCentroid(d)[1],
            text: getText,
            fontSize: baseFontSize + 1, fontWeight: 700, fill: "#1f2937",
            stroke: "#fff", strokeWidth: 2.5, lineHeight: 1.1
          }) : null,
          // Bottom 5 avec police rouge foncé + contour blanc
          botFiltered.length > 0 ? Plot.text(botFiltered.map(f => f.feature), {
            x: d => d.properties._centroid?.[0] ?? d3.geoCentroid(d)[0],
            y: d => d.properties._centroid?.[1] ?? d3.geoCentroid(d)[1],
            text: getText,
            fontSize: baseFontSize + 1, fontWeight: 700,
            fill: "#991b1b",  // Rouge foncé pour bottom (texte)
            stroke: "#fff", strokeWidth: 2.5, lineHeight: 1.1
          }) : null
        ].filter(Boolean);
      }

      return Plot.text(filtered.map(f => f.feature), {
        x: d => d.properties._centroid?.[0] ?? d3.geoCentroid(d)[0],
        y: d => d.properties._centroid?.[1] ?? d3.geoCentroid(d)[1],
        text: getText,
        fontSize: baseFontSize + 1,  // +1px taille police
        fontWeight: 700,             // Gras marqué
        fill: "#1f2937",
        stroke: "#fff",
        strokeWidth: 2.5,            // Halo blanc pour lisibilité
        lineHeight: 1.1
      });
    })(),

    // Surbrillance CONTOUR pour sélectionnés (pas de fill)
    selectedSet.size > 0 ? Plot.geo(
      geoData.features.filter(f => selectedSet.has(getCode(f))),
      { fill: "none", stroke: "#ffd500", strokeWidth: 2.5 }
    ) : null
  ].flat().filter(Boolean);  // flat() pour top5_bot5 qui retourne un array de marks

  return Plot.plot({
    projection: { ...PROJECTION_FRANCE, domain: geoData },
    marks,
    width,
    height,
    marginLeft,
    marginTop,
    marginRight,
    marginBottom
  });
}

// ============================================================
// &s WRAPPER — Conteneur carte + overlay stats
// ============================================================

/**
 * Crée un wrapper HTML contenant la carte, l'overlay stats, la légende et les boutons zoom
 *
 * @param {Object} map - Plot.plot() object
 * @param {Object} statsOverlay - HTML element overlay stats
 * @param {Object} [legendElement=null] - HTML element légende
 * @param {Object} [zoomControls=null] - { zoomIn, zoomOut, zoomReset } fonctions zoom
 * @param {Object} [config={}] - { legendPosition, exportSVGFn, echelon, colKey }
 * @returns {Object} HTML wrapper element
 */
export function createMapWrapper(map, statsOverlay, legendElement = null, zoomControls = null, config = {}) {
  const { legendPosition = "overlay", exportSVGFn = null, echelon = "", colKey = "" } = config;
  const wrapper = html`<div class="map-wrapper"></div>`;
  if (map) {
    wrapper.appendChild(map);
    if (statsOverlay) {
      wrapper.appendChild(statsOverlay);
    }
    if (legendElement) {
      // Légende toujours en bas à gauche (position absolue)
      const legendWrapper = html`<div class="legend-bottom-left"></div>`;
      legendWrapper.appendChild(legendElement);
      wrapper.appendChild(legendWrapper);
    }
    // Bouton SVG en bas à droite (même ligne que légende)
    if (exportSVGFn && map) {
      const svgBtn = html`<button class="svg-export-btn" title="Export SVG">📥</button>`;
      svgBtn.onclick = () => exportSVGFn(map, `carte_${echelon || "map"}_${colKey || "indic"}.svg`);
      wrapper.appendChild(svgBtn);
    }
    // Boutons zoom (P4.7)
    if (zoomControls) {
      const zoomBtns = html`<div class="zoom-controls">
        <button class="zoom-btn" title="Zoom +">+</button>
        <button class="zoom-btn" title="Zoom -">−</button>
        <button class="zoom-btn" title="Réinitialiser">⌂</button>
      </div>`;
      const [btnIn, btnOut, btnReset] = zoomBtns.querySelectorAll("button");
      btnIn.onclick = () => zoomControls.zoomIn();
      btnOut.onclick = () => zoomControls.zoomOut();
      btnReset.onclick = () => zoomControls.zoomReset();
      wrapper.appendChild(zoomBtns);
    }
  }
  return wrapper;
}

// ============================================================
// &s CLICK — Gestionnaire click sur carte
// ============================================================

/**
 * Ajoute les handlers de click sur les paths de la carte
 *
 * @param {Object} map - Plot.plot() SVG element
 * @param {Object} geoData - FeatureCollection pour mapping index→feature
 * @param {Function} getCode - (feature) => code string
 * @param {Function} onClick - (code) => void callback
 */
export function addMapClickHandlers(map, geoData, getCode, onClick) {
  if (!map) return;

  map.style.cursor = "pointer";
  map.addEventListener("click", (e) => {
    const path = e.target.closest("path");
    if (!path) return;

    const parent = path.parentElement;
    const paths = Array.from(parent.querySelectorAll("path"));
    const idx = paths.indexOf(path);

    if (idx >= 0 && idx < geoData.features.length) {
      const feature = geoData.features[idx];
      if (feature) {
        const code = getCode(feature);
        onClick(code);
      }
    }
  });
}

// ============================================================
// &s ZOOM — Comportement zoom D3 sur carte (P4.3)
// ============================================================

/**
 * Ajoute le comportement de zoom D3 à une carte Plot
 *
 * @param {Object} map - Plot.plot() SVG element
 * @param {Object} [config={}] - Configuration zoom
 * @param {number} [config.minScale=1] - Zoom minimum (1 = pas de dézoom)
 * @param {number} [config.maxScale=8] - Zoom maximum
 * @returns {Object|null} { zoomIn, zoomOut, zoomReset } ou null si pas de map
 */
export function addZoomBehavior(map, config = {}) {
  if (!map) return null;

  const { minScale = 1, maxScale = 8 } = config;

  // Sélectionner le SVG avec D3
  const svg = d3.select(map);

  // Plot.plot génère plusieurs groupes <g> enfants directs
  // On doit les wrapper dans un groupe unique pour le zoom
  let contentGroup = svg.select("g.zoom-content");
  if (contentGroup.empty()) {
    // Créer le groupe wrapper
    contentGroup = svg.append("g").attr("class", "zoom-content");

    // Déplacer tous les enfants directs (sauf le nouveau groupe) dans le wrapper
    const children = svg.node().childNodes;
    const toMove = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      // Ne pas déplacer le groupe zoom-content lui-même
      if (child !== contentGroup.node() && child.nodeType === 1) {
        toMove.push(child);
      }
    }
    toMove.forEach(child => contentGroup.node().appendChild(child));
  }

  // Stocker les tailles de stroke initiales des labels (pas font-size)
  const textElements = contentGroup.selectAll("text");
  const baseStyles = new Map();
  textElements.each(function() {
    const el = d3.select(this);
    const strokeWidth = parseFloat(el.style("stroke-width") || el.attr("stroke-width") || 2.5);
    baseStyles.set(this, { strokeWidth });
  });

  // Sélectionner tous les éléments text et les classer par tier
  // Plot génère les labels dans l'ordre : tier1 (0-9), tier2 (10-29), tier3 (30+)
  const allTexts = contentGroup.selectAll("text").nodes();
  const tier1Texts = allTexts.slice(0, 10);
  const tier2Texts = allTexts.slice(10, 30);
  const tier3Texts = allTexts.slice(30);

  // État initial : masquer tier2 et tier3
  d3.selectAll(tier2Texts).attr("opacity", 0);
  d3.selectAll(tier3Texts).attr("opacity", 0);

  // ZOOM géométrique + révélation progressive par tiers
  // Labels ne counter-scale PAS la font-size → ils rétrécissent avec le zoom
  // comme le scatter (police stable, pas de grossissement)
  // Seul le stroke-width est counter-scaled pour garder le halo lisible
  const zoom = d3.zoom()
    .scaleExtent([minScale, maxScale])
    .on("zoom", (event) => {
      const { k } = event.transform;

      // 1. Appliquer transform au groupe (pan + zoom géométrique)
      contentGroup.attr("transform", event.transform);

      // 2. Counter-scale seulement stroke (halo blanc) pas font-size
      textElements.each(function() {
        const base = baseStyles.get(this);
        if (base) {
          d3.select(this)
            .attr("stroke-width", base.strokeWidth / k);
        }
      });

      // 3. Révélation progressive par tiers (seuils abaissés)
      const tier2Visible = k >= 1.5;       // Zoom >= 1.5x
      const tier3Visible = k >= 2.5;       // Zoom >= 2.5x

      d3.selectAll(tier1Texts).attr("opacity", 1);
      d3.selectAll(tier2Texts).attr("opacity", tier2Visible ? 1 : 0);
      d3.selectAll(tier3Texts).attr("opacity", tier3Visible ? 1 : 0);
    });

  // Appliquer au SVG
  svg.call(zoom);

  // Retourner les fonctions de contrôle
  return {
    zoomIn: () => svg.transition().duration(300).call(zoom.scaleBy, 1.5),
    zoomOut: () => svg.transition().duration(300).call(zoom.scaleBy, 0.67),
    zoomReset: () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity)
  };
}

// ============================================================
// &s STATS_OVERLAY — Génération overlay statistiques
// ============================================================

/**
 * Génère l'overlay HTML des statistiques carte
 *
 * @param {Object} config
 * @param {number} config.mean - Valeur France (ex-mean, lookup 00FR)
 * @param {number} config.median - Non utilisé (gardé pour compatibilité)
 * @param {string} [config.top3=""] - Top 3 territoires
 * @param {string} [config.bottom3=""] - Bottom 3 territoires
 * @param {number} [config.selCount=0] - Nombre sélectionnés
 * @param {number} [config.selMean=null] - Moyenne sélection
 * @param {boolean} [config.showTop3Bottom3=true] - Afficher top/bottom
 * @returns {Object} HTML element
 */
export function createStatsOverlay(config) {
  const {
    mean,  // Valeur France (lookup 00FR)
    // median - non utilisé (France = mean = median maintenant)
    top3 = "",
    bottom3 = "",
    selCount = 0,
    selMean = null,
    showTop3Bottom3 = true
  } = config;

  return html`<div class="map-stats-overlay">
    <div class="stat-line" style="font-weight:600">🇫🇷 France ${mean >= 0 ? "+" : ""}${mean?.toFixed(2)}</div>
    ${showTop3Bottom3 ? html`<div class="stat-line top">Top3: ${top3}</div>` : ""}
    ${showTop3Bottom3 ? html`<div class="stat-line bottom">Bot3: ${bottom3}</div>` : ""}
    ${selCount > 0 && selMean != null ? html`<div class="stat-line sel">Sél.(${selCount}) ${selMean >= 0 ? "+" : ""}${selMean?.toFixed(2)}</div>` : ""}
  </div>`;
}

// ============================================================
// &s MAP_PANEL_FACTORY — Factory pour panneaux carte complets
// ============================================================

/**
 * Crée un panneau carte complet (map + legend + zoom + export)
 * Réduit la duplication entre les 4 blocs map du dashboard
 *
 * @param {Object} config
 * @param {Object} config.geoData - FeatureCollection GeoJSON
 * @param {Object[]} config.data - Données pour bins/gradient
 * @param {string} config.colKey - Colonne indicateur
 * @param {string} config.indicName - Nom indicateur pour formatValue
 * @param {string} config.indicLabel - Label indicateur pour tooltip/titre
 * @param {Object} config.meta - Echelon meta {geoKey, labelKey, filterKey}
 * @param {Function} config.getLabelFn - (code) => label
 * @param {Function} config.formatValueFn - (indic, value) => string
 * @param {Function} config.computeBinsFn - (data, colKey, indic) => bins result
 * @param {Function} config.createGradientFn - (data, colKey) => gradient result
 * @param {boolean} config.isGradient - Mode gradient vs bins
 * @param {Object} config.gradientPalettes - {divergent, sequential}
 * @param {Function} config.countBinsFn - (data, colKey, thresholds) => counts
 * @param {Function} config.createBinsLegendFn - (config) => legend HTML
 * @param {Function} config.createGradientLegendFn - (config) => legend HTML
 * @param {Function} config.getIndicUnitFn - (colKey) => unit string
 * @param {string[]} [config.selectedCodes=[]] - Codes sélectionnés
 * @param {boolean} [config.showLabels=true] - Afficher labels
 * @param {string} [config.labelMode="names"] - Mode labels
 * @param {string} [config.labelBy="population"] - Tri labels
 * @param {number} [config.topN=10] - Nombre labels
 * @param {string} [config.echelon=""] - Nom échelon
 * @param {Object} [config.overlayGeo=null] - Overlay contours
 * @param {string} [config.titleSuffix=""] - Suffixe titre (ex: nom territoire zoom)
 * @param {number} [config.width=420] - Largeur carte
 * @param {number} [config.height=390] - Hauteur carte
 * @param {number} [config.maxLabelsAuto=50] - Auto-disable labels threshold
 * @param {Function} [config.onCtrlClick] - Handler Ctrl+click
 * @param {Function} [config.onClick] - Handler click normal
 * @param {Function} [config.exportSVGFn] - Fonction export SVG
 * @returns {Object} { map, legend, wrapper, exportBtn, zoomControls }
 */
export function createMapPanel(config) {
  const {
    geoData,
    data,
    colKey,
    indicName,
    indicLabel,
    meta,
    getLabelFn,
    formatValueFn,
    computeBinsFn,
    createGradientFn,
    isGradient,
    gradientPalettes,
    countBinsFn,
    createBinsLegendFn,
    createGradientLegendFn,
    getIndicUnitFn,
    selectedCodes = [],
    showLabels = true,
    labelMode = "names",
    labelBy = "population",
    topN = 10,
    echelon = "",
    overlayGeo = null,
    titleSuffix = "",
    width = 420,
    height = 390,
    maxLabelsAuto = 50,
    onCtrlClick = () => {},
    onClick = () => {},
    exportSVGFn = null
  } = config;

  // Calcul bins/gradient
  const binsResult = computeBinsFn(data, colKey, indicName);
  const gradientResult = createGradientFn(data, colKey);
  const getColor = isGradient ? gradientResult.getColor : binsResult.getColor;

  // Titre avec suffixe optionnel
  const title = titleSuffix ? `${indicLabel} — ${titleSuffix}` : indicLabel;

  // Rendu carte
  const map = renderChoropleth({
    geoData,
    valueCol: colKey,
    getColor: (v, f) => getColor(v),
    getCode: f => f.properties[meta.geoKey],
    getLabel: ({ code }) => getLabelFn(code),
    formatValue: (k, v) => formatValueFn(indicName, v),
    indicLabel,
    selectedCodes,
    showLabels,
    labelMode,
    labelBy,
    topN,
    title,
    echelon,
    overlayGeo,
    width,
    height,
    maxLabelsAuto
  });

  // Légende
  const unit = getIndicUnitFn(colKey);
  const counts = countBinsFn(data, colKey, binsResult.bins?.thresholds || []);
  const legend = isGradient
    ? createGradientLegendFn({
        colors: gradientResult.divergent
          ? gradientPalettes.divergent["Violet-Vert"]
          : gradientPalettes.sequential,
        min: gradientResult.min,
        max: gradientResult.max,
        showZero: gradientResult.divergent,
        decimals: 2,
        title: `Légende${unit ? " (" + unit + ")" : ""}`,
        capped: true,
        rawMin: gradientResult.rawMin,
        rawMax: gradientResult.rawMax
      })
    : createBinsLegendFn({
        colors: binsResult.palette,
        labels: binsResult.bins?.labels || [],
        counts,
        vertical: true,
        title: "Légende",
        unit,
        reverse: !binsResult.isDiv
      });

  // Click handlers
  if (map) {
    map.style.cursor = "pointer";
    map.addEventListener("click", (e) => {
      const path = e.target.closest("path");
      if (!path) return;
      const paths = Array.from(path.parentElement.querySelectorAll("path"));
      const idx = paths.indexOf(path);
      if (idx >= 0 && idx < geoData.features.length) {
        const code = geoData.features[idx].properties[meta.geoKey];
        if (e.ctrlKey || e.metaKey) {
          onCtrlClick(code);
        } else {
          onClick(code);
        }
      }
    });
  }

  // Zoom behavior
  const zoomControls = addZoomBehavior(map);

  // Wrapper avec légende, zoom et SVG export intégré
  const wrapper = createMapWrapper(map, null, legend, zoomControls, {
    exportSVGFn,
    echelon,
    colKey
  });

  return {
    map,
    legend,
    wrapper,
    exportBtn: null,  // Plus utilisé, intégré dans wrapper
    zoomControls,
    binsResult,
    gradientResult
  };
}

// &e
