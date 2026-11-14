// 3D "elytra" mode: an archipelago with one island per portfolio section. You start at spawn
// behind a welcome card, take off, and land at an island's beacon to open that section.
// This is the default view; the original 2D site is still available at ?classic.
import { Canvas, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { NavContext } from '../nav';
import { screens, screenIndex, type ScreenId } from '../screens/registry';
import { site } from '../data/content';
import { ItemIcon } from '../ui/ItemIcon';
import { McButton } from '../ui/McButton';
import { buildAtlas, type Atlas } from './atlas';
import { generateWorld, type Chunk, type World } from './generate';
import { meshBlocks, meshTerrain } from './mesher';
import { flight, flyTo, getUi, land, takeOff, useFlightUi } from './flight';
import { blockMaterial } from './scene/blockMaterial';
import { Atmosphere, shoreTexture } from './scene/Environment';
import { Beacons, CrystalBeams } from './scene/Beacons';
import { Flyer } from './scene/Flyer';
import { Blasts, Petals, Sparks } from './scene/Particles';
import { Terrain } from './scene/Terrain';
import { Tnt } from './scene/Tnt';
import { Pickups } from './scene/Pickups';
import { IslandFx } from './scene/IslandFx';
import { Wildlife } from './scene/Wildlife';
import { FlightHud } from './hud/FlightHud';
import './world.css';

type Built = { world: World; atlas: Atlas; chunks: Chunk[]; meshes: THREE.BufferGeometry[]; material: THREE.Material; water: THREE.Texture };

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const reducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** Dev only: expose the renderer and scene for profiling from the console (window.__fly). */
function DevHook({ built }: { built: Built }) {
  const { gl, scene, camera, advance } = useThree();
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __fly: unknown }).__fly = { gl, scene, camera, advance, built, flight };
  }, [gl, scene, camera, advance, built]);
  return null;
}

function WorldScene({ built, reduced, onReady }: { built: Built; reduced: boolean; onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return (
    <>
      <Atmosphere world={built.world} shore={built.water} blocks={built.material} />
      <Terrain world={built.world} atlas={built.atlas} material={built.material} chunks={built.chunks} geometries={built.meshes} />
      <Beacons dests={built.world.dests} />
      <CrystalBeams beams={built.world.beams} />
      <Flyer world={built.world} reduced={reduced} />
      <Petals reduced={reduced} world={built.world} />
      <Sparks />
      <Blasts />
      <Tnt world={built.world} />
      <Pickups world={built.world} />
      <IslandFx world={built.world} />
      <Wildlife world={built.world} />
      <DevHook built={built} />
    </>
  );
}

/** The welcome card shown at spawn, before the first take-off. */
function IntroCard({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="fly-intro">
      <section className="fly-intro__card" aria-labelledby="fly-intro-title">
        <div className="fly-intro__icon">
          <ItemIcon name="hero" size={56} />
        </div>
        <p className="fly-intro__eyebrow">{site.subtitle}</p>
        <h1 className="fly-intro__title" id="fly-intro-title">
          {site.title}
        </h1>
        <p className="fly-intro__text">
          Hey, I'm {site.name}. This world is my portfolio: every island is a chapter, from my projects to my journey so far.
        </p>
        <p className="fly-intro__text fly-intro__text--dim">Strap on the elytra, fly over, and land on an island to explore it.</p>
        <McButton block onClick={onBegin} sound="click" autoFocus>
          Take flight
        </McButton>
        <a className="fly-intro__skip" href={`${window.location.pathname}?classic`}>
          or browse the classic site
        </a>
      </section>
    </div>
  );
}

/** The section's regular panel, opened after landing at its beacon. */
function LandedPanel({ id }: { id: ScreenId }) {
  const screen = screens[screenIndex(id)];
  const nav = useMemo(
    () => ({
      current: id,
      index: screenIndex(id),
      go: (to: ScreenId) => {
        if (to !== id) flyTo(to);
      },
    }),
    [id],
  );
  const { Component } = screen;
  // the panel keeps its usual side (centred panels go left); the 3D player stands opposite
  const placement = screen.placement === 'right' ? 'right' : 'left';
  return (
    <NavContext.Provider value={nav}>
      <div className={`fly-scrim fly-scrim--${placement}`} />
      <div className={`screen-layer screen-enter place-${placement} panel-y-${screen.layout?.panelY ?? 'center'} fly-panel`} key={id}>
        <Component />
      </div>
      <div className="fly-takeoff">
        <McButton size="sm" onClick={takeOff} sound="pop">
          ▲ Take off <kbd>Esc</kbd>
        </McButton>
      </div>
    </NavContext.Provider>
  );
}

const KEYMAP: Record<string, keyof typeof flight.input> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'boost',
  ShiftRight: 'boost',
  Space: 'boost',
};

