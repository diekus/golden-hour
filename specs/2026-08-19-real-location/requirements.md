# Requirements — Phase 2: Real location

## Scope

Per `specs/roadmap.md` Phase 2: Geolocation API integration with a permission prompt, plus manual location search fallback (Open-Meteo Geocoding API) for denied/unsupported cases, with the resolved location cached locally.

## Context (from parent specs)

- `specs/tech-stack.md` → "Location": browser Geolocation API is primary, requested with a clear permission prompt explaining why it's needed; manual search via the Open-Meteo Geocoding API (free, no key, CORS-enabled) is the fallback; the last resolved location (coordinates + label) is cached in `localStorage`.
- `specs/2026-08-19-light-calculation/requirements.md` → "Known, accepted limitation": Phase 1 explicitly deferred correct timezone handling to this phase, on the assumption that "the geolocation-derived location and the device's timezone are the same place." That assumption holds for GPS geolocation, but not for manual search of a distant city — this phase must actually resolve it, not just for the GPS case.
- `specs/mission.md` goal 4, "field-ready reliability" and goal 6 "no friction" — location resolution shouldn't block or complicate the core "check the light right now" use case.

## Decisions made for this phase

- **Timezone handling:** every resolved location carries an explicit IANA `timezone` string, used as the `timeZone` option to `Intl.DateTimeFormat` wherever times are displayed — replacing Phase 1's implicit browser-local formatting.
  - GPS geolocation (browser Geolocation API) returns only latitude/longitude, no timezone — so the device's own timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) is used, which is correct since GPS location and device are physically co-located.
  - Manual search results come from the Open-Meteo Geocoding API, whose response includes a `timezone` field per result — that value is used directly, so a search for a distant city displays that city's own wall-clock times, not the device's.
- **Manual search UX:** query Open-Meteo Geocoding API, show a disambiguation list of the top results (name, admin region, country) rather than silently picking the first/best match — avoids silently showing the wrong "Paris." User picks one to resolve the location.
- **Permission UX:** a short explanatory hint ("Only used to show accurate times, right on your device.") sits permanently next to the "Use my location" button, so it's on screen *before* the user ever clicks — the native browser permission dialog only fires on that explicit click, never automatically on page load. Implemented as a persistent inline hint rather than a separate modal/step: it satisfies "explanation before the native prompt" without an extra click, and is simpler to build and reason about.
- **Initial/default state:** Phase 1's hardcoded London view remains the first thing shown on a fresh load (no cached location yet) — the location control area (current label, "Use my location", and a search box) is always visible alongside it, not toggled in/out, so the page is never empty or broken-looking while location resolution is pending.
- **Caching:** the resolved location — `{ lat, lng, label, timezone, source }` (`source`: `'geolocation'` or `'search'`) — is stored in `localStorage`. On subsequent loads, a cached location is used immediately instead of defaulting to London, with no re-prompt for permission and no re-search needed.
- **Changing location:** since the "Use my location" button and search box are always visible (not hidden once a location is set), there's no separate "Change location" affordance needed — the same controls that set the first location are always available to set a different one. Simpler than a dedicated toggle button, same capability.

## Error handling

- Geolocation permission denied, unsupported, or a `getCurrentPosition` error (timeout, position unavailable): fall back to showing the manual search UI with a short inline explanation, without breaking the rest of the page.
- Geocoding search network/API failure: show an inline error message near the search box; the currently-displayed location (cached, or the London default) stays visible and functional — a failed search must never blank the page.

## Out of scope for this phase

- Live "is it golden/blue hour right now" state indicator and countdowns (Phase 3).
- Weather data and warnings (Phases 4–5).
- Notifications (Phase 7).
- Full offline handling of the "no cached location, no network" case (Phase 6) — this phase's `localStorage` caching is the mechanism Phase 6 will build on, but robustly handling the fully-offline first-load case is still Phase 6's job.
- Final visual/animation polish (Phase 11) — the location control UI should be usable and on-brand-ish, consistent with Phase 1's existing placeholder styling, not final.
