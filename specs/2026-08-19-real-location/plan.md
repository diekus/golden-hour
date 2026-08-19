# Plan — Phase 2: Real location

## 1. Location module
- Add `js/location.js` covering:
  - `DEFAULT_LOCATION`: the Phase 1 hardcoded London value, now shaped like every other location object — `{ lat: 51.5074, lng: -0.1278, label: 'London, England, UK', timezone: 'Europe/London', source: 'default' }`.
  - `getCachedLocation()` / `setCachedLocation(location)` / `clearCachedLocation()`, backed by `localStorage` (a single JSON-serialised key).
  - `resolveViaGeolocation()`: wraps `navigator.geolocation.getCurrentPosition` in a Promise; on success, builds a location object using the device's own `Intl.DateTimeFormat().resolvedOptions().timeZone` (GPS coordinates carry no timezone of their own) and `source: 'geolocation'`; rejects with a typed reason (`denied`, `unavailable`, `timeout`, `unsupported`) so the UI can show an appropriate message.
  - `searchLocations(query)`: calls the Open-Meteo Geocoding API, returns the top handful of candidate results (name, admin region, country, lat, lng, timezone) for disambiguation, `source: 'search'` once one is picked.

## 2. Timezone-aware time formatting
- `js/components/light-window-card.js` currently formats times with a single module-level `Intl.DateTimeFormat` using the browser's default timezone. Change it to accept a `timezone` field on `data` and format with `{ timeZone: data.timezone, hour: '2-digit', minute: '2-digit', hour12: false }`, caching one formatter per timezone string (a small `Map`) rather than constructing one per render.
- `js/app.js`'s render function passes the current location's `timezone` through to every card's `data`.

## 3. Location control UI
- Add a location control area to `index.html` (plain HTML, not a Web Component — this is a one-off piece of UI, not a repeated element, so per `specs/tech-stack.md`'s convention it doesn't need one): a status line showing the current location's label, a "Use my location" button with a permanently visible explanatory hint beside it, and a search input + submit. Always visible, not toggled — this doubles as the "change location" affordance with no separate button needed.
- Permission UX: the explanatory hint is already on screen before the user clicks "Use my location", so clicking it directly calls `resolveViaGeolocation()`, which is what triggers the native browser permission dialog.
- Search UX: submitting the search box calls `searchLocations(query)` and renders a disambiguation list (name, region, country) of the results; picking one resolves the location. Empty/no-match results and network failures show an inline message without disturbing the currently-displayed location.

## 4. Wiring it together in `js/app.js`
- On load: check `getCachedLocation()`; if present, use it; otherwise use `DEFAULT_LOCATION` (London) and show the location control inviting the user to set a real one.
- Whenever a location is newly resolved (geolocation success or a search result picked): `setCachedLocation()`, re-run `getLightTimes()` for the new coordinates/date, re-render all six cards with the new data and timezone, and update the visible location label.
- Handle all the error paths from `requirements.md` (denied/unsupported/timeout geolocation; failed/empty search) with inline, non-blocking messaging.

## 5. Service worker
- Add `js/location.js` to `sw.js`'s `APP_SHELL` array and bump `CACHE_NAME` (v3) so the update takes effect on existing installs.

## 6. Verify
- Confirm the Open-Meteo Geocoding API is in fact free/keyless/CORS-enabled as `specs/tech-stack.md` assumes, with a real request during implementation (not just trusting the spec).
- Test geolocation success (override coordinates via a real or simulated browser geolocation position, not just visual inspection) and confirm the displayed times/timezone update correctly and match the new coordinates.
- Test manual search for a location in a distinctly different timezone from the tester's own (e.g. Tokyo) and confirm displayed times use Tokyo's timezone, not the browser's local one — this is the specific bug this phase exists to fix.
- Test the ambiguous-search-term case (e.g. "Paris") and confirm a disambiguation list appears rather than a silent first-match pick.
- Test permission denial and confirm a sensible fallback message appears rather than a broken/blank state.
- Confirm the resolved location persists in `localStorage` and is used automatically on a subsequent reload, without re-prompting.
- Confirm no console errors, and that the location control remains usable and accessible (keyboard-operable, labelled form controls) at mobile widths.
