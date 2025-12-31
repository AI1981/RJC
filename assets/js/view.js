// assets/js/view.js
(async () => {
  const RB = window.RB;

  const doc = RB.qs('doc');
  const key = RB.qs('key');
  const rootParam = RB.qs('root');
  const macroParam = RB.qs('macro');
  const q = RB.qs('q') || '';
  const from = RB.qs('from') || 'index.html';

  // Back
  const backLink = document.getElementById('backLink');
  if (backLink) backLink.href = from;

  // Helpers (local)
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

      if (!ai && bi) return -1;
      if (ai && !bi) return 1;

      if (ai.t !== bi.t) return ai.t - bi.t;
      if (ai.t === 0) {
        if (ai.n !== bi.n) return ai.n - bi.n;
        if (ai.s.length !== bi.s.length) return ai.s.length - bi.s.length;
      } else {
        if (ai.s !== bi.s) return ai.s < bi.s ? -1 : 1;
      }
    }
    return 0;
  };

  // --- Taxonomy (manual chapters): MACRO -> RULESET
  const TAXONOMY = [
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

  const num3 = (s) => {
    const n = parseInt(String(s), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const categorizeRef = (ref) => {
    const baseStr = String(ref || '').split('.')[0];
    const base = num3(baseStr);

    let macro = TAXONOMY[0].macro;
    let rulesets = TAXONOMY[0].rulesets;
    for (const m of TAXONOMY) {
      if (num3(m.macro.id) <= base) {
        macro = m.macro;
        rulesets = m.rulesets;
      }
    }

    let ruleset = rulesets[0];
    for (const r of rulesets) {
      if (num3(r.id) <= base) ruleset = r;
    }

    return { macro, ruleset };
  };
  // --- end taxonomy

  const setTitleBlock = (e) => {
    document.getElementById('ruleTitle').textContent = e?.heading || '—';
    document.getElementById('ruleRef').textContent = `${e?._doc_id || doc || ''} ${e?.ref || ''}`.trim();
    document.getElementById('ruleDoc').textContent = e?._doc_title || e?._doc_id || doc || '';
  };

  const setBreadcrumb = (rootRef, rootHeading) => {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    bc.innerHTML = '';

    if (!rootRef) return;
    const cat = categorizeRef(rootRef);

    const add = (label) => {
      const li = document.createElement('li');
      li.className = 'breadcrumb-item';
      li.textContent = label;
      bc.appendChild(li);
    };

    add(`${cat.macro.id} • ${cat.macro.title}`);
    add(`${cat.ruleset.id} • ${cat.ruleset.title}`);
    add(`${rootRef}${rootHeading ? ' • ' + rootHeading : ''}`);
  };

  const makeCopyBtn = (copyText) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-link p-0 text-secondary';
    btn.setAttribute('aria-label', 'Copy this rule');
    btn.title = 'Copy this rule';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 1.5H4A1.5 1.5 0 0 0 2.5 3v8A1.5 1.5 0 0 0 4 12.5h6A1.5 1.5 0 0 0 11.5 11V3A1.5 1.5 0 0 0 10 1.5zM4 2.5h6A.5.5 0 0 1 10.5 3v8a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z"/>
        <path d="M13.5 4.5v8A2.5 2.5 0 0 1 11 15H5.5a.5.5 0 0 1 0-1H11a1.5 1.5 0 0 0 1.5-1.5v-8a.5.5 0 0 1 1 0z"/>
      </svg>
    `;

    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const ok = await RB.copyToClipboard(copyText);
      if (ok) alert('Copied');
    });

    return btn;
  };

  const childrenTitle = document.getElementById('childrenTitle');
  const childrenRules = document.getElementById('childrenRules');

  const clearChildren = () => {
    if (childrenTitle) childrenTitle.classList.add('d-none');
    if (childrenRules) childrenRules.innerHTML = '';
  };

  const renderChildren = (docId, rootRef, children) => {
    if (!childrenRules || !childrenTitle) return;
    if (!children.length) {
      clearChildren();
      return;
    }

    childrenTitle.classList.remove('d-none');
    childrenRules.innerHTML = '';

    for (const c of children) {
      const item = document.createElement('div');
      item.className = 'list-group-item';
      item.id = `r-${String(c.ref).replace(/[^0-9a-zA-Z]+/g, '-')}`;

      const refLine = `${docId} ${c.ref}`.trim();

      // Build single-rule copy text: ref + (optional heading) + text
      const oneRuleText = [
        `${c.ref}`,
        c.heading ? String(c.heading) : '',
        c.text ? String(c.text) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      const refRow = document.createElement('div');
      refRow.className = 'd-flex align-items-start justify-content-between gap-2';

      const refEl = document.createElement('div');
      refEl.className = 'small fw-semibold rule-header';
      refEl.textContent = refLine;

      const copyBtn = makeCopyBtn(oneRuleText);

      refRow.appendChild(refEl);
      refRow.appendChild(copyBtn);

      item.appendChild(refRow);

      const body = document.createElement('div');
      body.className = 'mt-1 rule-body';
      body.innerHTML = RB.highlightHTML(String(c.text || ''), q);
      item.appendChild(body);

      childrenRules.appendChild(item);
    }
  };

  // Load index
  const { INDEX } = await RB.loadIndex();

  // Normalize doc id to the actual index doc id (case-insensitive)
  let effectiveDoc = doc;
  if (doc) {
    const wanted = String(doc).toLowerCase();
    const found = INDEX.find((x) => String(x._doc_id || '').toLowerCase() === wanted);
    if (found) effectiveDoc = found._doc_id;
  }

  // MACRO VIEW: ?macro=100
  if (macroParam) {
    const macroId = String(macroParam).trim();
    const mIdx = TAXONOMY.findIndex((m) => m.macro.id === macroId);
    const macroDef = mIdx >= 0 ? TAXONOMY[mIdx].macro : { id: macroId, title: 'Core Rules' };

    const start = num3(macroId);
    const next = mIdx >= 0 && TAXONOMY[mIdx + 1] ? num3(TAXONOMY[mIdx + 1].macro.id) : 10000;
    const end = next - 1;

    // Title block
    document.getElementById('ruleTitle').textContent = `${macroDef.id} ${macroDef.title}`;
    document.getElementById('ruleRef').textContent = `${effectiveDoc || ''} ${macroDef.id}`.trim();
    document.getElementById('ruleDoc').textContent = effectiveDoc || '';

    // Breadcrumb: macro only
    const bc = document.getElementById('breadcrumb');
    if (bc) {
      bc.innerHTML = '';
      const li = document.createElement('li');
      li.className = 'breadcrumb-item';
      li.textContent = `${macroDef.id} • ${macroDef.title}`;
      bc.appendChild(li);
    }

    // Hide main text block for macro view
    document.getElementById('ruleText').innerHTML = '';

    // Build full rules list for this macro (roots + children)
    const rules = INDEX.filter((x) => {
      if (x._doc_id !== effectiveDoc) return false;
      const base = num3(String(x.ref).split('.')[0]);
      return base >= start && base <= end;
    }).sort((a, b) => compareRefs(a.ref, b.ref));

    if (!rules.length) {
      if (childrenTitle) {
        childrenTitle.textContent = 'Rules';
        childrenTitle.classList.remove('d-none');
      }
      if (childrenRules) {
        childrenRules.innerHTML = '';
        const msg = document.createElement('div');
        msg.className = 'list-group-item text-secondary';
        msg.textContent = 'No rules found for this macro category.';
        childrenRules.appendChild(msg);
      }
      return;
    }

    if (childrenTitle) {
      childrenTitle.textContent = 'Rules';
      childrenTitle.classList.remove('d-none');
    }

    if (childrenRules) {
      childrenRules.innerHTML = '';

      for (const r of rules) {
        const depth = Math.max(0, String(r.ref || '').split('.').length - 1);
        const pad = 0.75 + depth * 0.9; // rem

        const item = document.createElement('div');
        item.className = 'list-group-item rb-rule-item';
        if (depth === 0) item.classList.add('rb-rule-root');
        item.id = `r-${String(r.ref).replace(/[^0-9a-zA-Z]+/g, '-')}`;
        item.style.setProperty('--rb-indent', `${pad}rem`);

        const refLine = `${effectiveDoc} ${r.ref}`.trim();

        const oneRuleText = [
          `${r.ref}`,
          r.heading ? String(r.heading) : '',
          r.text ? String(r.text) : '',
        ]
          .filter(Boolean)
          .join(' ')
          .trim();

        const refRow = document.createElement('div');
        refRow.className = 'd-flex align-items-start justify-content-between gap-2';

        const refEl = document.createElement('div');
        refEl.className = 'small rule-header fw-semibold';
        refEl.textContent = refLine;

        const copyBtn = makeCopyBtn(oneRuleText);

        refRow.appendChild(refEl);
        refRow.appendChild(copyBtn);
        item.appendChild(refRow);

        if (r.heading) {
          const h = document.createElement('div');
          h.className = 'fw-semibold rule-text';
          h.textContent = String(r.heading);
          item.appendChild(h);
        }

        if (r.text) {
          const t = document.createElement('div');
          t.className = 'mt-1 rule-text';
          t.innerHTML = RB.highlightHTML(String(r.text), q);
          item.appendChild(t);
        }

        childrenRules.appendChild(item);
      }
    }

    // Copy buttons: copy macro label / full macro text
    const copyRefBtn = document.getElementById('copyRefBtn');
    const copyTextBtn = document.getElementById('copyTextBtn');

    if (copyRefBtn) {
      copyRefBtn.addEventListener('click', async () => {
        const ok = await RB.copyToClipboard(`${effectiveDoc} ${macroDef.id}`.trim());
        if (ok) alert('Reference copied');
      });
    }

    if (copyTextBtn) {
      copyTextBtn.addEventListener('click', async () => {
        const full = rules
          .map((x) => {
            const parts = [`${x.ref}`];
            if (x.heading) parts.push(x.heading);
            if (x.text) parts.push(x.text);
            return parts.join(' ');
          })
          .join('\n');
        const ok = await RB.copyToClipboard(full);
        if (ok) alert('Text copied');
      });
    }

    return;
  }

  // FAMILY VIEW: ?root=747
  if (rootParam) {
    const rootRef = String(rootParam).trim();

    const rootEntry = INDEX.find((x) => x._doc_id === effectiveDoc && String(x.ref) === rootRef);

    if (!rootEntry) {
      document.getElementById('ruleTitle').textContent = 'Not found';
      document.getElementById('ruleText').textContent = '';
      clearChildren();
      return;
    }

    setTitleBlock(rootEntry);
    setBreadcrumb(rootRef, rootEntry.heading || '');

    const rootText = String(rootEntry.text || '');
    document.getElementById('ruleText').innerHTML = rootText ? RB.highlightHTML(rootText, q) : '';

    const children = INDEX.filter(
      (x) => x._doc_id === effectiveDoc && String(x.ref).startsWith(rootRef + '.')
    ).sort((a, b) => compareRefs(a.ref, b.ref));

    renderChildren(effectiveDoc, rootRef, children);

    // Copy buttons should copy the root ref/text (children can be copied via selection)
    const refText = `${rootEntry._doc_id} ${rootEntry.ref}`.trim();
    const fullText = [rootText, ...children.map((c) => `${c.ref} ${c.text || ''}`.trim())]
      .filter(Boolean)
      .join('\n');

    const copyRefBtn = document.getElementById('copyRefBtn');
    const copyTextBtn = document.getElementById('copyTextBtn');

    if (copyRefBtn) {
      copyRefBtn.addEventListener('click', async () => {
        const ok = await RB.copyToClipboard(refText);
        if (ok) alert('Reference copied');
      });
    }

    if (copyTextBtn) {
      copyTextBtn.addEventListener('click', async () => {
        const ok = await RB.copyToClipboard(fullText);
        if (ok) alert('Text copied');
      });
    }

    return;
  }

  // LEGACY VIEW: ?key=<entry key>
  // Find entry
  const cached =
    window.RB && window.RB.__entryCache
      ? window.RB.__entryCache[`${effectiveDoc}:${key}`] || window.RB.__entryCache[`${doc}:${key}`]
      : null;

  const e = cached || INDEX.find((x) => x._doc_id === effectiveDoc && x.key === key);

  if (!e) {
    document.getElementById('ruleTitle').textContent = 'Not found';
    document.getElementById('ruleText').textContent = '';
    clearChildren();
    return;
  }

  setTitleBlock(e);
  setBreadcrumb(String(e.ref || '').split('.')[0], e.heading || '');

  const text = e.text || '';
  document.getElementById('ruleText').innerHTML = RB.highlightHTML(text, q);
  clearChildren();

  // Copy buttons
  const refText = `${e._doc_id} ${e.ref}`.trim();

  const copyRefBtn = document.getElementById('copyRefBtn');
  const copyTextBtn = document.getElementById('copyTextBtn');

  if (copyRefBtn) {
    copyRefBtn.addEventListener('click', async () => {
      const ok = await RB.copyToClipboard(refText);
      if (ok) alert('Reference copied');
    });
  }

  if (copyTextBtn) {
    copyTextBtn.addEventListener('click', async () => {
      const ok = await RB.copyToClipboard(text);
      if (ok) alert('Text copied');
    });
  }
})();
