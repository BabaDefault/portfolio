import { useEffect, useState } from 'react';
import { site } from '../data/content';
import { biomes } from '../scenes/biomes';
import type { ScreenDef } from '../screens/registry';
import { isMuted, onMuteChange, setMuted, sfx } from '../audio/sfx';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Top-left F3-style debug text + top-right sound toggle. */
export function Hud({ screen, index, useBackdrop, hidden }: { screen: ScreenDef; index: number; useBackdrop?: boolean; hidden?: boolean }) {
  const time = useClock();
  const def = biomes[screen.biome];
  const biome = useBackdrop && screen.backdrop
    ? { name: screen.backdrop.name, hudColor: screen.backdrop.hudColor ?? def.hudColor }
    : def;
  return (
    <>
      <div className="hud-debug" aria-hidden="true" hidden={hidden}>
        <div>
          {site.title} <span className="hud-debug__accent">{site.version}</span>
        </div>
        <div>
          Biome: <span style={{ color: biome.hudColor }}>{biome.name}</span>
        </div>
        <div>
          Day {index + 1} · {time}
        </div>
      </div>
      <MuteToggle />
    </>
  );
}

function MuteToggle() {
  const [muted, setM] = useState(isMuted);
  useEffect(() => {
    const off = onMuteChange(setM);
    return () => {
      off();
    };
  }, []);
  return (
    <button
      type="button"
      className="hud-mute"
      aria-pressed={!muted}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      title={muted ? 'Sound: OFF' : 'Sound: ON'}
      onClick={() => {
        setMuted(!muted);
        if (muted) sfx.pop();
      }}
    >
      <svg viewBox="0 0 10 8" width="22" height="18" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="0" y="2" width="2" height="4" fill="currentColor" />
        <rect x="2" y="1" width="1" height="6" fill="currentColor" />
        <rect x="3" y="0" width="1" height="8" fill="currentColor" />
        {muted ? (
          <>
            <rect x="6" y="2" width="1" height="1" fill="#ff5555" />
            <rect x="7" y="3" width="1" height="2" fill="#ff5555" />
            <rect x="8" y="2" width="1" height="1" fill="#ff5555" />
            <rect x="6" y="5" width="1" height="1" fill="#ff5555" />
            <rect x="8" y="5" width="1" height="1" fill="#ff5555" />
          </>
        ) : (
          <>
            <rect x="5" y="3" width="1" height="2" fill="currentColor" />
            <rect x="7" y="1" width="1" height="1" fill="currentColor" />
            <rect x="8" y="2" width="1" height="4" fill="currentColor" />
            <rect x="7" y="6" width="1" height="1" fill="currentColor" />
          </>
        )}
      </svg>
    </button>
  );
}
