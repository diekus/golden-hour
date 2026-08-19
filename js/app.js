import { getLightTimes } from './light-times.js';
import { getTransitionWindow } from './transition-window.js';
import { renderTransitionDiagram } from './transition-diagram.js';
import { fetchForecast, averageForWindow, getCachedForecast, setCachedForecast } from './weather.js';
import './components/light-window-card.js';
import {
  DEFAULT_LOCATION,
  getCachedLocation,
  setCachedLocation,
  resolveViaGeolocation,
  searchLocations,
  toLocation,
  locationFromSearchParams,
} from './location.js';
import {
  isSupported as notificationsSupported,
  getOptIn as getNotifyOptIn,
  setOptIn as setNotifyOptIn,
  getPermission as getNotifyPermission,
  requestPermission as requestNotifyPermission,
  scheduleNext as scheduleNextNotification,
  cancelScheduled as cancelScheduledNotification,
} from './notifications.js';
import { buildSharePayload } from './share.js';

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
  weatherWarning: document.getElementById('weather-warning'),
  offlineIndicator: document.getElementById('offline-indicator'),
  featuredSection: document.getElementById('featured-section'),
  notifyToggle: document.getElementById('notify-toggle'),
  notifyToggleLabel: document.getElementById('notify-toggle-label'),
  notifyStatus: document.getElementById('notify-status'),
  shareToggle: document.getElementById('share-toggle'),
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

// A shared link's location wins over whatever's cached on this device — the visitor followed a
// link to a specific place, so that intent takes priority. Consumed once: cached for future
// visits and stripped from the URL so a later plain reload doesn't keep re-reading it.
const sharedLocationAtLoad = locationFromSearchParams(window.location.search);
if (sharedLocationAtLoad) {
  setCachedLocation(sharedLocationAtLoad);
  window.history.replaceState(null, '', window.location.pathname);
}

const cachedLocationAtLoad = getCachedLocation();
let currentLocation = sharedLocationAtLoad || cachedLocationAtLoad || DEFAULT_LOCATION;

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

// Preserves whatever `featured` state the card already had — updateFeaturedCard only re-applies
// it when the *active card's identity* changes, so if this function's fresh windowCardData()
// wiped it unconditionally, a still-featured card would lose its styling on any re-render
// (e.g. a location switch) that doesn't happen to also change which window is active.
function setWindowCard(id, label, accent, windowData, timezone) {
  const card = document.getElementById(id);
  card.data = { ...windowCardData(label, accent, windowData, timezone), featured: card.data?.featured };
}

function renderLightTimes() {
  const times = getLightTimes(currentLocation.lat, currentLocation.lng, new Date());
  const tz = currentLocation.timezone;

  document.getElementById('card-sunrise').data = pointCardData('Sunrise', times.sunrise, tz);
  document.getElementById('card-sunset').data = pointCardData('Sunset', times.sunset, tz);

  setWindowCard('card-golden-morning', 'Golden hour — morning', 'golden', times.goldenHourMorning, tz);
  setWindowCard('card-golden-evening', 'Golden hour — evening', 'golden', times.goldenHourEvening, tz);
  setWindowCard('card-blue-morning', 'Blue hour — morning', 'blue', times.blueHourMorning, tz);
  setWindowCard('card-blue-evening', 'Blue hour — evening', 'blue', times.blueHourEvening, tz);

  return times;
}

const WEATHER_CARDS = [
  { id: 'card-golden-morning', window: 'goldenHourMorning' },
  { id: 'card-golden-evening', window: 'goldenHourEvening' },
  { id: 'card-blue-morning', window: 'blueHourMorning' },
  { id: 'card-blue-evening', window: 'blueHourEvening' },
];

// Single source of truth for "what's the weather for window X", keyed the same way as
// WEATHER_CARDS — the Phase 5 warning reads from here instead of querying the DOM cards.
let weatherByWindow = {};