export default function FlyMode() {
  const [built, setBuilt] = useState<Built | null>(null);
  const [ready, setReady] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [supported] = useState(webglAvailable);
  const reduced = useMemo(reducedMotion, []);
  const ui = useFlightUi();
  const onReady = useCallback(() => setReady(true), []);

  // Generate after the loading screen has painted.
  useEffect(() => {
    if (!supported) return;
    const id = setTimeout(() => {
      const atlas = buildAtlas();
      const world = generateWorld();
      flight.world = world;
      const chunks: Chunk[] = [...world.islands, ...world.sea];
      const meshes = chunks.flatMap((c) => [meshTerrain(world, atlas, c), meshBlocks(world, atlas, c)]);
      setBuilt({ world, atlas, chunks, meshes, material: blockMaterial(atlas.texture), water: shoreTexture(world) });
    }, 60);
    return () => clearTimeout(id);
  }, [supported]);

  useEffect(() => {
    document.title = ui.landed ? `${screens[screenIndex(ui.landed)].label} · ${site.title}` : site.title;
  }, [ui.landed]);

  // Keyboard: steering is held-key state; everything else is a one-shot command.
  useEffect(() => {
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
      const u = getUi();
      if (u.mode === 'intro') {
        // the card's button handles Enter/Space itself when focused
        if (e.code === 'Enter' && (e.target as HTMLElement | null)?.tagName !== 'BUTTON' && ready) takeOff();
        return;
      }
      const held = KEYMAP[e.code];
      if (held && u.mode === 'fly' && !mapOpen) {
        flight.input[held] = true;
        e.preventDefault();
        return;
      }
      if (e.defaultPrevented) return; // a panel widget already used this key
      if (e.code === 'Escape') {
        if (mapOpen) setMapOpen(false);
        else if (u.mode === 'landed') takeOff();
        return;
      }
      if (e.code === 'KeyM' || e.code === 'Tab') {
        if (u.mode === 'landed' && e.code === 'Tab') return; // keep Tab for keyboard focus inside panels
        e.preventDefault();
        setMapOpen((o) => !o);
        return;
      }
      if (e.code === 'KeyF' && u.mode === 'fly' && !mapOpen) {
        if (!e.repeat) flight.fire++;
        return;
      }
      if ((e.code === 'KeyE' || e.code === 'Enter') && u.mode === 'fly' && u.near && !mapOpen) {
        e.preventDefault();
        land(u.near);
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= screens.length) {
        flyTo(screens[n - 1].id);
        setMapOpen(false);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const held = KEYMAP[e.code];
      if (held) flight.input[held] = false;
    };
    const release = () => {
      for (const k of Object.keys(flight.input) as (keyof typeof flight.input)[]) flight.input[k] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', release);
    };
  }, [mapOpen, ready]);

  // Stop steering when the panel opens.
  useEffect(() => {
    if (ui.mode !== 'fly') for (const k of Object.keys(flight.input) as (keyof typeof flight.input)[]) flight.input[k] = false;
  }, [ui.mode]);

  if (!supported) {
    return (
      <main className="fly-root fly-unsupported">
        <p>This browser can't show the 3D world (WebGL is unavailable).</p>
        <McButton href={`${window.location.pathname}?classic`}>Open the classic site</McButton>
      </main>
    );
  }

  const intro = ui.mode === 'intro';
  return (
    <main className={`fly-root app ${ui.mode === 'landed' ? 'is-landed' : ''}`}>
      {built && (
        <Canvas
          className="fly-canvas"
          flat
          dpr={[1, 1.6]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ fov: 42, near: 0.1, far: 3400, position: [0, 50, 240] }}
        >
          <WorldScene built={built} reduced={reduced} onReady={onReady} />
        </Canvas>
      )}
      {built && !intro && <FlightHud world={built.world} avgSrgb={built.atlas.avgSrgb} mapOpen={mapOpen} setMapOpen={setMapOpen} />}
      {built && ready && intro && <IntroCard onBegin={takeOff} />}
      {ui.mode === 'landed' && ui.landed && <LandedPanel id={ui.landed} />}
      <div className={`fly-loading ${ready ? 'is-done' : ''}`} aria-hidden={ready}>
        <div className="fly-loading__title">{built ? 'Spawning player…' : 'Generating islands…'}</div>
        <div className="fly-loading__bar">
          <span style={{ width: built ? '85%' : '35%' }} />
        </div>
        <div className="fly-loading__tip">Grab your elytra</div>
      </div>
    </main>
  );
}
