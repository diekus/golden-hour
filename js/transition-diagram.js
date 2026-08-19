const KIND_COLOR_VAR = {
  neutral: 'var(--color-text-muted)',
  blue: 'var(--color-blue)',
  gold: 'var(--color-golden)',
};

const KIND_LABEL = { blue: 'Blue hour', gold: 'Golden hour' };

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 185;
const CENTER_X = VIEW_WIDTH / 2;
const CENTER_Y = 155;
const RADIUS = 110;
const LABEL_RADIUS = RADIUS + 24;
const STROKE_WIDTH = 14;
const MARKER_RADIUS = 9;

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

// Maps a 0..1 fraction of the window onto the top half of a circle, left (0) to right (1).
function pointAt(fraction, radius) {
  const angle = Math.PI * (1 - fraction);
  return {
    x: CENTER_X + radius * Math.cos(angle),
    y: CENTER_Y - radius * Math.sin(angle),
  };
}

function fractionOf(date, windowStart, totalMs) {
  const raw = (date.getTime() - windowStart.getTime()) / totalMs;
  return Math.min(1, Math.max(0, raw));
}

function segmentPath(segment, windowStart, totalMs) {
  const startFrac = fractionOf(segment.start, windowStart, totalMs);
  const endFrac = fractionOf(segment.end, windowStart, totalMs);
  if (endFrac <= startFrac) return null;

  const p1 = pointAt(startFrac, RADIUS);
  const p2 = pointAt(endFrac, RADIUS);
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

// Labels go above the arc (further from centre) and anchor left/middle/right depending on
// which third of the arc they land in, so they don't run off the edge of the viewBox.
function labelAnchor(fraction) {
  if (fraction < 0.2) return 'start';
  if (fraction > 0.8) return 'end';
  return 'middle';
}

function boundaryLabels(transitionWindow, timezone) {
  const { windowStart, windowEnd, segments } = transitionWindow;
  const totalMs = windowEnd.getTime() - windowStart.getTime();
  const formatter = timeFormatter(timezone);

  // The three real colour boundaries: colour-1 start, the colour-1/colour-2 transition, and
  // colour-2 end. segments[0]/[3] are just neutral padding, not meaningful transitions.
  const boundaryDates = [segments[1].start, segments[2].start, segments[2].end];

  return boundaryDates.map((date) => {
    const fraction = fractionOf(date, windowStart, totalMs);
    const point = pointAt(fraction, LABEL_RADIUS);
    return { x: point.x, y: point.y, anchor: labelAnchor(fraction), text: formatter.format(date) };
  });
}

const SUN_ICON_RADIUS = 9;

// A small sunrise/sunset badge (horizon line + sun + rays) placed on the arc at the actual
// sunrise/sunset instant — the sun-on-the-horizon moment itself, distinct from the golden/blue
// hour boundaries already marked by text labels. Same glyph for both events; which one it is
// is already clear from which half of the arc it sits on and the "Right now" summary text.
function sunEventMarkup(transitionWindow) {
  const { windowStart, windowEnd, sunEvent } = transitionWindow;
  if (!sunEvent) return '';

  const totalMs = windowEnd.getTime() - windowStart.getTime();
  const fraction = fractionOf(sunEvent.time, windowStart, totalMs);
  const { x, y } = pointAt(fraction, RADIUS);
  const r = SUN_ICON_RADIUS;

  return `
    <g transform="translate(${x.toFixed(2)}, ${y.toFixed(2)})" class="transition-sun-icon" aria-hidden="true">
      <circle r="${r + 1.5}" fill="var(--color-surface)" opacity="0.9" />
      <line x1="${-r * 0.65}" y1="0" x2="${r * 0.65}" y2="0" />
      <path d="M ${-r * 0.5} 0 A ${r * 0.5} ${r * 0.5} 0 0 1 ${r * 0.5} 0" fill="none" />
      <line x1="0" y1="${-r * 0.9}" x2="0" y2="${-r * 0.6}" />
      <line x1="${-r * 0.6}" y1="${-r * 0.6}" x2="${-r * 0.4}" y2="${-r * 0.4}" />
      <line x1="${r * 0.6}" y1="${-r * 0.6}" x2="${r * 0.4}" y2="${-r * 0.4}" />
    </g>
  `;
}

function segmentMarkup(segment, index, windowStart, totalMs, interactive) {
  const d = segmentPath(segment, windowStart, totalMs);
  if (!d) return '';

  const isColoured = segment.kind === 'blue' || segment.kind === 'gold';
  const isInteractive = isColoured && interactive;
  const attrs = isInteractive
    ? `tabindex="0" role="button" aria-label="${KIND_LABEL[segment.kind]} details" data-segment-index="${index}" class="transition-segment transition-segment--interactive"`
    : 'aria-hidden="true" class="transition-segment"';

  // Blue is dashed, not just a different hue — gold and blue must stay distinguishable to
  // someone who can't reliably tell the two colours apart (WCAG 1.4.1, use of colour), not
  // just to someone with typical colour vision.
  const dasharray = segment.kind === 'blue' ? ' stroke-dasharray="10 8"' : '';

  return `<path d="${d}" fill="none" stroke="${KIND_COLOR_VAR[segment.kind]}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round"${dasharray} ${attrs} />`;
}

// The <svg> itself is NOT aria-hidden: the interactive gold/blue segments are genuinely
// focusable/labelled elements, and aria-hidden on an ancestor removes an entire subtree from
// the accessibility tree regardless of a descendant's own role/tabindex — that would make them
// keyboard-focusable "phantom" stops a screen reader user could never actually reach. Instead,
// each purely decorative piece (non-interactive segments, boundary labels, sun icon, position
// marker) is hidden individually, so only the meaningful interactive parts are exposed.
export function renderTransitionDiagram(container, transitionWindow, timezone, onSegmentActivate) {
  if (!transitionWindow) {
    container.innerHTML = '';
    return;
  }

  const { windowStart, windowEnd, segments, nowFraction, currentKind } = transitionWindow;
  const totalMs = windowEnd.getTime() - windowStart.getTime();

  const segmentsMarkup = segments
    .map((segment, index) => segmentMarkup(segment, index, windowStart, totalMs, Boolean(onSegmentActivate)))
    .join('');

  const labelsMarkup = boundaryLabels(transitionWindow, timezone)
    .map(
      (label) =>
        `<text x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}" text-anchor="${label.anchor}" class="transition-label" aria-hidden="true">${label.text}</text>`,
    )
    .join('');

  const marker = pointAt(nowFraction, RADIUS);
  const markerColor = KIND_COLOR_VAR[currentKind];

  container.innerHTML = `
    <svg viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" class="transition-svg">
      ${segmentsMarkup}
      ${sunEventMarkup(transitionWindow)}
      ${labelsMarkup}
      <circle cx="${marker.x.toFixed(2)}" cy="${marker.y.toFixed(2)}" r="${MARKER_RADIUS}" fill="var(--color-surface)" stroke="${markerColor}" stroke-width="3" aria-hidden="true" />
    </svg>
  `;

  if (!onSegmentActivate) return;

  const activate = (event) => {
    const index = Number(event.currentTarget.dataset.segmentIndex);
    onSegmentActivate(segments[index], event);
  };

  container.querySelectorAll('.transition-segment--interactive').forEach((el) => {
    el.addEventListener('click', activate);
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate(event);
      }
    });
  });
}
