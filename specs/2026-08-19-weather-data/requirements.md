# Requirements — Phase 4: Weather data

## Scope

Per `specs/roadmap.md` Phase 4: integrate the Open-Meteo Forecast API to pull cloud cover and precipitation data for the golden/blue hour windows. This phase shows the raw numbers only — turning them into a plain-language warning is explicitly Phase 5's job, not this one.

## Context (from parent specs)

- `specs/tech-stack.md` → "Weather": Open-Meteo Forecast API (free, no key, CORS-enabled) is the specified source. Re-confirmed with a real request during this phase's planning, not just assumed from the spec.
- `specs/mission.md` goal 3, "Actionable weather context" — this phase is the data half of that goal.
- Every prior phase's timezone rigor extends here: **Open-Meteo's hourly forecast times are naive local-time strings with no UTC suffix, matching whatever `timezone` parameter is requested** — they are not self-describing. Requesting `timezone=UTC` and appending `Z` before constructing `Date` objects is required; parsing the returned strings directly with `new Date(...)` would have the browser silently assume its *own* local timezone, misaligning weather hours against the light-time windows for anyone not in that exact zone. Confirmed via a real request: `timezone=UTC` returns `"timezone":"GMT"` and UTC-based hour strings.

## Decisions made for this phase

- **Placement:** cloud cover % and precipitation probability % are added to all 4 golden/blue-hour cards (`light-window-card` for golden hour morning/evening, blue hour morning/evening), for all of today's windows regardless of whether they've already passed — consistent, full-day context rather than a shifting subset.
- **Sampling:** Open-Meteo's forecast is hourly; a golden/blue hour window (e.g. 05:29–06:38) is summarised by **averaging** `cloud_cover` and `precipitation_probability` across every forecast hour whose `[hour, hour+1)` span overlaps the window's `[start, end)`. A window contained within a single forecast hour just uses that hour's values.
- **Refresh:** fetched once on page load and again on every location change (geolocation/search) — not on a periodic timer. Forecasts don't change fast enough to justify re-polling within a session, unlike the 30-second live countdown.
- **Metrics shown:** cloud cover % and precipitation probability %, per the roadmap's explicit wording. No temperature, wind, UV, etc. — not asked for, not needed for the "will this ruin golden/blue hour" question Phase 5 will answer.
- **Presentation:** plain text (e.g. "Cloud 62% · Rain 15%"), not emoji/icons — consistent with the rest of the app's text-first treatment of secondary data (azimuth/elevation readings are plain text too), and avoids unpredictable screen-reader announcement of icons.
- **Forecast range:** request 2 days (`forecast_days=2`) even though only today's windows are shown, so the evening window's overlapping hours are always covered even at extreme longitudes/dates where local evening can land in the next UTC calendar day.

## Error handling

If the forecast fetch fails (network error, API unavailable) or a window falls outside the fetched forecast range, the affected card(s) simply omit the weather line — no error message, no broken layout, no blocking of the rest of the app. Consistent with Phase 2's precedent for search failures: a failed enhancement must never take down what already works.

## Out of scope for this phase

- Turning cloud cover / precipitation into a plain-language warning (Phase 5).
- Weather on the sunrise/sunset cards or the Phase 3 "Right now" diagram/summary — scoped strictly to the 4 golden/blue-hour cards per the placement decision above.
- Multi-day forecasts or forecasts beyond today (today's windows only, matching the existing cards).
- Notifications, offline handling (Phases 6–7) — though see `plan.md` for how the service worker treats the new module file vs. the (never-cached) live forecast data itself.
