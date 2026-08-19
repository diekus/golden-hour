# Validation — Phase 5: Weather warning

This phase is ready to merge when all of the following hold.

## Interpretation logic
All checked by directly calling the real (temporarily-exported, then reverted) functions with synthetic inputs — not a reimplementation, not just spot-checking one example per tier:
- [x] `formatWeatherWarning(null)` returns `{tier: null, text: ''}`.
- [x] Good tier: `(20, 5)` → good; boundary `(40, 20)` exactly → still good (confirms strict `>` comparison, not `>=`).
- [x] Caution tier: `(41, 20)` → "Partly cloudy — could go either way." (cloud-only clause); `(40, 21)` → "Some rain risk — could go either way." (precip-only clause); `(60, 30)` and boundary `(80, 50)` → both-clause message, still caution not warning at the exact 80/50 boundary.
- [x] Warning tier: `(81, 50)` → "heavy cloud" clause only; `(80, 51)` → "rain" clause only; `(100, 100)` → "heavy cloud and rain" combined clause.
- [x] `resolveActiveWeatherWindow`: all 7 cases (inside gold/morning, inside blue/evening, waiting-for gold/morning, waiting-for blue/evening, trailing-pad with `nextTransition: null`, trailing-pad with `toKind: 'neutral'`, `transitionWindow: null`) returned exactly the expected window key or `null`.

## Display
- [x] The warning/status message appears next to the "Right now" diagram/summary, not on the per-window cards.
- [x] Confirmed empty immediately after page load (weather fetch still in flight), then populated with real data ~2.5s later once the fetch resolves — doesn't wait for the next 30-second tick.
- [x] Window-selection logic verified via the synthetic `resolveActiveWeatherWindow` cases above (inside vs. waiting, both directions) — a live real-time transition crossing wasn't waited for in this pass (impractical to wait tens of minutes for), but the function driving that behaviour is fully verified.

## Error handling
- [x] With the forecast API blocked (per Phase 4's test precedent), the warning area shows nothing — no broken UI, no console error.

## Integration
- [x] No changes to Phase 4's fetching/averaging/per-card logic — confirmed by diff review, not just behaviour.
- [x] `CACHE_NAME` is bumped in `sw.js` (no new file needed in `APP_SHELL`, `app.js` is already listed).
- [x] No framework code, no new API calls beyond what Phase 4 already makes.

## Responsiveness
- [x] The warning text doesn't break layout at a true mobile viewport width.

## Merge
- [ ] Branch `2026-08-19-weather-warning` merges cleanly into `main` with no conflicts — pending your review; not yet merged.
