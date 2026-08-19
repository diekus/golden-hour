import { getLightTimes } from './light-times.js';
import './components/light-window-card.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

// Hardcoded for this phase — real geolocation lands in Phase 2.
const LONDON = { lat: 51.5074, lng: -0.1278 };

function pointCardData(label, pointReading) {
  return { label, accent: 'neutral', start: pointReading, end: null, durationMs: null };
}

function windowCardData(label, accent, windowData) {
  return { label, accent, start: windowData.start, end: windowData.end, durationMs: windowData.durationMs };
}

function renderLightTimes() {
  const times = getLightTimes(LONDON.lat, LONDON.lng, new Date());

  document.getElementById('card-sunrise').data = pointCardData('Sunrise', times.sunrise);
  document.getElementById('card-sunset').data = pointCardData('Sunset', times.sunset);

  document.getElementById('card-golden-morning').data =
    windowCardData('Golden hour — morning', 'golden', times.goldenHourMorning);
  document.getElementById('card-golden-evening').data =
    windowCardData('Golden hour — evening', 'golden', times.goldenHourEvening);

  document.getElementById('card-blue-morning').data =
    windowCardData('Blue hour — morning', 'blue', times.blueHourMorning);
  document.getElementById('card-blue-evening').data =
    windowCardData('Blue hour — evening', 'blue', times.blueHourEvening);
}

renderLightTimes();
