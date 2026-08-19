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
  locationDetails: document.getElementById('location-details'),
  locationLabel: document.getElementById('location-label'),
  locationDate: document.getElementById('location-date'),
  useMyLocationBtn: document.getElementById('use-my-location-btn'),
  searchForm: document.getElementById('location-search-form'),
  searchInput: document.getElementById('location-search-input'),
  results: document.getElementById('location-results'),
  message: document.getElementById('location-message'),
  transitionDiagram: document.getElementById('transition-diagram'),
  transitionSummary: document.getElementById('transition-summary'),
  popover: document.getElementById('transition-popover'),
  popoverClose: document.getElementById('transition-popover-close'),
  popoverTitle: document.getElementById('transition-popover-title'),
  popoverStart: document.getElementById('transition-popover-start'),
  popoverEnd: document.getElementById('transition-popover-end'),
  popoverProgress: document.getElementById('transition-popover-progress'),
};

const TRANSITION_REFRESH_MS = 30 * 1000;
const KIND_LABEL = { blue: 'Blue hour', gold: 'Golden hour' };

const GEOLOCATION_ERROR_MESSAGES = {
  denied: 'Location access was denied. You can search for a city instead.',
  unavailable: 'Your location could not be determined. You can search for a city instead.',
  timeout: 'Getting your location took too long. You can search for a city instead.',
  unsupported: "Geolocation isn't supported in this browser. You can search for a city instead.",
};

const cachedLocationAtLoad = getCachedLocation();
let currentLocation = cachedLocationAtLoad || DEFAULT_LOCATION;

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

function hidePopover() {
  els.popover.hidden = true;
}

function showPopover(segment, event) {
  const now = new Date();
  const totalMs = segment.end.getTime() - segment.start.getTime();
  const elapsedMs = Math.min(totalMs, Math.max(0, now.getTime() - segment.start.getTime()));
  const percent = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0;
  const formatter = timeFormatterFor(currentLocation.timezone);

  els.popoverTitle.textContent = KIND_LABEL[segment.kind] || segment.kind;
  els.popoverStart.textContent = formatter.format(segment.start);
  els.popoverEnd.textContent = formatter.format(segment.end);
  els.popoverProgress.textContent = `${percent}%`;

  els.popover.hidden = false;
  positionPopover(event);
}

function positionPopover(event) {
  const { innerWidth, innerHeight } = window;
  const popoverRect = els.popover.getBoundingClientRect();

  // Keyboard activation (Enter/Space) has no meaningful clientX/Y — anchor to the
  // activated element itself instead of the (absent) pointer position.
  let anchorX = event.clientX;
  let anchorY = event.clientY;
  if (!anchorX && !anchorY && event.currentTarget?.getBoundingClientRect) {
    const targetRect = event.currentTarget.getBoundingClientRect();
    anchorX = targetRect.left + targetRect.width / 2;
    anchorY = targetRect.top + targetRect.height / 2;
  }

  const x = Math.min(Math.max(8, anchorX - popoverRect.width / 2), innerWidth - popoverRect.width - 8);
  const y = Math.min(anchorY + 16, innerHeight - popoverRect.height - 8);
  els.popover.style.left = `${x}px`;
  els.popover.style.top = `${y}px`;
}

function timeFormatterFor(timezone) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone });
}

// The location's own current date, not the browser's — a distant location's calendar day can
// genuinely differ from the viewer's (see the day-boundary-crossing note in Phase 2's spec).
function renderLocationLabel() {
  els.locationLabel.textContent = currentLocation.label;
  els.locationDate.textContent = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: currentLocation.timezone,
  }).format(new Date());
}

// Physically gold/blue during the actual hour; a fainter neutral "anticipation" pulse during
// the 20-minute padding either side; fully static/default once we're well away from any
// transition. Kept in sync with the same transitionWindow the diagram itself renders from.
function updateAmbient(transitionWindow) {
  let ambient = null;
  if (transitionWindow) {
    if (transitionWindow.currentKind === 'blue' || transitionWindow.currentKind === 'gold') {
      ambient = transitionWindow.currentKind;
    } else if (transitionWindow.isWithinWindow) {
      ambient = 'active';
    }
  }

  if (ambient) {
    document.body.dataset.ambient = ambient;
  } else {
    delete document.body.dataset.ambient;
  }
}

function renderTransition() {
  hidePopover();
  const now = new Date();
  const transitionWindow = getTransitionWindow(currentLocation.lat, currentLocation.lng, now);
  renderTransitionDiagram(els.transitionDiagram, transitionWindow, currentLocation.timezone, showPopover);
  els.transitionSummary.textContent = formatSummary(transitionWindow, now);
  updateAmbient(transitionWindow);
  renderLocationLabel(); // keeps the date correct across a midnight rollover in long-lived sessions
}

function setLocation(location) {
  currentLocation = location;
  setCachedLocation(location);
  renderLocationLabel();
  renderLightTimes();
  renderTransition();
  showMessage('');
  clearResults();
  els.locationDetails.open = false;
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

els.popoverClose.addEventListener('click', hidePopover);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !els.popover.hidden) hidePopover();
});

document.addEventListener('click', (event) => {
  if (els.popover.hidden) return;
  const clickedInsidePopover = els.popover.contains(event.target);
  const clickedASegment = event.target.classList?.contains('transition-segment--interactive');
  if (!clickedInsidePopover && !clickedASegment) hidePopover();
});

// A first-ever visit (nothing cached yet) starts with the location card open, inviting the
// user to set a real location; once one is saved, it stays collapsed on future visits.
els.locationDetails.open = !cachedLocationAtLoad;

renderLightTimes();
renderTransition();
setInterval(renderTransition, TRANSITION_REFRESH_MS);
