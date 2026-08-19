# Requirements — Phase 6: Offline support

## Scope

Per `specs/roadmap.md` Phase 6: service worker caching strategy for app shell and assets, an offline fallback page, and offline behaviour for cached location + client-side sun calculation (weather marked stale/unavailable when offline).

Much of this already exists implicitly — SunCalc computation is client-side (no network needed once a location is known), the app shell has been cached since Phase 0, and location persists in `localStorage` since Phase 2 — but none of it has been explicitly verified offline, and two concrete pieces from `specs/tech-stack.md`'s "Offline behaviour" section are still missing: weather staleness handling, and the offline fallback page itself.

## Context (from parent specs)

- `specs/tech-stack.md` → "Offline behaviour": "Offline, with a cached location: the app computes and shows accurate sun/golden/blue hour times... no network required." / "Weather offline: ...show the last successfully fetched forecast if cached, clearly labelled as potentially stale, or an explicit 'weather unavailable offline' state." / "No cached location and offline: show the offline fallback page with guidance to reconnect."
- `specs/tech-stack.md` → PWA requirements (non-negotiable, set since Phase 0): "Default offline fallback page (a lightweight 404-equivalent) when a requested resource isn't cached and there's no connection." Phase 0's `plan.md` explicitly deferred this: "No offline fallback page routing logic yet beyond serving the cached shell (full offline handling is Phase 6, not this phase)."
- `specs/2026-08-19-project-scaffold/plan.md` — the service worker's cache-first `fetch` handler exists but has no fallback for a failed, uncached request.

## Decisions made for this phase

- **No-location-cached + offline:** rather than showing a dead-end "reconnect" state with no data, the app keeps showing whatever location context is available — the cached location if one exists, or `DEFAULT_LOCATION` (London) if not — with a clear offline note and guidance that reconnecting is needed to change location or refresh weather. Never blanks out the light-time cards just because the connection is down.
- **Weather staleness:** the last successful forecast is cached (in `localStorage`, alongside its location and a timestamp). When a fresh fetch fails, the app falls back to this cached forecast *if it's for a location close enough to the current one* (avoids showing another city's stale weather under the current location's label), and marks it as stale so the UI can say so. If there's no usable cached forecast, weather is simply omitted, same as today's failure behaviour.
- **Persistent offline indicator:** a small, unobtrusive banner appears whenever `navigator.onLine` is false (checked on load and kept in sync via the `online`/`offline` events) and disappears the moment connectivity returns. This is the single mechanism serving both the "no cached location" and "weather stale" cases from `specs/tech-stack.md` — one clear signal of *why* things might look stale or location-changing actions might fail, rather than separate messages scattered across the page.
- **Offline fallback page:** a minimal static `offline.html`, precached like every other app-shell asset, served by the service worker when a navigation request fails while offline and isn't already in cache (the realistic trigger: a stray/uncached URL under this origin visited while offline — the app's own `index.html` is always precached after a first successful visit, so this mostly protects against edge cases, not normal use).

## Out of scope for this phase

- Any change to the sun/golden/blue hour calculation itself — already fully offline-capable since Phase 1, this phase only verifies and surfaces that.
- Offline support for search (`searchLocations`) or fresh geolocation resolution — both inherently require a network round trip (Nominatim/Open-Meteo geocoding); offline, they fail with their existing Phase 2 error messages, which is correct behaviour, not a gap to fix.
- Background sync, push notifications, or any other Phase 7 concern.
- A full "queue actions for when back online" mechanism — out of scope; this phase is about graceful degradation and clear communication, not deferred execution.
