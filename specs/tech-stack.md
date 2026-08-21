# Tech Stack

This describes **how** Golden Hour is built. It follows the project-wide web convention (standard HTML/CSS/JS, no frameworks) and the PWA requirements in `prompts/pwa.md`.

## Core principles

- **Standard web only.** Vanilla HTML, CSS, and JavaScript. No React, Vue, Angular, or similar UI frameworks.
- **No backend.** Golden Hour is a static, client-side app. All data sources used (below) are called directly from the browser and support CORS, so no server-side proxy or API layer is needed. It can be hosted on any static host (e.g. GitHub Pages, Netlify, Vercel static hosting).
- **Web Components** for any repeated UI element (e.g. a time-window card used for both golden hour and blue hour, a weather-warning banner), instead of a framework's component model.
- **Progressive enhancement.** The app must be usable the moment HTML/CSS load; JavaScript enhances it, it isn't required for the page to render something meaningful.

## Sun, golden hour, and blue hour calculation

- Computed **entirely client-side** using astronomical formulas (sun position/altitude based on latitude, longitude, and date). This has no external dependency at runtime, works offline once loaded, and needs no API key or network call.
- A small, dependency-free astronomical calculation utility (such as SunCalc, BSD-2-Clause licensed, ~a few KB, no UI or framework surface) is the recommended way to avoid re-deriving solar position formulas from scratch. It is a calculation library, not a UI framework, so it doesn't conflict with the no-frameworks rule. If a truly zero-dependency approach is preferred later, the formulas can be vendored in directly. This is a phase-1 implementation decision, not one to overthink now.
- Golden hour and blue hour windows are derived from standard solar elevation angle thresholds around sunrise and sunset.

## Location

- **Primary:** browser Geolocation API, requested with a clear permission prompt explaining why it's needed.
- **Fallback:** if permission is denied, unavailable, or the browser doesn't support it, the user can manually search for a location (city name or coordinates).
- Manual search uses the **Open-Meteo Geocoding API** (free, no API key, CORS-enabled) to resolve a place name to coordinates, keeping the app consistent with the weather data source below and still backend-free.
- The last resolved location (coordinates + label) is cached locally (`localStorage`) so the app has a usable default on next launch and offline.

## Weather

- **Open-Meteo Forecast API** (free, no API key required, CORS-enabled, generous rate limits) is the weather data source. It fits the no-backend, no-build-step constraint directly from client-side JavaScript.
- The app requests cloud cover and precipitation probability for the hours spanning the upcoming/current golden and blue hour windows, and derives a plain-language warning (e.g. "heavy cloud expected, golden hour may be washed out") rather than showing a generic forecast.

## Notifications

Golden Hour can notify the user when golden/blue hour starts or ends, within the constraints of staying backend-free:

- **Foreground (reliable):** while the app is open, the already-computed transition times are scheduled locally (e.g. `setTimeout` to the next transition) and fired via the Notifications API, with permission requested only when the user opts in (not on first load).
- **Background (best-effort only):** when the app/tab is closed, use **Periodic Background Sync** to have the service worker wake up, recompute the next transition for the cached location, and show a notification if one is due. This only works on Chromium-based browsers, requires the app to be installed, and timing is scheduled by the browser's engagement heuristics, not guaranteed to the minute. Safari/iOS does not support it, so on those platforms notifications only work in the foreground.
- **No push server.** This deliberately avoids introducing a backend or the Push API; the trade-off is accepted background-notification unreliability rather than added infrastructure. If guaranteed background delivery becomes a hard requirement later, that would mean revisiting the no-backend principle above.
- The UI must make the limitation clear (e.g. "background notifications are best-effort and may not fire exactly on time, or at all, on this browser"), so users aren't misled into relying on it for a shoot they can't afford to miss.

## Compass (device orientation)

Phase 12 adds an expandable compass to each golden/blue hour card, showing the sun's azimuth at the window's start and end (already computed per-reading in `js/light-times.js`, no new calculation needed) so a photographer can plan where to point the camera before the window opens.

