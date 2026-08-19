# Plan — Phase 11: Visual & brand polish

## 1. Finalize the palette

- `css/styles.css` token changes:
  - `--color-golden`: `#e8a33d` → `#f2a52c` (root/dark default); light-theme override `#a86a12` → `#a8640a`.
  - `--color-blue`: `#6f95e0` → `#6584e6` (root/dark default); light-theme override `#3d5ea8` → `#31469e`.
  - `--color-golden-featured-bg`: `#e8a33d` → `#f2a52c` (now equal to the base dark-theme gold — one fewer bespoke value to maintain).
  - `--color-blue-featured-bg`: `#2c4d8a` → `#31469e` (now equal to the base light-theme blue, chosen because it was already independently verified as a strong dark-blue-on-white-text pairing).
  - `--color-golden-featured-text`/`--color-blue-featured-text` and their `-muted` variants stay the same formulas (dark/`rgba(20,22,26,.75)` on gold, light/`rgba(244,241,234,.75)` on blue) — re-verify the resulting ratios, don't re-derive them.
- Re-run the Phase 10 contrast audit script against every new value (text-on-bg, text-on-surface, borders, diagram segments vs bg, featured fills vs their own text) — every pairing must meet or exceed its Phase 10 threshold. Fix anything that regresses before proceeding to the rest of this phase.
- Bump `sw.js`'s `CACHE_NAME`.

## 2. Depth treatment

- **Shadows**: extend the elevation language the featured card/notify-toggle-on state already use to every other raised surface — the default (non-featured) light-window-card, the location card, the popover (already has one; tune to match the new shared scale), and default (non-"on") buttons on hover/focus. Define the scale as 2–3 shadow tokens (e.g. `--shadow-sm`, `--shadow-md`) rather than repeating ad hoc `box-shadow` values, so the depth language is consistent and easy to keep that way.
- **Gradients**: apply a restrained gradient (not a flat fill) to the featured-card background and re-tune the existing ambient background radial-gradient to work with the new palette values. Keep the gradient subtle — a soft lightening/darkening across the fill, not a visible hard-edged band.
- Verify shadow/gradient additions don't change any previously-verified text contrast ratio (a gradient background means contrast must hold across its whole range, not just one sampled point — check both ends).

## 3. Diagram colour/state transitions

- Current behaviour: `renderTransitionDiagram` fully rebuilds the SVG's `innerHTML` on every call (every 30s tick, and on real state changes) — new DOM nodes can't CSS-transition from a prior state that no longer exists.
- Key realization: a given segment's *kind* (and therefore colour) is fixed for the ~20+ hours its combined window is displayed — only the **position marker** (`nowFraction`-driven) genuinely changes on every tick, and only the *marker's* colour changes when `currentKind` flips (entering/leaving a golden/blue segment).
- Refactor: keep full-rebuild behaviour for a genuinely new combined window (segment structure actually changes), but for same-window re-renders (the common case — most 30s ticks), update the existing marker `<circle>`'s `cx`/`cy`/`stroke` attributes in place via direct DOM calls instead of replacing it, so a CSS `transition: cx 0.6s linear, cy 0.6s linear, stroke 0.6s ease` on the marker actually has continuity to animate from/to.
- Add the same `transition: stroke 0.4s ease` at the segment level too, defensively, for the rarer case where a segment's own colour does change within a reused render.
- Respect `prefers-reduced-motion`: disable the transition (instant jump) rather than removing the correctness of the position/colour update.

## 4. Location card expand/collapse animation

- Technique: CSS `::details-content` pseudo-element + `@starting-style`, animating `block-size`/`opacity` on `<details id="location-details">`'s content. This is the spec-correct, JS-free way to animate native `<details>` — and critically, it degrades automatically: browsers without `::details-content` support simply keep today's instant native toggle, exactly the graceful-degradation behaviour `tech-stack.md` requires. No JS changes needed.
- Verify: the `[open]` chevron rotation (already animated) still feels coordinated with the new content reveal, not racing ahead of or lagging behind it.

## 5. Popover fade/scale animation

- Technique: same `@starting-style` + `transition-behavior: allow-discrete` approach, animating `opacity`/`transform: scale()` on `#transition-popover` through its `hidden` attribute toggling (which maps to `display: none` — normally untransitionable without this pairing). Falls back to today's instant show/hide on unsupported browsers.
- Verify this doesn't interfere with the Phase 10 focus-management fix (focus still moves to the Close button on open, returns to the triggering segment on close) — the animation is purely visual, must not change the timing of focus-management logic in a way that breaks it (e.g. don't gate focus-move on animation-end).

## 6. Featured card relocation animation

- Current behaviour: `updateFeaturedCard` in `js/app.js` relocates a card via `insertBefore`/`appendChild` — an instant DOM move with no visual continuity.
- Technique: FLIP (First, Last, Invert, Play) — capture the card's bounding rect before the move, perform the move, capture the new rect, then apply an inverse CSS `transform` and animate it to identity via `requestAnimationFrame` + a CSS transition. Vanilla JS/CSS, no library.
- Respect `prefers-reduced-motion`: skip the animation, perform the instant move exactly as today.

## 7. Testing

- Contrast: full re-run of the Phase 10 audit script against every new/changed colour value (base palette, featured fills, any new shadow/gradient-adjacent text pairing) — every result recorded in validation.md.
- `prefers-reduced-motion`: verify each of the four new animations is disabled/instant under the reduced-motion media query, via CDP emulation.
- Fallback verification: confirm each CSS-only technique (`::details-content`, popover `@starting-style`) has the correct *unsupported-browser* behaviour by checking `CSS.supports()` for the relevant features, and/or by disabling them and confirming instant-but-correct behaviour persists.
- Visual verification: screenshots in both themes, at mobile and the Phase 10 breakpoint width, for the new palette, depth treatment, and each animation's start/mid/end state where feasible to capture.
- Regression: full pass over existing functionality (notify/share toggles, location search, offline behaviour, featured-card logic, diagram interactivity) to confirm nothing broke.
- Zero console errors across every check, verified via CDP.
