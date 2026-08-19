import { getNextGoldenHourStart } from './transition-window.js';

const OPT_IN_KEY = 'golden-hour:notify-opt-in';
const NOTIFICATION_TAG = 'golden-hour-start';

let timeoutId = null;

export function isSupported() {
  return typeof Notification !== 'undefined';
}

export function getOptIn() {
  try {
    return localStorage.getItem(OPT_IN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOptIn(value) {
  try {
    localStorage.setItem(OPT_IN_KEY, value ? 'true' : 'false');
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — non-fatal, the toggle just
    // won't persist across reloads.
  }
}

export function getPermission() {
  return isSupported() ? Notification.permission : 'denied';
}

export function requestPermission() {
  return Notification.requestPermission();
}

export function cancelScheduled() {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

// Schedules exactly one Notification for the next golden-hour-start at the given location, then
// re-schedules itself for the one after that once it fires — so there is only ever one pending
// timer. This is a page-context setTimeout, so it only survives while this tab/app stays open;
// there is no background delivery in this phase (see requirements.md).
export function scheduleNext(location) {
  cancelScheduled();
  if (!isSupported() || Notification.permission !== 'granted') return;

  const next = getNextGoldenHourStart(location.lat, location.lng, new Date());
  if (!next) return;

  const delay = Math.max(0, next.time.getTime() - Date.now());
  timeoutId = setTimeout(() => {
    new Notification('Golden Hour', {
      body: 'Golden hour is starting now.',
      tag: NOTIFICATION_TAG,
    });
    scheduleNext(location);
  }, delay);
}
