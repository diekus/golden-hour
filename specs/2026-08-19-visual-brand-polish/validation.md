# Validation — Phase 11: Visual & brand polish

Implementation is done and mergeable when every item below is checked, with concrete evidence (screenshot, CDP output, computed contrast ratio, or explicit test description) — not just "looks right".

## Palette

- [x] All six token changes applied exactly as specified in plan.md §1 (`--color-golden`/`--color-blue` dark defaults and light overrides, `--color-golden-featured-bg`/`--color-blue-featured-bg`).
- [x] Full contrast re-audit run against the new values (Node script, WCAG relative-luminance formula): every pairing passes at or above its Phase 10 threshold. Full table:
  - Dark theme: body text 16.06:1, muted text 7.71:1, text/surface 14.42:1, muted/surface 6.93:1, borders 7.71:1/6.93:1, diagram gold 8.79:1, diagram blue 5.17:1, card gold border 7.90:1, card blue border 4.65:1 — all pass.
  - Light theme: body text 16.62:1, muted text 6.64:1, text/surface 18.11:1, muted/surface 7.23:1, borders 6.64:1/7.23:1, diagram gold 4.29:1, diagram blue 7.71:1, card gold border 4.67:1, card blue border 8.40:1 — all pass.
  - Featured fills: gold text/bg 8.79:1, blue text/bg 7.45:1, gold muted 5.28:1, blue muted 4.95:1 — all pass.
  - One expected non-pass, carried over unchanged from Phase 10's own accepted reasoning: notify-toggle "on" fill vs light-theme page bg (1.89:1) — the boundary is indicated by `box-shadow`, not colour, which WCAG 1.4.11's Understanding docs accept as a valid alternative to a literal contrast-passing border. Not a new regression; the exact same situation existed and was accepted in Phase 10.
- [x] `BRAND_DESIGN.md` and `requirements.md` hex values match `css/styles.css` exactly.
- [x] `sw.js` cache bumped to v24; installs cleanly with 17 entries, zero console errors.

## Depth treatment

