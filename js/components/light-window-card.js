const formattersByTimezone = new Map();

function timeFormatter(timezone) {
  let formatter = formattersByTimezone.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    });
    formattersByTimezone.set(timezone, formatter);
  }
  return formatter;
}

function formatTime(date, timezone) {
  return date ? timeFormatter(timezone).format(date) : '--:--';
}

function formatReading(reading) {
  if (!reading) return '';
  return `${Math.round(reading.azimuth)}° ${reading.azimuthLabel}, ${Math.round(reading.altitude)}°`;
}

function formatDuration(ms) {
  if (ms == null) return '';
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function formatWeather(weather) {
  if (!weather) return '';
  return `Cloud ${weather.cloudCover}% · Rain ${weather.precipProbability}%`;
}

const ACCENT_VAR = {
  golden: 'var(--color-golden)',
  blue: 'var(--color-blue)',
  neutral: 'var(--color-text)',
};

class LightWindowCard extends HTMLElement {
  constructor() {
    super();
    this._data = null;
  }

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._render();
  }

  set data(value) {
    this._data = value;
    this._render();
  }

  get data() {
    return this._data;
  }

  _render() {
    if (!this.shadowRoot || !this._data) return;

    const { label, accent = 'neutral', start, end, durationMs, timezone, weather } = this._data;
    const accentColor = ACCENT_VAR[accent] || ACCENT_VAR.neutral;
    const weatherMarkup = weather ? `<p class="weather">${formatWeather(weather)}</p>` : '';

    const timesMarkup = end
      ? `
        <div class="row">
          <span class="time">${formatTime(start?.time, timezone)}</span>
          <span class="reading">${formatReading(start)}</span>
        </div>
        <div class="arrow" aria-hidden="true">↓</div>
        <div class="row">
          <span class="time">${formatTime(end?.time, timezone)}</span>
          <span class="reading">${formatReading(end)}</span>
        </div>
        ${durationMs != null ? `<p class="duration">${formatDuration(durationMs)}</p>` : ''}
        ${weatherMarkup}
      `
      : `
        <div class="row">
          <span class="time">${formatTime(start?.time, timezone)}</span>
          <span class="reading">${formatReading(start)}</span>
        </div>
        ${weatherMarkup}
      `;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .card {
          border-left: 3px solid ${accentColor};
          background: var(--color-surface);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
        }
        h3 {
          margin: 0 0 0.4rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text);
        }
        .row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .time {
          font-variant-numeric: tabular-nums;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-text);
        }
        .reading {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
        .arrow {
          text-align: center;
          color: var(--color-text-muted);
          font-size: 0.75rem;
          line-height: 1.4;
        }
        .duration {
          margin: 0.3rem 0 0;
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
        .weather {
          margin: 0.3rem 0 0;
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
      </style>
      <article class="card">
        <h3>${label}</h3>
        ${timesMarkup}
      </article>
    `;
  }
}

customElements.define('light-window-card', LightWindowCard);
