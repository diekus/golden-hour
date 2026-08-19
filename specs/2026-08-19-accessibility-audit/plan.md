# Plan — Phase 10: Accessibility & responsive audit

## 1. Contrast audit (WCAG AA)

- Systematically enumerate every text/background and UI-component-boundary colour pairing across the app — not just the ones already spot-checked when each feature landed: body text, muted text, all button states (default, `aria-pressed="true"`, `:disabled`), the featured card (both accents), weather-warning tiers, location card, popover, offline indicator — in both light and dark themes.
- Compute contrast ratios via the same manual relative-luminance method used throughout prior phases (or read computed colours via CDP and compute programmatically for accuracy/speed across this many combinations).
- Fix anything under 4.5:1 for normal text, 3:1 for large text/UI component boundaries.

## 2. Keyboard navigation audit

- Tab through the entire page in DOM order; confirm every interactive element is reachable, has a visible focus indicator, and is operable (Enter/Space where applicable).
- Fix the `transition-diagram.js` `aria-hidden`/focusable-descendant conflict (requirements.md finding 1): remove `aria-hidden="true"` from the `<svg>` wrapper, and instead hide only the genuinely decorative children (boundary `<text>` labels, sun-event icon group, position marker circle, non-interactive neutral segments) individually — so the interactive gold/blue segments become properly exposed to the accessibility tree while decoration stays hidden from it.
- Audit `#transition-popover`'s focus behaviour (requirements.md finding 2): decide, based on what's actually implemented, whether to (a) add real focus management (move focus in on open, return it to the triggering segment on close, trap Tab within it while open) matching a true `dialog`, or (b) change its role to something that doesn't imply that contract for what's intentionally a lightweight, dismissible popover. Implement whichever the popover's actual dismiss/interaction model (Escape key, outside click, no full-page focus trap currently) more honestly matches.
- Verify `<details>`/`<summary>`, search input/results, and all buttons retain their native keyboard behaviour (no custom handling has broken it).

## 3. Screen-reader / accessible-name audit (CDP Accessibility domain)

- Use CDP's `Accessibility.getFullAXTree` (or per-node `Accessibility.getPartialAXTree`) to inspect the actual computed role/name/state of every interactive element and status region, in both themes and both notify-toggle on/off states.
- Verify: every button has a correct accessible name (icons remain `aria-hidden` and don't duplicate/corrupt it), `aria-pressed` is exposed correctly for the notify toggle, `role="status"` regions are exposed as live regions, the popover's labelling (`aria-labelledby`) resolves correctly, every `<img>` has correct `alt` text (logo images, any others).
- Fix any gap the AX tree reveals that a code read-through wouldn't have caught.

## 4. Colour-only cue fix (WCAG 1.4.1)

- `js/transition-diagram.js`: add a `stroke-dasharray` (or equivalent) distinguishing the gold and blue segments from each other by pattern, not just colour — e.g. gold stays a solid stroke, blue gets a dashed stroke. Keep it subtle enough not to clash with the diagram's existing minimal look; the boundary time labels and sun icon already anchor meaning, this just adds a redundant, colour-independent cue directly on the arc itself.
- Verify the distinction is perceptible via a rendered screenshot, not just by reading the CSS/markup.

## 5. Responsive audit

- Test the existing fluid single-column layout across a wide range of widths (320px through 1440px+), checking specifically for: horizontal overflow/scrolling (WCAG 1.4.10 Reflow requires none down to 320px CSS width), text truncation/overlap, and touch-target sizing at narrow widths.
- Add one proactive breakpoint (`min-width` around 48rem/768px) that modestly widens `main`'s content measure for tablet/desktop viewports, without a structural column reflow (that's Phase 11's territory per requirements.md's non-goals).
- Re-verify every other visual feature (featured card, notify/share buttons, diagram) still renders correctly at the new breakpoint.

## 6. Documentation

- Consolidate every finding (fixed or explicitly deferred with rationale) into `validation.md`, with concrete evidence per item — screenshots, CDP output, or computed contrast ratios — matching the rigor established in every prior phase's validation pass.
