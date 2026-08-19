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

// Small flat-design icons, built from basic shapes rather than hand-drawn paths so their
// geometry stays easy to reason about. Decorative only (aria-hidden) — the text alongside
// them already carries the actual information, so a screen reader just reads the numbers.
const CLOUD_ICON = `
  <svg viewBox="0 0 20 14" width="14" height="10" aria-hidden="true" focusable="false" class="weather-icon">
    <circle cx="6" cy="8.5" r="3.6" />
    <circle cx="11" cy="5.8" r="5" />
    <circle cx="15.2" cy="8.3" r="3.4" />
    <rect x="3.2" y="8" width="13.6" height="4.2" rx="2.1" />
  </svg>
`;
const RAIN_ICON = `
  <svg viewBox="0 0 12 16" width="10" height="13" aria-hidden="true" focusable="false" class="weather-icon">
    <path d="M6 1 C8 5 10.5 8.8 10.5 11 A4.5 4.5 0 1 1 1.5 11 C1.5 8.8 4 5 6 1 Z" />
  </svg>
`;

function formatWeather(weather) {
  if (!weather) return '';
  const suffix = weather.stale ? ' (may be outdated)' : '';
  return `${CLOUD_ICON}<span>${weather.cloudCover}%</span> · ${RAIN_ICON}<span>${weather.precipProbability}%${suffix}</span>`;
}

const ACCENT_VAR = {
  golden: 'var(--color-golden)',
  blue: 'var(--color-blue)',
  neutral: 'var(--color-text)',
};

// The "featured" look (strong colour fill) only applies to golden/blue cards — a plain
// point-in-time card (sunrise/sunset) never becomes the currently-active golden/blue hour, so
// there's no "neutral featured" case to design for.
const FEATURED_BG_VAR = { golden: 'var(--color-golden-featured-bg)', blue: 'var(--color-blue-featured-bg)' };
const FEATURED_TEXT_VAR = { golden: 'var(--color-golden-featured-text)', blue: 'var(--color-blue-featured-text)' };
const FEATURED_MUTED_VAR = {
  golden: 'var(--color-golden-featured-text-muted)',
  blue: 'var(--color-blue-featured-text-muted)',
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

    const { label, accent = 'neutral', start, end, durationMs, timezone, weather, featured } = this._data;
    const accentColor = ACCENT_VAR[accent] || ACCENT_VAR.neutral;
    const weatherMarkup = weather ? `<p class="weather">${formatWeather(weather)}</p>` : '';

    // Strong colour fill for whichever specific golden/blue-hour card is the currently-active
    // one — set by js/app.js when transitionWindow.currentKind matches this card's window.
    // Deliberately fixed colours (not theme-derived), and a dedicated text/muted pair chosen
    // for contrast against them — --color-text/-muted are tuned for the neutral surface, not
    // for sitting on top of a saturated background.
    const isFeatured = Boolean(featured) && (accent === 'golden' || accent === 'blue');
    // Two background declarations, not one: color-mix()-based gradients aren't supported by
    // every browser, so the flat fallback is declared first and the gradient after it — an
    // unsupported browser's parser drops the invalid second line and keeps the flat colour,
    // rather than being left with no background at all.
    const cardBackground = isFeatured
      ? `background: ${FEATURED_BG_VAR[accent]};
         background: linear-gradient(145deg, color-mix(in srgb, white 14%, ${FEATURED_BG_VAR[accent]}), ${FEATURED_BG_VAR[accent]} 55%, color-mix(in srgb, black 12%, ${FEATURED_BG_VAR[accent]}));`
      : 'background: var(--color-surface);';
    const cardBorder = isFeatured ? 'none' : `3px solid ${accentColor}`;
    const cardShadow = isFeatured ? 'var(--shadow-md)' : 'var(--shadow-sm)';
    const textColor = isFeatured ? FEATURED_TEXT_VAR[accent] : 'var(--color-text)';
    const mutedColor = isFeatured ? FEATURED_MUTED_VAR[accent] : 'var(--color-text-muted)';
    const badgeMarkup = isFeatured ? '<p class="badge">Happening now</p>' : '';

    const timesMarkup = end
      ? `
        <div class="row">
          <span class="time">${formatTime(start?.time, timezone)}</span>
          <span class="reading">${formatReading(start)}</span>
        </div>
        <div class="connector" aria-hidden="true"></div>
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
          border-left: ${cardBorder};
          ${cardBackground}
          box-shadow: ${cardShadow};
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
        }
        .badge {
          margin: 0 0 0.35rem;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: ${textColor};
          opacity: 0.85;
        }
        h3 {
          margin: 0 0 0.4rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: ${textColor};
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
          color: ${textColor};
        }
        .reading {
          font-size: 0.8rem;
          color: ${mutedColor};
        }
        .connector {
          width: 1px;
          height: 0.65rem;
          margin: 0.15rem 0 0.15rem 1px;
          background: ${mutedColor};
          opacity: 0.5;
        }
        .duration {
          margin: 0.3rem 0 0;
          font-size: 0.8rem;
          color: ${mutedColor};
        }
        .weather {
          margin: 0.3rem 0 0;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.3rem;
          font-size: 0.8rem;
          color: ${mutedColor};
        }
        .weather-icon {
          flex-shrink: 0;
          fill: currentColor;
        }
      </style>
      <article class="card">
        ${badgeMarkup}
        <h3>${label}</h3>
        ${timesMarkup}
      </article>
    `;
  }
}

customElements.define('light-window-card', LightWindowCard);
