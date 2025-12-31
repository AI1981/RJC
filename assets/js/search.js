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

  // --- Rule reference sorting: 747 < 747.1 < 747.1.a < 747.2 ...
  const refParts = (ref) => {
    return String(ref || '')
      .trim()
      .replace(/\.$/, '')
      .split('.')
      .filter(Boolean)
      .map((seg) => {
        if (/^\d+$/.test(seg)) return { t: 0, n: parseInt(seg, 10), s: seg };
        return { t: 1, n: 0, s: seg.toLowerCase() };
      });
  };

  const compareRefs = (aRef, bRef) => {
    const a = refParts(aRef);
    const b = refParts(bRef);
    const L = Math.max(a.length, b.length);

    for (let i = 0; i < L; i++) {
      const ai = a[i];
      const bi = b[i];

      if (!ai && bi) return -1; // shorter first (747 before 747.1)
      if (ai && !bi) return 1;

      if (ai.t !== bi.t) return ai.t - bi.t; // numeric segments before alpha segments
      if (ai.t === 0) {
        if (ai.n !== bi.n) return ai.n - bi.n;
        if (ai.s.length !== bi.s.length) return ai.s.length - bi.s.length;
      } else {
        if (ai.s !== bi.s) return ai.s < bi.s ? -1 : 1;
      }
    }
    return 0;
  };
  // --- end ref sorting helpers

  // Root rule = no dotted sub-reference (e.g., 747 is root; 747.1.a is not)
  const isRootRule = (ref) => !String(ref || '').includes('.');

  // Heuristic: treat queries like "747", "747.1.a" as reference searches
  const isRefQuery = (qNorm) =>
    /^[0-9]{1,3}(?:\.[0-9a-z]+)*$/i.test(String(qNorm || '').trim());

  // Parse user query into AND terms.
  // - Words separated by spaces are ANDed.
  // - Quoted phrases are treated as single terms.
  // - Terms starting with '-' are excluded (NOT).
  const parseQuery = (raw) => {
    const s = String(raw || '').trim();
    const out = { must: [], phrases: [], mustNot: [] };
    if (!s) return out;

    // Tokenize preserving quoted phrases
    const re = /"([^"]+)"|(\S+)/g;
    let m;
    while ((m = re.exec(s))) {
      const phrase = m[1];
      const word = m[2];
      let tok = phrase != null ? phrase : word;
      if (!tok) continue;
      tok = tok.trim();
      if (!tok) continue;

      const isNeg = tok.startsWith('-') && tok.length > 1;
      if (isNeg) tok = tok.slice(1).trim();
      if (!tok) continue;

      const normTok = normalize(tok);
      if (!normTok) continue;

      if (phrase != null) {
        if (isNeg) out.mustNot.push(normTok);
        else out.phrases.push(normTok);
      } else {
        if (isNeg) out.mustNot.push(normTok);
        else out.must.push(normTok);
      }
    }

    // De-dup
    out.must = Array.from(new Set(out.must));
    out.phrases = Array.from(new Set(out.phrases));
    out.mustNot = Array.from(new Set(out.mustNot));
    return out;
  };

  // --- Taxonomy (manual chapters): MACRO -> RULESET
  // NOTE: CR has detailed sub-rulesets; TR uses only macro buckets.
  const CR_TAXONOMY = [
    {
      macro: { id: '000', title: 'GOLDEN AND SILVER RULES' },
      rulesets: [
        { id: '001', title: 'golden rule' },
        { id: '050', title: 'silver rule' },
      ],
    },
    {
      macro: { id: '100', title: 'GAME CONCEPTS' },
      rulesets: [
        { id: '101', title: 'deck construction' },
        { id: '104', title: 'setup' },
        { id: '119', title: 'game objects' },
        { id: '124', title: 'cards' },
        { id: '139', title: 'units' },
        { id: '145', title: 'gear' },
        { id: '149', title: 'spells' },
        { id: '156', title: 'runes' },
        { id: '165', title: 'battlefields' },
        { id: '169', title: 'legends' },
        { id: '173', title: 'tokens' },
        { id: '182', title: 'control' },
      ],
    },
    {
      macro: { id: '300', title: 'PLAY THE GAME' },
      rulesets: [
        { id: '301', title: 'the turn' },
        { id: '318', title: 'cleanups' },
        { id: '324', title: 'chains and showdowns' },
        { id: '346', title: 'playing cards' },
        { id: '357', title: 'abilities' },
        { id: '395', title: 'game actions' },
        { id: '423', title: 'movement' },
        { id: '437', title: 'combat' },
        { id: '441', title: 'the step of combat' },
        { id: '445', title: 'scoring' },
        { id: '450', title: 'layers' },
        { id: '458', title: 'modes of play' },
        { id: '649', title: 'conceding' },
      ],
    },
    {
      macro: { id: '700', title: 'ADDITIONAL RULES' },
      rulesets: [
        { id: '701', title: 'buffs' },
        { id: '706', title: 'mighty' },
        { id: '712', title: 'bonus damage' },
        { id: '716', title: 'attachment' },
        { id: '720', title: 'inactive' },
        { id: '726', title: 'keywords' },
      ],
    },
  ];

  const TR_TAXONOMY = [
    { macro: { id: '100', title: 'INTRODUCTION' }, rulesets: [{ id: '100', title: 'introduction' }] },
    { macro: { id: '200', title: 'DEFINITIONS' }, rulesets: [{ id: '200', title: 'definitions' }] },
    { macro: { id: '300', title: 'ELIGIBILITY' }, rulesets: [{ id: '300', title: 'eligibility' }] },
    { macro: { id: '400', title: 'POLICIES' }, rulesets: [{ id: '400', title: 'policies' }] },
    { macro: { id: '500', title: 'COMMUNICATION' }, rulesets: [{ id: '500', title: 'communication' }] },
    { macro: { id: '600', title: 'COMPETITION FORMATS' }, rulesets: [{ id: '600', title: 'competition formats' }] },
    { macro: { id: '700', title: 'ENFORCEMENT AND PENALTIES' }, rulesets: [{ id: '700', title: 'enforcement and penalties' }] },
  ];

  const TAXONOMY_BY_DOC = {
    CR: CR_TAXONOMY,
    TR: TR_TAXONOMY,
  };

  const num3 = (s) => {
    const n = parseInt(String(s), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const categorizeRef = (docId, ref) => {
    const tax = TAXONOMY_BY_DOC[String(docId || 'CR')] || CR_TAXONOMY;

    const baseStr = String(ref || '').split('.')[0];
    const base = num3(baseStr);

    // macro = last macro.id <= base
    let macro = tax[0].macro;
    let rulesets = tax[0].rulesets;
    for (const m of tax) {
      if (num3(m.macro.id) <= base) {
        macro = m.macro;
        rulesets = m.rulesets;
      }
    }

    // ruleset = last ruleset.id <= base
    let ruleset = rulesets[0];
    for (const r of rulesets) {
      if (num3(r.id) <= base) ruleset = r;
    }

    return { macro, ruleset };
  };
  // --- end taxonomy


  const buildHaystack = (e) => {
    const p = Array.isArray(e.path) ? e.path.join(' ') : '';
    return normalize([e.ref, e.heading, p, e.text].filter(Boolean).join(' '));
  };

  const makeSnippet = (text, needles) => {
    const raw = String(text || '');
    if (!raw) return '';
    const lower = raw.toLowerCase();
    const list = Array.isArray(needles) ? needles : [String(needles || '')];
    const nlist = list.map((x) => String(x || '').toLowerCase()).filter(Boolean);

    let idx = -1;
    for (const n of nlist) {
      idx = lower.indexOf(n);
      if (idx >= 0) break;
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
    const qObj = parseQuery(qNorm);
    const parts = [...qObj.phrases, ...qObj.must].filter(Boolean);
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

  // Create a map for quick root lookup: doc_id -> ref -> entry
  const ensureEntryByDocRef = () => {
    RB._entryByDocRef = {};
    for (const e of INDEX) {
      const docId = e._doc_id;
      if (!RB._entryByDocRef[docId]) RB._entryByDocRef[docId] = {};
      RB._entryByDocRef[docId][String(e.ref)] = e;
    }
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
        // Normalize TR roots: older TR imports may store "Title: body" in `text` with empty `heading`.
        // For roots (no dots), ensure `heading` is present so the UI doesn't render "—".
        let heading = e.heading;
        let text = e.text;
        if (doc.doc_id === 'TR' && isRootRule(e.ref) && (!heading || !String(heading).trim())) {
          const t = String(text || '').trim();
          if (t.includes(':')) {
            const [h, rest] = t.split(':', 1).length ? [t.split(':', 2)[0], t.slice(t.indexOf(':') + 1)] : [t, ''];
            const hh = String(h || '').trim();
            const rr = String(rest || '').trim();
            heading = hh || t;
            text = rr;
          } else {
            // e.g. "200. Definitions" (no colon)
            heading = t;
            text = '';
          }
        }

        const normalized = { ...e, heading, text };

        const entry = {
          ...normalized,
          _doc_id: doc.doc_id,
          _doc_title: doc.title,
          _haystack: buildHaystack(normalized),
        };
        INDEX.push(entry);
      }
    }

    ensureEntryByDocRef();

    LOADED = true;
    return { INDEX, DOC_META };
  };

  RB.search = async ({ q, docFilter = 'ALL', limit = 50 }) => {
    await RB.loadIndex();
    const qNorm = normalize(q);
    if (!qNorm) return [];

    const refQuery = isRefQuery(qNorm);

    const qObj = parseQuery(q);
    const needles = [...qObj.phrases, ...qObj.must];

    const pool =
      docFilter === 'ALL'
        ? INDEX
        : INDEX.filter((e) => e._doc_id === docFilter);

    // Keyword mode: MACRO -> RULESET -> ROOTS (navigation list)
    // Each root aggregates matches within its family and exposes match_count.
    if (!refQuery) {
      const macroMap = new Map();
      const rootMap = new Map(); // key = doc:rootRef

      for (const e of pool) {
        const headingN = normalize(e.heading);
        const textN = normalize(e.text);
        const hay = `${headingN} ${textN}`.trim();

        // Exclusions (NOT)
        let excluded = false;
        for (const n of qObj.mustNot) {
          if (n && hay.includes(n)) {
            excluded = true;
            break;
          }
        }
        if (excluded) continue;

        // AND requirements: all phrases + all words must be present
        let ok = true;
        for (const p of qObj.phrases) {
          if (p && !hay.includes(p)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        for (const w of qObj.must) {
          if (w && !hay.includes(w)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        const rootRef = String(e.ref).split('.')[0];
        const key = `${e._doc_id}:${rootRef}`;

        if (!rootMap.has(key)) {
          const rootEntry = RB._entryByDocRef?.[e._doc_id]?.[rootRef] || null;
          const cat = categorizeRef(e._doc_id, rootRef);

          rootMap.set(key, {
            type: 'root',
            doc_id: e._doc_id,
            doc_title: e._doc_title,
            macro: cat.macro,
            ruleset: cat.ruleset,
            root: rootEntry
              ? { key: rootEntry.key, ref: rootEntry.ref, heading: rootEntry.heading }
              : { key: `${e._doc_id}-${rootRef}`, ref: rootRef, heading: `${rootRef}` },
            match_count: 0,
          });
        }

        // Count every matching entry within the family (root + children)
        rootMap.get(key).match_count += 1;
      }

      // Place roots into macro->ruleset buckets
      for (const r of rootMap.values()) {
        const macroKey = `${r.doc_id}:${r.macro.id}`;
        if (!macroMap.has(macroKey)) {
          macroMap.set(macroKey, {
            type: 'macro',
            doc_id: r.doc_id,
            doc_title: r.doc_title,
            macro: r.macro,
            rulesets: new Map(),
          });
        }
        const m = macroMap.get(macroKey);

        const rsKey = r.ruleset.id;
        if (!m.rulesets.has(rsKey)) {
          m.rulesets.set(rsKey, {
            type: 'ruleset',
            doc_id: r.doc_id,
            doc_title: r.doc_title,
            ruleset: r.ruleset,
            roots: [],
          });
        }
        m.rulesets.get(rsKey).roots.push(r);
      }

      // Sort
      const macros = Array.from(macroMap.values());
      macros.sort((a, b) => compareRefs(a.macro.id, b.macro.id));

      for (const m of macros) {
        const rsArr = Array.from(m.rulesets.values());
        rsArr.sort((a, b) => compareRefs(a.ruleset.id, b.ruleset.id));
        for (const rs of rsArr) {
          rs.roots.sort((x, y) => compareRefs(x.root.ref, y.root.ref));
        }
        m.rulesets = rsArr;
      }

      // Soft limit by total matches across roots (match_count)
      if (limit && limit > 0) {
        let remaining = limit;
        const trimmed = [];

        for (const m of macros) {
          const rsOut = [];
          for (const rs of m.rulesets) {
            if (remaining <= 0) break;
            const rOut = [];
            for (const r of rs.roots) {
              if (remaining <= 0) break;
              rOut.push(r);
              remaining -= Math.max(1, r.match_count);
            }
            if (rOut.length) rsOut.push({ ...rs, roots: rOut });
          }
          if (rsOut.length) trimmed.push({ ...m, rulesets: rsOut });
          if (remaining <= 0) break;
        }
        return trimmed;
      }

      return macros;
    }

    // Reference mode (grouped like keyword mode): MACRO -> RULESET -> ROOTS
    // A reference like "103.2" should return the root 103 with match_count including 103.2 and its children.
    const macroMap = new Map();
    const rootMap = new Map(); // key = doc:rootRef

    for (const e of pool) {
      const refN = normalize(e.ref);
      if (!refN.startsWith(qNorm)) continue;

      const rootRef = String(e.ref).split('.')[0];
      const key = `${e._doc_id}:${rootRef}`;

      if (!rootMap.has(key)) {
        const rootEntry = RB._entryByDocRef?.[e._doc_id]?.[rootRef] || null;
        const cat = categorizeRef(e._doc_id, rootRef);

        rootMap.set(key, {
          type: 'root',
          doc_id: e._doc_id,
          doc_title: e._doc_title,
          macro: cat.macro,
          ruleset: cat.ruleset,
          root: rootEntry
            ? { key: rootEntry.key, ref: rootEntry.ref, heading: rootEntry.heading }
            : { key: `${e._doc_id}-${rootRef}`, ref: rootRef, heading: `${rootRef}` },
          match_count: 0,
        });
      }

      rootMap.get(key).match_count += 1;
    }

    // Place roots into macro->ruleset buckets
    for (const r of rootMap.values()) {
      const macroKey = `${r.doc_id}:${r.macro.id}`;
      if (!macroMap.has(macroKey)) {
        macroMap.set(macroKey, {
          type: 'macro',
          doc_id: r.doc_id,
          doc_title: r.doc_title,
          macro: r.macro,
          rulesets: new Map(),
        });
      }
      const m = macroMap.get(macroKey);

      const rsKey = r.ruleset.id;
      if (!m.rulesets.has(rsKey)) {
        m.rulesets.set(rsKey, {
          type: 'ruleset',
          doc_id: r.doc_id,
          doc_title: r.doc_title,
          ruleset: r.ruleset,
          roots: [],
        });
      }
      m.rulesets.get(rsKey).roots.push(r);
    }

    // Sort
    const macros = Array.from(macroMap.values());
    macros.sort((a, b) => compareRefs(a.macro.id, b.macro.id));

    for (const m of macros) {
      const rsArr = Array.from(m.rulesets.values());
      rsArr.sort((a, b) => compareRefs(a.ruleset.id, b.ruleset.id));
      for (const rs of rsArr) {
        rs.roots.sort((x, y) => compareRefs(x.root.ref, y.root.ref));
      }
      m.rulesets = rsArr;
    }

    // Soft limit by total matches across roots (match_count)
    if (limit && limit > 0) {
      let remaining = limit;
      const trimmed = [];

      for (const m of macros) {
        const rsOut = [];
        for (const rs of m.rulesets) {
          if (remaining <= 0) break;
          const rOut = [];
          for (const r of rs.roots) {
            if (remaining <= 0) break;
            rOut.push(r);
            remaining -= Math.max(1, r.match_count);
          }
          if (rOut.length) rsOut.push({ ...rs, roots: rOut });
        }
        if (rsOut.length) trimmed.push({ ...m, rulesets: rsOut });
        if (remaining <= 0) break;
      }

      return trimmed;
    }

    return macros;
  };

  RB.highlightHTML = highlightHTML;
})();
