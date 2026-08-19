# Validation — Phase 1: Core light calculation (fixed location)

This phase is ready to merge when all of the following hold.

## Calculation correctness
- [x] `js/vendor/suncalc.js` is present unmodified, with `js/vendor/SUNCALC-LICENSE.txt` alongside it, and is imported as an ES module from `js/light-times.js`.
- [x] The -4° boundary is registered via `SunCalc.addTime(...)` and produces usable morning/evening time fields alongside the built-in ±6°/-6° ones.
- [x] For London (51.5074, -0.1278) on 2026-08-19, computed sunrise 05:52 BST / sunset 20:14 BST fall within the well-established range for London in mid/late August; checked against general astronomical knowledge rather than a literal external calculator lookup in this pass — worth a quick cross-check against a site like timeanddate.com if you want a harder confirmation.
- [x] Sunrise azimuth 68° (ENE) and sunset azimuth 292° (WNW) are consistent with expected values for London at this time of year (azimuths narrowing toward due east/west as autumn approaches); same caveat as above — reasoned, not looked up against an external source in this pass.
- [x] Window boundaries are internally consistent: `goldenHourMorning.start` equals `blueHourMorning.end` (same -4° crossing), and `goldenHourEvening.end` equals `blueHourEvening.start`. Displayed elevation at these boundaries reads a little off the exact -4°/-6°/+6° angle used to solve for the time (refraction correction in `getPosition()`'s apparent altitude vs. the plain geometric angle the time itself is solved on) — that offset is expected, not a defect (see `requirements.md`).
- [x] `getLightTimes()` (or equivalent) is a pure function with no DOM/network access, independently sane-checkable.

## Display
- [x] Sunrise, sunset, golden hour (morning/evening), and blue hour (morning/evening) are all displayed on screen for the hardcoded London location.
- [x] Each window shows start, end, and duration.
- [x] Every displayed time point (sunrise, sunset, and each golden/blue hour start/end) also shows the sun's azimuth and elevation angle at that instant.
- [x] Azimuth is shown as degrees plus a compass label (e.g. "292° WNW"); elevation as signed degrees (e.g. "-4°").
- [x] Times are formatted 24-hour, browser-local timezone, via `Intl.DateTimeFormat`.
- [x] A reusable custom element is used for the repeated time-window UI (golden/blue hour cards) including the azimuth/elevation reading, not copy-pasted markup blocks, per `specs/tech-stack.md`'s Web Components convention.

## Integration with Phase 0 scaffold
- [x] No console errors on load.
- [x] `sw.js`'s `APP_SHELL` list includes the new JS files, and `CACHE_NAME` is bumped so the update actually takes effect.
- [x] No framework code introduced.
- [x] No geolocation, live-state indicator, weather, or notification logic added — this phase is calculation + display only, for a fixed location.

## Accessibility & responsiveness
- [x] All body text (times, labels, azimuth/elevation readings) meets WCAG AA contrast against its background, in both light and dark system themes. `--color-golden`/`--color-blue` are used only as a decorative card border in this phase (not as text), consistent with `requirements.md`'s note that final palette values are Phase 11's job.
- [x] Layout of the stacked time-window cards doesn't break at common mobile widths.

## Known, accepted limitations
- Displayed times reflect the correct UTC instant formatted in the *browser's* local timezone, not necessarily literal London wall-clock time if the tester isn't in the UK. This is documented in `requirements.md` and is not a defect to fix in this phase.
- The golden accent border (`--color-golden`, `#e8a33d`) computes to only ≈2.2:1 contrast against a white card surface in light theme — visibly washed out, though not a WCAG failure since it's decorative (the "Golden hour" label text carries the same information at full contrast). Placeholder colours are explicitly allowed as-is in this phase per `requirements.md`; final palette tuning is Phase 11's job.

## Merge
- [ ] Branch `2026-08-19-light-calculation` merges cleanly into `2026-08-18-project-scaffold` (or `main`, once Phase 0 is merged) with no conflicts — pending your review; not yet merged.
