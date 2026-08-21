# Plan — Phase 12: Compass

## 1. Device-orientation helper module
- Add `js/compass.js`, a small DOM-adjacent-but-pure(ish) module, no astronomical calculation, no dependency on `light-times.js`:
  - `isOrientationSupported()` — `'DeviceOrientationEvent' in window`.
  - `needsExplicitPermission()` — `typeof DeviceOrientationEvent?.requestPermission === 'function'` (iOS Safari 13+).
  - `async requestPermission()` — calls it, returns `'granted' | 'denied' | 'unsupported'`; guards the call in a `try/catch` (throws on non-HTTPS/non-gesture contexts).
  - `subscribeHeading(onHeading, onUnavailable)` — attaches a `deviceorientationabsolute` listener where supported (Chromium/Android, gives `event.alpha` as a true heading directly), else a `deviceorientation` listener reading `event.webkitCompassHeading` (iOS, already true-north-relative) or, as a last resort, `event.alpha` when `event.absolute === true`, compensated by `screen.orientation?.angle ?? 0` so portrait/landscape rotation doesn't skew the reading. Starts a ~1.5s timer; if no qualifying event has arrived by then, calls `onUnavailable()` once and stops listening. Returns an `unsubscribe()` function that removes whichever listener was attached and clears the timer.
- No UI, no SVG — this module only answers "is a live heading available, and if so what is it," so it's independently testable the same way `light-times.js`/`transition-window.js` are.

## 2. Compass rendering inside `js/components/light-window-card.js`
- Compute `const hasCompass = Boolean(start?.azimuth != null && end?.azimuth != null) && (accent === 'golden' || accent === 'blue');` in `_render()` — derived from data already present, no new field threaded through `js/app.js`.
- Add a `compassMarkup(start, end, accent)` helper (same file, alongside the existing `formatReading`/`formatWeather` helpers) building:
  - An inline SVG rose: outer circle, N/E/S/W (+ intercardinal tick marks), a `<g class="compass-rotor">` group containing the two arrows (start: hollow/lighter stroke, end: solid, both `accentColor`), so the rotor group alone is what gets a `transform: rotate(...)` for live mode — the N/E/S/W labels stay fixed to the card frame in an *actual* compass, so it's the rotor that turns, not the frame. (Verify against a real compass app's behaviour before finalising which layer rotates — see plan item 6.)
  - A plain-text `<p class="compass-readout">` restating both readings ("Start 112° ESE, 4° above horizon · End 268° W, 2° above horizon"), always present regardless of SVG support, for the non-visual/quick-read case.
  - A `<p class="compass-status">` for the live-mode indicator, empty by default.
  - All wrapped in `<details class="compass-details"><summary class="compass-toggle">…</summary><div class="compass-panel">…</div></details>`.
- `_render()` only builds this markup once per data change (same as the rest of the card); it does not itself hold the live subscription — that's wired imperatively after the innerHTML is set (step 3), same pattern the card would need for any interactive sub-element since `_render()` fully replaces shadow DOM content on every data update.

## 3. Imperative wiring (open/close, permission, live subscription)
- In `_render()`, after setting `shadowRoot.innerHTML`, if `hasCompass`, query the `<details class="compass-details">` and `<summary class="compass-toggle">` and attach:
  - A `click` listener on the summary — *before* the native toggle completes — that, on first open, if `needsExplicitPermission()` and permission hasn't been asked yet this session, calls `requestPermission()` synchronously within the handler (preserves the iOS user-gesture requirement).
  - A `toggle` listener on the `<details>` — when it becomes open, call `startLiveHeading()`; when it becomes closed, call `stopLiveHeading()`.
