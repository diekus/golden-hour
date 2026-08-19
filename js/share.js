function timeFormatter(timezone) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone });
}

function formatWindow(windowData, timezone) {
  if (!windowData.start?.time || !windowData.end?.time) return null;
  const formatter = timeFormatter(timezone);
  return `${formatter.format(windowData.start.time)}–${formatter.format(windowData.end.time)}`;
}

// Pure text formatting over a getLightTimes() result — today's golden and blue hour, morning
// and evening, times only (no weather: see requirements.md decision 3 — forecasts can go stale
// between sending and reading, but times never do).
export function buildShareText(times, timezone) {
  const goldenMorning = formatWindow(times.goldenHourMorning, timezone);
  const goldenEvening = formatWindow(times.goldenHourEvening, timezone);
  const blueMorning = formatWindow(times.blueHourMorning, timezone);
  const blueEvening = formatWindow(times.blueHourEvening, timezone);

  const goldenParts = [goldenMorning, goldenEvening].filter(Boolean);
  const blueParts = [blueMorning, blueEvening].filter(Boolean);

  const lines = [];
  if (goldenParts.length > 0) lines.push(`Golden hour: ${goldenParts.join(' and ')}`);
  if (blueParts.length > 0) lines.push(`Blue hour: ${blueParts.join(' and ')}`);
  return lines.join('\n');
}

// Builds the app's own URL carrying the location as query params, so a recipient who opens it
// sees this same place's times rather than their own default/cached one (see js/location.js's
// locationFromSearchParams, the reader side of this same URL shape).
export function buildShareUrl(place) {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set('lat', place.lat);
  url.searchParams.set('lng', place.lng);
  url.searchParams.set('tz', place.timezone);
  url.searchParams.set('label', place.label);
  return url.toString();
}

export function buildSharePayload(place, times) {
  return {
    title: `Golden Hour — ${place.label}`,
    text: buildShareText(times, place.timezone),
    url: buildShareUrl(place),
  };
}
