// &s MAPLIBRE_HELPERS_aaMAIN - Helper MapLibre réutilisable OTTD

// Exports :
// - createMapConfig(overrides) → MapOptions avec défauts OTTD
// - createOTTDMap(container, overrides) → Promise<{map, maplibregl, Popup}>
// - buildChoroplethSource(features, dataMap, colKey, getColor, opts) → GeoJSON enrichi
// - addChoroplethLayers(map, sourceId, geoJSON, opts) → {fillLayerId, lineLayerId, ...}
// - attachTooltip(map, layerId, buildFn, opts) → détach fn
// - createTooltipBridge(colKey, data, frRef, buildTerritoryTooltip, opts) → buildFn
// - attachHighlight(map, triggerLayerId, hoverLayerId, opts) → détach fn
// - attachClick(map, layerId, onClick, opts) → détach fn
// - createResetControl(map, bounds, opts) → HTMLElement
// - createMapLegend(colors, labels, opts) → HTMLElement
// - addLabelsLayer(map, sourceId, opts) → layerId
// - createMapWrapper(opts) → {outer, wrapper, mapContainer}
// - computeBounds(features) → {bounds, center}

// &s CONFIG_FACTORY - Défauts MapLibre OTTD

const OTTD_MAP_DEFAULTS = {
  style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  attributionControl: false,
  cooperativeGestures: true,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  renderWorldCopies: false,
  fadeDuration: 0,
  cancelPendingTileRequestsWhileZooming: true,
  maxZoom: 16,
  locale: {
    "NavigationControl.ZoomIn": "Zoom +",
    "NavigationControl.ZoomOut": "Zoom −",
    "NavigationControl.ResetBearing": "Nord",
    "CooperativeGestureHandler.WindowsHelpText": "Ctrl + molette pour zoomer",
    "CooperativeGestureHandler.MacHelpText": "⌘ + molette pour zoomer",
    "CooperativeGestureHandler.MobileHelpText": "2 doigts pour zoomer"
  }
};

/**
 * Retourne un objet MapOptions avec les défauts OTTD mergés
 * @param {Object} overrides - Options spécifiques à merger (center, zoom, maxBounds, container...)
 * @returns {Object} MapOptions complet
 */
export function createMapConfig(overrides = {}) {
  return { ...OTTD_MAP_DEFAULTS, ...overrides };
}

// &e

// &s MAP_FACTORY - Création map complète avec CSS + NavControl

const MAPLIBRE_CSS_ID = "maplibre-css-ottd";
const MAPLIBRE_CSS_URL = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

/**
 * Crée une carte MapLibre avec tous les défauts OTTD
 * Injecte le CSS si absent, ajoute NavigationControl
 * @param {HTMLElement} container - Élément DOM conteneur
 * @param {Object} overrides - Options map spécifiques
 * @returns {Promise<{map, maplibregl, Popup}>} Instances maplibre
 */
export async function createOTTDMap(container, overrides = {}) {
  const _ml = await import("npm:maplibre-gl");
  const maplibregl = _ml.default || _ml;
  const MapClass = maplibregl.Map || maplibregl;
  const NavControl = maplibregl.NavigationControl || _ml.NavigationControl;
  const PopupClass = maplibregl.Popup || _ml.Popup;

  // Inject CSS once
  if (!document.getElementById(MAPLIBRE_CSS_ID)) {
    const link = document.createElement("link");
    link.id = MAPLIBRE_CSS_ID;
    link.rel = "stylesheet";
    link.href = MAPLIBRE_CSS_URL;
    document.head.appendChild(link);
  }

  const config = createMapConfig({ container, ...overrides });
  const map = new MapClass(config);

  // Navigation control (zoom +/- only, sans compas)
  if (NavControl) {
    map.addControl(new NavControl({ showCompass: false }), "top-left");
  }

  return { map, maplibregl, Popup: PopupClass };
}

