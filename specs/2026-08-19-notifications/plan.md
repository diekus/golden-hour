# Plan — Phase 7: Notifications

## 1. Compute the next golden-hour-start instant

- Extend `js/transition-window.js` (or add a small sibling function) with `getNextGoldenHourStart(lat, lng, now)`, returning `{ time, direction }` (`direction: 'morning' | 'evening'`).
- Reuse `combinedWindows()`'s existing per-direction shape: golden-hour-start is `combined.transition` when `secondKind === 'gold'` (morning case) or `combined.start` when `firstKind === 'gold'` (evening case).
- If the *next* combined window's golden-hour-start has already passed relative to `now`, roll forward the same way `getTransitionWindow` already does (peek ~20h ahead) until a future instant is found. Keep this a pure function (no DOM/localStorage access) so it's easy to test directly.

## 2. Notification permission + opt-in state module

- New file `js/notifications.js`:
  - `isSupported()` — `'Notification' in window`.
  - `getOptIn()` / `setOptIn(bool)` — `localStorage` read/write (own key, e.g. `gh-notify-opt-in`), separate from the location cache.
  - `getPermission()` — wraps `Notification.permission` (`'default' | 'granted' | 'denied'`).
  - `requestPermission()` — wraps `Notification.requestPermission()` (must be called from a user gesture, i.e. the toggle's click handler).
  - `scheduleNext({ lat, lng, timezone })` — cancels any pending timer, computes the next golden-hour-start via step 1, sets a `setTimeout` to fire a `new Notification(...)` at that instant, then re-invokes itself to schedule the *following* one. Returns nothing; keeps its timer handle in module state so it can be cancelled.
  - `cancelScheduled()` — clears the pending timer, if any.
- Keep this module free of direct references to `els`/app.js globals so it stays independently testable (mirrors the existing `weather.js`/`location.js` module style).

## 3. Notification content

- Title: `"Golden Hour"`.
- Body: `"Golden hour is starting now"` (morning) / `"Golden hour is starting now"` (evening) — direction doesn't need to be user-facing text since "starting now" is self-evident at the moment it fires; keep body copy simple. (Confirm wording during implementation if a morning/evening distinction reads better — not a blocking decision.)
- `tag: 'golden-hour-start'` so a second one can't stack on top of an unread one.
- No `icon` dependency on anything not already in `images/icons/` (reuse the existing app icon).

## 4. UI: toggle control

- Add a small toggle button next to `#transition-summary` inside `#transition-section` in `index.html` (e.g. `<button id="notify-toggle" type="button" aria-pressed="false">`), plus a short status/help `<p>` under it for permission-denied or foreground-only messaging (mirrors the existing `#weather-warning` pattern of a `role="status"` paragraph).
- Style in `css/styles.css`: small, unobtrusive, consistent with existing button styling (`#use-my-location-btn`) rather than a new visual language. Reflect on/off state visually (e.g. via `aria-pressed` + a filled/outline treatment) and a `[disabled]`/muted state for the denied case.
- Hide the control entirely if `isSupported()` is false (progressive enhancement — no dead UI on unsupported browsers, per `tech-stack.md`'s core principles).

## 5. Wire into `js/app.js`

- Import the new modules; add `els.notifyToggle` / `els.notifyStatus`.
- On load: if unsupported, hide the control and stop. Otherwise reflect current `getPermission()`/`getOptIn()` into the toggle's visual state; if opted in and permission is still `granted`, call `scheduleNext(currentLocation)`.
- Toggle click handler:
  - If permission is `denied`: don't prompt; show the "enable in browser settings" message.
  - If permission is `default`: call `requestPermission()`; on `granted`, set opt-in true, update UI, call `scheduleNext`; on anything else, leave opt-in false and show the inline message.
  - If permission is `granted`: flip opt-in state; `scheduleNext` or `cancelScheduled` accordingly.
- On location change (existing `setLocation` flow): if opted in and permission is `granted`, call `scheduleNext(newLocation)` again so the pending timer targets the right place; otherwise no-op.

## 6. Service worker

- No changes needed — this phase's notifications are shown via the page-context `Notification` constructor while the tab is open, not via `ServiceWorkerRegistration.showNotification()`. Confirm `sw.js` doesn't need a `CACHE_NAME` bump beyond adding `js/notifications.js` to `APP_SHELL` (it's a new cacheable asset, same as any other module).

## 7. Testing

- Direct unit-style testing of `getNextGoldenHourStart` (temporary `export`, dynamic `import()`, revert after) against known coordinates/dates, same pattern used for prior phases.
- CDP browser test: grant notification permission via `Browser.grantPermissions` (or the page's own prompt flow where CDP can auto-accept), exercise the toggle, and verify via `Notification.permission`/DOM state rather than waiting for a real transition — schedule against a *simulated* near-future time (e.g. temporarily point the scheduling function at a `now` a few seconds before a fabricated transition) to observe an actual `Notification` firing without a multi-hour wait.
- Verify: toggle default-off, prompt-on-click (not on load), granted/denied paths, persistence across reload, cancellation on toggle-off, rescheduling on location change, hidden control on a simulated unsupported browser (delete `window.Notification` before load).
- Manual regression pass: confirm existing diagram/cards/weather/offline flows are unaffected.
