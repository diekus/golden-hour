import { getLightTimes } from './light-times.js';
import { getTransitionWindow } from './transition-window.js';
import { renderTransitionDiagram } from './transition-diagram.js';
import './components/light-window-card.js';
import {
  DEFAULT_LOCATION,
  getCachedLocation,
  setCachedLocation,
  resolveViaGeolocation,
  searchLocations,
  toLocation,
} from './location.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

const els = {
  locationLabel: document.getElementById('location-label'),
  useMyLocationBtn: document.getElementById('use-my-location-btn'),
  searchForm: document.getElementById('location-search-form'),
  searchInput: document.getElementById('location-search-input'),
  results: document.getElementById('location-results'),
  message: document.getElementById('location-message'),
  transitionDiagram: document.getElementById('transition-diagram'),
  transitionSummary: document.getElementById('transition-summary'),
};

const TRANSITION_REFRESH_MS = 30 * 1000;
const KIND_LABEL = { blue: 'Blue hour', gold: 'Golden hour' };

const GEOLOCATION_ERROR_MESSAGES = {
  denied: 'Location access was denied. You can search for a city instead.',
  unavailable: 'Your location could not be determined. You can search for a city instead.',
  timeout: 'Getting your location took too long. You can search for a city instead.',
  unsupported: "Geolocation isn't supported in this browser. You can search for a city instead.",
};

let currentLocation = getCachedLocation() || DEFAULT_LOCATION;

function showMessage(text) {
  els.message.textContent = text;
  els.message.hidden = !text;
}

function clearResults() {
  els.results.innerHTML = '';
  els.results.hidden = true;
}

function pointCardData(label, pointReading, timezone) {
  return { label, accent: 'neutral', start: pointReading, end: null, durationMs: null, timezone };
}

function windowCardData(label, accent, windowData, timezone) {
  return {
    label,
    accent,
    start: windowData.start,
    end: windowData.end,
    durationMs: windowData.durationMs,
    timezone,
  };
}

function renderLightTimes() {
  const times = getLightTimes(currentLocation.lat, currentLocation.lng, new Date());
  const tz = currentLocation.timezone;

  document.getElementById('card-sunrise').data = pointCardData('Sunrise', times.sunrise, tz);
  document.getElementById('card-sunset').data = pointCardData('Sunset', times.sunset, tz);

  document.getElementById('card-golden-morning').data =
    windowCardData('Golden hour — morning', 'golden', times.goldenHourMorning, tz);
  document.getElementById('card-golden-evening').data =
    windowCardData('Golden hour — evening', 'golden', times.goldenHourEvening, tz);

  document.getElementById('card-blue-morning').data =
    windowCardData('Blue hour — morning', 'blue', times.blueHourMorning, tz);
  document.getElementById('card-blue-evening').data =
    windowCardData('Blue hour — evening', 'blue', times.blueHourEvening, tz);
}

function formatCountdown(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function formatSummary(transitionWindow, now) {
  if (!transitionWindow) return '';
  const { currentKind, nextTransition } = transitionWindow;

  if (currentKind === 'blue' || currentKind === 'gold') {
    if (!nextTransition) return `${KIND_LABEL[currentKind]} right now.`;
    const remaining = formatCountdown(nextTransition.at.getTime() - now.getTime());
    return `${KIND_LABEL[currentKind]} — ${remaining} left.`;
  }

  if (!nextTransition) return "Golden and blue hour aren't active right now.";
  const nextLabel = KIND_LABEL[nextTransition.toKind] || 'Golden/blue hour';
  const until = formatCountdown(nextTransition.at.getTime() - now.getTime());
  return `${nextLabel} starts in ${until}.`;
}

function renderTransition() {
  const now = new Date();
  const transitionWindow = getTransitionWindow(currentLocation.lat, currentLocation.lng, now);
  renderTransitionDiagram(els.transitionDiagram, transitionWindow);
  els.transitionSummary.textContent = formatSummary(transitionWindow, now);
}

function setLocation(location) {
  currentLocation = location;
  setCachedLocation(location);
  els.locationLabel.textContent = location.label;
  renderLightTimes();
  renderTransition();
  showMessage('');
  clearResults();
}

function renderResults(results) {
  els.results.innerHTML = '';
  for (const result of results) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = result.label;
    button.addEventListener('click', () => setLocation(toLocation(result)));
    li.appendChild(button);
    els.results.appendChild(li);
  }
  els.results.hidden = false;
}

els.useMyLocationBtn.addEventListener('click', async () => {
  showMessage('Requesting your location…');
  try {
    const location = await resolveViaGeolocation();
    setLocation(location);
  } catch (err) {
    showMessage(GEOLOCATION_ERROR_MESSAGES[err.reason] || GEOLOCATION_ERROR_MESSAGES.unavailable);
  }
});

els.searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = els.searchInput.value.trim();
  if (!query) return;

  showMessage('Searching…');
  clearResults();

  try {
    const results = await searchLocations(query);
    if (results.length === 0) {
      showMessage(`No results for "${query}".`);
      return;
    }
    showMessage('');
    renderResults(results);
  } catch {
    showMessage('Search failed. Please try again.');
  }
});

els.locationLabel.textContent = currentLocation.label;
renderLightTimes();
renderTransition();
setInterval(renderTransition, TRANSITION_REFRESH_MS);