// &e

// &s CHOROPLETH_SOURCE - Build GeoJSON enrichi avec couleurs

/**
 * Construit un GeoJSON enrichi avec propriétés de remplissage pour choroplèthe MapLibre
 * @param {Array} features - GeoJSON features (topojson déjà converti)
 * @param {Map} dataMap - Map<code, data row> pour lookup
 * @param {string} colKey - Clé indicateur pour la couleur
 * @param {Function} getColor - (value) → couleur CSS
 * @param {Object} opts
 * @param {string} [opts.codeProperty="CODGEO"] - Nom propriété code dans feature.properties
 * @param {string} [opts.defaultFill="#f0f0f0"] - Couleur si donnée manquante
 * @param {Array<string>} [opts.extraProps] - Propriétés data à copier (ex: ["libelle", "P23_POP"])
 * @param {Function} [opts.formatVal] - (value, colKey) → string formatée pour labels carte
 * @returns {Object} GeoJSON FeatureCollection avec _fill, _label, _pop, _val, _valFmt
 */
export function buildChoroplethSource(features, dataMap, colKey, getColor, opts = {}) {
  const {
    codeProperty = "CODGEO",
    defaultFill = "#f0f0f0",
    extraProps = ["libelle", "P23_POP", "P22_POP"],
    formatVal = null
  } = opts;

  return {
    type: "FeatureCollection",
    features: features.map(f => {
      const code = f.properties[codeProperty];
      const d = dataMap.get(code);
      const val = d?.[colKey] ?? null;
      const color = val != null ? getColor(val) : defaultFill;

      const enriched = {
        _fill: color,
        _val: val,
        _code: code,
        _valFmt: val != null ? (formatVal ? formatVal(val, colKey) : String(val)) : ""
      };

      // Copie props utiles pour tooltip
      for (const prop of extraProps) {
        if (d?.[prop] != null) enriched["_" + prop] = d[prop];
        else if (f.properties[prop] != null) enriched["_" + prop] = f.properties[prop];
      }
      // Label fallback : libelle → LIBGEO → code
      enriched._label = d?.libelle || f.properties.LIBGEO || f.properties.NOM || code;
      enriched._pop = d?.P23_POP || d?.P22_POP || f.properties.POPULATION || 0;

      return {
        ...f,
        properties: { ...f.properties, ...enriched }
      };
    })
  };
}

// &e

// &s CHOROPLETH_LAYERS - Ajout layers choroplèthe standard

/**
 * Ajoute les layers choroplèthe standard (fill + line + hover + selected) sur une source
 * @param {Object} map - Instance MapLibre
 * @param {string} sourceId - ID source GeoJSON
 * @param {Object} geoJSON - FeatureCollection à ajouter comme source
 * @param {Object} opts
 * @param {string} [opts.prefix="choro"] - Préfixe IDs layers
 * @param {number} [opts.fillOpacity=0.65] - Opacité fill
 * @param {string} [opts.lineColor="#5b8fa8"] - Couleur bordure
 * @param {number} [opts.lineWidth=1] - Épaisseur bordure
 * @param {string} [opts.selectedCode] - Code territoire sélectionné (outline doré)
 * @param {string} [opts.codeProperty="CODGEO"] - Propriété code pour filtres
 * @param {string} [opts.hoverColor="#ffd700"] - Couleur hover
 * @param {string} [opts.selectedColor="#ffd700"] - Couleur outline sélection
 * @returns {Object} { fillLayerId, lineLayerId, hoverLayerId, selectedLayerId }
 */
