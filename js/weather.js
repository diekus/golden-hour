const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_CACHE_KEY = 'golden-hour:forecast';
// Roughly 5km — close enough to be "the same place" (GPS jitter, a slightly different search
// result for the same city), not coincidentally reusing a completely different city's old data.
const STALE_LOCATION_TOLERANCE_DEG = 0.05;

// Open-Meteo's hourly times are naive local-time strings with no UTC suffix, matching
// whatever `timezone` parameter is requested — they are not self-describing. Requesting
// `timezone=UTC` and appending Z here is required; parsing them directly would have the
// browser assume its own local timezone, silently misaligning weather hours against the
// light-time windows for anyone not in that exact zone.
export async function fetchForecast(lat, lng) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lng);
  url.searchParams.set('hourly', 'cloud_cover,precipitation_probability');
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('forecast_days', '2');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Forecast request failed (${response.status})`);
  }
  const data = await response.json();
  const { time, cloud_cover: cloudCover, precipitation_probability: precipProbability } = data.hourly;

  return time.map((isoLocal, index) => ({
    time: new Date(`${isoLocal}Z`),
    cloudCover: cloudCover[index],
    precipProbability: precipProbability[index],
  }));
}

export function setCachedForecast(lat, lng, hourly) {
  try {
    localStorage.setItem(
      FORECAST_CACHE_KEY,
      JSON.stringify({
        lat,
        lng,
        hourly: hourly.map((entry) => ({ ...entry, time: entry.time.toISOString() })),
      }),
    );
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — non-fatal, just skip caching.
  }
}

// Returns the last successfully cached forecast, but only if it was fetched for a location
// close enough to (lat, lng) to plausibly be "the same place" — otherwise null, since showing
// another city's old weather under the current location's label would be actively misleading,
// worse than showing nothing.
export function getCachedForecast(lat, lng) {
  try {
    const raw = localStorage.getItem(FORECAST_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (
      Math.abs(cached.lat - lat) > STALE_LOCATION_TOLERANCE_DEG ||
      Math.abs(cached.lng - lng) > STALE_LOCATION_TOLERANCE_DEG
    ) {
      return null;
    }
    return cached.hourly.map((entry) => ({ ...entry, time: new Date(entry.time) }));
  } catch {
    return null;
  }
}

// Summarises a sub-hourly golden/blue hour window (e.g. 05:29–06:38) by averaging every
// forecast hour whose [hour, hour+1) span overlaps [windowStart, windowEnd). Returns null if
// nothing overlaps (window outside the fetched range, or the fetch itself failed upstream) —
// the caller treats that the same as "no weather data" either way.
export function averageForWindow(hourlyData, windowStart, windowEnd) {
  if (!hourlyData || !windowStart || !windowEnd) return null;

  const hourMs = 60 * 60 * 1000;
  const overlapping = hourlyData.filter((entry) => {
    const hourStart = entry.time.getTime();
    const hourEnd = hourStart + hourMs;
    return hourStart < windowEnd.getTime() && hourEnd > windowStart.getTime();
  });

  if (overlapping.length === 0) return null;

  const sum = overlapping.reduce(
    (acc, entry) => ({
      cloudCover: acc.cloudCover + entry.cloudCover,
      precipProbability: acc.precipProbability + entry.precipProbability,
    }),
    { cloudCover: 0, precipProbability: 0 },
  );

  return {
    cloudCover: Math.round(sum.cloudCover / overlapping.length),
    precipProbability: Math.round(sum.precipProbability / overlapping.length),
  };
}
