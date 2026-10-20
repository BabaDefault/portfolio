import { useEffect, useState } from 'react';
import { site } from '../data/content';
import { biomes } from '../scenes/biomes';
import { screens, type ScreenDef } from '../screens/registry';
import { isMuted, onMuteChange } from '../audio/sfx';
import { useProgress } from '../progress';
import './debug.css';

type Props = { screen: ScreenDef; index: number; useBackdrop?: boolean };

function useFps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

function usePointer() {
  const [p, setP] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => setP({ x: e.clientX, y: e.clientY });
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return p;
}

function useViewport() {
  const get = () => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 });
  const [v, setV] = useState(get);
  useEffect(() => {
    const onResize = () => setV(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return v;
}

function useMedia(query: string) {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

function useMuted() {
  const [m, setM] = useState(isMuted);
  useEffect(() => {
    const off = onMuteChange(setM);
    return () => {
      off();
    };
  }, []);
  return m;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function browserName(ua: string) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Unknown';
}

const FACING = {
  left: { dir: 'west', axis: 'Towards negative X' },
  right: { dir: 'east', axis: 'Towards positive X' },
  front: { dir: 'south', axis: 'Towards positive Z' },
} as const;

/** Minecraft F3-style debug screen with live data. */
export function DebugOverlay({ screen, index, useBackdrop }: Props) {
  const fps = useFps();
  const ptr = usePointer();
  const vp = useViewport();
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const muted = useMuted();
  const time = useClock();
  const { count } = useProgress();

  const def = biomes[screen.biome];
  const biome =
    useBackdrop && screen.backdrop ? { name: screen.backdrop.name, color: screen.backdrop.hudColor ?? def.hudColor } : { name: def.name, color: def.hudColor };
  // The player model faces the opposite side from where it stands.
  const face = FACING[screen.player === 'right' ? 'left' : screen.player === 'left' ? 'right' : 'front'];
  const x = (ptr.x - vp.w / 2) / 16;
  const z = (ptr.y - vp.h / 2) / 16;
  const y = 64 + index;

  const left = [
    <>
      {site.title} {site.version} (vanilla)
    </>,
    <>{fps} fps</>,
    <>
      Screen: {screen.id} [{index + 1}/{screens.length}]
    </>,
    <>
      Biome: <span style={{ color: biome.color }}>{biome.name}</span>
    </>,
    <>
      XYZ: {x.toFixed(3)} / {y.toFixed(5)} / {z.toFixed(3)}
    </>,
    <>
      Facing: {face.dir} ({face.axis})
    </>,
    <>
      Day {index + 1} · {time}
    </>,
  ];
  const right = [
    <>
      Display: {vp.w}x{vp.h}
    </>,
    <>DPR: {Number(vp.dpr.toFixed(2))}</>,
    <>Reduced motion: {reduced ? 'on' : 'off'}</>,
    <>Sound: {muted ? 'off' : 'on'}</>,
    <>
      Explored: {count}/{screens.length}
    </>,
    <>Browser: {browserName(navigator.userAgent)}</>,
  ];

  return (
    <div className="f3" aria-hidden="true">
      <div className="f3__col">
        {left.map((l, i) => (
          <div className="f3__line" key={i}>
            {l}
          </div>
        ))}
      </div>
      <div className="f3__col f3__col--right">
        {right.map((l, i) => (
          <div className="f3__line" key={i}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