export function addChoroplethLayers(map, sourceId, geoJSON, opts = {}) {
  const {
    prefix = "choro",
    fillOpacity = 0.65,
    lineColor = "#5b8fa8",
    lineWidth = 1,
    selectedCode = "",
    codeProperty = "CODGEO",
    hoverColor = "#ffd700",
    selectedColor = "#ffd700"
  } = opts;

  const fillId = `${prefix}-fill`;
  const lineId = `${prefix}-line`;
  const hoverId = `${prefix}-hover`;
  const selectedId = `${prefix}-selected`;

  map.addSource(sourceId, { type: "geojson", data: geoJSON });

  // Fill layer coloré par data
  map.addLayer({
    id: fillId, type: "fill", source: sourceId,
    paint: { "fill-color": ["get", "_fill"], "fill-opacity": fillOpacity }
  });

  // Borders
  map.addLayer({
    id: lineId, type: "line", source: sourceId,
    paint: { "line-color": lineColor, "line-width": lineWidth }
  });

  // Hover highlight (invisible par défaut, filtre dynamique)
  map.addLayer({
    id: hoverId, type: "fill", source: sourceId,
    paint: { "fill-color": hoverColor, "fill-opacity": 0.3 },
    filter: ["==", ["get", codeProperty], ""]
  });

  // Selected outline
  map.addLayer({
    id: selectedId, type: "line", source: sourceId,
    paint: { "line-color": selectedColor, "line-width": 3 },
    filter: ["==", ["get", codeProperty], selectedCode || ""]
  });

  return { fillLayerId: fillId, lineLayerId: lineId, hoverLayerId: hoverId, selectedLayerId: selectedId };
}

// &e

// &s ATTACH_TOOLTIP - Bridge MapLibre Popup ↔ tooltip builder

/**
 * Attache un tooltip Popup à un layer MapLibre
 * @param {Object} map - Instance MapLibre
 * @param {string} layerId - ID du layer cible (ex: "choro-fill")
 * @param {Function} buildFn - (properties, lngLat) → HTML string
 * @param {Object} opts
 * @param {Function} opts.Popup - Classe Popup MapLibre
 * @param {string} [opts.cursor="pointer"] - Curseur au hover
 * @param {number} [opts.maxWidth=280] - Largeur max popup
 * @param {boolean} [opts.closeButton=false]
 * @returns {Function} detach - Appeler pour retirer les listeners
 */
export function attachTooltip(map, layerId, buildFn, opts = {}) {
  const {
    Popup,
    cursor = "pointer",
    maxWidth = 280,
    closeButton = false
  } = opts;

  if (!Popup) {
    console.warn("attachTooltip: Popup class required in opts");
    return () => {};
  }

  const popup = new Popup({
    closeButton,
    closeOnClick: false,
    maxWidth: maxWidth + "px"
  });

  const onMove = (e) => {
    if (!e.features?.length) return;
    map.getCanvas().style.cursor = cursor;
    const props = e.features[0].properties;
    const html = buildFn(props, e.lngLat);
    if (html) {
      popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    }
  };

  const onLeave = () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  };

  map.on("mousemove", layerId, onMove);
  map.on("mouseleave", layerId, onLeave);

  return () => {
    map.off("mousemove", layerId, onMove);
    map.off("mouseleave", layerId, onLeave);
    popup.remove();
  };
}

/**
 * Crée un buildFn compatible avec attachTooltip depuis buildTerritoryTooltip
 * Bridge entre les propriétés MapLibre (_label, _pop, _val) et le format attendu par tooltip.js
 * @param {string} colKey - Clé indicateur
 * @param {Array} data - Données complètes (pour percentile)
 * @param {number|null} frRef - Valeur France de référence
 * @param {Function} buildTerritoryTooltip - Fonction tooltip.js
 * @param {Object} opts
 * @param {string} [opts.codeProperty="_code"] - Propriété code dans MapLibre properties
 * @returns {Function} (properties, lngLat) → HTML string
 */