- **Baseline (all platforms): static rose.** A fixed compass rose (N at top) with two arrows marking the start/end azimuths, plus their angle labels. No sensors, no permissions, works identically offline and on desktop.
- **Enhancement (mobile with sensor support): live device heading.** Where `DeviceOrientationEvent` (absolute heading, or `webkitCompassHeading` on iOS Safari) is available, the rose itself rotates opposite the device's heading so the arrows read as "this is the direction to point your phone", updated live. iOS Safari requires an explicit user gesture to call `DeviceOrientationEvent.requestPermission()`; this is requested only when the user opts to expand a card's compass (not on load), consistent with the notifications permission precedent in Phase 7.
- **Feature detection, not UA sniffing.** Absence of `DeviceOrientationEvent`, a denied/unavailable permission, or no `deviceorientation` events actually arriving within a short timeout all fall back to the static rose — same as any other graceful-degradation path in this app.
- **No new dependency.** Rendered as inline SVG, consistent with `js/transition-diagram.js`'s approach, not a canvas/WebGL/charting library.

## PWA requirements (non-negotiable, per `prompts/pwa.md`)

- Web app manifest with `name`, `short_name`, and icons.
- Service worker for asset caching and offline behaviour.
- Installable per standard installability criteria.
- Default offline fallback page (a lightweight 404-equivalent) when a requested resource isn't cached and there's no connection.
- Responsive layout, optimised for both mobile and desktop.
- Accessibility: WCAG-compliant, contrast-tested colours, `alt` text on every image.
- Light/dark theme follows the system automatically (`prefers-color-scheme`); no manual in-app switch.

## Offline behaviour

Golden hour/blue hour/sunrise/sunset timing is calculable entirely offline once a location is known, so:

- **Offline, with a cached location:** the app computes and shows accurate sun/golden/blue hour times for that location using the client-side calculation, no network required.
- **Weather offline:** not computable client-side without a network call. Show the last successfully fetched forecast if cached, clearly labelled as potentially stale, or an explicit "weather unavailable offline" state if nothing is cached.
- **No cached location and offline:** show the offline fallback page with guidance to reconnect (geolocation and geocoding both require, at minimum, an initial network round trip or browser-level location resolution).

## Advanced web capabilities (FUGU)

Evaluated against the app's actual functionality:

- **Web Share API** — recommended. Lets a user share "golden hour today: 6:42–7:18pm" with one tap; directly useful for the target audience (e.g. sharing a shoot time with a client or crew).
- **Shortcuts** (manifest `shortcuts`) — reconsidered and skipped in Phase 8 (`specs/2026-08-19-installability-polish/requirements.md`). Golden Hour is a genuine single-view utility that already opens straight to "today's golden hour" — a shortcut to the same screen the app already launches to adds a manifest entry without adding real value. Revisit if a second action/view is ever added (e.g. Phase 9's Web Share could justify one).
- **`launch_handler`** — recommended, set to focus the existing window rather than spawning duplicates, since this is a single-view utility.
- **Periodic Background Sync** — recommended, best-effort only, to attempt golden/blue hour notifications when the app is closed. See "Notifications" above for its limitations.
- **Badging, protocol handling, file handling, Web Share Target, device posture** — not applicable. Golden Hour has no incoming files/protocols to handle, no persistent count to badge, and is a single-screen app with no meaningful cross-app share-target use case.
- **URL handling** — narrowly adopted in Phase 9 (`specs/2026-08-19-advanced-capabilities/requirements.md`): sharing today's times (Web Share API, above) also shares a link carrying the current location as query parameters (`lat`/`lng`/`tz`/`label`), which the app reads on load so a recipient sees the same location without manually searching for it. This is not the manifest-level "URL handling" capability (registering as a handler for a URL pattern coming from other apps) — that remains not applicable; this is just reading `location.search` on load.

## Graceful degradation

- Use CSS `grid` as the baseline layout; adopt `grid-lanes` progressively where supported, per `prompts/pwa.md`.
- Implement `window-controls-overlay` display mode; fall back to normal top-of-window content rendering where unsupported.
- Any other cutting-edge API adopted later must ship with a working fallback, not a broken experience, on unsupported browsers.

## Testing

- Manual and automated checks against WCAG (contrast ratios, keyboard navigation, screen-reader labelling).
- Every image carries an `alt` attribute.
- Cross-browser check on evergreen browsers (Chrome, Firefox, Safari, Edge) plus at least one mobile browser, given the field-use case.

## Open questions to resolve during roadmap phases

- Exact colour palette values (golden/blue duotone direction is set in `BRAND_DESIGN.md`/brand direction, but hex values are still to be defined).

Resolved: sun-calculation approach — SunCalc (BSD-2-Clause) is vendored as ES module source under `js/vendor/`, loaded via `<script type="module">`, no build step. See `specs/2026-08-19-light-calculation/requirements.md`.
