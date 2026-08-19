# Validation — Phase 8: Installability & PWA polish

Implementation is done and mergeable when every item below is checked, with concrete evidence (screenshot, console output, or explicit test description) — not just "looks right".

## Manifest

- [x] `manifest.webmanifest` still parses with no errors/warnings: `Page.getAppManifest` via CDP returned `errors: []`.
- [x] `display_override: ["window-controls-overlay", "standalone"]` present and recognised — read back correctly from the parsed manifest data.
- [x] `launch_handler: { client_mode: "focus-existing" }` present and recognised — read back correctly from the parsed manifest data.
- [x] Standard installability criteria still pass: `Page.getInstallabilityErrors` returned an empty error list.
- [x] `icons`, `theme_color`, `background_color` unchanged from before this phase (verified by diff — only `display_override` and `launch_handler` were added to the manifest).

## Theme colour

- [x] With `prefers-color-scheme: dark` emulated, `getComputedStyle(document.body).backgroundColor` read `rgb(20, 22, 26)` — exactly `#14161a`, matching the dark `theme-color` meta tag's content.
- [x] With `prefers-color-scheme: light` emulated, computed background read `rgb(247, 245, 240)` — exactly `#f7f5f0`, matching the light `theme-color` meta tag's content (cross-checked against the live `--color-bg` value, not assumed from memory).
- [x] Exactly two `theme-color` meta tags exist, each with its own `media` attribute (`(prefers-color-scheme: dark)` / `(prefers-color-scheme: light)`) — no unconditional legacy tag left behind.

## `window-controls-overlay`

- [x] The `@media (display-mode: window-controls-overlay)` CSS block exists in `css/styles.css`, repositioning `header` (fixed, sized via `env(titlebar-area-*)` with a 2.25rem fallback) and offsetting `main` by the same height.
- [x] **Testing note (as anticipated in plan.md):** this Chrome/CDP version does not support emulating `display-mode: window-controls-overlay` via `Emulation.setEmulatedMedia` (`window.matchMedia('(display-mode: window-controls-overlay)').matches` stayed `false` after attempting it). Fell back to the plan's documented alternative: manually injecting a `<style>` block replicating the media query's rules (unconditionally, via `!important`) on the live page and inspecting the result. This is a direct test of the CSS declarations themselves, not a true `display-mode` trigger — the real trigger is standard, well-supported browser behaviour (matching `env()`/`display-mode` per spec) that this project doesn't need to independently re-verify, only the custom CSS built on top of it.
- [x] **Bug found and fixed during this pass:** the initial `.logo { height: 70%; }` silently failed to resolve — percentage height requires a definite-height ancestor, and none of `header`'s descendants (`h1` → `picture` → `img`) had one, so the browser fell back to the image's natural (much larger) size, visibly overlapping/overflowing the 36px header strip in the first test screenshot. Fixed by switching to a fixed unit (`height: 1.5rem`). Re-verified: `logoHeight: 24px` vs `headerHeight: 36px`, `logoFitsInHeader: true`.
- [x] Drag region: `-webkit-app-region: drag` (plus the unprefixed `app-region: drag` for forward compatibility) is present on the repositioned `header` in the WCO media query.
- [x] Content readability: post-fix screenshot shows the logo compact, undistorted, and fully contained within the title-bar strip, with the diagram starting immediately below with no gap or overlap.

## Regression / fallback correctness

- [x] Normal desktop width, non-WCO display mode: header renders identically to before this phase — screenshot taken on a fresh (no injected style) load shows the same large centred logo as prior phases.
- [x] Mobile width (375px): header unaffected — screenshot confirms the full-size logo, unaffected by the WCO-only CSS (which is scoped to `display-mode: window-controls-overlay`, never active on mobile).
- [x] Both light and dark themes: theme-color verification above exercised both; header layout itself doesn't vary by theme (uses `var(--color-bg)`, already theme-aware).
- [x] Zero console errors across every check in this pass (explicitly collected via `Runtime.exceptionThrown`/`consoleAPICalled` listeners each run).

## Sign-off

- [x] All boxes above checked with evidence noted inline.
- [x] Deviations from plan: (1) WCO `display-mode` emulation wasn't available in this CDP/Chrome version — used the plan's documented fallback (manual CSS injection) instead, as anticipated. (2) Found and fixed a real bug in the WCO logo sizing (`height: 70%` → `height: 1.5rem`) that wasn't part of the original plan but was necessary for the feature to actually work.
