// &s TABLE_OJS_aaMAIN - Tableau triable générique (ES module + global)
// Usage multi-projets, accède DDICT + divGauge via window
// Aussi exposé comme window.buildDataTable pour usage plain JS (dash France)
// CSS auto-injecté, expand fullscreen intégré, barres divergentes, triangles évolution
// Date: 2026-03-04

// &s INJECT_CSS - Injection styles une seule fois

const _CSS_ID = "tableojs-styles";
function _injectCSS() {
  const existing = document.getElementById(_CSS_ID);
  if (existing) existing.remove();
  const style = document.createElement("style");
  style.id = _CSS_ID;
  style.textContent = `
.t-toolbar { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
.t-toolbar input { flex:1; padding:3px 7px; border:1px solid #d1d5db; border-radius:3px; font-size:11px; font-family:Inter,system-ui,sans-serif; }
.t-toolbar .info { font-size:10px; color:#9ca3af; white-space:nowrap; }
.t { font-family:Inter,system-ui,sans-serif; }
.t table { width:100%; border-collapse:collapse; font-size:10px; }
.t th { padding:2px 4px; border-bottom:1px solid #d0d4d9; font-size:9px; font-weight:600; color:#a0a7af; cursor:pointer; white-space:nowrap; text-align:left; background:#f0f2f4; }
.t th.active { color:#dc2626; }
.t th .th-unit { display:block; font-size:7.5px; font-weight:400; color:#6b7280; }
.t td { padding:2px 6px 2px 4px; border-bottom:1px solid #f3f4f6; font-size:9.5px; white-space:nowrap; vertical-align:middle; background:#fff; }
.t tr:hover td { background:#f8f9fa; }
.t .supra th { font-size:8px; text-align:center; background:#d5d8dc; border-bottom:1px solid #bcc1c7; padding:1px 2px; color:#1f2937; font-weight:700; text-transform:uppercase; letter-spacing:0.3px; }
.t .sticky-ref td { font-size:9.5px; }
.bar-cell { display:flex; align-items:center; gap:3px; }
.bar-bg { width:32px; height:9px; background:#eef0f2; border-radius:2px; position:relative; overflow:hidden; flex-shrink:0; }
.bar-fill { display:block; height:100%; border-radius:2px; }
.val { white-space:nowrap; }
.t-pager { display:flex; align-items:center; gap:2px; }
.t-pager button { border:1px solid #d1d5db; background:#fff; border-radius:3px; padding:0 5px; font-size:12px; cursor:pointer; line-height:1.6; color:#374151; }
.t-pager button:hover:not(:disabled) { background:#f3f4f6; }
.t-page-info { font-size:9px; color:#6b7280; min-width:28px; text-align:center; }
.t-expand-btn { font-size:13px; cursor:pointer; background:none; border:1px solid #d1d5db; border-radius:3px; padding:1px 5px; color:#6b7280; }
.t-expand-btn:hover { background:#f3f4f6; }
`;
  document.head.appendChild(style);
}

// &e INJECT_CSS

// &s EXPAND_TABLE - Overlay fullscreen intégré

function _expandTable(container, maxHeight) {
  if (container._tblExpanded) return;
  container._tblExpanded = true;
  const origStyle = container.style.cssText;
  const tDiv = container.querySelector(".t");
  const origMaxH = tDiv ? tDiv.style.maxHeight : "";

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0);z-index:9998;transition:background 0.2s;";
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => { backdrop.style.background = "rgba(0,0,0,0.6)"; });

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "Close &times;";
  closeBtn.style.cssText = "position:fixed;top:12px;right:20px;z-index:10001;font-size:14px;padding:6px 14px;cursor:pointer;background:#fff;border:1px solid #d1d5db;border-radius:4px;color:#374151;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.15);";
  document.body.appendChild(closeBtn);

  // Expand
  container.style.cssText = "position:fixed;top:3vh;left:3vw;width:94vw;height:92vh;z-index:9999;background:#fff;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.3);overflow:hidden;padding:8px;";
  if (tDiv) tDiv.style.maxHeight = "calc(92vh - 60px)";

  function close() {
    container.style.cssText = origStyle;
    container._tblExpanded = false;
    if (tDiv) tDiv.style.maxHeight = origMaxH;
    backdrop.remove();
    closeBtn.remove();
    document.removeEventListener("keydown", onEsc);
  }

  const onEsc = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onEsc);
  backdrop.onclick = close;
  closeBtn.onclick = close;
}

