# Mission

## What Golden Hour is

Golden Hour answers one question at a glance: **is it golden or blue hour where I am, right now?**

It shows, for the user's current location:
- Whether it is currently golden hour, blue hour, or neither.
- Start, end, and duration of golden hour.
- Start, end, and duration of blue hour.
- Sunrise and sunset times.
- A weather forecast for those windows, with a warning when cloud cover or rain is likely to ruin the light.

## Why we are building it

Photographers plan their shoots around light, not the clock. The golden and blue hour windows are short, and missing them because of a vague guess, a cluttered app, or a login wall costs a photographer the shot. Existing sun-tracking tools tend to be one of:

- General-purpose weather apps that bury sunrise/sunset in a forecast, with no golden/blue hour concept at all.
- Dedicated golden hour calculators that show times but ignore whether the sky will actually cooperate.
- Feature-heavy planning apps (compass overlays, augmented reality, multi-day trip planning) that are overkill for the simple question of "should I go out and shoot right now, or in the next hour?" (Phase 12 adds a lightweight, opt-in exception to this: a compass tucked inside the existing golden/blue hour cards, reusing data already computed for those cards, expanded on demand rather than shown by default — a glance-based direction reference, not a persistent AR overlay or a separate planning surface.)

Golden Hour exists to close that gap: combine precise light-timing with a plain-language weather risk warning, in a tool fast enough to check in the field, on a phone, possibly with poor signal.

## Goals

1. **Instant clarity.** Open the app and immediately know the current light state and what's coming next, without navigation or setup.
2. **Accurate timing.** Golden hour, blue hour, sunrise, and sunset times must be astronomically correct for the user's exact location.
3. **Actionable weather context.** Surface cloud cover and precipitation risk specifically for the upcoming golden/blue hour windows, and flag when conditions are likely to ruin them.
4. **Field-ready reliability.** Installable as a PWA, fast on mobile, and able to show sun timing even without a network connection.
5. **Timely alerts.** Notify the user when golden or blue hour is starting or ending, so they don't have to keep checking the app to avoid missing the window.
6. **No friction.** No accounts, no login, no unnecessary steps between opening the app and getting the answer.

## Stakeholders / who this is for

- **Hobby photographers** who shoot occasionally and want a simple, reliable way to catch good light without researching sun tables.
- **Professional and working photographers** (landscape, portrait, event, real estate) who plan shoots around light and need dependable timing to brief clients or crews.
- **Videographers, cinematographers, and drone pilots** who care about the same natural light windows for equivalent reasons.

## Non-goals (for now)

- Not a general-purpose weather app; weather is shown only in service of the golden/blue hour question.
- Not a social or community platform (no sharing feeds, no photo uploads, no comments).
- Not a multi-day or multi-location trip planner in v1; the focus is the user's current location, right now.
- No user accounts or login system.
- No advertising or monetization layer baked into the core experience; keep the utility clean.

## Success looks like

A photographer opens the app in the field and, within a second or two, knows whether to shoot now, wait, or pack up because the sky won't cooperate.
