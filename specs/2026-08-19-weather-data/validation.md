# Validation — Phase 4: Weather data

This phase is ready to merge when all of the following hold.

## Fetching and correctness
- [ ] `fetchForecast(lat, lng)` in `js/weather.js` calls the real Open-Meteo Forecast API with `hourly=cloud_cover,precipitation_probability`, `timezone=UTC`, `forecast_days=2` — confirmed against an actual network response, not assumed.
- [ ] Hourly timestamps are parsed as UTC instants (naive time string + appended `Z`), not accidentally interpreted in the browser's own timezone — verified by demonstrating the values actually change if the `Z`-append is removed, not just that the code runs.
- [ ] `averageForWindow` correctly averages `cloud_cover`/`precipitation_probability` across all forecast hours overlapping a given window, cross-checked against a manually-computed expected value for a real window spanning two forecast hours.
- [ ] A window with no overlapping forecast data (out of range) returns `null`, not a crash or `NaN`.

## Display
- [ ] All 4 golden/blue-hour cards (morning/evening × golden/blue) show cloud cover % and precipitation probability % as plain text, for all of today's windows regardless of past/future.
- [ ] Sunrise/sunset cards are unchanged — no weather line added to them.
- [ ] Weather text renders as plain text (no emoji/icons), consistent with the rest of the app.

## Error handling
- [ ] A simulated forecast fetch failure (network blocked) leaves all 4 cards rendering exactly as they did before this phase — no error message, no broken layout, no console error.
- [ ] No console errors in the success path.

## Integration
- [ ] Weather is fetched once on load and once per location change — not on the existing 30-second transition-refresh interval.
- [ ] `sw.js`'s `APP_SHELL` includes `js/weather.js`, and `CACHE_NAME` is bumped.
- [ ] Live forecast API responses are not precached or otherwise persisted by the service worker — confirmed by inspecting Cache Storage contents after a load, not just by reading the code.
- [ ] No framework code introduced.
- [ ] No plain-language warning logic added — this phase shows raw numbers only, per `requirements.md`'s scope boundary with Phase 5.

## Responsiveness
- [ ] The new weather line doesn't break card layout at a true mobile viewport width.

## Merge
- [ ] Branch `2026-08-19-weather-data` merges cleanly into `2026-08-19-live-state-indicator` (or `main`, once earlier phases are merged) with no conflicts — pending your review; not yet merged.
