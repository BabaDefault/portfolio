import { memo, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Panel } from '../ui/Panel';
import { McButton } from '../ui/McButton';
import { PixelIcon } from '../ui/PixelIcon';
import { journey } from '../data/content';
import { bannerIcons, compassRose, redX } from '../icons/journey';
import { sfx } from '../audio/sfx';
import './journey.css';

// Map coordinate space (SVG viewBox units). The map keeps this 16:9 aspect ratio.
const W = 320;
const H = 180;
const CELL = 8; // land/water pixel size
const DASH = 3; // path dash size
const DASH_GAP = 9; // distance between dashes

type Pt = { x: number; y: number };

/** Waypoints left → right with a vertical wiggle. */
function waypoints(n: number): Pt[] {
  if (n <= 0) return [];
  if (n === 1) return [{ x: W / 2, y: H * 0.6 }];
  const left = 40;
  const right = W - 40;
  return Array.from({ length: n }, (_, i) => {
    const wiggle = (i % 2 === 0 ? 1 : -1) * 0.1 + Math.sin(i * 2.3) * 0.04;
    return { x: left + ((right - left) * i) / (n - 1), y: H * (0.58 + wiggle) };
  });
}

/** Stepped pixel dashes along gently curved segments between waypoints. */
function dashes(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    // control point offset perpendicular to the segment
    const bend = (i % 2 === 0 ? 1 : -1) * len * 0.22;
    const cx = (a.x + b.x) / 2 + (-dy / len) * bend;
    const cy = (a.y + b.y) / 2 + (dx / len) * bend;
    const steps = Math.max(2, Math.round(len / DASH_GAP));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cx + t * t * b.x;
      const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cy + t * t * b.y;
      out.push({ x: Math.round(x / DASH) * DASH, y: Math.round(y / DASH) * DASH });
    }
  }
  return out;
}

type Cell = 'water' | 'shallow' | 'coast' | 'land' | 'hill';

/** Blobby continent from a few metaballs, plus a lake. */
function terrain(): Cell[][] {
  const cols = Math.ceil(W / CELL);
  const rows = Math.ceil(H / CELL);
  const blobs = [
    { x: 8, y: 13, r: 9 },
    { x: 18, y: 11, r: 8 },
    { x: 28, y: 12, r: 9 },
    { x: 35, y: 9, r: 6 },
    { x: 14, y: 4, r: 4 },
    { x: 24, y: 19, r: 5 },
  ];
  const lake = { x: 21, y: 7, r: 2.4 };
  const field = (x: number, y: number) =>
    blobs.reduce((s, b) => s + (b.r * b.r) / ((x - b.x) ** 2 + (y - b.y) ** 2 + 1), 0) -
    (lake.r * lake.r) / ((x - lake.x) ** 2 + (y - lake.y) ** 2 + 0.5) * 1.6;
  const isLand = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows && field(x + 0.5, y + 0.5) > 1.15;

  const grid: Cell[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < cols; x++) {
      const land = isLand(x, y);
      const near = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(([ox, oy]) => isLand(x + ox, y + oy) !== land).length;
      if (land) row.push(near > 0 ? 'coast' : field(x + 0.5, y + 0.5) > 3.2 ? 'hill' : 'land');
      else row.push(near > 0 ? 'shallow' : 'water');
    }
    grid.push(row);
  }
  return grid;
}

const fill: Record<Cell, string | null> = {
  water: 'jr-svg-water',
  shallow: 'jr-svg-shallow',
  coast: 'jr-svg-coast',
  land: null,
  hill: 'jr-svg-hill',
};

