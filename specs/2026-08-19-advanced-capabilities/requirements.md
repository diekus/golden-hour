# Requirements — Phase 9: Advanced capabilities (Web Share)

## Scope

Web Share API integration for sharing today's golden/blue hour times, per `specs/roadmap.md` Phase 9. Expanded, per explicit direction, to also share a link carrying the current location — so the recipient sees the *same* city's times without manually searching for it, not just the sender's text summary.

This is Phase 9, following Phase 8 (installability & PWA polish, merged).

## Decisions (from clarifying questions)

1. **Share scope: all of today's times, one button.** A single "Share" control shares one text summary covering today's golden hour (morning + evening) and blue hour (morning + evening) — matches the roadmap's plural "golden/blue hour times" and is useful for briefing a client/crew on the whole day at once, without needing 4 separate per-card controls.
2. **Placement: near the diagram, next to the notify toggle.** Consistent with Phase 7's precedent — the app's "do something with this" actions live together under the diagram/summary.
3. **Weather: excluded from the shared text.** Times don't go stale; a forecast read later by the recipient could be wrong by the time they see it. Keeps the message short and unambiguous.
4. **Unsupported browsers (no `navigator.share`): the control is hidden.** Matches the notify toggle's progressive-enhancement precedent from Phase 7 — no degraded alternate mechanism, just nothing shown.
5. **Shared link carries the location.** The share payload's `url` is the app's own URL with `lat`, `lng`, `tz` (IANA timezone), and `label` query parameters set from the current location. On load, the app reads these params (if present and valid) and uses them as the current location — through the *same* `setLocation()` path search/geolocation already use, so it's cached and rendered identically to any other location change. This means a recipient who opens the link sees the sender's city, not their own default/cached one. The query string is stripped via `history.replaceState` once consumed, so a later plain reload of the same tab behaves normally (uses the now-cached location like any other).

## Synced with parent specs

- `mission.md` stakeholder note: "professional and working photographers ... need dependable timing to brief clients or crews" — a location-carrying link directly strengthens this: the crew member doesn't need to already know or manually search for the shoot's city.
- `tech-stack.md` "Web Share API" bullet (already recommended) is implemented as specified, extended with the location-link addition documented there.
- `tech-stack.md` "URL handling" bullet is **amended** (see the edit directly in `tech-stack.md`) from "not applicable" to a narrow, scoped adoption: reading `lat`/`lng`/`tz`/`label` query params on load, not full manifest-level URL/protocol handling.
- `tech-stack.md` core principle "no backend": the shared link requires no server — it's a plain query string the client itself parses, consistent with the static-hosting, no-backend constraint.

## Behaviour

- **Share button**: hidden entirely if `'share' in navigator` is false. Otherwise visible next to the notify toggle.
- **Click**: builds `{ title, text, url }` and calls `navigator.share(...)`.
  - `title`: `"Golden Hour — <location label>"`.
  - `text`: today's golden hour (morning + evening) and blue hour (morning + evening) start–end times, formatted in the current location's timezone, human-readable, no weather.
  - `url`: the app's own origin + path, with `lat`, `lng`, `tz`, `label` query params set from `currentLocation`.
- **Cancellation**: `navigator.share()` rejects with `AbortError` if the user dismisses the native share sheet — this must be swallowed silently (not surfaced as an error/console noise), since dismissing is a normal, expected outcome, not a failure.
- **Loading a shared link**: on page load, before falling back to cached/default location, the app checks `location.search` for `lat`+`lng` (both required; `tz`/`label` optional-but-expected). If present and valid (`lat` in [-90, 90], `lng` in [-180, 180], `tz` a recognisable IANA zone via a guarded `Intl.DateTimeFormat` construction, falling back to the device timezone if `tz` is missing/invalid), the app calls the existing `setLocation()` with this location (`source: 'shared-link'`), which caches it and renders exactly as any other location change would. Malformed/partial query params are ignored entirely (no partial/broken location state) and the app falls through to its normal cached/default resolution.
- **URL cleanup**: once a shared link's location has been consumed, `history.replaceState` removes the query string from the visible URL (the location is now cached locally, so it doesn't need to keep living in the URL).

## Non-goals for this phase

- Per-card (per-window) share buttons.
- Weather/forecast content in the shared text.
- A copy-to-clipboard fallback for unsupported browsers (control is simply hidden).
- Full manifest-level URL/protocol handling (registering the app as a handler for external URL patterns) — only reading query params the app's own share links produce.
- Any change to how location is normally resolved (geolocation/search/cache) outside of this new query-param check that runs once, on load, before that existing flow.

## Open questions

None outstanding.
