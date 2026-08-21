import { needsExplicitPermission, requestPermission, subscribeHeading } from '../compass.js';

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

// Compass rose geometry (Phase 12). North-based, clockwise, matching js/light-times.js's
// azimuth convention (0 = N, 90 = E, 180 = S, 270 = W), so an azimuth value maps straight onto
// the rose with no conversion beyond degrees-to-radians.
const COMPASS_CENTER = 60;
const COMPASS_RADIUS = 46;
const CARDINAL_LABELS = [
  { label: 'N', azimuth: 0 },
  { label: 'E', azimuth: 90 },
  { label: 'S', azimuth: 180 },
  { label: 'W', azimuth: 270 },
];

function compassPoint(azimuthDeg, radius) {
  const rad = (azimuthDeg * Math.PI) / 180;
  return {
    x: COMPASS_CENTER + radius * Math.sin(rad),
    y: COMPASS_CENTER - radius * Math.cos(rad),
  };
}

function compassDialMarkup() {
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 30) {
    const outer = compassPoint(deg, COMPASS_RADIUS + 2);
    const inner = compassPoint(deg, COMPASS_RADIUS - 4);
    ticks.push(
      `<line x1="${inner.x.toFixed(2)}" y1="${inner.y.toFixed(2)}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}" class="compass-tick" />`
    );
  }
  const labels = CARDINAL_LABELS.map(({ label, azimuth }) => {
    const pos = compassPoint(azimuth, COMPASS_RADIUS + 11);
    return `<text x="${pos.x.toFixed(2)}" y="${pos.y.toFixed(2)}" class="compass-cardinal" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
  }).join('');
  return `${ticks.join('')}${labels}`;
}

// Drawn as a stem + arrowhead from the rose's centre out to its edge, rather than plain text —
// the point is to *see* a direction at a glance. `start`/`end` share the same shape but differ
// in fill (hollow vs solid) via their class, so the two are visually distinguishable without
// needing on-rose text labels (exact degrees live in the text readout below the rose instead,
// where they're also screen-reader reachable).
function compassArrowMarkup(azimuthDeg, className) {
  const tip = compassPoint(azimuthDeg, COMPASS_RADIUS);
  const leftWing = compassPoint(azimuthDeg - 7, COMPASS_RADIUS - 11);
  const rightWing = compassPoint(azimuthDeg + 7, COMPASS_RADIUS - 11);
  return `
    <line x1="${COMPASS_CENTER}" y1="${COMPASS_CENTER}" x2="${tip.x.toFixed(2)}" y2="${tip.y.toFixed(2)}" class="${className}" />
    <polygon points="${tip.x.toFixed(2)},${tip.y.toFixed(2)} ${leftWing.x.toFixed(2)},${leftWing.y.toFixed(2)} ${rightWing.x.toFixed(2)},${rightWing.y.toFixed(2)}" class="${className}" />
  `;
}

function formatElevation(altitude) {
  const rounded = Math.round(altitude);
  return rounded < 0 ? `${rounded}° elevation (below horizon)` : `${rounded}° elevation`;
}

function compassReadout(start, end) {
  const startText = `Start ${Math.round(start.azimuth)}° ${start.azimuthLabel}, ${formatElevation(start.altitude)}`;
  const endText = `End ${Math.round(end.azimuth)}° ${end.azimuthLabel}, ${formatElevation(end.altitude)}`;
  return `${startText} · ${endText}`;
}

// The compass toggle only makes sense for an actual golden/blue hour *window* (light moves
// between two azimuths across it) — sunrise/sunset are single instants with nothing to compare,
// and derived straight from the card's own data rather than a separate flag threaded through
// js/app.js, so there's one less thing to keep in sync.
function hasCompassData(accent, start, end) {
  return (accent === 'golden' || accent === 'blue') && Boolean(start?.azimuth != null && end?.azimuth != null);
}

function compassMarkup(start, end) {
  const dial = compassDialMarkup();
  const startArrow = compassArrowMarkup(start.azimuth, 'compass-arrow compass-arrow--start');
  const endArrow = compassArrowMarkup(end.azimuth, 'compass-arrow compass-arrow--end');

  return `
    <details class="compass-details">
      <summary class="compass-toggle">
        <svg class="compass-toggle-icon" viewBox="0 0 18 18" width="14" height="14" aria-hidden="true" focusable="false">
          <circle cx="9" cy="9" r="7.2" fill="none" stroke="currentColor" stroke-width="1.2" />
          <polygon points="9,3.4 11,9.6 9,14.6 7,9.6" fill="currentColor" />
        </svg>
        <span>Compass</span>
        <span class="compass-chevron" aria-hidden="true"></span>
      </summary>
      <div class="compass-panel">
        <svg class="compass-rose" viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" focusable="false">
          <circle cx="${COMPASS_CENTER}" cy="${COMPASS_CENTER}" r="${COMPASS_RADIUS}" class="compass-ring" />
          <polygon points="60,6 55,17 65,17" class="compass-heading-marker" />
          <g class="compass-rotor">
            ${dial}
            ${startArrow}
            ${endArrow}
          </g>
        </svg>
        <p class="compass-readout">${compassReadout(start, end)}</p>
        <p class="compass-status"></p>
      </div>
    </details>
  `;
}

class LightWindowCard extends HTMLElement {
  constructor() {
    super();
    this._data = null;
    // Compass live-heading state (Phase 12) — lives on the instance, not the DOM, because
    // _render() below replaces the shadow DOM wholesale on every data change (e.g. the periodic
    // weather/transition refresh in js/app.js) while a live sensor subscription and "has the
    // user already been asked for permission" both need to survive that.
    this._compassUnsubscribe = null;
    this._compassPermissionAsked = false;
    this._compassRotorEl = null;
    this._compassSvgEl = null;
    this._compassStatusEl = null;
  }

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._render();
  }

  disconnectedCallback() {
    // Otherwise a card removed from the DOM (e.g. js/app.js relocating the active card into
    // #featured-section) could leave a live deviceorientation listener running indefinitely.
    this._stopLiveHeading();
  }

  set data(value) {
    this._data = value;
    this._render();
  }

  get data() {
    return this._data;
  }

  _startLiveHeading() {
    if (this._compassUnsubscribe || !this._compassRotorEl) return;
    this._compassUnsubscribe = subscribeHeading(
      (heading) => {
        // Rotates the dial (ticks/labels/arrows together), not the arrows alone — matches how a
        // real compass app works: the fixed marker at the top of the rose (compass-heading-marker)
        // represents "where the device is pointing right now", and the dial spins underneath it.
        this._compassRotorEl.style.transform = `rotate(${(-heading).toFixed(2)}deg)`;
        this._compassSvgEl?.classList.add('compass-rose--live');
        if (this._compassStatusEl && !this._compassStatusEl.textContent) {
          this._compassStatusEl.textContent = 'Following your device';
        }
      },
      () => {
        // Unsupported, permission denied, or no event arrived in time — stays on the static
        // rose already rendered; nothing to undo since nothing moved yet.
        this._compassUnsubscribe = null;
      }
    );
  }

  _stopLiveHeading() {
    this._compassUnsubscribe?.();
    this._compassUnsubscribe = null;
    if (this._compassRotorEl) this._compassRotorEl.style.transform = '';
    this._compassSvgEl?.classList.remove('compass-rose--live');
    if (this._compassStatusEl) this._compassStatusEl.textContent = '';
  }

  // Attaches the toggle's open/close and permission-request behaviour after _render() has
  // (re)built the shadow DOM. `reopen` carries over an already-open panel (and, if it was live,
  // its subscription) across a data-driven re-render, so a periodic refresh elsewhere in the app
  // doesn't silently collapse a compass the user had open.
  _wireCompass(reopen) {
    const detailsEl = this.shadowRoot.querySelector('.compass-details');
    const summaryEl = this.shadowRoot.querySelector('.compass-toggle');
    this._compassRotorEl = this.shadowRoot.querySelector('.compass-rotor');
    this._compassSvgEl = this.shadowRoot.querySelector('.compass-rose');
    this._compassStatusEl = this.shadowRoot.querySelector('.compass-status');
    if (!detailsEl || !summaryEl) return;

    // Must run synchronously inside this click handler, before any await, or iOS Safari silently
    // ignores the permission request — it only honours requestPermission() called directly within
    // a user-gesture event handler. Asked at most once per card instance, only on the way *into*
    // an open state, never on close.
    summaryEl.addEventListener('click', () => {
      if (detailsEl.open) return;
      if (needsExplicitPermission() && !this._compassPermissionAsked) {
        this._compassPermissionAsked = true;
        requestPermission();
      }
    });

    detailsEl.addEventListener('toggle', () => {
      if (detailsEl.open) {
        this._startLiveHeading();
      } else {
        this._stopLiveHeading();
      }
    });

    if (reopen) {
      detailsEl.open = true;
      this._startLiveHeading();
    }
  }

  _render() {
    if (!this.shadowRoot || !this._data) return;

    const previousDetails = this.shadowRoot.querySelector('.compass-details');
    const compassWasOpen = Boolean(previousDetails?.open);
    this._stopLiveHeading();

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

    const hasCompass = hasCompassData(accent, start, end);
    const compassSectionMarkup = hasCompass ? compassMarkup(start, end) : '';

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
        .compass-details {
          margin-top: 0.5rem;
          border-top: 1px solid ${mutedColor};
        }
        .compass-toggle {
          list-style: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.5rem 0 0.1rem;
          font-size: 0.78rem;
          font-weight: 600;
          color: ${textColor};
        }
        .compass-toggle::-webkit-details-marker {
          display: none;
        }
        .compass-toggle-icon {
          flex-shrink: 0;
          color: ${accentColor};
        }
        .compass-chevron {
          margin-left: auto;
          width: 0.5rem;
          height: 0.5rem;
          border-right: 2px solid ${mutedColor};
          border-bottom: 2px solid ${mutedColor};
          transform: rotate(45deg);
          transition: transform 0.15s ease;
        }
        .compass-details[open] .compass-chevron {
          transform: rotate(-135deg);
        }
        /* Same details-content disclosure technique as css/styles.css's .location-card — has to
           be redeclared here since shadow DOM can't see that light-DOM stylesheet. */
        .compass-details::details-content {
          overflow: hidden;
          transition: content-visibility 0.25s allow-discrete, opacity 0.25s ease, block-size 0.25s ease;
          opacity: 0;
          block-size: 0;
        }
        .compass-details[open]::details-content {
          opacity: 1;
          block-size: auto;
        }
        @starting-style {
          .compass-details[open]::details-content {
            opacity: 0;
            block-size: 0;
          }
        }
        .compass-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          padding: 0.15rem 0 0.5rem;
        }
        .compass-rose {
          width: 100%;
          max-width: 8rem;
          height: auto;
        }
        .compass-ring,
        .compass-tick {
          fill: none;
          stroke: ${mutedColor};
          stroke-width: 1;
          opacity: 0.55;
        }
        .compass-cardinal {
          fill: ${mutedColor};
          font-size: 8px;
          font-family: inherit;
        }
        /* Fixed at the top of the rose, representing "the direction the device currently faces" —
           only meaningful once a live heading is actually driving the rotor, so it's invisible
           until .compass-rose--live is set (js/components/light-window-card.js, on the first
           usable deviceorientation reading). */
        .compass-heading-marker {
          fill: ${mutedColor};
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .compass-rose--live .compass-heading-marker {
          opacity: 0.9;
        }
        .compass-rotor {
          /* transform-box pinned explicitly: SVG child elements default to different transform
             reference boxes across browsers (fill-box vs view-box), which would otherwise put
             this rotation's centre in different places depending on the browser. view-box makes
             the origin below match the SVG's own 0-120 user-unit coordinate system everywhere. */
          transform-box: view-box;
          transform-origin: ${COMPASS_CENTER}px ${COMPASS_CENTER}px;
          transition: transform 0.25s ease;
        }
        .compass-arrow--start {
          fill: none;
          stroke: ${accentColor};
          stroke-width: 1.6;
        }
        .compass-arrow--end {
          fill: ${accentColor};
          stroke: ${accentColor};
          stroke-width: 1.6;
        }
        .compass-readout,
        .compass-status {
          margin: 0;
          font-size: 0.72rem;
          text-align: center;
          color: ${mutedColor};
        }
        .compass-status {
          min-height: 1em;
        }
        @media (prefers-reduced-motion: reduce) {
          .compass-details::details-content,
          .compass-rotor {
            transition: none;
          }
        }
      </style>
      <article class="card">
        ${badgeMarkup}
        <h3>${label}</h3>
        ${timesMarkup}
        ${compassSectionMarkup}
      </article>
    `;

    if (hasCompass) {
      this._wireCompass(compassWasOpen);
    }
  }
}

customElements.define('light-window-card', LightWindowCard);
