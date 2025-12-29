// assets/js/search.js
(() => {
  const RB = (window.RB = window.RB || {});

  let INDEX = []; // flattened entries with extra fields
  let DOC_META = {}; // doc_id -> meta
  let LOADED = false;

  const normalize = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const buildHaystack = (e) => {
    const p = Array.isArray(e.path) ? e.path.join(' ') : '';
    return normalize([e.ref, e.heading, p, e.text].filter(Boolean).join(' '));
  };

  const scoreEntry = (e, qNorm) => {
    // Simple ranking: ref exact/prefix > heading match > text match
    let score = 0;
    const ref = normalize(e.ref);
    const heading = normalize(e.heading);
    const hay = e._haystack;

    if (qNorm === ref) score += 1000;
    if (ref && qNorm && ref.startsWith(qNorm)) score += 600;

    if (heading.includes(qNorm)) score += 250;
    if (hay.includes(qNorm)) score += 80;

    // Bonus: multiple word hits
    const parts = qNorm.split(' ').filter(Boolean);
    if (parts.length > 1) {
      let hits = 0;
      for (const p of parts) if (hay.includes(p)) hits++;
      score += hits * 15;
    }
    return score;
  };

  const makeSnippet = (text, qNorm) => {
    const raw = String(text || '');
    if (!raw) return '';
    const lower = raw.toLowerCase();
    const q = qNorm.toLowerCase();

    let idx = lower.indexOf(q);
    if (idx < 0) {
      // try any token
      const parts = q.split(' ').filter(Boolean);
      for (const p of parts) {
        idx = lower.indexOf(p);
        if (idx >= 0) break;
      }
    }
    if (idx < 0) return raw.slice(0, 220) + (raw.length > 220 ? '…' : '');

    const start = Math.max(0, idx - 90);
    const end = Math.min(raw.length, idx + 130);
    let snip = raw.slice(start, end);
    if (start > 0) snip = '…' + snip;
    if (end < raw.length) snip = snip + '…';
    return snip;
  };

  const highlightHTML = (text, qNorm) => {
    const safe = RB.escapeHTML(String(text || ''));
    const parts = normalize(qNorm).split(' ').filter(Boolean);
    if (!parts.length) return safe;

    // Longest-first to reduce nested overlaps
    parts.sort((a, b) => b.length - a.length);

    let out = safe;
    for (const p of parts) {
      if (p.length < 2) continue;
      const re = new RegExp(
        `(${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
        'ig'
      );
      out = out.replace(re, '<mark class="rb-hl">$1</mark>');
    }
    return out;
  };

  RB.loadIndex = async () => {
    if (LOADED) return { INDEX, DOC_META };

    const manifest = await RB.loadManifest();
    const docs = manifest.documents || [];

    DOC_META = {};
    INDEX = [];

    for (const d of docs) {
      const doc = await RB.loadJSON(d.file);
      DOC_META[doc.doc_id] = {
        doc_id: doc.doc_id,
        title: doc.title,
        lang: doc.lang,
        version_label: doc.version_label,
        published_date: doc.published_date,
        source_name: doc.source_name,
        source_url: doc.source_url,
      };

      for (const e of doc.entries || []) {
        const entry = {
          ...e,
          _doc_id: doc.doc_id,
          _doc_title: doc.title,
          _haystack: buildHaystack(e),
        };
        INDEX.push(entry);
      }
    }

    LOADED = true;
    return { INDEX, DOC_META };
  };

  RB.search = async ({ q, docFilter = 'ALL', limit = 50 }) => {
    await RB.loadIndex();
    const qNorm = normalize(q);
    if (!qNorm) return [];

    const pool =
      docFilter === 'ALL'
        ? INDEX
        : INDEX.filter((e) => e._doc_id === docFilter);

    const scored = [];
    for (const e of pool) {
      if (!e._haystack.includes(qNorm)) {
        // if query is numeric-like, allow ref prefix match even if haystack misses
        if (!normalize(e.ref).startsWith(qNorm)) continue;
      }
      const s = scoreEntry(e, qNorm);
      if (s > 0) scored.push({ e, s });
    }

    scored.sort((a, b) => b.s - a.s);

    return scored.slice(0, limit).map(({ e, s }) => ({
      key: e.key,
      ref: e.ref,
      heading: e.heading,
      path: e.path,
      text: e.text,
      doc_id: e._doc_id,
      doc_title: e._doc_title,
      score: s,
      snippet: makeSnippet(e.text || '', qNorm),
    }));
  };

  RB.highlightHTML = highlightHTML;
})();
