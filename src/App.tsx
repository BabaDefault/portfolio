import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { NavContext } from './nav';
import { screens, screenIndex, isScreenId, type ScreenId } from './screens/registry';
import { SceneCanvas } from './scenes/SceneCanvas';
import { AmbientCanvas } from './scenes/AmbientCanvas';
import { sceneMedia } from './scenes/sceneImages';
import { SceneBackdrop } from './scenes/SceneBackdrop';
import { SceneFx } from './scenes/SceneFx';
import { sceneEffects } from './scenes/sceneEffects';
import { Player3D } from './scenes/LazyPlayer3D';
import { defaultLighting, playerLighting } from './scenes/playerLighting';
import { Hud } from './hud/Hud';
import { Hotbar } from './hud/Hotbar';
import { DebugOverlay } from './hud/DebugOverlay';
import { LoadingScreen } from './hud/LoadingScreen';
import { markVisited } from './progress';
import { site } from './data/content';
import { sfx } from './audio/sfx';

function fromHash(): ScreenId {
  const h = window.location.hash.replace('#', '');
  return isScreenId(h) ? h : 'title';
}

export default function App() {
  const [current, setCurrent] = useState<ScreenId>(fromHash);
  const [fadeKey, setFadeKey] = useState(0);
  const [mediaSize, setMediaSize] = useState({ w: 1920, h: 1080 });
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const index = screenIndex(current);
  const screen = screens[index];
  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    markVisited(current);
  }, [current]);

  const go = useCallback(
    (id: ScreenId) => {
      if (id === current) return;
      sfx.select();
      setCurrent(id);
      setFadeKey((k) => k + 1);
      if (window.location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    },
    [current],
  );

  // Back/forward + manual hash edits
  useEffect(() => {
    const onHash = () => {
      setCurrent(fromHash());
      setFadeKey((k) => k + 1);
    };
    window.addEventListener('popstate', onHash);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('popstate', onHash);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  // Keyboard: 1–9 jump, ←/→ cycle, Esc → title, F3 debug overlay
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'F3') {
        e.preventDefault();
        if (!e.repeat) setDebugOpen((o) => !o);
        return;
      }
      // A screen widget already handled this key (e.g. Esc closing a popup).
      if (e.defaultPrevented) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        // Leave arrow keys to widgets that use them internally.
        if (t?.closest?.('[role="listbox"], [role="tablist"], [role="grid"], [data-arrow-nav]')) return;
        const step = e.key === 'ArrowRight' ? 1 : -1;
        go(screens[(index + step + screens.length) % screens.length].id);
        return;
      }
      if (e.key === 'Escape') {
        go('title');
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= screens.length) go(screens[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  useEffect(() => {
    document.title = index === 0 ? site.title : `${screen.label} · ${site.title}`;
  }, [index, screen.label]);

  const nav = useMemo(() => ({ current, index, go }), [current, index, go]);
  const { Component } = screen;
  const media = sceneMedia(current);
  const layoutVars = {
    ...(screen.layout?.panelInset ? { '--panel-inset': screen.layout.panelInset } : {}),
    ...(screen.layout?.playerInset ? { '--player-inset': screen.layout.playerInset } : {}),
    ...(screen.layout?.playerBottom ? { '--player-bottom': screen.layout.playerBottom } : {}),
  } as CSSProperties;
  // With an image/video background, particles + player lighting follow the backdrop's mood.
  const mood = media && screen.backdrop ? screen.backdrop.mood : screen.biome;
  const fx = media ? sceneEffects[current] : undefined;

  // Image-anchored player: place the feet on a point of the background image (object-fit: cover).
  const anchor = media ? screen.anchor : undefined;
  let anchorStyle: CSSProperties | undefined;
  let anchorHeight: number | undefined;
  if (anchor) {
    const s = Math.max(viewport.w / mediaSize.w, viewport.h / mediaSize.h);
    const bw = mediaSize.w * s;
    const bh = mediaSize.h * s;
    const bl = (viewport.w - bw) / 2;
    const bt = (viewport.h - bh) / 2;
    const h = Math.round(anchor.height * bh);
    const w = Math.round(h * 0.8); // Player3D canvas aspect
    const feetPx = bt + (anchor.feetY / 100) * bh;
    const canvasBottom = feetPx + 0.11 * h; // soles sit ~11% up the canvas
    anchorHeight = h;
    anchorStyle = {
      left: bl + (anchor.x / 100) * bw - w / 2,
      right: 'auto',
      bottom: viewport.h - canvasBottom,
      transform: 'none',
    };
    if (anchor.clipY !== undefined) {
      const line = ((bt + (anchor.clipY / 100) * bh - (canvasBottom - h)) / h) * 100;
      // hard edge, so the body meets the occluding surface instead of fading out above it
      const mask = `linear-gradient(to bottom, #000 ${(line - 0.4).toFixed(1)}%, transparent ${line.toFixed(1)}%)`;
      anchorStyle.maskImage = mask;
      anchorStyle.WebkitMaskImage = mask;
    }
  }

  return (
    <NavContext.Provider value={nav}>
      <main className="app" style={layoutVars}>
        <div className="scene-parallax">
          {media ? (
            <>
              <SceneBackdrop media={media} key={`bg-${current}`} onSize={setMediaSize} />
              {fx ? <SceneFx effects={fx.effects} imageSize={mediaSize} key={`fx-${current}`} /> : <AmbientCanvas biome={mood} />}
            </>
          ) : (
            <SceneCanvas biome={screen.biome} />
          )}
        </div>
        <div className="scene-vignette" />
        {/* One persistent 3D player: it turns and changes pose as you switch screens. */}
        <div
          className={`player-spot player-spot--${screen.player ?? 'hidden'}`}
          style={anchorStyle ?? (screen.layout?.playerClip ? { maskImage: `linear-gradient(to bottom, #000 ${97 - screen.layout.playerClip}%, transparent ${100 - screen.layout.playerClip}%)`, WebkitMaskImage: `linear-gradient(to bottom, #000 ${97 - screen.layout.playerClip}%, transparent ${100 - screen.layout.playerClip}%)` } : undefined)}
        >
          <Player3D
            pose={screen.pose}
            lighting={playerLighting[current] ?? defaultLighting}
            facing={
              screen.faceAway
                ? screen.player === 'left' ? 'awayRight' : 'awayLeft'
                : screen.player === 'right' ? 'left' : screen.player === 'left' ? 'right' : 'front'
            }
            height={anchorHeight ?? screen.layout?.playerHeight ?? 380}
            trackCursor={!screen.faceViewer}
          />
          {screen.speech && (
            <p className="player-speech" key={`speech-${current}`}>
              {screen.speech}
            </p>
          )}
        </div>
        <div
          className={`screen-layer screen-enter place-${screen.placement} panel-y-${screen.layout?.panelY ?? 'center'} ${screen.scrim && media ? 'has-scrim' : ''}`}
          key={current}
        >
          <Component />
        </div>
        <div className={`terrain-fade ${fadeKey ? 'active' : ''}`} key={`f-${fadeKey}`} />
        <Hud screen={screen} index={index} useBackdrop={!!media} hidden={debugOpen} />
        {debugOpen && <DebugOverlay screen={screen} index={index} useBackdrop={!!media} />}
        <Hotbar index={index} onSelect={go} />
        <p className="sr-only" aria-live="polite">
          {screen.label}
        </p>
        <LoadingScreen />
      </main>
    </NavContext.Provider>
  );
}