// Fetched once per location (never blocks the light-time cards, which are already rendered
// by the time this resolves) and merged into each of the 4 golden/blue-hour cards' existing
// data. Guards against a race where the location changes again before this fetch resolves —
// stale weather for a since-replaced location must never get applied.
async function renderWeather(times, location) {
  // Cleared synchronously, before the fetch even starts — otherwise a location switch would
  // briefly show the *previous* location's warning (renderTransition below runs synchronously
  // right after this is called, well before the fetch resolves).
  weatherByWindow = {};

  let hourly = null;
  let stale = false;
  try {
    hourly = await fetchForecast(location.lat, location.lng);
    setCachedForecast(location.lat, location.lng, hourly);
  } catch {
    // Fresh fetch failed (e.g. offline) — fall back to the last cached forecast, but only if
    // it's for a location close enough to this one to plausibly still be relevant.
    hourly = getCachedForecast(location.lat, location.lng);
    stale = hourly !== null;
  }

  if (currentLocation !== location) return;

  for (const { id, window } of WEATHER_CARDS) {
    const card = document.getElementById(id);
    const windowData = times[window];
    const averaged =
      windowData.start && windowData.end
        ? averageForWindow(hourly, windowData.start.time, windowData.end.time)
        : null;
    const weather = averaged ? { ...averaged, stale } : null;
    card.data = { ...card.data, weather };
    weatherByWindow[window] = weather;
  }

  // The forecast usually resolves after the first renderTransition() call — give the warning
  // a chance to appear as soon as data actually arrives, without waiting for the next tick.
  renderWeatherWarning(getTransitionWindow(currentLocation.lat, currentLocation.lng, new Date()));
}

// Maps the transition state to one of the 4 window keys above: the window currently active
// (currentKind is 'gold'/'blue') or the one being waited for (nextTransition.toKind is
// 'gold'/'blue'). Returns null when neither applies — e.g. the trailing-padding edge case
// right after a window ends, where there's no specific upcoming colour left to speak to.
function resolveActiveWeatherWindow(transitionWindow) {
  if (!transitionWindow) return null;
  const { currentKind, nextTransition, direction } = transitionWindow;

  const kind = currentKind === 'gold' || currentKind === 'blue' ? currentKind : nextTransition?.toKind;
  if (kind !== 'gold' && kind !== 'blue') return null;

  const prefix = kind === 'gold' ? 'goldenHour' : 'blueHour';
  const suffix = direction === 'morning' ? 'Morning' : 'Evening';
  return `${prefix}${suffix}`;
}

const CARD_ID_BY_KIND_DIRECTION = {
  gold: { morning: 'card-golden-morning', evening: 'card-golden-evening' },
  blue: { morning: 'card-blue-morning', evening: 'card-blue-evening' },
};

// Strictly "happening right now", unlike resolveActiveWeatherWindow above which also covers
// "waiting for the next one" — the featured card only surfaces while a golden/blue hour is
// actually in progress, not during the run-up to it.
function activeCardId(transitionWindow) {
  if (!transitionWindow) return null;
  const { currentKind, direction } = transitionWindow;
  if (currentKind !== 'gold' && currentKind !== 'blue') return null;
  return CARD_ID_BY_KIND_DIRECTION[currentKind][direction];
}

// Where each golden/blue-hour card normally lives, captured once at startup so it can be
// moved back exactly where it came from when it's no longer the active one.
const cardHome = {};
for (const id of Object.values(CARD_ID_BY_KIND_DIRECTION).flatMap((byDirection) => Object.values(byDirection))) {
  const el = document.getElementById(id);
  cardHome[id] = { parent: el.parentElement, nextSibling: el.nextElementSibling };
}

let featuredCardId = null;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// FLIP (First, Last, Invert, Play): captures el's on-screen position before moveFn runs it
// through a DOM relocation, then animates from that position to wherever moveFn actually put
// it — turns what would otherwise be an instant, disorienting snap into a visible slide.
// moveFn should perform the DOM move AND any accompanying data/style update together, so the
// "last" position reflects the element's true final appearance (e.g. the featured badge's
// extra line), not a transient in-between state.
function flipMove(el, moveFn) {
  if (prefersReducedMotion()) {
    moveFn();
    return;
  }

  const first = el.getBoundingClientRect();
  moveFn();
  const last = el.getBoundingClientRect();
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  if (dx === 0 && dy === 0) return;

  el.style.transition = 'none';
  el.style.transform = `translate(${dx}px, ${dy}px)`;
  el.getBoundingClientRect(); // force layout so the inverted position commits before animating away from it
  requestAnimationFrame(() => {
    el.style.transition = 'transform 0.4s ease';
    el.style.transform = '';
  });
  el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
}

