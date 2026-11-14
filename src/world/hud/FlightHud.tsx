// Flight HUD, Minecraft-flavoured, informed by the two reference sites:
//  - top: compass ribbon with a marker per section + a boss bar while the autopilot is flying you somewhere
//  - top-left: F3-style coordinates; top-right: a map item (click or M for the full destination map)
//  - bottom: the hotbar is the nav bar (1–9 / click = fly there and land), an action-bar prompt above it,
//    and a firework boost meter in the XP bar's place
//  - floating name tags over every beacon, a closable controls card, and an exit to the classic site
import { useEffect, useMemo, useRef, useState } from 'react';
import { screens, type ScreenId } from '../../screens/registry';
import { ItemIcon } from '../../ui/ItemIcon';
import { PixelIcon } from '../../ui/PixelIcon';
import { useProgress } from '../../progress';
import { site } from '../../data/content';
import { isMuted, onMuteChange, setMuted, sfx } from '../../audio/sfx';
import type { Dest } from '../destinations';
import { HALF, MIN_Y, N, SEA, col, inside, islandNear, type World } from '../generate';
import { bearingOf, facingName, flight, flyTo, land, onFlightFrame, useFlightUi } from '../flight';
import { tagEls } from '../scene/Beacons';

const short = (dests: Dest[], id: ScreenId | null) => dests.find((d) => d.id === id)?.name ?? '';
const beaconPos = (d: Dest) => ({ x: d.x + 0.5, z: d.z + 0.5 });
const headingDeg = () => bearingOf(Math.sin(flight.yaw), Math.cos(flight.yaw));

function biomeName(w: World) {
  const isl = islandNear(w, flight.pos.x, flight.pos.z, 4);
  return isl ? { name: isl.biome, color: isl.color } : { name: 'Ocean', color: '#55ffff' };
}

/** F3-style readout, refreshed a few times a second. */
function DebugText({ world }: { world: World }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let acc = 1;
    let frames = 0;
    let last = performance.now();
    return onFlightFrame((dt) => {
      acc += dt;
      frames++;
      if (acc < 0.15 || !ref.current) return;
      acc = 0;
      const now = performance.now();
      ref.current.children[0].lastElementChild!.textContent = `${Math.round((frames * 1000) / (now - last))} fps`;
      frames = 0;
      last = now;
      const p = flight.pos;
      const b = headingDeg();
      const f = facingName(b);
      const axis = { north: 'negative Z', south: 'positive Z', east: 'positive X', west: 'negative X' }[f];
      const gi = Math.floor(p.x) + HALF;
      const gj = Math.floor(p.z) + HALF;
      const ground = Math.max(inside(gi, gj) ? world.height[col(gi, gj)] : 0, SEA + 1);
      const biome = biomeName(world);
      const rows = ref.current.children;
      rows[1].textContent = `XYZ: ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}`;
      rows[2].textContent = `Facing: ${f} (Towards ${axis})`;
      rows[3].textContent = `Speed: ${flight.speed.toFixed(1)} b/s · ${Math.max(0, Math.round(p.y - ground))} above ground`;
      const bio = rows[4].lastElementChild as HTMLElement;
      bio.textContent = biome.name;
      bio.style.color = biome.color;
    });
  }, [world]);
  return (
    <div className="fly-debug" ref={ref} aria-hidden="true">
      <div>
        {site.title} <span className="fly-accent">{site.version}</span> · elytra preview · <span />
      </div>
      <div />
      <div />
      <div />
      <div>
        Biome: <span />
      </div>
    </div>
  );
}

const PX_PER_DEG = 2.4;