export function createTooltipBridge(colKey, data, frRef, buildTerritoryTooltip, opts = {}) {
  const { codeProperty = "_code" } = opts;
  const dataMap = new Map(data.map(d => [String(d.code), d]));

  return (properties) => {
    const code = properties[codeProperty];
    const d = dataMap.get(code);
    if (!d) {
      // Fallback minimal depuis propriétés MapLibre
      const label = properties._label || code;
      const pop = properties._pop || 0;
      const val = properties._val;
      return `<b style="color:#fff;font-size:12.5px;">${label}</b><br>
        <span style="color:#cbd5e1;font-size:11px;">Pop. ${Number(pop).toLocaleString("fr-FR")} hab.</span>`;
    }
    return buildTerritoryTooltip(d, colKey, data, frRef);
  };
}

// &e

// &s ATTACH_HIGHLIGHT - Hover highlight layer toggle

/**
 * Attache un hover highlight qui suit le curseur sur un layer
 * Toggle un filtre sur un layer hover séparé
 * @param {Object} map - Instance MapLibre
 * @param {string} triggerLayerId - Layer sur lequel écouter les events (ex: "choro-fill")
 * @param {string} hoverLayerId - Layer highlight à filtrer (ex: "choro-hover")
 * @param {Object} opts
 * @param {string} [opts.codeProperty="CODGEO"] - Propriété code pour filtre
 * @returns {Function} detach - Appeler pour retirer les listeners
 */
export function attachHighlight(map, triggerLayerId, hoverLayerId, opts = {}) {
  const { codeProperty = "CODGEO" } = opts;

  const onMove = (e) => {
    if (!e.features?.length) return;
    const code = e.features[0].properties[codeProperty];
    map.setFilter(hoverLayerId, ["==", ["get", codeProperty], code || ""]);
  };

  const onLeave = () => {
    map.setFilter(hoverLayerId, ["==", ["get", codeProperty], ""]);
  };

  map.on("mousemove", triggerLayerId, onMove);
  map.on("mouseleave", triggerLayerId, onLeave);

  return () => {
    map.off("mousemove", triggerLayerId, onMove);
    map.off("mouseleave", triggerLayerId, onLeave);
  };
}

// &e

// &s ATTACH_CLICK - Click handler territoire

/**
 * Attache un click handler sur un layer
 * @param {Object} map - Instance MapLibre
 * @param {string} layerId - Layer cible
 * @param {Function} onClick - (code, properties, lngLat) → void
 * @param {Object} opts
 * @param {string} [opts.codeProperty="CODGEO"] - Propriété code
 * @returns {Function} detach
 */
export function attachClick(map, layerId, onClick, opts = {}) {
  const { codeProperty = "CODGEO" } = opts;

  const handler = (e) => {
    if (!e.features?.length) return;
    const props = e.features[0].properties;
    const code = props[codeProperty];
    if (code) onClick(code, props, e.lngLat);
  };

  map.on("click", layerId, handler);
  return () => map.off("click", layerId, handler);
}

// &e

// &s RESET_CONTROL - Bouton recentrer

/**
 * Crée un bouton reset / recentrer
 * @param {Object} map - Instance MapLibre
 * @param {Array} bounds - [[minLng, minLat], [maxLng, maxLat]]
 * @param {Object} opts
 * @param {string} [opts.label="⟲ Recentrer"] - Texte bouton
 * @param {number} [opts.padding=30] - Padding fitBounds
 * @param {number} [opts.maxZoom=12] - Zoom max fitBounds
 * @param {number} [opts.duration=600] - Durée animation ms
 * @param {string} [opts.position="top-right"] - Position CSS
 * @returns {HTMLElement} Bouton positionné (à ajouter au wrapper)
 */
