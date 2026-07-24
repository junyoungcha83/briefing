# Architecture and migration boundary

## Runtime boundaries

- Static UI: repository root (`index.html`, `assets/`, `data/`, `manifest.webmanifest`, `sw.js`). These paths are public URLs and must remain unchanged.
- Data generation: `tools/` holds the actual logic (`build-feed.mjs`, `build-stock.mjs`). `scripts/build-feed.mjs` and `scripts/build-stock.mjs` remain as thin compatibility shims (`import '../tools/…'`) so the documented command `node scripts/build-*.mjs <today.json>` keeps working unchanged. Run from the repository root.
- API: none; deployment is static-only.

## Safe migration rule

Keep the public root unchanged. Domain logic lives under `tools/`, while `scripts/` entrypoints remain as compatibility shims — both are one level below the repo root, so each script's `ROOT = dirname(script)/..` still resolves to the repo root and outputs land in `data/`/`data/archive/` unchanged. Do not rename `assets/`, `data/`, or move `sw.js` without a versioned URL migration and PWA cache test. Do not relocate `GENERATE.md` or `README.md`: the scheduled 06:00 KST agent follows `GENERATE.md` and README links it in several places.

## Agent boundary

Future agent tools should call data builders and report readers through stable functions; the agent must not write directly into published `data/` without validation.
