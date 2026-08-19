# Plan — Phase 0: Project scaffold

## 1. Repo housekeeping
- Add `README.md`: what Golden Hour is (short pitch from `specs/mission.md`), current status (scaffold only), and how to run it locally (serve the repo root as static files, no build step).
- Add `LICENSE`: MIT, author from git config / user email on record.
- Confirm `.gitignore` covers any editor/OS cruft (leave as-is unless a gap is found).

## 2. Base file/folder structure
- `index.html` at repo root.
- `/css/styles.css`.
- `/js/app.js` (entry point; registers the service worker).
- `/js/sw.js` — actually service workers are typically served from the root scope, so place as `/sw.js` at repo root, not under `/js`.
- `images/icons/` directory — already populated by the user with `icon-192.png` (192×192), `icon.png` (512×512), and `icon-mascable.png` (512×512, maskable). No placeholder README needed.
- `manifest.webmanifest` at repo root.

## 3. Web app manifest (`manifest.webmanifest`)
- `name`: "Golden Hour", `short_name`: "Golden Hour".
- `icons`: array referencing the actual files in `images/icons/`:
  - `images/icons/icon-192.png`, `sizes: "192x192"`, `type: "image/png"`, `purpose: "any"`.
  - `images/icons/icon.png`, `sizes: "512x512"`, `type: "image/png"`, `purpose: "any"`.
  - `images/icons/icon-mascable.png`, `sizes: "512x512"`, `type: "image/png"`, `purpose: "maskable"`.
- `start_url`, `id`, `display: "standalone"`, `theme_color` and `background_color` set to neutral placeholder values (not the final palette).
- Link it from `index.html` via `<link rel="manifest">`.

## 4. Service worker skeleton (`/sw.js`)
- `install` event: cache the app shell (`index.html`, `styles.css`, `app.js`, `manifest.webmanifest`) using the Cache API.
- `activate` event: clean up old cache versions (skeleton for future cache-busting, even with just one version now).
- `fetch` event: minimal cache-first strategy for the cached app shell only; anything else falls through to network. No offline fallback page routing logic yet beyond serving the cached shell (full offline handling is Phase 6).
- Register the service worker from `app.js` with a feature check (`if ('serviceWorker' in navigator)`).

## 5. Placeholder screen (`index.html` + `styles.css`)
- Minimal semantic HTML: `<html lang="en">`, a landmark structure (`<header>`, `<main>`), page title "Golden Hour", and a short placeholder message (e.g. "Golden Hour is getting ready.").
- `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- Baseline CSS: system font stack, neutral dark-leaning background per `BRAND_DESIGN.md` direction, CSS custom properties for colours set up so Phase 11 can swap in the real duotone values without restructuring.
- `prefers-color-scheme` media query stub for light/dark (even a minimal light/dark variant now, to be refined later) — no manual theme switch, per `specs/tech-stack.md`.
- No `<img>` elements yet beyond what the manifest needs; if a logo mark is added to the page itself, it must have `alt` text.

## 6. Accessibility & responsive baseline
- Verify heading structure, landmark roles, and colour contrast of the placeholder text against its background.
- Confirm the layout doesn't break at common mobile/desktop widths (this is a single static block at this phase, so mainly a sanity check).

## 7. Verify installability
- Validate `manifest.webmanifest` is well-formed JSON and passes basic manifest checks in browser devtools.
- Confirm the service worker registers without errors and the app shell is cached after first load.
- Run a Lighthouse PWA audit; expect exactly one known gap (missing real icon files) until the user supplies them — document this in the audit notes rather than treating it as a failure of this phase.
