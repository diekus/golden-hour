# Requirements — Phase 7: Notifications

## Scope

Foreground, opt-in notifications that alert the user when golden hour is about to start (morning and evening), so they don't have to keep the app open and watch the diagram. Background notifications (Periodic Background Sync) are explicitly **out of scope** for this phase — see "Deferred" below.

This is Phase 7 of `specs/roadmap.md`, which comes after Phase 6 (offline support, merged).

## Decisions (from clarifying questions)

1. **Trigger event: golden hour start only** (morning and evening), not golden hour end, blue hour start, or blue hour end. Golden hour start is the app's core "go shoot now" moment (`mission.md` goal 1, "instant clarity"); narrowing to one trigger keeps the feature simple and matches goal 6 ("no friction"). Other triggers are a candidate for a later phase if requested, not designed against here.
2. **Timing: fires exactly at the transition instant.** No earlier heads-up notification. Simplest to implement and reason about (one scheduled callback per transition); a lead-time option can be added later without changing the scheduling architecture.
3. **Foreground only for this phase.** Reliable, `setTimeout`-scheduled Notifications API calls while the tab is open. Background best-effort delivery via Periodic Background Sync (`tech-stack.md`'s "Notifications" section) is real added complexity — Chromium + installed-app only, browser-engagement-heuristic timing, no guarantee — and is deferred to its own future phase rather than bundled here.
4. **Opt-in control: a small toggle near the transition diagram/summary**, since that's the app's primary focus area. Not tucked inside the location card.

## Synced with parent specs

- `mission.md` goal 5, "Timely alerts": "Notify the user when golden or blue hour is starting or ending, so they don't have to keep checking the app." This phase delivers the golden-hour-start half of that goal; blue hour and "ending" notifications remain future work under the same goal.
- `tech-stack.md` "Notifications" section: confirms Notifications API, opt-in permission request (not on first load), and "no push server" as the constraint. This phase implements the "Foreground (reliable)" bullet only; the "Background (best-effort only)" bullet is deferred per decision 3 above.
- `tech-stack.md` PWA requirements: accessibility (the toggle must be keyboard-operable and properly labelled) and no manual light/dark switch precedent — same bar applies to any new UI control added here.

## Behaviour

- **Default state:** notifications off. No permission prompt on page load — only on explicit toggle interaction, per `tech-stack.md`.
- **Toggle interaction, permission not yet decided:** clicking the toggle requests Notification permission via the browser's native prompt. If granted, the toggle turns on and the next golden-hour-start is scheduled. If dismissed/denied, the toggle stays off and a short inline message explains notifications are off.
- **Toggle interaction, permission previously denied:** clicking does not re-prompt (browsers won't re-show the prompt anyway). Show guidance that the user needs to re-enable notifications for this site in browser settings.
- **Toggle interaction, permission previously granted:** simple on/off — turning on schedules the next golden-hour-start; turning off cancels the pending scheduled notification.
- **Persistence:** the opt-in choice (on/off) is stored in `localStorage`, scoped like the existing cached location. On reload, if the user previously opted in and permission is still `granted`, notifications are re-armed automatically without re-prompting. If permission has since been revoked at the browser level, the stored opt-in is treated as off and the toggle reflects that.
- **Scheduling:** exactly one pending scheduled notification at a time, for the next upcoming golden-hour-start (morning or evening, whichever comes first) at the current cached location. After it fires, or whenever the location changes, the next one is (re)computed and (re)scheduled.
- **Location change:** switching location cancels any pending scheduled notification and reschedules against the new location's next golden-hour-start, if opted in.
- **Notification content:** title identifies the app/event (e.g. "Golden Hour"), body states which golden hour window is starting (morning/evening) and, since it fires at the instant, reads as happening now (not a countdown).
- **Click behaviour:** clicking the notification focuses/opens the app window (standard `notificationclick` → `clients.openWindow`/`focus` handling is not required here since this is a page-level `Notification`, not an SW-shown one — see plan.md for the mechanism).
- **Honesty about limitations:** the toggle's helper text makes clear this only works while the app/tab stays open on this device — matching `tech-stack.md`'s instruction not to mislead users relying on it for a shoot they can't afford to miss.

## Non-goals for this phase

- Blue hour notifications, golden/blue hour *end* notifications.
- Lead-time / advance-warning notifications.
- Periodic Background Sync / any notification delivery while the app is fully closed.
- Per-transition-type granular toggles (single on/off switch only).

## Open questions

None outstanding — the four clarifying questions above cover the ambiguous decisions; everything else follows directly from `tech-stack.md`'s existing "Notifications" section.
