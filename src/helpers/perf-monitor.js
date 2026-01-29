/**
 * perf-monitor.js - Performance monitoring helper for Observable Framework
 *
 * Uses browser Performance API to track load times, resources, and custom marks.
 * Logs to localStorage for persistent analysis.
 *
 * Usage:
 *   import { PerfMonitor, perfPanel } from "./helpers/perf-monitor.js";
 *   const perf = new PerfMonitor("dash-exdtc");
 *   perf.mark("data-load-start");
 *   // ... load data
 *   perf.mark("data-load-end");
 *   perf.measure("data-load", "data-load-start", "data-load-end");
 *   display(perfPanel(perf));
 *
 * @module perf-monitor
 */

// =======================================================================
// &s PERF_MONITOR_CLASS
// =======================================================================

export class PerfMonitor {
  constructor(pageName = "unknown") {
    this.pageName = pageName;
    this.sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.marks = new Map();
    this.measures = new Map();
    this.resourceTimings = [];
    this.startTime = performance.now();
    this._observedResources = [];

    // Auto-collect navigation timing
    this._collectNavigationTiming();

    // Start observing resources in real-time
    this._startObserver();
  }

  _startObserver() {
    try {
      this._observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Match files with extensions (handle ?sha= query params from Observable)
          const urlPath = entry.name.split("?")[0];
          if (/\.(json|parquet|topojson|geojson|csv)$/i.test(urlPath)) {
            this._observedResources.push({
              name: urlPath.split("/").pop(),
              fullUrl: entry.name,
              type: this._guessType(urlPath),
              duration: Math.round(entry.duration),
              size: entry.transferSize || entry.decodedBodySize || 0,
              startTime: Math.round(entry.startTime),
              responseEnd: Math.round(entry.responseEnd)
            });
          }
        }
      });
      this._observer.observe({ type: "resource", buffered: true });
    } catch (e) {
      console.warn("PerfMonitor: PerformanceObserver not supported", e);
    }
  }

  // --- Marks & Measures ---

  mark(name) {
    const time = performance.now();
    this.marks.set(name, time);
    performance.mark(`${this.pageName}:${name}`);
    return time;
  }

  measure(name, startMark, endMark) {
    const start = this.marks.get(startMark) || 0;
    const end = this.marks.get(endMark) || performance.now();
    const duration = end - start;
    this.measures.set(name, { start, end, duration });
    return duration;
  }

  // --- Resource Timing ---

  collectResources(filter = null) {
    // Combine observed resources + current buffer
    const entries = performance.getEntriesByType("resource");
    const fromBuffer = entries
      .filter(e => {
        const urlPath = e.name.split("?")[0]; // Remove query params before filtering
        if (!filter) return /\.(json|parquet|topojson|geojson|csv)$/i.test(urlPath);
        if (typeof filter === "string") return urlPath.includes(filter);
        if (filter instanceof RegExp) return filter.test(urlPath);
        return true;
      })
      .map(e => {
        const urlPath = e.name.split("?")[0];
        return {
          name: urlPath.split("/").pop(), // filename only
          fullUrl: e.name,
          type: this._guessType(urlPath),
          duration: Math.round(e.duration),
          size: e.transferSize || e.decodedBodySize || 0,
          startTime: Math.round(e.startTime),
          responseEnd: Math.round(e.responseEnd)
        };
      });

    // Merge observed + buffer, dedupe by name
    const seen = new Set();
    this.resourceTimings = [...this._observedResources, ...fromBuffer]
      .filter(r => {
        if (seen.has(r.name)) return false;
        seen.add(r.name);
        return true;
      })
      .sort((a, b) => b.duration - a.duration); // slowest first

    return this.resourceTimings;
  }

  // Wait for resources to load (useful for delayed stats)
  async waitForResources(minCount = 1, timeoutMs = 5000) {
    const start = Date.now();
    while (this._observedResources.length < minCount && Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 100));
      this.collectResources();
    }
    return this.resourceTimings;
  }

  _guessType(url) {
    if (url.includes(".json")) return "json";
    if (url.includes(".parquet")) return "parquet";
    if (url.includes(".topojson") || url.includes(".geojson")) return "geo";
    if (url.includes(".js")) return "js";
    if (url.includes(".css")) return "css";
    return "other";
  }

  // --- Navigation Timing ---

  _collectNavigationTiming() {
    const nav = performance.getEntriesByType("navigation")[0];
    if (!nav) return;

    this.navigation = {
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      domInteractive: Math.round(nav.domInteractive),
      domComplete: Math.round(nav.domComplete),
      loadEvent: Math.round(nav.loadEventEnd - nav.loadEventStart),
      totalLoad: Math.round(nav.loadEventEnd)
    };
  }

  // --- Summary ---

  getSummary() {
    this.collectResources(/\.(json|parquet|topojson)$/i);

    const totalSize = this.resourceTimings.reduce((sum, r) => sum + r.size, 0);
    const totalDuration = performance.now() - this.startTime;

    // Group by type
    const byType = {};
    for (const r of this.resourceTimings) {
      if (!byType[r.type]) byType[r.type] = { count: 0, size: 0, duration: 0 };
      byType[r.type].count++;
      byType[r.type].size += r.size;
      byType[r.type].duration = Math.max(byType[r.type].duration, r.duration);
    }

    return {
      page: this.pageName,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      totalDuration: Math.round(totalDuration),
      totalSize: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      resourceCount: this.resourceTimings.length,
      byType,
      navigation: this.navigation,
      resources: this.resourceTimings.slice(0, 10), // top 10 slowest
      measures: Object.fromEntries(this.measures)
    };
  }

  // --- Logging to localStorage ---

  log() {
    const summary = this.getSummary();
    const key = `perf_log_${this.pageName}`;

    try {
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push(summary);
      // Keep last 50 entries
      if (existing.length > 50) existing.shift();
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      console.warn("PerfMonitor: localStorage error", e);
    }

    return summary;
  }

  // --- Export logs ---

  static exportLogs(pageName) {
    const key = `perf_log_${pageName}`;
    const logs = JSON.parse(localStorage.getItem(key) || "[]");
    return logs;
  }

  static clearLogs(pageName) {
    localStorage.removeItem(`perf_log_${pageName}`);
  }

  // --- Console output ---

  print() {
    const s = this.getSummary();
    console.group(`📊 Performance: ${s.page}`);
    console.log(`Total: ${s.totalDuration}ms | ${s.totalSizeMB} MB | ${s.resourceCount} resources`);
    if (s.navigation) {
      console.log(`TTFB: ${s.navigation.ttfb}ms | DOM: ${s.navigation.domComplete}ms`);
    }
    console.table(s.resources.map(r => ({
      file: r.name,
      type: r.type,
      ms: r.duration,
      KB: Math.round(r.size / 1024)
    })));
    console.groupEnd();
    return s;
  }
}