/** Compass ribbon with a coloured marker for every section, plus a boss bar for the autopilot. */
function Compass({ dests }: { dests: Dest[] }) {
  const ui = useFlightUi();
  const strip = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<ScreenId, HTMLElement>());
  const fill = useRef<HTMLDivElement>(null);
  const dist = useRef<HTMLSpanElement>(null);
  const start = useRef(1);

  const ticks = useMemo(() => {
    const out: { deg: number; label?: string }[] = [];
    const names: Record<number, string> = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    for (let d = -360; d <= 720; d += 15) out.push({ deg: d, label: names[((d % 360) + 360) % 360] });
    return out;
  }, []);

  useEffect(() => {
    if (ui.target) {
      const d = dests.find((x) => x.id === ui.target)!;
      const b = beaconPos(d);
      start.current = Math.max(1, Math.hypot(b.x - flight.pos.x, b.z - flight.pos.z));
    }
  }, [ui.target, dests]);

  useEffect(
    () =>
      onFlightFrame(() => {
        const w = box.current?.clientWidth ?? 480;
        const h = headingDeg();
        if (strip.current) strip.current.style.transform = `translateX(${(w / 2 - (h + 360) * PX_PER_DEG).toFixed(1)}px)`;
        for (const d of dests) {
          const el = markers.current.get(d.id);
          if (!el) continue;
          const b = beaconPos(d);
          let delta = bearingOf(b.x - flight.pos.x, b.z - flight.pos.z) - h;
          delta = ((delta + 540) % 360) - 180;
          const x = w / 2 + delta * PX_PER_DEG;
          el.style.opacity = Math.abs(delta) * PX_PER_DEG > w / 2 - 8 ? '0' : '1';
          el.style.transform = `translateX(${x.toFixed(1)}px) translateX(-50%)`;
        }
        const target = dests.find((x) => x.id === ui.target);
        if (target && fill.current && dist.current) {
          const b = beaconPos(target);
          const dd = Math.hypot(b.x - flight.pos.x, b.z - flight.pos.z);
          fill.current.style.width = `${Math.max(2, Math.min(100, (1 - dd / start.current) * 100)).toFixed(1)}%`;
          dist.current.textContent = `${Math.round(dd)}m`;
        }
      }),
    [dests, ui.target],
  );

  const target = dests.find((x) => x.id === ui.target);
  return (
    <div className={`fly-top ${ui.mode !== 'fly' ? 'is-dim' : ''}`} aria-hidden="true">
      <div className="fly-compass" ref={box}>
        <div className="fly-compass__strip" ref={strip}>
          {ticks.map((t) => (
            <span key={t.deg} className={`fly-compass__tick ${t.label ? 'is-major' : ''}`} style={{ left: (t.deg + 360) * PX_PER_DEG }}>
              {t.label && <b>{t.label}</b>}
            </span>
          ))}
        </div>
        {dests.map((d) => (
          <span
            key={d.id}
            className={`fly-compass__marker ${ui.target === d.id ? 'is-target' : ''}`}
            style={{ background: d.color }}
            ref={(el) => {
              if (el) markers.current.set(d.id, el);
              else markers.current.delete(d.id);
            }}
          >
            {d.index + 1}
          </span>
        ))}
        <span className="fly-compass__caret" />
      </div>
      {target && (
        <div className="fly-bossbar">
          <div className="fly-bossbar__title" style={{ color: target.color }}>
            Flying to {target.name} · <span ref={dist} />
          </div>
          <div className="fly-bossbar__bar">
            <div className="fly-bossbar__fill" ref={fill} style={{ background: target.color }} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Renders the island top-down once, Minecraft-map style (height-shaded tiles, water by depth). */
function useMapImage(world: World, avgSrgb: Uint8ClampedArray) {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = N;
    c.height = N;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(N, N);
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const n = col(i, j);
        const h = world.height[n];
        const top = world.ceiling[n];
        let r: number;
        let g: number;
        let b: number;
        if (top <= SEA) {
          // sea: darker with depth
          const depth = h <= MIN_Y ? 1 : Math.min(1, (SEA - h) / 8);
          r = 62 - depth * 22;
          g = 104 - depth * 34;
          b = 196 - depth * 44;
        } else {
          const tile = top > h ? world.ceilTile[n] : world.topTile[n];
          r = avgSrgb[tile * 3];
          g = avgSrgb[tile * 3 + 1];
          b = avgSrgb[tile * 3 + 2];
          const north = j > 0 ? world.ceiling[col(i, j - 1)] : top;
          const k = top > north ? 1.12 : top < north ? 0.8 : 0.96;
          r *= k;
          g *= k;
          b *= k;
        }
        const o = n * 4;
        img.data[o] = r;
        img.data[o + 1] = g;
        img.data[o + 2] = b;
        img.data[o + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }, [world, avgSrgb]);
}

const pct = (v: number) => `${(((v + HALF) / N) * 100).toFixed(2)}%`;

function MapMarkers({ dests, big, onPick }: { dests: Dest[]; big?: boolean; onPick?: (id: ScreenId) => void }) {
  const arrow = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      onFlightFrame(() => {
        const el = arrow.current;
        if (!el) return;
        el.style.left = pct(Math.max(-HALF, Math.min(HALF, flight.pos.x)));
        el.style.top = pct(Math.max(-HALF, Math.min(HALF, flight.pos.z)));
        el.style.transform = `translate(-50%, -50%) rotate(${headingDeg().toFixed(1)}deg)`;
      }),
    [],
  );
  return (
    <>
      {dests.map((d) =>
        big ? (
          <button
            key={d.id}
            type="button"
            className="fly-map__pin"
            style={{ left: pct(d.x), top: pct(d.z), background: d.color }}
            onClick={() => onPick?.(d.id)}
            aria-label={`Fly to ${d.name}`}
          >
            {d.index + 1}
          </button>
        ) : (
          <span key={d.id} className="fly-map__dot" style={{ left: pct(d.x), top: pct(d.z), background: d.color }} />
        ),
      )}
      <span className="fly-map__arrow" ref={arrow} />
    </>
  );
}

function Minimap({ dests, image, onOpen }: { dests: Dest[]; image: string; onOpen: () => void }) {
  return (
    <button type="button" className="fly-minimap" onClick={onOpen} aria-label="Open the world map (M)">
      <span className="fly-minimap__map">
        <span className="fly-minimap__inner">
          <img src={image} alt="" draggable={false} />
          <MapMarkers dests={dests} />
        </span>
      </span>
      <span className="fly-minimap__key">Map [M]</span>
    </button>
  );
}

function WorldMap({ dests, image, onClose }: { dests: Dest[]; image: string; onClose: () => void }) {
  const { visited } = useProgress();
  const pick = (id: ScreenId) => {
    flyTo(id);
    sfx.select();
    onClose();
  };
  return (
    <div className="fly-worldmap" role="dialog" aria-modal="true" aria-label="World map" onClick={onClose}>
      <div className="fly-worldmap__inner" onClick={(e) => e.stopPropagation()}>
        <div className="fly-worldmap__head">
          <span>Select destination</span>
          <button type="button" className="fly-x" onClick={onClose} aria-label="Close map">
            ×
          </button>
        </div>
        <div className="fly-worldmap__body">
          <div className="fly-worldmap__map">
            <img src={image} alt="Top-down map of the island" draggable={false} />
            <MapMarkers dests={dests} big onPick={pick} />
          </div>
          <ol className="fly-worldmap__list">
            {dests.map((d) => {
              const b = beaconPos(d);
              const dist = Math.round(Math.hypot(b.x - flight.pos.x, b.z - flight.pos.z));
              const label = screens.find((s) => s.id === d.id)?.label ?? d.name;
              return (
                <li key={d.id}>
                  <button type="button" onClick={() => pick(d.id)}>
                    <span className="fly-worldmap__num" style={{ background: d.color }}>
                      {d.index + 1}
                    </span>
                    <span className="fly-worldmap__name">
                      <b style={{ color: d.color }}>{d.name}</b>
                      <small>
                        {label} · {dist}m
                      </small>
                    </span>
                    {visited.has(d.id) && <span className="fly-worldmap__seen">Visited</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="fly-worldmap__foot">Click a section to fly there · Esc to close</p>
      </div>
    </div>
  );
}

/** The action-bar line above the hotbar. */
function ActionBar({ dests }: { dests: Dest[] }) {
  const ui = useFlightUi();
  const [oob, setOob] = useState(false);
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setIntro(false), 9000);
    return () => clearTimeout(id);
  }, []);
  useEffect(
    () =>
      onFlightFrame(() => {
        if (flight.outOfBounds !== oob) setOob(flight.outOfBounds);
      }),
    [oob],
  );
  if (ui.mode !== 'fly') return <div className="fly-actionbar" />;
  if (oob) return <div className="fly-actionbar">The sea goes on forever… turning back</div>;
  if (ui.target) return <div className="fly-actionbar">Autopilot on · steer to take the controls</div>;
  if (ui.near)
    return (
      <div className="fly-actionbar">
        <button type="button" className="fly-land" onClick={() => land(ui.near!)}>
          <kbd>E</kbd> Land at {short(dests, ui.near)}
        </button>
      </div>
    );
  if (intro) return <div className="fly-actionbar">Pick a slot on the hotbar (1–9) to fly there, or steer yourself: chase the orbs, bomb the sea stacks</div>;
  return <div className="fly-actionbar" />;
}

function FlightHotbar({ dests }: { dests: Dest[] }) {
  const ui = useFlightUi();
  const boost = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(
    () =>
      onFlightFrame(() => {
        if (boost.current) boost.current.style.width = `${Math.max(2, flight.boost * 100).toFixed(1)}%`;
      }),
    [],
  );
  const active = ui.landed ?? ui.target;
  const label = hover !== null ? screens[hover].label : active ? screens.find((s) => s.id === active)?.label : null;
  return (
    <div className="hotbar-wrap fly-hotbar">
      <ActionBar dests={dests} />
      {label && (
        <div className="hotbar-label" key={label}>
          {label}
        </div>
      )}
      <div className="status" aria-hidden="true">
        <div className="status__row">
          <div className="status__icons">
            {Array.from({ length: 10 }, (_, i) => (
              <ItemIcon key={i} name="heart" size={14} />
            ))}
          </div>
          <div className="status__icons status__icons--right">
            {Array.from({ length: 10 }, (_, i) => (
              <ItemIcon key={i} name="hunger" size={14} />
            ))}
          </div>
        </div>
        <div className="xp fly-boost" title="Firework boost (Shift / Space)">
          <div className="xp__fill fly-boost__fill" ref={boost} />
          <span className="xp__level">{ui.xp}</span>
        </div>
      </div>
      <nav className="hotbar" aria-label="Fly to a section">
        {screens.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`hotbar__slot ${s.id === active ? 'is-active' : ''}`}
            aria-current={s.id === ui.landed ? 'page' : undefined}
            aria-label={`${i + 1}: fly to ${s.label}`}
            onClick={() => {
              sfx.select();
              flyTo(s.id);
            }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            {'art' in s.icon ? <PixelIcon art={s.icon.art} size={28} /> : <ItemIcon name={s.icon.name} size={28} />}
            <span className="hotbar__key">{i + 1}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const CONTROLS_KEY = 'fly-controls-hidden';

function ControlsCard() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(CONTROLS_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const close = (v: boolean) => {
    setOpen(v);
    try {
      localStorage.setItem(CONTROLS_KEY, v ? '0' : '1');
    } catch {
      /* storage unavailable */
    }
  };
  if (!open)
    return (
      <button type="button" className="fly-controls-toggle" onClick={() => close(true)}>
        Controls
      </button>
    );
  return (
    <div className="fly-controls">
      <dl>
        <div>
          <dt><kbd>W</kbd><kbd>S</kbd></dt>
          <dd>climb / dive</dd>
        </div>
        <div>
          <dt><kbd>A</kbd><kbd>D</kbd></dt>
          <dd>turn</dd>
        </div>
        <div>
          <dt><kbd>Shift</kbd></dt>
          <dd>firework boost</dd>
        </div>
        <div>
          <dt><kbd>1</kbd>–<kbd>9</kbd></dt>
          <dd>fly to a section</dd>
        </div>
        <div>
          <dt><kbd>E</kbd></dt>
          <dd>land · <kbd>Esc</kbd> take off</dd>
        </div>
        <div>
          <dt><kbd>F</kbd></dt>
          <dd>throw TNT</dd>
        </div>
        <div>
          <dt><kbd>M</kbd></dt>
          <dd>map · drag to look around</dd>
        </div>
      </dl>
      <p className="fly-controls__touch">Tap a hotbar slot to fly there · drag to look around</p>
      <button type="button" className="fly-x" onClick={() => close(false)} aria-label="Hide controls">
        ×
      </button>
    </div>
  );
}

function NameTags({ dests }: { dests: Dest[] }) {
  return (
    <div className="fly-tags" aria-hidden="true">
      {dests.map((d) => (
        <div
          key={d.id}
          className="fly-tag"
          ref={(el) => {
            if (el) tagEls.set(d.id, el);
            else tagEls.delete(d.id);
          }}
        >
          <span className="fly-tag__num" style={{ background: d.color }}>
            {d.index + 1}
          </span>
          <span className="fly-tag__name">{d.name}</span>
          <span className="fly-tag__dist" data-dist />
        </div>
      ))}
    </div>
  );
}

/** Turns the music and sound effects on or off (remembered between visits). */
function SoundToggle() {
  const [muted, setM] = useState(isMuted);
  useEffect(() => {
    const off = onMuteChange(setM);
    return () => {
      off();
    };
  }, []);
  return (
    <button type="button" className="fly-classic fly-sound" aria-pressed={!muted} onClick={() => setMuted(!muted)}>
      Sound: {muted ? 'off' : 'on'}
    </button>
  );
}

export function FlightHud({
  world,
  avgSrgb,
  mapOpen,
  setMapOpen,
}: {
  world: World;
  avgSrgb: Uint8ClampedArray;
  mapOpen: boolean;
  setMapOpen: (v: boolean) => void;
}) {
  const ui = useFlightUi();
  const image = useMapImage(world, avgSrgb);
  const classicHref = `${window.location.pathname}?classic#${ui.landed ?? 'title'}`;
  return (
    <>
      <NameTags dests={world.dests} />
      <DebugText world={world} />
      <Compass dests={world.dests} />
      <Minimap dests={world.dests} image={image} onOpen={() => setMapOpen(true)} />
      <a className="fly-classic" href={classicHref}>
        Classic view
      </a>
      <SoundToggle />
      {ui.mode === 'fly' && <ControlsCard />}
      <FlightHotbar dests={world.dests} />
      {mapOpen && <WorldMap dests={world.dests} image={image} onClose={() => setMapOpen(false)} />}
    </>
  );
}
