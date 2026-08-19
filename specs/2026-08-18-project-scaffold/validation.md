# Validation — Phase 0: Project scaffold

This phase is ready to merge when all of the following hold.

## Structure
- [x] `index.html`, `css/styles.css`, `js/app.js`, `sw.js`, `manifest.webmanifest`, and `images/icons/` exist at the expected paths from `plan.md`.
- [x] No framework code (React/Vue/Angular or similar) is present anywhere in the diff.
- [x] No sun/weather/notification/geolocation logic has been added — this phase is shell-only.

## Manifest & installability
- [x] `manifest.webmanifest` is valid JSON and linked from `index.html` (verified: served, parsed with `json.tool`, no errors).
- [x] `name` is "Golden Hour" and `short_name` is "Golden Hour".
- [x] `icons` array references the real files in `images/icons/` (`icon-192.png`, `icon.png`, `icon-mascable.png`) with correct `sizes`/`type`/`purpose`.
- [x] All icon paths resolve with no 404s (verified via HTTP requests: all returned 200); Chrome's manifest/icon-download pipeline processed the manifest with no errors logged.
- [ ] Lighthouse PWA audit — not run in this pass (no `lighthouse` CLI available in this environment). Recommend running it manually (e.g. Chrome DevTools > Lighthouse) before considering the app "installable" in the strict sense; nothing in the manual checks above suggests it would fail.

## Service worker
- [x] Service worker registers successfully with no console errors on first load (verified via headless Chrome: zero console output, `ServiceWorker.InstallEvent.All.Status` and `ActivateEventStatus` both recorded success).
- [x] After first load, the app shell (`index.html`, CSS, JS, manifest) is present in the Cache Storage (verified: 5 `Cache.Put` operations recorded, matching the 5-entry `APP_SHELL` array).
- [ ] Reload-after-first-load re-check — not independently re-verified in this pass beyond the initial install; the cache-first `fetch` handler is simple enough (checks cache, falls back to network) that this is low-risk, but flagging as not explicitly re-tested.

## Placeholder screen
- [x] Opening `index.html` (served statically, no build step) shows the "Golden Hour" title and "Golden Hour is getting ready." message, with no console errors (verified via headless Chrome screenshot + console log).
- [x] Page has a `lang` attribute, a sensible heading structure, and a viewport meta tag.
- [x] Layout centring verified to hold correctly at multiple rendered viewport widths (confirmed both a ~1280px and ~500px width render with the heading exactly horizontally centred); CSS uses no fixed widths or magic numbers, so it should hold at any breakpoint.
- [x] Text meets WCAG AA contrast: computed relative-luminance contrast is ≈7.7:1 for dark theme (muted text on dark background) and ≈6.6:1 for light theme (`prefers-color-scheme: light`), both comfortably above the 4.5:1 AA threshold for normal text; verified light theme renders correctly by default in a browser with no explicit dark preference.
- [x] No `<img>` elements are present on the placeholder page, so there's nothing requiring `alt` text yet (icons are referenced only via `<link>`/manifest, not `<img>`).

## Repo housekeeping
- [x] `README.md` explains what Golden Hour is and how to run it locally.
- [x] `LICENSE` (MIT) is present.

## Merge
- [ ] Branch `2026-08-18-project-scaffold` merges cleanly into `main` with no conflicts — pending your review and merge; not yet merged.
