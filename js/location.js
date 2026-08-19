const STORAGE_KEY = 'golden-hour:location';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// Same coordinates Phase 1 hardcoded, now shaped like every other location object.
export const DEFAULT_LOCATION = {
  lat: 51.5074,
  lng: -0.1278,
  label: 'London, England, UK',
  timezone: 'Europe/London',
  source: 'default',
};

export function getCachedLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedLocation(location) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — non-fatal, just skip caching.
  }
}

export function clearCachedLocation() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// GPS coordinates carry no timezone of their own — the device's own timezone is correct
// here because geolocation and the device are, by definition, in the same place.
function deviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function resolveViaGeolocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject({ reason: 'unsupported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'Your location',
          timezone: deviceTimezone(),
          source: 'geolocation',
        });
      },
      (error) => {
        const reasons = { 1: 'denied', 2: 'unavailable', 3: 'timeout' };
        reject({ reason: reasons[error.code] || 'unavailable' });
      },
      { timeout: 10000 },
    );
  });
}

function formatLabel(result) {
  const parts = [result.name, result.admin1, result.country].filter(Boolean);
  return parts.join(', ');
}

// Returns candidate results for disambiguation, not a resolved location — the caller
// turns a chosen result into a location object via toLocation() once the user picks one.
export async function searchLocations(query) {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set('name', query);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding search failed (${response.status})`);
  }
  const data = await response.json();
  return (data.results || []).map((result) => ({
    id: result.id,
    label: formatLabel(result),
    lat: result.latitude,
    lng: result.longitude,
    timezone: result.timezone,
  }));
}

export function toLocation(searchResult) {
  return {
    lat: searchResult.lat,
    lng: searchResult.lng,
    label: searchResult.label,
    timezone: searchResult.timezone,
    source: 'search',
  };
}