// Physically relocates the currently-active card into #featured-section, right under the
// diagram, with a strong colour fill (light-window-card's `featured` flag) — rather than
// cloning/mirroring its data into a separate element, which would risk the two falling out of
// sync. Moves it back to its original position the moment it stops being the active one.
function updateFeaturedCard(transitionWindow) {
  const nextId = activeCardId(transitionWindow);
  if (nextId === featuredCardId) return;

  if (featuredCardId) {
    const prevEl = document.getElementById(featuredCardId);
    const home = cardHome[featuredCardId];
    flipMove(prevEl, () => {
      home.parent.insertBefore(prevEl, home.nextSibling);
      prevEl.data = { ...prevEl.data, featured: false };
    });
  }

  featuredCardId = nextId;

  if (featuredCardId) {
    const el = document.getElementById(featuredCardId);
    els.featuredSection.hidden = false;
    flipMove(el, () => {
      els.featuredSection.appendChild(el);
      el.data = { ...el.data, featured: true };
    });
  } else {
    els.featuredSection.hidden = true;
  }
}

const CLOUD_CAUTION = 40;
const CLOUD_WARNING = 80;
const PRECIP_CAUTION = 20;
const PRECIP_WARNING = 50;

// Pure interpretation layer over Phase 4's raw numbers — no fetching, no averaging, just
// turning { cloudCover, precipProbability, stale } into a plain-language status.
function formatWeatherWarning(weather) {
  if (!weather) return { tier: null, text: '' };
  const { cloudCover, precipProbability, stale } = weather;
  const suffix = stale ? ' (may be outdated)' : '';

  const cloudWarning = cloudCover > CLOUD_WARNING;
  const precipWarning = precipProbability > PRECIP_WARNING;
  if (cloudWarning || precipWarning) {
    const clauses = [];
    if (cloudWarning) clauses.push('heavy cloud');
    if (precipWarning) clauses.push('rain');
    return { tier: 'warning', text: `Likely washed out — ${clauses.join(' and ')} expected.${suffix}` };
  }

  const cloudCaution = cloudCover > CLOUD_CAUTION;
  const precipCaution = precipProbability > PRECIP_CAUTION;
  if (cloudCaution && precipCaution) {
    return { tier: 'caution', text: `Partly cloudy with some rain risk — could go either way.${suffix}` };
  }
  if (cloudCaution) {
    return { tier: 'caution', text: `Partly cloudy — could go either way.${suffix}` };
  }
  if (precipCaution) {
    return { tier: 'caution', text: `Some rain risk — could go either way.${suffix}` };
  }

  return { tier: 'good', text: `Clear skies expected.${suffix}` };
}