// &e PERF_MONITOR_CLASS


// =======================================================================
// &s PERF_PANEL_UI
// =======================================================================

/**
 * Creates a collapsible performance panel for Observable
 * @param {PerfMonitor} perf - PerfMonitor instance
 * @param {Object} options - Display options
 * @returns {HTMLElement}
 */
export function perfPanel(perf, options = {}) {
  const { collapsed = true, position = "bottom-right" } = options;
  const summary = perf.getSummary();

  const posStyles = {
    "bottom-right": "position:fixed;bottom:10px;right:10px;",
    "bottom-left": "position:fixed;bottom:10px;left:10px;",
    "top-right": "position:fixed;top:10px;right:10px;",
    "inline": ""
  };

  const html = `
    <details ${collapsed ? "" : "open"} style="${posStyles[position]}z-index:9999;">
      <summary style="cursor:pointer;background:#1a1a2e;color:#eee;padding:6px 12px;border-radius:4px;font:12px monospace;">
        📊 ${summary.totalDuration}ms | ${summary.totalSizeMB} MB
      </summary>
      <div style="background:#1a1a2e;color:#eee;padding:12px;border-radius:0 0 4px 4px;font:11px monospace;max-width:400px;max-height:300px;overflow:auto;">
        <div style="margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:8px;">
          <strong>Page:</strong> ${summary.page}<br>
          <strong>Resources:</strong> ${summary.resourceCount}<br>
          ${summary.navigation ? `<strong>TTFB:</strong> ${summary.navigation.ttfb}ms | <strong>DOM:</strong> ${summary.navigation.domComplete}ms` : ""}
        </div>
        <div style="margin-bottom:8px;">
          <strong>By type:</strong>
          ${Object.entries(summary.byType).map(([type, data]) =>
            `<br>&nbsp;&nbsp;${type}: ${data.count} files, ${(data.size/1024).toFixed(0)} KB`
          ).join("")}
        </div>
        <div>
          <strong>Top resources:</strong>
          ${summary.resources.slice(0, 5).map(r =>
            `<br>&nbsp;&nbsp;${r.name}: ${r.duration}ms (${(r.size/1024).toFixed(0)} KB)`
          ).join("")}
        </div>
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid #333;">
          <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(summary)}, null, 2)).then(() => alert('Copied!'))"
                  style="background:#333;color:#eee;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;font:10px monospace;">
            📋 Copy JSON
          </button>
        </div>
      </div>
    </details>
  `;

  const container = document.createElement("div");
  container.innerHTML = html;
  return container.firstElementChild;
}

// &e PERF_PANEL_UI


// =======================================================================
// &s QUICK_HELPERS
// =======================================================================

/**
 * Quick function to measure async operation
 * @param {string} name - Operation name
 * @param {Function} asyncFn - Async function to measure
 * @returns {Promise<{result: any, duration: number}>}
 */
export async function measureAsync(name, asyncFn) {
  const start = performance.now();
  const result = await asyncFn();
  const duration = Math.round(performance.now() - start);
  console.log(`⏱️ ${name}: ${duration}ms`);
  return { result, duration };
}

/**
 * Get current page load stats (simple version)
 * @returns {Object}
 */
export function getLoadStats() {
  const resources = performance.getEntriesByType("resource")
    .filter(r => /\.(json|parquet|topojson)$/i.test(r.name));

  const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  const maxDuration = Math.max(...resources.map(r => r.duration), 0);

  return {
    resourceCount: resources.length,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    maxDurationMs: Math.round(maxDuration),
    resources: resources.map(r => ({
      name: r.name.split("/").pop(),
      ms: Math.round(r.duration),
      kb: Math.round((r.transferSize || 0) / 1024)
    })).sort((a, b) => b.ms - a.ms)
  };
}

// &e QUICK_HELPERS
