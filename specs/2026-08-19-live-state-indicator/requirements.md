# Requirements — Phase 3: Live state indicator

## Scope

Per `specs/roadmap.md` Phase 3: turn the static times into a live "is it golden hour / blue hour / neither, right now" indicator, with a countdown to the next transition — "the app's core value proposition." Concretely, requested as: a half-circle diagram at the top of the page, its track painted in gold/blue/neutral segments depending on time of day, with a marker showing current progress, so a photographer can see at a glance how much time is left.

## Context (from parent specs)

- `specs/mission.md` goal 1, "Instant clarity" — this feature *is* that goal.
- `specs/roadmap.md` Phase 3 description (above).
- `specs/tech-stack.md` — standard web only; inline SVG is a standard web platform feature, not a framework, so it fits without exception.

## Decisions made for this phase

- **Shape:** half-circle arc, built as inline SVG.
- **Colour approach:** a segmented track, not a single current-state colour — the whole window's structure is visible at a glance (neutral → colour → colour → neutral), not just the current instant.
- **Combined window definition:** blue hour and golden hour are contiguous (`blueHourMorning.end === goldenHourMorning.start`, `goldenHourEvening.end === blueHourEvening.start`), so they form two natural combined periods per day:
  - Morning: `blueHourMorning.start` → `goldenHourMorning.end` (blue, then gold).
  - Evening: `goldenHourEvening.start` → `blueHourEvening.end` (gold, then blue).
- **Which window is "next":** whichever combined window's padded end (`end + 20min`) has not yet passed, in this order: today's morning, today's evening, tomorrow's morning (computed by calling `getLightTimes` again with a date advanced far enough to land past today's evening window — SunCalc resolves the correct calendar day from the coordinates and date internally, so no explicit timezone-midnight arithmetic is needed).
- **Padding:** 20 minutes before the combined window's start and 20 minutes after its end, applied only to the diagram's visible time domain — the underlying golden/blue hour boundary times themselves (from `getLightTimes`) are untouched.
- **Segments:** up to 4, left to right — neutral (padding before), first colour (blue for morning / gold for evening), second colour (gold for morning / blue for evening), neutral (padding after).
- **Marker:** shows "now" as a position along the arc, computed as `(now - windowStart) / (windowEnd - windowStart)` where `windowStart`/`windowEnd` include the 20-minute padding, clamped to `[0, 1]` — sits at the start edge if "now" is earlier than the padded window, end edge if later. Given the "next window" selection logic above always picks a window whose padded end is still ahead, the marker should in practice only ever clamp at the *start* edge (when the next transition is more than 20 minutes away) — clamping both directions is just cheap defensive symmetry.
- **Live updates:** the marker's position (and, when needed, which combined window is displayed) updates periodically without a page reload. A 30-second refresh interval is enough for a visual timeline — no need for per-second smoothness on something spanning tens of minutes to a few hours.
- **Recompute triggers:** location changes (geolocation/search, per Phase 2) and crossing into the need for a new combined window (e.g. today's evening window's padded end passes, so the next refresh must pull tomorrow's morning window) both trigger a full recompute of the diagram's segments.
- **Text summary:** since an SVG diagram isn't meaningfully readable by assistive tech on its own, and since the roadmap explicitly calls for "countdowns to the next transition," a short live text readout accompanies the diagram (current state, and time remaining or time until the next transition). This also directly serves the "instant clarity" mission goal for anyone who'd rather read a number than interpret an arc.
- **Placement:** at the top of `<main>`, above the location control section — the first thing shown on the page, per the request ("a diagram in the top").
- **Colours:** reuse `--color-golden`/`--color-blue`; neutral segments use a muted/desaturated track colour so they read as "track", not "data" — final exact shades are still fair game for Phase 11 polish, per every prior phase's precedent.

## Out of scope for this phase

- A full day/night state model beyond golden/blue hour (e.g. distinct "broad daylight" vs "night" labelling) — the diagram and text summary concern only the golden/blue hour transitions and their immediate neutral padding, not a complete 24-hour state machine.
- Weather (Phases 4–5), notifications (Phase 7).
- Final visual/animation polish (Phase 11) — functional and legible, not final.

## Correctness bar

- Combined-window selection (today's morning / today's evening / tomorrow's morning) must be verified against real computed times, including right at a padded-window boundary crossing.
- The marker's position must be checked numerically (not just eyeballed) at a few checkpoints: window start, mid-blue-segment, the blue/gold transition instant, mid-gold-segment, window end.
