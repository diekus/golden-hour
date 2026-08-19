# Roadmap

High-level implementation order, in small phases. Each phase should be shippable/demoable on its own before moving to the next. Detailed specs for each phase (plan, requirements, validation) are created when that phase is started, per `prompts/phase.md`.

## Phase 0 — Project scaffold
Base HTML/CSS/JS structure, manifest file skeleton, service worker skeleton, icon set, repo housekeeping. No real functionality yet, but the app installs and shows a placeholder screen.

## Phase 1 — Core light calculation (fixed location)
Client-side sun/golden hour/blue hour/sunrise/sunset calculation for a hardcoded default location. Display all the core times on screen. Proves the astronomical calculation approach before wiring up real location input.

## Phase 2 — Real location
Geolocation API integration with permission prompt, plus manual location search fallback (Open-Meteo Geocoding API) for denied/unsupported cases. Cache the resolved location locally.

## Phase 3 — Live state indicator
Turn the static times into a live "is it golden hour / blue hour / neither, right now" indicator, with countdowns to the next transition. This is the app's core value proposition.

## Phase 4 — Weather data
Integrate Open-Meteo Forecast API to pull cloud cover and precipitation data for the current/upcoming golden and blue hour windows.

## Phase 5 — Weather warning
Turn raw weather data into a plain-language warning (e.g. likely washed-out golden hour due to cloud/rain), shown alongside the light-state indicator.

## Phase 6 — Offline support
Service worker caching strategy for app shell and assets, offline fallback page, and offline behaviour for cached location + client-side sun calculation (weather marked stale/unavailable when offline).

## Phase 7 — Notifications
Opt-in Notifications API integration for foreground alerts when golden/blue hour starts or ends. Best-effort background notifications via Periodic Background Sync where supported, with clear in-UI messaging about its limitations.

## Phase 8 — Installability & PWA polish
Manifest refinement (icons, splash screens, theme colours), `shortcuts`, `launch_handler`, `window-controls-overlay` with fallback.

## Phase 9 — Advanced capabilities
Web Share API integration for sharing today's golden/blue hour times.

## Phase 10 — Accessibility & responsive audit
WCAG compliance pass: contrast testing, keyboard navigation, screen-reader labelling, `alt` text audit, responsive layout testing across mobile/desktop breakpoints.

## Phase 11 — Visual & brand polish
Final colour palette (golden/blue duotone hex values), animations and transitions between light states, overall interaction polish per `BRAND_DESIGN.md`.
