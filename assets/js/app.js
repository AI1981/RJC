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

  // Ensure sidebar navigation works reliably (including PWA/offline/offcanvas)
  RB.wireSidebarNav = () => {
    const ocEl = document.getElementById('rbOffcanvas');
    if (!ocEl) return;

    // Avoid double-binding when navigating between pages
    if (ocEl.__rbNavBound) return;
    ocEl.__rbNavBound = true;

    ocEl.addEventListener('click', (ev) => {
      const a = ev.target.closest('a[href]');
      if (!a) return;

      const href = a.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) return;

      // External links: let the browser handle them
      if (/^https?:\/\//i.test(href)) return;

      // Always navigate explicitly; Bootstrap offcanvas dismiss can swallow navigation in some contexts
      ev.preventDefault();
      ev.stopPropagation();

      const go = () => {
        window.location.href = href;
      };

      try {
        const inst =
          window.bootstrap && window.bootstrap.Offcanvas
            ? window.bootstrap.Offcanvas.getInstance(ocEl) ||
              new window.bootstrap.Offcanvas(ocEl)
            : null;

        if (inst) {
          ocEl.addEventListener('hidden.bs.offcanvas', go, { once: true });
          inst.hide();
          // Fallback in case the event doesn't fire (edge cases)
          setTimeout(go, 450);
          return;
        }
      } catch (_) {
        // ignore
      }

      go();
    });
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

        <div class="accordion accordion-flush" id="crAccordion">

          <!-- 000 GOLDEN AND SILVER RULES -->
          <div class="accordion-item">
            <h2 class="accordion-header" id="crh000">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#crc000" aria-expanded="false" aria-controls="crc000">
                000 • GOLDEN AND SILVER RULES
              </button>
            </h2>
            <div id="crc000" class="accordion-collapse collapse" aria-labelledby="crh000" data-bs-parent="#crAccordion">
              <div class="accordion-body p-0">
                <div class="list-group list-group-flush">
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&macro=000">View all (000)</a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=001-049"><span class="ms-4">001 • Golden Rule</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=050-099"><span class="ms-4">050 • Silver Rule</span></a>
                </div>
              </div>
            </div>
          </div>

          <!-- 100 GAME CONCEPTS -->
          <div class="accordion-item">
            <h2 class="accordion-header" id="crh100">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#crc100" aria-expanded="false" aria-controls="crc100">
                100 • GAME CONCEPTS
              </button>
            </h2>
            <div id="crc100" class="accordion-collapse collapse" aria-labelledby="crh100" data-bs-parent="#crAccordion">
              <div class="accordion-body p-0">
                <div class="list-group list-group-flush">
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&macro=100">View all (100)</a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=101-103"><span class="ms-4">101 • Deck Construction</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=104-118"><span class="ms-4"> 104 • Setup</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=119-123"><span class="ms-4"> 119 • Game Objects</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=124-138"><span class="ms-4"> 124 • Cards</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=139-144"><span class="ms-4"> 139 • Units</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=145-148"><span class="ms-4"> 145 • Gear</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=149-155"><span class="ms-4"> 149 • Spells</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=156-164"><span class="ms-4"> 156 • Runes</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=165-168"><span class="ms-4"> 165 • Battlefields</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=169-172"><span class="ms-4"> 169 • Legends</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=173-181"><span class="ms-4"> 173 • Tokens</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=182-299"><span class="ms-4"> 182 • Control</span></a>
                </div>
              </div>
            </div>
          </div>

          <!-- 300 PLAY THE GAME -->
          <div class="accordion-item">
            <h2 class="accordion-header" id="crh300">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#crc300" aria-expanded="false" aria-controls="crc300">
                300 • PLAY THE GAME
              </button>
            </h2>
            <div id="crc300" class="accordion-collapse collapse" aria-labelledby="crh300" data-bs-parent="#crAccordion">
              <div class="accordion-body p-0">
                <div class="list-group list-group-flush">
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&macro=300">View all (300)</a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=301-317"><span class="ms-4"> 301 • The Turn</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=318-323"><span class="ms-4"> 318 • Cleanups</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=324-345"><span class="ms-4"> 324 • Chains and Showdowns</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=346-356"><span class="ms-4"> 346 • Playing Cards</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=357-394"><span class="ms-4"> 357 • Abilities</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=395-422"><span class="ms-4"> 395 • Game Actions</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=423-436"><span class="ms-4"> 423 • Movement</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=437-440"><span class="ms-4"> 437 • Combat</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=441-444"><span class="ms-4"> 441 • The Step of Combat</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=445-449"><span class="ms-4"> 445 • Scoring</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=450-457"><span class="ms-4"> 450 • Layers</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=458-648"><span class="ms-4"> 458 • Modes of Play</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=649-699"><span class="ms-4"> 649 • Conceding</span></a>
                </div>
              </div>
            </div>
          </div>

          <!-- 700 ADDITIONAL RULES -->
          <div class="accordion-item">
            <h2 class="accordion-header" id="crh700">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#crc700" aria-expanded="false" aria-controls="crc700">
                700 • ADDITIONAL RULES
              </button>
            </h2>
            <div id="crc700" class="accordion-collapse collapse" aria-labelledby="crh700" data-bs-parent="#crAccordion">
              <div class="accordion-body p-0">
                <div class="list-group list-group-flush">
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&macro=700">View all (700)</a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=701-705"><span class="ms-4">701 • Buffs</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=706-711"><span class="ms-4">706 • Mighty</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=712-715"><span class="ms-4">712 • Bonus Damage</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=716-719"><span class="ms-4">716 • Attachment</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=720-725"><span class="ms-4">720 • Inactive</span></a>
                  <a class="list-group-item list-group-item-action" href="view.html?doc=CR&range=726-999"><span class="ms-4">726 • Keywords</span></a>
                </div>
              </div>
            </div>
          </div>

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
          <span class="small text-secondary">Riftbound Judge Codex V 1.0.6</span><br>
          <span class="small text-secondary">Riftbound Judge Codex is not affiliated with, endorsed, sponsored, or specifically approved by Riot Games Inc.</span><br>
          <span class="small text-secondary">Riftbound, and their logos are trademarks of Riot Games Inc. in the United States and other countries.</span><br>
          <span class="small text-secondary">© 2026 Riftbound Judge Codex — All rights reserved.</span>
        </div>
      </div>
    </footer>
  `;

  RB.mountLayout = () => {
    const navHost = document.getElementById('rbNavbar');
    const sideHost = document.getElementById('rbSidebar');
    const footHost = document.getElementById('rbFooter');

    if (navHost) navHost.innerHTML = RB.components.navbar();
    if (sideHost) {
      sideHost.innerHTML = RB.components.sidebar();
      RB.wireSidebarNav();
    }
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
