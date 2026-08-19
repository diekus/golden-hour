# Validation — Phase 3: Live state indicator

This phase is ready to merge when all of the following hold.

> **Amendment (2026-08-19, later same day):** the diagram gained boundary time labels (the actual start/transition/end instants shown as text on the arc) and made the blue/gold segments individually tappable, opening a popover with that segment's start, end, and percentage-passed. `renderTransitionDiagram` now takes `(container, transitionWindow, timezone, onSegmentActivate)` instead of just `(container, transitionWindow)`. See the UI-refinement commit after this phase; the window-selection/live-refresh logic validated below is unchanged.

## Transition-window logic
- [x] `getTransitionWindow(lat, lng, now)` in `js/transition-window.js` is a pure function (no DOM/network access).
- [x] For a "now" well before the next combined window, `nowFraction` clamps to `0` (marker at the start edge).
- [x] For a "now" inside the blue segment, `currentKind` is `'blue'` and `nowFraction` falls strictly between the neutral-before and gold segment boundaries.
- [x] For a "now" exactly at the blue/gold transition instant, the segment boundary and `nextTransition` are consistent (no off-by-one/rounding flip).
- [x] For a "now" inside the gold segment, `currentKind` is `'gold'`.
- [x] For a "now" late at night, after today's evening window's padded end has passed, the function correctly returns *tomorrow's* morning window, not a stale/expired one.
- [x] All of the above checked with real computed numbers (a debug script printing actual values), not just visual inspection.

## Diagram and summary
- [x] The SVG half-circle renders with up to 4 correctly-ordered, correctly-coloured segments (neutral/blue/gold per `requirements.md`) and a marker at the right position.
- [x] The SVG is `aria-hidden="true"`.
- [x] A text summary (current state + countdown to next transition) is present, accurate, and updates live.
- [x] Diagram and summary render correctly in both light and dark themes (screenshot-verified) and at a true mobile viewport width.

## Live behaviour
- [x] A 30-second interval recomputes and re-renders the diagram/summary without a page reload — verified with a genuine 65-second real-time wait in a live page (via a `MutationObserver` on the diagram/summary elements): exactly 2 DOM mutations observed, matching two interval firings. Not mocked/advanced time.
- [x] Changing location (geolocation success or search pick, per Phase 2) recomputes the diagram/summary for the new location — verified by searching and switching to Tokyo: label and summary both updated correctly ("Blue hour starts in 7 h 43 min." for Tokyo vs. a golden-hour countdown for London).

## Integration
- [x] No console errors.
- [x] `sw.js`'s `APP_SHELL` includes `js/transition-window.js` and `js/transition-diagram.js`, and `CACHE_NAME` is bumped (v4).
- [x] No framework code introduced; the diagram is plain DOM/SVG, not a Web Component (per `plan.md`'s reasoning).
- [x] No weather or notification logic added — this phase is the live golden/blue hour indicator only.

## Placement and accessibility
- [x] The diagram + summary sit at the very top of `<main>`, above the location section.
- [x] The section has a visible heading consistent with the existing "SUN"/"GOLDEN HOUR"/"BLUE HOUR" muted-uppercase style.

## Merge
- [ ] Branch `2026-08-19-live-state-indicator` merges cleanly into `2026-08-19-real-location` (or `main`, once Phase 2 is merged) with no conflicts — pending your review; not yet merged.
