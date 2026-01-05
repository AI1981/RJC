# Riftbound Judge Codex

Riftbound Judge Codex is a lightweight, offline-first Progressive Web App (PWA) designed to help Riftbound judges quickly consult **Core Rules (CR)** and **Tournament Rules (TR)** during events, even without network connectivity.

The application is fully static, client-side only, and published via GitHub Pages.

---

## Features

- Fast keyword and rule-reference search across CR and TR
- Structured browsing by macro categories
- Dedicated rule view with parent/child hierarchy
- One-click copy for individual rules
- Installable as a PWA (desktop and Android)
- Fully usable offline after first load
- Clear document metadata (version, publication date, source)

---

## Tech Stack

- Vanilla JavaScript (no frameworks)
- HTML5 + CSS3
- Service Worker for offline caching
- GitHub Pages for hosting
- Progressive Web App (PWA)

---

## Project Structure

/
├── index.html
├── view.html
├── docs.html
├── about.html
├── assets/
│   ├── css/
│   │   └── app.css
│   ├── js/
│   │   ├── app.js
│   │   ├── search.js
│   │   ├── view.js
│   │   ├── docs.js
│   │   ├── storage.js
│   │   └── sw.js
│   ├── data/
│   │   ├── manifest.json
│   │   └── documents/
│   │       ├── core_rules.json
│   │       └── tr.json
│   └── img/
│       ├── logo.png
│       ├── logo-icon.png
│       ├── icon-192.png
│       └── icon-512.png
└── README.md

---

## Documents and Metadata

All rule documents are declared in `assets/data/manifest.json`.

Each document entry includes:
- `id` (CR / TR)
- `title`
- `lang`
- `version_label`
- `published_date`
- `source_name`
- `source_url`
- `file` (JSON rules file)

This allows users to clearly identify which official version of the rules they are consulting.

---

## Offline and PWA Behavior

- The app is cached using a Service Worker
- After one online load, the app works fully offline
- Search, browsing, and rule views remain available without network access

---

## Update and Release Workflow (Important)

This project uses a cache-version-based release workflow.

### Every update must follow these steps:

1. **Update content or code**
   - Rule data (`core_rules.json`, `tr.json`)
   - Document metadata (`manifest.json`)
   - UI or logic (`.js`, `.css`, `.html`)

2. **Bump the Service Worker cache version**

   In `assets/js/sw.js`:
   ```js
   const CACHE_NAME = 'rb-judge-codex-vX.Y.Z';

   Example:
   const CACHE_NAME = 'rb-judge-codex-v1.0.4';

   This step is mandatory for every release and guarantees that all users, including installed PWAs, receive the update.

    git add -A
    git commit -m "Release vX.Y.Z"
    git push origin main