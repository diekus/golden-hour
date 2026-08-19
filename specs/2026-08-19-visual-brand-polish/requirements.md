# Requirements — Phase 11: Visual & brand polish

## Scope

Final colour palette, animations/transitions between light states, and overall interaction polish per `prompts/BRAND_DESIGN.md`, per `specs/roadmap.md` Phase 11. Follows Phase 10 (accessibility & responsive audit, merged) — every colour decision here must hold the WCAG AA bar Phase 10 established, not regress it.

## Decisions (from clarifying questions)

1. **Visual direction: add depth.** `BRAND_DESIGN.md`'s previously-empty "VISUALS" section is now filled in (see that file) — shadow-based elevation on raised surfaces, restrained gradients on the featured/ambient glow surfaces, motion carrying state changes, restraint as the governing rule throughout.
2. **Palette: "Marigold & Twilight"**, chosen from a 4-way visual comparison (rendered against the app's real light/dark neutrals, with WCAG ratios computed for each candidate):
   - Golden hour accent: `#f2a52c` (dark theme), `#a8640a` (light theme).
   - Blue hour accent: `#6584e6` (dark theme), `#31469e` (light theme).
   - Featured/spotlight fills reuse these same values directly (`#f2a52c` gold, `#31469e` blue) rather than separate bespoke tones — see plan.md §1 for the full before/after token list and re-verified contrast numbers.
3. **Animation scope: all four** — diagram colour/state transitions, location card expand/collapse, popover fade/scale, featured card relocation. See plan.md for the specific technique behind each; all four are real, working animations, not just CSS declarations that never fire.

## Synced with parent specs

- `specs/roadmap.md` Phase 11 line is the direct scope source.
- `prompts/BRAND_DESIGN.md` is updated in this same change (COLOURS finalized with hex values, VISUALS filled in) — this phase both consumes and completes that spec.
- `specs/tech-stack.md` core principles: "standard web only... no frameworks" — every animation technique here is vanilla CSS/JS, no animation library. "Progressive enhancement" and "graceful degradation... any cutting-edge API adopted later must ship with a working fallback, not a broken experience" directly shape the animation implementation choices below (each uses a technique that degrades to today's instant behaviour on unsupported browsers, never a broken one).
- `mission.md` goal 1, "instant clarity" / goal 4, "field-ready reliability": motion is polish, not a gate — nothing here may delay or obscure the core "is it golden hour right now?" answer. A photographer checking one-handed in the field is still the bar.
- Phase 10's WCAG AA contrast work is a hard constraint, not a suggestion to reconsider — every new/changed colour value in this phase is re-verified against the same 3:1 (graphical/UI-boundary) and 4.5:1 (text) thresholds before shipping.

## Behavioural constraints

- **`prefers-reduced-motion: reduce`** disables or instantly-completes every new animation introduced in this phase, matching the existing ambient-pulse precedent (`css/styles.css`'s current `@media (prefers-reduced-motion: reduce)` block).
- **Graceful degradation is structural, not a fallback code path bolted on**: each animation technique is chosen specifically because unsupported browsers naturally get today's instant behaviour (no animation) rather than a broken/half-applied state. No animation may ever leave the UI in a visually incorrect or stuck state on any browser.
- **No new dependency, no build step** — every technique is native CSS/JS available directly in the browser.

## Non-goals for this phase

- Any structural layout change beyond what Phase 10 already established (its 768px breakpoint stands as-is).
- New icons, copy, or functional behaviour — this phase is visual/motion polish over existing features, not new capability.
- Additional colour palette exploration beyond the chosen "Marigold & Twilight" direction.

## Open questions

None outstanding.
