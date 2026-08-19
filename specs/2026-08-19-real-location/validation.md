# Validation — Phase 2: Real location

This phase is ready to merge when all of the following hold.

## Location resolution
- [x] `js/location.js` exists with `DEFAULT_LOCATION`, `getCachedLocation`/`setCachedLocation`/`clearCachedLocation`, `resolveViaGeolocation`, and `searchLocations`.
- [x] Geolocation success produces a location object with the device's own IANA timezone attached (GPS coordinates carry no timezone of their own).
- [x] Geolocation failure paths (denied, unavailable, timeout, unsupported) are distinguishable, not collapsed into one generic error.
- [x] `searchLocations` calls the real Open-Meteo Geocoding API and returns multiple candidate results (name, region, country, lat, lng, timezone) for an ambiguous query like "Paris" — confirmed against a real network request, not assumed from the spec.

## Timezone correctness (the specific bug this phase exists to fix)
- [x] Searching a location in a distinctly different timezone from the tester's own (e.g. Tokyo, if testing from a non-Asia/Tokyo timezone) displays times in *that location's* timezone, not the browser's local one.
- [x] GPS-based geolocation continues to display times correctly (device timezone), matching Phase 1's behaviour for the co-located case.
- [x] `light-window-card` formats every displayed time using the current location's `timezone`, not a fixed/implicit one.

## UI and UX
- [x] On a fresh load (no cached location), Phase 1's London view is shown immediately, with the location control (label, "Use my location", search) always visible alongside it — the page is never empty or broken-looking.
- [x] The "Only used to show accurate times..." hint is visible next to "Use my location" before it's ever clicked, so the explanation precedes the native browser permission dialog.
- [x] Searching an ambiguous term shows a disambiguation list; picking a result resolves and displays that location's data.
- [x] A failed/empty search shows an inline message without disturbing the currently-displayed location's data.
- [x] A denied/unsupported geolocation attempt shows a sensible fallback message, not a broken or blank state.
- [x] Because the location controls are always visible (not hidden once a location is set), the user can set a different location at any time with no separate "change location" affordance needed.

## Persistence
- [x] A resolved location (geolocation or search) is cached in `localStorage` and used automatically on the next reload, with no re-prompt and no re-search required.

## Integration
- [x] No console errors across the geolocation-success, geolocation-denied, search, and cached-reload flows.
- [x] `sw.js`'s `APP_SHELL` includes `js/location.js`, and `CACHE_NAME` is bumped (v3).
- [x] No framework code introduced; the location control is plain HTML/CSS/JS, not a Web Component (per `plan.md`'s reasoning — it's a one-off UI piece, not a repeated element).
- [x] No live-state indicator, weather, or notification logic added — this phase is location resolution and display only.

## Accessibility & responsiveness
- [x] The location control's form controls are properly labelled (`<label for>` on the search input, real `<button>` elements throughout). Verified: labelling and semantics by inspection; keyboard operability follows from using native `<button>`/`<input>`/`<form>` elements with no custom tabindex/focus handling, but wasn't independently exercised with literal Tab/Enter key simulation in this pass — programmatic `.click()`/`submit` events were used instead, which don't prove focus order or visible focus rings.
- [x] The location control remains usable at a true 375px mobile viewport (verified via a real screenshot, not just responsive CSS review) — search box and button reflow without overflow.

## Known, accepted nuance
- Displaying a location whose local day doesn't align with the viewing device's calendar day (e.g. viewing Tokyo's sun times from a browser in Europe/London) can make sunset's HH:MM read numerically earlier than sunrise's, since both are correct instants but land on different calendar dates once converted to the viewing timezone. Confirmed during testing (Tokyo coordinates via geolocation, viewed from Europe/London: sunrise 21:03, sunset 10:26 — both correct, just crossing a day boundary). The underlying `Date` objects are correct; this phase doesn't add a date label to disambiguate, which would be a reasonable small polish item for a later phase but isn't a correctness defect.

## Merge
- [ ] Branch `2026-08-19-real-location` merges cleanly into `main` with no conflicts — pending your review; not yet merged.
