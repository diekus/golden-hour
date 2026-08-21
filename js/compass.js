// Device-heading helper for Phase 12's compass. No astronomical calculation, no DOM rendering —
// just "is a live heading available, and if so what is it." Kept independently testable the same
// way js/light-times.js and js/transition-window.js are: pure logic in, callback out.

// If no qualifying orientation event arrives within this window, the caller falls back to a
// static (true-north-up) compass rather than waiting indefinitely — covers both "no sensor"
// (desktop) and "sensor present but never fires" (some browsers/contexts) with one mechanism.
const HEADING_TIMEOUT_MS = 1500;

export function isOrientationSupported() {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

// iOS Safari 13+ gates deviceorientation behind an explicit, gesture-triggered permission
// request; most other browsers expose heading data without one. Feature-detected, not
// UA-sniffed, so it degrades correctly on whatever ships this behaviour next.
export function needsExplicitPermission() {
  return typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
}

// Must be called synchronously within a user-gesture handler (a click) on iOS, or the browser
// silently ignores it — see the caller in light-window-card.js.
export async function requestPermission() {
  if (!needsExplicitPermission()) return 'unsupported';
  try {
    const result = await DeviceOrientationEvent.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

// Cross-browser heading extraction is genuinely inconsistent (this is best-effort, same spirit
// as the Periodic Background Sync notifications documented in specs/tech-stack.md) — prefers
// iOS's already-true-north-relative webkitCompassHeading, else derives one from an absolute
// deviceorientation reading, compensated for the screen's current rotation so portrait/landscape
// doesn't skew it. Returns null when the event doesn't carry usable heading data at all.
function headingFromEvent(event) {
  if (typeof event.webkitCompassHeading === 'number') {
    return event.webkitCompassHeading;
  }
  if (event.absolute === true && typeof event.alpha === 'number') {
    const screenAngle = window.screen?.orientation?.angle ?? 0;
    return (360 - event.alpha + screenAngle + 360) % 360;
  }
  return null;
}

// Subscribes to live compass heading (degrees, 0 = true north, clockwise). Calls onHeading(deg)
// for every usable reading, or onUnavailable() once if support is missing or nothing usable
// arrives within HEADING_TIMEOUT_MS. Returns an unsubscribe function — always safe to call, even
// after onUnavailable() already fired.
export function subscribeHeading(onHeading, onUnavailable) {
  if (!isOrientationSupported()) {
    onUnavailable();
    return () => {};
  }

  const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  let settled = false;

  const handleEvent = (event) => {
    const heading = headingFromEvent(event);
    if (heading == null) return;
    settled = true;
    clearTimeout(timer);
    onHeading(heading);
  };

  window.addEventListener(eventName, handleEvent);

  const timer = setTimeout(() => {
    if (settled) return;
    window.removeEventListener(eventName, handleEvent);
    onUnavailable();
  }, HEADING_TIMEOUT_MS);

  return () => {
    clearTimeout(timer);
    window.removeEventListener(eventName, handleEvent);
  };
}
