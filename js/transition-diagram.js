const KIND_COLOR_VAR = {
  neutral: 'var(--color-text-muted)',
  blue: 'var(--color-blue)',
  gold: 'var(--color-golden)',
};

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 160;
const CENTER_X = VIEW_WIDTH / 2;
const CENTER_Y = 145;
const RADIUS = 120;
const STROKE_WIDTH = 14;
const MARKER_RADIUS = 9;

// Maps a 0..1 fraction of the window onto the top half of a circle, left (0) to right (1).
function pointAt(fraction) {
  const angle = Math.PI * (1 - fraction);
  return {
    x: CENTER_X + RADIUS * Math.cos(angle),
    y: CENTER_Y - RADIUS * Math.sin(angle),
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

  const p1 = pointAt(startFrac);
  const p2 = pointAt(endFrac);
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

// Purely visual — aria-hidden, since the text summary alongside it carries the real
// accessible information (see js/app.js's formatSummary).
export function renderTransitionDiagram(container, transitionWindow) {
  if (!transitionWindow) {
    container.innerHTML = '';
    return;
  }

  const { windowStart, windowEnd, segments, nowFraction, currentKind } = transitionWindow;
  const totalMs = windowEnd.getTime() - windowStart.getTime();

  const segmentMarkup = segments
    .map((segment) => {
      const d = segmentPath(segment, windowStart, totalMs);
      if (!d) return '';
      return `<path d="${d}" fill="none" stroke="${KIND_COLOR_VAR[segment.kind]}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" />`;
    })
    .join('');

  const marker = pointAt(nowFraction);
  const markerColor = KIND_COLOR_VAR[currentKind];

  container.innerHTML = `
    <svg viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" aria-hidden="true" class="transition-svg">
      ${segmentMarkup}
      <circle cx="${marker.x.toFixed(2)}" cy="${marker.y.toFixed(2)}" r="${MARKER_RADIUS}" fill="var(--color-surface)" stroke="${markerColor}" stroke-width="3" />
    </svg>
  `;
}
