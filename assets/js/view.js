// assets/js/view.js
(async () => {
  const RB = window.RB;

  const doc = RB.qs('doc');
  const key = RB.qs('key');
  const q = RB.qs('q') || '';
  const from = RB.qs('from') || 'index.html';

  const backLink = document.getElementById('backLink');
  backLink.href = from;

  await RB.loadIndex();

  // Find entry
  const entry =
    window.RB && window.RB.__entryCache
      ? window.RB.__entryCache[`${doc}:${key}`]
      : null;

  // Direct search in INDEX
  const { INDEX } = await RB.loadIndex();
  const e = entry || INDEX.find((x) => x._doc_id === doc && x.key === key);

  if (!e) {
    document.getElementById('ruleTitle').textContent = 'Not found';
    document.getElementById('ruleText').textContent = '';
    return;
  }

  document.getElementById('ruleTitle').textContent = e.heading || '—';
  document.getElementById('ruleRef').textContent = `${e._doc_id} ${
    e.ref || ''
  }`.trim();
  document.getElementById('ruleDoc').textContent = e._doc_title || e._doc_id;

  // Breadcrumb
  const bc = document.getElementById('breadcrumb');
  bc.innerHTML = '';
  const path = Array.isArray(e.path) ? e.path : [];
  for (let i = 0; i < path.length; i += 2) {
    const label = path[i + 1] ? `${path[i]} • ${path[i + 1]}` : String(path[i]);
    const li = document.createElement('li');
    li.className = 'breadcrumb-item';
    li.textContent = label;
    bc.appendChild(li);
  }

  const text = e.text || '';
  document.getElementById('ruleText').innerHTML = RB.highlightHTML(text, q);

  // Copy buttons
  const refText = `${e._doc_id} ${e.ref}`.trim();

  document.getElementById('copyRefBtn').addEventListener('click', async () => {
    const ok = await RB.copyToClipboard(refText);
    if (ok) alert('Reference copied');
  });

  document.getElementById('copyTextBtn').addEventListener('click', async () => {
    const ok = await RB.copyToClipboard(text);
    if (ok) alert('Text copied');
  });
})();
