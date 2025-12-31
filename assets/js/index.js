      (async () => {
        const RB = window.RB;

        // DOM refs (used throughout)
        const qEl = document.getElementById('q');
        const docFilterEl = document.getElementById('docFilter');
        const resultsEl = document.getElementById('results');
        const emptyEl = document.getElementById('emptyState');
        const countEl = document.getElementById('resultsCount');
        const statusBadge = document.getElementById('statusBadge');
        const docsBadge = document.getElementById('docsBadge');
        const clearBtn = document.getElementById('clearBtn');

        // If app.js didn't load (404) or crashed, RB will be undefined.
        if (!RB || typeof RB.loadManifest !== 'function') {
          statusBadge.textContent = 'Error';
          statusBadge.className = 'badge text-bg-danger';

          const box = document.createElement('div');
          box.id = 'errorBox';
          box.className = 'alert alert-danger mt-3 mb-0';
          box.role = 'alert';
          box.textContent =
            'RB core not loaded. assets/js/app.js is missing/404 or has a JS error. Open DevTools → Network and verify assets/js/app.js returns 200. Then open DevTools → Console to see any JS error.';

          const cardBody = statusBadge.closest('.card-body');
          cardBody.appendChild(box);
          console.error(
            'RB core not loaded. Check that assets/js/app.js loaded successfully and has no errors.'
          );
          return;
        }

        // Visible error banner (inserted dynamically)
        const showError = (msg) => {
          if (window.__rb_last_error) console.error(window.__rb_last_error);
          statusBadge.textContent = 'Error';
          statusBadge.className = 'badge text-bg-danger';

          let box = document.getElementById('errorBox');
          if (!box) {
            box = document.createElement('div');
            box.id = 'errorBox';
            box.className = 'alert alert-danger mt-3 mb-0';
            box.role = 'alert';
            // place inside the first card body
            const cardBody = statusBadge.closest('.card-body');
            cardBody.appendChild(box);
          }
          box.textContent = msg;
          console.error(msg);
        };

        const setStatus = () => {
          const online = navigator.onLine;
          statusBadge.textContent = online ? 'Online' : 'Offline';
          statusBadge.className = online
            ? 'badge text-bg-success'
            : 'badge text-bg-warning';
        };
        window.addEventListener('online', setStatus);
        window.addEventListener('offline', setStatus);
        setStatus();

        // (No renderGroupCard: group type is not used in new data shape)

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

        const renderResults = (items, q) => {
          resultsEl.innerHTML = '';

          // Total results = sum of match_count across all roots
          const total = (items || []).reduce((acc, it) => {
            if (!it || it.type !== 'macro') return acc;
            return (
              acc +
              (it.rulesets || []).reduce(
                (a, rs) =>
                  a +
                  (rs.roots || []).reduce(
                    (b, r) => b + (r.match_count || 0),
                    0
                  ),
                0
              )
            );
          }, 0);

          countEl.textContent = String(total);
          const hasResults = total > 0;
          emptyEl.classList.toggle('d-none', hasResults);
          resultsEl.classList.toggle('d-none', !hasResults);


          for (const it of items) {
            // MACRO level (collapsed by default)
            if (it && it.type === 'macro') {
              const macroId = `macro-${it.doc_id}-${it.macro.id}`;
              const macroMatches = (it.rulesets || []).reduce(
                (acc, rs) =>
                  acc +
                  (rs.roots || []).reduce(
                    (b, r) => b + (r.match_count || 0),
                    0
                  ),
                0
              );

              const card = document.createElement('div');
              card.className = 'card shadow-sm';

              card.innerHTML = `
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start gap-2 rb-macro-header" role="button" tabindex="0" aria-controls="${macroId}" aria-expanded="false">
                    <div>
                      <div class="small text-accent fw-semibold">${RB.escapeHTML(
                        it.doc_id
                      )}</div>
                      <div class="h5 mb-0 fw-bold text-dark d-flex align-items-center gap-2 flex-wrap">
                        <span>${RB.escapeHTML(
                          `${it.macro.id} ${it.macro.title}`
                        )}</span>
                        <span class="badge text-bg-light border text-secondary">${RB.escapeHTML(
                          String(macroMatches)
                        )}</span>
                      </div>
                    </div>
                    <div class="text-accent fw-semibold" data-caret aria-hidden="true">▸</div>
                  </div>
                  <div id="${macroId}" class="mt-2 d-none" data-macro-body></div>
                </div>
              `;

              const macroBody = card.querySelector('[data-macro-body]');
              const macroHeader = card.querySelector('.rb-macro-header');
              const macroCaret = card.querySelector('[data-caret]');

              const toggleMacro = () => {
                const isHidden = macroBody.classList.contains('d-none');
                macroBody.classList.toggle('d-none', !isHidden);
                macroHeader.setAttribute(
                  'aria-expanded',
                  isHidden ? 'true' : 'false'
                );
                if (macroCaret) macroCaret.textContent = isHidden ? '▾' : '▸';
              };

              macroHeader.addEventListener('click', toggleMacro);
              macroHeader.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleMacro();
                }
              });

              for (const rs of it.rulesets || []) {
                const rsId = `rs-${it.doc_id}-${it.macro.id}-${rs.ruleset.id}`;
                const rsMatches = (rs.roots || []).reduce(
                  (b, r) => b + (r.match_count || 0),
                  0
                );

                const rsCard = document.createElement('div');
                rsCard.className = 'card border-0';

                rsCard.innerHTML = `
                  <div class="px-2 py-2 rb-ruleset-header" role="button" tabindex="0" aria-controls="${rsId}" aria-expanded="true">
                    <div class="d-flex justify-content-between align-items-center">
                      <div class="fw-semibold text-dark d-flex align-items-center gap-2 flex-wrap">
                        <span>${RB.escapeHTML(
                          `${rs.ruleset.id} ${rs.ruleset.title}`
                        )}</span>
                        <span class="badge text-bg-light border text-secondary">${RB.escapeHTML(
                          String(rsMatches)
                        )}</span>
                      </div>
                      <div class="text-accent fw-semibold" data-caret aria-hidden="true">▾</div>
                    </div>
                  </div>
                  <div id="${rsId}" class="px-2 pb-2" data-ruleset-body></div>
                `;

                const rsBody = rsCard.querySelector('[data-ruleset-body]');
                const rsHeader = rsCard.querySelector('.rb-ruleset-header');
                const rsCaret = rsCard.querySelector('[data-caret]');

                const toggleRs = () => {
                  const isHidden = rsBody.classList.contains('d-none');
                  rsBody.classList.toggle('d-none', !isHidden);
                  rsHeader.setAttribute(
                    'aria-expanded',
                    isHidden ? 'true' : 'false'
                  );
                  if (rsCaret) rsCaret.textContent = isHidden ? '▾' : '▸';
                };

                rsHeader.addEventListener('click', toggleRs);
                rsHeader.addEventListener('keydown', (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleRs();
                  }
                });

                // Render roots list
                for (const r of rs.roots || []) {
                  const href = `view.html?doc=${encodeURIComponent(
                    r.doc_id
                  )}&root=${encodeURIComponent(
                    r.root.ref
                  )}&q=${encodeURIComponent(q)}&from=${encodeURIComponent(
                    location.pathname + location.search
                  )}`;

                  const row = document.createElement('div');
                  row.className = 'rb-root-row';
                  row.innerHTML = `
                    <a class="text-decoration-none" href="${href}">
                      <div class="d-flex justify-content-between align-items-start gap-2">
                        <div>
                          <div class="small text-accent fw-semibold">${RB.escapeHTML(
                            `${r.doc_id} ${r.root.ref}`
                          )}</div>
                          <div class="fw-regular text-light">${RB.escapeHTML(
                            r.root.heading || '—'
                          )}</div>
                        </div>
                        <div>
                          <span class="badge text-bg-light border text-secondary">${RB.escapeHTML(
                            String(r.match_count || 0)
                          )}</span>
                        </div>
                      </div>
                    </a>
                  `;
                  rsBody.appendChild(row);
                }

                macroBody.appendChild(rsCard);
              }

              resultsEl.appendChild(card);
              continue;
            }


            // Fallback (should be rare): treat as navigational card
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
                    <div class="fw-semibold">${RB.escapeHTML(
                      it.heading ? it.heading : `${it.doc_id} ${it.ref}`.trim()
                    )}</div>
                    <div class="small text-secondary">
                      <span class="fw-semibold">${RB.escapeHTML(
                        `${it.doc_id} ${it.ref}`.trim()
                      )}</span>
                      <span class="mx-1">•</span>
                      <span>${RB.escapeHTML(it.doc_title || it.doc_id)}</span>
                    </div>
                  </div>
                </div>
                <div class="mt-2 small text-secondary">${RB.highlightHTML(
                  it.snippet || '',
                  q
                )}</div>
              </div>
            `;
            card.addEventListener('click', (e) => {
              if (e.target && e.target.closest('a')) return;
              location.href = href;
            });
            resultsEl.appendChild(card);
          }
        };

        const persistStateToUrl = (q, docFilter) => {
          const u = new URL(window.location.href);
          if (q) u.searchParams.set('q', q);
          else u.searchParams.delete('q');

          if (docFilter && docFilter !== 'ALL')
            u.searchParams.set('doc', docFilter);
          else u.searchParams.delete('doc');

          // Keep URL in sync without adding history entries
          history.replaceState(null, '', u.toString());
        };

        const runSearch = async () => {
          const q = qEl.value.trim();
          const docFilter = docFilterEl.value;

          // Persist current state so it survives navigation + Back
          persistStateToUrl(q, docFilter);

          if (!q) {
            renderResults([], '');
            return;
          }
          const items = await RB.search({ q, docFilter, limit: 60 });
          renderResults(items, q);
        };

        try {
          // Load manifest to populate the doc filter and verify paths
          const manifest = await RB.loadManifest();
          const docs = manifest.documents || [];
          docsBadge.textContent = `Docs: ${docs.length}`;

          for (const d of docs) {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = `${d.title} (${d.id})`;
            docFilterEl.appendChild(opt);
          }

          // Preload index (will fetch JSONs). If this fails, we show a visible error.
          await RB.loadIndex();

          // Wire UI events
          // Live search (mobile-friendly) with a short debounce
          let searchTimer;
          const scheduleSearch = () => {
            clearTimeout(searchTimer);

            // If query is empty, immediately show the empty state and keep URL in sync.
            const qNow = qEl.value.trim();
            const docNow = docFilterEl.value;
            persistStateToUrl(qNow, docNow);
            if (!qNow) {
              renderResults([], '');
              return;
            }

            searchTimer = setTimeout(runSearch, 220);
          };

          qEl.addEventListener('input', scheduleSearch);

          // Keep Enter support for desktop keyboards
          qEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') runSearch();
          });

          docFilterEl.addEventListener('change', runSearch);

          clearBtn.addEventListener('click', () => {
            qEl.value = '';
            docFilterEl.value = 'ALL';
            renderResults([], '');
            clearTimeout(searchTimer);
            // Clear URL state
            const u = new URL(window.location.href);
            u.searchParams.delete('q');
            u.searchParams.delete('doc');
            history.replaceState(null, '', u.toString());
            qEl.focus();
          });

          // Optional: auto-run if ?q=...
          const params = new URLSearchParams(location.search);
          const qFromUrl = params.get('q');
          const docFromUrl = params.get('doc');

          if (docFromUrl) {
            // Apply after options are populated
            docFilterEl.value = docFromUrl;
          }

          if (qFromUrl) {
            qEl.value = qFromUrl;
            await runSearch();
          }
          if (!qFromUrl) {
            // Initial empty view
            renderResults([], '');
          }
        } catch (err) {
          window.__rb_last_error = err;
          showError(
            `Failed to load rules data. Common causes: (1) missing assets/data/manifest.json, (2) wrong paths in manifest/file, (3) opening via file:// instead of a local server. Details: ${
              err && err.message ? err.message : String(err)
            }`
          );
        }
      })();