/** Static map art: terrain, trees, path, waypoint dots. Memoized; only depends on stop count. */
const MapArt = memo(function MapArt({ pts, lastIndex }: { pts: Pt[]; lastIndex: number }) {
  const grid = terrain();
  const rects: JSX.Element[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const cell = row[x];
      let run = 1;
      while (row[x + run] === cell) run++;
      const cls = fill[cell];
      if (cls) rects.push(<rect key={`${x}-${y}`} className={cls} x={x * CELL} y={y * CELL} width={run * CELL} height={CELL} />);
      x += run;
    }
  });

  // Water ripples and land trees, deterministic
  const marks: JSX.Element[] = [];
  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      const h = (x * 73 + y * 151) % 17;
      if (cell === 'water' && h === 0)
        marks.push(<rect key={`w${x}-${y}`} className="jr-svg-ripple" x={x * CELL + 1} y={y * CELL + 4} width={6} height={2} />);
      if (cell === 'land' && h === 3) {
        const px = x * CELL + 2;
        const py = y * CELL + 1;
        marks.push(
          <g key={`t${x}-${y}`} className="jr-svg-tree">
            <rect x={px + 1} y={py} width={2} height={2} />
            <rect x={px} y={py + 2} width={4} height={2} />
            <rect x={px + 1} y={py + 4} width={2} height={2} className="jr-svg-trunk" />
          </g>,
        );
      }
      if (cell === 'hill' && h === 5) {
        const px = x * CELL;
        const py = y * CELL + 1;
        marks.push(
          <g key={`m${x}-${y}`} className="jr-svg-mountain">
            <rect x={px + 3} y={py} width={2} height={2} />
            <rect x={px + 2} y={py + 2} width={4} height={2} />
            <rect x={px + 1} y={py + 4} width={6} height={2} />
          </g>,
        );
      }
    }),
  );

  return (
    <svg className="jr-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" shapeRendering="crispEdges">
      {rects}
      {marks}
      {dashes(pts).map((d, i) => (
        <rect key={`d${i}`} className="jr-svg-dash" x={d.x - DASH / 2} y={d.y - DASH / 2} width={DASH} height={DASH} />
      ))}
      {pts.map((p, i) =>
        i === lastIndex ? null : (
          <g key={`p${i}`} className="jr-svg-dot">
            <rect x={p.x - 3} y={p.y - 2} width={6} height={4} />
            <rect x={p.x - 2} y={p.y - 3} width={4} height={6} />
          </g>
        ),
      )}
    </svg>
  );
});

export default function JourneyScreen() {
  const count = journey.length;
  const last = count - 1;
  const [selected, setSelected] = useState(Math.max(0, last));
  const markerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pts = useMemo(() => waypoints(count), [count]);

  const select = (i: number) => {
    if (i < 0 || i > last || i === selected) return;
    sfx.page();
    setSelected(i);
  };

  const onMarkerKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(last, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, i - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next !== null) {
      e.preventDefault();
      markerRefs.current[next]?.focus(); // focusing selects it
    }
  };

  const stop = journey[selected];

  return (
    <Panel
      title="Treasure Map"
      aside={`${count} waypoint${count === 1 ? '' : 's'}`}
      variant="parchment"
      width={860}
      className="jr-panel"
      labelledBy="jr-title"
    >
      <div className="jr-body">
        <div className="jr-map">
          <MapArt pts={pts} lastIndex={last} />

          <div className="jr-compass" aria-hidden="true">
            <span className="jr-compass__n">N</span>
            <PixelIcon art={compassRose} size={45} />
          </div>

          {count > 0 && (
            <span
              className="jr-x"
              aria-hidden="true"
              style={{ left: `${(pts[last].x / W) * 100}%`, top: `${(pts[last].y / H) * 100}%` }}
            >
              <PixelIcon art={redX} size={21} />
            </span>
          )}

          <ol className="jr-markers" aria-label="Journey waypoints">
            {journey.map((s, i) => (
              <li
                key={s.id}
                className="jr-marker-item"
                style={{ left: `${(pts[i].x / W) * 100}%`, top: `${(pts[i].y / H) * 100}%` }}
              >
                <button
                  ref={(el) => {
                    markerRefs.current[i] = el;
                  }}
                  type="button"
                  className={`jr-marker ${i === selected ? 'jr-marker--selected' : ''} ${i === last ? 'jr-marker--latest' : ''}`}
                  aria-pressed={i === selected}
                  aria-label={`${s.period}: ${s.title}${i === last ? ' (latest)' : ''}`}
                  aria-controls="jr-card"
                  onClick={() => select(i)}
                  onFocus={() => select(i)}
                  onKeyDown={(e) => onMarkerKey(e, i)}
                >
                  <PixelIcon art={bannerIcons[s.icon]} size={40} className="jr-marker__banner" />
                  <span className="jr-marker__label">{s.period}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <aside className="jr-side">
          {stop ? (
            <article className="jr-card" id="jr-card" aria-live="polite">
              <p className="jr-card__period">
                {selected === last ? 'Latest · ' : `Stop ${selected + 1} · `}
                {stop.period}
              </p>
              <h3 className="jr-card__title">{stop.title}</h3>
              <p className="jr-card__place">{stop.place}</p>
              <p className="jr-card__desc">{stop.description}</p>
            </article>
          ) : (
            <p className="jr-card" id="jr-card">
              No waypoints yet.
            </p>
          )}

          <div className="jr-steps">
            <McButton size="sm" sound={null} onClick={() => select(selected - 1)} disabled={selected <= 0} aria-label="Previous stop">
              ‹ Prev
            </McButton>
            <span className="jr-steps__count" aria-hidden="true">
              {count ? selected + 1 : 0} / {count}
            </span>
            <McButton size="sm" sound={null} onClick={() => select(selected + 1)} disabled={selected >= last} aria-label="Next stop">
              Next ›
            </McButton>
          </div>
        </aside>
      </div>
    </Panel>
  );
}
