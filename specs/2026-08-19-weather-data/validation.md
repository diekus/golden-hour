# Validation — Phase 4: Weather data

This phase is ready to merge when all of the following hold.

## Fetching and correctness
- [x] `fetchForecast(lat, lng)` in `js/weather.js` calls the real Open-Meteo Forecast API with `hourly=cloud_cover,precipitation_probability`, `timezone=UTC`, `forecast_days=2` — confirmed against an actual network response, not assumed.
- [x] Hourly timestamps are parsed as UTC instants (naive time string + appended `Z`), not accidentally interpreted in the browser's own timezone — demonstrated concretely: naively parsing the first returned hour ("2026-08-19T00:00") in this test browser's Europe/London (BST, UTC+1) timezone would have produced `2026-08-18T23:00:00.000Z` — a full hour off *and shifted onto the wrong calendar day* — versus the correct `2026-08-19T00:00:00.000Z` with the fix. Not a hypothetical; a real, reproducible divergence.
- [x] `averageForWindow` correctly averages `cloud_cover`/`precipitation_probability` across all forecast hours overlapping a given window: for London's golden-hour-morning window (05:29–06:38, overlapping the 05:00 and 06:00 forecast hours), manually computed expected `{cloudCover: 100, precipProbability: 85}` matched the function's actual output exactly.
- [x] A window with no overlapping forecast data (out of range) returns `null`, not a crash or `NaN`.

## Display
- [x] All 4 golden/blue-hour cards (morning/evening × golden/blue) show cloud cover % and precipitation probability % as plain text, for all of today's windows regardless of past/future.
- [x] Sunrise/sunset cards are unchanged — no weather line added to them.
- [x] Weather text renders as plain text (no emoji/icons), consistent with the rest of the app.

## Error handling
- [x] A simulated forecast fetch failure (network blocked) leaves all 4 cards rendering exactly as they did before this phase — no error message, no broken layout, no console error.
- [x] No console errors in the success path.

## Integration
- [x] Weather is fetched once on load and once per location change — not on the existing 30-second transition-refresh interval.
- [x] `sw.js`'s `APP_SHELL` includes `js/weather.js`, and `CACHE_NAME` is bumped.
- [x] Live forecast API responses are not precached or otherwise persisted by the service worker — confirmed by inspecting Cache Storage contents after a load, not just by reading the code.
- [x] No framework code introduced.
- [x] No plain-language warning logic added — this phase shows raw numbers only, per `requirements.md`'s scope boundary with Phase 5.

## Responsiveness
- [x] The new weather line doesn't break card layout at a true mobile viewport width.

## Merge
- [ ] Branch `2026-08-19-weather-data` merges cleanly into `main` (now that Phases 2–3 are merged) with no conflicts — pending your review; not yet merged.
