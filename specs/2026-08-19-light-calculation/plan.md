# Plan — Phase 1: Core light calculation (fixed location)

## 1. Vendor SunCalc
- Fetch the current upstream source (v2.0.1, ESM: `export function getPosition`, `export function getTimes`, `export function addTime`, plus moon-related exports we don't use) from its official repository and save it unmodified as `js/vendor/suncalc.js`.
- Add `js/vendor/SUNCALC-LICENSE.txt` with the full upstream BSD-2-Clause licence text and a one-line attribution/source comment, since the current upstream file itself carries no in-file licence header (the licence lives in the repo's separate `LICENSE` file).
- Loaded as a native ES module — `import * as SunCalc from './vendor/suncalc.js'` from `js/light-times.js` — not a plain global `<script src>`, since the upstream source has no bundled global-script build. `js/app.js` itself becomes `<script type="module" src="js/app.js"></script>` in `index.html` (module scripts are deferred by default, so the existing `defer` attribute is dropped, not needed).

## 2. Extend SunCalc with the -4° boundary
- Call `SunCalc.addTime(-4, 'blueHourEnd', 'blueHourStart')` once, at module load time in `js/light-times.js`, to register the extra angle needed for the blue/golden hour split, alongside SunCalc's existing built-ins: `[-0.833, sunrise/sunset]`, `[-6, dawn/dusk]`, `[+6, goldenHourEnd/goldenHour]`.
- Naming mirrors SunCalc's own convention (a "morning"/rise name and an "evening"/set name per angle): `blueHourEnd` = the morning crossing (blue hour ends, golden hour begins as the sun climbs past -4°); `blueHourStart` = the evening crossing (golden hour ends, blue hour begins as the sun descends past -4°).
- This assembles into four windows: golden hour morning = `blueHourEnd` → `goldenHourEnd`; golden hour evening = `goldenHour` → `blueHourStart`; blue hour morning = `dawn` → `blueHourEnd`; blue hour evening = `blueHourStart` → `dusk`.

## 3. Light-times data model
- Add `js/light-times.js`: a small pure function, e.g. `getLightTimes(lat, lng, date)`, that calls `SunCalc.getTimes(...)` and returns a structured object covering:
  - `sunrise`, `sunset`
  - `goldenHourMorning: { start, end }`, `goldenHourEvening: { start, end }`
  - `blueHourMorning: { start, end }`, `blueHourEvening: { start, end }`
- Derive duration (`end - start`) for each window rather than hardcoding it.
- For every individual time point in the structure above (not just the windows as a whole — each `start` and `end`, plus `sunrise`/`sunset`), also compute the sun's azimuth and elevation angle at that instant via `SunCalc.getPosition(date, lat, lng)`, which already returns both in degrees, azimuth already north-based clockwise — no unit/reference conversion needed.
- Add a small helper mapping azimuth-degrees to a 16-point compass label (see `requirements.md`).
- No network calls, no DOM access in this module — pure calculation, easy to reason about independently of rendering.

## 4. Reusable time-window custom element
- Add a Web Component (e.g. `<light-window-card>`) per `specs/tech-stack.md`'s Web Components convention, taking a label, start time, end time, duration, and the azimuth/elevation reading for both the start and end instants, and rendering them consistently (e.g. each time shown with its "292° WNW, 6°" reading alongside it).
- Use it for golden hour (morning + evening) and blue hour (morning + evening); use it or a simpler single-time variant (one azimuth/elevation reading, not a pair) for the plain sunrise/sunset display.
- Style using the existing CSS custom properties from Phase 0 (`--color-golden`, `--color-blue`, neutral background), consistent with the golden/blue duotone direction — final polish is still Phase 11, this just needs to be legible and on-brand, not final. Keep the azimuth/elevation reading visually secondary (e.g. smaller/muted text) to the time itself, so the card doesn't read as cluttered.

## 5. Wire into the page
- On page load, call `getLightTimes()` with the hardcoded London coordinates (51.5074, -0.1278) and the current date.
- Render sunrise, sunset, golden hour (morning/evening), and blue hour (morning/evening) using the custom element(s) from step 4, replacing the Phase 0 placeholder message.
- Format every time with `Intl.DateTimeFormat` in 24-hour format, browser-local timezone (see `requirements.md` for the known limitation this implies for non-UK testers).

## 6. Update the service worker's cached app shell
- Add the new files (`js/vendor/suncalc.js`, `js/light-times.js`, the custom element's JS/CSS if in separate files) to the `APP_SHELL` array in `sw.js` from Phase 0, and bump `CACHE_NAME` so the new cache version actually takes effect on existing installs.

## 7. Verify correctness and accessibility
- Manually cross-check computed London sunrise/sunset/golden/blue hour times for the test date against an independent trusted reference; confirm within ~1 minute tolerance.
- Manually cross-check the sunrise and sunset azimuth readings against an independent trusted reference; confirm within a couple of degrees.
- Sanity-check internal consistency rather than a fixed elevation number: `goldenHourMorning.start`/`blueHourMorning.end` must be the exact same instant (both are the -4° crossing), likewise `goldenHourEvening.end`/`blueHourEvening.start`; displayed elevation at the -4°/-6°/+6° boundaries will read a little off those exact numbers (typically ~0.3–0.5° near the horizon, ~0.1° near +6°) because `getPosition()` returns the atmospherically-refracted *apparent* altitude, while the boundary times themselves are solved on the plain geometric angle — see `requirements.md`.
- Confirm no console errors, that body text meets WCAG AA contrast against the background in both light and dark themes, and that the stacked cards remain usable at mobile widths.