// &e EXPAND_TABLE

// &s BUILD_TABLE - Tableau triable avec search, sticky, barres z-score

/**
 * Construit un tableau triable avec barres z-score + trait de moyenne
 * @param {HTMLElement} container - Élément DOM conteneur
 * @param {Array} data - Données [{city, continent, n_listings, ...}]
 * @param {Object} config
 * @param {Array<string>} config.keys - Colonnes à afficher (clés CSV)
 * @param {string} [config.labelCol="city_fr"] - Colonne pour le label
 * @param {string} [config.labelFallback="city"] - Fallback si labelCol absent
 * @param {string} [config.labelHeader="Ville"] - Intitulé colonne label
 * @param {string|null} [config.colorCol="continent"] - Colonne pour la pastille couleur (null = pas de pastille)
 * @param {Object} [config.colorMap] - Map valeur→couleur (défaut: window.CONT_COL)
 * @param {string} [config.defaultSort="n_listings"] - Tri initial
 * @param {boolean} [config.defaultAsc=false] - Tri ascendant par défaut
 * @param {Object} [config.refRow=null] - Ligne de référence sticky {label, data, bgColor}
 * @param {Array<Object>} [config.refRows=null] - Lignes de référence multiples [{label, data, bgColor},...]
 * @param {number} [config.maxHeight=420] - Hauteur max scroll
 * @param {Array<Object>} [config.groups=null] - Supra-headers [{label, cols},...] pour regrouper colonnes
 * @param {number} [config.maxRows=0] - Limite affichage (0 = illimité, sans pagination)
 * @param {number} [config.pageSize=0] - Pagination (0 = désactivé, >0 = lignes par page)
 * @param {number} [config.labelMaxWidth=0] - Largeur max colonne label en px (0 = auto)
 * @param {Array<string>} [config.evolCols=[]] - Colonnes évolution → triangles ▲/▼
 * @param {boolean} [config.expandable=false] - Bouton agrandir plein écran
 */
