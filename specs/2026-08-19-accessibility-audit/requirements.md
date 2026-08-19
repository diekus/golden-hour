# Requirements — Phase 10: Accessibility & responsive audit

## Scope

WCAG compliance pass across the whole app as it exists after Phases 0–9: contrast testing, keyboard navigation, screen-reader labelling, `alt` text audit, and responsive layout testing across mobile/desktop breakpoints, per `specs/roadmap.md` Phase 10.

This is an audit-and-fix phase, not a new-feature phase — it covers every screen/state built so far (diagram, popover, location card + search, all light/golden/blue-hour cards, featured card, notify toggle, share button, offline indicator, weather warning), in both light and dark themes.

## Decisions (from clarifying questions)

1. **Fix as found.** Issues get fixed in the same pass they're discovered, with evidence in `validation.md` — consistent with every prior phase's testing approach (e.g. the contrast bug caught and fixed during Phase 7).
2. **Colour-only cues addressed now, not deferred.** The diagram's gold/blue segments currently distinguish state by colour alone (WCAG 1.4.1). Fixed in this phase via a redundant non-colour cue (see plan.md) rather than pushed to Phase 11.
3. **Screen-reader verification via CDP's Accessibility domain**, not a real NVDA/VoiceOver session (unavailable in this environment). This inspects the actual computed accessibility tree (roles, accessible names, states) programmatically — it catches the same markup issues a screen reader would surface, consistent with this project's established real-browser-automation testing methodology.
4. **Responsive: proactive breakpoint added**, not verification-only. A modest breakpoint widens the content measure on tablet+/desktop viewports, on top of testing the existing fluid layout across a wide range of widths (320–1440px) for reflow/overflow problems.

## WCAG target

**AA**, matching the level every prior phase's contrast checks were already run against (e.g. the featured-card and notify-toggle colour decisions) — this phase doesn't newly introduce or reduce that target, just applies it comprehensively and systematically instead of ad hoc.

## Known findings identified while writing this spec

Code review before implementation already surfaced two concrete, real issues worth stating up front (not exhaustive — the implementation pass will find more):

1. **`js/transition-diagram.js`**: the `<svg class="transition-svg">` wrapper has `aria-hidden="true"`, but its own child segments (`.transition-segment--interactive`) are individually focusable (`tabindex="0"`) with their own `role="button"`/`aria-label`. `aria-hidden="true"` on an ancestor removes the *entire* subtree from the accessibility tree regardless of a descendant's own role/tabindex — so these segments are keyboard-focusable "phantom" stops that a screen reader user would never encounter as distinct interactive elements. This is a well-documented anti-pattern (matches axe-core's `aria-hidden-focus` rule). Needs fixing: expose the interactive segments to the accessibility tree while keeping the genuinely decorative parts (boundary labels, sun icon, position marker, non-interactive neutral segments) hidden from it.
2. **`index.html`'s `#transition-popover`** has `role="dialog"` but (from code review) no evident focus management — focus doesn't appear to move into it on open or return to the triggering segment on close. A `dialog` role conventionally implies that kind of focus handling; either add it properly, or reconsider whether `dialog` is the right role for what's actually a lightweight, non-modal, non-focus-trapping popover (e.g. a less presumptive role). Decided during implementation based on what best matches the popover's actual (intentionally lightweight) behaviour.

## Synced with parent specs

- `specs/roadmap.md` Phase 10 line is the direct source of scope.
- `tech-stack.md` PWA requirements: "Accessibility: WCAG-compliant, contrast-tested colours, `alt` text on every image" and "Responsive layout, optimised for both mobile and desktop" — this phase is where those standing requirements get systematically verified across everything built since, not just spot-checked per-phase as each feature landed.
- `mission.md` goal 4, "field-ready reliability": a photographer checking the app one-handed, in poor light, or via assistive technology in the field is squarely within who this needs to work for.

## Non-goals for this phase

- A structural multi-column desktop layout redesign — the proactive breakpoint (decision 4) widens the existing single-column measure; a genuine layout reflow belongs to Phase 11 ("Visual & brand polish"), which already owns overall interaction/layout polish per `BRAND_DESIGN.md`.
- A real assistive-technology session (NVDA/VoiceOver) — out of scope per decision 3's environment constraint.
- Any new feature or user-facing content change beyond what's needed to fix a genuine accessibility/responsive finding.

## Open questions

None outstanding.
