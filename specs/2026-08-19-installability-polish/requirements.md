# Requirements — Phase 8: Installability & PWA polish

## Scope

Manifest refinement, `launch_handler`, and `window-controls-overlay` (with fallback), per `specs/roadmap.md` Phase 8: "Manifest refinement (icons, splash screens, theme colours), `shortcuts`, `launch_handler`, `window-controls-overlay` with fallback."

This is Phase 8, following Phase 7 (notifications, merged).

## Decisions (from clarifying questions)

1. **Shortcuts: skipped for this phase.** Golden Hour is a genuine single-view utility (per `mission.md`'s non-goals: "not a multi-day or multi-location trip planner", single current-location focus) — there is no second action or view for a home-screen shortcut to jump to that the app's own launch doesn't already provide. Adding one would be a manifest entry for its own sake. `tech-stack.md`'s "Advanced web capabilities" section is amended (see below) to reflect this reconsideration; revisit only if a genuine second action is added later (e.g. Phase 9's Web Share could plausibly justify one).
2. **`window-controls-overlay`: implemented properly**, not just declared. `display_override` gains `["window-controls-overlay", "standalone"]`, and the existing centred-logo `<header>` is repositioned into the title-bar area (via `env(titlebar-area-*)`) with a draggable region, behind an `@media (display-mode: window-controls-overlay)` block — so it only affects supporting desktop installs and leaves every other context (mobile, browser tab, unsupported desktop browsers) completely unchanged. This satisfies the roadmap's explicit "with fallback" requirement and `tech-stack.md`'s graceful-degradation principle: no broken/overlapping layout on any platform.
3. **Theme colour adapts to light/dark.** A second `<meta name="theme-color">` is added with `media="(prefers-color-scheme: light)"`, alongside the existing dark one (now explicitly scoped to `media="(prefers-color-scheme: dark)"`), so installed-app/browser-chrome colouring matches the app's own already-automatic CSS light/dark switching (`tech-stack.md`: "Light/dark theme follows the system automatically ... no manual in-app switch"). The manifest's own `theme_color`/`background_color` fields have no media-query mechanism in the JSON manifest spec, so they stay fixed at the current dark value — this only governs the (very briefly shown) install splash screen, not day-to-day browser chrome, so the trade-off is minor and is not a decision point requiring a different value.
4. **Icon set: left as-is.** The existing 192×192 (any), 512×512 (any), and 512×512 (maskable) icons already meet standard installability criteria and cover the common display sizes. No gap identified that would justify sourcing/verifying additional sizes this phase.

## Additional decisions (no ambiguity, following `tech-stack.md` directly)

- **`launch_handler`**: `{ "client_mode": "focus-existing" }` — `tech-stack.md` already states this explicitly ("focus the existing window rather than spawning duplicates, since this is a single-view utility"), so this is a direct implementation, not a new decision.
- **Splash screens**: interpreted as the standard Android/Chromium auto-generated splash screen, built from the manifest's existing `name`, `background_color`, `theme_color`, and icons (already present and correct) — not bespoke iOS `apple-touch-startup-image` assets, which would need a large matrix of device-specific static images the project doesn't have and `tech-stack.md` doesn't call for. "Splash screens" in the roadmap's Phase 8 line is satisfied by the manifest fields already being correct, not by new asset production.

## Synced with parent specs

- `specs/roadmap.md` Phase 8 line is the direct source of this phase's scope; all four roadmap items (manifest refinement, shortcuts, `launch_handler`, `window-controls-overlay`) are addressed above (shortcuts explicitly by skipping, with rationale).
- `tech-stack.md` "Advanced web capabilities (FUGU)" section: this phase's shortcuts decision **amends** that section's "Shortcuts — recommended" line (see the amendment added directly to `tech-stack.md`, pointing back to this spec). `launch_handler` and the general graceful-degradation principle are implemented exactly as already specified there — no other amendments needed.
- `tech-stack.md` PWA requirements: "Responsive layout, optimised for both mobile and desktop" and the graceful-degradation section directly motivate keeping `window-controls-overlay` scoped to a real, fallback-safe implementation rather than a bare manifest declaration.

## Non-goals for this phase

- `shortcuts` manifest member (deferred, see decision 1).
- New/expanded icon assets.
- iOS-specific splash screen images.
- Any change to the app's actual functionality — this phase is installability/chrome polish only.

## Open questions

None outstanding.
