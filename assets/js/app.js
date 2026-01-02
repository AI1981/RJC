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

  // --- Reusable layout components (navbar / sidebar / footer) ---
  RB.components = RB.components || {};

  RB.components.navbar = () => `
    <nav class="navbar sticky-top">
      <div class="container d-flex align-items-center justify-content-between">
        <a class="navbar-brand fw-semibold m-0" href="index.html">
          <img src="assets/img/logo.png" alt="Riftbound Judge Codex" style="max-width: 180px;">
        </a>
        <button class="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="offcanvas"
          data-bs-target="#rbOffcanvas" aria-controls="rbOffcanvas" aria-label="Open menu">
          ☰
        </button>
      </div>
    </nav>
  `;

  RB.components.sidebar = () => `
    <div class="offcanvas offcanvas-end rb-sidebar-offcanvas" tabindex="-1" id="rbOffcanvas"
      aria-labelledby="rbOffcanvasLabel">
      <div class="offcanvas-header">
        <div class="offcanvas-title fw-semibold" id="rbOffcanvasLabel">
          <img src="assets/img/logo-icon.png" alt="Riftbound Judge Codex" style="max-width: 65px;">
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body">
        <div class="text-uppercase small text-light fw-semibold mb-2">Core Rules</div>
        <hr class="text-warning my-3">
        <div class="list-group list-group-flush">
          <a class="list-group-item list-group-item-action" href="view.html?doc=CR&macro=000">000 • GOLDEN AND SILVER RULES</a>
          <a class="list-group-item list-group-item-action" href="view.html?doc=CR&macro=100">100 • GAME CONCEPTS</a>
          <a class="list-group-item list-group-item-action" href="view.html?doc=CR&macro=300">300 • PLAY THE GAME</a>
          <a class="list-group-item list-group-item-action" href="view.html?doc=CR&macro=700">700 • ADDITIONAL RULES</a>
        </div>

        <div class="text-uppercase small text-light fw-semibold mt-4 mb-2">Tournament Rules</div>
        <hr class="text-warning my-3">
        <div class="list-group list-group-flush">
          <a class="list-group-item list-group-item-action" href="view.html?doc=TR&macro=100">100 • INTRODUCTION</a>
          <a class="list-group-item list-group-item-action" href="view.html?doc=TR&macro=200">200 • DEFINITIONS</a>
          <a class="list-group-item list-group-item-action" href="view.html?doc=TR&macro=300">300 • ELIGIBILITY</a>
          <a class="list-group-item list-group-item-action" href="view.html?doc=TR&macro=400">400 • POLICIES</a>
          <a class="list-group-item list-group-item-action" href="view.html?doc=TR&macro=500">500 • COMMUNICATION</a>
          <a class="list-group-item list-group-item-action" href="view.html?doc=TR&macro=600">600 • COMPETITION FORMATS</a>
          <a class="list-group-item list-group-item-action" href="view.html?doc=TR&macro=700">700 • ENFORCEMENT AND PENALTIES</a>
        </div>

        <div class="text-uppercase small text-light fw-semibold mt-4 mb-2">Resources</div>
        <hr class="text-warning my-3">
        <div class="list-group list-group-flush">
          <a class="list-group-item list-group-item-action" href="docs.html">Docs</a>
          <a class="list-group-item list-group-item-action" href="about.html">About</a>
        </div>
      </div>
    </div>
  `;

  RB.components.footer = () => `
    <footer class="rb-footer mt-5 py-4">
      <div class="container">
        <div class="text-center">
          <span class="small text-secondary">Riftbound Judge Codex V 1.0.3</span><br>
          <span class="small text-secondary">Riftbound Judge Codex is not affiliated with, endorsed, sponsored, or specifically approved by Riot Games Inc.</span><br>
          <span class="small text-secondary">Riftbound, and their logos are trademarks of Riot Games Inc. in the United States and other countries.</span>
        </div>
      </div>
    </footer>
  `;

  RB.mountLayout = () => {
    const navHost = document.getElementById('rbNavbar');
    const sideHost = document.getElementById('rbSidebar');
    const footHost = document.getElementById('rbFooter');

    if (navHost) navHost.innerHTML = RB.components.navbar();
    if (sideHost) sideHost.innerHTML = RB.components.sidebar();
    if (footHost) footHost.innerHTML = RB.components.footer();
  };

  RB.registerSW = () => {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', async () => {
      try {
        // Use a relative URL so it works on GitHub Pages under a subpath (e.g., /RJA/)
        await navigator.serviceWorker.register('sw.js');
      } catch (e) {
        console.warn('SW register failed', e);
      }
    });
  };

  // Register the Service Worker (root scope) for offline support
  RB.registerSW();
})();