- `startLiveHeading()`: if `!isOrientationSupported()`, do nothing (stays static, no status text). Else call `subscribeHeading(onHeading, onUnavailable)`, store the returned `unsubscribe` on the instance (`this._compassUnsubscribe`). `onHeading(heading)` sets `rotor.style.transform = 'rotate(...)'` directly (no re-render) and sets the status text to "Following your device" (only set once, not every tick, to avoid redundant DOM writes). `onUnavailable()` leaves the rose static and status text empty.
- `stopLiveHeading()`: calls `this._compassUnsubscribe?.()`, clears it, resets `rotor.style.transform` and the status text back to blank/static.
- `disconnectedCallback()`: also calls `stopLiveHeading()`, so a card removed from the DOM (e.g. the featured-card relocation in `js/app.js`) never leaks a sensor listener.
- Because `_render()` replaces the shadow DOM wholesale on every data change (e.g. the periodic weather/transition refresh), and a fresh `<details>` element defaults to closed, a live subscription active before a re-render must be stopped and, if the panel was open, restarted against the new DOM nodes — handle by calling `stopLiveHeading()` unconditionally at the top of `_render()` before rebuilding, and re-opening/re-subscribing after, *only* if the previous `<details>` was open at the time of re-render (read its `.open` state before clearing `innerHTML`).

## 4. Styling (within the component's own `<style>` block)
- Compass toggle: small icon + text, styled consistently with the existing card typography (`textColor`/`mutedColor` variables already computed in `_render()`), not a full `button` element chrome — a `<summary>` styled like a tappable row, mirroring `location-card summary`'s treatment in `css/styles.css` (list-style removed, chevron via a small rotated-border triangle).
- Compass panel disclosure animation: same `::details-content` + `@starting-style` technique as `.location-card` in `css/styles.css`, duplicated inside this component's shadow `<style>` (shadow DOM can't reach into the light-DOM stylesheet, so the rule has to be re-declared here) — self-contained by construction, no cross-boundary dependency introduced.
- Rose sizing: fixed `viewBox`, scales to the card's width via CSS, capped max-size so it doesn't dominate a narrow mobile card.
- `prefers-reduced-motion: reduce` disables the disclosure animation and the live-rotation CSS transition (the rotor's `transform` still updates instantly on each heading tick, just without an eased transition).

## 5. Service worker
- Add `/js/compass.js` to `sw.js`'s `APP_SHELL`, bump `CACHE_NAME` (v27).

## 6. Verify
- Numerically check rose placement: for a handful of azimuth values (0/N, 90/E, 180/S, 270/W, and a couple of intercardinal values matching real `azimuthLabel` outputs from `light-times.js`), confirm the arrow's computed SVG angle matches the expected compass position (0° at top, clockwise).
- Numerically check the live-rotation transform: for a few synthetic heading values, confirm the rotor's rotation places a known azimuth in the correct on-screen direction relative to "up" (device facing).
- Confirm, via a real mobile browser (or a `deviceorientation` event dispatched manually in devtools if a real device isn't available during review), that opening a compass panel requests permission (iOS) or starts receiving events (Android) and the rose visibly rotates when the device/simulated event changes.
- Confirm on desktop (no orientation events) that the rose stays static, no permission prompt appears, and no console errors/warnings occur from the failed feature-detection path.
- Confirm a card's own re-render while its compass is open (periodic weather/transition refresh) does not stack a second subscription on top of the existing one, and that closing a panel or disconnecting the card from the DOM always drops its listener count back to zero — verified via window-level `addEventListener`/`removeEventListener` instrumentation during automated testing, not just visual inspection. (Two *different* cards may legitimately be open and live at the same time — nothing enforces exclusivity across cards, and that's fine.)
- Confirm the periodic 30s transition refresh (`js/app.js`'s `renderTransition`/weather updates that touch `card.data`) doesn't collapse or visually flicker an already-open compass panel, and that a live subscription active before that refresh survives it (per plan item 3's re-open handling).
- Confirm sunrise/sunset cards show no compass toggle at all.
- Confirm `<details>/<summary>` keyboard operability (Tab to focus, Enter/Space to toggle) and that the SVG rose is `aria-hidden="true"` with the text readout as its accessible equivalent.
- Confirm no console errors, and `sw.js`'s `APP_SHELL`/`CACHE_NAME` are updated.
