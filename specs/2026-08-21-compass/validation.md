# Validation — Phase 12: Compass

This phase is ready to merge when all of the following hold.

> **Verification method:** the app was served locally (`python3 -m http.server`) and driven headlessly with Playwright (`chromium`), since no project-specific run skill existed yet for this repo — see the report offered to the user for a `/run-skill-generator` follow-up. Interactions went through each card's shadow DOM directly (`card.shadowRoot.querySelector(...)`), matching how a real user would reach the same elements. Live-heading behaviour was verified by dispatching synthetic `DeviceOrientationEvent`s (no physical sensor available in CI/headless Chromium), and listener-leak checks by instrumenting `window.addEventListener`/`removeEventListener`.

## Placement and scope
- [x] A compass toggle appears only on the four golden/blue hour window cards (`card-golden-morning`, `card-golden-evening`, `card-blue-morning`, `card-blue-evening`).
- [x] Sunrise and sunset cards show no compass toggle — verified `card-sunrise` has no `.compass-toggle` in its shadow DOM.
- [x] Opening a card's compass expands that card in place (native `<details>` disclosure), no navigation/modal/popover.

## Compass content
- [x] The rose shows two arrows: the window's start reading and end reading, visually distinguished (hollow/lighter for start, solid for end), coloured with the card's golden/blue accent.
- [x] Each arrow's azimuth (degrees + 16-point compass label) and altitude (degrees) are correct against `js/light-times.js`'s computed values — e.g. golden-hour-morning's start/end readout matched the -4°/+6° elevation thresholds `js/light-times.js` defines for that window exactly.
- [x] A plain-text readout below the rose restates both readings, present regardless of whether the SVG is examined.
- [x] Rose placement math verified numerically (Node script, not eyeballed): azimuth 0/90/180/270 place N/E/S/W at the expected top/right/bottom/left rose coordinates.

## Static baseline
- [x] On a browser context without a firing orientation sensor (default headless Chromium — `DeviceOrientationEvent` exists but no events arrive), the rose stays static, no permission prompt appears, and no console errors/warnings occur.

## Live device heading
- [x] Dispatching a synthetic absolute `deviceorientation`/`deviceorientationabsolute` event after opening a compass panel starts a live subscription: the rotor's `transform` updates, `.compass-rose--live` is added, and the status text becomes "Following your device".
- [ ] Verified on a real iOS Safari device that `DeviceOrientationEvent.requestPermission` is requested synchronously inside the triggering click and that live rotation actually works with a physical sensor — not tested here (no physical device available in this environment); the synchronous-call structure was verified by code inspection (`requestPermission()` is the first statement in the summary's click handler, no `await` precedes it) and headless Chromium confirms `needsExplicitPermission()` correctly returns `false` on browsers without the gated API, so no prompt fires there.
- [x] If permission is denied or the API is unsupported, the rose falls back to the static view with no broken/error state.
- [x] Live rotation math verified numerically (Node script): `rotate(-heading)` places a known azimuth at the correct on-screen angle for several synthetic heading values (e.g. facing east with a light source at azimuth 90° reads as "straight ahead"/top).

## Lifecycle
- [x] A card's own re-render while its compass panel is open (simulated `card.data = {...card.data}`, matching `js/app.js`'s periodic refresh) does not stack a second subscription — listener count instrumented and stayed at exactly 1 across two consecutive re-renders, and the panel stayed open throughout.
- [x] The featured-card relocation (`js/app.js`'s `flipMove`/`updateFeaturedCard`, reproduced as a real reparenting `appendChild` move) correctly drops to 0 listeners then re-subscribes to exactly 1 across the move, and the panel stays open — no duplication, no leak.
- [x] Removing a card from the DOM entirely (`.remove()`) drops its listener count to 0 (`disconnectedCallback`).
- [x] Corrected from the original plan/validation wording: opening two *different* cards' compass panels simultaneously is not mutually exclusive (each `<details>` is independent, in its own shadow root) — both may legitimately be open and live at once. The actual leak risks tested are per-card re-render stacking and DOM removal, both covered above.

## Accessibility
- [x] `<details>/<summary>` toggle is keyboard-operable — verified `.focus()` reaches the summary and `Enter` both opens and closes it.
- [x] The SVG rose is `aria-hidden="true"`; the text readout is its accessible equivalent.
- [x] Compass panel disclosure respects `prefers-reduced-motion: reduce` — verified no console errors under an emulated reduced-motion context.

## Integration
- [x] No console errors across all of the above scenarios.
- [x] `sw.js`'s `APP_SHELL` includes `/js/compass.js`, and `CACHE_NAME` is bumped (v27).
- [x] No framework code introduced; rendering stays inline SVG within the existing `light-window-card` Web Component, no new dependency (`js/compass.js` has zero imports).
- [x] No change to `js/light-times.js` or any other calculation module — this phase is presentation only.
- [x] `specs/roadmap.md`, `specs/mission.md`, and `specs/tech-stack.md` updates from this phase are present and consistent with the shipped behaviour.

## Merge
- [ ] Branch `2026-08-21-compass` merges cleanly into `main` with no conflicts — pending review; not yet merged.
