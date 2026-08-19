# Validation — Phase 6: Offline support

This phase is ready to merge when all of the following hold.

## A note on verification method
`Network.emulateNetworkConditions({offline: true})` reliably flips `navigator.onLine` and fires real `online`/`offline` events in this environment, but does **not** actually block `fetch()` calls (confirmed directly: a fetch to an external API still returned 200 after enabling it). So two different, genuinely reliable techniques were used instead: `Network.setBlockedURLs` targeting specific domains (already proven in Phase 4/5 testing) for weather-fetch failures, and actually stopping the local dev server for a true, unfakeable connection failure when testing cached-shell loading and the offline fallback page. `emulateNetworkConditions` was still used for the indicator, since that part only needs `navigator.onLine` to change, not real network blocking.

## Core offline capability (mostly pre-existing, verified fresh here)
- [x] With the local server stopped entirely (genuine connection failure, not emulation) and the app shell + a location already cached from a prior visit, the app still loads and shows correct data — including a direct page-level `fetch()` for a cached resource, transparently served from Cache Storage by the service worker.
- [x] With no location ever cached, `DEFAULT_LOCATION` (London) renders correctly — exercised throughout testing as the default state; never blank or broken.

## Offline indicator
- [x] Appears when `navigator.onLine` genuinely becomes `false` (via `Network.emulateNetworkConditions`) — confirmed the browser fires a real `offline` event on its own when this happens, and the indicator reacted to it before a diagnostic listener even got a chance to check.
- [x] Disappears immediately when connectivity returns — confirmed across a full false→true→false cycle, not just once.

## Weather staleness
- [x] A successful forecast fetch is cached (`localStorage`) alongside its location.
- [x] With the forecast API blocked and a fresh fetch failing, the cached forecast appears labelled "(may be outdated)" on all 4 cards and in the Phase 5 warning — verified with real rendered text, e.g. `"Cloud 100% · Rain 96% (may be outdated)"` and `"Partly cloudy — could go either way. (may be outdated)"`.
- [x] Switching to a genuinely distant location (London → Tokyo) while the forecast API stays blocked correctly returns `weather: null` rather than incorrectly reusing London's cached forecast under Tokyo's label — confirmed with a concrete before/after switch, not just by reading the tolerance check.
- [x] No cached forecast + offline → weather simply omitted, no crash.

## Offline fallback page
- [x] With the server genuinely stopped, navigating to a path that was never part of `APP_SHELL` served the real `offline.html` content ("YOU'RE OFFLINE" / "This page isn't available offline. Reconnect and try again." / a working link back to `/`), confirmed via rendered DOM text and a screenshot — not just by reading the `fetch` handler.
- [x] Non-navigation asset requests are unaffected — the `fetch` handler's cache-first path for scripts/styles/images is unchanged from before this phase.

## Regression check
- [x] Search still shows "Search failed. Please try again." when its API is genuinely blocked; "Use my location" still shows "Location access was denied..." on a denied permission — both exercised directly, not assumed unchanged from reading the diff.
- [x] Zero console errors/exceptions across every scenario tested in this phase.

## Integration
- [x] `sw.js`'s `APP_SHELL` includes `offline.html` (confirmed present in Cache Storage after a real load), and `CACHE_NAME` is bumped.
- [x] No framework code introduced.

## Responsiveness
- [x] The offline indicator and "(may be outdated)" weather labelling both confirmed at a true 375px mobile viewport via screenshot — clean wrapping, no overflow.

## Merge
- [ ] Branch `2026-08-19-offline-support` merges cleanly into `main` with no conflicts — pending your review; not yet merged.
