// assets/js/docs.js
(async () => {
  const RB = window.RB;

  const list = document.getElementById('docsList');
  const cachedAt = document.getElementById('cachedAt');
  const cacheBtn = document.getElementById('cacheBtn');
  const refreshBtn = document.getElementById('refreshBtn');

  const manifest = await RB.loadManifest();
  cachedAt.textContent = RB.getCachedAt() || '—';

  const docs = manifest.documents || [];
  list.innerHTML = '';

  for (const d of docs) {
    const el = document.createElement('div');
    el.className = 'card shadow-sm';
    el.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-semibold">${RB.escapeHTML(d.title)}</div>
            <div class="small text-secondary">
              ${RB.escapeHTML(d.id)} • ${RB.escapeHTML(
      d.lang
    )} • ${RB.escapeHTML(d.version_label || '—')}
            </div>
            <div class="small text-secondary">
              Published: ${RB.escapeHTML(d.published_date || '—')}
            </div>
            <div class="small text-secondary">
              Source: ${RB.escapeHTML(d.source_name || '—')}
            </div>
          </div>
        </div>
      </div>
    `;
    list.appendChild(el);
  }

  const touchCache = async () => {
    // Just "touch" docs to warm cache in browsers even without SW
    for (const d of docs) {
      await fetch(d.file, { cache: 'reload' });
    }
    await fetch(RB.MANIFEST_PATH, { cache: 'reload' });

    const now = new Date().toISOString();
    RB.setCachedAt(now);
    cachedAt.textContent = now;
  };

  cacheBtn.addEventListener('click', touchCache);
  refreshBtn.addEventListener('click', touchCache);
})();
