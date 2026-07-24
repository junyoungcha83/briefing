# Architecture and migration boundary

## Runtime boundaries

- Static UI: repository root (`index.html`, `assets/`, `data/`, `manifest.webmanifest`, `sw.js`). These paths are public URLs and must remain unchanged.
- Data generation: `scripts/` (`build-feed.mjs`, `build-stock.mjs`). Run from the repository root.
- API: none; deployment is static-only.

## Safe migration rule

Keep the public root unchanged. New domain logic should be added below `src/` or `tools/`, while existing scripts may remain as compatibility entrypoints. Do not rename `assets/`, `data/`, or move `sw.js` without a versioned URL migration and PWA cache test.

## Agent boundary

Future agent tools should call data builders and report readers through stable functions; the agent must not write directly into published `data/` without validation.
