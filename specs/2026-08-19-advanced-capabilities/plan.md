# Plan — Phase 9: Advanced capabilities (Web Share)

## 1. Location-from-URL parsing

- `js/location.js`: add `locationFromSearchParams(search)` — pure function, takes a query string (`window.location.search`), returns a location object (`{ lat, lng, label, timezone, source: 'shared-link' }`) or `null`.
  - Requires both `lat` (finite, -90..90) and `lng` (finite, -180..180); anything else → `null` (no partial/broken state).
  - `tz`: validated via a guarded `new Intl.DateTimeFormat(undefined, { timeZone: tz })` construction (throws on an invalid IANA zone); falls back to the device's own timezone (mirrors `location.js`'s existing `deviceTimezone()` helper) if missing/invalid — never left undefined.
  - `label`: falls back to `'Shared location'` if missing. No HTML-escaping needed here — every place `location.label` is rendered already uses `textContent`, not `innerHTML` (confirmed in `renderLocationLabel()`), so this is safe as plain data.
- `js/app.js`: near the top-level `currentLocation` initialisation, call `locationFromSearchParams(window.location.search)` before falling back to `getCachedLocation() || DEFAULT_LOCATION`. If a shared location was found: cache it via the existing `setCachedLocation()`, and strip the query string with `window.history.replaceState(null, '', window.location.pathname)` so a later plain reload doesn't keep re-reading stale/already-consumed params.
- Update the existing `els.locationDetails.open = !cachedLocationAtLoad;` line so the location card also stays collapsed on a shared-link load (`!sharedLocation && !cachedLocationAtLoad`) — a resolved location is a resolved location, regardless of source.
- No change to `setLocation()` itself or to the geolocation/search flows — this only affects what `currentLocation` initialises to, before the existing render pipeline runs.

## 2. Share payload construction

- New file `js/share.js`:
  - `buildShareUrl(location)` — constructs the app's own URL (`window.location.origin` + `window.location.pathname`) with `lat`, `lng`, `tz`, `label` query params set from the given location object.
  - `buildShareText(times, timezone)` — pure formatting function over a `getLightTimes()` result: today's golden hour (morning + evening) and blue hour (morning + evening) start–end times, each formatted in the given timezone, human-readable, no weather content (per requirements.md decision 3).
  - `buildSharePayload(location, times)` — combines the above into `{ title: 'Golden Hour — ' + location.label, text: buildShareText(times, location.timezone), url: buildShareUrl(location) }`.
  - Kept as a standalone module (no DOM access beyond `window.location` for the URL base) so `buildShareText`/`buildShareUrl` can be tested directly, matching the pattern of `weather.js`/`location.js`.

## 3. UI: share control

- `index.html`: add a `<button id="share-toggle" type="button" hidden>Share today's times</button>` next to `#notify-toggle` inside `#transition-section`.
- `css/styles.css`: reuse the existing button styling (same family as `.notify-toggle`); no new visual language needed since this is a plain, non-stateful action button (unlike the notify toggle, it has no on/off state to reflect).
- `js/app.js`:
  - On load: hide the button unless `'share' in navigator`.
  - Click handler: build the payload via `buildSharePayload(currentLocation, renderLightTimes()'s already-available times — or recompute fresh via getLightTimes if the cached value from the last render isn't retained)`, then `await navigator.share(payload)` wrapped in try/catch. On `AbortError` (user dismissed the share sheet), do nothing. Any other error: leave silent too, consistent with this being a best-effort convenience feature — no error UI needed for a native OS-level share sheet failure, which the user would already see reflected in the OS UI itself.

## 4. Testing

- `locationFromSearchParams`: direct unit-style testing (standalone Node script, no build step, matches the pattern used for `getNextGoldenHourStart` in Phase 7) — valid lat/lng/tz/label, missing tz (falls back to device timezone), invalid tz string (falls back), missing lat or lng (returns null), out-of-range lat/lng (returns null).
- `buildShareUrl`/`buildShareText`/`buildSharePayload`: direct testing for correct query param encoding and correct time formatting/content (no weather substring present).
- Browser (CDP) tests:
  - Share button hidden when `navigator.share` is deleted before load; visible otherwise.
  - Clicking the button with a mocked `navigator.share` (CDP can inject a stub before navigation) captures the exact `{ title, text, url }` passed, and confirms the `url`'s query params round-trip correctly through `locationFromSearchParams`.
  - Simulate `navigator.share()` rejecting with `AbortError` — confirm no console error/exception surfaces.
  - Load the app directly with `?lat=...&lng=...&tz=...&label=...` in the URL and confirm: the location label/date render for that location (not the default/cached one), the query string is stripped from the visible URL after load, and the location is now cached (a subsequent plain reload keeps showing it).
  - Load with a malformed query string (e.g. `?lat=not-a-number`) and confirm the app falls back to the normal cached/default location with no crash.
- Regression: confirm existing location search/geolocation flows, notify toggle, and diagram/cards are unaffected.
