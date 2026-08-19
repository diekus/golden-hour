# Plan — Phase 8: Installability & PWA polish

## 1. Manifest refinement

- `manifest.webmanifest`: add `"display_override": ["window-controls-overlay", "standalone"]` — browsers that support WCO use it; every other browser (and any that don't understand `display_override` at all) falls through to the existing `"display": "standalone"`.
- Add `"launch_handler": { "client_mode": "focus-existing" }`, per `tech-stack.md`'s existing recommendation.
- Leave `icons`, `theme_color`, `background_color`, `name`, `short_name`, `description`, `start_url`, `scope` unchanged (already correct per requirements.md decisions).

## 2. Theme colour: light/dark adaptation

- `index.html`: replace the single `<meta name="theme-color" content="#14161a">` with two tags:
  - `<meta name="theme-color" content="#14161a" media="(prefers-color-scheme: dark)">`
  - `<meta name="theme-color" content="#f7f5f0" media="(prefers-color-scheme: light)">`
- Values must match `css/styles.css`'s `--color-bg` exactly for each scheme (`#14161a` dark default, `#f7f5f0` light override) — read both values directly from the stylesheet at implementation time rather than retyping from memory, in case they've drifted.

## 3. `window-controls-overlay` implementation

- `css/styles.css`: add an `@media (display-mode: window-controls-overlay)` block that:
  - Positions `header` using `env(titlebar-area-x, 0)`, `env(titlebar-area-y, 0)`, `env(titlebar-area-width, 100%)`, `env(titlebar-area-height, <sane fallback>)` so it occupies exactly the title-bar strip instead of its normal in-flow position.
  - Sets `-webkit-app-region: drag` on that header region so the window remains draggable (standard WCO requirement — without a drag region the custom title-bar area isn't movable).
  - Shrinks/repositions the logo to fit the shorter title-bar height (the current header is sized for normal in-flow display, not a ~32-40px strip).
  - Adds top padding/margin to `main` (or an equivalent offset) equal to the title-bar height, so page content doesn't render underneath the repositioned header.
- Everything above is scoped inside the `display-mode: window-controls-overlay` media query only — unsupported browsers, mobile, and normal desktop windows get zero CSS changes from this block, satisfying the roadmap's "with fallback" requirement by construction (not by a separate fallback code path).

## 4. Testing

- Manifest validity: verify via Chrome DevTools Application panel (or CDP equivalent) that the manifest parses with no errors/warnings, `display_override` and `launch_handler` are recognised, and installability criteria still pass.
- Theme colour: toggle `prefers-color-scheme` emulation (already a proven pattern from prior phases) and confirm the browser reads the correct `theme-color` meta tag for each scheme.
- `window-controls-overlay`: attempt CDP-based `display-mode` emulation (mirroring Chrome DevTools' Rendering-panel "Emulate CSS media feature display-mode" control, which includes a `window-controls-overlay` option) to screenshot the repositioned header. If this Chrome version/CDP surface doesn't expose that emulation, fall back to verifying the CSS block directly (computed styles under a manually-applied test class simulating the media query) and documenting the limitation honestly in validation.md, consistent with this project's established testing methodology.
- Regression: confirm normal (non-WCO) desktop, mobile-width, and both themes render the header exactly as before — this phase must not visibly change anything outside a real WCO-supporting installed context.
