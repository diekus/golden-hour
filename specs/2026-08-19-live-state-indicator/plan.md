# Plan — Phase 3: Live state indicator

## 1. Transition-window logic module
- Add `js/transition-window.js`, importing `getLightTimes` from `js/light-times.js`. Exports a single function, e.g. `getTransitionWindow(lat, lng, now)`, returning:
  - `windowStart`, `windowEnd` (padded by 20 minutes each side of the combined period).
  - `segments`: an ordered array of `{ kind: 'neutral' | 'blue' | 'gold', start, end }` covering `windowStart` → `windowEnd` with no gaps.
  - `nowFraction`: `(now - windowStart) / (windowEnd - windowStart)`, clamped to `[0, 1]`.
  - `direction`: `'morning'` or `'evening'` (which combined period this is).
  - `currentKind`: which segment `now` actually falls in right now (`'neutral' | 'blue' | 'gold'`), for the text summary.
  - `nextTransition`: `{ at: Date, toKind }` — the next segment boundary at or after `now`, for the countdown text.
- Internal logic: build today's two combined windows (morning: `blueHourMorning.start`→`goldenHourMorning.end`; evening: `goldenHourEvening.start`→`blueHourEvening.end`) from `getLightTimes(lat, lng, now)`. Pick the first whose padded end (`end + 20min`) is still ≥ `now`. If neither today's window qualifies, call `getLightTimes` again with `now` advanced by ~20 hours (safely past today's evening window but still lands on the correct next calendar day via SunCalc's own date handling) and use that day's morning window.
- Pure function, no DOM access — independently testable the same way `getLightTimes` is.

## 2. Diagram rendering module
- Add `js/transition-diagram.js`, exporting `renderTransitionDiagram(container, transitionWindow)` — plain DOM/SVG manipulation, not a Web Component. Consistent with Phase 2's location control: this is a one-off piece of UI, not a repeated element, so per `specs/tech-stack.md`'s convention it doesn't need the Web Component encapsulation `light-window-card` uses for genuinely repeated cards.
- Builds/updates an inline SVG half-circle: a semicircular track split into `<path>` arc segments coloured per `segments[].kind` (`--color-blue`, `--color-golden`, or a muted neutral), plus a small `<circle>` marker positioned via `nowFraction` along the arc.
- The SVG itself is `aria-hidden="true"` — it's a visual complement to the text summary (step 3), not an independent source of information for assistive tech.

## 3. Text summary
- Alongside the diagram, render a short live sentence, e.g. "Golden hour starts in 18 min" or "Blue hour — 6 min left", derived from `currentKind`/`nextTransition`. This is the "countdown to the next transition" the roadmap calls for, and the accessible equivalent of the visual diagram.

## 4. Markup and styling
- Add a section at the very top of `<main>` in `index.html` (above the location section): a visible "Right now" heading (matching the existing muted-uppercase section header style), a container `<div>` for the SVG diagram, and a `<p>` for the text summary.
- `css/styles.css`: responsive sizing for the SVG (scales with container width, fixed aspect ratio via `viewBox` + CSS), spacing consistent with the rest of the page.

## 5. Wiring into `js/app.js`
- After every point where `currentLocation` is set (initial load, geolocation success, search pick), compute `getTransitionWindow(...)` and call `renderTransitionDiagram(...)` plus update the text summary.
- Add a `setInterval` (30s) that recomputes and re-renders the diagram/summary using the current `currentLocation` and a fresh `new Date()` — this is what makes the marker actually move and what carries the diagram over into the next combined window once the current one's padded end passes. Scoped to just the diagram/summary; the six light-window-cards keep their existing render-on-location-change-only behaviour, unchanged from Phase 2.

## 6. Service worker
- Add `js/transition-window.js` and `js/transition-diagram.js` to `sw.js`'s `APP_SHELL`, bump `CACHE_NAME` (v4).

## 7. Verify
- Numerically check `getTransitionWindow`'s output at several synthetic "now" values against hand-computed expectations: well before a window (marker clamped to 0), inside the blue segment, exactly at the blue/gold transition instant, inside the gold segment, just past the padded end (rolls to the next window).
- Specifically verify the day-rollover case: a "now" late at night, after today's evening window's padded end, correctly produces tomorrow's morning window.
- Visually confirm the diagram renders sensibly (screenshot) in both light and dark themes and at mobile width.
- Confirm the 30-second live update actually moves the marker (or swaps windows) without a page reload, and that the location-change recompute path still works after Phase 2's geolocation/search flows.
- Confirm no console errors, and that the SVG is `aria-hidden` with a sensible, accurate text summary as its accessible equivalent.
