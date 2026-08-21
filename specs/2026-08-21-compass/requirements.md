# Requirements — Phase 12: Compass

## Scope

Per `specs/roadmap.md` Phase 12: an expandable compass on each golden/blue hour card, showing where the light will fall (sun azimuth, and altitude, at the window's start and end) so a photographer can plan where to stand/point the camera *before* the window opens — not just react once it's already happening.

Requested concretely: in the golden hour and blue hour sections, a small affordance on each card expands the card fully to reveal a compass pointing at where the light will be shining, based on the existing azimuth/altitude data.

## Context (from parent specs)

- `specs/mission.md` goal 1 ("instant clarity") and the stakeholder note on professionals needing "dependable timing to brief clients or crews" — knowing *where*, not just *when*, extends the same value.
- `specs/mission.md`'s "why we're building it" section calls out competitor "compass overlays / AR" as feature bloat to avoid. Amended in this phase (see the parenthetical added there) to draw the line: this is a glance-based, opt-in, per-card direction reference reusing data the app already computes, not a persistent AR/live-camera overlay or a standalone planning surface. If this ever grows into a camera-viewfinder-style AR mode, that would cross back into the bloat the mission warns against and needs a fresh look.
- `specs/tech-stack.md`'s new "Compass (device orientation)" section (added this phase) — static rose baseline everywhere, live device-heading rotation as a progressive enhancement, inline SVG, no new dependency.
- `js/light-times.js` already computes `{ azimuth, azimuthLabel, altitude }` for every reading, including both ends of each golden/blue hour window — no new astronomical calculation is needed, only new UI.

## Decisions

1. **Where it appears:** only the four golden/blue hour window cards (`card-golden-morning`, `card-golden-evening`, `card-blue-morning`, `card-blue-evening`). Sunrise/sunset cards are single-instant readings, not windows, so there's no "start vs end" direction shift for a compass to usefully show — excluded by construction (derived from `accent` being golden/blue *and* both `start`/`end` readings being present, not a new data flag).
2. **Affordance and expansion mechanism:** a small toggle (icon + "Compass" label) inside each eligible card, using a native `<details>/<summary>` inside the card's shadow DOM — same disclosure idiom already used for the location card (`index.html`'s `#location-details`), reusing its animated open/close pattern. Opening it expands the card in place to reveal the compass panel; no navigation, no popover/modal.
3. **What the compass shows:** a compass rose (N at top by default) with two arrows, one for the window's start reading and one for its end reading, coloured with the card's existing accent (golden/blue) but visually distinguished from each other (e.g. lighter/hollow for start, solid for end). Each arrow is labelled with its azimuth in degrees + 16-point compass label (reusing the existing `azimuthLabel`) and its altitude in degrees. A plain-text line below the rose restates both readings for anyone not reading the SVG (screen readers, or a quick glance without parsing the diagram).
4. **Static vs live device heading — both, chosen by feature detection, not by branching on device type:**
   - **Baseline:** a static rose, true-north-up, arrows placed at each reading's azimuth. This is what desktop (and any device without usable orientation sensors) gets, always.
   - **Enhancement:** where `DeviceOrientationEvent` is available and actually delivers heading events, the rose rotates live opposite the device's compass heading, so holding the phone flat and turning it makes the arrows point at the real-world direction to face. This is what mobile gets, in practice, without any explicit desktop/mobile branch in the code — pure capability detection with a short timeout (per `tech-stack.md`) falling back to static if no event arrives.
   - iOS Safari's `DeviceOrientationEvent.requestPermission()` gesture requirement is honoured: permission is requested synchronously inside the `<summary>` click handler, the first time a compass panel is opened on that device — never on page load.
   - Live subscription is only active while a given card's compass panel is open; closing it unsubscribes, so idle cards don't keep a sensor listener running. Each card is an independent `<details>` in its own shadow root, so nothing enforces exclusivity across cards — opening two cards' panels at once is legitimate and means two independent live subscriptions, not a leak.
5. **Denied/unavailable permission:** falls back to the static rose silently correct, not broken — no error state, just the baseline view. A short status line under the rose reflects which mode is active ("Following your device" vs no line at all for the static default), so it's not ambiguous why the rose isn't moving on a device that does have a compass but declined permission.
6. **No new astronomical calculation.** Purely a rendering feature over `js/light-times.js`'s existing `reading()` output.

## Out of scope for this phase

- Sunrise/sunset cards, or any card outside the four golden/blue hour windows.
- A live AR/camera-overlay mode (see the mission amendment above) — the compass is a 2D rose, not a camera viewfinder.
- Any new weather, notification, or location logic — this phase is presentation only, over data Phase 1 (`js/light-times.js`) already produces.
- Persisting "which card's compass was left open" across reloads — each page load starts with all compass panels collapsed, matching the location card's existing precedent for first-visit state.

## Correctness bar

- Rose orientation math (static placement of an azimuth on the rose, and the live rotation transform applied on top of a device heading reading) verified numerically at several azimuth/heading values, not just eyeballed.
- iOS permission-gesture handling verified to actually call `requestPermission()` synchronously within the triggering click, not in a subsequent microtask/async gap that would cause Safari to silently ignore it.
- Verified that a card's own re-renders (the periodic weather/transition refresh in `js/app.js`, which replaces its shadow DOM on every `card.data` update) never stack a second subscription on top of an existing one, and that closing a panel or disconnecting the card from the DOM (e.g. the featured-card relocation) always drops its listener back to zero — no leaked `deviceorientation`/`deviceorientationabsolute` listeners.

## Open questions

None outstanding — resolved via clarifying questions before this spec was written (both static-on-desktop/live-on-mobile via feature detection, and showing both start and end arrows, were explicitly requested).
