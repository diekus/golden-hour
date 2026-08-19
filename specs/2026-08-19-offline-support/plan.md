# Plan — Phase 6: Offline support

## 1. Offline fallback page
- Add `offline.html` at the repo root: minimal static markup consistent with the app's existing look (reuse `css/styles.css`), a short "You're offline and this page isn't available. Reconnect and try again." message, and a link back to `/`.
- Add `/offline.html` to `sw.js`'s `APP_SHELL` so it's precached and actually available when truly offline.
- Update the service worker's `fetch` handler: for navigation requests (`event.request.mode === 'navigate'`) that miss the cache *and* fail on the network (offline), respond with the cached `offline.html` instead of letting the request fail outright. Non-navigation requests (assets) keep today's cache-first-then-network behaviour unchanged — a failed, uncached asset request isn't this phase's concern.

## 2. Connectivity tracking and the offline indicator
- In `js/app.js`, track connectivity via `navigator.onLine`, kept in sync with the `online`/`offline` window events (checked once on load, not just reactively).
- Add a small persistent banner element to `index.html` (hidden by default), shown whenever offline and hidden the moment the `online` event fires. Single source of "you're offline" messaging — covers both the no-real-location case and the weather-staleness case from `requirements.md`, rather than duplicating the message in multiple places.

## 3. Weather caching for offline staleness
- Extend `js/weather.js` (or a small sibling) with `getCachedForecast()` / `setCachedForecast(location, hourly)`, `localStorage`-backed, storing the hourly data, the location it was fetched for, and a timestamp.
- On a successful `fetchForecast`, cache the result (in `js/app.js`'s `renderWeather`, right after a successful fetch).
- On a failed fetch, before giving up: check the cached forecast. If its stored location is within a small tolerance (e.g. ~0.05° lat/lng, roughly 5km — close enough to be "the same place," not coincidentally reusing a totally different city's old data) of the *current* location, use it and mark the result stale; otherwise treat it the same as "no data available" (today's behaviour).
- Surface staleness in the UI: the weather line on the 4 cards and the Phase 5 warning message both need a way to say "may be outdated" when working from cached-not-fresh data, without a full redesign — a short suffix/qualifier is enough.

## 4. Verify actual offline behaviour, not just the code
- Using Chrome DevTools Protocol network emulation (`Network.emulateNetworkConditions` with `offline: true`, or `Network.setBlockedURLs` for a more targeted cut), not just reading the code:
  - Load the app once online (to populate the cache — SW app shell, cached location, cached forecast), then go offline and reload: confirm the app shell loads from cache, the cached location's sun times compute correctly (proving the client-side calculation genuinely needs no network), and cached-but-stale weather appears labelled as such.
  - Simulate a location that's never been cached, offline from the very first load in that state: confirm `DEFAULT_LOCATION` (London) still renders correctly with the offline indicator visible.
  - Confirm the offline indicator appears/disappears correctly as connectivity is toggled.
  - Visit a deliberately uncached URL under the same origin while offline: confirm `offline.html` is served instead of a raw network error.
  - Confirm `useMyLocationBtn`/search still fail with their existing Phase 2 error messages while offline — not this phase's job to change, just confirm it isn't broken by anything here.

## 5. Service worker version
- Bump `CACHE_NAME` (new file added to `APP_SHELL`, `fetch` handler logic changed).

## 6. Verify
- No console errors in any of the offline scenarios above.
- No regression to the online path — everything from Phases 1–5 still works exactly as before when connectivity is present.
- Mobile-width check of the offline indicator and the "stale" weather labelling.
