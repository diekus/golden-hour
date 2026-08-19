# Plan — Phase 5: Weather warning

## 1. Track weather per window in `js/app.js`
- Add a module-level `weatherByWindow` object, keyed by the same 4 window names Phase 4 already uses (`goldenHourMorning`, `goldenHourEvening`, `blueHourMorning`, `blueHourEvening`).
- In `renderWeather()`, alongside setting each card's `data.weather`, also store the result in `weatherByWindow[window]` — a single source of truth the new warning logic reads from, instead of querying the DOM cards for their data.

## 2. Resolve "which window is this about" from the transition state
- Add a small helper, e.g. `resolveActiveWeatherWindow(transitionWindow)`, that maps `transitionWindow.currentKind`/`nextTransition.toKind` + `transitionWindow.direction` to one of the 4 window keys:
  - `currentKind` is `'gold'` or `'blue'` → that kind, that direction (we're inside the window right now).
  - `currentKind` is `'neutral'` and `nextTransition.toKind` is `'gold'` or `'blue'` → that upcoming kind, that direction (waiting for it).
  - Otherwise (no `transitionWindow`, or `nextTransition` is `null`/`'neutral'`) → `null`, meaning no warning should be shown.

## 3. Interpretation logic
- Add `formatWeatherWarning(weather)` (pure function, takes a `{ cloudCover, precipProbability } | null`, returns a message string or `''`):
  - `null` → `''` (no data yet, or fetch failed).
  - Good tier (cloud ≤ 40 and precip ≤ 20): a positive message.
  - Caution tier (cloud 41–80 or precip 21–50, not hitting warning): a "could go either way" message, naming whichever factor(s) are elevated.
  - Warning tier (cloud > 80 or precip > 50): a "likely washed out" message, naming whichever factor(s) crossed the threshold (cloud, rain, or both).

## 4. Wire it together
- After computing `transitionWindow` in `renderTransition()`: resolve the active window key, look up `weatherByWindow[key]`, format the message, and set it on a new UI element.
- Also call the same render step from the end of `renderWeather()` (after `weatherByWindow` is populated) — the weather fetch usually resolves *after* the first `renderTransition()` call, so the warning needs a second chance to appear once data actually arrives, without waiting for the next 30-second tick.

## 5. Markup and styling
- Add a `<p id="weather-warning" class="weather-warning" role="status"></p>` in `index.html`, near `#transition-summary` in the "Right now" section.
- `css/styles.css`: minimal styling — muted by default; consider a subtle colour cue per tier (e.g. the existing `--color-golden`/neutral tones) without duplicating the ambient-background mechanism from the earlier UI-refinement work. Keep it a single line of plain text, consistent with Phase 4's "no icons/emoji" precedent.

## 6. Service worker
- No new JS module file this time (the logic lives in `app.js`, which is already in `APP_SHELL`) — just bump `CACHE_NAME` since `app.js`'s content changes.

## 7. Verify
- Unit-style check of `formatWeatherWarning` across all three tiers plus the boundary values (exactly 40/41, 80/81, 20/21, 50/51) and the `null` case, with real numbers, not just spot-checking one example per tier.
- Confirm `resolveActiveWeatherWindow` picks the right window in both the "currently inside a window" and "waiting for the next one" cases, and correctly returns `null` in the trailing-padding edge case.
- Visually confirm the warning appears next to the diagram/summary, updates correctly when weather arrives after the initial render, and disappears/stays empty when weather is unavailable (simulate a blocked forecast request, per Phase 4's precedent).
- Confirm no console errors, and mobile-width rendering.
