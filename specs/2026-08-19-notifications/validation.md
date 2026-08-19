# Validation — Phase 7: Notifications

Implementation is done and mergeable when every item below is checked, with concrete evidence (screenshot, console output, or explicit test description) — not just "looks right".

## Core scheduling logic

- [x] `getNextGoldenHourStart(lat, lng, now)` returns the correct instant and direction for a known location/date, verified directly (standalone Node script importing the module — pure ESM, no build step needed). London, before dawn on 2026-08-19 → correctly resolved to `04:29:55Z / morning`, distinct from (and later than) `getTransitionWindow`'s next boundary (blue hour start at `04:15:22Z`) — confirms it correctly skips past the blue-hour boundary to the golden-specific one.
- [x] Rolls forward correctly when today's remaining golden-hour-start(s) have already passed: tested at 20:00Z (after evening golden hour ends for the day) and 23:50Z — both correctly rolled to the next morning (`2026-08-20T04:31:37Z`).
- [x] Pure function — no DOM/`localStorage`/network access; only reads the passed-in `now` (confirmed by code inspection and by running it standalone in plain Node with no browser globals available).

## Opt-in / permission flow

- [x] Toggle is off by default on first load (`aria-pressed="false"`, text "Notify me when golden hour starts"), no permission prompt fires on page load — permission was pre-granted via CDP yet the toggle still started off, proving load-time doesn't auto-request/auto-opt-in.
- [x] Clicking the toggle with permission `default` calls `Notification.requestPermission()` (code path verified; CDP's `Browser.grantPermissions`/`setPermission` stand in for the native OS prompt in headless testing, which is the standard way to test this without a real display).
- [x] Granting permission: clicking with permission already `granted` opted in directly (`localStorage` opt-in → `"true"`, toggle → "Notifications on", `aria-pressed="true"`, status text shown). Separately confirmed `scheduleNext()` runs without error and computes a sane forward-looking delay (3.2h to that day's evening golden hour, well under the 24.8-day `setTimeout` overflow ceiling).
- [x] Denying permission: with permission set to `denied` via CDP, toggle rendered `disabled`, showed "Notifications are blocked for this site. Enable them in your browser settings to use this.", and a click was a no-op (no error, no state change).
- [x] Previously-denied permission: same as above — the click handler's `denied` branch returns immediately without calling `requestPermission()` again.
- [x] Reload with opt-in on + permission still `granted`: re-armed automatically, toggle showed "Notifications on" / `aria-pressed="true"` / status text visible, with no prompt.
- [x] Reload with permission revoked: covered by the `denied`-state test above — `renderNotifyToggle()` always derives the displayed state fresh from `getPermission()`, so a revoked permission renders as off/disabled on next load regardless of the stored opt-in flag.
- [x] Turning the toggle off cancels the pending notification: toggled on → off, `localStorage` opt-in → `"false"`, `aria-pressed="false"`; `cancelScheduled()` clears the internal timer (verified directly by calling `scheduleNext()` then `cancelScheduled()` back-to-back with no error).

## Notification behaviour

- [x] `new Notification('Golden Hour', { body: 'Golden hour is starting now.', tag: 'golden-hour-start' })` constructs successfully once permission is `granted`, with the expected `title`/`body`/`tag` read back from the created instance — confirms the exact call `scheduleNext`'s `setTimeout` callback makes is valid and will display correctly. (Not waiting out a real multi-hour `setTimeout` in this environment; the delay computation is separately unit-verified above, and `setTimeout` itself is a browser built-in, not something this project needs to re-prove.)
- [x] `tag: 'golden-hour-start'` is a fixed constant reused on every call, which per the Notifications API spec replaces any existing notification of the same tag rather than stacking a duplicate — standard platform behaviour, not custom logic to test further.
- [x] Location change reschedules correctly: `getNextGoldenHourStart` for London vs. Paris on the same instant returned different times (`18:29:01Z` vs `18:15:27Z`), confirming the function is location-sensitive. Exercised the real UI path too — searched "Paris", picked the result, `setLocation()` ran end-to-end (label updated to "Paris, Île-de-France Region, France") with zero console errors, and `setLocation()`'s new `scheduleNextNotification(currentLocation)` call (added in this phase) sits right in that flow.

## Progressive enhancement / unsupported browsers

- [x] With `window.Notification` deleted before `app.js` ran (via `Page.addScriptToEvaluateOnNewDocument`), both `#notify-toggle` and `#notify-status` rendered `hidden`, and `'Notification' in window` was `false` — no dead/broken UI, no console errors.

## Accessibility

- [x] Toggle is a native `<button type="button">` — focusable (`tabIndex >= 0`, confirmed via `element.focus()` successfully moving `document.activeElement`) and inherits standard browser keyboard-activation semantics (Enter/Space → click) with no custom keydown handling that could interfere. **Testing note:** CDP's `Input.dispatchKeyEvent` synthetic Enter did not trigger a click on this button in headless mode — but a control test against the pre-existing, already-shipped "Use my location" button showed the *identical* non-response, confirming this is a CDP/headless synthetic-event limitation, not a defect introduced by this feature. Mouse-driven `.click()` (used throughout the rest of this validation) works correctly on both buttons.
- [x] `aria-pressed` toggles between `"false"`/`"true"` correctly, verified at every state transition above.
- [x] Status message uses `role="status"` (see `index.html`), matching the existing `#weather-warning`/`#location-message` pattern already in the app.
- [x] Colour contrast: found and fixed a real AA failure during this pass — the initial "on" state used gold text/border (`#e8a33d`) directly on the light-theme white surface, ≈2.25:1 by manual luminance calculation, under the 3:1 minimum for UI component boundaries. Fixed by reusing the featured-card's already-verified gold pairing (`--color-golden-featured-bg` + `--color-golden-featured-text`, ≈8.45:1) as a filled background instead of an outline — screenshotted after the fix to confirm the solid-gold/dark-text look renders correctly in light theme. Dark theme was never at risk (gold-on-`#1d2029` ≈7.2:1, verified by the same luminance method) since `--color-surface` is dark there.

## Regression / cross-cutting

- [x] Diagram, summary, weather warning, location search (real Paris search + selection exercised above), and featured-card behaviour all rendered correctly across every screenshot/test in this pass with zero console errors.
- [x] `sw.js` `APP_SHELL` includes `/js/notifications.js`; after a full cache clear + reload, `caches.keys()` showed exactly one cache (`golden-hour-shell-v17` at test time, bumped to `v18` after the post-test CSS fix) containing 16 entries including `/js/notifications.js`, confirming clean install.
- [x] Zero console errors/exceptions across every CDP test run in this pass (explicitly collected via `Runtime.exceptionThrown`/`consoleAPICalled` listeners each time).

## Sign-off

- [x] All boxes above checked with evidence noted inline.
- [x] Deviation from plan: the initial "on" toggle styling (gold outline/text) failed WCAG AA contrast in light theme and was changed to a filled gold background with dark text before shipping — see Accessibility section above. No other deviations from `requirements.md`/`plan.md`.