export function createResetControl(map, bounds, opts = {}) {
  const {
    label = "⟲ Recentrer",
    padding = 30,
    maxZoom = 12,
    duration = 600,
    position = "top-right"
  } = opts;

  const btn = document.createElement("button");
  btn.textContent = label;
  btn.style.cssText = `
    position: absolute; z-index: 5;
    background: #fff; border: 1px solid #d1d5db; border-radius: 4px;
    padding: 3px 8px; font-size: 11px; cursor: pointer; color: #374151;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    ${position.includes("top") ? "top:8px;" : "bottom:8px;"}
    ${position.includes("right") ? "right:8px;" : "left:50px;"}
  `;
  btn.onmouseenter = () => btn.style.background = "#f3f4f6";
  btn.onmouseleave = () => btn.style.background = "#fff";

  btn.onclick = () => {
    if (bounds) map.fitBounds(bounds, { padding, maxZoom, duration });
  };

  return btn;
}

// &e

// &s MAP_LEGEND - Légende choroplèthe HTML

/**
 * Crée une légende choroplèthe horizontale ou verticale
 * @param {Array<string>} colors - Couleurs des bins
 * @param {Array<string>} labels - Labels des bins (même taille que colors)
 * @param {Object} opts
 * @param {string} [opts.title] - Titre légende
 * @param {string} [opts.direction="horizontal"] - "horizontal" ou "vertical"
 * @param {number} [opts.swatchSize=14] - Taille carrés couleur
 * @param {string} [opts.position="bottom-left"] - Position dans le wrapper
 * @param {Array<number>} [opts.counts] - Nb valeurs par bin (si fourni, bins à 0 sont masquées)
 * @returns {HTMLElement} Légende positionnée
 */
export function createMapLegend(colors, labels, opts = {}) {
  const {
    title = "",
    direction = "horizontal",
    swatchSize = 14,
    position = "bottom-left",
    counts = null
  } = opts;

  const container = document.createElement("div");
  container.style.cssText = `
    position: absolute; z-index: 4;
    background: rgba(255,255,255,0.92); border: 1px solid #e0e5ea; border-radius: 4px;
    padding: 6px 10px; font-size: 10px; color: #374151;
    ${position.includes("bottom") ? "bottom:8px;" : "top:8px;"}
    ${position.includes("left") ? "left:8px;" : "right:8px;"}
    backdrop-filter: blur(2px);
    max-width: 300px;
  `;

  let html = "";
  if (title) {
    html += `<div style="font-weight:600; margin-bottom:3px; font-size:10px; color:#666; text-transform:uppercase; letter-spacing:0.3px;">${title}</div>`;
  }

  const isHoriz = direction === "horizontal";
  const flexDir = isHoriz ? "row" : "column";

  html += `<div style="display:flex; flex-direction:${flexDir}; gap:${isHoriz ? '4' : '2'}px; flex-wrap:wrap;">`;
  for (let i = 0; i < colors.length; i++) {
    // Skip bins with 0 values if counts provided
    if (counts && counts[i] === 0) continue;
    html += `<div style="display:flex; align-items:center; gap:3px;">
      <span style="display:inline-block; width:${swatchSize}px; height:${swatchSize}px; background:${colors[i]}; border-radius:2px; border:1px solid rgba(0,0,0,0.1); flex-shrink:0;"></span>
      <span style="white-space:nowrap; line-height:1.2;">${labels[i] || ""}</span>
    </div>`;
  }
  html += "</div>";

  container.innerHTML = html;
  return container;
}

// &e

// &s MAP_WRAPPER - Conteneur carte standard

/**
 * Crée un wrapper carte standard avec titre optionnel
 * Structure : outer > [titleEl] + wrapper(position:relative) > mapContainer
 * Les overlays (reset, legend) doivent être appendés à wrapper (pas outer)
 * @param {Object} opts
 * @param {number} [opts.height=360] - Hauteur carte en px
 * @param {string} [opts.borderColor="#e0e5ea"] - Couleur bordure
 * @param {number} [opts.borderRadius=6] - Rayon bordure
 * @param {string} [opts.title=""] - Titre affiché au-dessus de la carte
 * @returns {{outer: HTMLElement, wrapper: HTMLElement, mapContainer: HTMLElement}}
 */
