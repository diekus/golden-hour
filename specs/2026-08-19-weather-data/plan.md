# Plan — Phase 4: Weather data

## 1. Weather-fetching module
- Add `js/weather.js`, exporting `fetchForecast(lat, lng)`:
  - Calls Open-Meteo's Forecast API (`https://api.open-meteo.com/v1/forecast`) with `hourly=cloud_cover,precipitation_probability`, `timezone=UTC`, `forecast_days=2`.
  - Parses `hourly.time`/`hourly.cloud_cover`/`hourly.precipitation_probability` into an array of `{ time: Date, cloudCover: number, precipProbability: number }`, appending `Z` to each naive time string before constructing the `Date` (see `requirements.md`'s timezone note — this is the one detail that will silently produce wrong-looking-but-plausible data if skipped, so it needs a deliberate test, not just a code review glance).
  - Throws on a non-OK response or network failure; the caller (`app.js`) is responsible for catching it and degrading gracefully, not this module.

## 2. Window-averaging helper
- In the same module (or a small sibling), `averageForWindow(hourlyData, windowStart, windowEnd)`:
  - Filters `hourlyData` to entries where `[entry.time, entry.time + 1h)` overlaps `[windowStart, windowEnd)`.
  - Returns `{ cloudCover, precipProbability }` (each the mean of the overlapping entries, rounded to the nearest whole percent) or `null` if no overlapping entries exist (window outside the fetched range, or fetch failed upstream).

## 3. Wire into `js/app.js`
- After `renderLightTimes()` computes today's `getLightTimes()` result, call `fetchForecast(currentLocation.lat, currentLocation.lng)` once.
- For each of the 4 golden/blue-hour windows, call `averageForWindow(...)` with that window's actual start/end instants (not the padded ones from Phase 3's transition window — this is the real window from `light-times.js`), and attach the result to that card's `data` as new `weather: { cloudCover, precipProbability } | null` field.
- On fetch failure (caught), pass `weather: null` to every card — same code path as "window outside range," so there's only one "no weather" rendering case to get right, not two.
- Triggered alongside `renderLightTimes()`: on initial load and inside `setLocation()`. Not part of the 30-second `renderTransition()` cycle (per the "once per location load" refresh decision).

## 4. Update `js/components/light-window-card.js`
- Accept the new `weather` field on `data`.
- Render a small text line (e.g. "Cloud 62% · Rain 15%") below the existing duration line when `weather` is present; render nothing extra when it's `null`.
- Only the 4 golden/blue-hour card instances receive a `weather` value from `app.js` — the sunrise/sunset "point" cards simply never get one, so no variant-branching is needed inside the component itself beyond the existing "is this field present" check.

## 5. Service worker
- Add `js/weather.js` to `sw.js`'s `APP_SHELL` (the module file itself is static and cacheable like every other script), bump `CACHE_NAME`.
- The live forecast API responses themselves are **not** cached — they're not in `APP_SHELL`, and the service worker's existing cache-first `fetch` handler only serves from cache what's already there, so forecast requests fall through to the network untouched. No new service worker logic needed.

## 6. Verify
- Cross-check the averaging logic with real numbers: fetch a real forecast, manually compute the expected average for a known window spanning two forecast hours, compare against `averageForWindow`'s output.
- Confirm the UTC-parsing fix actually matters: deliberately compare output with and without the `Z`-appending fix (e.g. temporarily reverting it) to see the values shift when tested from a non-UTC timezone context — proving the fix does something, not just that the code runs without erroring.
- Visually confirm all 4 golden/blue-hour cards show plausible weather text, and that sunrise/sunset cards remain unchanged.
- Simulate a fetch failure (e.g. block the request) and confirm the cards degrade to their Phase 3 appearance with no error, no broken layout, no console error.
- Confirm no console errors in the success path either, and check mobile-width rendering with the new text line added.
