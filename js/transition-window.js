import { getLightTimes } from './light-times.js';

const PAD_MS = 20 * 60 * 1000;

// Blue hour and golden hour are contiguous (blueHourMorning.end === goldenHourMorning.start,
// and likewise for the evening pair), so each pair forms one combined "twilight" period per day.
function combinedWindows(times) {
  const morningOk = times.blueHourMorning.start && times.goldenHourMorning.end;
  const eveningOk = times.goldenHourEvening.start && times.blueHourEvening.end;

  return {
    morning: morningOk
      ? {
          start: times.blueHourMorning.start.time,
          transition: times.goldenHourMorning.start.time,
          end: times.goldenHourMorning.end.time,
          firstKind: 'blue',
          secondKind: 'gold',
          direction: 'morning',
          sunEvent: times.sunrise ? { time: times.sunrise.time, kind: 'sunrise' } : null,
        }
      : null,
    evening: eveningOk
      ? {
          start: times.goldenHourEvening.start.time,
          transition: times.blueHourEvening.start.time,
          end: times.blueHourEvening.end.time,
          firstKind: 'gold',
          secondKind: 'blue',
          direction: 'evening',
          sunEvent: times.sunset ? { time: times.sunset.time, kind: 'sunset' } : null,
        }
      : null,
  };
}

function withinPaddedEnd(combined, now) {
  return Boolean(combined) && combined.end.getTime() + PAD_MS >= now.getTime();
}

// Returns the diagram data for the next (or current) golden/blue hour combined window, padded
// 20 minutes on each side, or null if it can't be determined (e.g. polar day/night edge cases
// where SunCalc reports no golden/blue hour crossing at all — out of scope, see requirements.md).
export function getTransitionWindow(lat, lng, now = new Date()) {
  const todayTimes = getLightTimes(lat, lng, now);
  const { morning, evening } = combinedWindows(todayTimes);

  let combined = null;
  if (withinPaddedEnd(morning, now)) {
    combined = morning;
  } else if (withinPaddedEnd(evening, now)) {
    combined = evening;
  } else {
    // Both of today's combined windows are behind us — pull tomorrow's morning window. 20
    // hours ahead safely clears today's evening window while still landing on the correct
    // next calendar day (SunCalc resolves the day from the instant + coordinates itself).
    const future = new Date(now.getTime() + 20 * 60 * 60 * 1000);
    const futureTimes = getLightTimes(lat, lng, future);
    combined = combinedWindows(futureTimes).morning;
  }

  if (!combined) return null;

  const windowStart = new Date(combined.start.getTime() - PAD_MS);
  const windowEnd = new Date(combined.end.getTime() + PAD_MS);
  const totalMs = windowEnd.getTime() - windowStart.getTime();

  const segments = [
    { kind: 'neutral', start: windowStart, end: combined.start },
    { kind: combined.firstKind, start: combined.start, end: combined.transition },
    { kind: combined.secondKind, start: combined.transition, end: combined.end },
    { kind: 'neutral', start: combined.end, end: windowEnd },
  ];

  const rawFraction = (now.getTime() - windowStart.getTime()) / totalMs;
  const nowFraction = Math.min(1, Math.max(0, rawFraction));

  let currentKind = 'neutral';
  for (const segment of segments) {
    if (now >= segment.start && now < segment.end) {
      currentKind = segment.kind;
      break;
    }
  }

  // Only the three real colour boundaries count as "transitions" — the padding edges
  // (windowStart/windowEnd) aren't state changes, since neutral-before-padding and
  // outside-the-window are the same "neither" state from the user's perspective.
  const boundaries = [
    { at: combined.start, toKind: combined.firstKind },
    { at: combined.transition, toKind: combined.secondKind },
    { at: combined.end, toKind: 'neutral' },
  ];
  const nextTransition = boundaries.find((boundary) => boundary.at > now) || null;

  // Distinct from nowFraction (which is clamped to [0, 1] for marker placement) — this tells
  // the caller whether "now" is genuinely inside the padded window at all, e.g. for deciding
  // whether to show any background ambience effect vs. none when the window is far away.
  const isWithinWindow = now >= windowStart && now <= windowEnd;

  return {
    windowStart,
    windowEnd,
    segments,
    nowFraction,
    direction: combined.direction,
    currentKind,
    nextTransition,
    isWithinWindow,
    sunEvent: combined.sunEvent,
  };
}
