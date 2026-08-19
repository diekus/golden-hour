# Requirements — Phase 5: Weather warning

## Scope

Per `specs/roadmap.md` Phase 5: turn Phase 4's raw cloud cover / precipitation data into a plain-language warning (e.g. "likely washed-out golden hour due to cloud/rain"), shown alongside the Phase 3 light-state indicator (the "Right now" diagram/summary at the top of the page) — not on the per-window cards, which already show the raw numbers from Phase 4.

## Context (from parent specs)

- `specs/mission.md` goal 3, "Actionable weather context": "flag when conditions are likely to ruin them" — this phase is that flag.
- `specs/2026-08-19-weather-data/requirements.md` explicitly deferred this: "No warning language yet — Phase 5's job." This phase is that job, and only that job — it doesn't refetch or reshape weather data, just interprets what Phase 4 already computed.
- `specs/roadmap.md` Phase 5 wording ties the warning specifically to "the light-state indicator," i.e. Phase 3's diagram/summary, which tracks one specific segment (golden or blue, morning or evening) at a time — not the full day's 4 windows at once.

## Decisions made for this phase

- **Which window the warning describes:** the same specific segment the Phase 3 diagram/summary is currently about — whichever of the 4 golden/blue-hour windows corresponds to `transitionWindow.currentKind` (if we're inside one right now) or `transitionWindow.nextTransition.toKind` (if we're waiting for the next one), combined with `transitionWindow.direction` to pick morning vs. evening. This reuses the weather Phase 4 already fetched for that exact card — no new API call, no averaging across two different windows.
- **Both positive and negative status shown:** the warning area always shows a status when weather data is available — a positive "clear skies expected" message when conditions are favourable, not just a warning when they're bad. Silence isn't a valid state here; per `specs/mission.md`'s "instant clarity," an absent message could read as "the app doesn't know," not "conditions are fine."
- **Three tiers**, based on cloud cover and precipitation probability together:
  - **Good:** cloud ≤ 40% and precipitation ≤ 20%. e.g. "Clear skies expected."
  - **Caution:** cloud 41–80% or precipitation 21–50% (and not already in the warning tier). e.g. "Partly cloudy — could go either way." / "Some rain risk — could go either way."
  - **Warning:** cloud > 80% or precipitation > 50%. e.g. "Likely washed out — heavy cloud expected." / "Likely washed out — rain expected." / "Likely washed out — heavy cloud and rain expected." (combining both clauses when both cross the warning threshold).
- **No data state:** if weather hasn't loaded yet (fetch still in flight, or failed per Phase 4's graceful-degradation path), or the currently-relevant window can't be determined (the rare trailing-padding edge case where `nextTransition` is null or points to `'neutral'`), the warning area shows nothing — consistent with Phase 4's "never show broken UI over missing weather" precedent.

## Out of scope for this phase

- Any change to Phase 4's fetching, averaging, or per-card display — this phase only adds an interpretation layer on top of data that already exists.
- Weather warnings on the 4 individual cards — scoped strictly to the single "Right now" area, per the roadmap's wording and the placement decision above.
- New weather metrics (temperature, wind, UV, etc.) — still just cloud cover and precipitation, per Phase 4's scope.
- Notifications about weather changes (Phase 7 is about golden/blue hour transitions, not weather, and is out of scope here regardless).