function renderWeatherWarning(transitionWindow) {
  const windowKey = resolveActiveWeatherWindow(transitionWindow);
  const weather = windowKey ? weatherByWindow[windowKey] : null;
  const { tier, text } = formatWeatherWarning(weather);

  els.weatherWarning.textContent = text;
  if (tier) {
    els.weatherWarning.dataset.tier = tier;
  } else {
    delete els.weatherWarning.dataset.tier;
  }
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

// Tracks the segment that opened the popover, so focus can return to it on close — role="dialog"
// implies that contract (focus moves in on open, returns to the trigger on close), which the
// original implementation didn't honour. Still valid at hidePopover() time even after a periodic
// re-render: renderTransition() always calls hidePopover() *before* rebuilding the diagram's DOM,
// so this reference isn't yet stale when it's read.
let popoverTriggerEl = null;

// Visibility is class-driven, not the hidden attribute — see css/styles.css's
// .transition-popover comment for why (the hidden attribute's UA `display: none !important`
// would fight the animated display transition).
const POPOVER_OPEN_CLASS = 'transition-popover--open';

function isPopoverOpen() {
  return els.popover.classList.contains(POPOVER_OPEN_CLASS);
}

function hidePopover() {
  const wasVisible = isPopoverOpen();
  els.popover.classList.remove(POPOVER_OPEN_CLASS);
  if (wasVisible) popoverTriggerEl?.focus();
  popoverTriggerEl = null;
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

  popoverTriggerEl = event.currentTarget;
  els.popover.classList.add(POPOVER_OPEN_CLASS);
  positionPopover(event);
  els.popoverClose.focus();
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

const NOTIFY_STATUS_MESSAGE = {
  denied: 'Notifications are blocked for this site. Enable them in your browser settings to use this.',
  on: "You'll get a notification when golden hour starts — only while this app stays open.",
};

// Reflects current permission/opt-in state into the toggle — called after every state change,
// not just once, since permission can also change outside our own click handler (e.g. the user
// revokes it from browser settings between visits).
function renderNotifyToggle() {
  if (!notificationsSupported()) {
    els.notifyToggle.hidden = true;
    els.notifyStatus.hidden = true;
    return;
  }

  const permission = getNotifyPermission();
  const optedIn = getNotifyOptIn() && permission === 'granted';

  els.notifyToggle.hidden = false;
  els.notifyToggle.disabled = permission === 'denied';
  els.notifyToggle.setAttribute('aria-pressed', String(optedIn));
  els.notifyToggleLabel.textContent = optedIn ? 'Notifications on' : 'Notify me when golden hour starts';

  const statusText = permission === 'denied' ? NOTIFY_STATUS_MESSAGE.denied : optedIn ? NOTIFY_STATUS_MESSAGE.on : '';
  els.notifyStatus.textContent = statusText;
  els.notifyStatus.hidden = !statusText;
}

async function toggleNotifications() {
  const permission = getNotifyPermission();

  if (permission === 'denied') {
    renderNotifyToggle();
    return;
  }

  if (permission === 'default') {
    const result = await requestNotifyPermission();
    setNotifyOptIn(result === 'granted');
    if (result === 'granted') scheduleNextNotification(currentLocation);
    renderNotifyToggle();
    return;
  }

  const nextOptIn = !getNotifyOptIn();
  setNotifyOptIn(nextOptIn);
  if (nextOptIn) {
    scheduleNextNotification(currentLocation);
  } else {
    cancelScheduledNotification();
  }
  renderNotifyToggle();
}

els.notifyToggle.addEventListener('click', toggleNotifications);

// Hidden entirely on browsers without the Web Share API — matches the notify toggle's
// progressive-enhancement precedent (Phase 7): nothing shown, no degraded alternate mechanism.
els.shareToggle.hidden = !('share' in navigator);

els.shareToggle.addEventListener('click', async () => {
  const times = getLightTimes(currentLocation.lat, currentLocation.lng, new Date());
  const payload = buildSharePayload(currentLocation, times);
  try {
    await navigator.share(payload);
  } catch {
    // AbortError (user dismissed the share sheet) is a normal outcome, not a failure. Any other
    // rejection is also left silent: this is a best-effort convenience feature, and a real
    // failure is already visible to the user in the OS-level share sheet itself.
  }
});

function renderTransition() {
  hidePopover();
  const now = new Date();
  const transitionWindow = getTransitionWindow(currentLocation.lat, currentLocation.lng, now);
  renderTransitionDiagram(els.transitionDiagram, transitionWindow, currentLocation.timezone, showPopover);
  els.transitionSummary.textContent = formatSummary(transitionWindow, now);
  updateAmbient(transitionWindow);
  renderWeatherWarning(transitionWindow);
  updateFeaturedCard(transitionWindow);
  renderLocationLabel(); // keeps the date correct across a midnight rollover in long-lived sessions
}

function setLocation(location) {
  currentLocation = location;
  setCachedLocation(location);
  renderLocationLabel();
  const times = renderLightTimes();
  renderWeather(times, location);
  renderTransition();
  showMessage('');
  clearResults();
  els.locationDetails.open = false;
  if (getNotifyOptIn() && getNotifyPermission() === 'granted') {
    scheduleNextNotification(currentLocation);
  }
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
  if (event.key === 'Escape' && isPopoverOpen()) hidePopover();
});

document.addEventListener('click', (event) => {
  if (!isPopoverOpen()) return;
  const clickedInsidePopover = els.popover.contains(event.target);
  const clickedASegment = event.target.classList?.contains('transition-segment--interactive');
  if (!clickedInsidePopover && !clickedASegment) hidePopover();
});

// A first-ever visit (nothing cached yet) starts with the location card open, inviting the
// user to set a real location; once one is saved, it stays collapsed on future visits.
els.locationDetails.open = !cachedLocationAtLoad;

// Single persistent signal covering both "why is weather stale" and "why can't I change
// location" — checked immediately on load (navigator.onLine reflects current state right
// away), not just reactively after some action fails.
function updateOnlineStatus() {
  els.offlineIndicator.hidden = navigator.onLine;
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

renderNotifyToggle();
if (getNotifyOptIn() && getNotifyPermission() === 'granted') {
  scheduleNextNotification(currentLocation);
}

const initialTimes = renderLightTimes();
renderWeather(initialTimes, currentLocation);
renderTransition();
setInterval(renderTransition, TRANSITION_REFRESH_MS);
