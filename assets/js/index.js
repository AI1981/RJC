// (append to assets/js/search.js or put into assets/js/index.js; here: inline initializer)
// You can paste this at the bottom of assets/js/search.js AFTER the RB.search definition, or create assets/js/index.js
(async () => {
  const RB = window.RB;

  const qEl = document.getElementById('q');
  const docFilterEl = document.getElementById('docFilter');
  const resultsEl = document.getElementById('results');
  const emptyEl = document.getElementById('emptyState');
  const countEl = document.getElementById('resultsCount');
  const statusBadge = document.getElementById('statusBadge');
  const docsBadge = document.getElementById('docsBadge');
  const clearBtn = document.getElementById('clearBtn');

  if (!qEl) return; // not on index page

  const setStatus = () => {
    statusBadge.textContent = RB.isOnline() ? 'Online' : 'Offline';
    statusBadge.className = RB.isOnline()
      ? 'badge text-bg-success'
      : 'badge text-bg-warning';
  };
  window.addEventListener('online', setStatus);
  window.addEventListener('offline', setStatus);
  setStatus();

  // Load manifest and populate filter
  const manifest = await RB.loadManifest();
  docsBadge.textContent = `Docs: ${(manifest.documents || []).length}`;
  for (const d of manifest.documents || []) {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.title} (${d.id})`;
    docFilterEl.appendChild(opt);
  }

  const renderResults = (items, q) => {
    resultsEl.innerHTML = '';
    countEl.textContent = String(items.length);
    emptyEl.classList.toggle('d-none', items.length !== 0);

    for (const it of items) {
      const href = `view.html?doc=${encodeURIComponent(
        it.doc_id
      )}&key=${encodeURIComponent(it.key)}&q=${encodeURIComponent(
        q
      )}&from=${encodeURIComponent(location.pathname + location.search)}`;
      const card = document.createElement('div');
      card.className = 'card shadow-sm card-result';
      card.innerHTML = `
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div class="fw-semibold">${RB.escapeHTML(it.heading || '—')}</div>
              <div class="small text-secondary">
                <span class="fw-semibold">${RB.escapeHTML(
                  `${it.doc_id} ${it.ref}`.trim()
                )}</span>
                <span class="mx-1">•</span>
                <span>${RB.escapeHTML(it.doc_title || it.doc_id)}</span>
              </div>
            </div>
          </div>
          <div class="mt-2 small text-secondary">
            ${RB.highlightHTML(it.snippet || '', q)}
          </div>
        </div>
      `;
      card.addEventListener('click', () => (location.href = href));
      resultsEl.appendChild(card);
    }
  };

  const runSearch = async () => {
    const q = qEl.value.trim();
    const docFilter = docFilterEl.value;

    if (!q) {
      renderResults([], '');
      return;
    }

    const items = await RB.search({ q, docFilter, limit: 60 });
    renderResults(items, q);
  };

  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch();
  });
  docFilterEl.addEventListener('change', runSearch);

  clearBtn.addEventListener('click', () => {
    qEl.value = '';
    renderResults([], '');
    qEl.focus();
  });

  // Optional: run search if query present in URL (?q=...)
  const qFromUrl = RB.qs('q');
  if (qFromUrl) {
    qEl.value = qFromUrl;
    await runSearch();
  }
})();