export function createMapWrapper(opts = {}) {
  const {
    height = 360,
    borderColor = "#e0e5ea",
    borderRadius = 6,
    title = ""
  } = opts;

  const outer = document.createElement("div");

  if (title) {
    const titleEl = document.createElement("div");
    titleEl.style.cssText = "font-size:12px; font-weight:600; color:#1a5276; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.3px;";
    titleEl.textContent = title;
    outer.appendChild(titleEl);
  }

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:relative;";

  const mapContainer = document.createElement("div");
  mapContainer.style.cssText = `
    width: 100%; height: ${height}px;
    border-radius: ${borderRadius}px; overflow: hidden;
    border: 1px solid ${borderColor};
  `;
  wrapper.appendChild(mapContainer);
  outer.appendChild(wrapper);

  return { outer, wrapper, mapContainer };
}

// &e

// &s LABELS_LAYER - Noms territoires sur la carte

/**
 * Ajoute une couche labels (noms territoires + valeur) au-dessus des polygones
 * Triés par population décroissante, anti-collision automatique MapLibre
 * @param {Object} map - Instance MapLibre
 * @param {string} sourceId - ID source GeoJSON (doit contenir _label, _pop, _valFmt)
 * @param {Object} opts
 * @param {string} [opts.prefix="choro"] - Préfixe ID layer
 * @param {string} [opts.labelProperty="_label"] - Propriété texte nom
 * @param {boolean} [opts.showValue=true] - Afficher la valeur sous le nom
 * @param {number} [opts.minZoom=8.5] - Zoom min affichage labels
 * @param {number} [opts.fontSize=11] - Taille texte
 * @param {number} [opts.haloWidth=1.5] - Largeur halo blanc
 * @param {string} [opts.textColor="#374151"] - Couleur texte
 * @returns {string} layerId
 */
export function addLabelsLayer(map, sourceId, opts = {}) {
  const {
    prefix = "choro",
    labelProperty = "_label",
    showValue = true,
    minZoom = 8.5,
    fontSize = 11,
    haloWidth = 1.5,
    textColor = "#374151"
  } = opts;

  const layerId = `${prefix}-labels`;

  // text-field : nom seul ou nom + valeur sur 2 lignes
  const textField = showValue
    ? ["concat", ["get", labelProperty], "\n", ["coalesce", ["get", "_valFmt"], ""]]
    : ["get", labelProperty];

  map.addLayer({
    id: layerId,
    type: "symbol",
    source: sourceId,
    minzoom: minZoom,
    layout: {
      "text-field": textField,
      "text-size": fontSize,
      "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
      "text-anchor": "center",
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "text-optional": true,
      "text-padding": 3,
      "symbol-sort-key": ["-", 0, ["coalesce", ["to-number", ["get", "_pop"]], 0]]
    },
    paint: {
      "text-color": textColor,
      "text-halo-color": "#fff",
      "text-halo-width": haloWidth
    }
  });

  return layerId;
}

// &e

// &s BBOX_UTILS - Calcul bbox depuis features

/**
 * Calcule la bounding box d'un ensemble de features GeoJSON
 * @param {Array} features - GeoJSON features
 * @returns {{bounds: Array|null, center: Array}} bounds [[minLng,minLat],[maxLng,maxLat]] + center
 */
export function computeBounds(features) {
  if (!features?.length) return { bounds: null, center: [2.3, 46.8] };

  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;

  for (const f of features) {
    const coords = f.geometry.type === "MultiPolygon"
      ? f.geometry.coordinates.flat(2)
      : f.geometry.type === "Polygon"
        ? f.geometry.coordinates.flat(1)
        : [];
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  if (minLng === Infinity) return { bounds: null, center: [2.3, 46.8] };

  return {
    bounds: [[minLng, minLat], [maxLng, maxLat]],
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
  };
}

// &e

// &e
