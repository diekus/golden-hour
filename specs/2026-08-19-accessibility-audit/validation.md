# Validation — Phase 10: Accessibility & responsive audit

Implementation is done and mergeable when every item below is checked, with concrete evidence (screenshot, CDP output, computed contrast ratio, or explicit test description) — not just "looks right".

## Contrast (WCAG AA)

- [x] Every text/background pairing across the app computed programmatically (Node script, WCAG relative-luminance formula) for both themes: body text, muted text, buttons, borders, diagram segments, featured card (+ its muted-text-at-0.75-opacity variant, alpha-blended before measuring), notify-toggle "on" fill. Full pass/fail table generated; every result at or above target.
- [x] **Failure found and fixed**: `--color-golden` (#e8a33d) only reached ~1.98:1 against the light theme's background/surface (#f7f5f0 / #ffffff) — well under WCAG 1.4.11's 3:1 minimum for a graphical object (the diagram's gold segment) and a UI component boundary (the golden-hour cards' left border, which shares the same variable). This had been present since the colour was first chosen and was never caught because prior contrast checks this session only covered *text*, not the bare diagram stroke or card border against the page. Fixed by adding a light-theme-only override, `--color-golden: #a86a12`, mirroring how `--color-blue` already had its own light-theme value for the same reason. Re-verified: 4.07:1 vs bg, 4.43:1 vs surface — comfortable margin above 3:1. Dark theme was unaffected (root default `#e8a33d` unchanged there, already ~8.4:1).
- [x] Re-verified via a real rendered screenshot (not just the computed numbers) that the new gold is clearly more visible against the light-theme background than before.
- [x] Featured card and notify-toggle "on" fill (fixed, theme-independent colours) re-spot-checked: both remain ≥4.9:1 for their muted-text variants and ≥7.3:1 for their primary text — no regression.
- [x] Notify-toggle "on" fill's boundary against the page background (no literal border, only a box-shadow) was flagged during the audit but deliberately not force-fitted to the 3:1 metric: WCAG's Understanding docs for 1.4.11 accept a boundary indicated by means other than colour (shape, shadow) as satisfying the intent without a literal colour-contrast border. Documented here as a considered decision, not an oversight.

## Keyboard navigation

- [x] Full page walkthrough via **real CDP `Input.dispatchKeyEvent` Tab presses** (not just DOM-order enumeration): confirmed actual focus moves through diagram segments → notify toggle → share toggle → location summary → "Use my location" → search input → search button, in that order — matches DOM order, no unexpected jumps.
- [x] `transition-diagram.js`'s `aria-hidden`/focusable-descendant conflict fixed and re-verified precisely via CDP (`DOM.querySelectorAll` + `Accessibility.getPartialAXTree` correlated per-node, not a broad text-match which would have conflated diagram labels with the cards' own legitimate text): boundary `<text>` labels, sun icon `<g>`, non-interactive (neutral) segments, and the position marker `<circle>` are all `ignored: true` in the accessibility tree; the interactive gold/blue segments are `ignored: false, role: "button"` — exposed correctly.
- [x] `#transition-popover`'s focus management implemented and verified end-to-end: keyboard-activating a segment (`Enter` keydown, not click) moves focus to the popover's Close button; pressing `Escape` closes the popover **and returns focus to the triggering segment**; closing via the Close button click does the same. `role="dialog"` is now actually justified by matching behaviour, rather than being an unbacked label.
- [x] `<details>`/`<summary>`, search input/results, and all buttons confirmed still keyboard-reachable in the same walkthrough — no regression from the diagram/popover fixes.
- Note: CDP's synthetic `Enter`/`Space` key dispatch does not reliably trigger a native button's default click action in this headless environment (a known limitation established in earlier phases) — worked around by dispatching the keydown event directly at the element the app's own listener is attached to, which exercises the actual app code path rather than relying on browser-default-action synthesis.

## Screen-reader / accessible names (CDP Accessibility domain)

- [x] `Accessibility.getFullAXTree` and per-node `getPartialAXTree` used throughout this pass (not code review alone).
- [x] Diagram segment buttons: `role: "button"`, `name: "Golden hour details"` / `"Blue hour details"` — correct and unambiguous.
- [x] Notify toggle: `role: "button"`, `pressed: "false"` (off) confirmed via AX tree; clicked to opt in, re-fetched tree, confirmed `name: "Notifications on"`, `pressed: "true"` — the icon doesn't duplicate/corrupt the accessible name in either state.
- [x] `role="status"` regions present in markup for all live-updating text (`transition-summary`, `weather-warning`, `notify-status`, `location-message`) — unchanged by this phase, spot-checked still present.
- [x] Popover labelling: `role="dialog"` node present in the AX tree once opened (title text resolves via `aria-labelledby`).
- [x] `<img>` alt text: the single `<img>` (the `<picture>`'s fallback; the `<source>` doesn't need its own `alt` per spec — only the `<img>` does) has `alt="Golden Hour"`, non-empty and correct.
- [x] No gaps found beyond the two already-fixed items above (diagram `aria-hidden` conflict, popover focus).

## Colour-only cue (WCAG 1.4.1)

- [x] `transition-diagram.js`: blue segments now render with `stroke-dasharray="10 8"`; gold stays solid. Verified via computed-style inspection (`dasharray: "10 8"` on blue, `null` on gold) and a zoomed screenshot showing the dash pattern is clearly perceptible, not just present in markup.
- [x] Diagram's overall minimal visual character preserved — screenshot comparison shows the dash pattern reads as a deliberate, subtle detail rather than clutter.

## Responsive (320px–1440px+)

- [x] No horizontal overflow at any tested width (320, 375, 480, 600, 768, 1024, 1440px) — `scrollWidth === clientWidth` at every step, confirmed programmatically, satisfying WCAG 1.4.10 Reflow's 320px floor.
- [x] No text truncation/overlap observed in screenshots at 320px, 768px, or 1024px.
- [x] Proactive breakpoint implemented: `@media (min-width: 48rem)` widens `main` from 36rem (576px) to 42rem (672px) and the diagram from 22rem to 26rem — confirmed via computed `max-width` flipping exactly at the 768px boundary, and screenshotted before/after (320px mobile vs 768px/1024px tablet-desktop).
- [x] Notify/share buttons, diagram, and overall layout re-verified correct at the new breakpoint — buttons sit on one row at ≥768px, wrap to their own row below it, no overlap either way.

## Sign-off

- [x] All boxes above checked with evidence noted inline.
- [x] Findings summary: two issues anticipated in requirements.md (diagram `aria-hidden` conflict, popover focus management) were confirmed and fixed; one issue **not** anticipated going in was found during the systematic contrast pass (`--color-golden` failing WCAG 1.4.11 in light theme) and fixed; the colour-only diagram cue (WCAG 1.4.1) was addressed via a dash pattern; a proactive responsive breakpoint was added. Nothing found was left unaddressed.
- [x] Zero console errors/warnings across every CDP test run in this pass.
