import * as SunCalc from './vendor/suncalc.js';

// -4° is the boundary between golden hour (-4° to +6°) and blue hour (-6° to -4°).
// Not one of SunCalc's built-in angles (which cover -0.833°, -6°, and +6°), so it's
// registered once here. Naming follows SunCalc's own "morning name, evening name"
// convention for a single angle: blueHourEnd is the morning (rising) crossing, where
// blue hour ends and golden hour begins; blueHourStart is the evening (setting)
// crossing, where golden hour ends and blue hour begins.
SunCalc.addTime(-4, 'blueHourEnd', 'blueHourStart');

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

function compassLabel(azimuthDeg) {
  const index = Math.round(azimuthDeg / 22.5) % 16;
  return COMPASS_POINTS[index];
}

function reading(date, lat, lng) {
  if (!date) return null;
  const { azimuth, altitude } = SunCalc.getPosition(date, lat, lng);
  return {
    time: date,
    azimuth,
    azimuthLabel: compassLabel(azimuth),
    altitude,
  };
}

function timeWindow(startDate, endDate, lat, lng) {
  return {
    start: reading(startDate, lat, lng),
    end: reading(endDate, lat, lng),
    durationMs: startDate && endDate ? endDate - startDate : null,
  };
}

// Returns sunrise/sunset plus the golden and blue hour windows (each occurring once
// around sunrise, once around sunset), for a given location and date. Every time point
// carries the sun's azimuth/elevation at that instant alongside it. Pure calculation:
// no DOM access, no network calls.
export function getLightTimes(lat, lng, date) {
  const times = SunCalc.getTimes(date, lat, lng);

  return {
    sunrise: reading(times.sunrise, lat, lng),
    sunset: reading(times.sunset, lat, lng),
    goldenHourMorning: timeWindow(times.blueHourEnd, times.goldenHourEnd, lat, lng),
    goldenHourEvening: timeWindow(times.goldenHour, times.blueHourStart, lat, lng),
    blueHourMorning: timeWindow(times.dawn, times.blueHourEnd, lat, lng),
    blueHourEvening: timeWindow(times.blueHourStart, times.dusk, lat, lng),
  };
}
