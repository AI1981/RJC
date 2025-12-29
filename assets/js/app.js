// assets/js/app.js
(() => {
  const RB = (window.RB = window.RB || {});

  RB.MANIFEST_PATH = 'assets/data/manifest.json';
  RB.CACHE_KEY = 'rb_cached_at';

  RB.loadJSON = async (path) => {
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
    return r.json();
  };

  RB.loadManifest = async () => RB.loadJSON(RB.MANIFEST_PATH);

  RB.setCachedAt = (iso) => localStorage.setItem(RB.CACHE_KEY, iso);
  RB.getCachedAt = () => localStorage.getItem(RB.CACHE_KEY);

  RB.isOnline = () => navigator.onLine;

  RB.escapeHTML = (s) =>
    String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  RB.qs = (k) => new URLSearchParams(location.search).get(k);

  RB.copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  };

  // Optional: Service worker registration (works when served over https or localhost)
  RB.registerSW = async () => {
    if (!('serviceWorker' in navigator)) return false;
    try {
      await navigator.serviceWorker.register('assets/js/sw.js');
      return true;
    } catch {
      return false;
    }
  };

  RB.registerSW();
})();
