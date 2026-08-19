# Requirements — Phase 1: Core light calculation (fixed location)

## Scope

Per `specs/roadmap.md` Phase 1: client-side sun/golden hour/blue hour/sunrise/sunset calculation for a hardcoded default location, with all core times displayed on screen. This phase proves the astronomical calculation approach before real location input (Phase 2) or a live/current-state indicator (Phase 3).

Extended scope: alongside each computed time, show the sun's azimuth (compass direction) and elevation angle at that exact moment. This is a static, per-time-point reading (e.g. "at golden hour start, the sun is at 292° WNW, 6°"), not a live "where's the sun right now" indicator — that remains Phase 3's job.

## Context (from parent specs)

- `specs/tech-stack.md` → "Sun, golden hour, and blue hour calculation": computed entirely client-side, no network call, no API key; a small dependency-free calculation library (SunCalc, BSD-2-Clause licensed) is the recommended way to avoid re-deriving solar formulas, and is explicitly not a UI framework so it doesn't conflict with the no-frameworks rule. This phase resolves `tech-stack.md`'s previously open question in favour of vendoring SunCalc.
- `specs/tech-stack.md` → Web Components are the convention for repeated UI elements, giving "a time-window card used for both golden hour and blue hour" as its own example — directly applicable here, since this phase introduces exactly that repeated element (sunrise, sunset, golden hour ×2, blue hour ×2).
- `specs/mission.md` goal 2: "Accurate timing... must be astronomically correct for the user's exact location" — correctness of the calculation is the whole point of this phase, not a detail to be casual about.

## Decisions made for this phase

- **Library:** vendor SunCalc as a single self-contained file (its official BSD-2-Clause licence preserved alongside it) under `js/vendor/`. Its current upstream source (v2.0.1) is ES-module-only with no committed bundled/global-script build, so it's loaded as a native ES module (`<script type="module">`) rather than a plain global `<script src>` — still no npm, no build step, no bundler; ES modules are themselves a browser standard, consistent with the rest of the stack.
- **Golden/blue hour definition:** solar elevation angle convention —
  - Golden hour: sun between -4° and +6°.
  - Blue hour: sun between -6° and -4°.
  - Both occur twice a day (once around sunrise, once around sunset). SunCalc's built-ins cover ±6° (`goldenHour`/`goldenHourEnd`) and -6° (`dawn`/`dusk`) already; the -4° boundary is not a SunCalc built-in and must be added via SunCalc's supported `addTime(angle, morningName, eveningName)` extension API.
- **Default location:** London, England, UK — 51.5074° N, -0.1278° W (hardcoded, not user-editable yet; real geolocation is Phase 2).
- **Time display:** 24-hour format, browser's local timezone, via `Intl.DateTimeFormat`.
- **Azimuth/angle display:** shown for every computed time point (sunrise, sunset, and each golden/blue hour start/end), not just sunrise/sunset. Azimuth is shown as degrees plus a compass label (e.g. "292° WNW"); elevation angle as degrees (negative below the horizon, e.g. "-4°"). Computed via `SunCalc.getPosition(date, lat, lng)`, which already returns azimuth and altitude in degrees, azimuth already north-based clockwise (0°=N, 90°=E, 180°=S, 270°=W) — no unit or reference-direction conversion needed. The only conversion required is azimuth-degrees → a 16-point compass label (N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW), matching the granularity implied by the "WNW" example above.
- **Known, accepted limitation:** SunCalc returns absolute instants (UTC-backed `Date` objects), and this phase formats them using the *browser's* local timezone, not literally "London wall-clock time." If whoever is testing this phase is not physically in the UK, the displayed clock times will be correct for the correct instant but won't match what a person in London would see on their own clock — they'll be correct in the tester's own timezone instead. This is expected and acceptable for a hardcoded demo location; it resolves naturally in Phase 2, where the geolocation-derived location and the device's timezone are the same place.

## Out of scope for this phase

- Geolocation and manual location search (Phase 2).
- Live "is it golden/blue hour right now" state indicator and countdowns (Phase 3).
- Weather data and warnings (Phases 4–5).
- Notifications (Phase 7).
- Final visual/animation polish and the finalised golden/blue duotone colour values (Phase 11) — this phase may use the existing placeholder CSS custom properties from Phase 0 as-is.
- Handling extreme-latitude edge cases (e.g. polar day/night, where SunCalc returns invalid dates) — not exercised by the London test location; deferred until a phase that needs it (most likely relevant again once Phase 2 allows arbitrary user locations).

## Correctness bar

Computed sunrise/sunset (and, by extension, golden/blue hour boundaries) for London on the implementation/test date must be checked by hand against a trusted independent reference (e.g. a well-known sunrise/sunset calculator) and match within roughly a minute, given `specs/mission.md`'s "astronomically correct" goal.

**Note on displayed elevation vs. boundary angle:** the golden/blue hour boundary *times* are solved against the plain geometric solar angle (-6°, -4°, +6°). The elevation *displayed* at that same instant comes from `SunCalc.getPosition()`, which returns the atmospherically-refraction-corrected "apparent" altitude — a different, related quantity. Near the horizon (the -6°/-4° boundaries) this shows up as roughly a 0.3–0.5° gap between the boundary angle and the displayed elevation at that boundary; near +6° the gap shrinks to roughly 0.1°, since refraction falls off with altitude. This is correct, expected behaviour, not a bug — SunCalc's built-in sunrise/sunset angle (-0.833°) already has a typical refraction allowance baked into the constant itself, which is why sunrise/sunset displays an apparent altitude around -0.35° rather than -0.833°; the golden/blue hour angles carry no such built-in allowance, so their gap is the refraction correction in full.