export function buildDataTable(container, data, config) {
  _injectCSS();

  config = config || {};
  const keys = config.keys || ["n_listings", "prix_med"];
  const labelCol = config.labelCol || "city_fr";
  const labelFallback = config.labelFallback || "city";
  const labelHeader = config.labelHeader || "Ville";
  const colorCol = config.colorCol !== undefined ? config.colorCol : "continent";
  const colorMap = config.colorMap || (window.CONT_COL || {});
  const defaultSort = config.defaultSort || "n_listings";
  const maxHeight = config.maxHeight || 420;
  const groups = config.groups || null;
  const maxRows = config.maxRows || 0;
  const pageSize = config.pageSize || 0;
  const labelMaxWidth = config.labelMaxWidth || 0;
  const evolCols = config.evolCols ? new Set(config.evolCols) : new Set();
  const expandable = config.expandable !== false;

  // Support refRows array ou single refRow (backward compat)
  let refRows = config.refRows || [];
  if (!refRows.length && config.refRow) {
    refRows = [config.refRow];
  }

  const DDICT = window.DDICT || {};
  const _divGauge = window.divGauge || function() {
    return {bar: "#b8c2cc", text: "#555", op: 0.5};
  };

  // Headers depuis DDICT (short + unit L2 filtré si redondant)
  const UNIT_SKIP = {"n":1, "%":1, "ratio":1};
  const headers = {};
  const tips = {};
  for (const k of keys) {
    const dd = DDICT[k] || {};
    const lbl = dd.short || k;
    const unit = (dd.unit && !UNIT_SKIP[dd.unit]) ? dd.unit : "";
    headers[k] = unit ? lbl + '<span class="th-unit">' + unit + '</span>' : lbl;
    tips[k] = (dd.desc || dd.label || "").replace(/"/g, "&quot;");
  }

  // Group separators — border-left on first col of each group, subtle on inner cols
  const groupStartKeys = new Set();
  const groupInnerKeys = new Set();
  if (groups) {
    for (const g of groups) {
      if (g.cols.length > 0) groupStartKeys.add(g.cols[0]);
      for (let i = 1; i < g.cols.length; i++) groupInnerKeys.add(g.cols[i]);
    }
  }
  function colBorderTh(k) {
    if (groupStartKeys.has(k)) return 'border-left:4px solid #ffffff;';
    return '';
  }
  function colBorderTd(k) {
    if (groupStartKeys.has(k)) return 'border-left:2px solid #f0f1f3;';
    return '';
  }

  // Stats pour z-score (calculés sur data, pas refRows)
  const stats = {};
  for (const k of keys) {
    const vals = data.map(d => +d[k]).filter(v => !isNaN(v));
    const sorted = vals.slice().sort((a, b) => a - b);
    const max = vals.length ? Math.max(...vals) : 1;
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = vals.length ? sum / vals.length : 0;
    const variance = vals.length > 1
      ? vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (vals.length - 1) : 0;
    const p02 = sorted.length > 4 ? sorted[Math.floor(sorted.length * 0.02)] : sorted[0] || 0;
    const p98 = sorted.length > 4 ? sorted[Math.min(Math.floor(sorted.length * 0.98), sorted.length - 1)] : max;
    stats[k] = {max, mean, std: Math.sqrt(variance), p02, p98};
  }

  // Build toolbar
  container.innerHTML =
    '<div class="t-toolbar">' +
    '<input placeholder="Filtrer...">' +
    '<span class="info"></span>' +
    (pageSize > 0 ? '<span class="t-pager"><button class="t-prev" title="Page précédente">‹</button><span class="t-page-info"></span><button class="t-next" title="Page suivante">›</button></span>' : '') +
    (expandable ? '<button class="t-expand-btn" title="Agrandir plein écran">⛶</button>' : '') +
    '</div>' +
    '<div class="t" style="max-height:' + maxHeight + 'px;overflow-y:auto;overflow-x:auto;"></div>';

  let sortCol = defaultSort;
  let sortAsc = config.defaultAsc || false;
  let search = "";
  let page = 0;

  // Rendu cellule barre avec trait de moyenne + signes évolution
  function renderCell(val, k, isRef) {
    if (val == null || isNaN(+val)) return "\u2014";
    const v = +val;
    const info = DDICT[k] || {type: "stock"};
    const s = stats[k];
    const isEvol = evolCols.has(k);

    // Formater la valeur absolue pour evol (le signe +/− est géré séparément)
    const fmtVal = isEvol ? Math.abs(v) : v;
    const fmt = info.type === "pct" ? fmtVal.toFixed(1) + "%"
      : (info.unit || "").indexOf("/5") >= 0 ? fmtVal.toFixed(2)
      : fmtVal >= 1000 ? Math.round(fmtVal).toLocaleString("fr-FR")
      : fmtVal % 1 !== 0 ? fmtVal.toFixed(1) : String(Math.round(fmtVal));

    // +/− pour colonnes évolution
    const tri = isEvol
      ? (v > 0.05 ? '<span style="color:#16a34a;font-weight:600;">+</span>'
        : v < -0.05 ? '<span style="color:#dc2626;font-weight:600;">−</span>' : '')
      : '';

    if (isRef) {
      return '<span style="font-weight:700;color:#1696d2;">' + tri + fmt + '</span>';
    }

    // Divergent columns (values span zero): bar uses |v| scaled by max(|p02|,|p98|)
    const isDivergent = s.p02 < -0.001 && s.p98 > 0.001;
    const barRange = isDivergent
      ? (Math.max(Math.abs(s.p02), Math.abs(s.p98)) || 1)
      : (s.p98 > 0 ? s.p98 : (s.max || 1));
    const w = isDivergent
      ? Math.min(Math.abs(v) / barRange * 100, 100)
      : Math.min(Math.max(v / barRange * 100, 0), 100);
    const g = _divGauge(v, s.mean, s.std);

    // Mean marker
    const meanPct = isDivergent
      ? Math.min(Math.abs(s.mean) / barRange * 100, 100)
      : Math.min(Math.max(s.mean / barRange * 100, 0), 100);
    const meanLine = '<span style="position:absolute;left:' + meanPct +
      '%;top:0;width:1px;height:100%;background:#555;opacity:0.35;"></span>';

    // Negative evolution values → dark red text override
    const textColor = (isEvol && v < -0.05) ? '#991b1b' : g.text;

    return '<div style="display:flex;align-items:center;gap:3px;">' +
      '<div style="width:32px;height:9px;background:#eef0f2;border-radius:2px;position:relative;overflow:hidden;flex-shrink:0;">' +
      '<div style="width:' + w + '%;height:100%;background:' + g.bar +
      ';opacity:' + g.op + ';border-radius:2px;"></div>' + meanLine +
      '</div><span style="color:' + textColor + ';white-space:nowrap;">' + tri + fmt + '</span>' +
      '</div>';
  }

  function render() {
    let rows = data.slice();

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(d =>
        ((d[labelCol] || d[labelFallback] || "").toLowerCase().indexOf(q) >= 0) ||
        ((d.country_code || "").toLowerCase().indexOf(q) >= 0)
      );
    }

    rows.sort((a, b) => {
      if (sortCol === labelCol || sortCol === labelFallback) {
        const va = (a[labelCol] || a[labelFallback] || "").toLowerCase();
        const vb = (b[labelCol] || b[labelFallback] || "").toLowerCase();
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      const va = +a[sortCol] || 0, vb = +b[sortCol] || 0;
      return sortAsc ? va - vb : vb - va;
    });

    if (maxRows > 0 && rows.length > maxRows) rows = rows.slice(0, maxRows);

    // Pagination
    const totalRows = rows.length;
    let totalPages = 1;
    if (pageSize > 0 && totalRows > pageSize) {
      totalPages = Math.ceil(totalRows / pageSize);
      if (page >= totalPages) page = totalPages - 1;
      rows = rows.slice(page * pageSize, (page + 1) * pageSize);
    }

    // Header
    const lblTrunc = labelMaxWidth > 0 ? "max-width:" + labelMaxWidth + "px;overflow:hidden;text-overflow:ellipsis;" : "";
    const stickyLbl = "position:sticky;left:0;z-index:5;" + lblTrunc;
    let ths = '<th data-col="' + labelCol + '" class="' +
      (sortCol === labelCol ? "active" : "") + '" style="' + stickyLbl + 'background:#d5d8dc;color:#4b5563;">' + labelHeader +
      (sortCol === labelCol ? (sortAsc ? " \u2191" : " \u2193") : "") + '</th>';
    for (const k of keys) {
      ths += '<th data-col="' + k + '" class="' + (sortCol === k ? "active" : "") + '" style="' + colBorderTh(k) + '" title="' + (tips[k] || k) + '">' +
        headers[k] + (sortCol === k ? (sortAsc ? " \u2191" : " \u2193") : "") + '</th>';
    }

    let tbody = "";

    // Ref rows (multi-niveaux sticky)
    for (let ri = 0; ri < refRows.length; ri++) {
      const ref = refRows[ri];
      const rd = ref.data || {};
      const bg = ref.bgColor || "#f0f7ff";
      tbody += '<tr class="sticky-ref" data-ref-idx="' + ri + '"><td style="font-weight:600;white-space:nowrap;' +
        stickyLbl + 'z-index:10;background:' + bg + ';">' + ref.label + '</td>';
      for (const k of keys) {
        tbody += '<td style="' + colBorderTd(k) + '">' + renderCell(rd[k], k, true) + '</td>';
      }
      tbody += '</tr>';
    }

    // Data rows
    for (const d of rows) {
      const label = d[labelCol] || d[labelFallback] || "";
      const cc = d.country_code || "";
      // Pastille couleur continent (optionnelle, skip si colorCol null)
      let dotHtml = "";
      if (colorCol) {
        const dotColor = colorMap[d[colorCol]] || "#999";
        dotHtml = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' +
          dotColor + ';margin-right:4px;vertical-align:middle;"></span>';
      }
      const ccHtml = cc ? ' <small style="color:#999;font-size:8px;">' + cc + '</small>' : "";
      tbody += '<tr><td style="font-weight:500;white-space:nowrap;' + stickyLbl + 'z-index:1;background:white;">' +
        dotHtml + label + ccHtml + '</td>';
      for (const k of keys) {
        tbody += '<td style="' + colBorderTd(k) + '">' + renderCell(d[k], k, false) + '</td>';
      }
      tbody += '</tr>';
    }

    const tb = container.querySelector(".t");
    const info = container.querySelector(".info");
    if (info) info.textContent = totalRows + " lignes";

    // Pagination controls
    const pageInfo = container.querySelector(".t-page-info");
    const prevBtn = container.querySelector(".t-prev");
    const nextBtn = container.querySelector(".t-next");
    if (pageInfo && pageSize > 0) {
      pageInfo.textContent = (page + 1) + "/" + totalPages;
      if (prevBtn) { prevBtn.disabled = page <= 0; prevBtn.style.opacity = page <= 0 ? "0.35" : "1"; }
      if (nextBtn) { nextBtn.disabled = page >= totalPages - 1; nextBtn.style.opacity = page >= totalPages - 1 ? "0.35" : "1"; }
    }

    if (tb) {
      let supraRow = "";
      if (groups) {
        supraRow = '<tr class="supra"><th style="' + stickyLbl + 'background:#d5d8dc;"></th>';
        for (const g of groups) {
          const gb = g.cols.length > 0 ? 'border-left:4px solid #ffffff;' : '';
          supraRow += '<th colspan="' + g.cols.length + '" style="' + gb + '">' + g.label + '</th>';
        }
        supraRow += '</tr>';
      }
      tb.innerHTML = '<table><thead>' + supraRow + '<tr>' + ths + '</tr></thead><tbody>' + tbody + '</tbody></table>';

      // Dynamic sticky — multi-niveaux ref rows
      const thead = tb.querySelector("thead");
      const thH = thead ? thead.offsetHeight : 0;
      const refTrs = tb.querySelectorAll(".sticky-ref");
      let cumTop = thH;
      refTrs.forEach((tr, i) => {
        const bg = refRows[i] ? (refRows[i].bgColor || "#f0f7ff") : "#f0f7ff";
        tr.style.position = "sticky";
        tr.style.top = cumTop + "px";
        tr.style.zIndex = String(9 - i);
        tr.style.background = bg;
        tr.style.boxShadow = "0 1px 2px rgba(0,0,0,0.08)";
        cumTop += tr.offsetHeight;
      });

      // Sort handlers (reset page on sort change)
      tb.querySelectorAll("th").forEach(th => {
        th.addEventListener("click", () => {
          const col = th.dataset.col;
          if (sortCol === col) sortAsc = !sortAsc;
          else { sortCol = col; sortAsc = (col === labelCol); }
          page = 0;
          render();
        });
      });
    }
  }

  const inp = container.querySelector("input");
  if (inp) inp.addEventListener("input", e => { search = e.target.value; page = 0; render(); });

  // Pagination handlers
  const _prev = container.querySelector(".t-prev");
  const _next = container.querySelector(".t-next");
  if (_prev) _prev.addEventListener("click", () => { if (page > 0) { page--; render(); } });
  if (_next) _next.addEventListener("click", () => { page++; render(); });

  // Expand fullscreen handler
  const _exp = container.querySelector(".t-expand-btn");
  if (_exp) _exp.addEventListener("click", () => _expandTable(container, maxHeight));

  render();
}

// &e BUILD_TABLE

// Exposer comme global pour usage plain JS (dash France, buildCityRow)
if (typeof window !== "undefined") {
  window.buildDataTable = buildDataTable;
}

// &e