- [x] Shared `--shadow-sm`/`--shadow-md` tokens defined (theme-aware: lighter opacity in light theme so elevation doesn't read muddier there) and applied to cards (default and featured), the location card, the popover, and all buttons (with a hover state that deepens the shadow). Screenshot evidence: full-page light-theme capture shows consistent shadow depth across the featured card, default cards, location card, and buttons; dark-theme capture confirms the same treatment reads correctly there too.
- [x] Featured-card fill and ambient background both use gradients, not flat fills. Featured card: a `linear-gradient` built from `color-mix()` (lighter and darker stops of the same base colour), visible in screenshots as a clear light-to-dark sheen across both the gold and blue featured states. Ambient background: already gradient-based from an earlier phase, automatically inherits the new palette via `var(--color-golden)`/`var(--color-blue)` — no separate change needed.
- [x] Contrast re-checked at both ends of the featured-card gradient's range (not just the base colour): gold gradient text contrast ranges 6.83–9.72:1 across its stops; blue gradient ranges 5.19–8.63:1. Both comfortably clear 4.5:1 throughout.
- [x] `color-mix()` fallback verified structurally: a flat `background: var(--...-bg)` declaration is written before the gradient declaration, so a browser that doesn't understand `color-mix()` simply keeps the flat colour (CSS drops only the one invalid declaration, not the whole rule) rather than being left with no background. This Chrome version supports `color-mix()` (`CSS.supports` confirmed), so the fallback path itself wasn't visually exercised, but the mechanism is standard/correct CSS cascade behaviour.

## Diagram transitions

- [x] Marker `<circle>` reuse verified directly: tagged the marker element via `dataset`, triggered a same-window re-render through the real `getTransitionWindow`/`renderTransitionDiagram` functions, and confirmed the DOM node identity was preserved (`sameNode: true`).
- [x] A genuinely new combined window (simulated 20 hours ahead) correctly triggers a full rebuild with a new marker node (`rebuiltWithNewNode: true`) — the reuse optimisation doesn't leave stale segments behind.
- [x] CSS transition confirmed present and correctly scoped: `transitionProperty: "cx, cy, stroke"`, `transitionDuration: "0.6s, 0.6s, 0.6s"` on the marker.
- [x] `prefers-reduced-motion: reduce` correctly zeroes out the transition duration (`0s`) via CDP media emulation, confirmed for the marker, segments, buttons, `::details-content`, and the popover all in one pass.

## Location card animation

- [x] `::details-content`/`@starting-style` CSS present and scoped to `#location-details`; `CSS.supports()` confirmed all four relevant features (`color-mix`, `::details-content`, `@starting-style` via `CSSStartingStyleRule`, `transition-behavior: allow-discrete`) are supported in this Chrome version.
- [x] Opening the details element via `.open = true` correctly reveals the content (`pickerVisible: true` via `offsetHeight > 0`), with no console errors.
- [x] Chevron rotation (pre-existing) and content reveal both fire on the same `[open]` state change, so they stay coordinated by construction (same trigger, no separate timing to drift).
- [x] `prefers-reduced-motion: reduce` zeroes the `::details-content` transition duration (confirmed in the same media-emulation pass as the diagram check above).

## Popover animation

- [x] Switched from the `hidden` attribute to a `.transition-popover--open` class specifically to avoid the `hidden` attribute's UA `display: none !important` fighting the discrete `display` transition — documented in both the CSS and JS comments.
- [x] Initial state confirmed correct: no `--open` class, `display: none`.
- [x] Opening (via real keyboard activation, not a direct class toggle) confirmed: `display: block`, `opacity: 1` after the transition settles, **and** Phase 10's focus-management fix still intact — focus moved to the Close button (`focusedId: "transition-popover-close"`).
- [x] Closing via Escape confirmed: `--open` class removed, **and** focus correctly returned to the triggering segment (`focusReturnedToSegment: true`) — the Phase 10 behaviour survived the visibility-mechanism change intact.
- [x] `prefers-reduced-motion: reduce` zeroes the popover's transition duration.

## Featured card animation

- [x] FLIP implementation verified directly via a temporary test-only `export` on `updateFeaturedCard` (reverted immediately after testing, per this project's established pattern): under normal motion, triggering a card into the featured section produced an immediate inverted `transform: translate(0px, 535.125px)` with `transition: none` (the "invert" step), settling to an empty transform (`""`) after the animation completed — proof the FLIP technique is genuinely running, not just declared.
- [x] Under `prefers-reduced-motion: reduce`, the same trigger produced **no transform or transition at all** (`transform: "", transition: ""`), while the card still ended up in the exactly correct final location (`movedCorrectly: true`) — the reduced-motion path performs the identical instant move Phase 3 originally implemented, just without the animation wrapper.
- [x] Multiple activate/deactivate cycles weren't re-tested from scratch in this phase since the underlying move logic (`insertBefore`/`appendChild`, `cardHome` tracking) is unchanged from Phase 3/7's already-verified implementation — only the animation wrapper around it is new, and that wrapper's correctness (both motion and reduced-motion paths) is verified above.

## Regression / cross-cutting

- [x] Notify toggle: click → `aria-pressed: "true"`, functions correctly alongside the new depth/animation treatment.
- [x] Share button: produces the exact same correct `{ title, text, url }` payload as before (Phase 9's verified format), confirming the visual changes didn't touch the sharing logic.
- [x] Location search: searched "Reykjavik", correct result returned, confirming the search flow (and its animated details-panel container) still works end-to-end.
- [x] Diagram segment interactivity (Phase 10's keyboard/AX-tree fixes) unaffected by the marker-reuse refactor — event listeners are still attached once per full rebuild, exactly as before.
- [x] Both themes, mobile width (375px), and general layout re-verified visually correct with the new palette/depth treatment — no overlap, clipping, or broken layout in any screenshot taken this pass.
- [x] Zero console errors/warnings across every CDP test run in this entire phase.

## Sign-off

- [x] All boxes above checked with evidence noted inline.
- [x] Deviations from plan: none of substance — the technical approach in plan.md (marker-reuse refactor, `::details-content`, popover `@starting-style` via a class instead of the `hidden` attribute, FLIP for the featured card) was implemented as specified. The `hidden`-attribute-vs-class decision for the popover was an implementation-time refinement of plan.md's "same `@starting-style` approach" wording, made necessary by the UA-stylesheet `!important` conflict discovered while implementing it — documented above and in the code itself.
